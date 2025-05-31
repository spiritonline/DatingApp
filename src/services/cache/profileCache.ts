import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../../types';
import { handleServiceError, logError } from '../../utils/errorHandler';

interface CachedProfile {
  profile: UserProfile;
  timestamp: number;
  hits: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  errors: number;
}

/**
 * Advanced LRU cache for user profiles with TTL and background refresh
 */
export class ProfileCache {
  private memoryCache = new Map<string, CachedProfile>();
  private accessOrder: string[] = [];
  private readonly MAX_CACHE_SIZE = 100;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly STORAGE_PREFIX = '@profile_cache:';
  private readonly METRICS_KEY = '@cache_metrics';
  private metrics: CacheMetrics = { hits: 0, misses: 0, evictions: 0, errors: 0 };
  private refreshQueue = new Set<string>();
  private refreshInProgress = false;

  constructor() {
    this.loadCacheFromStorage();
    this.startBackgroundRefresh();
  }

  /**
   * Get profile from cache
   */
  async get(profileId: string): Promise<UserProfile | null> {
    try {
      // Check memory cache first
      const cached = this.memoryCache.get(profileId);
      
      if (cached) {
        const age = Date.now() - cached.timestamp;
        
        if (age < this.CACHE_TTL) {
          // Update access order for LRU
          this.updateAccessOrder(profileId);
          cached.hits++;
          this.metrics.hits++;
          
          // Schedule background refresh if cache is getting old
          if (age > this.CACHE_TTL * 0.8) {
            this.scheduleRefresh(profileId);
          }
          
          return cached.profile;
        } else {
          // Cache expired, remove it
          this.memoryCache.delete(profileId);
          this.removeFromAccessOrder(profileId);
        }
      }
      
      // Check persistent storage
      const stored = await this.getFromStorage(profileId);
      if (stored && Date.now() - stored.timestamp < this.CACHE_TTL) {
        // Restore to memory cache
        this.set(profileId, stored.profile, false);
        this.metrics.hits++;
        return stored.profile;
      }
      
      this.metrics.misses++;
      return null;
    } catch (error) {
      this.metrics.errors++;
      const appError = handleServiceError(error);
      logError(appError, { operation: 'cache_get', profileId });
      return null;
    }
  }

  /**
   * Set profile in cache
   */
  async set(profileId: string, profile: UserProfile, persist = true): Promise<void> {
    try {
      // Ensure cache size limit
      if (this.memoryCache.size >= this.MAX_CACHE_SIZE) {
        this.evictLeastRecentlyUsed();
      }
      
      const cachedProfile: CachedProfile = {
        profile,
        timestamp: Date.now(),
        hits: 0,
      };
      
      this.memoryCache.set(profileId, cachedProfile);
      this.updateAccessOrder(profileId);
      
      if (persist) {
        await this.saveToStorage(profileId, cachedProfile);
      }
    } catch (error) {
      this.metrics.errors++;
      const appError = handleServiceError(error);
      logError(appError, { operation: 'cache_set', profileId });
    }
  }

  /**
   * Update multiple profiles at once
   */
  async setMany(profiles: UserProfile[]): Promise<void> {
    const updates = profiles.map(profile => 
      this.set(profile.id, profile, false)
    );
    
    await Promise.all(updates);
    await this.saveMetrics();
  }

