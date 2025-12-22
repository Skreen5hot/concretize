# Concretize: Phased Project Plan
## Document-to-BFO Knowledge Graph PWA

---

## Document Metadata

| Field | Value |
|-------|-------|
| **Version** | 1.0.0 |
| **Created** | 2025-01-15 |
| **Status** | Planning - Ready for Implementation |
| **Architecture** | Concepts + Synchronizations Pattern |
| **Target** | Progressive Web App (Offline-First) |

---

## Executive Summary

This phased plan implements a BFO-compliant knowledge graph generator from Word documents, following the MIT CSAIL "Concepts and Synchronizations" pattern. The project prioritizes:

1. **Ontological Realism**: Strict BFO 2020 / IAO compliance
2. **Deterministic Processing**: Reproducible, testable outcomes
3. **Offline-First Architecture**: Zero external dependencies
4. **Modular Development**: Independent, event-driven concepts

**Total Estimated Phases**: 6 (Foundation → Production-Ready)

---

## Phase 0: Project Foundation & Architecture Setup

### Objectives
- Establish development environment
- Implement core architectural patterns
- Create foundational utilities and types
- Set up testing infrastructure

### Deliverables

#### 0.1 Project Scaffolding
```
/pwa
 ├── index.html
 ├── manifest.json
 ├── /src
 │    ├── /concepts          # Independent concept modules
 │    ├── /synchronizations  # Event-driven connections
 │    ├── /types             # Shared TypeScript interfaces
 │    ├── /utils             # Pure utility functions
 │    ├── /workers           # Web Worker scripts
 │    ├── /ui                # UI components
 │    └── main.ts
 ├── /tests
 │    ├── /unit
 │    ├── /integration
 │    └── /fixtures          # Test data
 ├── vite.config.ts
 ├── tsconfig.json
 └── package.json
```

#### 0.2 Core Type Definitions (`/types/core.ts`)
```typescript
// Document identity and structure
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
  level?: number;
  sequenceIndex: number;
  contentHash: string;
  text: string;
  parentIRI?: string;
}

// Linguistic analysis
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

// Ontology mapping
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

// Event payload types
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

export interface HierarchyNode {
  part: DocumentPart;
  children: HierarchyNode[];
}
```

#### 0.3 Event Bus Implementation (`/utils/eventBus.ts`)
```typescript
type EventHandler = (payload: any) => void | Promise<void>;

class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  subscribe(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => this.handlers.get(event)?.delete(handler);
  }

  async emit(event: string, payload: any): Promise<void> {
    const handlers = this.handlers.get(event);
    if (!handlers) return;

    await Promise.all(
      Array.from(handlers).map(handler => handler(payload))
    );
  }
}

export const eventBus = new EventBus();
```

#### 0.4 Pure Utility Functions (`/utils/text.ts`)
```typescript
import { createHash } from 'crypto';

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '');
}

export function computeHash(content: string): string {
  return createHash('sha256')
    .update(content, 'utf8')
    .digest('hex')
    .substring(0, 16);
}

export function mintIRI(
  baseURI: string,
  docHash: string,
  content: string,
  position: number
): string {
  const contentHash = computeHash(content);
  return `${baseURI}doc_${docHash}_part_${contentHash}_pos_${String(position).padStart(3, '0')}`;
}
```

#### 0.5 Testing Infrastructure
- **Framework**: Vitest
- **Coverage Target**: 80% minimum
- **Test Categories**:
  - Unit tests: Pure functions, concept actions
  - Integration tests: Event flows, synchronizations
  - E2E tests: Full pipeline with fixtures

**Test Example** (`/tests/unit/utils/text.test.ts`):
```typescript
import { describe, test, expect } from 'vitest';
import { normalizeText, computeHash } from '@/utils/text';

describe('normalizeText', () => {
  test('converts to lowercase and trims', () => {
    expect(normalizeText('  Hello World  ')).toBe('hello world');
  });

  test('removes punctuation', () => {
    expect(normalizeText('Hello, World!')).toBe('hello world');
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
});
```

### Success Criteria
- [ ] Build system functional (Vite + TypeScript)
- [ ] Event bus operational with test coverage
- [ ] Core types defined and documented
- [ ] Utility functions tested (>90% coverage)
- [ ] Project structure follows architectural pattern

### Dependencies
None (foundation phase)

### Estimated Duration
3-5 days

---

## Phase 1: Document Ingestion & Structure Extraction

### Objectives
- Implement document file upload and parsing
- Extract structural elements (paragraphs, headings, lists)
- Generate deterministic IRIs
- Build ordered document representation

### Concepts to Implement

#### 1.1 `documentIngestConcept.ts`

**Responsibility**: Accept Word documents, parse via Mammoth.js, emit document loaded event

**State**:
```typescript
interface DocumentIngestState {
  currentDocument: File | null;
  isProcessing: boolean;
  error: string | null;
}
```

**Actions**:
```typescript
actions: {
  async uploadDocument(file: File): Promise<void> {
    // Validate file type and size
    if (!file.name.endsWith('.docx')) {
      this.state.error = 'Only .docx files supported';
      this.notify('uploadError', { message: this.state.error });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      this.state.error = 'File exceeds 50MB limit';
      this.notify('uploadError', { message: this.state.error });
      return;
    }

    this.state.isProcessing = true;
    this.state.currentDocument = file;

    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Parse with Mammoth
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const rawHTML = result.value;

      // Extract plain text
      const textResult = await mammoth.extractRawText({ arrayBuffer });
      const rawText = textResult.value;

      // Generate document identity hash
      const metadata: DocumentMetadata = {
        documentHash: computeHash(file.name + file.size + file.lastModified),
        title: file.name.replace('.docx', ''),
        fileSize: file.size,
        format: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        createdDate: new Date(file.lastModified)
      };

      this.state.isProcessing = false;
      this.notify('documentLoaded', { metadata, rawHTML, rawText });

    } catch (error) {
      this.state.isProcessing = false;
      this.state.error = 'Failed to parse document';
      this.notify('uploadError', { message: this.state.error });
    }
  }
}
```

**Events Emitted**:
- `documentLoaded` → Payload: `DocumentLoadedEvent`
- `uploadError` → Payload: `{ message: string }`

**Tests**:
```typescript
test('uploadDocument rejects non-docx files', async () => {
  const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
  await documentIngestConcept.actions.uploadDocument(mockFile);
  expect(documentIngestConcept.state.error).toContain('Only .docx');
});

test('uploadDocument emits documentLoaded on success', async () => {
  const mockNotify = vi.fn();
  documentIngestConcept.notify = mockNotify;

  const mockFile = new File(['<p>Test</p>'], 'test.docx', { type: 'application/vnd...' });
  await documentIngestConcept.actions.uploadDocument(mockFile);

  expect(mockNotify).toHaveBeenCalledWith('documentLoaded', expect.objectContaining({
    metadata: expect.any(Object),
    rawHTML: expect.any(String)
  }));
});
```

#### 1.2 `documentStructureConcept.ts`

**Responsibility**: Parse HTML into structured document parts with IRIs

