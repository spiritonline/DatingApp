import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { db, auth } from '../services/firebase';
import { RootState } from '../store';
import { incrementLikeCount } from '../store/likesSlice';
import { AuthStackParamList } from '../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

/**
 * Defines the different levels of engagement required for likes based on usage
 * - none: No additional input required
 * - text: Requires a text message
 * - video: Requires a video introduction
 */
interface LikeRequirement {
  type: 'none' | 'text' | 'video';
  minTextLength?: number;
}

/**
 * Interface for the return value of useLikeHandler hook
 */
interface LikeHandlerResult {
  isLikeModalVisible: boolean;
  setIsLikeModalVisible: (visible: boolean) => void;
  likeText: string;
  setLikeText: (text: string) => void;
  isSubmitting: boolean;
  likeRequirement: LikeRequirement;
  initiateProfileLike: (profileId: string) => void;
  submitTextLike: () => Promise<boolean | undefined>;
  submitVideoLike: (profileId: string, videoUrl: string) => Promise<boolean | undefined>;
  handleLikeSubmission: (profileId: string, text?: string, videoUrl?: string) => Promise<boolean | undefined>;
}

/**
 * Custom hook to handle the like functionality in the app
 * Manages like requirements, user interactions, and submission process
 * @returns {LikeHandlerResult} Object containing like-related state and functions
 */
export function useLikeHandler(): LikeHandlerResult {
  const [isLikeModalVisible, setIsLikeModalVisible] = useState(false);
  const [likeText, setLikeText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [likeRequirement, setLikeRequirement] = useState<LikeRequirement>({ type: 'none' });
  
  const todayLikeCount = useSelector((state: RootState) => state.likes.todayCount);
  const dispatch = useDispatch();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  
  /**
   * Determines the like requirement based on the user's daily like count
   * @returns {LikeRequirement} The requirement for the current like
   */
  const getLikeRequirement = (): LikeRequirement => {
    if (todayLikeCount < 6) {
      return { type: 'none' };
    } else if (todayLikeCount < 10) {
      return { type: 'text', minTextLength: 80 };
    } else {
      return { type: 'video' };
    }
  };
  
  /**
   * Initiates the like process for a profile
   * @param {string} profileId - The ID of the profile to like
   */
  const initiateProfileLike = (profileId: string): void => {
    const requirement = getLikeRequirement();
    setCurrentProfileId(profileId);
    setLikeRequirement(requirement);
    
    if (requirement.type === 'none') {
      // No requirement, proceed directly
      handleLikeSubmission(profileId);
    } else if (requirement.type === 'text') {
      // Show text input modal
      setIsLikeModalVisible(true);
    } else {
      // Navigate to video intro screen
      navigation.navigate('VideoIntro', { profileId });
    }
  };
  
  /**
   * Handles the submission of a like
   * @param {string} profileId - The ID of the profile to like
   * @param {string} [text] - Optional text message to include with the like
   * @param {string} [videoUrl] - Optional video URL to include with the like
   * @returns {Promise<boolean | undefined>} Success status of the submission
   */
  const handleLikeSubmission = async (profileId: string, text?: string, videoUrl?: string): Promise<boolean | undefined> => {
    if (!auth.currentUser) return;
    
    setIsSubmitting(true);
    
    try {
      const currentUid = auth.currentUser.uid;
      
      // Create like record in Firestore
      const likeData = {
        fromUser: currentUid,
        toUser: profileId,
        vitality: videoUrl ? 3 : text ? 2 : 1, // Higher vitality for richer content
        text,
        videoUrl,
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'likes'), likeData);
      
      // Increment the Redux counter
      dispatch(incrementLikeCount());
      
      // Check for mutual like
      const likesRef = collection(db, 'likes');
      const mutualLikeQuery = query(
        likesRef,
        where('fromUser', '==', profileId),
        where('toUser', '==', currentUid)
      );
      
      const mutualLikeSnapshot = await getDocs(mutualLikeQuery);
      
      if (!mutualLikeSnapshot.empty) {
        // A mutual like exists! Create or fetch chat thread
        const chatId = `${currentUid}_${profileId}`;
        
        // Navigate to chat conversation
        navigation.navigate('ChatConversation', { chatId, partnerName: 'Match' });
      }
      
      return true;
    } catch (error) {
      console.error('Error submitting like:', error);
      return false;
    } finally {
      setIsSubmitting(false);
      setIsLikeModalVisible(false);
      setLikeText('');
    }
  };
  
  /**
   * Handles text-based like submission
   * @returns {Promise<boolean | undefined>} Success status of the submission
   */
  const submitTextLike = async (): Promise<boolean | undefined> => {
    const minLength = likeRequirement.minTextLength || 80;
    if (!currentProfileId || likeText.length < minLength) return false;
    return handleLikeSubmission(currentProfileId, likeText);
  };
  
  /**
   * Handles video-based like submission from the video intro screen
   * @param {string} profileId - The ID of the profile to like
   * @param {string} videoUrl - The URL of the uploaded video
   * @returns {Promise<boolean | undefined>} Success status of the submission
   */
  const submitVideoLike = async (profileId: string, videoUrl: string): Promise<boolean | undefined> => {
    return handleLikeSubmission(profileId, undefined, videoUrl);
  };
  
  return {
    isLikeModalVisible,
    setIsLikeModalVisible,
    likeText,
    setLikeText,
    isSubmitting,
    likeRequirement,
    initiateProfileLike,
    submitTextLike,
    submitVideoLike,
    handleLikeSubmission
  };
}
