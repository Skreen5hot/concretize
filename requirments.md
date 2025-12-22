# Concretize: Document-to-BFO Knowledge Graph PWA (v2.0 - Revised)

## 1. Project Overview

### 1.1 Purpose
A self-contained Progressive Web App (PWA) that transforms Microsoft Word documents into BFO-compliant RDF Knowledge Graphs with IAO-aligned document modeling. The system treats each document as a distinct Information Content Entity (ICE), preserving linear order, structural relationships, and mapping content to domain-specific ontological entities via aboutness relations.

### 1.2 Core Principles
- **Ontological Realism**: Strict adherence to BFO 2020 and IAO specifications
- **Deterministic Processing**: Reproducible outputs for identical inputs with explicit versioning
- **Offline-First Architecture**: Zero external dependencies post-installation
- **Transparent Limitations**: Explicit handling and reporting of disambiguation failures and mapping gaps

---

## 2. Ontological Commitments (Normative)

### 2.1 BFO/IAO Alignment Model

The system SHALL conform to Basic Formal Ontology (BFO 2020) and the Information Artifact Ontology (IAO), with precise distinction between layers of reality:

| Concept | BFO/IAO Category | URI | Explanation |
|---------|------------------|-----|-------------|
| **Physical Storage Device** | Material Entity | bfo:0000040 | Hard drive, SSD, or RAM hosting the bit patterns |
| **Bit Pattern Configuration** | Specifically Dependent Continuant (SDC) | bfo:0000020 | The arrangement of magnetization, voltage levels, or optical marks |
| **Digital Entity** | Digital Entity | iao:0000027 | The pattern as an informational substrate (subclass of IAO:ICE) |
| **Document Content** | Information Content Entity (GDC) | iao:0000030 | The abstract information content concretized by the digital entity |
| **Document Part** | Document Part | iao:0000314 | Structural subdivision (paragraph, section, heading) |
| **Paragraph** | Paragraph | iao:0000302 | Specific type of document part |
| **Section** | Section | iao:0000315 | Hierarchical grouping of document parts |
| **Domain Concept** | (Varies) | (Ontology-dependent) | Any entity the document is about (continuants, occurrents, qualities, etc.) |

### 2.2 Corrected Layered Model

```turtle
# Layer 1: Physical Reality
ex:laptop_ssd_2024 a bfo:MaterialEntity ;
    rdfs:label "Samsung 980 PRO SSD in development laptop" .

# Layer 2: Specifically Dependent Continuant (SDC)
ex:bitpattern_abc123 a bfo:SpecificallyDependentContinuant ;
    bfo:specifically_depends_on ex:laptop_ssd_2024 ;
    rdfs:comment "Magnetic/electrical pattern encoding the document" .

# Layer 3: Digital Entity (hosting the information)
ex:digital_doc_xyz a iao:DigitalEntity ;
    iao:is_concretized_by ex:bitpattern_abc123 ;
    dct:format "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ;
    dct:created "2025-01-15T10:30:00Z"^^xsd:dateTime .

# Layer 4: Information Content Entity (the abstract content)
ex:document_content_xyz a iao:InformationContentEntity ;
    iao:is_concretized_by ex:bitpattern_abc123 ;
    rdfs:label "Requirements Document v2.0" ;
    iao:has_document_part ex:paragraph_001, ex:paragraph_002 .

# Layer 5: Document Structure
ex:paragraph_001 a iao:Paragraph ;
    iao:is_part_of ex:document_content_xyz ;
    ex:sequenceIndex 1 ;
    rdf:value "This project transforms documents into knowledge graphs." ;
    iao:mentions ex:concept_knowledge_graph .

# Layer 6: Aboutness Relations
ex:paragraph_001 iao:is_about ex:concept_knowledge_graph .
ex:concept_knowledge_graph a owl:Class ;  # From domain ontology
    rdfs:label "Knowledge Graph" ;
    skos:definition "A graph of entities and their semantic relationships" .
```

**Critical Notes:**
1. **Concretization flows upward**: SDC concretizes both the digital entity AND the ICE
2. **IAO classes used**: Not generic BFO proper parts, but specialized IAO document structure
3. **Aboutness is unrestricted**: Documents can be about continuants, occurrents, qualities, or universals
4. **Identity is contextual**: Document parts are numerically distinct even with identical content

### 2.3 Identity and IRI Generation Principles

**Principle 1: Numerical vs. Qualitative Identity**
- Two qualitatively identical paragraphs in different documents are **numerically distinct**
- IRIs MUST encode both content and context

**Principle 2: Deterministic Context-Aware Hashing**

```
IRI = base_uri + "doc_" + doc_hash + "_part_" + content_hash + "_pos_" + position
```

Where:
- `doc_hash` = SHA-256(document_title + creation_timestamp + file_size)
- `content_hash` = SHA-256(normalized_text_content)
- `position` = sequential index within document

**Example:**
```turtle
ex:doc_a1b2c3_part_d4e5f6_pos_001  # Paragraph 1 in Document A
ex:doc_x7y8z9_part_d4e5f6_pos_001  # Identical text in Document B → Different IRI
```

This ensures:
- ✓ Same document uploaded twice → identical IRIs (reproducibility)
- ✓ Different documents with identical paragraphs → distinct IRIs (numerical identity)
- ✓ Stable references across sessions (determinism)

---

## 3. Functional Requirements

### 3.1 Input & Document Processing

**FR-1: Local Processing**
- All document ingestion SHALL occur client-side via Mammoth.js (v1.6.0+)
- No server-side processing permitted
- File size limit: 50MB (configurable)

**FR-2: Document Identity Establishment**
- System SHALL extract or generate:
  - Document title (from Word metadata or filename)
  - Creation timestamp (from file metadata or upload time)
  - File size and format version
- These SHALL be hashed to create the document-level identity component
- Original filename SHALL be preserved as `dct:source`

**FR-3: Part-Level Identity**
- Each document part (paragraph, heading, section) SHALL receive an IRI per Section 2.3
- IRIs SHALL be stable across re-uploads of the same document
- IRIs SHALL be distinct for identical content in different documents

**FR-4: Structural Extraction**
- System SHALL recognize and type:
  - Headings (levels 1-6) → `iao:heading`
  - Paragraphs → `iao:paragraph`
  - Lists (ordered/unordered) → `iao:list`
  - Tables → `iao:table` (future enhancement)
- Hierarchical nesting SHALL be preserved via `iao:is_part_of` chains

### 3.2 Linguistic Analysis (Custom POS)

**FR-5: Rule-Based POS Processing**
- System SHALL use a deterministic lexicon + heuristic processor
- Algorithm version SHALL be embedded in provenance metadata
- Processing SHALL identify:
  - Noun phrases (NP): consecutive nouns, adjectives + nouns
  - Proper nouns: capitalized sequences not at sentence start
  - Acronyms: All-caps sequences 2-6 characters
  - Acronym expansions: Pattern `ACRONYM (Expanded Form)`

**FR-6: Threaded Execution**
- POS processing MUST execute in a dedicated Web Worker
- Worker SHALL report progress every 50 paragraphs processed
- Timeout: 30 seconds per 1000 words (configurable)
- On timeout: System SHALL continue with partial results + log warning

**FR-7: Acronym Handling**
```javascript
// Input: "The FDA (Food and Drug Administration) regulates..."
// Output:
{
  acronym: "FDA",
  expansion: "Food and Drug Administration",
  position: { start: 4, end: 7 }
}
```
- Expansions SHALL be stored as `skos:altLabel` on candidate concepts
- Acronym itself becomes `skos:prefLabel`

