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
 * with specialized handling for iOS and security validations
 */
export interface UploadOptions {
  userId: string;
  path?: string;
  contentType?: string;
  metadata?: Record<string, string>;
  maxRetries?: number;
}

// Security configurations
const SECURITY_CONFIG = {
  // Maximum file size: 10MB
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  // Allowed image types
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  // Allowed video types
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
  // Allowed extensions
  ALLOWED_EXTENSIONS: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov', 'avi'],
  // Maximum dimensions for images
  MAX_IMAGE_DIMENSION: 2048,
};

/**
 * Validate file security before upload
 */
const validateFileSecurity = async (fileUri: string, contentType: string): Promise<void> => {
  try {
    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(fileUri, { size: true });
    
    if (!fileInfo.exists) {
      throw new Error('File does not exist');
    }

    // Check file size
    const fileSize = 'size' in fileInfo ? fileInfo.size || 0 : 0;
    if (fileSize > SECURITY_CONFIG.MAX_FILE_SIZE) {
      throw new Error(`File size (${Math.round(fileSize / 1024 / 1024)}MB) exceeds maximum allowed size (${SECURITY_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)`);
    }

    if (fileSize === 0) {
      throw new Error('File is empty');
    }

    // Validate content type
    const isImageType = SECURITY_CONFIG.ALLOWED_IMAGE_TYPES.includes(contentType);
    const isVideoType = SECURITY_CONFIG.ALLOWED_VIDEO_TYPES.includes(contentType);
    
    if (!isImageType && !isVideoType) {
      throw new Error(`File type ${contentType} is not allowed`);
    }

    // Validate file extension
    const fileName = fileUri.split('/').pop() || '';
    const extension = getExtension(fileName).toLowerCase();
    
    if (!SECURITY_CONFIG.ALLOWED_EXTENSIONS.includes(extension)) {
      throw new Error(`File extension .${extension} is not allowed`);
    }

    // Additional validation for potential malicious files
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      throw new Error('Invalid file name detected');
    }

  } catch (error) {
    if (__DEV__) {
      console.error('File validation failed:', error);
    }
    throw error;
  }
};

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
const sanitizeFileName = (fileName: string): string => {
  // Remove any path separators and dangerous characters
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.+/g, '.')
    .substring(0, 100); // Limit length
};

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
  
  // Extract and sanitize filename from URI
  const originalFileName = fileUri.split('/').pop() || `file-${Date.now()}.jpg`;
  const sanitizedFileName = sanitizeFileName(originalFileName);
  const extension = getExtension(sanitizedFileName);
  const contentType = providedContentType || getMimeType(extension) || 'image/jpeg';
  
  // Validate file security first
  await validateFileSecurity(fileUri, contentType);
  
  // Generate a unique filename to prevent collisions
  const timestamp = Date.now();
  const uniqueId = Math.floor(Math.random() * 1000000);
  const uniqueFileName = `photo-${timestamp}-${uniqueId}.${extension || 'jpg'}`;
  // Include userId in the path to match Firebase security rules
  const storagePath = `${path}/${userId}/${uniqueFileName}`;
  
  if (__DEV__) {
    console.log(`Creating storage ref for path: ${storagePath}`);
  }
  const storageRef = ref(storage, storagePath);
  
  // Try multiple times in case of failure
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (Platform.OS === 'ios') {
        if (__DEV__) {
          console.log(`iOS: Processing photo ${sanitizedFileName}`);
        }
        
        // First check if the file exists
        const info = await FileSystem.getInfoAsync(fileUri);
        if (!info.exists) {
          throw new Error(`File does not exist: ${fileUri}`);
        }
        
        // Create a temporary file to ensure we have a proper file URI
        // This helps with large files and iOS compatibility
        const tempDirectory = FileSystem.cacheDirectory || FileSystem.documentDirectory;
        const tempFilePath = `${tempDirectory}${sanitizedFileName}`;
        
        try {
          // Copy the file to temp location
          await FileSystem.copyAsync({
            from: fileUri,
            to: tempFilePath
          });
          
          if (__DEV__) {
            console.log(`iOS: Created temporary file at ${tempFilePath}`);
          }
          
          // Verify the temp file exists and get its size
          const tempFileInfo = await FileSystem.getInfoAsync(tempFilePath, { size: true });
          const fileSize = 'size' in tempFileInfo ? tempFileInfo.size : 'unknown';
          if (__DEV__) {
            console.log(`iOS: File info - exists: ${tempFileInfo.exists}, size: ${fileSize} bytes`);
          }
          
          if (!tempFileInfo.exists) {
            throw new Error('Temporary file creation failed');
          }
          
          // Fetch the file and create a blob for upload
          if (__DEV__) {
            console.log('iOS: Fetching the temporary file for upload');
          }
          const response = await fetch(tempFilePath);
          const blob = await response.blob();
          
          if (__DEV__) {
            console.log(`iOS: Created blob from temp file - Size: ${blob.size}`);
            console.log('iOS: Starting upload to Firebase');
          }
          
          // Upload the blob to Firebase Storage
          await uploadBytes(storageRef, blob, {
            contentType,
            customMetadata: {
              ...metadata,
              originalFilename: sanitizedFileName,
              platform: 'ios',
              attempt: String(attempt),
              method: 'blob-upload',
              uploadTimestamp: new Date().toISOString(),
              fileSize: String(blob.size),
              securityValidated: 'true'
            }
          });
          
          // Clean up the temporary file
          await FileSystem.deleteAsync(tempFilePath, { idempotent: true });
          if (__DEV__) {
            console.log('iOS: Upload completed successfully');
          }
        } catch (iosError) {
          if (__DEV__) {
            console.error('iOS-specific error:', iosError);
          }
          throw iosError;
        }
      } else {
        // Android approach using fetch and blob
        if (__DEV__) {
          console.log(`Android: Processing file ${sanitizedFileName} (attempt ${attempt})`);
        }
        const response = await fetch(fileUri);
        const blob = await response.blob();
        
        if (__DEV__) {
          console.log(`Android: Created blob - Size: ${blob.size} bytes`);
        }
        await uploadBytes(storageRef, blob, {
          contentType,
          customMetadata: {
            ...metadata,
            originalFilename: sanitizedFileName,
            platform: 'android',
            attempt: String(attempt),
            method: 'blob-upload',
            uploadTimestamp: new Date().toISOString(),
            fileSize: String(blob.size),
            securityValidated: 'true'
          }
        });
        
        if (__DEV__) {
          console.log('Android: Upload completed successfully');
        }
      }
      
      // Get and return the download URL
      const downloadURL = await getDownloadURL(storageRef);
      if (__DEV__) {
        console.log(`Upload successful, URL: ${downloadURL}`);
      }
      return downloadURL;
    } catch (error) {
      if (__DEV__) {
        console.error(`Upload attempt ${attempt} failed:`, error);
      }
      
      if (attempt === maxRetries) {
        if (__DEV__) {
          console.error('All upload attempts failed');
        }
        throw error;
      }
      
      // Wait before retry with exponential backoff
      const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000);
      if (__DEV__) {
        console.log(`Waiting ${waitTime}ms before retry...`);
      }
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
  if (__DEV__) {
    console.log(`Number of new photos to upload: ${fileUris.length}`);
  }
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
      if (__DEV__) {
        console.error(`Error uploading image:`, error);
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to upload image: ${errorMessage}`);
    }
  }
  
  return results;
};
