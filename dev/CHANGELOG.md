# Minoan Mystery - Development Changelog

## Session: January 14, 2026

### Soul Engine Refactoring & Type Consolidation

Major refactoring of the Soul Engine to follow Open Souls patterns more closely, with significant type system cleanup.

#### Type System Consolidation

**UserModel/VisitorModel Merge**
- Eliminated separate `VisitorModel` type (~40 lines of conversion code removed)
- Created `HydratedUserModel` pattern: extends `UserModel` with computed values
- Added new fields to `UserModel`:
  - `readinessSignals: string[]` - signals indicating readiness to contact
  - `lastProject?: string` - last portfolio project viewed
- Added getter/setter methods to `SoulMemory`:
  - `getReadinessSignals()`, `addReadinessSignal()`
  - `getLastProject()`, `setLastProject()`

**Architecture Cleanup**
- Deleted deprecated `MemoryIntegrator.ts` (replaced by `SoulOrchestrator.ts`)
- Renamed `convertUserModel()` → `hydrateUserModel()` for clarity
- Updated `ProcessContext` to use `userModel: HydratedUserModel` instead of `visitorModel`
- Updated all mental processes to destructure `userModel` instead of `visitorModel`

#### Name Extraction Improvements (`src/lib/soul/opensouls/core/utils.ts`)
- Case-insensitive regex patterns (`[a-z]+` with `/i` flag)
- Name normalization (uppercase first letter, lowercase rest)
- Added console.log debugging for troubleshooting
- More pattern variations for common phrasings

#### Visitor Modeling Optimizations (`src/lib/soul/opensouls/subprocesses/modelsTheVisitor.ts`)
- Added `minInteractionsBeforeUpdate` gate (default: 2 messages before updating model)
- Combined two `mentalQuery` calls into one (reduced LLM calls)
- Adjusted whispers prompt to focus on curiosity over doubts

#### UI Changes
- Removed privacy footer from `/labyrinth` page (deferred for later implementation)

#### Files Changed
- `src/lib/soul/types.ts` - Added new UserModel fields
- `src/lib/soul/memory.ts` - Added getter/setter methods
- `src/lib/soul/opensouls/mentalProcesses/types.ts` - Created HydratedUserModel
- `src/lib/soul/opensouls/perception/SoulOrchestrator.ts` - Updated hydration logic
- `src/lib/soul/opensouls/perception/memoryIntegrate.ts` - Updated type references
- `src/lib/soul/opensouls/mentalProcesses/*.ts` - Updated all processes
- `src/lib/soul/opensouls/subprocesses/modelsTheVisitor.ts` - LLM optimizations
- `src/pages/labyrinth.astro` - Removed privacy UI, improved name extraction
- Deleted: `src/lib/soul/opensouls/perception/MemoryIntegrator.ts`

---

## Session: January 13, 2026

### Soul Engine Implementation & Polish

Implemented the Soul Engine infrastructure and made various dark mode and UX polish improvements.

#### Soul Engine (`src/lib/soul/`)
- `index.ts` - Main export and soul initialization
- `types.ts` - TypeScript interfaces (PerceptionEvent, UserModel, SoulState, SoulAction, Trigger)
- `perception.ts` - Event capture (click, scroll, hover, navigation, idle, focus)
- `memory.ts` - SoulMemory class with localStorage persistence
- `processes.ts` - Mental process state machine
- `dispatch.ts` - Action execution (toasts, highlights, CTA updates, animations)
- `triggers.ts` - 5 core rule-based triggers (Contact Bound CTA disabled for now)

#### New Components
- `src/components/SoulHint.astro` - Cmd+K hint badge (always visible)
- `src/components/FloatingDialogue.astro` - Toast-style soul messages

#### Command Palette Enhancements
- ESC button now clickable to close palette
- Single-key shortcuts (H, A, C, I) work when input is empty
- Listens for `open-command-palette` custom event from SoulHint

#### Dark Mode Polish (`src/pages/about.astro`)
- Aldea and Minoan Mystery logos invert to white via CSS `filter: invert(1)`
- Resume arrow icon inverts to white
- Circle link chevron inverts to white (and back to black on hover)
- Chevron size increased to 50px

#### Layout Adjustments
- About hero grid changed from `1fr 1.2fr` to `1fr 1.25fr`

#### Favicon
- New multi-resolution `favicon.ico` (16, 32, 48, 64px) with transparent background
- Removed old `favicon.svg` and `favicon.png`

#### Content Updates
- Dolby case study: "enterprise-grade domain" → "enterprise-grade ecosystem"

---

## Session: January 12, 2026 (Late Night)

### Soul Integration Planning

Prepared comprehensive implementation plan for Soul Integration using the Open Souls paradigm, adapted from the Aldea Soul Engine for frontend-first deployment.

