# Mobile UX Fixes: Touch Targets & Thumb-Friendly Navigation

Fix mobile touch target issues preventing thumb clicks, plus comprehensive mobile UX improvements.

---

## Root Cause Analysis

**Why links can't be clicked with thumb (except hamburger):**

The mobile menu overlay (`.mobile-menu-overlay`) uses `display: none` which can still participate in z-index stacking context in some browsers, creating invisible click-blocking layers.

**Z-index hierarchy on mobile:**
```
9999  → CommandPalette (display: none - blocks clicks)
1001  → Hamburger button ✓ WORKS (above overlay)
1000  → VoiceButton + FloatingDialogue
998   → Mobile overlay (display: none - z-index pollution)
500   → Header
```

The hamburger works because its z-index (1001) is above the overlay (998).

---

## Critical Fixes

### 1. Fix Pointer Events Blocking (Priority 1)

**File:** `src/components/Header.astro`

**Problem:** Lines 344-362 - Mobile overlay uses `display: none` which can still block events.

**Fix:** Replace `display: none` with `visibility: hidden; pointer-events: none;`

```css
/* Before */
.mobile-menu-overlay {
  display: none;
}

/* After */
.mobile-menu-overlay {
  visibility: hidden;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s, visibility 0.3s;
}

.mobile-menu-overlay.is-open {
  visibility: visible;
  pointer-events: auto;
  opacity: 1;
}
```

**File:** `src/components/CommandPalette.astro`

**Problem:** Lines 54-64 - Same issue with z-index 9999 when closed.

**Fix:** Add `pointer-events: none;` when not open.

```css
.command-palette {
  pointer-events: none;
}

.command-palette.is-open {
  pointer-events: auto;
}
```

---

### 2. Touch Target Size Fixes (Priority 1)

Minimum: **44×44px** per WCAG 2.2 / Apple HIG

| Component | Current | Required | File:Line |
|-----------|---------|----------|-----------|
| Nav links | 38px | 44px | Header.astro:185 |
| Dropdown links | 32px | 44px | Header.astro:252 |
| Theme toggle (mobile) | 40×40px | 44×44px | ThemeToggle.astro:101 |
| Social links | 32×32px | 44×44px | Footer.astro:244 |
| FloatingDialogue dismiss | ~20px | 44px | FloatingDialogue.astro:68 |

**CSS Fixes:**

```css
/* Header.astro - Nav links */
.nav-link {
  padding: 14px 20px; /* Was 10px 20px - now 44px height */
  min-height: 44px;
}

/* Header.astro - Dropdown links */
.dropdown-link {
  padding: 12px 16px; /* Was 8px 16px - now 44px height */
  min-height: 44px;
}

/* ThemeToggle.astro - Mobile breakpoint */
@media (max-width: 768px) {
  .theme-toggle {
    width: 44px;  /* Was 40px */
    height: 44px; /* Was 40px */
  }
}

/* Footer.astro - Social links */
.social-link {
  width: 44px;  /* Was 32px */
  height: 44px; /* Was 32px */
  padding: 10px; /* Icon stays 24px, touch target is 44px */
}

/* FloatingDialogue.astro - Dismiss button */
.soul-dialogue-dismiss {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0; /* Remove negative margins */
}
```

---

### 3. Safe Area Insets for Notched Devices (Priority 2)

**File:** `src/components/VoiceButton.astro`

**Problem:** Lines 94-102 - Fixed positioning without safe-area consideration.

```css
.oracle-ear-container {
  bottom: max(6rem, calc(1.5rem + env(safe-area-inset-bottom)));
  right: max(1.5rem, env(safe-area-inset-right));
}
```

**File:** `src/styles/global.css`

Add at root level:
```css
/* Safe area support for notched devices */
body {
  padding-bottom: env(safe-area-inset-bottom);
}
```

---

### 4. Focus Indicators (Priority 2)

**File:** `src/styles/global.css`

**Problem:** Line 406 - `outline: none` removes focus without replacement.

```css
/* Before */
input:focus, textarea:focus, select:focus {
  outline: none;
}

/* After */
input:focus-visible, textarea:focus-visible, select:focus-visible {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(150, 106, 133, 0.2);
}
```

---

### 5. Touch Feedback for Hover States (Priority 3)

**File:** `src/components/Header.astro`

Add `:active` states alongside `:hover`:

```css
.nav-link:hover,
.nav-link:active {
  color: var(--color-primary);
}

.nav-link::after {
  /* Underline animation */
}

.nav-link:hover::after,
.nav-link:focus-visible::after,
.nav-link:active::after {
  transform: scaleX(1);
}
```

**File:** `src/components/Footer.astro`

```css
.footer-link:hover,
.footer-link:active {
  color: var(--color-primary);
}

.social-link:hover,
.social-link:active {
  transform: translateY(-2px);
  color: var(--color-primary);
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/Header.astro` | Overlay pointer-events, nav link padding, dropdown padding, touch states |
| `src/components/CommandPalette.astro` | pointer-events when closed |
| `src/components/ThemeToggle.astro` | Mobile touch target size |
| `src/components/Footer.astro` | Social link sizes, touch states |
| `src/components/FloatingDialogue.astro` | Dismiss button size |
| `src/components/VoiceButton.astro` | Safe-area-inset |
| `src/styles/global.css` | Focus indicators, safe-area, touch-action |

