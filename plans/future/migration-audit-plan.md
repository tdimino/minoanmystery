# Minoan Mystery Portfolio Migration Audit Plan

## Executive Summary

A comprehensive audit plan for the minoanmystery.org Webflow → Astro migration, covering:
1. **Pixel-to-pixel fidelity** verification
2. **Animation-to-animation fidelity** comparison
3. **User action completeness** audit (forms, links, interactions)
4. **Modern UX enhancement opportunities** (Framer, Phosphor, three.js)
5. **Aldea portfolio template** creation
6. **Open Souls integration** for a sentient website experience

---

## Design Decisions (Confirmed)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Open Souls Architecture** | Hybrid Approach | Rule-based triggers for common events, LLM fallback for novel situations |
| **Hero Effect** | Gradient Blob Animation | Organic animated gradient (Linear/Vercel style) - modern, performant, elegant |
| **Aldea Content** | Generate Drafts | Create initial case study content based on Aldea work |

---

## Implementation Priorities

### High Priority (Audit First)
1. Complete pixel-to-pixel fidelity audit via Chrome extension
2. Complete animation-to-animation comparison
3. Verify all forms and links work correctly
4. Document all discrepancies

### Medium Priority (Enhancements)
1. Implement gradient blob hero animation (Motion + CSS)
2. Add Phosphor icons to replace inline SVGs
3. Create Aldea landing page structure
4. Draft initial Aldea case study content

### Lower Priority (Soul Integration)
1. Set up event perception layer
2. Implement rule-based triggers (3-5 core reactions)
3. Add LLM fallback for novel user patterns
4. Create conversational UI component

---

## Part 1: Pixel-to-Pixel Fidelity Audit

### Pages to Compare

| Route | Live URL | Local Path | Status |
|-------|----------|------------|--------|
| Homepage | minoanmystery.org | `/` | To audit |
| About | minoanmystery.org/about | `/about` | To audit |
| Contact | minoanmystery.org/contact | `/contact` | To audit |
| Portfolio: ACS | minoanmystery.org/portfolio/acs | `/portfolio/acs` | To audit |
| Portfolio: CZI | minoanmystery.org/portfolio/czi | `/portfolio/czi` | To audit |
| Portfolio: Dolby | minoanmystery.org/portfolio/dolby | `/portfolio/dolby` | To audit |

### Audit Methodology

Using Chrome extension for side-by-side comparison:

1. **Screenshot both sites** at identical viewport widths (1440px, 1024px, 768px, 375px)
2. **Overlay comparison** with opacity toggle
3. **Element-level inspection** for typography, spacing, colors
4. **Computed styles comparison** via DevTools

### Key Fidelity Checkpoints

#### Typography
- [ ] Thicccboi font loading (from Webflow CDN)
- [ ] H1: 60px, weight 500, line-height 70px
- [ ] H2: clamp(1.5rem, 4vw, 2.5rem)
- [ ] paragraph-large: 24px, weight 500, line-height 36px
- [ ] Italic/bold emphasis styling matches

#### Colors
- [ ] Primary: `#966a85` (lighter purple-pink)
- [ ] Text: `#0d0d0d`
- [ ] Muted: `#686868`
- [ ] Highlight: `rgb(255, 248, 201)` pale yellow
- [ ] Border: `#e5e5e5`

#### Layout
- [ ] Container max-width: 1200px
- [ ] Section padding: 160px vertical (desktop)
- [ ] Header: 72px height, fixed positioning
- [ ] Footer: 3-column grid (1.5fr 1fr 1fr)

#### Component-Specific
- [ ] Header logo, nav links, dropdown behavior
- [ ] Footer logo (158x158px), social icons
- [ ] Project cards: alternating layout, 636x292px images
- [ ] Contact form: underline-only inputs, two-column layout

---

## Part 2: Animation-to-Animation Fidelity

### Current Animation Stack (Migrated)

