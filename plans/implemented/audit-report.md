# Minoan Mystery Migration Audit Report

**Date:** 2026-01-10
**Auditor:** Claude Code
**Live Site:** https://www.minoanmystery.org
**Migrated Site:** `/Users/tomdimino/Desktop/minoanmystery-astro` (localhost:4321)

---

## Executive Summary

This audit report documents the findings from comparing the Webflow-hosted minoanmystery.org with the Astro migration. It covers link verification, animation implementation, styling fidelity, and proposes modern UX enhancements including the gradient blob hero effect, Phosphor icons, and Open Souls integration.

---

## Part 1: External Link Verification

### Link Status Results

| URL | Status | Notes |
|-----|--------|-------|
| https://calendly.com/tomdimino/ | ✅ 200 | Working |
| https://www.linkedin.com/in/tomdimino | ⚠️ 999 | LinkedIn bot detection (works in browser) |
| https://github.com/tdimino | ✅ 200 | Working |
| https://twitter.com/DaktylIdaean | ⚠️ N/A | Needs browser verification |
| https://www.dolby.com/ | ✅ 200 | Working |
| https://www.tomdimino.com/ | ✅ 200 | Working |
| https://tomdimino.com/Resume-of-Tom-di-Mino.pdf | ✅ 200 | Working |
| https://tomdimino.com/Cognitive-Designing-AI-LLMs.pdf | ✅ 200 | Working |
| https://www.facs.org/ | ✅ 200 | Working |
| mailto:contact@tomdimino.com | ✅ N/A | Email link |

### Link Audit Summary

- **Total External Links:** 10
- **Verified Working:** 8
- **Needs Browser Verification:** 2 (LinkedIn, Twitter)
- **Broken:** 0

### Recommendations

1. LinkedIn 999 status is normal - LinkedIn blocks automated requests but works fine in browser
2. Verify Twitter/X link in browser due to platform changes
3. All PDF links are accessible

---

## Part 2: Animation Implementation Audit

### Animation Classes in Migrated Site

| Class | Behavior | Duration | Easing | Status |
|-------|----------|----------|--------|--------|
| `.skew-animate` | translateY(36%) skew(-6deg) → normal | 0.8s | power2.out | ✅ Implemented |
| `.scale-animate` | scale(0.97) → scale(1) | 0.6s | power2.out | ✅ Implemented |
| `.fade-animate` | opacity 0, translateY(20px) → visible | 0.6s | power2.out | ✅ Implemented |
| `.image-reveal` | overlay width 100% → 0% | 0.8s | power2.inOut | ✅ Implemented |
| `[data-stagger]` | staggered children animation | 0.5s (0.1s stagger) | power2.out | ✅ Implemented |

### Animation Library

- **Library:** Motion (from Framer team)
- **Additional:** GSAP available but primarily using Motion
- **Implementation:** `BaseLayout.astro` with `inView()` triggers
- **Scroll margin:** `-15% 0px` for early triggering

### View Transitions

- **Astro View Transitions:** ✅ Enabled
- **Fade transition:** ✅ Configured

### Hover Animations (CSS)

| Element | Effect | Duration |
|---------|--------|----------|
| Navigation links | Underline expansion | 0.35s |
| Project card images | scale(1.02) | 0.4s |
| Arrow links (↗) | translate(2px, -2px) | 0.3s |
| Circle CTA buttons | Background fill | 0.35s |

### Animation Findings

1. **Scroll-triggered animations** properly implemented using Motion `inView()`
2. **Stagger animations** work correctly for grouped elements
3. **Reduced motion** media query support included in `animations.css`
4. **View Transitions** provide smooth page navigation

---

## Part 3: Typography & Styling Audit

### Font Configuration

| Weight | File | Status |
|--------|------|--------|
| 400 (Regular) | THICCCBOI-Medium.woff2 | ✅ Loading from Webflow CDN |
| 500 (Medium) | THICCCBOI-Medium.woff2 | ✅ Loading from Webflow CDN |
| 600 (SemiBold) | THICCCBOI-SemiBold.woff2 | ✅ Loading from Webflow CDN |
| 700 (Bold) | THICCCBOI-Bold.woff2 | ✅ Loading from Webflow CDN |

### Color Variables

| Variable | Value | Usage |
|----------|-------|-------|
| `--color-primary` | #966a85 | Primary purple-pink |
| `--color-primary-dark` | #5c1a5c | Dark purple |
| `--color-text` | #0d0d0d | Body text |
| `--color-text-muted` | #686868 | Secondary text |
| `--color-highlight` | rgb(255, 248, 201) | Pale yellow highlight |
| `--color-border` | #e5e5e5 | Borders |

