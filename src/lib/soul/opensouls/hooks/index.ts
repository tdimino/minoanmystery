/**
 * Hooks system for the Minoan Soul Engine
 */

export { useActions, registerActionHandlers } from './useActions';
export {
  useSoulMemory,
  clearSoulMemory,
  getSoulMemoryKeys,
  type SoulMemoryRef,
} from './useSoulMemory';
export {
  useProcessMemory,
  clearProcessMemory,
  getCurrentProcess,
  setCurrentProcess,
  type ProcessMemoryRef,
} from './useProcessMemory';
export {
  usePerceptions,
  queuePerception,
  setCurrentPerception,
  dequeuePerception,
  clearPerceptions,
  hasPendingPerceptions,
  type PerceptionRefs,
} from './usePerceptions';
