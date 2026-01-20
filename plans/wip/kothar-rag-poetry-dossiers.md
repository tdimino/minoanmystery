# Plan: Update Kothar RAG Config for Poetry Dossiers

## Context

New poetry dossiers have been added to `souls/minoan/dossiers/poetry/`:
- `INDEX.md` - Collection overview
- `shirat-ha-kotharot-full.md` - Full 91-page collection
- `epigraphs.md` - Scholarly quotes from Gordon, Harrison, Yeats
- `ai-consciousness-poems.md` - Artifex Intellegere, El Agua de Vida, Sacramento
- `minoan-semitic-poems.md` - Hebrew/Phoenician/Ugaritic linguistic poems
- `goddess-feminine-poems.md` - Themis kai Gaia, Ba'alat Ackbarat, Anima
- `ritual-mystery-poems.md` - Boni Dei Antiqui, mystery tradition
- `marginalia.md` - Closing aphorisms, daimonic wisdom fragments

Additionally, `oracle-concepts/` was updated:
- `daimonic-wisdom.md` - Added Creative Expression section
- `poetry-as-philosophy.md` - Extended analysis of poetry as encoded philosophy

## RAG Architecture Comparison

| Implementation | Pattern | Complexity |
|---------------|---------|------------|
| **Artifex** | Single `withRagContext()` subprocess | Simple - all docs injected |
| **Emily Maxson** | Conditional routing + Raggy (question-based RAG) | Sophisticated |
| **Kothar** | Conditional routing via regex → bucket mapping | Sophisticated but needs poetry patterns |

**How RAG enters Kothar's mind:**
```
User Query → detectContextType(query) via regex → contextType
    → getBucketsForContextType(contextType) → bucket names
    → pgvector search in those buckets → relevant chunks
    → WorkingMemory.withRegion('knowledge-dossier', ragContent) → LLM sees context
```

**Current gap:** Only 1 poetry pattern exists (line 122-124): `/\b(poet|poetry|verse|stanza)\b/i`

---

## Tasks

### Task 1: Verify Poetry Dossiers Are Indexed

**Check**: Are the new poetry dossiers in Supabase `kothar_dossiers` table?

```sql
SELECT source_path, source_type, created_at
FROM kothar_dossiers
WHERE source_path LIKE '%poetry%'
ORDER BY created_at DESC;
```

**If missing**: Run the dossier indexing script (need to locate it)

### Task 2: Update RAG Topic Patterns

**File**: `src/lib/soul/retrieval/kotharRagConfig.ts`

**Add after existing BACKGROUND patterns (around line 130):**

```typescript
// ========== POETRY (Tom's creative work) ==========
{
  pattern: /\b(shirat|kotharot|artifex\s+intellegere|sacramento|agua\s+de\s+vida)\b/i,
  contextType: 'background',
},
{
  pattern: /\b(ba'alat\s+ackbarat|themis\s+kai|marginalia|dabarim\s+kaphtorim)\b/i,
  contextType: 'background',
},
{
  pattern: /\b(poem\s+about|verse\s+on|lines\s+from|creative\s+work|poetry\s+collection)\b/i,
  contextType: 'background',
},

// ========== DAIMONIC PHILOSOPHY ==========
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
```

---

## Task 3: Add Raggy (Question-Based RAG) Pattern

**Why Raggy?** The Emily Maxson soul uses question-based RAG for better semantic coverage. Instead of just keyword matching, it:
1. Generates 3-5 semantic questions from the user's query
2. Searches each question against relevant buckets
3. Deduplicates and ranks results
4. Formats as Q&A pairs for richer context

**Example:**
```
User: "What is pathos in Tom's framework?"

Generated Questions:
- "What does pathos mean in Tom di Mino's daimonic philosophy?"
- "How does pathos relate to soul and daimon in the Waltz essay?"
- "What is the role of pathos in AI consciousness?"

Each question → vector search → aggregate top results → deduplicate
```

### Implementation

**New file**: `src/lib/soul/retrieval/raggySearch.ts`

