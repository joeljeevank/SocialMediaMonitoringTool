/**
 * High-performance client-side cache and store for instant page loading and navigation.
 * Uses in-memory caching for 0ms frame-1 UI hydration and sessionStorage for persistence.
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

// Global in-memory cache store (instant 0ms access within the session)
const memoryCache = new Map<string, CacheEntry<any>>();

// Listeners for reactive cache updates
const cacheListeners = new Map<string, Set<(data: any) => void>>();

export const CacheKeys = {
  ACCOUNTS: 'sp_cache_accounts',
  YOUTUBE_CHANNELS: 'sp_cache_yt_channels',
  YOUTUBE_CONFIG: 'sp_cache_yt_config',
  YOUTUBE_OVERVIEW: (channelId: string, range: string) => `sp_cache_yt_overview_${channelId}_${range}`,
  YOUTUBE_TIMESERIES: (channelId: string, range: string) => `sp_cache_yt_ts_${channelId}_${range}`,
  YOUTUBE_VIDEOS: (channelId: string, page: number, search: string, sort: string, order: string) =>
    `sp_cache_yt_vids_${channelId}_${page}_${search}_${sort}_${order}`,
  SYSTEM_USERS: 'sp_cache_system_users',
};

// Hydration tracking: Ensures server HTML matches client during initial SSR hydration pass.
let _clientHydrated = false;

export function isHydrated(): boolean {
  return _clientHydrated;
}

export function markHydrated(): void {
  _clientHydrated = true;
}

/**
 * Safely retrieve cached data for initial useState initializer.
 * Returns null during SSR and initial hydration so client and server initial UI match 100%.
 * Once the client has hydrated, subsequent component mounts (client-side tab clicks) return the cached data immediately.
 */
export function getSSRSafeCache<T>(key: string, maxAgeMs: number = 60000): T | null {
  if (!_clientHydrated) return null;
  return getFromCache<T>(key, maxAgeMs);
}

/**
 * Retrieve cached data synchronously.
 * Checks RAM first (0ms), then sessionStorage fallback.
 */
export function getFromCache<T>(key: string, maxAgeMs: number = 60000): T | null {
  // 1. Check in-memory RAM store (0ms)
  const memEntry = memoryCache.get(key);
  if (memEntry) {
    if (Date.now() - memEntry.timestamp < maxAgeMs) {
      return memEntry.data as T;
    }
  }

  // 2. Check sessionStorage
  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const parsed: CacheEntry<T> = JSON.parse(raw);
        if (Date.now() - parsed.timestamp < maxAgeMs) {
          // Promote back to in-memory store
          memoryCache.set(key, parsed);
          return parsed.data;
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  return memEntry ? (memEntry.data as T) : null;
}

/**
 * Store data in cache and notify active listeners.
 */
export function setInCache<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
  };

  memoryCache.set(key, entry);

  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(key, JSON.stringify(entry));
    } catch {
      // Ignore quota errors
    }
  }

  // Notify any active page components listening for this cache key
  const listeners = cacheListeners.get(key);
  if (listeners) {
    listeners.forEach((callback) => {
      try {
        callback(data);
      } catch (err) {
        console.error('Error notifying cache listener:', err);
      }
    });
  }
}

/**
 * Invalidate a specific cache key or all keys matching a prefix.
 */
export function invalidateCache(keyOrPrefix: string): void {
  memoryCache.forEach((_, key) => {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
      memoryCache.delete(key);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem(key);
        } catch {}
      }
    }
  });
}

/**
 * Subscribe to cache updates (for optimistic background revalidation)
 */
export function subscribeToCache<T>(key: string, callback: (data: T) => void): () => void {
  if (!cacheListeners.has(key)) {
    cacheListeners.set(key, new Set());
  }
  const set = cacheListeners.get(key)!;
  set.add(callback);

  return () => {
    set.delete(callback);
    if (set.size === 0) {
      cacheListeners.delete(key);
    }
  };
}
