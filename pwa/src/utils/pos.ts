/**
 * Part-of-Speech Tagging and Linguistic Analysis
 *
 * Converted from the POS proof of concept to TypeScript.
 * This provides rule-based POS tagging, chunking, and lemmatization
 * for English text without external dependencies.
 */

import type { TaggedWord, Chunk } from '../types/core';

// Type definitions for lexicon
export type POSTag = string;
export type Lexicon = Record<string, POSTag | POSTag[]>;

/**
 * Lemmatizer - converts words to their base forms
 */
export class Lemmatizer {
  private invariableNouns: Set<string>;
  private irregularNouns: Record<string, string>;
  private irregularVerbs: Record<string, string>;

  constructor() {
    this.invariableNouns = new Set([
      'aircraft', 'deer', 'fish', 'moose', 'sheep', 'species',
      'series', 'headquarters', 'news', 'mathematics', 'physics'
    ]);

    this.irregularNouns = {
      men: 'man', women: 'woman', feet: 'foot', teeth: 'tooth',
      geese: 'goose', mice: 'mouse', children: 'child', oxen: 'ox',
      people: 'person', cacti: 'cactus', fungi: 'fungus',
      alumni: 'alumnus', criteria: 'criterion', phenomena: 'phenomenon',
      analyses: 'analysis', bases: 'basis', crises: 'crisis'
    };

    this.irregularVerbs = {
      was: 'be', were: 'be', been: 'be', being: 'be',
      had: 'have', has: 'have', having: 'have',
      did: 'do', does: 'do', done: 'do', doing: 'do',
      went: 'go', gone: 'go', going: 'go',
      took: 'take', taken: 'take', taking: 'take',
      made: 'make', making: 'make',
      said: 'say', saying: 'say',
      got: 'get', gotten: 'get', getting: 'get'
    };
  }

  /**
   * Lemmatize a phrase (focuses on the last word)
   */
  lemmatize(phrase: string): string {
    if (!phrase || typeof phrase !== 'string') return '';

    const words = phrase.trim().split(/\s+/);
    const lastIdx = words.length - 1;
    const lemma = this.lemmatizeWord(words[lastIdx].toLowerCase());
    words[lastIdx] = lemma;

    return words.join(' ');
  }

  /**
   * Lemmatize a single word
   */
  private lemmatizeWord(word: string): string {
    // Check invariable nouns
    if (this.invariableNouns.has(word)) return word;

    // Check irregular forms
    if (this.irregularNouns[word]) return this.irregularNouns[word];
    if (this.irregularVerbs[word]) return this.irregularVerbs[word];

    // Regular patterns
    if (/ies$/.test(word) && word.length > 3) {
      return word.slice(0, -3) + 'y';
    }
    if (/(s|x|z|ch|sh)es$/.test(word) && word.length > 4) {
      return word.slice(0, -2);
    }
    if (/s$/.test(word) && word.length > 2 && !/ss$/.test(word)) {
      return word.slice(0, -1);
    }

    // Handle -ing and -ed
    if (/(ing|ed)$/.test(word)) {
      const stem = word.endsWith('ing') ? word.slice(0, -3) : word.slice(0, -2);
      if (stem.length >= 3) {
        // Handle doubled consonants (running -> run)
        if (stem.length > 2 &&
            stem[stem.length - 1] === stem[stem.length - 2] &&
            /[^aeiou]/.test(stem[stem.length - 1])) {
          return stem.slice(0, -1);
        }
        return stem;
      }
    }

    return word;
  }
}

/**
 * POSTagger - assigns part-of-speech tags to words
 */
export class POSTagger {
  private lexicon: Lexicon;
  private lemmatizer: Lemmatizer;

  constructor(lexicon: Lexicon = {}, _options: { debug?: boolean } = {}) {
    this.lexicon = lexicon;
    this.lemmatizer = new Lemmatizer();
    // Debug option reserved for future use
  }