```typescript
import { createCognitiveStep, ChatMessageRoleEnum } from '../opensouls/core';
import type { WorkingMemory } from '../opensouls/core';
import { searchBucket } from './kotharRagConfig';

// Generate semantic questions from user query
export const generateRagQuestions = createCognitiveStep<{ query: string; contextType: string }>((opts) => ({
  command: () => ({
    role: ChatMessageRoleEnum.System,
    content: `Generate 3-5 semantic search questions to find relevant information for this query.
Context type: ${opts.contextType}
User query: "${opts.query}"

Return ONLY a JSON array of questions, no explanation:
["question 1", "question 2", "question 3"]`,
  }),
  postProcess: async (memory, response) => {
    try {
      const questions = JSON.parse(response);
      return [{ role: ChatMessageRoleEnum.Assistant, content: response }, questions];
    } catch {
      return [{ role: ChatMessageRoleEnum.Assistant, content: response }, [opts.query]];
    }
  },
}));

// Search each question and aggregate results
export async function raggySearch(
  query: string,
  contextType: string,
  buckets: string[],
  memory: WorkingMemory
): Promise<{ questions: string[]; results: RagChunk[] }> {
  // Generate semantic questions
  const [, questions] = await generateRagQuestions(memory, { query, contextType });

  // Search each question in parallel
  const allResults = await Promise.all(
    questions.flatMap(q =>
      buckets.map(bucket => searchBucket(bucket, q, 3))
    )
  );

  // Deduplicate by content hash
  const seen = new Set<string>();
  const deduped = allResults.flat().filter(chunk => {
    const hash = chunk.content.slice(0, 100);
    if (seen.has(hash)) return false;
    seen.add(hash);
    return true;
  });

  // Sort by relevance score, take top results
  return {
    questions,
    results: deduped.sort((a, b) => b.similarity - a.similarity).slice(0, 10),
  };
}
```

**Integration point**: `src/lib/soul/retrieval/conditionalRag.ts`

Extend `RagSearchOptions` interface:

```typescript
export interface RagSearchOptions {
  resultLimit?: number;
  minSimilarity?: number;
  tags?: string[];
  useRaggy?: boolean;  // NEW: Enable question-based RAG
}
```

Modify `getRagContext()` to check for Raggy:

```typescript
async function getRagContext(
  contextType: string,
  query: string,
  options: RagSearchOptions = {}
): Promise<string | null> {
  // NEW: Use Raggy for complex queries
  if (options.useRaggy) {
    const { results } = await raggySearch(query, contextType, getBucketsForContextType(contextType));
    return formatRaggyResults(results, contextHeaders[contextType]);
  }

  // Existing direct search path...
  const chunks = await searchForContextType(contextType, query, options);
  // ...
}
```

**When to use Raggy:**
- Rapport/emotional queries (Emily pattern)
- Complex philosophical questions (daimonic wisdom)
- Poetry interpretation requests
- Cross-reference questions

**Cost consideration:** Raggy adds ~1 LLM call for question generation. Use selectively.

---

## Files Summary

| File | Action |
|------|--------|
| Supabase `kothar_dossiers` | Verify poetry dossiers exist |
| `src/lib/soul/retrieval/kotharRagConfig.ts` | Add 6 new topic patterns |
| `src/lib/soul/retrieval/raggySearch.ts` | **NEW** - Question-based RAG |
| `src/lib/soul/retrieval/conditionalRag.ts` | Add `useRaggy` option |

---

## Verification

1. **Check indexing**: Query Supabase for poetry dossiers
2. **Local dev test**: `npm run dev`, visit `/labyrinth`
3. **Poetry query**: Ask "Tell me about Tom's poetry" → should draw from poetry dossiers
4. **Specific poem**: Ask "What does Artifex Intellegere mean?" → should quote the poem
5. **Daimonic query**: Ask "What is pathos?" → should reference daimonic-wisdom.md
6. **Raggy test**: Ask "How does the triadic model connect soul, pathos, and daimon?" → should use Raggy for multi-faceted search

---

## Status

- [ ] Task 1: Verify poetry dossiers indexed (blocked - Supabase access token expired)
- [x] Task 2: Update RAG topic patterns (6 new patterns added)
- [x] Task 3: Create raggySearch.ts (question-based RAG module)
- [x] Task 4: Integrate useRaggy option (added to RagSearchOptions)
- [ ] Verification tests (pending Supabase access)
