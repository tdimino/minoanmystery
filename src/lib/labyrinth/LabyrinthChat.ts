/**
 * LabyrinthChat - Main chat orchestration for the Labyrinth page
 * Extracted from labyrinth.astro for modularity
 *
 * Follows Open Souls paradigm:
 * - Perception Layer: Event listeners for soul:* events
 * - Working Memory: State in instance variables + localStorage
 * - Action Dispatch: DOM manipulation, module delegation, custom events
 *
 * Dependencies:
 * - SoulOrchestrator: Handles LLM conversation
 * - StreamRenderer: Handles streaming response display
 * - TarotRenderer: Tarot card display
 * - BackgroundManifestations: Goddess + vision backgrounds
 * - ImageAttachmentManager: Image paste/upload handling
 */

import { getSoulOrchestrator, type OrchestratorConfig } from '../soul/opensouls/perception/SoulOrchestrator';
import type { SoulOrchestrator } from '../soul/opensouls/perception/SoulOrchestrator';
import { StreamRenderer, injectStreamingStyles } from '../soul/streamRenderer';
import { getTriggerManager } from '../soul/triggers';
import { TarotRenderer, type TarotPlaceholderPayload, type TarotCardPayload, type TarotCompletePayload, type TarotInlinePayload } from './TarotRenderer';
import { BackgroundManifestations } from './BackgroundManifestations';
import { ImageAttachmentManager } from './ImageAttachmentManager';
import type { ImageAttachment, ChatMessage, ConversationThread, GoddessBackgroundPayload, VisionBackgroundPayload } from './types';
import { listen, type LabyrinthEventMap } from './events';
import { extractNameHeuristic, extractTitleHeuristic } from './userExtraction';

// Re-export from shared module (maintains public API)
export { extractNameHeuristic, extractTitleHeuristic };

// ─── localStorage Helpers ─────────────────────────────────────

function saveUserName(name: string): void {
  try {
    const memory = JSON.parse(localStorage.getItem('minoan-soul-memory') || '{}');
    memory.userName = name;
    localStorage.setItem('minoan-soul-memory', JSON.stringify(memory));
    console.log('[Labyrinth] Extracted user name:', name);
  } catch (e) {
    console.warn('[Labyrinth] Failed to save userName:', e);
  }
}

function getUserName(): string | undefined {
  try {
    const memory = JSON.parse(localStorage.getItem('minoan-soul-memory') || '{}');
    return memory.userName;
  } catch {
    return undefined;
  }
}

function saveUserTitle(title: string): void {
  try {
    const memory = JSON.parse(localStorage.getItem('minoan-soul-memory') || '{}');
    memory.userTitle = title;
    localStorage.setItem('minoan-soul-memory', JSON.stringify(memory));
    console.log('[Labyrinth] Extracted user title:', title);
  } catch (e) {
    console.warn('[Labyrinth] Failed to save userTitle:', e);
  }
}

function getUserTitle(): string | undefined {
  try {
    const memory = JSON.parse(localStorage.getItem('minoan-soul-memory') || '{}');
    return memory.userTitle;
  } catch {
    return undefined;
  }
}

// ─────────────────────────────────────────────────────────────
//   Configuration Interface
// ─────────────────────────────────────────────────────────────

export interface LabyrinthChatConfig {
  // Core chat elements
  conversationHistory: HTMLElement;
  form: HTMLFormElement;
  input: HTMLInputElement;
  emptyState: HTMLElement;

  // Soul state indicator elements
  stateIndicator: HTMLElement;
  stateDot: HTMLElement;
  stateText: HTMLElement;

  // Mode indicators
  archiveIndicator: HTMLElement;
  academicModeIndicator: HTMLElement;
  poeticModeIndicator: HTMLElement;

  // Register options
  registerOptions: HTMLElement;

  // Background elements (for BackgroundManifestations)
  goddessBackground: HTMLElement;
  visionBackground: HTMLElement;