---

## Global CSS Additions

Add to `src/styles/global.css`:

```css
/* Prevent 300ms tap delay on older browsers */
a, button, input, select, textarea, [role="button"] {
  touch-action: manipulation;
}

/* Minimum touch target enforcement */
@media (max-width: 768px) {
  a, button, [role="button"] {
    min-height: 44px;
    min-width: 44px;
  }
}

/* Safe area support */
:root {
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-top: env(safe-area-inset-top, 0px);
}
```

---

## Verification Plan

### Manual Testing
1. Open on iPhone Safari - test all navigation links with thumb
2. Test hamburger menu open/close
3. Test Command Palette (Cmd+K) - ensure backdrop doesn't block when closed
4. Test FloatingDialogue dismiss button
5. Test VoiceButton on notched device (iPhone X+)
6. Test social links in footer
7. Test theme toggle button

### Browser DevTools Testing
1. Chrome DevTools → Toggle device toolbar → iPhone 12 Pro
2. Verify no invisible overlays blocking clicks (Elements → check z-index)
3. Lighthouse → Accessibility audit → Check touch target warnings

### Accessibility Testing
1. Test keyboard navigation (Tab through all links)
2. Verify focus indicators are visible
3. Test with screen reader (VoiceOver on iOS)

---

## Summary

**Root cause:** `display: none` elements with high z-index creating invisible click blockers.

**Solution:** Use `visibility: hidden; pointer-events: none;` instead of `display: none` for overlays.

**Additional fixes:** Touch target sizes, safe-area-insets, focus indicators, touch feedback states.

---

## Visual Parity Audit: Mobile (375px)

Comparison of Astro vs Webflow (`https://minoan.webflow.io/`) at iPhone viewport (375×812).

### Portfolio: ACS

| Element | Webflow | Astro | Status |
|---------|---------|-------|--------|
| Header logo | MM stylized icon | "Minoan Mystery" text | ⚠️ Different |
| Hero section | Large dark hero area with scroll arrow | Content starts immediately | ⚠️ Different |
| Scroll indicator | Down arrow button present | Missing | ❌ Missing |
| Content sections | Challenge/Task/Results/Takeaways | Same structure | ✅ Match |
| Typography | Thicccboi font | Thicccboi font | ✅ Match |
| Footer | Seal logo, nav columns | Same structure | ✅ Match |

**Issues:**
1. Missing scroll-down arrow indicator in hero
2. Hero image/background differs (Webflow has dark overlay)
3. Header logo style differs

**Screenshots:**
- `plans/audit-screenshots/webflow-acs-mobile.png`
- `plans/audit-screenshots/astro-acs-mobile.png`

---

### Portfolio: CZI

| Element | Webflow | Astro | Status |
|---------|---------|-------|--------|
| Header | MM icon + hamburger | MM icon + hamburger | ✅ Match |
| Title | "Chan Zuckerberg Initiative" | Same | ✅ Match |
| Scroll arrow | Chevron in circle outline | Purple chevron, no circle | ⚠️ Style differs |
| Hero image | Compact microscopy UI (~400px) | Much taller image | ⚠️ Different crop |
| Page length | ~14,000px | ~16,300px | ⚠️ Astro 2k longer |
| Footer | Seal logo, nav columns | Same structure | ✅ Match |

**Issues:**
1. Scroll arrow missing circle outline border
2. Hero image sizing/cropping differs - Astro version much taller
3. Overall page ~2,300px longer on Astro

**Screenshots:**
- `plans/audit-screenshots/webflow-czi-mobile.png`
- `plans/audit-screenshots/astro-czi-mobile.png`

---

### Portfolio: Dolby

| Element | Webflow | Astro | Status |
|---------|---------|-------|--------|
| Header | MM icon + hamburger | MM icon + hamburger | ✅ Match |
| Title | "Dolby Laboratories" | Same | ✅ Match |
| Scroll arrow | Chevron in circle outline | Purple chevron, no circle | ⚠️ Style differs |
| Hero image | Dolby logo on dark bg | "Music just changed forever" | ❌ Different image |
| Page length | ~13,900px | ~16,800px | ⚠️ Astro 3k longer |
| Footer | Standard footer | Extra portfolio teaser | ⚠️ Extra content |

**Issues:**

1. Scroll arrow missing circle outline border (consistent across all portfolio pages)
2. Hero image is completely different - Webflow shows Dolby logo, Astro shows marketing image
3. Astro page ~3,000px longer with extra portfolio teaser section at bottom

**Screenshots:**
- `plans/audit-screenshots/webflow-dolby-mobile.png`
- `plans/audit-screenshots/astro-dolby-mobile.png`

---

## Summary of Visual Parity Issues

### Consistent Issues (All Portfolio Pages)

1. **Scroll Arrow Style**: All pages missing circle outline around chevron
2. **Page Length**: Astro pages consistently longer than Webflow equivalents

### Page-Specific Issues

| Page | Primary Issue |
|------|---------------|
| ACS | Hero section layout differs |
| CZI | Hero image sizing/cropping |
| Dolby | Completely different hero image |

### Recommended Fixes

1. Add circle outline to scroll-down arrow component
2. Review hero image sizing on portfolio pages
3. Verify Dolby hero image asset is correct
4. Check for extra content sections being added unintentionally
