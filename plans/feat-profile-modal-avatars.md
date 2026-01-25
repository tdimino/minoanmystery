# feat: Profile Modal for Kothar & User Avatars

Mobile-first profile modal that appears when tapping avatars in the Labyrinth chat.

---

## Overview

Add interactive profile modals to the Labyrinth chat interface:

1. **Kothar Profile** (all devices): High-res avatar, bio, modes (academic/poetic), abilities (vision/generation)
2. **User Profile** (mobile only): User's name, Kothar's model of them, "Clear All Data" action

---

## Design Direction

**Aesthetic**: Oracle tablet meets modern bottom sheet. Not generic SaaS—something that feels like touching a mystery.

- **Mobile**: Bottom sheet sliding up from below (Vaul-style)
- **Desktop**: Centered dialog with backdrop blur (CommandPalette pattern)
- **Typography**: Thicccboi for headings, body text inherits from site
- **Colors**: Use existing CSS variables (`--color-primary`, `--color-background`, etc.)
- **Animation**: Spring physics via Motion library (stiffness: 300, damping: 25)

---

## User Flows

### Flow 1: Kothar Profile
```
User taps Kothar avatar (message or empty state)
  → Modal slides up (mobile) / fades in (desktop)
  → Shows: avatar (96px), bio, modes list, abilities list
  → User taps backdrop / X / presses Escape
  → Modal closes, focus returns to avatar
```

### Flow 2: User Profile (Mobile Only)
```
User taps their own avatar in chat message
  → Modal slides up
  → Shows: name (or "Guest"), visitorModel, visitorWhispers
  → User taps "Clear All Data"
  → Confirmation dialog: "This cannot be undone. Type DELETE to confirm"
  → User types "DELETE" and confirms
  → localStorage cleared, page hard reloads
```

### Flow 3: Desktop User Avatar
```
User hovers their avatar on desktop
  → No action (user profile is mobile-only)
  → Consider: hide user avatars on desktop, or show tooltip
```

---

## Technical Approach

### Component Structure

```
src/components/
├── ProfileModal.astro          # Base modal wrapper (shared)
├── KotharProfile.astro         # Kothar-specific content
└── UserProfile.astro           # User-specific content + delete action
```

### Integration Points

| File | Changes |
|------|---------|
| `src/pages/labyrinth.astro` | Add click handlers to avatars, import ProfileModal |
| `src/lib/soul/memory.ts` | Add `clearAllData()` method |
| `src/styles/global.css` | Add `--color-destructive` variable |

### Data Sources

**Kothar Profile** (static):
```typescript
const KOTHAR_PROFILE = {
  name: "Kothar wa Khasis",
  avatar: "/images/avatars/minoan-avatar-large.webp", // 192px version
  bio: "Oracle of the Labyrinth. Bronze-clad artificer from the age before the flood. I speak from ash and pumice, remembering what mortals have forgotten.",
  modes: [
    { id: "academic", name: "Academic", icon: "GraduationCap", description: "Channel scholarly voices" },
    { id: "poetic", name: "Poetic", icon: "PenNib", description: "Compose verse as Tamarru" },
  ],
  abilities: [
    { id: "vision", name: "Image Recognition", icon: "Eye", description: "Analyze pasted images" },
    { id: "generation", name: "Vision Generation", icon: "Sparkle", description: "Manifest imagery" },
    { id: "tarot", name: "Tarot Divination", icon: "Cards", description: "Draw the Major Arcana" },
    { id: "rag", name: "Archive Search", icon: "Archive", description: "Consult ancient sources" },
  ],
};
```

**User Profile** (from SoulMemory):
```typescript
interface UserProfileData {
  name: string;           // SoulMemory.getUserName() || "Guest"
  visitorModel: string;   // SoulMemory.getVisitorModel() || null
  visitorWhispers: string; // SoulMemory.getVisitorWhispers() || null
  visitCount: number;
  pagesViewed: string[];
}
```

### Empty States

| Field | Empty Condition | Display |
|-------|-----------------|---------|
| `userName` | null/undefined | "Guest" |
| `visitorModel` | null/empty | Hide section, show "Kothar is still forming impressions..." |
| `visitorWhispers` | null/empty | Hide section entirely |

