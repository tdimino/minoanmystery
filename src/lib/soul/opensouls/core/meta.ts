/**
 * Meta types for Soul Engine modules
 *
 * These types define optional metadata that can be exported alongside
 * cognitive steps, mental processes, and subprocesses for discovery
 * and documentation purposes.
 *
 * @pattern Open Souls - Build-time manifest generation
 */

/**
 * Metadata for cognitive steps
 */
export interface CognitiveStepMeta {
  /** Canonical name of the step */
  readonly name: string;
  /** Short description of what this step does */
  readonly description: string;
  /** Tags for categorization and discovery */
  readonly tags: readonly string[];
  /** Whether this step supports streaming output */
  readonly stream?: boolean;
  /** Whether this step is for internal use (not user-facing) */
  readonly internal?: boolean;
  /** Whether this step requires special providers (e.g., vision, image) */
  readonly provider?: 'llm' | 'vision' | 'image';
}

/**
 * Metadata for mental processes
 */
export interface MentalProcessMeta {
  /** Canonical name of the process */
  readonly name: string;
  /** Short description of this mental state */
  readonly description: string;
  /** Valid transitions from this state */
  readonly transitions: readonly string[];
  /** Entry conditions (when to enter this state) */
  readonly entryConditions?: readonly string[];
}

/**
 * Metadata for subprocesses
 */
export interface SubprocessMeta {
  /** Canonical name of the subprocess */
  readonly name: string;
  /** Short description of what this subprocess does */
  readonly description: string;
  /** Execution order (lower runs first, default: 50) */
  readonly order?: number;
  /** Whether this subprocess is server-only (uses Node.js APIs) */
  readonly serverOnly?: boolean;
  /** Gate conditions that must pass for subprocess to run */
  readonly gates?: readonly string[];
}

/**
 * Type helper for creating strongly-typed meta exports
 */
export function defineCognitiveStepMeta<T extends CognitiveStepMeta>(meta: T): T {
  return meta;
}

export function defineMentalProcessMeta<T extends MentalProcessMeta>(meta: T): T {
  return meta;
}

export function defineSubprocessMeta<T extends SubprocessMeta>(meta: T): T {
  return meta;
}
