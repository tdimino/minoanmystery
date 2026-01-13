/**
 * Soul Chat Client
 *
 * Provides an abstraction layer for communicating with the soul chat API.
 * Handles conversation history, rate limiting, and error recovery.
 */

import { getConversationMemory, type ChatMessage } from './conversationMemory';
import { formatChatResponse, formatErrorResponse, type FormattedResponse } from './responseFormatter';
import { getSoulMemory } from './memory';
import type { SoulState } from './types';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface ChatResponse {
  message: string;
  formatted: FormattedResponse;
  soulState?: SoulState;
  messageId?: string;
}

interface APIResponse {
  message: string;
  soulState?: SoulState;
  error?: string;
}

interface VisitorContext {
  currentPage?: string;
  pagesViewed?: string[];
  timeOnSite?: number;
  scrollDepth?: number;
  visitCount?: number;
  behavioralType?: string;
  inferredInterests?: string[];
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const API_ENDPOINT = '/api/soul/chat';
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests
const CONTEXT_MESSAGE_LIMIT = 10; // Number of recent messages to include

// ─────────────────────────────────────────────────────────────
// Error Messages (Thematic)
// ─────────────────────────────────────────────────────────────

const ERROR_MESSAGES = {
  connection: "The Oracle's connection wavers. Try again in a moment.",
  timeout: "The volcanic ash obscures the Oracle's voice. Please try again.",
  rateLimit: "The Oracle needs a moment to rest. Please wait.",
  generic: "The labyrinth hides the answer for now. Try again.",
};

// ─────────────────────────────────────────────────────────────
// Soul Chat Client Class
// ─────────────────────────────────────────────────────────────

export class SoulChatClient {
  private lastRequestTime: number = 0;

  // ─── Public Methods ─────────────────────────────────────────

  /**
   * Send a message to the soul and get a response
   */
  async sendMessage(
    query: string,
    options: { stream?: boolean } = {}
  ): Promise<ChatResponse> {
    const { stream = false } = options;

    // Rate limiting
    await this.enforceRateLimit();

    // Get conversation memory and soul memory
    const conversationMemory = getConversationMemory();
    const soulMemory = getSoulMemory();
    const userModel = soulMemory.get();

    // Add user message to conversation
    const userMessage = conversationMemory.addMessage({
      role: 'user',
      content: query
    });

    try {
      // Build request payload
      const payload = {
        query,
        visitorContext: this.buildVisitorContext(userModel),
        conversationHistory: this.getConversationHistory(),
        stream
      };

      // Make API request
      const response = await this.makeRequest(payload);

      // Add assistant response to conversation
      const assistantMessage = conversationMemory.addMessage({
        role: 'assistant',
        content: response.message
      });

      // Format for display
      const formatted = formatChatResponse(response.message, {
        messageId: assistantMessage.id
      });

      return {
        message: response.message,
        formatted,
        soulState: response.soulState,
        messageId: assistantMessage.id
      };
    } catch (error) {
      console.error('[SoulChatClient] Request failed:', error);

      // Determine error message
      const errorMessage = this.getErrorMessage(error);
      const formatted = formatErrorResponse(errorMessage);

      // Store error as assistant message for transparency
      conversationMemory.addMessage({
        role: 'assistant',
        content: `[Error: ${errorMessage}]`
      });

      return {
        message: errorMessage,
        formatted,
        soulState: 'greeting'
      };
    }
  }

  /**
   * Get conversation history for display
   */
  getHistory(page?: string): ChatMessage[] {
    return getConversationMemory().getMessages(page);
  }

  /**
   * Get recent context for API calls
   */
  getRecentContext(limit: number = CONTEXT_MESSAGE_LIMIT): ChatMessage[] {
    return getConversationMemory().getRecentContext(limit);
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    getConversationMemory().clear();
  }

  // ─── Private Methods ────────────────────────────────────────

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  private async makeRequest(payload: object): Promise<APIResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('rate_limit');
        }
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  private buildVisitorContext(userModel: ReturnType<typeof getSoulMemory>['get'] extends () => infer R ? R : never): VisitorContext {
    return {
      currentPage: userModel.currentPage,
      pagesViewed: userModel.pagesViewed,
      visitCount: userModel.visitCount,
      behavioralType: userModel.behavioralType,
      inferredInterests: userModel.inferredInterests,
      scrollDepth: userModel.scrollDepths[userModel.currentPage] || 0,
      timeOnSite: Date.now() - userModel.firstVisit
    };
  }

  private getConversationHistory(): Array<{ role: 'user' | 'assistant'; content: string }> {
    return getConversationMemory()
      .getRecentContext(CONTEXT_MESSAGE_LIMIT)
      .filter(m => !m.content.startsWith('[Error:')) // Exclude error messages
      .map(m => ({
        role: m.role,
        content: m.content
      }));
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return ERROR_MESSAGES.timeout;
      }
      if (error.message === 'rate_limit') {
        return ERROR_MESSAGES.rateLimit;
      }
      if (error.message.includes('fetch')) {
        return ERROR_MESSAGES.connection;
      }
    }
    return ERROR_MESSAGES.generic;
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────

let clientInstance: SoulChatClient | null = null;

export function getSoulChatClient(): SoulChatClient {
  if (!clientInstance) {
    clientInstance = new SoulChatClient();
  }
  return clientInstance;
}

export function resetSoulChatClient(): void {
  clientInstance = null;
}
