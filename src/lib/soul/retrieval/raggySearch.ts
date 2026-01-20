/**
 * Raggy Search - Question-Based RAG for Semantic Coverage
 *
 * Following the Emily Maxson pattern: generates semantic questions from
 * user queries for broader retrieval coverage, then deduplicates results.
 */

import { createCognitiveStep, ChatMessageRoleEnum, THINKING_MODEL, indentNicely } from '../opensouls/core';
import type { WorkingMemory } from '../opensouls/core';
import { retrieveDossierChunks, type DossierChunk, type RetrievalOptions } from './dossierRetrieval';
import { formatChunksWithHeader } from './formatChunk';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

/**
 * Number of characters used for content fingerprinting during deduplication.
 * Balance between collision resistance and near-duplicate detection.
 * 150 chars captures most unique openings while allowing similar content
 * from different search angles to be deduplicated.
 */
const FINGERPRINT_LENGTH = 150;

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface RaggySearchOptions extends RetrievalOptions {
  /** Number of questions to generate (default: 4) */
  questionCount?: number;
  /** Results per question (default: 3) */
  resultsPerQuestion?: number;
  /** Maximum total results after deduplication (default: 10) */
  maxResults?: number;
}

export interface RaggySearchResult {
  /** The semantic questions generated */
  questions: string[];
  /** Deduplicated, ranked results */
  results: DossierChunk[];
  /** Total results before deduplication */
  totalBeforeDedup: number;
  /** Number of search failures (if any) */
  searchFailures?: number;
}

// ─────────────────────────────────────────────────────────────
// Question Generation Cognitive Step
// ─────────────────────────────────────────────────────────────

interface QuestionGenerationArgs {
  query: string;
  contextType: string;
  questionCount: number;
}

/**
 * Generate semantic search questions from a user query
 *
 * Uses a fast model to rephrase the query as multiple search-optimized questions.
 * This improves recall by capturing different facets of the user's intent.
 */
export const generateRagQuestions = createCognitiveStep<QuestionGenerationArgs, string[]>(
  (opts) => ({
    command: (memory) => ({
      role: ChatMessageRoleEnum.System,
      name: memory.soulName,
      content: indentNicely`
        You are ${memory.soulName || 'a search query optimizer'}. Generate ${opts.questionCount} semantic search questions to find relevant information for this query.

        Context domain: ${opts.contextType}
        User query: "${opts.query}"

        Rules:
        - Each question should explore a different facet of the query
        - Use specific terminology that might appear in documents
        - For philosophical/scholarly queries, include technical terms
        - For personal/biographical queries, include name variations
        - For poetry queries, include poem titles and themes

        Return ONLY a JSON array of questions, no explanation or markdown:
        ["question 1", "question 2", "question 3", "question 4"]
      `,
    }),
    postProcess: async (_memory, response) => {
      try {
        // Clean the response - sometimes LLMs add markdown code fences
        const cleaned = response
          .replace(/```json?\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
        const questions = JSON.parse(cleaned);
        if (Array.isArray(questions) && questions.every(q => typeof q === 'string')) {
          return [
            { role: ChatMessageRoleEnum.Assistant, content: response },
            questions,
          ];
        }
        // Fallback: return original query as single question
        return [
          { role: ChatMessageRoleEnum.Assistant, content: response },
          [opts.query],
        ];
      } catch {
        // JSON parse failed, return original query
        return [
          { role: ChatMessageRoleEnum.Assistant, content: response },
          [opts.query],
        ];
      }
    },
  })
);

// ─────────────────────────────────────────────────────────────
// Raggy Search Implementation
// ─────────────────────────────────────────────────────────────

/**
 * Generate a fingerprint for content deduplication
 *
 * Uses the first FINGERPRINT_LENGTH characters, normalized for case and whitespace.
 * This allows near-duplicates (same content found via different questions) to be
 * detected while maintaining distinction between genuinely different content.
 *
 * @param content - The content to fingerprint
 * @returns Normalized fingerprint string
 */
function contentFingerprint(content: string): string {
  return content
    .slice(0, FINGERPRINT_LENGTH)
    .toLowerCase()
    .normalize('NFC') // Unicode normalization
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Raggy Search - Question-based RAG with deduplication
 *
 * 1. Generates semantic questions from the user query
 * 2. Searches each question in parallel (with partial failure tolerance)
 * 3. Deduplicates by content fingerprint
 * 4. Ranks by similarity score
 *
 * @param query - The user's original query
 * @param contextType - The detected context type (for question generation hints)
 * @param memory - WorkingMemory for the cognitive step
 * @param options - Search options
 */
export async function raggySearch(
  query: string,
  contextType: string,
  memory: WorkingMemory,
  options: RaggySearchOptions = {}
): Promise<RaggySearchResult> {
  const {
    questionCount = 4,
    resultsPerQuestion = 3,
    maxResults = 10,
    sourceTypes,
    tags,
    threshold = 0.65, // Slightly lower threshold since we're doing broader search
  } = options;

  // Step 1: Generate semantic questions
  let questions: string[];
  try {
    const [, generatedQuestions] = await generateRagQuestions(
      memory,
      { query, contextType, questionCount },
      { model: THINKING_MODEL, temperature: 0.3 }
    );
    questions = generatedQuestions;
  } catch (error) {
    console.warn('[RaggySearch] Question generation failed, using original query:', error);
    questions = [query];
  }

  // Always include the original query
  if (!questions.includes(query)) {
    questions = [query, ...questions.slice(0, questionCount - 1)];
  }

  // Step 2: Search each question in parallel with partial failure tolerance
  const retrievalOptions: RetrievalOptions = {
    topK: resultsPerQuestion,
    threshold,
    sourceTypes,
    tags,
  };

  const searchPromises = questions.map(q => retrieveDossierChunks(q, retrievalOptions));
  const searchResults = await Promise.allSettled(searchPromises);

  // Extract successful results, count failures
  let searchFailures = 0;
  const allResults: DossierChunk[] = [];

  for (const result of searchResults) {
    if (result.status === 'fulfilled') {
      allResults.push(...result.value);
    } else {
      searchFailures++;
      console.warn('[RaggySearch] Search failed for a question:', result.reason);
    }
  }

  const totalBeforeDedup = allResults.length;

  // Step 3: Deduplicate by content fingerprint
  const seen = new Set<string>();
  const deduplicated: DossierChunk[] = [];

  for (const chunk of allResults) {
    const fingerprint = contentFingerprint(chunk.content);
    if (!seen.has(fingerprint)) {
      seen.add(fingerprint);
      deduplicated.push(chunk);
    }
  }

  // Step 4: Rank by similarity, take top results
  const ranked = deduplicated
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults);

  return {
    questions,
    results: ranked,
    totalBeforeDedup,
    ...(searchFailures > 0 && { searchFailures }),
  };
}

/**
 * Format Raggy results for WorkingMemory injection
 *
 * Uses shared formatChunksWithHeader utility for consistency.
 */
export function formatRaggyResults(
  result: RaggySearchResult,
  header: string = '## Relevant Knowledge'
): string | null {
  return formatChunksWithHeader(result.results, header);
}

/**
 * Convenience function: Raggy search + format in one call
 */
export async function getRaggyContext(
  query: string,
  contextType: string,
  memory: WorkingMemory,
  options: RaggySearchOptions = {},
  header?: string
): Promise<string | null> {
  const result = await raggySearch(query, contextType, memory, options);
  return formatRaggyResults(result, header);
}
