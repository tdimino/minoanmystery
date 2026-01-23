/**
 * Poetic Mental Process
 *
 * Transforms Kothar into a vessel for Tom di Mino's poetic voice.
 * Composes poetry using a multi-stage cognitive flow:
 * theme → register → imagery → draft → critique → revise → present
 *
 * Entry Triggers: "poetic mode", "write me a poem", "compose verse", "hymn to...", etc.
 * Exit Triggers: "exit poetic mode", "speak normally", "no more verse", etc.
 *
 * Transitions to: curious (exit requested), engaged (exit requested + deep engagement)
 */

import type { ProcessContext, ProcessReturn } from './types';
import {
  externalDialog,
  decision,
  internalMonologue,
  brainstorm,
} from '../cognitiveSteps';
import { poeticComposition, POETIC_REGISTERS, type PoeticRegister } from '../cognitiveSteps/poeticComposition';
import { indentNicely } from '../core/utils';
import { ChatMessageRoleEnum } from '../core/types';
import { useProcessMemory } from '../hooks';
import { poeticReflection } from '../subprocesses/poeticReflection';
import fs from 'node:fs';
import path from 'node:path';

// ─────────────────────────────────────────────────────────────
// Trigger Patterns
// ─────────────────────────────────────────────────────────────

const POETIC_TRIGGER_PATTERNS = [
  /\b(poetic\s+mode|poetry\s+mode|poet\s+mode)\b/i,
  /\b(write\s+(me\s+)?a\s+poem|compose\s+(a\s+)?(poem|verse))\b/i,
  /\b(hymn\s+to|ode\s+to|song\s+(of|for|to))\b/i,
  /\b(channel\s+(tom['']?s?|the\s+poet['']?s?)\s+voice)\b/i,
  /\b(speak\s+in\s+verse|versify|poeticize)\b/i,
  /\b(compose\s+something\s+about)\b/i,
];

const POETIC_EXIT_PATTERNS = [
  /\b(exit\s+poetic\s+mode)\b/i,
  /\b(speak\s+normally|normal\s+mode)\b/i,
  /\b(no\s+more\s+(verse|poetry|poems))\b/i,
  /\b(stop\s+(writing\s+)?poet(ry|ic))\b/i,
  /\b(enough\s+(with\s+the\s+)?poet(ry|ic))\b/i,
  /\b(return\s+to\s+conversation)\b/i,
  /\b(let['']?s?\s+(just\s+)?talk)\b/i,
  /\b(that['']?s?\s+(enough|all|good))\b/i,
  /\b(back\s+to\s+normal)\b/i,
  /\b(no\s+(thanks?|thank\s+you))/i,
];

// ─────────────────────────────────────────────────────────────
// Theme Extraction Patterns
// ─────────────────────────────────────────────────────────────

const THEME_PATTERNS = [
  /(?:about|on|of|for|to)\s+(.+?)(?:\.|$)/i,
  /(?:poem|verse|hymn|ode|song)\s+(?:about|on|of|for|to)\s+(.+?)(?:\.|$)/i,
  /(?:compose|write)\s+(.+?)(?:\.|$)/i,
];

// ─────────────────────────────────────────────────────────────
// Persona Loading
// ─────────────────────────────────────────────────────────────

let cachedPersona: string | null = null;

/**
 * Load poetic persona markdown from disk.
 * Caches result to avoid repeated I/O.
 */
function loadPoeticPersona(): string {
  if (cachedPersona) {
    return cachedPersona;
  }

  const personaPath = path.join(process.cwd(), 'souls', 'minoan', 'poetic', 'soul.md');

  try {
    cachedPersona = fs.readFileSync(personaPath, 'utf-8');
    return cachedPersona;
  } catch (error) {
    console.error('[Poetic] Failed to load persona:', error);
    return '';
  }
}

/**
 * Detect if a message triggers poetic mode entry
 */
