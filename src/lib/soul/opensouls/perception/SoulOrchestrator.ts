/**
 * SoulOrchestrator
 *
 * Orchestrates the soul's perception-response cycle.
 * Delegates to:
 * - memoryIntegrate (pure function) for memory updates
 * - ProcessRunner for state machine and process execution
 *
 * This replaces the monolithic MemoryIntegrator with clean separation.
 */

import type { PerceptionEvent, UserModel } from '../../types';
import { onPerception } from '../../perception';
import { getSoulMemory } from '../../memory';
import { WorkingMemory } from '../core/WorkingMemory';
import { extractNameHeuristic } from '../core/utils';
import type { Perception, HydratedUserModel, SoulState, SoulActions, ProcessReturn } from '../mentalProcesses/types';
import { ProcessRunner, createProcessRunner, getInitialState } from '../mentalProcesses';
import { memoryIntegrate } from './memoryIntegrate';
import { modelsTheVisitor } from '../subprocesses';

// ─────────────────────────────────────────────────────────────
// Type Conversions (Pure Functions)
// ─────────────────────────────────────────────────────────────

function convertPerception(event: PerceptionEvent): Perception {
  const typeMap: Record<string, Perception['type']> = {
    click: 'click',
    scroll: 'scroll',
    hover: 'hover',
    navigation: 'navigation',
    idle: 'idle',
    focus: 'focus',
    blur: 'blur',
  };

  const type = typeMap[event.type] || 'navigation';

  let content = '';
  switch (event.type) {
    case 'navigation':
      content = event.metadata?.to as string || '';
      break;
    case 'scroll':
      content = String(event.metadata?.depth || 0);
      break;
    case 'click':
    case 'hover':
      content = event.target || event.metadata?.element as string || '';
      break;
    case 'idle':
      content = String(event.metadata?.duration || 0);
      break;
    default:
      content = event.metadata?.page as string || '';
  }

  return {
    type,
    content,
    timestamp: event.timestamp,
    metadata: event.metadata,
  };
}

/**
 * Hydrate UserModel with computed values for mental processes.
 * Computes live values (timeOnSite, isReturning, etc.) and enriches
 * the persisted UserModel with readiness signals and last project.
 */
function hydrateUserModel(userModel: UserModel, soulMemory: ReturnType<typeof getSoulMemory>): HydratedUserModel {
  // Compute readiness signals from behavior
  const readinessSignals: string[] = [...(userModel.readinessSignals || [])];

  const contactClicks = userModel.clickedElements.filter(
    (el) => el.includes('contact') || el.includes('cta') || el.includes('email')
  );
  if (contactClicks.length > 0 && !readinessSignals.includes('contact_click')) {
    readinessSignals.push('contact_click');
  }
  if (userModel.pagesViewed.includes('/contact') && !readinessSignals.includes('contact_page_view')) {
    readinessSignals.push('contact_page_view');
  }

  const portfolioPages = Object.entries(userModel.scrollDepths).filter(
    ([page, depth]) => page.includes('/portfolio/') && depth > 80
  );
  if (portfolioPages.length > 0 && !readinessSignals.includes('deep_portfolio_read')) {
    readinessSignals.push('deep_portfolio_read');
  }

  // Compute last project from portfolio views
  let lastProject = userModel.lastProject;
  if (!lastProject) {
    const portfolioViews = userModel.pagesViewed.filter((p) => p.includes('/portfolio/'));
    if (portfolioViews.length > 0) {
      const last = portfolioViews[portfolioViews.length - 1];
      lastProject = last.split('/portfolio/')[1]?.replace('/', '') || undefined;
    }
  }

  return {
    ...userModel,
    // Computed values (live)
    timeOnSite: soulMemory.getTotalTimeOnSite(),
    timeOnCurrentPage: soulMemory.getTimeOnCurrentPage(),
    sessionDuration: soulMemory.getTotalTimeOnSite(),
    scrollDepth: soulMemory.getCurrentScrollDepth() / 100,
    isReturning: userModel.visitCount > 1,
    // Enriched values
    readinessSignals,
    lastProject,
  };
}

// ─────────────────────────────────────────────────────────────
// Soul Orchestrator Class
// ─────────────────────────────────────────────────────────────

export interface OrchestratorConfig {
  debug?: boolean;
  onResponse?: (response: string) => void;
  onToast?: (message: string, duration: number) => void;
  onHighlight?: (selector: string, style: string, duration: number) => void;
  onCTAUpdate?: (message: string) => void;
  onStateChange?: (from: SoulState, to: SoulState, reason: string) => void;
}

