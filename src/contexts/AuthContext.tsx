import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User, signOut } from '@firebase/auth';
import { auth, db } from '../services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecureStorage } from '../utils/secureStorage';
import { 
  getUserProfile, 
  createUserProfile, 
  updateUserProfile,
  isProfileComplete, 
  updateProfileCompletionStatus,
  UserProfile 
} from '../services/profileService';
import { initializeJakeChat } from '../services/chatService';
import { doc, onSnapshot } from '@firebase/firestore';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  isLoading: boolean;
  error: string | null;
  refreshProfileStatus?: () => Promise<boolean>;
  forceSignOut?: () => Promise<void>;
  sessionExpiresAt?: Date | null;
}

const initialState: AuthContextType = {
  user: null,
  profile: null,
  isAuthenticated: false,
  isProfileComplete: false,
  isLoading: true,
  error: null,
  sessionExpiresAt: null,
};

const AuthContext = createContext<AuthContextType>(initialState);

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthContextType>(initialState);

  // Session management constants
  const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

  // Force sign out function
  const forceSignOut = useCallback(async () => {
    try {
      await SecureStorage.multiRemove(['sessionExpiry', 'lastActivity']);
      await signOut(auth);
      if (__DEV__) {
        console.log('User forcibly signed out');
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error during force sign out:', error);
      }
    }
  }, []);

  // Update last activity timestamp
  const updateLastActivity = useCallback(async () => {
    try {
      const now = new Date().getTime().toString();
      await SecureStorage.setItem('lastActivity', now);
    } catch (error) {
      if (__DEV__) {
        console.error('Error updating last activity:', error);
      }
    }
  }, []);

  // Check session validity
  const checkSessionValidity = useCallback(async () => {
    try {
      const [sessionExpiry, lastActivity] = await SecureStorage.multiGet(['sessionExpiry', 'lastActivity']);
      const now = new Date().getTime();

      if (sessionExpiry[1]) {
        const expiryTime = parseInt(sessionExpiry[1]);
        if (now > expiryTime) {
          if (__DEV__) {
            console.log('Session expired, signing out user');
          }
          await forceSignOut();
          return false;
        }
      }

      if (lastActivity[1]) {
        const lastActiveTime = parseInt(lastActivity[1]);
        if (now - lastActiveTime > SESSION_TIMEOUT) {
          if (__DEV__) {
            console.log('Session inactive timeout, signing out user');
          }
          await forceSignOut();
          return false;
        }
      }

      return true;
    } catch (error) {
      if (__DEV__) {
        console.error('Error checking session validity:', error);
      }
      return false;
    }
  }, [forceSignOut]);

  // Initialize session
  const initializeSession = useCallback(async () => {
    try {
      const now = new Date().getTime();
      const sessionExpiry = (now + SESSION_TIMEOUT).toString();
      await SecureStorage.multiSet([
        ['sessionExpiry', sessionExpiry],
        ['lastActivity', now.toString()]
      ]);
      
      setState(prevState => ({
        ...prevState,
        sessionExpiresAt: new Date(parseInt(sessionExpiry))
      }));
    } catch (error) {
      if (__DEV__) {
        console.error('Error initializing session:', error);
      }
    }
  }, []);

  // Session monitoring effect
  useEffect(() => {
    let sessionInterval: NodeJS.Timeout;

    if (state.isAuthenticated) {
      // Check session validity immediately
      checkSessionValidity();
      
      // Set up interval to check session periodically
      sessionInterval = setInterval(checkSessionValidity, SESSION_CHECK_INTERVAL);
    }

    return () => {
      if (sessionInterval) {
        clearInterval(sessionInterval);
      }
    };
  }, [state.isAuthenticated, checkSessionValidity]);

  // Function to refresh profile status - can be called when we know profile data changed
  // This function avoids updating state unnecessarily to prevent infinite loops
  const refreshProfileStatus = useCallback(async (userId: string) => {
    try {
      if (__DEV__) {
        console.log('Refreshing profile status for user:', userId);
      }
      const userProfile = await getUserProfile(userId);
      if (!userProfile) {
        if (__DEV__) {
          console.log('No user profile found for:', userId);
        }
        return false;
      }

      // Calculate whether the profile is actually complete based on required fields
      const actuallyComplete = isProfileComplete(userProfile);
      if (__DEV__) {
        console.log(`Profile status check - Stored: ${userProfile.profileComplete}, Actual: ${actuallyComplete}`);
      }
      
      // If there's a mismatch, update the status in Firestore, but only if necessary
      if (userProfile.profileComplete !== actuallyComplete) {
        if (__DEV__) {
          console.log('Profile completion mismatch detected. Updating status in Firestore...');
        }
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
      if (__DEV__) {
        console.error('Error refreshing profile status:', error);
      }
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
          if (__DEV__) {
            console.log('User is signed in:', user.uid);
          }
          setState(prevState => ({ ...prevState, isLoading: true }));
          
          // Initialize test chat if the user is a test user and feature is enabled
          // Initialize Jake chat for all users
          if (__DEV__) {
            console.log('Ensuring Jake chat exists for user:', user.uid);
          }
          initializeJakeChat()
            .then(chatId => {
              if (chatId) {
                if (__DEV__) {
                  console.log('Jake chat ensured with ID:', chatId);
                }
              } else {
                if (__DEV__) {
                  console.log('No Jake chat needed (user might be Jake himself)');
                }
              }
            })
            .catch(error => {
              if (__DEV__) {
                console.error('Error ensuring Jake chat:', error);
              }
            });
          
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
            sessionExpiresAt: null, // Will be set by initializeSession
          });

          // Initialize session management
          await initializeSession();
          
          // Migrate any existing sensitive data to encrypted storage
          try {
            await SecureStorage.migrateSensitiveData();
          } catch (migrationError) {
            if (__DEV__) {
              console.warn('Non-critical error during storage migration:', migrationError);
            }
          }
          
          // Set up a real-time listener for profile changes
          profileUnsubscribe = onSnapshot(
            doc(db, 'profiles', user.uid),
            async (docSnapshot) => {
              if (docSnapshot.exists()) {
                const updatedProfile = docSnapshot.data() as UserProfile;
                const updatedComplete = isProfileComplete(updatedProfile);
                
                if (__DEV__) {
                  console.log(`Profile updated. Complete status: ${updatedComplete}`);
                }
                
                setState(prevState => ({
                  ...prevState,
                  profile: updatedProfile,
                  isProfileComplete: updatedComplete,
                }));
              }
            },
            (error) => {
              if (__DEV__) {
                console.error('Error in profile snapshot listener:', error);
              }
            }
          );
          
        } else {
          // User is signed out
          if (__DEV__) {
            console.log('User is signed out');
          }
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
        if (__DEV__) {
          console.error('Error in auth state change:', error);
        }
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
  }, [refreshProfileStatus, initializeSession]);
  
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
    forceSignOut,
  } as AuthContextType;

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
