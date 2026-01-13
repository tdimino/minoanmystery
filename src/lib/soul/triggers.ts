/**
 * Soul Triggers
 *
 * Rule-based triggers that fire soul reactions based on user behavior.
 *
 * 5 Core Triggers:
 * 1. Returning Visitor - visitCount > 1 → "Welcome back" toast
 * 2. Deep Reader - scrollDepth > 70% AND time > 2min → Subtle CTA highlight
 * 3. Explorer - pagesViewed >= 3 in session → "You seem curious" hint
 * 4. Contact Bound - hover on contact link > 1s → Personalized CTA text
 * 5. Idle Wanderer - idle > 30s → Ambient animation intensifies
 */

import type { Trigger, UserModel, PerceptionEvent } from './types';
import { getSoulMemory } from './memory';
import { getSoulDispatch, SoulDispatch } from './dispatch';

// ─────────────────────────────────────────────────────────────
// Trigger Definitions
// ─────────────────────────────────────────────────────────────

const triggers: Trigger[] = [
  // ─── 1. Returning Visitor ──────────────────────────────────
  {
    id: 'returning-visitor',
    name: 'Returning Visitor',
    description: 'Welcomes back visitors who have been here before',
    condition: (memory: UserModel) => memory.visitCount > 1,
    action: {
      type: 'toast',
      payload: {
        message: 'Welcome back to the labyrinth...',
        duration: 4000,
        type: 'welcome'
      }
    },
    maxFires: 1,  // Only fire once per session
    firedCount: 0
  },

  // ─── 2. Deep Reader ────────────────────────────────────────
  {
    id: 'deep-reader',
    name: 'Deep Reader',
    description: 'Highlights CTA when user deeply engages with content',
    condition: (memory: UserModel) => {
      const currentPage = memory.currentPage;
      const scrollDepth = memory.scrollDepths[currentPage] || 0;
      const timeOnPage = memory.timePerPage[currentPage] || 0;

      // 70% scroll AND 2+ minutes on any page (including current session time)
      const isDeepRead = scrollDepth >= 70 && timeOnPage >= 120000;

      // Only trigger on portfolio/case study pages
      const isPortfolioPage = currentPage.includes('/portfolio') ||
        currentPage.includes('/dolby') ||
        currentPage.includes('/acs') ||
        currentPage.includes('/czi');

      return isDeepRead && isPortfolioPage;
    },
    action: {
      type: 'highlight',
      payload: {
        selector: '.cta-button, a[href="/contact"], a[href*="calendly"]',
        duration: 5000,
        style: 'glow'
      }
    },
    cooldown: 300000,  // 5 minutes between fires
    maxFires: 2,
    firedCount: 0
  },

  // ─── 3. Explorer ───────────────────────────────────────────
  {
    id: 'explorer',
    name: 'Explorer',
    description: 'Acknowledges curious visitors exploring the site',
    condition: (memory: UserModel) => memory.pagesViewed.length >= 3,
    action: {
      type: 'toast',
      payload: {
        message: 'You seem curious. The labyrinth rewards exploration.',
        duration: 4000,
        type: 'hint'
      }
    },
    maxFires: 1,
    firedCount: 0
  },

  // ─── 4. Contact Bound ──────────────────────────────────────
  {
    id: 'contact-bound',
    name: 'Contact Bound',
    description: 'Personalizes CTA when user hovers on contact links',
    condition: (memory: UserModel) => {
      // This trigger is event-driven, not state-driven
      // It fires from hover events, not from evaluate()
      return false; // Handled separately in evaluateEvent()
    },
    action: {
      type: 'cta',
      payload: {
        selector: 'section a[href="/contact"]',  // Only page CTAs, not navbar
        text: 'Let\'s build something together',
        originalText: 'Inquire herein'
      }
    },
    cooldown: 60000,  // 1 minute between fires
    maxFires: 0,  // DISABLED
    firedCount: 0
  },

  // ─── 5. Idle Wanderer ──────────────────────────────────────
  {
    id: 'idle-wanderer',
    name: 'Idle Wanderer',
    description: 'Intensifies ambient animation when user is idle',
    condition: (memory: UserModel) => memory.idleTime >= 30000,
    action: {
      type: 'animate',
      payload: {
        target: '.hero-blob, .ambient-bg',
        animation: 'intensify'
      }
    },
    cooldown: 60000,  // 1 minute between fires
    maxFires: 3,
    firedCount: 0
  }
];

// ─────────────────────────────────────────────────────────────
// Trigger Manager Class
// ─────────────────────────────────────────────────────────────

export class TriggerManager {
  private triggers: Trigger[];
  private triggerState: Map<string, { firedCount: number; lastFired: number }>;

