import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { DatingPreferences, DEFAULT_PREFERENCES } from '../types/preferences';

interface UsePreferencesReturn {
  preferences: DatingPreferences | null;
  loading: boolean;
  error: string | null;
  hasUnsavedChanges: boolean;
  updatePreferences: (updates: Partial<DatingPreferences>) => void;
  savePreferences: () => Promise<void>;
  resetPreferences: () => void;
}

export const usePreferences = (): UsePreferencesReturn => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<DatingPreferences | null>(null);
  const [originalPreferences, setOriginalPreferences] = useState<DatingPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load preferences from Firebase
  const loadPreferences = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      setError(null);

      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        const profileData = profileSnap.data();
        const userPreferences = profileData.preferences || DEFAULT_PREFERENCES;
        
        setPreferences(userPreferences);
        setOriginalPreferences(JSON.parse(JSON.stringify(userPreferences)));
      } else {
        // If no profile exists, use default preferences
        setPreferences(DEFAULT_PREFERENCES);
        setOriginalPreferences(JSON.parse(JSON.stringify(DEFAULT_PREFERENCES)));
      }
    } catch (err) {
      console.error('Error loading preferences:', err);
      setError('Failed to load preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = preferences !== null && originalPreferences !== null && 
    JSON.stringify(preferences) !== JSON.stringify(originalPreferences);

  // Update preferences in state
  const updatePreferences = useCallback((updates: Partial<DatingPreferences>) => {
    setPreferences(current => {
      if (!current) return current;
      return { ...current, ...updates };
    });
  }, []);

  // Save preferences to Firebase
  const savePreferences = useCallback(async () => {
    if (!user?.uid || !preferences || saving) return;

    try {
      setSaving(true);
      setError(null);

      // Validate preferences before saving
      const validationError = validatePreferences(preferences);
      if (validationError) {
        throw new Error(validationError);
      }

      const profileRef = doc(db, 'profiles', user.uid);
      await updateDoc(profileRef, {
        preferences,
        updatedAt: new Date(),
      });

      // Update the original preferences to reflect saved state
      setOriginalPreferences(JSON.parse(JSON.stringify(preferences)));
    } catch (err) {
      console.error('Error saving preferences:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save preferences';
      setError(errorMessage);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [user?.uid, preferences, saving]);

  // Reset preferences to original state
  const resetPreferences = useCallback(() => {
    if (originalPreferences) {
      setPreferences(JSON.parse(JSON.stringify(originalPreferences)));
    }
  }, [originalPreferences]);

  return {
    preferences,
    loading,
    error,
    hasUnsavedChanges,
    updatePreferences,
    savePreferences,
    resetPreferences,
  };
};

// Validation function for preferences
function validatePreferences(preferences: DatingPreferences): string | null {
  // Age range validation
  if (preferences.ageRange.min >= preferences.ageRange.max) {
    return 'Minimum age must be less than maximum age';
  }

  if (preferences.ageRange.min < 18) {
    return 'Minimum age must be at least 18';
  }

  if (preferences.ageRange.max > 100) {
    return 'Maximum age cannot exceed 100';
  }

  // Distance validation
  if (preferences.maxDistance.value <= 0) {
    return 'Maximum distance must be greater than 0';
  }

  if (preferences.maxDistance.value > 500) {
    return 'Maximum distance cannot exceed 500 miles';
  }

  // Height validation
  if (preferences.height.min && preferences.height.max && 
      preferences.height.min >= preferences.height.max) {
    return 'Minimum height must be less than maximum height';
  }

  // Interested in validation
  if (!preferences.interestedIn.value.length) {
    return 'You must select at least one gender preference';
  }

  return null;
}