import { useState, useEffect, useRef, useCallback } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { auth } from '../services/firebase';
import { AuthStackParamList, AuthNavigationProp } from '../navigation/types';
import * as ImagePicker from 'expo-image-picker';
import { useAppTheme } from '../utils/useAppTheme';
import {
  sendMessage as sendChatMessage,
  subscribeToMessages,
  markMessagesAsRead,
  isTestUser,
  cleanupTestChat,
  toggleReactionOnMessage,
  SendMessagePayload,
  ChatServiceMessage,
} from '../services/chatService';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';

import MessageItem from '../components/chat/MessageItem';
import { UIMessage, GalleryMediaItem as UIGalleryMediaItem, MediaItemForPreview } from '../types/chat';

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


const REPLY_PREVIEW_MAX_LENGTH = 70;
const REPLY_PANEL_HEIGHT = 60;

type ChatConversationScreenRouteProp = RouteProp<AuthStackParamList, 'ChatConversation'>;

export default function ChatConversationScreen() {
  // --- START OF HOOKS ---
  // All hooks MUST be called before any conditional returns.

  const { isDark } = useAppTheme();
  const navigation = useNavigation<AuthNavigationProp>();
  const route = useRoute<ChatConversationScreenRouteProp>();
  // Destructure params after navigation/route hooks
  const { chatId, partnerName } = route.params || { chatId: '', partnerName: 'Chat' }; // Provide defaults for safety

  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTestChatScreen, setIsTestChatScreen] = useState(false);

  const [reactionModalVisible, setReactionModalVisible] = useState(false);
  const [selectedMessageForReaction, setSelectedMessageForReaction] = useState<UIMessage | null>(null);
  const [reactionModalPosition, setReactionModalPosition] = useState({ x: 0, y: 0 });
  
  const [attachmentMenuVisible, setAttachmentMenuVisible] = useState(false);
  const [isMediaViewerVisible, setIsMediaViewerVisible] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<UIMessage | null>(null);

  const [replyToMessage, setReplyToMessage] = useState<UIMessage | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});
  const messageRefs = useRef<Record<string, (View | null)>>({});
  const currentUser = auth.currentUser; // This is not a hook, safe here

  const replyPanelAnimHeight = useSharedValue(0);
  const replyPanelAnimOpacity = useSharedValue(0);
  
  const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏']; // Constant, not a hook

  const animatedReplyPanelStyle = useAnimatedStyle(() => {
    return {
      height: replyPanelAnimHeight.value,
      opacity: replyPanelAnimOpacity.value,
      overflow: 'hidden',
    };
  });

  // useEffects
  useEffect(() => {
    if (!chatId || !currentUser) {
        setIsLoading(false); // Ensure loading state is cleared if prerequisites aren't met
        return;
    }

    const isTest = chatId.startsWith('testChat_');
    setIsTestChatScreen(isTest);

    markMessagesAsRead(chatId).catch(error => { // No 'void' needed, it's a promise
      console.error('Error marking messages as read:', error);
    });

    const unsubscribe = subscribeToMessages(chatId, (serviceMessages: ChatServiceMessage[]) => {
      const uiMessages: UIMessage[] = serviceMessages.map(msg => ({
        ...msg,
        createdAt: msg.createdAt.toDate(),
      }));
      setMessages(uiMessages);
      setIsLoading(false);

      if (uiMessages.length > 0 && flatListRef.current) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });

    return unsubscribe;
  }, [chatId, currentUser]); // Added currentUser to dependencies

  useEffect(() => {
    if (replyToMessage) {
      replyPanelAnimHeight.value = withTiming(REPLY_PANEL_HEIGHT, {
        duration: 100, easing: Easing.out(Easing.exp)
      });
      replyPanelAnimOpacity.value = withTiming(1, {
        duration: 100, easing: Easing.out(Easing.exp)
      });
    } else {
      replyPanelAnimHeight.value = withTiming(0, {
        duration: 100, easing: Easing.in(Easing.exp)
      });
      replyPanelAnimOpacity.value = withTiming(0, {
        duration: 100, easing: Easing.in(Easing.exp)
      });
    }
  }, [replyToMessage, replyPanelAnimHeight, replyPanelAnimOpacity]);

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;
    if (highlightedMessageId) {
      timerId = setTimeout(() => {
        setHighlightedMessageId(null);
      }, 1500);
    }
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [highlightedMessageId]);

  // useCallbacks
  const sendMessageInternal = useCallback(async () => {
    if (!inputMessage.trim() || !currentUser || !chatId) return;
    try {
      setIsSending(true);
      const messagePayload: SendMessagePayload = {
        content: inputMessage.trim(),
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
        setReplyToMessage(null);
      } else {
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'An unexpected error occurred while sending your message.');
    } finally {
      setIsSending(false);
    }
  }, [chatId, currentUser, inputMessage, replyToMessage]); // Added dependencies

  const formatTime = useCallback((date: Date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const handleCleanupTestChat = useCallback(async () => {
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
  }, [isTestChatScreen, navigation]); // Added dependencies

  const handleSwipeReply = useCallback((message: UIMessage) => {
    setReplyToMessage(message);
    Object.values(swipeableRefs.current).forEach(ref => ref?.close());
  }, []); // swipeableRefs.current is stable

  const truncateText = useCallback((text: string | undefined, maxLength: number) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  }, []);

  const handleReplyContextTap = useCallback((originalMessageId: string) => {
    const originalMessageIndex = messages.findIndex(msg => msg.id === originalMessageId);
    if (originalMessageIndex !== -1 && flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index: originalMessageIndex,
        animated: true,
        viewPosition: 0.5,
      });
      setHighlightedMessageId(originalMessageId);
    } else {
      Alert.alert("Original message not found or not loaded yet.");
    }
  }, [messages]); // flatListRef.current is stable

  const handleLongPressMessage = useCallback((message: UIMessage) => {
    if (selectedMessageForReaction !== null) {
      setReactionModalVisible(false);
      setSelectedMessageForReaction(null);
    } else {
      const messageRef = messageRefs.current[message.id];
      if (messageRef) {
        messageRef.measure((_x, _y, _width = 200, _height, pageX, pageY) => { // Provide default for _width
          setReactionModalPosition({
            x: pageX + _width / 2,
            y: Math.max(60, pageY - 50)
          });
          setSelectedMessageForReaction(message);
          setReactionModalVisible(true);
        });
      } else {
        setSelectedMessageForReaction(message);
        setReactionModalPosition({ x: 150, y: 300 });
        setReactionModalVisible(true);
      }
    }
  }, [selectedMessageForReaction]); // messageRefs.current is stable

  const handleSelectReaction = useCallback(async (emoji: string) => {
    if (!selectedMessageForReaction || !currentUser) return;
    const messageToReact = selectedMessageForReaction;
    setReactionModalVisible(false);
    setSelectedMessageForReaction(null);

    try {
      await toggleReactionOnMessage(chatId, messageToReact.id, emoji, currentUser.uid);
    } catch (error) {
      console.error("Error toggling reaction:", error);
      Alert.alert("Error", "Could not apply reaction.");
    }
  }, [chatId, currentUser, selectedMessageForReaction]); // Added dependencies

  const handlePickMedia = useCallback(async (type: 'gallery' | 'camera') => {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (type === 'camera' && cameraPermission.status !== 'granted') {
        Alert.alert('Camera Permission Required', 'Please grant camera permissions to take photos/videos.');
        return;
      }
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (type === 'gallery' && mediaLibraryPermission.status !== 'granted') {
        Alert.alert('Media Library Permission Required', 'Please grant media library permissions to select items.');
        return;
      }

      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
        videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
        allowsMultipleSelection: false,
      };
      let result: ImagePicker.ImagePickerResult;
      if (type === 'gallery') {
        result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
      } else {
        result = await ImagePicker.launchCameraAsync(pickerOptions);
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        setAttachmentMenuVisible(false);

        let normalizedType: 'image' | 'video' = 'image';
        if (selectedAsset.type === 'video' || (selectedAsset.uri?.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm)$/i))) {
            normalizedType = 'video';
        }

        const mediaItemsToPreview: MediaItemForPreview[] = [{
          uri: selectedAsset.uri,
          type: normalizedType,
          width: selectedAsset.width,
          height: selectedAsset.height,
          duration: selectedAsset.duration !== null && selectedAsset.duration !== undefined ? selectedAsset.duration / 1000 : undefined,
          fileName: selectedAsset.fileName || selectedAsset.uri.split('/').pop(),
        }];

        await new Promise(resolve => setTimeout(resolve, 100));
        navigation.navigate('MediaPreview', {
          mediaItems: mediaItemsToPreview,
          chatId,
          replyToMessage: replyToMessage ? {
            id: replyToMessage.id,
            content: replyToMessage.content,
            senderId: replyToMessage.senderId
          } : undefined
        });
      }
    } catch (error) {
      console.error("Error picking media:", error);
      Alert.alert(
        'Error',
        `Could not access ${type}. ${error instanceof Error ? error.message : 'Please check permissions.'}`
      );
    }
  }, [navigation, chatId, replyToMessage]); // Added dependencies

  const getDisplayNameForReply = useCallback((senderId: string) => {
    return senderId === currentUser?.uid ? "You" : partnerName;
  }, [currentUser?.uid, partnerName]);

  const handleViewMedia = useCallback((message: UIMessage) => {
      setViewingMedia(message);
      setIsMediaViewerVisible(true);
  }, []);

  const handleNavigateToImageViewer = useCallback((
        galleryItems: UIGalleryMediaItem[],
        initialIndex: number,
        galleryCaption?: string
    ) => {
        const imagesForViewer = galleryItems.map((gi, idx) => ({
            id: `${gi.uri}-gallery-${idx}`,
            uri: gi.uri,
            caption: gi.caption || galleryCaption || '',
            width: gi.dimensions?.width,
            height: gi.dimensions?.height,
        }));
        navigation.navigate('ImageViewer', {
            images: imagesForViewer,
            initialIndex: initialIndex,
        });
  }, [navigation]);

  const renderMessageItem = useCallback(({ item }: { item: UIMessage }) => {
    const isCurrentUser = item.senderId === currentUser?.uid;
    const isHighlighted = item.id === highlightedMessageId;

    return (
      <MessageItem
        item={item}
        isCurrentUser={isCurrentUser}
        isDark={isDark}
        isHighlighted={isHighlighted}
        REPLY_PREVIEW_MAX_LENGTH={REPLY_PREVIEW_MAX_LENGTH}
        swipeableRefs={swipeableRefs}
        messageRefs={messageRefs}
        onSwipeReply={handleSwipeReply}
        onLongPressMessage={handleLongPressMessage}
        onReplyContextTap={handleReplyContextTap}
        formatTime={formatTime}
        truncateText={truncateText}
        getDisplayNameForReply={getDisplayNameForReply}
        onViewMedia={handleViewMedia}
        onNavigateToImageViewer={handleNavigateToImageViewer}
      />
    );
  }, [
      currentUser?.uid, isDark, highlightedMessageId,
      handleSwipeReply, handleLongPressMessage, handleReplyContextTap,
      formatTime, truncateText, getDisplayNameForReply,
      handleViewMedia, handleNavigateToImageViewer,
      // swipeableRefs and messageRefs are stable refs, often not needed in deps
  ]);
  // --- END OF HOOKS ---

  // Conditional return for loading state MUST come AFTER all hook calls
  if (isLoading) {
    return (
      <Container isDark={isDark} testID="chat-conversation-screen-loading">
        <LoadingContainer>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </LoadingContainer>
      </Container>
    );
  }

  // Main component JSX
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
            onPress={() => { /* Placeholder for future date planning feature */ }}
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
              renderItem={renderMessageItem}
              extraData={{ highlightedMessageId, isDark }}
              contentContainerStyle={{ paddingVertical: 16, flexGrow: 1 }}
              initialNumToRender={15}
              maxToRenderPerBatch={10}
              windowSize={21}
              getItemLayout={(_data, index) => ( // Basic getItemLayout, adjust itemHeight as needed
                { length: 50, offset: 50 * index, index } // Assuming average item height of 50
              )}
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
                  }}
                  numberOfLines={1}
                  >
                    {getDisplayNameForReply(replyToMessage.senderId)}
                  </Text>
                  <Text style={{
                    fontSize: 13,
                    color: isDark ? '#AAAAAA' : '#666666'
                  }} numberOfLines={1} ellipsizeMode="tail">
                    {truncateText(replyToMessage.content, REPLY_PREVIEW_MAX_LENGTH)}
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
            <AttachmentButton onPress={() => setAttachmentMenuVisible(true)} testID="attachment-button" accessibilityRole="button" accessibilityLabel="Attach media">
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

      {/* Reaction Modal */}
      <Modal
        transparent
        visible={reactionModalVisible}
        onRequestClose={() => {
            setReactionModalVisible(false);
            setSelectedMessageForReaction(null);
        }}
        animationType="fade"
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onPress={() => {
            setReactionModalVisible(false);
            setSelectedMessageForReaction(null);
          }}
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
              left: reactionModalPosition.x - (EMOJI_REACTIONS.length * 40 / 2),
              backgroundColor: isDark ? '#333' : '#fff',
              zIndex: 10,
            }}
            onStartShouldSetResponder={() => true}
          >
            {EMOJI_REACTIONS.map(emoji => (
              <TouchableOpacity
                key={emoji}
                onPress={() => handleSelectReaction(emoji)}
                style={{
                  padding: 8,
                  borderRadius: 20,
                  marginHorizontal: 2,
                }}
                accessibilityLabel={`React with ${emoji}`}
                accessibilityRole="button"
              >
                <Text style={{ fontSize: 24 }} accessibilityElementsHidden={true} importantForAccessibility="no-hide-descendants">{emoji}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Attachment Menu Modal */}
      <Modal
        transparent
        visible={attachmentMenuVisible}
        onRequestClose={() => setAttachmentMenuVisible(false)}
        animationType="slide"
      >
        <AttachmentMenuOverlay onPress={() => setAttachmentMenuVisible(false)}>
          <View onStartShouldSetResponder={() => true} style={{ width: '100%' }}>
            <AttachmentMenuContent isDark={isDark}>
              <AttachmentMenuButton onPress={() => handlePickMedia('camera')}>
                <AttachmentMenuButtonText isDark={isDark}>Take Photo or Video</AttachmentMenuButtonText>
              </AttachmentMenuButton>
              <AttachmentMenuButton onPress={() => handlePickMedia('gallery')}>
                <AttachmentMenuButtonText isDark={isDark}>Choose from Gallery</AttachmentMenuButtonText>
              </AttachmentMenuButton>
              <AttachmentMenuButton onPress={() => setAttachmentMenuVisible(false)} style={{ marginTop: 10 }}>
                <AttachmentMenuButtonText isDark={isDark} style={{ color: 'red' }}>Cancel</AttachmentMenuButtonText>
              </AttachmentMenuButton>
            </AttachmentMenuContent>
          </View>
        </AttachmentMenuOverlay>
      </Modal>

      {/* Media Viewer Modal */}
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
            {viewingMedia.type === 'image' && viewingMedia.mediaUrl && (
              <Image
                source={{ uri: viewingMedia.mediaUrl }}
                style={{ flex: 1, width: '100%' }}
                contentFit="contain"
                accessibilityLabel={viewingMedia.caption || "Full screen image"}
              />
            )}
            {viewingMedia.type === 'video' && viewingMedia.mediaUrl && (
              <Video
                source={{ uri: viewingMedia.mediaUrl }}
                style={{ flex: 1, width: '100%' }}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                accessibilityLabel={viewingMedia.caption || "Full screen video"}
              />
            )}
            {viewingMedia.caption && (
                <MediaCaptionText isDark={isDark}>{viewingMedia.caption}</MediaCaptionText>
            )}
          </MediaViewerContainer>
        </Modal>
      )}
    </Container>
  );
}