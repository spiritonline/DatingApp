import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, StatusBar, Dimensions } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useAppTheme } from '../utils/useAppTheme';
import { AuthStackParamList, AuthNavigationProp } from '../navigation/types';

// Define the route prop type
type ImageViewerScreenRouteProp = RouteProp<AuthStackParamList, 'ImageViewer'>;

export default function ImageViewerScreen() {
  const navigation = useNavigation<AuthNavigationProp>();
  const route = useRoute<ImageViewerScreenRouteProp>();
  const { isDark } = useAppTheme();
  
  // Log the params to debug
  console.log('ImageViewer received params:', JSON.stringify(route.params, null, 2));
  
  // Get the images array and initialIndex from params
  const { images = [], initialIndex = 0 } = route.params || {};
  
  // Alert for debugging
  useEffect(() => {
    console.log('ImageViewer screen mounted');
    Alert.alert(
      'ImageViewer Debug', 
      `Received ${images.length} images\nInitial index: ${initialIndex}\nFirst image URI: ${images[0]?.uri?.substring(0, 30) || 'none'}...`
    );
  }, [images, initialIndex]);
  
  // Handle close
  const handleClose = () => {
    console.log('Closing image viewer');
    navigation.goBack();
  };
  
  // Basic UI for testing
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#111' }]}>
      <StatusBar hidden />
      
      <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>
      
      {images.length > 0 ? (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: images[initialIndex]?.uri }}
            style={styles.image}
            contentFit="contain"
          />
          {images[initialIndex]?.caption && (
            <View style={styles.captionContainer}>
              <Text style={styles.captionText}>{images[initialIndex].caption}</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No images to display</Text>
        </View>
      )}
      
      {images.length > 1 && (
        <View style={styles.pageIndicator}>
          <Text style={styles.pageIndicatorText}>
            {initialIndex + 1} / {images.length}
          </Text>
        </View>
      )}
    </SafeAreaView>
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
  },
  closeButtonText: {
    fontSize: 30,
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
  }
});
