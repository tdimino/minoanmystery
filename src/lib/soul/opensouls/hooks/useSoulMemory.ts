/**
 * useSoulMemory - Hook for persistent soul memory (localStorage)
 *
 * Persists across processes and sessions. Used for long-term state
 * like visitor preferences, interaction history, etc.
 */

const STORAGE_PREFIX = 'minoan_soul_';

// In-memory cache for current session
const memoryCache = new Map<string, unknown>();

/**
 * Memory reference object with reactive current property
 */
export interface SoulMemoryRef<T> {
  current: T;
}

/**
 * useSoulMemory - Access persistent soul memory
 *
 * @param sessionId - Session identifier (used as namespace)
 * @param key - Memory key
 * @param initialValue - Default value if not found
 * @returns Reference object with .current property
 *
 * @example
 * const visitCount = useSoulMemory<number>(sessionId, 'visitCount', 0);
 * visitCount.current++; // Auto-persists to localStorage
 */
export function useSoulMemory<T>(
  sessionId: string,
  key: string,
  initialValue: T
): SoulMemoryRef<T> {
  const storageKey = `${STORAGE_PREFIX}${key}`;
  const cacheKey = `${sessionId}:${key}`;

  // Try to load from cache first, then localStorage
  let value: T;
  if (memoryCache.has(cacheKey)) {
    value = memoryCache.get(cacheKey) as T;
  } else {
    try {
      const stored = localStorage.getItem(storageKey);
      value = stored ? JSON.parse(stored) : initialValue;
    } catch {
      value = initialValue;
    }
    memoryCache.set(cacheKey, value);
  }

  // Create proxy for auto-persistence
  const ref: SoulMemoryRef<T> = {
    get current() {
      return memoryCache.get(cacheKey) as T ?? initialValue;
    },
    set current(newValue: T) {
      memoryCache.set(cacheKey, newValue);
      try {
        localStorage.setItem(storageKey, JSON.stringify(newValue));
      } catch (e) {
        console.warn(`Failed to persist soul memory "${key}":`, e);
      }
    },
  };

  return ref;
}

/**
 * Clear all soul memory (for testing/reset)
 */
export function clearSoulMemory(): void {
  memoryCache.clear();
  if (typeof localStorage !== 'undefined') {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
}

/**
 * Get all soul memory keys
 */
export function getSoulMemoryKeys(): string[] {
  if (typeof localStorage === 'undefined') return [];
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      keys.push(key.replace(STORAGE_PREFIX, ''));
    }
  }
  return keys;
}

export default useSoulMemory;
