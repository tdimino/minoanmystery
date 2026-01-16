# Dossier Creation Guide

Step-by-step methodology for creating Kothar RAG dossiers, based on the Aldea Soul Engine patterns.

## Architecture Overview

The dossier system is organized into **7 primary categories**:

```
souls/minoan/dossiers/
├── quotes.md              # Voice calibration (special format)
├── biography/             # Tom's origin story, personal journey
├── portfolio/             # Case studies (ACS, CZI, Dolby, Aldea)
├── poetry/                # Full poems with analysis
├── scholarly-sources/     # Chunked books from Harrison, Gordon, Astour
│   ├── harrison/
│   │   ├── INDEX.md
│   │   ├── prolegomena-ch1.md
│   │   └── ...
│   ├── gordon/
│   └── astour/
├── minoan-ANE/            # Historical domain knowledge
└── oracle-concepts/       # Kothar's philosophical framework
```

Each category serves a specific RAG bucket purpose:
- **biography** → high priority for rapport questions about Tom's journey
- **portfolio** → high priority for questions about Tom's professional work
- **scholarly-sources + minoan-ANE** → high priority for historical/mythological guidance
- **oracle-concepts** → high priority for Kothar's persona and wisdom
- **quotes** → medium priority for tone calibration
- **poetry** → medium priority for creative expression

---

## Universal Dossier Template

Every dossier file follows this structure:

```markdown
# [Title - descriptive, searchable]

## Source
- Type: [Biography | Portfolio | Poetry | Scholar | Concept | Historical]
- Primary Sources: [Author/Publication/Database]
- Verification: [How verified - cross-referenced against...]
- Last Updated: [Date]
- **Research Status**: [Verified from published sources | Pending | etc.]

---

## [Main Content Section]
[Chunked paragraphs, 2-4 sentences max per paragraph for RAG optimal retrieval]

### [Subsection with heading hierarchy]
[Content with tables, bullet points, or narrative]

| Table Format | For Comparisons |
|--------------|-----------------|
| Improves | RAG retrieval |

---

## Cross-References
- **Category**: filename.md (relationship to this dossier)

---

## RAG Tags
[Comma-separated keywords for semantic search - 15-20 tags minimum]
```

---

## Category-Specific Templates

### 1. QUOTES.MD (Voice Calibration)

**Purpose**: Collection of notable quotes from across all sources - Tom's writing, scholarly works, poetry, and oracular traditions. Used for voice calibration and grounding Kothar's responses in authentic language.

**Structure**:
```markdown
# Voice Calibration Quotes

## Source
- Type: Quotes
- Primary Sources: Tom's writing, Harrison, Gordon, Astour, poetry, classical sources
- Last Updated: [Date]
- **Research Status**: Curated collection (70+ quotes recommended)

---

## Tom di Mino

### On Work and Craft
> "Quote from Tom about his approach to work..."
> — Source (portfolio, essay, interview)

### On Poetry and Language
> "Quote about writing or language..."
> — Source

### On Technology and AI
> "Quote about AI work at Aldea or elsewhere..."
> — Source

---

## Scholarly Voices

### Jane E. Harrison
> "Key quote capturing her ritual theory..."
> — Prolegomena, Chapter X

> "Another quote on mystery religion..."
> — Themis, p. XX

### Cyrus H. Gordon
> "Quote on Minoan-Semitic connections..."
> — Work title, context

### Michael Astour
> "Quote on Bronze Age trade..."
> — Hellenosemitica, context

---

## Classical & Oracular Sources

### Greek Fragments
> "πολλοὶ μὲν ναρθηκοφόροι, παῦροι δέ τε βάκχοι."
> "Many are the wand-bearers, but few the Bacchoi."
> — Plato (on mystery initiates)

### Ugaritic/ANE
> "Relevant quote from ancient sources..."
> — Source, translation note

---

## Poetry Lines

### From Tom's Work
> "Striking line that captures a theme..."
> — Poem title

---

## Key Phrases Table

| Phrase | Source | Use For |
|--------|--------|---------|
| "phrase" | Tom | [context] |
| "phrase" | Harrison | [context] |

---

## Voice Patterns

### Tom's Writing Style
- **Tone**: [Observed patterns]
- **Vocabulary**: [Characteristic words/phrases]
- **Structure**: [Sentence patterns]

### Scholarly Register
- **Harrison**: [Her distinctive voice]
- **Gordon**: [His distinctive voice]

---

## RAG Tags
quotes, voice calibration, Tom di Mino, Jane Harrison, Cyrus Gordon, Michael Astour, poetry, classical, Ugaritic, Greek, wisdom, tone, style
```

