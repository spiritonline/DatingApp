import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

// Configuration for secure storage
const STORAGE_CONFIG = {
  // Use a deterministic but secure key derivation
  ENCRYPTION_KEY: 'DatingApp_SecureStorage_2024',
  KEY_PREFIX: 'secure_',
  SENSITIVE_KEYS: [
    'sessionExpiry',
    'lastActivity', 
    'userToken',
    'refreshToken',
    'credentials',
    'authData',
    'encryptedLocation',
    'preferences',
    'profileData'
  ]
};

/**
 * Encrypts data using AES encryption
 * @param data - The data to encrypt (will be JSON stringified)
 * @param key - The encryption key
 * @returns Encrypted string
 */
const encryptData = (data: any, key: string): string => {
  try {
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonString, key).toString();
    return encrypted;
  } catch (error) {
    if (__DEV__) {
      console.error('Error encrypting data:', error);
    }
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypts data using AES decryption
 * @param encryptedData - The encrypted string
 * @param key - The decryption key
 * @returns Decrypted and parsed data
 */
const decryptData = (encryptedData: string, key: string): any => {
  try {
    const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, key);
    const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedString) {
      throw new Error('Failed to decrypt data - invalid key or corrupted data');
    }
    
    return JSON.parse(decryptedString);
  } catch (error) {
    if (__DEV__) {
      console.error('Error decrypting data:', error);
    }
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Determines if a key should be encrypted based on configuration
 * @param key - The storage key
 * @returns Boolean indicating if the key should be encrypted
 */
const shouldEncryptKey = (key: string): boolean => {
  return STORAGE_CONFIG.SENSITIVE_KEYS.some(sensitiveKey => 
    key.includes(sensitiveKey) || key.startsWith(sensitiveKey)
  );
};

/**
 * Secure AsyncStorage wrapper that automatically encrypts sensitive data
 */
export class SecureStorage {
  /**
   * Stores an item securely in AsyncStorage
   * @param key - The storage key
   * @param value - The value to store
   * @param forceEncrypt - Force encryption even for non-sensitive keys
   */
  static async setItem(key: string, value: string, forceEncrypt: boolean = false): Promise<void> {
    try {
      const shouldEncrypt = forceEncrypt || shouldEncryptKey(key);
      
      if (shouldEncrypt) {
        const encryptedValue = encryptData(value, STORAGE_CONFIG.ENCRYPTION_KEY);
        const secureKey = STORAGE_CONFIG.KEY_PREFIX + key;
        await AsyncStorage.setItem(secureKey, encryptedValue);
        
        if (__DEV__) {
          console.log(`Secure storage: Encrypted and stored key: ${key}`);
        }
      } else {
        await AsyncStorage.setItem(key, value);
        
        if (__DEV__) {
          console.log(`Secure storage: Stored key (unencrypted): ${key}`);
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.error('SecureStorage setItem error:', error);
      }
      throw new Error('Failed to store item securely');
    }
  }

  /**
   * Retrieves an item securely from AsyncStorage
   * @param key - The storage key
   * @param forceDecrypt - Force decryption even for non-sensitive keys
   * @returns The retrieved value or null if not found
   */
  static async getItem(key: string, forceDecrypt: boolean = false): Promise<string | null> {
    try {
      const shouldDecrypt = forceDecrypt || shouldEncryptKey(key);
      
      if (shouldDecrypt) {
        const secureKey = STORAGE_CONFIG.KEY_PREFIX + key;
        const encryptedValue = await AsyncStorage.getItem(secureKey);
        
        if (encryptedValue === null) {
          // Try fallback to unencrypted version for migration
          const fallbackValue = await AsyncStorage.getItem(key);
          if (fallbackValue !== null) {
            if (__DEV__) {
              console.log(`Secure storage: Found unencrypted fallback for key: ${key}`);
            }
            // Migrate to encrypted storage
            await this.setItem(key, fallbackValue);
            await AsyncStorage.removeItem(key); // Remove unencrypted version
            return fallbackValue;
          }
          return null;
        }
        
        const decryptedValue = decryptData(encryptedValue, STORAGE_CONFIG.ENCRYPTION_KEY);
        
        if (__DEV__) {
          console.log(`Secure storage: Decrypted and retrieved key: ${key}`);
        }
        
        return decryptedValue;
      } else {
        const value = await AsyncStorage.getItem(key);
        
        if (__DEV__) {
          console.log(`Secure storage: Retrieved key (unencrypted): ${key}`);
        }
        
        return value;
      }
    } catch (error) {
      if (__DEV__) {
        console.error('SecureStorage getItem error:', error);
      }
      // Return null instead of throwing to prevent app crashes
      return null;
    }
  }

  /**
   * Removes an item from AsyncStorage (both encrypted and unencrypted versions)
   * @param key - The storage key
   */
  static async removeItem(key: string): Promise<void> {
    try {
      const shouldCheck = shouldEncryptKey(key);
      
      if (shouldCheck) {
        const secureKey = STORAGE_CONFIG.KEY_PREFIX + key;
        // Remove both encrypted and unencrypted versions
        await AsyncStorage.multiRemove([secureKey, key]);
        
        if (__DEV__) {
          console.log(`Secure storage: Removed key (encrypted): ${key}`);
        }
      } else {
        await AsyncStorage.removeItem(key);
        
        if (__DEV__) {
          console.log(`Secure storage: Removed key (unencrypted): ${key}`);
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.error('SecureStorage removeItem error:', error);
      }
      throw new Error('Failed to remove item securely');
    }
  }

  /**
   * Stores multiple items securely
   * @param pairs - Array of [key, value] pairs
   */
  static async multiSet(pairs: [string, string][]): Promise<void> {
    try {
      const operations = pairs.map(async ([key, value]) => {
        await this.setItem(key, value);
      });
      
      await Promise.all(operations);
    } catch (error) {
      if (__DEV__) {
        console.error('SecureStorage multiSet error:', error);
      }
      throw new Error('Failed to store multiple items securely');
    }
  }

  /**
   * Retrieves multiple items securely
   * @param keys - Array of storage keys
   * @returns Array of [key, value] pairs
   */
  static async multiGet(keys: string[]): Promise<[string, string | null][]> {
    try {
      const operations = keys.map(async (key): Promise<[string, string | null]> => {
        const value = await this.getItem(key);
        return [key, value];
      });
      
      return await Promise.all(operations);
    } catch (error) {
      if (__DEV__) {
        console.error('SecureStorage multiGet error:', error);
      }
      throw new Error('Failed to retrieve multiple items securely');
    }
  }

  /**
   * Removes multiple items securely
   * @param keys - Array of storage keys
   */
  static async multiRemove(keys: string[]): Promise<void> {
    try {
      const operations = keys.map(async (key) => {
        await this.removeItem(key);
      });
      
      await Promise.all(operations);
    } catch (error) {
      if (__DEV__) {
        console.error('SecureStorage multiRemove error:', error);
      }
      throw new Error('Failed to remove multiple items securely');
    }
  }

  /**
   * Clears all secure storage (both encrypted and unencrypted)
   */
  static async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
      
      if (__DEV__) {
        console.log('Secure storage: Cleared all storage');
      }
    } catch (error) {
      if (__DEV__) {
        console.error('SecureStorage clear error:', error);
      }
      throw new Error('Failed to clear secure storage');
    }
  }

  /**
   * Gets all keys from storage (both encrypted and unencrypted)
   */
  static async getAllKeys(): Promise<string[]> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      
      // Filter out internal secure storage keys and return original key names
      const userKeys = allKeys
        .filter(key => !key.startsWith(STORAGE_CONFIG.KEY_PREFIX))
        .concat(
          allKeys
            .filter(key => key.startsWith(STORAGE_CONFIG.KEY_PREFIX))
            .map(key => key.replace(STORAGE_CONFIG.KEY_PREFIX, ''))
        );
      
      return [...new Set(userKeys)]; // Remove duplicates
    } catch (error) {
      if (__DEV__) {
        console.error('SecureStorage getAllKeys error:', error);
      }
      throw new Error('Failed to get all keys from secure storage');
    }
  }

  /**
   * Migrates existing unencrypted sensitive data to encrypted storage
   */
  static async migrateSensitiveData(): Promise<void> {
    try {
      if (__DEV__) {
        console.log('Starting migration of sensitive data to encrypted storage...');
      }

      const allKeys = await AsyncStorage.getAllKeys();
      let migratedCount = 0;

      for (const key of allKeys) {
        if (shouldEncryptKey(key) && !key.startsWith(STORAGE_CONFIG.KEY_PREFIX)) {
          const value = await AsyncStorage.getItem(key);
          if (value !== null) {
            // Store encrypted version
            await this.setItem(key, value);
            // Remove unencrypted version
            await AsyncStorage.removeItem(key);
            migratedCount++;
            
            if (__DEV__) {
              console.log(`Migrated sensitive key to encrypted storage: ${key}`);
            }
          }
        }
      }

      if (__DEV__) {
        console.log(`Migration completed. Migrated ${migratedCount} sensitive items.`);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('SecureStorage migration error:', error);
      }
      throw new Error('Failed to migrate sensitive data');
    }
  }
}

// Export default instance for convenience
export default SecureStorage;