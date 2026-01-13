/**
 * Soul Engine Types
 *
 * TypeScript interfaces for the Minoan Mystery Soul Engine,
 * adapted from the Open Souls / Aldea Soul Engine paradigm.
 */

// ─────────────────────────────────────────────────────────────
// Perception Events
// ─────────────────────────────────────────────────────────────

export type PerceptionEventType =
  | 'click'
  | 'scroll'
  | 'hover'
  | 'navigation'
  | 'idle'
  | 'focus'
  | 'blur';

export interface PerceptionEvent {
  type: PerceptionEventType;
  target?: string;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export interface ScrollMetadata {
  depth: number;         // 0-100 percentage
  velocity: number;      // pixels per second
  direction: 'up' | 'down';
}

export interface HoverMetadata {
  element: string;
  dwellTime: number;     // milliseconds
}

export interface ClickMetadata {
  element: string;
  elementType: 'link' | 'button' | 'image' | 'other';
  href?: string;
}

export interface NavigationMetadata {
  from: string;
  to: string;
  method: 'link' | 'browser' | 'palette';
}

// ─────────────────────────────────────────────────────────────
// Soul States
// ─────────────────────────────────────────────────────────────

export type SoulState =
  | 'greeting'    // First visit, welcoming
  | 'curious'     // Exploring multiple pages
  | 'engaged'     // Spending time on case studies
  | 'ready'       // Heading toward contact
  | 'returning';  // Recognized visitor, personalized

export type BehavioralType =
  | 'scanner'     // Quick browsing, low scroll depth
  | 'reader'      // High time on page, deep scrolling
  | 'explorer'    // Many pages visited
  | 'focused';    // Few pages, high engagement

// ─────────────────────────────────────────────────────────────
// User Model (Working Memory)
// ─────────────────────────────────────────────────────────────

export interface UserModel {
  // Session identification
  sessionId: string;
  visitCount: number;
  firstVisit: number;           // timestamp
  lastVisit: number;            // timestamp

  // Navigation tracking
  pagesViewed: string[];
  currentPage: string;
  entryPage: string;

  // Engagement metrics
  timePerPage: Record<string, number>;    // page -> milliseconds
  scrollDepths: Record<string, number>;   // page -> 0-100
  clickedElements: string[];

  // Inferred state
  inferredInterests: string[];
  behavioralType: BehavioralType;
  currentState: SoulState;

  // Interaction tracking
  lastInteraction: number;      // timestamp
  idleTime: number;             // current idle duration in ms
  paletteUses: number;          // command palette usage count

  // Recent activity
  recentCommands: string[];     // last N palette commands
}

// ─────────────────────────────────────────────────────────────
// Soul Actions (Dispatch)
// ─────────────────────────────────────────────────────────────

export type SoulActionType =
  | 'toast'       // Show floating dialogue
  | 'highlight'   // Highlight a UI element
  | 'suggest'     // Suggest content/action
  | 'theme'       // Adjust theme
  | 'cta'         // Modify CTA text
  | 'animate';    // Trigger animation

export interface ToastPayload {
  message: string;
  duration: number;       // milliseconds
  type?: 'info' | 'welcome' | 'hint';
  hasHtml?: boolean;      // if true, render message as HTML
}

export interface HighlightPayload {
  selector: string;
  duration: number;
  style?: 'glow' | 'pulse' | 'border';
}

export interface SuggestPayload {
  content: string;
  link?: string;
  reason?: string;
}

export interface CTAPayload {
  selector: string;
  text: string;
  originalText: string;
}

export interface AnimatePayload {
  target: string;
  animation: 'intensify' | 'calm' | 'attention';
}

export interface SoulAction {
  type: SoulActionType;
  payload: ToastPayload | HighlightPayload | SuggestPayload | CTAPayload | AnimatePayload;
  timestamp?: number;
}

// ─────────────────────────────────────────────────────────────
// Triggers
// ─────────────────────────────────────────────────────────────

export interface Trigger {
  id: string;
  name: string;
  description: string;
  condition: (memory: UserModel) => boolean;
  action: SoulAction;
  cooldown?: number;          // ms before trigger can fire again
  maxFires?: number;          // max times trigger can fire per session
  firedCount?: number;        // current fire count
  lastFired?: number;         // timestamp of last fire
}

// ─────────────────────────────────────────────────────────────
// State Machine Transitions
// ─────────────────────────────────────────────────────────────

export interface StateTransition {
  from: SoulState;
  to: SoulState;
  condition: (memory: UserModel) => boolean;
}

// ─────────────────────────────────────────────────────────────
// Soul Engine Configuration
// ─────────────────────────────────────────────────────────────

export interface SoulConfig {
  // Perception thresholds
  scrollDebounceMs: number;
  hoverDebounceMs: number;
  idleThresholdMs: number;

  // Memory settings
  maxRecentCommands: number;
  maxPagesTracked: number;

  // Behavioral inference
  scannerScrollThreshold: number;     // below this = scanner
  readerTimeThreshold: number;        // above this = reader (ms)
  explorerPageThreshold: number;      // above this = explorer

  // Storage key
  storageKey: string;
}

export const DEFAULT_CONFIG: SoulConfig = {
  scrollDebounceMs: 100,
  hoverDebounceMs: 100,
  idleThresholdMs: 30000,           // 30 seconds

  maxRecentCommands: 10,
  maxPagesTracked: 50,

  scannerScrollThreshold: 30,        // less than 30% scroll = scanner
  readerTimeThreshold: 120000,       // more than 2 minutes = reader
  explorerPageThreshold: 3,          // 3+ pages = explorer

  storageKey: 'minoan-soul-memory'
};

// ─────────────────────────────────────────────────────────────
// SSE Streaming Types
// ─────────────────────────────────────────────────────────────

export type SSEEventType = 'start' | 'chunk' | 'done' | 'error';

export interface SSEChunk {
  type: 'chunk' | 'done' | 'error';
  text?: string;           // Incremental text chunk
  fullResponse?: string;   // Complete response (only on 'done')
  error?: string;          // Error message (only on 'error')
}

export interface SSEStreamOptions {
  signal?: AbortSignal;
  timeout?: number;        // Request timeout in ms
}

export interface SSEStreamController {
  stream: AsyncIterable<SSEChunk>;
  abort: () => void;
}