### 3.3 Aboutness Resolution (Domain Mapping)

**FR-8: Domain Ontology Requirements**

The system SHALL accept a domain ontology meeting these specifications:

**Required Format:**
- Valid RDF (Turtle or JSON-LD)
- MUST validate against provided SHACL shape (see Section 9)

**Required Predicates per Concept:**
- `rdf:type` or `a` declaration
- `rdfs:label` (minimum one, language-tagged preferred)
- `skos:prefLabel` (recommended) or `rdfs:label` for matching
- `skos:altLabel` (optional, for synonyms/acronyms)
- `skos:definition` or `rdfs:comment` (recommended)

**Ontology Metadata:**
```turtle
ex:domain_ontology a owl:Ontology ;
    dct:title "Clinical Trial Ontology" ;
    owl:versionInfo "1.2.0" ;
    dct:created "2024-11-01"^^xsd:date ;
    dct:creator <https://example.org/author> .
```

**Loading Behavior:**
- System SHALL validate ontology on load
- Invalid ontology → Error message + fallback to candidate-only mode
- Missing ontology → Candidate-only mode (all NPs treated as unmapped)

**FR-9: Matching Algorithm**

**Phase 1: Exact Matching**
```javascript
function exactMatch(nounPhrase, ontology) {
  // Normalize both sides: lowercase, trim, remove punctuation
  const normalized = normalize(nounPhrase);
  
  // Check against rdfs:label and skos:prefLabel
  for (const concept of ontology.concepts) {
    if (normalize(concept.label) === normalized) {
      return { concept, confidence: 1.0, method: 'exact_label' };
    }
  }
  
  // Check against skos:altLabel (synonyms, acronyms)
  for (const concept of ontology.concepts) {
    for (const altLabel of concept.altLabels) {
      if (normalize(altLabel) === normalized) {
        return { concept, confidence: 0.95, method: 'exact_altLabel' };
      }
    }
  }
  
  return null;
}
```

**Phase 2: Fuzzy Matching (Levenshtein)**
```javascript
function fuzzyMatch(nounPhrase, ontology, threshold = 0.85) {
  const matches = [];
  
  for (const concept of ontology.concepts) {
    const similarity = levenshteinSimilarity(nounPhrase, concept.label);
    if (similarity >= threshold) {
      matches.push({ concept, confidence: similarity, method: 'fuzzy_match' });
    }
  }
  
  // Sort by confidence descending
  return matches.sort((a, b) => b.confidence - a.confidence);
}
```

**FR-10: Disambiguation Requirements**

System SHALL present disambiguation UI when:
1. **Multiple exact matches**: > 1 concept with confidence = 1.0
2. **Ambiguous fuzzy matches**: > 1 concept with confidence ≥ 0.85
3. **Low-confidence matches**: Best match has confidence < 0.85 but ≥ 0.70

**Disambiguation UI SHALL display:**
- The noun phrase in context (full sentence)
- Up to 5 candidate concepts with:
  - Label + definition
  - Confidence score
  - Source ontology class URI
- Options:
  - Select one concept
  - Mark as "no match" (creates candidate)
  - Skip for now (deferred resolution)

**FR-11: Candidate Concept Creation**

When no match found or user selects "no match":
```turtle
ex:candidate_knowledge_graph a ex:CandidateConceptEntity ;
    rdfs:label "knowledge graph" ;
    ex:extracted_from ex:doc_xyz_part_001 ;
    ex:extraction_confidence 0.0 ;
    ex:extraction_method "pos_noun_phrase" ;
    rdfs:comment "Unmapped concept - requires manual review" .

ex:paragraph_001 iao:mentions ex:candidate_knowledge_graph .
```

Note: Uses `iao:mentions` not `iao:is_about` for candidates (weaker commitment)

### 3.4 RDF Structure & Serialization

**FR-12: Hybrid Ordering Model**

Document parts SHALL be ordered using TWO complementary approaches:

**Approach 1: RDF Collection (for reconstruction)**
```turtle
ex:document_content_xyz iao:has_document_part ex:part_list_001 .

ex:part_list_001 a rdf:List ;
    rdf:first ex:paragraph_001 ;
    rdf:rest ex:part_list_002 .

ex:part_list_002 a rdf:List ;
    rdf:first ex:paragraph_002 ;
    rdf:rest ex:part_list_003 .

ex:part_list_003 a rdf:List ;
    rdf:first ex:paragraph_003 ;
    rdf:rest rdf:nil .
```

**Approach 2: Explicit Index (for SPARQL efficiency)**
```turtle
ex:paragraph_001 ex:sequenceIndex 1 .
ex:paragraph_002 ex:sequenceIndex 2 .
ex:paragraph_003 ex:sequenceIndex 3 .
```

Rationale:
- RDF Lists: Enable ordered traversal, graph-native ordering
- Explicit index: Enable efficient SPARQL queries: `SELECT ?part WHERE { ?part ex:sequenceIndex ?idx } ORDER BY ?idx`

**FR-13: Aboutness Assertions**

```turtle
# Strong assertion: concept in domain ontology
ex:paragraph_005 iao:is_about ex:clinical_trial_phase_2 .

# Weak assertion: candidate concept
ex:paragraph_007 iao:mentions ex:candidate_novel_biomarker .
```

Distinction:
- `iao:is_about`: Ontologically committed (concept verified in domain ontology)
- `iao:mentions`: Weak reference (candidate concept, needs review)

**FR-14: Content Preservation**

Each document part SHALL preserve original text:
```turtle
ex:paragraph_001 
    rdf:value "This project transforms documents into knowledge graphs." ;
    schema:text "This project transforms documents into knowledge graphs." .
```

Both predicates included for compatibility:
- `rdf:value`: RDF native
- `schema:text`: Schema.org compatibility

**FR-15: Provenance Metadata**

Every generated graph SHALL include:

```turtle
ex:graph_metadata_xyz a prov:Entity ;
    prov:wasGeneratedBy ex:generation_activity_abc ;
    prov:wasDerivedFrom ex:digital_doc_xyz ;
    dct:created "2025-01-15T14:23:10Z"^^xsd:dateTime ;
    ex:generatorVersion "DocumentToKG-PWA/2.0.1" ;
    ex:posAlgorithmVersion "1.3.0" ;
    ex:domainOntologyUsed <https://example.org/ontology/clinical-trials/v1.2> ;
    ex:ontologyVersion "1.2.0" ;
    ex:matchingThreshold 0.85 ;
    ex:userDisambiguations 12 ;  # Count of manual selections
    ex:candidateConcepts 7 .      # Count of unmapped concepts

ex:generation_activity_abc a prov:Activity ;
    prov:startedAtTime "2025-01-15T14:22:45Z"^^xsd:dateTime ;
    prov:endedAtTime "2025-01-15T14:23:10Z"^^xsd:dateTime ;
    prov:wasAssociatedWith ex:user_session_def .
```

---

## 4. Non-Functional Requirements

### 4.1 Architectural Constraints

**Architecture Pattern: Concepts + Event-Driven Synchronizations**

**Dependency Rules:**
1. **Data Structures**: Concepts MAY import shared TypeScript interfaces/types
2. **Behavior Logic**: Concepts SHALL NOT import other concept implementations
3. **Communication**: Strictly via event bus (publish/subscribe)
4. **Utilities**: Pure functions MAY be shared via utility modules (no state)

