import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthNavigationProp } from '../navigation/types';

/**
 * A simple screen to test ImageViewer functionality
 * This helps isolate whether the issue is with the navigation or the thumbnail click handler
 */
export default function DebugImageViewerScreen() {
  const navigation = useNavigation<AuthNavigationProp>();

  const navigateToImageViewer = () => {
    console.log('Debug: Navigating to ImageViewer with test images');
    
    // Create test images
    const testImages = [
      {
        id: 'test1',
        uri: 'https://picsum.photos/500/500',
        caption: 'Test Image 1'
      },
      {
        id: 'test2',
        uri: 'https://picsum.photos/600/600',
        caption: 'Test Image 2'
      }
    ];
    
    // Navigate to ImageViewer
    navigation.navigate('ImageViewer', {
      images: testImages,
      initialIndex: 0
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Debug Image Viewer</Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={navigateToImageViewer}
        testID="debug-image-viewer-button"
      >
        <Text style={styles.buttonText}>Open Image Viewer</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.button, styles.backButton]}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>Go Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 16,
    width: 200,
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: '#555',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
