// src/components/chat/ImageMessageThumbnail.tsx
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { AuthNavigationProp } from '../../navigation/types';

interface ImageMessageThumbnailProps {
  uri: string;
  caption?: string;
  dimensions?: { width?: number; height?: number };
  isDark: boolean;
  isCurrentUser: boolean;
  // id?: string; // Optional: If needed for specific viewer context, but often URI is enough
}

export default function ImageMessageThumbnail({
  uri,
  caption,
  dimensions,
  isDark,
  isCurrentUser,
}: ImageMessageThumbnailProps) {
  const navigation = useNavigation<AuthNavigationProp>();

  const openImageViewer = () => {
    const imageData = [{
      id: uri, // Use URI as a simple ID for the viewer
      uri,
      caption,
      width: dimensions?.width,
      height: dimensions?.height,
    }];
    navigation.navigate('ImageViewer', {
      images: imageData,
      initialIndex: 0,
    });
  };

  return (
    <View style={styles.container} testID="image-message-thumbnail">
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
              color: isCurrentUser ? (isDark ? '#FFFFFF' : '#FFFFFF') : (isDark ? '#FFFFFF' : '#000000'),
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