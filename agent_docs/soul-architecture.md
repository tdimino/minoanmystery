# Soul Architecture - Open Souls Integration

Transform minoanmystery.org into a sentient digital presence using the Open Souls paradigm.

## Conceptual Framework

The website as a **soul** that perceives, remembers, and reacts to user behavior.

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
│  ├── Behavioral fingerprint (scanner vs reader)             │
│  └── Emotional state inference (curious, rushed, exploring) │
├─────────────────────────────────────────────────────────────┤
│  MENTAL PROCESSES (Soul States)                             │
│  ├── "Greeting" - first visit, welcoming                    │
│  ├── "Curious" - exploring multiple pages                   │
│  ├── "Engaged" - spending time on case studies              │
│  ├── "Ready" - heading toward contact                       │
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

## Implementation Approach: Hybrid

**Rule-based triggers** for common events, **LLM fallback** for novel situations.

### Rule-Based Triggers

| Trigger | Soul Reaction |
|---------|---------------|
| User lingers on portfolio image | Subtle glow animation, tooltip |
| User scrolls past 50% | Background gradient shifts |
| User visits 3+ pages | "You seem curious" toast |
| User hovers contact link | Personalized CTA text |
| Returning visitor | "Welcome back" + remember last project |
| User rapid-scrolling | Reduce animation intensity |
| User idle 30s+ | Ambient animation intensifies |

### File Structure

```
src/lib/soul/
├── perception.ts     # Event capture and normalization
├── memory.ts         # UserModel management (localStorage + session)
├── processes.ts      # Mental process state machine
├── dispatch.ts       # Action execution (DOM updates, toasts)
└── triggers.ts       # Rule-based trigger definitions
```

## Core Types

```typescript
// perception.ts
interface PerceptionEvent {
  type: 'click' | 'scroll' | 'hover' | 'focus' | 'navigation';
  target: string;
  timestamp: number;
  metadata: Record<string, unknown>;
}

// memory.ts
interface UserModel {
  sessionId: string;
  visitCount: number;
  pagesViewed: string[];
  timePerPage: Record<string, number>;
  scrollDepths: Record<string, number>;
  clickedElements: string[];
  inferredInterests: string[];
  behavioralType: 'scanner' | 'reader' | 'explorer' | 'focused';
  currentState: SoulState;
}

type SoulState = 'greeting' | 'curious' | 'engaged' | 'ready' | 'returning';
```

## Integration Points

1. **Command Palette** - Soul chat mode via Cmd+K
2. **Floating Dialogue** - Bottom-right, dismissible prompts
3. **Contextual Hints** - Embedded in page sections
4. **Form Pre-fill** - Suggestions based on inferred needs

## MVP Scope

Phase 1: Perception + Basic Memory
- Track page views, scroll depth, time on page
- Persist in localStorage
- Recognize returning visitors

Phase 2: Rule-Based Dispatch
- 3-5 core triggers (returning visitor, deep reader, contact-bound)
- Toast notifications
- Subtle UI personalization

Phase 3: LLM Enhancement
- Novel situation handling
- Dynamic content generation
- Conversational interface