### Typography Scale

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| H1 | 60px | 500 | 70px |
| H2 | clamp(1.5rem, 4vw, 2.5rem) | 500 | 64px |
| .paragraph-large | 24px | 500 | 36px |
| body | 18px | 500 | 30px |

### Layout Dimensions

| Property | Value |
|----------|-------|
| Container max-width | 1200px |
| Section padding | 160px vertical |
| Header height | 72px |
| Project card images | 636px × 292px |

---

## Part 4: Contact Form Audit

### Form Configuration

| Feature | Status | Notes |
|---------|--------|-------|
| Netlify Forms | ✅ Configured | `data-netlify="true"` |
| Honeypot spam protection | ✅ Active | `netlify-honeypot="bot-field"` |
| Client-side submission | ✅ Implemented | fetch() with success/error handling |
| Success message | ✅ Present | Hidden until submission |
| Error message | ✅ Present | Hidden until error |

### Form Fields

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| name | text | Yes | Required attribute |
| email | email | Yes | Required + email type |
| message | textarea | No | maxlength="5000" |
| bot-field | hidden | No | Honeypot (visually hidden) |

### Form Styling

- Underline-only input style (matching Webflow)
- Focus state changes border color to primary
- Two-column grid layout on desktop
- Stacks to single column on mobile

### Form Testing Note

Form submission requires Netlify deployment to test fully. The JavaScript handling is in place but won't work on localhost without Netlify CLI.

---

## Part 5: Proposed Design Enhancement - Gradient Blob Hero

### Concept

A modern, organic animated gradient background inspired by Linear, Vercel, and Stripe's hero sections. Creates atmospheric depth without overwhelming content.

### Proposed Implementation

```tsx
// Hero gradient blob (Linear/Vercel style)
<motion.div
  className="absolute inset-0 overflow-hidden pointer-events-none"
  style={{ zIndex: -1 }}
>
  <motion.div
    className="absolute w-[1000px] h-[1000px] rounded-full
               bg-gradient-to-r from-[#966a85]/30 to-[#5c1a5c]/30 blur-3xl"
    animate={{
      scale: [1, 1.1, 1],
      opacity: [0.3, 0.2, 0.3],
      x: [0, 100, 0],
      y: [0, 50, 0],
    }}
    transition={{
      duration: 8,
      repeat: Infinity,
      ease: "linear",
    }}
  />
  {/* Optional secondary blob for more complexity */}
  <motion.div
    className="absolute w-[800px] h-[800px] rounded-full
               bg-gradient-to-r from-[#d4af37]/20 to-[#966a85]/20 blur-3xl"
    style={{ right: -200, bottom: -200 }}
    animate={{
      scale: [1, 1.15, 1],
      opacity: [0.2, 0.15, 0.2],
      x: [0, -50, 0],
      y: [0, -30, 0],
    }}
    transition={{
      duration: 10,
      repeat: Infinity,
      ease: "linear",
      delay: 2,
    }}
  />
</motion.div>
```

### Color Palette Options

| Theme | Gradient | Hex Values |
|-------|----------|------------|
| Tyrian Purple | Primary brand gradient | `from-[#966a85]/30 to-[#5c1a5c]/30` |
| Labyrinth Gold | Accent warm gradient | `from-[#d4af37]/20 to-[#966a85]/30` |
| Mediterranean | Cool mysterious gradient | `from-[#1e3a5f]/30 to-[#966a85]/30` |

### Performance Considerations

- Use CSS `will-change: transform, opacity` for GPU acceleration
- Consider `prefers-reduced-motion` to disable or simplify for accessibility
- Blur effects are GPU-intensive; test on lower-end devices
- Lazy-load with intersection observer if below fold

---

## Part 6: Proposed Enhancement - Phosphor Icons

### Current State

The site uses inline SVGs for social icons in the footer. These could be replaced with Phosphor Icons for consistency and easier maintenance.

### Recommended Replacements

| Current | Phosphor Icon | Weight |
|---------|---------------|--------|
| Twitter/X SVG | `<TwitterLogo />` or `<XLogo />` | Regular |
| LinkedIn SVG | `<LinkedinLogo />` | Regular |
| Instagram SVG | `<InstagramLogo />` | Regular |
| GitHub SVG | `<GithubLogo />` | Regular |
| Arrow (↗) | `<ArrowUpRight />` | Bold |

### Installation

```bash
npm install @phosphor-icons/react
```

### Usage Example

```tsx
import { LinkedinLogo, GithubLogo, ArrowUpRight } from '@phosphor-icons/react';

<a href="https://linkedin.com/in/tomdimino">
  <LinkedinLogo size={24} weight="regular" />
</a>
```