**State**:
```typescript
interface DocumentStructureState {
  currentDocumentIRI: string | null;
  parts: DocumentPart[];
  hierarchy: HierarchyNode | null;
}
```

**Actions**:
```typescript
actions: {
  parseStructure(event: DocumentLoadedEvent): void {
    const { documentHash, metadata, rawHTML } = event;

    // Mint document IRI
    const baseURI = 'http://example.org/';
    const documentIRI = `${baseURI}doc_${documentHash}`;

    // Parse HTML into DOM
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHTML, 'text/html');

    const parts: DocumentPart[] = [];
    let sequenceIndex = 0;

    // Walk document in order
    for (const element of doc.body.children) {
      if (element.tagName.match(/^H[1-6]$/)) {
        parts.push({
          iri: mintIRI(baseURI, documentHash, element.textContent!, sequenceIndex),
          type: 'heading',
          level: parseInt(element.tagName[1]),
          sequenceIndex: sequenceIndex++,
          contentHash: computeHash(element.textContent!),
          text: element.textContent!
        });
      } else if (element.tagName === 'P') {
        parts.push({
          iri: mintIRI(baseURI, documentHash, element.textContent!, sequenceIndex),
          type: 'paragraph',
          sequenceIndex: sequenceIndex++,
          contentHash: computeHash(element.textContent!),
          text: element.textContent!
        });
      } else if (element.tagName === 'UL' || element.tagName === 'OL') {
        parts.push({
          iri: mintIRI(baseURI, documentHash, element.textContent!, sequenceIndex),
          type: 'list',
          sequenceIndex: sequenceIndex++,
          contentHash: computeHash(element.textContent!),
          text: element.textContent!
        });
      }
    }

    // Build hierarchy (simplified - just flat for now)
    const hierarchy: HierarchyNode = {
      part: { iri: documentIRI, type: 'paragraph', sequenceIndex: -1, contentHash: '', text: metadata.title },
      children: parts.map(p => ({ part: p, children: [] }))
    };

    this.state.currentDocumentIRI = documentIRI;
    this.state.parts = parts;
    this.state.hierarchy = hierarchy;

    this.notify('structureReady', {
      documentIRI,
      documentHash,
      parts,
      partList: `${documentIRI}_partlist_000`,
      hierarchy
    });
  }
}
```

**Events Listened**:
- `documentLoaded`

**Events Emitted**:
- `structureReady` → Payload: `StructureReadyEvent`

**Tests**:
```typescript
test('parseStructure extracts paragraphs', () => {
  const event: DocumentLoadedEvent = {
    documentHash: 'abc123',
    metadata: { title: 'Test Doc', fileSize: 1000, format: 'docx' },
    rawHTML: '<p>First paragraph</p><p>Second paragraph</p>',
    rawText: 'First paragraph\nSecond paragraph'
  };

  documentStructureConcept.actions.parseStructure(event);

  expect(documentStructureConcept.state.parts).toHaveLength(2);
  expect(documentStructureConcept.state.parts[0].type).toBe('paragraph');
  expect(documentStructureConcept.state.parts[0].text).toBe('First paragraph');
});

test('parseStructure generates deterministic IRIs', () => {
  const event: DocumentLoadedEvent = { /* same as above */ };

  documentStructureConcept.actions.parseStructure(event);
  const iri1 = documentStructureConcept.state.parts[0].iri;

  // Reset and re-parse
  documentStructureConcept.state.parts = [];
  documentStructureConcept.actions.parseStructure(event);
  const iri2 = documentStructureConcept.state.parts[0].iri;

  expect(iri1).toBe(iri2);
});
```

### Synchronizations

```typescript
// /synchronizations.ts
import { eventBus } from '@/utils/eventBus';
import { documentIngestConcept } from '@/concepts/documentIngest';
import { documentStructureConcept } from '@/concepts/documentStructure';

export function initializePhase1Synchronizations() {
  eventBus.subscribe('documentLoaded', (payload) => {
    documentStructureConcept.actions.parseStructure(payload);
  });
}
```

### UI Components (Minimal)

```typescript
// /ui/DocumentUpload.ts
export class DocumentUpload {
  render() {
    return `
      <div class="upload-zone">
        <input type="file" id="docUpload" accept=".docx" />
        <label for="docUpload">Upload Word Document</label>
        <div id="uploadStatus"></div>
      </div>
    `;
  }

  attachListeners() {
    const input = document.getElementById('docUpload') as HTMLInputElement;
    input.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        documentIngestConcept.actions.uploadDocument(file);
      }
    });

    eventBus.subscribe('uploadError', ({ message }) => {
      document.getElementById('uploadStatus')!.textContent = `Error: ${message}`;
    });

    eventBus.subscribe('structureReady', ({ parts }) => {
      document.getElementById('uploadStatus')!.textContent =
        `✓ Parsed ${parts.length} document parts`;
    });
  }
}
```

### Success Criteria
- [ ] Upload .docx files via UI
- [ ] Parse documents into structured parts
- [ ] Generate deterministic IRIs (identical re-upload = same IRIs)
- [ ] Preserve linear order (sequenceIndex)
- [ ] Unit tests for both concepts (>85% coverage)
- [ ] Integration test: upload → parse → verify structure

### Dependencies
- Mammoth.js (1.6.0+)
- Phase 0 complete

### Estimated Duration
5-7 days

---

## Phase 2: Linguistic Analysis (POS Processing)

### Objectives
- Implement rule-based POS analysis in Web Worker
- Extract noun phrases, proper nouns, acronyms
- Handle acronym expansions
- Report progress for long documents

### Concepts to Implement

#### 2.1 `posAnalysisConcept.ts` (Main Thread Coordinator)

**Responsibility**: Manage Web Worker lifecycle, coordinate POS analysis

**State**:
```typescript
interface POSAnalysisState {
  worker: Worker | null;
  isProcessing: boolean;
  progress: number;
  currentDocumentHash: string | null;
}
```

**Actions**:
```typescript
actions: {
  async analyze(event: StructureReadyEvent): Promise<void> {
    this.state.isProcessing = true;
    this.state.currentDocumentHash = event.documentHash;
    this.state.progress = 0;

    // Spawn worker
    this.state.worker = new Worker(new URL('../workers/posWorker.ts', import.meta.url));

    this.state.worker.onmessage = (e) => {
      const { type, payload } = e.data;

      if (type === 'progress') {
        this.state.progress = payload.percentComplete;
        this.notify('analysisProgress', payload);
      } else if (type === 'complete') {
        this.state.isProcessing = false;
        this.state.progress = 100;
        this.notify('analysisComplete', {
          documentIRI: event.documentIRI,
          annotations: payload.annotations,
          statistics: payload.statistics
        });
        this.state.worker?.terminate();
      } else if (type === 'error') {
        this.state.isProcessing = false;
        this.notify('analysisError', { message: payload.message });
        this.state.worker?.terminate();
      }
    };

    // Send work to worker
    this.state.worker.postMessage({
      type: 'analyze',
      parts: event.parts
    });
  }
}
```

#### 2.2 Web Worker (`/workers/posWorker.ts`)

**Responsibility**: Execute POS analysis on document parts

