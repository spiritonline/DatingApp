// src/utils/mediaUtils.ts
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { MediaServiceResult } from '../types/media';

/**
 * Handles media compression and format conversion if needed
 */
export async function processMediaForUpload(mediaResult: MediaServiceResult) {
  if (!mediaResult.success || mediaResult.assets.length === 0) {
    throw new Error('Invalid media result');
  }
  
  return Promise.all(mediaResult.assets.map(async (asset) => {
    // Do any additional processing
    return {
      ...asset,
      // Any transformations here
    };
  }));
}

/**
 * Get file info from URI
 */
export async function getFileInfo(uri: string) {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    return fileInfo;
  } catch (error) {
    console.error('Error getting file info:', error);
    return null;
  }
}

/**
 * Calculate optimal dimensions for image upload
 */
export function calculateOptimalDimensions(width: number, height: number, maxDimension: number = 1200) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  
  const aspectRatio = width / height;
  
  if (width > height) {
    return {
      width: maxDimension,
      height: Math.round(maxDimension / aspectRatio),
    };
  } else {
    return {
      width: Math.round(maxDimension * aspectRatio),
      height: maxDimension,
    };
  }
}

/**
 * Generate a unique filename for the media
 */
export function generateUniqueFilename(originalName: string | undefined, prefix: string = ''): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  
  if (!originalName) {
    return `${prefix}${timestamp}_${random}.jpg`;
  }
  
  const extension = originalName.split('.').pop() || 'jpg';
  return `${prefix}${timestamp}_${random}.${extension}`;
}
