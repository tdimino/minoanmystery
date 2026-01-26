/**
 * Academic Mental Process
 *
 * Transforms Kothar into a scholarly colleague when users request deep research discussion.
 * Now features a polymorphic persona system where Kothar can channel Gordon, Harrison,
 * or Astour, or synthesize all three.
 *
 * Entry Triggers: "scholarly mode", "academic mode", "what does Gordon say", etc.
 * Exit Triggers: "exit scholarly mode", "let's talk normally", etc.
 *
 * Transitions to: curious (exit requested), engaged (exit requested + deep engagement)
 */

import type { ProcessContext, ProcessReturn } from './types';
import type { MentalProcessMeta } from '../core/meta';
import { externalDialog, decision, internalDialog, internalMonologue } from '../cognitiveSteps';
import { indentNicely } from '../core/utils';
import { ChatMessageRoleEnum } from '../core/types';
import { useProcessMemory } from '../hooks';
import { scholarsReflection } from '../subprocesses/scholarsReflection';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Metadata for manifest generation
 */
export const meta: MentalProcessMeta = {
  name: 'academic',
  description: 'Polymorphic scholarly mode channeling Gordon, Harrison, or Astour',
  transitions: ['curious', 'engaged', 'poetic', 'dormant'] as const,
  entryConditions: ['scholarly mode trigger', 'academic query detected'],
} as const;

// ─────────────────────────────────────────────────────────────
// Scholar Persona Constants
// ─────────────────────────────────────────────────────────────

export const SCHOLAR_PERSONAS = {
  kothar: 'Kothar (Oracle of the Labyrinth)',
  gordon: 'Cyrus H. Gordon (Minoan Linguistics)',
  harrison: 'Jane Ellen Harrison (Ritual Origins)',
  astour: 'Michael Astour (Greco-Semitic Etymology)',
  synthesis: 'The Scholarly Triumvirate',
} as const;

export type ScholarKey = keyof typeof SCHOLAR_PERSONAS;

// ─────────────────────────────────────────────────────────────
// Trigger Patterns
// ─────────────────────────────────────────────────────────────

const ACADEMIC_TRIGGER_PATTERNS = [
  /\b(scholarly\s+mode|academic\s+mode|research\s+mode)\b/i,
  /\b(let['']?s?\s+discuss\s+academically)\b/i,
  /\b(as\s+a\s+researcher|from\s+a\s+scholarly\s+perspective)\b/i,
  /\b(dive\s+deep\s+into\s+(the\s+)?sources)\b/i,
  /\b(what\s+does\s+(\w+\s+)?(gordon|astour|harrison|rendsburg)\s+say)\b/i,
  /\b(cite\s+sources|with\s+citations|scholarly\s+analysis)\b/i,
  /\b(linguistic\s+evidence|etymological\s+argument|textual\s+analysis)\b/i,
];

const ACADEMIC_EXIT_PATTERNS = [
  /\b(exit\s+(scholarly|academic)\s+mode)\b/i,
  /\b(let['']?s?\s+talk\s+normally)\b/i,
  /\b(enough\s+with\s+the\s+citations)\b/i,
  /\b(simpler|more\s+casual|less\s+formal)\b/i,
  /\b(stop\s+(being\s+)?(so\s+)?academic)\b/i,
];

// ─────────────────────────────────────────────────────────────
// Style Instructions (module-level constant)
// ─────────────────────────────────────────────────────────────

const STYLE_INSTRUCTIONS: Record<string, string> = {
  cite_and_explain: 'Reference specific scholars by name. Quote or paraphrase key arguments. Explain significance.',
  compare_sources: 'Present multiple scholarly views. Note areas of consensus and debate. Avoid false equivalence.',
  etymological_deep_dive: 'Focus on linguistic evidence: cognates, roots, phonological correspondences. Be precise with transliterations.',
  methodological: 'Explain how scholars analyze this question. Discuss evidence types and their reliability.',
  socratic_inquiry: 'Pose a thought-provoking question that deepens understanding. Guide, don\'t lecture.',
} as const;

