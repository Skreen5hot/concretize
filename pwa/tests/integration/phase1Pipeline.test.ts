/**
 * Integration Tests for Phase 1 Pipeline
 *
 * Tests the complete flow:
 * Upload Document → Parse Structure → Structure Ready
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { documentIngestConcept } from '../../src/concepts/documentIngestConcept';
import { documentStructureConcept } from '../../src/concepts/documentStructureConcept';
import { initializePhase1Synchronizations } from '../../src/synchronizations/phase1Sync';
import { eventBus } from '../../src/utils/eventBus';

describe.skip('Phase 1 Pipeline Integration (needs real .docx fixtures)', () => {
  beforeEach(() => {
    // Reset all concept states
    documentIngestConcept.state.currentDocument = null;
    documentIngestConcept.state.isProcessing = false;
    documentIngestConcept.state.error = null;

    documentStructureConcept.state.currentDocumentIRI = null;
    documentStructureConcept.state.parts = [];
    documentStructureConcept.state.hierarchy = null;

    // Initialize synchronizations
    initializePhase1Synchronizations();
  });

  test('complete pipeline: upload → parse → structure ready', async () => {
    // Create a mock .docx file with some HTML content
    const mockFile = new File(
      ['<h1>Title</h1><p>First paragraph.</p><p>Second paragraph.</p>'],
      'test-document.docx',
      {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }
    );

    Object.defineProperty(mockFile, 'size', { value: 2048 });
    Object.defineProperty(mockFile, 'lastModified', { value: 1234567890 });

    // Set up event spy for structureReady
    const structureReadyHandler = vi.fn();
    eventBus.subscribe('structureReady', structureReadyHandler);

    // Start the pipeline by uploading the document
    await documentIngestConcept.actions.uploadDocument(mockFile);

    // Wait a bit for events to propagate
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify structureReady was emitted
    expect(structureReadyHandler).toHaveBeenCalled();

    // Get the structure event
    const structureEvent = structureReadyHandler.mock.calls[0][0];

    // Verify document IRI
    expect(structureEvent.documentIRI).toMatch(/^http:\/\/example\.org\/doc_/);

    // Verify parts were extracted
    expect(structureEvent.parts.length).toBeGreaterThan(0);

    // Verify part list IRI
    expect(structureEvent.partList).toMatch(/_partlist_000$/);

    // Verify hierarchy exists
    expect(structureEvent.hierarchy).toBeDefined();
    expect(structureEvent.hierarchy.children.length).toBe(structureEvent.parts.length);
  });

  test('pipeline handles document with mixed content', async () => {
    const mockFile = new File(
      [
        '<h1>Main Title</h1>',
        '<p>Introduction paragraph.</p>',
        '<h2>Section 1</h2>',
        '<p>Section content.</p>',
        '<ul><li>Item 1</li><li>Item 2</li></ul>',
        '<h2>Section 2</h2>',
        '<p>More content.</p>',
      ].join(''),
      'mixed-content.docx',
      {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }
    );

    Object.defineProperty(mockFile, 'size', { value: 4096 });
    Object.defineProperty(mockFile, 'lastModified', { value: Date.now() });

    const structureReadyHandler = vi.fn();
    eventBus.subscribe('structureReady', structureReadyHandler);

    await documentIngestConcept.actions.uploadDocument(mockFile);
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(structureReadyHandler).toHaveBeenCalled();

    const { parts } = structureReadyHandler.mock.calls[0][0];

    // Verify correct number and types of parts
    const headings = parts.filter((p: any) => p.type === 'heading');
    const paragraphs = parts.filter((p: any) => p.type === 'paragraph');
    const lists = parts.filter((p: any) => p.type === 'list');

    expect(headings.length).toBe(3); // H1, H2, H2
    expect(paragraphs.length).toBe(3);
    expect(lists.length).toBe(1);

    // Verify sequential indexing
    parts.forEach((part: any, index: number) => {
      expect(part.sequenceIndex).toBe(index);
    });
  });

  test('pipeline maintains deterministic IRIs across re-uploads', async () => {
    const mockFile = new File(['<p>Test content</p>'], 'deterministic.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    Object.defineProperty(mockFile, 'size', { value: 1024 });
    Object.defineProperty(mockFile, 'lastModified', { value: 1111111111 });

    const structureReadyHandler = vi.fn();
    eventBus.subscribe('structureReady', structureReadyHandler);

    // Upload first time
    await documentIngestConcept.actions.uploadDocument(mockFile);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const firstEvent = structureReadyHandler.mock.calls[0][0];
    const firstDocIRI = firstEvent.documentIRI;
    const firstPartIRI = firstEvent.parts[0].iri;

    // Clear and upload again
    structureReadyHandler.mockClear();
    documentIngestConcept.state.currentDocument = null;
    documentStructureConcept.state.parts = [];

    await documentIngestConcept.actions.uploadDocument(mockFile);
    await new Promise((resolve) => setTimeout(resolve, 100));

    const secondEvent = structureReadyHandler.mock.calls[0][0];
    const secondDocIRI = secondEvent.documentIRI;
    const secondPartIRI = secondEvent.parts[0].iri;

    // IRIs should be identical
    expect(firstDocIRI).toBe(secondDocIRI);
    expect(firstPartIRI).toBe(secondPartIRI);
  });

  test('pipeline handles empty document gracefully', async () => {
    const mockFile = new File([''], 'empty.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    Object.defineProperty(mockFile, 'size', { value: 512 });

    const structureReadyHandler = vi.fn();
    eventBus.subscribe('structureReady', structureReadyHandler);

    await documentIngestConcept.actions.uploadDocument(mockFile);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Structure ready should still be emitted
    expect(structureReadyHandler).toHaveBeenCalled();

    const { parts } = structureReadyHandler.mock.calls[0][0];

    // Empty document should have zero parts
    expect(parts.length).toBe(0);
  });

  test('pipeline emits events in correct order', async () => {
    const mockFile = new File(['<p>Content</p>'], 'order-test.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    Object.defineProperty(mockFile, 'size', { value: 1024 });

    const events: string[] = [];

    eventBus.subscribe('documentLoaded', () => events.push('documentLoaded'));
    eventBus.subscribe('structureReady', () => events.push('structureReady'));

    await documentIngestConcept.actions.uploadDocument(mockFile);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify event order
    expect(events).toEqual(['documentLoaded', 'structureReady']);
  });
});
