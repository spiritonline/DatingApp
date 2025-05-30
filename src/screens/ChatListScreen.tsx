import { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { prefetchManager } from '../services/cache/prefetchManager';
import { CachedImage } from '../components/CachedImage';
import { getColorFromString, getInitials } from '../utils/avatarPlaceholder';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MainNavigationProp } from '../navigation/types';
import { auth, db } from '../services/firebase';
import { getUserChats, initializeTestChat, isTestUser, ChatPreview as ChatPreviewType } from '../services/chatService';
import { getUserProfile } from '../services/profileService';
import { useAppTheme } from '../utils/useAppTheme';
import { doc, getDoc } from '@firebase/firestore';

// Styled components with proper typings
interface StyledProps {
  isDark?: boolean;
}

interface ChatMessageProps extends StyledProps {
  unread?: boolean;
}

// Define styles first so they can be used in the component
const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
  },
});

// Container components
const Container = styled(SafeAreaView)<StyledProps>`
  flex: 1;
  background-color: ${(props: StyledProps) => props.isDark ? '#121212' : '#ffffff'};
`;

const HeaderContainer = styled.View<StyledProps>`
  padding: 16px;
  border-bottom-width: 1px;
  border-bottom-color: ${(props: StyledProps) => props.isDark ? '#333333' : '#EEEEEE'};
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.Text<StyledProps>`
  font-size: 28px;
  font-weight: bold;
  color: ${(props: StyledProps) => props.isDark ? '#ffffff' : '#000000'};
`;

const EmptyContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: 20px;
`;

const EmptyText = styled.Text<StyledProps>`
  font-size: 20px;
  font-weight: bold;
  color: ${(props: StyledProps) => props.isDark ? '#ffffff' : '#000000'};
  margin-bottom: 8px;
`;

const EmptySubtext = styled.Text<StyledProps>`
  font-size: 16px;
  color: ${(props: StyledProps) => props.isDark ? '#888888' : '#666666'};
  text-align: center;
`;

// Chat item components
const ChatItem = styled.TouchableOpacity<StyledProps>`
  flex-direction: row;
  padding: 16px;
  align-items: center;
  border-bottom-width: 1px;
  border-bottom-color: ${(props: StyledProps) => props.isDark ? '#333333' : '#EEEEEE'};
  background-color: ${(props: StyledProps) => props.isDark ? '#121212' : '#ffffff'};
`;

const ChatAvatar = styled.View`
  width: 50px;
  height: 50px;
  border-radius: 25px;
  background-color: #FF6B6B;
  justify-content: center;
  align-items: center;
  margin-right: 16px;
`;

const ChatContent = styled.View`
  flex: 1;
`;

const ChatHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 4px;
`;

const ChatName = styled.Text<StyledProps>`
  font-size: 16px;
  font-weight: bold;
  color: ${(props: StyledProps) => props.isDark ? '#ffffff' : '#000000'};
`;

const ChatTime = styled.Text<StyledProps>`
  font-size: 12px;
  color: ${(props: StyledProps) => props.isDark ? '#888888' : '#999999'};
`;

const ChatMessage = styled.Text<ChatMessageProps>`
  font-size: 14px;
  color: ${(props: ChatMessageProps) => props.isDark 
    ? (props.unread ? '#ffffff' : '#AAAAAA') 
    : (props.unread ? '#000000' : '#666666')};
  font-weight: ${(props: ChatMessageProps) => props.unread ? 'bold' : 'normal'};
`;

const VitalityIndicator = styled.View`
  margin-left: 8px;
`;

const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const StartTestChatButton = styled.TouchableOpacity<{ disabled?: boolean }>`
  padding: 8px 12px;
  border-radius: 16px;
  background-color: #FF6B6B;
  opacity: ${(props: { disabled?: boolean }) => props.disabled ? 0.5 : 1};
`;

const StartTestChatText = styled.Text`
  color: #ffffff;
  font-size: 12px;
  font-weight: bold;
`;

const TestChatBadge = styled.View`
  background-color: #4CAF50;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 8px;
`;

const TestChatBadgeText = styled.Text`
  color: white;
  font-size: 10px;
  font-weight: bold;