  /**
   * Tokenize a sentence into words and punctuation
   */
  tokenize(sentence: string): string[] {
    if (!sentence) return [];

    const regex = /[A-Za-zÀ-ÖØ-öø-ÿ0-9]+(?:['-][A-Za-zÀ-ÖØ-öø-ÿ0-9]+)*'?|\d+(?:[.,]\d+)*|[.,!?;:()"']/g;
    const tokens: string[] = [];
    let match;

    while ((match = regex.exec(sentence)) !== null) {
      tokens.push(match[0]);
    }

    return tokens;
  }

  /**
   * Get possible POS tags for a word from the lexicon
   */
  private getLexiconTags(word: string): string[] {
    const lower = word.toLowerCase();
    const raw = this.lexicon[lower];

    if (!raw) return [];

    return Array.isArray(raw) ? raw : [raw];
  }

  /**
   * Apply suffix heuristics to guess POS tag
   */
  private suffixHeuristic(word: string): string[] {
    const w = word.toLowerCase();

    if (this.getLexiconTags(word).length > 0) return [];

    if (w.endsWith('ing')) return ['VBG', 'NN'];
    if (w.endsWith('ed')) return ['VBD', 'VBN'];
    if (w.endsWith('ly')) return ['RB'];
    if (w.endsWith('s') && w.length > 2) return ['NNS', 'VBZ'];
    if (w.endsWith('able') || w.endsWith('ible')) return ['JJ'];
    if (/^\d+(\.\d+)?$/.test(w)) return ['CD'];

    return [];
  }

  /**
   * Tag a sentence with POS tags
   */
  tagSentence(sentence: string): TaggedWord[] {
    const tokens = this.tokenize(sentence);
    const taggedWords: TaggedWord[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const word = tokens[i];

      // Handle punctuation
      if (/^[.,;:!?()]$/.test(word)) {
        const tag = word === ';' ? ':' : word;
        taggedWords.push({ word, tag });
        continue;
      }

      // Get possible tags
      let possibleTags = this.getLexiconTags(word);

      // Apply suffix heuristic if no lexicon match
      if (possibleTags.length === 0) {
        possibleTags = this.suffixHeuristic(word);
      }

      // Fallback: proper noun if capitalized, else common noun
      const tag = possibleTags[0] ||
                  (/^[A-Z]/.test(word) && i > 0 ? 'NNP' : 'NN');

      taggedWords.push({ word, tag });
    }

    return taggedWords;
  }

  /**
   * Chunk tagged words into phrases
   */
  chunk(taggedWords: TaggedWord[]): Chunk[] {
    const chunks: Chunk[] = [];
    let i = 0;

    const isNounTag = (tag: string) => /^(DT|JJ|NN|PRP|CD|POS)/.test(tag);
    const isVerbTag = (tag: string) => /^(VB|MD|RB)/.test(tag);

    while (i < taggedWords.length) {
      const current = taggedWords[i];
      const chunkWords: TaggedWord[] = [];
      let type: 'NP' | 'VP' | 'O' = 'O';

      if (isNounTag(current.tag)) {
        type = 'NP';
        while (i < taggedWords.length && isNounTag(taggedWords[i].tag)) {
          chunkWords.push(taggedWords[i]);
          i++;
        }
      } else if (isVerbTag(current.tag)) {
        type = 'VP';
        while (i < taggedWords.length && isVerbTag(taggedWords[i].tag)) {
          chunkWords.push(taggedWords[i]);
          i++;
        }
      } else {
        chunkWords.push(current);
        i++;
      }

      const originalText = chunkWords.map(w => w.word).join(' ');

      // Remove determiners before lemmatizing
      const contentWords = chunkWords.filter(w => w.tag !== 'DT');
      const conceptText = contentWords.map(w => w.word).join(' ');
      const lemmatizedText = this.lemmatizer.lemmatize(conceptText);

      chunks.push({
        taggedWords: chunkWords,
        type,
        originalText,
        lemmatizedText
      });
    }

    return chunks;
  }
}

/**
 * Extract noun phrases from text
 */
export function extractNounPhrases(text: string): Array<{ text: string; type: 'proper' | 'common' }> {
  const nounPhrases: Array<{ text: string; type: 'proper' | 'common' }> = [];

  // Proper nouns: 2+ capitalized words
  const properNounPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
  let match;

  while ((match = properNounPattern.exec(text)) !== null) {
    nounPhrases.push({
      text: match[1],
      type: 'proper'
    });
  }

  return nounPhrases;
}

/**
 * Extract acronyms from text
 */
export function extractAcronyms(text: string): Array<{ acronym: string; expansion?: string }> {
  const acronyms: Array<{ acronym: string; expansion?: string }> = [];

  // Pattern: ACRONYM (Expansion)
  const expansionPattern = /\b([A-Z]{2,6})\s*\(([^)]+)\)/g;
  let match;

  while ((match = expansionPattern.exec(text)) !== null) {
    acronyms.push({
      acronym: match[1],
      expansion: match[2]
    });
  }

  // Standalone acronyms
  const standalonePattern = /\b([A-Z]{2,6})\b/g;
  while ((match = standalonePattern.exec(text)) !== null) {
    if (!acronyms.some(a => a.acronym === match![1])) {
      acronyms.push({
        acronym: match[1]
      });
    }
  }

  return acronyms;
}
