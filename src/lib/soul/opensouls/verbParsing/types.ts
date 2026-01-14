/**
 * Verb Parsing Types
 *
 * Structured intent taxonomy for parsing user perceptions and chat input.
 * Follows Open Souls paradigm for verb/entity extraction.
 */

// Verb Categories
export type VerbCategory =
  | 'navigation'
  | 'engagement'
  | 'action'
  | 'query'
  | 'meta';

// Navigation Verbs - movement through the labyrinth
export type NavigationVerb =
  | 'navigate_to'   // Go to specific page/section
  | 'explore'       // General browsing/discovery
  | 'return_to'     // Going back
  | 'exit';         // Leaving the site

// Engagement Verbs - interaction with content
export type EngagementVerb =
  | 'read'          // Deep reading (high scroll + time)
  | 'scroll'        // Casual scrolling
  | 'hover'         // Brief attention
  | 'dwell';        // Extended hover/focus

// Action Verbs - discrete actions
export type ActionVerb =
  | 'click'         // Generic click
  | 'contact'       // Contact intent
  | 'download'      // Download action
  | 'share';        // Share/forward

// Query Verbs - seeking information
export type QueryVerb =
  | 'ask'           // Direct question
  | 'search'        // Looking for something
  | 'request'       // Requesting help/info
  | 'clarify';      // Seeking clarification

// Meta Verbs - ambient/system events
export type MetaVerb =
  | 'idle'          // No activity
  | 'focus'         // Tab/window focus
  | 'blur';         // Tab/window blur

// Union of all verbs
export type Verb =
  | NavigationVerb
  | EngagementVerb
  | ActionVerb
  | QueryVerb
  | MetaVerb;

// Entity types that can be extracted
export type EntityType =
  | 'page'          // A page route
  | 'project'       // A portfolio project
  | 'element'       // A DOM element
  | 'topic'         // A topic/subject
  | 'link'          // A hyperlink
  | 'unknown';

// Extracted entity from intent
export interface Entity {
  type: EntityType;
  value: string;
  metadata?: Record<string, unknown>;
}

// Fully parsed intent
export interface ParsedIntent {
  verb: Verb;
  category: VerbCategory;
  entity: Entity | null;
  confidence: number; // 0-1 confidence score
  raw: string;        // Original input
  timestamp: number;
  source: 'perception' | 'chat' | 'command';
}

// Intent routing result
export interface IntentRoute {
  intent: ParsedIntent;
  suggestedState: string | null;
  suggestedAction: IntentAction | null;
  shouldRespond: boolean;
  responseHint?: string;
}

// Action to dispatch based on intent
export interface IntentAction {
  type: 'toast' | 'highlight' | 'cta' | 'animate' | 'navigate';
  payload: Record<string, unknown>;
}

// Verb category mapping for runtime lookup
export const VERB_CATEGORIES: Record<Verb, VerbCategory> = {
  // Navigation
  navigate_to: 'navigation',
  explore: 'navigation',
  return_to: 'navigation',
  exit: 'navigation',
  // Engagement
  read: 'engagement',
  scroll: 'engagement',
  hover: 'engagement',
  dwell: 'engagement',
  // Action
  click: 'action',
  contact: 'action',
  download: 'action',
  share: 'action',
  // Query
  ask: 'query',
  search: 'query',
  request: 'query',
  clarify: 'query',
  // Meta
  idle: 'meta',
  focus: 'meta',
  blur: 'meta',
} as const;

// Helper to get category for a verb
export function getVerbCategory(verb: Verb): VerbCategory {
  return VERB_CATEGORIES[verb];
}

// Project name mappings for entity extraction
export const PROJECT_NAMES: Record<string, string> = {
  acs: 'American College of Surgeons',
  czi: 'Chan Zuckerberg Initiative',
  dolby: 'Dolby Laboratories',
};

// Contact-related patterns for detection
export const CONTACT_PATTERNS = [
  'contact',
  'cta',
  'inquire',
  'schedule',
  'calendly',
  'email',
  'reach out',
  'get in touch',
  'work together',
] as const;
