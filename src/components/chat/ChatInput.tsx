// src/components/chat/ChatInput.tsx
import React from 'react';
import { View, Text, TouchableOpacity, TextInput, Platform } from 'react-native';
import Animated from 'react-native-reanimated';
import { UIMessage } from '../../types/chat'; // For replyToMessage type
import {
  InputOuterContainer,
  InputContainer,
  AttachmentButton,
  AttachmentIcon,
  MessageInput,
  SendButton,
  SendButtonText,
} from '../../screens/ChatConversationScreen.styles'; // Re-use styles or create new specific ones

interface ChatInputProps {
  inputMessage: string;
  onInputChange: (text: string) => void;
  onSendMessage: () => void;
  onAttachmentPress: () => void;
  isSending: boolean;
  isDark: boolean;
  replyToMessage: UIMessage | null;
  onCancelReply: () => void;
  animatedReplyPanelStyle: any; // Style from useAnimatedStyle
  getDisplayNameForReply: (senderId: string) => string;
  truncateText: (text: string | undefined, maxLength: number) => string;
  REPLY_PREVIEW_MAX_LENGTH: number;
}

const ChatInput: React.FC<ChatInputProps> = ({
  inputMessage,
  onInputChange,
  onSendMessage,
  onAttachmentPress,
  isSending,
  isDark,
  replyToMessage,
  onCancelReply,
  animatedReplyPanelStyle,
  getDisplayNameForReply,
  truncateText,
  REPLY_PREVIEW_MAX_LENGTH,
}) => {
  return (
    <InputOuterContainer>
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
                Replying to: {getDisplayNameForReply(replyToMessage.senderId)}
              </Text>
              <Text style={{
                fontSize: 13,
                color: isDark ? '#AAAAAA' : '#666666'
              }} numberOfLines={1} ellipsizeMode="tail">
                {truncateText(replyToMessage.content, REPLY_PREVIEW_MAX_LENGTH)}
              </Text>
            </View>
            <TouchableOpacity style={{ padding: 8 }} onPress={onCancelReply}>
              <Text style={{
                fontSize: 18,
                color: isDark ? '#AAAAAA' : '#666666'
              }}>×</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
      <InputContainer isDark={isDark}>
        <AttachmentButton
          onPress={onAttachmentPress}
          testID="attachment-button"
          accessibilityRole="button"
          accessibilityLabel="Attach media"
        >
          <AttachmentIcon isDark={isDark}>📎</AttachmentIcon>
        </AttachmentButton>
        <MessageInput
          value={inputMessage}
          onChangeText={onInputChange}
          placeholder="Type a message..."
          placeholderTextColor={isDark ? '#777777' : '#999999'}
          isDark={isDark}
          multiline
          testID="message-input"
        />
        <SendButton
          onPress={onSendMessage}
          disabled={!inputMessage.trim() || isSending}
          accessibilityLabel="Send message"
          accessibilityRole="button"
          testID="send-button"
          accessibilityState={{ disabled: !inputMessage.trim() || isSending }}
        >
          <SendButtonText>{isSending ? 'Sending...' : 'Send'}</SendButtonText>
        </SendButton>
      </InputContainer>
    </InputOuterContainer>
  );
};

export default React.memo(ChatInput);