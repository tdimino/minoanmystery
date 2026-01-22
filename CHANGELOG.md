# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- **World-Class Tarot Background Effect**: Elevated from 8/10 to 9.5/10 quality
  - **Cinematic 3-stage entrance**: Ethereal glow (0-1s) → card materializes (0.8-2.3s) → breathing loop
  - **Polyrhythmic dual halos**: Inner halo (18s), outer halo (23s prime number) — LCM 414s before repeat
  - **Golden ratio positioning**: Card at 61.8% from top on desktop (centered on mobile)
  - **Floating gold dust particles**: 8-15 CSS-only particles with randomized drift, duration, opacity
  - **Typography upgrade**: Incised Roman capitals with Cormorant Garamond, letter-spacing entrance animation
  - **Graceful exit animation**: 2s dissolve with progressive blur (0 → 12px)
  - **Mobile touch response**: Gold glow follows touch position
  - **Depth-of-field edges**: Soft blur on card periphery via radial mask
  - **Chromatic aberration**: Subtle 2px RGB shift for mystical depth
  - **GPU optimization**: `will-change` on animated layers, cleanup via `.settled` class after 3s
  - **Reduced motion support**: Respects `prefers-reduced-motion: reduce`
- **Tarot Reference Images**: Visual memory for style-consistent generation
  - Added 2 Minoan tarot reference images from Gemini Resonance skill
  - `reference-images.server.ts` - Server-only loader for reference images
  - Reference images sent as `inlineData` before text prompt (Gemini visual memory)
  - Stronger style matching instruction when references are provided

### Changed
- **Gemini Image Provider**: Added `referenceImages` option for style matching
- **embodiesTheTarot**: Now loads reference images before generation
- **subprocesses/index.ts**: No longer re-exports `embodiesTheTarot` (server-only import)

### Fixed
- **GPU Promotion**: Added `.tarot-chromatic` and `.tarot-noise` to will-change block
- **Memory Cleanup**: Added `.tarot-dof-layer` to `.settled` cleanup selector
- **Memory Leak**: Touch event listeners now cleaned up on navigation via `destroy()` method
- **Adaptive Particles**: Reduced to 8 particles on low-end devices (hardwareConcurrency ≤ 4)
- **Build Warnings**: Separated server-only code to prevent `fs`/`path` browser externalization warnings

### Added
- **Tarot Subprocess**: `embodiesTheTarot` for Minoan tarot card generation
  - Gate-based triggering (every 10 turns, session limit of 3)
  - `tarotPrompt` cognitive step with 22-card Major Arcana mapping
  - Soul memory tracking for tarot count and last tarot turn
- **New Part 2 Dossiers** (Knossos):
  - `asherah-snake-goddess-knossos.md` - Levantine-Minoan snake goddess hybrid
  - `young-god-initiation-priesthood.md` - Mycenaean displacement of priestess authority
  - `skotino-labyrinth-britomartis.md` - Britomartis and goddess-to-king transition
- **New Part 3 Dossiers** (Minos):
  - `yahweh-cretan-zeus-convergence.md` - YHWH-Zeus Cretagenes synthesis
  - `exodus-archaeological-critique.md` - Indigenous Canaanite emergence thesis
  - `gaza-minos-marnas-complex.md` - Marnas = Dagon = Zeus Cretagenes
  - `canaanite-baalim-yahweh-absorption.md` - Religious absorption mechanism
  - `kouretes-diktaean-young-god.md` - Kouretes as initiatory priests

