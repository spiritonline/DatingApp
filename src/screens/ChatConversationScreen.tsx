// src/screens/ChatConversationScreen.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  View,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { auth } from '../services/firebase';
import { AuthStackParamList, AuthNavigationProp } from '../navigation/types';
import { useAppTheme } from '../utils/useAppTheme';
import { useImagePicker } from '../hooks/useImagePicker';
import {
  sendMessage as sendChatMessage,
  subscribeToMessages,
  markMessagesAsRead,
  toggleReactionOnMessage,
  SendMessagePayload,
  ChatServiceMessage,
} from '../services/chatService';

import {
    MessageItem,
    ReactionModal,
    AttachmentMenuModal,
    MediaViewerModal,
    EMOJI_REACTIONS_LIST,
    ChatInput, 
} from '../components/chat';

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
  PlanDateButtonText,
  MessagesContainer,
  EmptyContainer,
  EmptyText,
} from './ChatConversationScreen.styles';


const REPLY_PREVIEW_MAX_LENGTH = 70;
const REPLY_PANEL_HEIGHT = 60; // This constant might still be needed for the animation value if passed

type ChatConversationScreenRouteProp = RouteProp<AuthStackParamList, 'ChatConversation'>;

export default function ChatConversationScreen() {
  const { isDark } = useAppTheme();
  const navigation = useNavigation<AuthNavigationProp>();
  const route = useRoute<ChatConversationScreenRouteProp>();
  const { chatId, partnerName } = route.params || { chatId: '', partnerName: 'Chat' };

  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const [reactionModalVisible, setReactionModalVisible] = useState(false);
  const [selectedMessageForReaction, setSelectedMessageForReaction] = useState<UIMessage | null>(null);
  const [reactionTargetCoordinates, setReactionTargetCoordinates] = useState<{targetY: number; targetCenterX: number; messageWidth: number;} | null>(null);

  const [attachmentMenuVisible, setAttachmentMenuVisible] = useState(false);
  const [isMediaViewerVisible, setIsMediaViewerVisible] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<UIMessage | null>(null);
  
  // Add effect to ensure modal state consistency
  useEffect(() => {
    if (viewingMedia && !isMediaViewerVisible) {
      // If we have media but modal is not visible, show it
      console.log('Effect: Setting modal visible because we have media');
      setIsMediaViewerVisible(true);
    } else if (!viewingMedia && isMediaViewerVisible) {
      // If we don't have media but modal is visible, hide it
      console.log('Effect: Hiding modal because we have no media');
      setIsMediaViewerVisible(false);
    }
  }, [viewingMedia, isMediaViewerVisible]);

  const [replyToMessage, setReplyToMessage] = useState<UIMessage | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});
  const messageRefs = useRef<Record<string, (View | null)>>({});
  const currentUser = auth.currentUser;

  const replyPanelAnimHeight = useSharedValue(0);
  const replyPanelAnimOpacity = useSharedValue(0);

  const animatedReplyPanelHeightStyle = useAnimatedStyle(() => {
    return {
      height: replyPanelAnimHeight.value,
      overflow: 'hidden',
    };
  });

  const animatedReplyPanelOpacityStyle = useAnimatedStyle(() => {
    return {
      opacity: replyPanelAnimOpacity.value,
    };
  });

  useEffect(() => {
    if (!chatId || !currentUser) {
        setIsLoading(false);
        return;
    }
    markMessagesAsRead(chatId).catch(error => console.error('Error marking messages as read:', error));
    const unsubscribe = subscribeToMessages(chatId, (serviceMessages: ChatServiceMessage[]) => {
      const uiMessages: UIMessage[] = serviceMessages.map(msg => ({
        ...msg,
        createdAt: msg.createdAt.toDate(),
      }));
      setMessages(uiMessages);
      setIsLoading(false);
      if (uiMessages.length > 0 && flatListRef.current) {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });
    return unsubscribe;
  }, [chatId, currentUser]);

  useEffect(() => {
    if (replyToMessage) {
      replyPanelAnimHeight.value = withTiming(REPLY_PANEL_HEIGHT, { duration: 100, easing: Easing.out(Easing.exp) });
      replyPanelAnimOpacity.value = withTiming(1, { duration: 100, easing: Easing.out(Easing.exp) });
    } else {
      replyPanelAnimHeight.value = withTiming(0, { duration: 100, easing: Easing.in(Easing.exp) });
      replyPanelAnimOpacity.value = withTiming(0, { duration: 100, easing: Easing.in(Easing.exp) });
    }
  }, [replyToMessage, replyPanelAnimHeight, replyPanelAnimOpacity]);

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>;
    if (highlightedMessageId) {
      timerId = setTimeout(() => setHighlightedMessageId(null), 1500);
    }
    return () => { if (timerId) clearTimeout(timerId); };
  }, [highlightedMessageId]);

  const sendMessageInternal = useCallback(async () => {
    if (!inputMessage.trim() || !currentUser || !chatId) return;
    try {
      setIsSending(true);
      const messagePayload: SendMessagePayload = { content: inputMessage.trim(), type: 'text' };
      if (replyToMessage) {
        messagePayload.replyTo = { id: replyToMessage.id, content: replyToMessage.content, senderId: replyToMessage.senderId };
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
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setIsSending(false);
    }
  }, [chatId, currentUser, inputMessage, replyToMessage]);

  const formatTime = useCallback((date: Date) => !date ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), []);


  const handleSwipeReply = useCallback((message: UIMessage) => {
    setReplyToMessage(message);
    Object.values(swipeableRefs.current).forEach(ref => ref?.close());
  }, []);

  const truncateText = useCallback((text: string | undefined, maxLength: number) => !text ? '' : text.length <= maxLength ? text : text.slice(0, maxLength) + '...', []);

  const handleReplyContextTap = useCallback((originalMessageId: string) => {
    const index = messages.findIndex(msg => msg.id === originalMessageId);
    if (index !== -1 && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      setHighlightedMessageId(originalMessageId);
    } else Alert.alert("Message not found.");
  }, [messages]);

  const handleLongPressMessage = useCallback((message: UIMessage) => {
    // ... (implementation remains the same)
    if (selectedMessageForReaction) {
      setReactionModalVisible(false);
      setSelectedMessageForReaction(null);
      setReactionTargetCoordinates(null);
    } else {
      const msgRef = messageRefs.current[message.id];
      if (msgRef) {
        msgRef.measure((_x, _y, width, height, pageX, pageY) => {
          setReactionTargetCoordinates({
            targetY: pageY,
            targetCenterX: pageX + (width / 2),
            messageWidth: width,
          });
          setSelectedMessageForReaction(message);
          setReactionModalVisible(true);
        });
      } else {
        setSelectedMessageForReaction(message);
        setReactionTargetCoordinates({ targetY: Dimensions.get('window').height / 2, targetCenterX: Dimensions.get('window').width / 2, messageWidth: 200 });
        setReactionModalVisible(true);
      }
    }
  }, [selectedMessageForReaction]);

  const handleSelectReaction = useCallback(async (emoji: string) => {
    // ... (implementation remains the same)
    if (!selectedMessageForReaction || !currentUser) return;
    const msgToReact = selectedMessageForReaction;
    setReactionModalVisible(false);
    setSelectedMessageForReaction(null);
    setReactionTargetCoordinates(null);
    try {
      await toggleReactionOnMessage(chatId, msgToReact.id, emoji, currentUser.uid);
    } catch (e) { console.error("Reaction error:", e); Alert.alert("Error", "Reaction failed."); }
  }, [chatId, currentUser, selectedMessageForReaction]);

  const { pickFromGallery, pickFromCamera } = useImagePicker({
    onPickerSuccess: (result) => {
      if (result.success && result.assets.length > 0) {
        const asset = result.assets[0];
        setAttachmentMenuVisible(false);
        
        // Determine if it's an image or video based on mime type or file extension
        const normType: 'image' | 'video' = 
          asset.mime?.includes('video/') || 
          !!asset.uri?.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm)$/i) ? 'video' : 'image';
        
        // Create the media item for preview
        const items: MediaItemForPreview[] = [{
          uri: asset.uri, 
          type: normType, 
          width: asset.width, 
          height: asset.height,
          duration: asset.duration,
          fileName: asset.fileName,
        }];
        
        // Navigate to the preview screen
        navigation.navigate('MediaPreview', {
          mediaItems: items, 
          chatId,
          replyToMessage: replyToMessage ? { 
            id: replyToMessage.id, 
            content: replyToMessage.content, 
            senderId: replyToMessage.senderId 
          } : undefined
        });
      }
    },
    onPickerError: (error) => {
      console.error("Pick media error:", error);
      Alert.alert('Error', 'Failed to access media. Please try again.');
    }
  });
  
  const handlePickMedia = useCallback((type: 'gallery' | 'camera') => {
    try {
      if (type === 'gallery') {
        // For chat, we enable free-style cropping for more flexibility
        pickFromGallery('chat', {
          mediaType: 'any', // Allow both photos and videos
          cropping: true,
          freeStyleCropEnabled: true,
          cropperToolbarTitle: 'Edit Image',
          compressImageQuality: 0.8
        });
      } else {
        // For camera captures, also enable cropping
        pickFromCamera('chat', {
          mediaType: 'any',
          cropping: true,
          cropperToolbarTitle: 'Edit Capture',
          compressImageQuality: 0.8
        });
      }
    } catch (e) { 
      console.error("Pick media error:", e); 
      Alert.alert('Error', `Could not access ${type}.`); 
    }
  }, [pickFromGallery, pickFromCamera, chatId, replyToMessage]);

  const getDisplayNameForReply = useCallback((senderId: string) => senderId === currentUser?.uid ? "You" : partnerName, [currentUser?.uid, partnerName]);
  const handleViewMedia = useCallback((message: UIMessage) => {
    console.log('handleViewMedia called with message ID:', message.id);
    console.log('Current modal visibility state:', isMediaViewerVisible);
    
    // First set the media to ensure the modal has content when it appears
    setViewingMedia(message);
    console.log('Set viewing media to:', message.id);
    
    // Use requestAnimationFrame to ensure state update completes before showing modal
    requestAnimationFrame(() => {
      console.log('Setting media viewer visible in requestAnimationFrame');
      setIsMediaViewerVisible(true);
    });
  }, [isMediaViewerVisible]);
  const handleCloseReactionModal = useCallback(() => {
    setReactionModalVisible(false);
    setSelectedMessageForReaction(null);
    setReactionTargetCoordinates(null);
  }, []);

  const handleNavigateToImageViewer = useCallback((galleryItems: UIGalleryMediaItem[], initialIndex: number, galleryCaption?: string) => {
    const images = galleryItems.map((gi, idx) => ({ 
      id: `${gi.uri}-${idx}`, 
      uri: gi.uri, 
      caption: gi.caption || galleryCaption, 
      width: gi.dimensions?.width, 
      height: gi.dimensions?.height 
    }));
    navigation.navigate('ImageViewer', { images, initialIndex });
  }, [navigation]);

  const renderMessageItem = useCallback(({ item }: { item: UIMessage }) => (
    <MessageItem
      item={item}
      isCurrentUser={item.senderId === currentUser?.uid}
      isDark={isDark}
      isHighlighted={item.id === highlightedMessageId}
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
  ), [currentUser?.uid, isDark, highlightedMessageId, handleSwipeReply, handleLongPressMessage, handleReplyContextTap, formatTime, truncateText, getDisplayNameForReply, handleViewMedia, handleNavigateToImageViewer]);

  if (isLoading) {
    return <Container isDark={isDark} testID="chat-loading"><LoadingContainer><ActivityIndicator size="large" color="#FF6B6B" /></LoadingContainer></Container>;
  }

  return (
    <Container isDark={isDark} testID="chat-conversation-screen">
      <HeaderContainer isDark={isDark} style={{ marginTop: Platform.OS === 'ios' ? 10 : 0 }}>
        <BackButton onPress={() => navigation.goBack()} testID="back-button"><BackButtonText isDark={isDark}>←</BackButtonText></BackButton>
        <HeaderContent><HeaderTitle isDark={isDark}>{partnerName}</HeaderTitle></HeaderContent>
        <PlanDateButton onPress={() => {}}><PlanDateButtonText>Plan Date</PlanDateButtonText></PlanDateButton>
      </HeaderContainer>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <MessagesContainer>
          {messages.length === 0 ?
            <EmptyContainer><EmptyText isDark={isDark}>Start a conversation with {partnerName}</EmptyText></EmptyContainer> :
            <FlatList data={messages} keyExtractor={(item) => item.id} renderItem={renderMessageItem} extraData={{ highlightedMessageId, isDark }} contentContainerStyle={{ paddingVertical: 16, flexGrow: 1 }} initialNumToRender={15} maxToRenderPerBatch={10} windowSize={21} getItemLayout={(_data, index) => ({ length: 50, offset: 50 * index, index })} />
          }
        </MessagesContainer>
        
        {/* Use the ChatInput component */}
        <ChatInput
          inputMessage={inputMessage}
          onInputChange={setInputMessage}
          onSendMessage={sendMessageInternal}
          onAttachmentPress={() => setAttachmentMenuVisible(true)}
          isSending={isSending}
          isDark={isDark}
          replyToMessage={replyToMessage}
          onCancelReply={() => setReplyToMessage(null)}
          animatedReplyPanelHeightStyle={animatedReplyPanelHeightStyle}
          animatedReplyPanelOpacityStyle={animatedReplyPanelOpacityStyle}
          getDisplayNameForReply={getDisplayNameForReply}
          truncateText={truncateText}
          REPLY_PREVIEW_MAX_LENGTH={REPLY_PREVIEW_MAX_LENGTH}
        />
      </KeyboardAvoidingView>

      {reactionTargetCoordinates && (
        <ReactionModal
          isVisible={reactionModalVisible}
          onClose={handleCloseReactionModal}
          onSelectReaction={handleSelectReaction}
          reactionTargetCoordinates={reactionTargetCoordinates}
          emojiReactions={EMOJI_REACTIONS_LIST}
          isDark={isDark}
        />
      )}
      <AttachmentMenuModal
        isVisible={attachmentMenuVisible}
        isDark={isDark}
        onClose={() => setAttachmentMenuVisible(false)}
        onPickMedia={handlePickMedia}
      />
      <MediaViewerModal
        isVisible={isMediaViewerVisible}
        isDark={isDark}
        onClose={() => {
          setIsMediaViewerVisible(false);
          setViewingMedia(null);
        }}
        viewingMedia={viewingMedia}
      />
    </Container>
  );
}