  // Image attachment elements
  imageInput: HTMLInputElement;
  attachButton: HTMLButtonElement;
  attachmentPreview: HTMLElement;
  attachmentThumbnail: HTMLImageElement;
  attachmentDismiss: HTMLButtonElement;

  // Optional: Avatar button in empty state
  emptyAvatarBtn?: HTMLElement;

  // Optional: Starter prompts container
  starterPrompts?: HTMLElement;

  // Optional callbacks
  onToast?: (message: string) => void;
}

// ─────────────────────────────────────────────────────────────
//   LabyrinthChat Class
// ─────────────────────────────────────────────────────────────

export class LabyrinthChat {
  // Core chat elements
  private history: HTMLElement;
  private form: HTMLFormElement;
  private input: HTMLInputElement;
  private submitBtn: HTMLButtonElement;
  private emptyState: HTMLElement;
  private isLoading = false;

  // Orchestrator integration (Open Souls paradigm)
  private orchestrator: SoulOrchestrator | null = null;
  private orchestratorRetrying = false;
  private currentRenderer: StreamRenderer | null = null;
  private pendingResolve: ((response: string) => void) | null = null;

  // Soul state indicator
  private stateIndicator: HTMLElement;
  private stateDot: HTMLElement;
  private stateText: HTMLElement;

  // Archive indicator
  private archiveIndicator: HTMLElement;

  // Academic mode indicator
  private academicModeIndicator: HTMLElement;

  // Poetic mode indicator
  private poeticModeIndicator: HTMLElement;

  // Background manifestations module (goddess + vision)
  private backgrounds: BackgroundManifestations;

  // Image attachment manager module
  private imageManager: ImageAttachmentManager;

  // Register options for poetic mode
  private registerOptions: HTMLElement;
  private pendingRegister: string | null = null;
  private registerAutoHideTimer: ReturnType<typeof setTimeout> | null = null;

  // Tarot renderer (extracted module)
  private tarotRenderer: TarotRenderer;

  // Optional callbacks
  private onToast?: (message: string) => void;

  // State display mapping
  private readonly stateLabels: Record<string, string> = {
    greeting: 'Kothar is pondering...',
    curious: 'Kothar is curious...',
    engaged: 'Kothar is contemplating...',
    ready: 'Kothar is attending...',
    returning: 'Kothar is remembering...',
    dormant: 'Kothar is dreaming...',
    exiting: 'Kothar is reflecting...',
  };

  // Bound event handlers for form events (not using typed system)
  private boundHandleSubmit: (e: Event) => void;
  private boundHandlePaste: (e: ClipboardEvent) => void;
  private boundHandleUnload: () => void;

  // Typed event unsubscribe functions (from listen() helper)
  private eventUnsubscribers: Array<() => void> = [];

  constructor(config: LabyrinthChatConfig) {
    console.log('[Labyrinth] LabyrinthChat constructor starting...');

    // Core chat elements
    this.history = config.conversationHistory;
    this.form = config.form;
    this.input = config.input;
    this.emptyState = config.emptyState;

    // Query submit button with null check
    const submitBtn = this.form.querySelector('.labyrinth-submit');
    if (!submitBtn) {
      console.error('[LabyrinthChat] Submit button (.labyrinth-submit) not found in form');
      throw new Error('Submit button not found - check form structure');
    }
    this.submitBtn = submitBtn as HTMLButtonElement;

    // Soul state indicator elements
    this.stateIndicator = config.stateIndicator;
    this.stateDot = config.stateDot;
    this.stateText = config.stateText;

    // Indicators and controls
    this.archiveIndicator = config.archiveIndicator;
    this.academicModeIndicator = config.academicModeIndicator;
    this.poeticModeIndicator = config.poeticModeIndicator;
    this.registerOptions = config.registerOptions;

    // Optional callback
    this.onToast = config.onToast;

    // Background manifestations module (goddess + vision)
    this.backgrounds = new BackgroundManifestations({
      goddessElement: config.goddessBackground,
      visionElement: config.visionBackground,
      defaultDuration: 30000,
    });

    // Image attachment manager module
    this.imageManager = new ImageAttachmentManager({
      fileInput: config.imageInput,
      attachButton: config.attachButton,
      previewContainer: config.attachmentPreview,
      thumbnailElement: config.attachmentThumbnail,
      dismissButton: config.attachmentDismiss,
      onToast: (message) => this.showToast(message),
    });

    // Tarot renderer (extracted module) - uses conversation history container
    this.tarotRenderer = new TarotRenderer({
      container: this.history,
      onScroll: () => { this.history.scrollTop = this.history.scrollHeight; }
    });

    // Bind form event handlers (not using typed system - these are form/input specific)
    this.boundHandleSubmit = (e) => { e.preventDefault(); this.sendMessage(); };
    this.boundHandlePaste = (e) => this.imageManager.handlePaste(e);
    this.boundHandleUnload = () => { this.orchestrator?.notifySessionEnd(); };

    // Initialize with optional elements
    this.init(config.emptyAvatarBtn, config.starterPrompts);
  }

