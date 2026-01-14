/**
 * modelsTheVisitor - Visitor Modeling Subprocess
 *
 * @pattern Subprocess with Dual Persistence
 * @llmCalls 1-4 (mentalQuery gate + internalMonologue + visitorNotes + optional visitorWhispers)
 *
 * Updates understanding of the visitor based on conversation and behavior.
 * Combines both patterns:
 * - Simple "notes" style (bullet points about the visitor)
 * - Daimonic "whispers" (sensing their inner daimon)
 *
 * Gates:
 * - Skips until minInteractionsBeforeUpdate messages (default: 2)
 * - Skips if mentalQuery determines nothing meaningful was learned
 *
 * Runs as a background subprocess, updating visitor model after interactions.
 */

import type { ProcessContext, ProcessReturn } from '../mentalProcesses/types';
import { ChatMessageRoleEnum } from '../core/types';
import { indentNicely } from '../core/utils';
import { getSoulMemory } from '../../memory';

import { mentalQuery } from '../cognitiveSteps/mentalQuery';
import { internalMonologue } from '../cognitiveSteps/internalMonologue';
import { visitorNotes } from '../cognitiveSteps/visitorNotes';
import { visitorWhispers } from '../cognitiveSteps/visitorWhispers';

/**
 * Configuration for visitor modeling behavior
 */
export interface ModelsTheVisitorConfig {
  /** Whether to generate daimonic whispers (more LLM calls) */
  generateWhispers?: boolean;
  /** Minimum interactions before updating model */
  minInteractionsBeforeUpdate?: number;
}

const DEFAULT_CONFIG: ModelsTheVisitorConfig = {
  generateWhispers: true,
  minInteractionsBeforeUpdate: 2,
};

/**
 * Models the Visitor - Learns about visitor preferences, personality, and needs
 *
 * This subprocess observes conversation and behavior to build a mental model
 * of the visitor. It updates both:
 * - visitorModel: Bullet-point notes about the visitor
 * - visitorWhispers: Daimonic sense of their inner voice
 */
export async function modelsTheVisitor(
  context: ProcessContext,
  config: ModelsTheVisitorConfig = {}
): Promise<ProcessReturn> {
  const { workingMemory, userModel, actions } = context;
  const { log } = actions;
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const soulMemory = getSoulMemory();
  const currentNotes = soulMemory.getVisitorModel();
  const userName = soulMemory.getUserName() || 'visitor';

  log('Starting visitor modeling subprocess');

  // Gate: Skip modeling until we have enough interactions
  const messageCount = workingMemory.memories.filter(m => m.role === 'user').length;
  if (messageCount < cfg.minInteractionsBeforeUpdate!) {
    log(`Skipping - only ${messageCount} interactions (need ${cfg.minInteractionsBeforeUpdate})`);
    return workingMemory;
  }

  // Add current visitor model to memory context
  const mem = workingMemory.withMemory({
    role: ChatMessageRoleEnum.System,
    content: indentNicely`
      ${workingMemory.soulName} remembers about ${userName}:

      # Visitor Model
      ${currentNotes || 'New visitor - no notes yet.'}

      # Current Session
      - Pages viewed: ${userModel.pagesViewed.join(', ') || 'none yet'}
      - Behavioral type: ${userModel.behavioralType}
      - Time on site: ${Math.round(userModel.timeOnSite / 1000)}s
      - Returning: ${userModel.isReturning ? 'yes' : 'no'}
    `,
    name: workingMemory.soulName,
  });

  // Single combined check: should we update model OR reflect on behavior?
  // (Reduces LLM calls from 2 to 1)
  const [, shouldProcess] = await mentalQuery(
    mem,
    `${mem.soulName} has learned something meaningful about ${userName} that warrants updating the mental model or adjusting engagement approach.`
  );

  log('Should process?', shouldProcess);

  if (!shouldProcess) {
    log('Subprocess completed - no updates needed');
    return workingMemory;
  }

  // We passed the gate - update the model
  log('Updating visitor model based on new learnings');

  // Learn what's new (keep memory for context)
  const [withLearnings, learnings] = await internalMonologue(
    mem,
    `What have I learned specifically about ${userName} from the last few messages or their behavior? Consider what they seem interested in, how they communicate, and what they might need. If they mentioned a specific topic, note it.`
  );
  log('Learnings:', learnings);

  // Extract topics from learnings (simple heuristic, no LLM call)
  const topicPatterns = [
    /interested in\s+([^,.]+)/gi,
    /asked about\s+([^,.]+)/gi,
    /curious about\s+([^,.]+)/gi,
    /discussing\s+([^,.]+)/gi,
    /topic[s]?:\s*([^,.]+)/gi,
  ];
  for (const pattern of topicPatterns) {
    const matches = learnings.matchAll(pattern);
    for (const match of matches) {
      const topic = match[1].trim().toLowerCase();
      if (topic.length > 2 && topic.length < 50) {
        soulMemory.addTopic(topic);
        log('Extracted topic:', topic);
      }
    }
  }

  // Update notes (result persisted, memory discarded)
  const [, notes] = await visitorNotes(withLearnings, {
    currentNotes,
    focus: 'all',
  });
  log('Updated notes:', notes);

  // Persist to soulMemory
  soulMemory.setVisitorModel(notes);

  // Optionally generate whispers
  if (cfg.generateWhispers) {
    const [, whispers] = await visitorWhispers(mem, {
      visitorModel: notes,
      currentPage: userModel.currentPage,
      behavioralType: userModel.behavioralType,
    });
    log('Whispers:', whispers);

    soulMemory.setVisitorWhispers(whispers);
  }

  // Return with updated memory region
  return workingMemory.withRegion('visitor-model', {
    role: ChatMessageRoleEnum.System,
    content: indentNicely`
      Understanding of ${userName}:
      ${notes}

      ${cfg.generateWhispers ? `\nTheir inner daimon whispers:\n${soulMemory.getVisitorWhispers()}` : ''}
    `,
  });
}

export default modelsTheVisitor;