**Example Permitted:**
```typescript
// Shared types (permitted)
import { DocumentPart, POSToken } from '@/types/core';

// Utility functions (permitted)
import { normalizeText, computeHash } from '@/utils/text';
```

**Example Forbidden:**
```typescript
// Direct concept dependency (forbidden)
import { DocumentStructureConcept } from '@/concepts/structure';
```

**Rationale**: Allows sensible code reuse while maintaining event-driven decoupling.

### 4.2 State Management & Persistence

**FR-16: Intermediate State Caching**

System SHALL cache these intermediate states in IndexedDB:

| State | Store Name | Indexed Fields | Retention |
|-------|------------|----------------|-----------|
| Raw document buffer | `documents_raw` | `doc_hash`, `upload_time` | 7 days |
| Parsed structure | `documents_parsed` | `doc_hash`, `part_count` | 7 days |
| POS analysis results | `pos_results` | `doc_hash`, `noun_phrase_count` | 7 days |
| Disambiguation decisions | `user_mappings` | `doc_hash`, `noun_phrase` | 30 days |
| Generated graphs | `graphs_final` | `doc_hash`, `created_time` | 30 days |

**Cache Invalidation:**
- Document re-upload with same hash → reuse cached structure
- Document re-upload with different hash → invalidate and reprocess
- User-triggered "clear cache" → purge all stores
- Automatic cleanup on browser storage pressure → LRU eviction

**FR-17: Session Recovery**

On browser crash or refresh:
1. System SHALL detect incomplete processing via IndexedDB flags
2. System SHALL present recovery UI: "Resume processing of [document]?"
3. On accept: Resume from last completed stage
4. On decline: Discard incomplete state

### 4.3 Performance Targets

| Metric | Target | Degradation Threshold | Failure Threshold |
|--------|--------|----------------------|-------------------|
| **Initial Load** | < 2s | 5s | 10s |
| **Document Parsing** | < 1s per 50 pages | 3s per 50 pages | Timeout after 60s |
| **POS Analysis** | < 2s per 50 pages | 5s per 50 pages | Timeout after 30s per 1000 words |
| **Ontology Matching** | < 500ms per 100 NPs | 2s per 100 NPs | Timeout after 30s |
| **RDF Serialization** | < 1s per 10k triples | 5s per 10k triples | Memory error |
| **Graph Download** | < 2s for 100k triples | 10s for 100k triples | N/A |

**Memory Constraints:**
- Maximum heap usage: < 500MB for 100-page document
- Chunked processing: Documents > 200 pages processed in 50-page chunks

### 4.4 Offline Capability

**FR-18: Service Worker Requirements**

System SHALL be 100% functional offline after initial caching via Service Worker:

**Cached Resources:**
- All application JavaScript bundles
- CSS stylesheets
- Web Worker scripts
- UI assets (icons, fonts)
- WASM modules (if used for text processing)

**Not Cached (User-Provided):**
- Document files (stored in IndexedDB, not SW cache)
- Domain ontologies (stored in IndexedDB, not SW cache)

**Update Strategy:**
- Check for updates on online connection
- Prompt user: "New version available - reload to update?"
- Never auto-reload (preserve work in progress)

**Prohibited:**
- CDN dependencies (must bundle all libraries)
- External API calls (no web search, no LLM APIs)
- Remote ontology fetching (must upload locally)

---

## 5. Concept Decomposition (Revised)

### 5.1 `documentIngestConcept`

**Responsibility:**
- Accept file upload (drag-drop or file picker)
- Read file into ArrayBuffer
- Extract Word document via Mammoth.js
- Generate document-level identity hash
- Extract document metadata (title, author, created date)

**Input:** `File` object from user
**Output Event:** `documentLoaded`

**Event Payload:**
```typescript
interface DocumentLoadedEvent {
  documentHash: string;
  metadata: {
    title: string;
    author?: string;
    createdDate?: Date;
    fileSize: number;
    format: string;
  };
  rawHTML: string;  // Mammoth output
  rawText: string;  // Plain text extraction
}
```

**Error Handling:**
- Unsupported format → Display error: "Only .docx files supported"
- Corrupted file → Display error: "Unable to parse document"
- Oversized file → Display error: "File exceeds 50MB limit"

### 5.2 `documentStructureConcept`

**Responsibility:**
- Parse Mammoth HTML/JSON into structured document parts
- Identify headings, paragraphs, lists
- Build hierarchical structure (sections contain paragraphs)
- Generate content hashes for each part
- Mint IRIs per Section 2.3 formula
- Build ordered part list

**Input Event:** `documentLoaded`
**Output Event:** `structureReady`

**Event Payload:**
```typescript
interface StructureReadyEvent {
  documentIRI: string;
  documentHash: string;
  parts: DocumentPart[];  // Ordered array
  partList: string;       // IRI of RDF List head
  hierarchy: HierarchyNode;  // Tree structure for sections
}

interface DocumentPart {
  iri: string;
  type: 'paragraph' | 'heading' | 'list' | 'table';
  level?: number;  // For headings: 1-6
  sequenceIndex: number;
  contentHash: string;
  text: string;
  parentIRI?: string;  // For hierarchical nesting
}
```

**Logic:**
```typescript
function buildStructure(rawHTML: string, docHash: string): DocumentPart[] {
  const parts: DocumentPart[] = [];
  let sequenceIndex = 0;
  
  // Parse HTML into DOM
  const dom = new DOMParser().parseFromString(rawHTML, 'text/html');
  
  // Walk document order
  for (const element of dom.body.children) {
    if (element.tagName.match(/^H[1-6]$/)) {
      parts.push({
        iri: mintIRI(docHash, element.textContent, sequenceIndex),
        type: 'heading',
        level: parseInt(element.tagName[1]),
        sequenceIndex: sequenceIndex++,
        contentHash: hash(element.textContent),
        text: element.textContent
      });
    } else if (element.tagName === 'P') {
      parts.push({
        iri: mintIRI(docHash, element.textContent, sequenceIndex),
        type: 'paragraph',
        sequenceIndex: sequenceIndex++,
        contentHash: hash(element.textContent),
        text: element.textContent
      });
    }
    // ... handle lists, tables, etc.
  }
  
  return parts;
}
```

**Error Handling:**
- Empty document → Warning: "Document contains no parseable content"
- Malformed HTML → Attempt recovery, log warnings for unparseable sections

### 5.3 `posAnalysisConcept` (Web Worker)

**Responsibility:**
- Receive document parts
- Execute rule-based POS analysis
- Identify noun phrases, proper nouns, acronyms
- Extract acronym expansions
- Return linguistic annotations

**Input Event:** `structureReady`
**Output Event:** `analysisComplete`

**Event Payload:**
```typescript
interface AnalysisCompleteEvent {
  documentIRI: string;
  annotations: PartAnnotation[];
  statistics: {
    totalParts: number;
    nounPhrases: number;
    properNouns: number;
    acronyms: number;
    processingTimeMs: number;
  };
}

interface PartAnnotation {
  partIRI: string;
  nounPhrases: NounPhrase[];
  acronyms: Acronym[];
}

interface NounPhrase {
  text: string;
  normalizedText: string;  // lowercase, trimmed
  position: { start: number; end: number };
  type: 'common' | 'proper';
}

interface Acronym {
  acronym: string;
  expansion?: string;
  position: { start: number; end: number };
}
```

