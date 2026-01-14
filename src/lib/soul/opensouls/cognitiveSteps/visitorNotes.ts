/**
 * visitorNotes - Cognitive step for updating visitor model
 *
 * Updates notes about the visitor based on conversation and behavior.
 * Follows the simpler "notes" style from samantha-reflects.
 * Notes are stored in memory and persisted via SoulMemory.
 */

import { createCognitiveStep } from '../core/CognitiveStep';
import { ChatMessageRoleEnum } from '../core/types';
import { indentNicely } from '../core/utils';

export interface VisitorNotesOptions {
  currentNotes?: string;
  focus?: 'interests' | 'personality' | 'needs' | 'all';
}

export const visitorNotes = createCognitiveStep<VisitorNotesOptions | string | undefined>(
  (options) => {
    const opts: VisitorNotesOptions =
      typeof options === 'string'
        ? { currentNotes: options }
        : options || {};

    const focusInstructions = {
      interests: 'Focus on their interests, what topics engage them, what they click on or linger over.',
      personality: 'Focus on their personality: how they communicate, their tone, their approach.',
      needs: 'Focus on their needs: what are they looking for, what problems do they have.',
      all: 'Cover all aspects: interests, personality, communication style, and needs.',
    };

    return {
      command: (memory) => ({
        role: ChatMessageRoleEnum.System,
        content: indentNicely`
          You are ${memory.soulName}, the divine craftsman, updating your understanding of the visitor.

          ${opts.currentNotes ? `## Current Understanding\n${opts.currentNotes}` : '## First Impression\nThis is a new visitor. Build an initial model.'}

          ## Instructions
          Write updated notes about this visitor that will help you remember them.
          ${focusInstructions[opts.focus || 'all']}

          ## Format
          - Use brief bullet points
          - Keep relevant observations from before
          - Add new insights from recent interactions
          - Use abbreviated language
          - Do not write about yourself, only the visitor

          Reply with the updated notes:
        `,
        name: memory.soulName,
      }),
      postProcess: async (memory, response) => [
        {
          role: ChatMessageRoleEnum.Assistant,
          content: `[Visitor notes updated] ${response}`,
          name: memory.soulName,
          metadata: { type: 'visitorNotes', notes: response },
        },
        response,
      ],
    };
  }
);

export default visitorNotes;
