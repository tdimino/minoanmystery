/**
 * Response Formatter
 *
 * Handles truncation of LLM responses and generation of "Read more" links.
 * Formats responses for FloatingDialogue display.
 */

import type { ToastPayload } from './types';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface FormattedResponse {
  /** Truncated text for display (~100 chars) */
  displayText: string;
  /** Full original text */
  fullText: string;
  /** Whether the response was truncated */
  hasMore: boolean;
  /** Link to full conversation (if truncated) */
  labyrinthLink?: string;
  /** Message ID for deep linking */
  messageId?: string;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const DEFAULT_MAX_LENGTH = 120;
const ELLIPSIS = '...';
const LABYRINTH_PATH = '/labyrinth';

/**
 * Escape HTML entities to prevent XSS
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─────────────────────────────────────────────────────────────
// Functions
// ─────────────────────────────────────────────────────────────

/**
 * Format a chat response for display in FloatingDialogue
 * Truncates at word boundary and adds "Read more" link
 */
export function formatChatResponse(
  response: string,
  options: {
    maxLength?: number;
    messageId?: string;
  } = {}
): FormattedResponse {
  const { maxLength = DEFAULT_MAX_LENGTH, messageId } = options;

  // Clean up the response
  const cleaned = response.trim();

  // No truncation needed
  if (cleaned.length <= maxLength) {
    return {
      displayText: cleaned,
      fullText: cleaned,
      hasMore: false,
      messageId
    };
  }

  // Find word boundary for truncation
  const truncated = truncateAtWordBoundary(cleaned, maxLength);
  const labyrinthLink = messageId
    ? `${LABYRINTH_PATH}?msg=${messageId}`
    : LABYRINTH_PATH;

  return {
    displayText: truncated + ELLIPSIS,
    fullText: cleaned,
    hasMore: true,
    labyrinthLink,
    messageId
  };
}

/**
 * Truncate text at word boundary
 */
function truncateAtWordBoundary(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Find the last space before maxLength
  const lastSpace = text.lastIndexOf(' ', maxLength);

  // If no space found, just cut at maxLength
  if (lastSpace === -1) {
    return text.slice(0, maxLength);
  }

  // Cut at word boundary
  return text.slice(0, lastSpace);
}

/**
 * Create a toast payload from a formatted response
 */
export function createToastPayload(
  formatted: FormattedResponse,
  type: ToastPayload['type'] = 'info'
): ToastPayload {
  // Escape HTML entities in display text to prevent XSS
  let message = escapeHtml(formatted.displayText);

  // Add "Read more" link if truncated
  if (formatted.hasMore && formatted.labyrinthLink) {
    // Link is safe - we control the URL format
    message += ` <a href="${formatted.labyrinthLink}" class="soul-read-more">Read more &rarr;</a>`;
  }

  return {
    message: formatted.hasMore ? sanitizeResponseHtml(message) : message,
    duration: formatted.hasMore ? 8000 : 5000, // Longer duration for truncated
    type,
    hasHtml: formatted.hasMore // Flag for FloatingDialogue to use innerHTML
  };
}

/**
 * Format an error response
 */
export function formatErrorResponse(error?: string): FormattedResponse {
  const message = error || "The Oracle's connection wavers. Try again in a moment.";
  return {
    displayText: message,
    fullText: message,
    hasMore: false
  };
}

/**
 * Create loading toast payload
 */
export function createLoadingPayload(): ToastPayload {
  return {
    message: 'Consulting the depths...',
    duration: 0, // Won't auto-hide
    type: 'info'
  };
}

/**
 * Sanitize HTML in response (basic XSS prevention)
 * Only allows safe tags: a, strong, em, code
 */
export function sanitizeResponseHtml(html: string): string {
  // Remove script tags and event handlers
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');

  // Only allow specific tags
  const allowedTags = ['a', 'strong', 'em', 'code', 'b', 'i'];
  const tagPattern = /<\/?([a-z]+)[^>]*>/gi;

  sanitized = sanitized.replace(tagPattern, (match, tag) => {
    if (allowedTags.includes(tag.toLowerCase())) {
      // For <a> tags, only keep href and ensure it's safe
      if (tag.toLowerCase() === 'a') {
        const hrefMatch = match.match(/href="([^"]*)"/i);
        if (hrefMatch) {
          const href = hrefMatch[1];
          // Only allow relative URLs or https
          if (href.startsWith('/') || href.startsWith('https://')) {
            return match.includes('</') ? '</a>' : `<a href="${href}" target="_blank" rel="noopener noreferrer">`;
          }
        }
        return ''; // Remove unsafe links
      }
      return match;
    }
    return ''; // Remove disallowed tags
  });

  return sanitized;
}

/**
 * Format markdown-style text for display
 * Converts **bold**, *italic*, and `code` to HTML
 * Escapes HTML in content to prevent XSS
 */
export function formatMarkdown(text: string): string {
  // First escape all HTML entities
  const escaped = escapeHtml(text);

  return escaped
    // Bold: **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic: *text* or _text_
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Code: `text`
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Links: [text](url) - URL was already escaped, so unescape for validation
    .replace(/\[(.+?)\]\((.+?)\)/g, (_, linkText, escapedUrl) => {
      // Unescape URL for validation (it was escaped above)
      const url = escapedUrl
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
      if (url.startsWith('/') || url.startsWith('https://')) {
        // Re-escape URL for safe attribute insertion
        const safeUrl = url.replace(/"/g, '&quot;');
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
      }
      return linkText; // Just return text for unsafe URLs
    });
}