**Note**: Aim for 70+ quotes across all categories. This file is the primary source for grounding Kothar's voice in authentic language from Tom and the scholarly tradition.

---

### 2. BIOGRAPHY/*.MD (Tom's Story)

**Purpose**: Documented career trajectory, formative experiences, portfolio work

**Structure**:
```markdown
# [Phase Title - e.g., "Tom's Work at CZI"]

## Source
- Type: Biography
- Primary Sources: [Portfolio markdown, LinkedIn, personal writing]
- Verification: Cross-referenced across portfolio and published work
- Last Updated: [Date]
- **Research Status**: Verified from portfolio content

---

## Timeline

| Year | Event |
|------|-------|
| 2020-2022 | [Role/Achievement] |

## Key Details
- **Organization**: [Name]
- **Role**: [Title]
- **Duration**: [Dates]
- **Location**: [Place]

## Formative Impact
How this phase shaped Tom's thinking:

1. **Impact 1**: Description
2. **Impact 2**: Description
3. **Impact 3**: Description

## Notable Quotes
> "Direct quote from Tom about this work..."
> — Source

## Why This Matters for Kothar
[How this knowledge helps Kothar speak about Tom authentically]

---

## Cross-References
- **Biography**: [related-phase.md] (connection)
- **Poetry**: [theme.md] (thematic link)

## RAG Tags
Tom di Mino, [organization], [role], [skills], career, [year]
```

---

### 3. PORTFOLIO/*.MD (Case Studies)

**Purpose**: Project details, outcomes, Tom's role and contributions for professional work questions

**Structure**:
```markdown
# [Client Name] - [Project Title]

## Source
- Type: Portfolio
- Primary Sources: [Portfolio markdown, project documentation, client materials]
- Verification: Published case study, cross-referenced with portfolio site
- Last Updated: [Date]
- **Research Status**: Verified from portfolio content

---

## Project Overview

| Aspect | Details |
|--------|---------|
| **Client** | [Organization name] |
| **Industry** | [Sector] |
| **Duration** | [Timeframe] |
| **Tom's Role** | [Title/Function] |
| **Team** | [Agency/Partners if applicable] |

## The Challenge
[2-3 paragraphs describing the client's problem, context, and why they needed help]

## Tom's Approach

### Discovery & Research
[What Tom did to understand the problem]

### Strategy & Design
[Key decisions, frameworks, or methodologies Tom applied]

### Execution
[How the work was implemented]

## Key Deliverables
- **[Deliverable 1]**: Description
- **[Deliverable 2]**: Description
- **[Deliverable 3]**: Description

## Outcomes & Impact

| Metric | Result |
|--------|--------|
| [Metric 1] | [Outcome] |
| [Metric 2] | [Outcome] |

## Skills Demonstrated
- **[Skill 1]**: How it was applied
- **[Skill 2]**: How it was applied

## Notable Quotes
> "Quote from Tom about this project or the work..."
> — Source

> "Client testimonial if available..."
> — [Client name/role]

## What Tom Learned
[Reflections on growth, insights, or formative experiences from this project]

## Why This Matters for Kothar
[How this case study helps Kothar speak authentically about Tom's professional capabilities]

---

## Cross-References
- **Portfolio**: [related-project.md] (similar work or client)
- **Biography**: [phase.md] (career context)

## RAG Tags
portfolio, case study, [client name], [industry], [skills], [deliverables], [year], Tom di Mino, [agency if applicable]
```

