/**
 * MemoryCompressor - Rule-based memory compression
 *
 * Compresses WorkingMemory when it exceeds thresholds.
 * Uses rule-based extraction without LLM calls for speed.
 */

import { WorkingMemory } from './WorkingMemory';
import { ChatMessageRoleEnum } from './types';
import type { Memory } from './types';
import {
  REGIONS,
  getRegionConfig,
  isCompressible,
  isPersistent,
  getRegionalOrder,
  createConversationSummaryMemory,
} from './regions';

/**
 * Compression configuration
 */
export interface CompressionConfig {
  maxTotalMemories: number;      // Trigger compression threshold
  targetMemories: number;        // Target after compression
  preserveRecentCount: number;   // Always keep N most recent exchanges
  summaryUpdateThreshold: number; // Update summary every N exchanges
}

const DEFAULT_CONFIG: CompressionConfig = {
  maxTotalMemories: 50,
  targetMemories: 25,
  preserveRecentCount: 10,
  summaryUpdateThreshold: 15,
};

/**
 * MemoryCompressor class
 */
export class MemoryCompressor {
  private config: CompressionConfig;
  private lastCompressionCount = 0;

  constructor(config: Partial<CompressionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if compression is needed
   */
  needsCompression(memory: WorkingMemory): boolean {
    return memory.length > this.config.maxTotalMemories;
  }

  /**
   * Check if summary update is needed
   */
  needsSummaryUpdate(memory: WorkingMemory): boolean {
    const exchangeCount = memory.rawMemories.filter(
      m => m.role === ChatMessageRoleEnum.User || m.role === ChatMessageRoleEnum.Assistant
    ).length;
    return exchangeCount - this.lastCompressionCount >= this.config.summaryUpdateThreshold;
  }

  /**
   * Compress memory and return new WorkingMemory
   */
  compress(memory: WorkingMemory): WorkingMemory {
    if (!this.needsCompression(memory)) {
      return memory;
    }

    // Step 1: Extract topics and insights from compressible regions
    const { topics, insights, keyProjects } = this.extractSummaryData(memory);

    // Step 2: Separate persistent and compressible memories
    const persistentMemories: Memory[] = [];
    const compressibleMemories: Memory[] = [];

    for (const mem of memory.rawMemories) {
      const region = mem.region ?? REGIONS.DEFAULT;
      if (isPersistent(region) && !isCompressible(region)) {
        persistentMemories.push(mem);
      } else {
        compressibleMemories.push(mem);
      }
    }

    // Step 3: Keep recent exchanges from compressible
    const recentExchanges = this.getRecentExchanges(
      compressibleMemories,
      this.config.preserveRecentCount
    );

    // Step 4: Create/update summary
    const summaryMemory = createConversationSummaryMemory(
      topics,
      insights,
      compressibleMemories.length
    );

    // Step 5: Apply per-region limits to persistent memories
    const trimmedPersistent = this.applyRegionLimits(persistentMemories);

    // Step 6: Reconstruct memory with proper ordering
    const newMemories = [
      ...trimmedPersistent,
      summaryMemory,
      ...recentExchanges,
    ];

    // Update compression tracking
    this.lastCompressionCount = memory.rawMemories.filter(
      m => m.role === ChatMessageRoleEnum.User || m.role === ChatMessageRoleEnum.Assistant
    ).length;

    return new WorkingMemory({
      soulName: memory.soulName,
      memories: newMemories,
      regionalOrder: getRegionalOrder(),
    });
  }

  /**
   * Extract topics, insights, and projects from memory (rule-based)
   */
  private extractSummaryData(memory: WorkingMemory): {
    topics: string[];
    insights: string[];
    keyProjects: string[];
  } {
    const topics = new Set<string>();
    const insights: string[] = [];
    const keyProjects = new Set<string>();

    // Project keywords to detect
    const projectKeywords = ['ACS', 'CZI', 'Dolby', 'Aldea', 'portfolio', 'case study'];
    const topicKeywords = ['design', 'AI', 'development', 'UX', 'soul', 'labyrinth'];

    for (const mem of memory.rawMemories) {
      const content = mem.content.toLowerCase();

      // Extract project mentions
      for (const project of projectKeywords) {
        if (content.includes(project.toLowerCase())) {
          keyProjects.add(project);
        }
      }

      // Extract topics
      for (const topic of topicKeywords) {
        if (content.includes(topic.toLowerCase())) {
          topics.add(topic);
        }
      }

      // Extract insights from assistant messages
      if (mem.role === ChatMessageRoleEnum.Assistant) {
        // Look for sentences with strong statements
        const sentences = mem.content.split(/[.!?]+/);
        for (const sentence of sentences) {
          const s = sentence.trim();
          if (s.length > 30 && s.length < 150) {
            // Heuristic: moderate-length sentences may contain insights
            if (
              s.includes('because') ||
              s.includes('important') ||
              s.includes('recommend') ||
              s.includes('notice') ||
              s.includes('interest')
            ) {
              insights.push(s);
            }
          }
        }
      }

      // Detect contact-related topics
      if (content.includes('contact') || content.includes('reach out') || content.includes('work together')) {
        topics.add('contact interest');
      }

      // Detect image-related content
      if (content.includes('[image:') || (mem.metadata && 'imageCaption' in (mem.metadata as Record<string, unknown>))) {
        topics.add('shared images');
        // Extract image type from metadata if available
        const metadata = mem.metadata as Record<string, unknown> | undefined;
        const caption = metadata?.imageCaption as { type?: string } | undefined;
        if (caption?.type) {
          topics.add(`image: ${caption.type}`);
        }
      }
    }

    return {
      topics: Array.from(topics).slice(0, 5),
      insights: insights.slice(0, 3),
      keyProjects: Array.from(keyProjects),
    };
  }

  /**
   * Get recent exchanges (user/assistant pairs)
   */
  private getRecentExchanges(memories: Memory[], count: number): Memory[] {
    // Filter to user/assistant messages only
    const exchanges = memories.filter(
      m => m.role === ChatMessageRoleEnum.User || m.role === ChatMessageRoleEnum.Assistant
    );

    // Take the most recent ones
    const recent = exchanges.slice(-count);

    // Tag them with recent-exchanges region and strip image data
    return recent.map(m => this.stripImageData({
      ...m,
      region: REGIONS.RECENT_EXCHANGES,
    }));
  }

  /**
   * Strip imageDataUrl from memory metadata while preserving imageCaption.
   * This prevents large base64 image data from bloating compressed memory.
   */
  private stripImageData(memory: Memory): Memory {
    if (!memory.metadata || !('imageDataUrl' in memory.metadata)) {
      return memory;
    }

    // Create new metadata without imageDataUrl
    const { imageDataUrl, ...restMetadata } = memory.metadata as Record<string, unknown>;

    return {
      ...memory,
      metadata: restMetadata,
    };
  }

  /**
   * Apply per-region memory limits
   */
  private applyRegionLimits(memories: Memory[]): Memory[] {
    const regionBuckets = new Map<string, Memory[]>();

    // Group by region
    for (const mem of memories) {
      const region = mem.region ?? REGIONS.DEFAULT;
      if (!regionBuckets.has(region)) {
        regionBuckets.set(region, []);
      }
      regionBuckets.get(region)!.push(mem);
    }

    // Apply limits
    const result: Memory[] = [];
    for (const [region, mems] of regionBuckets) {
      const config = getRegionConfig(region);
      const limit = config.maxMemories ?? mems.length;
      result.push(...mems.slice(-limit)); // Keep most recent
    }

    return result;
  }

  /**
   * Quick summary update without full compression
   */
  updateSummary(memory: WorkingMemory): WorkingMemory {
    const { topics, insights, keyProjects } = this.extractSummaryData(memory);

    const summaryMemory = createConversationSummaryMemory(
      topics,
      insights,
      memory.length
    );

    // Replace existing summary or add new one
    const withoutOldSummary = memory.withoutRegions(REGIONS.CONVERSATION_SUMMARY);
    return withoutOldSummary.withRegion(REGIONS.CONVERSATION_SUMMARY, summaryMemory);
  }

  /**
   * Reset compression tracking (e.g., on session start)
   */
  reset(): void {
    this.lastCompressionCount = 0;
  }
}

/**
 * Singleton instance for convenience
 */
let defaultCompressor: MemoryCompressor | null = null;

export function getDefaultCompressor(): MemoryCompressor {
  if (!defaultCompressor) {
    defaultCompressor = new MemoryCompressor();
  }
  return defaultCompressor;
}

/**
 * Convenience function to compress if needed
 */
export function compressIfNeeded(memory: WorkingMemory): WorkingMemory {
  const compressor = getDefaultCompressor();
  if (compressor.needsCompression(memory)) {
    return compressor.compress(memory);
  }
  if (compressor.needsSummaryUpdate(memory)) {
    return compressor.updateSummary(memory);
  }
  return memory;
}

export default MemoryCompressor;
