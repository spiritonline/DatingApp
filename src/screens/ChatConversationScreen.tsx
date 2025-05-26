import { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator,
  useColorScheme,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { db, auth } from '../services/firebase';
import { AuthStackParamList } from '../navigation/types';
import styled from 'styled-components/native';
import { ThemeProps } from '../utils/styled-components';
import { 
  sendMessage as sendChatMessage, 
  subscribeToMessages, 
  markMessagesAsRead, 
  isTestUser, 
  ChatMessage as ChatMessageType,
  cleanupTestChat
} from '../services/chatService';

type ChatConversationScreenRouteProp = RouteProp<AuthStackParamList, 'ChatConversation'>;

interface Message {
  id: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio';
  createdAt: any;
  isRead?: boolean;
}

export default function ChatConversationScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation();
  const route = useRoute<ChatConversationScreenRouteProp>();
  const { chatId, partnerName } = route.params;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTestChatScreen, setIsTestChatScreen] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const currentUser = auth.currentUser;
  
  // Subscribe to messages and determine if this is a test chat
  useEffect(() => {
    if (!chatId || !currentUser) return;
    
    // Check if this is a test chat
    const isTest = chatId.startsWith('testChat_');
    setIsTestChatScreen(isTest);
    
    // Mark messages as read when conversation is opened
    markMessagesAsRead(chatId).catch(error => {
      console.error('Error marking messages as read:', error);
    });
    
    // Subscribe to messages using the chat service
    const unsubscribe = subscribeToMessages(chatId, (chatMessages) => {
      setMessages(chatMessages);
      setIsLoading(false);
      
      // Scroll to bottom on new messages
      if (chatMessages.length > 0 && flatListRef.current) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });
    
    return () => unsubscribe();
  }, [chatId, currentUser?.uid]);
  
  // Send a message
  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentUser || !chatId) return;
    
    try {
      setIsSending(true);
      const success = await sendChatMessage(chatId, inputMessage.trim());
      
      if (success) {
        setInputMessage('');
      } else {
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'An unexpected error occurred while sending your message.');
    } finally {
      setIsSending(false);
    }
  };
  
  // Format timestamp
  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Clean up test chat data
  const handleCleanupTestChat = async () => {
    if (!isTestChatScreen) return;
    
    Alert.alert(
      'Clean Test Chat', 
      'Are you sure you want to delete all messages in this test chat?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await cleanupTestChat();
              if (success) {
                Alert.alert('Success', 'Test chat data has been cleaned up.');
                navigation.goBack();
              } else {
                Alert.alert('Error', 'Failed to clean up test chat data.');
              }
            } catch (error) {
              console.error('Error cleaning up test chat:', error);
              Alert.alert('Error', 'An unexpected error occurred.');
            }
          },
        },
      ]
    );
  };
  
  if (isLoading) {
    return (
      <Container isDark={isDark} testID="chat-conversation-screen">
        <LoadingContainer>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </LoadingContainer>
      </Container>
    );
  }
  
  return (
    <Container isDark={isDark} testID="chat-conversation-screen">
      <HeaderContainer>
        <BackButton 
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <BackButtonText isDark={isDark}>←</BackButtonText>
        </BackButton>
        <HeaderContent>
          <HeaderTitle isDark={isDark}>{partnerName}</HeaderTitle>
          {isTestChatScreen && (
            <TestChatBadge testID="test-chat-badge">
              <TestChatBadgeText>TEST CHAT</TestChatBadgeText>
            </TestChatBadge>
          )}
        </HeaderContent>
        {isTestChatScreen && isTestUser() ? (
          <CleanupButton 
            onPress={handleCleanupTestChat}
            testID="cleanup-test-chat-button"
            accessibilityLabel="Clean up test chat"
            accessibilityRole="button"
          >
            <CleanupButtonText>Clean</CleanupButtonText>
          </CleanupButton>
        ) : (
          <PlanDateButton
            onPress={() => {/* Placeholder for future date planning feature */}}
            accessibilityLabel="Plan a date"
            accessibilityRole="button"
          >
            <PlanDateButtonText>Plan Date</PlanDateButtonText>
          </PlanDateButton>
        )}
      </HeaderContainer>
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <MessagesContainer>
          {messages.length === 0 ? (
            <EmptyContainer>
              <EmptyText isDark={isDark}>
                Start a conversation with {partnerName}
              </EmptyText>
            </EmptyContainer>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isCurrentUser = item.senderId === currentUser?.uid;
                
                return (
                  <MessageContainer 
                    isCurrentUser={isCurrentUser}
                    testID={isCurrentUser ? 'sent-message' : 'received-message'}
                  >
                    <MessageBubble isDark={isDark} isCurrentUser={isCurrentUser}>
                      <MessageText isDark={isDark} isCurrentUser={isCurrentUser}>
                        {item.content}
                      </MessageText>
                      <MessageTime isDark={isDark} isCurrentUser={isCurrentUser}>
                        {formatTime(item.createdAt)}
                      </MessageTime>
                    </MessageBubble>
                  </MessageContainer>
                );
              }}
              contentContainerStyle={{ paddingVertical: 16 }}
            />
          )}
        </MessagesContainer>
        
        <InputContainer isDark={isDark}>
          <MessageInput
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholder="Type a message..."
            placeholderTextColor={isDark ? '#777777' : '#999999'}
            isDark={isDark}
            multiline
            testID="message-input"
          />
          <SendButton 
            onPress={sendMessage}
            disabled={!inputMessage.trim() || isSending}
            accessibilityLabel="Send message"
            accessibilityRole="button"
            testID="send-button"
          >
            <SendButtonText>{isSending ? 'Sending...' : 'Send'}</SendButtonText>
          </SendButton>
        </InputContainer>
      </KeyboardAvoidingView>
    </Container>
  );
}

