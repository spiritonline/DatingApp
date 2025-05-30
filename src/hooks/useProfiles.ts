import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, query, limit, orderBy, where, getDocs, DocumentData, QueryDocumentSnapshot, startAfter } from '@firebase/firestore';
import { db, auth } from '../services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Profile {
  id: string;
  uid?: string; // Added uid field which might be different from id in some cases
  name: string;
  age: number;
  photos: string[];
  promptAnswers: {
    prompt: string;
    answer: string;
  }[];
  mutualFriendsCount: number;
}

// Number of profiles to fetch per page
const PAGE_SIZE = 5;
const VIEWED_PROFILES_KEY = '@viewedProfiles';

export function useProfiles() {
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [viewedProfileIds, setViewedProfileIds] = useState<Set<string>>(new Set());
  const isInitialLoad = useRef(true);

  // Function to transform Firestore data to our Profile interface
  const transformData = (doc: QueryDocumentSnapshot<DocumentData>): Profile => {
    const data = doc.data();
    return {
      id: doc.id,
      uid: data.uid || doc.id, // Extract uid explicitly if available
      name: data.name || data.displayName || 'Anonymous',
      age: data.age || calculateAge(data.birthdate) || 0,
      photos: data.photos || [],
      promptAnswers: (data.prompts || []).map((prompt: any) => ({
        prompt: prompt.promptText || '',
        answer: prompt.answer || '',
      })),
      mutualFriendsCount: data.mutualFriendsCount || 0,
    };
  };

  // Helper function to calculate age from birthdate
  const calculateAge = (birthdate: string | undefined) => {
    if (!birthdate) return 0;
    
    const birthdateObj = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birthdateObj.getFullYear();
    const monthDiff = today.getMonth() - birthdateObj.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdateObj.getDate())) {
      age--;
    }
    
    return age;
  };

  // Load viewed profiles from AsyncStorage on mount
  useEffect(() => {
    const loadViewedProfiles = async () => {
      try {
        const viewed = await AsyncStorage.getItem(VIEWED_PROFILES_KEY);
        if (viewed) {
          setViewedProfileIds(new Set(JSON.parse(viewed)));
        }
      } catch (error) {
        console.error('Error loading viewed profiles:', error);
      }
    };

    loadViewedProfiles();
  }, []);

  // Save viewed profiles to AsyncStorage when they change
  useEffect(() => {
    if (!isInitialLoad.current) {
      AsyncStorage.setItem(VIEWED_PROFILES_KEY, JSON.stringify(Array.from(viewedProfileIds)))
        .catch(error => console.error('Error saving viewed profiles:', error));
    } else {
      isInitialLoad.current = false;
    }
  }, [viewedProfileIds]);

  // The main query
  const { isLoading, isError, error, refetch } = useQuery({
    queryKey: ['profiles', lastDoc?.id, auth.currentUser?.uid],
    queryFn: async () => {
      if (!auth.currentUser?.uid) {
        throw new Error('User not authenticated');
      }

      console.log('Fetching profiles for user:', auth.currentUser.uid);
      
      try {
        // IMPORTANT FIX: Use basic query first, avoid potential field issues
        let profilesQuery;
        
        // Simplest possible query to get all profiles, we'll filter client-side
        if (lastDoc) {
          profilesQuery = query(
            collection(db, 'profiles'),
            limit(PAGE_SIZE),
            startAfter(lastDoc)
          );
        } else {
          profilesQuery = query(
            collection(db, 'profiles'),
            limit(PAGE_SIZE)
          );
        }
        
        console.log('Executing Firestore query...');
        const querySnapshot = await getDocs(profilesQuery);
        console.log(`Query returned ${querySnapshot.docs.length} profiles`);
        
        // Update the last document for pagination
        const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        setLastDoc(lastVisible);
        
        // Check if there are more results
        setHasMore(querySnapshot.docs.length === PAGE_SIZE);
        
        // Transform and filter profiles
        const newProfiles = querySnapshot.docs
          // Filter out docs without required data first
          .filter(doc => {
            const data = doc.data();
            return data && (data.photos?.length > 0 || data.name || data.displayName);
          })
          // Transform valid docs to Profile objects
          .map(transformData)
          // Filter out the current user's profile with comprehensive checks
          .filter(profile => {
            const currentUserId = auth.currentUser?.uid;
            const currentUserName = auth.currentUser?.displayName;
            
            if (!currentUserId) return true; // If no user is logged in, show all profiles
            
            // Debug logging - remove in production
            console.log(`Checking profile: id=${profile.id}, uid=${profile.uid}, name=${profile.name}`);
            console.log(`Current user: uid=${currentUserId}, displayName=${currentUserName}`);
            
            // If any of these match the current user, filter it out
            const isCurrentUser = 
              profile.id === currentUserId ||
              profile.uid === currentUserId ||
              (profile.name === currentUserName && currentUserName);
              
            if (isCurrentUser) {
              console.log('Found current user profile - excluding it');
            }
            
            return !isCurrentUser;
          })
          // Filter out already viewed profiles
          .filter(profile => !viewedProfileIds.has(profile.id));
        
        console.log(`After filtering viewed profiles: ${newProfiles.length} profiles remaining`);
        
        // Add new profiles to the viewed set
        if (newProfiles.length > 0) {
          setViewedProfileIds(prev => {
            const updated = new Set(prev);
            newProfiles.forEach(profile => updated.add(profile.id));
            return updated;
          });
          
          setProfiles((prevProfiles) => [...prevProfiles, ...newProfiles]);
          return newProfiles;
        } else if (querySnapshot.docs.length > 0) {
          // Fallback: If we have docs but no valid profiles after filtering,
          // try a more lenient approach
          console.log('No valid profiles after filtering, trying more lenient approach');
          const fallbackProfiles = querySnapshot.docs
            .filter(doc => {
              const data = doc.data();
              const currentUserId = auth.currentUser?.uid;
              const currentUserName = auth.currentUser?.displayName;
              
              // Comprehensive check for current user using multiple fields
              return doc.id !== currentUserId && 
                     data.uid !== currentUserId &&
                     data.name !== currentUserName &&
                     data.displayName !== currentUserName;
            })
            .map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                uid: data.uid || doc.id,
                name: data.name || data.displayName || 'User',
                age: data.age || 0,
                photos: data.photos || [],
                promptAnswers: [],
                mutualFriendsCount: 0,
              };
            });
            
          if (fallbackProfiles.length > 0) {
            console.log(`Found ${fallbackProfiles.length} profiles with fallback approach`);
            setProfiles((prevProfiles) => [...prevProfiles, ...fallbackProfiles]);
            return fallbackProfiles;
          }
        }
        
        // If we still don't have profiles, try one more time with completely different collection
        if (querySnapshot.docs.length === 0 && collection(db, 'profiles') !== collection(db, 'users')) {
          console.log('Trying users collection as fallback...');
          try {
            const usersQuery = query(collection(db, 'users'), limit(PAGE_SIZE));
            const usersSnapshot = await getDocs(usersQuery);
            
            if (usersSnapshot.docs.length > 0) {
              console.log(`Found ${usersSnapshot.docs.length} profiles in users collection`);
              const userProfiles = usersSnapshot.docs
                .filter(doc => {
                  const data = doc.data();
                  const currentUserId = auth.currentUser?.uid;
                  const currentUserName = auth.currentUser?.displayName;
                  
                  // Apply same comprehensive filtering as elsewhere
                  return doc.id !== currentUserId && 
                         data.uid !== currentUserId &&
                         data.name !== currentUserName &&
                         data.displayName !== currentUserName;
                })
                .map(doc => {
                  const data = doc.data();
                  return {
                    id: doc.id,
                    uid: data.uid || doc.id,
                    name: data.name || data.displayName || 'User',
                    age: data.age || 0,
                    photos: data.photoURL ? [data.photoURL] : [],
                    promptAnswers: [],
                    mutualFriendsCount: 0,
                  };
                });
                
              if (userProfiles.length > 0) {
                setProfiles((prevProfiles) => [...prevProfiles, ...userProfiles]);
                return userProfiles;
              }
            }
          } catch (userErr) {
            console.error('Error trying users collection:', userErr);
          }
        }
        
        // If we got here, we have no profiles
        return [];
      } catch (err) {
        console.error('Error fetching profiles:', err);
        throw new Error(`Failed to fetch profiles: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    enabled: hasMore,
  });

  // Function to fetch the next page of profiles
  const fetchNextPage = async () => {
    if (!isLoading && hasMore) {
      await refetch();
    }
  };

  // Function to reset pagination and fetch from the beginning
  const resetProfiles = async () => {
    setLastDoc(null);
    setProfiles([]);
    setHasMore(true);
    // Clear viewed profiles to start fresh
    await AsyncStorage.removeItem(VIEWED_PROFILES_KEY);
    setViewedProfileIds(new Set());
    await refetch();
  };

  return {
    profiles,
    isLoading,
    isError,
    error,
    fetchNextPage,
    resetProfiles,
    hasMore,
  };
}
