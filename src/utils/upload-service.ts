import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL,
  uploadString
} from '@firebase/storage';
import { storage } from '../services/firebase';
import { getExtension, getMimeType } from './file-utils';

/**
 * Utility service for handling file uploads to Firebase Storage
 * with specialized handling for iOS
 */
export interface UploadOptions {
  userId: string;
  path?: string;
  contentType?: string;
  metadata?: Record<string, string>;
  maxRetries?: number;
}

/**
 * Upload a file to Firebase Storage with platform-specific handling
 */
export const uploadFile = async (
  fileUri: string, 
  options: UploadOptions
): Promise<string> => {
  const {
    userId,
    path = 'profiles',
    contentType: providedContentType,
    metadata = {},
    maxRetries = 3
  } = options;
  
  // Extract filename from URI and determine content type
  const fileName = fileUri.split('/').pop() || `file-${Date.now()}.jpg`;
  const extension = getExtension(fileName);
  const contentType = providedContentType || getMimeType(extension) || 'image/jpeg';
  
  // Generate a unique filename to prevent collisions
  const timestamp = Date.now();
  const uniqueId = Math.floor(Math.random() * 1000000);
  const uniqueFileName = `photo-${timestamp}-${uniqueId}.${extension || 'jpg'}`;
  const storagePath = `${path}/${uniqueFileName}`; // Path can include chatId and userId already
  
  console.log(`Creating storage ref for path: ${storagePath}`);
  const storageRef = ref(storage, storagePath);
  const storageRefInfo = {
    bucket: (storage as any)._bucket || 'unknown',
    fullPath: storagePath,
    name: uniqueFileName
  };
  console.log("Storage reference created:", JSON.stringify(storageRefInfo));
  
  // Try multiple times in case of failure
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (Platform.OS === 'ios') {
        console.log(`iOS: Processing photo ${fileName}`);
        
        // First check if the file exists
        const info = await FileSystem.getInfoAsync(fileUri);
        if (!info.exists) {
          throw new Error(`File does not exist: ${fileUri}`);
        }
        
        // Create a temporary file to ensure we have a proper file URI
        // This helps with large files and iOS compatibility
        const tempDirectory = FileSystem.cacheDirectory || FileSystem.documentDirectory;
        const tempFilePath = `${tempDirectory}${fileName}`;
        
        try {
          // Copy the file to temp location
          await FileSystem.copyAsync({
            from: fileUri,
            to: tempFilePath
          });
          
          console.log(`iOS: Created temporary file at ${tempFilePath}`);
          
          // Verify the temp file exists and get its size
          const tempFileInfo = await FileSystem.getInfoAsync(tempFilePath, { size: true });
          const fileSize = 'size' in tempFileInfo ? tempFileInfo.size : 'unknown';
          console.log(`iOS: File info - exists: ${tempFileInfo.exists}, size: ${fileSize} bytes`);
          
          if (!tempFileInfo.exists) {
            throw new Error('Temporary file creation failed');
          }
          
          // Fetch the file and create a blob for upload
          console.log('iOS: Fetching the temporary file for upload');
          const response = await fetch(tempFilePath);
          const blob = await response.blob();
          
          console.log(`iOS: Created blob from temp file - Size: ${blob.size}`);
          console.log('iOS: Starting upload to Firebase');
          
          // Upload the blob to Firebase Storage
          await uploadBytes(storageRef, blob, {
            contentType,
            customMetadata: {
              ...metadata,
              originalFilename: fileName,
              platform: 'ios',
              attempt: String(attempt),
              method: 'blob-upload'
            }
          });
          
          // Clean up the temporary file
          await FileSystem.deleteAsync(tempFilePath, { idempotent: true });
          console.log('iOS: Upload completed successfully');
        } catch (iosError) {
          console.error('iOS-specific error:', iosError);
          throw iosError;
        }
      } else {
        // Android approach using fetch and blob
        console.log(`Android: Processing file ${fileName} (attempt ${attempt})`);
        const response = await fetch(fileUri);
        const blob = await response.blob();
        
        console.log(`Android: Created blob - Size: ${blob.size} bytes`);
        await uploadBytes(storageRef, blob, {
          contentType,
          customMetadata: {
            ...metadata,
            originalFilename: fileName,
            platform: 'android',
            attempt: String(attempt),
            method: 'blob-upload'
          }
        });
        
        console.log('Android: Upload completed successfully');
      }
      
      // Get and return the download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log(`Upload successful, URL: ${downloadURL}`);
      return downloadURL;
    } catch (error) {
      console.error(`Upload attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        console.error('All upload attempts failed');
        throw error;
      }
      
      // Wait before retry with exponential backoff
      const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000);
      console.log(`Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error('Upload failed after maximum retry attempts');
};

/**
 * Upload multiple files to Firebase Storage
 */
export const uploadMultipleFiles = async (
  fileUris: string[],
  options: UploadOptions,
  onProgress?: (progress: number) => void
): Promise<string[]> => {
  console.log(`Number of new photos to upload: ${fileUris.length}`);
  const results: string[] = [];
  
  for (let i = 0; i < fileUris.length; i++) {
    try {
      const url = await uploadFile(fileUris[i], {
        ...options,
        // Add index to metadata for better tracking
        metadata: {
          ...options.metadata,
          fileIndex: String(i),
          totalFiles: String(fileUris.length)
        }
      });
      results.push(url);
      
      // Report progress
      if (onProgress) {
        onProgress(((i + 1) / fileUris.length) * 100);
      }
    } catch (error: unknown) {
      console.error(`Error uploading image:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to upload image: ${errorMessage}`);
    }
  }
  
  return results;
};
