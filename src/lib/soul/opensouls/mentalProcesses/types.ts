/**
 * Mental Process Types
 *
 * Defines the state machine for soul behavioral states.
 */

import type { WorkingMemory } from '../core/WorkingMemory';
import type { Perception as CorePerception, SoulState, SoulActions } from '../core/types';

// Re-export types used by mental processes
export type { SoulState, SoulActions };

/**
 * Perception with extended properties for mental processes
 */
export interface Perception extends CorePerception {
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Context passed to each mental process
 */
export interface ProcessContext {
  sessionId: string;
  workingMemory: WorkingMemory;
  perception?: Perception;
  visitorModel: VisitorModel;
  actions: SoulActions;
}

/**
 * Visitor model - behavioral data about the current visitor
 */
export interface VisitorModel {
  sessionId: string;
  visitCount: number;
  pagesViewed: string[];
  currentPage: string;
  timeOnSite: number;
  timeOnCurrentPage: number;
  scrollDepth: number;
  behavioralType: 'scanner' | 'reader' | 'explorer' | 'focused';
  inferredInterests: string[];
  readinessSignals: string[];
  isReturning: boolean;
  lastProject?: string;
  paletteUses?: number;
}

/**
 * Return type from a mental process
 * - Just WorkingMemory: stay in current process
 * - [WorkingMemory, ProcessName]: transition to new process
 * - [WorkingMemory, ProcessName, params]: transition with params
 */
export type ProcessReturn =
  | WorkingMemory
  | [WorkingMemory, SoulState | null]
  | [WorkingMemory, SoulState | null, Record<string, unknown>];

/**
 * Mental process function signature
 */
export type MentalProcess = (context: ProcessContext) => Promise<ProcessReturn>;

/**
 * Process registry entry
 */
export interface ProcessDefinition {
  name: SoulState;
  process: MentalProcess;
  /** Conditions that trigger transition TO this state */
  transitionConditions?: (visitor: VisitorModel) => boolean;
}

/**
 * Process transition event
 */
export interface ProcessTransition {
  from: SoulState;
  to: SoulState;
  reason: string;
  timestamp: number;
}

/**
 * Default visitor model for new sessions
 */
export const defaultVisitorModel: VisitorModel = {
  sessionId: '',
  visitCount: 1,
  pagesViewed: [],
  currentPage: '/',
  timeOnSite: 0,
  timeOnCurrentPage: 0,
  scrollDepth: 0,
  behavioralType: 'explorer',
  inferredInterests: [],
  readinessSignals: [],
  isReturning: false,
};
