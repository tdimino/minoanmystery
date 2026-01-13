# Pixel-Perfect Webflow to Astro Migration Plan

## Executive Summary

This plan outlines a systematic approach to achieve pixel-perfect parity between the original minoanmystery.org Webflow site and the new Astro implementation. Using dev-browser automation, AI-powered tools, and systematic page-by-page comparison.

---

## Part 1: AI Tools & GitHub Projects for Website Recreation

### Top AI Tools Discovered

| Tool | URL | Best For |
|------|-----|----------|
| **CopyAnyUI** | https://copyanyui.org | Pixel-perfect URL cloning |
| **CopyWeb** | https://copyweb.ai | Screenshot/URL to code with framework support |
| **ScreenCoder** | https://github.com/leigest519/ScreenCoder | Screenshot to HTML/CSS |
| **Screenshot to Code** | https://screenshottocode.com | GPT-4 Vision powered HTML generation |
| **DivMagic** | https://divmagic.com | Browser extension for element copying |
| **IMG2HTML** | https://www.img2html.com | Image/URL to responsive code |
| **UI2Code** | https://ui2code.ai | AI-powered screenshot conversion |

### Key GitHub Projects

| Project | URL | Description |
|---------|-----|-------------|
| **Reflow** | https://github.com/studiobloom/reflow | Export Webflow to static HTML, preserves structure/styling |
| **webflow-componentizer** | https://github.com/crcn/webflow-componentizer | Convert Webflow to React components |
| **webflow-to-netlify** | https://github.com/jankocian/webflow-to-netlify | Webflow to Netlify deployment |
| **Crawl4AI** | https://github.com/unclecode/crawl4ai | LLM-friendly web crawler/scraper |
| **Skyvern** | https://github.com/Skyvern-AI/skyvern | Browser automation with LLMs |

### Recommended Approach

Use **CopyAnyUI** or **CopyWeb** for stubborn elements where manual CSS matching is difficult. These tools can generate pixel-perfect code from a URL that can be compared against our implementation.

---

## Part 2: Page-by-Page Comparison Methodology

### Pages to Verify

1. **Homepage** (`/`) - Hero, project cards, CTA
2. **About** (`/about`) - Profile, skills, company logos
3. **Contact** (`/contact`) - Two-column layout, form
4. **Portfolio: ACS** (`/portfolio/acs`) - Hero, content, gallery
5. **Portfolio: CZI** (`/portfolio/czi`) - Hero, content, galleries
6. **Portfolio: Dolby** (`/portfolio/dolby`) - Hero, content, gallery
7. **Blog** (`/blog`) - If exists
8. **AI/LLMs** (`/ai-llms`) - If exists

### Comparison Script Template

```typescript
// dev-browser screenshot comparison workflow
import { connect, waitForPageLoad } from "@/client.js";

const client = await connect("http://localhost:9222");

// Capture original
const originalPage = await client.page("original");
await originalPage.goto("https://minoanmystery.org/[path]");
await waitForPageLoad(originalPage);
await new Promise(r => setTimeout(r, 3000)); // Wait for animations
await originalPage.screenshot({ path: "tmp/original-[page].png", fullPage: true });

// Capture Astro version
const astroPage = await client.page("astro");
await astroPage.goto("http://localhost:4321/[path]");
await waitForPageLoad(astroPage);
await new Promise(r => setTimeout(r, 3000));
await astroPage.screenshot({ path: "tmp/astro-[page].png", fullPage: true });

await client.disconnect();
```

---

## Part 3: Systematic Checklist per Page

### Global Elements (All Pages)

- [ ] **Header**
  - [ ] Logo matches (position, size, image)
  - [ ] Navigation items match (text, spacing, alignment)
  - [ ] Dropdown behavior matches
  - [ ] Active state styling matches
  - [ ] Hover animations match
  - [ ] Mobile hamburger menu works

- [ ] **Footer**
  - [ ] Logo matches
  - [ ] Column layout matches
  - [ ] Link styling matches
  - [ ] Social icons match (icons, spacing)
  - [ ] Copyright text matches

