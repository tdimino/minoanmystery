# Services Section — Component Reference

Read when working on `/src/pages/services/` or `/src/components/interactive/`.

## Active Components (16)

### Heroes (one per service page)
| Component | Page | Description |
|-----------|------|-------------|
| `GeoCommand` | GEO/SEO | Readiness scorecard: 6 platform targets + 4 implementation pillars (llms.txt, JSON-LD, crawlers, robots.txt) |
| `ClockworkForge` | AI Automation | Animated pipeline: manual inputs → agent → automated outputs with SVG particles |
| `ClawdHero` | Mentoring | Claudicle mascot with pixel shimmer grid, SVG connection lines, mini terminal |
| `StackedCarousel` | Custom Apps | 3 browser windows (WWW, Dolby, ACS) in perspective cascade, 5s auto-cycle, dialog modal with 9 screenshots |

### Body Components (slotted into markdown via `<div id="...-slot">`)
| Component | Page | Slot ID |
|-----------|------|---------|
| `FracturedSearch` | GEO/SEO | `fractured-search-slot` |
| `BrowserShowcase` | GEO/SEO | `browser-showcase-slot` |
| `MissionTOC` | AI Automation | `mission-toc-slot` |
| `WorkflowTransmutation` | AI Automation | `workflow-transmute-slot` |
| `EvalTribunal` | AI Automation | `eval-tribunal-slot` |
| `EpochComparison` | Mentoring | `epoch-comparison-slot` |
| `ClaudicleArchitecture` | Mentoring | `claudicle-arch-slot` |
| `TechStackLayers` | Custom Apps | `tech-stack-slot` |
| `ProjectArchive` | Custom Apps | `project-archive-slot` |

### Non-Slotted (rendered after Content in template)
| Component | Page | Notes |
|-----------|------|-------|
| `LiveProofDashboard` | GEO/SEO | Dual-site ranking dashboard with clickable verify links |
| `TerminalDemo` | Mentoring | Typewriter CLI demo |

### Unused (kept for reference)
- `BlueprintForge` — System topology diagram, replaced by StackedCarousel as hero

## Slot Injection Pattern

1. Markdown contains `<div id="some-slot"></div>` placeholder
2. Template renders component inside `<div data-slot-source="some-slot">`
3. Client JS in `initServiceAnimations()` moves children from source → placeholder
4. Component appears inline within the markdown content flow

## GEO/SEO Files

| File | Purpose | Lines |
|------|---------|-------|
| `public/robots.txt` | 21 AI crawlers allowed, LLMs-Txt directives, sitemap | 46 |
| `public/llms.txt` | Kothar-voiced site index for AI engines | 60 |
| `public/llms-full.txt` | Extended deep index with full bio + services | 163 |
| `src/components/StructuredData.astro` | Reusable JSON-LD builder (Service, BreadcrumbList, ItemList) | 35 |
| `src/pages/api/soul/query.ts` | REST endpoint for programmatic Kothar access | ~80 |

## Service Content Files

All in `src/content/services/`:
- `geo-seo.md` (order: 1)
- `ai-automation.md` (order: 2)
- `claude-code-mentoring.md` (order: 3)
- `custom-applications.md` (order: 4)

Schema: `src/content/config.ts` — Zod validated frontmatter (title, tagline, summary, rate, features, ideal_for, cta_text, related_portfolio, icon, heroImage, order)
