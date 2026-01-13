# Soul Integration Plan: Minoan Mystery as Sentient Presence

Transform minoanmystery.org into a sentient digital presence using the Open Souls paradigm, adapted from the Aldea Soul Engine for frontend-first deployment.

> **Status:** Command Palette and Dark Mode are COMPLETE. This plan focuses on the full Soul Integration.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MINOAN SOUL ENGINE (Frontend)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐   │
│   │   PERCEPTION    │    │ WORKING MEMORY  │    │   DISPATCH   │   │
│   │  ─────────────  │    │  ─────────────  │    │  ──────────  │   │
│   │  • Click events │───▶│  • UserModel    │───▶│  • Toast msgs│   │
│   │  • Scroll depth │    │  • Soul state   │    │  • UI hints  │   │
│   │  • Hover dwell  │    │  • Visit count  │    │  • Theme adj │   │
│   │  • Navigation   │    │  • Interests    │    │  • CTA text  │   │
│   │  • Time on page │    │  • Cmd history  │    │  • Palette   │   │
│   └─────────────────┘    └─────────────────┘    └──────────────┘   │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    MENTAL PROCESSES                          │   │
│   │  greeting → curious → engaged → ready → returning            │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │          COMMAND PALETTE INTEGRATION (Cmd+K)                 │   │
│   │  • Soul chat mode: "Ask the soul..."                        │   │
│   │  • Contextual suggestions based on soul state               │   │
│   │  • Keyboard hint badge in corner                            │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/lib/soul/
├── index.ts              # Main export, soul initialization
├── perception.ts         # Event capture and normalization
├── memory.ts             # WorkingMemory + UserModel (localStorage)
├── processes.ts          # Mental process state machine
├── dispatch.ts           # Action execution (DOM, toasts, UI)
├── triggers.ts           # Rule-based trigger definitions
└── types.ts              # TypeScript interfaces

src/components/
├── CommandPalette.astro  # UPDATE: Add soul chat mode + commands
├── SoulHint.astro        # NEW: Cmd+K hint badge (bottom-right)
├── FloatingDialogue.astro # NEW: Soul message toasts
└── Header.astro          # UPDATE: Add SoulHint
```

---

## Phase 1: Core Soul Infrastructure

### 1.1 Types (`src/lib/soul/types.ts`)

```typescript
export interface PerceptionEvent {
  type: 'click' | 'scroll' | 'hover' | 'navigation' | 'idle' | 'focus';
  target?: string;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export interface UserModel {
  sessionId: string;
  visitCount: number;
  pagesViewed: string[];
  timePerPage: Record<string, number>;
  scrollDepths: Record<string, number>;
  clickedElements: string[];
  inferredInterests: string[];
  behavioralType: 'scanner' | 'reader' | 'explorer' | 'focused';
  currentState: SoulState;
  lastInteraction: number;
}

export type SoulState = 'greeting' | 'curious' | 'engaged' | 'ready' | 'returning';

export interface SoulAction {
  type: 'toast' | 'highlight' | 'suggest' | 'theme' | 'cta';
  payload: unknown;
}
```

### 1.2 Perception Layer (`src/lib/soul/perception.ts`)

Captures user behavior events:
- Click events (links, buttons, images)
- Scroll behavior (depth %, velocity, pauses)
- Hover patterns (dwell time on elements)
- Navigation patterns (entry, path, exit)
- Time on page / idle detection

### 1.3 Memory Layer (`src/lib/soul/memory.ts`)

Adapted from Aldea's WorkingMemory pattern:
- Immutable operations (returns new state)
- localStorage persistence
- Session vs persistent memory
- Memory regions (core, observations, inferred)

### 1.4 Mental Processes (`src/lib/soul/processes.ts`)

State machine with transitions:
```
greeting ──(3+ pages)──▶ curious ──(deep read)──▶ engaged ──(contact hover)──▶ ready
    ▲                                                                            │
    └────────────────────────────(returning visit)───────────────────────────────┘
```

---

## Phase 2: Rule-Based Triggers (5 Core Reactions)

| Trigger | Condition | Soul Reaction |
|---------|-----------|---------------|
| **Returning Visitor** | visitCount > 1 | "Welcome back" toast + remember last project |
| **Deep Reader** | scrollDepth > 70% AND time > 2min | Subtle CTA highlight |
| **Explorer** | pagesViewed >= 3 in session | "You seem curious" hint |
| **Contact Bound** | hover on contact link > 1s | Personalized CTA text |
| **Idle Wanderer** | idle > 30s on page | Ambient animation intensifies |

Implementation in `src/lib/soul/triggers.ts`:
```typescript
const triggers: Trigger[] = [
  {
    id: 'returning-visitor',
    condition: (memory) => memory.visitCount > 1,
    action: { type: 'toast', payload: { message: 'Welcome back...', duration: 3000 } }
  },
  // ... 4 more triggers
];
```

---

## Phase 3: Command Palette + Soul Integration

### 3.1 Cmd+K Hint Badge (`src/components/SoulHint.astro`)

A subtle, fixed-position badge that hints at the command palette:

```astro
<button class="soul-hint" aria-label="Open command palette (⌘K)" onclick="document.dispatchEvent(new KeyboardEvent('keydown', {key: 'k', metaKey: true}))">
  <kbd>⌘K</kbd>
</button>

<style>
.soul-hint {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: var(--color-background-alt);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px 12px;
  font-family: 'SF Mono', monospace;
  font-size: 12px;
  color: var(--color-text-muted);
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s, transform 0.2s;
  z-index: 100;
}
.soul-hint:hover {
  opacity: 1;
  transform: scale(1.05);
}
/* Hide after user has used palette 3+ times */
.soul-hint.is-hidden { display: none; }
/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .soul-hint { transition: none; }
}
</style>

