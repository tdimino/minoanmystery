/**
 * Perception Module
 *
 * Bridges MVP perception layer with Open Souls mental processes.
 */

// Pure function for memory integration
export { memoryIntegrate } from './memoryIntegrate';

// Orchestrator (replaces MemoryIntegrator)
export {
  SoulOrchestrator,
  getSoulOrchestrator,
  resetSoulOrchestrator,
  // Backward compatibility aliases
  MemoryIntegrator,
  getMemoryIntegrator,
  resetMemoryIntegrator,
} from './SoulOrchestrator';

export type {
  OrchestratorConfig,
  MemoryIntegratorConfig,
} from './SoulOrchestrator';
