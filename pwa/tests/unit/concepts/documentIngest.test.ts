/**
 * Tests for Document Ingest Concept
 * Phase 1
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { documentIngestConcept } from '../../../src/concepts/documentIngestConcept';
import { eventBus } from '../../../src/utils/eventBus';

describe('documentIngestConcept', () => {
  beforeEach(() => {
    // Reset state before each test
    documentIngestConcept.state.currentDocument = null;
    documentIngestConcept.state.isProcessing = false;
    documentIngestConcept.state.error = null;
  });

  describe('uploadDocument', () => {
    test('rejects non-docx files', async () => {
      // Create a mock PDF file
      const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });

      // Subscribe to error events
      const errorHandler = vi.fn();
      eventBus.subscribe('uploadError', errorHandler);

      // Attempt upload
      await documentIngestConcept.actions.uploadDocument(mockFile);

      // Verify error state
      expect(documentIngestConcept.state.error).toContain('Only .docx files');
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Only .docx files'),
        })
      );
    });

    test('rejects files exceeding 50MB', async () => {
      // Create a mock file that exceeds size limit
      const largeSize = 51 * 1024 * 1024; // 51MB
      const mockFile = new File(['x'.repeat(100)], 'large.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      // Mock the size property
      Object.defineProperty(mockFile, 'size', { value: largeSize });

      const errorHandler = vi.fn();
      eventBus.subscribe('uploadError', errorHandler);

      await documentIngestConcept.actions.uploadDocument(mockFile);

      expect(documentIngestConcept.state.error).toContain('exceeds 50MB');
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('exceeds 50MB'),
        })
      );
    });

    test.skip('sets isProcessing to true during upload (needs real .docx fixture)', async () => {
      const mockFile = new File(['content'], 'test.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      // Start upload (don't await to check intermediate state)
      const uploadPromise = documentIngestConcept.actions.uploadDocument(mockFile);

      // Note: This test is tricky because the processing happens very fast
      // In a real scenario, you might need to add delays or mocks

      await uploadPromise;
    });

    test.skip('generates deterministic document hash (needs real .docx fixture)', async () => {
      const mockFile = new File(['<p>Test content</p>'], 'test.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      // Set fixed lastModified for deterministic hash
      Object.defineProperty(mockFile, 'lastModified', { value: 1234567890 });

      const loadedHandler = vi.fn();
      eventBus.subscribe('documentLoaded', loadedHandler);

      await documentIngestConcept.actions.uploadDocument(mockFile);

      // First upload
      expect(loadedHandler).toHaveBeenCalled();
      const firstCall = loadedHandler.mock.calls[0][0];
      const firstHash = firstCall.documentHash;

      // Reset and upload again
      loadedHandler.mockClear();
      documentIngestConcept.state.currentDocument = null;

      await documentIngestConcept.actions.uploadDocument(mockFile);

      const secondCall = loadedHandler.mock.calls[0][0];
      const secondHash = secondCall.documentHash;

      // Hashes should be identical
      expect(firstHash).toBe(secondHash);
    });

    test.skip('emits documentLoaded event with correct structure (needs real .docx fixture)', async () => {
      const mockFile = new File(['<p>Test</p>'], 'test-doc.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      Object.defineProperty(mockFile, 'size', { value: 1024 });
      Object.defineProperty(mockFile, 'lastModified', { value: 1234567890 });

      const loadedHandler = vi.fn();
      eventBus.subscribe('documentLoaded', loadedHandler);

      await documentIngestConcept.actions.uploadDocument(mockFile);

      expect(loadedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          documentHash: expect.any(String),
          metadata: expect.objectContaining({
            documentHash: expect.any(String),
            title: 'test-doc',
            fileSize: 1024,
            format: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            createdDate: expect.any(Date),
          }),
          rawHTML: expect.any(String),
          rawText: expect.any(String),
        })
      );
    });
  });

  describe('clearDocument', () => {
    test('resets state to initial values', () => {
      // Set some state
      documentIngestConcept.state.currentDocument = new File([''], 'test.docx');
      documentIngestConcept.state.isProcessing = true;
      documentIngestConcept.state.error = 'Some error';

      // Clear
      documentIngestConcept.actions.clearDocument();

      // Verify reset
      expect(documentIngestConcept.state.currentDocument).toBeNull();
      expect(documentIngestConcept.state.isProcessing).toBe(false);
      expect(documentIngestConcept.state.error).toBeNull();
    });
  });
});
