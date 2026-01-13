# Visual Parity Audit Guide

Pixel-perfect fidelity checklist for Webflow → Astro migration.

## Pages to Audit

| Route | Webflow URL | Status |
|-------|-------------|--------|
| Homepage | minoanmystery.org | Audited |
| About | minoanmystery.org/about | Audited |
| Contact | minoanmystery.org/contact | Audited |
| Portfolio: ACS | minoanmystery.org/portfolio/acs | Audited |
| Portfolio: CZI | minoanmystery.org/portfolio/czi | Audited |
| Portfolio: Dolby | minoanmystery.org/portfolio/dolby | Audited |

## Typography Specs

| Element | Size | Weight | Line-Height |
|---------|------|--------|-------------|
| Body | 18px | 500 | 30px |
| H1 | 60px (clamp 36-60) | 500 | 70px (1.17) |
| H2 | 48px (clamp 32-48) | 500 | 64px (1.33) |
| H3 | 26px (clamp 20-26) | 600 | 34px (1.31) |
| H4 | 22px (clamp 18-22) | 700 | 26px (1.18) |
| .paragraph-large | 22px | 500 | 36px (1.64) |

**Font**: Thicccboi (loaded from Webflow CDN)

## Layout Specs

| Element | Value |
|---------|-------|
| Container max-width | 1200px |
| Section padding | 160px vertical (desktop) |
| Header height | 72px (fixed) |
| Header logo | 58px height |
| Footer logo | 158x158px |
| Footer padding | 88px top, 40px bottom |
| Project card images | 636x292px |

## Animation Specs

| Animation | Duration | Easing |
|-----------|----------|--------|
| `.skew-animate` | 0.8s | power2.out |
| `.scale-animate` | 0.6s | power2.out |
| `.fade-animate` | 0.6s | power2.out |
| `.image-reveal` | 0.8s | power2.inOut |
| `[data-stagger]` | 0.5s, 0.1s delay | power2.out |
| Hover underlines | 0.35s | ease |
| Project card scale | 0.3s | ease |

## Breakpoints

| Name | Width |
|------|-------|
| Mobile | 375px |
| Tablet | 768px |
| Desktop | 1024px |
| Large | 1440px |

## Audit Methodology

1. **Screenshot both sites** at each breakpoint
2. **Overlay comparison** using Chrome DevTools or Figma
3. **Element inspection** for computed styles
4. **Video recording** for animation comparison

## Common Issues Found

- Hardcoded colors → Use CSS variables
- Fixed font sizes → Use `clamp()` for fluid typography
- Missing hover states → Check all interactive elements
- Animation timing → Verify easing curves match

## Files to Modify

- `src/styles/global.css` - Typography, colors, variables
- `src/components/Header.astro` - Nav styling
- `src/components/Footer.astro` - Footer layout
- `src/pages/*.astro` - Page-specific overrides