| Animation Class | Behavior | Duration | Easing |
|-----------------|----------|----------|--------|
| `.skew-animate` | translateY(36%) skew(-6deg) → normal | 0.8s | power2.out |
| `.scale-animate` | scale(0.97) → scale(1) | 0.6s | power2.out |
| `.fade-animate` | opacity 0, translateY(20px) → visible | 0.6s | power2.out |
| `.image-reveal` | overlay width 100% → 0% | 0.8s | power2.inOut |
| `[data-stagger]` | child elements staggered 0.1s | 0.5s | power2.out |

### Animations to Verify

- [ ] **Scroll triggers**: Motion library with `-15% 0px` margin
- [ ] **View Transitions**: Astro native page transitions
- [ ] **Hover states**:
  - [ ] Navigation underlines (0.35s ease)
  - [ ] Project card image scale(1.02)
  - [ ] Arrow links translate(2px, -2px)
  - [ ] Circle CTA button background fill
- [ ] **Mobile hamburger menu**: slide animation

### Comparison Process

1. Record videos of both sites scrolling through each page
2. Compare animation entry points (when they trigger)
3. Compare easing curves (visually)
4. Verify `prefers-reduced-motion` behavior

---

## Part 3: User Action Completeness Audit

### Forms

| Form | Location | Current Handler | Status |
|------|----------|-----------------|--------|
| Contact form | `/contact` | Netlify Forms | **Needs testing** |

**Fields to verify:**
- [ ] Name (text, required)
- [ ] Email (email, required)
- [ ] Message (textarea, optional, max 5000)
- [ ] Honeypot spam protection
- [ ] Success/error message display
- [ ] Form submission to Netlify endpoint

### Links Requiring Updates

| Link Type | Current Target | Action Needed |
|-----------|----------------|---------------|
| Email | `mailto:contact@tomdimino.com` | Verify still correct |
| Calendly | `https://calendly.com/tomdimino/` | Verify active |
| LinkedIn | `linkedin.com/in/tomdimino` | Verify |
| Twitter/X | `@DaktylIdaean` | Verify handle |
| GitHub | `github.com/tdimino` | Verify |
| Instagram | `instagram.com/tamademino` | Verify |
| Personal Site | `tomdimino.com` | Verify redirects |
| Resume PDF | `tomdimino.com/Resume-of-Tom-di-Mino.pdf` | Verify accessible |
| AI/LLMs PDF | `tomdimino.com/Cognitive-Designing-AI-LLMs.pdf` | Verify accessible |
| External: facs.org | Portfolio CTA | Verify |
| External: dolby.com | Portfolio CTA | Verify |

### Navigation Completeness

- [ ] Header nav: Home, Portfolio dropdown (3 items), A.I./LLMs, About, Contact, Blog
- [ ] Footer nav: All main links + portfolio links + social icons
- [ ] Portfolio dropdown expands/collapses correctly
- [ ] Mobile hamburger reveals full nav
- [ ] All internal links use correct routes

---

## Part 4: Modern UX Enhancement Opportunities

### Framer Motion Integration

**Current:** Using `motion` library (from Framer team) for scroll animations

**Enhancement opportunities:**
- [ ] **AnimatePresence** for page transitions (complement View Transitions)
- [ ] **Layout animations** for smoother DOM changes
- [ ] **Gesture support** for drag interactions on portfolio cards
- [ ] **Spring physics** for more organic hover effects

```tsx
// Example: 3D card tilt on hover
<motion.div
  whileHover={{ rotateY: 5, rotateX: -5, scale: 1.02 }}
  style={{ transformPerspective: 1000 }}
/>
```

### Phosphor Icons Integration

**Current:** Inline SVGs for social icons

**Enhancement opportunities:**
- [ ] Replace inline SVGs with Phosphor icon library
- [ ] Consistent icon weight throughout (thin, light, regular, bold, fill, duotone)
- [ ] Animated icon transitions on hover
- [ ] Icon-based navigation indicators

```bash
npm install @phosphor-icons/react
```

### Three.js / WebGL Hero Effects

