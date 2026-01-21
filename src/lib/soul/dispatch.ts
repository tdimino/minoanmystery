/**
 * Soul Dispatch Layer
 *
 * Executes soul actions - DOM updates, toasts, highlights, etc.
 * Provides the output interface for soul reactions.
 */

import type {
  SoulAction,
  ToastPayload,
  HighlightPayload,
  CTAPayload,
  AnimatePayload,
  BackgroundPayload,
  VisionPayload
} from './types';

// ─────────────────────────────────────────────────────────────
// Action Queue
// ─────────────────────────────────────────────────────────────

type ActionHandler = (action: SoulAction) => void;

const actionHandlers: Set<ActionHandler> = new Set();
const actionQueue: SoulAction[] = [];
let isProcessing = false;

export function onAction(handler: ActionHandler): () => void {
  actionHandlers.add(handler);
  return () => actionHandlers.delete(handler);
}

// ─────────────────────────────────────────────────────────────
// Dispatch Class
// ─────────────────────────────────────────────────────────────

export class SoulDispatch {
  private activeHighlights: Map<string, HTMLElement> = new Map();
  private originalCTAs: Map<string, string> = new Map();

  // ─── Main Dispatch ─────────────────────────────────────────

  dispatch(action: SoulAction): void {
    action.timestamp = Date.now();

    // Notify handlers
    actionHandlers.forEach((handler) => {
      try {
        handler(action);
      } catch (e) {
        console.error('[Dispatch] Handler error:', e);
      }
    });

    // Execute action
    this.execute(action);
  }

  private execute(action: SoulAction): void {
    switch (action.type) {
      case 'toast':
        this.showToast(action.payload as ToastPayload);
        break;
      case 'highlight':
        this.highlight(action.payload as HighlightPayload);
        break;
      case 'cta':
        this.updateCTA(action.payload as CTAPayload);
        break;
      case 'animate':
        this.animate(action.payload as AnimatePayload);
        break;
      case 'background':
        this.setBackground(action.payload as BackgroundPayload);
        break;
      case 'vision':
        this.setVision(action.payload as VisionPayload);
        break;
      default:
        console.log('[Dispatch] Unknown action type:', action.type);
    }
  }

  // ─── Toast Actions ─────────────────────────────────────────

  showToast(payload: ToastPayload): void {
    // Dispatch custom event for FloatingDialogue component
    const event = new CustomEvent('soul:toast', {
      detail: payload
    });
    document.dispatchEvent(event);

    console.log('[Dispatch] Toast:', payload.message);
  }

  // ─── Highlight Actions ─────────────────────────────────────

  highlight(payload: HighlightPayload): void {
    const element = document.querySelector(payload.selector) as HTMLElement;
    if (!element) {
      console.warn('[Dispatch] Highlight target not found:', payload.selector);
      return;
    }

    // Store original styles
    const originalOutline = element.style.outline;
    const originalBoxShadow = element.style.boxShadow;
    const originalTransition = element.style.transition;

    // Apply highlight style
    element.style.transition = 'all 0.3s ease';

    switch (payload.style || 'glow') {
      case 'glow':
        element.style.boxShadow = '0 0 20px rgba(150, 106, 133, 0.6)';
        break;
      case 'pulse':
        element.classList.add('soul-pulse');
        break;
      case 'border':
        element.style.outline = '2px solid var(--color-primary, #966a85)';
        break;
    }

    this.activeHighlights.set(payload.selector, element);

    // Remove highlight after duration
    setTimeout(() => {
      element.style.outline = originalOutline;
      element.style.boxShadow = originalBoxShadow;
      element.style.transition = originalTransition;
      element.classList.remove('soul-pulse');
      this.activeHighlights.delete(payload.selector);
    }, payload.duration);

    console.log('[Dispatch] Highlight:', payload.selector);
  }

  clearHighlight(selector: string): void {
    const element = this.activeHighlights.get(selector);
    if (element) {
      element.style.outline = '';
      element.style.boxShadow = '';
      element.classList.remove('soul-pulse');
      this.activeHighlights.delete(selector);
    }
  }

  // ─── CTA Actions ───────────────────────────────────────────

