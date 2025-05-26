import { useState, useEffect, useRef } from 'react';
import { 
  FlatList, 
  TouchableOpacity, 
  Text, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator,
  Alert,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { auth } from '../services/firebase';
import { AuthStackParamList } from '../navigation/types';
import styled from 'styled-components/native';
import { ThemeProps as BaseThemeProps } from '../utils/styled-components';
import { useAppTheme } from '../utils/useAppTheme';
import { 
  sendMessage as sendChatMessage, 
  subscribeToMessages, 
  markMessagesAsRead, 
  isTestUser, 
  cleanupTestChat
} from '../services/chatService';

// Constants
const REPLY_PREVIEW_MAX_LENGTH = 70;
const REPLY_PANEL_HEIGHT = 60; // Approximate height for animation

type ChatConversationScreenRouteProp = RouteProp<AuthStackParamList, 'ChatConversation'>;

interface Message {
  id: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio';
  createdAt: Date | { toDate: () => Date } | number;
  isRead?: boolean;
  replyTo?: {
    id: string;
    content: string;
    senderId: string;
  };
}

export default function ChatConversationScreen() {
  const { isDark, colors } = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute<ChatConversationScreenRouteProp>();
  const { chatId, partnerName } = route.params;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTestChatScreen, setIsTestChatScreen] = useState(false);
  
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});
  const currentUser = auth.currentUser;

  // Animation for reply panel
  const replyPanelAnimHeight = useSharedValue(0);
  const replyPanelAnimOpacity = useSharedValue(0);

  const animatedReplyPanelStyle = useAnimatedStyle(() => {
    return {
      height: replyPanelAnimHeight.value,
      opacity: replyPanelAnimOpacity.value,
      overflow: 'hidden',
    };
  });

    // Subscribe to messages and determine if this is a test chat
  useEffect(() => {
    if (!chatId || !currentUser) return;
    
    // Check if this is a test chat
    const isTest = chatId.startsWith('testChat_');
    setIsTestChatScreen(isTest);
    
    // Mark messages as read when conversation is opened
    void markMessagesAsRead(chatId).catch(error => {
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
    
    return unsubscribe;
  }, [chatId, currentUser]);

  // Effect to handle reply panel animation
  useEffect(() => {
    if (replyToMessage) {
      replyPanelAnimHeight.value = withTiming(REPLY_PANEL_HEIGHT, { duration: 200, easing: Easing.out(Easing.quad) });
      replyPanelAnimOpacity.value = withTiming(1, { duration: 200 });
    } else {
      replyPanelAnimHeight.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) });
      replyPanelAnimOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [replyToMessage, replyPanelAnimHeight, replyPanelAnimOpacity]);



  // Send a message
  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentUser || !chatId) return;
    
    // Ensure currentUser.uid is available for senderId
    const senderId = currentUser.uid;

    try {
      setIsSending(true);
      
      // Correctly pass messageData object to sendChatMessage
      const messagePayload: Parameters<typeof sendChatMessage>[1] = {
        content: inputMessage.trim(),
        senderId,
        type: 'text',
      };

      if (replyToMessage) {
        messagePayload.replyTo = {
          id: replyToMessage.id,
          content: replyToMessage.content,
          senderId: replyToMessage.senderId,
        };
      }
      const success = await sendChatMessage(chatId, messagePayload);
      
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
      setReplyToMessage(null); // Clear reply context after sending
    }
  };
  
  // Format timestamp
  const formatTime = (timestamp: Date | { toDate: () => Date } | number) => {
    if (!timestamp) return '';
    
    let date: Date;
    if (typeof timestamp === 'object' && 'toDate' in timestamp) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }
    
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

  const handleSwipeReply = (message: Message) => {
    setReplyToMessage(message);
    // Close other swipeables
    Object.values(swipeableRefs.current).forEach(ref => ref?.close());
  };

  const renderLeftActions = () => {
    // Return an empty transparent view to maintain swipe functionality without visual elements
    return <View style={{ width: 70, backgroundColor: 'transparent' }} />;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const handleReplyContextTap = (originalMessageId: string) => {
    const originalMessageIndex = messages.findIndex(msg => msg.id === originalMessageId);
    if (originalMessageIndex !== -1 && flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index: originalMessageIndex,
        animated: true,
        viewPosition: 0.5, // Scroll to middle
      });
      setHighlightedMessageId(originalMessageId);
      setTimeout(() => setHighlightedMessageId(null), 1500); // Highlight for 1.5s
    } else {
      Alert.alert("Original message not found or not loaded yet.");
    }
  };

  useEffect(() => {
    // This effect is for cleaning up highlighted message state
    let timer: NodeJS.Timeout;
    if (highlightedMessageId) {
      timer = setTimeout(() => {
        setHighlightedMessageId(null);
      }, 1500); 
    }
    return () => clearTimeout(timer);
  }, [highlightedMessageId]);


  const getDisplayNameForReply = (senderId: string) => {
    return senderId === currentUser?.uid ? "You" : partnerName;
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
      <HeaderContainer style={{ marginTop: Platform.OS === 'ios' ? 10 : 0 }}>
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
              style={{ flex: 1 }}
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              extraData={highlightedMessageId} // Ensure re-render on highlight change
              renderItem={({ item }) => {
                const isCurrentUser = item.senderId === currentUser?.uid;
                const isHighlighted = item.id === highlightedMessageId;
                
                return (
                  <Swipeable
                    ref={(ref) => {
                      if (ref) swipeableRefs.current[item.id] = ref;
                    }}
                    renderLeftActions={renderLeftActions}
                    onSwipeableOpen={() => handleSwipeReply(item)}
                    overshootLeft={false} // Prevent overswiping left for reply icon
                    friction={1.5}
                  >
                    <MessageContainer 
                      isCurrentUser={isCurrentUser}
                      testID={isCurrentUser ? 'sent-message' : 'received-message'}
                    >
                      <MessageBubble isDark={isDark} isCurrentUser={isCurrentUser} isHighlighted={isHighlighted}>
                        {item.replyTo && (
                          <ReplyContextContainer
                            onPress={() => handleReplyContextTap(item.replyTo!.id)}
                            isCurrentUser={isCurrentUser}
                            isDark={isDark}
                          >
                            <ReplyContextSender isDark={isDark} isCurrentUser={isCurrentUser}>
                              {getDisplayNameForReply(item.replyTo.senderId)}
                            </ReplyContextSender>
                            <ReplyContextText isDark={isDark} isCurrentUser={isCurrentUser}>
                              {truncateText(item.replyTo.content, REPLY_PREVIEW_MAX_LENGTH)}
                            </ReplyContextText>
                          </ReplyContextContainer>
                        )}
                        <MessageText isDark={isDark} isCurrentUser={isCurrentUser}>
                          {item.content}
                        </MessageText>
                        <MessageTime isDark={isDark} isCurrentUser={isCurrentUser}>
                          {formatTime(item.createdAt)}
                        </MessageTime>
                      </MessageBubble>
                    </MessageContainer>
                  </Swipeable>
                );
              }}
              contentContainerStyle={{ paddingVertical: 16, flexGrow: 1 }}
            />
          )}
        </MessagesContainer>
        <Animated.View style={animatedReplyPanelStyle}>
            {replyToMessage && (
              <ReplyPreviewPanel isDark={isDark}>
                <ReplyPreviewContent>
                  <ReplyPreviewSender isDark={isDark}>
                    Replying to {getDisplayNameForReply(replyToMessage.senderId)}
                  </ReplyPreviewSender>
                  <ReplyPreviewText isDark={isDark}>
                    {truncateText(replyToMessage.content, REPLY_PREVIEW_MAX_LENGTH)}
                  </ReplyPreviewText>
                </ReplyPreviewContent>
                <CloseReplyButton onPress={() => setReplyToMessage(null)}>
                  <CloseReplyButtonText isDark={isDark}>✕</CloseReplyButtonText>
                </CloseReplyButton>
              </ReplyPreviewPanel>
            )}
        </Animated.View>
        <InputOuterContainer>
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
        </InputOuterContainer>
      </KeyboardAvoidingView>
    </Container>
  );
}