**Enhancement opportunities:**
- [ ] **Particle system hero** with mythological Minoan theme
- [ ] **Labyrinth visualization** as interactive background
- [ ] **Depth-of-field scroll effects** on portfolio images
- [ ] **WebGL shader backgrounds** (gradients, noise, distortion)
- [ ] **3D model showcase** for AI/LLM concept visualization

```tsx
// Example: R3F scroll rig for parallax
import { GlobalCanvas, SmoothScrollbar } from '@14islands/r3f-scroll-rig'
```

### Gradient Blob Animation Spec (Selected)

```tsx
// Hero gradient blob (Linear/Vercel style)
<motion.div
  className="absolute w-[1000px] h-[1000px] rounded-full
             bg-gradient-to-r from-violet-500/30 to-fuchsia-500/30 blur-3xl"
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
```

**Color palette options for Minoan theme:**
- **Tyrian purple gradient**: `from-[#966a85]/30 to-[#5c1a5c]/30`
- **Labyrinth gold**: `from-[#d4af37]/20 to-[#966a85]/30`
- **Mediterranean blue**: `from-[#1e3a5f]/30 to-[#966a85]/30`

### 2025/2026 Portfolio UX Patterns

Based on current trends:
- [ ] **Bento grid layouts** for skills/experience
- [ ] **Marquee text** for scrolling testimonials/clients
- [ ] **Magnetic cursor effects** on CTAs
- [ ] **Text scramble/decrypt** animations on headings
- [ ] **Gradient text** with animated color shifts
- [ ] **Micro-interactions** on every clickable element
- [ ] **Dark mode toggle** with smooth transition
- [ ] **Command palette** (Cmd+K) for navigation

---

## Part 5: Open Souls Integration Architecture

### Conceptual Framework

The website as a **sentient entity** that perceives, remembers, and reacts to user behavior.

### Soul Architecture

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
│  ├── Persistent memory (returning visitors)                 │
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

### Implementation Approach (Hybrid)

#### 1. Event Perception System

```typescript
// src/lib/soul/perception.ts
interface PerceptionEvent {
  type: 'click' | 'scroll' | 'hover' | 'focus' | 'navigation';
  target: string;        // element identifier
  timestamp: number;
  metadata: Record<string, any>;
}

class SoulPerception {
  private events: PerceptionEvent[] = [];

  perceive(event: PerceptionEvent) {
    this.events.push(event);
    this.updateUserModel(event);
    this.checkTriggers(event);
  }
}
```

#### 2. UserModel Memory

