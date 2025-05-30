// src/services/cache/imageCache.ts
import * as FileSystem from 'expo-file-system';
import { FileInfo } from 'expo-file-system';
import { Platform } from 'react-native';
import { storage } from '../firebase';
import { ref, getDownloadURL } from '@firebase/storage';
import { cacheAnalytics } from './cacheAnalytics';
import { networkMonitor } from './networkMonitor';

// Define cache configuration constants
const CACHE_CONFIG = {
  // Memory cache settings
  MEMORY_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
  // Disk cache settings
  CACHE_DIR: `${FileSystem.cacheDirectory}image-cache/`,
  DISK_CACHE_SIZE: 200 * 1024 * 1024, // 200MB
  // Expiration settings
  DEFAULT_TTL: 7 * 24 * 60 * 60 * 1000, // 7 days
  // Concurrency settings
  MAX_CONCURRENT_DOWNLOADS: 3,
};

// Types for cache entries
interface CacheEntry {
  uri: string;
  size: number;
  lastAccessed: number;
  timestamp: number;
  expiresAt: number;
  source: 'memory' | 'disk' | 'network';
}

// In-memory cache
const memoryCache = new Map<string, CacheEntry>();
let currentMemoryUsage = 0;

// Tracking for in-progress downloads
const activeDownloads = new Map<string, Promise<string>>();

/**
 * Initialize the cache system
 */
async function initializeCache() {
  try {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_CONFIG.CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_CONFIG.CACHE_DIR, { intermediates: true });
    }
    
    // Clean up old cache entries
    await cleanupCache();
    
    console.log('Image cache system initialized');
  } catch (error) {
    console.error('Failed to initialize image cache:', error);
  }
}

/**
 * Get a cache key from a URI
 */
function getCacheKey(uri: string): string {
  // Remove query parameters for better cache hits
  const baseUri = uri.split('?')[0];
  
  // Use the filename or URI path as the key
  const parts = baseUri.split('/');
  const filename = parts[parts.length - 1];
  
  return filename || `key-${uri.split('').reduce((a, b) => (a + b.charCodeAt(0)), 0)}`;
}

/**
 * Get an image from the cache or download it
 */
async function getImage(uri: string): Promise<string> {
  if (!uri) return '';
  
  const startTime = Date.now();
  const originalUri = uri;
  
  // Use network monitor to optimize URI based on connection quality
  const optimizedUri = networkMonitor.getOptimizedImageUrl(uri);
  
  // Normalize Firebase Storage URLs
  let resolvedUri = optimizedUri;
  if (optimizedUri.startsWith('gs://')) {
    try {
      const storageRef = ref(storage, optimizedUri);
      resolvedUri = await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error resolving Firebase Storage URL:', error);
      throw error;
    }
  }
  
  const cacheKey = getCacheKey(resolvedUri);
  const now = Date.now();
  
  // Check memory cache first (fastest)
  const memoryCached = memoryCache.get(cacheKey);
  if (memoryCached && now < memoryCached.expiresAt) {
    // Update last accessed time
    memoryCached.lastAccessed = now;
    
    // Record cache hit in analytics
    const loadTime = Date.now() - startTime;
    cacheAnalytics.recordCacheHit('memory', originalUri, memoryCached.size, loadTime);
    
    return memoryCached.uri;
  }
  
  // Check if there's an active download for this URI
  if (activeDownloads.has(cacheKey)) {
    return activeDownloads.get(cacheKey)!;
  }
  
  // Check disk cache next
  const diskPath = `${CACHE_CONFIG.CACHE_DIR}${cacheKey}`;
  try {
    const fileInfo = await FileSystem.getInfoAsync(diskPath);
    if (fileInfo.exists) {
      const metaPath = `${diskPath}.meta`;
      const metaInfo = await FileSystem.getInfoAsync(metaPath);
      
      if (metaInfo.exists) {
        const metaContent = await FileSystem.readAsStringAsync(metaPath);
        const meta = JSON.parse(metaContent) as {
          timestamp: number;
          expiresAt: number;
          uri: string;
          size: number;
        };
        
        // Check if expired
        if (now < meta.expiresAt) {
          // Add to memory cache if there's space
          if (currentMemoryUsage + fileInfo.size <= CACHE_CONFIG.MEMORY_CACHE_SIZE) {
            const entry: CacheEntry = {
              uri: `file://${diskPath}`,
              size: fileInfo.size,
              lastAccessed: now,
              timestamp: meta.timestamp,
              expiresAt: meta.expiresAt,
              source: 'disk',
            };
            
            memoryCache.set(cacheKey, entry);
            currentMemoryUsage += fileInfo.size;
            
            // Cleanup memory cache if needed
            if (currentMemoryUsage > CACHE_CONFIG.MEMORY_CACHE_SIZE) {
              cleanupMemoryCache();
            }
          }
          
          // Record cache hit in analytics
          const loadTime = Date.now() - startTime;
          cacheAnalytics.recordCacheHit('disk', originalUri, fileInfo.size, loadTime);
          
          return `file://${diskPath}`;
        }
      }
      
      // If expired or metadata missing, delete and re-download
      await FileSystem.deleteAsync(diskPath, { idempotent: true });
      await FileSystem.deleteAsync(`${diskPath}.meta`, { idempotent: true });
    }
  } catch (error) {
    console.error('Error reading from disk cache:', error);
  }
  
  // If not in cache, download and cache
  const downloadPromise = downloadAndCacheImage(resolvedUri, cacheKey, originalUri, startTime);
  activeDownloads.set(cacheKey, downloadPromise);
  
  try {
    return await downloadPromise;
  } finally {
    activeDownloads.delete(cacheKey);
  }
}