  /**
   * Remove profile from cache
   */
  async remove(profileId: string): Promise<void> {
    try {
      this.memoryCache.delete(profileId);
      this.removeFromAccessOrder(profileId);
      await AsyncStorage.removeItem(this.STORAGE_PREFIX + profileId);
    } catch (error) {
      const appError = handleServiceError(error);
      logError(appError, { operation: 'cache_remove', profileId });
    }
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    try {
      this.memoryCache.clear();
      this.accessOrder = [];
      this.metrics = { hits: 0, misses: 0, evictions: 0, errors: 0 };
      
      // Clear storage
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.STORAGE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      const appError = handleServiceError(error);
      logError(appError, { operation: 'cache_clear' });
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    metrics: CacheMetrics;
  } {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? this.metrics.hits / total : 0;
    
    return {
      size: this.memoryCache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate,
      metrics: { ...this.metrics },
    };
  }

  /**
   * Private: Update access order for LRU
   */
  private updateAccessOrder(profileId: string): void {
    this.removeFromAccessOrder(profileId);
    this.accessOrder.push(profileId);
  }

  /**
   * Private: Remove from access order
   */
  private removeFromAccessOrder(profileId: string): void {
    const index = this.accessOrder.indexOf(profileId);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Private: Evict least recently used item
   */
  private evictLeastRecentlyUsed(): void {
    if (this.accessOrder.length > 0) {
      const lru = this.accessOrder.shift()!;
      this.memoryCache.delete(lru);
      this.metrics.evictions++;
      AsyncStorage.removeItem(this.STORAGE_PREFIX + lru).catch(() => {
        // Ignore storage errors during eviction
      });
    }
  }

  /**
   * Private: Save to persistent storage
   */
  private async saveToStorage(profileId: string, cached: CachedProfile): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_PREFIX + profileId,
        JSON.stringify(cached)
      );
    } catch (error) {
      // Don't throw, just log - storage errors shouldn't break cache functionality
      if (__DEV__) {
        console.warn('Failed to persist cache item:', error);
      }
    }
  }

  /**
   * Private: Get from persistent storage
   */
  private async getFromStorage(profileId: string): Promise<CachedProfile | null> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_PREFIX + profileId);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Private: Load cache from storage on startup
   */
  private async loadCacheFromStorage(): Promise<void> {
    try {
      // Load metrics
      const metricsData = await AsyncStorage.getItem(this.METRICS_KEY);
      if (metricsData) {
        this.metrics = JSON.parse(metricsData);
      }
      
      // Load recent profiles
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys
        .filter(key => key.startsWith(this.STORAGE_PREFIX))
        .slice(0, this.MAX_CACHE_SIZE / 2); // Load only half to leave room
      
      const items = await AsyncStorage.multiGet(cacheKeys);
      
      items.forEach(([key, value]) => {
        if (value) {
          try {
            const cached: CachedProfile = JSON.parse(value);
            const profileId = key.replace(this.STORAGE_PREFIX, '');
            
            // Only load if not expired
            if (Date.now() - cached.timestamp < this.CACHE_TTL) {
              this.memoryCache.set(profileId, cached);
              this.accessOrder.push(profileId);
            }
          } catch {
            // Ignore corrupted cache entries
          }
        }
      });
    } catch (error) {
      // Cache loading errors shouldn't break the app
      if (__DEV__) {
        console.warn('Failed to load cache from storage:', error);
      }
    }
  }

  /**
   * Private: Save metrics to storage
   */
  private async saveMetrics(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.METRICS_KEY, JSON.stringify(this.metrics));
    } catch {
      // Ignore metrics save errors
    }
  }

  /**
   * Private: Schedule profile refresh
   */
  private scheduleRefresh(profileId: string): void {
    this.refreshQueue.add(profileId);
  }

  /**
   * Private: Background refresh process
   */
  private startBackgroundRefresh(): void {
    setInterval(async () => {
      if (this.refreshInProgress || this.refreshQueue.size === 0) {
        return;
      }
      
      this.refreshInProgress = true;
      const profilesToRefresh = Array.from(this.refreshQueue).slice(0, 5);
      this.refreshQueue.clear();
      
      // TODO: Implement actual refresh logic with profile service
      // This would fetch fresh profiles and update the cache
      
      this.refreshInProgress = false;
    }, 30000); // Run every 30 seconds
  }

  /**
   * Preload profiles for better performance
   */
  async preloadProfiles(profileIds: string[]): Promise<void> {
    // TODO: Implement batch loading with profile service
    // This would fetch multiple profiles efficiently
  }

  /**
   * Get multiple profiles efficiently
   */
  async getMany(profileIds: string[]): Promise<Map<string, UserProfile | null>> {
    const results = new Map<string, UserProfile | null>();
    const missingIds: string[] = [];
    
    // Check cache for each profile
    for (const id of profileIds) {
      const cached = await this.get(id);
      if (cached) {
        results.set(id, cached);
      } else {
        missingIds.push(id);
        results.set(id, null);
      }
    }
    
    return results;
  }
}

// Export singleton instance
export const profileCache = new ProfileCache();