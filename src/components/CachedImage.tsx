// src/components/CachedImage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Image, 
  ImageProps, 
  ActivityIndicator, 
  View, 
  StyleSheet,
  StyleProp,
  ViewStyle,
  NativeSyntheticEvent,
  ImageErrorEventData
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { imageCache } from '../services/cache/imageCache';
import { prefetchManager } from '../services/cache/prefetchManager';

// Props for the CachedImage component
// Define our own props separate from ImageProps to avoid type conflicts
interface CachedImageProps {
  // Image source
  source: { uri: string } | null;
  // Style props
  style?: StyleProp<any>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  containerStyle?: StyleProp<ViewStyle>;
  // Fallback and loading options
  placeholderSource?: any;
  placeholderContent?: React.ReactNode;
  fallbackSource?: any;
  showLoadingIndicator?: boolean;
  // Caching options
  priority?: 'high' | 'normal' | 'low';
  prefetch?: boolean;
  // Event handlers
  onError?: (error: Error) => void;
  onLoad?: (e: NativeSyntheticEvent<any>) => void;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
}

/**
 * CachedImage component
 * Displays images with caching functionality and smooth animations
 */
export const CachedImage: React.FC<CachedImageProps> = ({
  source,
  placeholderSource,
  placeholderContent,
  fallbackSource,
  containerStyle,
  onError,
  priority = 'normal',
  prefetch = false,
  showLoadingIndicator = true,
  style,
  resizeMode = 'cover',
  ...props
}) => {
  // Component state
  const [cachedSource, setCachedSource] = useState<{ uri: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const loadAttemptedRef = useRef(false); // Track if we've attempted to load the image
  
  // Load the image
  useEffect(() => {
    let isMounted = true;
    setIsFading(false); // Reset fading state when source changes
    
    // Function to load the image
    const loadImage = async () => {
      // If no source, set as loading false
      if (!source?.uri) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }
      
      // Set that we've attempted to load this image
      loadAttemptedRef.current = true;
      
      try {
        setIsLoading(true);
        setHasError(false);
        
        // Get cached image with a small timeout to allow for state updates and animations
        const cachedUri = await Promise.race([
          imageCache.getImage(source.uri),
          // If image loads too quickly, add a tiny delay for smoother UX
          new Promise<string>(res => setTimeout(() => res(source.uri), 50))
        ]);
        
        if (isMounted) {
          // Start fading animation
          setIsFading(true);
          setCachedSource({ uri: cachedUri });
          
          // Delay setting isLoading to false slightly to allow fade animation to start
          setTimeout(() => {
            if (isMounted) {
              setIsLoading(false);
            }
          }, 50);
        }
      } catch (error) {
        console.error('Error loading image:', error);
        if (isMounted) {
          setHasError(true);
          setIsLoading(false);
          if (onError) {
            onError(error instanceof Error ? error : new Error(String(error)));
          }
        }
      }
    };
    
    // Prefetch if needed - separated from loadImage to reduce wait time
    if (prefetch && source?.uri) {
      prefetchManager.prefetchImage(source.uri, priority);
    }
    
    loadImage();
    
    return () => {
      isMounted = false;
    };
  }, [source?.uri, prefetch, priority]);
  
  // Loading state display
  if (isLoading && !cachedSource) {
    return (
      <View style={[styles.container, containerStyle, style]}>
        {placeholderSource ? (
          <Image source={placeholderSource} style={StyleSheet.absoluteFill} resizeMode={resizeMode} />
        ) : placeholderContent ? (
          placeholderContent
        ) : null}
        
        {showLoadingIndicator && (
          <ActivityIndicator size="small" color="#FF6B6B" style={styles.loader} />
        )}
      </View>
    );
  }
  
  // Error state display
  if (hasError) {
    return (
      <View style={[styles.container, containerStyle, style]}>
        {fallbackSource ? (
          <Image source={fallbackSource} style={[{ width: 50, height: 50 }]} resizeMode="contain" />
        ) : (
          <View style={styles.errorContainer} />
        )}
      </View>
    );
  }
  
  // Show the image with fade-in animation
  return (
    <View style={[containerStyle, style, styles.container]}>
      {cachedSource && (
        <Animated.View 
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={StyleSheet.absoluteFill}
        >
          <Image
            source={cachedSource}
            style={StyleSheet.absoluteFill}
            resizeMode={resizeMode}
            onLoad={props.onLoad}
            onLoadStart={props.onLoadStart}
            onLoadEnd={() => {
              setIsLoading(false);
              if (props.onLoadEnd) props.onLoadEnd();
            }}
            onError={(e: NativeSyntheticEvent<ImageErrorEventData>) => {
              // Convert to regular Error for our handler
              if (onError) {
                onError(new Error(e.nativeEvent.error));
              }
            }}
          />
        </Animated.View>
      )}
      
      {isLoading && cachedSource && showLoadingIndicator && (
        <ActivityIndicator 
          size="small" 
          color="#FF6B6B" 
          style={[styles.loader, { position: 'absolute', top: '50%', left: '50%', marginLeft: -10, marginTop: -10 }]} 
        />
      )}
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent', // Changed from #e1e1e1 to transparent for better appearance
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative', // Ensure relative positioning for absolute children
  },
  loader: {
    alignSelf: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8d7da',
  },
});

// Export the component and prefetch methods
export default Object.assign(CachedImage, {
  prefetchImages: prefetchManager.prefetchImages,
  // Add direct access to cache management
  clearCache: imageCache.clearCache,
});