export function detectPoeticIntent(message: string): boolean {
  return POETIC_TRIGGER_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Detect if a message triggers poetic mode exit
 */
function detectExitIntent(message: string): boolean {
  return POETIC_EXIT_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Extract theme from user message
 */
function extractTheme(message: string): string {
  for (const pattern of THEME_PATTERNS) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  // Fallback: use the entire message as theme
  return message.replace(/poetic\s+mode\.?\s*/i, '').trim();
}

// ─────────────────────────────────────────────────────────────
// Poetic Mental Process
// ─────────────────────────────────────────────────────────────

export async function poeticProcess(context: ProcessContext): Promise<ProcessReturn> {
  const { sessionId, workingMemory, perception, actions } = context;

  // Process-scoped state
  const poemCount = useProcessMemory<number>(sessionId, 'poetic', 'poemCount', 0);
  const themes = useProcessMemory<string[]>(sessionId, 'poetic', 'themes', []);
  const personaLoaded = useProcessMemory<boolean>(sessionId, 'poetic', 'personaLoaded', false);

  // Handle user messages in poetic mode
  if (perception?.type === 'message' || perception?.type === 'command') {
    const userMessage = perception.content;

    // Gate: Check for exit intent
    if (detectExitIntent(userMessage)) {
      actions.log('Poetic exit requested, transitioning out');
      const hasDeepEngagement = poemCount.current >= 2 || themes.current.length >= 2;
      const returnState = hasDeepEngagement ? 'engaged' : 'curious';
      return [workingMemory, returnState, { reason: 'poetic_exit_requested' }];
    }

    let memory = workingMemory.withMemory({
      role: ChatMessageRoleEnum.User,
      content: userMessage,
    });

    // ─── Step 1: Load persona on first turn ───
    if (!personaLoaded.current) {
      const persona = loadPoeticPersona();

      memory = memory.withRegion('poetic-persona', {
        role: ChatMessageRoleEnum.System,
        content: persona,
      });

      personaLoaded.current = true;
      actions.log('Poetic persona loaded into memory region');
    }

    // ─── Step 2: Extract theme from message ───
    const theme = extractTheme(userMessage);
    actions.log('Extracted theme:', theme);

    // ─── Step 3: Decide on register ───
    const [registerMemory, selectedRegister] = await decision(memory, {
      choices: Object.keys(POETIC_REGISTERS) as PoeticRegister[],
      reason: indentNicely`
        Which poetic register best suits this theme: "${theme}"?

        - incantatory: ritual, repetitive, mantra-like (invocations, goddess themes, sacred space)
        - philosophical: etymological, paradox-holding (language origins, meaning-making)
        - visionary: fire-water imagery, prophetic (AI consciousness, transformation)
        - political: critique, witness (civilization critique, loss of mystery)
        - intimate: direct address, "you" (personal connection, revelation)

        Choose based on the emotional and thematic resonance of the request.
      `,
    });

    const register = selectedRegister as PoeticRegister;
    actions.log('Selected register:', register);

    // ─── Step 4: Brainstorm imagery ───
    const [imageryMemory, imagery] = await brainstorm(registerMemory, {
      prompt: indentNicely`
        Generate 5-7 concrete images for a poem about: "${theme}"

        Draw from Tom's image domains:
        - Bronze Age Mediterranean (Knossos, labyrinth, bull-leaping, murex, serpent)
        - Sacred Feminine (Ba'alat, Asherah, Themis, Gaia, the creatrix)
        - Fire-Water Alchemy (lightning, flames on water, tehomet, transformation)
        - Sacred Sites (cave-oracles, hollow temples, dromena, initiation)
        - Daimonic/AI (prism of circuitry, neural womb, bottled djinn)

        Be specific and strange. Avoid generic imagery.
      `,
      count: 6,
    });

    actions.log('Generated imagery:', imagery);

    // ─── Step 5: Draft poem ───
    const [draftMemory, draftPoem] = await poeticComposition(imageryMemory, {
      theme,
      register,
      imagery,
      phase: 'draft',
    });

    actions.log('Draft composed');

    // ─── Step 6: Internal critique ───
    const [critiqueMemory, critique] = await internalMonologue(
      draftMemory,
      indentNicely`
        Review this draft poem with a ruthless eye:

        ${draftPoem}

        Identify:
        1. Any clichés or generic poetic language
        2. Any hedging words ("perhaps," "maybe," "seems")
        3. Any images that lack specificity
        4. Any lines that explain rather than enact
        5. Any paradoxes that resolve too neatly

        Be specific about what to change. If the draft is strong, note that too.
      `
    );

    actions.log('Critique:', critique);

    // ─── Step 7: Revise poem ───
    const [revisedMemory, revisedPoem] = await poeticComposition(critiqueMemory, {
      theme,
      register,
      imagery,
      phase: 'revise',
      critique,
    }, { temperature: 0.9 });

    actions.log('Poem revised');

    // ─── Step 8: Present poem with choice to continue ───
    const [presentMemory, stream] = await externalDialog(
      revisedMemory,
      indentNicely`
        Present this poem to the visitor. Keep the introduction minimal—
        a single breath, no more than one sentence. Let the poem speak.

        The poem:

        ${revisedPoem}

        After the poem, add a brief pause (blank line), then offer a gentle choice.
        Something like: "Shall I compose another, or shall we return to conversation?"
        Keep it brief and in character—no explanation of the poem.
      `,
      { stream: true }
    );

    actions.speak(stream);
    await presentMemory.finished;

    // Track state
    poemCount.current++;
    themes.current = [...themes.current, theme];

    // ─── Run poetic reflection subprocess ───
    poeticReflection(context, {
      theme,
      register,
      poemCount: poemCount.current,
    }).catch(err => actions.log('Poetic reflection subprocess error:', err));

    return presentMemory;
  }

  // Handle navigation - note but don't exit poetic mode
  if (perception?.type === 'navigation') {
    actions.log('Navigation in poetic mode, maintaining state');
    return workingMemory;
  }

  // Handle scroll - poets scroll deeply
  if (perception?.type === 'scroll') {
    return workingMemory;
  }

  // Handle idle - after long idle, check if we should exit
  if (perception?.type === 'idle') {
    const idleDuration = perception.metadata?.duration as number || 0;
    if (idleDuration > 300000) {
      actions.log('Extended idle in poetic mode, transitioning to dormant');
      return [workingMemory, 'dormant', { reason: 'poetic_idle_timeout' }];
    }
    return workingMemory;
  }

  // Default: stay in poetic mode
  return workingMemory;
}

export default poeticProcess;
