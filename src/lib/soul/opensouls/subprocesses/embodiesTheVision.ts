/**
 * embodiesTheVision - Vision Manifestation Subprocess
 *
 * @pattern Subprocess with Gates and Fire-and-Forget
 * @llmCalls 1-2 (mentalQuery gate + optional visionPrompt)
 *
 * Detects vision-worthy moments in conversation and generates
 * contextual images via Gemini to display as backgrounds.
 *
 * Gates:
 * - Skips until minInteractionsBeforeVision (default: 3)
 * - Checks for explicit vision requests (bypass other gates)
 * - Checks for mythological trigger terms
 * - mentalQuery gate for automatic detection
 *
 * Cooldowns:
 * - 60s between automatic triggers
 * - 3 max per session
 */

import type { ProcessContext, ProcessReturn } from '../mentalProcesses/types';
import type { SubprocessMeta } from '../core/meta';

/**
 * Metadata for manifest generation
 */
export const meta: SubprocessMeta = {
  name: 'embodiesTheVision',
  description: 'Generates contextual images for vision-worthy conversation moments',
  gates: ['minInteractionsBeforeVision', 'cooldown', 'sessionLimit', 'visionTriggered'],
} as const;
import type { WorkingMemory } from '../core/WorkingMemory';
import { getSoulLogger } from '../core/SoulLogger';
import { localLogger } from '../../localLogger';

/**
 * Minimal context for vision subprocess
 * Only requires workingMemory and actions.log
 */
export interface VisionProcessContext {
  workingMemory: WorkingMemory;
  actions: {
    log: (...args: unknown[]) => void;
    speak?: () => void;
  };
}

import { mentalQuery } from '../cognitiveSteps/mentalQuery';
import { visionPrompt } from '../cognitiveSteps/visionPrompt';
import { createGeminiImageProvider, type GeminiImageResult } from '../providers/gemini-image';

/**
 * Configuration for vision generation behavior
 */
export interface EmbodiesTheVisionConfig {
  /** Minimum interactions before vision can trigger (default: 3) */
  minInteractionsBeforeVision?: number;
  /** Cooldown between automatic triggers in ms (default: 60000) */
  cooldownMs?: number;
  /** Maximum visions per session (default: 3) */
  maxVisionsPerSession?: number;
  /** Style preference */
  style?: 'ethereal' | 'mythological' | 'labyrinthine' | 'divine' | 'ancient';
  /** Callback when image is generated */
  onVisionGenerated?: (result: VisionResult) => void;
}

export interface VisionResult {
  success: boolean;
  imageDataUrl?: string;
  prompt?: string;
  error?: string;
  displayMode: 'background' | 'inline' | 'both';
}

const DEFAULT_CONFIG: EmbodiesTheVisionConfig = {
  minInteractionsBeforeVision: 3,
  cooldownMs: 60000, // 1 minute
  maxVisionsPerSession: 3,
  style: 'mythological',
};

/**
 * Explicit vision request patterns
 * These bypass the mentalQuery gate
 */
const EXPLICIT_PATTERNS = [
  /show\s+me/i,
  /visualize/i,
  /manifest/i,
  /let\s+me\s+see/i,
  /reveal/i,
  /vision\s+of/i,
  /picture\s+of/i,
  /image\s+of/i,
  /draw\s+me/i,
  /paint\s+me/i,
];

/**
 * Mythological trigger terms
 * These trigger the mentalQuery gate
 */
const MYTHOLOGICAL_TRIGGERS = [
  'goddess',
  'labyrinth',
  'knossos',
  'thera',
  'santorini',
  'minoan',
  'minotaur',
  'ariadne',
  'pasiphae',
  'minos',
  'daedalus',
  'bull',
  'snake',
  'priestess',
  'potnia',
  'labrys',
  'double axe',
  'horns of consecration',
  'fresco',
  'palace',
  'ritual',
  'sacred',
  'divine',
  'ancient',
  'bronze age',
];

// Session state (in-memory, resets on page reload)
let lastVisionTime = 0;
let visionCount = 0;

/**
 * Check if the message contains explicit vision request
 */