export class SoulOrchestrator {
  private config: OrchestratorConfig;
  private processRunner: ProcessRunner;
  private workingMemory: WorkingMemory;
  private soulPersonality: string = '';
  private unsubscribe: (() => void) | null = null;
  private isInitialized = false;

  constructor(config: OrchestratorConfig = {}) {
    this.config = config;
    this.processRunner = createProcessRunner();
    this.workingMemory = new WorkingMemory({ soulName: 'Minoan' });
  }

  async init(soulPersonality: string): Promise<void> {
    if (this.isInitialized) return;

    this.soulPersonality = soulPersonality;

    // Determine initial state from user model
    const soulMemory = getSoulMemory();
    const rawModel = soulMemory.get();
    const hydratedModel = hydrateUserModel(rawModel, soulMemory);
    const initialState = getInitialState(hydratedModel);

    this.processRunner = createProcessRunner();
    this.processRunner.transition(initialState, 'init');
    soulMemory.setState(initialState);

    // Subscribe to MVP perception events
    this.unsubscribe = onPerception(this.handlePerception.bind(this));

    this.isInitialized = true;
    this.log('SoulOrchestrator initialized', { initialState });
  }

  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.isInitialized = false;
  }

  private async handlePerception(event: PerceptionEvent): Promise<void> {
    if (!this.isInitialized) return;

    // Skip high-frequency events
    if (event.type === 'scroll' || event.type === 'focus' || event.type === 'blur') {
      this.evaluateStateTransitions();
      return;
    }

    this.log('Perception received', { type: event.type });

    const perception = convertPerception(event);
    const soulMemory = getSoulMemory();
    const rawModel = soulMemory.get();
    const hydratedModel = hydrateUserModel(rawModel, soulMemory);

    // Use pure function to integrate perception into memory
    this.workingMemory = memoryIntegrate(
      perception,
      this.workingMemory,
      hydratedModel,
      this.soulPersonality
    );

    // Run the mental process
    await this.runProcess(perception, hydratedModel);
  }

  private async runProcess(perception: Perception, hydratedModel: HydratedUserModel): Promise<void> {
    const actions = this.createActions();

    try {
      const result = await this.processRunner.evaluateAndRun({
        sessionId: hydratedModel.sessionId,
        workingMemory: this.workingMemory,
        perception,
        userModel: hydratedModel,
        actions,
      });

      this.handleProcessResult(result);
    } catch (error) {
      console.error('[SoulOrchestrator] Process error:', error);
    }
  }

  private handleProcessResult(result: ProcessReturn): void {
    if (Array.isArray(result)) {
      const [newMemory, nextState, context] = result;
      this.workingMemory = newMemory;

      if (typeof nextState === 'string') {
        const reason = typeof context?.reason === 'string' ? context.reason : 'process_transition';
        this.transition(nextState as SoulState, reason);
      }
    } else {
      this.workingMemory = result;
    }
  }

  private transition(newState: SoulState, reason: string): void {
    const oldState = this.processRunner.getState();
    if (oldState === newState) return;

    this.processRunner.transition(newState, reason);
    getSoulMemory().setState(newState);

    this.log('State transition', { from: oldState, to: newState, reason });
    this.config.onStateChange?.(oldState, newState, reason);
  }

  private evaluateStateTransitions(): void {
    const soulMemory = getSoulMemory();
    const rawModel = soulMemory.get();
    const hydratedModel = hydrateUserModel(rawModel, soulMemory);

    const autoTransition = this.processRunner.evaluateTransitions(hydratedModel);
    if (autoTransition) {
      this.transition(autoTransition, 'behavior_triggered');
    }
  }

  private createActions(): SoulActions {
    return {
      speak: (message: string | AsyncIterable<string>) => {
        if (typeof message === 'string') {
          this.config.onResponse?.(message);
        } else {
          this.collectStream(message).then((text) => {
            this.config.onResponse?.(text);
          });
        }
      },
      log: (message: string, data?: unknown) => {
        this.log(message, data as Record<string, unknown> | undefined);
      },
      dispatch: (action: { type: string; payload: unknown }) => {
        this.handleDispatch(action);
      },
      scheduleEvent: (event) => {
        setTimeout(() => {
          this.log('Scheduled event fired', { type: event.type });
          this.handlePerception({
            type: 'idle',
            timestamp: Date.now(),
            metadata: { scheduledEvent: event.type, payload: event.payload },
          });
        }, event.delayMs);
      },
    };
  }

  private handleDispatch(action: { type: string; payload: unknown }): void {
    switch (action.type) {
      case 'toast': {
        const { message, duration } = action.payload as { message: string; duration: number };
        this.config.onToast?.(message, duration);
        break;
      }
      case 'highlight': {
        const { selector, style, duration } = action.payload as {
          selector: string;
          style: string;
          duration: number;
        };
        this.config.onHighlight?.(selector, style, duration);
        break;
      }
      case 'updateCTA': {
        const { message } = action.payload as { message: string };
        this.config.onCTAUpdate?.(message);
        break;
      }
      default:
        this.log('Unknown dispatch action', { action });
    }
  }

  private async collectStream(stream: AsyncIterable<string>): Promise<string> {
    let result = '';
    for await (const chunk of stream) {
      result += chunk;
    }
    return result;
  }

  private log(message: string, data?: Record<string, unknown>): void {
    if (this.config.debug) {
      console.log(`[SoulOrchestrator] ${message}`, data || '');
    }
  }

  /**
   * Run visitor modeling subprocess in background
   * Updates visitor model and whispers based on conversation
   */
  private async runVisitorModeling(hydratedModel: HydratedUserModel): Promise<void> {
    try {
      const actions = this.createActions();
      const result = await modelsTheVisitor({
        sessionId: hydratedModel.sessionId,
        workingMemory: this.workingMemory,
        userModel: hydratedModel,
        actions,
      });

      // Update working memory with subprocess result
      if (Array.isArray(result)) {
        this.workingMemory = result[0];
      } else {
        this.workingMemory = result;
      }
    } catch (error) {
      this.log('Visitor modeling subprocess error', { error: String(error) });
    }
  }

  // Public API for messages/commands
  async handleMessage(message: string): Promise<void> {
    if (!this.isInitialized) return;

    const soulMemory = getSoulMemory();

    // Name extraction (instant, no LLM call)
    // Only extract if we don't already have a name
    const currentUserName = soulMemory.getUserName();
    if (!currentUserName || currentUserName === 'visitor') {
      const extractedName = extractNameHeuristic(message);
      if (extractedName) {
        soulMemory.setUserName(extractedName);
        this.log('Extracted user name', { name: extractedName });
      }
    }

    const perception: Perception = {
      type: 'message',
      content: message,
      timestamp: Date.now(),
      name: soulMemory.getUserName() || undefined,
    };

    const rawModel = soulMemory.get();
    const hydratedModel = hydrateUserModel(rawModel, soulMemory);

    this.workingMemory = memoryIntegrate(
      perception,
      this.workingMemory,
      hydratedModel,
      this.soulPersonality
    );

    await this.runProcess(perception, hydratedModel);

    // Run visitor modeling in background (don't await - non-blocking)
    this.runVisitorModeling(hydratedModel).catch((err) => {
      this.log('Background visitor modeling failed', { error: String(err) });
    });
  }

  async handleCommand(command: string): Promise<void> {
    if (!this.isInitialized) return;

    getSoulMemory().recordPaletteUse(command);

    const perception: Perception = {
      type: 'command',
      content: command,
      timestamp: Date.now(),
    };

    const soulMemory = getSoulMemory();
    const rawModel = soulMemory.get();
    const hydratedModel = hydrateUserModel(rawModel, soulMemory);

    this.workingMemory = memoryIntegrate(
      perception,
      this.workingMemory,
      hydratedModel,
      this.soulPersonality
    );

    await this.runProcess(perception, hydratedModel);
  }

  getState(): { currentState: SoulState; workingMemory: WorkingMemory } {
    return {
      currentState: this.processRunner.getState(),
      workingMemory: this.workingMemory,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton Export (backward compatible with MemoryIntegrator)
// ─────────────────────────────────────────────────────────────

let orchestratorInstance: SoulOrchestrator | null = null;

export function getSoulOrchestrator(config?: OrchestratorConfig): SoulOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new SoulOrchestrator(config);
  }
  return orchestratorInstance;
}

export function resetSoulOrchestrator(): void {
  if (orchestratorInstance) {
    orchestratorInstance.destroy();
    orchestratorInstance = null;
  }
}

// Backward compatibility aliases
export const MemoryIntegrator = SoulOrchestrator;
export const getMemoryIntegrator = getSoulOrchestrator;
export const resetMemoryIntegrator = resetSoulOrchestrator;
export type MemoryIntegratorConfig = OrchestratorConfig;
