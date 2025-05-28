// src/components/chat/ReactionModal.tsx
import React from 'react';
import { Modal, Pressable, TouchableOpacity, Text, View, StyleSheet, Dimensions, Platform, StatusBar } from 'react-native';
import Animated from 'react-native-reanimated';

interface ReactionTargetCoordinates {
  targetY: number;
  targetCenterX: number;
  messageWidth: number;
}

interface ReactionModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectReaction: (emoji: string) => void;
  reactionTargetCoordinates: ReactionTargetCoordinates | null;
  emojiReactions: string[];
  isDark: boolean;
}

export const EMOJI_REACTIONS_LIST = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const EMOJI_SIZE = 24;
const EMOJI_HORIZONTAL_PADDING = 8;
const EMOJI_VERTICAL_PADDING = 4; // Define vertical padding for emoji button
const EMOJI_MARGIN_HORIZONTAL = 3;
const MODAL_INTERNAL_PADDING = 8;

const ReactionModal: React.FC<ReactionModalProps> = ({
  isVisible,
  onClose,
  onSelectReaction,
  reactionTargetCoordinates,
  emojiReactions,
  isDark,
}) => {
  if (!isVisible || !reactionTargetCoordinates) {
    return null;
  }

  const emojiButtonWidth = EMOJI_SIZE + (EMOJI_HORIZONTAL_PADDING * 2) + (EMOJI_MARGIN_HORIZONTAL * 2);
  const emojisStripWidth = emojiButtonWidth * emojiReactions.length;
  const modalContentWidth = emojisStripWidth + (MODAL_INTERNAL_PADDING * 2);
  const modalHeight = EMOJI_SIZE + (EMOJI_VERTICAL_PADDING * 2) + (MODAL_INTERNAL_PADDING * 2) + 10; // Use vertical padding

  const desiredTop = reactionTargetCoordinates.targetY - modalHeight - 5;
  const desiredLeft = reactionTargetCoordinates.targetCenterX - (modalContentWidth / 2);

  const screenWidth = Dimensions.get('window').width;
  const statusBarHeightForCalc = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;
  const safeTopPadding = Platform.OS === 'ios' ? 40 : 10 + statusBarHeightForCalc;
  
  const boundedLeft = Math.max(
    5,
    Math.min(desiredLeft, screenWidth - modalContentWidth - 5)
  );
  const boundedTop = Math.max(safeTopPadding, desiredTop);

  return (
    <Modal
      transparent
      visible={isVisible}
      onRequestClose={onClose}
      animationType="fade"
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
      >
        <View onStartShouldSetResponder={() => true}>
          <Animated.View
            style={[
              styles.modalContainer,
              {
                top: boundedTop,
                left: boundedLeft,
                backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
              }
            ]}
          >
            {emojiReactions.map(emoji => (
              <TouchableOpacity
                key={emoji}
                onPress={() => onSelectReaction(emoji)}
                style={styles.emojiButton}
                accessibilityLabel={`React with ${emoji}`}
                accessibilityRole="button"
              >
                <Text style={styles.emojiText} accessibilityElementsHidden={true} importantForAccessibility="no-hide-descendants">
                    {emoji}
                </Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalContainer: {
    position: 'absolute',
    flexDirection: 'row',
    padding: MODAL_INTERNAL_PADDING,
    borderRadius: 25,
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    alignItems: 'center',
  },
  emojiButton: {
    paddingHorizontal: EMOJI_HORIZONTAL_PADDING,
    paddingVertical: EMOJI_VERTICAL_PADDING, // Use defined vertical padding
    marginHorizontal: EMOJI_MARGIN_HORIZONTAL,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: EMOJI_SIZE,
  },
});

export default React.memo(ReactionModal);