```typescript
import { DocumentPart, NounPhrase, Acronym } from '@/types/core';

const PROGRESS_INTERVAL = 50; // Report every 50 parts

self.onmessage = (e) => {
  const { type, parts } = e.data;

  if (type === 'analyze') {
    try {
      const annotations = analyzeParts(parts);

      self.postMessage({
        type: 'complete',
        payload: {
          annotations,
          statistics: {
            totalParts: parts.length,
            nounPhrases: annotations.reduce((sum, a) => sum + a.nounPhrases.length, 0),
            properNouns: annotations.reduce((sum, a) => sum + a.nounPhrases.filter(np => np.type === 'proper').length, 0),
            acronyms: annotations.reduce((sum, a) => sum + a.acronyms.length, 0),
            processingTimeMs: 0
          }
        }
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        payload: { message: error.message }
      });
    }
  }
};

function analyzeParts(parts: DocumentPart[]) {
  const annotations = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    annotations.push({
      partIRI: part.iri,
      nounPhrases: extractNounPhrases(part.text),
      acronyms: extractAcronyms(part.text)
    });

    // Report progress
    if ((i + 1) % PROGRESS_INTERVAL === 0) {
      self.postMessage({
        type: 'progress',
        payload: {
          processed: i + 1,
          total: parts.length,
          percentComplete: Math.round(((i + 1) / parts.length) * 100)
        }
      });
    }
  }

  return annotations;
}

function extractAcronyms(text: string): Acronym[] {
  const acronyms: Acronym[] = [];

  // Pattern: ACRONYM (Expansion)
  const expansionPattern = /\b([A-Z]{2,6})\s*\(([^)]+)\)/g;
  let match;

  while ((match = expansionPattern.exec(text)) !== null) {
    acronyms.push({
      acronym: match[1],
      expansion: match[2],
      position: { start: match.index, end: match.index + match[0].length }
    });
  }

  // Standalone acronyms
  const standalonePattern = /\b([A-Z]{2,6})\b/g;
  while ((match = standalonePattern.exec(text)) !== null) {
    // Skip if already found with expansion
    if (!acronyms.some(a => a.acronym === match![1])) {
      acronyms.push({
        acronym: match[1],
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
  }

  return acronyms;
}

function extractNounPhrases(text: string): NounPhrase[] {
  // Simplified noun phrase extraction
  // Pattern: Capitalized words, or common noun sequences
  const nounPhrases: NounPhrase[] = [];

  // Proper noun pattern: 2+ capitalized words
  const properNounPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g;
  let match;

  while ((match = properNounPattern.exec(text)) !== null) {
    nounPhrases.push({
      text: match[1],
      normalizedText: match[1].toLowerCase(),
      position: { start: match.index, end: match.index + match[0].length },
      type: 'proper'
    });
  }

  // Common noun phrases (simplified - needs lexicon in production)
  const commonNounPattern = /\b([a-z]+(?:\s+[a-z]+){1,3})\b/g;
  while ((match = commonNounPattern.exec(text)) !== null) {
    // Basic filter: must contain known noun (would use lexicon)
    if (match[1].includes('graph') || match[1].includes('document')) {
      nounPhrases.push({
        text: match[1],
        normalizedText: match[1],
        position: { start: match.index, end: match.index + match[0].length },
        type: 'common'
      });
    }
  }

  return nounPhrases;
}
```

### Synchronizations

```typescript
export function initializePhase2Synchronizations() {
  eventBus.subscribe('structureReady', (payload) => {
    posAnalysisConcept.actions.analyze(payload);
  });
}
```

### Tests

```typescript
// Worker test (using vitest-worker-threads)
test('extractAcronyms finds expansions', () => {
  const text = 'The FDA (Food and Drug Administration) requires compliance.';
  const acronyms = extractAcronyms(text);

  expect(acronyms).toHaveLength(1);
  expect(acronyms[0].acronym).toBe('FDA');
  expect(acronyms[0].expansion).toBe('Food and Drug Administration');
});

test('extractNounPhrases finds proper nouns', () => {
  const text = 'John Smith and Mary Johnson attended the meeting.';
  const nps = extractNounPhrases(text);

  expect(nps).toContainEqual(expect.objectContaining({
    text: 'John Smith',
    type: 'proper'
  }));
});

// Integration test
test('posAnalysisConcept processes document and emits event', async () => {
  const mockEvent: StructureReadyEvent = {
    documentIRI: 'http://example.org/doc_abc',
    documentHash: 'abc123',
    parts: [
      { iri: 'http://example.org/part1', type: 'paragraph', sequenceIndex: 0, contentHash: 'hash1', text: 'The FDA (Food and Drug Administration) regulates drugs.' }
    ],
    partList: 'list_000',
    hierarchy: { part: null, children: [] }
  };

  const completeHandler = vi.fn();
  eventBus.subscribe('analysisComplete', completeHandler);

  await posAnalysisConcept.actions.analyze(mockEvent);

  // Wait for worker
  await new Promise(resolve => setTimeout(resolve, 100));

  expect(completeHandler).toHaveBeenCalled();
  expect(completeHandler.mock.calls[0][0].annotations).toHaveLength(1);
});
```

### Success Criteria
- [ ] Web Worker successfully analyzes document parts
- [ ] Acronym extraction works (with and without expansions)
- [ ] Noun phrase extraction functional (basic patterns)
- [ ] Progress reporting works for long documents
- [ ] Worker terminates cleanly after completion
- [ ] Unit tests for extraction functions (>85% coverage)

### Dependencies
- Phase 1 complete
- Web Worker support in build system

### Estimated Duration
7-10 days

---

## Phase 3: Ontology Management & Matching

### Objectives
- Load and validate domain ontologies
- Build in-memory index for fast matching
- Implement exact and fuzzy matching algorithms
- Handle match disambiguation

### Concepts to Implement

#### 3.1 `ontologyManagementConcept.ts`

**Responsibility**: Load, validate, and index domain ontologies

**State**:
```typescript
interface OntologyManagementState {
  ontologyIndex: OntologyIndex | null;
  currentOntologyIRI: string | null;
  isLoaded: boolean;
  validationErrors: ValidationError[];
}

class OntologyIndex {
  concepts: Map<string, OntologyConcept> = new Map();
  labelIndex: Map<string, string[]> = new Map();
  altLabelIndex: Map<string, string[]> = new Map();

  load(store: N3.Store): void { /* implementation */ }
  exactMatch(nounPhrase: string): OntologyConcept[] { /* implementation */ }
  fuzzyMatch(nounPhrase: string, threshold: number): Array<{concept: OntologyConcept, similarity: number}> { /* implementation */ }
}
```

