/**
 * Command Palette Chat Mode Manager
 *
 * Manages the dual-mode behavior of the Command Palette:
 * - Command Mode: Traditional command filtering and execution
 * - Chat Mode: Conversational input that queries the soul
 */

import { getSoulChatClient, type ChatResponse } from './chatClient';
import { getSuggestionEngine, type SuggestedQuestion } from './suggestions';
import { createToastPayload, createLoadingPayload } from './responseFormatter';
import { getSoulMemory } from './memory';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type PaletteMode = 'command' | 'chat';

export interface ModeState {
  mode: PaletteMode;
  isLoading: boolean;
  suggestions: SuggestedQuestion[];
}

export interface ModeManagerCallbacks {
  onModeChange: (mode: PaletteMode) => void;
  onSuggestionsReady: (suggestions: SuggestedQuestion[]) => void;
  onSubmitStart: () => void;
  onSubmitComplete: (response: ChatResponse) => void;
  onSubmitError: (error: string) => void;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

// Question patterns that indicate chat mode
const QUESTION_PATTERNS = /^(what|who|when|where|why|how|can|could|should|would|tell|explain|describe|show|give|is|are|do|does|did)/i;

// Minimum words for natural language detection
const MIN_WORDS_FOR_CHAT = 3;

// ─────────────────────────────────────────────────────────────
// Command Palette Mode Manager
// ─────────────────────────────────────────────────────────────

export class CommandPaletteModeManager {
  private mode: PaletteMode = 'command';
  private isLoading: boolean = false;
  private callbacks: Partial<ModeManagerCallbacks> = {};
  private chatClient = getSoulChatClient();
  private suggestionEngine = getSuggestionEngine();

  // ─── Public Methods ─────────────────────────────────────────

  /**
   * Set callbacks for mode changes and events
   */
  setCallbacks(callbacks: Partial<ModeManagerCallbacks>): void {
    this.callbacks = callbacks;
  }

  /**
   * Detect the appropriate mode based on input and command matches
   */
  detectMode(input: string, hasCommandMatches: boolean): PaletteMode {
    // Always command mode if matches exist
    if (hasCommandMatches) {
      this.setMode('command');
      return 'command';
    }

    // Empty input = command mode
    const trimmed = input.trim();
    if (!trimmed) {
      this.setMode('command');
      return 'command';
    }

    // Check for question patterns
    if (QUESTION_PATTERNS.test(trimmed)) {
      this.setMode('chat');
      return 'chat';
    }

    // Multi-word natural language = chat mode
    const words = trimmed.split(/\s+/);
    if (words.length >= MIN_WORDS_FOR_CHAT) {
      this.setMode('chat');
      return 'chat';
    }

    // Default to command mode for single/double words
    this.setMode('command');
    return 'command';
  }

  /**
   * Get current mode
   */
  getMode(): PaletteMode {
    return this.mode;
  }

  /**
   * Check if currently loading
   */
  getIsLoading(): boolean {
    return this.isLoading;
  }

  /**
   * Handle submit action based on mode
   */
  async handleSubmit(input: string): Promise<ChatResponse | null> {
    if (this.mode !== 'chat') {
      return null; // Let command palette handle command execution
    }

    const trimmed = input.trim();
    if (!trimmed) {
      return null;
    }

    this.isLoading = true;
    this.callbacks.onSubmitStart?.();

    // Show loading toast
    this.dispatchToast(createLoadingPayload());

    try {
      const response = await this.chatClient.sendMessage(trimmed);

      this.isLoading = false;
      this.callbacks.onSubmitComplete?.(response);

      // Show response in floating dialogue
      const toastPayload = createToastPayload(response.formatted, 'info');
      this.dispatchToast(toastPayload);

      return response;
    } catch (error) {
      this.isLoading = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.callbacks.onSubmitError?.(errorMessage);

      // Show error toast
      this.dispatchToast({
        message: "The Oracle's connection wavers. Try again in a moment.",
        duration: 5000,
        type: 'hint'
      });

      return null;
    }
  }

  /**
   * Request suggestions based on current input and context
   */
  requestSuggestions(input: string): void {
    const currentPage = this.getCurrentPage();
    const userModel = this.getUserModel();

    this.suggestionEngine.requestSuggestions(
      (suggestions) => {
        this.callbacks.onSuggestionsReady?.(suggestions);
      },
      currentPage,
      userModel
    );
  }

  /**
   * Get suggestions immediately (for input-based filtering)
   */
  getSuggestionsForInput(input: string): SuggestedQuestion[] {
    const currentPage = this.getCurrentPage();
    const userModel = this.getUserModel();

    return this.suggestionEngine.getSuggestionsForInput(
      input,
      currentPage,
      userModel
    );
  }

  /**
   * Cancel pending suggestion requests
   */
  cancelSuggestions(): void {
    this.suggestionEngine.cancelSuggestions();
  }

  /**
   * Reset mode to default
   */
  reset(): void {
    this.mode = 'command';
    this.isLoading = false;
    this.cancelSuggestions();
  }

  // ─── Private Methods ────────────────────────────────────────

  private setMode(mode: PaletteMode): void {
    if (this.mode !== mode) {
      this.mode = mode;
      this.callbacks.onModeChange?.(mode);
    }
  }

  private getCurrentPage(): string {
    if (typeof window === 'undefined') return '/';
    return window.location.pathname;
  }

  private getUserModel(): ReturnType<typeof getSoulMemory>['get'] extends () => infer R ? R : never {
    return getSoulMemory().get();
  }

  private dispatchToast(payload: { message: string; duration: number; type?: string; hasHtml?: boolean }): void {
    if (typeof document === 'undefined') return;

    const event = new CustomEvent('soul:toast', {
      detail: payload
    });
    document.dispatchEvent(event);
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────

let managerInstance: CommandPaletteModeManager | null = null;

export function getCommandPaletteModeManager(): CommandPaletteModeManager {
  if (!managerInstance) {
    managerInstance = new CommandPaletteModeManager();
  }
  return managerInstance;
}

export function resetCommandPaletteModeManager(): void {
  if (managerInstance) {
    managerInstance.reset();
  }
  managerInstance = null;
}