**Algorithm (Simplified):**
```typescript
// Running in Web Worker
function analyzePart(text: string): PartAnnotation {
  const nounPhrases: NounPhrase[] = [];
  const acronyms: Acronym[] = [];
  
  // Tokenize
  const tokens = tokenize(text);
  
  // Detect acronyms with expansions: "FDA (Food and Drug Administration)"
  const acronymPattern = /\b([A-Z]{2,6})\s*\(([^)]+)\)/g;
  let match;
  while ((match = acronymPattern.exec(text)) !== null) {
    acronyms.push({
      acronym: match[1],
      expansion: match[2],
      position: { start: match.index, end: match.index + match[0].length }
    });
  }
  
  // Detect standalone acronyms
  const standalonePattern = /\b([A-Z]{2,6})\b/g;
  while ((match = standalonePattern.exec(text)) !== null) {
    if (!acronyms.some(a => a.acronym === match[1])) {
      acronyms.push({
        acronym: match[1],
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
  }
  
  // Detect noun phrases (simplified)
  // Pattern: (Adj)* (Noun)+
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].pos === 'NOUN') {
      let phrase = tokens[i].text;
      let j = i + 1;
      
      // Extend forward through consecutive nouns
      while (j < tokens.length && tokens[j].pos === 'NOUN') {
        phrase += ' ' + tokens[j].text;
        j++;
      }
      
      // Look backward for adjectives
      let k = i - 1;
      while (k >= 0 && tokens[k].pos === 'ADJ') {
        phrase = tokens[k].text + ' ' + phrase;
        k--;
      }
      
      nounPhrases.push({
        text: phrase,
        normalizedText: phrase.toLowerCase().trim(),
        position: { start: tokens[k+1].start, end: tokens[j-1].end },
        type: /^[A-Z]/.test(phrase) ? 'proper' : 'common'
      });
      
      i = j - 1;  // Skip ahead
    }
  }
  
  return { nounPhrases, acronyms };
}
```

**Progress Reporting:**
```typescript
// Every 50 parts processed
self.postMessage({
  type: 'progress',
  processed: 50,
  total: 200,
  percentComplete: 25
});
```

**Error Handling:**
- Timeout (30s per 1000 words) → Return partial results + set flag `partialAnalysis: true`
- Memory error → Reduce batch size, retry
- Unrecoverable error → Return error event, allow pipeline to continue with empty annotations

### 5.4 `aboutnessResolutionConcept`

**Responsibility:**
- Load and validate domain ontology
- Match noun phrases to ontology concepts
- Handle disambiguation (multi-match, low confidence)
- Create candidate concepts for unmatched phrases
- Track user disambiguation decisions

**Input Events:** 
- `analysisComplete`
- `userDisambiguation` (from UI)

**Output Event:** `mappingsReady`

**Event Payload:**
```typescript
interface MappingsReadyEvent {
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

interface ConceptMapping {
  partIRI: string;
  nounPhrase: string;
  conceptIRI: string;
  conceptLabel: string;
  confidence: number;
  method: 'exact_label' | 'exact_altLabel' | 'fuzzy_match' | 'user_selected';
  disambiguated: boolean;
}

interface CandidateMapping {
  partIRI: string;
  nounPhrase: string;
  candidateIRI: string;  // Minted candidate concept IRI
}
```

**State Machine:**
```typescript
enum MappingState {
  PENDING_MATCH = 'pending_match',
  EXACT_MATCHED = 'exact_matched',
  FUZZY_MATCHED = 'fuzzy_matched',
  NEEDS_DISAMBIGUATION = 'needs_disambiguation',
  USER_SELECTED = 'user_selected',
  NO_MATCH_CANDIDATE = 'no_match_candidate',
  SKIPPED = 'skipped'
}

class MappingProcess {
  state: MappingState = MappingState.PENDING_MATCH;
  candidates: ConceptMatch[] = [];
  selectedConcept?: string;
  
  async process(nounPhrase: string, ontology: Ontology): Promise<void> {
    // Phase 1: Exact match
    const exact = exactMatch(nounPhrase, ontology);
    if (exact && exact.length === 1) {
      this.state = MappingState.EXACT_MATCHED;
      this.selectedConcept = exact[0].concept;
      return;
    }
    
    if (exact && exact.length > 1) {
      this.state = MappingState.NEEDS_DISAMBIGUATION;
      this.candidates = exact;
      return;
    }
    
    // Phase 2: Fuzzy match
    const fuzzy = fuzzyMatch(nounPhrase, ontology, 0.85);
    if (fuzzy.length === 1 && fuzzy[0].confidence >= 0.85) {
      this.state = MappingState.FUZZY_MATCHED;
      this.selectedConcept = fuzzy[0].concept;
      return;
    }
    
    if (fuzzy.length > 1 || (fuzzy.length === 1 && fuzzy[0].confidence < 0.85)) {
      this.state = MappingState.NEEDS_DISAMBIGUATION;
      this.candidates = fuzzy;
      return;
    }
    
    // Phase 3: No match
    this.state = MappingState.NO_MATCH_CANDIDATE;
  }
  
  userSelect(conceptIRI: string): void {
    this.state = MappingState.USER_SELECTED;
    this.selectedConcept = conceptIRI;
  }
  
  userReject(): void {
    this.state = MappingState.NO_MATCH_CANDIDATE;
  }
  
  userSkip(): void {
    this.state = MappingState.SKIPPED;
  }
}
```

**Disambiguation UI Flow:**
1. Process pauses when encountering `NEEDS_DISAMBIGUATION`
2. Emit `disambiguationRequired` event with candidates
3. Display modal with:
   - Noun phrase in context (sentence highlight)
   - Up to 5 candidates with labels, definitions, confidence
   - "No match" button
   - "Skip" button (defer decision)
4. User selects → Emit `userDisambiguation` event
5. Concept updates state and continues processing

**Caching User Decisions:**
```typescript
// Store in IndexedDB
interface DisambiguationCache {
  documentHash: string;
  nounPhraseNormalized: string;
  selectedConceptIRI: string;
  timestamp: Date;
}

// On subsequent processing:
function checkCache(docHash: string, nounPhrase: string): string | null {
  const cached = await db.disambiguations
    .where(['documentHash', 'nounPhraseNormalized'])
    .equals([docHash, nounPhrase.toLowerCase()])
    .first();
  
  return cached ? cached.selectedConceptIRI : null;
}
```

**Error Handling:**
- Invalid ontology → Fallback to candidate-only mode
- Missing required predicates → Log warning, skip concept
- Ontology load failure → Error message + allow manual ontology selection

### 5.5 `rdfSerializationConcept`

**Responsibility:**
- Construct complete RDF graph in memory
- Build document structure (parts, ordering)
- Add aboutness/mentions assertions
- Add provenance metadata
- Serialize to Turtle and JSON-LD
- Validate output against BFO/IAO patterns (optional)

**Input Event:** `mappingsReady`
**Output Event:** `graphReady`

**Event Payload:**
```typescript
interface GraphReadyEvent {
  documentIRI: string;
  formats: {
    turtle: string;     // Turtle serialization
    jsonld: string;     // JSON-LD serialization
  };
  statistics: {
    totalTriples: number;
    documentParts: number;
    aboutnessAssertions: number;
    candidateConcepts: number;
  };
  downloadURLs: {
    turtle: string;     // Blob URL
    jsonld: string;     // Blob URL
  };
}
```

