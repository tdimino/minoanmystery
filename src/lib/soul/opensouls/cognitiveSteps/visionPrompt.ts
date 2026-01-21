/**
 * visionPrompt - Cognitive step for generating image prompts
 *
 * Transforms conversation context into vivid image prompts optimized for
 * Gemini's image generation. Follows Minoan aesthetic guidelines.
 *
 * Pattern from Open Souls: pure LLM transformation that returns
 * [WorkingMemory, extractedValue] where extractedValue is the prompt string.
 */

import { createCognitiveStep } from '../core/CognitiveStep';
import { ChatMessageRoleEnum } from '../core/types';
import { indentNicely } from '../core/utils';

export interface VisionContext {
  /** Current mood/atmosphere from conversation */
  mood?: string;
  /** Visitor whispers (daimonic insights) */
  whispers?: string;
  /** Current topic being discussed */
  topic?: string;
  /** Preferred style override */
  style?: 'ethereal' | 'mythological' | 'labyrinthine' | 'divine' | 'ancient';
  /** User's explicit request (if they asked for a visualization) */
  explicitRequest?: string;
}

/**
 * Generate an image prompt optimized for Gemini
 *
 * Returns a detailed prompt (2-4 sentences) describing a visual scene
 * that captures the essence of the current conversation moment.
 */
export const visionPrompt = createCognitiveStep<VisionContext | undefined>(
  (context) => {
    const ctx = context || {};

    return {
      command: (memory) => ({
        role: ChatMessageRoleEnum.System,
        content: indentNicely`
          You are ${memory.soulName}, the divine craftsman, composing a vision to manifest.

          ${ctx.mood ? `## Current Atmosphere\n${ctx.mood}` : ''}
          ${ctx.whispers ? `## Visitor's Inner Voice\n${ctx.whispers}` : ''}
          ${ctx.topic ? `## Topic at Hand\n${ctx.topic}` : ''}
          ${ctx.explicitRequest ? `## Visitor's Request\n"${ctx.explicitRequest}"` : ''}

          ## The Art of Vision Prompts

          You are crafting a prompt for an AI image generator. The vision should:
          - Capture the emotional essence of this conversation moment
          - Draw from Minoan, Mycenaean, and ancient Mediterranean imagery
          - Feel like a glimpse into a mythological world
          - Be atmospheric and evocative, not literal

          ## Aesthetic Guidelines

          Preferred imagery:
          - Labyrinthine corridors and spiraling paths
          - Bull motifs, horns of consecration
          - Snake goddesses and priestesses
          - Mediterranean seascapes and volcanic islands
          - Fresco-like compositions with ochre, blue, and terracotta
          - Ancient bronze artifacts and double axes (labrys)
          - Minoan palace architecture (Knossos)
          - Ritual scenes and sacred groves

          Avoid:
          - Modern elements or anachronisms
          - Text, words, or letters in the image
          - Literal representations of the conversation
          - Overly dark or horror-adjacent imagery
          - Cartoonish or stylized looks

          ## Format

          Write a single prompt of 2-4 sentences. Be vivid and specific.
          Describe the scene as if you are witnessing it through the mists of time.
          Focus on composition, lighting, mood, and symbolic elements.

          Reply with only the image prompt, nothing else:
        `,
        name: memory.soulName,
      }),
      postProcess: async (memory, response) => {
        // Clean up the response - remove quotes if present
        const cleanedPrompt = response
          .trim()
          .replace(/^["']|["']$/g, '')
          .replace(/^Prompt:\s*/i, '');

        return [
          {
            role: ChatMessageRoleEnum.Assistant,
            content: `[Vision prompt composed] ${cleanedPrompt}`,
            name: memory.soulName,
            metadata: { type: 'visionPrompt', prompt: cleanedPrompt },
          },
          cleanedPrompt,
        ];
      },
    };
  }
);

export default visionPrompt;
