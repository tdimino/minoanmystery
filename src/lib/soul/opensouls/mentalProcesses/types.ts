/**
 * Mental Process Types
 *
 * Defines the state machine for soul behavioral states.
 */

import type { WorkingMemory } from '../core/WorkingMemory';
import type { Perception as CorePerception, SoulState, SoulActions } from '../core/types';
import type { UserModel } from '../../types';
import type { SoulMemoryInterface } from '../../memory';

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
 * Hydrated UserModel with computed values for mental processes
 * Extends UserModel with live computed values (timeOnSite, isReturning, etc.)
 */
export interface HydratedUserModel extends UserModel {
  // Computed values (live, not persisted)
  timeOnSite: number;
  timeOnCurrentPage: number;
  sessionDuration: number;
  scrollDepth: number;
  isReturning: boolean;
}

/**
 * Context passed to each mental process
 */
export interface ProcessContext {
  sessionId: string;
  workingMemory: WorkingMemory;
  perception?: Perception;
  userModel: HydratedUserModel;
  actions: SoulActions;
  /** Optional DI for server-side memory (avoids module patching) */
  soulMemory?: SoulMemoryInterface;
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
  transitionConditions?: (user: HydratedUserModel) => boolean;
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
