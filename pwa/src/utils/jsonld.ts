/**
 * JSON-LD Export Utilities
 *
 * Converts document structure to BFO/IAO-compliant JSON-LD
 * Phase 1: Ontologically rigorous document structure export
 *
 * Ontological Design:
 * - Separates ICE (information content) from material bearer (digital file)
 * - Uses proper BFO relations (partOf, bearerOf)
 * - Includes provenance metadata
 * - Models text as representation, not intrinsic property
 */

import type { DocumentPart } from '../types/core';
import { IAO_URIS, getIAOTypeURI } from '../types/core';

interface JSONLDNode {
  '@id': string;
  '@type': string | string[];
  [key: string]: unknown;
}

/**
 * Generate IRI for ICE (Information Content Entity)
 */
function generateICE_IRI(baseIRI: string): string {
  return `${baseIRI}_ice`;
}

/**
 * Generate IRI for digital bearer (file artifact)
 */
function generateBearerIRI(baseIRI: string): string {
  return `${baseIRI}_file`;
}

/**
 * Generate IRI for part ICE
 */
function generatePartICE_IRI(partIRI: string): string {
  return `${partIRI}_ice`;
}

/**
 * Export document structure as BFO/IAO-compliant JSON-LD
 *
 * Ontological structure:
 * 1. Digital File Artifact (Material Entity) - the .docx file
 * 2. Document ICE (Information Content Entity) - what the document says
 * 3. Part ICEs (Information Content Entities) - what each part says
 * 4. Provenance Activity - how the JSON-LD was generated
 *
 * @param documentIRI - Base IRI for the document
 * @param parts - Array of document parts
 * @param metadata - Document metadata
 * @returns JSON-LD object with @context and @graph
 */
