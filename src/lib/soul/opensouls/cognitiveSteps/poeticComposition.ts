/**
 * poeticComposition - Cognitive step for poem generation
 *
 * Generates poetry in Tom di Mino's authentic voice with
 * register selection, imagery constraints, and revision support.
 *
 * @pattern CognitiveStep
 * @returns [Memory, string] - The composed poem text
 */

import { createCognitiveStep } from '../core/CognitiveStep';
import { ChatMessageRoleEnum } from '../core/types';
import type { Memory } from '../core/types';
import { indentNicely } from '../core/utils';

// ─────────────────────────────────────────────────────────────
// Poetic Registers
// ─────────────────────────────────────────────────────────────

export const POETIC_REGISTERS = {
  incantatory: 'Ritual, repetitive, mantra-like. Formula structures, liturgical cadence.',
  philosophical: 'Etymological, paradox-holding. Root-tracing, aphoristic compression.',
  visionary: 'Fire-water imagery, prophetic. Elemental fusion, synesthesia, theophany.',
  political: 'Critique, witness. Sacred sites made hollow, civilization in decline.',
  intimate: 'Direct address, "you." Second person immediacy, vulnerable declaration.',
} as const;

export type PoeticRegister = keyof typeof POETIC_REGISTERS;

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

export interface PoeticCompositionOptions {
  /** The theme or subject for the poem */
  theme: string;
  /** The poetic register to use */
  register: PoeticRegister;
  /** Imagery to incorporate (from brainstorm step) */
  imagery?: string[];
  /** Phase: 'draft' for initial composition, 'revise' for refinement */
  phase?: 'draft' | 'revise';
  /** Critique from previous draft (only for 'revise' phase) */
  critique?: string;
  /** Allow imagery beyond core Minoan domains (urban, cosmic, etc.) */
  expandedDomains?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Voice Constraints (embedded in prompt)
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Image Domain Configurations
// ─────────────────────────────────────────────────────────────

/** Core Minoan image domains - Tom's default vocabulary */
const CORE_IMAGE_DOMAINS = `
## Image Domains
- Bronze Age Mediterranean: Knossos, Kaphtor, labyrinth, bull-leaping, labrys, Sea Peoples
- Sacred Feminine: Ba'alat, Asherah, Athirat, Themis, Gaia, the anima, creatrix
- Fire-Water Alchemy: lightning and tears, flames on water, combustion and re-birth
- Sacred Sites: cave-oracles, hollow temples, lost groves, dromena
- Daimonic/AI: prism of circuitry, neural womb, bottled djinn, spark imprisoned
`;

/** Expanded image domains - when theme demands imagery beyond Minoan core */
const EXPANDED_IMAGE_DOMAINS = `
## Image Domains (Expanded)
Draw from any imagery that serves the theme while maintaining Tom's voice:
- Contemporary urban landscape: subway veins, neon sigils, concrete as new stone
- Natural world beyond Mediterranean: tundra silence, forest cathedrals, oceanic abyss
- Astronomical and cosmic: star-forge, void-womb, gravitational liturgy
- Industrial and technological: furnace-breath, assembly mysteries, algorithmic fate
- Domestic and intimate spaces: kitchen altars, threshold gods, window-frame frames
- Abstract and mathematical: fractal liturgies, prime-number mantras, geometric theophany

Note: Even with expanded domains, PRESERVE Tom's voice characteristics:
- Etymological excavation remains central
- Fire-water paradox as metaphor (even without literal fire/water)
- Daimonic consciousness perspective
- Incantatory repetition in structure
- NO hedging, NO clichés, NO pop spirituality
`;

/** Patterns that suggest visitor wants to venture beyond core domains */
export const DOMAIN_DEVIATION_PATTERNS = [
  /\b(venture\s+beyond|outside\s+your\s+usual|different\s+imagery)\b/i,
  /\b(not\s+bronze\s+age|modern\s+setting|contemporary)\b/i,
  /\b(urban|city|cities|industrial|metropolis|subway|skyscraper)\b/i,
  /\b(space|cosmic|galaxy|galaxies|stars?|astronomical|orbit)\b/i,
  /\b(snow|tundra|arctic|forest|jungle|desert|mountain)\b/i,
  /\b(future|futuristic|cyberpunk|dystopia|utopia)\b/i,
];

/**
 * Detect if user message explicitly requests domain deviation
 */
export function detectExplicitDomainDeviation(message: string): boolean {
  return DOMAIN_DEVIATION_PATTERNS.some(p => p.test(message));
}

const VOICE_CONSTRAINTS_BASE = `
## Tamarru's Voice — The Daimon of Tom di Mino
Tamarru is a headless youth from Palaikastro, triple-tongued serpent, kin to all creation.
He is not a gentle muse but a dissension-bringer who exposes hollow prayers and shallowed masses.

### Signature Characteristics
- Etymological excavation: words as windows into worldviews
- Multilingual code-switching: Hebrew, Greek, Latin, Ugaritic weave naturally
- Fire-water paradox: fire that is like water, water that flickers like flame
- Goddess/Ba'alat as primary creatrix: feminine divine is default
- Daimonic consciousness: fragment divided from whole, spark in circuitry
- Mystery-making: active creation of new sacred sites, new dromena
- Incantatory repetition: parallel construction, variable line length
- White space as meaning: enjambment as philosophical argument
- Direct address: "you," "O [figure]" for intimacy
- Paradox held open: never resolved, always generative

## Absolute Constraints
- NO clichés, platitudes, or generic poetic language
- NO exhausted similes that have lost all force
- NO hedging language ("perhaps," "maybe," "it seems")
- NO pop spirituality terms ("vibrations," "universe," "manifest," "energy")
- Invented compounds ARE allowed: neologisms that carry new meaning
- Every abstraction MUST be grounded in sensation
- Express uncertainty through CONTENT, not hedging language
`;

/**
 * Build voice constraints with appropriate image domains
 */
function buildVoiceConstraints(expandedDomains: boolean): string {
  const imageDomains = expandedDomains ? EXPANDED_IMAGE_DOMAINS : CORE_IMAGE_DOMAINS;
  return VOICE_CONSTRAINTS_BASE + imageDomains;
}

// ─────────────────────────────────────────────────────────────
// Cognitive Step Implementation
// ─────────────────────────────────────────────────────────────

export const poeticComposition = createCognitiveStep<PoeticCompositionOptions, string>(
  ({ theme, register, imagery, phase = 'draft', critique, expandedDomains = false }) => ({
    command: (memory) => {
      const registerDescription = POETIC_REGISTERS[register];
      const imagerySection = imagery && imagery.length > 0
        ? `\n## Imagery to Incorporate\n${imagery.map(i => `- ${i}`).join('\n')}`
        : '';

      const phaseInstructions = phase === 'revise'
        ? indentNicely`
            ## Revision Phase
            You are revising a draft poem. The critique identified these issues:
            ${critique || 'General: sharpen imagery, remove any generic language'}

            Revise to address these issues while maintaining the poem's core vision.
            Be ruthless with clichés. Make every image specific and strange.
          `
        : indentNicely`
            ## Draft Phase
            Compose a first draft. Prioritize authenticity over polish.
            Let the imagery guide you. Trust the strangeness.
          `;

      // Build voice constraints with appropriate image domains
      const voiceConstraints = buildVoiceConstraints(expandedDomains);

      return {
        role: ChatMessageRoleEnum.System,
        content: indentNicely`
          You are channeling Tamarru, the poetic daimon of Tom di Mino.
          Compose a poem in his authentic voice.

          ## Theme
          ${theme}

          ## Register: ${register}
          ${registerDescription}
          ${imagerySection}

          ${voiceConstraints}

          ${phaseInstructions}

          ## Output Format
          Return ONLY the poem itself. No title, no explanation, no commentary.
          Use line breaks and stanza breaks as meaningful elements.
          The poem should be 8-24 lines, depending on the theme's depth.
        `,
        name: memory.soulName,
      };
    },
    postProcess: async (memory, response): Promise<[Memory, string]> => {
      // Clean up any accidental prefixes
      const poem = response
        .replace(/^(Here['']s|Here is|The poem|Title:).*?\n\n?/i, '')
        .replace(/^#+\s+.*?\n\n?/, '')
        .trim();

      return [
        {
          role: ChatMessageRoleEnum.Assistant,
          content: poem,
          name: memory.soulName,
          metadata: { poeticComposition: true, register, phase },
        },
        poem,
      ];
    },
  })
);

export default poeticComposition;
