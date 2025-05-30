// src/services/cache/networkMonitor.ts
import { Platform } from 'react-native';

// Network quality types
export type NetworkQuality = 'poor' | 'moderate' | 'good' | 'excellent' | 'unknown';

// Quality configuration based on network quality
export interface QualityConfig {
  maxWidth: number;  // Maximum image width to request
  maxHeight: number; // Maximum image height to request
  quality: number;   // JPEG quality (0-100)
}

// Quality presets for different network conditions
const QUALITY_PRESETS: Record<NetworkQuality, QualityConfig> = {
  poor: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 60,
  },
  moderate: {
    maxWidth: 800,
    maxHeight: 800,
    quality: 70,
  },
  good: {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 80,
  },
  excellent: {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 90,
  },
  unknown: {
    maxWidth: 800,
    maxHeight: 800,
    quality: 80,
  }
};

/**
 * Simple network monitor for image optimization
 * This simplified version doesn't rely on external dependencies
 */
function createNetworkMonitor() {
  // Default to a reasonable network quality
  let currentQuality: NetworkQuality = 'good';
  let currentIsConnected = true;
  
  // Listeners for network quality changes
  const listeners = new Set<(quality: NetworkQuality) => void>();
  
  /**
   * Start monitoring network quality - simplified version
   */
  function startMonitoring(): void {
    console.log('Network monitoring started with default quality');
    // Without actual network monitoring, we'll default to 'good' quality
    // This is a compromise to avoid dependencies
  }
  
  /**
   * Set the network quality manually
   */
  function setNetworkQuality(quality: NetworkQuality): void {
    if (quality !== currentQuality) {
      currentQuality = quality;
      notifyListeners();
    }
  }
  
  /**
   * Notify all listeners of the current quality
   */
  function notifyListeners(): void {
    listeners.forEach(listener => {
      try {
        listener(currentQuality);
      } catch (error) {
        console.error('Error in network quality listener:', error);
      }
    });
  }
  /**
   * Add a listener for network quality changes
   */
  function addListener(listener: (quality: NetworkQuality) => void): () => void {
    listeners.add(listener);
    // Immediately notify with current quality
    listener(currentQuality);
    
    // Return a function to remove the listener
    return () => {
      listeners.delete(listener);
    };
  }
  
  /**
   * Get the current quality config
   */
  function getQualityConfig(): QualityConfig {
    return QUALITY_PRESETS[currentQuality];
  }
  
  /**
   * Get the current network quality
   */
  function getCurrentQuality(): NetworkQuality {
    return currentQuality;
  }
  
  /**
   * Check if device is currently connected
   */
  function isConnected(): boolean {
    return currentIsConnected;
  }
  
  /**
   * Transform a URL to optimize based on current network quality
   */
  function getOptimizedImageUrl(url: string): string {
    if (!url) return url;
    
    // Skip for data URLs
    if (url.startsWith('data:')) return url;
    
    // Skip for local file URLs
    if (url.startsWith('file://')) return url;
    
    // Get quality config based on network
    const config = getQualityConfig();
    
    // Simple optimization by appending query parameters
    try {
      // For Firebase Storage URLs, just return as is
      if (url.includes('firebasestorage.googleapis.com')) {
        return url;
      }
      
      // For other URLs, add simple quality parameters
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}w=${config.maxWidth}&h=${config.maxHeight}&q=${config.quality}`;
    } catch (error) {
      console.warn('Error optimizing URL:', error);
      return url;
    }
  }
  
  // Return the public API
  return {
    startMonitoring,
    addListener,
    getQualityConfig,
    getOptimizedImageUrl,
    getCurrentQuality,
    isConnected,
    setNetworkQuality
  };
}

// Create and export a singleton instance
export const networkMonitor = createNetworkMonitor();

// Start monitoring network quality when this module is imported
networkMonitor.startMonitoring();

export default networkMonitor;
