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
  if (!viewingMedia) {
    return null; // Or some fallback if it can be visible without media (should not happen)
  }

  return (
    <Modal
      visible={isVisible}
      transparent={false} // Full screen
      onRequestClose={onClose}
      animationType="fade"
    >
      <MediaViewerContainer isDark={isDark}>
        <CloseButton onPress={onClose} testID="close-media-viewer-button">
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