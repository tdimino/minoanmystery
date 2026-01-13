# Animation Framework Migration Plan

## Summary
Migrate Minoan Mystery Astro site from GSAP to a modern animation stack that matches/exceeds Webflow sophistication.

## Current State
- **GSAP + ScrollTrigger** (60KB) with 8 CSS animation classes
- Missing: page transitions, parallax, stagger timing, spring physics

## Recommended Stack

### Core (Required)
1. **Motion** (motion.dev) - 16KB, Framer team, spring physics, scroll triggers
2. **Astro View Transitions** - Native, zero-bundle page transitions

### Optional Enhancement
3. **Three.js** - WebGL 3D effects for hero section

## Implementation Steps

### Phase 1: Page Transitions (30 min)
```javascript
// astro.config.mjs
experimental: { viewTransitions: true }
```
```astro
// BaseLayout.astro
<ViewTransitions />
```

### Phase 2: Replace GSAP with Motion (2-3 hrs)
- Install: `npm install motion`
- Convert `.skew-animate`, `.scale-animate`, `.fade-animate`
- Add stagger to project cards

### Phase 3: Three.js Hero (Optional, 8-12 hrs)
- Particle background or geometric shapes
- Interactive cursor effects

## Files to Modify
- `/src/layouts/BaseLayout.astro` - Remove GSAP, add Motion + ViewTransitions
- `/src/styles/animations.css` - Simplify to CSS-only hover states
- `/src/pages/index.astro` - Add Motion scroll triggers
- `astro.config.mjs` - Enable viewTransitions

## Full Analysis
See: `../design/ANIMATION-ANALYSIS.md`