**Actions**:
```typescript
actions: {
  async loadOntology(file: File): Promise<void> {
    try {
      const text = await file.text();

      // Parse RDF (Turtle or JSON-LD)
      const store = new N3.Store();
      const parser = new N3.Parser();

      await new Promise((resolve, reject) => {
        parser.parse(text, (error, quad, prefixes) => {
          if (error) reject(error);
          if (quad) store.addQuad(quad);
          else resolve(null);
        });
      });

      // Validate (simplified - full SHACL validation in production)
      const validationErrors = this.validateOntology(store);
      this.state.validationErrors = validationErrors;

      if (validationErrors.some(e => e.severity === 'error')) {
        this.notify('ontologyLoadError', { errors: validationErrors });
        return;
      }

      // Build index
      const index = new OntologyIndex();
      index.load(store);

      this.state.ontologyIndex = index;
      this.state.isLoaded = true;

      this.notify('ontologyReady', {
        conceptCount: index.concepts.size,
        validationErrors
      });

    } catch (error) {
      this.notify('ontologyLoadError', { message: error.message });
    }
  },

  validateOntology(store: N3.Store): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check each concept has rdfs:label
    const concepts = store.getQuads(null, RDF.type, OWL.Class);
    for (const quad of concepts) {
      const labels = store.getQuads(quad.subject, RDFS.label, null);
      if (labels.length === 0) {
        errors.push({
          severity: 'warning',
          message: `Concept ${quad.subject.value} missing rdfs:label`,
          conceptIRI: quad.subject.value
        });
      }
    }

    return errors;
  }
}
```

#### 3.2 `aboutnessResolutionConcept.ts`

**Responsibility**: Match noun phrases to ontology concepts, handle disambiguation

**State**:
```typescript
interface AboutnessResolutionState {
  mappings: ConceptMapping[];
  candidates: CandidateMapping[];
  pendingDisambiguations: DisambiguationRequest[];
  disambiguationCache: Map<string, string>; // nounPhrase -> conceptIRI
}

interface DisambiguationRequest {
  nounPhrase: string;
  partIRI: string;
  candidates: Array<{ concept: OntologyConcept; confidence: number }>;
}
```

**Actions**:
```typescript
actions: {
  async matchConcepts(event: AnalysisCompleteEvent): Promise<void> {
    if (!ontologyManagementConcept.state.isLoaded) {
      // Fallback: all NPs become candidates
      this.createAllCandidates(event.annotations);
      return;
    }

    const index = ontologyManagementConcept.state.ontologyIndex!;
    const mappings: ConceptMapping[] = [];
    const candidates: CandidateMapping[] = [];
    const pendingDisambiguations: DisambiguationRequest[] = [];

    for (const annotation of event.annotations) {
      for (const np of annotation.nounPhrases) {
        // Check cache first
        const cached = this.state.disambiguationCache.get(np.normalizedText);
        if (cached) {
          mappings.push({
            partIRI: annotation.partIRI,
            nounPhrase: np.text,
            conceptIRI: cached,
            conceptLabel: index.concepts.get(cached)!.label,
            confidence: 1.0,
            method: 'user_selected',
            disambiguated: true
          });
          continue;
        }

        // Phase 1: Exact match
        const exactMatches = index.exactMatch(np.normalizedText);

        if (exactMatches.length === 1) {
          mappings.push({
            partIRI: annotation.partIRI,
            nounPhrase: np.text,
            conceptIRI: exactMatches[0].iri,
            conceptLabel: exactMatches[0].label,
            confidence: 1.0,
            method: 'exact_label',
            disambiguated: false
          });
          continue;
        }

        if (exactMatches.length > 1) {
          // Needs disambiguation
          pendingDisambiguations.push({
            nounPhrase: np.text,
            partIRI: annotation.partIRI,
            candidates: exactMatches.map(c => ({ concept: c, confidence: 1.0 }))
          });
          continue;
        }

        // Phase 2: Fuzzy match
        const fuzzyMatches = index.fuzzyMatch(np.normalizedText, 0.85);

        if (fuzzyMatches.length === 1 && fuzzyMatches[0].similarity >= 0.85) {
          mappings.push({
            partIRI: annotation.partIRI,
            nounPhrase: np.text,
            conceptIRI: fuzzyMatches[0].concept.iri,
            conceptLabel: fuzzyMatches[0].concept.label,
            confidence: fuzzyMatches[0].similarity,
            method: 'fuzzy_match',
            disambiguated: false
          });
          continue;
        }

        if (fuzzyMatches.length > 1) {
          pendingDisambiguations.push({
            nounPhrase: np.text,
            partIRI: annotation.partIRI,
            candidates: fuzzyMatches
          });
          continue;
        }

        // Phase 3: No match - create candidate
        const candidateIRI = `http://example.org/candidate_${computeHash(np.normalizedText)}`;
        candidates.push({
          partIRI: annotation.partIRI,
          nounPhrase: np.text,
          candidateIRI
        });
      }
    }

    this.state.mappings = mappings;
    this.state.candidates = candidates;
    this.state.pendingDisambiguations = pendingDisambiguations;

    if (pendingDisambiguations.length > 0) {
      // Emit first disambiguation request
      this.notify('disambiguationRequired', pendingDisambiguations[0]);
    } else {
      // All resolved
      this.notify('mappingsReady', {
        documentIRI: event.documentIRI,
        mappings,
        candidates,
        statistics: {
          totalPhrases: event.annotations.reduce((sum, a) => sum + a.nounPhrases.length, 0),
          exactMatches: mappings.filter(m => m.method === 'exact_label').length,
          fuzzyMatches: mappings.filter(m => m.method === 'fuzzy_match').length,
          disambiguated: 0,
          unmapped: candidates.length
        }
      });
    }
  },

  applyUserDisambiguation(nounPhrase: string, selectedConceptIRI: string): void {
    // Cache decision
    this.state.disambiguationCache.set(nounPhrase, selectedConceptIRI);

    // Move from pending to mappings
    const request = this.state.pendingDisambiguations.shift()!;
    const concept = ontologyManagementConcept.state.ontologyIndex!.concepts.get(selectedConceptIRI)!;

    this.state.mappings.push({
      partIRI: request.partIRI,
      nounPhrase: request.nounPhrase,
      conceptIRI: selectedConceptIRI,
      conceptLabel: concept.label,
      confidence: 1.0,
      method: 'user_selected',
      disambiguated: true
    });

    // Continue with next disambiguation or emit complete
    if (this.state.pendingDisambiguations.length > 0) {
      this.notify('disambiguationRequired', this.state.pendingDisambiguations[0]);
    } else {
      this.notify('mappingsReady', { /* ... */ });
    }
  }
}
```

### Utility: Levenshtein Similarity (`/utils/similarity.ts`)

```typescript
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function levenshteinSimilarity(a: string, b: string): number {
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  return 1 - distance / maxLength;
}
```

### Tests

```typescript
test('OntologyIndex exactMatch finds concepts', () => {
  const store = new N3.Store();
  // Add test triples
  store.addQuad(
    namedNode('http://ex.org/Concept1'),
    namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
    namedNode('http://www.w3.org/2002/07/owl#Class')
  );
  store.addQuad(
    namedNode('http://ex.org/Concept1'),
    namedNode('http://www.w3.org/2000/01/rdf-schema#label'),
    literal('Knowledge Graph')
  );

  const index = new OntologyIndex();
  index.load(store);

  const matches = index.exactMatch('knowledge graph');
  expect(matches).toHaveLength(1);
  expect(matches[0].label).toBe('Knowledge Graph');
});

