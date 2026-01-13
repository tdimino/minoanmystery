/**
 * useProcessMemory - Hook for process-scoped memory
 *
 * Resets when transitioning to a different mental process.
 * Used for process-specific state like loop counters, intermediate results, etc.
 */

// Process memory storage: sessionId -> processName -> key -> value
const processMemoryStore = new Map<string, Map<string, Map<string, unknown>>>();

// Track current process per session for reset detection
const currentProcesses = new Map<string, string>();

/**
 * Memory reference object
 */
export interface ProcessMemoryRef<T> {
  current: T;
}

/**
 * useProcessMemory - Access process-scoped memory
 *
 * @param sessionId - Session identifier
 * @param processName - Name of the current mental process
 * @param key - Memory key
 * @param initialValue - Default value
 * @returns Reference object with .current property
 *
 * @example
 * const counter = useProcessMemory<number>(sessionId, 'greetingProcess', 'attempts', 0);
 * counter.current++; // Resets if process changes
 */
export function useProcessMemory<T>(
  sessionId: string,
  processName: string,
  key: string,
  initialValue: T
): ProcessMemoryRef<T> {
  // Check if process changed - if so, clear that session's process memory
  const lastProcess = currentProcesses.get(sessionId);
  if (lastProcess && lastProcess !== processName) {
    // Process changed, clear old process memory
    const sessionStore = processMemoryStore.get(sessionId);
    if (sessionStore) {
      sessionStore.delete(lastProcess);
    }
  }
  currentProcesses.set(sessionId, processName);

  // Get or create session store
  if (!processMemoryStore.has(sessionId)) {
    processMemoryStore.set(sessionId, new Map());
  }
  const sessionStore = processMemoryStore.get(sessionId)!;

  // Get or create process store
  if (!sessionStore.has(processName)) {
    sessionStore.set(processName, new Map());
  }
  const processStore = sessionStore.get(processName)!;

  // Initialize value if not present
  if (!processStore.has(key)) {
    processStore.set(key, initialValue);
  }

  // Create reference object
  const ref: ProcessMemoryRef<T> = {
    get current() {
      return (processStore.get(key) as T) ?? initialValue;
    },
    set current(newValue: T) {
      processStore.set(key, newValue);
    },
  };

  return ref;
}

/**
 * Clear process memory for a session (called on process transition)
 */
export function clearProcessMemory(sessionId: string, processName?: string): void {
  const sessionStore = processMemoryStore.get(sessionId);
  if (sessionStore) {
    if (processName) {
      sessionStore.delete(processName);
    } else {
      sessionStore.clear();
    }
  }
}

/**
 * Get current process name for a session
 */
export function getCurrentProcess(sessionId: string): string | undefined {
  return currentProcesses.get(sessionId);
}

/**
 * Set current process (for explicit transitions)
 */
export function setCurrentProcess(sessionId: string, processName: string): void {
  currentProcesses.set(sessionId, processName);
}

export default useProcessMemory;
