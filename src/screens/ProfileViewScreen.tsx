import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  useWindowDimensions,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import styled from 'styled-components/native';

import { useAppTheme } from '../utils/useAppTheme';
import { AuthStackParamList } from '../navigation/types';
import { LikeWithProfile, UserProfile } from '../types';
import { CachedImage } from '../components/CachedImage';
import { likeUserBack, dismissLike } from '../services/likesService';
import { auth } from '../services/firebase';
import { ThemeProps } from '../utils/styled-components';

type ProfileViewScreenRouteProp = RouteProp<AuthStackParamList, 'ProfileView'>;
type ProfileViewScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ProfileView'>;

export default function ProfileViewScreen() {
  const navigation = useNavigation<ProfileViewScreenNavigationProp>();
  const route = useRoute<ProfileViewScreenRouteProp>();
  const { colors, isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  
  const { like } = route.params;
  const profile = like.fromUserProfile;
  
  const [isMatching, setIsMatching] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  
  const currentUser = auth.currentUser;

  const handleMatch = async () => {
    if (!currentUser?.uid || isMatching) return;
    
    setIsMatching(true);
    try {
      const match = await likeUserBack(currentUser.uid, like.fromUserId);
      
      if (match) {
        // Navigate directly to chat with the new match
        const chatId = [currentUser.uid, like.fromUserId].sort().join('_');
        
        navigation.navigate('ChatConversation', {
          chatId,
          partnerName: profile.name || 'Match',
        });
      }
    } catch (error) {
      console.error('Error creating match:', error);
      Alert.alert('Error', 'Failed to create match. Please try again.');
    } finally {
      setIsMatching(false);
    }
  };

  const handleDismiss = async () => {
    if (!currentUser?.uid || isDismissing) return;
    
    setIsDismissing(true);
    try {
      await dismissLike(currentUser.uid, like.fromUserId);
      navigation.goBack();
    } catch (error) {
      console.error('Error dismissing like:', error);
      Alert.alert('Error', 'Failed to dismiss. Please try again.');
    } finally {
      setIsDismissing(false);
    }
  };

  return (
    <Container isDark={isDark}>
      {/* Back Button */}
      <BackButton 
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={24} color={isDark ? '#ffffff' : '#000000'} />
      </BackButton>

      {/* Profile ScrollView - Same format as Discover tab */}
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={{ flex: 1 }}
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
        >
          {/* Interleave photos and prompts like in DiscoverScreen */}
          {profile.photos && profile.photos.map((photoUrl, photoIndex) => (
            <View key={`photo-${photoIndex}`}>
              {/* Photo */}
              <View style={{ width, height: width * 1.3 }}>
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
                  <ProfileName isDark={isDark}>{profile.name}, {profile.age}</ProfileName>
                  {/* Like Info */}
                  <LikeInfoContainer>
                    <LikeInfoText isDark={isDark}>
                      ❤️ {profile.name} liked you {getTimeAgo(like.createdAt)}
                    </LikeInfoText>
                  </LikeInfoContainer>
                </ProfileInfoContainer>
              )}
              
              {/* Show a prompt after each photo except the last */}
              {photoIndex < profile.prompts?.length && profile.prompts[photoIndex] && (
                <PromptContainer isDark={isDark}>
                  <PromptLabel isDark={isDark}>
                    {profile.prompts[photoIndex].promptText}
                  </PromptLabel>
                  <PromptAnswer isDark={isDark}>
                    {profile.prompts[photoIndex].answer}
                  </PromptAnswer>
                </PromptContainer>
              )}
            </View>
          ))}
        </Animated.View>
      </ScrollView>
      
      {/* Fixed footer with action buttons - floating like Discover tab */}
      <FooterContainer isDark={isDark}>
        <ActionButton 
          onPress={handleDismiss}
          disabled={isDismissing || isMatching}
        >
          {isDismissing ? (
            <ActivityIndicator size="small" color="#999" />
          ) : (
            <ActionButtonText>✕</ActionButtonText>
          )}
        </ActionButton>
        
        <ActionButton 
          onPress={handleMatch}
          disabled={isMatching || isDismissing}
          primary
        >
          {isMatching ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <ActionButtonText>❤️</ActionButtonText>
          )}
        </ActionButton>
      </FooterContainer>
    </Container>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
}

// Styled components matching DiscoverScreen
interface ActionButtonStyledProps extends ThemeProps {
  primary?: boolean;
  secondary?: boolean;
}

const Container = styled(SafeAreaView)<ThemeProps>`
  flex: 1;
  background-color: ${(props: ThemeProps) => props.isDark ? '#121212' : '#ffffff'};
`;

const ProfileInfoContainer = styled.View`
  padding: 16px;
`;

const ProfileName = styled.Text<ThemeProps>`
  font-size: 28px;
  font-weight: bold;
  color: ${(props: ThemeProps) => props.isDark ? '#ffffff' : '#000000'};
`;

const LikeInfoContainer = styled.View`
  margin-top: 8px;
`;

const LikeInfoText = styled.Text<ThemeProps>`
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
    props.primary ? '#FF6B6B' : '#FFFFFF'};
  elevation: 3;
  shadow-opacity: 0.3;
  shadow-radius: 5px;
  shadow-color: #000;
  shadow-offset: 0px 2px;
`;

const ActionButtonText = styled.Text`
  font-size: 24px;
`;

const BackButton = styled.TouchableOpacity`
  position: absolute;
  top: 60px;
  left: 20px;
  width: 40px;
  height: 40px;
  border-radius: 20px;
  background-color: rgba(0, 0, 0, 0.3);
  justify-content: center;
  align-items: center;
  z-index: 10;
  elevation: 5;
  shadow-opacity: 0.3;
  shadow-radius: 3px;
  shadow-color: #000;
  shadow-offset: 0px 2px;
`;