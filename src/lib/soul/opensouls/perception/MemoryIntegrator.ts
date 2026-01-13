/**
 * MemoryIntegrator
 *
 * Bridges the MVP perception layer with Open Souls mental processes.
 * Subscribes to MVP perception events, converts them to Open Souls format,
 * builds VisitorModel from localStorage, and routes to ProcessRunner.
 */

import type { PerceptionEvent, UserModel } from '../../types';
import { onPerception } from '../../perception';
import { getSoulMemory } from '../../memory';
import { WorkingMemory } from '../core/WorkingMemory';
import { ChatMessageRoleEnum } from '../core/types';
import { indentNicely } from '../core/utils';
import type { Perception, VisitorModel, SoulState, SoulActions, ProcessReturn } from '../mentalProcesses/types';
import { createProcessRunner, getInitialState } from '../mentalProcesses';

// ─────────────────────────────────────────────────────────────
// Type Conversions
// ─────────────────────────────────────────────────────────────

/**
 * Convert MVP PerceptionEvent to Open Souls Perception
 */
function convertPerception(event: PerceptionEvent): Perception {
  // Map MVP event types to Open Souls perception types
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

  // Build content string based on event type
  let content = '';
  switch (event.type) {
    case 'navigation':
      content = event.metadata?.to as string || '';
      break;
    case 'scroll':
      content = String(event.metadata?.depth || 0);
      break;
    case 'click':
      content = event.target || event.metadata?.element as string || '';
      break;
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
 * Convert MVP UserModel to Open Souls VisitorModel
 */
function convertUserModel(userModel: UserModel, soulMemory: ReturnType<typeof getSoulMemory>): VisitorModel {
  // Determine readiness signals from behavior
  const readinessSignals: string[] = [];

  // Check if they've clicked/hovered on contact-related elements
  const contactClicks = userModel.clickedElements.filter(
    (el) => el.includes('contact') || el.includes('cta') || el.includes('email')
  );
  if (contactClicks.length > 0) {
    readinessSignals.push('contact_click');
  }

  // Check if they've viewed the contact page
  if (userModel.pagesViewed.includes('/contact')) {
    readinessSignals.push('contact_page_view');
  }

  // High scroll depth on portfolio pages suggests interest
  const portfolioPages = Object.entries(userModel.scrollDepths).filter(
    ([page, depth]) => page.includes('/portfolio/') && depth > 80
  );
  if (portfolioPages.length > 0) {
    readinessSignals.push('deep_portfolio_read');
  }

  // Infer last project from pages viewed
  let lastProject: string | null = null;
  const portfolioViews = userModel.pagesViewed.filter((p) => p.includes('/portfolio/'));
  if (portfolioViews.length > 0) {
    const last = portfolioViews[portfolioViews.length - 1];
    lastProject = last.split('/portfolio/')[1]?.replace('/', '') || null;
  }

  return {
    sessionId: userModel.sessionId,
    visitCount: userModel.visitCount,
    isReturning: userModel.visitCount > 1,
    pagesViewed: userModel.pagesViewed,
    currentPage: userModel.currentPage,
    timeOnSite: soulMemory.getTotalTimeOnSite(),
    timeOnCurrentPage: soulMemory.getTimeOnCurrentPage(),
    scrollDepth: soulMemory.getCurrentScrollDepth() / 100, // Convert 0-100 to 0-1
    inferredInterests: userModel.inferredInterests,
    behavioralType: userModel.behavioralType,
    readinessSignals,
    lastProject: lastProject ?? undefined, // Convert null to undefined
    paletteUses: userModel.paletteUses,
  };
}

// ─────────────────────────────────────────────────────────────
// Memory Integrator Class
// ─────────────────────────────────────────────────────────────

export interface MemoryIntegratorConfig {
  /** Whether to log debug information */
  debug?: boolean;
  /** Callback when soul responds */
  onResponse?: (response: string) => void;
  /** Callback for toast notifications */
  onToast?: (message: string, duration: number) => void;
  /** Callback for UI highlights */
  onHighlight?: (selector: string, style: string, duration: number) => void;
  /** Callback for CTA updates */
  onCTAUpdate?: (message: string) => void;
  /** Callback for state transitions */
  onStateChange?: (from: SoulState, to: SoulState, reason: string) => void;
}

export class MemoryIntegrator {
  private config: MemoryIntegratorConfig;
  private processRunner: ReturnType<typeof createProcessRunner>;
  private workingMemory: WorkingMemory;
  private currentState: SoulState = 'greeting';
  private unsubscribe: (() => void) | null = null;
  private soulPersonality: string = '';
  private isInitialized = false;

  constructor(config: MemoryIntegratorConfig = {}) {
    this.config = config;
    this.processRunner = createProcessRunner();
    this.workingMemory = new WorkingMemory({ soulName: 'Minoan' });
  }

  /**
   * Initialize the integrator with the soul personality
   */
  async init(soulPersonality: string): Promise<void> {
    if (this.isInitialized) return;

    this.soulPersonality = soulPersonality;

    // Initialize working memory with soul personality
    this.workingMemory = this.workingMemory.withRegion('soul-personality', {
      role: ChatMessageRoleEnum.System,
      content: soulPersonality,
    });

    // Determine initial state from visitor model
    const soulMemory = getSoulMemory();
    const userModel = soulMemory.get();
    const visitorModel = convertUserModel(userModel, soulMemory);
    this.currentState = getInitialState(visitorModel);

    // Update MVP memory with Open Souls state
    soulMemory.setState(this.currentState);

    // Subscribe to MVP perception events
    this.unsubscribe = onPerception(this.handlePerception.bind(this));

    this.isInitialized = true;
    this.log('MemoryIntegrator initialized', { initialState: this.currentState });
  }

  /**
   * Destroy the integrator and clean up
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.isInitialized = false;
  }

  /**
   * Handle incoming perception events from MVP layer
   */
  private async handlePerception(event: PerceptionEvent): Promise<void> {
    if (!this.isInitialized) return;

    // Skip high-frequency events that don't need LLM processing
    if (event.type === 'scroll' || event.type === 'focus' || event.type === 'blur') {
      // Still update visitor model for state machine evaluation
      this.evaluateStateTransitions();
      return;
    }

    this.log('Perception received', { type: event.type, target: event.target });

    // Convert to Open Souls format
    const perception = convertPerception(event);

    // Get current visitor model
    const soulMemory = getSoulMemory();
    const userModel = soulMemory.get();
    const visitorModel = convertUserModel(userModel, soulMemory);

    // Build actions object
    const actions = this.createActions();

    // Update working memory with visitor context
    let memory = this.workingMemory.withRegion('visitor-context', {
      role: ChatMessageRoleEnum.System,
      content: indentNicely`
        Current visitor context:
        - Session: ${visitorModel.sessionId.slice(0, 8)}...
        - Visit count: ${visitorModel.visitCount}
        - Pages viewed: ${visitorModel.pagesViewed.join(', ') || 'none yet'}
        - Current page: ${visitorModel.currentPage}
        - Time on site: ${Math.floor(visitorModel.timeOnSite / 60000)} minutes
        - Scroll depth: ${Math.round(visitorModel.scrollDepth * 100)}%
        - Behavioral type: ${visitorModel.behavioralType}
        - Interests: ${visitorModel.inferredInterests.join(', ') || 'unknown'}
        ${visitorModel.isReturning ? '- This is a returning visitor!' : ''}
      `,
    });

    // Run the current mental process
    try {
      const result = await this.processRunner.run({
        sessionId: visitorModel.sessionId,
        workingMemory: memory,
        perception,
        visitorModel,
        actions,
      });

      // Handle process result
      this.handleProcessResult(result);
    } catch (error) {
      console.error('[MemoryIntegrator] Process error:', error);
    }
  }

  /**
   * Handle the result from a mental process
   */
  private handleProcessResult(result: ProcessReturn): void {
    if (Array.isArray(result)) {
      // Result includes state transition: [memory, nextState, context?]
      const [newMemory, nextState, context] = result;
      this.workingMemory = newMemory;

      if (typeof nextState === 'string') {
        const reason = typeof context?.reason === 'string' ? context.reason : 'process_transition';
        this.transition(nextState as SoulState, reason);
      }
    } else {
      // Just memory update
      this.workingMemory = result;
    }
  }

  /**
   * Transition to a new state
   */
  private transition(newState: SoulState, reason: string): void {
    const oldState = this.currentState;
    if (oldState === newState) return;

    this.currentState = newState;
    this.processRunner.transition(newState);

    // Update MVP memory
    getSoulMemory().setState(newState);

    this.log('State transition', { from: oldState, to: newState, reason });

    if (this.config.onStateChange) {
      this.config.onStateChange(oldState, newState, reason);
    }
  }

  /**
   * Evaluate state transitions based on visitor model
   * Called on high-frequency events that don't trigger full process runs
   */
  private evaluateStateTransitions(): void {
    const soulMemory = getSoulMemory();
    const userModel = soulMemory.get();
    const visitorModel = convertUserModel(userModel, soulMemory);

    // Check for automatic transitions based on visitor behavior
    const newState = getInitialState(visitorModel);

    if (newState !== this.currentState) {
      // Validate the transition is allowed
      const validTransitions: Record<SoulState, SoulState[]> = {
        greeting: ['curious', 'engaged', 'ready', 'returning'],
        curious: ['engaged', 'ready'],
        engaged: ['ready'],
        ready: [], // Terminal
        returning: ['curious', 'engaged', 'ready'],
      };

      if (validTransitions[this.currentState].includes(newState)) {
        this.transition(newState, 'behavior_triggered');
      }
    }
  }

  /**
   * Create actions object for mental processes
   */
  private createActions(): SoulActions {
    return {
      speak: (message: string | AsyncIterable<string>) => {
        // Handle both string and stream
        if (typeof message === 'string') {
          this.config.onResponse?.(message);
        } else {
          // Collect stream
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
          this.log('Scheduled event fired', { type: event.type, delay: event.delayMs });
          // Trigger the event through perception
          this.handlePerception({
            type: 'idle',
            timestamp: Date.now(),
            metadata: { scheduledEvent: event.type, payload: event.payload },
          });
        }, event.delayMs);
      },
    };
  }

  /**
   * Handle dispatch actions from mental processes
   */
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

  /**
   * Collect an async iterable stream into a string
   */
  private async collectStream(stream: AsyncIterable<string>): Promise<string> {
    let result = '';
    for await (const chunk of stream) {
      result += chunk;
    }
    return result;
  }

  /**
   * Log debug information
   */
  private log(message: string, data?: Record<string, unknown>): void {
    if (this.config.debug) {
      console.log(`[MemoryIntegrator] ${message}`, data || '');
    }
  }

  /**
   * Handle a user message (from command palette or chat)
   */
  async handleMessage(message: string): Promise<void> {
    if (!this.isInitialized) {
      console.warn('[MemoryIntegrator] Not initialized');
      return;
    }

    // Create a message perception
    const perception: Perception = {
      type: 'message',
      content: message,
      timestamp: Date.now(),
    };

    // Get current visitor model
    const soulMemory = getSoulMemory();
    const userModel = soulMemory.get();
    const visitorModel = convertUserModel(userModel, soulMemory);

    // Build actions object
    const actions = this.createActions();

    // Run the current mental process with the message
    try {
      const result = await this.processRunner.run({
        sessionId: visitorModel.sessionId,
        workingMemory: this.workingMemory,
        perception,
        visitorModel,
        actions,
      });

      this.handleProcessResult(result);
    } catch (error) {
      console.error('[MemoryIntegrator] Message handling error:', error);
    }
  }

  /**
   * Handle a command (from command palette)
   */
  async handleCommand(command: string): Promise<void> {
    if (!this.isInitialized) {
      console.warn('[MemoryIntegrator] Not initialized');
      return;
    }

    // Record palette use
    getSoulMemory().recordPaletteUse(command);

    // Create a command perception
    const perception: Perception = {
      type: 'command',
      content: command,
      timestamp: Date.now(),
    };

    // Get current visitor model
    const soulMemory = getSoulMemory();
    const userModel = soulMemory.get();
    const visitorModel = convertUserModel(userModel, soulMemory);

    // Build actions object
    const actions = this.createActions();

    // Run the current mental process with the command
    try {
      const result = await this.processRunner.run({
        sessionId: visitorModel.sessionId,
        workingMemory: this.workingMemory,
        perception,
        visitorModel,
        actions,
      });

      this.handleProcessResult(result);
    } catch (error) {
      console.error('[MemoryIntegrator] Command handling error:', error);
    }
  }

  /**
   * Get current state for debugging
   */
  getState(): { currentState: SoulState; workingMemory: WorkingMemory } {
    return {
      currentState: this.currentState,
      workingMemory: this.workingMemory,
    };
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────

let integratorInstance: MemoryIntegrator | null = null;

export function getMemoryIntegrator(config?: MemoryIntegratorConfig): MemoryIntegrator {
  if (!integratorInstance) {
    integratorInstance = new MemoryIntegrator(config);
  }
  return integratorInstance;
}

export function resetMemoryIntegrator(): void {
  if (integratorInstance) {
    integratorInstance.destroy();
    integratorInstance = null;
  }
}
