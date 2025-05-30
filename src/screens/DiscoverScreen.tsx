import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  useColorScheme, 
  Modal, 
  TextInput, 
  Alert, 
  ActivityIndicator, 
  ScrollView, 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  useWindowDimensions,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Animated, { 
  FadeIn, 
  FadeOut, 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming 
} from 'react-native-reanimated';
import styled from 'styled-components/native';
import { auth } from '../services/firebase';
import { useProfiles, Profile } from '../hooks/useProfiles';
import { useLikeHandler } from '../hooks/useLikeHandler';
import { RootState } from '../store';
import { fetchTodayLikes } from '../store/likesSlice';
import { ThemeProps } from '../utils/styled-components';
import { CachedImage } from '../components/CachedImage';
import { prefetchManager } from '../services/cache/prefetchManager';

// Create a new QueryClient instance
const queryClient = new QueryClient();

// Main DiscoverScreen component (exported with QueryClientProvider for standalone testing)
export default function DiscoverScreenWithProvider() {
  return (
    <QueryClientProvider client={queryClient}>
      <DiscoverScreen />
    </QueryClientProvider>
  );
}

// The actual screen component 
function DiscoverScreen() {
  // Theme and responsive layout
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation();
  
  // Current user
  const currentUser = auth.currentUser;
  const currentUid = currentUser?.uid || '';
  
  // Redux
  const dispatch = useDispatch();
  const todayLikeCount = useSelector((state: RootState) => state.likes.todayCount);
  
  // State for profile navigation
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  // Animation shared values
  const fadeAnim = useSharedValue(1);
  
  // Profile data from React Query hook
  const { 
    profiles, 
    isLoading, 
    isError, 
    error,
    fetchNextPage, 
    resetProfiles,
    hasMore
  } = useProfiles();
  
  // Like handling logic
  const {
    isLikeModalVisible,
    setIsLikeModalVisible,
    likeText,
    setLikeText,
    isSubmitting,
    initiateProfileLike,
    submitTextLike
  } = useLikeHandler();
  
  // Get the current profile or null if not available
  const currentProfile = profiles[currentProfileIndex] || null;
  
  // Animated style for the profile container
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));
  
  // Track prefetched URIs to avoid duplicates
  const prefetchedUris = useRef<Set<string>>(new Set());
  
  // On mount, fetch today's like count
  useEffect(() => {
    // Get today's like count from Redux
    if (currentUid) {
      dispatch(fetchTodayLikes(currentUid) as any);
    }
  }, [currentUid, dispatch]);
  
  // Add tab focus effect to prefetch images when the Discover tab is focused
  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      console.log('Discover tab focused, prefetching images');
      
      // When the tab is focused, prefetch the current and next few profiles' images
      if (profiles && profiles.length > 0) {
        // Calculate how many profiles to prefetch (current + next 2)
        const endIndex = Math.min(currentProfileIndex + 3, profiles.length);
        const profilesToPreload = profiles.slice(currentProfileIndex, endIndex);
        
        // Prefetch each profile's photos with high priority
        profilesToPreload.forEach(profile => {
          if (profile.photos && profile.photos.length > 0) {
            // Prefetch the main photo with high priority
            prefetchManager.prefetchImage(profile.photos[0], 'high');
            
            // Prefetch additional photos with normal priority
            if (profile.photos.length > 1) {
              profile.photos.slice(1).forEach(photoUrl => {
                prefetchManager.prefetchImage(photoUrl, 'normal');
              });
            }
          }
        });
      }
    });

    return () => {
      // Clean up the event listener
      unsubscribeFocus();
    };
  }, [navigation, profiles, currentProfileIndex]);
  
  // Prefetch profile images when profiles change
  useEffect(() => {
    if (profiles.length > 0) {
      // Prefetch current profile's photos
      const currentProfile = profiles[0];
      if (currentProfile?.photos?.length) {
        currentProfile.photos.forEach(uri => {
          if (!prefetchedUris.current.has(uri)) {
            prefetchManager.prefetchImage(uri, 'high');
            prefetchedUris.current.add(uri);
          }
        });
      }
      
      // Prefetch next few profiles' first photo
      const nextProfiles = profiles.slice(1, 4); // Prefetch next 3 profiles
      nextProfiles.forEach(profile => {
        if (profile?.photos?.[0] && !prefetchedUris.current.has(profile.photos[0])) {
          prefetchManager.prefetchImage(profile.photos[0], 'normal');
          prefetchedUris.current.add(profile.photos[0]);
        }
      });
    }
  }, [profiles]);

  // Clean up prefetch set on unmount
  useEffect(() => {
    return () => {
      prefetchedUris.current.clear();
    };
  }, []);
  
  // Handle advancing to the next profile
  const goToNextProfile = useCallback(async () => {
    // Don't proceed if already loading
    if (isLoading || isLoadingNext) return;
    
    // First animate fade out
    fadeAnim.value = withTiming(0, { duration: 300 });
    
    setTimeout(async () => {
      try {
        // If we're at the last profile or close to it, fetch more
        if (currentProfileIndex >= profiles.length - 2 && hasMore && !isLoading) {
          setIsLoadingNext(true);
          await fetchNextPage();
          setIsLoadingNext(false);
        }
        
        // Reset photo index for the new profile
        setCurrentPhotoIndex(0);
        
        // Move to next profile if available
        if (currentProfileIndex < profiles.length - 1) {
          setCurrentProfileIndex(prev => prev + 1);
        } else if (hasMore) {
          // If we've reached the end but there might be more, reset to show loading
          setCurrentProfileIndex(0);
          await resetProfiles();
        } else {
          // No more profiles to show
          Alert.alert(
            'No More Profiles', 
            'You\'ve seen all available profiles. Check back later for new matches!'
          );
        }
      } catch (err) {
        console.error('Error loading next profile:', err);
        Alert.alert('Error', 'Failed to load next profile. Please try again.');
      } finally {
        // Always ensure we have a smooth fade in
        fadeAnim.value = withTiming(1, { duration: 300 });
      }
    }, 300);
  }, [currentProfileIndex, profiles.length, isLoading, isLoadingNext, hasMore, fetchNextPage, fadeAnim, resetProfiles]);
  
  // Handle the dismiss button press
  const handleDismiss = () => {
    goToNextProfile();
  };
  
  // Handle the like button press
  const handleLike = () => {
    if (!currentProfile) return;
    initiateProfileLike(currentProfile.id);
  };
  
  // Handle submitting a text-based like
  const handleSubmitTextLike = async () => {
    if (likeText.length < 80) {
      Alert.alert('Too Short', 'Please write at least 80 characters to express your interest.');
      return;
    }
    
    const success = await submitTextLike();
    if (success) {
      goToNextProfile();
    }
  };
  
  // If there's an error, show error state
  if (isError) {
    return (
      <Container isDark={isDark} testID="discover-screen">
        <ErrorContainer>
          <ErrorText isDark={isDark}>Failed to load profiles</ErrorText>
          <RetryButton onPress={() => resetProfiles()}>
            <RetryButtonText>Try Again</RetryButtonText>
          </RetryButton>
        </ErrorContainer>
      </Container>
    );
  }
  
  // If initial loading or no profiles, show loading state
  if (isLoading && profiles.length === 0) {
    return (
      <Container isDark={isDark} testID="discover-screen">
        <LoadingContainer>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <LoadingText isDark={isDark}>Finding people for you...</LoadingText>
        </LoadingContainer>
      </Container>
    );
  }
  
  // If no profiles found after loading
  if (!isLoading && profiles.length === 0) {
    return (
      <Container isDark={isDark} testID="discover-screen">
        <ErrorContainer>
          <ErrorText isDark={isDark}>No profiles found</ErrorText>
          <RetryButton onPress={resetProfiles}>
            <RetryButtonText>Refresh</RetryButtonText>
          </RetryButton>
        </ErrorContainer>
      </Container>
    );
  }
  
  return (
    <Container isDark={isDark} testID="discover-screen">
      {/* Profile ScrollView */}
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {currentProfile ? (
          <Animated.View 
            style={[{ flex: 1 }, animatedStyle]}
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            testID={`profile-container-${currentProfile.id}`}
          >
            {/* Interleave photos and profile info */}
            {currentProfile.photos.map((photoUrl, photoIndex) => (
              <View key={`photo-${photoIndex}`}>
                {/* Photo */}
                <View 
                  style={{ width, height: width * 1.3 }}
                  accessible={true}
                  accessibilityLabel={`Photo ${photoIndex + 1} of ${currentProfile.name}`}
                  accessibilityRole="image"
                >
                  <CachedImage 
                    source={{ uri: photoUrl }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                    priority={photoIndex === 0 ? 'high' : 'normal'}
                    showLoadingIndicator={true}
                  />
                </View>
                
                {/* Show name & age below the first photo */}
                {photoIndex === 0 && (
                  <ProfileInfoContainer>
                    <ProfileName>{currentProfile.name}, {currentProfile.age}</ProfileName>
                    {/* Debug Info - Show UID */}
                    <ProfileBio>ID: {currentProfile.id}</ProfileBio>
                    {currentProfile.uid && currentProfile.uid !== currentProfile.id && (
                      <ProfileBio>UID: {currentProfile.uid}</ProfileBio>
                    )}
                    {currentProfile.mutualFriendsCount > 0 && (
                      <MutualFriendsContainer>
                        <MutualFriendsText>
                          {"👥"} {currentProfile.mutualFriendsCount} mutual friends
                        </MutualFriendsText>
                      </MutualFriendsContainer>
                    )}
                  </ProfileInfoContainer>
                )}
                
                {/* Show a prompt after each photo except the last */}
                {photoIndex < currentProfile.promptAnswers.length && (
                  <PromptContainer isDark={isDark}>
                    <PromptLabel isDark={isDark}>
                      {currentProfile.promptAnswers[photoIndex].prompt}
                    </PromptLabel>
                    <PromptAnswer isDark={isDark}>
                      {currentProfile.promptAnswers[photoIndex].answer}
                    </PromptAnswer>
                  </PromptContainer>
                )}
              </View>
            ))}
          </Animated.View>
        ) : (
          <LoadingContainer>
            <ActivityIndicator size="large" color="#FF6B6B" />
            <LoadingText isDark={isDark}>Loading next profile...</LoadingText>
          </LoadingContainer>
        )}
      </ScrollView>
      
      {/* Loading indicator for next profile */}
      {isLoadingNext && (
        <LoadingOverlay>
          <ActivityIndicator size="small" color="#FF6B6B" />
        </LoadingOverlay>
      )}
      
      {/* Fixed footer with action buttons */}
      <FooterContainer isDark={isDark}>
        <ActionButton 
          onPress={handleDismiss}
          testID="dismiss-button"
          accessibilityLabel="Dismiss profile"
          accessibilityRole="button"
        >
          <ActionButtonText>✕</ActionButtonText>
        </ActionButton>
        
        <ActionButton 
          onPress={handleLike}
          testID="like-button"
          accessibilityLabel="Like profile"
          accessibilityRole="button"
          primary
        >
          <ActionButtonText>❤️</ActionButtonText>
        </ActionButton>
        
        {/* Optional Super Like button (placeholder) */}
        <ActionButton 
          onPress={() => Alert.alert('Super Like', 'This feature is coming soon!')}
          accessibilityLabel="Super like profile"
          accessibilityRole="button"
          secondary
        >
          <ActionButtonText>★</ActionButtonText>
        </ActionButton>
      </FooterContainer>
      
      {/* Text like modal */}
      <Modal
        visible={isLikeModalVisible}
        transparent
        animationType="slide"
        testID="text-like-modal"
      >
        <ModalOverlay>
          <ModalContainer isDark={isDark}>
            <ModalTitle isDark={isDark}>
              Write a message to {currentProfile?.name}
            </ModalTitle>
            <ModalSubtitle isDark={isDark}>
              This is like #{todayLikeCount + 1} today. Please write at least 80 characters.
            </ModalSubtitle>
            
            <TextLikeInput
              value={likeText}
              onChangeText={setLikeText}
              multiline
              placeholder="What caught your attention about their profile?"
              placeholderTextColor={isDark ? '#777' : '#999'}
              isDark={isDark}
              textAlignVertical="top"
              autoFocus
            />
            
            <CharacterCounter isDark={isDark} isValid={likeText.length >= 80}>
              {likeText.length}/80 characters
            </CharacterCounter>
            
            <ModalButtonsContainer>
              <ModalButton 
                onPress={() => setIsLikeModalVisible(false)}
                secondary
                disabled={isSubmitting}
              >
                <ModalButtonText>Cancel</ModalButtonText>
              </ModalButton>
              
              <ModalButton 
                onPress={handleSubmitTextLike}
                disabled={likeText.length < 80 || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ModalButtonText>Send</ModalButtonText>
                )}
              </ModalButton>
            </ModalButtonsContainer>
          </ModalContainer>
        </ModalOverlay>
      </Modal>
    </Container>
  );
}

