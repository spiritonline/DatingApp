// src/services/imagePicker.ts
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { 
  MediaPickerOptions, 
  MediaServiceResult,
  CropperPreset
} from '../types/media';
import { IMAGE_PICKER_CONFIG } from '../config/mediaConfig';

/**
 * Select image from gallery with cropping
 */
export const selectFromGallery = async (
  preset: CropperPreset = 'chat',
  customOptions?: MediaPickerOptions
): Promise<MediaServiceResult> => {
  try {
    // Request permission first
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return {
        success: false,
        assets: [],
        canceled: false,
        error: new Error('Permission to access media library was denied')
      };
    }

    // Merge preset with any custom options
    const config = preset === 'profile' ? IMAGE_PICKER_CONFIG.profile : IMAGE_PICKER_CONFIG.chat;
    const options = {
      ...config,
      ...customOptions
    };
    
    // Convert options to Expo image picker format
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: options.mediaType === 'video' ? 
        ['videos'] as const : 
        (options.mediaType === 'photo' ? 
          ['images'] as const : 
          ['images', 'videos'] as const),
      allowsEditing: options.cropping || true,
      aspect: options.cropperCircleOverlay ? [1, 1] : [options.width || 4, options.height || 3],
      quality: options.compressImageQuality || 0.8,
      allowsMultipleSelection: options.multiple || false,
      exif: true,
    });

    if (result.canceled) {
      return { success: false, assets: [], canceled: true };
    }

    // Format the results
    return {
      success: true,
      assets: result.assets.map(asset => ({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileName: asset.fileName || asset.uri.split('/').pop(),
        fileSize: asset.fileSize,
        type: asset.type || 'image',
        duration: asset.duration || undefined,
        mime: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg')
      })),
      canceled: false
    };
  } catch (error: unknown) {
    console.error('Error selecting from gallery:', error);
    return { 
      success: false, 
      assets: [], 
      canceled: false, 
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Capture from camera with cropping
 */
export const captureFromCamera = async (
  preset: CropperPreset = 'chat',
  customOptions?: MediaPickerOptions
): Promise<MediaServiceResult> => {
  try {
    // Request permission first
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return {
        success: false,
        assets: [],
        canceled: false,
        error: new Error('Permission to access camera was denied')
      };
    }

    // Merge preset with any custom options
    const config = preset === 'profile' ? IMAGE_PICKER_CONFIG.profile : IMAGE_PICKER_CONFIG.chat;
    const options = {
      ...config,
      ...customOptions
    };
    
    // Convert options to Expo image picker format
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: options.mediaType === 'video' ? 
        ['videos'] as const : 
        ['images'] as const,
      allowsEditing: options.cropping || true,
      aspect: options.cropperCircleOverlay ? [1, 1] : [options.width || 4, options.height || 3],
      quality: options.compressImageQuality || 0.8,
      exif: true,
    });

    if (result.canceled) {
      return { success: false, assets: [], canceled: true };
    }

    // Format the results
    return {
      success: true,
      assets: result.assets.map(asset => ({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileName: asset.fileName || asset.uri.split('/').pop(),
        fileSize: asset.fileSize,
        type: asset.type || 'image',
        duration: asset.duration || undefined,
        mime: asset.mimeType || (asset.type === 'video' ? 'video/mp4' : 'image/jpeg')
      })),
      canceled: false
    };
  } catch (error: unknown) {
    console.error('Error capturing from camera:', error);
    return { 
      success: false, 
      assets: [], 
      canceled: false, 
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Clean up resources and temporary files
 * Note: This is a no-op with expo-image-picker as it doesn't have an equivalent API
 */
export const cleanTempFiles = async (): Promise<void> => {
  // Expo image picker doesn't provide a clean API - this is a no-op
  return Promise.resolve();
};
