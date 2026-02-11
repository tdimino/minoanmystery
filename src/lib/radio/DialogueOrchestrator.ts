/**
 * DialogueOrchestrator - Coordinates the two-soul radio dialogue
 *
 * Manages turn-taking, interruptions, TTS generation, and audio mixing
 * for Kothar and Artifex's discussions.
 */

import { WorkingMemory } from '../soul/opensouls/core/WorkingMemory';
import { ChatMessageRoleEnum } from '../soul/opensouls/core/types';
import { getSoulLogger } from '../soul/opensouls/core/SoulLogger';
import {
  chunkedExternalDialog,
  interruptionDecision,
  backchannelResponse,
  questionSelector,
  questionResponse,
} from './cognitiveSteps';
import { RemoteTTSClient } from './tts/RemoteTTSClient';
import { QuestionManager } from './QuestionManager';
import type {
  DialogueState,
  SoulDialogueState,
  SoulIntention,
  RadioSoulName,
  AudioChunk,
  ChunkedDialogResult,
  InterruptionDecision,
  ListenerQuestion,
} from './types';
import type { QuestionSelectorResult } from './cognitiveSteps/questionSelector';

export interface DialogueOrchestratorConfig {
  /** TTS client for audio generation */
  ttsClient: RemoteTTSClient;

  /** Kothar's personality (from soul.md) */
  kotharPersonality: string;

  /** Artifex's personality (from soul.md) */
  artifexPersonality: string;

  /** Brief description of Kothar's strengths for question selection */
  kotharSelectorDescription?: string;

  /** Brief description of Artifex's strengths for question selection */
  artifexSelectorDescription?: string;

  /** Maximum exchanges per topic before transitioning */
  maxTopicDepth?: number;

  /** Chunk interval for backchannel checks */
  backchannelInterval?: number;

  /** Urgency threshold for interruption (0-1) */
  interruptionThreshold?: number;

  /** Check for interruption every N chunks (reduces LLM calls). Default: 2 */
  interruptionCheckInterval?: number;

  /** Callback when audio is ready to play */
  onAudioReady?: (chunk: AudioChunk) => void;

  /** Callback when a soul speaks */
  onSpeech?: (soul: RadioSoulName, text: string) => void;

  /** Callback when topic changes */
  onTopicChange?: (topic: string) => void;

  /** Callback when TTS generation fails */
  onTTSError?: (soul: RadioSoulName, error: Error, text: string) => void;

  /** Optional question manager for listener questions */
  questionManager?: QuestionManager;

  /** How often to check for questions (every N turns). Default: 3 */
  questionCheckInterval?: number;

  /** Callback when a listener question is addressed */
  onQuestionAddressed?: (question: ListenerQuestion, firstResponder: RadioSoulName) => void;
}

export class DialogueOrchestrator {
  private config: DialogueOrchestratorConfig;
  private state: DialogueState;
  private isRunning = false;
  private logger = getSoulLogger();

  constructor(config: DialogueOrchestratorConfig) {
    this.config = {
      maxTopicDepth: 6,
      backchannelInterval: 2,
      interruptionThreshold: 0.7,
      interruptionCheckInterval: 2,
      questionCheckInterval: 3,
      ...config,
    };

    // Initialize dialogue state
    this.state = this.createInitialState();
  }

  private createInitialState(): DialogueState {
    return {
      sessionId: crypto.randomUUID(),
      sharedMemory: new WorkingMemory({ soulName: 'radio' }),
      souls: {
        kothar: this.createSoulState('kothar'),
        artifex: this.createSoulState('artifex'),
      },
      currentSpeaker: null,
      turnStartedAt: 0,
      currentTopic: '',
      topicDepth: 0,
      totalTurns: 0,
    };
  }