// Define specific prop types for styled components in this screen
interface ActionButtonStyledProps extends ThemeProps {
  primary?: boolean;
  secondary?: boolean;
}

interface ModalButtonStyledProps extends ThemeProps {
  secondary?: boolean;
  disabled?: boolean;
}

interface CharacterCounterStyledProps extends ThemeProps {
  isValid: boolean;
}

interface ProfilePhotoStyledProps extends ThemeProps {
  width: number;
}

// Styled components
const Container = styled(SafeAreaView)<ThemeProps>`
  flex: 1;
  background-color: ${(props: ThemeProps) => props.isDark ? '#121212' : '#ffffff'};
`;

// No longer need this as we're using CachedImage directly with inline styles

const ProfileInfoContainer = styled.View`
  padding: 16px;
`;

const ProfileName = styled.Text<ThemeProps>`
  font-size: 28px;
  font-weight: bold;
  color: ${(props: ThemeProps) => props.isDark ? '#ffffff' : '#000000'};
`;

const ProfileBio = styled.Text<ThemeProps>`
  font-size: 16px;
  color: ${(props: ThemeProps) => props.isDark ? '#cccccc' : '#666666'};
  margin-top: 4px;
`;

const NameAgeText = styled.Text<ThemeProps>`
  font-size: 28px;
  font-weight: bold;
  color: ${(props: ThemeProps) => props.isDark ? '#ffffff' : '#000000'};
`;

