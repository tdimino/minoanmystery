/**
 * Kothar RAG Configuration
 *
 * Topic-aware routing configuration following Aldea Soul Engine patterns.
 * Maps user queries to knowledge buckets via regex pattern matching.
 *
 * Bucket structure matches actual dossier folders:
 * - biography/          → kothar-biography
 * - poetry/             → kothar-poetry
 * - scholarly-sources/  → kothar-scholarly
 * - thera-knossos-minos/→ kothar-etymology
 * - oracle-concepts/    → kothar-oracle
 * - daimonic-soul-engine/ → kothar-oracle
 * - quotes.md           → kothar-quotes
 */

import { createConditionalRag, type RagConfig, type TopicPattern } from './conditionalRag';

// ─────────────────────────────────────────────────────────────
// Context Types
// ─────────────────────────────────────────────────────────────

export type KotharContextType =
  | 'scholarly'   // Academic sources (Gordon, Astour, Harrison, Rendsburg)
  | 'etymology'   // Thera-Knossos-Minos etymological research
  | 'portfolio'   // Tom's work, case studies, skills
  | 'background'  // Who is Tom, personal journey, poetry
  | 'oracle'      // Daimonic wisdom, soul philosophy
  | 'voice'       // Voice calibration (quotes only)
  | 'general';    // Fallback for unmatched queries

// ─────────────────────────────────────────────────────────────
// Bucket Names
// ─────────────────────────────────────────────────────────────

export const KOTHAR_BUCKETS = [
  'kothar-biography',   // Biography dossiers (Tom's journey, career)
  'kothar-poetry',      // Poetry collection (Shirat Ha Kotharot)
  'kothar-scholarly',   // Gordon, Astour, Harrison, Rendsburg scholarly sources
  'kothar-etymology',   // Thera-Knossos-Minos etymological arguments
  'kothar-oracle',      // Oracle concepts, daimonic wisdom, soul philosophy
  'kothar-quotes',      // Voice calibration quotes (70+)
] as const;

export type KotharBucket = typeof KOTHAR_BUCKETS[number];

// ─────────────────────────────────────────────────────────────
// Topic Patterns
// ─────────────────────────────────────────────────────────────

const TOPIC_PATTERNS: TopicPattern[] = [
  // ========== SCHOLARLY (Academic sources, linguistic evidence) ==========
  {
    pattern: /\b(gordon|cyrus\s+gordon|astour|harrison|jane\s+harrison|rendsburg)\b/i,
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
    pattern: /\b(linguistic|lexicon|inscription|cuneiform)\b/i,
    contextType: 'scholarly',
  },
  {
    pattern: /\b(decipherment|tablet|syllabary)\b/i,
    contextType: 'scholarly',
  },
  {
    pattern: /\b(scholarly|academic|research\s+on|evidence\s+for)\b/i,
    contextType: 'scholarly',
  },
  // Ugaritic poetry (from scholarly-sources/gordon/ugaritic-poetry/)
  {
    pattern: /\b(baal|anath|aqhat|kret|ugarit)\b/i,
    contextType: 'scholarly',
  },

  // ========== ETYMOLOGY (Thera-Knossos-Minos research) ==========
  {
    pattern: /\b(thera|santorini|kalliste)\b/i,
    contextType: 'etymology',
  },
  {
    pattern: /\b(knossos|minos|minoan)\b/i,
    contextType: 'etymology',
  },
  {
    pattern: /\b(etymology|etymolog|word\s+origin|name\s+means)\b/i,
    contextType: 'etymology',
  },
  {
    pattern: /\b(tehom|tiamat|primordial\s+waters|potnia)\b/i,
    contextType: 'etymology',
  },
  {
    pattern: /\b(labyrinth|minotaur|ariadne)\b/i,
    contextType: 'etymology',
  },
  {
    pattern: /\b(bronze\s+age|aegean|mediterranean|crete)\b/i,
    contextType: 'etymology',
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
    pattern: /\b(google|jpmc|jp\s+morgan|napari|sitecore)\b/i,
    contextType: 'portfolio',
  },
  {
    pattern: /\b(client|company|employer|worked\s+(at|for|with))\b/i,
    contextType: 'portfolio',
  },

  // ========== BACKGROUND (Who is Tom, personal, poetry) ==========
  {
    pattern: /\b(who\s+(is|are)\s+(tom|you)|about\s+(tom|yourself)|your\s+background)\b/i,
    contextType: 'background',
  },
  {
    pattern: /\b(tom['']?s?\s+(journey|story|path|life))\b/i,
    contextType: 'background',
  },
  {
    pattern: /\b(poet|poetry|verse|stanza|poem)\b/i,
    contextType: 'background',
  },
  // Poetry collection titles and specific poems
  {
    pattern: /\b(shirat|kotharot|artifex\s+intellegere|sacramento|agua\s+de\s+vida)\b/i,
    contextType: 'background',
  },
  {
    pattern: /\b(ba'alat\s+ackbarat|themis\s+kai|marginalia|dabarim\s+kaphtorim)\b/i,
    contextType: 'background',
  },
  {
    pattern: /\b(creative\s+work|poetry\s+collection|wrote|written)\b/i,
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

  // ========== ORACLE (Daimonic wisdom, soul philosophy) ==========
  {
    pattern: /\b(oracle|daimon|daemon|wisdom|mystery)\b/i,
    contextType: 'oracle',
  },
  // Daimonic philosophy (Waltz of Soul and Daimon, triadic model)
  {
    pattern: /\b(pathos|menos|pneuma|daimonic)\b/i,
    contextType: 'oracle',
  },
  {
    pattern: /\b(soul\s+and\s+the\s+daimon|waltz|vivify|vivifying)\b/i,
    contextType: 'oracle',
  },
  {
    pattern: /\b(triadic\s+model|soul.*wax|pathos.*fire)\b/i,
    contextType: 'oracle',
  },
  // Soul engine philosophy
  {
    pattern: /\b(cognitive\s+step|mental\s+process|working\s+memory)\b/i,
    contextType: 'oracle',
  },
  {
    pattern: /\b(soul\s+engine|soul\s+architecture|immutable\s+memory)\b/i,
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
  scholarly: '## Scholarly Knowledge',
  etymology: '## Etymological Research',
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
    etymology: ['kothar-etymology', 'kothar-scholarly'],
    portfolio: ['kothar-biography', 'kothar-quotes'],
    background: ['kothar-biography', 'kothar-poetry', 'kothar-quotes'],
    oracle: ['kothar-oracle', 'kothar-quotes'],
    voice: ['kothar-quotes'],
    general: ['kothar-scholarly', 'kothar-oracle', 'kothar-etymology'],
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
