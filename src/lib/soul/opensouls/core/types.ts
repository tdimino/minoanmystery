/**
 * Core types for the Minoan Soul Engine
 * Adapted from Open Souls functional programming paradigm
 */

// ============================================
// Chat Message Types
// ============================================

export enum ChatMessageRoleEnum {
  System = 'system',
  User = 'user',
  Assistant = 'assistant',
}

export interface Memory {
  role: ChatMessageRoleEnum;
  content: string;
  name?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
  region?: string;
}

export interface MemoryRegionConfig {
  ttlMs?: number;
  priority?: number;
}

// ============================================
// Working Memory Types
// ============================================

export interface WorkingMemoryConfig {
  soulName: string;
  memories?: Memory[];
  regionalOrder?: string[];
}

export interface WorkingMemorySnapshot {
  soulName: string;
  memories: Memory[];
  regionalOrder: string[];
  timestamp: string;
}

// ============================================
// Cognitive Step Types
// ============================================

export interface CognitiveStepConfig<PostProcessReturnType = string> {
  command: (memory: WorkingMemory) => Memory;
  postProcess?: (memory: WorkingMemory, response: string) => Promise<[Memory | null, PostProcessReturnType]>;
  schema?: unknown;
}

export type CognitiveStepFactory<UserArgType, PostProcessReturnType = string> = (
  userArgs: UserArgType
) => CognitiveStepConfig<PostProcessReturnType>;

/**
 * CognitiveStep function signature with streaming overloads
 */
export interface CognitiveStep<UserArgType, PostProcessReturnType = string> {
  (
    memory: WorkingMemory,
    userArgs: UserArgType,
    opts: { stream: true; model?: string; temperature?: number }
  ): Promise<[WorkingMemory, AsyncIterable<string>, Promise<PostProcessReturnType>]>;

  (
    memory: WorkingMemory,
    userArgs: UserArgType,
    opts?: { stream?: false; model?: string; temperature?: number }
  ): Promise<[WorkingMemory, PostProcessReturnType]>;
}

// ============================================
// Mental Process Types
// ============================================

export interface MentalProcessContext {
  workingMemory: WorkingMemory;
  sessionId: string;
  params?: Record<string, unknown>;
}

export type MentalProcessReturn =
  | WorkingMemory
  | [WorkingMemory, MentalProcess | null]
  | [WorkingMemory, MentalProcess | null, Record<string, unknown>];

export type MentalProcess = (
  context: MentalProcessContext
) => Promise<MentalProcessReturn>;

// ============================================
// Soul Configuration Types
// ============================================

export interface SoulConfig {
  id: string;
  name: string;
  provider: 'openrouter' | 'anthropic' | 'groq';
  model: string;
  subconsciousModel?: string;
  temperature?: number;
  maxTokens?: number;
  features?: {
    voice?: boolean;
    toasts?: boolean;
    commandPalette?: boolean;
    ambientAnimations?: boolean;
  };
  voice?: {
    provider: 'deepgram';
    tts?: {
      model: string;
      encoding?: string;
      sampleRate?: number;
    };
    stt?: {
      model: string;
      language?: string;
      punctuate?: boolean;
      interimResults?: boolean;
    };
  };
  triggers?: {
    toastCooldown?: number;
    idleThreshold?: number;
    deepReadThreshold?: number;
    contactHoverThreshold?: number;
  };
  personality?: Record<string, unknown>;
}

export interface SoulDefinition {
  config: SoulConfig;
  personality: string; // Markdown content from soul.md
}

// ============================================
// Perception Types
// ============================================

export type PerceptionType =
  | 'click'
  | 'scroll'
  | 'hover'
  | 'idle'
  | 'navigation'
  | 'voice'
  | 'command'
  | 'message'
  | 'focus'
  | 'blur';

export interface Perception {
  type: PerceptionType;
  name?: string;
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// ============================================
// Soul State Types
// ============================================

export type SoulState = 'greeting' | 'curious' | 'engaged' | 'ready' | 'returning' | 'dormant' | 'exiting' | 'academic';

export interface SoulMemory {
  sessionId: string;
  visitCount: number;
  pagesViewed: string[];
  timePerPage: Record<string, number>;
  scrollDepths: Record<string, number>;
  lastProject?: string;
  inferredInterests: string[];
  behavioralType: 'scanner' | 'reader' | 'explorer' | 'focused';
  currentState: SoulState;
  emotionalTone: 'neutral' | 'curious' | 'warm' | 'mysterious';
  conversationPhase: 'greeting' | 'exploring' | 'discussing' | 'closing';
  lastGreeting?: string;
  topicsDiscussed: string[];
  questionsAsked: string[];
}

// ============================================
// Action Types
// ============================================

export interface SoulActions {
  speak: (content: string | AsyncIterable<string>) => void;
  log: (message: string, data?: unknown) => void;
  dispatch: (action: DispatchAction) => void;
  scheduleEvent: (event: ScheduledEvent) => void;
}

export interface DispatchAction {
  type: 'toast' | 'highlight' | 'animate' | 'navigate' | 'updateCTA';
  payload: unknown;
}

export interface ScheduledEvent {
  type: string;
  delayMs: number;
  payload?: unknown;
}

// Forward declaration for WorkingMemory (implemented in WorkingMemory.ts)
export type WorkingMemory = import('./WorkingMemory').WorkingMemory;
