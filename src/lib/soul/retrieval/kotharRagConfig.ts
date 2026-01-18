/**
 * Kothar RAG Configuration
 *
 * Topic-aware routing configuration following Aldea Soul Engine patterns.
 * Maps user queries to knowledge buckets via regex pattern matching.
 */

import { createConditionalRag, type RagConfig, type TopicPattern } from './conditionalRag';

// ─────────────────────────────────────────────────────────────
// Context Types
// ─────────────────────────────────────────────────────────────

export type KotharContextType =
  | 'scholarly'   // Academic questions (Gordon, Astour, Harrison)
  | 'mythology'   // Minoan/ANE mythology, labyrinth symbolism
  | 'portfolio'   // Tom's work, case studies, skills
  | 'background'  // Who is Tom, personal journey, poetry
  | 'oracle'      // Daimonic wisdom, labyrinth philosophy
  | 'voice'       // Voice calibration (quotes only)
  | 'general';    // Fallback for unmatched queries

// ─────────────────────────────────────────────────────────────
// Bucket Names
// ─────────────────────────────────────────────────────────────

export const KOTHAR_BUCKETS = [
  'kothar-biography',   // Biography dossiers (Tom's journey, work, poetry)
  'kothar-scholarly',   // Gordon, Astour, Harrison scholarly sources
  'kothar-historical',  // Minoan/ANE historical context
  'kothar-oracle',      // Oracle concepts, daimonic wisdom, labyrinth philosophy
  'kothar-quotes',      // Voice calibration quotes (70+)
] as const;

export type KotharBucket = typeof KOTHAR_BUCKETS[number];

// ─────────────────────────────────────────────────────────────
// Topic Patterns
// ─────────────────────────────────────────────────────────────

const TOPIC_PATTERNS: TopicPattern[] = [
  // ========== SCHOLARLY (Hellenosemitica, linguistic evidence) ==========
  {
    pattern: /\b(gordon|cyrus\s+gordon|astour|harrison|jane\s+harrison)\b/i,
    contextType: 'scholarly',
  },
  {
    pattern: /\b(linear\s+[ab]|minoan\s+language|semitic|ugaritic|akkadian)\b/i,
    contextType: 'scholarly',
  },
  {
    pattern: /\b(hellenosemitica|west\s+semitic|canaanite|phoenician)\b/i,
    contextType: 'scholarly',
  },
  {
    pattern: /\b(etymology|linguistic|lexicon|inscription)\b/i,
    contextType: 'scholarly',
  },
  {
    pattern: /\b(decipherment|tablet|syllabary|cuneiform)\b/i,
    contextType: 'scholarly',
  },
  {
    pattern: /\b(evidence\s+for|prove|scholarly|academic|research)\b/i,
    contextType: 'scholarly',
  },

  // ========== MYTHOLOGY (Minoan culture, labyrinth symbolism) ==========
  {
    pattern: /\b(labyrinth|minotaur|theseus|ariadne|minos)\b/i,
    contextType: 'mythology',
  },
  {
    pattern: /\b(minoan|knossos|crete|bull\s+leap|snake\s+goddess)\b/i,
    contextType: 'mythology',
  },
  {
    pattern: /\b(ancient\s+near\s+east|ANE|mesopotamia|bronze\s+age)\b/i,
    contextType: 'mythology',
  },
  {
    pattern: /\b(myth|legend|symbol|archetype)\b/i,
    contextType: 'mythology',
  },
  {
    pattern: /\b(greek\s+myth|aegean|mediterranean)\b/i,
    contextType: 'mythology',
  },

  // ========== PORTFOLIO (Tom's work) ==========
  {
    pattern: /\b(tom['']?s?\s+work|portfolio|case\s+stud|project)\b/i,
    contextType: 'portfolio',
  },
  {
    pattern: /\b(CZI|chan\s+zuckerberg|dolby|ACS|american\s+cancer)\b/i,
    contextType: 'portfolio',
  },
  {
    pattern: /\b(design\s+work|UX\s+design|product\s+design)\b/i,
    contextType: 'portfolio',
  },
  {
    pattern: /\b(aldea|AI\s+work|machine\s+learning|LLM)\b/i,
    contextType: 'portfolio',
  },
  {
    pattern: /\b(client|company|employer|worked\s+(at|for|with))\b/i,
    contextType: 'portfolio',
  },

  // ========== BACKGROUND (Who is Tom, personal) ==========
  {
    pattern: /\b(who\s+(is|are)\s+(tom|you)|about\s+(tom|yourself)|your\s+background)\b/i,
    contextType: 'background',
  },
  {
    pattern: /\b(tom['']?s?\s+(journey|story|path|life))\b/i,
    contextType: 'background',
  },
  {
    pattern: /\b(poet|poetry|verse|stanza)\b/i,
    contextType: 'background',
  },
  {
    pattern: /\b(introduce|tell\s+me\s+about|who\s+made)\b/i,
    contextType: 'background',
  },
  {
    pattern: /\b(education|training|experience|career)\b/i,
    contextType: 'background',
  },

  // ========== ORACLE (Daimonic wisdom) ==========
  {
    pattern: /\b(oracle|daimon|daemon|wisdom|mystery)\b/i,
    contextType: 'oracle',
  },
  {
    pattern: /\b(initiate|initiation|rite|ritual)\b/i,
    contextType: 'oracle',
  },
  {
    pattern: /\b(labyrinth\s+as|path\s+of|journey\s+through|transformation)\b/i,
    contextType: 'oracle',
  },
  {
    pattern: /\b(sacred|threshold|liminal|passage)\b/i,
    contextType: 'oracle',
  },
  {
    pattern: /\b(meaning\s+of|purpose|philosophy|teach)\b/i,
    contextType: 'oracle',
  },
];