test('fuzzyMatch finds similar concepts', () => {
  // ... similar setup
  const matches = index.fuzzyMatch('knowlege graph', 0.85); // typo
  expect(matches.length).toBeGreaterThan(0);
  expect(matches[0].similarity).toBeGreaterThan(0.85);
});
```

### Success Criteria
- [ ] Load Turtle ontologies successfully
- [ ] Validate ontologies (basic SHACL-like checks)
- [ ] Exact matching works (labels + altLabels)
- [ ] Fuzzy matching works (Levenshtein)
- [ ] Disambiguation flow functional
- [ ] Cache user decisions
- [ ] Create candidate concepts for unmapped phrases
- [ ] Unit tests for matching algorithms (>90% coverage)

### Dependencies
- N3.js library
- Phase 2 complete

### Estimated Duration
10-14 days

---

## Phase 4: RDF Serialization & Provenance

### Objectives
- Generate BFO/IAO-compliant RDF graphs
- Implement dual ordering (RDF Lists + explicit index)
- Add provenance metadata
- Serialize to Turtle and JSON-LD

### Concepts to Implement

#### 4.1 `rdfSerializationConcept.ts`

**Responsibility**: Construct and serialize RDF knowledge graphs

**State**:
```typescript
interface RDFSerializationState {
  currentGraph: N3.Store | null;
  turtleSerialization: string | null;
  jsonldSerialization: string | null;
  statistics: GraphStatistics | null;
}

