import * as Location from 'expo-location';
import CryptoJS from 'crypto-js';

// Location security configuration
const LOCATION_CONFIG = {
  // Precision levels (in meters)
  HIGH_PRECISION: 10,     // Exact location
  MEDIUM_PRECISION: 100,  // Neighborhood level
  LOW_PRECISION: 1000,    // City level
  
  // Default precision for dating app (neighborhood level for safety)
  DEFAULT_PRECISION: 100,
  
  // Maximum age of location data (5 minutes)
  MAX_LOCATION_AGE: 5 * 60 * 1000,
  
  // Encryption key should be stored securely in production
  ENCRYPTION_KEY: 'dating-app-location-key-2024', // In production, use a proper key management system
};

export interface SecureLocation {
  latitude: number;
  longitude: number;
  precision: number;
  timestamp: Date;
  encrypted?: boolean;
}

export interface ApproximateLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  city?: string;
  region?: string;
}

/**
 * Encrypt location data for storage
 */
export const encryptLocation = (location: { latitude: number; longitude: number }): string => {
  try {
    const locationString = JSON.stringify(location);
    const encrypted = CryptoJS.AES.encrypt(locationString, LOCATION_CONFIG.ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    if (__DEV__) {
      console.error('Error encrypting location:', error);
    }
    throw new Error('Failed to encrypt location data');
  }
};

/**
 * Decrypt location data from storage
 */
export const decryptLocation = (encryptedLocation: string): { latitude: number; longitude: number } => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedLocation, LOCATION_CONFIG.ENCRYPTION_KEY);
    const locationString = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!locationString) {
      throw new Error('Failed to decrypt location data');
    }
    
    return JSON.parse(locationString);
  } catch (error) {
    if (__DEV__) {
      console.error('Error decrypting location:', error);
    }
    throw new Error('Failed to decrypt location data');
  }
};

/**
 * Reduce location precision for privacy
 */
export const approximateLocation = (
  location: { latitude: number; longitude: number },
  precision: number = LOCATION_CONFIG.DEFAULT_PRECISION
): ApproximateLocation => {
  // Convert precision from meters to degrees (rough approximation)
  // 1 degree ≈ 111,000 meters at equator
  const precisionInDegrees = precision / 111000;
  
  // Round coordinates to reduce precision
  const factor = 1 / precisionInDegrees;
  const approximateLat = Math.round(location.latitude * factor) / factor;
  const approximateLng = Math.round(location.longitude * factor) / factor;
  
  return {
    latitude: approximateLat,
    longitude: approximateLng,
    accuracy: precision,
  };
};

/**
 * Request location permissions safely
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    // First check if location services are enabled
    const serviceEnabled = await Location.hasServicesEnabledAsync();
    if (!serviceEnabled) {
      if (__DEV__) {
        console.log('Location services are not enabled');
      }
      return false;
    }

    // Check current permission status
    let { status } = await Location.getForegroundPermissionsAsync();
    
    if (status === 'granted') {
      return true;
    }

    if (status === 'denied') {
      // If permission was denied, we can't request again
      if (__DEV__) {
        console.log('Location permission was previously denied');
      }
      return false;
    }

    // Request permission
    const permissionResult = await Location.requestForegroundPermissionsAsync();
    
    if (permissionResult.status === 'granted') {
      if (__DEV__) {
        console.log('Location permission granted');
      }
      return true;
    }

    if (__DEV__) {
      console.log('Location permission denied');
    }
    return false;
  } catch (error) {
    if (__DEV__) {
      console.error('Error requesting location permission:', error);
    }
    return false;
  }
};

/**
 * Get current location with privacy controls
 */
export const getCurrentLocation = async (
  precision: number = LOCATION_CONFIG.DEFAULT_PRECISION
): Promise<SecureLocation | null> => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      throw new Error('Location permission not granted');
    }

    // Get location with appropriate accuracy
    const locationResult = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced, // Good balance of accuracy and battery usage
      timeInterval: 5000, // Cache for 5 seconds
      distanceInterval: 10, // Update if moved 10 meters
    });

    if (!locationResult || !locationResult.coords) {
      throw new Error('Failed to get location coordinates');
    }

    const { latitude, longitude } = locationResult.coords;
    
    // Validate coordinates
    if (!isValidCoordinate(latitude, longitude)) {
      throw new Error('Invalid coordinates received');
    }

    // Apply precision reduction
    const approximated = approximateLocation({ latitude, longitude }, precision);

    return {
      latitude: approximated.latitude,
      longitude: approximated.longitude,
      precision,
      timestamp: new Date(),
      encrypted: false,
    };
  } catch (error) {
    if (__DEV__) {
      console.error('Error getting current location:', error);
    }
    return null;
  }
};

/**
 * Validate coordinate values
 */
const isValidCoordinate = (latitude: number, longitude: number): boolean => {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !isNaN(latitude) &&
    !isNaN(longitude)
  );
};

/**
 * Calculate distance between two points (in kilometers)
 */
export const calculateDistance = (
  point1: { latitude: number; longitude: number },
  point2: { latitude: number; longitude: number }
): number => {
  const R = 6371; // Earth's radius in kilometers
  
  const dLat = toRadians(point2.latitude - point1.latitude);
  const dLon = toRadians(point2.longitude - point1.longitude);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.latitude)) * Math.cos(toRadians(point2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
};

/**
 * Convert degrees to radians
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Get location with appropriate privacy level for sharing
 */
export const getShareableLocation = async (): Promise<ApproximateLocation | null> => {
  try {
    const location = await getCurrentLocation(LOCATION_CONFIG.LOW_PRECISION);
    
    if (!location) {
      return null;
    }

    return {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.precision,
    };
  } catch (error) {
    if (__DEV__) {
      console.error('Error getting shareable location:', error);
    }
    return null;
  }
};

/**
 * Check if location data is still fresh
 */
export const isLocationFresh = (location: SecureLocation): boolean => {
  const now = new Date().getTime();
  const locationTime = location.timestamp.getTime();
  return (now - locationTime) < LOCATION_CONFIG.MAX_LOCATION_AGE;
};

export { LOCATION_CONFIG };