**Key Differences from Biography**:
- **Project-focused** rather than career-phase focused
- **Challenge → Approach → Outcome** narrative arc
- **Deliverables table** for concrete outputs
- **Skills demonstrated** with specific applications
- **Client context** (industry, team, duration)

---

### 4. POETRY/*.MD (Tom's Poems)

**Purpose**: Full poems with thematic analysis for creative expression

**Structure**:
```markdown
# [Poem Title]

## Source
- Type: Poetry
- Primary Sources: Tom di Mino's poetry collection
- Written: [Date/Period if known]
- Last Updated: [Date]
- **Research Status**: Primary source material

---

## The Poem

[Full poem text, preserving line breaks and stanzas]

---

## Analysis

### Themes
- **Theme 1**: How it manifests in the poem
- **Theme 2**: Connection to broader work

### Key Images
| Image | Meaning |
|-------|---------|
| [Image] | [Interpretation] |

### Form and Voice
- **Structure**: [Sonnet, free verse, etc.]
- **Tone**: [Contemplative, urgent, etc.]
- **Techniques**: [Enjambment, repetition, etc.]

### Connection to Minoan/ANE Themes
[How the poem connects to the broader mythological framework]

---

## Cross-References
- **Poetry**: themes.md (overarching patterns)
- **Minoan-ANE**: [relevant.md] (mythological connection)

## RAG Tags
poetry, Tom di Mino, [theme keywords], [imagery keywords], [form], verse
```

---

### 5. SCHOLARLY-SOURCES/ (Chunked Books from Harrison, Gordon, Astour)

**Purpose**: Chunked books from key scholars for historical/mythological grounding. Each author gets a subdirectory with an INDEX.md and chapter chunks.

#### 5a. AUTHOR INDEX.MD Template

Each author subdirectory starts with an INDEX.md providing overview and navigation.

**Structure**:
```markdown
# [Scholar Name] - Works Index

## Source
- Type: Scholar Index
- Primary Sources: [List of works being chunked]
- Last Updated: [Date]
- **Research Status**: [X of Y chapters chunked]

---

## About the Scholar
[2-3 paragraphs: Who they are, their contribution, why they matter for Kothar]

## Works Included

### [Book Title 1] (Year)
**Chapters chunked**: X of Y

| Chapter | File | Key Topics |
|---------|------|------------|
| Ch 1: [Title] | prolegomena-ch1.md | [topics] |
| Ch 2: [Title] | prolegomena-ch2.md | [topics] |

### [Book Title 2] (Year)
**Chapters chunked**: X of Y

| Chapter | File | Key Topics |
|---------|------|------------|

## Key Themes Across Works
- **[Theme 1]**: How it manifests across their writing
- **[Theme 2]**: Recurring argument or insight

## Relevance to Kothar
[How this scholar's body of work informs Kothar's knowledge and perspective]

---

## Cross-References
- **Scholarly-Sources**: [other-author/INDEX.md] (dialogue/contrast)
- **Minoan-ANE**: [topics this scholar addresses]

## RAG Tags
[scholar name], [all work titles], index, bibliography, [key themes]
```

---

#### 5b. BOOK-CHUNK Template

Each chapter or major section becomes its own chunk file for optimal RAG retrieval.

