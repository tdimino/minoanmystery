# Kothar RAG Dossier Integration

Transform Kothar from a static personality file into a knowledge-grounded oracle with retrieval-augmented generation (RAG) using the Aldea Soul Engine dossier pattern.

## Context

**Current State**: Kothar's knowledge is "baked into" a single 63-line markdown file (`souls/minoan/minoan.md`). No retrieval system exists.

**Goal**: Create a rich dossier system modeled after `/Users/tomdimino/Desktop/Aldea/Prompt development/Aldea-Soul-Engine/RAG-dossiers` that gives Kothar deep knowledge of:
- Tom di Mino (biography, work, poetry)
- Scholarly sources (Jane E. Harrison, Cyrus H. Gordon, Michael Astour)
- Minoan/Ancient Near Eastern historical research
- Oracle philosophy and daimonic wisdom concepts

**Architecture Readiness**: The soul engine already has:
- Region-based WorkingMemory with priority ordering
- Visitor context injection pattern (lines 214-220 in chat.ts)
- Mental processes that can reason before responding

---

## Dossier Structure

```
souls/minoan/dossiers/
├── INDEX.md                      # Master index & research status
├── quotes.md                     # Voice calibration quotes (70+)
├── biography/
│   ├── tom-origin-story.md       # Formative experiences, path to AI/poetry
│   ├── tom-portfolio-work.md     # ACS, CZI, Dolby, Aldea work
│   └── tom-poetic-journey.md     # Poetry development, publications
├── poetry/
│   ├── themes.md                 # Cross-cutting poetic themes
│   └── [selected-poems].md       # Key poems with analysis
├── scholarly-sources/
│   ├── jane-e-harrison.md        # Prolegomena, Themis, ritual theory
│   ├── cyrus-h-gordon.md         # Ugaritic studies, Minoan connections
│   └── michael-astour.md         # Hellenosemitica, ancient trade
├── minoan-ANE/
│   ├── minoan-civilization.md    # Palace culture, religion, art
│   ├── labyrinth-mythology.md    # Daedalus, Minotaur, ritual meaning
│   ├── tehom-tiamat.md           # Deep waters mythology, goddess traditions
│   └── bronze-age-connections.md # ANE-Aegean cultural exchange
└── oracle-concepts/
    ├── oracle-persona.md         # Kothar's identity as divine craftsman
    ├── daimonic-wisdom.md        # Seeing through veils, liminal knowledge
    └── labyrinth-as-knowledge.md # Navigation metaphor, complexity
```

---

## Dossier Format (Universal Template)

Each dossier follows this structure:

```markdown
# [Title]

## Source
- Type: [Biography | Concept | Scholar | Poetry | Historical]
- Primary Sources: [URLs, books, citations]
- Last Updated: [Date]

## Overview
[1-3 paragraphs explaining what this is, why it matters to Kothar]

## Core Concepts
[Hierarchical breakdown with ### subheadings]

## Notable Quotes
> "Quote" — Source, Context

## Cross-References
- [Related dossier links]

## RAG Tags
[Keywords for vector search: minoan, tehom, goddess, labyrinth, ...]
```

---

## Technical Integration

### Phase 1: Dossier Content Creation (Manual)

Create the dossier files with structured content. Priority order:
1. `quotes.md` - Voice calibration (essential for tone)
2. `oracle-concepts/` - Kothar's philosophical framework
3. `biography/tom-portfolio-work.md` - Portfolio knowledge
4. `scholarly-sources/` - Harrison, Gordon, Astour
5. `minoan-ANE/` - Historical domain knowledge
6. `poetry/` - Tom's poetic work

### Phase 2: RAG Infrastructure (Vector Embeddings)

**Approach**: Reuse Aldea Soul Engine's existing vector infrastructure

**Existing Infrastructure** (from Aldea Open Souls Engine):
- Supabase pgvector storage
- Embedding generation pipeline
- Chunking and ingestion scripts

