/**
 * User Extraction Utilities
 *
 * Instant (no LLM call) extraction of user identity from conversation.
 * Pattern from Open Souls samantha-dreams.
 *
 * This module is shared between browser (LabyrinthChat) and server
 * (cognitive steps) to avoid code duplication.
 */

// ─────────────────────────────────────────────────────────────
//   Name Extraction Patterns
// ─────────────────────────────────────────────────────────────

export const NAME_PATTERNS: RegExp[] = [
  // Standard introductions
  /^(?:hi[,!]?\s+)?(?:I'm|I am|my name is|this is|it's)\s+([a-z]+)/i,
  /^(?:hi|hey|hello)[,!]?\s+(?:I'm|it's|this is)\s+([a-z]+)/i,
  // Name at start or end
  /^([a-z]+)\s+here[.!]?$/i,
  /^-\s*([a-z]+)$/i,
  // Casual variations
  /(?:call me|I go by|name's|just)\s+([a-z]+)/i,
  // Just a name (short messages like "Tomar" or "I'm Tomar!")
  /^(?:I'm|im)\s+([a-z]+)[.!]?$/i,
  // Name anywhere in "my name is X" pattern
  /my name (?:is|'s)\s+([a-z]+)/i,
];

/**
 * Extract a user's name from a message using heuristic patterns.
 * Returns null if no name is found or if the extracted name is invalid.
 *
 * @param content - The message content to search
 * @returns The extracted name (capitalized) or null
 *
 * @example
 * extractNameHeuristic("Hi, I'm Tom!") // => "Tom"
 * extractNameHeuristic("My name is Sarah") // => "Sarah"
 * extractNameHeuristic("What's the weather?") // => null
 */
export function extractNameHeuristic(content: string): string | null {
  for (const pattern of NAME_PATTERNS) {
    const match = content.match(pattern);
    if (match?.[1]) {
      // Normalize: uppercase first letter, lowercase rest
      const rawName = match[1].trim();
      const name = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
      // Validate: 2-20 chars, only letters
      if (name.length >= 2 && name.length <= 20 && /^[A-Za-z]+$/.test(name)) {
        return name;
      }
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
//   Title/Profession Extraction Patterns
// ─────────────────────────────────────────────────────────────

/**
 * Pattern tuple: [regex, capture group index]
 * Uses [\w\s]+ to capture multi-word titles like "UX designer at a startup"
 */
export const TITLE_PATTERNS: [RegExp, number][] = [
  // "I'm a UX designer" / "I am a software engineer" / "I'm an archaeologist"
  [/\b(?:I'm|I am|i'm|i am) (?:a |an )?([\w\s]+?)(?:[.,!?]|$| and | but | who | that )/i, 1],
  // "I work as a product manager" / "I work as an engineer"
  [/\b(?:I work|i work) (?:as )?(?:a |an )?([\w\s]+?)(?:[.,!?]|$| and | but | who | that )/i, 1],
  // "I'm studying archaeology at Oxford" → "Archaeology Student"
  [/\b(?:I'm|I am|i'm|i am)? ?(?:currently )?stud(?:y|ying) ([\w\s]+?)(?:[.,!?]|$| and | but | at )/i, 1],
  // "I research ancient languages" → "Ancient Languages Researcher"
  [/\b(?:I'm|I am|i'm|i am)? ?(?:currently )?research(?:ing)? ([\w\s]+?)(?:[.,!?]|$| and | but | at )/i, 1],
];

/**
 * Extract a user's title/profession from a message using heuristic patterns.
 * Returns null if no title is found or if the extracted title is invalid.
 *
 * @param content - The message content to search
 * @returns The extracted title (title case) or null
 *
 * @example
 * extractTitleHeuristic("I'm a software engineer") // => "Software Engineer"
 * extractTitleHeuristic("I work as a UX designer") // => "Ux Designer"
 * extractTitleHeuristic("Hello!") // => null
 */
export function extractTitleHeuristic(content: string): string | null {
  for (const [pattern, groupIndex] of TITLE_PATTERNS) {
    const match = content.match(pattern);
    if (match?.[groupIndex]) {
      let rawTitle = match[groupIndex].trim();
      // Clean up common filler words at the end
      rawTitle = rawTitle.replace(/\s+(here|now|currently|these days)$/i, '');
      // Normalize: capitalize first letter of each word
      const title = rawTitle.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
      // Validate: 3-60 chars (increased for longer titles)
      if (title.length >= 3 && title.length <= 60) {
        return title;
      }
    }
  }
  return null;
}