interface GraphStatistics {
  totalTriples: number;
  documentParts: number;
  aboutnessAssertions: number;
  candidateConcepts: number;
}
```

**Actions**:
```typescript
actions: {
  async generateGraph(
    structure: StructureReadyEvent,
    mappings: MappingsReadyEvent,
    metadata: DocumentMetadata
  ): Promise<void> {

    const store = new N3.Store();
    const { namedNode, literal, quad } = N3.DataFactory;

    const baseURI = 'http://example.org/';
    const docIRI = namedNode(structure.documentIRI);

    // 1. Document-level metadata
    store.addQuad(quad(
      docIRI,
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      namedNode('http://purl.obolibrary.org/obo/IAO_0000030') // ICE
    ));

    store.addQuad(quad(
      docIRI,
      namedNode('http://www.w3.org/2000/01/rdf-schema#label'),
      literal(metadata.title)
    ));

    store.addQuad(quad(
      docIRI,
      namedNode('http://purl.org/dc/terms/created'),
      literal(metadata.createdDate.toISOString(), namedNode('http://www.w3.org/2001/XMLSchema#dateTime'))
    ));

    // 2. Build RDF List for ordering
    let currentListNode = namedNode(structure.documentIRI + '_partlist_000');
    store.addQuad(quad(
      docIRI,
      namedNode('http://purl.obolibrary.org/obo/IAO_0000219'), // has_document_part
      currentListNode
    ));

    for (let i = 0; i < structure.parts.length; i++) {
      const part = structure.parts[i];
      const partIRI = namedNode(part.iri);

      // Add to RDF List
      store.addQuad(quad(
        currentListNode,
        namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#first'),
        partIRI
      ));

      if (i < structure.parts.length - 1) {
        const nextListNode = namedNode(structure.documentIRI + `_partlist_${String(i + 1).padStart(3, '0')}`);
        store.addQuad(quad(
          currentListNode,
          namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#rest'),
          nextListNode
        ));
        currentListNode = nextListNode;
      } else {
        store.addQuad(quad(
          currentListNode,
          namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#rest'),
          namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#nil')
        ));
      }

      // 3. Part metadata
      store.addQuad(quad(
        partIRI,
        namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        namedNode(this.getIAOType(part.type))
      ));

      store.addQuad(quad(
        partIRI,
        namedNode('http://example.org/sequenceIndex'),
        literal(part.sequenceIndex.toString(), namedNode('http://www.w3.org/2001/XMLSchema#integer'))
      ));

      store.addQuad(quad(
        partIRI,
        namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#value'),
        literal(part.text)
      ));
    }

    // 4. Aboutness assertions
    for (const mapping of mappings.mappings) {
      store.addQuad(quad(
        namedNode(mapping.partIRI),
        namedNode('http://purl.obolibrary.org/obo/IAO_0000136'), // is_about
        namedNode(mapping.conceptIRI)
      ));
    }

    // 5. Candidate concepts (mentions)
    for (const candidate of mappings.candidates) {
      const candidateIRI = namedNode(candidate.candidateIRI);

      store.addQuad(quad(
        candidateIRI,
        namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        namedNode('http://example.org/CandidateConceptEntity')
      ));

      store.addQuad(quad(
        candidateIRI,
        namedNode('http://www.w3.org/2000/01/rdf-schema#label'),
        literal(candidate.nounPhrase)
      ));

      store.addQuad(quad(
        namedNode(candidate.partIRI),
        namedNode('http://purl.obolibrary.org/obo/IAO_0000142'), // mentions
        candidateIRI
      ));
    }

    // 6. Provenance metadata
    const graphMetaIRI = namedNode(structure.documentIRI + '_metadata');
    store.addQuad(quad(
      graphMetaIRI,
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      namedNode('http://www.w3.org/ns/prov#Entity')
    ));

    store.addQuad(quad(
      graphMetaIRI,
      namedNode('http://www.w3.org/ns/prov#wasDerivedFrom'),
      docIRI
    ));

    store.addQuad(quad(
      graphMetaIRI,
      namedNode('http://purl.org/dc/terms/created'),
      literal(new Date().toISOString(), namedNode('http://www.w3.org/2001/XMLSchema#dateTime'))
    ));

    store.addQuad(quad(
      graphMetaIRI,
      namedNode('http://example.org/generatorVersion'),
      literal('DocumentToKG-PWA/2.0.1')
    ));

    this.state.currentGraph = store;

    // Serialize
    await this.serializeGraph(store, structure.documentIRI);
  },

  async serializeGraph(store: N3.Store, documentIRI: string): Promise<void> {
    // Turtle
    const writer = new N3.Writer({
      prefixes: {
        rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
        owl: 'http://www.w3.org/2002/07/owl#',
        xsd: 'http://www.w3.org/2001/XMLSchema#',
        iao: 'http://purl.obolibrary.org/obo/IAO_',
        bfo: 'http://purl.obolibrary.org/obo/BFO_',
        dct: 'http://purl.org/dc/terms/',
        prov: 'http://www.w3.org/ns/prov#',
        ex: 'http://example.org/'
      }
    });

    writer.addQuads(store.getQuads(null, null, null, null));

    const turtle = await new Promise<string>((resolve, reject) => {
      writer.end((error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });

    this.state.turtleSerialization = turtle;

    // JSON-LD (simplified - full context in production)
    // ... jsonld serialization

    // Create download URLs
    const turtleBlob = new Blob([turtle], { type: 'text/turtle' });
    const turtleURL = URL.createObjectURL(turtleBlob);

    this.notify('graphReady', {
      documentIRI,
      formats: {
        turtle: turtle,
        jsonld: '' // TODO
      },
      statistics: {
        totalTriples: store.size,
        documentParts: store.getQuads(null, namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode('http://purl.obolibrary.org/obo/IAO_0000302'), null).length,
        aboutnessAssertions: store.getQuads(null, namedNode('http://purl.obolibrary.org/obo/IAO_0000136'), null, null).length,
        candidateConcepts: store.getQuads(null, namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), namedNode('http://example.org/CandidateConceptEntity'), null).length
      },
      downloadURLs: {
        turtle: turtleURL,
        jsonld: ''
      }
    });
  },

  getIAOType(partType: string): string {
    const typeMap = {
      'paragraph': 'http://purl.obolibrary.org/obo/IAO_0000302',
      'heading': 'http://purl.obolibrary.org/obo/IAO_0000304',
      'list': 'http://purl.obolibrary.org/obo/IAO_0000320',
      'table': 'http://purl.obolibrary.org/obo/IAO_0000306'
    };
    return typeMap[partType] || 'http://purl.obolibrary.org/obo/IAO_0000314'; // document part
  }
}
```

### Tests

```typescript
test('generateGraph creates document-level triples', async () => {
  const structure: StructureReadyEvent = { /* mock data */ };
  const mappings: MappingsReadyEvent = { mappings: [], candidates: [], statistics: {} };
  const metadata: DocumentMetadata = { title: 'Test', fileSize: 1000, format: 'docx', documentHash: 'abc' };

  await rdfSerializationConcept.actions.generateGraph(structure, mappings, metadata);

  const store = rdfSerializationConcept.state.currentGraph!;
  const docTriples = store.getQuads(
    namedNode(structure.documentIRI),
    namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
    null,
    null
  );

  expect(docTriples.length).toBeGreaterThan(0);
});

test('serializeGraph produces valid Turtle', async () => {
  // ... generate graph first

  const turtle = rdfSerializationConcept.state.turtleSerialization!;
  expect(turtle).toContain('@prefix iao:');
  expect(turtle).toContain('iao:0000030'); // ICE
});
```

### Success Criteria
- [ ] Generate complete RDF graphs
- [ ] Dual ordering representation (RDF List + index)
- [ ] Aboutness assertions using `iao:is_about`
- [ ] Candidate concepts using `iao:mentions`
- [ ] Provenance metadata included
- [ ] Valid Turtle serialization
- [ ] Unit tests for graph construction (>85% coverage)

### Dependencies
- N3.js library
- Phase 3 complete

### Estimated Duration
7-10 days

---

## Phase 5: UI/UX & Disambiguation Interface

### Objectives
- Create user-friendly document upload interface
- Implement disambiguation modal
- Add progress indicators
- Enable graph download

### UI Components to Implement

#### 5.1 Main Application Layout

```typescript
// /ui/App.ts
export class App {
  render() {
    return `
      <div class="app-container">
        <header>
          <h1>Concretize: Document to BFO Knowledge Graph</h1>
          <p>Transform Word documents into ontologically grounded RDF</p>
        </header>

        <main>
          <div id="upload-section">
            <!-- DocumentUpload component -->
          </div>

          <div id="ontology-section">
            <!-- OntologyUpload component -->
          </div>

          <div id="progress-section" style="display: none;">
            <!-- ProgressIndicator component -->
          </div>

          <div id="disambiguation-section" style="display: none;">
            <!-- DisambiguationModal component -->
          </div>

          <div id="results-section" style="display: none;">
            <!-- ResultsPanel component -->
          </div>
        </main>
      </div>
    `;
  }
}
```

#### 5.2 Disambiguation Modal

```typescript
// /ui/DisambiguationModal.ts
export class DisambiguationModal {
  private currentRequest: DisambiguationRequest | null = null;

  constructor() {
    eventBus.subscribe('disambiguationRequired', (request) => {
      this.currentRequest = request;
      this.show(request);
    });
  }

  show(request: DisambiguationRequest) {
    const modal = document.getElementById('disambiguation-modal')!;
    modal.style.display = 'block';

    const html = `
      <div class="modal-content">
        <h2>Concept Disambiguation Required</h2>

        <div class="noun-phrase">
          <strong>Term:</strong> "${request.nounPhrase}"
        </div>

        <div class="candidates">
          <p>Multiple matching concepts found. Please select one:</p>

          ${request.candidates.map((c, i) => `
            <div class="candidate-option">
              <input type="radio" name="concept" id="concept-${i}" value="${c.concept.iri}">
              <label for="concept-${i}">
                <strong>${c.concept.label}</strong>
                <span class="confidence">(${(c.confidence * 100).toFixed(0)}% match)</span>
                <p class="definition">${c.concept.definition || 'No definition available'}</p>
              </label>
            </div>
          `).join('')}

          <div class="candidate-option">
            <input type="radio" name="concept" id="concept-none" value="none">
            <label for="concept-none">
              <strong>None of the above</strong> (create candidate concept)
            </label>
          </div>
        </div>

        <div class="modal-actions">
          <button id="skip-btn">Skip for now</button>
          <button id="select-btn" class="primary">Confirm Selection</button>
        </div>
      </div>
    `;

    modal.innerHTML = html;

    document.getElementById('select-btn')!.addEventListener('click', () => {
      const selected = document.querySelector('input[name="concept"]:checked') as HTMLInputElement;
      if (selected) {
        if (selected.value === 'none') {
          aboutnessResolutionConcept.actions.rejectMatch(request.nounPhrase);
        } else {
          aboutnessResolutionConcept.actions.applyUserDisambiguation(
            request.nounPhrase,
            selected.value
          );
        }
        this.hide();
      }
    });

    document.getElementById('skip-btn')!.addEventListener('click', () => {
      aboutnessResolutionConcept.actions.skipDisambiguation(request.nounPhrase);
      this.hide();
    });
  }

  hide() {
    document.getElementById('disambiguation-modal')!.style.display = 'none';
  }
}
```

#### 5.3 Progress Indicator

```typescript
// /ui/ProgressIndicator.ts
export class ProgressIndicator {
  constructor() {
    eventBus.subscribe('pipelineProgress', (progress) => {
      this.update(progress);
    });
  }

  update(progress: PipelineProgress) {
    const container = document.getElementById('progress-section')!;
    container.style.display = 'block';

    container.innerHTML = `
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progress.percentComplete}%"></div>
      </div>

      <div class="progress-status">
        <strong>Stage:</strong> ${progress.stage}
        <br>
        <strong>Task:</strong> ${progress.currentTask}
      </div>

      ${progress.warnings.length > 0 ? `
        <div class="warnings">
          <strong>Warnings:</strong>
          <ul>
            ${progress.warnings.map(w => `<li>${w.message}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    `;
  }
}
```

#### 5.4 Results Panel

```typescript
// /ui/ResultsPanel.ts
export class ResultsPanel {
  constructor() {
    eventBus.subscribe('graphReady', (event) => {
      this.show(event);
    });
  }

  show(event: GraphReadyEvent) {
    const container = document.getElementById('results-section')!;
    container.style.display = 'block';

    container.innerHTML = `
      <h2>Knowledge Graph Generated</h2>

      <div class="statistics">
        <div class="stat">
          <strong>${event.statistics.totalTriples}</strong>
          <span>Total Triples</span>
        </div>
        <div class="stat">
          <strong>${event.statistics.documentParts}</strong>
          <span>Document Parts</span>
        </div>
        <div class="stat">
          <strong>${event.statistics.aboutnessAssertions}</strong>
          <span>Ontology Mappings</span>
        </div>
        <div class="stat">
          <strong>${event.statistics.candidateConcepts}</strong>
          <span>Candidate Concepts</span>
        </div>
      </div>

      <div class="downloads">
        <h3>Download Formats</h3>
        <a href="${event.downloadURLs.turtle}" download="knowledge-graph.ttl" class="download-btn">
          Download Turtle (.ttl)
        </a>
        <a href="${event.downloadURLs.jsonld}" download="knowledge-graph.jsonld" class="download-btn">
          Download JSON-LD (.jsonld)
        </a>
      </div>

      <div class="preview">
        <h3>Graph Preview (Turtle)</h3>
        <pre><code>${this.truncate(event.formats.turtle, 1000)}</code></pre>
      </div>
    `;
  }

  truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '\n... (truncated)';
  }
}
```

### Styling (`/styles/main.css`)

Basic responsive CSS following modern design principles (details omitted for brevity).

### Success Criteria
- [ ] Clean, intuitive document upload interface
- [ ] Disambiguation modal functional and user-friendly
- [ ] Real-time progress indicators
- [ ] Graph statistics display
- [ ] Download buttons work (Turtle + JSON-LD)
- [ ] Mobile-responsive design
- [ ] Accessibility (ARIA labels, keyboard navigation)

### Dependencies
- Phase 4 complete
- Basic CSS framework (or custom styles)

### Estimated Duration
7-10 days

---

## Phase 6: PWA Features & Production Readiness

### Objectives
- Implement Service Worker for offline capability
- Add IndexedDB caching for intermediate states
- Enable session recovery
- Production build optimization
- Comprehensive testing

### Implementation Tasks

#### 6.1 Service Worker (`/service-worker.ts`)

```typescript
const CACHE_NAME = 'concretize-v2.0.1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/main.js',
  '/assets/styles.css',
  '/assets/workers/posWorker.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});
```

#### 6.2 IndexedDB Persistence (`/utils/storage.ts`)

```typescript
import { openDB, DBSchema } from 'idb';

interface ConcretizeDB extends DBSchema {
  documents_raw: {
    key: string; // document hash
    value: {
      hash: string;
      file: ArrayBuffer;
      uploadTime: Date;
    };
    indexes: { 'by-upload': Date };
  };

  documents_parsed: {
    key: string;
    value: {
      hash: string;
      parts: DocumentPart[];
      parsedTime: Date;
    };
  };

  pos_results: {
    key: string;
    value: {
      hash: string;
      annotations: PartAnnotation[];
    };
  };

  user_mappings: {
    key: string; // hash + noun phrase
    value: {
      documentHash: string;
      nounPhrase: string;
      conceptIRI: string;
      timestamp: Date;
    };
    indexes: { 'by-document': string };
  };

  graphs_final: {
    key: string;
    value: {
      hash: string;
      turtle: string;
      jsonld: string;
      createdTime: Date;
    };
    indexes: { 'by-created': Date };
  };
}

export const db = await openDB<ConcretizeDB>('concretize', 1, {
  upgrade(db) {
    db.createObjectStore('documents_raw', { keyPath: 'hash' })
      .createIndex('by-upload', 'uploadTime');

    db.createObjectStore('documents_parsed', { keyPath: 'hash' });
    db.createObjectStore('pos_results', { keyPath: 'hash' });

    db.createObjectStore('user_mappings', { keyPath: 'key' })
      .createIndex('by-document', 'documentHash');

    db.createObjectStore('graphs_final', { keyPath: 'hash' })
      .createIndex('by-created', 'createdTime');
  }
});

// Cache management
export async function cacheDocumentStructure(hash: string, parts: DocumentPart[]) {
  await db.put('documents_parsed', {
    hash,
    parts,
    parsedTime: new Date()
  });
}

export async function getCachedStructure(hash: string): Promise<DocumentPart[] | null> {
  const cached = await db.get('documents_parsed', hash);
  return cached ? cached.parts : null;
}

// Auto-cleanup (LRU eviction)
export async function cleanupOldCache(maxAgeDays: number = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);

  const tx = db.transaction('documents_raw', 'readwrite');
  const index = tx.store.index('by-upload');

  for await (const cursor of index.iterate()) {
    if (cursor.value.uploadTime < cutoff) {
      cursor.delete();
    }
  }
}
```

#### 6.3 Session Recovery

```typescript
// /concepts/sessionRecoveryConcept.ts
export const sessionRecoveryConcept = {
  state: {
    incompleteProcessing: null as { documentHash: string; stage: string } | null
  },

  actions: {
    async checkForIncomplete(): Promise<void> {
      // Check for processing flags in IndexedDB
      const incomplete = await this.findIncompleteSession();

      if (incomplete) {
        this.state.incompleteProcessing = incomplete;
        this.notify('incompleteSessionFound', incomplete);
      }
    },

    async resumeSession(documentHash: string): Promise<void> {
      // Load cached intermediate states and resume pipeline
      const structure = await getCachedStructure(documentHash);
      if (structure) {
        eventBus.emit('structureReady', { /* reconstruct event */ });
      }
    },

    async discardSession(documentHash: string): Promise<void> {
      // Clear incomplete state
      await db.delete('documents_parsed', documentHash);
      this.state.incompleteProcessing = null;
    }
  },

  notify(event: string, payload: any) { eventBus.emit(event, payload); }
};
```

#### 6.4 Production Build Configuration

Update [vite.config.ts](vite.config.ts) from requirements:

```typescript
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'rdf': ['n3', 'jsonld'],
          'document': ['mammoth'],
          'worker': ['./src/workers/posWorker.ts']
        }
      }
    },
    minify: 'terser',
    sourcemap: true
  },

  worker: {
    format: 'es'
  },

  plugins: [
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'Concretize: Document to BFO Knowledge Graph',
        short_name: 'Concretize',
        description: 'Transform Word documents into BFO-compliant RDF knowledge graphs',
        theme_color: '#1a73e8',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,wasm}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024
      }
    })
  ]
});
```

#### 6.5 Comprehensive Test Suite

**Integration Tests** (`/tests/integration/pipeline.test.ts`):

```typescript
import { describe, test, expect, beforeEach } from 'vitest';