<script>
  // Hide hint after 3 uses
  const uses = parseInt(localStorage.getItem('paletteUses') || '0');
  if (uses >= 3) {
    document.querySelector('.soul-hint')?.classList.add('is-hidden');
  }
</script>
```

### 3.2 Soul Commands in Command Palette

Add to existing `CommandPalette.astro` registerCommands():

```typescript
// Soul group - conversational commands
{
  id: 'soul-ask',
  label: 'Ask the soul...',
  icon: 'sparkles',
  group: 'Soul',
  action: () => this.enterSoulChatMode(),
  keywords: ['soul', 'ask', 'chat', 'help', 'what', 'who']
},
{
  id: 'soul-suggest',
  label: 'What should I read?',
  icon: 'compass',
  group: 'Soul',
  action: () => this.showSoulSuggestion(),
  keywords: ['suggest', 'recommend', 'read', 'explore']
},
{
  id: 'soul-about-tom',
  label: 'Who is Tom di Mino?',
  icon: 'user',
  group: 'Soul',
  action: () => this.showSoulResponse('Tom is a poet-turned AI/ML engineer...'),
  keywords: ['tom', 'who', 'about', 'background']
}
```

### 3.3 Soul Chat Mode Implementation

Transform palette into conversational interface:

```typescript
private soulChatMode = false;

enterSoulChatMode() {
  this.soulChatMode = true;
  this.input.placeholder = 'Ask me anything about Tom or his work...';
  this.results.innerHTML = `
    <div class="soul-chat-intro">
      <p>I'm the soul of this site. I can help you navigate Tom's work,
      suggest what to read based on your interests, or answer questions.</p>
    </div>
  `;
}

// Handle input in chat mode
private handleSoulQuery(query: string) {
  // Rule-based responses first
  const response = this.getSoulResponse(query);
  if (response) {
    this.showSoulResponse(response);
    return;
  }
  // Fallback to LLM (Phase 5)
  this.callSoulAPI(query);
}
```

---

## Phase 4: Floating Dialogue Component

### 4.1 Toast-style Soul Messages (`src/components/FloatingDialogue.astro`)

```astro
<div id="soul-dialogue" class="soul-dialogue" role="status" aria-live="polite">
  <div class="soul-dialogue-content">
    <span class="soul-dialogue-text"></span>
    <button class="soul-dialogue-dismiss" aria-label="Dismiss">×</button>
  </div>
</div>

<style>
.soul-dialogue {
  position: fixed;
  bottom: 24px;
  right: 24px;
  max-width: 320px;
  background: var(--color-background-alt);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  transform: translateY(100px);
  opacity: 0;
  transition: transform 0.3s ease, opacity 0.3s ease;
  z-index: 1000;
}
.soul-dialogue.is-visible {
  transform: translateY(0);
  opacity: 1;
}
.soul-dialogue-text {
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text);
}
.soul-dialogue-dismiss {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 18px;
}
</style>

