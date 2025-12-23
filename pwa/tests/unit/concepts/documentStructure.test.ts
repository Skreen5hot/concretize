/**
 * Tests for Document Structure Concept
 * Phase 1
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { documentStructureConcept } from '../../../src/concepts/documentStructureConcept';
import { eventBus } from '../../../src/utils/eventBus';
import type { DocumentLoadedEvent } from '../../../src/types/core';

describe('documentStructureConcept', () => {
  beforeEach(() => {
    // Reset state before each test
    documentStructureConcept.state.currentDocumentIRI = null;
    documentStructureConcept.state.parts = [];
    documentStructureConcept.state.hierarchy = null;
  });

  describe('parseStructure', () => {
    test('extracts paragraphs from HTML', () => {
      const event: DocumentLoadedEvent = {
        documentHash: 'abc123',
        metadata: {
          documentHash: 'abc123',
          title: 'Test Doc',
          fileSize: 1000,
          format: 'docx',
          createdDate: new Date(),
        },
        rawHTML: '<p>First paragraph</p><p>Second paragraph</p>',
        rawText: 'First paragraph\nSecond paragraph',
      };

      documentStructureConcept.actions.parseStructure(event);

      expect(documentStructureConcept.state.parts).toHaveLength(2);
      expect(documentStructureConcept.state.parts[0].type).toBe('paragraph');
      expect(documentStructureConcept.state.parts[0].text).toBe('First paragraph');
      expect(documentStructureConcept.state.parts[1].type).toBe('paragraph');
      expect(documentStructureConcept.state.parts[1].text).toBe('Second paragraph');
    });

    test('extracts headings with correct levels', () => {
      const event: DocumentLoadedEvent = {
        documentHash: 'def456',
        metadata: {
          documentHash: 'def456',
          title: 'Test Doc',
          fileSize: 1000,
          format: 'docx',
          createdDate: new Date(),
        },
        rawHTML: '<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>',
        rawText: 'Title\nSubtitle\nSection',
      };

      documentStructureConcept.actions.parseStructure(event);

      expect(documentStructureConcept.state.parts).toHaveLength(3);
      expect(documentStructureConcept.state.parts[0].type).toBe('heading');
      expect(documentStructureConcept.state.parts[0].level).toBe(1);
      expect(documentStructureConcept.state.parts[1].type).toBe('heading');
      expect(documentStructureConcept.state.parts[1].level).toBe(2);
      expect(documentStructureConcept.state.parts[2].type).toBe('heading');
      expect(documentStructureConcept.state.parts[2].level).toBe(3);
    });

    test('extracts lists', () => {
      const event: DocumentLoadedEvent = {
        documentHash: 'ghi789',
        metadata: {
          documentHash: 'ghi789',
          title: 'Test Doc',
          fileSize: 1000,
          format: 'docx',
          createdDate: new Date(),
        },
        rawHTML: '<ul><li>Item 1</li><li>Item 2</li></ul><ol><li>Step 1</li></ol>',
        rawText: 'Item 1\nItem 2\nStep 1',
      };

      documentStructureConcept.actions.parseStructure(event);

      expect(documentStructureConcept.state.parts).toHaveLength(2);
      expect(documentStructureConcept.state.parts[0].type).toBe('list');
      expect(documentStructureConcept.state.parts[0].text).toContain('Item 1');
      expect(documentStructureConcept.state.parts[1].type).toBe('list');
    });

    test('generates deterministic IRIs', () => {
      const event: DocumentLoadedEvent = {
        documentHash: 'jkl012',
        metadata: {
          documentHash: 'jkl012',
          title: 'Test Doc',
          fileSize: 1000,
          format: 'docx',
          createdDate: new Date(),
        },
        rawHTML: '<p>Test paragraph</p>',
        rawText: 'Test paragraph',
      };

      // Parse first time
      documentStructureConcept.actions.parseStructure(event);
      const iri1 = documentStructureConcept.state.parts[0].iri;

      // Reset and parse again
      documentStructureConcept.state.parts = [];
      documentStructureConcept.actions.parseStructure(event);
      const iri2 = documentStructureConcept.state.parts[0].iri;

      // IRIs should be identical
      expect(iri1).toBe(iri2);
      expect(iri1).toContain('doc_jkl012');
      expect(iri1).toContain('_part_');
      expect(iri1).toContain('_pos_000');
    });

    test('maintains sequential order via sequenceIndex', () => {
      const event: DocumentLoadedEvent = {
        documentHash: 'mno345',
        metadata: {
          documentHash: 'mno345',
          title: 'Test Doc',
          fileSize: 1000,
          format: 'docx',
          createdDate: new Date(),
        },
        rawHTML: '<h1>Title</h1><p>Para 1</p><p>Para 2</p><h2>Section</h2><p>Para 3</p>',
        rawText: 'Title\nPara 1\nPara 2\nSection\nPara 3',
      };

      documentStructureConcept.actions.parseStructure(event);

      expect(documentStructureConcept.state.parts).toHaveLength(5);
      expect(documentStructureConcept.state.parts[0].sequenceIndex).toBe(0);
      expect(documentStructureConcept.state.parts[1].sequenceIndex).toBe(1);
      expect(documentStructureConcept.state.parts[2].sequenceIndex).toBe(2);
      expect(documentStructureConcept.state.parts[3].sequenceIndex).toBe(3);
      expect(documentStructureConcept.state.parts[4].sequenceIndex).toBe(4);
    });

    test('emits structureReady event', () => {
      const event: DocumentLoadedEvent = {
        documentHash: 'pqr678',
        metadata: {
          documentHash: 'pqr678',
          title: 'Test Doc',
          fileSize: 1000,
          format: 'docx',
          createdDate: new Date(),
        },
        rawHTML: '<p>Content</p>',
        rawText: 'Content',
      };

      const readyHandler = vi.fn();
      eventBus.subscribe('structureReady', readyHandler);

      documentStructureConcept.actions.parseStructure(event);

      expect(readyHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          documentIRI: expect.stringContaining('doc_pqr678'),
          documentHash: 'pqr678',
          parts: expect.arrayContaining([
            expect.objectContaining({
              type: 'paragraph',
              text: 'Content',
            }),
          ]),
          partList: expect.stringContaining('_partlist_000'),
          hierarchy: expect.objectContaining({
            part: expect.any(Object),
            children: expect.any(Array),
          }),
        })
      );
    });

    test('skips empty elements', () => {
      const event: DocumentLoadedEvent = {
        documentHash: 'stu901',
        metadata: {
          documentHash: 'stu901',
          title: 'Test Doc',
          fileSize: 1000,
          format: 'docx',
          createdDate: new Date(),
        },
        rawHTML: '<p>Content</p><p></p><p>   </p><p>More content</p>',
        rawText: 'Content\nMore content',
      };

      documentStructureConcept.actions.parseStructure(event);

      // Should only extract non-empty paragraphs
      expect(documentStructureConcept.state.parts).toHaveLength(2);
      expect(documentStructureConcept.state.parts[0].text).toBe('Content');
      expect(documentStructureConcept.state.parts[1].text).toBe('More content');
    });
  });

  describe('clearStructure', () => {
    test('resets state to initial values', () => {
      // Set some state
      documentStructureConcept.state.currentDocumentIRI = 'http://example.org/doc_123';
      documentStructureConcept.state.parts = [
        {
          iri: 'http://example.org/part_1',
          type: 'paragraph',
          sequenceIndex: 0,
          contentHash: 'hash',
          text: 'Test',
        },
      ];
      documentStructureConcept.state.hierarchy = {
        part: {} as any,
        children: [],
      };

      // Clear
      documentStructureConcept.actions.clearStructure();

      // Verify reset
      expect(documentStructureConcept.state.currentDocumentIRI).toBeNull();
      expect(documentStructureConcept.state.parts).toEqual([]);
      expect(documentStructureConcept.state.hierarchy).toBeNull();
    });
  });
});
