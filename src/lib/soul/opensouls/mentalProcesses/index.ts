/**
 * Mental Processes Registry
 *
 * Exports all mental processes and provides registration utilities
 * for the ProcessRunner state machine.
 */

import { greetingProcess } from './greeting';
import { curiousProcess } from './curious';
import { engagedProcess } from './engaged';
import { readyProcess } from './ready';
import { returningProcess } from './returning';
import { ProcessRunner } from './runner';
import type { SoulState, VisitorModel } from './types';

// Re-export all processes
export { greetingProcess } from './greeting';
export { curiousProcess } from './curious';
export { engagedProcess } from './engaged';
export { readyProcess } from './ready';
export { returningProcess } from './returning';

// Re-export types
export type { ProcessContext, ProcessReturn, VisitorModel, SoulActions, Perception, SoulState } from './types';
export { defaultVisitorModel } from './types';

// Re-export runner
export { ProcessRunner } from './runner';

/**
 * Process registry mapping state names to process functions
 */
export const processRegistry = {
  greeting: greetingProcess,
  curious: curiousProcess,
  engaged: engagedProcess,
  ready: readyProcess,
  returning: returningProcess,
} as const;

/**
 * Create and configure a ProcessRunner with all mental processes registered
 */
export function createProcessRunner(): ProcessRunner {
  const runner = new ProcessRunner('greeting');

  // Register all processes
  runner.registerProcess('greeting', greetingProcess);
  runner.registerProcess('curious', curiousProcess);
  runner.registerProcess('engaged', engagedProcess);
  runner.registerProcess('ready', readyProcess);
  runner.registerProcess('returning', returningProcess);

  return runner;
}

/**
 * Determine the appropriate initial state based on visitor model
 */
export function getInitialState(visitorModel: VisitorModel): SoulState {
  // Returning visitors start in returning state
  if (visitorModel.isReturning || visitorModel.visitCount > 1) {
    return 'returning';
  }

  // If they've already shown readiness signals
  if (visitorModel.readinessSignals.length > 0) {
    return 'ready';
  }

  // If they've explored multiple pages
  if (visitorModel.pagesViewed.length >= 3) {
    return 'curious';
  }

  // If they're deeply engaged on current page
  if (visitorModel.scrollDepth > 0.7 && visitorModel.timeOnCurrentPage > 90000) {
    return 'engaged';
  }

  // Default: greeting state for new visitors
  return 'greeting';
}

/**
 * State transition map for reference
 *
 * greeting ──(returning visitor)──▶ returning
 *    │
 *    ├──(3+ pages)──▶ curious ──(deep read)──▶ engaged
 *    │                    │                        │
 *    │                    └──(readiness)──────────┐│
 *    │                                            ▼▼
 *    └──(readiness signals)──────────────────▶ ready
 *
 * returning ──(exploring)──▶ curious
 *     │
 *     └──(readiness)──▶ ready
 */
export const stateTransitions: Record<SoulState, SoulState[]> = {
  greeting: ['curious', 'engaged', 'ready', 'returning'],
  curious: ['engaged', 'ready'],
  engaged: ['ready'],
  ready: [], // Terminal state (until next session)
  returning: ['curious', 'engaged', 'ready'],
};
