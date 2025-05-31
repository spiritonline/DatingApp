import { auth, db } from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
} from '@firebase/firestore';
import { profileCache } from './cache/profileCache';
import { offlineStorage } from './cache/offlineStorage';
import { handleServiceError, logError, createValidationError, retryOperation } from '../utils/errorHandler';
import { enforceRateLimit, RateLimitConfigs } from '../utils/rateLimiter';

// User profile interface
export interface UserProfile {
  uid: string;
  
  // Support for both naming conventions
  displayName?: string;
  name?: string; // Legacy field name
  
  birthdate?: string;
  age?: number | string; // Legacy field name
  
  gender?: string;
  interestedIn?: string[];
  photos?: string[];
  prompts?: PromptAnswer[];
  bio?: string;
  location?: GeoPoint;
  profileComplete: boolean;
  locationConsent?: boolean;
  visible?: boolean;
  mutualFriendsCount?: number;
  createdAt: any;
  updatedAt: any;
  
  // Allow for dynamic field access for backward compatibility
  [key: string]: any;
}

export interface PromptAnswer {
  id: string;
  promptId: string;
  promptText: string;
  answer: string;
  voiceNoteUrl?: string;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/**
 * Creates a new user profile document in Firestore
 * @param uid User ID
 * @returns Promise with the created profile
 */
export const createUserProfile = async (uid: string): Promise<UserProfile> => {
  try {
    const userProfileRef = doc(db, 'profiles', uid);
    
    // Initial profile data
    const profileData: UserProfile = {
      uid,
      profileComplete: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(userProfileRef, profileData);
    return profileData;
  } catch (error) {
    if (__DEV__) {
      console.error('Error creating user profile:', error);
    }
    throw new Error('Failed to create user profile');
  }
};

/**
 * Gets a user profile from Firestore
 * @param uid User ID
 * @returns Promise with the user profile or null if not found
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  if (!uid) {
    throw createValidationError('uid', 'User ID is required');
  }
  
  try {
    // Check cache first
    const cached = await profileCache.get(uid);
    if (cached) {
      return cached;
    }
    
    // Check offline storage if not in memory cache
    const offlineCached = await offlineStorage.getCachedData<UserProfile>(
      `profile:${uid}`,
      24 * 60 * 60 * 1000 // 24 hours max age for offline profiles
    );
    
    if (offlineCached) {
      // Update memory cache with offline data
      await profileCache.set(uid, offlineCached, false);
      return offlineCached;
    }
    
    // Fetch from Firestore with retry
    const userProfileRef = doc(db, 'profiles', uid);
    const userProfileSnap = await retryOperation(
      () => getDoc(userProfileRef),
      { maxAttempts: 2 }
    );
    
    if (userProfileSnap.exists()) {
      const profile = userProfileSnap.data() as UserProfile;
      
      // Update caches
      await profileCache.set(uid, profile);
      await offlineStorage.cacheData(`profile:${uid}`, profile);
      
      return profile;
    }
    
    return null;
  } catch (error) {
    const appError = handleServiceError(error);
    logError(appError, { operation: 'getUserProfile', uid });
    
    // Try offline storage as last resort on error
    const fallback = await offlineStorage.getCachedData<UserProfile>(`profile:${uid}`);
    if (fallback) {
      return fallback;
    }
    
    throw appError;
  }
};

/**
 * Updates a user profile in Firestore
 * @param uid User ID
 * @param data Partial user profile data to update
 * @returns Promise
 */
export const updateUserProfile = async (
  uid: string, 
  data: Partial<UserProfile>
): Promise<void> => {
  // Enforce rate limiting for profile updates
  enforceRateLimit(RateLimitConfigs.PROFILE_UPDATE(uid));
  
  try {
    const userProfileRef = doc(db, 'profiles', uid);
    
    await updateDoc(userProfileRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    if (__DEV__) {
      console.error('Error updating user profile:', error);
    }
    throw new Error('Failed to update user profile');
  }
};

/**
 * Checks if a user profile is complete
 * @param profile User profile
 * @returns Boolean indicating if profile is complete
 */
export const isProfileComplete = (profile: UserProfile | null): boolean => {
  if (!profile) return false;
  
  if (__DEV__) {
    console.log('Checking profile completion with data:', JSON.stringify(profile, null, 2));
  }
  
  // Support both old and new field names for backward compatibility
  const hasName = profile.displayName || profile.name;
  const hasAge = profile.birthdate || profile.age;
  
  // For the initial implementation, just check basic info
  // This can be expanded later to include more criteria as the app evolves
  const isBasicInfoComplete = !!(
    hasName &&
    hasAge &&
    profile.gender 
  );
  
  // Always check if the flag is explicitly set to true
  const isFlagSet = profile.profileComplete === true;
  
  if (__DEV__) {
    console.log(`Profile completion check - Basic info: ${isBasicInfoComplete}, Flag set: ${isFlagSet}`);
  }
  
  // Either the basic info is complete or the flag is explicitly set
  return isBasicInfoComplete || isFlagSet;
};

/**
 * Updates the profile completion status based on required fields
 * @param uid User ID
 * @returns Promise with the updated completion status
 */
export const updateProfileCompletionStatus = async (uid: string): Promise<boolean> => {
  try {
    const profile = await getUserProfile(uid);
    const isComplete = isProfileComplete(profile);
    
    // Only update if profile exists and status is different
    if (profile && profile.profileComplete !== isComplete) {
      await updateUserProfile(uid, { profileComplete: isComplete });
    }
    
    return isComplete;
  } catch (error) {
    if (__DEV__) {
      console.error('Error updating profile completion status:', error);
    }
    throw new Error('Failed to update profile completion status');
  }
};
