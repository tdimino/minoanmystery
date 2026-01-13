/**
 * Stream Renderer
 *
 * Handles DOM rendering for streaming chat responses.
 * Manages the blinking cursor during streaming and text accumulation.
 */

// ─────────────────────────────────────────────────────────────
// Stream Renderer Class
// ─────────────────────────────────────────────────────────────

export class StreamRenderer {
  private messageElement: HTMLElement;
  private contentElement: HTMLElement;
  private cursorElement: HTMLSpanElement | null = null;
  private accumulatedText = '';

  constructor(messageElement: HTMLElement) {
    this.messageElement = messageElement;
    this.contentElement = messageElement.querySelector('.message-content') as HTMLElement;

    if (!this.contentElement) {
      throw new Error('StreamRenderer: .message-content element not found');
    }
  }

  // ─── Public Methods ─────────────────────────────────────────

  /**
   * Initialize the renderer and show cursor
   */
  start(): void {
    this.accumulatedText = '';
    this.contentElement.textContent = '';
    this.showCursor();
    this.messageElement.classList.add('message-streaming');
  }

  /**
   * Append a text chunk and update display
   */
  appendChunk(text: string): void {
    this.accumulatedText += text;

    // Create text node and insert before cursor
    const textNode = document.createTextNode(text);

    if (this.cursorElement && this.cursorElement.parentNode === this.contentElement) {
      this.contentElement.insertBefore(textNode, this.cursorElement);
    } else {
      this.contentElement.appendChild(textNode);
      this.showCursor(); // Re-add cursor if missing
    }
  }

  /**
   * Show the blinking cursor
   */
  showCursor(): void {
    if (this.cursorElement) return;

    this.cursorElement = document.createElement('span');
    this.cursorElement.className = 'typing-cursor';
    this.cursorElement.textContent = '\u2588'; // Full block character (█)
    this.cursorElement.setAttribute('aria-hidden', 'true');
    this.contentElement.appendChild(this.cursorElement);
  }

  /**
   * Hide the blinking cursor
   */
  hideCursor(): void {
    if (this.cursorElement) {
      this.cursorElement.remove();
      this.cursorElement = null;
    }
  }

  /**
   * Finalize the message with formatted content
   */
  finalize(fullText: string, formatFn?: (text: string) => string): void {
    this.hideCursor();
    this.messageElement.classList.remove('message-streaming');
    this.messageElement.classList.remove('message-loading');

    // Apply formatting if provided
    if (formatFn) {
      this.contentElement.innerHTML = formatFn(fullText);
    } else {
      this.contentElement.textContent = fullText;
    }

    this.accumulatedText = fullText;
  }

  /**
   * Show error state
   */
  showError(errorMessage: string): void {
    this.hideCursor();
    this.messageElement.classList.remove('message-streaming');
    this.messageElement.classList.remove('message-loading');
    this.messageElement.classList.add('message-error');

    this.contentElement.innerHTML = `<em class="error-text">${errorMessage}</em>`;
  }

  /**
   * Get the accumulated text so far
   */
  getText(): string {
    return this.accumulatedText;
  }

  /**
   * Clear the renderer state
   */
  clear(): void {
    this.hideCursor();
    this.accumulatedText = '';
    this.contentElement.textContent = '';
    this.messageElement.classList.remove('message-streaming', 'message-loading', 'message-error');
  }
}

// ─────────────────────────────────────────────────────────────
// CSS Injection (for typing cursor)
// ─────────────────────────────────────────────────────────────

/**
 * Inject the typing cursor CSS if not already present
 * Call this once when initializing the chat interface
 */
export function injectStreamingStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('stream-renderer-styles')) return;

  const style = document.createElement('style');
  style.id = 'stream-renderer-styles';
  style.textContent = `
    /* Typing cursor animation */
    .typing-cursor {
      display: inline;
      margin-left: 1px;
      color: var(--color-primary, #966a85);
      animation: typing-blink 0.8s ease-in-out infinite;
    }

    @keyframes typing-blink {
      0%, 49% { opacity: 1; }
      50%, 100% { opacity: 0; }
    }

    /* Respect reduced motion preference */
    @media (prefers-reduced-motion: reduce) {
      .typing-cursor {
        animation: none;
        opacity: 1;
      }
    }

    /* Streaming state indicator */
    .message-streaming .message-content {
      min-height: 1.5em;
    }

    /* Error text styling */
    .error-text {
      color: var(--color-text-muted, #888);
      font-style: italic;
    }
  `;

  document.head.appendChild(style);
}
