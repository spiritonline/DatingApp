import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { auth, storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from '@firebase/storage';
import { nanoid } from 'nanoid';

export interface PhotoUploadOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  allowsMultipleSelection?: boolean;
}

export interface PhotoItem {
  id: string;
  uri: string;
  isUploading?: boolean;
  progress?: number;
}

const DEFAULT_OPTIONS: PhotoUploadOptions = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.7,
  allowsMultipleSelection: false
};

/**
 * Custom hook for managing photo uploads
 */
export function usePhotoUpload(initialPhotos: string[] = []) {
  const [photos, setPhotos] = useState<PhotoItem[]>(
    initialPhotos.map(uri => ({ id: nanoid(), uri }))
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Request permissions for accessing photos
  const requestPermissions = useCallback(async () => {
    if (Platform.OS !== 'web') {
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (libraryStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your photos in order to upload profile images.'
        );
        return false;
      }
      
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (cameraStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your camera in order to take profile photos.'
        );
        return false;
      }
    }
    
    return true;
  }, []);

  // Process selected image
  const processImage = useCallback(async (uri: string, options: PhotoUploadOptions = DEFAULT_OPTIONS) => {
    try {
      // Resize and compress image for better upload performance
      const manipResult = await manipulateAsync(
        uri,
        [{ resize: { width: options.maxWidth!, height: options.maxHeight! } }],
        { compress: options.quality!, format: SaveFormat.JPEG }
      );
      
      return manipResult.uri;
    } catch (err) {
      console.error('Error processing image:', err);
      throw new Error('Failed to process image. Please try a different photo.');
    }
  }, []);

  // Pick image from library
  const pickImage = useCallback(async (options: PhotoUploadOptions = DEFAULT_OPTIONS) => {
    try {
      setError(null);
      
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) return;
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as const,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
        allowsMultipleSelection: options.allowsMultipleSelection
      });
      
      if (result.canceled) return;
      
      // Add each selected asset to the photos array
      const newPhotos = await Promise.all(
        result.assets.map(async (asset) => {
          const processedUri = await processImage(asset.uri, options);
          return {
            id: nanoid(),
            uri: processedUri,
            isUploading: false,
            progress: 0
          };
        })
      );
      
      setPhotos(prev => [...prev, ...newPhotos]);
      return newPhotos;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error picking image';
      console.error('Error picking image:', err);
      setError(errorMessage);
      return null;
    }
  }, [requestPermissions, processImage]);

  // Take photo with camera
  const takePhoto = useCallback(async (options: PhotoUploadOptions = DEFAULT_OPTIONS) => {
    try {
      setError(null);
      
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) return;
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'] as const,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1
      });
      
      if (result.canceled) return;
      
      const asset = result.assets[0];
      const processedUri = await processImage(asset.uri, options);
      
      const newPhoto = {
        id: nanoid(),
        uri: processedUri,
        isUploading: false,
        progress: 0
      };
      
      setPhotos(prev => [...prev, newPhoto]);
      return newPhoto;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error taking photo';
      console.error('Error taking photo:', err);
      setError(errorMessage);
      return null;
    }
  }, [requestPermissions, processImage]);

  // Upload a single photo to Firebase Storage
  const uploadPhoto = useCallback(async (photo: PhotoItem) => {
    if (!auth.currentUser) {
      setError('You must be logged in to upload photos');
      return null;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Update photo to indicate uploading state
      setPhotos(prev => prev.map(p => 
        p.id === photo.id 
          ? { ...p, isUploading: true, progress: 0 } 
          : p
      ));
      
      // Create a reference to storage with a unique filename
      const userId = auth.currentUser.uid;
      const filename = `profile_${userId}_${Date.now()}.jpg`;
      const storageRef = ref(storage, `profiles/${userId}/${filename}`);
      
      // Get the image data
      const response = await fetch(photo.uri);
      const blob = await response.blob();
      
      // Upload the image
      await uploadBytes(storageRef, blob);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update the photo with the cloud URL
      setPhotos(prev => prev.map(p => 
        p.id === photo.id 
          ? { ...p, uri: downloadURL, isUploading: false, progress: 100 } 
          : p
      ));
      
      return downloadURL;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error uploading photo';
      console.error('Error uploading photo:', err);
      setError(errorMessage);
      
      // Update photo to indicate error state
      setPhotos(prev => prev.map(p => 
        p.id === photo.id 
          ? { ...p, isUploading: false, progress: 0 } 
          : p
      ));
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Upload all local photos
  const uploadAllPhotos = useCallback(async () => {
    if (!auth.currentUser) {
      setError('You must be logged in to upload photos');
      return [];
    }
    
    try {
      setIsLoading(true);
      setError(null);
      setUploadProgress(0);
      
      // Filter photos that need to be uploaded (URI starts with file:)
      const localPhotos = photos.filter(photo => photo.uri.startsWith('file:'));
      
      if (localPhotos.length === 0) {
        // Return existing cloud URLs if no local photos to upload
        return photos.map(photo => photo.uri);
      }
      
      // Upload each photo and track progress
      const uploadedUrls: string[] = [];
      
      for (let i = 0; i < localPhotos.length; i++) {
        const photo = localPhotos[i];
        const downloadURL = await uploadPhoto(photo);
        
        if (downloadURL) {
          uploadedUrls.push(downloadURL);
        }
        
        // Update overall progress
        const progress = Math.round(((i + 1) / localPhotos.length) * 100);
        setUploadProgress(progress);
      }
      
      // Combine uploaded URLs with existing cloud URLs
      const cloudPhotos = photos
        .filter(photo => !photo.uri.startsWith('file:'))
        .map(photo => photo.uri);
      
      return [...cloudPhotos, ...uploadedUrls];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error uploading photos';
      console.error('Error uploading photos:', err);
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [photos, uploadPhoto]);

  // Remove a photo
  const removePhoto = useCallback((photoId: string) => {
    setPhotos(prev => prev.filter(photo => photo.id !== photoId));
  }, []);

  // Reorder photos
  const reorderPhotos = useCallback((orderedPhotos: PhotoItem[]) => {
    setPhotos(orderedPhotos);
  }, []);

  return {
    photos,
    setPhotos,
    isLoading,
    error,
    uploadProgress,
    pickImage,
    takePhoto,
    uploadPhoto,
    uploadAllPhotos,
    removePhoto,
    reorderPhotos
  };
}
