# Minoan Mystery Portfolio

Tom di Mino's portfolio site - migrated from Webflow to Astro with soul-aware interactions.

## Mission

Transform this portfolio into a **sentient digital presence** that:
1. Achieves pixel-perfect parity with original Webflow site
2. Embodies modern 2025/2026 UX patterns
3. Lives as a "soul" via Open Souls paradigm
4. Showcases Aldea AI work alongside existing case studies

## Stack

- **Framework**: Astro 5 with View Transitions
- **Animations**: Motion library (from Framer team)
- **Icons**: Iconify with Phosphor, Lucide, Tabler
- **Hosting**: Vercel with serverless functions
- **Email**: Resend API for contact form

## Structure

```
src/
├── components/     # Astro components (Header, Footer, CommandPalette, ThemeToggle)
├── content/        # Portfolio case studies (Markdown collections)
├── layouts/        # BaseLayout with View Transitions
├── pages/          # Routes (/, /about, /contact, /portfolio/[slug], /labyrinth)
│   └── api/soul/   # Soul API endpoints (chat, subprocess, personality, tts)
├── styles/         # global.css with CSS variables, dark mode
└── lib/soul/       # Soul Engine (Open Souls paradigm)
    ├── opensouls/  # Core Open Souls implementation
    │   ├── core/           # WorkingMemory, CognitiveStep, utils
    │   ├── cognitiveSteps/ # externalDialog, internalMonologue, mentalQuery
    │   ├── mentalProcesses/# greeting, curious, engaged, ready, returning
    │   ├── perception/     # SoulOrchestrator, memoryIntegrate
    │   ├── providers/      # LLM providers (OpenRouter, Groq, Baseten)
    │   └── subprocesses/   # modelsTheVisitor (background visitor modeling)
    ├── memory.ts   # SoulMemory + SoulMemoryInterface (DI pattern)
    ├── types.ts    # UserModel, HydratedUserModel, SoulState
    └── perception.ts # Event capture (click, scroll, hover, navigation)
```

## Soul Engine Architecture

The Soul Engine follows the Open Souls paradigm with:

- **SoulOrchestrator** - Main orchestration layer, handles perception-response cycle
- **HydratedUserModel** - Extends persisted `UserModel` with computed values (timeOnSite, isReturning, etc.)
- **Mental Processes** - State machine: greeting → curious → engaged → ready
- **Cognitive Steps** - Pure LLM transformations (externalDialog, internalMonologue, mentalQuery)
- **modelsTheVisitor** - Background subprocess that builds visitor understanding

## Commands

- Dev: `npm run dev` (localhost:4321)
- Build: `npm run build`
- Preview: `npm run preview`

## Conventions

- **No auto-commit**: Always wait for explicit user approval before git operations
- **Web search**: Use Exa and Firecrawl skills by default
- **UX/Frontend**: Use `frontend-design` skill for all design and UX work
- **Dark mode**: Time-based defaults (7 AM–5 PM light, 5 PM–7 AM dark)
- **CSS**: Use CSS variables (`var(--color-*)`) for theme-aware colors
- **Animations**: Prefer Motion library over GSAP, respect `prefers-reduced-motion`
- **Dynamic CTA text**: DISABLED - The contact-bound trigger's text scramble effect looks strange mid-transition. Keep `maxFires: 0` in `src/lib/soul/triggers.ts` until properly animated.

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
- **Responsive**: Fluid typography with `clamp()`, mobile-first
- **Soul Engine**: Visitor modeling with Open Souls paradigm
- **Labyrinth**: `/labyrinth` chat interface with Kothar (Oracle persona)

## Detailed Guides

- @agent_docs/visual-parity.md - Pixel-perfect audit checklist
- @agent_docs/soul-engine-reference.md - Cognitive steps, mental processes, subprocesses
- @agent_docs/soul-logging.md - Logging & observability system
- @agent_docs/soul-architecture.md - Conceptual framework and phase plan
- @agent_docs/modern-ux.md - 2025/2026 UX patterns
- @agent_docs/aldea-content.md - Case study creation

## Scholarly Sources

Located at `/Users/tomdimino/Desktop/Thera-Knossos-Minos-Paper/sources/`:

| Folder | Contents |
|--------|----------|
| `astour/` | Hellenosemitica (1965) - 902KB markdown + PDFs. Comprehensive Greco-Semitic name etymology. |
| `gordon/` | Cyrus Gordon papers: Minoica (1962), Evidence for Minoan Language (1966), Decipherment of Minoan/Eteocretan (1975), Ugarit and Minoan Crete (1966), Ugarit and Caphtor |
| `harrison/` | Jane Ellen Harrison's Themis and related works |
| `rendsburg/` | Gary Rendsburg papers on Hebrew linguistics |
| `athirat-tiamat/` | Papers on Asherah/Athirat and Tiamat connections |

Key resources for Minoan soul research:
- **Gordon-Minoica-1962**: Linear A *mi-na-ne* = Alalakh *mi-na-an* = Ugaritic *mnn* = Hebrew מִינִי (Meni, Isa. 65:11)
- **Hellenosemitica**: Dissimilation patterns, name etymologies, West Semitic origins of Greek myth

## Reference Sites

- **Original**: minoanmystery.org (Webflow - source of truth)
- **Live Astro**: Deploy to Vercel for comparison
- **Aldea**: aldea.ai (stealth link on homepage)
