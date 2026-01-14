/**
 * Rule-Based Intent Parser
 *
 * Deterministic parsing of perception events into structured intents.
 * No LLM calls - fast, predictable, rule-based extraction.
 */

import type {
  ParsedIntent,
  Verb,
  Entity,
  EntityType,
} from './types';
import { getVerbCategory, CONTACT_PATTERNS, PROJECT_NAMES } from './types';
import type { Perception } from '../core/types';

/**
 * Parse a perception event into a structured intent
 */
export function parsePerceptionIntent(perception: Perception): ParsedIntent {
  const { type, content, timestamp, metadata } = perception;

  // Navigation events
  if (type === 'navigation') {
    return parseNavigationIntent(content, timestamp, metadata);
  }

  // Click events
  if (type === 'click') {
    return parseClickIntent(content, timestamp, metadata);
  }

  // Scroll events
  if (type === 'scroll') {
    return parseScrollIntent(content, timestamp, metadata);
  }

  // Hover events
  if (type === 'hover') {
    return parseHoverIntent(content, timestamp, metadata);
  }

  // Idle events
  if (type === 'idle') {
    return parseIdleIntent(content, timestamp, metadata);
  }

  // Focus/blur events
  if (type === 'focus' || type === 'blur') {
    return parseVisibilityIntent(type, content, timestamp);
  }

  // Default fallback
  return createIntent('click', 'action', { type: 'unknown', value: content }, 0.5, content, timestamp, 'perception');
}

/**
 * Parse navigation perception
 */
function parseNavigationIntent(
  content: string,
  timestamp: number,
  metadata?: Record<string, unknown>
): ParsedIntent {
  const to = content || (metadata?.to as string) || '';
  const entityType = inferPageType(to);

  // Extract project name if portfolio page
  let entityValue = to;
  if (to.includes('/portfolio/')) {
    const projectSlug = to.split('/portfolio/')[1]?.replace('/', '');
    if (projectSlug && PROJECT_NAMES[projectSlug]) {
      entityValue = PROJECT_NAMES[projectSlug];
    }
  }

  return createIntent(
    'navigate_to',
    'navigation',
    {
      type: entityType,
      value: entityValue,
      metadata: { from: metadata?.from, path: to },
    },
    1.0,
    content,
    timestamp,
    'perception'
  );
}

/**
 * Parse click perception
 */
function parseClickIntent(
  content: string,
  timestamp: number,
  metadata?: Record<string, unknown>
): ParsedIntent {
  const element = content || (metadata?.element as string) || '';
  const href = metadata?.href as string | undefined;

  // Check for contact-related clicks
  if (isContactElement(element, href)) {
    return createIntent(
      'contact',
      'action',
      { type: 'element', value: element, metadata: { href } },
      0.9,
      content,
      timestamp,
      'perception'
    );
  }

  // Link clicks → navigation
  if (href) {
    const entityType = inferPageType(href);
    return createIntent(
      'navigate_to',
      'navigation',
      { type: entityType, value: href },
      0.95,
      content,
      timestamp,
      'perception'
    );
  }

  // Generic click
  return createIntent(
    'click',
    'action',
    { type: 'element', value: element },
    0.8,
    content,
    timestamp,
    'perception'
  );
}

/**
 * Parse scroll perception
 */
function parseScrollIntent(
  content: string,
  timestamp: number,
  metadata?: Record<string, unknown>
): ParsedIntent {
  const depth = parseFloat(content) || (metadata?.depth as number) || 0;
  const page = (metadata?.page as string) || '';

  // High scroll depth indicates reading
  const verb: Verb = depth > 0.7 ? 'read' : 'scroll';
  const confidence = depth > 0.7 ? 0.9 : 0.75;

  return createIntent(
    verb,
    'engagement',
    { type: 'page', value: page, metadata: { depth } },
    confidence,
    content,
    timestamp,
    'perception'
  );
}

/**
 * Parse hover perception
 */
function parseHoverIntent(
  content: string,
  timestamp: number,
  metadata?: Record<string, unknown>
): ParsedIntent {
  const dwellTime = (metadata?.dwellTime as number) || 0;
  const element = content;

  // Check for contact hover
  if (isContactElement(element)) {
    return createIntent(
      'contact',
      'action',
      { type: 'element', value: element, metadata: { dwellTime } },
      0.85,
      content,
      timestamp,
      'perception'
    );
  }

  // Long hover = dwell
  const verb: Verb = dwellTime > 2000 ? 'dwell' : 'hover';

  return createIntent(
    verb,
    'engagement',
    { type: 'element', value: element, metadata: { dwellTime } },
    0.75,
    content,
    timestamp,
    'perception'
  );
}

/**
 * Parse idle perception
 */
function parseIdleIntent(
  content: string,
  timestamp: number,
  metadata?: Record<string, unknown>
): ParsedIntent {
  const page = (metadata?.page as string) || '';
  const duration = (metadata?.duration as number) || 0;

  return createIntent(
    'idle',
    'meta',
    { type: 'page', value: page, metadata: { duration } },
    1.0,
    content,
    timestamp,
    'perception'
  );
}

/**
 * Parse focus/blur perception
 */
function parseVisibilityIntent(
  type: 'focus' | 'blur',
  content: string,
  timestamp: number
): ParsedIntent {
  return createIntent(
    type,
    'meta',
    null,
    1.0,
    content,
    timestamp,
    'perception'
  );
}

/**
 * Helper: Create a ParsedIntent
 */
function createIntent(
  verb: Verb,
  category: ReturnType<typeof getVerbCategory>,
  entity: Entity | null,
  confidence: number,
  raw: string,
  timestamp: number,
  source: 'perception' | 'chat' | 'command'
): ParsedIntent {
  return {
    verb,
    category,
    entity,
    confidence,
    raw,
    timestamp,
    source,
  };
}

/**
 * Helper: Infer page type from path
 */
function inferPageType(path: string): EntityType {
  if (path.includes('/portfolio/')) return 'project';
  if (path === '/contact' || path === '/about' || path === '/') return 'page';
  if (path.startsWith('http')) return 'link';
  return 'page';
}

/**
 * Helper: Check if element is contact-related
 */
function isContactElement(element: string, href?: string): boolean {
  const combined = `${element} ${href || ''}`.toLowerCase();
  return CONTACT_PATTERNS.some(pattern => combined.includes(pattern));
}
