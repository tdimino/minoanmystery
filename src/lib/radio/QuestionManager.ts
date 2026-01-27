/**
 * QuestionManager - Manages listener questions for Daimonic Radio
 *
 * Handles queue management, upvoting, timing control, and basic moderation
 * for listener-submitted questions during radio broadcasts.
 */

import type {
  ListenerQuestion,
  QuestionQueue,
  RadioSoulName,
} from './types';

// ============================================
// Configuration Types
// ============================================

export interface QuestionManagerConfig {
  /** Minimum time between addressing questions (ms). Default: 120000 (2 minutes) */
  minTimeBetweenQuestions?: number;

  /** Minimum question length. Default: 10 */
  minQuestionLength?: number;

  /** Maximum question length. Default: 280 */
  maxQuestionLength?: number;

  /** Maximum uppercase percentage (0-1). Default: 0.5 */
  maxUppercaseRatio?: number;

  /** Maximum repeated characters in a row. Default: 4 */
  maxRepeatedChars?: number;

  /** List of blocked words for moderation. Default: basic list */
  blockedWords?: string[];

  /** Callback when a question is added */
  onQuestionAdded?: (question: ListenerQuestion) => void;

  /** Callback when a question is being addressed */
  onQuestionAddressed?: (question: ListenerQuestion) => void;
}

export interface ModerationResult {
  /** Whether the question is allowed */
  allowed: boolean;

  /** Reason if not allowed */
  reason?: string;
}

// ============================================
// Default Configuration
// ============================================

const DEFAULT_BLOCKED_WORDS = [
  // Basic profanity - expand as needed
  'fuck',
  'shit',
  'ass',
  'bitch',
  'damn',
  'crap',
  'piss',
  'dick',
  'cock',
  'pussy',
  'cunt',
  'bastard',
  'slut',
  'whore',
];

const DEFAULT_CONFIG: Required<Omit<QuestionManagerConfig, 'onQuestionAdded' | 'onQuestionAddressed'>> = {
  minTimeBetweenQuestions: 120000, // 2 minutes
  minQuestionLength: 10,
  maxQuestionLength: 280,
  maxUppercaseRatio: 0.5,
  maxRepeatedChars: 4,
  blockedWords: DEFAULT_BLOCKED_WORDS,
};

/** Maximum number of answered questions to keep in history */
const MAX_ANSWERED_HISTORY = 100;

// ============================================
// QuestionManager Class
// ============================================

export class QuestionManager {
  private questions: Map<string, ListenerQuestion> = new Map();
  private currentQuestion: ListenerQuestion | null = null;
  private lastQuestionTime: number = 0;
  private upvoteTracker: Map<string, Set<string>> = new Map(); // questionId -> Set of visitorIds
  private answeredQuestions: ListenerQuestion[] = [];

  private readonly config: Required<Omit<QuestionManagerConfig, 'onQuestionAdded' | 'onQuestionAddressed'>>;
  private readonly onQuestionAdded?: (question: ListenerQuestion) => void;
  private readonly onQuestionAddressed?: (question: ListenerQuestion) => void;

  constructor(config: QuestionManagerConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
    this.onQuestionAdded = config.onQuestionAdded;
    this.onQuestionAddressed = config.onQuestionAddressed;
  }

  // ============================================
  // Queue Management
  // ============================================

  /**
   * Add a new question to the queue
   */
  addQuestion(question: string, submittedBy?: string): ListenerQuestion {
    const id = this.generateId();
    const now = Date.now();

    const listenerQuestion: ListenerQuestion = {
      id,
      question: question.trim(),
      submittedAt: now,
      submittedBy,
      upvotes: 0,
      status: 'pending',
    };

    this.questions.set(id, listenerQuestion);
    this.upvoteTracker.set(id, new Set());

    this.onQuestionAdded?.(listenerQuestion);

    return listenerQuestion;
  }

  /**
   * Upvote a question. Returns new upvote count.
   * Prevents duplicate votes from the same visitor.
   */
  upvote(questionId: string, visitorId: string): number {
    const question = this.questions.get(questionId);
    if (!question) {
      return 0;
    }

    const voters = this.upvoteTracker.get(questionId);
    if (!voters) {
      return question.upvotes;
    }

    // Prevent duplicate votes
    if (voters.has(visitorId)) {
      return question.upvotes;
    }

    voters.add(visitorId);
    question.upvotes++;

    return question.upvotes;
  }

  /**
   * Get the next question to address (highest upvoted pending question)
   */
  getNextQuestion(): ListenerQuestion | null {
    const pending = this.getPendingQuestions();
    return pending.length > 0 ? pending[0] : null;
  }

  /**
   * Mark a question as being addressed
   */
  markAddressing(questionId: string): void {
    const question = this.questions.get(questionId);
    if (!question) {
      return;
    }

    question.status = 'addressing';
    this.currentQuestion = question;
    this.lastQuestionTime = Date.now();

    this.onQuestionAddressed?.(question);
  }

