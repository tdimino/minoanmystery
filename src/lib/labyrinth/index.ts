/**
 * Labyrinth Module Barrel Export
 * Provides clean imports for all labyrinth-related modules
 *
 * Usage:
 *   import { LabyrinthChat, TarotRenderer, BackgroundManifestations } from '../lib/labyrinth';
 *   import type { ChatMessage, ImageAttachment } from '../lib/labyrinth';
 */

// Main chat orchestration
export { LabyrinthChat } from './LabyrinthChat';
export type { LabyrinthChatConfig } from './LabyrinthChat';

// Tarot card rendering
export { TarotRenderer } from './TarotRenderer';
export type {
  TarotRendererConfig,
  TarotPlaceholderPayload,
  TarotCardPayload,
  TarotCompletePayload,
  TarotInlinePayload,
} from './TarotRenderer';

// Background effects
export { BackgroundManifestations } from './BackgroundManifestations';
export type { BackgroundManifestationsConfig } from './BackgroundManifestations';

// Image attachment handling
export { ImageAttachmentManager } from './ImageAttachmentManager';
export type { ImageAttachmentManagerConfig } from './ImageAttachmentManager';

// Shared types
export type {
  ImageAttachment,
  ChatMessage,
  ConversationThread,
  GoddessBackgroundPayload,
  VisionBackgroundPayload,
} from './types';

// Event system (Open Souls perception pattern)
export {
  dispatch,
  listen,
  listenMany,
  once,
  isLabyrinthEvent,
  WINDOW_EVENTS,
} from './events';
export type {
  LabyrinthEventMap,
  VoiceTranscriptPayload,
  ArchivePayload,
  ImageAnalysisPayload,
  SoulModePayload,
  RegisterOptionsPayload,
  ToastPayload,
  VisitorModelUpdatedPayload,
  StreamStartPayload,
  StreamChunkPayload,
  StreamDonePayload,
  StreamErrorPayload,
} from './events';

// User extraction utilities (shared between browser and server)
export {
  extractNameHeuristic,
  extractTitleHeuristic,
  NAME_PATTERNS,
  TITLE_PATTERNS,
} from './userExtraction';
