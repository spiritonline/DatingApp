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
  Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Swipeable, TouchableOpacity as GestureTouchableOpacity } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { auth } from '../services/firebase';
import { AuthStackParamList, AuthNavigationProp } from '../navigation/types';
import * as ImagePicker from 'expo-image-picker';
// Removed styled-components import from here
import { useAppTheme } from '../utils/useAppTheme';
import {
  sendMessage as sendChatMessage,
  subscribeToMessages,
  markMessagesAsRead,
  isTestUser,
  cleanupTestChat,
  toggleReactionOnMessage,
  ChatMessage as ChatServiceMessageType,
} from '../services/chatService';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import ImageMessageThumbnail from '../components/ImageMessageThumbnail';

// Import styled components from the new styles file
import {
  Container,
  LoadingContainer,
  HeaderContainer,
  HeaderContent,
  BackButton,
  BackButtonText,
  HeaderTitle,
  PlanDateButton,
  CleanupButton,
  CleanupButtonText,
  TestChatBadge,
  TestChatBadgeText,
  PlanDateButtonText,
  MessagesContainer,
  EmptyContainer,
  EmptyText,
  MessageContainer,
  MessageBubble,
  StyledImage,
  VideoPreviewContainer,
  PlayIconOverlay,
  PlayIconText,
  MessageText,
  CaptionText,
  GalleryGridContainer,
  GalleryItemTouchable,
  GalleryThumbnailImage,
  VideoIconText,
  MoreItemsOverlay,
  MoreItemsText,
  MessageTime,
  ReplyContextContainer,
  ReplyContextSender,
  ReplyContextText,
  ReactionsContainer,
  ReactionPill,
  ReactionEmoji,
  ReactionCount,
  InputOuterContainer,
  InputContainer,
  AttachmentButton,
  AttachmentIcon,
  MessageInput,
  SendButton,
  SendButtonText,
  AttachmentMenuOverlay,
  AttachmentMenuContent,
  AttachmentMenuButton,
  AttachmentMenuButtonText,
  MediaViewerContainer,
  CloseButton,
  CloseButtonText,
  MediaCaptionText
} from './ChatConversationScreen.styles';


// Constants
const REPLY_PREVIEW_MAX_LENGTH = 70;
const REPLY_PANEL_HEIGHT = 60;

type ChatConversationScreenRouteProp = RouteProp<AuthStackParamList, 'ChatConversation'>;

export interface MediaItem {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  duration?: number;
  fileName?: string;
};

export interface GalleryMediaItem {
  url: string;
  uri: string; 
  type: string;
  width?: number;
  height?: number;
  duration?: number;
  fileName?: string;
  thumbnailUrl?: string;
  caption?: string;
  dimensions?: {
    width: number;
    height: number;
  };
};

interface Message extends Omit<ChatServiceMessageType, 'createdAt'> { 
  id: string;
  senderId: string;
  createdAt: Date | { toDate: () => Date }; 
}

