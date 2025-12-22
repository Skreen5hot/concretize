/**
 * Unit tests for text utilities (FIXED VERSION)
 */

import { describe, test, expect } from 'vitest';
import {
  normalizeText,
  computeHash,
  mintIRI,
  levenshteinDistance,
  levenshteinSimilarity,
  truncate,
  iriToLabel
} from '../../../src/utils/text';

describe('normalizeText', () => {
  test('converts to lowercase and trims whitespace', () => {
    expect(normalizeText('  Hello World  ')).toBe('hello world');
  });

  test('removes punctuation', () => {
    expect(normalizeText('Hello, World!')).toBe('hello world');
  });

  test('collapses multiple spaces', () => {
    expect(normalizeText('Hello    World')).toBe('hello world');
  });

  test('handles empty string', () => {
    expect(normalizeText('')).toBe('');
  });

  test('removes special characters', () => {
    // normalizeText removes non-word characters including accents
    expect(normalizeText('café-résumé')).toBe('cafrsum');
  });
});

describe('computeHash', () => {
  test('produces deterministic output', () => {
    const hash1 = computeHash('test content');
    const hash2 = computeHash('test content');
    expect(hash1).toBe(hash2);
  });

  test('produces different hashes for different content', () => {
    const hash1 = computeHash('content A');
    const hash2 = computeHash('content B');
    expect(hash1).not.toBe(hash2);
  });

  test('produces 16-character hex string', () => {
    const hash = computeHash('test');
    expect(hash).toHaveLength(16);
    expect(/^[0-9a-f]{16}$/.test(hash)).toBe(true);
  });

  test('handles empty string', () => {
    const hash = computeHash('');
    expect(hash).toHaveLength(16);
  });

  test('handles long strings', () => {
    const longString = 'a'.repeat(10000);
    const hash = computeHash(longString);
    expect(hash).toHaveLength(16);
  });
});

describe('mintIRI', () => {
  test('generates deterministic IRIs', () => {
    const iri1 = mintIRI('http://example.org/', 'abc123', 'test content', 0);
    const iri2 = mintIRI('http://example.org/', 'abc123', 'test content', 0);
    expect(iri1).toBe(iri2);
  });

  test('includes all components', () => {
    const iri = mintIRI('http://example.org/', 'abc123', 'test', 5);
    expect(iri).toContain('doc_abc123');
    expect(iri).toContain('part_');
    expect(iri).toContain('pos_005');
  });

  test('pads position with zeros', () => {
    const iri = mintIRI('http://example.org/', 'abc', 'test', 7);
    expect(iri).toContain('pos_007');
  });

  test('different positions produce different IRIs', () => {
    const iri1 = mintIRI('http://example.org/', 'abc', 'test', 1);
    const iri2 = mintIRI('http://example.org/', 'abc', 'test', 2);
    expect(iri1).not.toBe(iri2);
  });

  test('different content produces different IRIs', () => {
    const iri1 = mintIRI('http://example.org/', 'abc', 'content A', 0);
    const iri2 = mintIRI('http://example.org/', 'abc', 'content B', 0);
    expect(iri1).not.toBe(iri2);
  });
});

describe('levenshteinDistance', () => {
  test('identical strings have distance 0', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0);
  });

  test('empty strings have distance 0', () => {
    expect(levenshteinDistance('', '')).toBe(0);
  });

  test('one empty string', () => {
    expect(levenshteinDistance('', 'hello')).toBe(5);
    expect(levenshteinDistance('hello', '')).toBe(5);
  });

  test('single character difference', () => {
    expect(levenshteinDistance('hello', 'hallo')).toBe(1);
  });

  test('multiple differences', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
  });

  test('completely different strings', () => {
    expect(levenshteinDistance('abc', 'xyz')).toBe(3);
  });
});

describe('levenshteinSimilarity', () => {
  test('identical strings have similarity 1', () => {
    expect(levenshteinSimilarity('hello', 'hello')).toBe(1);
  });

  test('completely different strings have low similarity', () => {
    const similarity = levenshteinSimilarity('abc', 'xyz');
    expect(similarity).toBeLessThan(0.5);
  });

  test('similar strings have high similarity', () => {
    const similarity = levenshteinSimilarity('hello', 'hallo');
    expect(similarity).toBeGreaterThanOrEqual(0.8); // 1 char diff / 5 chars = 0.8
  });

  test('empty strings have similarity 1', () => {
    expect(levenshteinSimilarity('', '')).toBe(1);
  });

  test('one empty string has similarity 0', () => {
    expect(levenshteinSimilarity('', 'hello')).toBe(0);
    expect(levenshteinSimilarity('hello', '')).toBe(0);
  });
});

describe('truncate', () => {
  test('does not truncate short text', () => {
    expect(truncate('short', 10)).toBe('short');
  });

  test('truncates long text', () => {
    expect(truncate('this is a very long text', 10)).toBe('this is...');
  });

  test('handles exact length', () => {
    expect(truncate('exactly10!', 10)).toBe('exactly10!');
  });

  test('adds ellipsis', () => {
    const result = truncate('long text', 5);
    expect(result).toContain('...');
    expect(result.length).toBeLessThanOrEqual(5);
  });
});

describe('iriToLabel', () => {
  test('extracts label from IRI', () => {
    const label = iriToLabel('http://example.org/concepts/knowledge_graph');
    expect(label).toBe('Knowledge graph');
  });

  test('handles hash fragments', () => {
    const label = iriToLabel('http://example.org#my_concept');
    expect(label).toBe('My concept');
  });

  test('converts underscores to spaces', () => {
    const label = iriToLabel('http://example.org/multi_word_concept');
    expect(label).toBe('Multi word concept');
  });

  test('converts hyphens to spaces', () => {
    const label = iriToLabel('http://example.org/hyphen-separated-term');
    expect(label).toBe('Hyphen separated term');
  });

  test('capitalizes first letter', () => {
    const label = iriToLabel('http://example.org/lowercase');
    expect(label).toBe('Lowercase');
  });
});
