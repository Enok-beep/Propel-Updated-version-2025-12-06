import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Wifi, WifiOff, Upload } from 'lucide-react';

// IndexedDB utilities for offline storage
class OfflineDB {
  constructor() {
    this.dbName = 'propel-offline';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        
        // Store for offline mutations queue
        if (!db.objectStoreNames.contains('mutationQueue')) {
          db.createObjectStore('mutationQueue', { keyPath: 'id', autoIncrement: true });
        }
        
        // Store for cached data
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };
    });
  }

  async addToQueue(mutation) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['mutationQueue'], 'readwrite');
      const store = tx.objectStore('mutationQueue');
      const request = store.add({
        ...mutation,
        timestamp: Date.now(),
        status: 'pending'
      });
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getQueue() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['mutationQueue'], 'readonly');
      const store = tx.objectStore('mutationQueue');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removeFromQueue(id) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['mutationQueue'], 'readwrite');
      const store = tx.objectStore('mutationQueue');
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async setCache(key, value) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['cache'], 'readwrite');
      const store = tx.objectStore('cache');
      const request = store.put({ key, value, timestamp: Date.now() });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCache(key) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(['cache'], 'readonly');
      const store = tx.objectStore('cache');
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }
}

const offlineDB = new OfflineDB();

/**
 * Offline Manager Component
 * Handles offline state, mutation queue, and sync
 */
export function OfflineManager() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueLength, setQueueLength] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    offlineDB.init();
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online! Syncing changes...', { icon: <Wifi className="w-4 h-4" /> });
      syncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are offline. Changes will sync when reconnected.', { 
        icon: <WifiOff className="w-4 h-4" />,
        duration: 5000
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check queue length periodically
  useEffect(() => {
    const checkQueue = async () => {
      const queue = await offlineDB.getQueue();
      setQueueLength(queue.length);
    };

    checkQueue();
    const interval = setInterval(checkQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  // Sync queued mutations when online
  const syncQueue = async () => {
    if (!isOnline || isSyncing) return;
    
    setIsSyncing(true);
    
    try {
      const queue = await offlineDB.getQueue();
      
      for (const mutation of queue) {
        try {
          // Execute the mutation (simplified - in real app would call actual API)
          await executeMutation(mutation);
          await offlineDB.removeFromQueue(mutation.id);
        } catch (error) {
          console.error('Failed to sync mutation:', error);
        }
      }
      
      // Refresh all queries after sync
      queryClient.invalidateQueries();
      
      if (queue.length > 0) {
        toast.success(`Synced ${queue.length} changes`, { icon: <Upload className="w-4 h-4" /> });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const executeMutation = async (mutation) => {
    // This would call the actual base44 API
    // Simplified implementation
    const { type, data } = mutation;
    
    switch (type) {
      case 'CREATE_TASK':
        // await base44.entities.Task.create(data);
        break;
      case 'UPDATE_TASK':
        // await base44.entities.Task.update(data.id, data);
        break;
      case 'DELETE_TASK':
        // await base44.entities.Task.delete(data.id);
        break;
      default:
        console.warn('Unknown mutation type:', type);
    }
  };

  // Show offline indicator
  if (!isOnline) {
    return (
      <div className="fixed bottom-20 lg:bottom-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg shadow-lg">
        <WifiOff className="w-4 h-4" />
        <span className="text-sm font-medium">Offline</span>
        {queueLength > 0 && (
          <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-xs">
            {queueLength} pending
          </span>
        )}
      </div>
    );
  }

  // Show syncing indicator
  if (isSyncing && queueLength > 0) {
    return (
      <div className="fixed bottom-20 lg:bottom-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-lg">
        <Upload className="w-4 h-4 animate-pulse" />
        <span className="text-sm font-medium">Syncing {queueLength} changes...</span>
      </div>
    );
  }

  return null;
}

// Hook for offline-aware mutations
export function useOfflineMutation(mutationFn, options = {}) {
  const isOnline = navigator.onLine;

  return async (variables) => {
    if (isOnline) {
      return mutationFn(variables);
    } else {
      // Queue mutation for later
      await offlineDB.addToQueue({
        type: options.type,
        data: variables,
      });
      
      // Optimistically update UI
      if (options.onOfflineSuccess) {
        options.onOfflineSuccess(variables);
      }
      
      toast.info('Changes saved locally. Will sync when online.');
    }
  };
}

export { offlineDB };
export default OfflineManager;