  private init(emptyAvatarBtn?: HTMLElement, starterPrompts?: HTMLElement) {
    console.log('[Labyrinth] init() starting...');

    // Inject streaming styles
    injectStreamingStyles();

    // Initialize orchestrator (async, non-blocking)
    this.initOrchestrator();

    // Initialize soul state indicator
    this.updateSoulState();

    // Personalize input placeholder with userName
    const userName = getUserName();
    this.input.placeholder = userName
      ? `Ask Kothar, ${userName}...`
      : 'Ask Kothar...';

    // Load conversation history
    this.renderHistory();

    // Form submission
    this.form.addEventListener('submit', this.boundHandleSubmit);

    // Image paste handler - delegate to ImageAttachmentManager
    this.input.addEventListener('paste', this.boundHandlePaste);

    // Session end notification on page unload (generates summary for returning visitors)
    window.addEventListener('beforeunload', this.boundHandleUnload);

    // Empty state avatar click handler (opens Kothar profile)
    if (emptyAvatarBtn) {
      emptyAvatarBtn.addEventListener('click', () => {
        (window as any).profileModal?.open('kothar', emptyAvatarBtn);
      });
    }

    // Starter prompt chips click handler (event delegation)
    console.log('[Labyrinth] Setting up starter prompts handler, element:', starterPrompts);
    if (starterPrompts) {
      starterPrompts.addEventListener('click', (e) => {
        console.log('[Labyrinth] Starter prompts clicked, target:', e.target);
        const chip = (e.target as HTMLElement).closest('.starter-chip');
        console.log('[Labyrinth] Found chip:', chip);
        if (chip) {
          const prompt = chip.getAttribute('data-prompt');
          console.log('[Labyrinth] Prompt:', prompt);
          if (prompt) {
            this.input.value = prompt;
            this.sendMessage();
          }
        }
      });
    } else {
      console.warn('[Labyrinth] starter-prompts element not found!');
    }

    // Register options click handler (event delegation, set up once)
    this.initRegisterOptionsHandler();

    // Setup typed event listeners (soul:* events from SSE stream)
    // Using listen() from events.ts for type safety and automatic cleanup
    this.eventUnsubscribers = [
      listen('voice:transcript', ({ transcript }) => {
        if (transcript) {
          this.input.value = transcript;
          this.sendMessage();
        }
      }),
      listen('soul:background', (payload) => {
        this.backgrounds.handleGoddess(payload);
      }),
      listen('soul:archive', ({ active }) => {
        this.setArchiveIndicator(active);
      }),
      listen('soul:vision', (payload) => {
        this.backgrounds.handleVision(payload);
      }),
      listen('soul:tarot-placeholder', (payload) => {
        this.tarotRenderer.handlePlaceholder(payload);
      }),
      listen('soul:tarot-card', (payload) => {
        this.tarotRenderer.handleCard(payload);
      }),
      listen('soul:tarot-complete', (payload) => {
        this.tarotRenderer.handleComplete(payload);
      }),
      listen('soul:tarot-inline', (payload) => {
        this.tarotRenderer.handleInline(payload);
      }),
      listen('soul:imageAnalysis', (payload) => {
        this.handleImageAnalysisStatus(payload);
      }),
      listen('soul:mode', ({ mode }) => {
        this.setAcademicModeIndicator(mode === 'academic');
        this.setPoeticModeIndicator(mode === 'poetic');
      }),
      listen('soul:registerOptions', (payload) => {
        this.handleRegisterOptions(payload);
      }),
      listen('visitor-model-updated', (payload) => {
        this.handleVisitorModelUpdated(payload);
      }, 'window'),
    ];

    // Check for message ID in URL (deep link)
    const params = new URLSearchParams(window.location.search);
    const msgId = params.get('msg');
    if (msgId) {
      setTimeout(() => this.scrollToMessage(msgId), 100);
    }

    // Focus input
    this.input.focus();
  }