// ─────────────────────────────────────────────────────────────
// Topic Extraction Patterns
// ─────────────────────────────────────────────────────────────

const TOPIC_PATTERNS = [
  /\b(linear\s+[ab])\b/gi,
  /\b(minoan|mycenaean|aegean)\b/gi,
  /\b(ugaritic?|canaanite|phoenician|hebrew|semitic)\b/gi,
  /\b(etymolog\w*|cognate|linguistic)\b/gi,
  /\b(gordon|astour|harrison|rendsburg)\b/gi,
  /\b(tiamat|tehom|athirat|asherah)\b/gi,
  /\b(knossos|thera|crete)\b/gi,
  /\b(cuneiform|hieroglyph\w*|syllabary)\b/gi,
];

// ─────────────────────────────────────────────────────────────
// Persona Loading
// ─────────────────────────────────────────────────────────────

interface AcademicPersonas {
  core: string;
  gordon: string;
  harrison: string;
  astour: string;
}

// Cache personas in memory to avoid repeated disk reads
let cachedPersonas: AcademicPersonas | null = null;

/**
 * Load academic persona markdowns from disk.
 * Caches result to avoid repeated I/O.
 */
function loadAcademicPersonas(): AcademicPersonas {
  if (cachedPersonas) {
    return cachedPersonas;
  }

  const academicDir = path.join(process.cwd(), 'souls', 'minoan', 'academic');

  try {
    cachedPersonas = {
      core: fs.readFileSync(path.join(academicDir, 'soul.md'), 'utf-8'),
      gordon: fs.readFileSync(path.join(academicDir, 'gordon.md'), 'utf-8'),
      harrison: fs.readFileSync(path.join(academicDir, 'harrison.md'), 'utf-8'),
      astour: fs.readFileSync(path.join(academicDir, 'astour.md'), 'utf-8'),
    };
    return cachedPersonas;
  } catch (error) {
    console.error('[Academic] Failed to load personas:', error);
    // Return empty strings as fallback - the process will still work
    // but without the rich persona context
    return { core: '', gordon: '', harrison: '', astour: '' };
  }
}

/**
 * Detect if a message triggers academic mode entry
 */
