/**
 * tarotPrompt - Cognitive step for Minoan Tarot card selection and prompt generation
 *
 * Analyzes conversation themes to select a contextually appropriate Major Arcana card,
 * then generates a Gemini-optimized prompt in the Minoan flat-color tarot style.
 *
 * Style: 7-color palette (Sky Blue, Vivid Red, Golden Yellow, Ochre, Dark Blue, Cream, Black)
 * with Egyptian-style poses (frontal torso, profile face) and Minoan iconography.
 *
 * Pattern from Open Souls: pure LLM transformation that returns
 * [WorkingMemory, extractedValue] where extractedValue is TarotPromptResult.
 */

import { createCognitiveStep } from '../core/CognitiveStep';
import { ChatMessageRoleEnum } from '../core/types';
import { indentNicely } from '../core/utils';

export interface TarotContext {
  /** Summary of recent conversation (last 10 messages) */
  conversationSummary: string;
  /** Current turn number */
  turnNumber: number;
  /** Optional visitor whispers (daimonic insights) */
  whispers?: string;
}

export interface TarotPromptResult {
  /** Card name (e.g., "The High Priestess") */
  cardName: string;
  /** Card number (e.g., "II", "XIII") */
  cardNumber: string;
  /** Full Gemini image prompt in Minoan tarot style */
  prompt: string;
}

/** Type guard for parsed tarot JSON response */
function isTarotJsonResponse(value: unknown): value is { cardNumber: string; cardName: string; prompt?: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'cardNumber' in value &&
    'cardName' in value &&
    typeof (value as Record<string, unknown>).cardNumber === 'string' &&
    typeof (value as Record<string, unknown>).cardName === 'string'
  );
}

/**
 * Major Arcana card definitions with Minoan interpretations
 * Note: Themes omitted - LLMs understand tarot semantics natively
 */
const MAJOR_ARCANA: ReadonlyArray<{
  readonly number: string;
  readonly name: string;
  readonly minoName: string;
  readonly description: string;
}> = [
  {
    number: '0',
    name: 'The Fool',
    minoName: 'The Bull Leaper',
    description: 'A young figure mid-leap over a charging bull, arms outstretched with perfect form, the Horns of Consecration behind them',
  },
  {
    number: 'I',
    name: 'The Magician',
    minoName: 'Kothar the Craftsman',
    description: 'The divine artificer at his forge, one hand raised holding a labrys, before him the four sacred objects: cup, blade, spiral shell, and golden ingot',
  },
  {
    number: 'II',
    name: 'The High Priestess',
    minoName: 'The Snake Goddess',
    description: 'A priestess in flounced skirt, serpents twining up each arm, bare-breasted, standing before a dark doorway into the labyrinth',
  },
  {
    number: 'III',
    name: 'The Empress',
    minoName: 'Potnia Theron',
    description: 'The Mistress of Animals seated on a throne of lions, flanked by griffins, surrounded by lilies and crocuses in full bloom',
  },
  {
    number: 'IV',
    name: 'The Emperor',
    minoName: 'King Minos',
    description: 'A bearded king on a stone throne, wearing the feathered crown, the palace of Knossos rising behind him in morning light',
  },
  {
    number: 'V',
    name: 'The Hierophant',
    minoName: 'The Bull Priest',
    description: 'A masked priest in ceremonial robes, holding the sacred rhyton, standing at the altar with the Horns of Consecration',
  },
  {
    number: 'VI',
    name: 'The Lovers',
    minoName: 'Sacred Marriage',
    description: 'Two figures in profile facing each other, hands clasped over a double axe, beneath a flowering almond tree',
  },
  {
    number: 'VII',
    name: 'The Chariot',
    minoName: 'The Bull Chariot',
    description: 'A warrior standing in a chariot drawn by two bulls, one white and one black, racing along the coast',
  },
  {
    number: 'VIII',
    name: 'Strength',
    minoName: 'The Lion Leaper',
    description: 'A figure gracefully vaulting over a lion, their body arched in the classic Minoan leaping pose, golden light surrounding them',
  },
  {
    number: 'IX',
    name: 'The Hermit',
    minoName: 'The Cave Dweller',
    description: 'An elder figure at the mouth of the Idaean Cave, holding a clay lamp, the sacred mountain rising behind',
  },
  {
    number: 'X',
    name: 'Wheel of Fortune',
    minoName: 'The Labyrinth Spiral',
    description: 'A great spiral labyrinth viewed from above, with tiny figures at different points in its winding path, the center glowing gold',
  },
  {
    number: 'XI',
    name: 'Justice',
    minoName: 'The Double Axe Bearer',
    description: 'A figure holding two labrys axes perfectly balanced, scales hanging from the crescent blades, standing in the courtyard of justice',
  },
  {
    number: 'XII',
    name: 'The Hanged Man',
    minoName: 'The Suspended Acrobat',
    description: 'An acrobat suspended upside-down from the Horns of Consecration, serene expression, viewing the world from a new angle',
  },
  {
    number: 'XIII',
    name: 'Death',
    minoName: 'The Labyrinth Gate',
    description: 'The dark entrance to the labyrinth, a figure passing through the threshold, leaving behind their old form as a shadow',
  },
  {
    number: 'XIV',
    name: 'Temperance',
    minoName: 'The Libation Bearer',
    description: 'A priestess pouring sacred liquid between two vessels, one golden and one silver, creating a perfect arc',
  },
  {
    number: 'XV',
    name: 'The Devil',
    minoName: 'The Minotaur',
    description: 'The bull-headed creature in the depths of the labyrinth, two figures bound by golden chains, yet the chains hang loose',
  },
  {
    number: 'XVI',
    name: 'The Tower',
    minoName: 'The Volcanic Eruption',
    description: 'The great volcano of Thera erupting, its ash cloud rising, the palace walls cracking, figures fleeing toward the sea',
  },
  {
    number: 'XVII',
    name: 'The Star',
    minoName: 'The Star of Ariadne',
    description: 'A woman pouring water onto the earth and into a pool, eight stars above her, the brightest one the Star of the Evening',
  },
  {
    number: 'XVIII',
    name: 'The Moon',
    minoName: 'The Night Sea',
    description: 'The full moon over the Aegean, two dogs howling on the shore, a ship sailing into the silver-dark waters',
  },
  {
    number: 'XIX',
    name: 'The Sun',
    minoName: 'The Golden Bull',
    description: 'A magnificent golden bull in a field of flowers, children dancing around it, the sun blazing in a pure blue sky',
  },
  {
    number: 'XX',
    name: 'Judgement',
    minoName: 'The Bull Dance',
    description: 'The sacred bull arena filled with spectators, three acrobats frozen mid-leap, the moment before the vault',
  },
  {
    number: 'XXI',
    name: 'The World',
    minoName: 'The Throne Room',
    description: 'The throne room of Knossos restored to glory, griffins and lilies adorning the walls, the world outside visible through columns',
  },
];