  private async initOrchestrator() {
    try {
      // Fetch soul personality from API
      const response = await fetch('/api/soul/personality');
      const { personality } = await response.json();

      // Configure orchestrator with API mode and streaming callbacks
      const config: OrchestratorConfig = {
        debug: true,
        apiMode: true,  // Delegate LLM calls to server-side endpoints
        onStreamStart: () => {
          console.log('[Labyrinth] Stream started');
        },
        onStreamChunk: (chunk: string) => {
          if (this.currentRenderer) {
            this.currentRenderer.appendChunk(chunk);
            this.scrollToBottom();
          }
        },
        onStreamEnd: () => {
          console.log('[Labyrinth] Stream ended');
        },
        onResponse: (response: string) => {
          if (this.currentRenderer) {
            this.currentRenderer.finalize(response, this.formatContent.bind(this));
          }
          if (this.pendingResolve) {
            this.pendingResolve(response);
            this.pendingResolve = null;
          }
        },
        onToast: (message: string, duration: number) => {
          document.dispatchEvent(new CustomEvent('soul:toast', {
            detail: { message, duration, type: 'info' }
          }));
        },
        onWhispersUpdate: (whispers: string) => {
          console.log('[Labyrinth] Visitor whispers updated:', whispers.slice(0, 100) + '...');
        },
      };

      // Get singleton orchestrator and initialize
      this.orchestrator = getSoulOrchestrator(config);
      await this.orchestrator.init(personality);

      console.log('[Labyrinth] SoulOrchestrator initialized');
    } catch (error) {
      console.error('[Labyrinth] Failed to initialize orchestrator:', error);
      // Retry once after a short delay — transient network errors on page load
      this.orchestratorRetrying = true;
      setTimeout(() => {
        this.initOrchestrator()
          .catch((retryErr) => {
            console.error('[Labyrinth] Orchestrator retry failed — chat will be unavailable:', retryErr);
          })
          .finally(() => {
            this.orchestratorRetrying = false;
          });
      }, 3000);
    }
  }

  private loadConversation(): ConversationThread {
    try {
      const stored = localStorage.getItem('minoan-soul-conversation');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('[Labyrinth] Failed to load conversation, clearing corrupted data:', e);
      try { localStorage.removeItem('minoan-soul-conversation'); } catch { /* localStorage unavailable */ }
    }
    return { messages: [], lastUpdated: Date.now(), schemaVersion: 1 };
  }

  private saveConversation(thread: ConversationThread) {
    localStorage.setItem('minoan-soul-conversation', JSON.stringify(thread));
  }

  private renderHistory() {
    const thread = this.loadConversation();

    if (thread.messages.length === 0) {
      this.emptyState.style.display = 'flex';
      return;
    }

    this.emptyState.style.display = 'none';

    // Clear existing messages (except empty state)
    this.history.querySelectorAll('.message').forEach(el => el.remove());

    // Render messages
    thread.messages.forEach(msg => {
      this.renderMessage(msg);
    });

    // Scroll to bottom
    this.scrollToBottom();
  }

