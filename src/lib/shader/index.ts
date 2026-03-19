/**
 * ShaderManager — Lifecycle management for WebGL shader iframes.
 *
 * Handles: iframe creation/destruction, viewport-based pause/resume,
 * idle timeout, View Transition cleanup, reduced-motion, mobile detection,
 * and theme-aware opacity.
 *
 * Follows the LabyrinthChat pattern: utility module in lib/, thin script in .astro.
 */

export interface ShaderOptions {
  /** Path to shader HTML file (e.g., "/shaders/gilded-fracture.html") */
  src: string;
  /** Opacity in light theme (0-1) */
  opacityLight?: number;
  /** Opacity in dark theme (0-1) */
  opacityDark?: number;
  /** CSS fallback gradient when WebGL unavailable */
  fallbackGradient?: string;
  /** Pixel scale param passed to shader (0.5 = half resolution) */
  pixelScale?: number;
  /** Seconds of inactivity before pausing shader (0 = never) */
  idleTimeout?: number;
}

const MOBILE_BREAKPOINT = 768;
const DEFAULT_IDLE_TIMEOUT = 60;

export class ShaderManager {
  private container: HTMLElement;
  private iframe: HTMLIFrameElement | null = null;
  private observer: IntersectionObserver | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private isVisible = false;
  private isPaused = false;
  private options: Required<ShaderOptions>;
  private boundHandlers: {
    beforeSwap: () => void;
    themeChange: MutationCallback;
    interaction: () => void;
  };
  private themeObserver: MutationObserver | null = null;

  constructor(container: HTMLElement, options: ShaderOptions) {
    this.container = container;
    this.options = {
      src: options.src,
      opacityLight: options.opacityLight ?? 0.12,
      opacityDark: options.opacityDark ?? 0.20,
      fallbackGradient: options.fallbackGradient ?? 'none',
      pixelScale: options.pixelScale ?? 1,
      idleTimeout: options.idleTimeout ?? DEFAULT_IDLE_TIMEOUT,
    };

    this.boundHandlers = {
      beforeSwap: this.handleBeforeSwap.bind(this),
      themeChange: this.handleThemeChange.bind(this),
      interaction: this.resetIdleTimer.bind(this),
    };
  }

  /** Initialize the shader. Call once after DOM is ready. */
  init(): void {
    // Gate: skip on mobile
    if (window.innerWidth < MOBILE_BREAKPOINT) {
      this.showFallback();
      return;
    }

    // Gate: skip if prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.showFallback();
      return;
    }