  private createSoulState(soul: RadioSoulName): SoulDialogueState {
    const personality = soul === 'kothar'
      ? this.config.kotharPersonality
      : this.config.artifexPersonality;

    return {
      workingMemory: new WorkingMemory({ soulName: soul })
        .withRegion('personality', personality)
        .withRegion('radio-context', this.getRadioContext(soul)),
      intention: null,
      wantsToSpeak: false,
      urgencyLevel: 0,
      backchannelQueue: [],
      ttsQueue: [],
      currentlyVocalizing: false,
    };
  }

  private getRadioContext(soul: RadioSoulName): string {
    const other = soul === 'kothar' ? 'Artifex' : 'Kothar';
    return `You are co-hosting a radio discussion with ${other}.
Let the conversation flow naturally between your perspectives.
When interrupted, gracefully acknowledge and continue your point later if relevant.`;
  }

  private getOtherSoul(soul: RadioSoulName): RadioSoulName {
    return soul === 'kothar' ? 'artifex' : 'kothar';
  }

  /**
   * Start a dialogue on a given topic
   */
  async startDialogue(topic: string): Promise<void> {
    this.state.currentTopic = topic;
    this.state.topicDepth = 0;
    this.state.currentSpeaker = 'kothar'; // Kothar opens
    this.isRunning = true;

    this.config.onTopicChange?.(topic);

    // Generate opening statement
    await this.generateTurn('kothar');
  }

  /**
   * Stop the dialogue
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * Run the main dialogue loop
   */
  async runDialogue(): Promise<void> {
    while (this.isRunning && this.state.topicDepth < (this.config.maxTopicDepth ?? 6)) {
      // Vocalize current turn (chunk by chunk)
      await this.vocalizeTurn();

      // Check if we should continue
      if (!this.isRunning) break;

      // Check for listener questions at interval
      const questionAddressed = await this.maybeAddressQuestion();
      if (questionAddressed) {
        // Question counts as a turn for both souls
        this.state.topicDepth += 2;
        this.state.totalTurns += 2;
        continue; // Skip normal turn generation, question discussion handles it
      }

      // Switch speakers (unless interrupted)
      if (!this.wasInterrupted()) {
        this.switchSpeaker();
      }

      // Guard: ensure we have a current speaker before generating turn
      if (!this.state.currentSpeaker) {
        this.logger.stateTransition('unknown', 'stopped', 'no current speaker');
        break;
      }

      // Generate next turn
      await this.generateTurn(this.state.currentSpeaker);

      this.state.topicDepth++;
      this.state.totalTurns++;
    }
  }

  /**
   * Check if we should address a listener question and do so if appropriate
   * @returns true if a question was addressed
   */
  async maybeAddressQuestion(): Promise<boolean> {
    const questionManager = this.config.questionManager;
    if (!questionManager) {
      return false;
    }

    // Check if we're at a turn interval for questions
    const interval = this.config.questionCheckInterval ?? 3;
    if (this.state.totalTurns % interval !== 0) {
      return false;
    }

    // Check if timing allows a question
    if (!questionManager.canAskQuestion()) {
      return false;
    }

    // Get the next question to address
    const question = questionManager.getNextQuestion();
    if (!question) {
      return false;
    }

    // Address the question
    await this.discussQuestion(question);
    return true;
  }

