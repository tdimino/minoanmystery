/**
 * usePerceptions - Hook for accessing pending perceptions
 *
 * Provides access to the current perception being processed
 * and any queued perceptions waiting to be handled.
 */

import type { Perception } from '../core/types';

// Perception queues per session
const perceptionQueues = new Map<string, Perception[]>();
const currentPerceptions = new Map<string, Perception | null>();

/**
 * Perception refs for accessing current and pending perceptions
 */
export interface PerceptionRefs {
  /** The perception currently being processed */
  invokingPerception: Perception | null;
  /** Queue of pending perceptions */
  pendingPerceptions: { current: Perception[] };
}

/**
 * usePerceptions - Access current and pending perceptions
 *
 * @param sessionId - Session identifier
 * @returns Object with invokingPerception and pendingPerceptions
 *
 * @example
 * const { invokingPerception, pendingPerceptions } = usePerceptions(sessionId);
 * if (invokingPerception?.type === 'click') {
 *   // Handle click perception
 * }
 * if (pendingPerceptions.current.length > 0) {
 *   // More perceptions waiting
 * }
 */
export function usePerceptions(sessionId: string): PerceptionRefs {
  // Initialize queue if needed
  if (!perceptionQueues.has(sessionId)) {
    perceptionQueues.set(sessionId, []);
  }

  return {
    get invokingPerception() {
      return currentPerceptions.get(sessionId) ?? null;
    },
    pendingPerceptions: {
      get current() {
        return perceptionQueues.get(sessionId) ?? [];
      },
      set current(perceptions: Perception[]) {
        perceptionQueues.set(sessionId, perceptions);
      },
    },
  };
}

/**
 * Queue a perception for processing
 */
export function queuePerception(sessionId: string, perception: Perception): void {
  const queue = perceptionQueues.get(sessionId) ?? [];
  queue.push(perception);
  perceptionQueues.set(sessionId, queue);
}

/**
 * Set the current perception being processed
 */
export function setCurrentPerception(sessionId: string, perception: Perception | null): void {
  currentPerceptions.set(sessionId, perception);
}

/**
 * Dequeue the next perception for processing
 */
export function dequeuePerception(sessionId: string): Perception | undefined {
  const queue = perceptionQueues.get(sessionId);
  if (queue && queue.length > 0) {
    return queue.shift();
  }
  return undefined;
}

/**
 * Clear all perceptions for a session
 */
export function clearPerceptions(sessionId: string): void {
  perceptionQueues.set(sessionId, []);
  currentPerceptions.set(sessionId, null);
}

/**
 * Check if there are pending perceptions
 */
export function hasPendingPerceptions(sessionId: string): boolean {
  const queue = perceptionQueues.get(sessionId);
  return queue ? queue.length > 0 : false;
}

export default usePerceptions;