// Styled components
const Container = styled(SafeAreaView)<ThemeProps>`
  flex: 1;
  background-color: ${(props: ThemeProps) => props.isDark ? '#121212' : '#ffffff'};
`;

const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const HeaderContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom-width: 1px;
  border-bottom-color: ${(props: any) => props.theme?.isDark ? '#333333' : '#EEEEEE'};
`;

const HeaderContent = styled.View`
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const BackButton = styled.TouchableOpacity`
  width: 40px;
  height: 40px;
  justify-content: center;
  align-items: center;
`;

const BackButtonText = styled.Text<ThemeProps>`
  font-size: 24px;
  color: ${(props: ThemeProps) => props.isDark ? '#ffffff' : '#000000'};
`;

const HeaderTitle = styled.Text<ThemeProps>`
  font-size: 18px;
  font-weight: bold;
  color: ${(props: ThemeProps) => props.isDark ? '#ffffff' : '#000000'};
`;

const PlanDateButton = styled.TouchableOpacity`
  padding: 8px 12px;
  border-radius: 16px;
  background-color: #FF6B6B;
`;

const CleanupButton = styled.TouchableOpacity`
  padding: 8px 12px;
  border-radius: 16px;
  background-color: #FF9800;
`;

const CleanupButtonText = styled.Text`
  color: #ffffff;
  font-size: 12px;
  font-weight: bold;
`;

const TestChatBadge = styled.View`
  background-color: #4CAF50;
  padding: 2px 8px;
  border-radius: 10px;
  margin-top: 4px;
`;

const TestChatBadgeText = styled.Text`
  color: white;
  font-size: 10px;
  font-weight: bold;
`;

const PlanDateButtonText = styled.Text`
  color: #ffffff;
  font-size: 12px;
  font-weight: bold;
`;

const MessagesContainer = styled.View`
  flex: 1;
`;

const EmptyContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: 20px;
`;

const EmptyText = styled.Text<ThemeProps>`
  font-size: 16px;
  color: ${(props: ThemeProps) => props.isDark ? '#777777' : '#999999'};
  text-align: center;
`;

interface MessageProps {
  isCurrentUser: boolean;
  isDark?: boolean;
}

const MessageContainer = styled.View<MessageProps>`
  padding: 4px 16px;
  align-items: ${(props: MessageProps) => props.isCurrentUser ? 'flex-end' : 'flex-start'};
`;

const MessageBubble = styled.View<MessageProps>`
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 20px;
  background-color: ${(props: MessageProps) => 
    props.isCurrentUser 
      ? '#FF6B6B' 
      : props.isDark ? '#2C2C2C' : '#F0F0F0'};
`;

const MessageText = styled.Text<MessageProps>`
  font-size: 16px;
  color: ${(props: MessageProps) => 
    props.isCurrentUser 
      ? '#FFFFFF' 
      : props.isDark ? '#FFFFFF' : '#000000'};
`;

const MessageTime = styled.Text<MessageProps>`
  font-size: 10px;
  color: ${(props: MessageProps) => 
    props.isCurrentUser 
      ? 'rgba(255, 255, 255, 0.7)' 
      : props.isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'};
  align-self: flex-end;
  margin-top: 4px;
`;

const InputContainer = styled.View<ThemeProps>`
  flex-direction: row;
  align-items: center;
  padding: 12px 16px;
  border-top-width: 1px;
  border-top-color: ${(props: ThemeProps) => props.isDark ? '#333333' : '#EEEEEE'};
  background-color: ${(props: ThemeProps) => props.isDark ? '#1E1E1E' : '#FFFFFF'};
`;

const MessageInput = styled.TextInput<ThemeProps>`
  flex: 1;
  min-height: 40px;
  max-height: 100px;
  padding: 10px 16px;
  border-radius: 20px;
  background-color: ${(props: ThemeProps) => props.isDark ? '#2C2C2C' : '#F0F0F0'};
  color: ${(props: ThemeProps) => props.isDark ? '#FFFFFF' : '#000000'};
  margin-right: 12px;
`;

const SendButton = styled.TouchableOpacity<{ disabled?: boolean }>`
  padding: 10px 16px;
  border-radius: 20px;
  background-color: #FF6B6B;
  opacity: ${(props: { disabled?: boolean }) => props.disabled ? 0.5 : 1};
`;

const SendButtonText = styled.Text`
  color: #FFFFFF;
  font-weight: bold;
`;
