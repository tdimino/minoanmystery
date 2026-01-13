/**
 * Minoan Soul Memory Schema
 *
 * Typed persistent memory for the Minoan soul.
 * Stored in localStorage for cross-session persistence.
 */

import type { SoulState } from '../../src/lib/soul/opensouls/core/types';

export interface MinoanSoulMemory {
  // Visitor Identity
  visitorName: string;
  sessionId: string;

  // Engagement Tracking
  visitCount: number;
  pagesViewed: string[];
  timePerPage: Record<string, number>;
  scrollDepths: Record<string, number>;
  lastProject: string;

  // Inferred Model
  inferredInterests: string[];
  behavioralType: 'scanner' | 'reader' | 'explorer' | 'focused';
  readinessSignals: string[];

  // Soul State
  currentState: SoulState;
  emotionalTone: 'neutral' | 'curious' | 'warm' | 'mysterious';
  conversationPhase: 'greeting' | 'exploring' | 'discussing' | 'closing';

  // Conversation Context
  lastGreeting: string;
  topicsDiscussed: string[];
  questionsAsked: string[];

  // Timestamps
  firstVisit: string;
  lastVisit: string;
  totalTimeOnSite: number;
}

/**
 * Default values for new visitors
 */
export const defaultMinoanMemory: MinoanSoulMemory = {
  visitorName: '',
  sessionId: '',

  visitCount: 0,
  pagesViewed: [],
  timePerPage: {},
  scrollDepths: {},
  lastProject: '',

  inferredInterests: [],
  behavioralType: 'explorer',
  readinessSignals: [],

  currentState: 'greeting',
  emotionalTone: 'neutral',
  conversationPhase: 'greeting',

  lastGreeting: '',
  topicsDiscussed: [],
  questionsAsked: [],

  firstVisit: '',
  lastVisit: '',
  totalTimeOnSite: 0,
};

/**
 * Behavioral type detection based on engagement patterns
 */
export function inferBehavioralType(
  memory: MinoanSoulMemory
): MinoanSoulMemory['behavioralType'] {
  const avgTimePerPage = Object.values(memory.timePerPage).reduce((a, b) => a + b, 0) /
    Math.max(memory.pagesViewed.length, 1);

  const avgScrollDepth = Object.values(memory.scrollDepths).reduce((a, b) => a + b, 0) /
    Math.max(Object.keys(memory.scrollDepths).length, 1);

  // Scanner: Quick page views, low scroll depth
  if (avgTimePerPage < 15000 && avgScrollDepth < 0.3) {
    return 'scanner';
  }

  // Reader: Long time on page, high scroll depth
  if (avgTimePerPage > 60000 && avgScrollDepth > 0.7) {
    return 'reader';
  }

  // Focused: High scroll depth on specific pages (portfolio)
  if (memory.pagesViewed.some(p => p.includes('portfolio')) && avgScrollDepth > 0.8) {
    return 'focused';
  }

  // Default: Explorer
  return 'explorer';
}

/**
 * Infer interests from page views and time spent
 */
export function inferInterests(memory: MinoanSoulMemory): string[] {
  const interests: string[] = [];
  const timeEntries = Object.entries(memory.timePerPage);

  // Sort by time spent
  timeEntries.sort((a, b) => b[1] - a[1]);

  for (const [page, time] of timeEntries.slice(0, 3)) {
    if (page.includes('acs')) {
      interests.push('content strategy', 'enterprise websites');
    } else if (page.includes('czi')) {
      interests.push('scientific documentation', 'training materials');
    } else if (page.includes('dolby')) {
      interests.push('UX design', 'template systems');
    } else if (page.includes('about')) {
      interests.push('Tom\'s background', 'professional history');
    } else if (page.includes('contact')) {
      interests.push('hiring', 'collaboration');
    }
  }

  return [...new Set(interests)]; // Deduplicate
}

/**
 * Detect readiness signals (intent to contact)
 */
export function detectReadinessSignals(memory: MinoanSoulMemory): string[] {
  const signals: string[] = [];

  // Visited contact page
  if (memory.pagesViewed.includes('/contact')) {
    signals.push('visited_contact');
  }

  // High scroll depth on case studies
  const caseStudyScrolls = Object.entries(memory.scrollDepths)
    .filter(([page]) => page.includes('portfolio'))
    .filter(([, depth]) => depth > 0.8);

  if (caseStudyScrolls.length >= 2) {
    signals.push('deep_case_study_engagement');
  }

  // Multiple visits
  if (memory.visitCount >= 3) {
    signals.push('repeat_visitor');
  }

  // High total time
  if (memory.totalTimeOnSite > 300000) { // 5+ minutes
    signals.push('significant_time_investment');
  }

  return signals;
}

export type { MinoanSoulMemory as default };
