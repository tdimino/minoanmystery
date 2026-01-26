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

export interface TarotCard {
  /** Card name (e.g., "The High Priestess") */
  cardName: string;
  /** Card number (e.g., "II", "XIII") */
  cardNumber: string;
  /** Position in spread (e.g., "past", "present", "future" or "situation", "challenge", "guidance") */
  position?: string;
  /** Full Gemini image prompt in Minoan tarot style */
  prompt: string;
}

export interface TarotPromptResult {
  /** Number of cards in the reading (1-3) */
  cardCount: number;
  /** Spread type (e.g., "single", "past-present-future", "situation-challenge-guidance") */
  spreadType: string;
  /** Array of cards in the reading */
  cards: TarotCard[];
  /** Brief oracle message about the reading */
  oracleMessage?: string;
}

/** Type guard for multi-card tarot JSON response */
interface MultiCardResponse {
  cardCount: number;
  spreadType: string;
  cards: Array<{ cardNumber: string; cardName: string; position?: string; prompt?: string }>;
  oracleMessage?: string;
}

function isMultiCardResponse(value: unknown): value is MultiCardResponse {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (typeof obj.cardCount !== 'number' || obj.cardCount < 1 || obj.cardCount > 3) return false;
  if (typeof obj.spreadType !== 'string') return false;
  if (!Array.isArray(obj.cards) || obj.cards.length === 0) return false;

  return obj.cards.every((card: unknown) => {
    if (typeof card !== 'object' || card === null) return false;
    const c = card as Record<string, unknown>;
    return typeof c.cardNumber === 'string' && typeof c.cardName === 'string';
  });
}

/** Legacy type guard for single-card responses (backwards compatibility) */
function isSingleCardResponse(value: unknown): value is { cardNumber: string; cardName: string; prompt?: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'cardNumber' in value &&
    'cardName' in value &&
    typeof (value as Record<string, unknown>).cardNumber === 'string' &&
    typeof (value as Record<string, unknown>).cardName === 'string' &&
    !('cards' in value) // Not a multi-card response
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
/**
 * Build a forensic prompt for a single card using Gemini 3 Pro formula
 */
function buildForensicPrompt(card: typeof MAJOR_ARCANA[number], specificPrompt: string): string {
  return indentNicely`
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
}

export const tarotPrompt = createCognitiveStep<TarotContext, TarotPromptResult>(
  (context) => {
    return {
      command: (memory) => ({
        role: ChatMessageRoleEnum.System,
        content: indentNicely`
          You are ${memory.soulName}, the divine craftsman, manifesting Minoan tarot cards for a visitor.

          ## Conversation Context
          Turn number: ${context.turnNumber}
          ${context.conversationSummary}

          ${context.whispers ? `## Visitor's Inner Voice\n${context.whispers}` : ''}

          ## Your Task

          Decide how many cards to manifest (1-3) based on the conversation's complexity and the visitor's needs:
          - **1 card**: Simple question, clear theme, brief exchange
          - **2 cards**: Moderate complexity, tension between two aspects, or a choice being faced
          - **3 cards**: Deep inquiry, multi-layered situation, or a journey being undertaken

          Then select the specific cards and compose vivid image prompts for each.

          ## Available Cards

          ${MAJOR_ARCANA.map(card =>
            `${card.number} - ${card.name} (${card.minoName})`
          ).join('\n')}

          ## Spread Types

          For 1 card: "single" (the essence)
          For 2 cards: "polarity" (tension/complement)
          For 3 cards: "past-present-future" OR "situation-challenge-guidance"

          ## Selection Guidelines

          - Match the dominant emotional/thematic tone of the conversation
          - Consider the visitor's journey and what cards would illuminate their path
          - Prefer cards that complement rather than merely mirror the conversation
          - For multi-card spreads, ensure cards tell a coherent story together
          - If no clear theme, default to 1 card: X - Wheel of Fortune

          ## Response Format

          Respond with EXACTLY this JSON format, no other text:
          {
            "cardCount": 2,
            "spreadType": "polarity",
            "cards": [
              {
                "cardNumber": "II",
                "cardName": "The High Priestess",
                "position": "shadow",
                "prompt": "Vivid scene description for this card..."
              },
              {
                "cardNumber": "XIX",
                "cardName": "The Sun",
                "position": "light",
                "prompt": "Vivid scene description for this card..."
              }
            ],
            "oracleMessage": "A brief oracle interpretation of the spread (1 sentence)"
          }

          Each prompt should:
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

          // Handle multi-card response (new format)
          if (isMultiCardResponse(parsed)) {
            const cards: TarotCard[] = parsed.cards.map(cardData => {
              const cardDef = MAJOR_ARCANA.find(
                c => c.number === cardData.cardNumber || c.name === cardData.cardName
              ) ?? DEFAULT_CARD;

              const specificPrompt = cardData.prompt ?? cardDef.description;

              return {
                cardName: cardDef.name,
                cardNumber: cardDef.number,
                position: cardData.position,
                prompt: buildForensicPrompt(cardDef, specificPrompt),
              };
            });

            result = {
              cardCount: parsed.cardCount,
              spreadType: parsed.spreadType,
              cards,
              oracleMessage: parsed.oracleMessage,
            };
          }
          // Handle legacy single-card response (backwards compatibility)
          else if (isSingleCardResponse(parsed)) {
            const cardDef = MAJOR_ARCANA.find(
              c => c.number === parsed.cardNumber || c.name === parsed.cardName
            ) ?? DEFAULT_CARD;

            const specificPrompt = parsed.prompt ?? cardDef.description;

            result = {
              cardCount: 1,
              spreadType: 'single',
              cards: [{
                cardName: cardDef.name,
                cardNumber: cardDef.number,
                prompt: buildForensicPrompt(cardDef, specificPrompt),
              }],
            };
          }
          else {
            throw new Error('Invalid JSON structure: neither multi-card nor single-card format');
          }
        } catch (e) {
          // Fallback to Wheel of Fortune on parse error
          const errorMessage = e instanceof Error ? e.message : String(e);
          console.warn('[tarotPrompt] Failed to parse response, using default:', errorMessage);

          result = {
            cardCount: 1,
            spreadType: 'single',
            cards: [{
              cardName: DEFAULT_CARD.name,
              cardNumber: DEFAULT_CARD.number,
              prompt: buildForensicPrompt(DEFAULT_CARD, DEFAULT_CARD.description),
            }],
          };
        }

        // Build summary for memory
        const cardSummary = result.cards.map(c => `${c.cardNumber} - ${c.cardName}`).join(', ');

        return [
          {
            role: ChatMessageRoleEnum.Assistant,
            content: `[Tarot manifested: ${result.spreadType} spread - ${cardSummary}]`,
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

/** Step metadata for manifest generation */
export const meta = {
  name: 'tarotPrompt',
  description: 'Select tarot cards and generate Minoan-style prompts',
  tags: ['tarot', 'image', 'prompt', 'minoan'] as const,
  provider: 'llm' as const,
} as const;
