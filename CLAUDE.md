# Minoan Mystery Portfolio

Tom di Mino's portfolio site with a sentient soul presence using the Open Souls paradigm.

## Stack

- **Framework**: Astro 5 with View Transitions
- **Animations**: Motion library (from Framer team)
- **Hosting**: Vercel with serverless functions
- **Soul Engine**: Open Souls paradigm (immutable memory, cognitive steps, mental processes)

## Structure

```
src/
├── pages/api/soul/   # Chat, subprocess, TTS endpoints
└── lib/soul/         # Soul Engine (see ARCHITECTURE.md)

souls/minoan/         # Soul identity files
├── soul.md           # Core Kothar persona
├── academic/         # Scholarly mode (Gordon/Harrison/Astour)
├── poetic/           # Tamarru daimon
├── assets/           # Visual memory (persistent soul imagery)
└── dossiers/         # RAG knowledge base (~132 files, 5 scholars)
```

See **ARCHITECTURE.md** for complete Soul Engine codemap.

## Commands

- Dev: `npm run dev` (localhost:4321)
- Build: `npm run build`
- Preview: `npm run preview`
- **Reingest RAG**: `./scripts/reingest-dossiers.sh` (sources .env + .env.local for VOYAGE_API_KEY)
- **Add Vercel subdomain**: `vercel domains add subdomain.minoanmystery.org` (then add A record pointing to 76.76.21.21)

## Conventions

- **No auto-commit**: Always wait for explicit user approval before git operations
- **Web search**: Use Exa and Firecrawl skills by default
- **UX/Frontend**: Use `frontend-design` skill for all design work
- **Image generation**: Use `nano-banana-pro` skill (Gemini 3 Pro) for visual assets
- **Cross-model resonance**: Use `gemini-claude-resonance` skill for Gemini↔Claude visual dialogue
- **Dark mode**: Time-based defaults (7 AM–5 PM light, 5 PM–7 AM dark)
- **CSS**: Use CSS variables (`var(--color-*)`) for theme-aware colors
- **Animations**: Prefer Motion library over GSAP, respect `prefers-reduced-motion`
- **Lightbox**: Native `<dialog>` with `showModal()`/`close()`, `@starting-style` entry/exit animations, View Transitions API morphing (badge→lightbox), Pointer Events swipe gestures (left/right navigate, down closes), `closedby="any"` progressive enhancement. Structured captions (`title`, `year`, `description`, `tags[]`, `link`, `circular`). Scoped `--lightbox-accent` tokens (always dark bg). `body.lightbox-open` locks scroll + hides fixed UI.
- **CSS transitions**: Never use `transition: all`—enumerate specific properties
- **Focus styles**: Use `:focus-visible` progressive pattern: `:focus` for functional state, `:focus-visible` for outline, `:focus:not(:focus-visible)` to suppress for mouse. Never bare `outline: none` on `:focus`.
- **Touch targets**: All interactive elements must meet 44px minimum height (WCAG 2.2 / Apple HIG)

## SEO Conventions

- **Structured Data**: Use `StructuredData.astro` component with @id entity linking
- **AI Indexing**: Maintain `public/llms.txt` and markdown files for AI crawlers
- **robots.txt**: AI crawler directives defined for GPTBot, Claude-Web, PerplexityBot
- **Head Slot**: Use `<Fragment slot="head">` for page-specific meta/preconnects

## Brand Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-primary` | #966a85 | #c9a0b8 | Tyrian purple accent |
| `--color-text` | #0d0d0d | #f5f5f5 | Primary text |
| `--color-text-muted` | #686868 | #b8b8b8 | Secondary text |
| `--color-background` | #faf8f5 | #0d0d0d | Page background (warm off-white) |
| `--color-accent` | #d4a843 | #d4a843 | Gold accent |
| `--color-success-*` | #d4edda / #a3d4b0 / #155724 | rgba(52,211,153,0.1/0.3) / #6ee7b7 | Form success feedback |
| `--color-error-*` | #f8d7da / #e8b0b5 / #721c24 | rgba(248,113,113,0.1/0.3) / #fca5a5 | Form error feedback |