  /**
   * Have both souls discuss a listener question
   */
  async discussQuestion(question: ListenerQuestion): Promise<void> {
    const questionManager = this.config.questionManager;
    if (!questionManager) {
      return;
    }

    this.logger.stateTransition(
      this.state.currentSpeaker || 'none',
      'question',
      `Addressing listener question: "${question.question.substring(0, 50)}..."`
    );

    // Use questionSelector to decide who responds first
    // Use Kothar's memory for the decision (he's the more deliberate one)
    const kotharState = this.state.souls.kothar;
    const [selectorMemory, selectorResult] = await questionSelector(
      kotharState.workingMemory,
      {
        question: question.question,
        submittedBy: question.submittedBy,
        currentTopic: this.state.currentTopic,
        kotharDescription: this.config.kotharSelectorDescription,
        artifexDescription: this.config.artifexSelectorDescription,
      },
      { stream: false }
    ) as [WorkingMemory, QuestionSelectorResult];

    // Preserve the selector decision in Kothar's memory
    kotharState.workingMemory = selectorMemory;

    const firstResponder = selectorResult.firstResponder;
    const secondResponder = this.getOtherSoul(firstResponder);

    // Mark question as being addressed
    questionManager.markAddressing(question.id);

    // Generate first responder's answer
    const firstState = this.state.souls[firstResponder];
    const [firstMemory, firstResult] = await questionResponse(
      firstState.workingMemory,
      {
        soulName: firstResponder,
        question: question.question,
        submittedBy: question.submittedBy,
        approachHint: selectorResult.approachHint,
        currentTopic: this.state.currentTopic,
      },
      { stream: false }
    ) as [WorkingMemory, ChunkedDialogResult];

    // Update first responder's state
    firstState.workingMemory = firstMemory;
    firstState.intention = {
      fullResponse: firstResult.fullResponse,
      chunks: firstResult.chunks,
      vocalizedChunks: 0,
      createdAt: Date.now(),
    };

    // Vocalize first response
    this.state.currentSpeaker = firstResponder;
    this.state.turnStartedAt = Date.now();
    await this.vocalizeTurn();

    if (!this.isRunning) return;

    // Get the clean first response (without markers) for context
    const firstResponseText = firstResult.chunks.join(' ');

    // Generate second responder's answer (with partner's response as context)
    const secondState = this.state.souls[secondResponder];
    const [secondMemory, secondResult] = await questionResponse(
      secondState.workingMemory,
      {
        soulName: secondResponder,
        question: question.question,
        submittedBy: question.submittedBy,
        partnerResponse: firstResponseText,
        currentTopic: this.state.currentTopic,
      },
      { stream: false }
    ) as [WorkingMemory, ChunkedDialogResult];

    // Update second responder's state
    secondState.workingMemory = secondMemory;
    secondState.intention = {
      fullResponse: secondResult.fullResponse,
      chunks: secondResult.chunks,
      vocalizedChunks: 0,
      createdAt: Date.now(),
    };

    // Vocalize second response
    this.state.currentSpeaker = secondResponder;
    this.state.turnStartedAt = Date.now();
    await this.vocalizeTurn();

    // Mark question as answered
    questionManager.markAnswered(question.id, firstResponder);

    // Call the callback
    this.config.onQuestionAddressed?.(question, firstResponder);

    this.logger.stateTransition(
      'question',
      secondResponder,
      `Question answered by ${firstResponder} then ${secondResponder}`
    );
  }

  /**
   * Generate a turn for the specified soul
   */
  private async generateTurn(soul: RadioSoulName): Promise<void> {
    const soulState = this.state.souls[soul];
    const otherSoul = this.getOtherSoul(soul);
    const otherState = this.state.souls[otherSoul];

    // Get what the other soul last said
    const lastUtterance = this.getLastUtterance(otherSoul);

    // Check if this soul was interrupted
    const wasInterrupted = soulState.intention?.interruptedAt !== undefined;
    const interruptedThought = wasInterrupted
      ? soulState.intention?.chunks.slice(soulState.intention.vocalizedChunks).join(' ')
      : undefined;

    this.logger.stateTransition(
      this.state.currentSpeaker || 'none',
      soul,
      wasInterrupted ? `${soul} continuing after interruption` : `${soul} generating turn`
    );

    // Generate chunked response
    const [newMemory, result] = await chunkedExternalDialog(
      soulState.workingMemory,
      {
        soulName: soul,
        otherSoul,
        topic: this.state.currentTopic,
        lastUtterance,
        wasInterrupted,
        interruptedThought,
      },
      { stream: false }
    ) as [WorkingMemory, ChunkedDialogResult];

    // Update soul state
    soulState.workingMemory = newMemory;
    soulState.intention = {
      fullResponse: result.fullResponse,
      chunks: result.chunks,
      vocalizedChunks: 0,
      createdAt: Date.now(),
    };

    this.state.turnStartedAt = Date.now();
  }