describe('Full Pipeline Integration', () => {
  beforeEach(() => {
    // Reset all concept states
  });

  test('processes document end-to-end', async () => {
    // 1. Load fixture document
    const fixture = await loadFixture('sample-clinical-trial.docx');

    // 2. Upload
    await documentIngestConcept.actions.uploadDocument(fixture);

    // 3. Wait for structure
    const structureEvent = await waitForEvent('structureReady');
    expect(structureEvent.parts.length).toBeGreaterThan(0);

    // 4. Wait for POS analysis
    const analysisEvent = await waitForEvent('analysisComplete');
    expect(analysisEvent.annotations.length).toBeGreaterThan(0);

    // 5. Load test ontology
    const ontology = await loadFixture('test-ontology.ttl');
    await ontologyManagementConcept.actions.loadOntology(ontology);

    // 6. Wait for mappings
    const mappingsEvent = await waitForEvent('mappingsReady');
    expect(mappingsEvent.mappings.length).toBeGreaterThan(0);

    // 7. Wait for graph
    const graphEvent = await waitForEvent('graphReady');
    expect(graphEvent.statistics.totalTriples).toBeGreaterThan(100);

    // 8. Validate RDF
    const store = new N3.Store();
    const parser = new N3.Parser();
    await parseIntoStore(graphEvent.formats.turtle, store);

    // Check BFO/IAO compliance
    const iceTriples = store.getQuads(null, RDF.type, namedNode('http://purl.obolibrary.org/obo/IAO_0000030'));
    expect(iceTriples.length).toBe(1);
  });
});
```

**Performance Tests** (`/tests/performance/large-documents.test.ts`):

```typescript
test('processes 100-page document within 5 seconds', async () => {
  const largeDoc = await generateLargeDocument(100); // ~50k words

  const startTime = performance.now();

  await documentIngestConcept.actions.uploadDocument(largeDoc);
  await waitForEvent('graphReady');

  const duration = performance.now() - startTime;

  expect(duration).toBeLessThan(5000); // 5 seconds
});
```

### Success Criteria
- [ ] Service Worker caches all assets
- [ ] App functions 100% offline after first load
- [ ] IndexedDB persistence works
- [ ] Session recovery functional
- [ ] Cache eviction (LRU) works
- [ ] Production build < 1.5MB gzipped
- [ ] All integration tests pass
- [ ] Performance tests meet targets (see requirements Section 4.3)
- [ ] PWA installable on mobile/desktop

### Dependencies
- All previous phases complete
- Vite PWA plugin
- idb library

### Estimated Duration
10-14 days

---

## Cross-Phase Concerns

### Testing Strategy

**Unit Tests**: Per-concept, per-utility function
- Target: 85%+ coverage
- Framework: Vitest
- Run on: Every commit (CI)

**Integration Tests**: Event flow, synchronizations
- Target: Cover all happy paths + major error paths
- Run on: Pre-merge (CI)

**E2E Tests**: Full pipeline with fixtures
- Target: 5+ realistic document fixtures
- Run on: Pre-release

**Performance Tests**: Large documents, stress testing
- Target: Meet requirements Section 4.3 targets
- Run on: Weekly + pre-release

### Documentation Requirements

Each phase must deliver:
1. **API Documentation**: JSDoc for all public interfaces
2. **Architecture Decisions**: ADR markdown files for major choices
3. **User Guide Updates**: Document new UI features
4. **Test Documentation**: Fixture descriptions, test scenarios

### Deployment & Release

**Staging Environment**:
- Netlify preview deploys for each PR
- Manual QA before merging

**Production Releases**:
- Semantic versioning (2.0.0, 2.1.0, etc.)
- Release notes with changelog
- Tagged GitHub releases

---

## Risk Management

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Web Worker browser compatibility** | Medium | High | Feature detection, fallback to main thread with warning |
| **Large document memory overflow** | Medium | Medium | Chunked processing, memory monitoring, user warnings |
| **POS accuracy insufficient** | High | Medium | Accept limitation, prioritize user disambiguation workflow |
| **N3.js performance bottleneck** | Low | Medium | Profile early, consider alternative (rdflib.js) |
| **Service Worker cache size limits** | Low | High | Monitor bundle size, lazy load non-critical assets |

### Schedule Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Phase 2 POS complexity underestimated** | Medium | Medium | Timebox to 10 days, reduce scope if needed (basic patterns only) |
| **Disambiguation UX requires iteration** | High | Low | Budget extra time in Phase 5, involve user feedback early |
| **Integration bugs across phases** | Medium | High | Continuous integration testing, weekly cross-phase smoke tests |

---

## Success Metrics

### Phase Completion Criteria

Each phase is considered complete when:
1. All deliverables implemented
2. Unit tests passing (>85% coverage)
3. Integration tests passing
4. Code reviewed and merged
5. Documentation updated

### Project-Level Success

Project is production-ready when:
1. All 6 phases complete
2. All requirements tests (Section 8) passing
3. Performance targets met
4. User acceptance testing complete
5. Deployment successful

---

## Timeline Summary

| Phase | Duration | Dependencies | Milestone |
|-------|----------|--------------|-----------|
| **Phase 0: Foundation** | 3-5 days | None | Architecture established |
| **Phase 1: Ingestion** | 5-7 days | Phase 0 | Document parsing functional |
| **Phase 2: POS Analysis** | 7-10 days | Phase 1 | Linguistic extraction working |
| **Phase 3: Ontology** | 10-14 days | Phase 2 | Concept matching functional |
| **Phase 4: RDF Serialization** | 7-10 days | Phase 3 | BFO-compliant graphs generated |
| **Phase 5: UI/UX** | 7-10 days | Phase 4 | User-friendly interface complete |
| **Phase 6: PWA Production** | 10-14 days | Phase 5 | Production-ready deployment |

**Total Estimated Duration**: 49-70 days (~10-14 weeks)

**Buffer for Testing/Polish**: +2 weeks

**Total Project Timeline**: 12-16 weeks

---

## Appendix A: Development Environment Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- Code editor (VS Code recommended)

### Initial Setup

```bash
# Clone repository
git clone <repo-url>
cd concretize

# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Build for production
npm run build

# Preview production build
npm run preview
```

### Recommended VS Code Extensions

- ESLint
- Prettier
- Vitest
- TypeScript Vue Plugin

---

## Appendix B: Architectural Decision Records

### ADR-001: Event-Driven Architecture

**Context**: Need for loosely coupled, testable modules

**Decision**: Use Concepts + Synchronizations pattern with event bus

**Rationale**:
- Enables independent development/testing
- Clear data flow visualization
- Easy to add new features without breaking existing code
- AI-friendly (legible, analyzable)

**Consequences**:
- Requires discipline to avoid direct imports
- Event debugging requires tooling
- Slight performance overhead (negligible for use case)

### ADR-002: Web Worker for POS Analysis

**Context**: POS analysis blocks main thread for large documents

**Decision**: Execute POS in dedicated Web Worker

**Rationale**:
- Maintains UI responsiveness
- Allows timeout handling
- Enables progress reporting

**Consequences**:
- Cannot access DOM from worker
- Data serialization overhead
- Browser compatibility considerations

### ADR-003: Dual Ordering Representation

**Context**: RDF Lists are graph-native but inefficient for SPARQL queries

**Decision**: Use both RDF Lists AND explicit sequence indices

**Rationale**:
- RDF Lists: Semantic correctness, reconstruction capability
- Explicit indices: SPARQL query efficiency
- Minimal storage overhead (~1 triple per part)

**Consequences**:
- Slightly larger graph size
- Must maintain both representations in sync
- Clear documentation needed

---

**End of Phased Project Plan**
