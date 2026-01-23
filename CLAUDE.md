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
souls/minoan/           # Soul identity (Open Souls paradigm)
├── soul.md             # Core system prompt — Kothar's persona
├── academic/soul.md    # Academic mode personality
├── poetic/soul.md      # Poetic mode personality
├── dossiers/           # RAG knowledge base (chunked for embeddings)
└── config.json         # Model settings

src/
├── components/     # Astro components (Header, Footer, CommandPalette, ThemeToggle)
├── content/        # Portfolio case studies (Markdown collections)
├── layouts/        # BaseLayout with View Transitions
├── pages/          # Routes (/, /about, /contact, /portfolio/[slug], /labyrinth)
│   └── api/soul/   # Soul API endpoints (chat, subprocess, personality, tts)
├── styles/         # global.css with CSS variables, dark mode
└── lib/soul/       # Soul Engine implementation
    ├── opensouls/  # Core Open Souls implementation
    │   ├── core/           # WorkingMemory, CognitiveStep, utils
    │   ├── cognitiveSteps/ # externalDialog, poeticComposition, etc.
    │   ├── mentalProcesses/# greeting, curious, engaged, ready, returning
    │   ├── perception/     # SoulOrchestrator, memoryIntegrate
    │   └── subprocesses/   # modelsTheVisitor, embodiesTheVision, embodiesTheTarot
    └── retrieval/  # RAG pipeline (kotharRag, VoyageAI embeddings)
```

## Soul Engine (Open Souls Paradigm)

**Core Identity**: `souls/minoan/soul.md` — Kothar wa Khasis, the oracle persona. This is the system prompt that defines the soul's worldview, speaking style, knowledge domains, and boundaries.

**Modal Personalities**:
- `souls/minoan/academic/soul.md` — Scholarly mode (Gordon, Astour, Harrison voices)
- `souls/minoan/poetic/soul.md` — Tamarru, Tom di Mino's poetic daimon (registers, image domains, trigger states)

**Architecture**:
- **SoulOrchestrator** — Perception-response cycle, stream handling
- **Cognitive Steps** — Pure LLM transformations (externalDialog, poeticComposition, etc.)
- **Mental Processes** — State machine: greeting → curious → engaged → ready
- **Subprocesses** — Background tasks (modelsTheVisitor, embodiesTheVision, embodiesTheTarot)

## Commands

- Dev: `npm run dev` (localhost:4321)
- Build: `npm run build`
- Preview: `npm run preview`
- Reingest dossiers: `./scripts/reingest-dossiers.sh` (chunks → VoyageAI voyage-4-large embeddings → Supabase)

## RAG Pipeline

The dossiers are processed through:

1. **Chunking**: `scripts/chunk-dossiers.ts` extracts content and YAML frontmatter tags
2. **Embedding**: `scripts/ingest-embeddings.ts` uses **voyage-4-large** for document embeddings
3. **Storage**: Supabase pgvector for similarity search

**Why voyage-4-large?**
- MoE architecture with state-of-the-art retrieval accuracy (Jan 2026)
- 40% lower serving cost than dense models ($0.08/M tokens)
- Matryoshka support: Multiple dimensions (256, 512, 1024, 2048)

## Conventions

- **No auto-commit**: Always wait for explicit user approval before git operations
- **Web search**: Use Exa and Firecrawl skills by default
- **UX/Frontend**: Use `frontend-design` skill for all design and UX work
- **Dark mode**: Time-based defaults (7 AM–5 PM light, 5 PM–7 AM dark)
- **CSS**: Use CSS variables (`var(--color-*)`) for theme-aware colors
- **Animations**: Prefer Motion library over GSAP, respect `prefers-reduced-motion`
- **Dynamic CTA text**: DISABLED - The contact-bound trigger's text scramble effect looks strange mid-transition. Keep `maxFires: 0` in `src/lib/soul/triggers.ts` until properly animated.
- **PDF to Markdown**: Use Mistral OCR (via `ancient-near-east-research` skill) or `marker_single` as fallback when Mistral API is unavailable. Never read PDFs directly—protects against token overload.

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
