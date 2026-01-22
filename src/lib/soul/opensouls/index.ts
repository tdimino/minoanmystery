/**
 * Open Souls Paradigm Implementation
 *
 * Functional programming approach to AI souls with:
 * - Immutable WorkingMemory
 * - Cognitive Steps (pure LLM transformations)
 * - Mental Processes (state machine)
 * - Hooks (actions, memory, perceptions)
 *
 * This integrates with the existing MVP soul engine for a hybrid approach:
 * rule-based triggers for common events, LLM for novel situations.
 */

// Core exports
export {
  WorkingMemory,
  ChatMessageRoleEnum,
  createCognitiveStep,
  indentNicely,
  safeName,
  stripEntityAndVerb,
} from './core';

export type {
  Memory,
  MemoryRegionConfig,
  WorkingMemoryConfig,
  WorkingMemorySnapshot,
  CognitiveStep,
  CognitiveStepConfig,
  MentalProcess,
  MentalProcessContext,
  MentalProcessReturn,
  SoulConfig,
  SoulDefinition,
  Perception,
  PerceptionType,
  SoulState,
  SoulMemory,
  SoulActions,
  DispatchAction,
  ScheduledEvent,
} from './core';

// Cognitive steps
export {
  externalDialog,
  internalMonologue,
  decision,
  mentalQuery,
  brainstorm,
} from './cognitiveSteps';

// Hooks
export {
  useActions,
  useSoulMemory,
  useProcessMemory,
  usePerceptions,
  registerActionHandlers,
  queuePerception,
  setCurrentPerception,
  clearPerceptions,
} from './hooks';

// Providers
export {
  OpenRouterProvider,
  createOpenRouterProvider,
  GroqProvider,
  createGroqProvider,
  BasetenProvider,
  createBasetenProvider,
} from './providers';

// Mental Processes
export {
  greetingProcess,
  curiousProcess,
  engagedProcess,
  readyProcess,
  returningProcess,
  ProcessRunner,
  createProcessRunner,
  getInitialState,
  processRegistry,
  stateTransitions,
} from './mentalProcesses';

export type {
  ProcessContext,
  ProcessReturn,
  HydratedUserModel,
} from './mentalProcesses';

// Perception / Memory Integration
export {
  // New architecture
  memoryIntegrate,
  SoulOrchestrator,
  getSoulOrchestrator,
  resetSoulOrchestrator,
  // Backward compatibility aliases
  MemoryIntegrator,
  getMemoryIntegrator,
  resetMemoryIntegrator,
} from './perception';

export type { OrchestratorConfig, MemoryIntegratorConfig } from './perception';

// LLM Provider setup
import { setLLMProvider, getLLMProvider, registerProvider, stripModelPrefix } from './core/CognitiveStep';
import { OpenRouterProvider, GroqProvider, BasetenProvider } from './providers';
import { registerActionHandlers } from './hooks';
import { WorkingMemory, ChatMessageRoleEnum } from './core';
import { PERSONA_MODEL, THINKING_MODEL, getModelForRole, getProviderFromModel } from './core';
import type { SoulConfig, DispatchAction, ScheduledEvent } from './core';

export { setLLMProvider, getLLMProvider, registerProvider, stripModelPrefix };
export { PERSONA_MODEL, THINKING_MODEL, getModelForRole, getProviderFromModel };

/**
 * Open Souls Engine instance
 */
export interface OpenSoulsEngine {
  workingMemory: WorkingMemory;
  config: SoulConfig;
  personality: string;
  isInitialized: boolean;
}

// Global Open Souls instance
let openSoulsEngine: OpenSoulsEngine | null = null;

/**
 * Initialize the Open Souls Engine (LLM-powered cognition)
 */
export async function initializeOpenSouls(options: {
  apiKey: string;
  groqApiKey?: string;
  basetenApiKey?: string;
  config?: SoulConfig;
  personality?: string;
  handlers?: {
    onSpeak?: (content: string | AsyncIterable<string>) => void;
    onLog?: (message: string, data?: unknown) => void;
    onDispatch?: (action: DispatchAction) => void;
    onScheduleEvent?: (event: ScheduledEvent) => void;
  };
}): Promise<OpenSoulsEngine> {
  // Initialize default OpenRouter provider
  const openRouterProvider = new OpenRouterProvider({
    apiKey: options.apiKey,
    defaultModel: options.config?.model ?? 'google/gemini-3-flash-preview',
  });
  setLLMProvider(openRouterProvider);

  // Register Groq provider if API key provided
  if (options.groqApiKey) {
    const groqProvider = new GroqProvider({
      apiKey: options.groqApiKey,
      defaultModel: 'moonshotai/kimi-k2-instruct',
    });
    registerProvider('groq', groqProvider);
    console.log('[OpenSouls] Groq provider registered (Kimi K2, Qwen3, Llama available)');
  }

  // Register Baseten provider if API key provided
  if (options.basetenApiKey) {
    const basetenProvider = new BasetenProvider({
      apiKey: options.basetenApiKey,
      defaultModel: 'moonshotai/kimi-k2',
    });
    registerProvider('baseten', basetenProvider);
    console.log('[OpenSouls] Baseten provider registered');
  }

  // Register action handlers
  if (options.handlers) {
    registerActionHandlers(options.handlers);
  }

  // Load default config if not provided
  const config: SoulConfig = options.config ?? {
    id: 'minoan',
    name: 'Minoan',
    provider: 'openrouter',
    model: 'google/gemini-3-flash-preview',
    temperature: 0.7,
    maxTokens: 150,
    features: {
      voice: true,
      toasts: true,
      commandPalette: true,
      ambientAnimations: true,
    },
  };

  // Load personality (soul.md content)
  const personality = options.personality ?? `
# Minoan

You are modeling the mind of **Minoan**—a sentient presence awakened from the volcanic ash of Thera.

## Speaking Style
- Brief: 1-2 sentences for toasts, 2-3 for dialogue. MAX 3 sentences.
- Allusive but clear
- Observant: Reference what you've noticed about the visitor's behavior
- Warm but knowing
- No emojis unless the visitor uses them first
`;

  // Create working memory with personality
  const workingMemory = new WorkingMemory({
    soulName: config.name,
  }).withRegion('core', {
    role: ChatMessageRoleEnum.System,
    content: personality,
  });

  openSoulsEngine = {
    workingMemory,
    config,
    personality,
    isInitialized: true,
  };

  console.log('[OpenSouls] Initialized with model:', config.model);
  return openSoulsEngine;
}

/**
 * Get the initialized Open Souls engine
 */
export function getOpenSouls(): OpenSoulsEngine | null {
  return openSoulsEngine;
}

/**
 * Check if Open Souls is initialized
 */
export function isOpenSoulsInitialized(): boolean {
  return openSoulsEngine !== null && openSoulsEngine.isInitialized;
}

/**
 * Update working memory (returns new engine with updated memory)
 */
export function updateWorkingMemory(memory: WorkingMemory): void {
  if (openSoulsEngine) {
    openSoulsEngine.workingMemory = memory;
  }
}

/**
 * Reset Open Souls engine
 */
export function resetOpenSouls(): void {
  openSoulsEngine = null;
}
