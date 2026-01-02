# Original vs Astro Remake Parity Report

**Generated**: 2026-01-02
**Original**: https://www.minoanmystery.org
**Astro Copy**: http://localhost:4322

---

## Summary

| Section | Status | Issues |
|---------|--------|--------|
| Header | **NEEDS WORK** | Nav padding, link spacing, sticky behavior |
| Hero | **CLOSE** | Link colors differ, highlight styling |
| Project Cards | **NEEDS WORK** | Section padding, image sizes, transitions |
| Footer | **NEEDS WORK** | Logo size, missing copyright, social URLs |
| Animations | **MAJOR GAP** | Missing Webflow interactions entirely |

---

## 1. Header / Navigation

### Logo
| Property | Original | Astro | Status |
|----------|----------|-------|--------|
| Width | 158px | 60px | **MISMATCH** |
| Height | 158px | 36px | **MISMATCH** |

### Nav Container
| Property | Original | Astro | Status |
|----------|----------|-------|--------|
| Padding | `32px 0px` | `0px` | **MISMATCH** |
| Justify Content | `normal` | `space-between` | **MISMATCH** |

### Nav Links
| Property | Original | Astro | Status |
|----------|----------|-------|--------|
| Font Family | `Thicccboi, sans-serif` | `Thicccboi, sans-serif` | OK |
| Font Size | `18px` | `18px` | OK |
| Font Weight | `500` | `500` | OK |
| Color | `rgb(34, 34, 34)` | `rgb(13, 13, 13)` | **MINOR** |
| Padding | `10px 20px` | `0px` or `8px 16px` | **MISMATCH** |
| Transition | `color 0.35s` | `color 0.2s` | **MISMATCH** |

### Fixes Needed
```css
/* Astro nav needs: */
.header {
  padding: 32px 0;
}

.nav-link {
  padding: 10px 20px;
  color: rgb(34, 34, 34);
  transition: color 0.35s;
}
```

---

## 2. Hero Section

### H1 Heading
| Property | Original | Astro | Status |
|----------|----------|-------|--------|
| Font Size | `60px` | `60px` | OK |
| Font Family | `Thicccboi, sans-serif` | `Thicccboi, sans-serif` | OK |
| Font Weight | `500` | `500` | OK |
| Line Height | `70px` | `70px` | OK |
| Color | `rgb(13, 13, 13)` | `rgb(13, 13, 13)` | OK |
| Margin | `0px 0px 24px` | `0px 0px 24px` | OK |

### Italic Text (Content-Designer, Aldea AI)
| Property | Original | Astro | Status |
|----------|----------|-------|--------|
| Font Style | `italic` | `italic` | OK |
| Font Family | `Thicccboi, sans-serif` | `Thicccboi, sans-serif` | OK |

### Paragraph Links
| Property | Original | Astro | Status |
|----------|----------|-------|--------|
| Color | `rgb(13, 13, 13)` | `rgb(104, 104, 104)` | **MISMATCH** |
| Text Decoration | `underline` | `underline` | OK |

### "we should work together" Highlight
| Property | Original | Astro | Status |
|----------|----------|-------|--------|
| Element | `<strong class="highlight">` | `<a class="link-highlight">` | **MISMATCH** |
| Background Color | `rgb(255, 248, 201)` | `rgb(244, 224, 77)` | **MISMATCH** |
| Padding | `0px` | `2px 4px` | **MISMATCH** |

### Fixes Needed
```css
/* Astro paragraph links need: */
.hero p a {
  color: rgb(13, 13, 13);
}

/* Highlight needs: */
.link-highlight {
  background-color: rgb(255, 248, 201); /* pale yellow, not golden */
  padding: 0;
}
```

---

## 3. Project Cards Section

### Section Title "Past projects of interest"
| Property | Original | Astro | Status |
|----------|----------|-------|--------|
| Element | `<h2>` found | NOT FOUND | **MISSING** |
| Font Size | `48px` | N/A | **MISSING** |
| Text Align | `center` | N/A | **MISSING** |
| Margin | `0px 0px 16px` | N/A | **MISSING** |

### Section Container
| Property | Original | Astro | Status |
|----------|----------|-------|--------|
| Padding | `160px 0px` | `96px 0px` | **MISMATCH** |

### Project Card Layout
| Property | Original | Astro | Status |
|----------|----------|-------|--------|
| Display | `inline-block` | `grid` | Different approach |
| Gap | `normal` | `64px` | Different approach |
| Card Class | `card project-v1 w-inline-block` | `project-row` | Different approach |

### Project Images
| Property | Original | Astro | Status |
|----------|----------|-------|--------|
| Width | `636px` | `564px` | **MISMATCH** |
| Height | `292px` | `259px` | **MISMATCH** |

### Card Transitions
| Property | Original | Astro | Status |
|----------|----------|-------|--------|
| Links | `color 0.35s` | `background-color 0.2s` | **MISMATCH** |

### Fixes Needed
```css
/* Add section title */
.past-projects h2 {
  font-size: 48px;
  font-weight: 500;
  text-align: center;
  margin: 0 0 16px;
}

/* Section padding */
.section.past-projects {
  padding: 160px 0;
}

/* Image sizes */
.project-image img {
  width: 636px;
  height: 292px;
  object-fit: cover;
}
```

