/**
 * Labyrinth Events - Type-Safe Event System
 *
 * Follows Open Souls paradigm:
 * - Perception Layer: Events as first-class citizens
 * - Type Safety: Compile-time guarantees for event payloads
 * - Loose Coupling: Modules communicate via events, not direct calls
 *
 * Usage:
 *   import { dispatch, listen, LabyrinthEvents } from './events';
 *
 *   // Dispatch a typed event
 *   dispatch('soul:archive', { active: true });
 *
 *   // Listen with type inference
 *   const unsubscribe = listen('soul:archive', (detail) => {
 *     console.log(detail.active); // TypeScript knows this is boolean
 *   });
 */

import type {
  GoddessBackgroundPayload,
  VisionBackgroundPayload,
} from './types';

import type {
  TarotPlaceholderPayload,
  TarotCardPayload,
  TarotCompletePayload,
  TarotInlinePayload,
} from './TarotRenderer';

// ─────────────────────────────────────────────────────────────
//   Event Type Definitions
// ─────────────────────────────────────────────────────────────

/**
 * Voice transcript from speech-to-text
 */
export interface VoiceTranscriptPayload {
  transcript: string;
}

/**
 * Stream events from sseClient.ts
 */
export interface StreamStartPayload {
  timestamp: number;
}

export interface StreamChunkPayload {
  text: string;
  accumulated: string;
}

export interface StreamDonePayload {
  fullResponse: string;
}

export interface StreamErrorPayload {
  error: string;
}

/**
 * Archive search indicator state
 */
export interface ArchivePayload {
  active: boolean;
}

/**
 * Image analysis status during vision processing
 */
export interface ImageAnalysisPayload {
  status: 'analyzing' | 'complete' | 'error';
  caption?: {
    type: string;
    caption: string;
  };
  error?: string;
}

/**
 * Soul mode change (academic, poetic, etc.)
 */
export interface SoulModePayload {
  mode: 'academic' | 'poetic' | 'standard';
}

/**
 * Register options for poetic mode selection
 */
export interface RegisterOptionsPayload {
  registers: Array<{
    id: string;
    label: string;
    description: string;
  }>;
  prompt: string;
}

/**
 * Toast notification
 */
export interface ToastPayload {
  message: string;
  duration?: number;
  type?: 'info' | 'success' | 'warning' | 'error';
}

/**
 * Visitor model update notification
 */
export interface VisitorModelUpdatedPayload {
  notes: string;
  userName: string;
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────
//   Event Map (Type → Payload)
// ─────────────────────────────────────────────────────────────

/**
 * Complete mapping of Labyrinth events to their payload types.
 * This serves as the single source of truth for event contracts.
 */
export interface LabyrinthEventMap {
  // Voice events
  'voice:transcript': VoiceTranscriptPayload;

  // Soul perception events
  'soul:background': GoddessBackgroundPayload;
  'soul:archive': ArchivePayload;
  'soul:vision': VisionBackgroundPayload;
  'soul:mode': SoulModePayload;
  'soul:registerOptions': RegisterOptionsPayload;
  'soul:toast': ToastPayload;

  // Stream events (from sseClient.ts)
  'soul:stream:start': StreamStartPayload;
  'soul:stream:chunk': StreamChunkPayload;
  'soul:stream:done': StreamDonePayload;
  'soul:stream:error': StreamErrorPayload;

  // Tarot events
  'soul:tarot-placeholder': TarotPlaceholderPayload;
  'soul:tarot-card': TarotCardPayload;
  'soul:tarot-complete': TarotCompletePayload;
  'soul:tarot-inline': TarotInlinePayload; // Renamed from 'soul:tarot' for consistency

  // Image processing events
  'soul:imageAnalysis': ImageAnalysisPayload;

