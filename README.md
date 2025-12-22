# Concretize - Document to BFO Knowledge Graph PWA

> **Transform Word documents into BFO-compliant RDF knowledge graphs**

An offline-first Progressive Web Application that parses Microsoft Word documents, extracts their structure and semantics, and generates ontologically rigorous RDF knowledge graphs following Basic Formal Ontology (BFO) and Information Artifact Ontology (IAO) standards.

---

## 🎯 Project Status

**Current Phase**: Phase 0 Complete ✅ → Ready for Phase 1

- ✅ **Phase 0**: Foundation & Architecture (Complete - 76/76 tests passing)
- 🚧 **Phase 1**: Document Ingestion & Structure Extraction (Next)
- ⏳ **Phase 2**: POS Analysis & Linguistic Processing
- ⏳ **Phase 3**: Ontology Matching
- ⏳ **Phase 4**: RDF Serialization
- ⏳ **Phase 5**: UI/UX
- ⏳ **Phase 6**: Production PWA

See [phasedProjectPlan.md](./phasedProjectPlan.md) for complete roadmap.

---

## ⚡ Quick Start

### Run the PWA

```bash
cd pwa
npm install
npm run dev          # Development server
npm test             # Run all tests (76 tests)
npm run build        # Production build
```

### View Documentation

- **[pwa/README.md](./pwa/README.md)** - PWA developer guide (START HERE)
- **[phasedProjectPlan.md](./phasedProjectPlan.md)** - 6-phase implementation plan
- **[agenticDevlopment.md](./agenticDevlopment.md)** - Concepts + Synchronizations architecture
- **[requirments.md](./requirments.md)** - BFO/IAO ontological requirements
- **[PHASE_0_COMPLETE.md](./PHASE_0_COMPLETE.md)** - Phase 0 completion report

---

## 🏗️ Architecture

### Concepts + Synchronizations Pattern

Concretize follows the MIT CSAIL **Concepts + Synchronizations** architecture:

- **Concepts**: Independent, stateful modules (e.g., `documentIngestConcept`, `posAnalysisConcept`)
- **Synchronizations**: Event-driven wiring between concepts
- **Event Bus**: Decoupled pub/sub communication
- **Pure Utilities**: Side-effect-free helper functions

See [agenticDevlopment.md](./agenticDevlopment.md) for details.

### Tech Stack

- **Frontend**: TypeScript + Vite
- **Testing**: Vitest (76 unit tests)
- **PWA**: Vite PWA Plugin (Workbox)
- **Parsing**: Mammoth.js (Word documents)
- **Ontology**: BFO 2.0, IAO
- **RDF**: N3.js (Turtle serialization)
- **Storage**: IndexedDB (offline-first)

---

## 📁 Repository Structure

```
concretize/
├── pwa/                          🎯 Active PWA Application
│   ├── src/
│   │   ├── main.ts               Entry point
│   │   ├── types/core.ts         TypeScript types (400+ lines)
│   │   ├── utils/                Pure utility functions
│   │   │   ├── eventBus.ts       Event-driven communication
│   │   │   ├── text.ts           Text processing & IRI minting
│   │   │   └── pos.ts            Part-of-Speech tagging
│   │   ├── concepts/             Concept implementations (Phase 1+)
│   │   ├── synchronizations/     Event wiring (Phase 1+)
│   │   ├── ui/                   UI components (Phase 5+)
│   │   ├── workers/              Web Workers (Phase 2+)
│   │   └── test-framework/       UI testing framework
│   ├── tests/                    76 passing unit tests
│   ├── public/                   PWA assets (manifest, icons)
│   └── vite.config.ts            Build & PWA configuration
│
├── .github/workflows/
│   ├── ci.yml                    Legacy tests + PWA deployment
│   └── pwa-ci.yml                PWA testing & validation
│
├── POS_Proof_of_concept/         POS lexicon (for Phase 2)
│
├── bfo-core.ttl                  BFO ontology reference
├── agenticDevlopment.md          Architecture guide
├── requirments.md                BFO/IAO requirements
├── phasedProjectPlan.md          6-phase roadmap
└── PHASE_0_*.md                  Phase 0 reports
```

---

## 🧪 Testing

