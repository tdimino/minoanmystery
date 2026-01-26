# Gordon Dossier Creation Plan

Build dossiers for Cyrus H. Gordon's works from the existing Markdown source files.

## Guiding Resources

- **Researcher Persona**: `souls/minoan/dossiers/scholarly-sources/RESEARCHER_PERSONA.md`
- **Dossier Guide**: `agent_docs/dossier-creation-guide.md`

Apply the **Historian Research Analyst** persona throughout—systematic, citation-driven, cross-cultural comparative analysis with etymological precision.

---

## Source Material

| File | Work | Size | Type |
|------|------|------|------|
| `Gordon-UgaritMinoanCrete-1966-mistral.md` | Ugarit and Minoan Crete (1966) | 243KB | Book |
| `Gordon-UgaritAndMinoanCrete-Excerpts-mistral.md` | Chapter III Excerpts | 51KB | Book Chapter |
| `Gordon-DeciphermentMinoanEteocretan-1975-mistral.md` | Decipherment of Minoan and Eteocretan (1975) | 28KB | Article |
| `Gordon-UgaritSignificance-article-mistral.md` | Ugarit and Its Significance | 26KB | Article |
| `Gordon-UgaritAndCaphtor-mistral.md` | Ugarit and Caphtor | 17KB | Article |
| `Gordon-Minoica-1962-mistral.md` | Minoica (1962) | 16KB | Article |

**Source path**: `/Users/tomdimino/Desktop/Thera-Knossos-Minos-Paper/sources/gordon/`

---

## Output Structure

```
souls/minoan/dossiers/scholarly-sources/gordon/
├── INDEX.md                                      # Author overview + works index
├── ugarit-minoan-crete-ch1-significance.md       # Ch I: Ugarit and Its Significance
├── ugarit-minoan-crete-ch2-greco-hebrew.md       # Ch II: Greco-Hebrew Affinities
├── ugarit-minoan-crete-ch3-minoan.md             # Ch III: Minoan Crete (KEY CHAPTER)
├── ugarit-minoan-crete-ch4-poetry.md             # Ch IV: Ugaritic Poetry
├── ugarit-minoan-crete-ch5-prose.md              # Ch V: Prose Texts
├── ugarit-minoan-crete-ch6-conclusions.md        # Ch VI: Conclusions
├── minoica-1962.md                               # JNES 1962 article
├── ugarit-and-caphtor.md                         # Caphtor article
├── ugarit-significance-article.md                # Later significance article
└── decipherment-minoan-eteocretan-1975.md        # JRAS 1975 article
```

**Total files**: 11 (1 INDEX + 6 book chapters + 4 articles)

---

## Scholar Profile: Cyrus H. Gordon (1908–2001)

### Why Gordon Matters for Kothar

Gordon is the primary architect of the Minoan-Semitic thesis—the argument that Minoan civilization was linguistically and culturally Northwest Semitic (Phoenician). His work provides Kothar with:

1. **Linear A decipherment** - Semitic readings of Minoan syllabary based on acrophony
2. **Kothar-wa-Hasis connection** - The Ugaritic craftsman god with workshop on Caphtor (Crete)
3. **Moses-Minos parallel** - Law-giver traditions connecting Sinai and Knossos
4. **Daedalus-Bezalel parallel** - Master craftsmen creating *kaftôrîm* (Caphtorian work)
5. **Helen-of-Troy motif** - Epic pattern linking Homer, Kret, and Genesis

### Biography

- **Dates**: 1908–2001
- **Affiliation**: Brandeis University (Department of Mediterranean Studies, founder)
- **Training**: University of Pennsylvania (PhD 1930, Assyriology)
- **Languages**: Ugaritic, Hebrew, Akkadian, Hurrian, Linear A/B, Egyptian hieroglyphs
- **Key Students**: Michael C. Astour, Anson Rainey

### Core Thesis

The Minoans were Delta Semites who brought Northwest Semitic language, religion, and palace culture to Crete around 1800 BC. This explains:
- Phoenician acrophonic values in Linear A (MAN = *bu* from *bunushu*, BOAT = *si* from *sipinatu*)
- Canaanite deities in Hagia Triada tablets (Addu, Gupanu, Yamm, Kireta)
- Eteocretan persistence into Hellenistic times (same language in Greek letters)
- Cultural continuity from Ugarit through Crete to classical Greece and Israel

---

## Chunking Strategy

### Ugarit and Minoan Crete (1966) → 6 chunks

| Chunk | Content | Key Topics |
|-------|---------|------------|
| Ch I | Ugarit and Its Significance | International Order, Amarna Age, crossroads position |
| Ch II | Ugaritic Literature & Greco-Hebrew Affinities | Guild mobility, Baal/Anath myths, Semele/Dionysus |
| Ch III | Minoan Crete | **CRITICAL**: Acrophony, Linear A readings, Eteocretan bilinguals |
| Ch IV | Ugaritic Poetry | Baal-Mot cycle, Yamm, Kret epic, Aqhat epic |
| Ch V | Prose Texts | Administrative tablets, diplomatic correspondence |
| Ch VI | Conclusions | Synthesis of Minoan-Semitic thesis |

**Ch III is the most important** - contains the technical decipherment arguments, Dreros bilinguals, Hagia Triada deity names, and Phaistos Disk reading.

### Articles (4 single-chunk dossiers)

1. **Minoica (1962)** - JNES article establishing Linear A as West Semitic
   - *ki-re-ya-tu* = *qiryat* "city"
   - *ya-ne* = *yayin* "wine"
   - *bi-ti za* = "this house"