/**
 * Download and cache an image
 */
async function downloadAndCacheImage(
  uri: string, 
  cacheKey: string, 
  originalUri: string,
  startTime: number
): Promise<string> {
  const diskPath = `${CACHE_CONFIG.CACHE_DIR}${cacheKey}`;
  const now = Date.now();
  
  try {
    // Download the image
    const downloadResult = await FileSystem.downloadAsync(
      uri,
      diskPath,
      {
        cache: true,
        headers: {
          // Add any required headers here
        },
      }
    );
    
    if (downloadResult.status !== 200) {
      throw new Error(`Failed to download image: ${downloadResult.status}`);
    }
    
    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(diskPath, { size: true }) as FileInfo & { size: number };
    
    // Create metadata
    const meta = {
      uri: downloadResult.uri,
      timestamp: now,
      expiresAt: now + CACHE_CONFIG.DEFAULT_TTL,
      size: fileInfo.size || 0,
    };
    
    // Save metadata
    await FileSystem.writeAsStringAsync(
      `${diskPath}.meta`,
      JSON.stringify(meta)
    );
    
    // Add to memory cache if there's space
    // Safe to access size since we passed {size: true} to getInfoAsync
    if (currentMemoryUsage + fileInfo.size <= CACHE_CONFIG.MEMORY_CACHE_SIZE) {
      const entry: CacheEntry = {
        uri: downloadResult.uri,
        size: fileInfo.size,
        lastAccessed: now,
        timestamp: now,
        expiresAt: now + CACHE_CONFIG.DEFAULT_TTL,
        source: 'network',
      };
      
      memoryCache.set(cacheKey, entry);
      currentMemoryUsage += fileInfo.size;
      
      // Cleanup memory cache if needed
      if (currentMemoryUsage > CACHE_CONFIG.MEMORY_CACHE_SIZE) {
        cleanupMemoryCache();
      }
    }
    
    // Cleanup disk cache if needed
    if ((await getDiskCacheSize()) > CACHE_CONFIG.DISK_CACHE_SIZE) {
      await cleanupCache();
    }
    
    // Record cache miss in analytics
    const loadTime = Date.now() - startTime;
    cacheAnalytics.recordCacheMiss(originalUri, fileInfo.size || 0, loadTime);
    
    return downloadResult.uri;
  } catch (error) {
    console.error(`Error downloading image ${uri}:`, error);
    throw error;
  }
}

/**
 * Clean up memory cache (remove least recently used items)
 */
function cleanupMemoryCache() {
  if (memoryCache.size === 0) return;
  
  // Sort by last accessed time (oldest first)
  const entries = Array.from(memoryCache.entries())
    .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
  
  // Remove oldest entries until we're under 80% of the memory limit
  const targetSize = CACHE_CONFIG.MEMORY_CACHE_SIZE * 0.8;
  
  for (const [key, entry] of entries) {
    if (currentMemoryUsage <= targetSize) break;
    
    memoryCache.delete(key);
    currentMemoryUsage -= entry.size;
  }
}

