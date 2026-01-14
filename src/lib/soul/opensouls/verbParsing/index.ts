/**
 * Verb Parsing Module
 *
 * Structured intent extraction from perceptions and chat input.
 * Follows Open Souls paradigm for verb/entity parsing.
 */

// Types
export type {
  VerbCategory,
  NavigationVerb,
  EngagementVerb,
  ActionVerb,
  QueryVerb,
  MetaVerb,
  Verb,
  EntityType,
  Entity,
  ParsedIntent,
  IntentRoute,
  IntentAction,
} from './types';

export {
  VERB_CATEGORIES,
  getVerbCategory,
  PROJECT_NAMES,
  CONTACT_PATTERNS,
} from './types';

// Rule-based parser
export { parsePerceptionIntent } from './ruleParser';

// Intent router
export { routeIntent, prioritizeIntents } from './intentRouter';