#### New Documentation (`agent_docs/`)
- `aldea-content.md` - Aldea AI case study content strategy
- `modern-ux.md` - Modern UX patterns (gradient blobs, bento grid, magnetic cursors)
- `soul-architecture.md` - Open Souls integration conceptual framework

#### Implementation Plans (`plans/`)
- `command-palette-dark-mode-plan.md` - Documentation of completed Command Palette & Dark Mode features
- `soul-integration-plan.md` - Full Soul Integration implementation plan (Phases 1-5)

#### Soul Engine Architecture (Planned)
```
src/lib/soul/
├── index.ts              # Main export, soul initialization
├── types.ts              # TypeScript interfaces (PerceptionEvent, UserModel, SoulState, SoulAction)
├── perception.ts         # Event capture (click, scroll, hover, navigation, idle)
├── memory.ts             # WorkingMemory + UserModel (localStorage)
├── processes.ts          # Mental process state machine
├── dispatch.ts           # Action execution (DOM, toasts, UI)
└── triggers.ts           # 5 core rule-based triggers
```

#### 5 Core Triggers (Planned)
1. **Returning Visitor** - visitCount > 1 → "Welcome back" toast
2. **Deep Reader** - scrollDepth > 70% AND time > 2min → Subtle CTA highlight
3. **Explorer** - pagesViewed >= 3 in session → "You seem curious" hint
4. **Contact Bound** - hover on contact link > 1s → Personalized CTA text
5. **Idle Wanderer** - idle > 30s → Ambient animation intensifies

#### New Components (Planned)
- `src/components/SoulHint.astro` - Cmd+K hint badge (bottom-right, hides after 3 uses)
- `src/components/FloatingDialogue.astro` - Toast-style soul messages

#### Project Configuration
- `CLAUDE.md` - Claude Code project instructions

---

## Session: January 12, 2026 (Evening)

### Dark Mode Implementation
Added full dark mode support with theme toggle and WCAG-compliant contrast ratios.

#### Time-Based Theme Defaults (`src/components/ThemeScript.astro`)
- Light mode: 7 AM to 5 PM
- Dark mode: 5 PM to 7 AM
- Uses user's local timezone via `Intl.DateTimeFormat`
- Falls back to ET (America/New_York) if timezone detection fails
- Priority: stored preference > time-based > system preference

#### New Components
- `src/components/ThemeScript.astro` - FOUC prevention script with time-aware defaults
- `src/components/ThemeToggle.astro` - Sun/moon toggle button with keyboard shortcut (Cmd+Shift+D)
- `src/components/CommandPalette.astro` - Command palette UI (Cmd+K) with navigation commands

#### Dark Theme Colors (`src/styles/global.css`)
- Background: #0d0d0d
- Text: #f5f5f5 (17.83:1 contrast ratio)
- Muted text: #b8b8b8 (10.29:1 contrast ratio)
- Primary accent: #c9a0b8 (8.52:1 contrast ratio)
- All colors exceed WCAG AA requirements

#### Header Updates (`src/components/Header.astro`)
- Added ThemeToggle to desktop nav and mobile menu
- Nav link color changed from hardcoded `rgb(34,34,34)` to `var(--color-text)` for dark mode support
- Mobile menu restructured with flexbox for better footer positioning
- Theme toggle now works in both desktop and mobile views

#### Footer Updates (`src/components/Footer.astro`)
- Logo filter for dark mode (purple tint via CSS filter)
- Tom di Mino social icon inverted to white for dark mode

#### Index Page Updates (`src/pages/index.astro`)
- Project card background changed from `white` to `var(--color-background)`
- Hero links updated to use `var(--color-text)` instead of hardcoded colors
- Highlight color brightened for dark mode visibility

#### BaseLayout Updates (`src/layouts/BaseLayout.astro`)
- Integrated ThemeScript in `<head>` before styles
- Added CommandPalette component

#### Link Updates
- A.I./LLMs nav link now points to external PDF: https://www.tomdimino.com/Cognitive-Designing-AI-LLMs.pdf
- Opens in new tab with proper rel attributes

---

## Session: January 12, 2026

### Visual Parity Fixes (Webflow to Astro Migration)

#### Header Component (`src/components/Header.astro`)
- Logo height: 36px → 58px (matching Webflow)
- Removed image-rendering hacks causing blurry edges
- Nav spacing: 4rem gap → 0.5rem gap

#### Footer Component (`src/components/Footer.astro`)
- Padding: 88px top, 40px bottom
- Footer-bottom margin-top: 100px
- Footer-content padding-bottom: 0
- Footer-description font-size: 18px → 20px, max-width: 420px
- "Inquire herein" font-weight: 700 → 600
- Footer-link line-height: reduced to 1.15 for tighter multiline
- Added social links with Tom di Mino icon