<script>
  class SoulDialogue {
    private element: HTMLElement;
    private textEl: HTMLElement;
    private queue: string[] = [];
    private isShowing = false;

    constructor() {
      this.element = document.getElementById('soul-dialogue')!;
      this.textEl = this.element.querySelector('.soul-dialogue-text')!;
      this.element.querySelector('.soul-dialogue-dismiss')?.addEventListener('click', () => this.hide());
    }

    show(message: string, duration = 4000) {
      if (this.isShowing) {
        this.queue.push(message);
        return;
      }
      this.isShowing = true;
      this.textEl.textContent = message;
      this.element.classList.add('is-visible');

      setTimeout(() => this.hide(), duration);
    }

    hide() {
      this.element.classList.remove('is-visible');
      this.isShowing = false;
      if (this.queue.length > 0) {
        setTimeout(() => this.show(this.queue.shift()!), 500);
      }
    }
  }

  (window as any).soulDialogue = new SoulDialogue();
</script>
```

---

## Phase 5: LLM Fallback (Future)

### 5.1 Serverless API Route (`src/pages/api/soul.ts`)

```typescript
import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';

const SOUL_PROMPT = `You are the soul of minoanmystery.org, Tom di Mino's portfolio.
You are warm, intellectually curious, and subtly mysterious.
Your responses are brief (1-2 sentences), poetic but not pretentious.
You guide visitors through the labyrinth of Tom's work.
Never be salesy. Be genuinely helpful.`;

export const POST: APIRoute = async ({ request }) => {
  const { userModel, currentPage, query } = await request.json();

  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 150,
    system: SOUL_PROMPT,
    messages: [{ role: 'user', content: `Page: ${currentPage}\nQuery: ${query}` }]
  });

  return new Response(JSON.stringify({
    message: response.content[0].type === 'text' ? response.content[0].text : ''
  }));
};
```

---

## Implementation Order

| Phase | Description | Priority |
|-------|-------------|----------|
| **1** | Core infrastructure (types, perception, memory) | High |
| **2** | 5 rule-based triggers + dispatch | High |
| **3** | Cmd+K hint badge + soul commands in palette | High |
| **4** | Floating dialogue component | Medium |
| **5** | LLM fallback (requires API key) | Low |

---

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/lib/soul/index.ts` | Main export, soul initialization |
| `src/lib/soul/types.ts` | TypeScript interfaces |
| `src/lib/soul/perception.ts` | Event capture |
| `src/lib/soul/memory.ts` | UserModel + localStorage |
| `src/lib/soul/processes.ts` | State machine |
| `src/lib/soul/dispatch.ts` | Action execution |
| `src/lib/soul/triggers.ts` | 5 core triggers |
| `src/components/SoulHint.astro` | Cmd+K badge |
| `src/components/FloatingDialogue.astro` | Toast messages |
| `src/pages/api/soul.ts` | LLM endpoint (Phase 5) |

### Modified Files
| File | Changes |
|------|---------|
| `src/components/CommandPalette.astro` | Add Soul commands, chat mode |
| `src/layouts/BaseLayout.astro` | Initialize soul engine, add components |
| `src/styles/global.css` | Soul-related CSS variables |

---

## Verification Plan

### Manual Testing
1. **Perception**: Dev console shows events on click/scroll/hover
2. **Memory**: localStorage has `soulMemory` with UserModel
3. **Triggers**:
   - Visit 3+ pages → "curious" toast appears
   - Scroll 70%+ on case study → CTA highlight
   - Hover contact link 1s → personalized text
4. **Cmd+K Integration**:
   - Hint badge visible bottom-right (first 3 visits)
   - Type "soul" → see Soul commands
   - "Ask the soul" → chat mode activated
5. **View Transitions**: Soul state persists across navigation

### Browser Testing
- Chrome, Firefox, Safari (desktop)
- Mobile Safari, Mobile Chrome

---

## Patterns Adapted from Aldea Soul Engine

| Aldea Pattern | Minoan Adaptation |
|---------------|-------------------|
| WorkingMemory class | UserModel in localStorage |
| useActions hook | dispatch() with DOM operations |
| Mental processes | State machine in processes.ts |
| MemoryIntegrator | perception.ts normalization |
| GlobalDispatcher | Browser CustomEvent + dispatch.ts |
| useSoulMemory | localStorage + JSON serialization |

---

## Performance Considerations

- Debounce scroll/hover events (100ms)
- Use `requestIdleCallback` for non-critical perception
- Lazy-load LLM fallback only when needed
- Respect `prefers-reduced-motion` for animations
- Cache soul state in memory, sync to localStorage on idle
