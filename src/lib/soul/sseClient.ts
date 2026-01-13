/**
 * SSE Stream Client
 *
 * Handles Server-Sent Events streaming for real-time chat responses.
 * Emits CustomEvents through the dispatch system for UI updates.
 *
 * Events emitted:
 * - soul:stream:start  - Stream connection established
 * - soul:stream:chunk  - New text chunk received
 * - soul:stream:done   - Stream complete with full response
 * - soul:stream:error  - Error occurred during streaming
 */

import type { SSEChunk, SSEStreamController, SSEStreamOptions } from './types';
import { getSoulMemory } from './memory';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const API_ENDPOINT = '/api/soul/chat';
const DEFAULT_TIMEOUT = 60000; // 60 seconds

// Thematic error messages
const ERROR_MESSAGES = {
  connection: "The Oracle's connection wavers. Try again in a moment.",
  timeout: "The volcanic ash obscures the Oracle's voice. Please try again.",
  aborted: "The vision fades as you look away...",
  generic: "The labyrinth hides the answer for now. Try again.",
};

// ─────────────────────────────────────────────────────────────
// SSE Stream Client Class
// ─────────────────────────────────────────────────────────────

export class SSEStreamClient {
  private abortController: AbortController | null = null;

  // ─── Public Methods ─────────────────────────────────────────

  /**
   * Send a message and receive streaming response
   */
  sendMessage(
    query: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    options: SSEStreamOptions = {}
  ): SSEStreamController {
    // Create abort controller for this request
    this.abortController = new AbortController();
    const signal = options.signal || this.abortController.signal;

    // Build the async stream
    const stream = this.createStream(query, conversationHistory, signal, options.timeout);

    return {
      stream,
      abort: () => this.abort(),
    };
  }

  /**
   * Abort the current streaming request
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      this.dispatchEvent('error', { error: ERROR_MESSAGES.aborted });
    }
  }

  // ─── Private Methods ────────────────────────────────────────

  private async *createStream(
    query: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    signal: AbortSignal,
    timeout = DEFAULT_TIMEOUT
  ): AsyncIterable<SSEChunk> {
    // Dispatch start event
    this.dispatchEvent('start', {});

    // Set up timeout
    const timeoutId = setTimeout(() => {
      this.abort();
    }, timeout);

    try {
      const payload = this.buildRequestPayload(query, conversationHistory);

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Check if response is SSE stream
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('text/event-stream') || !response.body) {
        // Non-streaming response - yield single chunk
        const data = await response.json();
        yield { type: 'done', fullResponse: data.message };
        this.dispatchEvent('done', { fullResponse: data.message });
        return;
      }

      // Parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const messages = buffer.split('\n\n');
          buffer = messages.pop() || '';

          for (const message of messages) {
            const chunk = this.parseSSEMessage(message);
            if (!chunk) continue;

            if (chunk.type === 'chunk' && chunk.text) {
              accumulatedText += chunk.text;
              this.dispatchEvent('chunk', { text: chunk.text, accumulated: accumulatedText });
              yield chunk;
            } else if (chunk.type === 'done') {
              const finalText = chunk.fullResponse || accumulatedText;
              this.dispatchEvent('done', { fullResponse: finalText });
              yield { type: 'done', fullResponse: finalText };
            } else if (chunk.type === 'error') {
              this.dispatchEvent('error', { error: chunk.error });
              yield chunk;
            }
          }
        }

        // Process remaining buffer
        if (buffer.trim()) {
          const chunk = this.parseSSEMessage(buffer);
          if (chunk) {
            if (chunk.type === 'done') {
              this.dispatchEvent('done', { fullResponse: chunk.fullResponse || accumulatedText });
            }
            yield chunk;
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      clearTimeout(timeoutId);

      const errorMessage = this.getErrorMessage(error);
      this.dispatchEvent('error', { error: errorMessage });
      yield { type: 'error', error: errorMessage };
    } finally {
      // Clean up abort controller to prevent memory leaks
      this.abortController = null;
    }
  }

  private buildRequestPayload(
    query: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ): object {
    const memory = getSoulMemory();
    const userModel = memory.get();

    return {
      query,
      visitorContext: {
        currentPage: userModel.currentPage,
        pagesViewed: userModel.pagesViewed,
        visitCount: userModel.visitCount,
        behavioralType: userModel.behavioralType,
        inferredInterests: userModel.inferredInterests,
        scrollDepth: userModel.scrollDepths[userModel.currentPage] || 0,
        timeOnSite: Date.now() - userModel.firstVisit,
      },
      conversationHistory,
      stream: true,
    };
  }

  private parseSSEMessage(message: string): SSEChunk | null {
    const lines = message.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6); // Remove 'data: ' prefix

        try {
          const data = JSON.parse(jsonStr);

          // Handle chunk format: { chunk: "text" }
          if (data.chunk !== undefined) {
            return { type: 'chunk', text: data.chunk };
          }

          // Handle done format: { done: true, fullResponse: "text" }
          if (data.done === true) {
            return { type: 'done', fullResponse: data.fullResponse };
          }

          // Handle error format: { error: "message" }
          if (data.error) {
            return { type: 'error', error: data.error };
          }
        } catch {
          // Ignore malformed JSON
          console.warn('[SSEClient] Failed to parse:', jsonStr);
        }
      }
    }

    return null;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return ERROR_MESSAGES.aborted;
      }
      if (error.message.includes('timeout')) {
        return ERROR_MESSAGES.timeout;
      }
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return ERROR_MESSAGES.connection;
      }
    }
    return ERROR_MESSAGES.generic;
  }

  private dispatchEvent(type: string, detail: object): void {
    if (typeof document === 'undefined') return;

    const event = new CustomEvent(`soul:stream:${type}`, { detail });
    document.dispatchEvent(event);

    console.log(`[SSEClient] soul:stream:${type}`, detail);
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────

let clientInstance: SSEStreamClient | null = null;

export function getSSEStreamClient(): SSEStreamClient {
  if (!clientInstance) {
    clientInstance = new SSEStreamClient();
  }
  return clientInstance;
}

export function resetSSEStreamClient(): void {
  if (clientInstance) {
    clientInstance.abort();
  }
  clientInstance = null;
}
