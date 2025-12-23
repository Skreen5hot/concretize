/**
 * Phase 1 Synchronizations
 *
 * Wires together:
 * - documentIngestConcept → documentStructureConcept
 *
 * Pipeline: Upload → Parse → Structure Ready
 */

import { eventBus } from '../utils/eventBus';
import { documentStructureConcept } from '../concepts/documentStructureConcept';
import type { DocumentLoadedEvent } from '../types/core';

/**
 * Initialize Phase 1 event synchronizations
 *
 * Call this once during application startup
 */
export function initializePhase1Synchronizations(): void {
  // Wire: documentLoaded → parseStructure
  eventBus.subscribe('documentLoaded', (payload) => {
    const event = payload as DocumentLoadedEvent;
    console.log('[Phase 1 Sync] documentLoaded → parsing structure');
    documentStructureConcept.actions.parseStructure(event);
  });

  console.log('[Phase 1] Synchronizations initialized');
}
