import { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator 
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MainNavigationProp } from '../navigation/types';
import { auth } from '../services/firebase';
import { getUserChats, initializeTestChat, isTestUser, ChatPreview as ChatPreviewType } from '../services/chatService';
import { useAppTheme } from '../utils/useAppTheme';

// A simplified chat preview item type
interface ChatPreview {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  vitality: number; // 1-text, 2-image, 3-video, 4-audio
  isTestChat?: boolean;
}

export default function ChatListScreen() {
  // Use our safe theme hook that properly handles text rendering
  const { isDark, colors } = useAppTheme();
  const navigation = useNavigation<MainNavigationProp>();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTestChatInitializing, setIsTestChatInitializing] = useState(false);
  const currentUser = auth.currentUser;
  
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
  
  // Format the chat previews from Firestore data
  const formatChatPreviews = (firestoreChats: ChatPreviewType[]): ChatPreview[] => {
    if (!currentUser) return [];
    
    return firestoreChats.map(chat => {
      // Find the other participant(s) in the chat
      const otherParticipantId = chat.participantIds.find(id => id !== currentUser.uid) || '';
      
      // Get the display name for the other participant
      let name = '';
      if (chat.participantNames && otherParticipantId) {
        name = chat.participantNames[otherParticipantId] || otherParticipantId.substring(0, 8);
      }
      
      // For test chats, ensure we have a clear indicator
      if (chat.isTestChat) {
        name = name + ' (Test)';
      }
      
      // Format the last message
      let lastMessage = 'No messages yet';
      let vitality = 1; // Default to text
      
      if (chat.lastMessage) {
        if (chat.lastMessage.type === 'text') {
          lastMessage = chat.lastMessage.content;
          vitality = 1;
        } else if (chat.lastMessage.type === 'image') {
          lastMessage = 'Sent a photo';
          vitality = 2;
        } else if (chat.lastMessage.type === 'video') {
          lastMessage = 'Sent a video';
          vitality = 3;
        } else if (chat.lastMessage.type === 'audio') {
          lastMessage = 'Sent an audio message';
          vitality = 4;
        }
      }
      
      // Determine if the last message is unread
      // In a real app, this would come from a more sophisticated read status tracking system
      const unread = chat.lastMessage ? chat.lastMessage.senderId !== currentUser.uid : false;
      
      return {
        id: chat.id,
        name,
        lastMessage,
        timestamp: chat.lastMessage ? formatTimestamp(chat.lastMessage.timestamp) : '',
        unread,
        vitality,
        isTestChat: chat.isTestChat,
      };
    });
  };
  
  // Fetch chats when the screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchChats();
    }, [])
  );
  
  const fetchChats = async () => {
    if (currentUser) {
      try {
        setIsLoading(true);
        const firestoreChats = await getUserChats();
        setChats(formatChatPreviews(firestoreChats));
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
              isDark={isDark} 
              onPress={() => handleChatPress(item.id, item.name)}
            >
              <ChatAvatar>
                <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: 'bold' }}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
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
interface StyledProps {
  isDark?: boolean;
}

interface ChatMessageProps extends StyledProps {
  unread?: boolean;
}

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

const styles = StyleSheet.create({
  listContent: {
    flexGrow: 1,
  },
});
