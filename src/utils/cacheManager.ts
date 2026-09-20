/**
 * Cache & Temporary Data Management Utility
 * Provides safe purging of temporary cache, offline queues, service worker caches, and session resets.
 */

export interface CacheStats {
  itemCount: number;
  estimatedSizeKb: number;
  cachedKeys: string[];
}

/**
 * Calculates the size and breakdown of temporary data stored in localStorage.
 */
export function getCacheStats(): CacheStats {
  if (typeof window === 'undefined') {
    return { itemCount: 0, estimatedSizeKb: 0, cachedKeys: [] };
  }

  let totalBytes = 0;
  const cachedKeys: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const val = localStorage.getItem(key) || '';
      totalBytes += (key.length + val.length) * 2; // UTF-16 characters = 2 bytes
      if (key.startsWith('cache_') || key.startsWith('temp_') || key === 'offline_actions_queue') {
        cachedKeys.push(key);
      }
    }
  }

  return {
    itemCount: cachedKeys.length,
    estimatedSizeKb: Math.round(totalBytes / 1024),
    cachedKeys,
  };
}

/**
 * Clears all temporary cache keys without logging the user out.
 */
export async function clearTemporaryCache(): Promise<{ success: boolean; clearedCount: number }> {
  let clearedCount = 0;

  try {
    // 1. Clear localStorage cache keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('cache_') || 
        key.startsWith('temp_') || 
        key.startsWith('notif_') || 
        key === 'sheets_db_spreadsheet_id'
      )) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(k => {
      localStorage.removeItem(k);
      clearedCount++;
    });

    // 2. Clear browser CacheStorage (Service Worker / PWA caches)
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      } catch (err) {
        console.warn('CacheStorage cleanup note:', err);
      }
    }

    return { success: true, clearedCount };
  } catch (error) {
    console.error('Failed to clear temporary cache:', error);
    return { success: false, clearedCount };
  }
}

/**
 * Complete Reset: Clears all local storage, service worker caches, unregisters service workers,
 * and refreshes the application for a brand-new clean state.
 */
export async function performFullAppReset(): Promise<void> {
  try {
    // 1. Clear all localStorage
    localStorage.clear();
    sessionStorage.clear();

    // 2. Clear all Service Worker caches
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      } catch (e) {
        console.warn('Error clearing caches:', e);
      }
    }

    // 3. Unregister all service workers
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      } catch (e) {
        console.warn('Error unregistering service workers:', e);
      }
    }
  } catch (err) {
    console.error('Reset error:', err);
  } finally {
    // Reload safely to root
    window.location.href = '/';
  }
}
