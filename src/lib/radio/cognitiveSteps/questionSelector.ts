/**
 * questionSelector - Cognitive step for choosing who responds first to a listener question
 *
 * Evaluates which soul (Kothar or Tamarru) is best positioned to respond first
 * based on their personalities, the topic, and current conversational context.
 */

import { createCognitiveStep } from '../../soul/opensouls/core/CognitiveStep';
import { ChatMessageRoleEnum } from '../../soul/opensouls/core/types';
import { indentNicely } from '../../soul/opensouls/core/utils';
import type { RadioSoulName } from '../types';

export interface QuestionSelectorOptions {
  /** The listener's question */
  question: string;

  /** Who submitted the question (optional) */
  submittedBy?: string;

  /** Current discussion topic for context */
  currentTopic?: string;

  /** Brief description of Kothar's strengths (for selector context) */
  kotharDescription?: string;

  /** Brief description of Tamarru's strengths (for selector context) */
  tamarruDescription?: string;
}

export interface QuestionSelectorResult {
  /** Which soul should respond first */
  firstResponder: RadioSoulName;

  /** Brief reasoning for the selection */
  reasoning: string;

  /** How the first responder might frame their answer */
  approachHint: string;
}

/**
 * Parse the LLM response into structured result
 */
function parseResult(response: string): QuestionSelectorResult {
  // Extract first responder
  const responderMatch = response.match(/FIRST_RESPONDER:\s*(kothar|tamarru)/i);
  const firstResponder = (responderMatch?.[1]?.toLowerCase() || 'kothar') as RadioSoulName;

  // Extract reasoning
  const reasoningMatch = response.match(/REASONING:\s*([\s\S]+?)(?:\nAPPROACH:|$)/i);
  const reasoning = reasoningMatch?.[1]?.trim() || 'Default selection';

  // Extract approach hint
  const approachMatch = response.match(/APPROACH:\s*([\s\S]+)/i);
  const approachHint = approachMatch?.[1]?.trim() || '';

  return {
    firstResponder,
    reasoning,
    approachHint,
  };
}

/** Default soul descriptions if not provided */
const DEFAULT_KOTHAR_DESCRIPTION = `The Craftsman Oracle - Ancient wisdom, measured speech, architect of understanding. Excels at technical questions, craft metaphors, structural insights, practical wisdom. Style: Deliberate, grounding, uses building/making analogies.`;

const DEFAULT_TAMARRU_DESCRIPTION = `The Ecstatic Poet - Passionate, rhythmic, mystical fervor. Excels at emotional questions, spiritual inquiry, creative expression, intuitive leaps. Style: Dynamic, transformative, uses fire/dance/sacred imagery.`;

export const questionSelector = createCognitiveStep<QuestionSelectorOptions, QuestionSelectorResult>(
  (options) => {
    const kotharDesc = options.kotharDescription || DEFAULT_KOTHAR_DESCRIPTION;
    const tamarruDesc = options.tamarruDescription || DEFAULT_TAMARRU_DESCRIPTION;

    return {
      command: (memory) => ({
        role: ChatMessageRoleEnum.System,
        content: indentNicely`
          You are deciding which soul should respond first to a listener question on Daimonic Radio.

          ## The Listener Question
          "${options.question}"
          ${options.submittedBy ? `(Submitted by: ${options.submittedBy})` : ''}

          ${options.currentTopic ? `## Current Discussion Topic\n${options.currentTopic}` : ''}

          ## The Two Souls

          **Kothar**
          ${kotharDesc}

          **Tamarru**
          ${tamarruDesc}

          ## Task
          Choose which soul should respond FIRST to this question. The other will respond second with their perspective.

          Consider:
          - What kind of question is this? (technical, emotional, philosophical, creative)
          - Which soul's core strengths align with the question's nature?
          - Who would provide the most compelling opening perspective?

          ## Response Format (exactly this format):
          FIRST_RESPONDER: [kothar or tamarru]
          REASONING: [1-2 sentences explaining why this soul should go first]
          APPROACH: [Brief hint about how they might approach the answer]
        `,
        name: 'radio',
      }),

      postProcess: async (_memory, response) => {
        const result = parseResult(response);

        return [
          {
            role: ChatMessageRoleEnum.Assistant,
            content: `[Question selector: ${result.firstResponder} responds first - ${result.reasoning}]`,
            name: 'radio',
            metadata: { type: 'question-selector', firstResponder: result.firstResponder },
          },
          result,
        ];
      },
    };
  }
);

export default questionSelector;

/** Step metadata for manifest generation */
export const meta = {
  name: 'questionSelector',
  description: 'Selects which soul should respond first to a listener question',
  tags: ['radio', 'question', 'decision'] as const,
  stream: false,
  provider: 'llm' as const,
} as const;