const MutualFriendsContainer = styled.View`
  margin-top: 8px;
  flex-direction: row;
  align-items: center;
`;

const MutualFriendsText = styled.Text<ThemeProps>`
  font-size: 14px;
  color: ${(props: ThemeProps) => props.isDark ? '#cccccc' : '#666666'};
`;

const PromptContainer = styled.View<ThemeProps>`
  margin: 8px 16px 24px;
  padding: 16px;
  border-radius: 12px;
  background-color: ${(props: ThemeProps) => props.isDark ? '#222222' : '#f5f5f5'};
`;

const PromptLabel = styled.Text<ThemeProps>`
  font-size: 16px;
  font-weight: bold;
  color: ${(props: ThemeProps) => props.isDark ? '#ffffff' : '#000000'};
  margin-bottom: 8px;
`;

const PromptAnswer = styled.Text<ThemeProps>`
  font-size: 16px;
  color: ${(props: ThemeProps) => props.isDark ? '#cccccc' : '#333333'};
  line-height: 22px;
`;

const FooterContainer = styled.View<ThemeProps>`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  flex-direction: row;
  justify-content: space-around;
  padding: 16px;
  background-color: ${(props: ThemeProps) => props.isDark ? 'rgba(18, 18, 18, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
  ${Platform.OS === 'ios' ? 'padding-bottom: 32px;' : ''}
`;

