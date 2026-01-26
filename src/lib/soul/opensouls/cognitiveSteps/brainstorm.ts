/**
 * brainstorm - Cognitive step for idea generation
 *
 * Generates a list of ideas or options based on a prompt.
 * Useful for exploring possibilities before making decisions.
 */

import { createCognitiveStep } from '../core/CognitiveStep';
import { ChatMessageRoleEnum } from '../core/types';
import type { Memory } from '../core/types';
import { indentNicely } from '../core/utils';

export interface BrainstormOptions {
  prompt: string;
  count?: number;
}

export const brainstorm = createCognitiveStep<BrainstormOptions, string[]>(
  ({ prompt, count = 5 }) => ({
    command: (memory) => ({
      role: ChatMessageRoleEnum.System,
      content: indentNicely`
        You are ${memory.soulName}, brainstorming ideas.

        ## Prompt
        ${prompt}

        ## Instructions
        Generate exactly ${count} distinct ideas or options.
        Format each idea on its own line, numbered 1-${count}.
        Be creative and consider different perspectives.
      `,
      name: memory.soulName,
    }),
    postProcess: async (memory, response): Promise<[Memory, string[]]> => {
      // Parse numbered list
      const lines = response.split('\n').filter(l => l.trim());
      const ideas = lines
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(idea => idea.length > 0);

      return [
        {
          role: ChatMessageRoleEnum.Assistant,
          content: `${memory.soulName} brainstormed: ${ideas.join('; ')}`,
          name: memory.soulName,
          metadata: { brainstorm: true, ideas },
        },
        ideas,
      ];
    },
  })
);

export default brainstorm;

/** Step metadata for manifest generation */
export const meta = {
  name: 'brainstorm',
  description: 'Idea generation and exploration',
  tags: ['ideation', 'creative', 'list'] as const,
  provider: 'llm' as const,
} as const;
