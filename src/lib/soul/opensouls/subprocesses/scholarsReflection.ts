/**
 * scholarsReflection - Scholarly Introspection Subprocess
 *
 * @pattern Subprocess with Gate
 * @llmCalls 1-2 (mentalQuery gate + internalMonologue reflection)
 *
 * Background subprocess that uses internalMonologue to reflect deeply on
 * the scholarly discussion trajectory, building understanding that informs
 * future responses.
 *
 * Gates:
 * - Skips if discussion is too young (< 2 topics discussed)
 * - Skips if mentalQuery determines reflection wouldn't add value
 *
 * Runs after academic process responses to capture deeper insights.
 */

import type { ProcessContext, ProcessReturn } from '../mentalProcesses/types';
import type { SubprocessMeta } from '../core/meta';

/**
 * Metadata for manifest generation
 */
export const meta: SubprocessMeta = {
  name: 'scholarsReflection',
  description: 'Reflects on scholarly discussion trajectory to inform future responses',
  gates: ['minTopicsBeforeReflection', 'reflectionValue'],
} as const;
import { ChatMessageRoleEnum } from '../core/types';
import { indentNicely } from '../core/utils';
import { getSoulMemory, type SoulMemoryInterface } from '../../memory';
import { getSoulLogger } from '../core/SoulLogger';

import { mentalQuery } from '../cognitiveSteps/mentalQuery';
import { internalMonologue } from '../cognitiveSteps/internalMonologue';

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

/**
 * Required configuration for scholarly reflection
 */
export interface ScholarsReflectionConfig {
  /** The current user message being processed */
  userMessage: string;
  /** Topics discussed so far in this academic session */
  discussionTopics: string[];
  /** Minimum topics before reflection kicks in (default: 2) */
  minTopicsBeforeReflection?: number;
}

const DEFAULT_MIN_TOPICS = 2;
const MAX_MODEL_LENGTH = 2000;

// ─────────────────────────────────────────────────────────────
// Subprocess Implementation
// ─────────────────────────────────────────────────────────────

/**
 * Scholarly Reflection - Reflects on academic discussion patterns
 *
 * This subprocess observes the scholarly conversation to identify:
 * - Thematic threads connecting discussed topics
 * - The visitor's apparent scholarly interests
 * - Sources that should be prepared for future citation
 * - Assumptions that could be gently challenged
 */
export async function scholarsReflection(
  context: ProcessContext,
  config: ScholarsReflectionConfig
): Promise<ProcessReturn> {
  const { workingMemory, actions } = context;
  const { log } = actions;

  const minTopics = config.minTopicsBeforeReflection ?? DEFAULT_MIN_TOPICS;

  // DI Pattern: Use injected soulMemory when running server-side,
  // fallback to localStorage-backed singleton when running client-side
  const soulMemory: SoulMemoryInterface = context.soulMemory ?? getSoulMemory();

  log('Starting scholarly reflection subprocess');

  // Gate 1: Skip if discussion is too young
  if (config.discussionTopics.length < minTopics) {
    log(`Skipping - only ${config.discussionTopics.length} topics (need ${minTopics})`);
    return workingMemory;
  }

  // Gate 2: Check if reflection would add value
  const [, shouldReflect] = await mentalQuery(
    workingMemory,
    indentNicely`
      Has this scholarly discussion revealed something worth noting?
      Consider: new connections between topics, contradictions in the literature,
      deepening themes, or patterns in what the visitor is drawn to explore.

      Topics traversed: ${config.discussionTopics.join(' → ')}
      Current query: "${config.userMessage}"
    `
  );

  if (!shouldReflect) {
    log('Gate passed: no valuable reflection at this time');
    return workingMemory;
  }

  // Core reflection
  log('Generating scholarly insight');

  const [reflectionMemory, insight] = await internalMonologue(
    workingMemory,
    indentNicely`
      Reflect deeply on this scholarly exchange:

      Topics traversed: ${config.discussionTopics.join(' → ')}
      Current query: "${config.userMessage}"

      Consider:
      1. What thread connects these topics? Is there an underlying question they're circling?
      2. What scholarly tradition does the visitor seem drawn to?
         (e.g., Gordon's Semitic comparisons, Astour's etymologies, Harrison's ritual theory)
      3. Are there sources I should prepare to cite next?
      4. What assumptions might I gently challenge to deepen the discussion?

      Be specific. Name scholars. Note methodological preferences.
    `
  );

  log('Insight:', insight);
  getSoulLogger().logInternalMonologue(insight, 'scholarsReflection insight');

  // Store insight in soulMemory using FIFO truncation when at capacity
  const currentModel = soulMemory.getVisitorModel() || '';
  const newSection = `\n\n[Scholarly Insight]\n${insight}`;
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
  return reflectionMemory.withRegion('scholarly-insight', {
    role: ChatMessageRoleEnum.System,
    content: indentNicely`
      Recent scholarly reflection:
      ${insight}
    `,
  });
}

export default scholarsReflection;