  constructor() {
    this.triggers = triggers.map((t) => ({ ...t }));
    this.triggerState = new Map();

    // Initialize trigger state
    this.triggers.forEach((trigger) => {
      this.triggerState.set(trigger.id, {
        firedCount: 0,
        lastFired: 0
      });
    });
  }

  // ─── Evaluate All Triggers ─────────────────────────────────

  evaluate(): void {
    const memory = getSoulMemory().get();
    const dispatch = getSoulDispatch();

    for (const trigger of this.triggers) {
      if (this.canFire(trigger) && trigger.condition(memory)) {
        this.fire(trigger, dispatch);
      }
    }
  }

  // ─── Evaluate Event-Driven Triggers ────────────────────────

  evaluateEvent(event: PerceptionEvent): void {
    const memory = getSoulMemory().get();
    const dispatch = getSoulDispatch();

    // Contact Bound trigger - fires on hover events
    if (event.type === 'hover') {
      const target = event.metadata.element as string;
      const isContactLink = target.includes('contact') ||
        target.includes('/contact') ||
        target.includes('schedule');

      if (isContactLink) {
        const trigger = this.getTrigger('contact-bound');
        if (trigger && this.canFire(trigger)) {
          this.fire(trigger, dispatch);
        }
      }
    }

    // Idle Wanderer trigger - fires on idle events
    if (event.type === 'idle') {
      const trigger = this.getTrigger('idle-wanderer');
      if (trigger && this.canFire(trigger)) {
        this.fire(trigger, dispatch);
      }
    }
  }

  // ─── Trigger Helpers ───────────────────────────────────────

  private getTrigger(id: string): Trigger | undefined {
    return this.triggers.find((t) => t.id === id);
  }

  private canFire(trigger: Trigger): boolean {
    const state = this.triggerState.get(trigger.id);
    if (!state) return false;

    // Check max fires
    if (trigger.maxFires && state.firedCount >= trigger.maxFires) {
      return false;
    }

    // Check cooldown
    if (trigger.cooldown && state.lastFired > 0) {
      const elapsed = Date.now() - state.lastFired;
      if (elapsed < trigger.cooldown) {
        return false;
      }
    }

    return true;
  }

  private fire(trigger: Trigger, dispatch: SoulDispatch): void {
    const state = this.triggerState.get(trigger.id);
    if (!state) return;

    // Update state
    state.firedCount++;
    state.lastFired = Date.now();
    this.triggerState.set(trigger.id, state);

    // Execute action
    dispatch.dispatch(trigger.action);

    console.log(`[Triggers] Fired: ${trigger.name} (${state.firedCount}/${trigger.maxFires || '∞'})`);
  }

  // ─── Manual Trigger ────────────────────────────────────────

  forceTrigger(id: string): boolean {
    const trigger = this.getTrigger(id);
    if (!trigger) {
      console.warn('[Triggers] Unknown trigger:', id);
      return false;
    }

    const dispatch = getSoulDispatch();
    dispatch.dispatch(trigger.action);

    console.log(`[Triggers] Force fired: ${trigger.name}`);
    return true;
  }

  // ─── Reset ─────────────────────────────────────────────────

  reset(): void {
    this.triggerState.forEach((state) => {
      state.firedCount = 0;
      state.lastFired = 0;
    });
  }

  resetTrigger(id: string): void {
    const state = this.triggerState.get(id);
    if (state) {
      state.firedCount = 0;
      state.lastFired = 0;
    }
  }

  // ─── Debug ─────────────────────────────────────────────────

  debug(): void {
    console.group('[Triggers] Status');
    this.triggers.forEach((trigger) => {
      const state = this.triggerState.get(trigger.id);
      console.log(
        `${trigger.name}: ${state?.firedCount || 0}/${trigger.maxFires || '∞'} fires`,
        state?.lastFired ? `(last: ${Math.round((Date.now() - state.lastFired) / 1000)}s ago)` : ''
      );
    });
    console.groupEnd();
  }

  // ─── Get Trigger Info ──────────────────────────────────────

  getTriggerInfo(): Array<{
    id: string;
    name: string;
    description: string;
    firedCount: number;
    maxFires: number | undefined;
    canFire: boolean;
  }> {
    return this.triggers.map((trigger) => {
      const state = this.triggerState.get(trigger.id);
      return {
        id: trigger.id,
        name: trigger.name,
        description: trigger.description,
        firedCount: state?.firedCount || 0,
        maxFires: trigger.maxFires,
        canFire: this.canFire(trigger)
      };
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────

let triggerManagerInstance: TriggerManager | null = null;

export function getTriggerManager(): TriggerManager {
  if (!triggerManagerInstance) {
    triggerManagerInstance = new TriggerManager();
  }
  return triggerManagerInstance;
}

export function resetTriggerManager(): void {
  triggerManagerInstance = null;
}
