import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from '@firebase/auth';
import { auth } from '../services/firebase';
import { 
  getUserProfile, 
  createUserProfile, 
  isProfileComplete, 
  UserProfile 
} from '../services/profileService';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isProfileComplete: boolean;
  isLoading: boolean;
  error: string | null;
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

  useEffect(() => {
    // Firebase auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // User is signed in
          console.log('User is signed in:', user.uid);
          
          // Get user profile from Firestore
          let userProfile = await getUserProfile(user.uid);
          
          // If profile doesn't exist, create one
          if (!userProfile) {
            userProfile = await createUserProfile(user.uid);
          }
          
          // Check if profile is complete
          const profileComplete = isProfileComplete(userProfile);
          
          setState({
            user,
            profile: userProfile,
            isAuthenticated: true,
            isProfileComplete: profileComplete,
            isLoading: false,
            error: null,
          });
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

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={state}>
      {children}
    </AuthContext.Provider>
  );
}
