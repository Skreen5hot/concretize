/**
 * JSON-LD Export Utilities
 *
 * Converts document structure to BFO/IAO-aligned JSON-LD
 * Phase 1: Basic document structure export
 */

import type { DocumentPart } from '../types/core';
import { IAO_URIS, getIAOTypeURI } from '../types/core';

interface JSONLDNode {
  '@id': string;
  '@type': string | string[];
  [key: string]: unknown;
}

/**
 * Export document structure as JSON-LD
 *
 * @param documentIRI - IRI of the document
 * @param parts - Array of document parts
 * @param metadata - Document metadata
 * @returns JSON-LD object with @context
 */
export function exportDocumentToJSONLD(
  documentIRI: string,
  parts: DocumentPart[],
  metadata: {
    title: string;
    fileSize: number;
    format: string;
    createdDate?: Date;
  }
): Record<string, unknown> {
  const graph: JSONLDNode[] = [];

  // Add the document node
  const docNode: JSONLDNode = {
    '@id': documentIRI,
    '@type': IAO_URIS.INFORMATION_CONTENT_ENTITY,
    'dcterms:title': metadata.title,
    'dcterms:format': metadata.format,
    'iao:hasDocumentPart': parts.map(p => ({ '@id': p.iri })),
  };

  if (metadata.createdDate) {
    docNode['dcterms:created'] = metadata.createdDate.toISOString();
  }

  graph.push(docNode);

  // Add each document part
  for (const part of parts) {
    const partNode: JSONLDNode = {
      '@id': part.iri,
      '@type': getIAOTypeURI(part.type),
      'bfo:partOf': { '@id': documentIRI },
      'concretize:sequenceIndex': part.sequenceIndex,
      'concretize:contentHash': part.contentHash,
      'concretize:textContent': part.text,
    };

    // Add type-specific properties
    if (part.type === 'heading' && 'level' in part) {
      partNode['concretize:headingLevel'] = part.level;
    }

    graph.push(partNode);
  }

  // Return with context
  const result = {
    '@context': {
      '@vocab': 'http://purl.obolibrary.org/obo/',
      'bfo': 'http://purl.obolibrary.org/obo/BFO_',
      'iao': 'http://purl.obolibrary.org/obo/IAO_',
      'dcterms': 'http://purl.org/dc/terms/',
      'concretize': 'http://example.org/concretize/',
      'partOf': { '@id': 'bfo:0000050', '@type': '@id' },
      'hasDocumentPart': { '@id': 'iao:0000219', '@type': '@id' },
    },
    '@graph': graph,
  };

  return result;
}

/**
 * Download JSON-LD as a file
 */
export function downloadJSONLD(jsonld: Record<string, unknown>, filename: string): void {
  const blob = new Blob([JSON.stringify(jsonld, null, 2)], {
    type: 'application/ld+json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
