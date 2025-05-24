import { auth, db } from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
} from '@firebase/firestore';

// User profile interface
export interface UserProfile {
  uid: string;
  displayName?: string;
  birthdate?: string;
  gender?: string;
  interestedIn?: string[];
  photos?: string[];
  prompts?: PromptAnswer[];
  bio?: string;
  location?: GeoPoint;
  profileComplete: boolean;
  createdAt: any;
  updatedAt: any;
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
    console.error('Error creating user profile:', error);
    throw new Error('Failed to create user profile');
  }
};

/**
 * Gets a user profile from Firestore
 * @param uid User ID
 * @returns Promise with the user profile or null if not found
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userProfileRef = doc(db, 'profiles', uid);
    const userProfileSnap = await getDoc(userProfileRef);
    
    if (userProfileSnap.exists()) {
      return userProfileSnap.data() as UserProfile;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw new Error('Failed to get user profile');
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
  try {
    const userProfileRef = doc(db, 'profiles', uid);
    
    await updateDoc(userProfileRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
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
  
  // Define your required fields for a complete profile
  return !!(
    profile.displayName &&
    profile.birthdate &&
    profile.gender &&
    profile.interestedIn?.length &&
    (profile.photos?.length ?? 0) >= 3 && // At least 3 photos
    (profile.prompts?.length ?? 0) >= 2 // At least 2 prompts answered
  );
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
    console.error('Error updating profile completion status:', error);
    throw new Error('Failed to update profile completion status');
  }
};
