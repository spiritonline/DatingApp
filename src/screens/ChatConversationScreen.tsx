import { useState, useEffect, useRef } from 'react';
import { 
  FlatList, 
  TouchableOpacity, 
  Text, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator,
  Alert,
  View,
  Modal,
  Pressable,
  GestureResponderEvent
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Swipeable, TouchableOpacity as GestureTouchableOpacity } from 'react-native-gesture-handler';
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
  cleanupTestChat,
  toggleReactionOnMessage,
  ChatMessage as ChatServiceMessage, // Renaming to avoid conflict
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
  reactions?: Record<string, string[]>; // emoji: [userId1, userId2]
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
  
  // Reaction state
  const [reactionModalVisible, setReactionModalVisible] = useState(false);
  const [selectedMessageForReaction, setSelectedMessageForReaction] = useState<Message | null>(null);
  const [reactionModalPosition, setReactionModalPosition] = useState({ x: 0, y: 0 });
  const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});
  // Using MutableRefObject to avoid type errors with refs
  const messageRefs = useRef<Record<string, View | null>>({});
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
      const formattedMessages = chatMessages.map(msg => ({
        ...msg
      } as Message));
      setMessages(formattedMessages);
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

  const handleLongPressMessage = (message: Message, event?: GestureResponderEvent) => {
    // Add safety check for event parameter
    if (!event || !event.nativeEvent) {
      // Default position if event is not available
      setReactionModalPosition({ x: 0, y: 250 });
      setSelectedMessageForReaction(message);
      setReactionModalVisible(true);
      return;
    }
    
    const { pageY } = event.nativeEvent;
    // Try to get message position using its ref for more accuracy if available
    const messageView = messageRefs.current[message.id];
    if (messageView) {
      messageView.measure((_x, _y, _width, _height, _pageX, pageYOnScreen) => {
        setReactionModalPosition({ x: 0, y: pageYOnScreen - 70 }); // Position above the message
      });
    } else {
      setReactionModalPosition({ x: 0, y: pageY - 100 }); // Fallback using event Y
    }

    setSelectedMessageForReaction(message);
    setReactionModalVisible(true);
    // Optional: Haptic feedback
    // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleSelectReaction = async (emoji: string) => {
    if (!selectedMessageForReaction || !currentUser) return;
    setReactionModalVisible(false);
    try {
      await toggleReactionOnMessage(chatId, selectedMessageForReaction.id, emoji, currentUser.uid);
    } catch (error) {
      console.error("Error toggling reaction:", error);
      Alert.alert("Error", "Could not apply reaction.");
    }
    setSelectedMessageForReaction(null);
  };



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
                      swipeableRefs.current[item.id] = ref;
                    }}
                    renderLeftActions={renderLeftActions}
                    onSwipeableOpen={() => handleSwipeReply(item)}
                    overshootLeft={false} // Prevent overswiping left for reply icon
                    friction={1.5}
                  >
                    <GestureTouchableOpacity
                      // Using type assertion to fix the TypeScript error
                      onLongPress={((event?: GestureResponderEvent) => {
                        handleLongPressMessage(item, event);
                      }) as unknown as ((event: GestureResponderEvent) => void) & (() => void)}
                      delayLongPress={300}
                      activeOpacity={0.8}
                    >
                      <View 
                        // Simply assign the ref without returning anything
                        ref={(ref: View | null) => { 
                          if (ref) messageRefs.current[item.id] = ref; 
                        }}>
                      
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
                            {item.reactions && Object.keys(item.reactions).length > 0 && (
                              <ReactionsContainer>
                                {Object.entries(item.reactions || {}).map(([emoji, userIds]) => {
                                  // Properly type userIds as string[] to avoid 'unknown' type errors
                                  const users = userIds as string[];
                                  return users && users.length > 0 ? (
                                    <ReactionPill key={emoji}>
                                      <ReactionEmoji>{emoji}</ReactionEmoji>
                                      <ReactionCount>{users.length}</ReactionCount>
                                    </ReactionPill>
                                  ) : null;
                                })}
                              </ReactionsContainer>
                            )}
                          </MessageBubble>
                        </MessageContainer>
                      </View>
                    </GestureTouchableOpacity>
                  </Swipeable>
                );
              }}
              contentContainerStyle={{ paddingVertical: 16, flexGrow: 1 }}
            />
          )}
        </MessagesContainer>
        <Animated.View style={animatedReplyPanelStyle}>
            {replyToMessage && (
              <View style={{ 
                padding: 8, 
                backgroundColor: isDark ? '#2A2A2A' : '#EFEFEF',
                borderBottomWidth: 1,
                borderBottomColor: isDark ? '#444444' : '#DDDDDD',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ 
                    fontSize: 13, 
                    fontWeight: 'bold', 
                    color: isDark ? '#BBBBBB' : '#555555'
                  }}>
                    {replyToMessage ? getDisplayNameForReply(replyToMessage.senderId) : ''}
                  </Text>
                  <Text style={{ 
                    fontSize: 13, 
                    color: isDark ? '#AAAAAA' : '#666666'
                  }}>
                    {replyToMessage ? truncateText(replyToMessage.content, REPLY_PREVIEW_MAX_LENGTH) : ''}
                  </Text>
                </View>
                <TouchableOpacity style={{ padding: 8 }} onPress={() => setReplyToMessage(null)}>
                  <Text style={{ 
                    fontSize: 18, 
                    color: isDark ? '#AAAAAA' : '#666666'
                  }}>×</Text>
                </TouchableOpacity>
              </View>
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

      <Modal
        transparent
        visible={reactionModalVisible}
        onRequestClose={() => setReactionModalVisible(false)}
        animationType="fade"
      >
        <Pressable 
          style={{ 
            flex: 1, 
            backgroundColor: 'rgba(0,0,0,0.1)' 
          }} 
          onPress={() => setReactionModalVisible(false)}
        >
          <Animated.View 
            style={{
              position: 'absolute',
              flexDirection: 'row',
              padding: 8,
              borderRadius: 20,
              alignSelf: 'center',
              elevation: 5,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              top: reactionModalPosition.y, 
              backgroundColor: isDark ? '#333' : '#fff'
            }}
          >
            {EMOJI_REACTIONS.map(emoji => (
              <TouchableOpacity 
                key={emoji} 
                onPress={() => handleSelectReaction(emoji)} 
                style={{ padding: 8 }}
              >
                <Text style={{ fontSize: 24 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </Pressable>
      </Modal>
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

const ReactionsContainer = styled.View`
  flex-direction: row;
  margin-top: 8px;
  align-self: flex-start; /* For received messages */
  /* For sent messages, this will be overridden by MessageContainer align-items: flex-end */
`;

const ReactionPill = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  padding: 2px 6px;
  margin-right: 4px;
`;

const ReactionEmoji = styled.Text`
  font-size: 12px;
`;

const ReactionCount = styled.Text`
  font-size: 12px;
  margin-left: 3px;
  color: #555;
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