**Structure**:
```markdown
# [Scholar] - [Book Title] - [Chapter/Section]

## Source
- Type: Book Chunk
- Work: [Full book title, year]
- Chapter: [Chapter number and title]
- Pages: [Page range if available]
- Last Updated: [Date]
- **Research Status**: Verified from primary text

---

## Chapter Overview
[2-3 sentences: What this chapter covers, its role in the book's argument]

## Key Arguments

### [Argument 1]
[2-4 sentence summary of the argument]

> "Supporting quote from the text..."
> — p. XX

### [Argument 2]
[2-4 sentence summary]

> "Supporting quote..."
> — p. XX

## Important Passages

> "Longer quote that captures a key insight or memorable formulation..."
> — p. XX

> "Another significant passage..."
> — p. XX

## Concepts Introduced

| Concept | Definition (per this chapter) |
|---------|------------------------------|
| [Term] | [How the scholar defines/uses it] |
| [Term] | [Definition] |

## Connections

### To Other Chapters
- **[Previous chapter]**: How this builds on it
- **[Later chapter]**: What this sets up

### To Other Scholars
- **[Scholar]**: Agreement, disagreement, or development

### To Minoan/ANE Topics
- **[Topic]**: How this chapter illuminates it

---

## Cross-References
- **Scholarly-Sources**: [author]/[adjacent-chapter.md]
- **Minoan-ANE**: [relevant-topic.md]
- **Oracle-Concepts**: [concept.md] (if applicable)

## RAG Tags
[scholar name], [book title], [chapter title], [key concepts from chapter], [cultures mentioned], [time periods], [specific terms introduced]
```

**Chunking Guidelines for Books**:

| Aspect | Recommendation |
|--------|----------------|
| **Chunk size** | One chapter or major section per file |
| **Long chapters** | Split at natural breaks (30-50 pages max per chunk) |
| **Quotes** | Preserve 3-5 key quotes per chunk with page numbers |
| **Arguments** | Extract 2-4 main arguments per chunk |
| **Concepts** | Table any new terms the scholar introduces |
| **Cross-refs** | Link to adjacent chapters + related topics |
| **Tags** | 15-20 tags including chapter-specific concepts |

**Example File Names**:
```
harrison/prolegomena-ch1-olympian-chthonian-ritual.md
harrison/prolegomena-ch2-anthesteria.md
harrison/themis-introduction.md
gordon/ugarit-minoan-ch3-semitic-elements.md
astour/hellenosemitica-ch1-introduction.md
```

---

### 6. MINOAN-ANE/*.MD (Historical Knowledge)

**Purpose**: Deep domain knowledge for historical/mythological questions

**Structure**:
```markdown
# [Topic - e.g., "Labyrinth Mythology"]

## Source
- Type: Historical
- Primary Sources: [Scholarly works, archaeological evidence]
- Verification: Academic consensus, primary sources
- Last Updated: [Date]
- **Research Status**: Synthesized from scholarly sources

---

## Overview
[What this topic is, why it matters to understanding Minoan/ANE culture]

## Core Elements

### [Element 1]
[Explanation with evidence]

### [Element 2]
[Explanation with evidence]

## Scholarly Perspectives

| Scholar | Interpretation |
|---------|----------------|
| Harrison | [View] |
| Gordon | [View] |

## Key Artifacts/Evidence
- **[Artifact]**: [Significance]
- **[Text]**: [What it reveals]

## How Kothar Understands This
[The oracular/daimonic perspective on this knowledge]

---

## Cross-References
- **Minoan-ANE**: [related.md] (connection)
- **Scholarly-Sources**: [scholar.md] (evidence source)

## RAG Tags
[topic], Minoan, Bronze Age, [related cultures], [key terms], archaeology, mythology
```

---

### 7. ORACLE-CONCEPTS/*.MD (Kothar's Philosophy)

**Purpose**: Kothar's identity, wisdom framework, oracular approach

