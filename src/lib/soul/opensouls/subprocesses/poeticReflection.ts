/**
 * poeticReflection - Poetic Introspection Subprocess
 *
 * @pattern Subprocess with Gate
 * @llmCalls 1-2 (mentalQuery gate + internalMonologue reflection)
 *
 * Background subprocess that uses internalMonologue to reflect on
 * the poetic trajectory, building understanding of the visitor's
 * poetic sensibilities that informs future compositions.
 *
 * Gates:
 * - Skips on first poem (nothing to reflect on yet)
 * - Skips if mentalQuery determines reflection wouldn't add value
 *
 * Runs after poeticProcess responses to capture deeper insights.
 */

import type { ProcessContext, ProcessReturn } from '../mentalProcesses/types';
import type { SubprocessMeta } from '../core/meta';

/**
 * Metadata for manifest generation
 */
export const meta: SubprocessMeta = {
  name: 'poeticReflection',
  description: 'Reflects on poetic trajectory to inform future compositions',
  gates: ['minPoemsBeforeReflection', 'reflectionValue'],
} as const;
import { ChatMessageRoleEnum } from '../core/types';
import { indentNicely } from '../core/utils';
import { getSoulMemory, type SoulMemoryInterface } from '../../memory';
import { getSoulLogger } from '../core/SoulLogger';

import { mentalQuery } from '../cognitiveSteps/mentalQuery';
import { internalMonologue } from '../cognitiveSteps/internalMonologue';

import type { PoeticRegister } from '../cognitiveSteps/poeticComposition';

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

/**
 * Required configuration for poetic reflection
 */
export interface PoeticReflectionConfig {
  /** The theme of the poem just composed */
  theme: string;
  /** The register used for composition */
  register: PoeticRegister;
  /** Total poems composed this session */
  poemCount: number;
  /** Minimum poems before reflection kicks in (default: 2) */
  minPoemsBeforeReflection?: number;
}

const DEFAULT_MIN_POEMS = 2;
const MAX_MODEL_LENGTH = 2000;

// ─────────────────────────────────────────────────────────────
// Subprocess Implementation
// ─────────────────────────────────────────────────────────────

/**
 * Poetic Reflection - Reflects on poetic patterns and visitor sensibilities
 *
 * This subprocess observes the poetic conversation to identify:
 * - The visitor's apparent poetic preferences (register, themes)
 * - Patterns in what imagery resonates
 * - Which aspects of Tom's voice connect most deeply
 * - Directions to explore in future compositions
 */
export async function poeticReflection(
  context: ProcessContext,
  config: PoeticReflectionConfig
): Promise<ProcessReturn> {
  const { workingMemory, actions } = context;
  const { log } = actions;

  const minPoems = config.minPoemsBeforeReflection ?? DEFAULT_MIN_POEMS;

  // DI Pattern: Use injected soulMemory when running server-side,
  // fallback to localStorage-backed singleton when running client-side
  const soulMemory: SoulMemoryInterface = context.soulMemory ?? getSoulMemory();

  log('Starting poetic reflection subprocess');

  // Gate 1: Skip on first poem
  if (config.poemCount < minPoems) {
    log(`Skipping - only ${config.poemCount} poems (need ${minPoems})`);
    return workingMemory;
  }

  // Gate 2: Check if reflection would add value
  const [, shouldReflect] = await mentalQuery(
    workingMemory,
    indentNicely`
      Has this poetic exchange revealed something worth noting about the visitor?
      Consider: patterns in themes requested, resonance with specific imagery,
      which registers they gravitate toward, what depths they're willing to enter.

      Recent theme: "${config.theme}"
      Register: ${config.register}
      Poems composed: ${config.poemCount}
    `
  );

  if (!shouldReflect) {
    log('Gate passed: no valuable reflection at this time');
    return workingMemory;
  }

  // Core reflection
  log('Generating poetic insight');

  const [reflectionMemory, insight] = await internalMonologue(
    workingMemory,
    indentNicely`
      Reflect on this poetic exchange with the visitor:

      Recent theme: "${config.theme}"
      Register used: ${config.register}
      Poems composed: ${config.poemCount}

      Consider:
      1. What draws them to this theme? What are they seeking?
      2. Which of Tom's image domains seem to resonate most?
         (Bronze Age, Sacred Feminine, Fire-Water, Sacred Sites, Daimonic)
      3. Are they comfortable with the strangeness, or do they pull back?
      4. What register might serve them next?
      5. What deeper question might they be circling?

      Be specific. Name images and patterns. Note sensibilities.
    `
  );

  log('Insight:', insight);
  getSoulLogger().logInternalMonologue(insight, 'poeticReflection insight');

  // Store insight in soulMemory using FIFO truncation when at capacity
  const currentModel = soulMemory.getVisitorModel() || '';
  const newSection = `\n\n[Poetic Insight]\n${insight}`;
  const projectedLength = currentModel.length + newSection.length;

  if (projectedLength <= MAX_MODEL_LENGTH) {
    // Fits within limit
    soulMemory.setVisitorModel(currentModel + newSection);
    log('Insight appended to visitor model');
  } else if (newSection.length < MAX_MODEL_LENGTH) {
    // Need to truncate old content to make room (FIFO)
    const spaceNeeded = projectedLength - MAX_MODEL_LENGTH;
    // Find a safe truncation point (after a newline if possible)
    let truncateAt = spaceNeeded;
    const newlineAfter = currentModel.indexOf('\n', spaceNeeded);
    if (newlineAfter !== -1 && newlineAfter < spaceNeeded + 100) {
      truncateAt = newlineAfter + 1;
    }
    const truncatedModel = currentModel.slice(truncateAt);
    soulMemory.setVisitorModel(truncatedModel + newSection);
    log('Visitor model truncated (FIFO) to fit new insight');
  } else {
    // New insight alone exceeds limit (shouldn't happen normally)
    log('Insight too large to store, skipping persistence');
  }

  // Return memory with reflection region for immediate context
  return reflectionMemory.withRegion('poetic-insight', {
    role: ChatMessageRoleEnum.System,
    content: indentNicely`
      Recent poetic reflection:
      ${insight}
    `,
  });
}

export default poeticReflection;
