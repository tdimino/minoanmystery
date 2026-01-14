/**
 * Intent Router
 *
 * Routes parsed intents to appropriate mental processes and actions.
 * Maps verb categories to state transitions and dispatch actions.
 */

import type { ParsedIntent, IntentRoute, IntentAction } from './types';
import type { HydratedUserModel } from '../mentalProcesses/types';

/**
 * Route an intent to suggested state transitions and actions
 */
export function routeIntent(
  intent: ParsedIntent,
  currentState: string,
  visitorModel: HydratedUserModel
): IntentRoute {
  // Contact-related intents → ready state
  if (isContactIntent(intent)) {
    return createRoute(intent, 'ready', createHighlightAction('a[href="/contact"]'), true,
      'Guide them toward contact, acknowledge their readiness');
  }

  // Deep reading signals → engaged state
  if (isDeepReadingIntent(intent)) {
    return createRoute(intent, 'engaged', null, false);
  }

  // Navigation to portfolio → potential curious transition
  if (isPortfolioNavigationIntent(intent, visitorModel)) {
    const suggestedState = visitorModel.pagesViewed.length >= 3 ? 'curious' : null;
    return createRoute(intent, suggestedState, null, false);
  }

  // Exploration patterns → curious state
  if (isExplorationIntent(intent, visitorModel)) {
    return createRoute(intent, 'curious',
      createToastAction('The labyrinth rewards exploration...', 3000), false);
  }

  // Query intents → always need response
  if (intent.category === 'query') {
    return createRoute(intent, null, null, true,
      `User is asking about: ${intent.entity?.value || 'something'}`);
  }

  // Idle intents → potential dormant transition (for future)
  if (intent.verb === 'idle') {
    // Could transition to 'dormant' state when implemented
    return createRoute(intent, null, null, false);
  }

  // Exit intent (if detected)
  if (intent.verb === 'exit') {
    // Could transition to 'exiting' state when implemented
    return createRoute(intent, null, null, false);
  }

  // Default: no routing change
  return createRoute(intent, null, null, false);
}

/**
 * Check if intent is contact-related
 */
function isContactIntent(intent: ParsedIntent): boolean {
  if (intent.verb === 'contact') return true;
  if (intent.entity?.value.toLowerCase().includes('contact')) return true;
  if (intent.entity?.value.toLowerCase().includes('cta')) return true;
  return false;
}

/**
 * Check if intent indicates deep reading
 */
function isDeepReadingIntent(intent: ParsedIntent): boolean {
  if (intent.verb === 'read') return true;
  if (intent.verb === 'dwell' && intent.confidence > 0.8) return true;
  return false;
}

/**
 * Check if intent is portfolio navigation
 */
function isPortfolioNavigationIntent(
  intent: ParsedIntent,
  visitorModel: HydratedUserModel
): boolean {
  if (intent.verb !== 'navigate_to') return false;
  if (intent.entity?.type !== 'project') return false;
  return true;
}

/**
 * Check if intent indicates exploration
 */
function isExplorationIntent(
  intent: ParsedIntent,
  visitorModel: HydratedUserModel
): boolean {
  if (intent.verb === 'explore') return true;
  if (intent.verb === 'navigate_to' && visitorModel.pagesViewed.length >= 2) return true;
  return false;
}

/**
 * Create highlight action
 */
function createHighlightAction(selector: string): IntentAction {
  return {
    type: 'highlight',
    payload: { selector, duration: 3000, style: 'glow' },
  };
}

/**
 * Create toast action
 */
function createToastAction(message: string, duration: number): IntentAction {
  return {
    type: 'toast',
    payload: { message, duration },
  };
}

/**
 * Create intent route
 */
function createRoute(
  intent: ParsedIntent,
  suggestedState: string | null,
  suggestedAction: IntentAction | null,
  shouldRespond: boolean,
  responseHint?: string
): IntentRoute {
  return {
    intent,
    suggestedState,
    suggestedAction,
    shouldRespond,
    responseHint,
  };
}

/**
 * Batch process multiple intents for priority routing
 */
export function prioritizeIntents(intents: ParsedIntent[]): ParsedIntent | null {
  if (intents.length === 0) return null;

  // Priority order: contact > query > read > navigate > other
  const priorityOrder: Record<string, number> = {
    contact: 100,
    ask: 90,
    request: 85,
    search: 80,
    clarify: 75,
    read: 60,
    dwell: 55,
    navigate_to: 50,
    explore: 45,
    click: 30,
    scroll: 20,
    hover: 10,
    idle: 5,
    focus: 3,
    blur: 2,
  };

  return intents.sort((a, b) => {
    const priorityA = priorityOrder[a.verb] ?? 0;
    const priorityB = priorityOrder[b.verb] ?? 0;
    return priorityB - priorityA;
  })[0];
}