**Construction Logic:**
```typescript
async function buildGraph(
  structure: StructureReadyEvent,
  mappings: MappingsReadyEvent,
  metadata: DocumentMetadata
): Promise<RDF.Dataset> {
  
  const store = new N3.Store();
  const { namedNode, literal, quad } = N3.DataFactory;
  
  // 1. Document-level metadata
  const docIRI = namedNode(structure.documentIRI);
  store.add(quad(
    docIRI,
    namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
    namedNode('http://purl.obolibrary.org/obo/IAO_0000030')  // ICE
  ));
  
  store.add(quad(
    docIRI,
    namedNode('http://www.w3.org/2000/01/rdf-schema#label'),
    literal(metadata.title)
  ));
  
  store.add(quad(
    docIRI,
    namedNode('http://purl.org/dc/terms/created'),
    literal(metadata.createdDate.toISOString(), namedNode('http://www.w3.org/2001/XMLSchema#dateTime'))
  ));
  
  // 2. Build RDF List for ordering
  let currentListNode = namedNode(structure.documentIRI + '_partlist_000');
  store.add(quad(
    docIRI,
    namedNode('http://purl.obolibrary.org/obo/IAO_0000219'),  // has_document_part
    currentListNode
  ));
  
  for (let i = 0; i < structure.parts.length; i++) {
    const part = structure.parts[i];
    const partIRI = namedNode(part.iri);
    
    // Add to RDF List
    store.add(quad(
      currentListNode,
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#first'),
      partIRI
    ));
    
    if (i < structure.parts.length - 1) {
      const nextListNode = namedNode(structure.documentIRI + `_partlist_${String(i+1).padStart(3, '0')}`);
      store.add(quad(
        currentListNode,
        namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#rest'),
        nextListNode
      ));
      currentListNode = nextListNode;
    } else {
      store.add(quad(
        currentListNode,
        namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#rest'),
        namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#nil')
      ));
    }
    
    // 3. Part metadata
    store.add(quad(
      partIRI,
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      namedNode(getIAOType(part.type))
    ));
    
    store.add(quad(
      partIRI,
      namedNode('http://example.org/sequenceIndex'),
      literal(part.sequenceIndex.toString(), namedNode('http://www.w3.org/2001/XMLSchema#integer'))
    ));
    
    store.add(quad(
      partIRI,
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#value'),
      literal(part.text)
    ));
    
    store.add(quad(
      partIRI,
      namedNode('http://schema.org/text'),
      literal(part.text)
    ));
  }
  
  // 4. Aboutness assertions
  for (const mapping of mappings.mappings) {
    const partIRI = namedNode(mapping.partIRI);
    const conceptIRI = namedNode(mapping.conceptIRI);
    
    store.add(quad(
      partIRI,
      namedNode('http://purl.obolibrary.org/obo/IAO_0000136'),  // is_about
      conceptIRI
    ));
  }
  
  // 5. Candidate concepts (mentions)
  for (const candidate of mappings.candidates) {
    const partIRI = namedNode(candidate.partIRI);
    const candidateIRI = namedNode(candidate.candidateIRI);
    
    // Create candidate entity
    store.add(quad(
      candidateIRI,
      namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
      namedNode('http://example.org/CandidateConceptEntity')
    ));
    
    store.add(quad(
      candidateIRI,
      namedNode('http://www.w3.org/2000/01/rdf-schema#label'),
      literal(candidate.nounPhrase)
    ));
    
    // Weak mention assertion
    store.add(quad(
      partIRI,
      namedNode('http://purl.obolibrary.org/obo/IAO_0000142'),  // mentions
      candidateIRI
    ));
  }
  
  // 6. Provenance metadata
  const graphMetaIRI = namedNode(structure.documentIRI + '_metadata');
  store.add(quad(
    graphMetaIRI,
    namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
    namedNode('http://www.w3.org/ns/prov#Entity')
  ));
  
  store.add(quad(
    graphMetaIRI,
    namedNode('http://www.w3.org/ns/prov#wasDerivedFrom'),
    docIRI
  ));
  
  store.add(quad(
    graphMetaIRI,
    namedNode('http://purl.org/dc/terms/created'),
    literal(new Date().toISOString(), namedNode('http://www.w3.org/2001/XMLSchema#dateTime'))
  ));
  
  store.add(quad(
    graphMetaIRI,
    namedNode('http://example.org/generatorVersion'),
    literal('DocumentToKG-PWA/2.0.1')
  ));
  
  store.add(quad(
    graphMetaIRI,
    namedNode('http://example.org/userDisambiguations'),
    literal(mappings.statistics.disambiguated.toString(), namedNode('http://www.w3.org/2001/XMLSchema#integer'))
  ));
  
  return store;
}

function getIAOType(partType: string): string {
  const typeMap = {
    'paragraph': 'http://purl.obolibrary.org/obo/IAO_0000302',
    'heading': 'http://purl.obolibrary.org/obo/IAO_0000304',
    'list': 'http://purl.obolibrary.org/obo/IAO_0000320',
    'table': 'http://purl.obolibrary.org/obo/IAO_0000306'
  };
  return typeMap[partType] || 'http://purl.obolibrary.org/obo/IAO_0000314';  // document part
}
```

**Serialization:**
```typescript
// Turtle
const writer = new N3.Writer({ prefixes: {
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  owl: 'http://www.w3.org/2002/07/owl#',
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  iao: 'http://purl.obolibrary.org/obo/IAO_',
  bfo: 'http://purl.obolibrary.org/obo/BFO_',
  dct: 'http://purl.org/dc/terms/',
  prov: 'http://www.w3.org/ns/prov#',
  schema: 'http://schema.org/',
  ex: 'http://example.org/'
}});

writer.addQuads(store.getQuads(null, null, null, null));
const turtle = await new Promise<string>((resolve, reject) => {
  writer.end((error, result) => {
    if (error) reject(error);
    else resolve(result);
  });
});

// JSON-LD
const jsonld = await jsonLdSerialize(store, {
  '@context': {
    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    iao: 'http://purl.obolibrary.org/obo/IAO_',
    // ... full context
  }
});
```

**Error Handling:**
- Serialization failure → Retry with smaller batch
- Memory overflow → Suggest exporting only structure or only aboutness
- Invalid IRIs in input → Log warning, skip triple

### 5.6 `ontologyManagementConcept`

**Responsibility:**
- Load domain ontology from user upload
- Validate against SHACL shape
- Parse into queryable in-memory index
- Extract labels, definitions, synonyms
- Provide matching interface to aboutnessResolutionConcept

**Input:** User file upload (Turtle or JSON-LD)
**Output Event:** `ontologyReady`

**Event Payload:**
```typescript
interface OntologyReadyEvent {
  ontologyIRI: string;
  title: string;
  version: string;
  conceptCount: number;
  validationErrors: ValidationError[];
  ready: boolean;
}

interface ValidationError {
  severity: 'error' | 'warning';
  message: string;
  conceptIRI?: string;
}
```

**Validation Rules (SHACL):**
```turtle
ex:ConceptShape a sh:NodeShape ;
    sh:targetClass owl:Class ;
    sh:property [
        sh:path rdfs:label ;
        sh:minCount 1 ;
        sh:message "Every concept must have at least one rdfs:label" ;
    ] ;
    sh:property [
        sh:path skos:prefLabel ;
        sh:maxCount 1 ;
        sh:message "Concepts should have at most one skos:prefLabel per language" ;
    ] .
```

