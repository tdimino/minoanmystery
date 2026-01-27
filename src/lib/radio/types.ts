/**
 * Daimonic Radio - Type definitions
 *
 * Types for the two-soul radio dialogue system where Kothar and Tamarru
 * host discussions with natural turn-taking and interruptions.
 */

import type { WorkingMemory } from '../soul/opensouls/core/WorkingMemory';

// ============================================
// Soul Identity Types
// ============================================

export type RadioSoulName = 'kothar' | 'tamarru';

export const SOUL_VOICES: Record<RadioSoulName, string> = {
  kothar: 'Ryan',    // Deep, measured craftsman
  tamarru: 'Aiden',  // Dynamic, ecstatic poet
} as const;

export const SOUL_STYLES: Record<RadioSoulName, string> = {
  kothar: 'Thoughtful, deliberate, ancient wisdom',
  tamarru: 'Passionate, rhythmic, mystical fervor',
} as const;

// ============================================
// Intention Tracking Types
// ============================================

/**
 * Tracks what a soul intended to say vs what was vocalized
 * Enables graceful interruption recovery
 */
export interface SoulIntention {
  /** Complete intended statement from LLM */
  fullResponse: string;

  /** Response broken into speakable chunks at natural pause points */
  chunks: string[];

  /** How many chunks have been vocalized as audio */
  vocalizedChunks: number;

  /** Chunk index where interrupted (if interrupted) */
  interruptedAt?: number;

  /** What the other soul said that caused the interruption */
  interruptionContext?: string;

  /** Timestamp when intention was created */
  createdAt: number;
}

/**
 * Result from chunkedExternalDialog cognitive step
 */
export interface ChunkedDialogResult {
  /** Full response text (with | markers preserved) */
  fullResponse: string;

  /** Chunks split at natural pause points */
  chunks: string[];

  /** Number of vocalized chunks (starts at 0) */
  vocalizedChunks: number;
}

// ============================================
// Interruption Types
// ============================================

/**
 * Result from interruptionDecision cognitive step
 */
export interface InterruptionDecision {
  /** Urgency level 0-1 (0.7+ = interrupt now) */
  urgency: number;

  /** What the soul would say if interrupting */
  interjection: string;

  /** Reasoning for the urgency level */
  reasoning?: string;
}

// ============================================
// Audio Chunk Types
// ============================================

export interface AudioChunk {
  /** Unique identifier for this chunk */
  id: string;

  /** Text content of this chunk */
  text: string;

  /** Audio buffer (null = still generating) */
  audioBuffer: Float32Array | null;

  /** Duration in milliseconds (estimated or actual) */
  duration: number;

  /** Timestamp when TTS generation started */
  generationStarted: number;

  /** Timestamp when TTS generation completed */
  generationCompleted?: number;

  /** Index within the full response */
  chunkIndex: number;

  /** Total number of chunks in the response */
  totalChunks: number;

  /** False for critical points that shouldn't be interrupted */
  canBeInterrupted: boolean;
}

// ============================================
// Dialogue State Types
// ============================================

/**
 * Per-soul state within a dialogue session
 */
export interface SoulDialogueState {
  /** Soul's working memory */
  workingMemory: WorkingMemory;

  /** Current intention (what they plan to say) */
  intention: SoulIntention | null;

  /** Whether the soul has something to say */
  wantsToSpeak: boolean;

  /** Urgency level 0-1 for wanting to interject */
  urgencyLevel: number;

  /** Queue of backchannel responses ("mm-hmm", "interesting", etc) */
  backchannelQueue: string[];

  /** Queue of audio chunks pending/playing */
  ttsQueue: AudioChunk[];

  /** Whether currently vocalizing */
  currentlyVocalizing: boolean;
}

/**
 * Shared dialogue state between both souls
 */
export interface DialogueState {
  /** Session identifier */
  sessionId: string;

  /** Shared conversation history (what was actually said) */
  sharedMemory: WorkingMemory;

  /** Per-soul states */
  souls: {
    kothar: SoulDialogueState;
    tamarru: SoulDialogueState;
  };

  /** Current speaker (null = silence) */
  currentSpeaker: RadioSoulName | null;

  /** Timestamp when current turn started */
  turnStartedAt: number;

  /** Current discussion topic */
  currentTopic: string;

  /** Number of exchanges on current topic */
  topicDepth: number;

  /** Total turns in the session */
  totalTurns: number;
}

// ============================================
// Cognitive Step Options Types
// ============================================

/**
 * Options for chunkedExternalDialog cognitive step
 */
