// src/services/cache/prefetchManager.ts
import { imageCache } from './imageCache';

interface PrefetchQueueItem {
  uri: string;
  priority: 'high' | 'normal' | 'low';
}

/**
 * PrefetchManager
 * Handles proactive image loading with priority queuing
 */
function createPrefetchManager() {
  // Queue of items to prefetch
  const queue: PrefetchQueueItem[] = [];
  
  // Set of URIs currently being downloaded
  const activePrefetches = new Set<string>();
  
  // Max concurrent prefetches
  const MAX_CONCURRENT_PREFETCHES = 3;
  
  // Is the prefetch queue currently processing
  let isProcessing = false;
  
  /**
   * Add an image to the prefetch queue
   */
  function prefetchImage(uri: string, priority: 'high' | 'normal' | 'low' = 'normal') {
    if (!uri || activePrefetches.has(uri)) return;
    
    // Skip already queued URIs
    if (queue.some(item => item.uri === uri)) return;
    
    // Add to queue
    if (priority === 'high') {
      // High priority items go to the front
      queue.unshift({ uri, priority });
    } else {
      // Others go to the back
      queue.push({ uri, priority });
    }
    
    // Start processing if not already
    if (!isProcessing) {
      processQueue();
    }
  }
  
  /**
   * Add multiple images to the prefetch queue
   */
  function prefetchImages(uris: string[], priority: 'high' | 'normal' | 'low' = 'normal') {
    // Filter out invalid URIs and sort by priority
    const validUris = uris.filter(Boolean);
    
    if (priority === 'high') {
      // Process high priority items in reverse order so that
      // after unshifting, the first item in the array is first in the queue
      [...validUris].reverse().forEach(uri => prefetchImage(uri, priority));
    } else {
      validUris.forEach(uri => prefetchImage(uri, priority));
    }
  }
  
  /**
   * Process the prefetch queue
   */
  async function processQueue() {
    if (isProcessing || queue.length === 0) return;
    
    isProcessing = true;
    
    try {
      // Process items until queue is empty or max concurrent reached
      while (queue.length > 0 && activePrefetches.size < MAX_CONCURRENT_PREFETCHES) {
        const item = queue.shift();
        if (!item) continue;
        
        const { uri } = item;
        
        // Skip if already being prefetched
        if (activePrefetches.has(uri)) continue;
        
        // Mark as active
        activePrefetches.add(uri);
        
        // Start prefetch (don't await here to allow concurrency)
        prefetchSingleImage(uri).finally(() => {
          // Remove from active set when done
          activePrefetches.delete(uri);
          
          // Continue processing queue
          if (queue.length > 0) {
            processQueue();
          }
        });
      }
    } finally {
      isProcessing = false;
    }
  }
  
  /**
   * Prefetch a single image
   */
  async function prefetchSingleImage(uri: string): Promise<void> {
    try {
      await imageCache.getImage(uri);
    } catch (error) {
      console.warn(`Failed to prefetch image: ${uri}`, error);
    }
  }
  
  /**
   * Cancel all prefetch operations
   */
  function cancelAllPrefetches() {
    queue.length = 0;
    // Note: Active downloads can't be canceled easily with Expo FileSystem
    // but at least we can prevent new ones from starting
  }
  
  /**
   * Get status of a prefetch
   */
  function getPrefetchStatus(uri: string): 'active' | 'queued' | 'none' {
    if (activePrefetches.has(uri)) return 'active';
    if (queue.some(item => item.uri === uri)) return 'queued';
    return 'none';
  }
  
  return {
    prefetchImage,
    prefetchImages,
    cancelAllPrefetches,
    getPrefetchStatus,
  };
}

// Export a singleton instance
export const prefetchManager = createPrefetchManager();
export default prefetchManager;