  // Visitor modeling events (uses window, not document)
  'visitor-model-updated': VisitorModelUpdatedPayload;
}

/**
 * Events that should be dispatched/listened on window instead of document.
 * Used by listenMany to automatically select the correct target.
 */
export const WINDOW_EVENTS: ReadonlySet<keyof LabyrinthEventMap> = new Set([
  'visitor-model-updated',
]);

// ─────────────────────────────────────────────────────────────
//   Type-Safe Dispatch
// ─────────────────────────────────────────────────────────────

/**
 * Dispatch a typed Labyrinth event.
 * Mirrors Open Souls' dispatch pattern for action execution.
 *
 * @param eventName - The event name (must be in LabyrinthEventMap)
 * @param detail - The event payload (type-checked against event name)
 * @param target - Event target (default: document, 'window' for visitor events)
 *
 * @example
 * dispatch('soul:archive', { active: true });
 * dispatch('soul:mode', { mode: 'academic' });
 * dispatch('visitor-model-updated', { notes: '...', userName: 'Tom', timestamp: Date.now() }, 'window');
 */
export function dispatch<K extends keyof LabyrinthEventMap>(
  eventName: K,
  detail: LabyrinthEventMap[K],
  target: 'document' | 'window' = 'document'
): void {
  const event = new CustomEvent(eventName, { detail });

  if (target === 'window') {
    window.dispatchEvent(event);
  } else {
    document.dispatchEvent(event);
  }
}

// ─────────────────────────────────────────────────────────────
//   Type-Safe Listen
// ─────────────────────────────────────────────────────────────

/**
 * Listen to a typed Labyrinth event.
 * Mirrors Open Souls' perception handler pattern.
 *
 * @param eventName - The event name (must be in LabyrinthEventMap)
 * @param handler - Callback with typed detail parameter
 * @param target - Event target (default: document, 'window' for visitor events)
 * @returns Unsubscribe function to remove the listener
 *
 * @example
 * const unsubscribe = listen('soul:archive', ({ active }) => {
 *   console.log('Archive active:', active);
 * });
 *
 * // Later, to clean up:
 * unsubscribe();
 */
export function listen<K extends keyof LabyrinthEventMap>(
  eventName: K,
  handler: (detail: LabyrinthEventMap[K]) => void,
  target: 'document' | 'window' = 'document'
): () => void {
  const listener = (e: Event) => {
    handler((e as CustomEvent<LabyrinthEventMap[K]>).detail);
  };

  const eventTarget = target === 'window' ? window : document;
  eventTarget.addEventListener(eventName, listener);

  // Return unsubscribe function
  return () => {
    eventTarget.removeEventListener(eventName, listener);
  };
}

// ─────────────────────────────────────────────────────────────
//   Batch Listen (Multiple Events)
// ─────────────────────────────────────────────────────────────

/**
 * Listen to multiple events at once.
 * Returns a single cleanup function that removes all listeners.
 *
 * @param handlers - Object mapping event names to handlers
 * @returns Unsubscribe function to remove all listeners
 *
 * @example
 * const unsubscribe = listenMany({
 *   'soul:archive': ({ active }) => setIndicator(active),
 *   'soul:mode': ({ mode }) => setMode(mode),
 * });
 */
export function listenMany<K extends keyof LabyrinthEventMap>(
  handlers: { [E in K]?: (detail: LabyrinthEventMap[E]) => void }
): () => void {
  const unsubscribes: Array<() => void> = [];

  for (const [eventName, handler] of Object.entries(handlers)) {
    if (handler) {
      // Use WINDOW_EVENTS set to determine target (extensible, not hardcoded)
      const target = WINDOW_EVENTS.has(eventName as keyof LabyrinthEventMap) ? 'window' : 'document';
      unsubscribes.push(
        listen(eventName as K, handler as (detail: LabyrinthEventMap[K]) => void, target)
      );
    }
  }

  return () => {
    unsubscribes.forEach(unsub => unsub());
  };
}

// ─────────────────────────────────────────────────────────────
//   Once Listener (Auto-Removes)
// ─────────────────────────────────────────────────────────────

/**
 * Listen to an event once, then auto-remove.
 *
 * @param eventName - The event name
 * @param handler - Callback (called once)
 * @param target - Event target
 * @returns Unsubscribe function (can cancel before event fires)
 */
export function once<K extends keyof LabyrinthEventMap>(
  eventName: K,
  handler: (detail: LabyrinthEventMap[K]) => void,
  target: 'document' | 'window' = 'document'
): () => void {
  let unsubscribe: (() => void) | null = null;

  unsubscribe = listen(eventName, (detail) => {
    handler(detail);
    unsubscribe?.();
  }, target);

  return unsubscribe;
}

// ─────────────────────────────────────────────────────────────
//   Event Type Guards
// ─────────────────────────────────────────────────────────────

/**
 * Type guard to check if an event is a specific Labyrinth event.
 * Useful for generic event handlers.
 */
export function isLabyrinthEvent<K extends keyof LabyrinthEventMap>(
  event: Event,
  eventName: K
): event is CustomEvent<LabyrinthEventMap[K]> {
  return event.type === eventName && event instanceof CustomEvent;
}