---

## 4. Footer

### Footer Logo (Seal of Minos)
| Property | Original | Astro | Status |
|----------|----------|-------|--------|
| Width | `158px` | `348px` | **MISMATCH** |
| Height | `158px` | `100px` | **MISMATCH** |

### Footer Container
| Property | Original | Astro | Status |
|----------|----------|-------|--------|
| Background | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | OK |
| Padding | `100px 0px 32px` | `100px 0px 32px` | OK |
| Color | `rgb(104, 104, 104)` | `rgb(104, 104, 104)` | OK |

### Column Headings
| Property | Original | Astro | Status |
|----------|----------|-------|--------|
| "Main" | NOT visible | Present | Check original |
| "Case studies" | NOT visible | Present | Check original |

### Copyright
| Property | Original | Astro | Status |
|----------|----------|-------|--------|
| Text | Not found | `Copyright © Al-Tamarru 2026` | Verify original |

### Social Links
| Platform | Original URL | Astro URL | Status |
|----------|--------------|-----------|--------|
| Twitter | `@DaktylIdaean` | `@tomdimino` | **MISMATCH** |
| LinkedIn | `/tomdimino/` | `/tomdimino` | OK (trailing slash) |
| GitHub | `tdimino?` | `tomdimino` | **MISMATCH** |
| Instagram | `tamademino` | `tomdimino` | **MISMATCH** |
| tomdimino.com | Present | Missing | **MISSING** |

### Fixes Needed
```css
/* Footer logo */
.footer-logo {
  width: 158px;
  height: 158px;
}
```

```html
<!-- Fix social URLs -->
<a href="https://twitter.com/DaktylIdaean">Twitter</a>
<a href="https://github.com/tdimino">GitHub</a>
<a href="https://instagram.com/tamademino">Instagram</a>
<a href="https://www.tomdimino.com/">Personal Site</a> <!-- Add this -->
```

---

## 5. Animations & JavaScript

### Animation Systems
| Feature | Original | Astro | Status |
|---------|----------|-------|--------|
| Webflow Interactions | **14 elements** with `data-w-id` | 0 | **CRITICAL GAP** |
| GSAP | No | No | OK |
| AOS | No | No | OK |
| Intersection Observer targets | No | **8 elements** | Different approach |

### Webflow Interactions (Original)
The original site uses Webflow's proprietary interaction system with these animated elements:
1. `.header` - Header animations
2. `.skew-animation-0-4s` - Skew effect
3. `h2` - Section title animations
4. `.card.project-v1` - Card hover/reveal effects

### Astro Animation Classes
The Astro remake uses CSS classes instead:
- `.fade-animate` - Fade-in effects
- `.scale-animate` - Scale/zoom effects

### Missing Animations
1. **Skew animation** on hero text
2. **Card reveal animations** on scroll
3. **Header scroll behavior** animations
4. **Section title entrance** animations

### Fixes Needed
```javascript
// Implement scroll-triggered animations to match Webflow
// Use IntersectionObserver or GSAP ScrollTrigger

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate-in');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.scale-animate, .fade-animate').forEach(el => {
  observer.observe(el);
});
```

```css
/* Skew animation to match original */
.skew-animation-0-4s {
  animation: skew 0.4s ease-out;
}

@keyframes skew {
  from {
    transform: skewY(3deg);
    opacity: 0;
  }
  to {
    transform: skewY(0);
    opacity: 1;
  }
}
```

---

## Priority Fix List

### Critical (Breaks Visual Parity)
1. [ ] Add "Past projects of interest" section heading
2. [ ] Fix footer logo dimensions (158x158)
3. [ ] Implement Webflow-style scroll animations
4. [ ] Fix highlight background color (`rgb(255, 248, 201)`)

### High (Noticeable Differences)
5. [ ] Fix nav padding (`32px 0`)
6. [ ] Fix nav link padding (`10px 20px`)
7. [ ] Fix section padding (`160px 0`)
8. [ ] Fix project image sizes (636x292)
9. [ ] Fix paragraph link color (`rgb(13, 13, 13)`)

### Medium (Polish)
10. [ ] Fix transition durations (`0.35s` not `0.2s`)
11. [ ] Add missing social link (tomdimino.com)
12. [ ] Fix social URLs (DaktylIdaean, tdimino, tamademino)
13. [ ] Verify/add footer column headings

### Low (Minor)
14. [ ] Nav link color (`rgb(34, 34, 34)` vs `rgb(13, 13, 13)`)
15. [ ] Verify copyright text presence on original

---

## Screenshots Reference

Screenshots taken at 1440x900 viewport:
- Original homepage: Header, hero, project cards visible
- Astro homepage: Same sections for comparison
- Both footers captured via JavaScript scroll

---

## Next Steps

1. Address Critical fixes first
2. Re-test at multiple viewport sizes (mobile, tablet, desktop)
3. Record side-by-side video comparison after fixes
4. Test all page transitions and hover states
