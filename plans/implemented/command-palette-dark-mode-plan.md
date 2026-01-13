# Command Palette & Dark Mode: A Sentient Implementation

> **Status: COMPLETE** - All features implemented and working.

## The Vision: UI as Soul Expression

Instead of treating Command Palette and Dark Mode as static features, we design them as **sensory organs of the website's soul**—channels through which the site perceives user intent and expresses its personality.

> "The command palette becomes the soul's thought interface. Dark mode becomes the soul's adaptive awareness." — Open Souls Paradigm

---

## Design Philosophy

### Frontend Design Approach
**Aesthetic Direction:** Editorial Mysticism meets Modern Utility

| Element | Design Choice | Rationale |
|---------|---------------|-----------|
| **Typography** | Thicccboi (already in use) + monospace for shortcuts | Unified brand, technical precision for commands |
| **Color** | Tyrian purple (`#966a85`) as accent, gold (`#d4af37`) for highlights | Minoan brand alignment |
| **Animation** | Motion library - spring physics, staggered reveals | Already integrated, premium feel |
| **Dark Theme** | Near-black (`#0d0d0d`) with purple undertones | Mysterious, not generic |

### Open Souls Integration
The soul perceives user actions and responds with **intentional personality**:

```
USER ACTION          SOUL PERCEPTION         SOUL RESPONSE
─────────────────────────────────────────────────────────────
Opens palette   →   "User seeks guidance"  →   Contextual suggestions
Toggles dark    →   "User adapts space"    →   Ambient acknowledgment
Types search    →   "User explores"        →   Dynamic filtering + hints
Returns (dark)  →   "User prefers shadow"  →   Remember + apply silently
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MINOAN MYSTERY SOUL LAYER                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐   │
│   │  PERCEPTION     │    │  WORKING MEMORY │    │   DISPATCH   │   │
│   │  ─────────────  │    │  ─────────────  │    │  ──────────  │   │
│   │  • Cmd+K press  │───▶│  • Theme pref   │───▶│  • Theme CSS │   │
│   │  • Theme toggle │    │  • Recent cmds  │    │  • Toast msg │   │
│   │  • Search input │    │  • Visit count  │    │  • Highlight │   │
│   │  • Navigation   │    │  • Time of day  │    │  • Animation │   │
│   └─────────────────┘    └─────────────────┘    └──────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Dark Mode Implementation

### 1.1 CSS Variables (Light/Dark)

**File:** `src/styles/global.css`

Light theme variables are the default in `:root`. Dark theme overrides via `[data-theme="dark"]`:

- Background: `#0d0d0d` (near-black)
- Text: `#f5f5f5` (17.83:1 contrast ratio)
- Muted text: `#b8b8b8` (10.29:1 contrast ratio)
- Primary accent: `#c9a0b8` (8.52:1 contrast ratio)
- All colors exceed WCAG AA requirements

### 1.2 Time-Based Theme Defaults

**File:** `src/components/ThemeScript.astro`

- Light mode: 7 AM to 5 PM
- Dark mode: 5 PM to 7 AM
- Uses user's local timezone via `Intl.DateTimeFormat`
- Falls back to ET (America/New_York) if timezone detection fails
- Priority: stored preference > time-based > system preference

### 1.3 Theme Toggle Component

**File:** `src/components/ThemeToggle.astro`

- Sun/moon icons with smooth rotation transition
- Keyboard shortcut: `Cmd+Shift+D`
- Stores preference in localStorage
- Works with Astro View Transitions

---

## Part 2: Command Palette Implementation

### 2.1 Design Specifications

**Visual Language:**
- **Backdrop:** Blurred overlay with purple tint in dark mode
- **Container:** Rounded corners, subtle border, centered modal
- **Input:** Large, prominent search field
- **Results:** Grouped by category, keyboard-navigable
- **Shortcuts:** Monospace badges aligned right

**Animation Choreography:**
```
OPEN SEQUENCE (250ms total)
├── 0ms:   Overlay fades in
├── 50ms:  Container scales from 0.95 → 1.0
├── 100ms: Input focuses automatically
└── 150ms: Results stagger in

CLOSE SEQUENCE (200ms total)
├── 0ms:   Results fade out
├── 100ms: Container scales down
└── 150ms: Overlay fades out
```

### 2.2 Command Palette Component

**File:** `src/components/CommandPalette.astro`

Features:
- Cmd+K / Ctrl+K to open
- ESC to close
- Click overlay to close
- Fuzzy search filtering
- Keyboard navigation (arrow keys + enter)
- Soul memory: prioritizes recent commands

### 2.3 Available Commands

**Navigation:**
- Go to Home (G H)
- Go to About (G A)
- Go to Contact (G C)
- Go to A.I./LLMs (G I) - opens PDF in new tab

**Portfolio:**
- View Dolby Case Study
- View ACS Case Study
- View CZI Case Study

**Preferences:**
- Toggle Dark Mode (⌘⇧D)
- Use System Theme

**External:**
- Open LinkedIn
- Open GitHub
- Schedule a Call
- Read Blog (Substack)

---

## Part 3: Files Created/Modified

### New Files
```
src/components/ThemeScript.astro     # FOUC prevention (inline script)
src/components/ThemeToggle.astro     # Toggle button with icons
src/components/CommandPalette.astro  # Palette HTML/CSS/JS structure
```

### Modified Files
```
src/layouts/BaseLayout.astro         # Import ThemeScript, CommandPalette
src/components/Header.astro          # Add ThemeToggle to nav
src/components/Footer.astro          # Dark mode logo filter
src/pages/index.astro                # Dark mode card backgrounds
src/styles/global.css                # Dark mode CSS variables
```

---

## Part 4: Verification Checklist

### Dark Mode ✓
- [x] No FOUC on initial load
- [x] Toggle button switches theme immediately
- [x] Preference persists across page navigation (View Transitions)
- [x] Preference persists across browser sessions (localStorage)
- [x] Time-based defaults (7 AM-5 PM light, 5 PM-7 AM dark)
- [x] System preference detection when no manual choice
- [x] Keyboard shortcut (⌘⇧D) works
- [x] All components use CSS variables

### Command Palette ✓
- [x] ⌘K / Ctrl+K opens palette
- [x] ESC closes palette
- [x] Click overlay closes palette
- [x] Typing filters commands (fuzzy)
- [x] Arrow keys navigate results
- [x] Enter executes selected command
- [x] Recent commands appear first (soul memory)
- [x] All navigation commands work
- [x] Theme toggle command works
- [x] External links open in new tab
- [x] Animations are smooth (open/close)
- [x] Works after View Transitions navigation

### Accessibility ✓
- [x] ARIA labels present
- [x] Keyboard fully navigable
- [x] High contrast in both themes
- [x] Focus management in palette

---

## Summary

This implementation transforms standard UI features into expressions of the website's personality:

| Feature | Static Implementation | Soul Implementation |
|---------|----------------------|---------------------|
| **Dark Mode** | Click toggle → CSS change | Perceive preference → Remember in soul memory → Dispatch theme |
| **Command Palette** | Show all commands | Perceive search intent → Prioritize by user patterns → Guide with soul memory |
| **Returning Visitors** | Ignore | Recognize from memory → Apply preferences silently → Feel personalized |

The result: A website that feels intentional, alive, and genuinely helpful.
