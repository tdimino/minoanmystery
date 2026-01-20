/**
 * Conditional RAG - Topic-Aware Retrieval-Augmented Generation
 *
 * Following Aldea Soul Engine patterns (Emily Maxson reference implementation).
 * Routes user queries to knowledge buckets via regex pattern matching.
 */

import { WorkingMemory, ChatMessageRoleEnum } from '../opensouls/core';
import { retrieveDossierChunks, formatDossierContext, isRagAvailable as checkRagAvailable } from './dossierRetrieval';
import type { DossierChunk, RetrievalOptions } from './dossierRetrieval';
import { raggySearch, formatRaggyResults, type RaggySearchOptions } from './raggySearch';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface TopicPattern {
  pattern: RegExp;
  contextType: string;
}

export interface RagConfig {
  buckets: readonly string[] | string[];
  contextTypeBuckets: Record<string, string[]>;
  topicPatterns: TopicPattern[];
  defaultContextType: string;
  contextHeaders?: Record<string, string>;
}

// ─────────────────────────────────────────────────────────────
// RAG Search Options (Discriminated Union)
// ─────────────────────────────────────────────────────────────

/**
 * Base options shared between standard and Raggy RAG modes
 */
interface BaseRagSearchOptions {
  /** Maximum number of results to return */
  resultLimit?: number;
  /** Minimum similarity threshold (0-1) */
  minSimilarity?: number;
  /** Filter by tags */
  tags?: string[];
}

/**
 * Standard RAG search options (direct vector search)
 */
export interface StandardRagSearchOptions extends BaseRagSearchOptions {
  /** Set to false or omit for standard RAG */
  useRaggy?: false;
  /** Memory not required for standard mode */
  memory?: WorkingMemory;
}

/**
 * Raggy RAG search options (question-based semantic expansion)
 * Requires WorkingMemory for the cognitive step that generates questions.
 */
export interface RaggyRagSearchOptions extends BaseRagSearchOptions {
  /** Enable question-based RAG for semantic expansion */
  useRaggy: true;
  /** WorkingMemory REQUIRED for Raggy cognitive step */
  memory: WorkingMemory;
  /** Raggy-specific options (questionCount, resultsPerQuestion, maxResults) */
  raggyOptions?: Partial<RaggySearchOptions>;
}

/**
 * Combined RAG search options using discriminated union.
 * When useRaggy is true, memory is required at the type level.
 */
export type RagSearchOptions = StandardRagSearchOptions | RaggyRagSearchOptions;

/**
 * Type guard to check if options are for Raggy mode
 */
export function isRaggyOptions(options: RagSearchOptions): options is RaggyRagSearchOptions {
  return options.useRaggy === true && options.memory !== undefined;
}

// Re-export Raggy types for convenience
export type { RaggySearchOptions, RaggySearchResult } from './raggySearch';

export interface ConditionalRagInterface {
  /**
   * Inject RAG context for a specific context type
   */
  withTypedRagContext: (
    memory: WorkingMemory,
    contextType: string,
    query: string,
    options?: RagSearchOptions
  ) => Promise<WorkingMemory>;

  /**
   * Auto-detect context type and inject RAG context
   */
  withAutoRagContext: (
    memory: WorkingMemory,
    query: string,
    options?: RagSearchOptions
  ) => Promise<WorkingMemory>;

  /**
   * Search a specific bucket directly
   */
  searchBucket: (
    bucket: string,
    query: string,
    options?: RagSearchOptions
  ) => Promise<DossierChunk[]>;

  /**
   * Get RAG context string without injecting into memory
   */
  getRagContext: (
    contextType: string,
    query: string,
    options?: RagSearchOptions
  ) => Promise<string | null>;

  /**
   * Get RAG context with auto-detected context type
   */
  getAutoRagContext: (
    query: string,
    options?: RagSearchOptions
  ) => Promise<{ contextType: string; context: string | null }>;

  /**
   * Detect context type from text using topic patterns
   */
  detectContextType: (text: string) => string;

  /**
   * Detect context type from conversation memory
   */
  detectContextTypeFromMemory: (memory: WorkingMemory) => string;

  /**
   * Get all configured buckets
   */
  getBuckets: () => string[];

  /**
   * Get buckets for a specific context type
   */
  getBucketsForContextType: (contextType: string) => string[];

  /**
   * Check if RAG is available (env vars configured)
   */
  isRagAvailable: () => boolean;
}

// ─────────────────────────────────────────────────────────────
// Factory Function
// ─────────────────────────────────────────────────────────────