2. **Ugarit and Caphtor** - Minos journal article
   - Kothar-wa-Hasis workshop on Caphtor
   - Idaean footstool (*hdm id*)
   - Moses-Minos, Daedalus-Bezalel parallels

3. **Ugarit and Its Significance** - Later article
   - Alphabet order, Ugaritic-Hebrew parallel word pairs
   - Abraham as merchant from Ur(ra)
   - Helen-of-Troy motif

4. **Decipherment of Minoan and Eteocretan (1975)** - JRAS technical article
   - Methodology (bilinguals, inner variants, parallel unilinguals)
   - Dreros bilinguals, Praisos formulas, Psychro stone

---

## Implementation Steps

### Step 1: Create Directory Structure
```bash
mkdir -p souls/minoan/dossiers/scholarly-sources/gordon
```

### Step 2: Create INDEX.md
- Scholar profile (bio, methodology, why he matters for Kothar)
- Works index with completion status
- Cross-references to Astour (student), Harrison, Minoan topics
- Scholarly lineage (builds on, disputes, influences)

### Step 3: Create Ch III Dossier First (Highest Priority)
- Core decipherment arguments
- Acrophony principle with examples
- Eteocretan bilingual readings
- Hagia Triada deity names table
- Delta origins thesis

### Step 4: Create Remaining Book Chapters (5 files)
For each chapter:
1. Extract content from source markdown
2. Write overview (2-3 sentences)
3. Identify 2-4 key arguments with quotes
4. Select notable passages with context
5. Create concepts table
6. Add cross-references and RAG tags

### Step 5: Create Article Dossiers (4 files)
For each article:
1. Source metadata (journal, date, pages, URL)
2. Overview paragraph
3. Key arguments with supporting quotes
4. Concepts introduced
5. Scholarly lineage
6. RAG tags

### Step 6: Verification
- All 11 files follow dossier template from `agent_docs/dossier-creation-guide.md`
- Cross-references are bidirectional
- INDEX.md shows completion status
- Test queries retrieve relevant content

---

## Files to Create (Priority Order)

| File | Priority | Template |
|------|----------|----------|
| `gordon/INDEX.md` | High | 5a (Author Index) |
| `gordon/ugarit-minoan-crete-ch3-minoan.md` | High | 5b (Book Chunk) - **KEY** |
| `gordon/decipherment-minoan-eteocretan-1975.md` | High | Article |
| `gordon/ugarit-and-caphtor.md` | High | Article |
| `gordon/minoica-1962.md` | High | Article |
| `gordon/ugarit-minoan-crete-ch2-greco-hebrew.md` | Medium | 5b (Book Chunk) |
| `gordon/ugarit-minoan-crete-ch1-significance.md` | Medium | 5b (Book Chunk) |
| `gordon/ugarit-significance-article.md` | Medium | Article |
| `gordon/ugarit-minoan-crete-ch4-poetry.md` | Lower | 5b (Book Chunk) |
| `gordon/ugarit-minoan-crete-ch5-prose.md` | Lower | 5b (Book Chunk) |
| `gordon/ugarit-minoan-crete-ch6-conclusions.md` | Lower | 5b (Book Chunk) |

---

## Key Content to Extract

### From Ugarit and Minoan Crete Ch III (most important)
- Acrophony: MAN = *bu* (bunushu), BOAT = *si* (sipinatu), APPLE = *tu* (tuppuhu)
- Dreros bilinguals: *lmo* = *l-immo* "for his mother"
- Hagia Triada deities: Addu, Gupanu, Gupanatu, Ugaru, Kireta, Yamm, Thinith
- *ku-ni-su* = Akkadian *kunnishu* "emmer wheat"
- Delta origins of Minoan palace builders

### From Minoica (1962)
- *ki-re-ya-tu* = קִרְיָה "city" (Linear A I,3)
- *ya-ne* = יַיִן "wine" (Knossos pithos)
- *bi-ti za* = בַּיִת זֶה "this house"
- Phoenician formulaic parallels

### From Ugarit and Caphtor
- Kothar-wa-Hasis workshop on Caphtor
- *hdm id* = "Idaean footstool" (text 51:I:35)
- *srn* = "tyrant" (Philistine rulers)
- Moses-Minos, Daedalus-Bezalel parallels

### From Decipherment (1975)
- Six-method methodology
- Dreros First Bilingual: *EΦ AΔE* = *φμαF* "they decreed"
- Praisos formula: *et me u mar krk o kl es u es*
- Psychro stone: *epithi* = *i-pi-ti* "engraved stone"

---

## Verification Queries

After completion, these queries should retrieve relevant Gordon content:

1. "What is acrophony in Linear A?" → Ch III, Decipherment article
2. "Tell me about Kothar-wa-Hasis" → Ch II, Caphtor article
3. "Moses-Minos parallel" → Caphtor article
4. "Eteocretan bilinguals" → Ch III, Decipherment article
5. "Hagia Triada deities" → Ch III
6. "Linear A as Semitic" → Minoica article, Ch III
7. "Kret epic" → Ch IV, Caphtor article
8. "Daedalus-Bezalel" → Caphtor article

---

## Cross-References

- **Astour dossiers**: Gordon was Astour's mentor; they share the Hellenosemitic thesis
- **Harrison dossiers**: Complementary approaches to Minoan religion
- **Tehom-Tiamat**: Gordon's cosmological parallels
- **Labyrinth mythology**: Knossos palace, Daedalus traditions