export function exportDocumentToJSONLD(
  documentIRI: string,
  parts: DocumentPart[],
  metadata: {
    title: string;
    fileSize: number;
    format: string;
    createdDate?: Date;
    documentHash: string;
  }
): Record<string, unknown> {
  const graph: JSONLDNode[] = [];
  const exportTimestamp = new Date().toISOString();

  // IRI generation
  const fileArtifactIRI = generateBearerIRI(documentIRI);
  const documentICE_IRI = generateICE_IRI(documentIRI);
  const provenanceActivityIRI = `${documentIRI}_generation`;

  // ========================================================================
  // 1. DIGITAL FILE ARTIFACT (Material Entity - Information Bearing Artifact)
  // ========================================================================
  // This is the .docx file itself - a material entity with mass, format, size
  const fileArtifact: JSONLDNode = {
    '@id': fileArtifactIRI,
    '@type': 'concretize:InformationBearingArtifact', // Subclass of BFO Material Entity
    'rdfs:comment': 'The digital file artifact (.docx) that bears the information content',
    'dcterms:format': metadata.format,
    'concretize:fileSize': metadata.fileSize,
    'concretize:contentHash': metadata.documentHash,
    'iao:0000027': { '@id': documentICE_IRI }, // bearer_of relation
  };

  if (metadata.createdDate) {
    fileArtifact['dcterms:created'] = metadata.createdDate.toISOString();
  }

  graph.push(fileArtifact);

  // ========================================================================
  // 2. DOCUMENT ICE (Information Content Entity)
  // ========================================================================
  // This is the abstract information content - what the document is about
  const documentICE: JSONLDNode = {
    '@id': documentICE_IRI,
    '@type': IAO_URIS.INFORMATION_CONTENT_ENTITY,
    'rdfs:label': metadata.title,
    'rdfs:comment': 'The information content entity representing what the document expresses',
    'dcterms:title': metadata.title,
    'iao:0000219': parts.map(p => ({ '@id': generatePartICE_IRI(p.iri) })), // has_part
    // Note: Aboutness relations (iao:0000136) would be added in Phase 2/3
    // when we extract entities and map to domain ontologies
  };

  graph.push(documentICE);

  // ========================================================================
  // 3. DOCUMENT PART ICEs (Information Content Entities)
  // ========================================================================
  // Each part (paragraph, heading, etc.) is an ICE that is part of the document ICE
  for (const part of parts) {
    const partICE_IRI = generatePartICE_IRI(part.iri);

    const partICE: JSONLDNode = {
      '@id': partICE_IRI,
      '@type': getIAOTypeURI(part.type),
      'bfo:0000050': { '@id': documentICE_IRI }, // part_of relation (BFO_0000050)
      'rdfs:comment': `Information content entity for ${part.type} at position ${part.sequenceIndex}`,

      // Text representation (not a property, but how the ICE is represented)
      'concretize:hasTextRepresentation': {
        '@type': 'concretize:TextualRepresentation',
        'rdf:value': part.text,
        '@language': 'en', // Assuming English, should be detected in production
      },

      // Structural metadata
      'concretize:position': {
        '@type': 'concretize:SequencePosition',
        'concretize:index': part.sequenceIndex,
        'concretize:contentHash': part.contentHash,
      },
    };

    // Add type-specific structural information
    if (part.type === 'heading' && 'level' in part) {
      partICE['concretize:hasStructuralRole'] = {
        '@type': 'concretize:HeadingRole',
        'concretize:nestingDepth': part.level,
        'rdfs:comment': `Heading at nesting level ${part.level}`,
      };
    }

    graph.push(partICE);
  }

  // ========================================================================
  // 4. PROVENANCE ACTIVITY (PROV-O)
  // ========================================================================
  // Document how this JSON-LD was generated
  const provenanceActivity: JSONLDNode = {
    '@id': provenanceActivityIRI,
    '@type': 'prov:Activity',
    'rdfs:label': 'JSON-LD Generation Activity',
    'prov:used': { '@id': fileArtifactIRI }, // Used the file artifact
    'prov:generated': { '@id': documentICE_IRI }, // Generated the ICE representation
    'prov:wasAssociatedWith': {
      '@id': 'http://example.org/software/concretize-pwa',
      '@type': 'prov:SoftwareAgent',
      'rdfs:label': 'Concretize PWA',
      'schema:softwareVersion': '2.0.0',
      'rdfs:comment': 'Document-to-BFO knowledge graph converter',
    },
    'prov:endedAtTime': exportTimestamp,
    'prov:wasInformedBy': {
      '@id': `${documentIRI}_parsing_activity`,
      '@type': 'prov:Activity',
      'rdfs:label': 'Document Parsing Activity',
      'prov:used': { '@id': fileArtifactIRI },
    },
  };

  graph.push(provenanceActivity);

  // ========================================================================
  // 5. CONTEXT AND RETURN
  // ========================================================================
  const result = {
    '@context': {
      // Vocabularies
      '@vocab': 'http://purl.obolibrary.org/obo/',
      'bfo': 'http://purl.obolibrary.org/obo/BFO_',
      'iao': 'http://purl.obolibrary.org/obo/IAO_',
      'obo': 'http://purl.obolibrary.org/obo/',
      'dcterms': 'http://purl.org/dc/terms/',
      'prov': 'http://www.w3.org/ns/prov#',
      'schema': 'http://schema.org/',
      'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
      'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      'xsd': 'http://www.w3.org/2001/XMLSchema#',
      'concretize': 'http://example.org/concretize/',

      // BFO Relations
      'partOf': { '@id': 'bfo:0000050', '@type': '@id' },
      'hasPart': { '@id': 'bfo:0000051', '@type': '@id' },
      'bearerOf': { '@id': 'iao:0000027', '@type': '@id' },
      'isAbout': { '@id': 'iao:0000136', '@type': '@id' },

      // IAO Relations
      'hasDocumentPart': { '@id': 'iao:0000219', '@type': '@id' },

      // PROV Relations
      'wasGeneratedBy': { '@id': 'prov:wasGeneratedBy', '@type': '@id' },
      'used': { '@id': 'prov:used', '@type': '@id' },
      'wasAssociatedWith': { '@id': 'prov:wasAssociatedWith', '@type': '@id' },

      // Custom properties with proper typing
      'fileSize': { '@id': 'concretize:fileSize', '@type': 'xsd:integer' },
      'index': { '@id': 'concretize:index', '@type': 'xsd:integer' },
      'nestingDepth': { '@id': 'concretize:nestingDepth', '@type': 'xsd:integer' },
      'contentHash': { '@id': 'concretize:contentHash', '@type': 'xsd:string' },
    },
    '@graph': graph,
  };

  return result;
}

/**
 * Download JSON-LD as a file
 *
 * @param jsonld - JSON-LD object to download
 * @param filename - Name for the downloaded file
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
