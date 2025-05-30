// src/components/chat/MediaViewerModal.tsx
import React from 'react';
import { Modal, View } from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { UIMessage } from '../../types/chat'; // For viewingMedia type
import {
  MediaViewerContainer,
  CloseButton,
  CloseButtonText,
  MediaCaptionText,
} from '../../screens/ChatConversationScreen.styles'; // Re-using styles

interface MediaViewerModalProps {
  isVisible: boolean;
  onClose: () => void;
  viewingMedia: UIMessage | null; // Message containing media info
  isDark: boolean;
}

const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  isVisible,
  onClose,
  viewingMedia,
  isDark,
}) => {
  console.log('MediaViewerModal rendering with:', { 
    isVisible, 
    hasMedia: !!viewingMedia,
    mediaType: viewingMedia?.type,
    mediaUrl: viewingMedia?.mediaUrl,
    content: viewingMedia?.content
  });

  // Early return if modal shouldn't be visible
  if (!isVisible) {
    return null;
  }

  // Return a placeholder if somehow media is missing
  if (!viewingMedia) {
    console.log('Warning: MediaViewerModal visible but no viewingMedia provided');
    return (
      <Modal visible={true} transparent={false} onRequestClose={onClose} animationType="fade">
        <MediaViewerContainer isDark={isDark}>
          <CloseButton onPress={onClose} testID="close-media-viewer-button">
            <CloseButtonText isDark={isDark}>✕</CloseButtonText>
          </CloseButton>
          <MediaCaptionText isDark={isDark}>No media content available</MediaCaptionText>
        </MediaViewerContainer>
      </Modal>
    );
  }

  return (
    <Modal
      visible={true}
      transparent={false} // Full screen
      onRequestClose={onClose}
      animationType="fade"
    >
      <MediaViewerContainer isDark={isDark}>
        <CloseButton onPress={onClose} testID="close-media-viewer-button">
          <CloseButtonText isDark={isDark}>✕</CloseButtonText>
        </CloseButton>

        {viewingMedia.type === 'image' && (viewingMedia.mediaUrl || viewingMedia.content) && (
          <Image
            source={{ uri: viewingMedia.mediaUrl || viewingMedia.content || '' }}
            style={{ flex: 1, width: '100%' }}
            contentFit="contain"
            accessibilityLabel={viewingMedia.caption || "Full screen image"}
          />
        )}
        {viewingMedia.type === 'video' && (viewingMedia.mediaUrl || viewingMedia.content) && (
          <Video
            source={{ uri: viewingMedia.mediaUrl || viewingMedia.content || '' }}
            style={{ flex: 1, width: '100%' }}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping={false} // Typically don't loop previews unless specified
            accessibilityLabel={viewingMedia.caption || "Full screen video"}
          />
        )}
        {viewingMedia.caption && (
            <MediaCaptionText isDark={isDark}>{viewingMedia.caption}</MediaCaptionText>
        )}
      </MediaViewerContainer>
    </Modal>
  );
};

export default React.memo(MediaViewerModal);