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
import { ChatMessageRoleEnum } from '../core/types';
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
  /** Use API mode - delegates LLM calls to server-side endpoints */
  apiMode?: boolean;
  /** Called with the final complete response */
  onResponse?: (response: string) => void;
  /** Called for each chunk during streaming (for incremental display) */
  onStreamChunk?: (chunk: string) => void;
  /** Called when streaming starts (for UI loading states) */
  onStreamStart?: () => void;
  /** Called when streaming completes */
  onStreamEnd?: () => void;
  onToast?: (message: string, duration: number) => void;
  onHighlight?: (selector: string, style: string, duration: number) => void;
  onCTAUpdate?: (message: string) => void;
  onStateChange?: (from: SoulState, to: SoulState, reason: string) => void;
  /** Called when visitor whispers are updated (from subprocess) */
  onWhispersUpdate?: (whispers: string) => void;
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

    // Extract visitor data for pure function (DI pattern)
    const visitorData = {
      userName: soulMemory.getUserName() || 'visitor',
      visitorModel: soulMemory.getVisitorModel(),
      visitorWhispers: soulMemory.getVisitorWhispers(),
      lastTopics: soulMemory.getLastTopics(),
    };

    // Use pure function to integrate perception into memory
    this.workingMemory = memoryIntegrate(
      perception,
      this.workingMemory,
      hydratedModel,
      this.soulPersonality,
      visitorData
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
          // Stream incrementally with callbacks
          this.streamWithCallbacks(message);
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

  /**
   * Stream response with incremental callbacks
   * Calls onStreamStart, onStreamChunk for each chunk, onStreamEnd, then onResponse with full text
   */
  private async streamWithCallbacks(stream: AsyncIterable<string>): Promise<void> {
    this.config.onStreamStart?.();

    let fullText = '';
    try {
      for await (const chunk of stream) {
        fullText += chunk;
        this.config.onStreamChunk?.(chunk);
      }
    } catch (error) {
      this.log('Stream error', { error: String(error) });
    }

    this.config.onStreamEnd?.();
    this.config.onResponse?.(fullText);
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

      // Notify UI of whispers update (for FloatingDialogue hints)
      const soulMemory = getSoulMemory();
      const whispers = soulMemory.getVisitorWhispers();
      if (whispers && this.config.onWhispersUpdate) {
        this.config.onWhispersUpdate(whispers);
        this.log('Visitor whispers updated', { whispers: whispers.slice(0, 100) + '...' });
      }
    } catch (error) {
      this.log('Visitor modeling subprocess error', { error: String(error) });
    }
  }

  // Public API for messages/commands
  async handleMessage(message: string, context?: { imageAttachment?: { dataUrl: string; mimeType: string; sizeBytes: number } }): Promise<void> {
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

    // API Mode: Delegate LLM calls to server-side endpoints
    if (this.config.apiMode) {
      await this.handleMessageViaAPI(message, context?.imageAttachment);
      return;
    }

    // Local Mode: Run mental processes directly (requires LLM providers)
    const perception: Perception = {
      type: 'message',
      content: message,
      timestamp: Date.now(),
      name: soulMemory.getUserName() || undefined,
    };

    const rawModel = soulMemory.get();
    const hydratedModel = hydrateUserModel(rawModel, soulMemory);

    // Extract visitor data for pure function (DI pattern)
    const visitorData = {
      userName: soulMemory.getUserName() || 'visitor',
      visitorModel: soulMemory.getVisitorModel(),
      visitorWhispers: soulMemory.getVisitorWhispers(),
      lastTopics: soulMemory.getLastTopics(),
    };

    this.workingMemory = memoryIntegrate(
      perception,
      this.workingMemory,
      hydratedModel,
      this.soulPersonality,
      visitorData
    );

    await this.runProcess(perception, hydratedModel);

    // Run visitor modeling in background (don't await - non-blocking)
    this.runVisitorModeling(hydratedModel).catch((err) => {
      this.log('Background visitor modeling failed', { error: String(err) });
    });
  }

  /**
   * Handle message via API endpoints (for client-side use)
   * Delegates LLM calls to server while maintaining client-side state
   */
  private async handleMessageViaAPI(message: string, imageAttachment?: { dataUrl: string; mimeType: string; sizeBytes: number }): Promise<void> {
    const soulMemory = getSoulMemory();
    const rawModel = soulMemory.get();
    const hydratedModel = hydrateUserModel(rawModel, soulMemory);

    this.config.onStreamStart?.();

    // AbortController with timeout for request cleanup (longer timeout for image analysis)
    const controller = new AbortController();
    const timeoutMs = imageAttachment ? 60000 : 30000; // 60s for images, 30s for text
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Declare reader outside try for cleanup in finally
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

    try {
      // Increment turn count in client-side SoulMemory (source of truth)
      // This persists to localStorage across requests
      const currentTurnCount = soulMemory.incrementUserTurnCount();
      this.log('User turn count (from soulMemory):', { turn: currentTurnCount });

      // Build request body
      const requestBody: Record<string, unknown> = {
        query: message,
        stream: true,
        // Pass turn count from client (source of truth in localStorage)
        // Server should use this instead of computing from limited history
        turnCount: currentTurnCount,
        visitorContext: {
          currentPage: hydratedModel.currentPage,
          pagesViewed: hydratedModel.pagesViewed,
          timeOnSite: hydratedModel.timeOnSite,
          scrollDepth: hydratedModel.scrollDepth,
          visitCount: hydratedModel.visitCount,
          behavioralType: hydratedModel.behavioralType,
          inferredInterests: hydratedModel.inferredInterests,
        },
        conversationHistory: this.getConversationHistory(),
      };

      // Include image attachment if present
      if (imageAttachment) {
        requestBody.imageAttachment = imageAttachment;
        this.log('Sending image attachment', { size: imageAttachment.sizeBytes, mimeType: imageAttachment.mimeType });
      }

      // Call chat API with streaming
      const response = await fetch('/api/soul/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Chat API error: ${response.status}`);
      }

      // Process SSE stream
      reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';
      let currentEventType = 'message'; // Default SSE event type

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          // Handle event type lines (e.g., "event: archive")
          if (line.startsWith('event: ')) {
            currentEventType = line.slice(7).trim();
            continue;
          }

          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);

              // Handle archive indicator events
              if (currentEventType === 'archive') {
                document.dispatchEvent(new CustomEvent('soul:archive', {
                  detail: { active: parsed.active }
                }));
                currentEventType = 'message'; // Reset for next event
                continue;
              }

              // Handle vision image events
              if (currentEventType === 'image') {
                document.dispatchEvent(new CustomEvent('soul:vision', {
                  detail: {
                    dataUrl: parsed.dataUrl,
                    prompt: parsed.prompt,
                    displayMode: parsed.displayMode || 'background',
                    duration: parsed.duration || 30000,
                  }
                }));
                this.log('Vision image received', { prompt: parsed.prompt?.slice(0, 50) });
                currentEventType = 'message'; // Reset for next event
                continue;
              }

              // Handle tarot card events
              if (currentEventType === 'tarot') {
                document.dispatchEvent(new CustomEvent('soul:tarot', {
                  detail: {
                    dataUrl: parsed.dataUrl,
                    prompt: parsed.prompt,
                    cardName: parsed.cardName,
                    cardNumber: parsed.cardNumber,
                    displayMode: parsed.displayMode || 'background',
                    duration: parsed.duration || 30000,
                  }
                }));
                this.log('Tarot card received', { card: `${parsed.cardNumber} - ${parsed.cardName}` });
                currentEventType = 'message'; // Reset for next event
                continue;
              }

              // Handle image analysis status events
              if (currentEventType === 'imageAnalysis') {
                document.dispatchEvent(new CustomEvent('soul:imageAnalysis', {
                  detail: parsed
                }));
                if (parsed.status === 'analyzing') {
                  this.log('Image analysis started');
                } else if (parsed.status === 'complete') {
                  this.log('Image analysis complete', { type: parsed.caption?.type });
                } else if (parsed.status === 'error') {
                  this.log('Image analysis error', { error: parsed.error });
                }
                currentEventType = 'message'; // Reset for next event
                continue;
              }

              // Handle mode indicator events (e.g., academic mode)
              if (currentEventType === 'mode') {
                document.dispatchEvent(new CustomEvent('soul:mode', {
                  detail: { mode: parsed.mode }
                }));
                this.log('Mode indicator received', { mode: parsed.mode });
                currentEventType = 'message'; // Reset for next event
                continue;
              }

              // Handle regular message events
              if (parsed.chunk) {
                fullResponse += parsed.chunk;
                this.config.onStreamChunk?.(parsed.chunk);
              } else if (parsed.done) {
                fullResponse = parsed.fullResponse || fullResponse;
              }

              currentEventType = 'message'; // Reset for next event
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      this.config.onStreamEnd?.();
      this.config.onResponse?.(fullResponse);

      // Update working memory with the exchange
      this.workingMemory = this.workingMemory
        .withMemory({ role: ChatMessageRoleEnum.User, content: message })
        .withMemory({ role: ChatMessageRoleEnum.Assistant, content: fullResponse, name: 'Minoan' });

      // Fire-and-forget: Run subprocess in background via API
      this.runSubprocessViaAPI(hydratedModel).catch((err) => {
        this.log('Background subprocess failed', { error: String(err) });
      });

    } catch (error) {
      this.config.onStreamEnd?.();
      if (error instanceof Error && error.name === 'AbortError') {
        this.log('API request timed out');
      } else {
        this.log('API message handling failed', { error: String(error) });
      }
      throw error;
    } finally {
      // Always clean up resources
      clearTimeout(timeoutId);
      reader?.releaseLock();
    }
  }

  /**
   * Run visitor modeling subprocess via API
   */
  private async runSubprocessViaAPI(hydratedModel: HydratedUserModel): Promise<void> {
    const soulMemory = getSoulMemory();

    try {
      const response = await fetch('/api/soul/subprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: hydratedModel.sessionId,
          conversationHistory: this.getConversationHistory(),
          userModel: {
            visitCount: hydratedModel.visitCount,
            pagesViewed: hydratedModel.pagesViewed,
            currentPage: hydratedModel.currentPage,
            timeOnSite: hydratedModel.timeOnSite,
            scrollDepth: hydratedModel.scrollDepth,
            behavioralType: hydratedModel.behavioralType,
            isReturning: hydratedModel.isReturning,
          },
          visitorModel: soulMemory.getVisitorModel(),
          visitorWhispers: soulMemory.getVisitorWhispers(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        this.log('Subprocess API error', { status: response.status, error: errorData });
        return;
      }

      const result = await response.json();

      if (result.success) {
        // Update local storage with subprocess results
        if (result.visitorModel) {
          soulMemory.setVisitorModel(result.visitorModel);
        }
        if (result.visitorWhispers) {
          soulMemory.setVisitorWhispers(result.visitorWhispers);
          this.config.onWhispersUpdate?.(result.visitorWhispers);
        }

        this.log('Subprocess completed', { duration: result.duration });
      }
    } catch (error) {
      this.log('Subprocess API call failed', { error: String(error) });
    }
  }

  /**
   * Get conversation history from working memory for API calls
   */
  private getConversationHistory(): Array<{ role: 'user' | 'assistant'; content: string }> {
    return this.workingMemory.memories
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
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

    // Extract visitor data for pure function (DI pattern)
    const visitorData = {
      userName: soulMemory.getUserName() || 'visitor',
      visitorModel: soulMemory.getVisitorModel(),
      visitorWhispers: soulMemory.getVisitorWhispers(),
      lastTopics: soulMemory.getLastTopics(),
    };

    this.workingMemory = memoryIntegrate(
      perception,
      this.workingMemory,
      hydratedModel,
      this.soulPersonality,
      visitorData
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
