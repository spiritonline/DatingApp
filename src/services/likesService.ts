import { db, auth } from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  writeBatch,
  orderBy,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { Like, Match, LikeWithProfile, UserProfile } from '../types';
import { getUserProfile, UserProfile as ServiceUserProfile } from './profileService';

// Convert service UserProfile to types UserProfile
const convertProfile = (serviceProfile: ServiceUserProfile): UserProfile => {
  return {
    id: serviceProfile.uid,
    name: serviceProfile.displayName || serviceProfile.name,
    age: typeof serviceProfile.age === 'string' ? parseInt(serviceProfile.age) : serviceProfile.age,
    gender: serviceProfile.gender,
    bio: serviceProfile.bio,
    photos: serviceProfile.photos,
    prompts: serviceProfile.prompts,
    locationConsent: serviceProfile.locationConsent,
    location: serviceProfile.location ? {
      latitude: serviceProfile.location.latitude,
      longitude: serviceProfile.location.longitude
    } : undefined,
    createdAt: serviceProfile.createdAt instanceof Date ? serviceProfile.createdAt : new Date(),
    updatedAt: serviceProfile.updatedAt instanceof Date ? serviceProfile.updatedAt : new Date()
  };
};

/**
 * Creates a like document in Firestore
 * @param fromUserId User who is liking
 * @param toUserId User being liked
 * @returns Promise with the created like
 */
export const createLike = async (fromUserId: string, toUserId: string): Promise<Like> => {
  try {
    const likeId = `${fromUserId}_${toUserId}`;
    const likeRef = doc(db, 'likes', likeId);
    
    const likeData = {
      id: likeId,
      fromUserId,
      toUserId,
      createdAt: serverTimestamp(),
      status: 'pending'
    };
    
    await setDoc(likeRef, likeData);
    
    return {
      ...likeData,
      createdAt: new Date()
    } as Like;
  } catch (error) {
    if (__DEV__) {
      console.error('Error creating like:', error);
    }
    throw new Error('Failed to create like');
  }
};

/**
 * Gets all likes received by a user (people who liked them)
 * @param userId User ID to get likes for
 * @returns Promise with array of likes with user profiles
 */
