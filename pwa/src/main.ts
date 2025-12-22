/**
 * Main Entry Point
 *
 * Initializes the Concretize PWA application
 */

import { eventBus } from './utils/eventBus';

console.log('Concretize PWA - Phase 0 Foundation');
console.log('Event Bus initialized:', eventBus);

// Enable debug mode for development
eventBus.setDebug(true);

// Test event emission
eventBus.subscribe('app:ready', (payload) => {
  console.log('Application ready:', payload);
});

eventBus.emit('app:ready', {
  phase: 0,
  status: 'Foundation Complete',
  timestamp: new Date().toISOString()
});

// Update status in UI
const statusElement = document.getElementById('status');
if (statusElement) {
  statusElement.textContent = 'Phase 0 Foundation - Event Bus Active';
  statusElement.style.color = '#28a745';
}