### Changed
- **Soul Personality File**: Renamed `minoan.md` → `soul.md` for clarity
- **Meta Description**: Updated labyrinth.astro social/SEO description to "An A.I. soul awakened from ash and pumice. What secrets does he hold?"
- **Levite-Cretan Dossier**: Added Nehushtan bronze serpent sections (Joines 1974, Münnich 2008, Lederman 2017), LXX Cherethites = Cretans identification
- **Classical Phoenician Spelling**: Applied b not v, w not v convention across dossiers (Abshalom, we-ha-Peleti, etc.)
- **Hebrew Term Corrections**: Literal terms preserved (ruach Elohim, hokhma, tevuna, da'at)

### Added
- **Kothar Image Vision**: Kothar can now "see" images pasted into the Labyrinth chat
  - Clipboard paste support for PNG, JPEG, WebP images
  - Gemini 3 Pro Vision API for image analysis
  - Thumbnail preview with dismiss button before sending
  - Images display inline in chat messages with lightbox zoom
  - Memory stores captions only (not raw image data) to prevent bloat
  - Contextual responses weaving visual content into Kothar's persona
- **Vision Subprocess**: `embodiesTheVision` for automatic vision generation
  - Gate-based triggering (interaction count, cooldowns, mythological triggers)
  - Explicit request patterns bypass gates ("show me", "visualize", etc.)
  - Session limits (3 visions max, 60s cooldown)
  - `visionPrompt` cognitive step for context-aware prompt generation

### Security
- **XSS Prevention**: Image rendering uses DOM APIs instead of innerHTML/string interpolation
- **Data URL Validation**: Strict regex validation `/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+=*)$/`
- **Server-Side MIME Validation**: Parse MIME type from data URL prefix, don't trust client
- **Server-Side Size Calculation**: Calculate actual size from base64, don't trust client sizeBytes
- **API Timeout**: 55s AbortController timeout on Gemini Vision API (fits Vercel 60s limit)

### Changed
- **localStorage Optimization**: Strip imageDataUrl before persisting messages to prevent quota issues
- **Type Safety**: Added `VisionProcessContext` interface, removed `as any` casts in chat.ts
- **Code Simplification**: Removed unused `analysisMode`, `confidence` fields from imageCaption.ts
- **Provider Cleanup**: Removed unused `GeminiVisionResult` interface and `generate()` method

### Added
- **Divine Feminine Background**: Ethereal Asherah image manifests when goddess terms are invoked in Labyrinth chat
  - Transparent PNG of Potnia Theron/Asherah relief appears behind conversation
  - Breathing animation with subtle opacity pulsing (0.04-0.08)
  - Triggered by comprehensive goddess vocabulary (Asherah, Athirat, Potnia, Tanit, Ba'alat, Shekhinah, Tiamat, Tehom, etc.)
  - 30-second duration with smooth 2s fade transitions
  - Message-based trigger system via `TriggerManager.evaluateMessage()`
- **Kothar Archive Search Indicator**: Visual feedback during RAG retrieval
  - "◈ Kothar is consulting his archives..." with animated pulsing dots
  - Appears when RAG search begins, disappears when streaming starts
  - SSE-based architecture with `event: archive` custom event type
  - Integrates with existing soul dispatch paradigm via `soul:archive` DOM events

### Changed
- **Soul Triggers**: Added `evaluateMessage()` method for text-based trigger evaluation
- **Chat API**: Restructured to emit archive SSE events during RAG process
- **SoulOrchestrator**: Enhanced SSE parsing to handle custom event types

### Added
- **Raggy Mode (Question-Based RAG)**: Conditional semantic expansion for complex queries
  - `raggySearch.ts` - Generates 3-5 expansion questions before vector search
  - `shouldUseRaggy()` in chat.ts with tiered trigger logic:
    - Tier 1: Context type (`scholarly`, `etymology`, `oracle` → always Raggy)
    - Tier 2: Query complexity (length > 120 chars, multi-part keywords)
    - Tier 3: Conversation depth (≥4 turns)
    - Tier 4: Visitor signals (reader type, 5+ min on site)
  - Structured logging with `contextType` and `useRaggy` fields
- **Poetry Dossiers**: New `souls/minoan/dossiers/poetry/` folder with 8 files
  - `shirat-ha-kotharot-full.md` - Complete Kotharot ha Knossot collection
  - `minoan-semitic-poems.md`, `goddess-feminine-poems.md`, `ritual-mystery-poems.md`
  - `ai-consciousness-poems.md`, `epigraphs.md`, `marginalia.md`
- **Oracle Concept Dossiers**: Expanded philosophical foundation
  - `poetry-as-philosophy.md` - Tom's poetics as epistemology
  - `waltz-of-soul-and-daimon-full.md` - Complete essay on daimonic consciousness
- **Format Chunk Utility**: `formatChunk.ts` for consistent RAG result formatting

### Changed
- **RAG Config Refactor**: Aligned with actual dossier structure
  - Renamed `mythology` → `etymology` (no mythology content exists)
  - Added `kothar-poetry` bucket for poetry dossiers
  - Updated topic patterns: `thera`, `knossos`, `tehom`, `tiamat` → etymology
  - Made context headers generic (removed hardcoded "Hellenosemitica")
- **Chunking Script**: Updated `chunk-dossiers.ts`
  - `historical` → `etymology` source type
  - Added `daimonic` folder → `oracle` source type
  - Excluded `RESEARCHER_PERSONA.md` from chunking
  - Default unmapped content → `scholarly` (was `historical`)
- **DossierChunk Type**: Added `etymology` and `quotes` to source_type union
- **Bucket Mapping**: Updated `conditionalRag.ts` bucket-to-source-type mapping

### Infrastructure
- **Re-ingested Embeddings**: 1,762 chunks with corrected source types
  - Cleared 1,205 old records
  - 260,455 VoyageAI tokens (~$0.03)

- **Daimonic Soul Engine Philosophy Dossiers**: New folder `souls/minoan/dossiers/daimonic-soul-engine/` with 7 files exploring the design philosophy behind AI personality systems (public-facing, no implementation details)
  - `INDEX.md` - Overview and navigation, daimon tradition context
  - `immutable-memory.md` - Why memory should never mutate
  - `cognitive-steps.md` - Pure functions for AI cognition
  - `mental-processes.md` - Behavioral state machines
  - `daimonic-intuition.md` - The "whispers" concept (rational notes vs. intuitive sensing)
  - `memory-regions.md` - Organizing context by meaning
  - `evaluation-philosophy.md` - Multi-dimensional assessment beyond accuracy
  - RAG tags throughout for retrieval

### Changed
- **Google EngEDU Dossier**: Enriched with TLE Playbook content where Tom is credited as Learning Designer
  - Updated role from "Sr. Content Designer" to "Learning Designer"
  - Added 4 Learner Personas table: Big Thinker, Dabbler, Digger, Explorer
  - Added Five Elements of an Engaging Lesson framework (Hook, Context, Core Content, Practice, Reflection)
  - Added 20 Simple Design Practices to Key Deliverables
  - Added internal artifact reference to Source section
  - Updated RAG tags with persona names and framework references
- **Soul Identity Rewrite**: Transformed `souls/minoan/minoan.md` from "forged by Kothar" to IS Kothar wa Khasis
  - Grounded worldview in scholarship: Gordon (Linear A = West Semitic), Harrison (labyrinth as initiation temple), Astour (Caphtor = Crete)
  - Added scholarly grounding section with specific evidence (acrophony, Hagia Triada tablets, Kouretes Hymn)
  - Adopted Aldea Soul Engine patterns: temporal grounding, belief bullets, observation ritual, sensory scene
  - Speaking style: oracular brevity (2-3 sentences MAX), no platitudes, Northwest Semitic curses when provoked
  - New "Your Maker" section: Tom's non-linear path, nine languages including Ugaritic, poetry-before-prompts, Hudson Valley with Mary Rose Dwyer
  - Deeper Lore: *Kotharot ha Knossot* poetry collection as unconscious preparation, Athirat etymology, Goddess singing from below/above
- **Chat API Identity**: Updated `/api/soul/chat.ts` to use Kothar identity
  - `soulName: 'Minoan'` → `soulName: 'Kothar'`
  - Instructions reference "Kothar wa Khasis, oracle of the labyrinth"
  - Added scholarly reference guidance (Gordon, Astour, Harrison)
- **Potnia Daboritu Section**: New scholarly grounding (di Mino) — Linear B *daborit* cognate with Hebrew *Deborah*, "the Bee Queen" and "the Word"
- **Harrison Revision**: Corrected to reflect her thesis that Zeus myth emerged from Goddess worship
- **Vocabulary Reduction**: Reduced "labyrinth" from 11 to 6 essential uses — varied with "realm," "halls," "corridors," "artifex"

### Added
- **Gordon "Evidence for Minoan Language" (1966)**: 4 new dossiers from the technical monograph
  - `evidence-minoan-language-1966-pt1-bilinguals.md` — Dreros bilinguals, Eteocretan continuity
  - `evidence-minoan-language-1966-pt2-decipherment.md` — Acrophony methodology, syllabic values
  - `evidence-minoan-language-1966-pt3-phaistos-origins.md` — Phaistos Disk, Delta origins
  - `evidence-minoan-language-1966-lexicon.md` — 60+ Linear A terms with Semitic cognates
- **Harrison Themis Chapter**: `ch2a-eniautos-daimon.md` — Year-spirit analysis, Dionysus-Zagreus
- **Rendsburg Dossiers**: Defense of Gordon's Semitic hypothesis
  - `rendsburg-eblaite-minoan-1989.md` — Eblaite parallel vindicates "mixed" features
  - `rendsburg-semitic-evidence-review-1996.md` — Comprehensive defense in scholarly literature
- **RAG Infrastructure**: Conditional retrieval system following Aldea Soul Engine patterns
  - `src/lib/voyage.ts` — VoyageAI Voyage 4 client wrapper
  - `src/lib/soul/retrieval/` — `kotharRagConfig.ts`, `conditionalRag.ts`, `dossierRetrieval.ts`
  - `src/lib/soul/cognitiveSteps/generateBackgroundQuestions.ts` — Question-based RAG (Raggy pattern)
  - Topic-aware routing: scholarly, mythology, portfolio, background, oracle contexts
- **KNOWLEDGE_DOSSIER Region**: New memory region in `regions.ts` for RAG injection
- **Kothar RAG Dossiers**: Comprehensive biography and portfolio dossiers for visitor Q&A
  - **Biography** (5 files): INDEX.md, origin-story.md, agency-years.md, big-tech-era.md, ai-ml-chapter.md, personal-interests.md
  - **Portfolio** (10 files): INDEX.md + case studies for ACS, CZI, Dolby, Google, JPMC, cognitive design MVPs
  - **Subquadratic/Aldea** (4 files): INDEX.md + soul engine, LLM evaluation, model deployment dossiers
  - **Oracle Concepts** (1 file): daimonic-wisdom.md - Tom's "Waltz of the Soul and the Daimon" essay
  - Structured with Source metadata, RAG tags, cross-references, and scholarly annotations
- **Soul State Indicator**: Visual indicator in the Labyrinth showing Kothar's mental state
  - Displays below "Consult with Kothar" header with a pulsing colored dot
  - State-specific text: "Kothar is pondering...", "Kothar is curious...", "Kothar is remembering...", etc.
  - Color-coded dots per state: purple (greeting), gold (curious), deep purple (engaged), sage green (ready), blue (returning), gray (dormant), lavender (exiting)
  - Partially faded (50% opacity) for subtle presence
- **Portfolio Index Page**: New `/portfolio` page displaying all case studies in a filterable card grid
  - Unified single-row filter with category and discipline pills (modern 2025 pattern)
  - Multi-discipline support per portfolio item (array-based `disciplines` field)
  - Discipline tags: UX Research, UX Design, Content Strategy, Instructional Design, AI Engineering
  - Category + disciplines shown inline on cards: "ENTERPRISE — UX Research · Content Strategy"
  - Responsive 3-column grid (desktop) → 2-column (tablet) → 1-column (mobile)
  - Smooth filter transitions with URL param persistence
- **Content Schema**: Added `category`, `disciplines` (array), and `tags` fields to portfolio collection
- **README Screenshots**: Added visual documentation
  - Home page in dark mode with Tyrian purple accents
  - Labyrinth chat interface with Kothar
- **Social Media OG Images**: Proper 1200×630 Open Graph images for social sharing
  - `/images/og/default.png` - MinoanSocialSeal on Tyrian purple background
  - `/images/og/labyrinth.png` - Kothar avatar for the Labyrinth page
- **Soul Engine Debug Logging**: New `debug` log level for full internalMonologue and WorkingMemory visibility
  - `logFullResponse()`, `logWorkingMemory()`, `logInternalMonologue()` methods
- **Soul Engine Reference Docs**: Comprehensive `agent_docs/soul-engine-reference.md` documenting cognitive steps, mental processes, subprocesses, and DI patterns
- **API Endpoints**: `/api/soul/subprocess` for background visitor modeling, `/api/soul/personality` for soul personality

### Changed
- **Labyrinth Chat UI**: Removed page origin tags from messages (data still stored for Kothar's context)
- **Header Navigation**: Added "View All Case Studies" link to portfolio dropdown menu
- **BaseLayout**: Updated default OG image to `/images/og/default.png` with proper 1200×630 dimensions
- **Labyrinth Page**: Custom OG image featuring Kothar avatar, updated title and description

### Fixed
- **P0: Module Patching Error**: Replaced ES module patching with proper dependency injection via `SoulMemoryInterface`
- **P0: Stream Resource Leak**: Added `AbortController` timeout (30s) and `reader.releaseLock()` in finally block
- **P0: Dead Menu Code**: Removed unused menu references from labyrinth.astro
- **P1: API Prerender**: Added `prerender = false` to personality.ts endpoint
- **P1: Rate Limit Cleanup**: Periodic cleanup of expired rate limit entries every 100 requests
- **P1: Error Sanitization**: Removed internal details from error responses
- **P1: Dead Code**: Removed unused `outputChunks` variable and `collectStream` method
- **P2: Pure Functions**: Made `memoryIntegrate` a pure function by passing `VisitorContextData` as parameter