- [ ] **Typography**
  - [ ] Thicccboi font loads correctly
  - [ ] Font sizes match at all breakpoints
  - [ ] Line heights match
  - [ ] Letter spacing matches
  - [ ] Font weights match

- [ ] **Colors**
  - [ ] Primary Tyrian purple (#5c1a5c) matches
  - [ ] Text colors match
  - [ ] Background colors match
  - [ ] Border colors match

### Homepage Checklist

- [ ] Hero section padding matches
- [ ] Hero title typography matches (italics, bold, color)
- [ ] Paragraph spacing matches
- [ ] "skill-link" styling matches
- [ ] CTA styling matches (underline, emoji)
- [ ] Project cards:
  - [ ] Grid layout matches
  - [ ] Alternating layout works
  - [ ] Image sizes match
  - [ ] Title styling matches
  - [ ] Summary text styling matches
  - [ ] Hover effects match
  - [ ] Border styling matches

### About Page Checklist

- [ ] Profile photo placement matches
- [ ] Typography hierarchy matches
- [ ] Skill/italic styling matches
- [ ] Company logo section:
  - [ ] Grid layout matches
  - [ ] Logo sizes match
  - [ ] Spacing matches
- [ ] Content width matches

### Contact Page Checklist

- [ ] Two-column layout matches
- [ ] Left column:
  - [ ] Title styling matches
  - [ ] Paragraph styling matches
  - [ ] "inquire herein" link styling
  - [ ] Contact links (Email, Calendly, LinkedIn)
- [ ] Right column:
  - [ ] Form input styling (underline-only)
  - [ ] Placeholder text matches
  - [ ] Submit link styling
  - [ ] "Schedule a video call" button

### Portfolio Pages Checklist (ACS, CZI, Dolby)

- [ ] Hero image displays correctly
- [ ] Title styling matches
- [ ] Content layout matches
- [ ] Gallery grid layout matches
- [ ] Image hover effects match
- [ ] Role/date metadata styling matches

---

## Part 4: Execution Workflow

### Phase 1: Visual Baseline (Day 1)

1. Start dev-browser server:
   ```bash
   cd ~/.claude/plugins/cache/dev-browser-marketplace/dev-browser/*/skills/dev-browser && ./server.sh &
   ```

2. Start Astro dev server:
   ```bash
   cd /Users/tomdimino/Desktop/minoanmystery-astro && npm run dev
   ```

3. Capture baseline screenshots of all pages (original + Astro)

4. Create side-by-side comparison document

### Phase 2: Global Fixes (Day 1-2)

1. Fix any header/footer discrepancies first (affects all pages)
2. Verify typography is 100% correct
3. Verify color values match exactly
4. Check responsive breakpoints (768px, 1024px, 1440px)

### Phase 3: Page-by-Page Refinement (Day 2-3)

For each page:

1. Take fresh screenshots
2. Overlay comparison (use image diff tool if needed)
3. Identify specific discrepancies:
   - Spacing (padding/margin)
   - Font sizing
   - Colors
   - Alignment
   - Hover states
   - Animations
4. Make targeted CSS fixes
5. Re-screenshot and verify
6. Commit changes with descriptive message

### Phase 4: Animation Verification (Day 3)

1. Check GSAP scroll animations match
2. Verify timing/easing functions
3. Test on multiple browsers (Chrome, Firefox, Safari)

### Phase 5: Final QA (Day 4)

1. Full-page screenshot comparison
2. Responsive testing at all breakpoints
3. Cross-browser testing
4. Performance audit
5. Accessibility audit

---

## Part 5: Tools & Commands Reference

### Dev-Browser Commands

```bash
# Start server
cd ~/.claude/plugins/cache/dev-browser-marketplace/dev-browser/*/skills/dev-browser && ./server.sh &

# Take screenshot
cd skills/dev-browser && bun x tsx <<'EOF'
import { connect, waitForPageLoad } from "@/client.js";
const client = await connect("http://localhost:9222");
const page = await client.page("main");
await page.goto("URL");
await waitForPageLoad(page);
await new Promise(r => setTimeout(r, 3000));
await page.screenshot({ path: "tmp/screenshot.png", fullPage: true });
await client.disconnect();
EOF
```

### Firecrawl for Asset Extraction

```bash
# Scrape specific page
python3 ~/.claude/skills/Firecrawl/scripts/firecrawl_api.py scrape "https://minoanmystery.org" --formats markdown html

# Map entire site structure
python3 ~/.claude/skills/Firecrawl/scripts/firecrawl_api.py map "https://minoanmystery.org" -n 100
```

### Image Diff Tools

```bash
# Using ImageMagick for visual diff
compare original.png astro.png diff.png

# Highlight differences
compare -highlight-color red original.png astro.png diff.png
```

---

## Part 6: Known Issues & Fixes

### Current Status

| Element | Status | Notes |
|---------|--------|-------|
| Header logo | ✅ Fixed | Using TomDiMino_Tyrian.png |
| Footer logo | ✅ Fixed | Using Seal of Minos |
| Thicccboi font | ✅ Fixed | Loading from Webflow CDN |
| Homepage layout | ✅ Fixed | Staggered project cards |
| Contact form | ✅ Fixed | Two-column, underline inputs |
| Portfolio images | ✅ Fixed | Correct paths in /images/portfolio/ |
| About page photo | ⚠️ Verify | Check tyrian-profile.png displays |
| Animations | ⚠️ Verify | GSAP timing may need adjustment |
| Mobile nav | ⚠️ Verify | Hamburger menu functionality |

### Potential Remaining Issues

1. **Spacing precision** - May need pixel-level adjustments
2. **Animation timing** - GSAP easing may differ from Webflow's native
3. **Hover effects** - Need to verify all interactive states
4. **Portfolio galleries** - Need to verify grid layout matches
5. **Blog/AI-LLMs pages** - May not exist or need creation

---

## Part 7: Success Criteria

### Definition of "Pixel-Perfect"

- [ ] Screenshots at 1440px width are visually indistinguishable
- [ ] Screenshots at 768px width are visually indistinguishable
- [ ] All text renders identically (font, size, weight, color)
- [ ] All images are positioned identically
- [ ] All spacing (margins/padding) matches within 2px tolerance
- [ ] All colors match exactly (use color picker to verify hex values)
- [ ] All hover/interactive states match
- [ ] All animations have same timing and easing
- [ ] No broken images or 404s
- [ ] All links work correctly

### Verification Process

1. Visual overlay comparison (opacity toggle between screenshots)
2. Browser DevTools element inspection
3. Computed style comparison for key elements
4. Automated visual regression testing (optional)

---

## Appendix: Quick Reference

### Key File Paths

```
/Users/tomdimino/Desktop/minoanmystery-astro/
├── src/
│   ├── components/
│   │   ├── Header.astro
│   │   └── Footer.astro
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── about.astro
│   │   ├── contact.astro
│   │   └── portfolio/[...slug].astro
│   ├── content/
│   │   └── portfolio/
│   │       ├── acs.md
│   │       ├── czi.md
│   │       └── dolby.md
│   └── styles/
│       ├── global.css
│       └── animations.css
└── public/
    └── images/
        ├── header-logo.png
        ├── footer-logo.png
        ├── tyrian-profile.png
        ├── logos/
        └── portfolio/
```

### CSS Variables (global.css)

```css
--color-primary: #5c1a5c;
--color-primary-dark: #3d113d;
--color-primary-light: #7a2b7a;
--color-text: #1a1a1a;
--color-text-muted: #666666;
--color-background: #ffffff;
--color-background-alt: #f5f5f5;
--color-border: #e5e5e5;
--font-heading: 'Thicccboi', sans-serif;
--font-body: 'Thicccboi', sans-serif;
```

---

*Plan created: January 2, 2026*
*Target: 100% pixel-perfect parity with minoanmystery.org*
