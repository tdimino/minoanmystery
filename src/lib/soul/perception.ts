/**
 * Soul Perception Layer
 *
 * Captures and normalizes user behavior events.
 * Debounces high-frequency events (scroll, hover) for performance.
 */

import type { PerceptionEvent, SoulConfig } from './types';
import { DEFAULT_CONFIG } from './types';
import { getSoulMemory } from './memory';

// ─────────────────────────────────────────────────────────────
// Debounce Utility
// ─────────────────────────────────────────────────────────────

function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  }) as T;
}

// ─────────────────────────────────────────────────────────────
// Perception Event Dispatcher
// ─────────────────────────────────────────────────────────────

type PerceptionHandler = (event: PerceptionEvent) => void;

const handlers: Set<PerceptionHandler> = new Set();

export function onPerception(handler: PerceptionHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

function dispatch(event: PerceptionEvent): void {
  handlers.forEach((handler) => {
    try {
      handler(event);
    } catch (e) {
      console.error('[Perception] Handler error:', e);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// Scroll Depth Calculator
// ─────────────────────────────────────────────────────────────

function getScrollDepth(): number {
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;
  const scrollTop = window.scrollY;

  if (documentHeight <= windowHeight) {
    return 100; // Page fits in viewport
  }

  const scrollableHeight = documentHeight - windowHeight;
  return Math.round((scrollTop / scrollableHeight) * 100);
}

// ─────────────────────────────────────────────────────────────
// Perception Manager Class
// ─────────────────────────────────────────────────────────────

export class PerceptionManager {
  private config: SoulConfig;
  private listeners: Array<() => void> = [];
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private lastScrollY = 0;
  private hoverTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private isInitialized = false;

  constructor(config: Partial<SoulConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─── Lifecycle ─────────────────────────────────────────────

  init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;

    this.setupScrollListener();
    this.setupClickListener();
    this.setupHoverListener();
    this.setupIdleDetection();
    this.setupNavigationListener();
    this.setupVisibilityListener();

    // Record initial page view
    const memory = getSoulMemory();
    memory.recordPageView(window.location.pathname);

    this.isInitialized = true;
    console.log('[Perception] Initialized');
  }

  destroy(): void {
    this.listeners.forEach((cleanup) => cleanup());
    this.listeners = [];

    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    this.hoverTimers.forEach((timer) => clearTimeout(timer));
    this.hoverTimers.clear();

    this.isInitialized = false;
  }

  // ─── Scroll Perception ─────────────────────────────────────

  private setupScrollListener(): void {
    const memory = getSoulMemory();

    const handleScroll = debounce(() => {
      const depth = getScrollDepth();
      const currentScrollY = window.scrollY;
      const direction = currentScrollY > this.lastScrollY ? 'down' : 'up';
      const velocity = Math.abs(currentScrollY - this.lastScrollY);

      this.lastScrollY = currentScrollY;

      // Update memory
      memory.recordScrollDepth(window.location.pathname, depth);

      // Dispatch event
      dispatch({
        type: 'scroll',
        timestamp: Date.now(),
        metadata: {
          depth,
          direction,
          velocity,
          page: window.location.pathname
        }
      });

      // Reset idle timer
      this.resetIdleTimer();
    }, this.config.scrollDebounceMs);

    window.addEventListener('scroll', handleScroll, { passive: true });
    this.listeners.push(() => window.removeEventListener('scroll', handleScroll));
  }

  // ─── Click Perception ──────────────────────────────────────

  private setupClickListener(): void {
    const memory = getSoulMemory();

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Determine element type
      const isLink = target.tagName === 'A' || target.closest('a');
      const isButton = target.tagName === 'BUTTON' || target.closest('button');
      const isImage = target.tagName === 'IMG';

      let elementType: 'link' | 'button' | 'image' | 'other' = 'other';
      if (isLink) elementType = 'link';
      else if (isButton) elementType = 'button';
      else if (isImage) elementType = 'image';

      // Get identifier
      const elementId = target.id ||
        target.getAttribute('data-soul-id') ||
        target.closest('[id]')?.id ||
        target.className.split(' ')[0] ||
        target.tagName.toLowerCase();

      // Get href if link
      const linkEl = target.tagName === 'A' ? target : target.closest('a');
      const href = linkEl?.getAttribute('href') || undefined;

      // Update memory
      memory.recordClick(elementId);

      // Dispatch event
      dispatch({
        type: 'click',
        target: elementId,
        timestamp: Date.now(),
        metadata: {
          element: elementId,
          elementType,
          href,
          page: window.location.pathname
        }
      });

      // Reset idle timer
      this.resetIdleTimer();
    };

    document.addEventListener('click', handleClick);
    this.listeners.push(() => document.removeEventListener('click', handleClick));
  }

  // ─── Hover Perception ──────────────────────────────────────

  private setupHoverListener(): void {
    // Track hover on specific elements (links, buttons, images)
    const trackableSelectors = 'a, button, [data-soul-track]';

    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.matches(trackableSelectors)) return;

      const elementId = target.id ||
        target.getAttribute('data-soul-id') ||
        target.getAttribute('href') ||
        target.textContent?.slice(0, 20) ||
        'unknown';

      const startTime = Date.now();

      // Set timer for dwell detection
      const timer = setTimeout(() => {
        const dwellTime = Date.now() - startTime;

        dispatch({
          type: 'hover',
          target: elementId,
          timestamp: Date.now(),
          metadata: {
            element: elementId,
            dwellTime,
            page: window.location.pathname
          }
        });

        this.hoverTimers.delete(elementId);
      }, 1000); // 1 second dwell threshold

      this.hoverTimers.set(elementId, timer);
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.matches(trackableSelectors)) return;

      const elementId = target.id ||
        target.getAttribute('data-soul-id') ||
        target.getAttribute('href') ||
        target.textContent?.slice(0, 20) ||
        'unknown';

      const timer = this.hoverTimers.get(elementId);
      if (timer) {
        clearTimeout(timer);
        this.hoverTimers.delete(elementId);
      }
    };

    document.addEventListener('mouseenter', handleMouseEnter, true);
    document.addEventListener('mouseleave', handleMouseLeave, true);

    this.listeners.push(() => {
      document.removeEventListener('mouseenter', handleMouseEnter, true);
      document.removeEventListener('mouseleave', handleMouseLeave, true);
    });
  }

  // ─── Idle Detection ────────────────────────────────────────

  private setupIdleDetection(): void {
    this.resetIdleTimer();

    // Reset on any interaction
    const resetOnInteraction = () => {
      getSoulMemory().recordInteraction();
      this.resetIdleTimer();
    };

    const events = ['keydown', 'mousemove', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, resetOnInteraction, { passive: true });
      this.listeners.push(() => window.removeEventListener(event, resetOnInteraction));
    });
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    this.idleTimer = setTimeout(() => {
      const memory = getSoulMemory();
      memory.recordIdle(this.config.idleThresholdMs);

      dispatch({
        type: 'idle',
        timestamp: Date.now(),
        metadata: {
          duration: this.config.idleThresholdMs,
          page: window.location.pathname
        }
      });
    }, this.config.idleThresholdMs);
  }

  // ─── Navigation Perception ─────────────────────────────────

  private setupNavigationListener(): void {
    // Astro View Transitions
    document.addEventListener('astro:after-swap', () => {
      const memory = getSoulMemory();
      const newPage = window.location.pathname;

      dispatch({
        type: 'navigation',
        timestamp: Date.now(),
        metadata: {
          from: memory.get().currentPage,
          to: newPage,
          method: 'link'
        }
      });

      memory.recordPageView(newPage);
    });

    // Browser back/forward
    window.addEventListener('popstate', () => {
      const memory = getSoulMemory();
      const newPage = window.location.pathname;

      dispatch({
        type: 'navigation',
        timestamp: Date.now(),
        metadata: {
          from: memory.get().currentPage,
          to: newPage,
          method: 'browser'
        }
      });

      memory.recordPageView(newPage);
    });
  }

  // ─── Visibility Perception ─────────────────────────────────

  private setupVisibilityListener(): void {
    const handleVisibilityChange = () => {
      const memory = getSoulMemory();

      if (document.visibilityState === 'hidden') {
        dispatch({
          type: 'blur',
          timestamp: Date.now(),
          metadata: { page: window.location.pathname }
        });
      } else {
        dispatch({
          type: 'focus',
          timestamp: Date.now(),
          metadata: { page: window.location.pathname }
        });
        memory.recordInteraction();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    this.listeners.push(() => document.removeEventListener('visibilitychange', handleVisibilityChange));
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────

let perceptionInstance: PerceptionManager | null = null;

export function getPerceptionManager(config?: Partial<SoulConfig>): PerceptionManager {
  if (!perceptionInstance) {
    perceptionInstance = new PerceptionManager(config);
  }
  return perceptionInstance;
}

export function resetPerceptionManager(): void {
  if (perceptionInstance) {
    perceptionInstance.destroy();
    perceptionInstance = null;
  }
}
