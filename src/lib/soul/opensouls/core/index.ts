/**
 * Core exports for the Minoan Soul Engine
 */

export { WorkingMemory } from './WorkingMemory';
export type { WorkingMemory as WorkingMemoryType } from './WorkingMemory';

export {
  ChatMessageRoleEnum,
  type Memory,
  type MemoryRegionConfig,
  type WorkingMemoryConfig,
  type WorkingMemorySnapshot,
  type CognitiveStep,
  type CognitiveStepConfig,
  type CognitiveStepFactory,
  type MentalProcess,
  type MentalProcessContext,
  type MentalProcessReturn,
  type SoulConfig,
  type SoulDefinition,
  type Perception,
  type PerceptionType,
  type SoulState,
  type SoulMemory,
  type SoulActions,
  type DispatchAction,
  type ScheduledEvent,
} from './types';

export { createCognitiveStep } from './CognitiveStep';
export { indentNicely, safeName, stripEntityAndVerb } from './utils';

// Memory Regions
export {
  REGIONS,
  REGION_CONFIGS,
  getRegionalOrder,
  getRegionConfig,
  isCompressible,
  isPersistent,
  createRegionMemory,
  createVisitorContextMemory,
  createPortfolioInterestMemory,
  createConversationSummaryMemory,
  type RegionName,
  type RegionConfig,
} from './regions';

// Memory Compression
export {
  MemoryCompressor,
  getDefaultCompressor,
  compressIfNeeded,
  type CompressionConfig,
} from './MemoryCompressor';

// Model Configuration
export {
  PERSONA_MODEL,
  THINKING_MODEL,
  getModelForRole,
  getProviderFromModel,
  stripProviderPrefix,
  type ModelRole,
} from './models';

// Soul Logger
export {
  default as SoulLogger,
  getSoulLogger,
  resetSoulLogger,
  soulLogger,
  type TokenUsage,
  type CognitiveStepLog,
  type MemoryMutationLog,
  type StateTransitionLog,
  type LogLevel,
} from './SoulLogger';