// ─────────────────────────────────────────────────────────────
// Context Headers
// ─────────────────────────────────────────────────────────────

const CONTEXT_HEADERS: Record<KotharContextType, string> = {
  scholarly: '## Scholarly Knowledge (Hellenosemitica)',
  mythology: '## Minoan Mythology & Symbolism',
  portfolio: "## Tom di Mino's Work",
  background: '## About Tom di Mino',
  oracle: '## Daimonic Wisdom',
  voice: '## Voice Patterns',
  general: '## Relevant Knowledge',
};

// ─────────────────────────────────────────────────────────────
// RAG Configuration
// ─────────────────────────────────────────────────────────────

export const KOTHAR_RAG_CONFIG: RagConfig = {
  buckets: [...KOTHAR_BUCKETS],

  contextTypeBuckets: {
    scholarly: ['kothar-scholarly', 'kothar-quotes'],
    mythology: ['kothar-historical', 'kothar-oracle'],
    portfolio: ['kothar-biography', 'kothar-quotes'],
    background: ['kothar-biography', 'kothar-quotes'],
    oracle: ['kothar-oracle', 'kothar-quotes'],
    voice: ['kothar-quotes'],
    general: ['kothar-scholarly', 'kothar-oracle'],
  },

  topicPatterns: TOPIC_PATTERNS,
  defaultContextType: 'general',
  contextHeaders: CONTEXT_HEADERS,
};

// ─────────────────────────────────────────────────────────────
// Instantiate Conditional RAG Interface
// ─────────────────────────────────────────────────────────────

export const kotharRag = createConditionalRag(KOTHAR_RAG_CONFIG);

// Convenience re-exports
export const {
  getRagContext,
  getAutoRagContext,
  searchBucket,
  withTypedRagContext,
  withAutoRagContext,
  detectContextType,
  detectContextTypeFromMemory,
  getBuckets,
  getBucketsForContextType,
  isRagAvailable,
} = kotharRag;
