/**
 * Suggestion Engine
 *
 * Provides build-time and runtime suggestions for the Command Palette.
 * Filters suggestions based on current page and visitor context.
 */

import type { UserModel } from './types';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface SuggestedQuestion {
  id: string;
  text: string;
  icon: string;
  priority: number;
  pages?: string[];        // Pages where this suggestion applies (* = all)
  condition?: string;      // Runtime condition expression
}

interface SuggestionsData {
  suggestions: SuggestedQuestion[];
  fallbackSuggestions: SuggestedQuestion[];
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const DEFAULT_DEBOUNCE_MS = 1500;
const DEFAULT_LIMIT = 3;

// ─────────────────────────────────────────────────────────────
// Suggestion Engine Class
// ─────────────────────────────────────────────────────────────

export class SuggestionEngine {
  private suggestions: SuggestedQuestion[] = [];
  private fallbackSuggestions: SuggestedQuestion[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.loadSuggestions();
  }

  // ─── Public Methods ─────────────────────────────────────────

  /**
   * Get relevant suggestions for current context
   */
  getSuggestions(
    currentPage: string,
    userModel?: Partial<UserModel>,
    limit: number = DEFAULT_LIMIT
  ): SuggestedQuestion[] {
    // Filter by page
    const pageFiltered = this.suggestions.filter(suggestion => {
      if (!suggestion.pages || suggestion.pages.length === 0) {
        return true;
      }
      return suggestion.pages.some(page =>
        page === '*' || page === currentPage || currentPage.startsWith(page)
      );
    });

    // Filter by runtime conditions
    const conditionFiltered = pageFiltered.filter(suggestion => {
      if (!suggestion.condition) {
        return true;
      }
      return this.evaluateCondition(suggestion.condition, userModel);
    });

    // Sort by priority
    const sorted = conditionFiltered.sort((a, b) => a.priority - b.priority);

    // Return limited results
    if (sorted.length >= limit) {
      return sorted.slice(0, limit);
    }

    // Add fallback suggestions if needed
    const remaining = limit - sorted.length;
    const fallbacks = this.fallbackSuggestions
      .filter(s => !sorted.some(existing => existing.id === s.id))
      .slice(0, remaining);

    return [...sorted, ...fallbacks];
  }

  /**
   * Get suggestions with fuzzy matching on partial input
   */
  getSuggestionsForInput(
    input: string,
    currentPage: string,
    userModel?: Partial<UserModel>,
    limit: number = DEFAULT_LIMIT
  ): SuggestedQuestion[] {
    if (!input.trim()) {
      return this.getSuggestions(currentPage, userModel, limit);
    }

    const query = input.toLowerCase();

    // Get all applicable suggestions
    const baseSuggestions = this.getSuggestions(currentPage, userModel, this.suggestions.length);

    // Score by relevance to input
    const scored = baseSuggestions.map(suggestion => ({
      suggestion,
      score: this.getRelevanceScore(suggestion.text.toLowerCase(), query)
    }));

    // Filter to only those with some relevance
    const relevant = scored.filter(s => s.score > 0);

    // Sort by score (higher is better)
    relevant.sort((a, b) => b.score - a.score);

    return relevant.slice(0, limit).map(s => s.suggestion);
  }

  /**
   * Request suggestions with debouncing
   */
  requestSuggestions(
    callback: (suggestions: SuggestedQuestion[]) => void,
    currentPage: string,
    userModel?: Partial<UserModel>,
    delay: number = DEFAULT_DEBOUNCE_MS
  ): void {
    this.cancelSuggestions();

    this.debounceTimer = setTimeout(() => {
      const suggestions = this.getSuggestions(currentPage, userModel);
      callback(suggestions);
    }, delay);
  }

