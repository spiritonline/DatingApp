// src/components/chat/AttachmentMenuModal.tsx
import React from 'react';
import { Modal, View, Platform } from 'react-native';
import {
  AttachmentMenuOverlay,
  AttachmentMenuContent,
  AttachmentMenuButton,
  AttachmentMenuButtonText,
} from '../../screens/ChatConversationScreen.styles'; // Re-using styles

interface AttachmentMenuModalProps {
  isVisible: boolean;
  onClose: () => void;
  onPickMedia: (type: 'gallery' | 'camera') => void;
  isDark: boolean;
}

const AttachmentMenuModal: React.FC<AttachmentMenuModalProps> = ({
  isVisible,
  onClose,
  onPickMedia,
  isDark,
}) => {
  return (
    <Modal
      transparent
      visible={isVisible}
      onRequestClose={onClose}
      animationType="slide"
    >
      <AttachmentMenuOverlay onPress={onClose}>
        {/* This View prevents touches on the content from closing the modal */}
        <View onStartShouldSetResponder={() => true} style={{ width: '100%' }}>
            <AttachmentMenuContent isDark={isDark} style={{ paddingBottom: Platform.OS === 'ios' ? 30 : 16 }}>
            <AttachmentMenuButton onPress={() => onPickMedia('camera')}>
                <AttachmentMenuButtonText isDark={isDark}>Take Photo or Video</AttachmentMenuButtonText>
            </AttachmentMenuButton>
            <AttachmentMenuButton onPress={() => onPickMedia('gallery')}>
                <AttachmentMenuButtonText isDark={isDark}>Choose from Gallery</AttachmentMenuButtonText>
            </AttachmentMenuButton>
            <AttachmentMenuButton onPress={onClose} style={{ marginTop: 10 }}>
                <AttachmentMenuButtonText isDark={isDark} style={{ color: 'red' }}>
                Cancel
                </AttachmentMenuButtonText>
            </AttachmentMenuButton>
            </AttachmentMenuContent>
        </View>
      </AttachmentMenuOverlay>
    </Modal>
  );
};

export default React.memo(AttachmentMenuModal);