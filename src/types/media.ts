// src/types/media.ts
export type MediaType = 'photo' | 'video' | 'any';

export type CropperPreset = 'profile' | 'chat' | 'gallery' | 'custom';

export interface MediaPickerOptions {
  width?: number;
  height?: number;
  cropping?: boolean;
  freeStyleCropEnabled?: boolean;
  cropperCircleOverlay?: boolean;
  cropperToolbarTitle?: string;
  mediaType?: MediaType;
  includeBase64?: boolean;
  compressImageQuality?: number;
  multiple?: boolean;
  maxFiles?: number;
  includeExif?: boolean;
  customOptions?: Record<string, any>;
}

// For compatibility with Expo Image Picker
export interface ExpoImagePickerAsset {
  uri: string;
  width: number;
  height: number;
  type?: 'image' | 'video' | 'livePhoto' | 'pairedVideo';
  fileName?: string;
  fileSize?: number;
  duration?: number | null;
  mimeType?: string;
  exif?: Record<string, any>;
}

export interface MediaServiceResult {
  success: boolean;
  assets: Array<{
    uri: string;
    width: number;
    height: number;
    fileName?: string;
    fileSize?: number;
    type: 'image' | 'video' | 'livePhoto' | 'pairedVideo';
    duration?: number;
    mime?: string;
  }>;
  canceled: boolean;
  error?: Error;
}
