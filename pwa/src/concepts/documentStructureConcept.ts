/**
 * Document Structure Concept
 *
 * Responsibility: Parse HTML into structured document parts with BFO-compliant IRIs
 * Phase: 1
 */

import type {
  DocumentPart,
  DocumentLoadedEvent,
  StructureReadyEvent,
  HierarchyNode,
  Concept,
  ConceptState
} from '../types/core';
import { computeHash, mintIRI } from '../utils/text';
import { eventBus } from '../utils/eventBus';

// ============================================================================
// State
// ============================================================================

interface DocumentStructureState extends ConceptState {
  currentDocumentIRI: string | null;
  parts: DocumentPart[];
  hierarchy: HierarchyNode | null;
}

const state: DocumentStructureState = {
  currentDocumentIRI: null,
  parts: [],
  hierarchy: null,
};

// ============================================================================
// Constants
// ============================================================================

const BASE_URI = 'http://example.org/';

// ============================================================================
// Actions
// ============================================================================

/**
 * Parse document structure from Mammoth HTML output
 *
 * Extracts:
 * - Headings (H1-H6)
 * - Paragraphs
 * - Lists (ordered/unordered)
 *
 * Generates deterministic IRIs per requirements Section 2.3
 *
 * @param event - DocumentLoadedEvent from documentIngestConcept
 */
function parseStructure(event: DocumentLoadedEvent): void {
  const { documentHash, metadata, rawHTML } = event;

  // Mint document-level IRI
  const documentIRI = `${BASE_URI}doc_${documentHash}`;

  // Parse HTML into DOM
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHTML, 'text/html');

  const parts: DocumentPart[] = [];
  let sequenceIndex = 0;

  // Walk document body in linear order
  for (const element of doc.body.children) {
    const tagName = element.tagName;
    const textContent = element.textContent?.trim() || '';

    // Skip empty elements
    if (!textContent) {
      continue;
    }

    // Determine part type
    if (tagName.match(/^H[1-6]$/)) {
      // Heading element
      const level = parseInt(tagName[1]);
      const contentHash = computeHash(textContent);
      const iri = mintIRI(BASE_URI, documentHash, textContent, sequenceIndex);

      parts.push({
        iri,
        type: 'heading',
        level,
        sequenceIndex,
        contentHash,
        text: textContent,
      });

      sequenceIndex++;

    } else if (tagName === 'P') {
      // Paragraph element
      const contentHash = computeHash(textContent);
      const iri = mintIRI(BASE_URI, documentHash, textContent, sequenceIndex);

      parts.push({
        iri,
        type: 'paragraph',
        sequenceIndex,
        contentHash,
        text: textContent,
      });

      sequenceIndex++;

    } else if (tagName === 'UL' || tagName === 'OL') {
      // List element
      const contentHash = computeHash(textContent);
      const iri = mintIRI(BASE_URI, documentHash, textContent, sequenceIndex);

      parts.push({
        iri,
        type: 'list',
        sequenceIndex,
        contentHash,
        text: textContent,
      });

      sequenceIndex++;

    } else if (tagName === 'TABLE') {
      // Table element (Phase 1: basic support)
      const contentHash = computeHash(textContent);
      const iri = mintIRI(BASE_URI, documentHash, textContent, sequenceIndex);

      parts.push({
        iri,
        type: 'table',
        sequenceIndex,
        contentHash,
        text: textContent,
      });

      sequenceIndex++;
    }
  }

  // Build simple hierarchy (flat for Phase 1, hierarchical in future)
  const hierarchy: HierarchyNode = {
    part: {
      iri: documentIRI,
      type: 'paragraph', // Document root treated as container
      sequenceIndex: -1,
      contentHash: '',
      text: metadata.title,
    },
    children: parts.map(part => ({
      part,
      children: [],
    })),
  };

  // Update state
  state.currentDocumentIRI = documentIRI;
  state.parts = parts;
  state.hierarchy = hierarchy;

  // Generate RDF List head IRI
  const partListIRI = `${documentIRI}_partlist_000`;

  // Emit structure ready event
  const structureEvent: StructureReadyEvent = {
    documentIRI,
    documentHash,
    parts,
    partList: partListIRI,
    hierarchy,
    metadata, // Include metadata in event to prevent race condition
  };

  console.log(`Parsed ${parts.length} document parts from "${metadata.title}"`);
  eventBus.emit('structureReady', structureEvent);
}

/**
 * Clear current structure
 */
function clearStructure(): void {
  state.currentDocumentIRI = null;
  state.parts = [];
  state.hierarchy = null;
}

// ============================================================================
// Concept Export
// ============================================================================

export const documentStructureConcept: Concept = {
  name: 'documentStructureConcept',
  state,
  actions: {
    parseStructure: parseStructure as (...args: unknown[]) => unknown,
    clearStructure: clearStructure as (...args: unknown[]) => unknown,
  },
  notify: (event: string, payload: unknown) => {
    eventBus.emit(event, payload);
  },
};