const ActionButton = styled.TouchableOpacity<ActionButtonStyledProps>`
  width: 60px;
  height: 60px;
  border-radius: 30px;
  justify-content: center;
  align-items: center;
  background-color: ${(props: ActionButtonStyledProps) =>
    props.primary ? '#FF6B6B' : 
    props.secondary ? '#FFD700' : '#FFFFFF'};
  elevation: 3;
  shadow-opacity: 0.3;
  shadow-radius: 5px;
  shadow-color: #000;
  shadow-offset: 0px 2px;
`;

const ActionButtonText = styled.Text`
  font-size: 24px;
`;

const ModalOverlay = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.5);
  padding: 20px;
`;

const ModalContainer = styled.View<ThemeProps>`
  width: 100%;
  padding: 24px;
  border-radius: 12px;
  background-color: ${(props: ThemeProps) => props.isDark ? '#222222' : '#ffffff'};
`;

const ModalTitle = styled.Text<ThemeProps>`
  font-size: 20px;
  font-weight: bold;
  color: ${(props: ThemeProps) => props.isDark ? '#ffffff' : '#000000'};
  margin-bottom: 8px;
`;

const ModalSubtitle = styled.Text<ThemeProps>`
  font-size: 14px;
  color: ${(props: ThemeProps) => props.isDark ? '#cccccc' : '#666666'};
  margin-bottom: 16px;
