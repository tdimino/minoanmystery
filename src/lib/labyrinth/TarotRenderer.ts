/**
 * TarotRenderer - Handles tarot card display in the Labyrinth chat
 * Extracted from labyrinth.astro for modularity
 *
 * Supports:
 * - Multi-card spreads (1-3 cards) with placeholder animations
 * - Individual card reveals with position labels
 * - Oracle messages on spread completion
 * - Legacy inline mode for backwards compatibility
 */

// ─────────────────────────────────────────────────────────────
//   Type Definitions
// ─────────────────────────────────────────────────────────────

export interface TarotPlaceholderPayload {
  message: string;
  cardCount?: number;
  spreadType?: string;
}

export interface TarotCardPayload {
  dataUrl: string;
  cardName: string;
  cardNumber: string;
  position?: string;
  index: number;
  total: number;
}

export interface TarotCompletePayload {
  success: boolean;
  cardCount: number;
  spreadType: string;
  oracleMessage?: string;
  duration?: number;
}

export interface TarotInlinePayload {
  dataUrl: string;
  prompt?: string;
  cardName?: string;
  cardNumber?: string;
  displayMode?: string;
  duration?: number;
}

export interface TarotRendererConfig {
  container: HTMLElement;
  onScroll?: () => void;
}

// ─────────────────────────────────────────────────────────────
//   TarotRenderer Class
// ─────────────────────────────────────────────────────────────

export class TarotRenderer {
  private container: HTMLElement;
  private onScroll?: () => void;

  constructor(config: TarotRendererConfig) {
    this.container = config.container;
    this.onScroll = config.onScroll;
  }

  /**
   * Scroll container to bottom
   */
  private scrollToBottom(): void {
    this.container.scrollTop = this.container.scrollHeight;
    this.onScroll?.();
  }

  /**
   * Get position labels based on spread type
   */
  private getPositionLabels(spreadType: string, cardCount: number): string[] {
    if (cardCount === 1) return [''];
    if (cardCount === 2) {
      if (spreadType === 'polarity') return ['shadow', 'light'];
      return ['forming...', 'forming...'];
    }
    if (cardCount === 3) {
      if (spreadType === 'past-present-future') return ['past', 'present', 'future'];
      if (spreadType === 'situation-challenge-guidance') return ['situation', 'challenge', 'guidance'];
      return ['forming...', 'forming...', 'forming...'];
    }
    return [];
  }

  /**
   * Handle tarot placeholder - shows pulsing cards for the spread
   * Supports 1-3 cards with pyramid layout for 3-card spreads
   */
  public handlePlaceholder(payload: TarotPlaceholderPayload): void {
    const cardCount = payload.cardCount || 1;
    const spreadType = payload.spreadType || 'single';

    console.log(`[TarotRenderer] placeholder: ${cardCount} cards (${spreadType})`);

    // Check if spread container already exists
    const existing = this.container.querySelector('.tarot-spread-container');
    if (existing) return;

    // Create spread container
    const spreadContainer = document.createElement('div');
    spreadContainer.className = 'tarot-spread-container';
    spreadContainer.setAttribute('data-spread-type', spreadType);
    spreadContainer.setAttribute('data-card-count', String(cardCount));

    // Position labels based on spread type
    const positionLabels = this.getPositionLabels(spreadType, cardCount);

    if (cardCount === 1) {
      // Single card - simple layout
      spreadContainer.innerHTML = `
        <div class="tarot-spread-row">
          <div class="tarot-placeholder" data-index="0">
            <span class="tarot-forming-symbol">✧</span>
            <span class="tarot-forming-text">forming...</span>
          </div>
        </div>
      `;
    } else if (cardCount === 2) {
      // Two cards - side by side
      spreadContainer.innerHTML = `
        <div class="tarot-spread-row">
          <div class="tarot-placeholder" data-index="0">
            <span class="tarot-forming-symbol">✧</span>
            <span class="tarot-forming-text">${positionLabels[0] || 'forming...'}</span>
          </div>
          <div class="tarot-placeholder" data-index="1">
            <span class="tarot-forming-symbol">✧</span>
            <span class="tarot-forming-text">${positionLabels[1] || 'forming...'}</span>
          </div>
        </div>
      `;
    } else if (cardCount === 3) {
      // Three cards - pyramid layout (1 on top, 2 on bottom)
      spreadContainer.innerHTML = `
        <div class="tarot-spread-row">
          <div class="tarot-placeholder" data-index="0">
            <span class="tarot-forming-symbol">✧</span>
            <span class="tarot-forming-text">${positionLabels[0] || 'forming...'}</span>
          </div>
        </div>
        <div class="tarot-spread-row">
          <div class="tarot-placeholder" data-index="1">
            <span class="tarot-forming-symbol">✧</span>
            <span class="tarot-forming-text">${positionLabels[1] || 'forming...'}</span>
          </div>
          <div class="tarot-placeholder" data-index="2">
            <span class="tarot-forming-symbol">✧</span>
            <span class="tarot-forming-text">${positionLabels[2] || 'forming...'}</span>
          </div>
        </div>
      `;
    }

    this.container.appendChild(spreadContainer);
    this.scrollToBottom();
  }