  /**
   * Vocalize the current turn chunk by chunk
   */
  private async vocalizeTurn(): Promise<void> {
    const speaker = this.state.currentSpeaker;
    if (!speaker) return;

    const soulState = this.state.souls[speaker];
    const intention = soulState.intention;
    if (!intention) return;

    soulState.currentlyVocalizing = true;

    const interruptionInterval = this.config.interruptionCheckInterval ?? 2;

    for (let i = 0; i < intention.chunks.length; i++) {
      if (!this.isRunning) break;

      // Check for interruption at intervals (reduces LLM calls)
      // Always check at chunk 0 for immediate interruptions
      if (i === 0 || i % interruptionInterval === 0) {
        const shouldInterrupt = await this.shouldBeInterrupted(speaker);
        if (shouldInterrupt) {
          intention.interruptedAt = i;
          await this.handleInterruption(speaker);
          break;
        }
      }

      const chunk = intention.chunks[i];

      // Generate TTS for this chunk
      const audioChunk = await this.generateAudioChunk(speaker, chunk, i, intention.chunks.length);

      // Notify listener (only emit audio if buffer was generated successfully)
      if (audioChunk.audioBuffer !== null) {
        this.config.onAudioReady?.(audioChunk);
      }
      // Always emit speech event for text display even if audio failed
      this.config.onSpeech?.(speaker, chunk);

      // Update vocalized count
      intention.vocalizedChunks = i + 1;

      // Update shared memory with what was actually said
      this.state.sharedMemory = this.state.sharedMemory.withMemory({
        role: ChatMessageRoleEnum.Assistant,
        content: chunk,
        name: speaker,
      });

      // Maybe generate backchannel from listener
      if ((i + 1) % (this.config.backchannelInterval ?? 2) === 0) {
        await this.maybeBackchannel(speaker);
      }
    }

    soulState.currentlyVocalizing = false;
  }

  /**
   * Check if the current speaker should be interrupted
   */
  private async shouldBeInterrupted(speaker: RadioSoulName): Promise<boolean> {
    const listener = this.getOtherSoul(speaker);
    const listenerState = this.state.souls[listener];
    const speakerState = this.state.souls[speaker];

    // If listener has no pending thought, no interruption
    if (!listenerState.intention && !listenerState.wantsToSpeak) {
      return false;
    }

    const [newMemory, decision] = await interruptionDecision(
      listenerState.workingMemory,
      {
        soulName: listener,
        partnerCurrentUtterance: this.getCurrentUtterance(speaker),
        partnerVocalizedSoFar: this.getVocalizedSoFar(speaker),
        yourPendingThought: listenerState.intention?.fullResponse || '',
        topic: this.state.currentTopic,
      },
      { stream: false }
    ) as [WorkingMemory, InterruptionDecision];

    // Preserve WorkingMemory from interruption decision
    listenerState.workingMemory = newMemory;
    listenerState.urgencyLevel = decision.urgency;

    const shouldInterrupt = decision.urgency >= (this.config.interruptionThreshold ?? 0.7);
    if (shouldInterrupt) {
      this.logger.stateTransition(
        speaker,
        listener,
        `interruption (urgency: ${decision.urgency.toFixed(2)})`
      );
    }

    return shouldInterrupt;
  }

  /**
   * Handle an interruption
   */
  private async handleInterruption(interruptedSoul: RadioSoulName): Promise<void> {
    const interrupter = this.getOtherSoul(interruptedSoul);
    const interrupterState = this.state.souls[interrupter];
    const interruptedState = this.state.souls[interruptedSoul];

    // Record the interruption context
    if (interruptedState.intention) {
      interruptedState.intention.interruptionContext =
        interrupterState.intention?.fullResponse || '[spontaneous interruption]';
    }

    // Switch speaker to the interrupter
    this.state.currentSpeaker = interrupter;

    // Generate the interjection
    await this.generateTurn(interrupter);
  }