---

## UI Specifications

### Modal Dimensions

| Breakpoint | Width | Max Height | Style |
|------------|-------|------------|-------|
| Mobile (<768px) | 100% | 85vh | Bottom sheet, rounded top corners |
| Desktop (≥768px) | 420px | 80vh | Centered dialog, all corners rounded |

### Avatar Display

| Context | Size | Border |
|---------|------|--------|
| In chat message | 36×36px | None |
| In modal (Kothar) | 96×96px | 2px solid var(--color-primary-muted) |
| In modal (User) | 64×64px | None |

### Touch Targets

All interactive elements minimum 44×44px tap area.

### Animation Timings

| Animation | Duration | Easing |
|-----------|----------|--------|
| Backdrop fade | 200ms | ease |
| Sheet slide up | 300ms | spring(300, 25) |
| Dialog scale | 250ms | spring(300, 30) |
| Content stagger | 50ms per item | ease-out |

---

## Acceptance Criteria

### Functional

- [ ] Tapping Kothar avatar (in message OR empty state) opens Kothar profile modal
- [ ] Tapping user avatar (mobile only) opens user profile modal
- [ ] Modal closes via: backdrop click, X button, Escape key
- [ ] "Clear All Data" requires typing "DELETE" to confirm
- [ ] After clearing, localStorage is wiped and page reloads
- [ ] Focus returns to triggering avatar after close

### Visual

- [ ] Kothar modal shows: 96px avatar, bio text, modes with icons, abilities with icons
- [ ] User modal shows: name (or "Guest"), visitorModel section, whispers section
- [ ] Empty states handled gracefully (placeholder text or hidden sections)
- [ ] Dark mode fully supported via CSS variables
- [ ] Animations use Motion library with spring physics
- [ ] `prefers-reduced-motion: reduce` respected

### Accessibility

- [ ] `role="dialog"` and `aria-modal="true"` on modal
- [ ] `aria-labelledby` pointing to modal title
- [ ] Focus trapped within modal when open
- [ ] Close button has `aria-label="Close profile"`
- [ ] Destructive action styled distinctly (red/warning color)

### Responsive

- [ ] Bottom sheet style on mobile (<768px)
- [ ] Centered dialog on desktop (≥768px)
- [ ] User profile only accessible on mobile
- [ ] Safe area insets respected on mobile (notch, home indicator)

---

## File Changes

### New Files

```
src/components/ProfileModal.astro
├── Modal wrapper with backdrop, animation, accessibility
├── Responsive: sheet (mobile) vs dialog (desktop)
└── ~200 lines

src/components/profiles/KotharProfile.astro
├── Avatar, bio, modes list, abilities list
├── Static data, icon rendering
└── ~120 lines

src/components/profiles/UserProfile.astro
├── Name, visitorModel, whispers display
├── Clear data button + confirmation
└── ~150 lines

public/images/avatars/minoan-avatar-large.webp
└── 192×192px version of Kothar avatar
```

### Modified Files

```
src/pages/labyrinth.astro
├── Import ProfileModal component
├── Add click handlers to avatar elements
├── Add responsive check for user avatar clicks
└── ~+50 lines

src/lib/soul/memory.ts
├── Add clearAllData() method
└── ~+15 lines

src/styles/global.css
├── Add --color-destructive variable
├── Add --color-destructive-hover variable
└── ~+10 lines
```

---

## Edge Cases

| Case | Handling |
|------|----------|
| localStorage disabled | Catch error, show toast "Storage unavailable", hide user profile |
| visitorModel > 2000 chars | Scrollable content area with `max-height: 60vh` |
| User spam-clicks avatar | Debounce 300ms on click handler |
| Modal open during View Transition | Close modal in `astro:before-swap` event |
| Clear data fails | Show error toast, don't reload |
| No messages yet (empty chat) | Kothar avatar in empty state still tappable |

---

## Dependencies

- **Icons**: Phosphor icons (already in project via Iconify)
  - `GraduationCap`, `PenNib`, `Eye`, `Sparkle`, `Cards`, `Archive`, `User`, `Trash`
