# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
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