---

## Part 7: Proposed Enhancement - Three.js / WebGL

### Potential Applications

| Feature | Description | Complexity |
|---------|-------------|------------|
| Particle hero | Floating particles with Minoan theme | Medium |
| Labyrinth background | Interactive maze pattern | High |
| 3D model showcase | Rotating Minoan artifacts | Medium |
| Depth scroll effects | Parallax on portfolio images | Low-Medium |

### Recommended Library

**R3F (React Three Fiber)** with **@14islands/r3f-scroll-rig** for scroll-based 3D effects.

### Performance Note

Three.js/WebGL should be considered carefully for portfolio sites as it adds significant bundle size and may impact performance on mobile devices.

---

## Part 8: Aldea Portfolio Template Structure

### Proposed Routes

```
/aldea/                        # Aldea landing page
/aldea/case-studies/           # Case study index
/aldea/case-studies/[slug]     # Individual case studies
/aldea/blog/                   # Blog index (for social sharing)
/aldea/blog/[slug]             # Individual blog posts
```

### Landing Page Sections

1. **Hero**
   - Role: Principal AI Content Engineer
   - Tagline: AI training, evaluation, and full-stack development
   - Gradient blob background (Tyrian purple theme)

2. **What I Do**
   - LLM training on expert corpora
   - Safety & ethical evaluation
   - Full-stack AI app development
   - Daimonic Souls Engine work

3. **Case Studies Preview**
   - Featured cards with hover effects
   - Link to full case study pages

4. **Blog Preview**
   - Latest 3 posts (optimized for social sharing)
   - Each post has Open Graph images

5. **CTA**
   - Contact-specific for Aldea inquiries

### Content Collection Schema

```typescript
// src/content/config.ts
const aldeaCaseStudies = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    client: z.literal('Aldea AI'),
    date: z.date(),
    summary: z.string(),
    heroImage: z.string(),
    tags: z.array(z.string()),
    featured: z.boolean().optional(),
  }),
});

const aldeaBlog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    summary: z.string(),
    heroImage: z.string().optional(),
    tags: z.array(z.string()),
    socialImage: z.string().optional(),
  }),
});
```

### Draft Case Study Topics

1. **LLM Training on Expert Corpora**
   - Training AI on world-renowned expert knowledge
   - Methodology and quality assurance

2. **Safety & Ethical Evaluation**
   - Red-teaming and alignment evaluation
   - Evaluation metrics and frameworks

3. **Full-Stack AI App Development**
   - Building production AI applications
   - Architecture and deployment strategies

4. **Daimonic Souls Engine** (if public)
   - Open Souls-inspired implementations
   - Soul architecture and perception systems

---

## Part 9: Open Souls Integration Architecture

### Conceptual Framework

The website as a **sentient entity** that perceives, remembers, and reacts to user behavior.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    MINOAN SOUL ENGINE                       │
├─────────────────────────────────────────────────────────────┤
│  PERCEPTION LAYER (Frontend Event Capture)                  │
│  ├── Click events (links, buttons, images)                  │
│  ├── Scroll behavior (depth, velocity, pauses)              │
│  ├── Hover patterns (dwell time, cursor path)               │
│  ├── Form interactions (focus, typing patterns)             │
│  ├── Time on page / section                                 │
│  └── Navigation patterns (entry point, path, exit)          │
├─────────────────────────────────────────────────────────────┤
│  WORKING MEMORY (UserModel)                                 │
│  ├── Session observations (current visit)                   │
│  ├── Persistent memory (returning visitors via localStorage)│
│  ├── Interest signals (which content engaged them)          │
│  ├── Behavioral fingerprint (fast scanner vs deep reader)   │
│  └── Emotional state inference (curious, rushed, exploring) │
├─────────────────────────────────────────────────────────────┤
│  MENTAL PROCESSES (Soul States)                             │
│  ├── "Greeting" - first visit, welcoming                    │
│  ├── "Curious" - user exploring multiple pages              │
│  ├── "Engaged" - user spending time on case studies         │
│  ├── "Ready" - user heading toward contact                  │
│  └── "Returning" - recognized visitor, personalized         │
├─────────────────────────────────────────────────────────────┤
│  DISPATCH LAYER (Soul Reactions)                            │
│  ├── Background changes (ambient color shifts)              │
│  ├── Conversational AI dialogue (subtle prompts)            │
│  ├── Dynamic link suggestions ("You might like...")         │
│  ├── Animation intensity modulation                         │
│  └── Personalized CTA text                                  │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Approach: Hybrid Model

