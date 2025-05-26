import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User } from '@firebase/auth';
import { auth, db } from '../services/firebase';
import { 
  getUserProfile, 
  createUserProfile, 
  updateUserProfile,
  isProfileComplete, 
  updateProfileCompletionStatus,
  UserProfile 
} from '../services/profileService';
import { initializeTestChat, isTestUser } from '../services/chatService';
import { isFeatureEnabled } from '../services/testChatInitializer';
import { doc, onSnapshot } from '@firebase/firestore';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  isLoading: boolean;
  error: string | null;
  refreshProfileStatus?: () => Promise<boolean>;
}

const initialState: AuthContextType = {
  user: null,
  profile: null,
  isAuthenticated: false,
  isProfileComplete: false,
  isLoading: true,
  error: null,
};

const AuthContext = createContext<AuthContextType>(initialState);

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthContextType>(initialState);

  // Function to refresh profile status - can be called when we know profile data changed
  // This function avoids updating state unnecessarily to prevent infinite loops
  const refreshProfileStatus = useCallback(async (userId: string) => {
    try {
      console.log('Refreshing profile status for user:', userId);
      const userProfile = await getUserProfile(userId);
      if (!userProfile) {
        console.log('No user profile found for:', userId);
        return false;
      }

      // Calculate whether the profile is actually complete based on required fields
      const actuallyComplete = isProfileComplete(userProfile);
      console.log(`Profile status check - Stored: ${userProfile.profileComplete}, Actual: ${actuallyComplete}`);
      
      // If there's a mismatch, update the status in Firestore, but only if necessary
      if (userProfile.profileComplete !== actuallyComplete) {
        console.log('Profile completion mismatch detected. Updating status in Firestore...');
        await updateUserProfile(userId, { profileComplete: actuallyComplete });
        
        // Only update the local state if we need to correct a mismatch
        // to prevent unnecessary re-renders
        setState(prevState => {
          // Only update if the value would actually change
          if (prevState.isProfileComplete !== actuallyComplete) {
            return {
              ...prevState,
              profile: { ...userProfile, profileComplete: actuallyComplete },
              isProfileComplete: actuallyComplete,
            };
          }
          return prevState; // No change needed
        });
      }
      
      return actuallyComplete;
    } catch (error) {
      console.error('Error refreshing profile status:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;
    
    // Firebase auth state listener
    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // User is signed in
          console.log('User is signed in:', user.uid);
          setState(prevState => ({ ...prevState, isLoading: true }));
          
          // Initialize test chat if the user is a test user and feature is enabled
          if (isTestUser() && isFeatureEnabled('testChat')) {
            console.log('Initializing test chat for test user:', user.uid);
            initializeTestChat()
              .then(chatId => {
                if (chatId) {
                  console.log('Test chat initialized with ID:', chatId);
                }
              })
              .catch(error => {
                console.error('Error initializing test chat:', error);
              });
          }
          
          // Get user profile from Firestore
          let userProfile = await getUserProfile(user.uid);
          
          // If profile doesn't exist, create one
          if (!userProfile) {
            userProfile = await createUserProfile(user.uid);
          }
          
          // Check if profile is complete - use the calculated value, not just the stored flag
          const profileComplete = isProfileComplete(userProfile);
          
          setState({
            user,
            profile: userProfile,
            isAuthenticated: true,
            isProfileComplete: profileComplete,
            isLoading: false,
            error: null,
          });
          
          // Set up a real-time listener for profile changes
          profileUnsubscribe = onSnapshot(
            doc(db, 'profiles', user.uid),
            async (docSnapshot) => {
              if (docSnapshot.exists()) {
                const updatedProfile = docSnapshot.data() as UserProfile;
                const updatedComplete = isProfileComplete(updatedProfile);
                
                console.log(`Profile updated. Complete status: ${updatedComplete}`);
                
                setState(prevState => ({
                  ...prevState,
                  profile: updatedProfile,
                  isProfileComplete: updatedComplete,
                }));
              }
            },
            (error) => {
              console.error('Error in profile snapshot listener:', error);
            }
          );
          
        } else {
          // User is signed out
          console.log('User is signed out');
          setState({
            user: null,
            profile: null,
            isAuthenticated: false,
            isProfileComplete: false,
            isLoading: false,
            error: null,
          });
          
          // Clean up profile listener if it exists
          if (profileUnsubscribe) {
            profileUnsubscribe();
            profileUnsubscribe = null;
          }
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setState(prevState => ({
          ...prevState,
          isLoading: false,
          error: error instanceof Error ? error.message : 'An unknown error occurred',
        }));
      }
    });

    // Cleanup subscriptions on unmount
    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, [refreshProfileStatus]);
  
  // Expose the refresh function through context
  const contextValue = {
    ...state,
    // Safely handle null user case
    refreshProfileStatus: () => {
      if (state.user) {
        return refreshProfileStatus(state.user.uid);
      }
      return Promise.resolve(false);
    },
  } as AuthContextType;

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
