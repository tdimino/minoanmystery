# Command Palette Soul Enhancement Specification

Transform the Command Palette into a soul-aware launcher with conversational AI capabilities.

---

## Overview

The Command Palette (`Cmd+K`) evolves from a navigation tool into the primary interface for interacting with the Minoan Soul. It remains a lightweight launcher—all extended responses route to the FloatingDialogue and /labyrinth page.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     COMMAND PALETTE SOUL FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   User Input (Cmd+K)                                                        │
│        │                                                                    │
│        ▼                                                                    │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │  INTENT DETECTION                                                    │  │
│   │  ├── Match against commands? → Show command results                  │  │
│   │  ├── Match against pages? → Show page results                        │  │
│   │  └── No match? → Default to LLM message                              │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│        │                                                                    │
│        ▼                                                                    │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │  SUGGESTION ENGINE (1-2s debounce)                                   │  │
│   │  ├── Context-aware from current page                                 │  │
│   │  ├── Based on user's partial input                                   │  │
│   │  └── Pre-computed/cached when possible                               │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│        │                                                                    │
│        ▼                                                                    │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │  RESPONSE FLOW (for LLM messages)                                    │  │
│   │  1. Close palette immediately                                        │  │
│   │  2. Show loading state in FloatingDialogue                           │  │
│   │  3. Display truncated response (~100 chars)                          │  │
│   │  4. "Read more" → Navigate to /labyrinth                             │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## UX Decisions

### Chat Mode Behavior
- **Pattern**: Launcher + external response
- **Flow**: Palette closes immediately on submit → Loading toast in FloatingDialogue → Response appears in tablet-styled dialogue

### Intent Detection
- If input doesn't match any command or page, it defaults as a message to the LLM
- No explicit "chat mode" toggle needed—natural fallback

### Visual Hierarchy
- **FloatingDialogue**: Restyle to match Oracle's Ear tablet aesthetic (gold border, Minoan visual elements)
- **Mode Indicator**: Oracle icon appears in palette + placeholder text changes when in "chat mode"

### Results Area (No Matches)
- When no commands match, show suggested questions
- Suggestions are context-aware from:
  1. Current page content
  2. User's partial input
  3. Pre-computed page-based suggestions (cached)

### Suggestion Timing
- Debounced: 1-2 second pause before fetching suggestions
- Use local/cached suggestions when possible to minimize latency

---

## Loading States

### In Palette
- None—palette closes immediately on LLM submit

### In FloatingDialogue
- Message: "Consulting the depths..."
- Style: Oracle tablet with pulsing animation

---

## Response Handling

### Truncation
- Show first ~100 characters in FloatingDialogue
- Include "Read more" link for longer responses

### Expand Action
- Navigate to `/labyrinth` page
- Pass conversation context via URL params or localStorage

### Error Handling
- Show error toast in FloatingDialogue
- Include retry option
- Message: "The oracle is silent... Try again?"

---

## Message Formatting

### Supported Formats
- Full markdown rendering
- Headings, lists, code blocks, links, emphasis
- Code syntax highlighting for technical responses

---

## Persistence

### Storage
- localStorage for conversation history
- Key: `minoan-soul-conversation`

### Data Structure
```typescript
interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  page?: string; // Page where message was sent
}

interface ConversationState {
  messages: ConversationMessage[];
  lastUpdated: number;
}
```

---

## /labyrinth Page

### Purpose
- Dedicated conversation page for extended Soul interactions
- Full chat interface with history

### URL
- Path: `/labyrinth`
- Thematic choice over /soul or /oracle

### Design
- **Themed but restrained**: Minoan visual elements, straightforward layout
- **Components**:
  - Conversation history display (scrollable)
  - Input field for continued chat
  - Oracle's Ear voice button integrated
  - Clear conversation option

### Voice Integration
- Oracle's Ear available for voice input
- Same functionality as floating button

---

## Pre-defined Commands

### Behavior
- Keep as quick actions with cached responses
- Execute immediately without LLM call when possible