  updateCTA(payload: CTAPayload): void {
    const element = document.querySelector(payload.selector) as HTMLElement;
    if (!element) {
      console.warn('[Dispatch] CTA target not found:', payload.selector);
      return;
    }

    // Store original text
    if (!this.originalCTAs.has(payload.selector)) {
      this.originalCTAs.set(payload.selector, element.textContent || '');
    }

    // Update text with animation
    element.style.transition = 'opacity 0.2s ease';
    element.style.opacity = '0';

    setTimeout(() => {
      element.textContent = payload.text;
      element.style.opacity = '1';
    }, 200);

    console.log('[Dispatch] CTA updated:', payload.selector, '→', payload.text);
  }

  resetCTA(selector: string): void {
    const element = document.querySelector(selector) as HTMLElement;
    const originalText = this.originalCTAs.get(selector);

    if (element && originalText) {
      element.textContent = originalText;
      this.originalCTAs.delete(selector);
    }
  }

  // ─── Animation Actions ─────────────────────────────────────

  animate(payload: AnimatePayload): void {
    const element = document.querySelector(payload.target) as HTMLElement;
    if (!element) {
      console.warn('[Dispatch] Animation target not found:', payload.target);
      return;
    }

    switch (payload.animation) {
      case 'intensify':
        element.classList.add('soul-intensify');
        break;
      case 'calm':
        element.classList.remove('soul-intensify');
        element.classList.add('soul-calm');
        break;
      case 'attention':
        element.classList.add('soul-attention');
        setTimeout(() => element.classList.remove('soul-attention'), 1000);
        break;
    }

    console.log('[Dispatch] Animation:', payload.animation, 'on', payload.target);
  }

  // ─── Background Actions ─────────────────────────────────────

  setBackground(payload: BackgroundPayload): void {
    // Dispatch custom event for labyrinth page to handle
    const event = new CustomEvent('soul:background', {
      detail: payload
    });
    document.dispatchEvent(event);

    console.log('[Dispatch] Background:', payload.image, payload.opacity ? `@ ${payload.opacity}` : '');
  }

  // ─── Vision Actions ─────────────────────────────────────────

  setVision(payload: VisionPayload): void {
    // Dispatch custom event for labyrinth page to handle
    const event = new CustomEvent('soul:vision', {
      detail: payload
    });
    document.dispatchEvent(event);

    console.log('[Dispatch] Vision:', payload.displayMode, payload.prompt?.slice(0, 50) + '...');
  }

  /**
   * Convenience method for triggering vision display
   */
  vision(dataUrl: string, prompt: string, displayMode: VisionPayload['displayMode'] = 'background', duration = 30000): void {
    this.dispatch({
      type: 'vision',
      payload: { dataUrl, prompt, displayMode, duration }
    });
  }

  // ─── Convenience Methods ───────────────────────────────────

  toast(message: string, duration = 4000, type: ToastPayload['type'] = 'info'): void {
    this.dispatch({
      type: 'toast',
      payload: { message, duration, type }
    });
  }

  welcomeBack(lastProject?: string): void {
    let message = 'Welcome back to the labyrinth...';
    if (lastProject) {
      message = `Welcome back. Last time you were exploring ${lastProject}.`;
    }
    this.toast(message, 5000, 'welcome');
  }

  suggestContent(content: string, reason?: string): void {
    let message = `You might enjoy: ${content}`;
    if (reason) {
      message = `${reason} ${content}`;
    }
    this.toast(message, 6000, 'hint');
  }

  highlightCTA(selector = '.cta-button, .contact-link'): void {
    this.highlight({
      selector,
      duration: 3000,
      style: 'glow'
    });
  }

  // ─── Cleanup ───────────────────────────────────────────────

  cleanup(): void {
    // Clear all highlights
    this.activeHighlights.forEach((element, selector) => {
      this.clearHighlight(selector);
    });

    // Reset all CTAs
    this.originalCTAs.forEach((_, selector) => {
      this.resetCTA(selector);
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────

let dispatchInstance: SoulDispatch | null = null;

export function getSoulDispatch(): SoulDispatch {
  if (!dispatchInstance) {
    dispatchInstance = new SoulDispatch();
  }
  return dispatchInstance;
}

export function resetSoulDispatch(): void {
  if (dispatchInstance) {
    dispatchInstance.cleanup();
    dispatchInstance = null;
  }
}