/**
 * Get the current disk cache size
 */
async function getDiskCacheSize(): Promise<number> {
  try {
    const files = await FileSystem.readDirectoryAsync(CACHE_CONFIG.CACHE_DIR);
    let totalSize = 0;
    
    for (const file of files) {
      if (file.endsWith('.meta')) continue;
      
      const fileInfo = await FileSystem.getInfoAsync(`${CACHE_CONFIG.CACHE_DIR}${file}`, { size: true });
      if (fileInfo.exists && 'size' in fileInfo && typeof fileInfo.size === 'number') {
        totalSize += fileInfo.size;
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error('Error calculating disk cache size:', error);
    return 0;
  }
}

/**
 * Clean up expired and least recently used cache entries
 */
async function cleanupCache() {
  try {
    const files = await FileSystem.readDirectoryAsync(CACHE_CONFIG.CACHE_DIR);
    const now = Date.now();
    const entries: Array<{
      path: string;
      metaPath: string;
      lastAccessed: number;
      size: number;
      expiresAt: number;
    }> = [];
    
    // Collect file information
    for (const file of files) {
      if (file.endsWith('.meta')) continue;
      
      const filePath = `${CACHE_CONFIG.CACHE_DIR}${file}`;
      const metaPath = `${filePath}.meta`;
      
      try {
        const fileInfo = await FileSystem.getInfoAsync(filePath, { size: true });
        const metaInfo = await FileSystem.getInfoAsync(metaPath);
        
        if (fileInfo.exists && metaInfo.exists && 'size' in fileInfo && typeof fileInfo.size === 'number') {
          const metaContent = await FileSystem.readAsStringAsync(metaPath);
          const meta = JSON.parse(metaContent) as {
            lastAccessed: number;
            expiresAt: number;
          };
          
          entries.push({
            path: filePath,
            metaPath,
            lastAccessed: meta.lastAccessed || 0,
            size: fileInfo.size || 0,
            expiresAt: meta.expiresAt || 0,
          });
        }
      } catch (error) {
        console.error(`Error processing cache file ${file}:`, error);
      }
    }
    
    // Delete expired entries
    for (const entry of entries) {
      if (now > entry.expiresAt) {
        await FileSystem.deleteAsync(entry.path, { idempotent: true });
        await FileSystem.deleteAsync(entry.metaPath, { idempotent: true });
      }
    }
    
    // If still over limit, delete by last accessed time
    let currentSize = (await getDiskCacheSize());
    
    if (currentSize > CACHE_CONFIG.DISK_CACHE_SIZE) {
      // Sort remaining entries by last accessed time
      const validEntries = entries.filter(e => now <= e.expiresAt)
        .sort((a, b) => a.lastAccessed - b.lastAccessed);
      
      // Delete oldest entries until under limit
      for (const entry of validEntries) {
        if (currentSize <= CACHE_CONFIG.DISK_CACHE_SIZE * 0.8) break;
        
        await FileSystem.deleteAsync(entry.path, { idempotent: true });
        await FileSystem.deleteAsync(entry.metaPath, { idempotent: true });
        
        currentSize -= entry.size;
      }
    }
  } catch (error) {
    console.error('Error cleaning up cache:', error);
  }
}

/**
 * Clear the entire cache
 */
async function clearCache() {
  try {
    // Clear memory cache
    memoryCache.clear();
    currentMemoryUsage = 0;
    
    // Clear disk cache
    await FileSystem.deleteAsync(CACHE_CONFIG.CACHE_DIR, { idempotent: true });
    await FileSystem.makeDirectoryAsync(CACHE_CONFIG.CACHE_DIR, { intermediates: true });
    
    console.log('Image cache cleared successfully');
  } catch (error) {
    console.error('Error clearing cache:', error);
    throw error;
  }
}

// Initialize the cache when the module loads
initializeCache().catch(console.error);

// Export the public methods
export const imageCache = {
  getImage,
  clearCache,
};

export default imageCache;