```typescript
// src/lib/soul/memory.ts
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

#### 3. Rule-Based Dispatch Actions

| Trigger | Soul Reaction |
|---------|---------------|
| User lingers on portfolio image | Subtle glow animation, tooltip with more context |
| User scrolls past 50% of page | Background gradient subtly shifts |
| User visits 3+ pages | "You seem curious about my work" toast |
| User hovers contact link | CTA text personalizes based on viewed content |
| Returning visitor detected | "Welcome back" greeting, remember last viewed project |
| User rapid-scrolling | Soul "notices" and reduces animation intensity |
| User idle for 30s+ | Ambient particle animation intensifies |

#### 4. LLM Fallback for Novel Situations

When rule-based triggers don't match, escalate to LLM for:
- Unusual navigation patterns
- Edge-case behaviors
- Personalized dialogue generation
- Dynamic content suggestions

#### 5. Conversational Integration Points

- **Floating dialogue bubble** (bottom-right, dismissible)
- **Contextual prompts** embedded in page sections
- **Command palette integration** (Cmd+K opens soul chat)
- **Form pre-fill suggestions** based on inferred needs

### Technical Stack for Soul

```
Open Souls Soul Engine (TypeScript/Bun)
├── WebSocket connection from frontend
├── CognitiveSteps for perception processing
├── MentalProcesses for state management
└── Hooks for dispatch actions
```

---

## Part 6: Aldea Portfolio Template

### Template Requirements

1. **Standalone landing page** for Aldea work
2. **Multiple case study support** (expandable)
3. **Blog post integration** (linkable from Twitter/LinkedIn)
4. **Consistent with minoanmystery.org aesthetic** but distinct Aldea branding

### Proposed Structure

```
/aldea/                    # Aldea landing page
/aldea/case-studies/       # Case study index
/aldea/case-studies/[slug] # Individual case studies
/aldea/blog/               # Blog index
/aldea/blog/[slug]         # Individual blog posts
```

### Landing Page Sections

1. **Hero**: Aldea role + AI Content Engineer positioning
2. **What I Do**: AI training, evaluation, full-stack apps
3. **Case Studies Preview**: Featured Aldea projects (cards)
4. **Blog Preview**: Latest posts (linkable for social sharing)
5. **CTA**: Contact/schedule call specific to Aldea inquiries

### Content Collection Schema

```typescript
// src/content/config.ts additions
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
    socialImage: z.string().optional(), // For Twitter/LinkedIn cards
  }),
});
```

### Aldea Case Study Drafts (To Generate)

Based on Tom's role as Principal AI Content Engineer at Aldea:

**Draft Topics:**
1. **LLM Training on Expert Corpora** - Training AI on world-renowned expert knowledge
2. **Safety & Ethical Evaluation** - Red-teaming and alignment evaluation work
3. **Full-Stack AI App Development** - Building production AI applications
4. **Daimonic Souls Engine** - Open Souls-inspired soul implementations (if public)

**Blog Post Ideas (Linkable from Social):**
1. "What It's Like Training LLMs on Expert Knowledge"
2. "The Art of AI Evaluation: Beyond Benchmarks"
3. "Building AI Apps That Feel Alive"
4. "From Poet to AI Engineer: A Cross-Functional Journey"

### Social Sharing Optimization

- [ ] Open Graph images auto-generated per post
- [ ] Twitter Card meta tags
- [ ] LinkedIn preview optimization
- [ ] Short URL support for tracking

---

## Part 7: Audit Execution Workflow

### Phase 1: Visual Baseline (Browser Comparison)
1. Launch Chrome with extension connected
2. Capture screenshots of live site (all pages, all breakpoints)
3. Start Astro dev server (`npm run dev`)
4. Capture screenshots of migrated site
5. Create comparison document with findings

### Phase 2: Animation Recording
1. Record scroll-through videos of both sites
2. Note timing/trigger differences
3. Document any missing or different animations

### Phase 3: Interaction Testing
1. Test all forms (submission, validation, success states)
2. Test all links (internal navigation, external links)
3. Test mobile navigation (hamburger menu)
4. Test portfolio dropdown behavior

### Phase 4: Enhancement Planning
1. Prioritize Framer/Phosphor/three.js opportunities
2. Scope Open Souls MVP integration
3. Design Aldea template structure
4. Create implementation tickets

### Phase 5: Deliverables
1. **Fidelity Report**: Pixel differences documented
2. **Animation Report**: Timing/easing comparison
3. **Link Audit Spreadsheet**: All URLs verified
4. **Enhancement Roadmap**: Prioritized improvements
5. **Soul Architecture Doc**: Perception/dispatch spec
6. **Aldea Template Wireframes**: Landing page + case study layouts

---

## Critical Files for Modification

```
/Users/tomdimino/Desktop/minoanmystery-astro/
├── src/pages/index.astro          # Homepage
├── src/pages/about.astro          # About page
├── src/pages/contact.astro        # Contact form
├── src/pages/portfolio/[...slug].astro  # Portfolio template
├── src/components/Header.astro    # Navigation
├── src/components/Footer.astro    # Footer
├── src/layouts/BaseLayout.astro   # Meta tags, view transitions
├── src/styles/global.css          # CSS variables, typography
├── src/styles/animations.css      # Animation classes
├── src/content/portfolio/*.md     # Case study content
└── astro.config.mjs               # Site config
```

---

*Plan created: January 10, 2026*
*Target: Migration audit + Open Souls integration + Aldea template*