  /**
   * Mark a question as answered
   */
  markAnswered(questionId: string, addressedBy: RadioSoulName): void {
    const question = this.questions.get(questionId);
    if (!question) {
      return;
    }

    question.status = 'answered';
    question.addressedBySoul = addressedBy;

    // Move to answered list (keep bounded to prevent memory leak)
    this.answeredQuestions.unshift(question);
    if (this.answeredQuestions.length > MAX_ANSWERED_HISTORY) {
      this.answeredQuestions.pop();
    }

    // Remove from active questions
    this.questions.delete(questionId);
    this.upvoteTracker.delete(questionId);

    // Clear current if this was it
    if (this.currentQuestion?.id === questionId) {
      this.currentQuestion = null;
    }
  }

  // ============================================
  // Timing Control
  // ============================================

  /**
   * Check if enough time has passed since the last question
   */
  canAskQuestion(): boolean {
    if (this.lastQuestionTime === 0) {
      return true;
    }
    return this.getTimeSinceLastQuestion() >= this.config.minTimeBetweenQuestions;
  }

  /**
   * Get milliseconds since last addressed question
   */
  getTimeSinceLastQuestion(): number {
    if (this.lastQuestionTime === 0) {
      return Infinity;
    }
    return Date.now() - this.lastQuestionTime;
  }

  // ============================================
  // Moderation
  // ============================================

  /**
   * Moderate a question for basic checks
   */
  moderateQuestion(question: string): ModerationResult {
    const trimmed = question.trim();

    // Length check
    if (trimmed.length < this.config.minQuestionLength) {
      return {
        allowed: false,
        reason: `Question too short (minimum ${this.config.minQuestionLength} characters)`,
      };
    }

    if (trimmed.length > this.config.maxQuestionLength) {
      return {
        allowed: false,
        reason: `Question too long (maximum ${this.config.maxQuestionLength} characters)`,
      };
    }

    // Uppercase check (only count letters)
    const letters = trimmed.replace(/[^a-zA-Z]/g, '');
    if (letters.length > 0) {
      const uppercase = letters.replace(/[^A-Z]/g, '');
      const ratio = uppercase.length / letters.length;
      if (ratio > this.config.maxUppercaseRatio) {
        return {
          allowed: false,
          reason: 'Too many uppercase letters - please reduce caps',
        };
      }
    }

    // Repeated characters check
    const repeatedPattern = new RegExp(`(.)\\1{${this.config.maxRepeatedChars},}`, 'i');
    if (repeatedPattern.test(trimmed)) {
      return {
        allowed: false,
        reason: 'Too many repeated characters',
      };
    }

    // Profanity check (case-insensitive, word boundary)
    const lowerQuestion = trimmed.toLowerCase();
    for (const word of this.config.blockedWords) {
      // Match word with word boundaries (handles variations)
      const wordPattern = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'i');
      if (wordPattern.test(lowerQuestion)) {
        return {
          allowed: false,
          reason: 'Question contains inappropriate language',
        };
      }
    }

    return { allowed: true };
  }

  // ============================================
  // State Access
  // ============================================

  /**
   * Get current queue state
   */
  getState(): QuestionQueue {
    return {
      questions: Array.from(this.questions.values()),
      currentQuestion: this.currentQuestion,
      lastQuestionTime: this.lastQuestionTime,
      minTimeBetweenQuestions: this.config.minTimeBetweenQuestions,
    };
  }

  /**
   * Get all pending questions, sorted by upvotes (highest first)
   */
  getPendingQuestions(): ListenerQuestion[] {
    return Array.from(this.questions.values())
      .filter((q) => q.status === 'pending')
      .sort((a, b) => {
        // Primary: upvotes (descending)
        if (b.upvotes !== a.upvotes) {
          return b.upvotes - a.upvotes;
        }
        // Secondary: submission time (earlier first)
        return a.submittedAt - b.submittedAt;
      });
  }

  /**
   * Get recently answered questions
   */
  getRecentlyAnswered(limit: number = 10): ListenerQuestion[] {
    return this.answeredQuestions.slice(0, limit);
  }

  /**
   * Get a specific question by ID
   */
  getQuestion(questionId: string): ListenerQuestion | undefined {
    return this.questions.get(questionId) ||
      this.answeredQuestions.find((q) => q.id === questionId);
  }

  /**
   * Check if a visitor has upvoted a question
   */
  hasUpvoted(questionId: string, visitorId: string): boolean {
    const voters = this.upvoteTracker.get(questionId);
    return voters?.has(visitorId) ?? false;
  }

  /**
   * Clear all questions (for session reset)
   */
  clear(): void {
    this.questions.clear();
    this.upvoteTracker.clear();
    this.currentQuestion = null;
    this.lastQuestionTime = 0;
    this.answeredQuestions = [];
  }

  // ============================================
  // Private Helpers
  // ============================================

  private generateId(): string {
    return `q_${crypto.randomUUID()}`;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
