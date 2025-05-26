import { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import styled from 'styled-components/native';
import { ThemeProps } from '../utils/styled-components';
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
  const { isDark, colors } = useAppTheme();
  const navigation = useNavigation<MainNavigationProp>();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTestChatInitializing, setIsTestChatInitializing] = useState(false);
  const currentUser = auth.currentUser;
  
  const formatTimestamp = useCallback((timestamp: any): string => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 48 * 60 * 60 * 1000) {
      return 'Yesterday';
    } else if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'long' });
    } else {
      return date.toLocaleDateString();
    }
  }, []);
  
  // Format the chat previews from Firestore data
  const formatChatPreviews = useCallback((firestoreChats: ChatPreviewType[]): ChatPreview[] => {
    if (!currentUser) return [];
    
    return firestoreChats.map(chat => {
      const otherParticipantId = chat.participantIds.find(id => id !== currentUser.uid) || '';
      let name = '';
      if (chat.participantNames && otherParticipantId) {
        name = chat.participantNames[otherParticipantId] || otherParticipantId.substring(0, 8);
      }
      if (chat.isTestChat) {
        name = name + ' (Test)';
      }
      let lastMessage = 'No messages yet';
      let vitality = 1;
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
  }, [currentUser, formatTimestamp]);
  
  // Fetch user chats
  const fetchChats = useCallback(async () => {
    if (!currentUser) {
      setChats([]);
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      const chatsData = await getUserChats(); // Corrected: getUserChats takes no arguments
      const formattedChats = formatChatPreviews(chatsData);
      setChats(formattedChats);
    } catch (error) {
      console.error('Error fetching chats:', error);
      setChats([]); // Clear chats on error
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, formatChatPreviews]);
  
  // Fetch chats when the screen is focused
  useFocusEffect(useCallback(() => {
    fetchChats();
  }, [fetchChats]));
  
  // Handle chat item press
  const handleChatPress = (chatId: string, partnerName: string) => {
    navigation.navigate('ChatConversation', { chatId, partnerName });
  };
  
  // Handle starting a test chat
  const handleStartTestChat = async () => {
    if (!currentUser || !isTestUser()) return;
    
    try {
      setIsTestChatInitializing(true);
      
      // Create a test chat
      const chatId = await initializeTestChat();
      
      if (chatId) {
        // Refresh the chat list
        await fetchChats();
        
        // Navigate to the new chat
        navigation.navigate('ChatConversation', { 
          chatId, 
          partnerName: 'Test Bot (Test)'
        });
      }
    } catch (error) {
      console.error('Error starting test chat:', error);
    } finally {
      setIsTestChatInitializing(false);
    }
  };
  
  return (
    <Container isDark={isDark} testID="chat-list-screen">
      <HeaderContainer>
        <Title isDark={isDark}>Messages</Title>
        {isTestUser() && (
          <StartTestChatButton 
            onPress={handleStartTestChat}
            disabled={isTestChatInitializing}
            testID="start-test-chat-button"
          >
            <StartTestChatText>
              {isTestChatInitializing ? 'Starting...' : 'Start Test Chat'}
            </StartTestChatText>
          </StartTestChatButton>
        )}
      </HeaderContainer>
      
      {isLoading ? (
        <LoadingContainer>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </LoadingContainer>
      ) : chats.length === 0 ? (
        <EmptyContainer>
          <EmptyText isDark={isDark}>No messages yet</EmptyText>
          <EmptySubtext isDark={isDark}>
            When you match with someone, you'll be able to chat here
          </EmptySubtext>
        </EmptyContainer>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatItem
              isDark={isDark}
              onPress={() => handleChatPress(item.id, item.name)}
              testID={`chat-item-${item.id}`}
              accessibilityLabel={`Chat with ${item.name}`}
              accessibilityRole="button"
            >
              <ChatAvatar>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                  {item.name.charAt(0)}
                </Text>
              </ChatAvatar>
              <ChatContent>
                <ChatHeader>
                  <ChatName isDark={isDark}>
                    {item.name}
                  </ChatName>
                  {item.isTestChat && (
                    <TestChatBadge testID="test-chat-badge">
                      <TestChatBadgeText>TEST</TestChatBadgeText>
                    </TestChatBadge>
                  )}
                  <ChatTime isDark={isDark}>
                    {item.timestamp}
                  </ChatTime>
                </ChatHeader>
                <ChatMessage isDark={isDark} unread={item.unread}>
                  {item.lastMessage}
                </ChatMessage>
              </ChatContent>
              {item.vitality > 1 && (
                <VitalityIndicator>
                  <Text style={{ fontSize: 20 }}>
                    {item.vitality === 2 ? '📷' : item.vitality === 3 ? '🎥' : '🎵'}
                  </Text>
                </VitalityIndicator>
              )}
            </ChatItem>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </Container>
  );
}

// Styled components with proper typings
type StyledProps = ThemeProps; // Use ThemeProps from styled-components.ts for consistency

interface ChatMessageProps extends StyledProps {
  unread?: boolean;
}

// Container components
const Container = styled(SafeAreaView)<StyledProps>`
  flex: 1;
  background-color: ${(props: StyledProps) => props.isDark ? '#121212' : '#ffffff'};
`;

const HeaderContainer = styled.View`
  padding: 16px;
  border-bottom-width: 1px;
  border-bottom-color: ${(props: { isDark?: boolean }) => props.isDark ? '#333333' : '#EEEEEE'};
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
