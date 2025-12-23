# Reference Ontologies

This directory contains **reference ontologies** used by the Concretize PWA for BFO-compliant document modeling.

---

## ⚠️ Important Distinction

**Reference Ontologies (this directory):**
- Core upper-level ontologies (BFO, IAO)
- **NOT** user-uploaded domain ontologies
- Bundled with the application for reference
- Used to validate BFO/IAO compliance

**User Domain Ontologies:**
- Uploaded by users at runtime
- Stored in IndexedDB (browser storage)
- Provide domain-specific concepts for aboutness mapping
- Examples: Clinical Trials Ontology, Legal Ontology, etc.

---

## Files in This Directory

### `bfo-core.ttl`
- **Full Name**: Basic Formal Ontology (BFO 2020)
- **Version**: 2.0
- **URL**: http://purl.obolibrary.org/obo/bfo.owl
- **Purpose**: Top-level ontology providing fundamental categories (Continuant, Occurrent, etc.)
- **License**: CC BY 4.0
- **Used For**:
  - Understanding ontological categories
  - Validating generated RDF graphs
  - Reference documentation

### `iao-core.owl`
- **Full Name**: Information Artifact Ontology (IAO)
- **Version**: 2022-11-07
- **URL**: http://purl.obolibrary.org/obo/iao.owl
- **Purpose**: BFO-aligned ontology for information content entities
- **License**: CC BY 4.0
- **Used For**:
  - Document structure modeling (`iao:Paragraph`, `iao:Section`, etc.)
  - Aboutness relations (`iao:is_about`, `iao:mentions`)
  - Information Content Entity (ICE) modeling

---

## IAO Classes Used by Concretize

The PWA uses these IAO classes for document structure:

| IRI | Label | Used For |
|-----|-------|----------|
| `iao:0000030` | Information Content Entity | Top-level document class |
| `iao:0000314` | Document Part | Generic document component |
| `iao:0000302` | Paragraph | Paragraph elements |
| `iao:0000304` | Heading | Heading elements (H1-H6) |
| `iao:0000315` | Section | Hierarchical sections |
| `iao:0000320` | List | List elements (ordered/unordered) |
| `iao:0000306` | Table | Table elements |
| `iao:0000136` | is_about | Aboutness relation (strong) |
| `iao:0000142` | mentions | Mention relation (weak, for candidates) |

See [pwa/src/types/core.ts](../pwa/src/types/core.ts) for TypeScript type definitions.

---

## Why IAO, Not DoCO?

**DoCO (Document Components Ontology)** from SPAR was considered but rejected because:

1. ❌ **Not BFO-aligned** - DoCO uses its own ontological framework
2. ❌ **Different use case** - Designed for scholarly/bibliographic documents
3. ❌ **Incompatible with requirements** - Our requirements mandate BFO 2020 compliance

**IAO** was chosen because:

1. ✅ **BFO-compliant** - Extends BFO 2020 properly
2. ✅ **General-purpose** - Works for any document type
3. ✅ **Standard** - OBO Foundry ontology, widely used in scientific domains
4. ✅ **Sufficient coverage** - Has all document structure classes we need

---

## Example Domain Ontologies

The `examples/` subdirectory contains sample domain ontologies for testing:

### `examples/clinical-trials.ttl` (TODO)
- Example domain ontology for clinical trial documents
- Demonstrates proper BFO/IAO alignment
- Includes required predicates (`rdfs:label`, `skos:prefLabel`, etc.)

---

## How to Use Domain Ontologies

**For Users:**
1. Open Concretize PWA in browser
2. Upload your domain ontology (Turtle or JSON-LD format)
3. Ontology is validated against SHACL shape (see [requirments.md](../requirments.md) Section 9)
4. Valid ontology is cached in IndexedDB
5. Used for aboutness mapping during document processing

**For Developers:**
- Reference ontologies are NOT loaded at runtime
- They exist for documentation and validation testing
- See [phasedProjectPlan.md](../phasedProjectPlan.md) Phase 3 for ontology loading implementation

---

## Validation

To validate a domain ontology against BFO/IAO requirements, use the SHACL shape from [requirments.md](../requirments.md) Section 9:

```bash
# Using pySHACL (Python)
pyshacl -s path/to/shacl-shape.ttl \
         -e path/to/ontologies/iao-core.owl \
         -f human \
         your-domain-ontology.ttl
```

---

## Links

- **BFO**: https://basic-formal-ontology.org/
- **IAO GitHub**: https://github.com/information-artifact-ontology/IAO
- **OBO Foundry**: http://obofoundry.org/
- **DoCO (for comparison)**: https://sparontologies.github.io/doco/

---

**Last Updated**: 2025-01-15
**Concretize Version**: 2.0.0