`;

// A simplified chat preview item type
interface ChatPreview {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  vitality: number; // 1-text, 2-image, 3-video, 4-audio
  isTestChat?: boolean;
  profileImage?: string | null;
  otherUserId?: string; // Store other user ID for prefetching
}

export default function ChatListScreen() {
  // Use our safe theme hook that properly handles text rendering
  const { isDark, colors } = useAppTheme();
  const navigation = useNavigation<MainNavigationProp>();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTestChatInitializing, setIsTestChatInitializing] = useState(false);
  const currentUser = auth.currentUser;
  
  // Cache for display names and profile images to avoid excessive Firestore reads
  const [displayNameCache, setDisplayNameCache] = useState<Record<string, string>>({});
  const [profileImageCache, setProfileImageCache] = useState<Record<string, string>>({});
  
  // Function to format timestamp from Firestore
  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 24 * 60 * 60 * 1000) {
      // Less than 24 hours - show time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 48 * 60 * 60 * 1000) {
      // Less than 48 hours - show 'Yesterday'
      return 'Yesterday';
    } else if (diff < 7 * 24 * 60 * 60 * 1000) {
      // Less than 7 days - show day of week
      return date.toLocaleDateString([], { weekday: 'long' });
    } else {
      // More than 7 days - show date
      return date.toLocaleDateString();
    }
  };
  
  // Fetch user's display name from Firestore profile
  const getUserDisplayName = async (userId: string): Promise<string> => {
    if (!userId) return 'Unknown User';
    
    try {
      const userProfile = await getUserProfile(userId);
      // Use either displayName or name, falling back to a shortened user ID
      return userProfile?.displayName || userProfile?.name || userId.substring(0, 8);
    } catch (error) {
      console.error(`Error fetching display name for user ${userId}:`, error);
      return 'Unknown User';
    }
  };
  
  // Prefetch next chat screen images
  const prefetchNextChatImages = useCallback((chats: ChatPreview[]) => {
    if (!chats.length) return;
    
    // Use our prefetchManager to proactively load images
    import('../services/cache/prefetchManager').then(module => {
      const { prefetchManager } = module;
      
      // Get all profile images that are available
      const imageUrls = chats
        .filter(chat => chat.profileImage)
        .map(chat => chat.profileImage as string);
      
      // Prefetch with lower priority as they might not be viewed immediately
      if (imageUrls.length) {
        prefetchManager.prefetchImages(imageUrls, 'normal');
      }
    });
  }, []);
  const getCachedDisplayName = async (userId: string): Promise<string> => {
    if (displayNameCache[userId]) {
      return displayNameCache[userId];
    }

    try {
      // Get user profile from Firestore
      const profile = await getUserProfile(userId);
      const name = profile?.displayName || profile?.name || 'User';
      
      // Update cache
      setDisplayNameCache(prev => ({ ...prev, [userId]: name }));

      // Cache profile image URL for prefetching
      if (profile && Array.isArray(profile.photos) && profile.photos.length > 0) {
        const [firstPhoto] = profile.photos;
        if (firstPhoto) {
          setProfileImageCache(prev => ({ ...prev, [userId]: firstPhoto }));
        }
      }
      
      return name;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return 'User';
    }
  };
  
  // Helper function to prefetch a profile image
  const prefetchProfileImage = async (userId: string) => {
    try {
      // First check if we already have the image URL cached
      if (profileImageCache[userId]) {
        prefetchManager.prefetchImage(profileImageCache[userId], 'high');
        return;
      }
      
      // If not, fetch the profile and cache it
      const profile = await getUserProfile(userId);
      if (profile?.photos && profile.photos.length > 0) {
        const imageUrl = profile.photos[0];
        setProfileImageCache(prev => ({ ...prev, [userId]: imageUrl }));
        prefetchManager.prefetchImage(imageUrl, 'high');
      }
    } catch (error) {
      console.log('Error prefetching profile image:', error);
    }
  };
  
  // Fetch user's profile image
  const getProfileImage = async (userId: string): Promise<string | null> => {
    if (!userId) return null;
    
    if (profileImageCache[userId]) {
      return profileImageCache[userId];
    }
    
    try {
      const userProfile = await getUserProfile(userId);
      if (userProfile?.photos && userProfile.photos.length > 0) {
        // Return the first photo URL
        const photoUrl = userProfile.photos[0];
        // Cache the URL
        setProfileImageCache(prev => ({ ...prev, [userId]: photoUrl }));
        return photoUrl;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching profile image for user ${userId}:`, error);
      return null;
    }
  };
  
  // Format the chat previews from Firestore data
  const formatChatPreviews = async (firestoreChats: ChatPreviewType[]): Promise<ChatPreview[]> => {
    if (!currentUser) return [];
    
    const formattedChats: ChatPreview[] = [];
    
    for (const chat of firestoreChats) {
      // Find the other participant in the chat
      const otherParticipantId = chat.participantIds.find(id => id !== currentUser.uid) || '';
      
      // Get display name from cache or fetch it
      const name = await getCachedDisplayName(otherParticipantId);

      // Determine the last message text and vitality
      let lastMessage = '';
      let vitality = 1; // Default to text message
      
      if (chat.lastMessage) {
        if (chat.lastMessage.type === 'text') {
          lastMessage = chat.lastMessage.content || 'No message';
        } else if (chat.lastMessage.type === 'image') {
          lastMessage = '📷 Image';
          vitality = 2;
        } else if (chat.lastMessage.type === 'video') {
          lastMessage = '🎥 Video';
          vitality = 3;
        } else if (chat.lastMessage.type === 'audio') {
          lastMessage = '🎵 Audio Message';
          vitality = 4;
        }
      }
      
      // Determine if the last message is unread
      const unread = (chat.unreadCount || 0) > 0;
      
      // Get the timestamp string
      const timestamp = chat.lastMessage ? formatTimestamp(chat.lastMessage.timestamp) : '';
      
      // Get profile image
      const profileImage = await getProfileImage(otherParticipantId);
      
      // Create the formatted chat preview
      formattedChats.push({
        id: chat.id,
        name: name || 'Unknown User',
        lastMessage,
        timestamp,
        unread,
        vitality,
        isTestChat: chat.isTestChat,
        otherUserId: otherParticipantId,
        profileImage
      });
    }
    
    return formattedChats;
  };
  
  // Fetch chats on mount
  useEffect(() => {
    fetchChats();
  }, []);
  
  // Add prefetching when the chat tab is focused
  useEffect(() => {
    // Set up a focus listener to prefetch avatar images when the tab is focused
    const unsubscribeFocus = navigation.addListener('focus', () => {
      console.log('ChatList tab focused, prefetching avatar images');
      
      // Prefetch avatar images for visible chats
      if (chats && chats.length > 0) {
        // Prefetch the first few chat avatars
        const chatsToPreload = chats.slice(0, 5); // Limit to first 5 chats for performance
        
        // Prefetch profile images for visible chats
        chatsToPreload.forEach(chat => {
          if (chat.otherUserId) {
            // Prefetch from profile cache or try to find profile image
            prefetchProfileImage(chat.otherUserId);
          }
        });
      }
    });

    return () => {
      // Clean up the event listener
      unsubscribeFocus();
    };
  }, [navigation, chats]);
  
  const fetchChats = async () => {
    if (currentUser) {
      try {
        setIsLoading(true);
        const firestoreChats = await getUserChats();
        const formattedChats = await formatChatPreviews(firestoreChats);
        prefetchNextChatImages(formattedChats);
        setChats(formattedChats);
      } catch (error) {
        console.error('Error fetching chats:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  // Navigation function to chat detail screen
  const handleChatPress = (chatId: string, partnerName: string) => {
    navigation.navigate('ChatConversation', { chatId, partnerName });
  };
  
  // Handle starting a test chat
  const handleStartTestChat = async () => {
    if (!currentUser) return;
    
    try {
      setIsTestChatInitializing(true);
      await initializeTestChat();
      // Refresh the chat list to show the new test chat
      await fetchChats();
    } catch (error) {
      console.error('Error starting test chat:', error);
    } finally {
      setIsTestChatInitializing(false);
    }
  };

  return (
    <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(300)}>
      <Container isDark={isDark}>
      <HeaderContainer>
        <Title isDark={isDark}>Messages</Title>
        {isTestUser() && (
          <StartTestChatButton 
            onPress={handleStartTestChat} 
            disabled={isTestChatInitializing}
          >
            <StartTestChatText>
              {isTestChatInitializing ? 'Starting...' : 'Start Test Chat'}
            </StartTestChatText>
          </StartTestChatButton>
        )}
      </HeaderContainer>

      {isLoading ? (
        <LoadingContainer>
          <ActivityIndicator size="large" color={colors.primary} testID="loading-indicator" />
        </LoadingContainer>
      ) : chats.length === 0 ? (
        <EmptyContainer>
          <EmptyText isDark={isDark}>No messages yet</EmptyText>
          <EmptySubtext isDark={isDark}>
            Your conversations will appear here once you start chatting with your matches.
          </EmptySubtext>
        </EmptyContainer>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ChatItem 
              onPress={() => handleChatPress(item.id, item.name)}
              isDark={isDark}
              testID={`chat-item-${item.id}`}
            >
              <ChatAvatar style={{ 
                backgroundColor: getColorFromString(item.id) 
              }}>
                {item.profileImage ? (
                  <CachedImage 
                    source={{ uri: item.profileImage }} 
                    style={{ width: '100%', height: '100%', borderRadius: 25 }}
                    prefetch={true}
                    priority="normal"
                    placeholderContent={
                      <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: 'bold' }}>
                        {getInitials(item.name)}
                      </Text>
                    }
                  />
                ) : (
                  <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: 'bold' }}>
                    {getInitials(item.name)}
                  </Text>
                )}
              </ChatAvatar>
              <ChatContent>
                <ChatHeader>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ChatName isDark={isDark}>{item.name}</ChatName>
                    {item.isTestChat && (
                      <TestChatBadge>
                        <TestChatBadgeText>TEST</TestChatBadgeText>
                      </TestChatBadge>
                    )}
                  </View>
                  <ChatTime isDark={isDark}>
                    {item.timestamp}
                  </ChatTime>
                </ChatHeader>
                <ChatMessage isDark={isDark} unread={item.unread}>
                  {item.lastMessage}
                </ChatMessage>
              </ChatContent>
              {item.vitality > 1 && (
                <View style={{ marginLeft: 8 }}>
                  <Text style={{ fontSize: 20 }}>
                    {item.vitality === 2 ? '📷' : item.vitality === 3 ? '🎥' : '🎵'}
                  </Text>
                </View>
              )}
            </ChatItem>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
      </Container>
    </Animated.View>
  );
}

// Styled components with proper typings