**In-Memory Index Structure:**
```typescript
class OntologyIndex {
  concepts: Map<string, OntologyConcept> = new Map();
  labelIndex: Map<string, string[]> = new Map();  // normalized label -> concept IRIs
  altLabelIndex: Map<string, string[]> = new Map();
  
  load(rdfStore: N3.Store): void {
    // Extract all concepts (owl:Class, skos:Concept, etc.)
    const conceptQuads = rdfStore.getQuads(null, RDF.type, OWL.Class, null);
    
    for (const quad of conceptQuads) {
      const conceptIRI = quad.subject.value;
      const concept = this.extractConcept(rdfStore, conceptIRI);
      this.concepts.set(conceptIRI, concept);
      
      // Index by label
      const normalizedLabel = normalize(concept.label);
      if (!this.labelIndex.has(normalizedLabel)) {
        this.labelIndex.set(normalizedLabel, []);
      }
      this.labelIndex.get(normalizedLabel)!.push(conceptIRI);
      
      // Index by altLabels
      for (const alt of concept.altLabels) {
        const normalizedAlt = normalize(alt);
        if (!this.altLabelIndex.has(normalizedAlt)) {
          this.altLabelIndex.set(normalizedAlt, []);
        }
        this.altLabelIndex.get(normalizedAlt)!.push(conceptIRI);
      }
    }
  }
  
  exactMatch(nounPhrase: string): OntologyConcept[] {
    const normalized = normalize(nounPhrase);
    const fromLabel = this.labelIndex.get(normalized) || [];
    const fromAlt = this.altLabelIndex.get(normalized) || [];
    const allIRIs = [...new Set([...fromLabel, ...fromAlt])];
    return allIRIs.map(iri => this.concepts.get(iri)!);
  }
  
  fuzzyMatch(nounPhrase: string, threshold: number): Array<{concept: OntologyConcept, similarity: number}> {
    const results: Array<{concept: OntologyConcept, similarity: number}> = [];
    
    for (const [label, iris] of this.labelIndex.entries()) {
      const sim = levenshteinSimilarity(normalize(nounPhrase), label);
      if (sim >= threshold) {
        for (const iri of iris) {
          results.push({ concept: this.concepts.get(iri)!, similarity: sim });
        }
      }
    }
    
    return results.sort((a, b) => b.similarity - a.similarity);
  }
}
```

**Error Handling:**
- Invalid RDF syntax → Parse error message, reject load
- Missing required predicates → Validation warnings, allow load
- No concepts found → Warning: "Ontology contains no usable concepts", fallback to candidate-only mode

---

## 6. Synchronizations (Event-Driven Pipeline)

### 6.1 Happy Path Flow

```typescript
const pipeline: Synchronization[] = [
  { 
    when: 'documentLoaded', 
    from: 'documentIngestConcept', 
    do: 'documentStructureConcept.parse',
    errorStrategy: 'halt'
  },
  { 
    when: 'structureReady', 
    from: 'documentStructureConcept', 
    do: 'posAnalysisConcept.analyze',
    errorStrategy: 'continue_with_empty'
  },
  { 
    when: 'analysisComplete', 
    from: 'posAnalysisConcept', 
    do: 'aboutnessResolutionConcept.match',
    errorStrategy: 'continue_with_candidates_only'
  },
  { 
    when: 'mappingsReady', 
    from: 'aboutnessResolutionConcept', 
    do: 'rdfSerializationConcept.generate',
    errorStrategy: 'halt'
  },
  { 
    when: 'graphReady', 
    from: 'rdfSerializationConcept', 
    do: 'uiConcept.displayDownload',
    errorStrategy: 'log_only'
  }
];
```

### 6.2 Disambiguation Sub-Flow

```typescript
const disambiguationFlow: Synchronization[] = [
  {
    when: 'disambiguationRequired',
    from: 'aboutnessResolutionConcept',
    do: 'uiConcept.showDisambiguationModal',
    errorStrategy: 'log_only'
  },
  {
    when: 'userDisambiguation',
    from: 'uiConcept',
    do: 'aboutnessResolutionConcept.applyUserChoice',
    errorStrategy: 'continue'
  }
];
```

### 6.3 Error Handling Strategies

| Strategy | Behavior | Use Case |
|----------|----------|----------|
| `halt` | Stop pipeline, display error | Critical failures (parse error, serialization failure) |
| `continue_with_empty` | Proceed with empty result set | POS analysis timeout → continue without linguistic annotations |
| `continue_with_candidates_only` | Proceed treating all as unmapped | Ontology load failure → all NPs become candidates |
| `log_only` | Log error, continue | UI rendering issues |
| `retry` | Attempt operation 3 times before failing | Network issues (if we add remote ontology fetch) |

### 6.4 Progress Tracking

```typescript
interface PipelineProgress {
  stage: 'ingest' | 'structure' | 'pos' | 'mapping' | 'serialization' | 'complete';
  percentComplete: number;
  currentTask: string;
  errors: PipelineError[];
  warnings: PipelineWarning[];
}

// Emit progress events
eventBus.emit('pipelineProgress', {
  stage: 'pos',
  percentComplete: 45,
  currentTask: 'Analyzing linguistic patterns (150/200 paragraphs)',
  errors: [],
  warnings: []
});
```

---

## 7. Explicit Non-Goals

**NG-1: No LLM Integration**
- Rationale: Maintains determinism, offline capability, and reproducibility
- Trade-off: Lower semantic understanding, no contextual disambiguation
- Mitigation: High-quality domain ontologies + user disambiguation

**NG-2: No Source Document Modification**
- Rationale: Read-only operation, no risk of data loss
- The original .docx file is never altered

**NG-3: No "Fuzzy" or Probabilistic Reasoning**
- Rationale: Deterministic outputs only
- If a concept isn't in the local ontology, it becomes a candidate
- No inference, no reasoning, no belief propagation

**NG-4: No Real-Time Collaboration**
- Rationale: Offline-first, single-user PWA
- Future enhancement: Sync via CRDTs or operational transforms

**NG-5: No Automated Ontology Enrichment**
- Rationale: Ontology is read-only within this system
- Users must maintain ontologies externally
- Future enhancement: Export candidate concepts for ontology extension

**NG-6: No Multi-Document Cross-Referencing**
- Rationale: Each document processed independently
- No inter-document aboutness relations
- Future enhancement: Project-level graph merging

**NG-7: No Natural Language Querying**
- Rationale: Output is RDF for SPARQL querying
- No built-in NL-to-SPARQL translation
- Users interact with graph via external tools (GraphDB, Protégé, etc.)

---

## 8. Success Criteria

### 8.1 Functional Tests

**Test 1: Identity Stability**
- Upload same document twice
- Expected: Identical IRIs for all document parts
- Validation: SHA-256 comparison of Turtle output

**Test 2: Multi-Document Identity Distinction**
- Create two documents with identical paragraph text
- Expected: Different IRIs (different doc hashes)
- Validation: Assert IRIs are distinct despite content match

**Test 3: Order Preservation**
- Upload document with 50 paragraphs
- Query RDF List: `SELECT ?text WHERE { ?list rdf:rest*/rdf:first ?part . ?part rdf:value ?text }`
- Expected: Text returned in original document order
- Validation: Compare to source document line-by-line

