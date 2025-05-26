import { useState, useEffect, useCallback } from 'react';
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
    fetchNextPage, 
    resetProfiles 
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
  
  // On mount, fetch today's like count
  useEffect(() => {
    if (currentUid) {
      dispatch(fetchTodayLikes(currentUid) as any);
    }
  }, [dispatch, currentUid]);
  
  // Handle advancing to the next profile
  const goToNextProfile = useCallback(async () => {
    // First animate fade out
    fadeAnim.value = withTiming(0, { duration: 300 });
    
    setTimeout(async () => {
      // If we're at the last profile or close to it, fetch more
      if (currentProfileIndex >= profiles.length - 2 && !isLoading) {
        setIsLoadingNext(true);
        await fetchNextPage();
        setIsLoadingNext(false);
      }
      
      // Reset photo index for the new profile
      setCurrentPhotoIndex(0);
      
      // Move to next profile if available
      if (currentProfileIndex < profiles.length - 1) {
        setCurrentProfileIndex(prev => prev + 1);
      }
      
      // Animate fade in
      fadeAnim.value = withTiming(1, { duration: 300 });
    }, 300);
  }, [currentProfileIndex, profiles.length, isLoading, fetchNextPage, fadeAnim]);
  
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
  if (isLoading || profiles.length === 0) {
    return (
      <Container isDark={isDark} testID="discover-screen">
        <LoadingContainer>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <LoadingText isDark={isDark}>Finding people for you...</LoadingText>
        </LoadingContainer>
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
        {currentProfile && (
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
                <ProfilePhoto 
                  source={{ uri: photoUrl }} 
                  width={width}
                  resizeMode="cover"
                  accessibilityLabel={`Photo ${photoIndex + 1} of ${currentProfile.name}`}
                />
                
                {/* Show name & age below the first photo */}
                {photoIndex === 0 && (
                  <ProfileInfoContainer>
                    <NameAgeText isDark={isDark}>
                      {currentProfile.name}, {currentProfile.age}
                    </NameAgeText>
                    
                    {/* Mutual friends badge if any */}
                    {currentProfile.mutualFriendsCount > 0 && (
                      <MutualFriendsContainer>
                        <MutualFriendsText isDark={isDark}>
                          👥 {currentProfile.mutualFriendsCount} mutual friends
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

// Styled components
const Container = styled(SafeAreaView)<ThemeProps>`
  flex: 1;
  background-color: ${props => props.isDark ? '#121212' : '#ffffff'};
`;

const ProfilePhoto = styled.Image<{ width: number }>`
  width: ${props => props.width}px;
  height: ${props => props.width * 1.3}px;
`;

const ProfileInfoContainer = styled.View`
  padding: 16px;
`;

const NameAgeText = styled.Text<ThemeProps>`
  font-size: 28px;
  font-weight: bold;
  color: ${props => props.isDark ? '#ffffff' : '#000000'};
`;

const MutualFriendsContainer = styled.View`
  margin-top: 8px;
  flex-direction: row;
  align-items: center;
`;

const MutualFriendsText = styled.Text<ThemeProps>`
  font-size: 14px;
  color: ${props => props.isDark ? '#cccccc' : '#666666'};
`;

const PromptContainer = styled.View<ThemeProps>`
  margin: 8px 16px 24px;
  padding: 16px;
  border-radius: 12px;
  background-color: ${props => props.isDark ? '#222222' : '#f5f5f5'};
`;

const PromptLabel = styled.Text<ThemeProps>`
  font-size: 16px;
  font-weight: bold;
  color: ${props => props.isDark ? '#ffffff' : '#000000'};
  margin-bottom: 8px;
`;

const PromptAnswer = styled.Text<ThemeProps>`
  font-size: 16px;
  color: ${props => props.isDark ? '#cccccc' : '#333333'};
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
  background-color: ${props => props.isDark ? 'rgba(18, 18, 18, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
  ${Platform.OS === 'ios' ? 'padding-bottom: 32px;' : ''}
`;

const ActionButton = styled.TouchableOpacity<{ primary?: boolean; secondary?: boolean }>`
  width: 60px;
  height: 60px;
  border-radius: 30px;
  justify-content: center;
  align-items: center;
  background-color: ${props => 
    props.primary ? '#FF6B6B' : 
    props.secondary ? '#FFD700' : '#FFFFFF'};
  elevation: 3;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.2;
  shadow-radius: 4px;
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
  background-color: ${props => props.isDark ? '#222222' : '#ffffff'};
`;

const ModalTitle = styled.Text<ThemeProps>`
  font-size: 20px;
  font-weight: bold;
  color: ${props => props.isDark ? '#ffffff' : '#000000'};
  margin-bottom: 8px;
`;

const ModalSubtitle = styled.Text<ThemeProps>`
  font-size: 14px;
  color: ${props => props.isDark ? '#cccccc' : '#666666'};
  margin-bottom: 16px;
`;

const TextLikeInput = styled.TextInput<ThemeProps>`
  height: 150px;
  border-radius: 8px;
  padding: 12px;
  font-size: 16px;
  border: 1px solid ${props => props.isDark ? '#444' : '#ddd'};
  color: ${props => props.isDark ? '#ffffff' : '#000000'};
  background-color: ${props => props.isDark ? '#333333' : '#f9f9f9'};
`;

const CharacterCounter = styled.Text<ThemeProps & { isValid: boolean }>`
  align-self: flex-end;
  margin-top: 8px;
  font-size: 12px;
  color: ${props => props.isValid ? 
    (props.isDark ? '#8BC34A' : '#4CAF50') : 
    (props.isDark ? '#FF8A80' : '#F44336')};
`;

const ModalButtonsContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-top: 24px;
`;

interface ModalButtonProps {
  secondary?: boolean;
  disabled?: boolean;
}

const ModalButton = styled.TouchableOpacity<ModalButtonProps>`
  flex: 0.48;
  height: 50px;
  border-radius: 25px;
  justify-content: center;
  align-items: center;
  background-color: ${props => 
    props.secondary ? 'transparent' : 
    props.disabled ? '#999999' : '#FF6B6B'};
  border: ${props => props.secondary ? '1px solid #FF6B6B' : 'none'};
  opacity: ${props => props.disabled ? 0.7 : 1};
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
  color: ${props => props.isDark ? '#cccccc' : '#666666'};
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
  color: ${props => props.isDark ? '#FF8A80' : '#F44336'};
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
