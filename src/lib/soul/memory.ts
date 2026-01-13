/**
 * Soul Memory Layer
 *
 * Manages the UserModel (Working Memory) with localStorage persistence.
 * Follows Open Souls immutability patterns - all operations return new state.
 */

import type { UserModel, SoulState, BehavioralType, SoulConfig } from './types';
import { DEFAULT_CONFIG } from './types';

// ─────────────────────────────────────────────────────────────
// UUID Generation
// ─────────────────────────────────────────────────────────────

function generateSessionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─────────────────────────────────────────────────────────────
// Default User Model
// ─────────────────────────────────────────────────────────────

function createDefaultUserModel(): UserModel {
  const now = Date.now();
  return {
    sessionId: generateSessionId(),
    visitCount: 1,
    firstVisit: now,
    lastVisit: now,

    pagesViewed: [],
    currentPage: '',
    entryPage: '',

    timePerPage: {},
    scrollDepths: {},
    clickedElements: [],

    inferredInterests: [],
    behavioralType: 'explorer',
    currentState: 'greeting',

    lastInteraction: now,
    idleTime: 0,
    paletteUses: 0,

    recentCommands: []
  };
}

// ─────────────────────────────────────────────────────────────
// Memory Manager Class
// ─────────────────────────────────────────────────────────────

export class SoulMemory {
  private memory: UserModel;
  private config: SoulConfig;
  private pageStartTime: number;

  constructor(config: Partial<SoulConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.pageStartTime = Date.now();
    this.memory = this.load();
  }

  // ─── Persistence ───────────────────────────────────────────

