/**
 * Mental Process Runner
 *
 * Manages the state machine for soul behavioral processes.
 * Handles transitions, process execution, and state persistence.
 */

import type { WorkingMemory } from '../core/WorkingMemory';
import type {
  ProcessContext,
  ProcessReturn,
  MentalProcess,
  ProcessDefinition,
  ProcessTransition,
  VisitorModel,
  SoulState,
  Perception,
} from './types';

/**
 * Process Runner - manages the soul's state machine
 */
export class ProcessRunner {
  private processes: Map<SoulState, MentalProcess> = new Map();
  private currentState: SoulState;
  private transitionHistory: ProcessTransition[] = [];

  constructor(initialState: SoulState = 'greeting') {
    this.currentState = initialState;
  }

  /**
   * Register a mental process
   */
  registerProcess(state: SoulState, process: MentalProcess): void {
    this.processes.set(state, process);
  }

  /**
   * Register multiple processes
   */
  registerProcesses(definitions: ProcessDefinition[]): void {
    for (const def of definitions) {
      this.processes.set(def.name, def.process);
    }
  }

  /**
   * Get the current state
   */
  getState(): SoulState {
    return this.currentState;
  }

  /**
   * Get transition history
   */
  getTransitionHistory(): ProcessTransition[] {
    return [...this.transitionHistory];
  }

  /**
   * Transition to a new state
   */
  transition(newState: SoulState, reason?: string): void {
    const transition: ProcessTransition = {
      from: this.currentState,
      to: newState,
      reason: reason ?? 'manual_transition',
      timestamp: Date.now(),
    };

    this.transitionHistory.push(transition);
    this.currentState = newState;
  }

  /**
   * Run the current process with full context
   */
  async run(context: ProcessContext): Promise<ProcessReturn> {
    const process = this.processes.get(this.currentState);

    if (!process) {
      context.actions.log(`No process registered for state: ${this.currentState}`);
      return context.workingMemory;
    }

    try {
      const result = await process(context);
      return result;
    } catch (error) {
      context.actions.log('Process error', { error, state: this.currentState });
      return context.workingMemory;
    }
  }

  /**
   * Evaluate automatic transitions based on visitor model
   */
  evaluateTransitions(visitorModel: VisitorModel): SoulState | null {
    const v = visitorModel;

    // Returning visitor detection
    if (v.isReturning && this.currentState === 'greeting') {
      return 'returning';
    }

    // Exploring: 3+ pages viewed
    if (v.pagesViewed.length >= 3 && this.currentState === 'greeting') {
      return 'curious';
    }

    // Engaged: deep reading (high scroll depth + time)
    if (
      v.scrollDepth > 0.7 &&
      v.timeOnCurrentPage > 120000 &&
      ['greeting', 'curious'].includes(this.currentState)
    ) {
      return 'engaged';
    }

    // Ready: contact signals
    if (
      v.readinessSignals.length > 0 &&
      ['curious', 'engaged'].includes(this.currentState)
    ) {
      return 'ready';
    }

    return null;
  }

  /**
   * Run transition evaluation, execute transition if needed, then run process
   */
  async evaluateAndRun(context: ProcessContext): Promise<ProcessReturn> {
    // Check for automatic transitions first
    const autoTransition = this.evaluateTransitions(context.visitorModel);
    if (autoTransition) {
      this.transition(autoTransition, 'auto_evaluation');
    }

    // Run the current process
    return this.run(context);
  }
}

/**
 * Create a process runner with initial state
 */
export function createProcessRunner(initialState: SoulState = 'greeting'): ProcessRunner {
  return new ProcessRunner(initialState);
}

export default ProcessRunner;
