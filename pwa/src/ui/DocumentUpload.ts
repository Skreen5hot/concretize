/**
 * Document Upload UI Component
 *
 * Provides:
 * - File input for .docx upload
 * - Upload status display
 * - Error messages
 * - Success feedback
 *
 * Phase: 1
 */

import { documentIngestConcept } from '../concepts/documentIngestConcept';
import { eventBus } from '../utils/eventBus';
import type { StructureReadyEvent, DocumentLoadedEvent } from '../types/core';
import { exportDocumentToJSONLD, downloadJSONLD } from '../utils/jsonld';

/**
 * Document Upload Component
 */
export class DocumentUpload {
  private container: HTMLElement | null = null;
  private currentJSONLD: Record<string, unknown> | null = null;
  private currentMetadata: DocumentLoadedEvent['metadata'] | null = null;

  /**
   * Render the upload interface
   * @param containerId - ID of the HTML element to render into
   */
  render(containerId: string): void {
    this.container = document.getElementById(containerId);

    if (!this.container) {
      console.error(`Container #${containerId} not found`);
      return;
    }

    this.container.innerHTML = `
      <div class="upload-section">
        <h2>Upload Document</h2>

        <div class="upload-zone">
          <input
            type="file"
            id="docUpload"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            style="display: none;"
          />
          <label for="docUpload" class="upload-button">
            Choose .docx File
          </label>
          <p class="upload-hint">or drag and drop</p>
        </div>

        <div id="uploadStatus" class="upload-status"></div>
      </div>
    `;

    this.attachListeners();
  }

  /**
   * Attach event listeners to UI elements
   */
  private attachListeners(): void {
    const input = document.getElementById('docUpload') as HTMLInputElement;
    const statusDiv = document.getElementById('uploadStatus');

    if (!input || !statusDiv) {
      return;
    }

    // File input change handler
    input.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];

      if (file) {
        statusDiv.innerHTML = `<p class="status-processing">Processing "${file.name}"...</p>`;
        await documentIngestConcept.actions.uploadDocument(file);
      }
    });

    // Subscribe to document loaded to capture metadata
    eventBus.subscribe('documentLoaded', (payload) => {
      const event = payload as DocumentLoadedEvent;
      this.currentMetadata = event.metadata;
      console.log('[DocumentUpload] Metadata captured:', this.currentMetadata);
    });

    // Subscribe to upload error events
    eventBus.subscribe('uploadError', (payload) => {
      const { message } = payload as { message: string };
      statusDiv.innerHTML = `<p class="status-error">❌ Error: ${message}</p>`;
      this.currentJSONLD = null;
    });

    // Subscribe to structure ready events (success)
    eventBus.subscribe('structureReady', (payload) => {
      const event = payload as StructureReadyEvent;
      const { parts, documentIRI } = event;

      console.log('[DocumentUpload] structureReady event received');
      console.log('[DocumentUpload] currentMetadata:', this.currentMetadata);
      console.log('[DocumentUpload] parts count:', parts.length);
      console.log('[DocumentUpload] documentIRI:', documentIRI);

      // Generate JSON-LD
      if (this.currentMetadata) {
        this.currentJSONLD = exportDocumentToJSONLD(
          documentIRI,
          parts,
          this.currentMetadata
        );
        console.log('[DocumentUpload] JSON-LD generated:', !!this.currentJSONLD);
      } else {
        console.error('[DocumentUpload] Cannot generate JSON-LD: metadata is null');
      }

      statusDiv.innerHTML = `
        <div class="status-success">
          <p>✓ Document processed successfully!</p>
          <ul>
            <li>${parts.length} document parts extracted</li>
            <li>Paragraphs: ${parts.filter(p => p.type === 'paragraph').length}</li>
            <li>Headings: ${parts.filter(p => p.type === 'heading').length}</li>
            <li>Lists: ${parts.filter(p => p.type === 'list').length}</li>
            <li>Tables: ${parts.filter(p => p.type === 'table').length}</li>
          </ul>
          <div class="json-ld-section">
            <h3>BFO/IAO Knowledge Graph (JSON-LD)</h3>
            <button id="downloadJSONLD" class="download-button">Download JSON-LD</button>
            <button id="copyJSONLD" class="copy-button">Copy to Clipboard</button>
            <pre id="jsonldOutput" class="jsonld-output"></pre>
          </div>
        </div>
      `;

      // Display JSON-LD
      const outputElem = document.getElementById('jsonldOutput');
      console.log('[DocumentUpload] outputElem found:', !!outputElem);
      console.log('[DocumentUpload] currentJSONLD exists:', !!this.currentJSONLD);
      if (outputElem && this.currentJSONLD) {
        outputElem.textContent = JSON.stringify(this.currentJSONLD, null, 2);
        console.log('[DocumentUpload] JSON-LD displayed in text box');
      } else {
        console.error('[DocumentUpload] Failed to display JSON-LD:', {
          outputElem: !!outputElem,
          currentJSONLD: !!this.currentJSONLD
        });
      }

      // Attach download button handler
      const downloadBtn = document.getElementById('downloadJSONLD');
      console.log('[DocumentUpload] downloadBtn found:', !!downloadBtn);
      if (downloadBtn && this.currentJSONLD) {
        downloadBtn.addEventListener('click', () => {
          console.log('[DocumentUpload] Download button clicked');
          if (this.currentJSONLD && this.currentMetadata) {
            console.log('[DocumentUpload] Triggering download...');
            downloadJSONLD(this.currentJSONLD, `${this.currentMetadata.title}-graph.jsonld`);
          } else {
            console.error('[DocumentUpload] Cannot download: missing data', {
              currentJSONLD: !!this.currentJSONLD,
              currentMetadata: !!this.currentMetadata
            });
          }
        });
      } else {
        console.error('[DocumentUpload] Failed to attach download handler:', {
          downloadBtn: !!downloadBtn,
          currentJSONLD: !!this.currentJSONLD
        });
      }

      // Attach copy button handler
      const copyBtn = document.getElementById('copyJSONLD');
      if (copyBtn && this.currentJSONLD) {
        copyBtn.addEventListener('click', async () => {
          if (this.currentJSONLD) {
            await navigator.clipboard.writeText(JSON.stringify(this.currentJSONLD, null, 2));
            copyBtn.textContent = '✓ Copied!';
            setTimeout(() => {
              copyBtn.textContent = 'Copy to Clipboard';
            }, 2000);
          }
        });
      }
    });

    // Drag and drop support
    const uploadZone = this.container?.querySelector('.upload-zone') as HTMLElement;

    if (uploadZone) {
      uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
      });

      uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
      });

      uploadZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');

        const file = e.dataTransfer?.files[0];
        if (file) {
          statusDiv.innerHTML = `<p class="status-processing">Processing "${file.name}"...</p>`;
          await documentIngestConcept.actions.uploadDocument(file);
        }
      });
    }
  }
}
