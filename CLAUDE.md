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
- **Dark mode**: Time-based defaults (7 AM–5 PM light, 5 PM–7 AM dark)
- **CSS**: Use CSS variables (`var(--color-*)`) for theme-aware colors
- **Animations**: Prefer Motion library over GSAP, respect `prefers-reduced-motion`

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
| `--color-background` | #ffffff | #0d0d0d | Page background |

## Key Features

- **Command Palette**: `Cmd+K` for navigation
- **Theme Toggle**: `Cmd+Shift+D` or button in header
- **View Transitions**: Smooth page navigation
- **Labyrinth**: `/labyrinth` chat interface with Kothar oracle
- **Resume**: `/resume` interactive resume (subdomain: `resume.minoanmystery.org`)
  - Tyrian purple dark theme, Motion animations, PDF export
  - SEO with ProfilePage/Person structured data

## Detailed Guides

- @ARCHITECTURE.md - Complete Soul Engine architecture and codemap
- @agent_docs/soul-engine-reference.md - Cognitive steps, processes, subprocesses
- @agent_docs/soul-logging.md - Logging & observability system
- @agent_docs/dossier-creation-guide.md - RAG knowledge base creation
- @agent_docs/visual-parity.md - Webflow migration audit checklist

## Scholarly Sources

Located at `/Users/tomdimino/Desktop/Thera-Knossos-Minos-Paper/sources/`:

| Folder | Contents |
|--------|----------|
| `astour/` | Hellenosemitica (1965) - Greco-Semitic etymology |
| `gordon/` | Cyrus Gordon papers on Minoan-Semitic connections |
| `harrison/` | Jane Ellen Harrison's Themis |
| `athirat-tiamat/` | Asherah/Athirat and Tiamat research |

## Reference Sites

- **Original**: minoanmystery.org (Webflow - source of truth)
- **Live Astro**: Deploy to Vercel for comparison
