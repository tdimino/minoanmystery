/**
 * Memory Regions - Portfolio-specific organization
 *
 * Defines regions for structured memory organization.
 * Regions are ordered by priority for LLM context presentation.
 */

import { ChatMessageRoleEnum } from './types';
import type { Memory } from './types';

/**
 * Region names as constants for type safety
 */
export const REGIONS = {
  // Core identity
  SOUL_PERSONALITY: 'soul-personality',

  // Visitor context
  VISITOR_CONTEXT: 'visitor-context',
  VISITOR_INTERESTS: 'visitor-interests',

  // Portfolio-specific
  PORTFOLIO_INTEREST: 'portfolio-interest',
  CASE_STUDY_CONTEXT: 'case-study-context',

  // Conversation
  CONVERSATION_SUMMARY: 'conversation-summary',
  RECENT_EXCHANGES: 'recent-exchanges',

  // System
  CORE: 'core',
  DEFAULT: 'default',
} as const;

export type RegionName = typeof REGIONS[keyof typeof REGIONS];

/**
 * Region configuration with priority and compression rules
 */
export interface RegionConfig {
  name: RegionName;
  priority: number;        // Lower = higher priority in context
  maxMemories?: number;    // Max memories before compression
  compressible: boolean;   // Whether region can be compressed
  persistent: boolean;     // Whether region survives compression
}

/**
 * Default region configurations
 */
export const REGION_CONFIGS: Record<RegionName, RegionConfig> = {
  [REGIONS.SOUL_PERSONALITY]: {
    name: REGIONS.SOUL_PERSONALITY,
    priority: 1,
    compressible: false,
    persistent: true,
  },
  [REGIONS.VISITOR_CONTEXT]: {
    name: REGIONS.VISITOR_CONTEXT,
    priority: 2,
    maxMemories: 5,
    compressible: false,
    persistent: true,
  },
  [REGIONS.VISITOR_INTERESTS]: {
    name: REGIONS.VISITOR_INTERESTS,
    priority: 3,
    maxMemories: 10,
    compressible: true,
    persistent: true,
  },
  [REGIONS.PORTFOLIO_INTEREST]: {
    name: REGIONS.PORTFOLIO_INTEREST,
    priority: 4,
    maxMemories: 15,
    compressible: true,
    persistent: true,
  },
  [REGIONS.CASE_STUDY_CONTEXT]: {
    name: REGIONS.CASE_STUDY_CONTEXT,
    priority: 5,
    maxMemories: 10,
    compressible: true,
    persistent: false,
  },
  [REGIONS.CONVERSATION_SUMMARY]: {
    name: REGIONS.CONVERSATION_SUMMARY,
    priority: 6,
    maxMemories: 3,
    compressible: false,
    persistent: true,
  },
  [REGIONS.RECENT_EXCHANGES]: {
    name: REGIONS.RECENT_EXCHANGES,
    priority: 7,
    maxMemories: 20,
    compressible: true,
    persistent: false,
  },
  [REGIONS.CORE]: {
    name: REGIONS.CORE,
    priority: 8,
    compressible: false,
    persistent: true,
  },
  [REGIONS.DEFAULT]: {
    name: REGIONS.DEFAULT,
    priority: 99,
    maxMemories: 30,
    compressible: true,
    persistent: false,
  },
};

/**
 * Get region order by priority (lowest first = highest priority)
 */
export function getRegionalOrder(): RegionName[] {
  return Object.values(REGION_CONFIGS)
    .sort((a, b) => a.priority - b.priority)
    .map(config => config.name);
}

/**
 * Get config for a region
 */
export function getRegionConfig(region: string): RegionConfig {
  return REGION_CONFIGS[region as RegionName] ?? REGION_CONFIGS[REGIONS.DEFAULT];
}

/**
 * Check if a region can be compressed
 */
export function isCompressible(region: string): boolean {
  return getRegionConfig(region).compressible;
}

/**
 * Check if a region persists across compression
 */
export function isPersistent(region: string): boolean {
  return getRegionConfig(region).persistent;
}

/**
 * Create a memory tagged with a specific region
 */
export function createRegionMemory(
  region: RegionName,
  content: string,
  role: ChatMessageRoleEnum = ChatMessageRoleEnum.System,
  name?: string
): Memory {
  return {
    role,
    content,
    region,
    timestamp: new Date().toISOString(),
    ...(name ? { name } : {}),
  };
}

/**
 * Create visitor context memory
 */
export function createVisitorContextMemory(
  visitCount: number,
  pagesViewed: string[],
  behavioralType: string,
  currentState: string
): Memory {
  const content = `Visitor context:
- Visit #${visitCount}
- Pages viewed: ${pagesViewed.join(', ') || 'none yet'}
- Behavioral type: ${behavioralType}
- Current soul state: ${currentState}`;

  return createRegionMemory(REGIONS.VISITOR_CONTEXT, content);
}

/**
 * Create portfolio interest memory
 */
export function createPortfolioInterestMemory(
  interests: string[],
  projectsViewed: string[]
): Memory {
  const content = `Portfolio interests:
- Inferred interests: ${interests.join(', ') || 'exploring'}
- Projects viewed: ${projectsViewed.join(', ') || 'none yet'}`;

  return createRegionMemory(REGIONS.PORTFOLIO_INTEREST, content);
}

/**
 * Create conversation summary memory
 */
export function createConversationSummaryMemory(
  topics: string[],
  keyInsights: string[],
  messageCount: number
): Memory {
  const content = `Conversation summary (${messageCount} exchanges):
- Topics discussed: ${topics.join(', ') || 'general browsing'}
- Key insights: ${keyInsights.join('; ') || 'visitor is exploring'}`;

  return createRegionMemory(REGIONS.CONVERSATION_SUMMARY, content);
}