#### Homepage (`src/pages/index.astro`)
- Hero title rewritten: "Poet-turned AI/ML engineer at Aldea AI; ex-J.P. Morgan, Google, & CZI"
- "Aldea AI" → stealth link (clickable, no visual styling) to https://aldea.ai/
- "ex-J.P. Morgan, Google, & CZI" → bold weight
- "AI/ML engineer" in italics
- "we should work together" hover → grey (color-text-muted)
- Animation script fixed for View Transitions (astro:after-swap event)

#### About Page (`src/pages/about.astro`)
- h1 font-size: increased to 58px
- Animation script fixed for View Transitions

#### Contact Page (`src/pages/contact.astro`)
- Webflow exact styling applied
- Form inputs with bottom-border only
- Submit button with animated underline

#### Portfolio Pages (`src/pages/portfolio/[...slug].astro`)
- Parallax hero component integrated
- Lightbox component for image galleries
- View Transitions navigation fixes

#### Global Styles (`src/styles/global.css`)
- Added Webflow neutral color scale (--neutral-100 through --neutral-800)
- Typography values matched to Webflow:
  - body: 18px/30px, weight 500
  - h1: 60px/70px, weight 500
  - h2: 48px/64px, weight 500
  - h3: 26px/34px, weight 600
  - h4: 22px/26px, weight 700
  - .paragraph-large: 22px/36px
- Figcaption: centered, 16px margin-top

### Mobile Optimization (2025/2026 Best Practices)

#### Fluid Typography (`src/styles/global.css`)
All headings now use `clamp()` for smooth scaling:
- h1: `clamp(36px, 5vw + 1rem, 60px)` with line-height 1.17
- h2: `clamp(32px, 4vw + 1rem, 48px)` with line-height 1.33
- h3: `clamp(20px, 2.5vw + 0.5rem, 26px)` with line-height 1.31
- h4: `clamp(18px, 2vw + 0.5rem, 22px)` with line-height 1.18
- .paragraph-large: `clamp(18px, 1.5vw + 0.75rem, 22px)` with line-height 1.64

#### Touch Targets (WCAG 2.2 Compliance)
- Form inputs: min-height 48px, font-size 16px (prevents iOS zoom)
- Buttons: min-height 44px
- Textarea: min-height 100px

#### Homepage Typography Fix
- `.paragraph-large.front-page`: 24px → 22px (Webflow exact)

### New Components Added
- `src/components/Lightbox.astro` - Image gallery lightbox
- `src/components/ParallaxHero.astro` - Parallax header for portfolio pages
- `src/components/ImageZoom.astro` - Image zoom functionality

### New Images Added
Gallery images copied from Webflow export for proper lightbox functionality:
- Dolby: legacy-dolby-1.jpg, Professional-Education.jpg, Case-Study.jpg, etc.
- ACS: acs-audit.jpg, acs-workshops.png, acs-voice.png, etc.
- CZI: napari-github.png, napari-hub.png, Mural.png, etc.

### Pending Work (from Plan)

#### High Priority - COMPLETED
- [x] Typography fix: `.paragraph-large.front-page` 24px → 22px
- [x] Touch targets: Ensure 44px minimum for accessibility
- [x] Fluid typography with clamp()

#### Medium Priority
- [ ] CSS Container Queries for responsive components
- [ ] Vercel image optimization setup
- [ ] Gallery groupings and captions (multi-image galleries)

#### Low Priority
- [ ] Standardized breakpoint CSS variables
- [ ] vercel.json caching configuration

---

## File Structure

```
minoanmystery-astro/
├── dev/
│   └── CHANGELOG.md          # This file
├── plans/
│   ├── audit-report.md       # Visual audit findings
│   └── migration-audit-plan.md
├── public/images/
│   ├── portfolio/            # Gallery images (30+)
│   ├── TomdiMinoIcon.png     # Social icon
│   └── tyrian-profile.png    # Profile image
├── src/
│   ├── components/
│   │   ├── Footer.astro      # Updated
│   │   ├── Header.astro      # Updated
│   │   ├── ImageZoom.astro   # New
│   │   ├── Lightbox.astro    # New
│   │   └── ParallaxHero.astro # New
│   ├── content/portfolio/
│   │   ├── acs.md            # Updated
│   │   ├── czi.md            # Updated
│   │   └── dolby.md          # Updated
│   ├── pages/
│   │   ├── about.astro       # Updated
│   │   ├── contact.astro     # Updated
│   │   ├── index.astro       # Updated
│   │   └── portfolio/
│   │       └── [...slug].astro # Updated
│   └── styles/
│       └── global.css        # Updated
└── astro.config.mjs          # Updated (Motion integration)
```

---

## Commands

```bash
# Development
npm run dev          # Start dev server at localhost:4321

# Build
npm run build        # Production build
npm run preview      # Preview production build

# Deployment (Vercel)
npx vercel           # Deploy to Vercel
```
