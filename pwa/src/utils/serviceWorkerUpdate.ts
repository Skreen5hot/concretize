/**
 * Service Worker Update Manager
 *
 * Automatically detects when a new service worker version is available
 * and prompts the user to update, ensuring they always have the latest code.
 *
 * Strategy:
 * 1. Register service worker with update detection
 * 2. Show update banner when new version found
 * 3. Skip waiting and reload page on user confirmation
 */

// @ts-expect-error - vite-plugin-pwa virtual module
import { registerSW } from 'virtual:pwa-register';

/**
 * Initialize service worker with automatic update detection
 *
 * This function:
 * - Registers the service worker
 * - Checks for updates every 60 seconds
 * - Shows update notification when available
 * - Reloads page when user confirms update
 */
export function initializeServiceWorkerUpdate(): void {
  const updateInterval = 60 * 1000; // Check every 60 seconds

  const updateSW = registerSW({
    immediate: true,

    onNeedRefresh() {
      console.log('[SW Update] New version available');
      showUpdateNotification(updateSW);
    },

    onOfflineReady() {
      console.log('[SW Update] App ready to work offline');
      showOfflineReadyNotification();
    },

    onRegisteredSW(swUrl: string, registration: ServiceWorkerRegistration | undefined) {
      console.log('[SW Update] Service Worker registered:', swUrl);

      if (!registration) return;

      // Check for updates periodically
      setInterval(() => {
        console.log('[SW Update] Checking for updates...');
        registration.update();
      }, updateInterval);
    },

    onRegisterError(error: Error) {
      console.error('[SW Update] Service Worker registration error:', error);
    }
  });
}

/**
 * Show update notification banner
 */
function showUpdateNotification(updateSW: (reloadPage?: boolean) => Promise<void>): void {
  // Create notification banner
  const banner = document.createElement('div');
  banner.id = 'sw-update-banner';
  banner.className = 'sw-update-banner';
  banner.innerHTML = `
    <div class="sw-update-content">
      <div class="sw-update-message">
        <strong>🎉 Update Available!</strong>
        <p>A new version of Concretize is ready. Click "Update" to reload and get the latest features.</p>
      </div>
      <div class="sw-update-actions">
        <button id="sw-update-dismiss" class="btn-secondary">Later</button>
        <button id="sw-update-reload" class="btn-primary">Update Now</button>
      </div>
    </div>
  `;

  // Add styles
  if (!document.getElementById('sw-update-styles')) {
    const style = document.createElement('style');
    style.id = 'sw-update-styles';
    style.textContent = `
      .sw-update-banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 1rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        animation: slideDown 0.3s ease-out;
      }

      @keyframes slideDown {
        from {
          transform: translateY(-100%);
        }
        to {
          transform: translateY(0);
        }
      }

      .sw-update-content {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .sw-update-message {
        flex: 1;
        min-width: 250px;
      }

      .sw-update-message strong {
        display: block;
        font-size: 1.1rem;
        margin-bottom: 0.25rem;
      }

      .sw-update-message p {
        margin: 0;
        opacity: 0.95;
        font-size: 0.9rem;
      }

      .sw-update-actions {
        display: flex;
        gap: 0.5rem;
      }

      .sw-update-banner button {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.9rem;
        transition: all 0.2s;
      }

      .btn-primary {
        background: white;
        color: #667eea;
      }

      .btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }

      .btn-secondary {
        background: rgba(255, 255, 255, 0.2);
        color: white;
      }

      .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    `;
    document.head.appendChild(style);
  }

  // Remove any existing banner
  const existing = document.getElementById('sw-update-banner');
  if (existing) {
    existing.remove();
  }

  // Add banner to page
  document.body.prepend(banner);

  // Attach event listeners
  const dismissBtn = document.getElementById('sw-update-dismiss');
  const reloadBtn = document.getElementById('sw-update-reload');

  dismissBtn?.addEventListener('click', () => {
    banner.style.animation = 'slideDown 0.3s ease-out reverse';
    setTimeout(() => banner.remove(), 300);
  });

  reloadBtn?.addEventListener('click', async () => {
    // Show loading state
    if (reloadBtn instanceof HTMLButtonElement) {
      reloadBtn.textContent = 'Updating...';
      reloadBtn.disabled = true;
    }

    // Update and reload
    await updateSW(true);
  });

  // Auto-dismiss after 30 seconds if user doesn't interact
  setTimeout(() => {
    if (document.body.contains(banner)) {
      banner.style.animation = 'slideDown 0.3s ease-out reverse';
      setTimeout(() => banner.remove(), 300);
    }
  }, 30000);
}

/**
 * Show offline ready notification (subtle toast)
 */
function showOfflineReadyNotification(): void {
  const toast = document.createElement('div');
  toast.className = 'sw-toast';
  toast.innerHTML = `
    <div class="sw-toast-content">
      ✓ App ready for offline use
    </div>
  `;

  // Add toast styles
  if (!document.getElementById('sw-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'sw-toast-styles';
    style.textContent = `
      .sw-toast {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        background: #0f9d58;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 9999;
        animation: fadeIn 0.3s ease-out;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(1rem);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .sw-toast-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 500;
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'fadeIn 0.3s ease-out reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