  private load(): UserModel {
    if (typeof window === 'undefined') {
      return createDefaultUserModel();
    }

    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as UserModel;

        // Check if this is a returning visitor (new session)
        const isNewSession = Date.now() - parsed.lastVisit > 30 * 60 * 1000; // 30 min gap

        if (isNewSession) {
          // Returning visitor - new session, preserve history
          return {
            ...parsed,
            sessionId: generateSessionId(),
            visitCount: parsed.visitCount + 1,
            lastVisit: Date.now(),
            currentPage: '',
            currentState: 'returning',
            lastInteraction: Date.now(),
            idleTime: 0
          };
        }

        // Continuing session
        return {
          ...parsed,
          lastVisit: Date.now(),
          lastInteraction: Date.now(),
          idleTime: 0
        };
      }
    } catch (e) {
      console.warn('[SoulMemory] Failed to load from localStorage:', e);
    }

    return createDefaultUserModel();
  }

  private save(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.memory));
    } catch (e) {
      console.warn('[SoulMemory] Failed to save to localStorage:', e);
    }
  }

  // ─── Immutable Updates ─────────────────────────────────────

  private update(changes: Partial<UserModel>): UserModel {
    this.memory = { ...this.memory, ...changes };
    this.save();
    return this.memory;
  }

  // ─── Public Getters ────────────────────────────────────────

  get(): UserModel {
    return { ...this.memory };
  }

  getState(): SoulState {
    return this.memory.currentState;
  }

  getVisitCount(): number {
    return this.memory.visitCount;
  }

  getPagesViewed(): string[] {
    return [...this.memory.pagesViewed];
  }

  isReturningVisitor(): boolean {
    return this.memory.visitCount > 1;
  }

  // ─── Page Tracking ─────────────────────────────────────────

  recordPageView(page: string): UserModel {
    const now = Date.now();

    // Record time on previous page
    const timeOnPrevPage = now - this.pageStartTime;
    const prevPage = this.memory.currentPage;
    const newTimePerPage = { ...this.memory.timePerPage };

    if (prevPage) {
      newTimePerPage[prevPage] = (newTimePerPage[prevPage] || 0) + timeOnPrevPage;
    }

    // Update pages viewed
    let pagesViewed = [...this.memory.pagesViewed];
    if (!pagesViewed.includes(page)) {
      pagesViewed.push(page);
      // Limit tracked pages
      if (pagesViewed.length > this.config.maxPagesTracked) {
        pagesViewed = pagesViewed.slice(-this.config.maxPagesTracked);
      }
    }

    // Set entry page if first page
    const entryPage = this.memory.entryPage || page;

    this.pageStartTime = now;

    return this.update({
      pagesViewed,
      currentPage: page,
      entryPage,
      timePerPage: newTimePerPage,
      lastInteraction: now,
      idleTime: 0
    });
  }

  // ─── Scroll Tracking ───────────────────────────────────────

  recordScrollDepth(page: string, depth: number): UserModel {
    const currentDepth = this.memory.scrollDepths[page] || 0;

    // Only update if deeper than before
    if (depth <= currentDepth) {
      return this.memory;
    }

    return this.update({
      scrollDepths: {
        ...this.memory.scrollDepths,
        [page]: Math.min(100, Math.max(0, depth))
      },
      lastInteraction: Date.now(),
      idleTime: 0
    });
  }

  // ─── Click Tracking ────────────────────────────────────────

  recordClick(elementId: string): UserModel {
    const clicked = [...this.memory.clickedElements];
    if (!clicked.includes(elementId)) {
      clicked.push(elementId);
    }

    return this.update({
      clickedElements: clicked,
      lastInteraction: Date.now(),
      idleTime: 0
    });
  }

  // ─── Command Palette ───────────────────────────────────────

  recordPaletteUse(commandId?: string): UserModel {
    const recentCommands = [...this.memory.recentCommands];

    if (commandId) {
      // Move to front if exists, or add
      const index = recentCommands.indexOf(commandId);
      if (index > -1) {
        recentCommands.splice(index, 1);
      }
      recentCommands.unshift(commandId);

      // Limit stored commands
      if (recentCommands.length > this.config.maxRecentCommands) {
        recentCommands.pop();
      }
    }

    return this.update({
      paletteUses: this.memory.paletteUses + 1,
      recentCommands,
      lastInteraction: Date.now(),
      idleTime: 0
    });
  }

  // ─── Idle Tracking ─────────────────────────────────────────

  recordIdle(duration: number): UserModel {
    return this.update({
      idleTime: duration
    });
  }

  recordInteraction(): UserModel {
    return this.update({
      lastInteraction: Date.now(),
      idleTime: 0
    });
  }

  // ─── State Management ──────────────────────────────────────

  setState(state: SoulState): UserModel {
    return this.update({ currentState: state });
  }

  setBehavioralType(type: BehavioralType): UserModel {
    return this.update({ behavioralType: type });
  }

  // ─── Interest Inference ────────────────────────────────────

  addInferredInterest(interest: string): UserModel {
    const interests = [...this.memory.inferredInterests];
    if (!interests.includes(interest)) {
      interests.push(interest);
    }

    return this.update({ inferredInterests: interests });
  }

  // ─── Utility Methods ───────────────────────────────────────

  getTimeOnCurrentPage(): number {
    return Date.now() - this.pageStartTime;
  }

  getCurrentScrollDepth(): number {
    return this.memory.scrollDepths[this.memory.currentPage] || 0;
  }

  getTotalTimeOnSite(): number {
    const storedTime = Object.values(this.memory.timePerPage).reduce((a, b) => a + b, 0);
    return storedTime + this.getTimeOnCurrentPage();
  }

  // ─── Debug ─────────────────────────────────────────────────

  debug(): void {
    console.group('[SoulMemory] Current State');
    console.log('Session ID:', this.memory.sessionId);
    console.log('Visit Count:', this.memory.visitCount);
    console.log('Current State:', this.memory.currentState);
    console.log('Behavioral Type:', this.memory.behavioralType);
    console.log('Pages Viewed:', this.memory.pagesViewed);
    console.log('Scroll Depths:', this.memory.scrollDepths);
    console.log('Time per Page:', this.memory.timePerPage);
    console.log('Palette Uses:', this.memory.paletteUses);
    console.log('Idle Time:', this.memory.idleTime);
    console.groupEnd();
  }

  // ─── Reset (for testing) ───────────────────────────────────

  reset(): UserModel {
    this.memory = createDefaultUserModel();
    this.pageStartTime = Date.now();
    this.save();
    return this.memory;
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────

let soulMemoryInstance: SoulMemory | null = null;

export function getSoulMemory(config?: Partial<SoulConfig>): SoulMemory {
  if (!soulMemoryInstance) {
    soulMemoryInstance = new SoulMemory(config);
  }
  return soulMemoryInstance;
}

export function resetSoulMemory(): void {
  soulMemoryInstance = null;
}
