/**
 * Core type definitions for the Concretize PWA
 * Following BFO/IAO ontological principles
 */

// ============================================================================
// Document Identity and Structure
// ============================================================================

export interface DocumentMetadata {
  documentHash: string;
  title: string;
  author?: string;
  createdDate?: Date;
  fileSize: number;
  format: string;
}

export interface DocumentPart {
  iri: string;
  type: 'paragraph' | 'heading' | 'list' | 'table';
  level?: number; // For headings (H1=1, H2=2, etc.)
  sequenceIndex: number;
  contentHash: string;
  text: string;
  parentIRI?: string;
}

export interface HierarchyNode {
  part: DocumentPart;
  children: HierarchyNode[];
}

// ============================================================================
// Linguistic Analysis
// ============================================================================

export interface NounPhrase {
  text: string;
  normalizedText: string;
  position: { start: number; end: number };
  type: 'common' | 'proper';
}

export interface Acronym {
  acronym: string;
  expansion?: string;
  position: { start: number; end: number };
}

export interface PartAnnotation {
  partIRI: string;
  nounPhrases: NounPhrase[];
  acronyms: Acronym[];
}

export interface AnalysisStatistics {
  totalParts: number;
  nounPhrases: number;
  properNouns: number;
  acronyms: number;
  processingTimeMs: number;
}

// ============================================================================
// Ontology Mapping
// ============================================================================

export interface OntologyConcept {
  iri: string;
  label: string;
  definition?: string;
  altLabels?: string[];
}

export interface ConceptMapping {
  partIRI: string;
  nounPhrase: string;
  conceptIRI: string;
  conceptLabel: string;
  confidence: number;
  method: 'exact_label' | 'exact_altLabel' | 'fuzzy_match' | 'user_selected';
  disambiguated: boolean;
}

export interface CandidateMapping {
  partIRI: string;
  nounPhrase: string;
  candidateIRI: string;
}

export interface DisambiguationRequest {
  nounPhrase: string;
  partIRI: string;
  candidates: Array<{ concept: OntologyConcept; confidence: number }>;
}

export interface ValidationError {
  severity: 'error' | 'warning';
  message: string;
  conceptIRI?: string;
}

// ============================================================================
// Event Payload Types
// ============================================================================

export interface DocumentLoadedEvent {
  documentHash: string;
  metadata: DocumentMetadata;
  rawHTML: string;
  rawText: string;
}

export interface StructureReadyEvent {
  documentIRI: string;
  documentHash: string;
  parts: DocumentPart[];
  partList: string;
  hierarchy: HierarchyNode;
}

export interface AnalysisCompleteEvent {
  documentIRI: string;
  annotations: PartAnnotation[];
  statistics: AnalysisStatistics;
}

export interface OntologyReadyEvent {
  conceptCount: number;
  validationErrors: ValidationError[];
}

export interface MappingsReadyEvent {
  documentIRI: string;
  mappings: ConceptMapping[];
  candidates: CandidateMapping[];
  statistics: {
    totalPhrases: number;
    exactMatches: number;
    fuzzyMatches: number;
    disambiguated: number;
    unmapped: number;
  };
}

export interface GraphReadyEvent {
  documentIRI: string;
  formats: {
    turtle: string;
    jsonld: string;
  };
  statistics: GraphStatistics;
  downloadURLs: {
    turtle: string;
    jsonld: string;
  };
}

export interface GraphStatistics {
  totalTriples: number;
  documentParts: number;
  aboutnessAssertions: number;
  candidateConcepts: number;
}

export interface PipelineProgress {
  stage: string;
  currentTask: string;
  percentComplete: number;
  warnings: Array<{ message: string }>;
}

// ============================================================================
// Concept State Types
// ============================================================================

export interface ConceptState {
  [key: string]: unknown;
}

export interface ConceptActions {
  [key: string]: (...args: unknown[]) => unknown | Promise<unknown>;
}

export interface Concept {
  name: string;
  state: ConceptState;
  actions: ConceptActions;
  notify: (event: string, payload: unknown) => void;
}

// ============================================================================
// POS Tagging Types (from proof of concept)
// ============================================================================

export interface TaggedWord {
  word: string;
  tag: string;
}

export interface Chunk {
  taggedWords: TaggedWord[];
  type: 'NP' | 'VP' | 'O';
  originalText: string;
  lemmatizedText: string;
}

// ============================================================================
// Storage Types
// ============================================================================

export interface CachedDocument {
  hash: string;
  file: ArrayBuffer;
  uploadTime: Date;
}

export interface CachedStructure {
  hash: string;
  parts: DocumentPart[];
  parsedTime: Date;
}

export interface CachedPOSResults {
  hash: string;
  annotations: PartAnnotation[];
}

export interface UserMapping {
  documentHash: string;
  nounPhrase: string;
  conceptIRI: string;
  timestamp: Date;
}

export interface CachedGraph {
  hash: string;
  turtle: string;
  jsonld: string;
  createdTime: Date;
}
