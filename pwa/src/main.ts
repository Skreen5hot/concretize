/**
 * Main Entry Point
 *
 * Initializes the Concretize PWA application
 * Phase 1: Document Ingestion & Structure Extraction
 */

import { eventBus } from './utils/eventBus';
import { initializePhase1Synchronizations } from './synchronizations/phase1Sync';
import { DocumentUpload } from './ui/DocumentUpload';
import { initializeServiceWorkerUpdate } from './utils/serviceWorkerUpdate';
import './styles/main.css';

console.log('Concretize PWA - Phase 1: Document Ingestion');

// Initialize service worker update detection
initializeServiceWorkerUpdate();

// Enable debug mode for development
eventBus.setDebug(true);

// Initialize Phase 1 synchronizations
initializePhase1Synchronizations();

// Initialize UI components
const documentUpload = new DocumentUpload();
documentUpload.render('upload-section');

console.log('Phase 1 initialized - Ready to process documents');
