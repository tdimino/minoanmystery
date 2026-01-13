/**
 * Minoan Soul Engine
 *
 * Main entry point for the soul integration system.
 * Coordinates perception, memory, processes, triggers, and dispatch.
 *
 * Usage:
 *   import { initSoul, destroySoul, soul } from '@/lib/soul';
 *
 *   // Initialize on page load
 *   initSoul();
 *
 *   // Access soul state
 *   soul.memory.get();
 *   soul.processes.getCurrentState();
 *
 *   // Cleanup on unmount
 *   destroySoul();
 */

// Re-export types
export * from './types';

// Re-export managers
export { getSoulMemory, resetSoulMemory, SoulMemory } from './memory';
export { getPerceptionManager, resetPerceptionManager, onPerception, PerceptionManager } from './perception';
export { getProcessManager, resetProcessManager, ProcessManager } from './processes';
export { getSoulDispatch, resetSoulDispatch, onAction, SoulDispatch } from './dispatch';
export { getTriggerManager, resetTriggerManager, TriggerManager } from './triggers';

import type { SoulConfig, PerceptionEvent } from './types';
import { DEFAULT_CONFIG } from './types';
import { getSoulMemory, resetSoulMemory } from './memory';
import { getPerceptionManager, resetPerceptionManager, onPerception } from './perception';
import { getProcessManager, resetProcessManager } from './processes';
import { getSoulDispatch, resetSoulDispatch } from './dispatch';
import { getTriggerManager, resetTriggerManager } from './triggers';

// ─────────────────────────────────────────────────────────────
// Soul Engine State
// ─────────────────────────────────────────────────────────────

interface SoulEngine {
  memory: ReturnType<typeof getSoulMemory>;
  perception: ReturnType<typeof getPerceptionManager>;
  processes: ReturnType<typeof getProcessManager>;
  dispatch: ReturnType<typeof getSoulDispatch>;
  triggers: ReturnType<typeof getTriggerManager>;
  config: SoulConfig;
  isInitialized: boolean;
}

let soulEngine: SoulEngine | null = null;

// ─────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────

export function initSoul(config: Partial<SoulConfig> = {}): SoulEngine {
  if (soulEngine?.isInitialized) {
    console.log('[Soul] Already initialized');
    return soulEngine;
  }

  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  // Initialize all managers
  const memory = getSoulMemory(fullConfig);
  const perception = getPerceptionManager(fullConfig);
  const processes = getProcessManager(fullConfig);
  const dispatch = getSoulDispatch();
  const triggers = getTriggerManager();

  // Wire up perception → triggers → processes
  const unsubscribePerception = onPerception((event: PerceptionEvent) => {
    // Evaluate event-driven triggers
    triggers.evaluateEvent(event);

    // Re-evaluate processes on significant events
    if (event.type === 'navigation' || event.type === 'scroll') {
      processes.evaluate();
      triggers.evaluate();
    }
  });

  // Wire up process state changes → triggers
  const unsubscribeProcesses = processes.onStateChange((from, to) => {
    // Evaluate triggers when state changes
    triggers.evaluate();

    // Log state transitions
    console.log(`[Soul] State: ${from} → ${to}`);
  });

  // Start perception
  perception.init();

  // Initial evaluations
  processes.evaluate();
  triggers.evaluate();

  soulEngine = {
    memory,
    perception,
    processes,
    dispatch,
    triggers,
    config: fullConfig,
    isInitialized: true
  };

  console.log('[Soul] Initialized');
  console.log('[Soul] Visit count:', memory.getVisitCount());
  console.log('[Soul] Current state:', processes.getCurrentState());

  // Debug in development
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    (window as unknown as Record<string, unknown>).soul = soulEngine;
    console.log('[Soul] Debug available at window.soul');
  }

  return soulEngine;
}

// ─────────────────────────────────────────────────────────────
// Destruction
// ─────────────────────────────────────────────────────────────

export function destroySoul(): void {
  if (!soulEngine) return;

  // Cleanup managers
  resetPerceptionManager();
  resetSoulDispatch();
  resetTriggerManager();
  resetProcessManager();
  // Don't reset memory - it persists across sessions

  soulEngine.isInitialized = false;
  soulEngine = null;

  console.log('[Soul] Destroyed');
}

// ─────────────────────────────────────────────────────────────
// Accessor
// ─────────────────────────────────────────────────────────────

export function getSoul(): SoulEngine | null {
  return soulEngine;
}

// ─────────────────────────────────────────────────────────────
// Convenience Functions
// ─────────────────────────────────────────────────────────────

export function toast(message: string, duration = 4000): void {
  getSoulDispatch().toast(message, duration);
}

export function getCurrentState(): string {
  return soulEngine?.processes.getCurrentState() || 'unknown';
}

export function getVisitCount(): number {
  return soulEngine?.memory.getVisitCount() || 0;
}

export function isReturningVisitor(): boolean {
  return soulEngine?.memory.isReturningVisitor() || false;
}

export function debug(): void {
  if (!soulEngine) {
    console.warn('[Soul] Not initialized');
    return;
  }

  console.group('[Soul Engine Debug]');
  soulEngine.memory.debug();
  soulEngine.processes.debug();
  soulEngine.triggers.debug();
  console.groupEnd();
}

// ─────────────────────────────────────────────────────────────
// Astro View Transitions Support
// ─────────────────────────────────────────────────────────────

export function setupViewTransitions(): void {
  if (typeof document === 'undefined') return;

  // Re-initialize on Astro page transitions
  document.addEventListener('astro:after-swap', () => {
    const soul = getSoul();
    if (soul) {
      // Re-evaluate after navigation
      soul.processes.evaluate();
      soul.triggers.evaluate();
    }
  });

  // Handle page unload
  document.addEventListener('astro:before-swap', () => {
    // Save any pending state
    const memory = getSoulMemory();
    memory.recordPageView(window.location.pathname); // Final time tracking
  });
}

// ─────────────────────────────────────────────────────────────
// Default Export
// ─────────────────────────────────────────────────────────────

export default {
  init: initSoul,
  destroy: destroySoul,
  get: getSoul,
  toast,
  getCurrentState,
  getVisitCount,
  isReturningVisitor,
  debug,
  setupViewTransitions
};