- **Animation**: Motion library (already installed)
- **Patterns**: CommandPalette.astro modal structure (reference implementation)

---

## Open Questions

1. **Swipe-to-dismiss?** Add swipe-down gesture on mobile sheet? (Recommend: yes, but can be post-MVP)
2. **Edit name?** Allow user to edit their name in profile? (Recommend: post-MVP enhancement)
3. **Desktop user profile?** Show reduced version on desktop, or strictly mobile-only? (Current: mobile-only)

---

## References

### Internal
- `src/components/CommandPalette.astro:17-106` — Modal structure pattern
- `src/lib/soul/memory.ts:309-344` — SoulMemory user data methods
- `src/lib/soul/types.ts:76-134` — UserModel interface
- `src/styles/global.css:96-132` — Overlay and palette CSS variables

### External
- [Vaul Drawer Library](https://vaul.emilkowal.ski/) — Bottom sheet inspiration
- [shadcn/ui Drawer](https://ui.shadcn.com/docs/components/drawer) — Responsive drawer/dialog pattern
- [Motion AnimatePresence](https://motion.dev/docs/react-animate-presence) — Entry/exit animations
- [WCAG Modal Accessibility](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) — A11y requirements
- [NN/g Bottom Sheets](https://www.nngroup.com/articles/bottom-sheet/) — UX best practices

---

## Mockup Sketches

### Kothar Profile (Mobile)
```
┌────────────────────────────────────┐
│ ════════════════════════════════   │ ← Grab handle
│                                    │
│         ┌──────────┐               │
│         │  Avatar  │               │
│         │   96px   │               │
│         └──────────┘               │
│                                    │
│      Kothar wa Khasis              │
│                                    │
│  Oracle of the Labyrinth...        │
│  (2-3 line bio)                    │
│                                    │
│  ─────────────────────────────     │
│                                    │
│  MODES                             │
│  ┌─────────────────────────────┐   │
│  │ 🎓 Academic                 │   │
│  │ Channel scholarly voices    │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ ✒️ Poetic                   │   │
│  │ Compose verse as Tamarru    │   │
│  └─────────────────────────────┘   │
│                                    │
│  ABILITIES                         │
│  ┌──────────┐ ┌──────────┐         │
│  │ 👁 Vision│ │ ✨ Gen   │         │
│  └──────────┘ └──────────┘         │
│  ┌──────────┐ ┌──────────┐         │
│  │ 🃏 Tarot │ │ 📚 RAG   │         │
│  └──────────┘ └──────────┘         │
│                                    │
└────────────────────────────────────┘
```

### User Profile (Mobile)
```
┌────────────────────────────────────┐
│ ════════════════════════════════   │ ← Grab handle
│                                    │
│    ┌────────┐                      │
│    │ Avatar │  Guest               │
│    │  64px  │  (or captured name)  │
│    └────────┘                      │
│                                    │
│  ─────────────────────────────     │
│                                    │
│  KOTHAR'S IMPRESSION               │
│  ┌─────────────────────────────┐   │
│  │ "A curious seeker drawn     │   │
│  │  to the ancient mysteries.  │   │
│  │  Shows genuine interest     │   │
│  │  in etymology and ritual."  │   │
│  └─────────────────────────────┘   │
│                                    │
│  (Whispers section if present)     │
│                                    │
│  ─────────────────────────────     │
│                                    │
│  ┌─────────────────────────────┐   │
│  │    🗑 Clear All Data        │   │ ← Destructive style
│  └─────────────────────────────┘   │
│                                    │
│  Clears conversation history       │
│  and profile. Cannot be undone.    │
│                                    │
└────────────────────────────────────┘
```

---

## Implementation Order

1. **Base modal component** — ProfileModal.astro with responsive sheet/dialog
2. **Kothar profile content** — Static data, avatar, modes, abilities
3. **Avatar click handlers** — Add to labyrinth.astro
4. **User profile content** — Read from SoulMemory, empty states
5. **Clear data flow** — Confirmation dialog, localStorage.clear(), reload
6. **Polish** — Animations, accessibility, reduced motion
7. **Large avatar asset** — Create/optimize 192px Kothar avatar

---

*Plan created: 2025-01-23*
