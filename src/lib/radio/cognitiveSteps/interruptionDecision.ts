/**
 * interruptionDecision - Cognitive step for determining if a soul should interrupt
 *
 * Evaluates urgency of interruption based on:
 * - What the partner is currently saying
 * - What this soul was thinking
 * - Conversational flow and topic relevance
 *
 * Returns urgency 0-1 where 0.7+ means "interrupt now"
 */

import { createCognitiveStep } from '../../soul/opensouls/core/CognitiveStep';
import { ChatMessageRoleEnum } from '../../soul/opensouls/core/types';
import { indentNicely } from '../../soul/opensouls/core/utils';
import type { InterruptionOptions, InterruptionDecision } from '../types';

/**
 * Parse the LLM response into structured decision
 */
function parseDecision(response: string): InterruptionDecision {
  // Extract urgency number
  const urgencyMatch = response.match(/URGENCY:\s*(\d+)/i);
  const urgency = urgencyMatch ? parseInt(urgencyMatch[1], 10) / 10 : 0;

  // Extract interjection (use [\s\S] instead of . with s flag for ES compatibility)
  const interjectionMatch = response.match(/INTERJECTION:\s*([\s\S]+?)(?:\n|REASONING:|$)/i);
  const interjection = interjectionMatch ? interjectionMatch[1].trim() : '';

  // Extract reasoning if present
  const reasoningMatch = response.match(/REASONING:\s*([\s\S]+)/i);
  const reasoning = reasoningMatch ? reasoningMatch[1].trim() : undefined;

  return {
    urgency: Math.min(1, Math.max(0, urgency)),
    interjection,
    reasoning,
  };
}

export const interruptionDecision = createCognitiveStep<InterruptionOptions, InterruptionDecision>(
  (options) => ({
    command: (memory) => ({
      role: ChatMessageRoleEnum.System,
      content: indentNicely`
        You are ${options.soulName} listening to ${options.soulName === 'kothar' ? 'artifex' : 'kothar'} speak.

        ## Your conversation partner is currently saying:
        "${options.partnerCurrentUtterance}"

        ## They have said so far in this turn:
        ${options.partnerVocalizedSoFar || '(just started speaking)'}

        ## You had been thinking:
        "${options.yourPendingThought || '(no specific thought)'}"

        ${options.topic ? `## Current topic: ${options.topic}` : ''}

        ## Task
        Rate your urge to interject on a scale of 0-10:
        - 0-3: Let them finish (they're making a good point, or your thought can wait)
        - 4-6: Interject when they pause (you have something relevant but not urgent)
        - 7-10: Interrupt now (urgent insight, strong disagreement, or excited agreement)

        Consider:
        - Does your thought directly respond to what they're saying?
        - Would waiting diminish the impact of your contribution?
        - Is the conversational energy calling for interjection?
        - Let your natural temperament as ${options.soulName} guide your threshold for interruption

        ## Response Format (exactly this format):
        URGENCY: [number 0-10]
        INTERJECTION: [what you would say if interrupting - a complete thought, 10-20 words]
        REASONING: [brief explanation of why this urgency level]
      `,
      name: options.soulName,
    }),

    postProcess: async (_memory, response) => {
      const decision = parseDecision(response);

      return [
        {
          role: ChatMessageRoleEnum.Assistant,
          content: `[${options.soulName} urgency: ${decision.urgency.toFixed(1)}] ${decision.interjection}`,
          name: options.soulName,
          metadata: { type: 'interruption-decision', urgency: decision.urgency },
        },
        decision,
      ];
    },
  })
);

export default interruptionDecision;

/** Step metadata for manifest generation */
export const meta = {
  name: 'interruptionDecision',
  description: 'Evaluates whether a soul should interrupt the current speaker',
  tags: ['radio', 'interruption', 'decision'] as const,
  stream: false,
  provider: 'llm' as const,
} as const;
