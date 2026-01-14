/**
 * useProcessMemory - Hook for process-scoped memory
 *
 * Resets when transitioning to a different mental process.
 * Used for process-specific state like loop counters, intermediate results, etc.
 *
 * Enhanced with optional localStorage persistence for cross-session memory.
 */

// Process memory storage: sessionId -> processName -> key -> value
const processMemoryStore = new Map<string, Map<string, Map<string, unknown>>>();

// Track current process per session for reset detection
const currentProcesses = new Map<string, string>();

// Persistence prefix for localStorage
const STORAGE_PREFIX = 'soul_process_memory_';

/**
 * Memory reference object
 */
export interface ProcessMemoryRef<T> {
  current: T;
}

/**
 * Options for process memory
 */
export interface ProcessMemoryOptions {
  persist?: boolean;  // Persist to localStorage
  ttl?: number;       // Time-to-live in milliseconds (for persistent memory)
}

/**
 * Persistent memory entry with metadata
 */
interface PersistedEntry<T> {
  value: T;
  timestamp: number;
  ttl?: number;
}

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/**
 * Get storage key for persistence
 */
function getStorageKey(sessionId: string, processName: string, key: string): string {
  return `${STORAGE_PREFIX}${sessionId}_${processName}_${key}`;
}

/**
 * Load persisted value from localStorage
 */
function loadPersistedValue<T>(storageKey: string, initialValue: T): T {
  if (!isBrowser()) return initialValue;

  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return initialValue;

    const entry: PersistedEntry<T> = JSON.parse(stored);

    // Check TTL
    if (entry.ttl) {
      const age = Date.now() - entry.timestamp;
      if (age > entry.ttl) {
        localStorage.removeItem(storageKey);
        return initialValue;
      }
    }

    return entry.value;
  } catch {
    return initialValue;
  }
}

/**
 * Save value to localStorage
 */
function persistValue<T>(storageKey: string, value: T, ttl?: number): void {
  if (!isBrowser()) return;

  try {
    const entry: PersistedEntry<T> = {
      value,
      timestamp: Date.now(),
      ...(ttl ? { ttl } : {}),
    };
    localStorage.setItem(storageKey, JSON.stringify(entry));
  } catch {
    // Storage full or unavailable, silently fail
  }
}

/**
 * useProcessMemory - Access process-scoped memory
 *
 * @param sessionId - Session identifier
 * @param processName - Name of the current mental process
 * @param key - Memory key
 * @param initialValue - Default value
 * @param options - Optional configuration (persist, ttl)
 * @returns Reference object with .current property
 *
 * @example
 * // Ephemeral (resets on process change)
 * const counter = useProcessMemory<number>(sessionId, 'greetingProcess', 'attempts', 0);
 *
 * // Persistent across sessions
 * const history = useProcessMemory<string[]>(sessionId, 'chat', 'topics', [], { persist: true });
 *
 * // Persistent with TTL (1 hour)
 * const cache = useProcessMemory<Data>(sessionId, 'fetch', 'result', null, {
 *   persist: true,
 *   ttl: 60 * 60 * 1000
 * });
 */
export function useProcessMemory<T>(
  sessionId: string,
  processName: string,
  key: string,
  initialValue: T,
  options: ProcessMemoryOptions = {}
): ProcessMemoryRef<T> {
  const { persist = false, ttl } = options;
  const storageKey = getStorageKey(sessionId, processName, key);

  // Check if process changed - if so, clear that session's process memory
  const lastProcess = currentProcesses.get(sessionId);
  if (lastProcess && lastProcess !== processName) {
    // Process changed, clear old process memory (but not persistent storage)
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
    // Check persistent storage first if enabled
    const value = persist
      ? loadPersistedValue(storageKey, initialValue)
      : initialValue;
    processStore.set(key, value);
  }

  // Create reference object with persistence support
  const ref: ProcessMemoryRef<T> = {
    get current() {
      return (processStore.get(key) as T) ?? initialValue;
    },
    set current(newValue: T) {
      processStore.set(key, newValue);
      if (persist) {
        persistValue(storageKey, newValue, ttl);
      }
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
 * Clear persistent storage for a session
 */
export function clearPersistedMemory(sessionId: string, processName?: string, key?: string): void {
  if (!isBrowser()) return;

  const prefix = processName
    ? key
      ? getStorageKey(sessionId, processName, key)
      : `${STORAGE_PREFIX}${sessionId}_${processName}_`
    : `${STORAGE_PREFIX}${sessionId}_`;

  if (key) {
    // Clear specific key
    localStorage.removeItem(prefix);
  } else {
    // Clear all matching keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey?.startsWith(prefix)) {
        keysToRemove.push(storageKey);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
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

/**
 * Get all persisted keys for a session (for debugging/inspection)
 */
export function getPersistedKeys(sessionId: string): string[] {
  if (!isBrowser()) return [];

  const prefix = `${STORAGE_PREFIX}${sessionId}_`;
  const keys: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) {
      keys.push(key.replace(prefix, ''));
    }
  }

  return keys;
}

export default useProcessMemory;
