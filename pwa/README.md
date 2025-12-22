# Concretize PWA

Document-to-BFO Knowledge Graph Progressive Web Application

## Phase 0: Foundation & Architecture Setup ✅

This phase establishes the foundational architecture using the **Concepts + Synchronizations** pattern.

### Completed Components

#### 1. Project Structure
```
pwa/
├── src/
│   ├── concepts/          # Independent concept modules (Phase 1+)
│   ├── synchronizations/  # Event-driven connections (Phase 1+)
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Pure utility functions
│   ├── workers/          # Web Worker scripts (Phase 2+)
│   ├── ui/               # UI components (Phase 5+)
│   └── main.ts           # Application entry point
├── tests/
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests (Phase 1+)
│   └── fixtures/         # Test data (Phase 1+)
├── public/               # Static assets
├── index.html            # Main HTML file
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript configuration
└── vite.config.ts        # Vite build configuration
```

#### 2. Core Type Definitions (`src/types/core.ts`)
- Document metadata and structure types
- Linguistic analysis types (noun phrases, acronyms)
- Ontology mapping types
- Event payload types
- POS tagging types
- Storage types for IndexedDB

#### 3. Event Bus (`src/utils/eventBus.ts`)
- Publish-subscribe event system
- Async handler support
- Debug logging
- Unsubscribe mechanism
- Error isolation (one failing handler doesn't break others)

#### 4. Text Utilities (`src/utils/text.ts`)
Pure functions for:
- Text normalization
- Deterministic hashing
- IRI minting (BFO-compliant)
- Levenshtein distance/similarity (fuzzy matching)
- Text truncation
- HTML escaping
- IRI to label conversion

#### 5. POS Tagging Module (`src/utils/pos.ts`)
Converted from proof of concept:
- `Lemmatizer` - Word lemmatization
- `POSTagger` - Part-of-speech tagging and chunking
- `extractNounPhrases()` - Proper noun extraction
- `extractAcronyms()` - Acronym detection with expansions

#### 6. Test Infrastructure
- Vitest configured with coverage
- Unit tests for all utilities (85%+ coverage target)
- Test files:
  - `text.test.ts` - Text utility tests
  - `eventBus.test.ts` - Event bus tests
  - `pos.test.ts` - POS tagging tests

### Technology Stack

- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Vitest** - Unit testing framework
- **PWA Plugin** - Progressive Web App capabilities
- **N3.js** - RDF/Turtle parsing and generation (Phase 4)
- **Mammoth.js** - Word document parsing (Phase 1)
- **IndexedDB (idb)** - Offline storage (Phase 6)

### Getting Started

```bash
# Install dependencies
cd pwa
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build

# Preview production build
npm run preview
```

### Architecture Principles

1. **Concepts + Synchronizations**
   - Concepts are self-contained modules with state and actions
   - Concepts NEVER import each other directly
   - All inter-concept communication via events

2. **Event-Driven**
   - Loose coupling between components
   - Easy to add/remove features
   - Testable in isolation

3. **Deterministic**
   - Same input = same output
   - Reproducible IRI generation
   - Consistent hashing

4. **Offline-First**
   - No external API dependencies for core functionality
   - IndexedDB for persistence
   - Service Worker for offline capability

### Success Criteria ✅

- [x] Build system functional (Vite + TypeScript)
- [x] Event bus operational with test coverage
- [x] Core types defined and documented
- [x] Utility functions tested (>90% coverage)
- [x] Project structure follows architectural pattern
- [x] POS proof of concept converted to TypeScript

### Next Steps: Phase 1

Phase 1 will implement:
- Document ingestion concept
- Document structure parsing concept
- Mammoth.js integration
- Deterministic IRI generation
- First synchronizations (event wiring)

See [phasedProjectPlan.md](../phasedProjectPlan.md) for full roadmap.

## Development Guidelines

### Adding a New Concept

1. Create file in `src/concepts/`
2. Define state interface
3. Define actions
4. Use `eventBus.emit()` to notify other concepts
5. NEVER import other concepts directly

### Adding a New Event

1. Define payload type in `src/types/core.ts`
2. Document event name and purpose
3. Create synchronization in `src/synchronizations/`

### Writing Tests

1. Each module should have corresponding test file
2. Target 85%+ code coverage
3. Test happy path + edge cases
4. Use `vi.fn()` for mocking

### Code Style

- Use TypeScript strict mode
- Prefer pure functions
- Document public interfaces with JSDoc
- Use meaningful variable names
- Keep functions focused (single responsibility)

## License

MIT