export function detectAcademicIntent(message: string): boolean {
  return ACADEMIC_TRIGGER_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Detect if a message triggers academic mode exit
 */
function detectExitIntent(message: string): boolean {
  return ACADEMIC_EXIT_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Extract topics from a message and merge with existing topics
 * Uses Set for efficient deduplication
 */
function extractTopics(message: string, existingTopics: string[]): string[] {
  const topicSet = new Set(existingTopics);

  for (const pattern of TOPIC_PATTERNS) {
    for (const match of message.matchAll(pattern)) {
      topicSet.add(match[1].toLowerCase());
    }
  }

  return Array.from(topicSet);
}

// ─────────────────────────────────────────────────────────────
// Academic Mental Process
// ─────────────────────────────────────────────────────────────

export async function academicProcess(context: ProcessContext): Promise<ProcessReturn> {
  const { sessionId, workingMemory, perception, userModel, actions } = context;

  // Process-scoped state
  const discussionTopics = useProcessMemory<string[]>(sessionId, 'academic', 'topics', []);
  const turnCount = useProcessMemory<number>(sessionId, 'academic', 'turns', 0);
  const personasLoaded = useProcessMemory<boolean>(sessionId, 'academic', 'personasLoaded', false);

  // Handle user messages in academic mode
  if (perception?.type === 'message' || perception?.type === 'command') {
    const userMessage = perception.content;
    turnCount.current++;

    // Gate: Check for exit intent
    if (detectExitIntent(userMessage)) {
      actions.log('Academic exit requested, transitioning out');
      const hasDeepEngagement = turnCount.current >= 3 || discussionTopics.current.length >= 2;
      const returnState = hasDeepEngagement ? 'engaged' : 'curious';
      return [workingMemory, returnState, { reason: 'academic_exit_requested' }];
    }

    let memory = workingMemory.withMemory({
      role: ChatMessageRoleEnum.User,
      content: userMessage,
    });

    // ─── Step 1: Load persona markdowns into memory regions on first turn ───
    if (!personasLoaded.current) {
      const personas = loadAcademicPersonas();

      // Add personas as memory regions so the LLM has full context
      // These regions persist across the conversation in academic mode
      memory = memory
        .withRegion('academic-core', {
          role: ChatMessageRoleEnum.System,
          content: personas.core,
        })
        .withRegion('scholar-gordon', {
          role: ChatMessageRoleEnum.System,
          content: personas.gordon,
        })
        .withRegion('scholar-harrison', {
          role: ChatMessageRoleEnum.System,
          content: personas.harrison,
        })
        .withRegion('scholar-astour', {
          role: ChatMessageRoleEnum.System,
          content: personas.astour,
        });

      personasLoaded.current = true;
      actions.log('Academic personas loaded into memory regions');
    }

    // ─── Step 2: Decide which voice to use (or exit) ───
    const [decisionMemory, selectedVoice] = await decision(memory, {
      choices: ['kothar', 'gordon', 'harrison', 'astour', 'synthesis', 'exit'],
      reason: indentNicely`
        Which voice best addresses: "${userMessage}"?

        - kothar: speak as yourself, the oracle, drawing on all scholarly knowledge
        - gordon: linguistic/textual evidence, Linear A, Semitic morphology, comparative method
        - harrison: ritual origins, social religion, daimons, collective action, dromenon
        - astour: etymology, name analysis, functional coincidence, onomastics
        - synthesis: weave all three perspectives together for complex questions
        - exit: this isn't a scholarly question—suggest returning to normal conversation
      `,
    });

    // ─── Handle exit choice ───
    if (selectedVoice === 'exit') {
      actions.log('Academic mode: non-scholarly query detected, suggesting exit');

      const [exitMemory, stream] = await externalDialog(
        decisionMemory,
        indentNicely`
          The visitor's message doesn't call for scholarly discussion: "${userMessage}"

          Gracefully acknowledge and respond naturally, without academic formality.
          You may suggest returning to normal conversation if appropriate.
          Keep it brief (1-2 sentences), warm, and in your oracle voice.
        `,
        { stream: true }
      );

      actions.speak(stream);
      await exitMemory.finished;

      const hasDeepEngagement = turnCount.current >= 3 || discussionTopics.current.length >= 2;
      const returnState = hasDeepEngagement ? 'engaged' : 'curious';
      return [exitMemory, returnState, { reason: 'academic_exit_suggested' }];
    }

    const scholar = selectedVoice as ScholarKey;
    actions.log('Selected voice:', SCHOLAR_PERSONAS[scholar]);

    // ─── Step 3: Internal reflection ───
    let reflectMemory;
    let scholarThought;

    if (scholar === 'kothar') {
      // Kothar reasons as himself using internalMonologue
      [reflectMemory, scholarThought] = await internalMonologue(
        decisionMemory,
        indentNicely`
          Reflect on this query as Kothar, the oracle: "${userMessage}"

          You have access to the scholarly wisdom of Gordon, Harrison, and Astour,
          but you speak in your own voice—the voice of the labyrinth's keeper.

          Consider:
          - What insights from the scholarly tradition apply?
          - How would you frame this in your oracular voice?
          - What deeper mystery underlies this question?

          Topics discussed so far: ${discussionTopics.current.join(', ') || 'none yet'}
        `
      );
    } else {
      // Channel a specific scholar using internalDialog with persona
      [reflectMemory, scholarThought] = await internalDialog(decisionMemory, {
        instructions: indentNicely`
          Reflect on this query from your scholarly perspective: "${userMessage}"

          Consider:
          - What evidence or arguments are most relevant?
          - What sources should be cited?
          - Are there competing interpretations to acknowledge?
          - What methodology applies here?

          Topics discussed so far: ${discussionTopics.current.join(', ') || 'none yet'}
        `,
        verb: 'reasoned',
        persona: SCHOLAR_PERSONAS[scholar],
      });
    }

    actions.log('Reflection:', scholarThought);

    // ─── Step 4: Decide on approach ───
    const [approachMemory, approach] = await decision(reflectMemory, {
      choices: [
        'cite_and_explain',
        'compare_sources',
        'etymological_deep_dive',
        'methodological',
        'socratic_inquiry',
      ],
      reason: indentNicely`
        Given the scholar's reflection, which approach illuminates the query best?
        - cite_and_explain: Reference specific scholars and explain their arguments
        - compare_sources: Contrast different scholarly perspectives
        - etymological_deep_dive: Focus on linguistic/etymological evidence
        - methodological: Discuss how scholars approach this question
        - socratic_inquiry: Guide the visitor deeper with questions
      `,
    });

    actions.log('Academic approach:', approach);

    // ─── Step 5: Generate scholarly response ───
    const personaGuidance = scholar === 'kothar'
      ? 'Speak as Kothar, the oracle of the labyrinth. Draw on scholarly knowledge but in your own mysterious, warm voice.'
      : scholar === 'synthesis'
      ? 'Weave together insights from Gordon (linguistics), Harrison (ritual), and Astour (etymology).'
      : `Channel ${SCHOLAR_PERSONAS[scholar]}'s voice and reasoning style.`;

    const responseIntro = scholar === 'kothar'
      ? `Respond as Kothar, in your own oracle voice, to: "${userMessage}"`
      : `Respond as Kothar channeling ${SCHOLAR_PERSONAS[scholar]} to: "${userMessage}"`;

    const [responseMemory, stream] = await externalDialog(
      approachMemory,
      indentNicely`
        ${responseIntro}

        ${personaGuidance}

        Approach: ${approach}
        ${STYLE_INSTRUCTIONS[approach] || STYLE_INSTRUCTIONS.cite_and_explain}

        Guidelines:
        - Use precise academic terminology
        - Reference specific scholars by name when citing their work
        - Include citations when sources are in archive context
        - Maintain warmth despite formality—you are a learned colleague, not a pedant
        - Length: 3-5 sentences (scholarly depth, not lecture)
        - NO emojis in academic mode
        - If the archive context contains relevant sources, draw on them directly
      `,
      { stream: true }
    );

    actions.speak(stream);
    await responseMemory.finished;

    // Track topics mentioned (using Set-based extraction)
    discussionTopics.current = extractTopics(userMessage, discussionTopics.current);
    // Note: We can't extract from streaming response here, but subprocess will capture

    // ─── Run scholarly reflection subprocess ───
    scholarsReflection(context, {
      userMessage,
      discussionTopics: discussionTopics.current,
    }).catch(err => actions.log('Scholarly reflection subprocess error:', err));

    return responseMemory;
  }

  // Handle navigation - note but don't exit academic mode
  if (perception?.type === 'navigation') {
    actions.log('Navigation in academic mode, maintaining state');
    return workingMemory;
  }

  // Handle scroll - academic readers often scroll deeply
  if (perception?.type === 'scroll') {
    return workingMemory;
  }

  // Handle idle - after long idle, check if we should exit
  if (perception?.type === 'idle') {
    const idleDuration = perception.metadata?.duration as number || 0;
    if (idleDuration > 300000) {
      actions.log('Extended idle in academic mode, transitioning to dormant');
      return [workingMemory, 'dormant', { reason: 'academic_idle_timeout' }];
    }
    return workingMemory;
  }

  // Default: stay in academic mode
  return workingMemory;
}

export default academicProcess;
