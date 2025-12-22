/**
 * Text Utilities
 *
 * Pure utility functions for text processing, hashing, and IRI generation.
 * All functions are deterministic and side-effect free.
 */

/**
 * Normalize text for comparison and matching
 *
 * - Converts to lowercase
 * - Trims whitespace
 * - Removes punctuation
 *
 * @param text Text to normalize
 * @returns Normalized text
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Compute a deterministic hash of content using a simple hash algorithm
 *
 * Note: This uses a basic hash function suitable for IRI generation.
 * For cryptographic purposes, use Web Crypto API instead.
 *
 * @param content Content to hash
 * @returns Hexadecimal hash string (16 characters)
 */
export function computeHash(content: string): string {
  let hash = 0;

  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to positive hex string
  const hexHash = Math.abs(hash).toString(16).padStart(8, '0');

  // Add additional entropy from string length and first/last chars
  const lengthHash = content.length.toString(16).padStart(4, '0');
  const charHash = (content.charCodeAt(0) ^ content.charCodeAt(content.length - 1)).toString(16).padStart(4, '0');

  return (hexHash + lengthHash + charHash).substring(0, 16);
}

/**
 * Mint a deterministic IRI for a document part
 *
 * Format: {baseURI}doc_{docHash}_part_{contentHash}_pos_{position}
 *
 * This ensures:
 * - Same document = same docHash
 * - Same content = same contentHash
 * - Same position = same IRI (fully deterministic)
 *
 * @param baseURI Base URI for the knowledge graph
 * @param docHash Document hash
 * @param content Part content
 * @param position Sequential position in document
 * @returns IRI string
 */
export function mintIRI(
  baseURI: string,
  docHash: string,
  content: string,
  position: number
): string {
  const contentHash = computeHash(content);
  const paddedPosition = String(position).padStart(3, '0');

  return `${baseURI}doc_${docHash}_part_${contentHash}_pos_${paddedPosition}`;
}

/**
 * Extract the base form of a word (simple lemmatization)
 *
 * This is a simplified version. For full lemmatization, use the
 * Lemmatizer class from the POS tagger.
 *
 * @param word Word to lemmatize
 * @returns Base form of the word
 */
export function simpleLemmatize(word: string): string {
  const lower = word.toLowerCase();

  // Remove common plural endings
  if (lower.endsWith('ies') && lower.length > 4) {
    return lower.slice(0, -3) + 'y';
  }
  if (lower.endsWith('es') && lower.length > 3) {
    return lower.slice(0, -2);
  }
  if (lower.endsWith('s') && lower.length > 2 && !lower.endsWith('ss')) {
    return lower.slice(0, -1);
  }

  return lower;
}

/**
 * Calculate Levenshtein distance between two strings
 *
 * Used for fuzzy matching in ontology concept resolution.
 *
 * @param a First string
 * @param b Second string
 * @returns Edit distance
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score (0-1) based on Levenshtein distance
 *
 * @param a First string
 * @param b Second string
 * @returns Similarity score (1 = identical, 0 = completely different)
 */
export function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);

  return 1 - (distance / maxLength);
}

/**
 * Truncate text to a maximum length, adding ellipsis if needed
 *
 * @param text Text to truncate
 * @param maxLength Maximum length
 * @returns Truncated text
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Escape special characters for use in HTML
 *
 * @param text Text to escape
 * @returns HTML-safe text
 */
export function escapeHTML(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Generate a human-readable label from an IRI
 *
 * @param iri IRI to convert
 * @returns Human-readable label
 */
export function iriToLabel(iri: string): string {
  // Extract the last part of the IRI
  const lastPart = iri.split('/').pop() || iri;

  // Remove hash fragments
  const withoutHash = lastPart.split('#').pop() || lastPart;

  // Convert underscores/hyphens to spaces
  const withSpaces = withoutHash.replace(/[_-]/g, ' ');

  // Capitalize first letter
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}