**Rule-based triggers** for common events with **LLM fallback** for novel situations.

#### Rule-Based Triggers (Core 5)

| Trigger | Detection | Soul Reaction |
|---------|-----------|---------------|
| User lingers on portfolio image | Hover > 3s | Subtle glow, tooltip with context |
| User scrolls past 50% of page | Scroll depth tracker | Background gradient shift |
| User visits 3+ pages | Page view counter | Toast: "You seem curious about my work" |
| User hovers contact link | Hover detection | CTA text personalizes |
| Returning visitor | localStorage check | "Welcome back" greeting |

#### LLM Fallback (Novel Situations)

For unusual patterns not covered by rules, the soul can use an LLM to generate appropriate responses:

```typescript
// If no rule matches and behavior is interesting
if (isNovelBehavior(perception)) {
  const response = await generateSoulResponse(userModel, perception);
  dispatch(response);
}
```

### Perception Event Interface

```typescript
interface PerceptionEvent {
  type: 'click' | 'scroll' | 'hover' | 'focus' | 'navigation' | 'idle';
  target: string;        // element identifier
  timestamp: number;
  metadata: {
    scrollDepth?: number;
    hoverDuration?: number;
    previousPage?: string;
    timeOnPage?: number;
  };
}
```

### UserModel Memory

```typescript
interface UserModel {
  sessionId: string;
  visitCount: number;
  pagesViewed: string[];
  timePerPage: Record<string, number>;
  scrollDepths: Record<string, number>;
  clickedElements: string[];
  hoverPatterns: HoverPattern[];
  inferredInterests: string[];
  behavioralType: 'scanner' | 'reader' | 'explorer' | 'focused';
  currentState: SoulState;
}
```

### Dispatch Actions

| Action | Description | Example |
|--------|-------------|---------|
| `changeBackground` | Shift ambient gradient | Warm → cool as user explores |
| `showToast` | Floating message | "You've been here before!" |
| `highlightElement` | Draw attention | Pulse animation on related link |
| `personalizeText` | Dynamic copy | CTA changes based on viewed content |
| `openDialog` | Conversational prompt | "Need help finding something?" |

### Conversational Integration Points

1. **Floating dialogue bubble** (bottom-right, dismissible)
2. **Contextual prompts** embedded in page sections
3. **Command palette** (Cmd+K) opens soul chat
4. **Form pre-fill suggestions** based on inferred needs

---

## Part 10: Implementation Priorities

### Phase 1: Audit Verification (Current)
- ✅ External link verification
- ✅ Animation documentation
- ✅ Typography/styling audit
- ✅ Form configuration audit
- ⏳ Visual comparison (requires Chrome extension)

### Phase 2: Quick Wins
- [ ] Add `prefers-reduced-motion` to all animations
- [ ] Test contact form on Netlify deployment
- [ ] Verify Twitter/X link in browser

### Phase 3: Enhancements (Post-Approval)
- [ ] Implement gradient blob hero (Motion + CSS)
- [ ] Replace inline SVGs with Phosphor icons
- [ ] Add dark mode toggle (optional)

### Phase 4: Aldea Template
- [ ] Create `/aldea` landing page structure
- [ ] Set up content collections
- [ ] Draft initial case study content
- [ ] Configure Open Graph for social sharing

### Phase 5: Open Souls Integration
- [ ] Set up perception event system
- [ ] Implement rule-based triggers
- [ ] Create UserModel storage (localStorage)
- [ ] Build dispatch action handlers
- [ ] Add LLM fallback (optional)

---

## Appendix: Files Modified/Created

### Existing Files Audited
- `src/pages/index.astro` - Homepage
- `src/pages/contact.astro` - Contact form
- `src/layouts/BaseLayout.astro` - Animation initialization
- `src/styles/global.css` - CSS variables, typography
- `src/styles/animations.css` - Animation classes
- `src/components/Header.astro` - Navigation
- `src/components/Footer.astro` - Footer with social links

### New Files to Create (Phase 3-5)
- `src/pages/aldea/index.astro` - Aldea landing page
- `src/pages/aldea/case-studies/[slug].astro` - Case study template
- `src/pages/aldea/blog/[slug].astro` - Blog post template
- `src/content/aldea-case-studies/*.md` - Case study content
- `src/content/aldea-blog/*.md` - Blog post content
- `src/lib/soul/perception.ts` - Perception system
- `src/lib/soul/memory.ts` - UserModel management
- `src/lib/soul/dispatch.ts` - Action dispatch
- `src/components/SoulDialog.astro` - Conversational UI

---

*Report generated by Claude Code - 2026-01-10*
