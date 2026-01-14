/**
 * Soul Mental Processes
 *
 * State machine for soul behavioral states.
 * Transitions based on user behavior patterns.
 *
 * State Flow:
 * greeting ──(3+ pages)──▶ curious ──(deep read)──▶ engaged ──(contact hover)──▶ ready
 *     ▲                                                                            │
 *     └────────────────────────────(returning visit)───────────────────────────────┘
 */

import type { SoulState, StateTransition, UserModel, BehavioralType, SoulConfig } from './types';
import { DEFAULT_CONFIG } from './types';
import { getSoulMemory } from './memory';

// ─────────────────────────────────────────────────────────────
// State Transitions
// ─────────────────────────────────────────────────────────────

const transitions: StateTransition[] = [
  // greeting → curious: User explores multiple pages
  {
    from: 'greeting',
    to: 'curious',
    condition: (memory: UserModel) => memory.pagesViewed.length >= 3
  },

  // greeting → returning: Already a returning visitor
  {
    from: 'greeting',
    to: 'returning',
    condition: (memory: UserModel) => memory.visitCount > 1
  },

  // curious → engaged: Deep reading behavior
  {
    from: 'curious',
    to: 'engaged',
    condition: (memory: UserModel) => {
      const currentPage = memory.currentPage;
      const scrollDepth = memory.scrollDepths[currentPage] || 0;
      const timeOnPage = memory.timePerPage[currentPage] || 0;

      // 70% scroll AND 2+ minutes on page
      return scrollDepth >= 70 && timeOnPage >= 120000;
    }
  },

  // engaged → ready: Shows interest in contact
  {
    from: 'engaged',
    to: 'ready',
    condition: (memory: UserModel) => {
      // Clicked contact link or visited contact page
      const visitedContact = memory.pagesViewed.includes('/contact');
      const clickedContact = memory.clickedElements.some(
        (el) => el.includes('contact') || el.includes('schedule')
      );
      return visitedContact || clickedContact;
    }
  },

  // returning → curious: Even returning visitors can become curious
  {
    from: 'returning',
    to: 'curious',
    condition: (memory: UserModel) => {
      // New pages viewed this session beyond entry
      const sessionPages = memory.pagesViewed.slice(-5); // Last 5 pages
      return sessionPages.length >= 3;
    }
  },

  // curious → returning: Recognized patterns from previous visits
  {
    from: 'curious',
    to: 'returning',
    condition: (memory: UserModel) => memory.visitCount > 2
  },

  // ready can stay ready (terminal state for session)
  // Or transition back to returning on next visit
];

// ─────────────────────────────────────────────────────────────
// Behavioral Type Inference
// ─────────────────────────────────────────────────────────────

function inferBehavioralType(memory: UserModel, config: SoulConfig): BehavioralType {
  const avgScrollDepth = calculateAverageScrollDepth(memory);
  const totalTime = Object.values(memory.timePerPage).reduce((a, b) => a + b, 0);
  const pageCount = memory.pagesViewed.length;

  // Scanner: Low scroll depth, quick browsing
  if (avgScrollDepth < config.scannerScrollThreshold) {
    return 'scanner';
  }

  // Reader: High time on pages, deep scrolling
  if (totalTime > config.readerTimeThreshold && avgScrollDepth > 60) {
    return 'reader';
  }

  // Explorer: Many pages visited
  if (pageCount >= config.explorerPageThreshold) {
    return 'explorer';
  }

  // Focused: Few pages, high engagement
  if (pageCount <= 2 && avgScrollDepth > 50) {
    return 'focused';
  }

  return 'explorer'; // Default
}

function calculateAverageScrollDepth(memory: UserModel): number {
  const depths = Object.values(memory.scrollDepths);
  if (depths.length === 0) return 0;
  return depths.reduce((a, b) => a + b, 0) / depths.length;
}

// ─────────────────────────────────────────────────────────────
// Process Manager Class
// ─────────────────────────────────────────────────────────────