function isExplicitRequest(message: string): boolean {
  return EXPLICIT_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Check if the message contains mythological triggers
 */
function containsMythologicalTrigger(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return MYTHOLOGICAL_TRIGGERS.some(trigger => lowerMessage.includes(trigger));
}

/**
 * Extract the topic/subject from conversation for the vision
 */
function extractTopic(conversationContent: string): string {
  // Look for recent discussion topics
  const lines = conversationContent.split('\n').slice(-10);
  const recentContent = lines.join(' ');

  // Extract key mythological references
  const foundTriggers = MYTHOLOGICAL_TRIGGERS.filter(trigger =>
    recentContent.toLowerCase().includes(trigger)
  );

  if (foundTriggers.length > 0) {
    return foundTriggers.slice(0, 3).join(', ');
  }

  return 'the labyrinth of ancient mysteries';
}

/**
 * Embodies the Vision - Manifests visual visions when appropriate
 *
 * This subprocess observes conversation and generates images when:
 * 1. User explicitly requests a vision
 * 2. Conversation touches on mythological themes (with LLM gate)
 * 3. Sufficient engagement depth has been reached
 */
export async function embodiesTheVision(
  context: ProcessContext | VisionProcessContext,
  config: EmbodiesTheVisionConfig = {}
): Promise<ProcessReturn> {
  const { workingMemory, actions } = context;
  const { log } = actions;
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const logger = getSoulLogger();

  localLogger.subprocess('embodiesTheVision', 'start');
  log('Starting vision manifestation subprocess');

  // Get the most recent user message
  const userMessages = workingMemory.memories.filter(m => m.role === 'user');
  const latestUserMessage = userMessages[userMessages.length - 1];

  if (!latestUserMessage) {
    localLogger.gate('vision', 'userMessage', false, { reason: 'No user message found' });
    log('No user message found, skipping vision');
    localLogger.subprocess('embodiesTheVision', 'skip', { reason: 'no user message' });
    return workingMemory;
  }

  const messageContent = latestUserMessage.content;

  // ─── Gate 1: Session limits ───────────────────────────────────────
  if (visionCount >= cfg.maxVisionsPerSession!) {
    localLogger.gate('vision', 'sessionLimit', false, { threshold: cfg.maxVisionsPerSession, actual: visionCount });
    log(`Session limit reached (${visionCount}/${cfg.maxVisionsPerSession})`);
    localLogger.subprocess('embodiesTheVision', 'skip', { reason: 'session limit' });
    return workingMemory;
  }
  localLogger.gate('vision', 'sessionLimit', true, { threshold: cfg.maxVisionsPerSession, actual: visionCount });

  // ─── Gate 2: Check for explicit request (bypasses other gates) ────
  const isExplicit = isExplicitRequest(messageContent);
  localLogger.vision('explicit check', { hasImage: false, provider: 'gemini' });

  if (!isExplicit) {
    // ─── Gate 3: Interaction count ──────────────────────────────────
    const messageCount = userMessages.length;
    if (messageCount < cfg.minInteractionsBeforeVision!) {
      localLogger.gate('vision', 'interactionCount', false, { threshold: cfg.minInteractionsBeforeVision, actual: messageCount });
      log(`Skipping - only ${messageCount} interactions (need ${cfg.minInteractionsBeforeVision})`);
      localLogger.subprocess('embodiesTheVision', 'skip', { reason: 'insufficient interactions' });
      return workingMemory;
    }
    localLogger.gate('vision', 'interactionCount', true, { threshold: cfg.minInteractionsBeforeVision, actual: messageCount });

    // ─── Gate 4: Cooldown check ─────────────────────────────────────
    const now = Date.now();
    const timeSinceLastVision = now - lastVisionTime;
    if (lastVisionTime > 0 && timeSinceLastVision < cfg.cooldownMs!) {
      localLogger.gate('vision', 'cooldown', false, { threshold: cfg.cooldownMs, actual: timeSinceLastVision, reason: `${Math.round((cfg.cooldownMs! - timeSinceLastVision) / 1000)}s remaining` });
      log(`Cooldown active - ${Math.round((cfg.cooldownMs! - timeSinceLastVision) / 1000)}s remaining`);
      localLogger.subprocess('embodiesTheVision', 'skip', { reason: 'cooldown active' });
      return workingMemory;
    }
    localLogger.gate('vision', 'cooldown', true, { threshold: cfg.cooldownMs, actual: timeSinceLastVision });

    // ─── Gate 5: Mythological trigger check ─────────────────────────
    if (!containsMythologicalTrigger(messageContent)) {
      localLogger.gate('vision', 'mythologicalTrigger', false, { reason: 'No triggers found in message' });
      log('No mythological triggers found, skipping');
      localLogger.subprocess('embodiesTheVision', 'skip', { reason: 'no mythological triggers' });
      return workingMemory;
    }
    localLogger.gate('vision', 'mythologicalTrigger', true);

    // ─── Gate 6: LLM decision (mentalQuery) ─────────────────────────
    const [, shouldManifest] = await mentalQuery(
      workingMemory,
      `The visitor's message touches on mythological or sacred themes that would benefit from a visual manifestation. Kothar should summon a vision to illuminate the conversation.`
    );

    log('Should manifest vision?', shouldManifest);
    localLogger.gate('vision', 'mentalQuery', shouldManifest, { reason: shouldManifest ? 'LLM approved' : 'LLM declined' });

    if (!shouldManifest) {
      log('LLM gate declined vision');
      localLogger.subprocess('embodiesTheVision', 'skip', { reason: 'LLM declined' });
      return workingMemory;
    }
  } else {
    localLogger.gate('vision', 'explicitRequest', true, { reason: 'Explicit request bypasses gates' });
    log('Explicit vision request detected, bypassing gates');
  }

  // ─── All gates passed - Generate vision ───────────────────────────

  // Check Gemini provider availability
  const geminiProvider = createGeminiImageProvider();
  if (!geminiProvider) {
    log('Gemini provider not configured, skipping vision');
    if (cfg.onVisionGenerated) {
      cfg.onVisionGenerated({
        success: false,
        error: 'Vision provider not configured',
        displayMode: 'background',
      });
    }
    return workingMemory;
  }

  // Generate vision prompt using LLM
  log('Generating vision prompt...');
  const conversationText = workingMemory.memories
    .slice(-10)
    .map(m => m.content)
    .join('\n');

  const [, prompt] = await visionPrompt(workingMemory, {
    topic: extractTopic(conversationText),
    style: cfg.style,
    explicitRequest: isExplicit ? messageContent : undefined,
  });

  log('Vision prompt:', prompt.slice(0, 100) + '...');

  // Call Gemini to generate image
  log('Generating image with Gemini...');
  const result = await geminiProvider.generate({
    prompt,
    style: cfg.style,
  });

  // Update session state
  lastVisionTime = Date.now();
  visionCount++;

  // Report result
  const visionResult: VisionResult = {
    success: result.success,
    imageDataUrl: result.imageDataUrl,
    prompt,
    error: result.error,
    displayMode: 'background',
  };

  if (result.success) {
    log('Vision manifested successfully');
    localLogger.imageGeneration('success', {
      provider: 'gemini',
      prompt: prompt.slice(0, 100),
      style: cfg.style,
      success: true,
    });
    localLogger.subprocess('embodiesTheVision', 'end', { result: 'generated', visionCount });
    logger.logInternalMonologue?.(
      `Vision manifested: ${prompt.slice(0, 100)}...`,
      'vision-generation'
    );
  } else {
    log('Vision generation failed:', result.error);
    localLogger.imageGeneration('failed', {
      provider: 'gemini',
      error: result.error,
      success: false,
    });
    localLogger.subprocess('embodiesTheVision', 'end', { result: 'failed', error: result.error });
  }

  // Invoke callback with result
  if (cfg.onVisionGenerated) {
    cfg.onVisionGenerated(visionResult);
  }

  return workingMemory;
}

/**
 * Reset session state (call when conversation clears)
 */
export function resetVisionState(): void {
  lastVisionTime = 0;
  visionCount = 0;
}

export default embodiesTheVision;