**Steps:**
1. **Chunk dossiers** into semantic units (~500-1000 tokens each)
2. **Use existing Aldea embedding pipeline** (same models/config)
3. **Store in Aldea Supabase** with Kothar-specific bucket/namespace
4. **Port retrieval function** from Aldea to minoanmystery-astro
5. **Re-rank** results by relevance to visitor context

### Phase 3: Memory Region Integration

Add new region in `src/lib/soul/opensouls/core/regions.ts`:

```typescript
KNOWLEDGE_DOSSIER: 'knowledge-dossier',  // Priority 3.5
```

Inject retrieved content in `/api/soul/chat.ts`:

```typescript
// After visitor context, before conversation history
const relevantKnowledge = await retrieveDossierContext(query, visitorContext);
if (relevantKnowledge) {
  memory = memory.withRegion('knowledge-dossier', {
    role: ChatMessageRoleEnum.System,
    content: relevantKnowledge,
  });
}
```

---

## Files to Create/Modify

| File | Action | Priority |
|------|--------|----------|
| `souls/minoan/dossiers/INDEX.md` | Create | High |
| `souls/minoan/dossiers/quotes.md` | Create | High |
| `souls/minoan/dossiers/oracle-concepts/*.md` | Create | High |
| `souls/minoan/dossiers/biography/*.md` | Create | Medium |
| `souls/minoan/dossiers/scholarly-sources/*.md` | Create | Medium |
| `souls/minoan/dossiers/minoan-ANE/*.md` | Create | Medium |
| `src/lib/soul/opensouls/core/regions.ts` | Modify | Medium |
| `src/lib/soul/retrieval/dossierRetrieval.ts` | Create | Medium |
| `src/pages/api/soul/chat.ts` | Modify | Medium |

---

## Content Sources (User-Provided)

**Tom will provide markdown files for:**

1. **Scholarly Books** (for chunking into dossiers):
   - Jane E. Harrison's works
   - Cyrus H. Gordon's works
   - Michael Astour's works

2. **Portfolio Content**:
   - Markdown case studies (ACS, CZI, Dolby, Aldea)

3. **Poetry**:
   - Full poems with analysis (markdown)

4. **Personal Writing**:
   - Essay(s)

5. **Social Content**:
   - Twitter posts (via Jina Twitter skill)

**Existing sources to integrate:**
- `/Users/tomdimino/Desktop/Thera-Knossos-Minos-Paper/research/` (Minoan/ANE research)
- Existing portfolio in `src/content/portfolio/*.md`

---

## Implementation Steps

### Step 1: Content Gathering
- [ ] Receive markdown files for scholarly books
- [ ] Receive markdown case studies
- [ ] Receive poetry markdown
- [ ] Receive essay(s)
- [ ] Fetch Twitter posts via Jina skill

### Step 2: Dossier Creation
- [ ] Chunk scholarly books into concept-focused dossiers
- [ ] Create biography dossiers from case studies + essay
- [ ] Create poetry dossiers with full poems + analysis
- [ ] Extract quotes for `quotes.md` voice calibration
- [ ] Create oracle-concepts dossiers for Kothar's philosophy

### Step 3: RAG Infrastructure (Leverage Aldea)
- [ ] Create Kothar namespace/bucket in Aldea Supabase
- [ ] Use existing Aldea chunking scripts on dossiers
- [ ] Generate embeddings via Aldea pipeline
- [ ] Port retrieval function from Aldea Soul Engine
- [ ] Add `knowledge-dossier` memory region to minoanmystery

### Step 4: Integration & Testing
- [ ] Wire retrieval into `/api/soul/chat.ts`
- [ ] Test scholarly references appear when discussing Minoan topics
- [ ] Test portfolio knowledge when discussing Tom's work
- [ ] Test poetry knowledge when asked about writing
- [ ] Verify voice calibration matches Kothar persona

---

## Verification

1. Ask Kothar about Jane E. Harrison's ritual theory → should reference specific concepts
2. Ask about Tom's work at CZI → should describe accurately from case study
3. Ask about a specific poem → should quote and analyze
4. Ask about the labyrinth mythology → should synthesize across scholars
5. Check response tone matches `quotes.md` voice calibration
