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
import type { StructureReadyEvent } from '../types/core';

/**
 * Document Upload Component
 */
export class DocumentUpload {
  private container: HTMLElement | null = null;

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

    // Subscribe to upload error events
    eventBus.subscribe('uploadError', (payload) => {
      const { message } = payload as { message: string };
      statusDiv.innerHTML = `<p class="status-error">❌ Error: ${message}</p>`;
    });

    // Subscribe to structure ready events (success)
    eventBus.subscribe('structureReady', (payload) => {
      const event = payload as StructureReadyEvent;
      const { parts } = event;

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
        </div>
      `;
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