**Test 4: Order Querying Efficiency**
- Upload document with 200 paragraphs
- Query via index: `SELECT ?text WHERE { ?part ex:sequenceIndex ?idx ; rdf:value ?text } ORDER BY ?idx`
- Expected: Results in < 100ms (in-memory triplestore)
- Validation: Benchmark query time

**Test 5: Realist Ontological Compliance**
- Load generated graph into OWL reasoner
- Run consistency check against BFO/IAO
- Expected: No category errors, no inconsistencies
- Validation: ROBOT report shows zero errors

**Test 6: Aboutness Correctness (with test ontology)**
- Upload document with known terminology
- Provide curated test ontology
- Expected: 100% of exact matches found, >90% precision on fuzzy matches
- Validation: Manual review of first 100 mappings

**Test 7: Disambiguation Workflow**
- Upload document with ambiguous terms ("bank", "mercury")
- Expected: System presents disambiguation UI for ambiguous matches
- User selects choice
- Expected: Selection persisted, reused on re-upload
- Validation: Check IndexedDB for cached decision

**Test 8: Candidate Creation**
- Upload document with novel terminology not in ontology
- Expected: Unmapped NPs become `ex:CandidateConceptEntity` instances
- Expected: Linked via `iao:mentions`, not `iao:is_about`
- Validation: SPARQL query for candidate count matches unmapped NP count

**Test 9: Provenance Completeness**
- Generate graph
- Expected: Metadata includes generator version, ontology version, timestamp, disambiguation count
- Validation: SPARQL query extracts all required provenance fields

**Test 10: Offline Functionality**
- Load app while online
- Disconnect network
- Upload document, process, download graph
- Expected: All operations succeed
- Validation: DevTools network tab shows zero requests

### 8.2 Performance Tests

**Test 11: 100-Page Document Processing**
- Upload 100-page Word document (~50k words)
- Expected: Complete processing in < 5 seconds
- Breakdown:
  - Ingest: < 1s
  - Structure: < 1s
  - POS: < 2s
  - Mapping: < 500ms
  - Serialization: < 500ms

**Test 12: 500-Page Document (Stress Test)**
- Upload 500-page document (~250k words)
- Expected: Complete processing without crash or timeout
- Acceptable: May take 20-30 seconds
- Validation: Memory usage stays < 1GB

**Test 13: Large Ontology Matching**
- Load ontology with 10,000 concepts
- Process 100-page document
- Expected: Matching completes in < 2 seconds per 100 NPs
- Validation: Profiling shows acceptable algorithmic complexity

### 8.3 Ontological Validation Tests

**Test 14: Concretization Chain**
- Load generated graph
- Query: Find all ICE → SDC → Material Entity chains
- Expected: Every DocumentContentGDC has `iao:is_concretized_by` pointing to an SDC
- Expected: Every SDC has `bfo:specifically_depends_on` pointing to a Material Entity
- Validation: SPARQL query returns complete chains for all documents

**Test 15: Mereological Consistency**
- Load generated graph
- Query: Find all part-whole relationships
- Expected: All document parts use `iao:is_part_of` (not generic BFO `bfo:part_of`)
- Expected: All parts are typed as IAO subclasses (paragraph, heading, etc.)
- Validation: No use of bare BFO mereology predicates

**Test 16: Aboutness Restriction Removal**
- Load test ontology with:
  - Continuants (e.g., `ex:Patient`)
  - Occurrents (e.g., `ex:SurgicalProcedure`)
  - Qualities (e.g., `ex:Temperature`)
- Upload document mentioning all three categories
- Expected: `iao:is_about` successfully links to all categories
- Validation: SPARQL query confirms aboutness to non-continuant entities

### 8.4 Edge Cases

**Test 17: Empty Document**
- Upload Word document with no content
- Expected: Warning message: "Document contains no parseable content"
- Expected: No crash, graceful handling

**Test 18: Document with Only Images**
- Upload document with images, no text
- Expected: Structure extracted, but zero paragraphs
- Expected: Empty RDF graph (only document-level metadata)

**Test 19: Malformed Ontology**
- Upload invalid Turtle file as ontology
- Expected: Parse error displayed
- Expected: System falls back to candidate-only mode

**Test 20: POS Timeout**
- Upload extremely dense 200-page document
- Simulate worker timeout
- Expected: Partial results returned with warning flag
- Expected: Pipeline continues with available annotations

---

## 9. Domain Ontology SHACL Shape

Required validation shape for domain ontologies:

```turtle
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:DomainOntologyShape a sh:NodeShape ;
    sh:targetClass owl:Ontology ;
    sh:property [
        sh:path dct:title ;
        sh:minCount 1 ;
        sh:datatype xsd:string ;
        sh:message "Ontology must have a title" ;
    ] ;
    sh:property [
        sh:path owl:versionInfo ;
        sh:minCount 1 ;
        sh:message "Ontology must have version information" ;
    ] .

ex:ConceptShape a sh:NodeShape ;
    sh:targetClass owl:Class ;
    sh:property [
        sh:path rdfs:label ;
        sh:minCount 1 ;
        sh:message "Every concept must have at least one rdfs:label" ;
    ] ;
    sh:property [
        sh:path skos:prefLabel ;
        sh:maxCount 1 ;
        sh:uniqueLang true ;
        sh:message "At most one skos:prefLabel per language" ;
    ] ;
    sh:property [
        sh:path skos:definition ;
        sh:or (
            [ sh:path rdfs:comment ]
            [ sh:path skos:definition ]
        ) ;
        sh:minCount 1 ;
        sh:message "Concepts should have either skos:definition or rdfs:comment" ;
        sh:severity sh:Warning ;
    ] .
```

**Validation Levels:**
- **Error** (blocks ontology load): Missing labels, invalid syntax
- **Warning** (allows load): Missing definitions, no version info

---

## 10. Technical Implementation Notes

### 10.1 Libraries & Dependencies

| Library | Version | Purpose | Bundle Size |
|---------|---------|---------|-------------|
| **Mammoth.js** | 1.6.0 | Word document parsing | ~400KB |
| **N3.js** | 1.17.0 | RDF manipulation | ~200KB |
| **rdflib.js** | (alternative) | RDF store | ~500KB |
| **json-ld** | 8.3.0 | JSON-LD serialization | ~300KB |
| **idb** | 7.1.0 | IndexedDB wrapper | ~10KB |
| **Levenshtein** | 1.0.5 | String similarity | ~5KB |

**Total Bundle Size**: ~1.4MB (minified, gzipped: ~400KB)

**CDN Prohibition**: All libraries must be bundled, no runtime CDN fetching.

### 10.2 Browser Compatibility

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 90+ | Full support |
| Firefox | 88+ | Full support |
| Safari | 14+ | Service Worker limitations |
| Edge | 90+ | Full support |

**Required APIs:**
- Web Workers
- Service Workers
- IndexedDB
- FileReader API
- Blob URLs
- ES2020 features (BigInt, Optional Chaining)

### 10.3 Build & Deployment

**Build Tool**: Vite 5.0+

**Build Configuration:**
```javascript
// vite.config.ts
export default {
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'rdf': ['n3', 'jsonld'],
          'document': ['mammoth'],
          'worker': ['./src/workers/pos-worker.ts']
        }
      }
    }
  },
  worker: {
    format: 'es'
  },
  plugins: [
    vitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'Document to BFO Knowledge Graph',
        short_name: 'Doc2KG',
        theme_color: '#1a73e8',
        icons: [...]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,wasm}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024  // 10MB
      }
    })
  ]
}
```

