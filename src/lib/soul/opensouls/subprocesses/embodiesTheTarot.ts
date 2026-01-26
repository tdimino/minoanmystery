/**
 * embodiesTheTarot - Minoan Tarot Generation Subprocess
 *
 * @pattern Subprocess with Turn-Based Gates and Fire-and-Forget
 * @llmCalls 1-2 (tarotPrompt + image generation)
 *
 * Generates a Minoan tarot card every N conversation turns,
 * displaying it as a background behind the chat for a duration.
 *
 * Gates:
 * - Turn interval check (default: every 10 turns)
 * - Session limit (max 3 tarots per session)
 * - Provider availability (Gemini API key configured)
 *
 * Style:
 * - 7-color Minoan flat-color palette
 * - Egyptian-style poses (frontal torso, profile face)
 * - 3:4 portrait aspect ratio for tarot proportions
 */

import type { ProcessContext, ProcessReturn } from '../mentalProcesses/types';
import type { SubprocessMeta } from '../core/meta';

/**
 * Metadata for manifest generation
 */
export const meta: SubprocessMeta = {
  name: 'embodiesTheTarot',
  description: 'Generates Minoan tarot cards at turn intervals',
  serverOnly: true,
  gates: ['turnInterval', 'sessionLimit', 'providerAvailability'],
} as const;
import type { WorkingMemory } from '../core/WorkingMemory';
import type { SoulMemoryInterface } from '../../memory';
import { getSoulLogger } from '../core/SoulLogger';
import { tarotPrompt, type TarotPromptResult } from '../cognitiveSteps/tarotPrompt';
import { createGeminiImageProvider, type GeminiImageResult } from '../providers/gemini-image';
import { loadMinoanReferenceImages } from '../providers/reference-images.server';
import { localLogger } from '../../localLogger';

/**
 * Minimal context for tarot subprocess
 * Requires workingMemory, actions.log, and soulMemory for session state
 */
export interface TarotProcessContext {
  workingMemory: WorkingMemory;
  soulMemory: SoulMemoryInterface;
  actions: {
    log: (...args: unknown[]) => void;
    speak?: () => void;
  };
}

/**
 * Configuration for tarot generation behavior
 */
export interface EmbodiesTheTarotConfig {
  /** Interval in turns between tarot generation (default: 10) */
  turnInterval?: number;
  /** Display duration in ms (default: 30000 = 30s) */
  displayDuration?: number;
  /** Maximum tarots per session (default: 3) */
  maxTarotsPerSession?: number;
  /** Callback when gates pass and generation is starting (for placeholder) */
  onPlaceholder?: (info: { message: string; cardCount: number; spreadType: string }) => void;
  /** Callback when a single tarot card is generated (called for each card) */
  onCardGenerated?: (result: TarotCardResult, index: number, total: number) => void;
  /** Callback when all tarot cards are generated */
  onTarotGenerated?: (result: TarotResult) => void;
}

/** Result for a single generated card */
export interface TarotCardResult {
  success: boolean;
  imageDataUrl?: string;
  cardName: string;
  cardNumber: string;
  position?: string;
  prompt: string;
  error?: string;
}

/** Result for the complete tarot reading */
export interface TarotResult {
  success: boolean;
  cardCount: number;
  spreadType: string;
  cards: TarotCardResult[];
  oracleMessage?: string;
  error?: string;
  duration: number;
}

const DEFAULT_CONFIG: EmbodiesTheTarotConfig = {
  turnInterval: 10,
  displayDuration: 30000, // 30 seconds
  maxTarotsPerSession: 3,
};

/**
 * Extract a summary of recent conversation for thematic analysis
 */