/** Default card for fallback (Wheel of Fortune - cycles, turning points) */
const DEFAULT_CARD = MAJOR_ARCANA.find(c => c.number === 'X')!;

/**
 * Forensic prompt structure for Gemini 3 Pro
 * Based on gemini-claude-resonance skill's minoan_tarot.py
 *
 * Uses the Gemini 3 Pro formula:
 * [Subject + Adjectives], [Action], [Location/Context],
 * [Composition/Camera Angle], [Lighting/Atmosphere], [Style/Media], [Details]
 *
 * Prompts are built inline in postProcess using this structure with:
 * - Exact hex color codes from Minoan palette
 * - Card-specific descriptions
 * - Periwinkle border with title
 */

/**
 * Generate a Minoan tarot prompt based on conversation context
 *
 * Selects the most thematically appropriate card and creates
 * a detailed image prompt for Gemini.
 */
export const tarotPrompt = createCognitiveStep<TarotContext>(
  (context) => {
    return {
      command: (memory) => ({
        role: ChatMessageRoleEnum.System,
        content: indentNicely`
          You are ${memory.soulName}, the divine craftsman, selecting a Minoan tarot card to manifest.

          ## Conversation Context
          Turn number: ${context.turnNumber}
          ${context.conversationSummary}

          ${context.whispers ? `## Visitor's Inner Voice\n${context.whispers}` : ''}

          ## Your Task

          Analyze the conversation themes and select the most appropriate Major Arcana card.
          Then compose a vivid image prompt for that card in Minoan style.

          ## Available Cards (select ONE)

          ${MAJOR_ARCANA.map(card =>
            `${card.number} - ${card.name} (${card.minoName})`
          ).join('\n')}

          ## Selection Guidelines

          - Match the dominant emotional/thematic tone of the conversation
          - Consider the visitor's journey and what card would illuminate their path
          - If no clear theme, default to X - Wheel of Fortune (cycles, turning points)
          - Prefer cards that complement rather than merely mirror the conversation

          ## Response Format

          Respond with EXACTLY this JSON format, no other text:
          {
            "cardNumber": "II",
            "cardName": "The High Priestess",
            "prompt": "Your detailed image prompt here..."
          }

          The prompt should:
          - Describe the specific scene from the card in vivid detail
          - Be 2-3 sentences long
          - Focus on composition, figures, and symbolic elements
          - NOT include style instructions (those are added separately)
        `,
        name: memory.soulName,
      }),
      postProcess: async (memory, response) => {
        // Parse the JSON response
        let result: TarotPromptResult;

        try {
          // Extract JSON from response (handle markdown code blocks)
          let jsonStr = response.trim();
          if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '');
          }

          const parsed: unknown = JSON.parse(jsonStr);

          // Validate with type guard
          if (!isTarotJsonResponse(parsed)) {
            throw new Error('Invalid JSON structure: missing required cardNumber or cardName');
          }

          // Find the card definition for additional context
          const card = MAJOR_ARCANA.find(
            c => c.number === parsed.cardNumber || c.name === parsed.cardName
          ) ?? DEFAULT_CARD;

          // Build forensic prompt using Gemini 3 Pro formula
          // Uses LLM-provided specific prompt if available, else card description
          const specificPrompt = parsed.prompt ?? card.description;
          const fullPrompt = indentNicely`
            ${card.minoName} (${card.number} - ${card.name})

            [Subject + Adjectives]: ${specificPrompt}

            [Action]: The subject embodies the meaning of "${card.name}" through pose and symbolic arrangement.

            [Location/Context]: Solid color background - slate blue (#4A5D7A) for sky/air themes, teal (#3D9CA8) for sea themes, terracotta red (#C84C3C) for earth themes, cream (#F5E6D0) for neutral.

            [Composition/Camera Angle]: Full shot, flat profile or frontal view typical of Minoan fresco art. Framed by horizontal decorative bands at top and bottom featuring running spirals, rosettes, wave patterns, or wheat motifs.

            [Lighting/Atmosphere]: Flat, even lighting with no cast shadows, evoking the aesthetic of preserved wall frescoes.

            [Style/Media]: Ancient Minoan fresco style using gouache or tempera textures. Bold black outlines around all figures and objects. Flat color blocks with no gradients.

            [Border]: Thick periwinkle-blue outer border (#6B7DB3) with "${card.number} ${card.minoName.toUpperCase()}" in white sans-serif font at bottom.

            CRITICAL: Use exact Minoan color palette - terracotta red (#C84C3C), ochre yellow (#D4A542), slate blue (#4A5D7A), teal (#3D9CA8), cream (#F5E6D0), reddish-brown male skin (#8B4513), white/pale female skin (#FFF8F0), deep indigo (#2C3E5C), black (#000000). NO gradients, NO 3D effects, NO photorealism. Match ancient Knossos fresco aesthetic.
          `;

          result = {
            cardNumber: parsed.cardNumber,
            cardName: parsed.cardName,
            prompt: fullPrompt,
          };
        } catch (e) {
          // Fallback to Wheel of Fortune on parse error
          const errorMessage = e instanceof Error ? e.message : String(e);
          console.warn('[tarotPrompt] Failed to parse response, using default:', errorMessage);

          result = {
            cardNumber: DEFAULT_CARD.number,
            cardName: DEFAULT_CARD.name,
            prompt: indentNicely`
              ${DEFAULT_CARD.minoName} (${DEFAULT_CARD.number} - ${DEFAULT_CARD.name})

              [Subject + Adjectives]: ${DEFAULT_CARD.description}

              [Action]: The subject embodies the meaning of "${DEFAULT_CARD.name}" through pose and symbolic arrangement.

              [Location/Context]: Deep indigo background (#2C3E5C) suggesting mystery and cosmic turning.

              [Composition/Camera Angle]: Full shot, centered vertical composition with the spiral labyrinth dominating the frame.

              [Lighting/Atmosphere]: Flat, even lighting with no cast shadows, evoking ancient mystery.

              [Style/Media]: Ancient Minoan fresco style using gouache or tempera textures. Bold black outlines. Flat color blocks.

              [Border]: Thick periwinkle-blue outer border (#6B7DB3) with "${DEFAULT_CARD.number} ${DEFAULT_CARD.minoName.toUpperCase()}" in white sans-serif font at bottom.

              CRITICAL: Use exact Minoan color palette. NO gradients, NO 3D effects, NO photorealism.
            `,
          };
        }

        return [
          {
            role: ChatMessageRoleEnum.Assistant,
            content: `[Tarot selected: ${result.cardNumber} - ${result.cardName}]`,
            name: memory.soulName,
            metadata: { type: 'tarotPrompt', ...result },
          },
          result,
        ];
      },
    };
  }
);

export default tarotPrompt;