## Services Section

4 service pages with interactive "Overwatch" components — pure Astro + vanilla JS, no React.

**Heroes** (one per page):
- GEO/SEO → `GeoCommand.astro` (readiness scorecard: 6 platforms + 4 pillars)
- AI Automation → `ClockworkForge.astro` (animated pipeline)
- Claude Code Mentoring → `ClawdHero.astro` (mascot + terminal)
- Custom Applications → `StackedCarousel.astro` (3 browser windows, perspective cascade, auto-cycle)

**Slot Injection Pattern**: Interactive components render after `<Content />` in `[...slug].astro`, then client JS moves them into `<div id="...-slot">` placeholders in the markdown. This allows Astro components to appear inline within markdown content.

**Key components**: `EvalTribunal`, `WorkflowTransmutation`, `MissionTOC`, `EpochComparison`, `ClaudicleArchitecture`, `BrowserShowcase`, `LiveProofDashboard`, `FracturedSearch`, `ProjectArchive`, `TechStackLayers`, `TerminalDemo`

**Component conventions**:
- `@media (scripting: enabled)` gates on entry animations (content visible without JS)
- `IntersectionObserver` with `threshold: 0.1` + 2s fallback timeout
- `prefers-reduced-motion` disables all animation
- `min-height: unset` on buttons to override global 44px touch target where needed
- `<dialog>` with `showModal()`/`close()` for all modals (not div+aria-hidden)
- `astro:after-swap` listener for View Transitions re-init
- Suppress `.rich-text li::before` bullets via `<style is:global>` in components using lists

**OG images**: Per-service social cards in `public/images/og/` — Kothar-referenced subjects (Gemini 3 Pro `generate_with_references.py`) composited via ImageMagick onto Tom's collage art. 500px circle, `#8E3568` Tyrian purple ring, 6px stroke. Brightness-matched to og-about.png (0.20–0.23 range). Optimized with pngquant.

**GEO/SEO implementation**: `public/robots.txt` (21 AI crawlers), `public/llms.txt` (Kothar-voiced), `public/llms-full.txt` (163 lines), JSON-LD Service + BreadcrumbList schemas on all service pages, `/api/soul/query` REST endpoint.

## Key Features

- **Command Palette**: `Cmd+K` for navigation + dynamic soul commands (routes to Kothar, not hardcoded)
- **Theme Toggle**: `Cmd+Shift+D` or button in header
- **View Transitions**: Smooth page navigation
- **Labyrinth**: `/labyrinth` chat interface with Kothar oracle
- **Resume**: `/resume` interactive resume (subdomain: `resume.minoanmystery.org`)

## Detailed Guides

- @ARCHITECTURE.md - Complete Soul Engine architecture and codemap
- @agent_docs/soul-engine-reference.md - Cognitive steps, processes, subprocesses
- @agent_docs/soul-logging.md - Logging & observability system
- @agent_docs/dossier-creation-guide.md - RAG knowledge base creation
- @agent_docs/visual-parity.md - Webflow migration audit checklist
- @agent_docs/services-components.md - Services section: 16 interactive components, slot injection, GEO/SEO files

## Scholarly Sources

Located at `/Users/tomdimino/Desktop/Thera-Knossos-Minos-Paper/sources/`:

| Folder | Contents |
|--------|----------|
| `astour/` | Hellenosemitica (1965) - Greco-Semitic etymology |
| `gordon/` | Cyrus Gordon papers on Minoan-Semitic connections |
| `harrison/` | Jane Ellen Harrison's Themis |
| `athirat-tiamat/` | Asherah/Athirat and Tiamat research |

## Reference Sites

- **Live**: minoanmystery.org (Astro on Vercel)
- **World War Watcher**: worldwarwatcher.com (proof of GEO/SEO methodology — #1 Google, #1 Bing)