  /**
   * Sanitize text content to prevent XSS
   */
  private sanitizeText(text: string | undefined): string {
    if (!text) return '';
    // Create a text node and extract its content to escape HTML entities
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Validate that a string is a safe image data URL
   */
  private isValidImageUrl(url: string): boolean {
    // Allow data URLs for base64 images or relative/absolute paths
    const dataUrlRegex = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$/;
    const pathRegex = /^(\/|https?:\/\/)[^\s<>"']*$/;
    return dataUrlRegex.test(url) || pathRegex.test(url);
  }

  /**
   * Handle individual tarot card - replaces placeholder with revealed card
   * Uses DOM APIs to prevent XSS from payload data
   */
  public handleCard(payload: TarotCardPayload): void {
    console.log(`[TarotRenderer] card: ${payload.cardNumber} - ${payload.cardName} (${payload.index + 1}/${payload.total})`);

    const spreadContainer = this.container.querySelector('.tarot-spread-container');
    if (!spreadContainer) {
      // Fallback to legacy inline handling if no spread container
      this.handleInline(payload);
      return;
    }

    // Find the placeholder for this card index
    const placeholder = spreadContainer.querySelector(`.tarot-placeholder[data-index="${payload.index}"]`);
    if (!placeholder) return;

    // Validate dataUrl before using
    if (!this.isValidImageUrl(payload.dataUrl)) {
      console.warn('[TarotRenderer] Invalid image URL rejected');
      return;
    }

    // Create the revealed card wrapper using DOM APIs (prevents XSS)
    const cardWrapper = document.createElement('div');
    cardWrapper.className = 'tarot-card-wrapper';
    cardWrapper.setAttribute('data-index', String(payload.index));

    const cardDiv = document.createElement('div');
    cardDiv.className = 'tarot-card revealed';

    const img = document.createElement('img');
    img.src = payload.dataUrl;
    img.alt = this.sanitizeText(payload.cardName) || 'Tarot Card';
    cardDiv.appendChild(img);

    const labelDiv = document.createElement('div');
    labelDiv.className = 'tarot-card-label';
    labelDiv.textContent = `${payload.cardNumber || ''} · ${payload.cardName || ''}`;

    cardWrapper.appendChild(cardDiv);
    cardWrapper.appendChild(labelDiv);

    if (payload.position) {
      const positionDiv = document.createElement('div');
      positionDiv.className = 'tarot-position-label';
      positionDiv.textContent = payload.position;
      cardWrapper.appendChild(positionDiv);
    }

    // Replace placeholder with card
    placeholder.replaceWith(cardWrapper);
    this.scrollToBottom();
  }

  /**
   * Handle tarot spread complete - shows oracle message
   */
  public handleComplete(payload: TarotCompletePayload): void {
    console.log(`[TarotRenderer] complete: ${payload.spreadType} spread`);

    const spreadContainer = this.container.querySelector('.tarot-spread-container');
    if (!spreadContainer) return;

    // Add oracle message if provided
    if (payload.oracleMessage) {
      const oracleEl = document.createElement('div');
      oracleEl.className = 'tarot-oracle-message';
      oracleEl.textContent = payload.oracleMessage;
      spreadContainer.appendChild(oracleEl);
      this.scrollToBottom();
    }
  }

  /**
   * Handle tarot card inline display - legacy handler for backwards compatibility
   * Uses DOM APIs to prevent XSS from payload data
   */
  public handleInline(payload: TarotInlinePayload): void {
    console.log('[TarotRenderer] inline (legacy mode):', {
      hasDataUrl: !!payload.dataUrl,
      cardName: payload.cardName,
      cardNumber: payload.cardNumber,
    });

    // Remove placeholder if exists (legacy single-card behavior)
    const placeholder = this.container.querySelector('.tarot-placeholder-container');
    if (placeholder) {
      placeholder.remove();
    }

    if (!payload.dataUrl) return;

    // Validate dataUrl before using
    if (!this.isValidImageUrl(payload.dataUrl)) {
      console.warn('[TarotRenderer] Invalid image URL rejected');
      return;
    }

    // Create revealed card element using DOM APIs (prevents XSS)
    const cardEl = document.createElement('div');
    cardEl.className = 'tarot-card-container';

    const cardDiv = document.createElement('div');
    cardDiv.className = 'tarot-card revealed';

    const img = document.createElement('img');
    img.src = payload.dataUrl;
    img.alt = this.sanitizeText(payload.cardName) || 'Tarot Card';
    cardDiv.appendChild(img);

    const labelDiv = document.createElement('div');
    labelDiv.className = 'tarot-card-label';
    labelDiv.textContent = `${payload.cardNumber || ''} · ${payload.cardName || 'THE CARD'}`;

    cardEl.appendChild(cardDiv);
    cardEl.appendChild(labelDiv);

    this.container.appendChild(cardEl);
    this.scrollToBottom();
  }

  /**
   * Remove any active tarot displays
   */
  public clear(): void {
    const spreadContainer = this.container.querySelector('.tarot-spread-container');
    if (spreadContainer) {
      spreadContainer.remove();
    }
    const inlineCard = this.container.querySelector('.tarot-card-container');
    if (inlineCard) {
      inlineCard.remove();
    }
  }
}
