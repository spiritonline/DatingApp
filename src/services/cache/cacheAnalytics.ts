// src/services/cache/cacheAnalytics.ts
import { Platform } from 'react-native';
import { networkMonitor } from './networkMonitor';

// Types for cache events
interface CacheEvent {
  timestamp: number;
  uri: string;
  source: 'memory' | 'disk' | 'network';
  size?: number;
  loadTimeMs?: number;
  networkQuality?: string;
}

// Types for cache statistics
interface CacheStats {
  // Hit rates
  hits: {
    memory: number;
    disk: number;
    total: number;
  };
  misses: number;
  hitRate: number;
  
  // Performance
  avgLoadTimeMs: number;
  bandwidthSaved: number; // in bytes
  
  // Cache usage
  estimatedMemoryUsage: number; // in bytes
  estimatedDiskUsage: number; // in bytes
  
  // Network statistics
  byNetworkQuality: Record<string, {
    hits: number;
    misses: number;
    avgLoadTimeMs: number;
  }>;
  
  // Time range of the stats
  since: number;
  until: number;
}

/**
 * Cache analytics singleton
 * Tracks cache performance metrics
 */
function createCacheAnalytics() {
  // Maximum number of events to keep
  const MAX_EVENTS = 1000;
  
  // Events store
  const events: CacheEvent[] = [];
  
  // Running statistics for performance
  let memoryHits = 0;
  let diskHits = 0;
  let networkHits = 0;
  let totalLoadTimeMs = 0;
  let estimatedBandwidthSaved = 0;
  
  // Record a cache hit (from memory or disk)
  function recordCacheHit(source: 'memory' | 'disk', uri: string, size?: number, loadTimeMs?: number) {
    trackEvent({
      timestamp: Date.now(),
      uri,
      source,
      size,
      loadTimeMs,
      networkQuality: networkMonitor.getCurrentQuality(),
    });
    
    if (source === 'memory') {
      memoryHits++;
    } else {
      diskHits++;
    }
    
    // Update bandwidth saved
    if (size) {
      estimatedBandwidthSaved += size;
    }
    
    // Update load time stats
    if (loadTimeMs) {
      totalLoadTimeMs += loadTimeMs;
    }
  }
  
  // Record a cache miss (loaded from network)
  function recordCacheMiss(uri: string, size?: number, loadTimeMs?: number) {
    trackEvent({
      timestamp: Date.now(),
      uri,
      source: 'network',
      size,
      loadTimeMs,
      networkQuality: networkMonitor.getCurrentQuality(),
    });
    
    networkHits++;
    
    // Update load time stats
    if (loadTimeMs) {
      totalLoadTimeMs += loadTimeMs;
    }
  }
  
  // Track an event
  function trackEvent(event: CacheEvent) {
    events.push(event);
    
    // Keep events array from growing too large
    if (events.length > MAX_EVENTS) {
      events.shift();
    }
  }
  
  // Get current cache statistics
  function getStats(): CacheStats {
    const totalHits = memoryHits + diskHits;
    const totalRequests = totalHits + networkHits;
    
    // Calculate statistics by network quality
    const byNetworkQuality: Record<string, { hits: number; misses: number; avgLoadTimeMs: number }> = {};
    let totalLoadTimeMsByQuality: Record<string, { total: number; count: number }> = {};
    
    events.forEach(event => {
      const quality = event.networkQuality || 'unknown';
      
      if (!byNetworkQuality[quality]) {
        byNetworkQuality[quality] = { hits: 0, misses: 0, avgLoadTimeMs: 0 };
        totalLoadTimeMsByQuality[quality] = { total: 0, count: 0 };
      }
      
      if (event.source === 'network') {
        byNetworkQuality[quality].misses++;
      } else {
        byNetworkQuality[quality].hits++;
      }
      
      if (event.loadTimeMs) {
        totalLoadTimeMsByQuality[quality].total += event.loadTimeMs;
        totalLoadTimeMsByQuality[quality].count++;
      }
    });
    
    // Calculate average load times by quality
    Object.keys(byNetworkQuality).forEach(quality => {
      const { total, count } = totalLoadTimeMsByQuality[quality];
      byNetworkQuality[quality].avgLoadTimeMs = count > 0 ? total / count : 0;
    });
    
    return {
      hits: {
        memory: memoryHits,
        disk: diskHits,
        total: totalHits,
      },
      misses: networkHits,
      hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      
      avgLoadTimeMs: totalRequests > 0 ? totalLoadTimeMs / totalRequests : 0,
      bandwidthSaved: estimatedBandwidthSaved,
      
      estimatedMemoryUsage: calculateEstimatedMemoryUsage(),
      estimatedDiskUsage: calculateEstimatedDiskUsage(),
      
      byNetworkQuality,
      
      since: events.length > 0 ? events[0].timestamp : Date.now(),
      until: events.length > 0 ? events[events.length - 1].timestamp : Date.now(),
    };
  }
  
  // Calculate estimated memory usage
  function calculateEstimatedMemoryUsage(): number {
    // This is just a rough estimation based on recent memory hits
    return events
      .filter(e => e.source === 'memory' && e.size)
      .reduce((total, event) => total + (event.size || 0), 0);
  }
  
  // Calculate estimated disk usage
  function calculateEstimatedDiskUsage(): number {
    // This is just a rough estimation based on disk hits
    return events
      .filter(e => e.source === 'disk' && e.size)
      .reduce((total, event) => total + (event.size || 0), 0);
  }
  
  // Reset statistics
  function resetStats() {
    events.length = 0;
    memoryHits = 0;
    diskHits = 0;
    networkHits = 0;
    totalLoadTimeMs = 0;
    estimatedBandwidthSaved = 0;
  }
  
  // Return the public API
  return {
    recordCacheHit,
    recordCacheMiss,
    getStats,
    resetStats,
  };
}

// Export a singleton instance
export const cacheAnalytics = createCacheAnalytics();
export default cacheAnalytics;
