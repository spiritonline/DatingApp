// src/hooks/useCachedImage.ts
import { useState, useEffect } from 'react';
import { imageCache } from '../services/cache/imageCache';
import { prefetchManager } from '../services/cache/prefetchManager';

interface UseCachedImageOptions {
  priority?: 'high' | 'normal' | 'low';
  prefetch?: boolean;
}

interface UseCachedImageResult {
  uri: string | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for using cached images in functional components
 */
export function useCachedImage(
  sourceUri: string | null | undefined,
  options: UseCachedImageOptions = {}
): UseCachedImageResult {
  const [uri, setUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [version, setVersion] = useState(0);
  
  const { priority = 'normal', prefetch = false } = options;
  
  // Force a reload of the image
  const refetch = () => setVersion(v => v + 1);
  
  useEffect(() => {
    let isMounted = true;
    
    if (!sourceUri) {
      setUri(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    
    const loadImage = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get cached image
        const cachedUri = await imageCache.getImage(sourceUri);
        
        if (isMounted) {
          setUri(cachedUri);
          setError(null);
        }
      } catch (err) {
        console.error('Error in useCachedImage:', err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    // Prefetch if needed
    if (prefetch && sourceUri) {
      prefetchManager.prefetchImage(sourceUri, priority);
    }
    
    loadImage();
    
    return () => {
      isMounted = false;
    };
  }, [sourceUri, prefetch, priority, version]);
  
  return { uri, isLoading, error, refetch };
}

// Helper function to prefetch multiple images at once
export function prefetchImages(uris: string[], priority: 'high' | 'normal' | 'low' = 'normal') {
  if (!uris || uris.length === 0) return;
  
  prefetchManager.prefetchImages(
    uris.filter(Boolean),
    priority
  );
}

export default useCachedImage;