interface ThemeProps extends BaseThemeProps {
  isDark: boolean;
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

const HeaderContainer = styled.View<ThemeProps>`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom-width: 1px;
  border-bottom-color: ${(props: ThemeProps) => props.isDark ? '#333333' : '#EEEEEE'};
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
  isDark: boolean;
  isHighlighted?: boolean;
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
    props.isHighlighted ? (props.isDark ? '#555' : '#ddd') :
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

// Removed unused styled components for reply action

const ReplyPreviewPanel = styled.View<ThemeProps>`
  padding: 8px 16px;
  background-color: ${(props: ThemeProps) => props.isDark ? '#2A2A2A' : '#EFEFEF'};
  border-bottom-width: 1px;
  border-bottom-color: ${(props: ThemeProps) => props.isDark ? '#444444' : '#DDDDDD'};
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const ReplyPreviewContent = styled.View`
  flex: 1;
`;

const ReplyPreviewSender = styled.Text<ThemeProps>`
  font-size: 13px;
  font-weight: bold;
  color: ${(props: ThemeProps) => props.isDark ? '#BBBBBB' : '#555555'};
`;

const ReplyPreviewText = styled.Text<ThemeProps>`
  font-size: 13px;
  color: ${(props: ThemeProps) => props.isDark ? '#AAAAAA' : '#666666'};
`;

const CloseReplyButton = styled.TouchableOpacity`
  padding: 8px;
`;

const CloseReplyButtonText = styled.Text<ThemeProps>`
  font-size: 18px;
  color: ${(props: ThemeProps) => props.isDark ? '#AAAAAA' : '#666666'};
`;

const ReplyContextContainer = styled.TouchableOpacity<MessageProps>`
  background-color: ${(props: MessageProps) => props.isCurrentUser ? 'rgba(255,255,255,0.15)' : (props.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')};
  padding: 6px 10px;
  border-radius: 10px;
  margin-bottom: 6px;
  border-left-width: 3px;
  border-left-color: ${(props: MessageProps) => props.isCurrentUser ? '#FFFFFF' : '#FF6B6B'};
`;

const ReplyContextSender = styled.Text<MessageProps>`
  font-size: 12px;
  font-weight: bold;
  color: ${(props: MessageProps) => props.isCurrentUser ? '#FFFFFF' : (props.isDark ? '#DDDDDD' : '#333333')};
`;

const ReplyContextText = styled.Text<MessageProps>`
  font-size: 12px;
  color: ${(props: MessageProps) => props.isCurrentUser ? 'rgba(255,255,255,0.8)' : (props.isDark ? '#CCCCCC' : '#555555')};
`;

const InputOuterContainer = styled.View`
`; // Wrapper for input and potential reply panel

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