export const getLikesReceived = async (userId: string): Promise<LikeWithProfile[]> => {
  try {
    // Try the optimized query first
    const likesQuery = query(
      collection(db, 'likes'),
      where('toUserId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    
    let likesSnap;
    try {
      likesSnap = await getDocs(likesQuery);
    } catch (indexError: any) {
      // If index is not ready, fall back to simpler query
      console.warn('Index not ready, using fallback query:', indexError.message);
      const fallbackQuery = query(
        collection(db, 'likes'),
        where('toUserId', '==', userId)
      );
      likesSnap = await getDocs(fallbackQuery);
    }
    
    const likes: LikeWithProfile[] = [];
    
    for (const doc of likesSnap.docs) {
      const likeData = doc.data();
      // Filter pending likes in memory if using fallback
      if (likeData.status !== 'pending') continue;
      
      const fromUserProfile = await getUserProfile(likeData.fromUserId);
      
      if (fromUserProfile) {
        likes.push({
          id: likeData.id,
          fromUserId: likeData.fromUserId,
          toUserId: likeData.toUserId,
          createdAt: likeData.createdAt?.toDate ? likeData.createdAt.toDate() : new Date(),
          status: likeData.status,
          fromUserProfile: convertProfile(fromUserProfile)
        });
      }
    }
    
    // Sort by createdAt in memory if using fallback
    return likes.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date();
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date();
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error) {
    if (__DEV__) {
      console.error('Error getting likes received:', error);
    }
    throw new Error('Failed to get likes received');
  }
};

/**
 * Checks if user A has liked user B
 * @param fromUserId User who might have liked
 * @param toUserId User who might be liked
 * @returns Promise with like document or null
 */
export const checkLikeExists = async (fromUserId: string, toUserId: string): Promise<Like | null> => {
  try {
    const likeId = `${fromUserId}_${toUserId}`;
    const likeRef = doc(db, 'likes', likeId);
    const likeSnap = await getDoc(likeRef);
    
    if (likeSnap.exists()) {
      return likeSnap.data() as Like;
    }
    
    return null;
  } catch (error) {
    console.error('Error checking like exists:', error);
    return null;
  }
};

/**
 * Creates a match between two users
 * @param user1Id First user ID
 * @param user2Id Second user ID
 * @returns Promise with the created match
 */
export const createMatch = async (user1Id: string, user2Id: string): Promise<Match> => {
  try {
    const matchId = [user1Id, user2Id].sort().join('_');
    const matchRef = doc(db, 'matches', matchId);
    
    const matchData: Match = {
      id: matchId,
      user1Id,
      user2Id,
      createdAt: new Date(),
      lastActivity: new Date()
    };
    
    await setDoc(matchRef, {
      ...matchData,
      createdAt: serverTimestamp(),
      lastActivity: serverTimestamp()
    });
    
    return matchData;
  } catch (error) {
    console.error('Error creating match:', error);
    throw new Error('Failed to create match');
  }
};

/**
 * Likes a user back, creating a match if they already liked us
 * @param currentUserId Current user ID
 * @param targetUserId User being liked back
 * @returns Promise with match if created, null otherwise
 */
export const likeUserBack = async (currentUserId: string, targetUserId: string): Promise<Match | null> => {
  try {
    const batch = writeBatch(db);
    
    // Update the existing like to matched status
    const existingLikeId = `${targetUserId}_${currentUserId}`;
    const existingLikeRef = doc(db, 'likes', existingLikeId);
    batch.update(existingLikeRef, { 
      status: 'matched',
      matchedAt: serverTimestamp()
    });
    
    // Create a new like from current user to target user
    const newLikeId = `${currentUserId}_${targetUserId}`;
    const newLikeRef = doc(db, 'likes', newLikeId);
    batch.set(newLikeRef, {
      id: newLikeId,
      fromUserId: currentUserId,
      toUserId: targetUserId,
      createdAt: serverTimestamp(),
      status: 'matched'
    });
    
    // Create the match
    const matchId = [currentUserId, targetUserId].sort().join('_');
    const matchRef = doc(db, 'matches', matchId);
    const matchData = {
      id: matchId,
      user1Id: currentUserId,
      user2Id: targetUserId,
      createdAt: serverTimestamp(),
      lastActivity: serverTimestamp()
    };
    batch.set(matchRef, matchData);
    
    await batch.commit();
    
    // Create a chat for the new match (async, don't block the match creation)
    try {
      const { createMatchChat } = await import('./chatService');
      await createMatchChat(currentUserId, targetUserId);
    } catch (error) {
      console.error('Error creating match chat:', error);
      // Don't throw - the match was successful even if chat creation failed
    }
    
    return {
      ...matchData,
      createdAt: new Date(),
      lastActivity: new Date()
    } as Match;
  } catch (error) {
    if (__DEV__) {
      console.error('Error liking user back:', error);
    }
    throw new Error('Failed to like user back');
  }
};

/**
 * Dismisses a like (removes it without creating a match)
 * @param currentUserId Current user ID
 * @param targetUserId User whose like is being dismissed
 * @returns Promise
 */
export const dismissLike = async (currentUserId: string, targetUserId: string): Promise<void> => {
  try {
    const likeId = `${targetUserId}_${currentUserId}`;
    const likeRef = doc(db, 'likes', likeId);
    
    await updateDoc(likeRef, {
      status: 'dismissed',
      dismissedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error dismissing like:', error);
    throw new Error('Failed to dismiss like');
  }
};

/**
 * Gets all matches for a user
 * @param userId User ID to get matches for
 * @returns Promise with array of matches
 */
export const getUserMatches = async (userId: string): Promise<Match[]> => {
  try {
    const matchesQuery1 = query(
      collection(db, 'matches'),
      where('user1Id', '==', userId),
      orderBy('lastActivity', 'desc')
    );
    
    const matchesQuery2 = query(
      collection(db, 'matches'),
      where('user2Id', '==', userId),
      orderBy('lastActivity', 'desc')
    );
    
    const [matches1Snap, matches2Snap] = await Promise.all([
      getDocs(matchesQuery1),
      getDocs(matchesQuery2)
    ]);
    
    const matches: Match[] = [];
    
    matches1Snap.forEach(doc => {
      matches.push(doc.data() as Match);
    });
    
    matches2Snap.forEach(doc => {
      matches.push(doc.data() as Match);
    });
    
    // Remove duplicates and sort by lastActivity
    const uniqueMatches = matches.filter((match, index, self) => 
      index === self.findIndex(m => m.id === match.id)
    );
    
    return uniqueMatches.sort((a, b) => 
      new Date(b.lastActivity || b.createdAt).getTime() - 
      new Date(a.lastActivity || a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Error getting user matches:', error);
    throw new Error('Failed to get user matches');
  }
};

/**
 * Records a dislike/pass action
 * @param fromUserId User who is passing
 * @param toUserId User being passed
 * @returns Promise
 */
export const createDislike = async (fromUserId: string, toUserId: string): Promise<void> => {
  try {
    const dislikeId = `${fromUserId}_${toUserId}`;
    const dislikeRef = doc(db, 'dislikes', dislikeId);
    
    await setDoc(dislikeRef, {
      id: dislikeId,
      fromUserId,
      toUserId,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error creating dislike:', error);
    throw new Error('Failed to create dislike');
  }
};

/**
 * Subscribe to real-time likes updates for a user
 * @param userId User ID to listen for likes
 * @param onUpdate Callback when likes change
 * @returns Unsubscribe function
 */
export const subscribeLikes = (
  userId: string, 
  onUpdate: (likes: LikeWithProfile[]) => void
): Unsubscribe => {
  let unsubscribe: Unsubscribe;
  
  // Start with fallback query to avoid index errors
  const fallbackQuery = query(
    collection(db, 'likes'),
    where('toUserId', '==', userId)
  );
  
  unsubscribe = onSnapshot(fallbackQuery, async (snapshot) => {
    const likes: LikeWithProfile[] = [];
    
    for (const doc of snapshot.docs) {
      const likeData = doc.data();
      // Filter pending likes in memory
      if (likeData.status !== 'pending') continue;
      
      const fromUserProfile = await getUserProfile(likeData.fromUserId);
      
      if (fromUserProfile) {
        likes.push({
          id: likeData.id,
          fromUserId: likeData.fromUserId,
          toUserId: likeData.toUserId,
          createdAt: likeData.createdAt?.toDate ? likeData.createdAt.toDate() : new Date(),
          status: likeData.status,
          fromUserProfile: convertProfile(fromUserProfile)
        });
      }
    }
    
    // Sort by createdAt in memory
    likes.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date();
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date();
      return dateB.getTime() - dateA.getTime();
    });
    
    onUpdate(likes);
  }, (error) => {
    console.error('Error in likes subscription:', error);
    // Return empty array on error
    onUpdate([]);
  });
  
  return () => {
    if (unsubscribe) {
      unsubscribe();
    }
  };
};

/**
 * Generate dummy likes for testing purposes
 * @param currentUserId Current user ID
 * @returns Promise with array of dummy likes
 */
export const generateDummyLikes = async (currentUserId: string): Promise<LikeWithProfile[]> => {
  // Get current user profile to determine opposite gender
  const currentUserService = await getUserProfile(currentUserId);
  if (!currentUserService) {
    throw new Error('Current user profile not found');
  }
  
  const currentUser = convertProfile(currentUserService);
  const oppositeGender = currentUser.gender === 'male' ? 'female' : 'male';
  
  // Create dummy profiles for testing
  const dummyProfiles: UserProfile[] = [
    {
      id: 'dummy1',
      name: 'Emma Johnson',
      age: 25,
      gender: oppositeGender,
      bio: 'Love hiking and coffee ☕',
      photos: ['https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400'],
      prompts: [{
        id: '1',
        promptId: 'travel',
        promptText: 'Last trip I took was...',
        answer: 'A road trip through the Pacific Coast Highway!'
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'dummy2',
      name: 'Sophia Chen',
      age: 28,
      gender: oppositeGender,
      bio: 'Foodie and book lover 📚',
      photos: ['https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400'],
      prompts: [{
        id: '2',
        promptId: 'hobby',
        promptText: 'I spend my weekends...',
        answer: 'Exploring new restaurants and reading in cozy cafes'
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'dummy3',
      name: 'Isabella Martinez',
      age: 26,
      gender: oppositeGender,
      bio: 'Yoga instructor & adventure seeker 🧘‍♀️',
      photos: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400'],
      prompts: [{
        id: '3',
        promptId: 'passion',
        promptText: 'I\'m passionate about...',
        answer: 'Helping people find inner peace through yoga and mindfulness'
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
  
  // Create dummy likes
  const dummyLikes: LikeWithProfile[] = dummyProfiles.map((profile, index) => ({
    id: `${profile.id}_${currentUserId}`,
    fromUserId: profile.id!,
    toUserId: currentUserId,
    createdAt: new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000), // Stagger dates
    status: 'pending' as const,
    fromUserProfile: profile
  }));
  
  return dummyLikes;
};