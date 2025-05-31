import { useState, useCallback, useEffect } from 'react';
import { UserProfile } from '../services/profileService';
import { validateProfile, ProfileValidationResult } from '../utils/validators/profileValidators';
import { auth, db } from '../services/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Custom hook for managing profile form state and operations
 */
export function useProfileForm(initialProfile?: Partial<UserProfile>) {
  const [formData, setFormData] = useState<Partial<UserProfile>>(initialProfile || {});
  const [validation, setValidation] = useState<ProfileValidationResult>({ 
    isValid: false, 
    errors: {} 
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update validation whenever form data changes
  useEffect(() => {
    const result = validateProfile(formData);
    setValidation(result);
  }, [formData]);

  // Fetch user profile if not provided
  const fetchProfile = useCallback(async () => {
    if (!auth.currentUser) return null;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const userProfileRef = doc(db, 'profiles', auth.currentUser.uid);
      const userProfileSnap = await getDoc(userProfileRef);
      
      if (userProfileSnap.exists()) {
        const profileData = userProfileSnap.data() as UserProfile;
        setFormData(profileData);
        return profileData;
      }
      
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error fetching profile';
      console.error('Error fetching profile:', err);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle form field changes
  const handleChange = useCallback((field: keyof UserProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Save profile changes
  const saveProfile = useCallback(async () => {
    if (!auth.currentUser) {
      setError('You must be logged in to save profile changes');
      return false;
    }
    
    // Validate form before saving
    const validationResult = validateProfile(formData);
    if (!validationResult.isValid) {
      setValidation(validationResult);
      return false;
    }
    
    try {
      setIsSaving(true);
      setError(null);
      
      const userId = auth.currentUser.uid;
      const userProfileRef = doc(db, 'profiles', userId);
      
      // For backward compatibility, we'll set both field conventions
      const profileData: Partial<UserProfile> = {
        ...formData,
        // Ensure both naming conventions are updated
        name: formData.displayName || formData.name,
        displayName: formData.displayName || formData.name,
        age: formData.birthdate || formData.age,
        birthdate: formData.birthdate || formData.age,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(userProfileRef, profileData);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error saving profile';
      console.error('Error saving profile:', err);
      setError(errorMessage);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [formData]);

  return {
    formData,
    validation,
    isLoading,
    isSaving,
    error,
    fetchProfile,
    handleChange,
    saveProfile,
    setFormData
  };
}