  /**
   * Maybe generate a backchannel response
   */
  private async maybeBackchannel(speaker: RadioSoulName): Promise<void> {
    const listener = this.getOtherSoul(speaker);
    const listenerState = this.state.souls[listener];

    // 50% chance of backchannel
    if (Math.random() > 0.5) return;

    const [backchannelMemory, response] = await backchannelResponse(
      listenerState.workingMemory,
      {
        soulName: listener,
        otherSoul: speaker,
        justHeard: this.getCurrentUtterance(speaker),
        topic: this.state.currentTopic,
      },
      { stream: false }
    ) as [WorkingMemory, string];

    // Preserve backchannel decision in listener's memory
    listenerState.workingMemory = backchannelMemory;

    if (response && response !== '...') {
      listenerState.backchannelQueue.push(response);
      // Generate audio for backchannel (at lower volume)
      const audioChunk = await this.generateAudioChunk(listener, response, -1, 1);
      audioChunk.canBeInterrupted = true; // Backchannels are always interruptible
      // Only emit audio if buffer was generated successfully
      if (audioChunk.audioBuffer !== null) {
        this.config.onAudioReady?.(audioChunk);
      }
    }
  }

  /**
   * Generate an audio chunk for text
   */
  private async generateAudioChunk(
    soul: RadioSoulName,
    text: string,
    index: number,
    total: number
  ): Promise<AudioChunk> {
    const startTime = Date.now();

    try {
      const result = await this.config.ttsClient.generateForSoul(soul, text);

      return {
        id: `${soul}-${this.state.totalTurns}-${index}`,
        text,
        audioBuffer: result.audioBuffer,
        duration: result.durationMs,
        generationStarted: startTime,
        generationCompleted: Date.now(),
        chunkIndex: index,
        totalChunks: total,
        canBeInterrupted: index < total - 1, // Last chunk can't be interrupted
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.stateTransition(soul, soul, `TTS error: ${err.message}`);
      this.config.onTTSError?.(soul, err, text);

      // Return a chunk with null audioBuffer on failure
      // Estimate duration based on text length (~150ms per word)
      const estimatedDuration = Math.max(500, text.split(/\s+/).length * 150);

      return {
        id: `${soul}-${this.state.totalTurns}-${index}`,
        text,
        audioBuffer: null,
        duration: estimatedDuration,
        generationStarted: startTime,
        generationCompleted: Date.now(),
        chunkIndex: index,
        totalChunks: total,
        canBeInterrupted: index < total - 1,
      };
    }
  }

  /**
   * Switch to the other speaker
   */
  private switchSpeaker(): void {
    if (this.state.currentSpeaker) {
      this.state.currentSpeaker = this.getOtherSoul(this.state.currentSpeaker);
    }
  }

  /**
   * Check if the current turn was interrupted
   */
  private wasInterrupted(): boolean {
    if (!this.state.currentSpeaker) return false;
    const intention = this.state.souls[this.state.currentSpeaker].intention;
    return intention?.interruptedAt !== undefined;
  }

  /**
   * Get the last complete utterance from a soul
   */
  private getLastUtterance(soul: RadioSoulName): string {
    const intention = this.state.souls[soul].intention;
    if (!intention) return '[opening the conversation]';

    const vocalized = intention.chunks.slice(0, intention.vocalizedChunks);
    return vocalized.join(' ') || '[silence]';
  }

  /**
   * Get the current chunk being spoken
   */
  private getCurrentUtterance(soul: RadioSoulName): string {
    const intention = this.state.souls[soul].intention;
    if (!intention) return '';

    const currentIndex = intention.vocalizedChunks;
    return intention.chunks[currentIndex] || '';
  }

  /**
   * Get everything vocalized so far in current turn
   */
  private getVocalizedSoFar(soul: RadioSoulName): string {
    const intention = this.state.souls[soul].intention;
    if (!intention) return '';

    return intention.chunks.slice(0, intention.vocalizedChunks).join(' ');
  }

  /**
   * Get current dialogue state (for debugging/UI)
   */
  getState(): DialogueState {
    return this.state;
  }
}

export default DialogueOrchestrator;
