import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { collection, query, limit, startAfter, getDocs, DocumentData, QueryDocumentSnapshot } from '@firebase/firestore';
import { db } from '../services/firebase';

export interface Profile {
  id: string;
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

export function useProfiles() {
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // Function to transform Firestore data to our Profile interface
  const transformData = (doc: QueryDocumentSnapshot<DocumentData>): Profile => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.displayName || '',
      age: calculateAge(data.birthdate),
      photos: data.photos || [],
      promptAnswers: (data.prompts || []).map((prompt: any) => ({
        prompt: prompt.promptText,
        answer: prompt.answer,
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

  // The main query
  const { isLoading, isError, error, refetch } = useQuery({
    queryKey: ['profiles', lastDoc?.id],
    queryFn: async () => {
      let profilesQuery;
      
      if (lastDoc) {
        profilesQuery = query(
          collection(db, 'profiles'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      } else {
        profilesQuery = query(
          collection(db, 'profiles'),
          limit(PAGE_SIZE)
        );
      }
      
      const querySnapshot = await getDocs(profilesQuery);
      
      // Update the last document for pagination
      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
      setLastDoc(lastVisible);
      
      // Check if there are more results
      setHasMore(querySnapshot.docs.length === PAGE_SIZE);
      
      // Transform and add new profiles to the state
      const newProfiles = querySnapshot.docs.map(transformData);
      setProfiles((prevProfiles) => [...prevProfiles, ...newProfiles]);
      
      return newProfiles;
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
  const resetProfiles = () => {
    setLastDoc(null);
    setProfiles([]);
    setHasMore(true);
    refetch();
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
