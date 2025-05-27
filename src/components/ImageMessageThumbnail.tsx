import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Pressable } from 'react-native-gesture-handler'; // Import Pressable from react-native-gesture-handler
import { Image } from 'expo-image';
import { Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthNavigationProp } from '../navigation/types';

interface ImageMessageThumbnailProps {
  id: string;
  uri: string;
  caption?: string;
  dimensions?: { width?: number; height?: number };
  isDark: boolean;
  isCurrentUser: boolean;
}

/**
 * A dedicated component for rendering image thumbnails in chat messages
 * with reliable click handling for opening the image viewer.
 */
export default function ImageMessageThumbnail({
  id,
  uri,
  caption,
  dimensions,
  isDark,
  isCurrentUser,
}: ImageMessageThumbnailProps) {
  const navigation = useNavigation<AuthNavigationProp>();

  // Function to open the image viewer with this image
  const openImageViewer = () => {
    console.log('ImageMessageThumbnail: Opening image viewer', { id, uri });
    
    // Create a simple image object for the viewer
    const imageData = [{
      id,
      uri,
      caption,
      width: dimensions?.width,
      height: dimensions?.height,
    }];
    
    // Navigate to the image viewer
    navigation.navigate('ImageViewer', {
      images: imageData,
      initialIndex: 0,
    });
  };

  return (
    <View style={styles.container} testID="image-message-thumbnail">
      {/* Direct Pressable with minimal complexity */}
      <Pressable
        onPress={openImageViewer}
        style={({ pressed }) => [
          styles.pressable,
          { opacity: pressed ? 0.7 : 1 }
        ]}
        android_ripple={{ color: 'rgba(0,0,0,0.2)' }}
        testID="image-thumbnail-pressable"
      >
        <Image
          source={{ uri }}
          style={[
            styles.image,
            { borderColor: isCurrentUser ? '#FF6B6B' : (isDark ? '#444' : '#ddd') }
          ]}
          contentFit="cover"
          testID="image-thumbnail-image"
        />
      </Pressable>
      
      {caption && (
        <Text
          style={[
            styles.caption,
            {
              color: isCurrentUser ? '#FFFFFF' : (isDark ? '#FFFFFF' : '#000000'),
            }
          ]}
        >
          {caption}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  pressable: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: 10,
    borderWidth: 1,
  },
  caption: {
    fontSize: 14,
    marginTop: 4,
  },
});
