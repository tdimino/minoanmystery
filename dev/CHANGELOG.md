# Minoan Mystery - Development Changelog

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

#### High Priority
- [ ] Typography fix: `.paragraph-large.front-page` 24px → 22px
- [ ] Touch targets: Ensure 44px minimum for accessibility
- [ ] Fluid typography with clamp()

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