function extractConversationSummary(memory: WorkingMemory): string {
  const messages = memory.memories.filter(
    m => m.role === 'user' || m.role === 'assistant'
  );

  // Get last 10 messages
  const recent = messages.slice(-10);

  if (recent.length === 0) {
    return 'The conversation has just begun.';
  }

  // Build a concise summary
  const lines = recent.map(m => {
    const role = m.role === 'user' ? 'Visitor' : 'Kothar';
    const content = (m.content as string).slice(0, 150);
    return `${role}: "${content}${m.content.length > 150 ? '...' : ''}"`;
  });

  return lines.join('\n');
}

// Note: countUserMessages(workingMemory) was removed in favor of
// soulMemory.getUserTurnCount() as the source of truth.
// WorkingMemory can be transformed by RAG and cognitive steps,
// making it unreliable for turn counting.

/**
 * Embodies the Tarot - Manifests Minoan tarot cards at turn intervals
 *
 * This subprocess fires every N turns to generate a thematically
 * appropriate tarot card as a background manifestation.
 */
export async function embodiesTheTarot(
  context: ProcessContext | TarotProcessContext,
  config: EmbodiesTheTarotConfig = {}
): Promise<ProcessReturn> {
  const { workingMemory, actions } = context;
  const soulMemory = 'soulMemory' in context ? context.soulMemory : undefined;
  const { log } = actions;
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const logger = getSoulLogger();

  localLogger.subprocess('embodiesTheTarot', 'start');
  log('[Tarot] Starting tarot manifestation subprocess');

  // Require soulMemory for session state tracking
  if (!soulMemory) {
    localLogger.gate('tarot', 'soulMemory', false, { reason: 'No soulMemory provided' });
    log('[Tarot] No soulMemory provided, skipping (session state required)');
    return workingMemory;
  }

  // Get session state from soulMemory
  const tarotCount = soulMemory.getTarotCount();
  const lastTarotTurn = soulMemory.getLastTarotTurn();
  const userMessageCount = soulMemory.getUserTurnCount();

  // Log comprehensive gate check data
  localLogger.tarotGateCheck({
    userTurnCount: userMessageCount,
    turnInterval: cfg.turnInterval!,
    moduloResult: userMessageCount % cfg.turnInterval!,
    lastTarotTurn,
    tarotCount,
    maxTarots: cfg.maxTarotsPerSession!,
    shouldTrigger: userMessageCount > 0 && userMessageCount % cfg.turnInterval! === 0 && userMessageCount !== lastTarotTurn,
  });

  // ─── Gate 1: Session limit ───────────────────────────────────────
  if (tarotCount >= cfg.maxTarotsPerSession!) {
    localLogger.gate('tarot', 'sessionLimit', false, { threshold: cfg.maxTarotsPerSession, actual: tarotCount });
    log(`[Tarot] Session limit reached (${tarotCount}/${cfg.maxTarotsPerSession})`);
    localLogger.subprocess('embodiesTheTarot', 'skip', { reason: 'session limit' });
    return workingMemory;
  }
  localLogger.gate('tarot', 'sessionLimit', true, { threshold: cfg.maxTarotsPerSession, actual: tarotCount });

  // ─── Gate 2: Turn interval check ─────────────────────────────────
  // Use soulMemory as source of truth for turn count (not workingMemory)
  // WorkingMemory can be transformed by RAG, cognitive steps, etc.
  const moduloResult = userMessageCount % cfg.turnInterval!;
  const shouldTrigger = userMessageCount > 0 && moduloResult === 0;

  // [Tarot Debug] Detailed gate 2 diagnostics
  log(`[Tarot] Gate 2 check: userMessageCount=${userMessageCount}, interval=${cfg.turnInterval}, modulo=${moduloResult}, lastTarotTurn=${lastTarotTurn}, shouldTrigger=${shouldTrigger}`);

  // Ensure we don't trigger on the same turn twice
  if (userMessageCount === lastTarotTurn) {
    localLogger.gate('tarot', 'duplicateTurn', false, { reason: `Already triggered on turn ${userMessageCount}` });
    log(`[Tarot] Already triggered on turn ${userMessageCount}, skipping`);
    localLogger.subprocess('embodiesTheTarot', 'skip', { reason: 'duplicate turn' });
    return workingMemory;
  }

  if (!shouldTrigger) {
    localLogger.gate('tarot', 'turnInterval', false, { threshold: cfg.turnInterval, actual: userMessageCount, reason: `${userMessageCount} % ${cfg.turnInterval} = ${moduloResult}` });
    log(`[Tarot] Turn ${userMessageCount} - not a tarot turn (interval: ${cfg.turnInterval})`);
    localLogger.subprocess('embodiesTheTarot', 'skip', { reason: 'not a tarot turn' });
    return workingMemory;
  }

  localLogger.gate('tarot', 'turnInterval', true, { threshold: cfg.turnInterval, actual: userMessageCount });
  log(`[Tarot] Turn ${userMessageCount} - TRIGGERING tarot generation (all gates passed)`);

  // ─── Gate 3: Provider availability ─────────────────────────────────
  const geminiProvider = createGeminiImageProvider();
  if (!geminiProvider) {
    log('[Tarot] Gemini provider not configured, skipping');
    if (cfg.onTarotGenerated) {
      cfg.onTarotGenerated({
        success: false,
        cardCount: 0,
        spreadType: 'error',
        cards: [],
        error: 'Tarot provider not configured',
        duration: cfg.displayDuration!,
      });
    }
    return workingMemory;
  }

  // ─── All gates passed - Generate tarot ───────────────────────────

  // NOTE: setLastTarotTurn moved to AFTER successful generation
  // Previously it was here, which consumed the turn even if generation failed

  // Generate tarot prompt using LLM to decide card count and selection
  log('[Tarot] Generating tarot prompt...');
  const conversationSummary = extractConversationSummary(workingMemory);

  // Get visitor whispers for daimonic context (visitorModel omitted for now)
  const visitorWhispers = soulMemory.getVisitorWhispers();

  if (visitorWhispers) {
    log('[Tarot] Including visitor whispers in tarot prompt');
  }

  let tarotResult: TarotPromptResult;
  try {
    const [, result] = await tarotPrompt(workingMemory, {
      conversationSummary,
      turnNumber: userMessageCount,
      whispers: visitorWhispers || undefined,
    });
    tarotResult = result;
    const cardSummary = tarotResult.cards.map(c => `${c.cardNumber} - ${c.cardName}`).join(', ');
    log(`[Tarot] Selected ${tarotResult.cardCount} cards (${tarotResult.spreadType}): ${cardSummary}`);
  } catch (promptError) {
    const errorMessage = promptError instanceof Error ? promptError.message : String(promptError);
    log('[Tarot] Prompt generation failed:', errorMessage);
    if (cfg.onTarotGenerated) {
      cfg.onTarotGenerated({
        success: false,
        cardCount: 0,
        spreadType: 'error',
        cards: [],
        error: 'Failed to generate tarot prompt',
        duration: cfg.displayDuration!,
      });
    }
    return workingMemory;
  }

  // Emit placeholder event with card count (before image generation starts)
  if (cfg.onPlaceholder) {
    cfg.onPlaceholder({
      message: tarotResult.cardCount === 1
        ? 'A card is forming...'
        : `${tarotResult.cardCount} cards are forming...`,
      cardCount: tarotResult.cardCount,
      spreadType: tarotResult.spreadType,
    });
    log(`[Tarot] Placeholder emitted for ${tarotResult.cardCount} cards`);
  }

  // Load reference images for visual style matching
  log('[Tarot] Loading reference images for style matching...');
  let referenceImages: string[] = [];
  try {
    referenceImages = await loadMinoanReferenceImages();
    log(`[Tarot] Loaded ${referenceImages.length} reference images`);
  } catch (refError) {
    log('[Tarot] Could not load reference images, proceeding without visual memory');
  }

  // Generate images for each card in the spread
  const cardResults: TarotCardResult[] = [];
  let overallSuccess = true;

  for (let i = 0; i < tarotResult.cards.length; i++) {
    const card = tarotResult.cards[i];
    log(`[Tarot] Generating card ${i + 1}/${tarotResult.cardCount}: ${card.cardNumber} - ${card.cardName}`);
    log('[Tarot] Prompt:', card.prompt.slice(0, 150) + '...');

    let imageResult: GeminiImageResult;
    try {
      imageResult = await geminiProvider.generate({
        prompt: card.prompt,
        style: 'ancient', // Closest to Minoan aesthetic
        aspectRatio: '3:4', // Tarot card proportions
        referenceImages, // Pass reference images for visual memory
      });

      log(`[Tarot] Card ${i + 1} result: success=${imageResult.success}, hasDataUrl=${!!imageResult.imageDataUrl}, dataUrlLength=${imageResult.imageDataUrl?.length ?? 0}, error=${imageResult.error ?? 'none'}`);
    } catch (imageError) {
      const errorMessage = imageError instanceof Error ? imageError.message : String(imageError);
      log(`[Tarot] Card ${i + 1} image generation failed:`, errorMessage);
      imageResult = {
        success: false,
        error: `Image generation failed: ${errorMessage}`,
      };
    }

    const cardResult: TarotCardResult = {
      success: imageResult.success,
      imageDataUrl: imageResult.imageDataUrl,
      cardName: card.cardName,
      cardNumber: card.cardNumber,
      position: card.position,
      prompt: card.prompt,
      error: imageResult.error,
    };

    cardResults.push(cardResult);

    if (!imageResult.success) {
      overallSuccess = false;
    }

    // Emit individual card result as it completes
    if (cfg.onCardGenerated) {
      cfg.onCardGenerated(cardResult, i, tarotResult.cardCount);
      log(`[Tarot] Card ${i + 1} emitted via callback`);
    }
  }

  // Only consume the turn slot if at least one card succeeded
  // This ensures users don't lose tarot opportunities on total failures
  const successfulCards = cardResults.filter(c => c.success);
  let newTarotCount = tarotCount;

  if (successfulCards.length > 0) {
    soulMemory.setLastTarotTurn(userMessageCount);
    newTarotCount = tarotCount + 1;
    soulMemory.setTarotCount(newTarotCount);
    log(`[Tarot] Session state updated: turn=${userMessageCount}, count=${newTarotCount}`);
  } else {
    log('[Tarot] No cards succeeded, not consuming session tarot slot');
  }

  // Build final result
  const finalResult: TarotResult = {
    success: overallSuccess,
    cardCount: tarotResult.cardCount,
    spreadType: tarotResult.spreadType,
    cards: cardResults,
    oracleMessage: tarotResult.oracleMessage,
    duration: cfg.displayDuration!,
  };

  if (overallSuccess) {
    const cardSummary = cardResults.map(c => `${c.cardNumber} - ${c.cardName}`).join(', ');
    log(`[Tarot] Tarot manifested: ${tarotResult.spreadType} spread - ${cardSummary} (${newTarotCount}/${cfg.maxTarotsPerSession} this session)`);
    logger.logInternalMonologue?.(
      `Tarot manifested: ${tarotResult.spreadType} spread - ${cardSummary}`,
      'tarot-generation'
    );
  } else {
    log('[Tarot] Some cards failed to generate');
  }

  // Invoke callback with complete result
  if (cfg.onTarotGenerated) {
    cfg.onTarotGenerated(finalResult);
  }

  return workingMemory;
}

/**
 * Reset tarot session state (call when conversation clears)
 */
export function resetTarotState(soulMemory: SoulMemoryInterface): void {
  soulMemory.setTarotCount(0);
  soulMemory.setLastTarotTurn(0);
}

export default embodiesTheTarot;
