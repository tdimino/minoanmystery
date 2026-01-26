/**
 * Shared type definitions for Labyrinth modules
 * Extracted from labyrinth.astro for modularity
 */

// ─────────────────────────────────────────────────────────────
//   Image Attachment Types
// ─────────────────────────────────────────────────────────────

export interface ImageAttachment {
  dataUrl: string;
  mimeType: string;
  sizeBytes: number;
}

// ─────────────────────────────────────────────────────────────
//   Background Manifestation Types
// ─────────────────────────────────────────────────────────────

export interface GoddessBackgroundPayload {
  image: string;
  opacity?: number;
  duration?: number;
}

export interface VisionBackgroundPayload {
  dataUrl: string;
  prompt?: string;
  displayMode?: string;
  duration?: number;
}

// ─────────────────────────────────────────────────────────────
//   Chat Message Types
// ─────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  page?: string;
  image?: ImageAttachment;
}

export interface ConversationThread {
  messages: ChatMessage[];
  lastUpdated: number;
  schemaVersion: number;
}