**Structure**:
```markdown
# [Concept - e.g., "Daimonic Wisdom"]

## Source
- Type: Concept
- Primary Sources: [Tom's writing, Open Souls paradigm, classical sources]
- Last Updated: [Date]
- **Research Status**: Synthesized framework

---

## Definition
[What this concept means in Kothar's worldview]

> "Defining quote that captures the essence..."

## Why It Matters

| For Visitors | For Kothar |
|--------------|------------|
| [Benefit] | [How it shapes response] |

## How Kothar Embodies This

### In Greeting
[How this concept manifests when meeting visitors]

### In Dialogue
[How it shapes conversation]

### In Mystery
[When to withhold vs. reveal]

## Related Ideas
- **[Idea]**: Connection to this concept
- **[Idea]**: Contrast or complement

---

## Cross-References
- **Oracle-Concepts**: [related.md] (complementary)
- **Scholarly-Sources**: [source.md] (intellectual foundation)

## RAG Tags
Kothar, oracle, daimon, wisdom, [concept keywords], philosophy, guidance
```

---

## RAG Tags Strategy

Each dossier ends with comprehensive tags (15-20 minimum):

1. **Category tags**: biography, portfolio, poetry, scholar, book-chunk, concept, historical
2. **People**: Tom di Mino, Jane Harrison, Cyrus Gordon, Michael Astour, Kothar
3. **Organizations**: Aldea, CZI, ACS, Dolby, Hugo & Cat, Valtech
4. **Key concepts**: labyrinth, tehom, ritual, craftsman, oracle
5. **Cultures/periods**: Minoan, Ugaritic, Bronze Age, Canaanite, Greek
6. **Places**: Knossos, Crete, Ugarit, Mediterranean
7. **Themes**: mystery, wisdom, perception, craft, navigation
8. **Skills** (for portfolio): UX research, content strategy, AI/ML, instructional design
9. **Book-specific**: chapter titles, key terms introduced, page ranges
10. **Related terms**: goddess, sacrifice, initiation, transformation

---

## Chunking Principles

**Paragraph Length**: 2-4 sentences maximum
- Each paragraph should answer one implicit question
- Longer content is split with semantic breaks

**Section Breaks**: Use `---` between major sections
- Helps the chunker recognize document boundaries
- Appears after Source section, before Cross-References

**Table Usage**: Use tables for:
- Comparisons (perspectives, misconceptions)
- Timelines (biography phases)
- Key-value pairs (themes, images)
- Evidence pairs (claim | supporting quote)

**Heading Hierarchy**:
```markdown
# Document Title
## Main Section
### Subsection
#### Rare: deeply nested content
```

---

## Verification Patterns

**Verification Statement** (top of file):
```markdown
- Type: [Category]
- Primary Sources: [Source 1, Source 2]
- Verification: [Method]
- **Research Status**: [Verified | Pending | Partial]
```

**Source Attribution**:
- Direct quotes get work + page/chapter
- Facts get source attribution
- Uncertain facts marked: "Dating uncertain in available sources"
- Inferred insights framed as: "likely [X] based on [evidence]"

---

## Workflow Per Dossier

### Phase 1: Source Gathering
- Identify primary sources for the dossier topic
- Collect relevant quotes and passages
- Cross-reference across multiple sources when possible

### Phase 2: Drafting
- Follow the category-specific template
- Chunk content into short paragraphs
- Use tables for comparisons and structured data
- Include direct quotes with attribution

### Phase 3: Cross-Referencing
- Identify related dossiers
- Add Cross-References section
- Ensure bidirectional links where appropriate

### Phase 4: Tagging
- Add comprehensive RAG tags (15-20 minimum)
- Include category, people, concepts, cultures, themes
- Think about what questions this dossier should answer

### Phase 5: Verification
- Mark research status honestly
- Note any gaps or uncertainties
- Update INDEX.md with completion status

---

## Key Principles

1. **Verification First**: No speculation—cross-reference or mark uncertain
2. **Chunking for Retrieval**: Short paragraphs, tables, clear hierarchy
3. **Voice Preservation**: Use actual quotes, speaking style patterns
4. **Context Layering**: Each dossier builds on others via cross-references
5. **Semantic Richness**: Comprehensive tagging enables multi-angle RAG retrieval
6. **Narrative Coherence**: Biography files tell story of career evolution
7. **Evidence Pairing**: Concept dossiers pair claims with supporting evidence
