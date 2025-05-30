// src/hooks/useImagePicker.ts
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { 
  selectFromGallery,
  captureFromCamera,
  cleanTempFiles
} from '../services/imagePicker';
import { MediaPickerOptions, MediaServiceResult, CropperPreset } from '../types/media';

interface UseImagePickerOptions {
  onPickerClosed?: () => void;
  onPickerError?: (error: Error) => void;
  onPickerSuccess?: (result: MediaServiceResult) => void;
}

export function useImagePicker(options?: UseImagePickerOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<MediaServiceResult | null>(null);

  const pickFromGallery = useCallback(async (
    preset: CropperPreset = 'chat',
    customOptions?: MediaPickerOptions
  ): Promise<MediaServiceResult> => {
    setIsLoading(true);
    
    try {
      const result = await selectFromGallery(preset, customOptions);
      
      setLastResult(result);
      
      if (result.canceled) {
        options?.onPickerClosed?.();
      } else if (result.error) {
        options?.onPickerError?.(result.error);
      } else if (result.success) {
        options?.onPickerSuccess?.(result);
      }
      
      return result;
    } catch (error) {
      console.error('Error in useImagePicker.pickFromGallery:', error);
      const err = error instanceof Error ? error : new Error(String(error));
      options?.onPickerError?.(err);
      
      return {
        success: false,
        assets: [],
        canceled: false,
        error: err
      };
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const pickFromCamera = useCallback(async (
    preset: CropperPreset = 'chat',
    customOptions?: MediaPickerOptions
  ): Promise<MediaServiceResult> => {
    setIsLoading(true);
    
    try {
      const result = await captureFromCamera(preset, customOptions);
      
      setLastResult(result);
      
      if (result.canceled) {
        options?.onPickerClosed?.();
      } else if (result.error) {
        options?.onPickerError?.(result.error);
      } else if (result.success) {
        options?.onPickerSuccess?.(result);
      }
      
      return result;
    } catch (error) {
      console.error('Error in useImagePicker.pickFromCamera:', error);
      const err = error instanceof Error ? error : new Error(String(error));
      options?.onPickerError?.(err);
      
      return {
        success: false,
        assets: [],
        canceled: false,
        error: err
      };
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const cleanup = useCallback(async () => {
    try {
      await cleanTempFiles();
    } catch (error) {
      console.warn('Error cleaning temp files:', error);
    }
  }, []);

  return {
    isLoading,
    lastResult,
    pickFromGallery,
    pickFromCamera,
    cleanup
  };
}