    // Create iframe after idle (defer past LCP)
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => this.createIframe());
    } else {
      setTimeout(() => this.createIframe(), 200);
    }

    // Lifecycle listeners
    document.addEventListener('astro:before-swap', this.boundHandlers.beforeSwap);

    // Theme observer
    this.themeObserver = new MutationObserver(this.boundHandlers.themeChange);
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    // Idle timeout listeners
    if (this.options.idleTimeout > 0) {
      for (const event of ['scroll', 'mousemove', 'touchstart', 'keydown'] as const) {
        document.addEventListener(event, this.boundHandlers.interaction, { passive: true });
      }
      this.resetIdleTimer();
    }
  }

  /** Tear down everything. Safe to call multiple times. */
  destroy(): void {
    this.destroyIframe();
    this.observer?.disconnect();
    this.observer = null;
    this.themeObserver?.disconnect();
    this.themeObserver = null;

    if (this.idleTimer) clearTimeout(this.idleTimer);

    document.removeEventListener('astro:before-swap', this.boundHandlers.beforeSwap);
    for (const event of ['scroll', 'mousemove', 'touchstart', 'keydown'] as const) {
      document.removeEventListener(event, this.boundHandlers.interaction);
    }
  }

  private postMessage(data: Record<string, unknown>): void {
    this.iframe?.contentWindow?.postMessage(data, '*');
  }

  private setOpacity(value: number): void {
    if (this.iframe) {
      this.iframe.style.opacity = String(value);
    }
  }

  // ── Private ───────────────────────────────────────────────

  private createIframe(): void {
    if (this.iframe) return; // Guard double-init

    const iframe = document.createElement('iframe');
    const params = new URLSearchParams();
    if (this.options.pixelScale !== 1) {
      params.set('p', String(this.options.pixelScale));
    }
    const paramStr = params.toString();
    iframe.src = this.options.src + (paramStr ? `?${paramStr}` : '');
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('title', 'Decorative animated background');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('tabindex', '-1');

    // Apply current theme opacity
    const theme = document.documentElement.getAttribute('data-theme');
    const opacity = theme === 'dark' ? this.options.opacityDark : this.options.opacityLight;
    iframe.style.opacity = String(opacity);
    iframe.style.transition = 'opacity 1.5s cubic-bezier(0.4, 0, 0.2, 1)';

    this.iframe = iframe;
    this.container.appendChild(iframe);

    // Hide .label div after iframe loads (same-origin access)
    iframe.addEventListener('load', () => {
      try {
        const label = iframe.contentDocument?.querySelector('.label');
        if (label instanceof HTMLElement) {
          label.style.display = 'none';
        }
      } catch {
        // Cross-origin or blocked — ignore
      }
    }, { once: true });

    // Set up viewport observer (persistent, not one-shot)
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          this.isVisible = entry.isIntersecting;
          if (entry.isIntersecting && this.isPaused) {
            this.resume();
          } else if (!entry.isIntersecting && !this.isPaused) {
            this.pause();
          }
        }
      },
      { threshold: 0.01 },
    );
    this.observer.observe(this.container);
  }

  private destroyIframe(): void {
    if (!this.iframe) return;

    // Tell shader to release GL context
    this.postMessage({ type: 'destroy' });

    // Clear src to stop any pending loads
    this.iframe.src = 'about:blank';
    this.iframe.remove();
    this.iframe = null;
  }

  private pause(): void {
    this.isPaused = true;
    this.postMessage({ type: 'pause' });
  }

  private resume(): void {
    this.isPaused = false;
    this.postMessage({ type: 'resume' });
  }

  private showFallback(): void {
    this.container.style.background = this.options.fallbackGradient;
  }

  private handleBeforeSwap(): void {
    this.destroy();
  }



  private handleThemeChange(): void {
    const theme = document.documentElement.getAttribute('data-theme');
    const opacity = theme === 'dark' ? this.options.opacityDark : this.options.opacityLight;
    this.setOpacity(opacity);
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.isPaused && this.isVisible) {
      this.resume();
    }
    this.idleTimer = setTimeout(() => {
      if (this.isVisible && !this.isPaused) {
        this.pause();
      }
    }, this.options.idleTimeout * 1000);
  }
}

/**
 * Global initialization function. Called by ShaderBackground.astro's script.
 * Finds all shader containers and creates managers for each.
 */
const managers: ShaderManager[] = [];

// FPS telemetry listener — dev-only, shaders post { type: 'shader-fps', shader, fps, resolution }
let fpsListenerAttached = false;
function attachFpsListener(): void {
  if (fpsListenerAttached || !import.meta.env.DEV) return;
  fpsListenerAttached = true;
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'shader-fps') {
      const { shader, fps, resolution } = e.data;
      const status = fps >= 55 ? '✓' : fps >= 30 ? '⚠' : '✗';
      console.log(
        `%c[Shader] %c${shader} %c${fps} fps %c${resolution} ${status}`,
        'color: #d4a843; font-weight: bold',
        'color: #966a85',
        fps >= 55 ? 'color: #6ee7b7' : fps >= 30 ? 'color: #fbbf24' : 'color: #fca5a5; font-weight: bold',
        'color: #888',
      );
    }
  });
}

export function initShaderBackgrounds(): void {
  attachFpsListener();

  // Clean up any previous managers (View Transition re-init)
  for (const m of managers) {
    m.destroy();
  }
  managers.length = 0;

  document.querySelectorAll<HTMLElement>('[data-shader-src]').forEach((container) => {
    const src = container.dataset.shaderSrc;
    if (!src) return;

    const manager = new ShaderManager(container, {
      src,
      opacityLight: parseFloat(container.dataset.shaderOpacityLight || '0.12'),
      opacityDark: parseFloat(container.dataset.shaderOpacityDark || '0.20'),
      fallbackGradient: container.dataset.shaderFallback || undefined,
      pixelScale: parseFloat(container.dataset.shaderPixelScale || '1'),
      idleTimeout: parseFloat(container.dataset.shaderIdleTimeout || '60'),
    });
    manager.init();
    managers.push(manager);
  });
}