  /**
   * Cancel pending suggestion request
   */
  cancelSuggestions(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Reload suggestions (for hot reload in dev)
   */
  reload(): void {
    this.loadSuggestions();
  }

  // ─── Private Methods ────────────────────────────────────────

  private loadSuggestions(): void {
    // Load from the embedded data (will be bundled at build time)
    try {
      // Dynamic import for build-time data
      const data = this.getEmbeddedData();
      this.suggestions = data.suggestions || [];
      this.fallbackSuggestions = data.fallbackSuggestions || [];
    } catch (error) {
      console.error('[SuggestionEngine] Failed to load suggestions:', error);
      this.suggestions = [];
      this.fallbackSuggestions = [];
    }
  }

  private getEmbeddedData(): SuggestionsData {
    // This will be replaced with actual JSON import during build
    // For runtime, we use the default suggestions
    return {
      suggestions: [
        { id: 'who-is-tom', text: 'Who is Tom di Mino?', icon: 'user', priority: 1, pages: ['*'] },
        { id: 'what-does-tom-do', text: 'What kind of work does Tom do?', icon: 'briefcase', priority: 2, pages: ['*'] },
        { id: 'aldea-work', text: "Tell me about Tom's work at Aldea", icon: 'cpu', priority: 3, condition: 'visitCount > 1', pages: ['*'] },
        { id: 'explain-labyrinth', text: 'What is this labyrinth?', icon: 'compass', priority: 4, pages: ['*'] },
        { id: 'contact-info', text: 'How can I get in touch with Tom?', icon: 'mail', priority: 5, pages: ['*'] },
        { id: 'dolby-details', text: 'Tell me more about the Dolby project', icon: 'briefcase', priority: 1, pages: ['/portfolio/dolby', '/'] },
        { id: 'acs-details', text: "What was Tom's role at the ACS?", icon: 'briefcase', priority: 1, pages: ['/portfolio/acs'] },
        { id: 'czi-details', text: 'Tell me about the CZI project', icon: 'briefcase', priority: 1, pages: ['/portfolio/czi', '/'] },
        { id: 'ai-expertise', text: "What is Tom's experience with AI?", icon: 'sparkles', priority: 2, pages: ['/about', '/'] },
        { id: 'poet-to-engineer', text: 'How did Tom go from poet to engineer?', icon: 'book', priority: 3, pages: ['/about'] },
        { id: 'schedule-call', text: "I'd like to schedule a call", icon: 'calendar', priority: 1, pages: ['/contact'] },
        { id: 'what-services', text: 'What services does Tom offer?', icon: 'briefcase', priority: 2, pages: ['/contact'] },
      ],
      fallbackSuggestions: [
        { id: 'explore-portfolio', text: "Show me Tom's best work", icon: 'compass', priority: 1 },
        { id: 'random-fact', text: 'Tell me something interesting', icon: 'sparkles', priority: 2 },
      ]
    };
  }

  private evaluateCondition(condition: string, userModel?: Partial<UserModel>): boolean {
    if (!userModel) return false;

    try {
      // Parse simple conditions like "visitCount > 1"
      const match = condition.match(/^(\w+)\s*(>|<|>=|<=|===|==)\s*(\d+)$/);
      if (!match) return false;

      const [, field, operator, valueStr] = match;
      const modelValue = (userModel as Record<string, unknown>)[field];
      const compareValue = parseInt(valueStr, 10);

      if (typeof modelValue !== 'number') return false;

      switch (operator) {
        case '>': return modelValue > compareValue;
        case '<': return modelValue < compareValue;
        case '>=': return modelValue >= compareValue;
        case '<=': return modelValue <= compareValue;
        case '===':
        case '==': return modelValue === compareValue;
        default: return false;
      }
    } catch {
      return false;
    }
  }

  private getRelevanceScore(text: string, query: string): number {
    // Exact match gets highest score
    if (text.includes(query)) return 100;

    // Word-level matching
    const queryWords = query.split(/\s+/);
    const textWords = text.split(/\s+/);

    let score = 0;
    for (const queryWord of queryWords) {
      for (const textWord of textWords) {
        if (textWord.includes(queryWord)) {
          score += 50;
        } else if (textWord.startsWith(queryWord.substring(0, 3))) {
          score += 10;
        }
      }
    }

    return score;
  }
}

// ─────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────

let engineInstance: SuggestionEngine | null = null;

export function getSuggestionEngine(): SuggestionEngine {
  if (!engineInstance) {
    engineInstance = new SuggestionEngine();
  }
  return engineInstance;
}

export function resetSuggestionEngine(): void {
  if (engineInstance) {
    engineInstance.cancelSuggestions();
  }
  engineInstance = null;
}
