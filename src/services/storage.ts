import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from '@firebase/storage';
import * as FileSystem from 'expo-file-system';

/**
 * Upload media file to Firebase Storage
 * @param uri Local file URI
 * @param path Storage path
 * @returns URL of the uploaded file
 */
export const uploadMedia = async (uri: string, path: string): Promise<string> => {
  try {
    // Convert URI to blob
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // Create storage reference
    const storageRef = ref(storage, path);
    
    // Upload file
    await uploadBytes(storageRef, blob);
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading media:', error);
    throw new Error('Failed to upload media');
  }
};

/**
 * Get the download URL for a media item
 * @param path Storage path or URL
 * @returns Full URL to media
 */
export const getMediaUrl = (path: string): string => {
  if (!path) return '';
  
  // If already a URL, return as is
  if (path.startsWith('http')) {
    return path;
  }
  
  // For local files (prefixed with file://)
  if (path.startsWith('file://')) {
    return path;
  }
  
  // For testing purposes - use placeholder images
  if (path === 'test_image') {
    return 'https://via.placeholder.com/300';
  }
  
  // For storage paths, we would normally get the download URL
  // But we're just returning the path for now since we'd need to make an async call
  return path;
};

/**
 * Delete a file from Firebase Storage
 * @param path Storage path
 */
export const deleteMedia = async (path: string): Promise<void> => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting media:', error);
    throw new Error('Failed to delete media');
  }
};

/**
 * Download a file from Firebase Storage to local filesystem
 * @param url File URL
 * @param localPath Local path to save file
 * @returns Local URI of downloaded file
 */
export const downloadMedia = async (url: string, localPath: string): Promise<string> => {
  try {
    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      FileSystem.documentDirectory + localPath,
      {}
    );
    
    const { uri } = await downloadResumable.downloadAsync();
    return uri;
  } catch (error) {
    console.error('Error downloading media:', error);
    throw new Error('Failed to download media');
  }
};

/**
 * Get file info from a local URI
 * @param uri Local file URI
 * @returns File information
 */
export const getFileInfo = async (uri: string) => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    return fileInfo;
  } catch (error) {
    console.error('Error getting file info:', error);
    throw new Error('Failed to get file info');
  }
};