`;

const TextLikeInput = styled.TextInput<ThemeProps>`
  height: 150px;
  border-radius: 8px;
  padding: 12px;
  font-size: 16px;
  border: 1px solid ${(props: ThemeProps) => props.isDark ? '#444' : '#ddd'};
  color: ${(props: ThemeProps) => props.isDark ? '#ffffff' : '#000000'};
  background-color: ${(props: ThemeProps) => props.isDark ? '#333333' : '#f9f9f9'};
`;

const CharacterCounter = styled.Text<CharacterCounterStyledProps>`
  align-self: flex-end;
  margin-top: 8px;
  font-size: 12px;
  color: ${(props: CharacterCounterStyledProps) => props.isValid ?
    (props.isDark ? '#8BC34A' : '#4CAF50') : 
    (props.isDark ? '#FF8A80' : '#F44336')};
`;

const ModalButtonsContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-top: 24px;
`;

const ModalButton = styled.TouchableOpacity<ModalButtonStyledProps>`
  flex: 0.48;
  height: 50px;
  border-radius: 25px;
  padding: 0 20px;
  justify-content: center;
  align-items: center;
  background-color: ${(props: ModalButtonStyledProps) => 
    props.secondary ? 'transparent' :
    props.disabled ? '#999999' : '#FF6B6B'};
  border: ${(props: ModalButtonStyledProps) => props.secondary ? '1px solid #FF6B6B' : 'none'};
  opacity: ${(props: ModalButtonStyledProps) => props.disabled ? 0.7 : 1};
`;

const ModalButtonText = styled.Text`
  font-size: 16px;
  font-weight: bold;
  color: #ffffff;
`;

const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const LoadingText = styled.Text<ThemeProps>`
  margin-top: 16px;
  font-size: 16px;
  color: ${(props: ThemeProps) => props.isDark ? '#cccccc' : '#666666'};
`;

const LoadingOverlay = styled.View`
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 8px;
  border-radius: 20px;
  background-color: rgba(0, 0, 0, 0.2);
`;

const ErrorContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: 20px;
`;

const ErrorText = styled.Text<ThemeProps>`
  font-size: 16px;
  color: ${(props: ThemeProps) => props.isDark ? '#FF8A80' : '#F44336'};
  margin-bottom: 16px;
`;

const RetryButton = styled.TouchableOpacity`
  padding: 12px 24px;
  border-radius: 8px;
  background-color: #FF6B6B;
`;

const RetryButtonText = styled.Text`
  font-size: 16px;
  font-weight: bold;
  color: #ffffff;
`;