export class ProcessManager {
  private config: SoulConfig;
  private stateChangeHandlers: Set<(from: SoulState, to: SoulState) => void> = new Set();

  constructor(config: Partial<SoulConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─── State Evaluation ──────────────────────────────────────

  evaluate(): SoulState {
    const memory = getSoulMemory();
    const userModel = memory.get();
    const currentState = userModel.currentState;

    // Check for valid transitions from current state
    for (const transition of transitions) {
      if (transition.from === currentState && transition.condition(userModel)) {
        // Execute transition
        memory.setState(transition.to);

        // Update behavioral type
        const newType = inferBehavioralType(userModel, this.config);
        memory.setBehavioralType(newType);

        // Notify handlers
        this.notifyStateChange(currentState, transition.to);

        console.log(`[ProcessManager] State transition: ${currentState} → ${transition.to}`);
        return transition.to;
      }
    }

    // No transition, but still update behavioral type
    const newType = inferBehavioralType(userModel, this.config);
    if (newType !== userModel.behavioralType) {
      memory.setBehavioralType(newType);
    }

    return currentState;
  }

  // ─── State Observation ─────────────────────────────────────

  onStateChange(handler: (from: SoulState, to: SoulState) => void): () => void {
    this.stateChangeHandlers.add(handler);
    return () => this.stateChangeHandlers.delete(handler);
  }

  private notifyStateChange(from: SoulState, to: SoulState): void {
    this.stateChangeHandlers.forEach((handler) => {
      try {
        handler(from, to);
      } catch (e) {
        console.error('[ProcessManager] Handler error:', e);
      }
    });
  }

  // ─── State Queries ─────────────────────────────────────────

  getCurrentState(): SoulState {
    return getSoulMemory().getState();
  }

  getBehavioralType(): BehavioralType {
    return getSoulMemory().get().behavioralType;
  }

  // ─── State Descriptions ────────────────────────────────────

  getStateDescription(state?: SoulState): string {
    const s = state || this.getCurrentState();

    const descriptions: Record<SoulState, string> = {
      greeting: 'New visitor, welcoming mode',
      curious: 'Exploring the site, showing interest',
      engaged: 'Deep reading, highly engaged',
      ready: 'Ready for contact, conversion intent',
      returning: 'Recognized visitor, personalized experience',
      dormant: 'Extended idle, soul reflecting on journey',
      exiting: 'Exit intent detected, saving journey'
    };

    return descriptions[s];
  }

  getBehavioralDescription(type?: BehavioralType): string {
    const t = type || this.getBehavioralType();

    const descriptions: Record<BehavioralType, string> = {
      scanner: 'Quick browser, skimming content',
      reader: 'Deep reader, consuming content thoroughly',
      explorer: 'Curious explorer, visiting many pages',
      focused: 'Focused visitor, high engagement on few pages'
    };

    return descriptions[t];
  }

  // ─── Debug ─────────────────────────────────────────────────

  debug(): void {
    const memory = getSoulMemory().get();

    console.group('[ProcessManager] State Analysis');
    console.log('Current State:', this.getCurrentState());
    console.log('State Description:', this.getStateDescription());
    console.log('Behavioral Type:', this.getBehavioralType());
    console.log('Behavioral Description:', this.getBehavioralDescription());
    console.log('Average Scroll Depth:', calculateAverageScrollDepth(memory).toFixed(1) + '%');
    console.log('Total Time on Site:', (Object.values(memory.timePerPage).reduce((a, b) => a + b, 0) / 1000).toFixed(0) + 's');
    console.log('Pages Viewed:', memory.pagesViewed.length);
    console.groupEnd();
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────

let processManagerInstance: ProcessManager | null = null;

export function getProcessManager(config?: Partial<SoulConfig>): ProcessManager {
  if (!processManagerInstance) {
    processManagerInstance = new ProcessManager(config);
  }
  return processManagerInstance;
}

export function resetProcessManager(): void {
  processManagerInstance = null;
}