**Deployment:**
- Static hosting (Netlify, Vercel, GitHub Pages)
- HTTPS required (for Service Workers)
- No server-side logic

---

## 11. Future Enhancements (Post-MVP)

**FE-1: Visual Graph Browser**
- Interactive visualization of generated knowledge graph
- Cytoscape.js or D3.js-based rendering
- Filter by aboutness, part type, etc.

**FE-2: SPARQL Query Interface**
- Embedded SPARQL editor (YASGUI)
- Query the generated graph in-browser
- Save/load query templates

**FE-3: Multi-Document Projects**
- Create projects containing multiple documents
- Merge graphs with shared ontology
- Inter-document aboutness relations

**FE-4: Ontology Editor**
- Lightweight ontology creation/editing
- Add concepts directly from candidate list
- Export enriched ontology

**FE-5: Export to External Triplestores**
- Direct upload to GraphDB, Fuseki, Blazegraph
- Generate SPARQL UPDATE queries
- Authentication support

**FE-6: Table Extraction**
- Parse Word tables into RDF
- Represent as `iao:table` with row/column structure
- Map table cells to ontology concepts

**FE-7: Advanced POS (Optional)**
- Integrate WASM-compiled spaCy model
- Improve noun phrase detection accuracy
- Relation extraction (subject-predicate-object)

**FE-8: Versioning & Diffs**
- Track document revisions
- Generate RDF diffs between versions
- Visualize changes over time

---

## 12. Glossary

| Term | Definition |
|------|------------|
| **BFO** | Basic Formal Ontology - a top-level ontology for scientific domains |
| **IAO** | Information Artifact Ontology - extends BFO for information entities |
| **ICE** | Information Content Entity - a generically dependent continuant |
| **GDC** | Generically Dependent Continuant - can be concretized by multiple bearers |
| **SDC** | Specifically Dependent Continuant - depends on specific material bearer |
| **Concretization** | The relation between a GDC and the SDC that bears it |
| **Aboutness** | The `iao:is_about` relation linking information to what it represents |
| **Candidate Concept** | An unmapped noun phrase requiring manual review |
| **Disambiguation** | User selection among multiple ontology match candidates |
| **Domain Ontology** | User-provided RDF ontology for semantic mapping |

---

## 13. Document Metadata

| Field | Value |
|-------|-------|
| **Document Version** | 2.0.1 (Revised) |
| **Last Updated** | 2025-01-15 |
| **Author** | Claude (Anthropic AI) |
| **Reviewer** | Aaron (Ontology of Freedom Initiative) |
| **Status** | Draft - Awaiting Implementation |
| **Change Log** | See Section 14 |

---

## 14. Change Log

### v2.0.1 (2025-01-15) - Major Revision
**Ontological Corrections:**
- Fixed concretization model (Section 2.2)
- Corrected IRI generation to include document context (Section 2.3)
- Changed "Document Order" from "Relational Quality" to explicit representation
- Removed "Independent Continuant" restriction on aboutness
- Corrected digital files from "Material Entity" to IAO:DigitalEntity
- Specified use of IAO document part classes (not generic BFO mereology)

**Architectural Improvements:**
- Added complete domain ontology specification (Section 3.3)
- Detailed disambiguation workflow (FR-10)
- Added error handling strategies (Section 6.3)
- Specified provenance metadata requirements (FR-15)
- Relaxed "no imports" rule to allow type/interface sharing
- Added comprehensive test suite (Section 8)

**Documentation:**
- Added SHACL validation shape for ontologies (Section 9)
- Added technical implementation details (Section 10)
- Added future enhancements roadmap (Section 11)
- Added glossary and metadata sections

### v2.0.0 (Original Draft)
- Initial specification
- Basic BFO/IAO alignment (with errors)
- Core functional requirements
- Concept-based architecture

---

## Appendix A: Example RDF Output (Abbreviated)

```turtle
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix iao: <http://purl.obolibrary.org/obo/IAO_> .
@prefix bfo: <http://purl.obolibrary.org/obo/BFO_> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix ex: <http://example.org/> .

# Document-level entity
ex:doc_a1b2c3d4 a iao:0000030 ;  # Information Content Entity
    rdfs:label "Clinical Trial Protocol v3.2" ;
    dct:created "2024-12-10T09:00:00Z"^^xsd:dateTime ;
    dct:source "protocol_v3.2.docx" ;
    iao:0000219 ex:doc_a1b2c3d4_partlist_000 .  # has_document_part

# RDF List for ordering
ex:doc_a1b2c3d4_partlist_000 a rdf:List ;
    rdf:first ex:doc_a1b2c3d4_part_e5f6_pos_001 ;
    rdf:rest ex:doc_a1b2c3d4_partlist_001 .

ex:doc_a1b2c3d4_partlist_001 a rdf:List ;
    rdf:first ex:doc_a1b2c3d4_part_g7h8_pos_002 ;
    rdf:rest rdf:nil .

# Paragraph 1
ex:doc_a1b2c3d4_part_e5f6_pos_001 a iao:0000302 ;  # Paragraph
    ex:sequenceIndex 1 ;
    rdf:value "This study evaluates the efficacy of Drug X in Phase 2 clinical trials." ;
    iao:0000136 ex:drug_x, ex:phase_2_trial .  # is_about

# Paragraph 2
ex:doc_a1b2c3d4_part_g7h8_pos_002 a iao:0000302 ;
    ex:sequenceIndex 2 ;
    rdf:value "The FDA (Food and Drug Administration) requires additional biomarker data." ;
    iao:0000136 ex:fda ;
    iao:0000142 ex:candidate_biomarker_data .  # mentions (weak)

# Domain concepts (from ontology)
ex:drug_x a owl:Class ;
    rdfs:label "Drug X" ;
    skos:definition "Experimental therapeutic compound for Alzheimer's disease" .

ex:phase_2_trial a owl:Class ;
    rdfs:label "Phase 2 Clinical Trial" ;
    skos:definition "Clinical trial phase evaluating efficacy in limited patient population" .

ex:fda a owl:Class ;
    rdfs:label "FDA" ;
    skos:prefLabel "FDA" ;
    skos:altLabel "Food and Drug Administration" .

# Candidate concept (unmapped)
ex:candidate_biomarker_data a ex:CandidateConceptEntity ;
    rdfs:label "biomarker data" ;
    ex:extracted_from ex:doc_a1b2c3d4_part_g7h8_pos_002 ;
    rdfs:comment "Unmapped concept - requires manual review" .

# Provenance
ex:graph_metadata_xyz a prov:Entity ;
    prov:wasDerivedFrom ex:doc_a1b2c3d4 ;
    dct:created "2025-01-15T14:23:10Z"^^xsd:dateTime ;
    ex:generatorVersion "DocumentToKG-PWA/2.0.1" ;
    ex:ontologyVersion "ClinicalTrialsOntology/1.2.0" .
```

---

## Appendix B: POS Lexicon (Subset)

```javascript
const lexicon = {
  nouns: [
    'trial', 'patient', 'drug', 'study', 'data', 'result', 'efficacy', 
    'safety', 'protocol', 'cohort', 'endpoint', 'biomarker', 'dose', 
    'administration', 'monitoring', 'adverse', 'event'
  ],
  adjectives: [
    'clinical', 'experimental', 'primary', 'secondary', 'randomized',
    'double-blind', 'placebo-controlled', 'multicenter', 'prospective'
  ],
  stopwords: [
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been'
  ]
};
```

---

**End of Document**
