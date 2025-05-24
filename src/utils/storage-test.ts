import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { ref, uploadBytes, getDownloadURL } from '@firebase/storage';
import { storage } from '../services/firebase';

/**
 * Test function to upload a single file to Firebase Storage
 * This helps isolate and verify the upload functionality
 */
export const testFirebaseUpload = async (fileUri: string, userId: string): Promise<string> => {
  try {
    console.log('Starting test upload for file:', fileUri);
    
    const fileName = fileUri.split('/').pop() || `test-${Date.now()}.jpg`;
    const mimeType = 'image/jpeg';
    const storagePath = `test-uploads/${userId}/${fileName}`;
    
    console.log(`Creating storage reference at path: ${storagePath}`);
    const storageRef = ref(storage, storagePath);
    
    if (Platform.OS === 'ios') {
      console.log('iOS upload: Reading file as base64');
      
      // Create a temporary file from the original
      const tempFilePath = FileSystem.documentDirectory + fileName;
      
      // Read original as base64
      const base64Data = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Write to temp file
      await FileSystem.writeAsStringAsync(tempFilePath, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      console.log(`iOS: Created temp file at ${tempFilePath}`);
      
      // Check file exists
      const fileInfo = await FileSystem.getInfoAsync(tempFilePath, { size: true });
      if (!fileInfo.exists) {
        throw new Error('Temp file creation failed');
      }
      
      // Use fetch API with the temp file
      const response = await fetch(tempFilePath);
      const blob = await response.blob();
      
      console.log(`iOS: Created blob from temp file - Size: ${blob.size}`);
      
      // Upload to Firebase
      await uploadBytes(storageRef, blob, {
        contentType: mimeType,
        customMetadata: {
          'filename': fileName,
          'platform': 'ios',
          'test': 'true'
        }
      });
      
      // Clean up temp file
      await FileSystem.deleteAsync(tempFilePath);
    } else {
      // Android approach is simpler
      console.log('Android upload: Using fetch API directly');
      const response = await fetch(fileUri);
      const blob = await response.blob();
      
      await uploadBytes(storageRef, blob, {
        contentType: 'image/jpeg',
        customMetadata: {
          'filename': fileName,
          'platform': 'android',
          'test': 'true'
        }
      });
    }
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    console.log('Test upload successful:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Test upload failed:', error);
    throw error;
  }
};

/**
 * Add a simple function to test Firebase Storage permissions
 */
export const checkStoragePermissions = async (userId: string): Promise<boolean> => {
  try {
    // Create a small text file to test permissions
    const testRef = ref(storage, `test-permissions/${userId}/test.txt`);
    const testBlob = new Blob(['test'], { type: 'text/plain' });
    
    await uploadBytes(testRef, testBlob);
    console.log('Storage permissions test passed');
    return true;
  } catch (error) {
    console.error('Storage permissions test failed:', error);
    return false;
  }
};
