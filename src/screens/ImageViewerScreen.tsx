import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, StatusBar, Dimensions, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
// SafeAreaView removed as it's no longer needed
import { Image } from 'expo-image';
import { useAppTheme } from '../utils/useAppTheme';
import { AuthStackParamList, AuthNavigationProp } from '../navigation/types';

// Define image item type
type ImageItem = {
  id: string;
  uri: string;
  caption?: string;
  width?: number;
  height?: number;
};

// Define the route prop type
type ImageViewerScreenRouteProp = RouteProp<AuthStackParamList, 'ImageViewer'>;

export default function ImageViewerScreen() {
  const navigation = useNavigation<AuthNavigationProp>();
  const route = useRoute<ImageViewerScreenRouteProp>();
  const { isDark } = useAppTheme();
  
  // Get the images array and initialIndex from params
  const { images = [], initialIndex = 0 } = route.params || {};
  
  // State for current image index and loading state
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Log parameters on mount
  useEffect(() => {
    console.log('📋 ImageViewerScreen mounted');
    console.log('📊 Received params:', JSON.stringify(route.params, null, 2));
    console.log(`📸 Displaying image ${currentIndex + 1} of ${images.length}`);
    
    if (images.length === 0) {
      console.error('❌ No images provided to ImageViewerScreen');
      setHasError(true);
    }
  }, []);
  
  // Log when current image changes
  useEffect(() => {
    console.log(`🔄 Changed to image ${currentIndex + 1} of ${images.length}`);
  }, [currentIndex, images.length]);
  
  // Handle close
  const handleClose = () => {
    console.log('Closing image viewer');
    navigation.goBack();
  };
  
  // Navigate to previous image
  const goToPrevious = () => {
    if (currentIndex > 0) {
      console.log(`🔻 Moving to previous image (${currentIndex + 1} → ${currentIndex})`);
      setIsLoading(true);
      setCurrentIndex(currentIndex - 1);
    } else {
      console.log('⛔ Cannot go to previous image: already at first image');
    }
  };
  
  // Navigate to next image
  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      console.log(`🔼 Moving to next image (${currentIndex + 1} → ${currentIndex + 2})`);
      setIsLoading(true);
      setCurrentIndex(currentIndex + 1);
    } else {
      console.log('⛔ Cannot go to next image: already at last image');
    }
  };
  
  // Handler for image loading start
  const handleLoadStart = () => {
    console.log(`🔄 Starting to load image: ${currentImage?.uri}`);
    setIsLoading(true);
  };

  // Handler for image loading completion
  const handleLoadEnd = () => {
    console.log(`✅ Image loaded successfully: ${currentImage?.uri}`);
    setIsLoading(false);
  };

  // Handler for image loading error
  const handleLoadError = (error: any) => {
    console.error(`❌ Error loading image: ${currentImage?.uri}`, error);
    setHasError(true);
    setIsLoading(false);
  };
  
  // Get the current image
  const currentImage = images[currentIndex] as ImageItem | undefined;
  
  // Handle status bar visibility
  useEffect(() => {
    // Hide status bar when viewer is active, show it when inactive
    StatusBar.setHidden(true, 'fade');
    return () => StatusBar.setHidden(false, 'fade');
  }, []);

  // Log current image details
  useEffect(() => {
    if (currentImage) {
      console.log(`🖼️ Current image details: ${JSON.stringify(currentImage, null, 2)}`);
    } else {
      console.warn('⚠️ No current image available at index', currentIndex);
    }
  }, [currentImage, currentIndex]);
  
  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#000' }]}>
      <TouchableOpacity 
        style={styles.closeButton} 
        onPress={handleClose}
        accessibilityLabel="Close image viewer"
        testID="close-image-viewer"
      >
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>
      
      {hasError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading images</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleClose}
          >
            <Text style={styles.retryButtonText}>Go back</Text>
          </TouchableOpacity>
        </View>
      ) : images.length === 0 ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No images to display</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleClose}
          >
            <Text style={styles.retryButtonText}>Go back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.imageContainer}>
          {currentImage ? (
            <>
              <Image
                source={{ uri: currentImage.uri }}
                style={styles.image}
                contentFit="contain"
                transition={200}
                onLoadStart={handleLoadStart}
                onLoadEnd={handleLoadEnd}
                onError={handleLoadError}
                testID="full-image-viewer"
                accessible={true}
                accessibilityLabel={`Full screen image ${currentIndex + 1} of ${images.length}${currentImage.caption ? `: ${currentImage.caption}` : ''}`}
              />
              {isLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#ffffff" />
                  <Text style={styles.loadingText}>Loading image...</Text>
                </View>
              )}
              {!isLoading && currentImage.caption && (
                <View style={styles.captionContainer}>
                  <Text style={styles.captionText}>{currentImage.caption}</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Cannot display this image</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={handleClose}
              >
                <Text style={styles.retryButtonText}>Go back</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      
      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <TouchableOpacity 
          style={[styles.navButton, styles.prevButton]}
          onPress={goToPrevious}
          accessibilityLabel="Previous image"
          testID="previous-image"
        >
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>
      )}
      
      {currentIndex < images.length - 1 && (
        <TouchableOpacity 
          style={[styles.navButton, styles.nextButton]}
          onPress={goToNext}
          accessibilityLabel="Next image"
          testID="next-image"
        >
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
      )}
      
      {/* Page indicator */}
      {images.length > 1 && (
        <View style={styles.pageIndicator}>
          <Text style={styles.pageIndicatorText}>
            {currentIndex + 1} / {images.length}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    padding: 10,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  captionContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    right: 20,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
  },
  captionText: {
    color: '#FFF',
    fontSize: 14,
    textAlign: 'center',
  },
  pageIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pageIndicatorText: {
    color: '#FFF',
    fontSize: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 10,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -25,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  prevButton: {
    left: 20,
  },
  nextButton: {
    right: 20,
  },
  navButtonText: {
    color: '#FFF',
    fontSize: 30,
    fontWeight: 'bold',
  }
});
