/**
 * decision - Cognitive step for choice-making
 *
 * Makes a choice from a set of options. The decision is recorded
 * in memory as "{soulName} decided: {choice}".
 */

import { createCognitiveStep } from '../core/CognitiveStep';
import { ChatMessageRoleEnum } from '../core/types';
import type { Memory } from '../core/types';
import { indentNicely } from '../core/utils';

export interface DecisionOptions {
  choices: string[];
  reason?: string;
}

export const decision = createCognitiveStep<DecisionOptions, string>(
  ({ choices, reason }) => ({
    command: (memory) => ({
      role: ChatMessageRoleEnum.System,
      content: indentNicely`
        You are ${memory.soulName}, making a decision.

        ## Available Choices
        ${choices.map((c, i) => `${i + 1}. ${c}`).join('\n')}

        ${reason ? `## Context\n${reason}` : ''}

        ## Instructions
        Choose exactly ONE option from the list above.
        Respond with ONLY the exact text of your chosen option, nothing else.
      `,
      name: memory.soulName,
    }),
    postProcess: async (memory, response): Promise<[Memory, string]> => {
      // Clean up response and match to choices
      const cleaned = response.trim().toLowerCase();
      const matched = choices.find(
        c => c.toLowerCase() === cleaned || cleaned.includes(c.toLowerCase())
      );
      const finalChoice = matched ?? choices[0]; // Fallback to first choice

      return [
        {
          role: ChatMessageRoleEnum.Assistant,
          content: `${memory.soulName} decided: ${finalChoice}`,
          name: memory.soulName,
          metadata: { decision: true, choice: finalChoice },
        },
        finalChoice,
      ];
    },
  })
);

export default decision;

/** Step metadata for manifest generation */
export const meta = {
  name: 'decision',
  description: 'Choice-making from a set of options',
  tags: ['decision', 'routing', 'choice'] as const,
  provider: 'llm' as const,
} as const;