export default function ChatConversationScreen() {
  const { isDark } = useAppTheme();
  const navigation = useNavigation<AuthNavigationProp>();
  const route = useRoute<ChatConversationScreenRouteProp>();
  const { chatId, partnerName } = route.params;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTestChatScreen, setIsTestChatScreen] = useState(false);

  const [reactionModalVisible, setReactionModalVisible] = useState(false);
  const [selectedMessageForReaction, setSelectedMessageForReaction] = useState<Message | null>(null);
  const [reactionModalPosition, setReactionModalPosition] = useState({ x: 0, y: 0 });
  const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  const [attachmentMenuVisible, setAttachmentMenuVisible] = useState(false);
  const [isMediaViewerVisible, setIsMediaViewerVisible] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<Message | null>(null);

  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});
  const messageRefs = useRef<Record<string, (View | null)>>({});
  const currentUser = auth.currentUser;

  const replyPanelAnimHeight = useSharedValue(0);
  const replyPanelAnimOpacity = useSharedValue(0);

  const animatedReplyPanelStyle = useAnimatedStyle(() => {
    return {
      height: replyPanelAnimHeight.value,
      opacity: replyPanelAnimOpacity.value,
      overflow: 'hidden',
    };
  });

  useEffect(() => {
    if (!chatId || !currentUser) return;
    
    const isTest = chatId.startsWith('testChat_');
    setIsTestChatScreen(isTest);
    
    void markMessagesAsRead(chatId).catch(error => {
      console.error('Error marking messages as read:', error);
    });
    
    const unsubscribe = subscribeToMessages(chatId, (chatMessages) => {
      const formattedMessages = chatMessages.map(msg => ({
        ...msg
      } as Message));
      setMessages(formattedMessages);
      setIsLoading(false);
      
      if (chatMessages.length > 0 && flatListRef.current) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });
    
    return unsubscribe;
  }, [chatId, currentUser]);

  useEffect(() => {
    if (replyToMessage) {
      replyPanelAnimHeight.value = withTiming(REPLY_PANEL_HEIGHT, { 
        duration: 100, 
        easing: Easing.out(Easing.exp) 
      });
      replyPanelAnimOpacity.value = withTiming(1, { 
        duration: 100,
        easing: Easing.out(Easing.exp)
      });
    } else {
      replyPanelAnimHeight.value = withTiming(0, { 
        duration: 100, 
        easing: Easing.in(Easing.exp) 
      });
      replyPanelAnimOpacity.value = withTiming(0, { 
        duration: 100,
        easing: Easing.in(Easing.exp)
      });
    }
  }, [replyToMessage, replyPanelAnimHeight, replyPanelAnimOpacity]);

  const sendMessageInternal = async () => { 
    if (!inputMessage.trim() || !currentUser || !chatId) return;
    const senderId = currentUser.uid;
    try {
      setIsSending(true);
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
      setReplyToMessage(null);
    }
  };
  
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
  
  const handleCleanupTestChat = async () => {
    if (!isTestChatScreen) return;
    Alert.alert(
      'Clean Test Chat',
      'Are you sure you want to delete all messages in this test chat?',
      [{ text: 'Cancel', style: 'cancel' },
       { text: 'Delete', style: 'destructive', onPress: async () => {
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
    Object.values(swipeableRefs.current).forEach(ref => ref?.close());
  };

  const renderLeftActions = () => {
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
        viewPosition: 0.5, 
      });
      setHighlightedMessageId(originalMessageId);
      setTimeout(() => setHighlightedMessageId(null), 1500); 
    } else {
      Alert.alert("Original message not found or not loaded yet.");
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (highlightedMessageId) {
      timer = setTimeout(() => {
        setHighlightedMessageId(null);
      }, 1500); 
    }
    return () => clearTimeout(timer);
  }, [highlightedMessageId]);

  const handleLongPressMessage = (_message: Message) => {
    if (selectedMessageForReaction !== null) {
      setReactionModalVisible(false);
      setSelectedMessageForReaction(null);
    } else {
      const messageRef = messageRefs.current[_message.id];
      if (messageRef) {
        messageRef.measure((x, y, width, height, pageX, pageY) => {
          const displayWidth = width || 200; 
          setReactionModalPosition({
            x: pageX + displayWidth / 2, 
            y: Math.max(60, pageY - 50) 
          });
          setSelectedMessageForReaction(_message);
          setReactionModalVisible(true);
        });
      } else {
        setSelectedMessageForReaction(_message);
        setReactionModalVisible(true);
      }
    }
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

  const _requestPermissions = async () => {
    try {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaLibraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || mediaLibraryStatus !== 'granted') {
        Alert.alert(
          'Permissions Required', 
          'Camera and media library permissions are required to send photos and videos.'
        );
        return false;
      }
      return true;
    } catch (error) {
      Alert.alert('Error', 'Failed to request permissions');
      return false;
    }
  };

  const handlePickMedia = async (type: 'gallery' | 'camera') => {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (type === 'camera' && cameraPermission.status !== 'granted') {
        Alert.alert('Camera Permission Required', 'Please grant camera permissions to take photos.');
        return;
      }
      if (type === 'gallery' && mediaLibraryPermission.status !== 'granted') {
        Alert.alert('Media Library Permission Required', 'Please grant media library permissions to select photos.');
        return;
      }
      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.All, 
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: false 
      };
      let result: ImagePicker.ImagePickerResult;
      if (type === 'gallery') {
        result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
      } else {
        result = await ImagePicker.launchCameraAsync(pickerOptions);
      }
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedItem = result.assets[0]; 
        setAttachmentMenuVisible(false);
        
        let normalizedType: 'image' | 'video';
        if (selectedItem.type === 'video' || (selectedItem.uri?.match(/\.(mp4|mov)$/i))) {
          normalizedType = 'video';
        } else {
          normalizedType = 'image';
        }
        
        const mediaItems = [{
          uri: selectedItem.uri,
          type: normalizedType,
          width: selectedItem.width || 0,
          height: selectedItem.height || 0,
          duration: selectedItem.duration !== null ? selectedItem.duration : undefined,
        }];
        
        await new Promise(resolve => setTimeout(resolve, 100));
        navigation.navigate('MediaPreview', {
          mediaItems,
          chatId,
          replyToMessage
        });
      }
    } catch (error) {
      Alert.alert(
        'Error', 
        `Could not access ${type.startsWith('camera') ? 'camera' : 'gallery'}.\n\n` +
        `${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
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
          testID="back-button"
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
            testID="cleanup-test-chat"
          >
            <CleanupButtonText>Reset Chat</CleanupButtonText>
          </CleanupButton>
        ) : (
          <PlanDateButton
            onPress={() => {}}
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
              extraData={highlightedMessageId} 
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
                    overshootLeft={false} 
                    friction={1.5}
                  >
                    <GestureTouchableOpacity
                      onLongPress={() => handleLongPressMessage(item)}
                      delayLongPress={300}
                      activeOpacity={0.8}
                    >
                      <View 
                          ref={(ref) => { 
                            if (ref) messageRefs.current[item.id] = ref; 
                          }}
                        >
                        <MessageContainer 
                          isCurrentUser={isCurrentUser}
                          isDark={isDark}
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
                            {item.mediaType === 'image' && item.mediaUrl ? (
                              <ImageMessageThumbnail
                                id={item.id}
                                uri={item.mediaUrl}
                                caption={item.caption}
                                dimensions={item.dimensions}
                                isDark={isDark}
                                isCurrentUser={isCurrentUser}
                              />
                            ) : item.mediaType === 'video' && (item.mediaUrl || item.thumbnailUrl) ? (
                              <TouchableOpacity onPress={() => { setViewingMedia(item); setIsMediaViewerVisible(true); }}>
                                <VideoPreviewContainer isDark={isDark} isCurrentUser={isCurrentUser}>
                                  <StyledImage 
                                    source={{ uri: item.thumbnailUrl || item.mediaUrl }} 
                                    isDark={isDark} 
                                    isCurrentUser={isCurrentUser} 
                                    contentFit="cover"
                                  />
                                  <PlayIconOverlay>
                                    <PlayIconText>▶</PlayIconText>
                                  </PlayIconOverlay>
                                </VideoPreviewContainer>
                                {item.caption && <CaptionText isDark={isDark} isCurrentUser={isCurrentUser}>{item.caption}</CaptionText>}
                              </TouchableOpacity>
                            ) : (
                              <MessageText isDark={isDark} isCurrentUser={isCurrentUser}>
                                {item.content}
                              </MessageText>
                            )}
                            {item.type === 'gallery' && (item as any).galleryItems && (item as any).galleryItems.length > 0 && (
                              <View>
                                {(item as any).galleryCaption && (
                                  <CaptionText isDark={isDark} isCurrentUser={isCurrentUser} style={{ marginBottom: 8 }}>
                                    {(item as any).galleryCaption}
                                  </CaptionText>
                                )}
                                <GalleryGridContainer>
                                  {(item as any).galleryItems.slice(0, 4).map((galleryItem: GalleryMediaItem, index: number) => (
                                    <GalleryItemTouchable
                                      key={index}
                                      onPress={() => {
                                        const imagesForViewer = (item as any).galleryItems!.map((gi: GalleryMediaItem, idx: number) => ({
                                          id: `${item.id}-gallery-${idx}`,
                                          uri: gi.uri,
                                          caption: gi.caption || (item as any).galleryCaption || '',
                                          width: gi.dimensions?.width || undefined,
                                          height: gi.dimensions?.height || undefined,
                                        }));
                                        navigation.navigate('ImageViewer', {
                                          images: imagesForViewer,
                                          initialIndex: index,
                                        });
                                      }}
                                    >
                                      <GalleryThumbnailImage source={{ uri: galleryItem.thumbnailUrl || galleryItem.uri }} contentFit="cover" />
                                      {galleryItem.type === 'video' && <VideoIconText>▶️</VideoIconText>}
                                      {(item as any).galleryItems!.length > 4 && index === 3 && (
                                        <MoreItemsOverlay>
                                          <MoreItemsText>+{(item as any).galleryItems!.length - 4}</MoreItemsText>
                                        </MoreItemsOverlay>
                                      )}
                                    </GalleryItemTouchable>
                                  ))}
                                </GalleryGridContainer>
                              </View>
                            )}
                            <MessageTime isDark={isDark} isCurrentUser={isCurrentUser}>
                              {formatTime(item.createdAt)}
                            </MessageTime>
                            {item.reactions && Object.keys(item.reactions).length > 0 && (
                              <ReactionsContainer>
                                {Object.entries(item.reactions || {}).map(([emoji, userIds]) => {
                                  const users = Array.isArray(userIds) ? userIds : [];
                                  return users.length > 0 ? (
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
            <AttachmentButton onPress={() => setAttachmentMenuVisible(true)} testID="attachment-button">
              <AttachmentIcon isDark={isDark}>📎</AttachmentIcon>
            </AttachmentButton>
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
            onPress={sendMessageInternal} 
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
            backgroundColor: 'rgba(0, 0, 0, 0.5)' 
          }} 
          onPress={() => setReactionModalVisible(false)}
        >
          <Animated.View 
            style={{
              position: 'absolute',
              flexDirection: 'row',
              padding: 8,
              borderRadius: 20,
              elevation: 5,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              top: reactionModalPosition.y,
              left: reactionModalPosition.x - 150, 
              backgroundColor: isDark ? '#333' : '#fff',
              zIndex: 9999 
            }}
          >
            {EMOJI_REACTIONS.map(emoji => (
              <TouchableOpacity 
                key={emoji} 
                onPress={() => handleSelectReaction(emoji)} 
                style={{ 
                  padding: 8,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  borderRadius: 20,
                  marginHorizontal: 2
                }}
              >
                <Text style={{ fontSize: 24 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={attachmentMenuVisible}
        onRequestClose={() => setAttachmentMenuVisible(false)}
        animationType="slide"
      >
        <AttachmentMenuOverlay onPress={() => setAttachmentMenuVisible(false)}>
          <AttachmentMenuContent isDark={isDark}>
            <AttachmentMenuButton onPress={() => handlePickMedia('camera')}>
              <AttachmentMenuButtonText isDark={isDark}>Take Photo</AttachmentMenuButtonText>
            </AttachmentMenuButton>
            <AttachmentMenuButton onPress={() => handlePickMedia('gallery')}>
              <AttachmentMenuButtonText isDark={isDark}>Choose from Gallery</AttachmentMenuButtonText>
            </AttachmentMenuButton>
            <AttachmentMenuButton onPress={() => setAttachmentMenuVisible(false)} style={{ marginTop: 10 }}>
              <AttachmentMenuButtonText isDark={isDark} style={{ color: 'red' }}>Cancel</AttachmentMenuButtonText>
            </AttachmentMenuButton>
          </AttachmentMenuContent>
        </AttachmentMenuOverlay>
      </Modal>

      {viewingMedia && (
        <Modal
          visible={isMediaViewerVisible}
          transparent={false}
          onRequestClose={() => setIsMediaViewerVisible(false)}
          animationType="fade"
        >
          <MediaViewerContainer isDark={isDark}>
            <CloseButton onPress={() => setIsMediaViewerVisible(false)}>
              <CloseButtonText isDark={isDark}>✕</CloseButtonText>
            </CloseButton>
            {viewingMedia.mediaType === 'image' && viewingMedia.mediaUrl && (
              <Image
                source={{ uri: viewingMedia.mediaUrl }}
                style={{ flex: 1, width: '100%' }}
                contentFit="contain"
              />
            )}
            {viewingMedia.mediaType === 'video' && viewingMedia.mediaUrl && (
              <Video
                source={{ uri: viewingMedia.mediaUrl }}
                style={{ flex: 1, width: '100%' }}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
              />
            )}
            {viewingMedia.caption && <MediaCaptionText isDark={isDark}>{viewingMedia.caption}</MediaCaptionText>}
          </MediaViewerContainer>
        </Modal>
      )}
    </Container>
  );
}

// Styled components are now imported from ChatConversationScreen.styles.ts