/**
 * Declarative Transition Graph
 *
 * Defines allowed state transitions at the type level.
 * This provides compile-time safety for mental process transitions.
 */

import type { SoulState } from './types';

/**
 * Declarative state transition graph.
 * Maps each state to its valid transition targets.
 *
 * Type-checked at compile time - invalid transitions
 * will produce TypeScript errors.
 */
export const transitions: Record<SoulState, readonly SoulState[]> = {
  greeting:   ['curious', 'returning'] as const,
  curious:    ['engaged', 'ready', 'academic', 'poetic'] as const,
  engaged:    ['ready', 'curious', 'academic', 'poetic'] as const,
  ready:      ['engaged', 'curious'] as const,
  returning:  ['curious', 'engaged'] as const,
  academic:   ['curious', 'engaged', 'poetic', 'dormant'] as const,
  poetic:     ['curious', 'engaged', 'academic', 'dormant'] as const,
  dormant:    ['greeting', 'returning'] as const,
  exiting:    ['dormant'] as const,
} as const;

/**
 * Type-safe transition validator.
 * Returns true if transition from `from` to `to` is allowed.
 *
 * @example
 * if (canTransition('greeting', 'curious')) {
 *   return [memory, 'curious'];
 * }
 */
export function canTransition(from: SoulState, to: SoulState): boolean {
  return transitions[from]?.includes(to) ?? false;
}

/**
 * Get all valid transitions from a given state.
 *
 * @example
 * const options = getTransitions('curious');
 * // ['engaged', 'ready', 'academic', 'poetic']
 */
export function getTransitions(from: SoulState): readonly SoulState[] {
  return transitions[from] ?? [];
}

/**
 * Validate a transition and throw if invalid.
 * Useful for runtime safety checks in development.
 *
 * @throws {Error} if transition is not allowed
 */
export function validateTransition(from: SoulState, to: SoulState): void {
  if (!canTransition(from, to)) {
    const allowed = transitions[from]?.join(', ') ?? 'none';
    throw new Error(
      `Invalid transition: ${from} → ${to}. Allowed: [${allowed}]`
    );
  }
}

/**
 * Type-safe transition helper for mental processes.
 * Returns [memory, targetState, params] tuple after validation.
 *
 * @example
 * return transitionTo(memory, 'greeting', 'curious', { reason: 'exploration' });
 */
export function transitionTo<S extends SoulState>(
  memory: import('../core/WorkingMemory').WorkingMemory,
  from: SoulState,
  to: S,
  params?: Record<string, unknown>
): [import('../core/WorkingMemory').WorkingMemory, S, Record<string, unknown>] {
  // Runtime validation in development
  if (import.meta.env?.DEV || import.meta.env?.MODE === 'development') {
    validateTransition(from, to);
  }

  return [memory, to, params ?? {}];
}

/**
 * State entry conditions.
 * Maps states to functions that check if entry is appropriate.
 */
export const entryConditions: Partial<Record<SoulState, (context: {
  userModel: import('./types').HydratedUserModel;
}) => boolean>> = {
  // Ready state: visitor showing readiness signals
  ready: ({ userModel }) => userModel.readinessSignals.length > 0,

  // Engaged state: deep reading behavior
  engaged: ({ userModel }) =>
    userModel.scrollDepth > 0.5 && userModel.timeOnCurrentPage > 60000,

  // Curious state: exploring multiple pages
  curious: ({ userModel }) => userModel.pagesViewed.length >= 3,

  // Returning state: recognized returning visitor
  returning: ({ userModel }) => userModel.isReturning,
};

/**
 * Check if a state's entry condition is met.
 *
 * @example
 * if (checkEntryCondition('ready', { userModel })) {
 *   return [memory, 'ready'];
 * }
 */
export function checkEntryCondition(
  state: SoulState,
  context: { userModel: import('./types').HydratedUserModel }
): boolean {
  const condition = entryConditions[state];
  return condition ? condition(context) : true;
}

/**
 * Find the best transition target based on entry conditions.
 * Returns the first valid target whose entry condition is met.
 *
 * @example
 * const nextState = findBestTransition('curious', { userModel });
 * if (nextState) {
 *   return [memory, nextState];
 * }
 */
export function findBestTransition(
  from: SoulState,
  context: { userModel: import('./types').HydratedUserModel }
): SoulState | null {
  const targets = getTransitions(from);

  for (const target of targets) {
    if (checkEntryCondition(target, context)) {
      return target;
    }
  }

  return null;
}

/**
 * Transition metadata for logging and debugging
 */
export interface TransitionEvent {
  from: SoulState;
  to: SoulState;
  reason: string;
  timestamp: number;
  valid: boolean;
}

/**
 * Create a transition event for logging.
 */
export function createTransitionEvent(
  from: SoulState,
  to: SoulState,
  reason: string
): TransitionEvent {
  return {
    from,
    to,
    reason,
    timestamp: Date.now(),
    valid: canTransition(from, to),
  };
}
