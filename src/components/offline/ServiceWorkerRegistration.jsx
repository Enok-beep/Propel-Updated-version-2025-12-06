import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Service Worker Registration Component
 * Registers and manages the service worker for offline support
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/service-worker.js')
          .then((registration) => {
            console.log('Service Worker registered:', registration);

            // Check for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New service worker available
                  toast.info('New version available! Refresh to update.', {
                    duration: 10000,
                    action: {
                      label: 'Refresh',
                      onClick: () => window.location.reload()
                    }
                  });
                }
              });
            });
          })
          .catch((error) => {
            console.error('Service Worker registration failed:', error);
          });

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'SYNC_MUTATIONS') {
            // Trigger offline queue sync
            window.dispatchEvent(new CustomEvent('sw-sync-mutations'));
          }
        });
      });
    }
  }, []);

  return null;
}

export default ServiceWorkerRegistration;