export interface ChunkedDialogOptions {
  /** Name of the speaking soul */
  soulName: RadioSoulName;

  /** Name of the other soul */
  otherSoul: RadioSoulName;

  /** Current discussion topic */
  topic: string;

  /** What the conversation partner just said */
  lastUtterance: string;

  /** Additional personality context */
  personalityContext?: string;

  /** Whether this is a response to an interruption */
  wasInterrupted?: boolean;

  /** What the soul was saying when interrupted */
  interruptedThought?: string;
}

/**
 * Options for interruptionDecision cognitive step
 */
export interface InterruptionOptions {
  /** Name of the soul considering interruption */
  soulName: RadioSoulName;

  /** What the partner is currently saying (current chunk) */
  partnerCurrentUtterance: string;

  /** Everything the partner has vocalized so far */
  partnerVocalizedSoFar: string;

  /** What this soul was thinking/planning to say */
  yourPendingThought: string;

  /** Current topic for context */
  topic?: string;
}

/**
 * Options for backchannelResponse cognitive step
 */
export interface BackchannelOptions {
  /** Name of the listening soul */
  soulName: RadioSoulName;

  /** Name of the speaking soul */
  otherSoul: RadioSoulName;

  /** What was just heard */
  justHeard: string;

  /** Current topic for context */
  topic?: string;
}

// ============================================
// TTS Client Types
// ============================================

export interface TTSRequest {
  /** Text to synthesize */
  text: string;

  /** Speaker voice name */
  speaker: string;

  /** Style instruction */
  instruct?: string;

  /** Speed multiplier (0.5-2.0) */
  speed?: number;
}

export interface TTSResult {
  /** Audio samples */
  audioBuffer: Float32Array;

  /** Sample rate in Hz */
  sampleRate: number;

  /** Duration in milliseconds */
  durationMs: number;
}

// ============================================
// Listener Interaction Types
// ============================================

export interface ListenerQuestion {
  /** Unique identifier */
  id: string;

  /** The question text */
  question: string;

  /** Timestamp when submitted */
  submittedAt: number;

  /** Optional listener name */
  submittedBy?: string;

  /** Upvote count */
  upvotes: number;

  /** Current status */
  status: 'pending' | 'addressing' | 'answered';

  /** Which soul addressed it (if answered) */
  addressedBySoul?: RadioSoulName;
}

export interface QuestionQueue {
  /** Pending questions */
  questions: ListenerQuestion[];

  /** Currently being addressed */
  currentQuestion: ListenerQuestion | null;

  /** Timestamp of last addressed question */
  lastQuestionTime: number;

  /** Minimum time between questions (ms) */
  minTimeBetweenQuestions: number;
}

// ============================================
// Audio Pipeline Types
// ============================================

/**
 * Audio mixing mode for combining primary and backchannel audio
 */
export type MixMode = 'overlay' | 'concatenate' | 'ducking';

/**
 * Audio playback event types
 */
export interface AudioPlaybackEvent {
  /** Event type */
  type: 'started' | 'chunk_complete' | 'finished' | 'interrupted' | 'error';

  /** Soul producing the audio */
  soul: RadioSoulName;

  /** Chunk identifier */
  chunkId: string;

  /** Playback position in ms (for progress events) */
  positionMs?: number;

  /** Total duration in ms */
  durationMs?: number;

  /** Error details (for error events) */
  error?: string;
}

/**
 * Prefetch status for monitoring generation pipeline
 */
export interface PrefetchStatus {
  /** Soul being prefetched */
  soul: RadioSoulName;

  /** Number of chunks pending generation */
  pendingCount: number;

  /** Number of chunks ready to play */
  readyCount: number;

  /** Number of chunks currently generating */
  generatingCount: number;

  /** Average generation time (ms) */
  avgGenerationMs: number;

  /** Whether prefetch buffer is healthy (readyCount >= 2) */
  isHealthy: boolean;
}

/**
 * Audio pipeline statistics
 */
export interface AudioPipelineStats {
  /** Total chunks generated */
  totalChunksGenerated: number;

  /** Total audio duration generated (ms) */
  totalAudioDurationMs: number;

  /** Total generation time (ms) */
  totalGenerationTimeMs: number;

  /** Average latency per chunk (ms) */
  avgLatencyMs: number;

  /** Generation efficiency (audio duration / generation time) */
  efficiency: number;

  /** Per-soul statistics */
  bySoul: Record<RadioSoulName, {
    chunksGenerated: number;
    audioDurationMs: number;
    avgLatencyMs: number;
  }>;
}
