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
import { dormantProcess } from './dormant';
import { exitingProcess } from './exiting';
import { academicProcess } from './academic';
import { ProcessRunner } from './runner';
import type { SoulState, HydratedUserModel } from './types';

// Re-export all processes
export { greetingProcess } from './greeting';
export { curiousProcess } from './curious';
export { engagedProcess } from './engaged';
export { readyProcess } from './ready';
export { returningProcess } from './returning';
export { dormantProcess } from './dormant';
export { exitingProcess } from './exiting';
export { academicProcess, detectAcademicIntent, SCHOLAR_PERSONAS, type ScholarKey } from './academic';

// Re-export types
export type { ProcessContext, ProcessReturn, HydratedUserModel, SoulActions, Perception, SoulState } from './types';

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
  dormant: dormantProcess,
  exiting: exitingProcess,
  academic: academicProcess,
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
  runner.registerProcess('dormant', dormantProcess);
  runner.registerProcess('exiting', exitingProcess);
  runner.registerProcess('academic', academicProcess);

  return runner;
}

/**
 * Determine the appropriate initial state based on visitor model
 */
export function getInitialState(userModel: HydratedUserModel): SoulState {
  // Returning visitors start in returning state
  if (userModel.isReturning || userModel.visitCount > 1) {
    return 'returning';
  }

  // If they've already shown readiness signals
  if (userModel.readinessSignals.length > 0) {
    return 'ready';
  }

  // If they've explored multiple pages
  if (userModel.pagesViewed.length >= 3) {
    return 'curious';
  }

  // If they're deeply engaged on current page
  if (userModel.scrollDepth > 0.7 && userModel.timeOnCurrentPage > 90000) {
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
 *
 * ANY ──(45s+ idle)──▶ dormant ──(activity)──▶ curious
 *                          │
 *                          └──(5min+ idle)──▶ exiting ──(return)──▶ curious
 */
export const stateTransitions: Record<SoulState, SoulState[]> = {
  greeting: ['curious', 'engaged', 'ready', 'returning', 'dormant', 'academic'],
  curious: ['engaged', 'ready', 'dormant', 'academic'],
  engaged: ['ready', 'curious', 'dormant', 'academic'],
  ready: ['dormant', 'academic'],
  returning: ['curious', 'engaged', 'ready', 'dormant', 'academic'],
  dormant: ['curious', 'engaged', 'exiting', 'academic'],
  exiting: ['curious', 'academic'],
  academic: ['curious', 'engaged', 'dormant'], // Exit returns to appropriate state
};