export function createConditionalRag(config: RagConfig): ConditionalRagInterface {
  const {
    buckets,
    contextTypeBuckets,
    topicPatterns,
    defaultContextType,
    contextHeaders = {},
  } = config;

  /**
   * Detect context type from text using regex patterns
   */
  function detectContextType(text: string): string {
    const lowerText = text.toLowerCase();

    for (const { pattern, contextType } of topicPatterns) {
      if (pattern.test(text) || pattern.test(lowerText)) {
        return contextType;
      }
    }

    return defaultContextType;
  }

  /**
   * Detect context type from the last few messages in memory
   */
  function detectContextTypeFromMemory(memory: WorkingMemory): string {
    // Look at last 3 user messages for topic detection
    const recentMessages = memory.memories
      .filter(m => m.role === ChatMessageRoleEnum.User)
      .slice(-3)
      .map(m => m.content)
      .join(' ');

    return detectContextType(recentMessages);
  }

  /**
   * Get buckets for a context type
   */
  function getBucketsForContextType(contextType: string): string[] {
    return contextTypeBuckets[contextType] || contextTypeBuckets[defaultContextType] || [];
  }

  /**
   * Map source_type filter based on bucket name
   */
  function getSourceTypesForBucket(bucket: string): string[] {
    // Map bucket names to source_type values used in dossier metadata
    const bucketToSourceTypes: Record<string, string[]> = {
      'kothar-biography': ['biography'],
      'kothar-poetry': ['poetry'],
      'kothar-scholarly': ['scholarly'],
      'kothar-etymology': ['etymology'],
      'kothar-oracle': ['oracle'],
      'kothar-quotes': ['quotes'],
    };

    return bucketToSourceTypes[bucket] || [];
  }

  /**
   * Search across buckets for a context type
   */
  async function searchForContextType(
    contextType: string,
    query: string,
    options: RagSearchOptions = {}
  ): Promise<DossierChunk[]> {
    const targetBuckets = getBucketsForContextType(contextType);

    if (targetBuckets.length === 0) {
      return [];
    }

    // Collect source types from all target buckets
    const sourceTypes = targetBuckets.flatMap(getSourceTypesForBucket);

    const retrievalOptions: RetrievalOptions = {
      topK: options.resultLimit || 3,
      threshold: options.minSimilarity || 0.7,
      sourceTypes: sourceTypes.length > 0 ? sourceTypes : undefined,
      tags: options.tags,
    };

    return retrieveDossierChunks(query, retrievalOptions);
  }

  /**
   * Search a specific bucket
   */
  async function searchBucket(
    bucket: string,
    query: string,
    options: RagSearchOptions = {}
  ): Promise<DossierChunk[]> {
    const sourceTypes = getSourceTypesForBucket(bucket);

    const retrievalOptions: RetrievalOptions = {
      topK: options.resultLimit || 3,
      threshold: options.minSimilarity || 0.7,
      sourceTypes: sourceTypes.length > 0 ? sourceTypes : undefined,
      tags: options.tags,
    };

    return retrieveDossierChunks(query, retrievalOptions);
  }

  /**
   * Get formatted RAG context for a context type
   *
   * Supports two modes:
   * - Standard: Direct vector search (default)
   * - Raggy: Question-based RAG with semantic expansion (useRaggy: true)
   */
  async function getRagContext(
    contextType: string,
    query: string,
    options: RagSearchOptions = {}
  ): Promise<string | null> {
    const header = contextHeaders[contextType] || '## Relevant Knowledge';

    // Runtime validation: warn if useRaggy is true but memory is missing
    // This catches edge cases where the type guard is bypassed
    if (options.useRaggy === true && !options.memory) {
      console.warn(
        '[ConditionalRag] useRaggy=true requires memory parameter. ' +
        'Falling back to standard RAG. Pass memory for question-based search.'
      );
    }

    // Raggy mode: Use question-based RAG for semantic expansion
    // Use type guard for proper TypeScript narrowing
    if (isRaggyOptions(options)) {
      const targetBuckets = getBucketsForContextType(contextType);
      const sourceTypes = targetBuckets.flatMap(getSourceTypesForBucket);

      const raggyResult = await raggySearch(
        query,
        contextType,
        options.memory, // TypeScript now knows this is defined
        {
          topK: options.resultLimit || 3,
          threshold: options.minSimilarity || 0.65, // Lower for Raggy
          sourceTypes: sourceTypes.length > 0 ? sourceTypes : undefined,
          tags: options.tags,
          ...options.raggyOptions,
        }
      );

      return formatRaggyResults(raggyResult, header);
    }

    // Standard mode: Direct vector search
    const chunks = await searchForContextType(contextType, query, options);

    if (!chunks || chunks.length === 0) {
      return null;
    }

    const formattedContent = formatDossierContext(chunks);

    if (!formattedContent) {
      return null;
    }

    return `${header}\n\n${formattedContent}`;
  }

  /**
   * Get RAG context with auto-detected context type
   */
  async function getAutoRagContext(
    query: string,
    options: RagSearchOptions = {}
  ): Promise<{ contextType: string; context: string | null }> {
    const contextType = detectContextType(query);
    const context = await getRagContext(contextType, query, options);

    return { contextType, context };
  }

  /**
   * Inject typed RAG context into WorkingMemory
   */
  async function withTypedRagContext(
    memory: WorkingMemory,
    contextType: string,
    query: string,
    options: RagSearchOptions = {}
  ): Promise<WorkingMemory> {
    if (!checkRagAvailable()) {
      return memory;
    }

    const context = await getRagContext(contextType, query, options);

    if (!context) {
      return memory;
    }

    return memory.withRegion('knowledge-dossier', {
      role: ChatMessageRoleEnum.System,
      content: context,
    });
  }

  /**
   * Auto-detect context type and inject RAG context
   */
  async function withAutoRagContext(
    memory: WorkingMemory,
    query: string,
    options: RagSearchOptions = {}
  ): Promise<WorkingMemory> {
    if (!checkRagAvailable()) {
      return memory;
    }

    const contextType = detectContextType(query);
    return withTypedRagContext(memory, contextType, query, options);
  }

  // Return the conditional RAG interface
  return {
    withTypedRagContext,
    withAutoRagContext,
    searchBucket,
    getRagContext,
    getAutoRagContext,
    detectContextType,
    detectContextTypeFromMemory,
    getBuckets: () => [...buckets],
    getBucketsForContextType,
    isRagAvailable: checkRagAvailable,
  };
}