  private renderMessage(msg: ChatMessage, isLoading = false) {
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${msg.role}${isLoading ? ' message-loading' : ''}`;
    messageEl.id = `msg-${msg.id}`;

    const avatarIcon = msg.role === 'user'
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'
      : '<img src="/images/avatars/minoan-avatar.webp" alt="Minoan" class="minoan-avatar-img" />';

    const content = isLoading
      ? '<span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span>'
      : this.formatContent(msg.content);

    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Build structure using DOM APIs to prevent XSS
    const avatarBtn = document.createElement('button');
    avatarBtn.type = 'button';
    avatarBtn.className = 'message-avatar message-avatar-btn';
    avatarBtn.innerHTML = avatarIcon; // Safe: avatarIcon is hardcoded

    // Add profile modal click handlers
    if (msg.role === 'assistant') {
      avatarBtn.setAttribute('aria-label', 'View Kothar\'s profile');
      avatarBtn.addEventListener('click', () => {
        (window as any).profileModal?.open('kothar', avatarBtn);
      });
    } else {
      avatarBtn.setAttribute('aria-label', 'View your profile');
      avatarBtn.addEventListener('click', () => {
        (window as any).profileModal?.open('user', avatarBtn);
      });
    }

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';

    // Add image using DOM API if present (prevents XSS from dataUrl)
    if (msg.image && ImageAttachmentManager.isValidImageDataUrl(msg.image.dataUrl)) {
      const imageEl = document.createElement('img');
      imageEl.src = msg.image.dataUrl;
      imageEl.alt = 'Attached image';
      imageEl.className = 'message-image';
      imageEl.dataset.lightbox = '';
      imageEl.addEventListener('click', () => {
        ImageAttachmentManager.openLightbox(imageEl.src);
      });
      bubbleDiv.appendChild(imageEl);
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = content; // Safe: formatContent escapes HTML entities before markdown transforms

    const metaDiv = document.createElement('div');
    metaDiv.className = 'message-meta';
    metaDiv.textContent = time;

    bubbleDiv.appendChild(contentDiv);
    bubbleDiv.appendChild(metaDiv);
    messageEl.appendChild(avatarBtn);
    messageEl.appendChild(bubbleDiv);

    this.history.appendChild(messageEl);
    return messageEl;
  }

  /**
   * Update soul state indicator from localStorage
   */
  private updateSoulState() {
    try {
      const memory = JSON.parse(localStorage.getItem('minoan-soul-memory') || '{}');
      const state = memory.currentState || 'greeting';
      const isReturning = (memory.visitCount || 1) > 1;

      // Use 'returning' state if this is a returning visitor and in greeting
      const displayState = (isReturning && state === 'greeting') ? 'returning' : state;

      // Update the dot's data attribute for CSS styling
      this.stateDot.setAttribute('data-state', displayState);

      // Update the text
      const label = this.stateLabels[displayState] || this.stateLabels.greeting;
      this.stateText.textContent = label;

      console.log('[Labyrinth] Soul state updated:', displayState);
    } catch (e) {
      // Default to greeting state
      this.stateDot.setAttribute('data-state', 'greeting');
      this.stateText.textContent = this.stateLabels.greeting;
    }
  }

  /**
   * Cleanup method for navigation/unmount
   * Removes event listeners to prevent memory leaks
   */
  public destroy() {
    // Remove form/input event listeners
    this.form.removeEventListener('submit', this.boundHandleSubmit);
    this.input.removeEventListener('paste', this.boundHandlePaste);
    window.removeEventListener('beforeunload', this.boundHandleUnload);

    // Unsubscribe all typed event listeners
    this.eventUnsubscribers.forEach(unsubscribe => unsubscribe());
    this.eventUnsubscribers = [];

    // Clear timers
    if (this.registerAutoHideTimer) {
      clearTimeout(this.registerAutoHideTimer);
      this.registerAutoHideTimer = null;
    }

    // Destroy extracted modules
    this.backgrounds.destroy();
    this.imageManager.destroy();

    console.log('[Labyrinth] LabyrinthChat destroyed, listeners cleaned up');
  }

  /**
   * Show/hide archive indicator during RAG retrieval
   */
  private setArchiveIndicator(active: boolean) {
    if (!this.archiveIndicator) return;

    if (active) {
      this.archiveIndicator.classList.add('active');
      console.log('[Labyrinth] Archive search started');
    } else {
      this.archiveIndicator.classList.remove('active');
      console.log('[Labyrinth] Archive search complete');
    }
  }

  /**
   * Show/hide academic mode indicator
   */
  private setAcademicModeIndicator(active: boolean) {
    if (!this.academicModeIndicator) return;

    if (active) {
      this.academicModeIndicator.classList.add('active');
      console.log('[Labyrinth] Academic mode activated');
    } else {
      this.academicModeIndicator.classList.remove('active');
      console.log('[Labyrinth] Academic mode deactivated');
    }
  }

  /**
   * Show/hide poetic mode indicator
   */
  private setPoeticModeIndicator(active: boolean) {
    if (!this.poeticModeIndicator) return;

    if (active) {
      this.poeticModeIndicator.classList.add('active');
      console.log('[Labyrinth] Poetic mode activated');
    } else {
      this.poeticModeIndicator.classList.remove('active');
      console.log('[Labyrinth] Poetic mode deactivated');
    }
  }

  /**
   * Handle image analysis status events
   */
  private handleImageAnalysisStatus(detail: { status: string; caption?: { type: string; caption: string }; error?: string }) {
    if (detail.status === 'analyzing') {
      if (this.archiveIndicator) {
        const textEl = this.archiveIndicator.querySelector('.archive-text');
        if (textEl) {
          textEl.textContent = 'Kothar is perceiving the image';
        }
        this.archiveIndicator.classList.add('active');
      }
      console.log('[Labyrinth] Image analysis started');
    } else if (detail.status === 'complete' || detail.status === 'error') {
      if (this.archiveIndicator) {
        const textEl = this.archiveIndicator.querySelector('.archive-text');
        if (textEl) {
          textEl.textContent = 'Kothar is consulting his archives';
        }
        this.archiveIndicator.classList.remove('active');
      }
      if (detail.status === 'complete') {
        console.log('[Labyrinth] Image analysis complete:', detail.caption?.type);
      } else {
        console.log('[Labyrinth] Image analysis error:', detail.error);
      }
    }
  }

  /**
   * Initialize register options click handlers (called once during setup)
   * Uses event delegation to avoid listener accumulation
   */
  private initRegisterOptionsHandler() {
    if (!this.registerOptions) return;

    // Single delegated event listener on the container
    this.registerOptions.addEventListener('click', (e) => {
      const chip = (e.target as HTMLElement).closest('.register-chip');
      if (!chip) return;

      // Toggle selection and aria-pressed for accessibility
      this.registerOptions.querySelectorAll('.register-chip').forEach(c => {
        c.classList.remove('selected');
        c.setAttribute('aria-pressed', 'false');
      });
      chip.classList.add('selected');
      chip.setAttribute('aria-pressed', 'true');
      this.pendingRegister = (chip as HTMLElement).dataset.register || null;
      console.log('[Labyrinth] Register selected:', this.pendingRegister);
    });

    // Keyboard navigation for accessibility
    this.registerOptions.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;

      const chips = Array.from(this.registerOptions.querySelectorAll('.register-chip')) as HTMLElement[];
      const currentIndex = chips.findIndex(c => c === document.activeElement);
      if (currentIndex === -1) return;

      e.preventDefault();
      let newIndex = currentIndex;

      if (e.key === 'ArrowRight') {
        newIndex = (currentIndex + 1) % chips.length;
      } else if (e.key === 'ArrowLeft') {
        newIndex = (currentIndex - 1 + chips.length) % chips.length;
      } else if (e.key === 'Home') {
        newIndex = 0;
      } else if (e.key === 'End') {
        newIndex = chips.length - 1;
      }

      chips[newIndex].focus();
    });
  }

  /**
   * Handle register options for poetic mode
   * Shows oracle-like chips for the visitor to choose a poetic register
   */
  private handleRegisterOptions(detail: { registers: Array<{ id: string; label: string; description: string }>; prompt: string }) {
    if (!this.registerOptions) return;

    // Clear any existing auto-hide timer
    if (this.registerAutoHideTimer) {
      clearTimeout(this.registerAutoHideTimer);
      this.registerAutoHideTimer = null;
    }

    // Reset any previous selection and aria-pressed state
    this.registerOptions.querySelectorAll('.register-chip').forEach(chip => {
      chip.classList.remove('selected');
      chip.setAttribute('aria-pressed', 'false');
    });
    this.pendingRegister = null;

    // Update prompt if provided
    const promptEl = this.registerOptions.querySelector('.register-prompt');
    if (promptEl && detail.prompt) {
      promptEl.textContent = detail.prompt;
    }

    // Show the register options container (CSS animation handles reveal)
    this.registerOptions.style.display = 'flex';

    // Set auto-hide failsafe (5 minutes) in case chips get stuck
    this.registerAutoHideTimer = setTimeout(() => {
      console.log('[Labyrinth] Register options auto-hidden (timeout)');
      this.hideRegisterOptions();
    }, 5 * 60 * 1000);

    console.log('[Labyrinth] Register options shown:', detail.registers?.length);
  }

  /**
   * Hide register options (called when sending a message)
   */
  private hideRegisterOptions() {
    if (this.registerAutoHideTimer) {
      clearTimeout(this.registerAutoHideTimer);
      this.registerAutoHideTimer = null;
    }

    if (this.registerOptions) {
      this.registerOptions.style.display = 'none';
      this.registerOptions.style.animation = 'none';
      void this.registerOptions.offsetHeight; // Force reflow
      this.registerOptions.style.animation = '';
    }
  }

  /**
   * Handle visitor model update notification
   * Pulses the user avatar and shows a subtle toast
   */
  private handleVisitorModelUpdated(detail: { notes: string; userName: string; timestamp: number }) {
    console.log('[Labyrinth] Visitor model updated:', detail.userName);

    // Find the most recent user message avatar and pulse it
    const userMessages = this.history?.querySelectorAll('.message-user .message-avatar-btn');
    if (userMessages && userMessages.length > 0) {
      const lastUserAvatar = userMessages[userMessages.length - 1] as HTMLElement;

      lastUserAvatar.classList.remove('avatar-pulse');
      void lastUserAvatar.offsetHeight; // Force reflow
      lastUserAvatar.classList.add('avatar-pulse');

      setTimeout(() => {
        lastUserAvatar.classList.remove('avatar-pulse');
      }, 2000);
    }

    this.showModelUpdateToast();
  }

  /**
   * Show a small toast when the visitor model updates
   */
  private showModelUpdateToast() {
    const existingToast = document.querySelector('.model-update-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'model-update-toast';
    toast.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10H12V2Z"/>
        <path d="M12 12 2 12a10 10 0 0 0 10 10V12Z"/>
      </svg>
      Learning about you...
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('is-visible');
    });

    setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  private formatContent(content: string): string {
    // Escape HTML entities FIRST to prevent XSS via innerHTML
    const escaped = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    // Then apply markdown-like transforms on the safe string
    return escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  private async sendMessage() {
    const query = this.input.value.trim();
    const hasImage = this.imageManager.hasPendingImage();

    if ((!query && !hasImage) || this.isLoading) return;

    // Name extraction (instant, no LLM call)
    if (query) {
      const currentUserName = getUserName();
      if (!currentUserName || currentUserName === 'visitor') {
        const extractedName = extractNameHeuristic(query);
        if (extractedName) {
          saveUserName(extractedName);
          this.input.placeholder = `Ask Kothar, ${extractedName}...`;
        }
      }

      // Title/profession extraction (instant, no LLM call)
      const currentUserTitle = getUserTitle();
      if (!currentUserTitle) {
        const extractedTitle = extractTitleHeuristic(query);
        if (extractedTitle) {
          saveUserTitle(extractedTitle);
        }
      }
    }

    this.isLoading = true;
    this.submitBtn.disabled = true;
    this.imageManager.setEnabled(false);
    this.input.value = '';
    this.emptyState.style.display = 'none';

    // Capture and clear pending image
    const imageAttachment = this.imageManager.getPendingImage(true);

    // Capture and clear pending poetic register selection
    const registerSelection = this.pendingRegister;
    this.pendingRegister = null;
    this.hideRegisterOptions();

    // Add user message
    const userMsg: ChatMessage = {
      id: `${Date.now()}_user`,
      role: 'user',
      content: query || 'What do you see in this image?',
      timestamp: Date.now(),
      page: '/labyrinth',
      image: imageAttachment || undefined,
    };
    this.renderMessage(userMsg);

    // Evaluate message for goddess-invoked trigger
    try {
      const triggerManager = getTriggerManager();
      triggerManager.evaluateMessage(query);
    } catch (e) {
      console.warn('[Labyrinth] Trigger evaluation failed:', e);
    }

    // Add loading state
    const loadingMsg: ChatMessage = {
      id: 'streaming',
      role: 'assistant',
      content: '',
      timestamp: Date.now()
    };
    const loadingEl = this.renderMessage(loadingMsg, true);
    this.scrollToBottom();

    try {
      if (!this.orchestrator) {
        throw new Error(
          this.orchestratorRetrying
            ? 'Kothar is still awakening — please try again in a moment.'
            : 'SoulOrchestrator not initialized'
        );
      }

      this.currentRenderer = new StreamRenderer(loadingEl);
      this.currentRenderer.start();

      let rejectResponse: (reason: unknown) => void;
      const responsePromise = new Promise<string>((resolve, reject) => {
        this.pendingResolve = resolve;
        rejectResponse = reject;
      });

      try {
        await this.orchestrator.handleMessage(
          query || 'What do you see in this image?',
          {
            ...(imageAttachment ? { imageAttachment } : {}),
            ...(registerSelection ? { register: registerSelection } : {}),
          }
        );
      } catch (handleErr) {
        // Reject the pending promise so await below doesn't hang forever
        rejectResponse!(handleErr);
        throw handleErr;
      }

      const finalResponse = await responsePromise;
      this.currentRenderer = null;

      loadingEl.id = `msg-${Date.now()}_assistant`;

      const assistantMsg: ChatMessage = {
        id: `${Date.now()}_assistant`,
        role: 'assistant',
        content: finalResponse,
        timestamp: Date.now(),
        page: '/labyrinth'
      };

      // Save to localStorage (strip image dataUrl to save space)
      const thread = this.loadConversation();

      const userMsgForStorage: ChatMessage = {
        ...userMsg,
        image: userMsg.image ? {
          ...userMsg.image,
          dataUrl: '',
        } : undefined,
      };

      thread.messages.push(userMsgForStorage, assistantMsg);
      thread.lastUpdated = Date.now();

      if (thread.messages.length > 100) {
        thread.messages = thread.messages.slice(-100);
      }

      this.saveConversation(thread);

    } catch (error) {
      console.error('Chat error:', error);
      loadingEl.remove();
      this.currentRenderer = null;

      const errorMsg: ChatMessage = {
        id: `${Date.now()}_error`,
        role: 'assistant',
        content: "The Oracle's connection wavers. Try again in a moment.",
        timestamp: Date.now()
      };
      this.renderMessage(errorMsg);
    }

    this.isLoading = false;
    this.submitBtn.disabled = false;
    this.imageManager.setEnabled(true);
    this.input.focus();
    this.scrollToBottom();

    this.updateSoulState();
  }

  private showToast(message: string) {
    if (this.onToast) {
      this.onToast(message);
      return;
    }

    const existing = document.querySelector('.labyrinth-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'labyrinth-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('is-visible');
    });

    setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 200);
    }, 2000);
  }

  private scrollToBottom() {
    this.history.scrollTop = this.history.scrollHeight;
  }

  private scrollToMessage(msgId: string) {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('is-highlighted');
      setTimeout(() => el.classList.remove('is-highlighted'), 2000);
    }
  }
}
