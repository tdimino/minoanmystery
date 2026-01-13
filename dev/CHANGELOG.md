# Minoan Mystery - Development Changelog

## Session: January 12, 2026 (Evening)

### Dark Mode Implementation
Added full dark mode support with theme toggle and WCAG-compliant contrast ratios.

#### New Components
- `src/components/ThemeScript.astro` - FOUC prevention script (runs before styles)
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