### Examples
```
/theme dark    → Toggle dark mode (cached)
/home          → Navigate home (cached)
/contact       → Navigate to contact (cached)
/about         → Navigate to about (cached)
```

---

## Accessibility Requirements

### Keyboard Navigation
- Full keyboard support (Tab, Enter, Escape, Arrow keys)
- Focus trap within palette when open
- Clear focus indicators

### ARIA Labels
- `role="dialog"` on palette container
- `aria-label` on input
- `aria-live="polite"` for results region

### Screen Reader Support
- Announce results count
- Announce selected item
- Announce mode changes

---

## Performance Targets

### Response Times
- Palette open: <50ms
- Search/filter: <100ms
- Suggestion fetch: <500ms (cached preferred)

### Bundle Size
- Minimal JS additions
- Lazy load /labyrinth page
- Pre-compute suggestions at build time when possible

---

## Mobile Considerations

### Touch Support
- Large tap targets (44x44px minimum)
- Swipe to dismiss palette
- Touch-friendly scrolling in results

### Responsive Layout
- Full-width palette on mobile
- Adjusted padding and margins
- Keyboard-aware positioning (avoid input overlap)

---

## Implementation Phases

### Phase 1: Intent Detection & Suggestions
- [ ] Add LLM fallback detection
- [ ] Implement debounced suggestion fetching
- [ ] Create suggestion display in results area

### Phase 2: FloatingDialogue Restyle
- [ ] Update to Oracle tablet aesthetic
- [ ] Add loading state animation
- [ ] Implement truncation with "Read more"

### Phase 3: /labyrinth Page
- [ ] Create page with conversation display
- [ ] Implement chat input interface
- [ ] Add Oracle's Ear voice integration
- [ ] Wire up localStorage persistence

### Phase 4: Polish & Accessibility
- [ ] Full ARIA implementation
- [ ] Keyboard navigation audit
- [ ] Mobile testing and fixes
- [ ] Performance optimization

---

## Technical Notes

### API Endpoint
- Use existing `/api/soul/chat` endpoint
- Add streaming support for real-time response display

### localStorage Schema Version
- Include schema version for future migrations
- Handle graceful degradation if localStorage unavailable

### View Transitions
- Ensure palette → /labyrinth transition is smooth
- Preserve conversation context across navigation

---

## Visual Reference

### Command Palette States

```
┌─────────────────────────────────────────┐
│ 🔍 Search commands or ask the oracle... │  ← Default placeholder
├─────────────────────────────────────────┤
│ 📍 Home                                 │
│ 📍 About                                │
│ 📍 Contact                              │
│ 📍 Portfolio                            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🏛️ Ask me about Tom's work...           │  ← Chat mode placeholder
├─────────────────────────────────────────┤
│ 💭 What projects has Tom worked on?     │  ← Suggested questions
│ 💭 Tell me about the ACS case study     │
│ 💭 What's Tom's design philosophy?      │
└─────────────────────────────────────────┘
```

### FloatingDialogue (Oracle Tablet)

```
╔════════════════════════════════════════╗
║  🏛️ The Oracle Speaks                  ║  ← Gold border, Minoan style
╠════════════════════════════════════════╣
║                                        ║
║  Tom's work spans content strategy,    ║
║  AI systems, and user experience...    ║
║                                        ║
║  [Read more →]                         ║
║                                        ║
╚════════════════════════════════════════╝
```

---

## Open Questions (Resolved)

| Question | Decision |
|----------|----------|
| Chat mode UX | Launcher + external response |
| Intent detection | Non-command defaults to LLM |
| Visual style | Unify to Oracle tablet |
| Loading | Close immediately + toast |
| Long responses | Truncate + Read more |
| Expand target | /labyrinth page |
| Persistence | localStorage |
| Voice on /labyrinth | Yes, integrate |
| Error handling | Toast notification |
| Message format | Full markdown |
| Constraints | Accessibility, Mobile, Performance |

---

*Specification created: 2026-01-13*
*Based on interview with Tom di Mino*
