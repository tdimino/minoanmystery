/**
 * Conditional RAG - Topic-Aware Retrieval-Augmented Generation
 *
 * Following Aldea Soul Engine patterns (Emily Maxson reference implementation).
 * Routes user queries to knowledge buckets via regex pattern matching.
 */

import { WorkingMemory, ChatMessageRoleEnum } from '../opensouls/core';
import { retrieveDossierChunks, formatDossierContext, isRagAvailable as checkRagAvailable } from './dossierRetrieval';
import type { DossierChunk, RetrievalOptions } from './dossierRetrieval';

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

export interface RagSearchOptions {
  resultLimit?: number;
  minSimilarity?: number;
  tags?: string[];
}

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
      'kothar-scholarly': ['scholarly'],
      'kothar-historical': ['historical'],
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
   */
  async function getRagContext(
    contextType: string,
    query: string,
    options: RagSearchOptions = {}
  ): Promise<string | null> {
    const chunks = await searchForContextType(contextType, query, options);

    if (!chunks || chunks.length === 0) {
      return null;
    }

    const header = contextHeaders[contextType] || '## Relevant Knowledge';
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
