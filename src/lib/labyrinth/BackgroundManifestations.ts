/**
 * BackgroundManifestations - Handles ambient background effects in the Labyrinth
 * Extracted from labyrinth.astro for modularity
 *
 * Supports:
 * - Divine feminine (goddess) background with purple/rose gradient
 * - AI-generated vision backgrounds from Kothar
 * - Auto-fade timeouts for both background types
 */

import type { GoddessBackgroundPayload, VisionBackgroundPayload } from './types';

// ─────────────────────────────────────────────────────────────
//   Configuration
// ─────────────────────────────────────────────────────────────

export interface BackgroundManifestationsConfig {
  goddessElement: HTMLElement;
  visionElement: HTMLElement;
  defaultDuration?: number;  // Default auto-hide duration in ms
}

// ─────────────────────────────────────────────────────────────
//   BackgroundManifestations Class
// ─────────────────────────────────────────────────────────────

export class BackgroundManifestations {
  private goddessElement: HTMLElement;
  private visionElement: HTMLElement;
  private defaultDuration: number;

  // Timeout handles for auto-hide
  private goddessTimeout: ReturnType<typeof setTimeout> | null = null;
  private visionTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(config: BackgroundManifestationsConfig) {
    this.goddessElement = config.goddessElement;
    this.visionElement = config.visionElement;
    this.defaultDuration = config.defaultDuration ?? 30000;
  }

  /**
   * Handle divine feminine background manifestation
   * Triggered when goddess-related topics are invoked in conversation
   */
  public handleGoddess(payload: GoddessBackgroundPayload): void {
    if (!this.goddessElement) return;

    if (payload.image === 'goddess') {
      // Clear any existing timeout
      if (this.goddessTimeout) {
        clearTimeout(this.goddessTimeout);
        this.goddessTimeout = null;
      }

      // Manifest the goddess
      this.goddessElement.classList.add('active');

      // Set custom opacity if provided
      if (payload.opacity) {
        const beforeEl = this.goddessElement.querySelector('::before') as HTMLElement;
        if (beforeEl) {
          beforeEl.style.opacity = String(payload.opacity);
        }
      }

      console.log('[BackgroundManifestations] Divine feminine manifested');

      // Auto-hide after duration
      const duration = payload.duration ?? this.defaultDuration;
      if (duration > 0) {
        this.goddessTimeout = setTimeout(() => {
          this.goddessElement.classList.remove('active');
          console.log('[BackgroundManifestations] Divine feminine faded');
        }, duration);
      }
    } else {
      // Hide the goddess
      this.goddessElement.classList.remove('active');
      if (this.goddessTimeout) {
        clearTimeout(this.goddessTimeout);
        this.goddessTimeout = null;
      }
    }
  }

  /**
   * Handle AI-generated vision background manifestation
   * Triggered when Kothar generates images during conversation
   */
  public handleVision(payload: VisionBackgroundPayload): void {
    if (!this.visionElement) return;

    // Clear any existing timeout
    if (this.visionTimeout) {
      clearTimeout(this.visionTimeout);
      this.visionTimeout = null;
    }

    if (payload.dataUrl && payload.displayMode !== 'none') {
      // Set the background image via CSS custom property
      this.visionElement.style.setProperty('--vision-image', `url(${payload.dataUrl})`);

      // Create or update the image layer element
      let imageLayer = this.visionElement.querySelector('.vision-image-layer') as HTMLElement;
      if (!imageLayer) {
        imageLayer = document.createElement('div');
        imageLayer.className = 'vision-image-layer';
        imageLayer.style.cssText = `
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          opacity: 0.15;
          filter: sepia(0.2) saturate(0.9);
          animation: vision-breathe 15s ease-in-out infinite;
        `;
        this.visionElement.insertBefore(imageLayer, this.visionElement.firstChild);
      }
      imageLayer.style.backgroundImage = `url(${payload.dataUrl})`;

      // Manifest the vision
      this.visionElement.classList.add('active');

      console.log('[BackgroundManifestations] Vision manifested:', payload.prompt?.slice(0, 50) + '...');

      // Auto-hide after duration
      const duration = payload.duration ?? this.defaultDuration;
      if (duration > 0) {
        this.visionTimeout = setTimeout(() => {
          this.visionElement.classList.remove('active');
          console.log('[BackgroundManifestations] Vision faded');
        }, duration);
      }
    } else {
      // Hide the vision
      this.visionElement.classList.remove('active');
    }
  }

  /**
   * Hide both backgrounds immediately
   */
  public hideAll(): void {
    this.goddessElement?.classList.remove('active');
    this.visionElement?.classList.remove('active');

    if (this.goddessTimeout) {
      clearTimeout(this.goddessTimeout);
      this.goddessTimeout = null;
    }
    if (this.visionTimeout) {
      clearTimeout(this.visionTimeout);
      this.visionTimeout = null;
    }
  }

  /**
   * Cleanup method for navigation/unmount
   */
  public destroy(): void {
    this.hideAll();
    console.log('[BackgroundManifestations] Destroyed');
  }
}
