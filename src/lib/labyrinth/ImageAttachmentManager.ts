/**
 * ImageAttachmentManager - Handles image attachments in the Labyrinth chat
 * Extracted from labyrinth.astro for modularity
 *
 * Supports:
 * - Clipboard paste handling
 * - File input selection
 * - Image validation (type, size)
 * - Base64 conversion
 * - Preview display
 * - Lightbox viewing
 */

import type { ImageAttachment } from './types';

// ─────────────────────────────────────────────────────────────
//   Configuration
// ─────────────────────────────────────────────────────────────

// Max image size: 5MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const VALID_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export interface ImageAttachmentManagerConfig {
  fileInput: HTMLInputElement;
  attachButton: HTMLButtonElement;
  previewContainer: HTMLElement;
  thumbnailElement: HTMLImageElement;
  dismissButton: HTMLButtonElement;
  onToast?: (message: string) => void;
  onAttach?: (attachment: ImageAttachment) => void;
  onClear?: () => void;
}

// ─────────────────────────────────────────────────────────────
//   ImageAttachmentManager Class
// ─────────────────────────────────────────────────────────────

export class ImageAttachmentManager {
  private fileInput: HTMLInputElement;
  private attachButton: HTMLButtonElement;
  private previewContainer: HTMLElement;
  private thumbnailElement: HTMLImageElement;
  private dismissButton: HTMLButtonElement;
  private onToast?: (message: string) => void;
  private onAttach?: (attachment: ImageAttachment) => void;
  private onClear?: () => void;

  // Current pending attachment
  private pendingImage: ImageAttachment | null = null;

  // Bound event handlers for cleanup
  private boundHandleFileSelect: () => void;
  private boundOpenFileDialog: () => void;
  private boundClear: () => void;

  constructor(config: ImageAttachmentManagerConfig) {
    this.fileInput = config.fileInput;
    this.attachButton = config.attachButton;
    this.previewContainer = config.previewContainer;
    this.thumbnailElement = config.thumbnailElement;
    this.dismissButton = config.dismissButton;
    this.onToast = config.onToast;
    this.onAttach = config.onAttach;
    this.onClear = config.onClear;

    this.setupEventListeners();
  }

  /**
   * Set up event listeners for file input and buttons
   */
  private setupEventListeners(): void {
    // Store bound handlers for cleanup in destroy()
    this.boundHandleFileSelect = () => this.handleFileSelect();
    this.boundOpenFileDialog = () => this.fileInput.click();
    this.boundClear = () => this.clear();

    // File input change handler
    this.fileInput.addEventListener('change', this.boundHandleFileSelect);

    // Attach button click handler
    this.attachButton.addEventListener('click', this.boundOpenFileDialog);

    // Dismiss button handler
    this.dismissButton.addEventListener('click', this.boundClear);
  }

  /**
   * Handle paste event - call this from the input element's paste handler
   */
  public handlePaste(e: ClipboardEvent): boolean {
    const items = e.clipboardData?.items;
    if (!items) return false;

    // Use Array.from() since DataTransferItemList is not directly iterable
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          this.processFile(file);
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Handle file selection from input
   */
  private handleFileSelect(): void {
    const file = this.fileInput.files?.[0];
    if (file) {
      this.processFile(file);
    }
    // Reset input so same file can be selected again
    this.fileInput.value = '';
  }

  /**
   * Process image file - validate, convert to base64, show preview
   */
  private processFile(file: File): void {
    // Validate size
    if (file.size > MAX_IMAGE_SIZE) {
      this.onToast?.('Image too large (max 5MB)');
      return;
    }

    // Validate type
    if (!VALID_MIME_TYPES.includes(file.type)) {
      this.onToast?.('Only PNG, JPEG, and WebP images are supported');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        this.pendingImage = {
          dataUrl,
          mimeType: file.type,
          sizeBytes: file.size,
        };
        this.showPreview(dataUrl);
        this.onAttach?.(this.pendingImage);
        console.log('[ImageAttachmentManager] Image attached:', file.name, `(${Math.round(file.size / 1024)}KB)`);
      }
    };
    reader.onerror = () => {
      this.onToast?.('Failed to read image');
    };
    reader.readAsDataURL(file);
  }

  /**
   * Show attachment preview bar with thumbnail
   */
  private showPreview(dataUrl: string): void {
    this.thumbnailElement.src = dataUrl;
    this.previewContainer.style.display = 'flex';
  }

  /**
   * Clear pending image and hide preview
   */
  public clear(): void {
    this.pendingImage = null;
    this.previewContainer.style.display = 'none';
    this.thumbnailElement.src = '';
    this.onClear?.();
  }

  /**
   * Get the current pending image (and optionally clear it)
   */
  public getPendingImage(andClear = false): ImageAttachment | null {
    const image = this.pendingImage;
    if (andClear) {
      this.clear();
    }
    return image;
  }

  /**
   * Check if there's a pending image
   */
  public hasPendingImage(): boolean {
    return this.pendingImage !== null;
  }

  /**
   * Validate that a string is a safe image data URL
   */
  public static isValidImageDataUrl(url: string): boolean {
    // Strict regex: only allow png/jpeg/webp base64 data URLs
    const dataUrlRegex = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;
    return dataUrlRegex.test(url);
  }

  /**
   * Open image in lightbox
   */
  public static openLightbox(imageUrl: string): void {
    // Validate the URL before using it
    if (!ImageAttachmentManager.isValidImageDataUrl(imageUrl)) {
      console.warn('[ImageAttachmentManager] Invalid image URL rejected');
      return;
    }

    const lightbox = document.createElement('div');
    lightbox.className = 'image-lightbox';

    // Use DOM API instead of innerHTML to prevent XSS
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = 'Full size image';
    lightbox.appendChild(img);

    lightbox.addEventListener('click', () => {
      lightbox.remove();
    });
    document.body.appendChild(lightbox);
  }

  /**
   * Set enabled state (for loading states)
   */
  public setEnabled(enabled: boolean): void {
    this.attachButton.disabled = !enabled;
  }

  /**
   * Cleanup method for navigation/unmount
   * Removes event listeners to prevent memory leaks
   */
  public destroy(): void {
    this.fileInput.removeEventListener('change', this.boundHandleFileSelect);
    this.attachButton.removeEventListener('click', this.boundOpenFileDialog);
    this.dismissButton.removeEventListener('click', this.boundClear);
    this.clear();
    console.log('[ImageAttachmentManager] Destroyed');
  }
}