### PWA Tests (Vitest)

```bash
cd pwa
npm test                 # All tests
npm run test:ui          # Test UI (browser)
npm run test:coverage    # Coverage report
```

**Test Stats**: 76/76 passing (100%)
- Event bus: 14 tests
- Text utilities: 35 tests
- POS tagging: 27 tests

### UI Framework Tests (Optional)

```bash
cd pwa/src/test-framework && npm test  # UI test framework
```

---

## 🚀 Deployment

### GitHub Pages (Automated)

The PWA automatically deploys to GitHub Pages on every push to `main`:

1. **CI Workflow** ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs UI framework tests
2. **Deploy Job** builds PWA and deploys to GitHub Pages
3. **PWA CI** ([.github/workflows/pwa-ci.yml](.github/workflows/pwa-ci.yml)) validates PWA-specific changes (TypeScript, tests, coverage)

View deployment: `https://<username>.github.io/<repo-name>/`

### Manual Deployment

```bash
cd pwa
npm run build            # Creates pwa/dist/
# Deploy pwa/dist/ to your hosting service
```

---

## 📖 Documentation Index

### Getting Started
1. **[pwa/README.md](./pwa/README.md)** - PWA developer guide (START HERE)
2. **[phasedProjectPlan.md](./phasedProjectPlan.md)** - Implementation roadmap
3. **[PHASE_0_COMPLETE.md](./PHASE_0_COMPLETE.md)** - What's been built

### Architecture
4. **[agenticDevlopment.md](./agenticDevlopment.md)** - Concepts + Synchronizations pattern
5. **[requirments.md](./requirments.md)** - BFO/IAO ontological requirements
6. **[testStrategy.md](./testStrategy.md)** - Testing philosophy

### Phase Reports
7. **[PHASE_0_VERIFICATION.md](./PHASE_0_VERIFICATION.md)** - Verification checklist
8. **[PHASE_0_FINAL_SUMMARY.md](./PHASE_0_FINAL_SUMMARY.md)** - Executive summary
9. **[PHASE_0_CI_STATUS.md](./PHASE_0_CI_STATUS.md)** - CI/CD status
10. **[PHASE_0_TO_PHASE_1_CLEANUP.md](./PHASE_0_TO_PHASE_1_CLEANUP.md)** - Cleanup audit

---

## 🎯 Phase 1 Preview

Next phase will implement:

1. **documentIngestConcept** - Upload and parse .docx files with Mammoth.js
2. **documentStructureConcept** - Extract document structure with BFO-compliant IRIs
3. **First synchronization** - Wire upload → parse → structure events
4. **Minimal UI** - Upload form + status indicator

**Prerequisites**: ✅ All Phase 0 deliverables complete

---

## 🔧 Development

### Prerequisites

- Node.js 18+
- npm 9+
- Modern browser (Chrome, Firefox, Safari, Edge)

### Setup

```bash
# Clone repository
git clone <repo-url>
cd concretize

# Install PWA dependencies
cd pwa
npm install

# Run development server
npm run dev

# Open http://localhost:5173
```

### IDE Setup

Recommended for VS Code:
- **Extensions**:
  - ESLint
  - Prettier
  - Vite
  - TypeScript

### Code Style

- **TypeScript**: Strict mode enabled
- **No `any` types**: All code is fully typed
- **Pure functions**: Utilities are side-effect-free
- **JSDoc**: All public APIs documented
- **Tests**: >90% coverage target

---

## 🤝 Contributing

This project follows **agentic development** practices optimized for AI-agent collaboration:

1. **Read** [agenticDevlopment.md](./agenticDevlopment.md) for architectural patterns
2. **Follow** Concepts + Synchronizations structure
3. **Write tests** for all new code (Vitest)
4. **Document** with JSDoc and markdown
5. **Use events** for inter-concept communication

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🔗 Links

- **Live Demo**: [GitHub Pages deployment URL]
- **Documentation**: [pwa/README.md](./pwa/README.md)
- **Architecture**: [agenticDevlopment.md](./agenticDevlopment.md)
- **Roadmap**: [phasedProjectPlan.md](./phasedProjectPlan.md)

---

**Concretize** - Bridging documents and ontologies with offline-first progressive web technology.
