/**
 * Document Ingest Concept
 *
 * Responsibility: Accept Word documents, parse via Mammoth.js, emit document loaded event
 * Phase: 1
 */

import mammoth from 'mammoth';
import type {
  DocumentMetadata,
  DocumentLoadedEvent,
  Concept,
  ConceptState
} from '../types/core';
import { computeHash } from '../utils/text';
import { eventBus } from '../utils/eventBus';

// ============================================================================
// State
// ============================================================================

interface DocumentIngestState extends ConceptState {
  currentDocument: File | null;
  isProcessing: boolean;
  error: string | null;
}

const state: DocumentIngestState = {
  currentDocument: null,
  isProcessing: false,
  error: null,
};

// ============================================================================
// Actions
// ============================================================================

/**
 * Upload and parse a Word document
 *
 * @param file - .docx file from user upload
 * @throws Error if file validation fails or parsing fails
 */
async function uploadDocument(file: File): Promise<void> {
  // Reset error state
  state.error = null;

  // Validate file type
  if (!file.name.endsWith('.docx')) {
    state.error = 'Only .docx files are supported';
    eventBus.emit('uploadError', { message: state.error });
    return;
  }

  // Validate file size (50MB limit)
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  if (file.size > MAX_FILE_SIZE) {
    state.error = 'File exceeds 50MB limit';
    eventBus.emit('uploadError', { message: state.error });
    return;
  }

  state.isProcessing = true;
  state.currentDocument = file;

  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Parse with Mammoth - extract HTML
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    const rawHTML = htmlResult.value;

    // Also extract plain text for reference
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    const rawText = textResult.value;

    // Generate document identity hash (deterministic)
    // Hash combines: filename + size + last modified timestamp
    const identityString = `${file.name}_${file.size}_${file.lastModified}`;
    const documentHash = computeHash(identityString);

    // Extract document metadata
    const metadata: DocumentMetadata = {
      documentHash,
      title: file.name.replace('.docx', ''),
      fileSize: file.size,
      format: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      createdDate: new Date(file.lastModified),
    };

    // Log any Mammoth warnings (non-fatal)
    if (htmlResult.messages.length > 0) {
      console.warn('Mammoth parsing warnings:', htmlResult.messages);
    }

    state.isProcessing = false;

    // Emit success event
    const event: DocumentLoadedEvent = {
      documentHash,
      metadata,
      rawHTML,
      rawText,
    };

    eventBus.emit('documentLoaded', event);

  } catch (error) {
    state.isProcessing = false;
    state.error = error instanceof Error ? error.message : 'Failed to parse document';

    console.error('Document parsing error:', error);
    eventBus.emit('uploadError', { message: state.error });
  }
}

/**
 * Clear current document and reset state
 */
function clearDocument(): void {
  state.currentDocument = null;
  state.isProcessing = false;
  state.error = null;
}

// ============================================================================
// Concept Export
// ============================================================================

export const documentIngestConcept: Concept = {
  name: 'documentIngestConcept',
  state,
  actions: {
    uploadDocument: uploadDocument as (...args: unknown[]) => Promise<unknown>,
    clearDocument: clearDocument as (...args: unknown[]) => unknown,
  },
  notify: (event: string, payload: unknown) => {
    eventBus.emit(event, payload);
  },
};
