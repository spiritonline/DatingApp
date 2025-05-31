import styled from 'styled-components/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { Image } from 'expo-image'; // expo-image

// Import the ThemeProps intended for direct prop passing (e.g., isDark)
// This should define `isDark` as a boolean.
import { ThemeProps as DirectPassedThemeProps } from '../utils/styled-components';

// Interface for components that receive `isDark` directly
export interface ComponentWithIsDarkProps extends DirectPassedThemeProps {}

// Interface for message-related components that receive `isDark` and `isCurrentUser`
export interface MessageComponentProps extends DirectPassedThemeProps {
  isCurrentUser: boolean;
  isHighlighted?: boolean;
}

// Interface for SendButton which takes a `disabled` prop
export interface SendButtonComponentProps {
  disabled?: boolean;
}

export const Container = styled(SafeAreaView)<ComponentWithIsDarkProps>`
  flex: 1;
  background-color: ${(props: ComponentWithIsDarkProps) => props.isDark ? '#121212' : '#ffffff'};
`;

export const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

export const HeaderContainer = styled.View<ComponentWithIsDarkProps>`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom-width: 1px;
  border-bottom-color: ${(props: ComponentWithIsDarkProps) => props.isDark ? '#333333' : '#EEEEEE'};
`;

export const HeaderContent = styled.View`
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

export const BackButton = styled.TouchableOpacity`
  width: 40px;
  height: 40px;
  justify-content: center;
  align-items: center;
`;

export const BackButtonText = styled.Text<ComponentWithIsDarkProps>`
  font-size: 24px;
  color: ${(props: ComponentWithIsDarkProps) => props.isDark ? '#ffffff' : '#000000'};
`;

export const HeaderTitle = styled.Text<ComponentWithIsDarkProps>`
  font-size: 18px;
  font-weight: bold;
  color: ${(props: ComponentWithIsDarkProps) => props.isDark ? '#ffffff' : '#000000'};
`;

export const PlanDateButton = styled.TouchableOpacity`
  padding: 8px 12px;
  border-radius: 16px;
  background-color: #FF6B6B;
`;


export const PlanDateButtonText = styled.Text`
  color: #ffffff;
  font-size: 12px;
  font-weight: bold;
`;

export const MessagesContainer = styled.View`
  flex: 1;
`;

export const EmptyContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: 20px;
`;

export const EmptyText = styled.Text<ComponentWithIsDarkProps>`
  font-size: 16px;
  color: ${(props: ComponentWithIsDarkProps) => props.isDark ? '#777777' : '#999999'};
  text-align: center;
`;

export const MessageContainer = styled.View<MessageComponentProps>`
  padding: 4px 16px;
  align-items: ${(props: MessageComponentProps) => props.isCurrentUser ? 'flex-end' : 'flex-start'};
`;

export const MessageBubble = styled.View<MessageComponentProps>`
  max-width: 80%;
  min-width: 40%;
  padding: 12px 16px;
  border-radius: 20px;
  background-color: ${(props: MessageComponentProps) =>
    props.isHighlighted ? (props.isDark ? '#555' : '#ddd') :
    props.isCurrentUser
      ? '#FF6B6B'
      : props.isDark ? '#2C2C2C' : '#F0F0F0'};
  overflow: hidden;
`;

export const StyledImage = styled(Image)<MessageComponentProps>`
  width: 100%;
  max-width: 250px;
  height: 200px;
  border-radius: 10px;
  resize-mode: cover;
  margin-bottom: ${(props: MessageComponentProps) => (props.isCurrentUser || props.isDark) ? '4px' : '0px'};
`;

export const VideoPreviewContainer = styled.View<MessageComponentProps>`
  width: 100%;
  max-width: 250px;
  height: 200px;
  border-radius: 10px;
  overflow: hidden;
  justify-content: center;
  align-items: center;
  background-color: ${(props: MessageComponentProps) => props.isDark ? '#333' : '#e0e0e0'};
`;

export const PlayIconOverlay = styled.View`
  position: absolute;
`;

export const PlayIconText = styled.Text`
  font-size: 40px;
  color: rgba(255, 255, 255, 0.8);
`;

export const MessageText = styled.Text<MessageComponentProps>`
  font-size: 16px;
  color: ${(props: MessageComponentProps) =>
    props.isCurrentUser
      ? '#FFFFFF'
      : props.isDark ? '#FFFFFF' : '#000000'};
`;

export const CaptionText = styled.Text<MessageComponentProps>`
  font-size: 14px;
  padding-top: 4px;
  color: ${(props: MessageComponentProps) =>
    props.isCurrentUser ? 'rgba(255, 255, 255, 0.9)' : (props.isDark ? '#DDDDDD' : '#333333')};
`;

export const GalleryGridContainer = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  max-width: 220px;
`;

export const GalleryItemTouchable = styled.TouchableOpacity`
  width: 100px;
  height: 100px;
  margin: 2.5px;
  border-radius: 8px;
  overflow: hidden;
  background-color: #e0e0e0;
  justify-content: center;
  align-items: center;
`;

export const GalleryThumbnailImage = styled(Image)`
  width: 100%;
  height: 100%;
`;

export const VideoIconText = styled.Text`
  position: absolute;
  font-size: 24px;
  opacity: 0.8;
`;

export const MoreItemsOverlay = styled.View`
  position: absolute;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.5);
  justify-content: center;
  align-items: center;
`;

export const MoreItemsText = styled.Text`
  color: white;
  font-size: 24px;
  font-weight: bold;
`;

export const MessageTime = styled.Text<MessageComponentProps>`
  font-size: 10px;
  color: ${(props: MessageComponentProps) =>
    props.isCurrentUser
      ? 'rgba(255, 255, 255, 0.7)'
      : props.isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'};
  align-self: flex-end;
  margin-top: 4px;
`;

export const ReplyContextContainer = styled.TouchableOpacity<MessageComponentProps>`
  background-color: ${(props: MessageComponentProps) => props.isCurrentUser ? 'rgba(255,255,255,0.15)' : (props.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')};
  padding: 6px 10px;
  border-radius: 10px;
  margin-bottom: 6px;
  border-left-width: 3px;
  border-left-color: ${(props: MessageComponentProps) => props.isCurrentUser ? '#FFFFFF' : '#FF6B6B'};
`;

export const ReplyContextSender = styled.Text<MessageComponentProps>`
  font-size: 12px;
  font-weight: bold;
  color: ${(props: MessageComponentProps) => props.isCurrentUser ? '#FFFFFF' : (props.isDark ? '#DDDDDD' : '#333333')};
`;

export const ReplyContextText = styled.Text<MessageComponentProps>`
  font-size: 12px;
  color: ${(props: MessageComponentProps) => props.isCurrentUser ? 'rgba(255,255,255,0.8)' : (props.isDark ? '#CCCCCC' : '#555555')};
`;

export const ReactionsContainer = styled.View`
  flex-direction: row;
  margin-top: 8px;
  align-self: flex-start;
`;

export const ReactionPill = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  padding: 2px 6px;
  margin-right: 4px;
`;

export const ReactionEmoji = styled.Text`
  font-size: 12px;
`;

export const ReactionCount = styled.Text`
  font-size: 12px;
  margin-left: 3px;
  color: #555;
`;

export const InputOuterContainer = styled.View`
`;

export const InputContainer = styled.View<ComponentWithIsDarkProps>`
  flex-direction: row;
  align-items: center;
  padding: 12px 16px;
  border-top-width: 1px;
  border-top-color: ${(props: ComponentWithIsDarkProps) => props.isDark ? '#333333' : '#EEEEEE'};
  background-color: ${(props: ComponentWithIsDarkProps) => props.isDark ? '#1E1E1E' : '#FFFFFF'};
`;

export const AttachmentButton = styled.TouchableOpacity`
  padding: 10px;
  margin-right: 8px;
`;

export const AttachmentIcon = styled.Text<ComponentWithIsDarkProps>`
  font-size: 22px;
  color: ${(props: ComponentWithIsDarkProps) => props.isDark ? '#FFF' : '#000'};
`;

export const MessageInput = styled.TextInput<ComponentWithIsDarkProps>`
  flex: 1;
  min-height: 40px;
  max-height: 100px;
  padding: 10px 16px;
  border-radius: 20px;
  background-color: ${(props: ComponentWithIsDarkProps) => props.isDark ? '#2C2C2C' : '#F0F0F0'};
  color: ${(props: ComponentWithIsDarkProps) => props.isDark ? '#FFFFFF' : '#000000'};
  margin-right: 12px;
`;

export const SendButton = styled.TouchableOpacity<SendButtonComponentProps>`
  padding: 10px 16px;
  border-radius: 20px;
  background-color: #FF6B6B;
  opacity: ${(props: SendButtonComponentProps) => props.disabled ? 0.5 : 1};
`;

export const SendButtonText = styled.Text`
  color: #FFFFFF;
  font-weight: bold;
`;

export const AttachmentMenuOverlay = styled.Pressable`
  flex: 1;
  justify-content: flex-end;
  background-color: rgba(0,0,0,0.4);
`;

export const AttachmentMenuContent = styled.View<ComponentWithIsDarkProps>`
  background-color: ${(props: ComponentWithIsDarkProps) => props.isDark ? '#1E1E1E' : '#FFFFFF'};
  padding: 16px;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  padding-bottom: ${Platform.OS === 'ios' ? 30 : 16}px;
`;

export const AttachmentMenuButton = styled.TouchableOpacity`
  padding: 12px;
  align-items: center;
`;

export const AttachmentMenuButtonText = styled.Text<ComponentWithIsDarkProps>`
  font-size: 18px;
  color: ${(props: ComponentWithIsDarkProps) => props.isDark ? '#FFFFFF' : '#007AFF'};
`;

export const MediaViewerContainer = styled.View<ComponentWithIsDarkProps>`
  flex: 1;
  background-color: ${(props: ComponentWithIsDarkProps) => props.isDark ? '#000' : '#FFF'};
  justify-content: center;
  align-items: center;
`;

export const CloseButton = styled.TouchableOpacity`
  position: absolute;
  top: ${Platform.OS === 'ios' ? 50 : 20}px;
  right: 20px;
  padding: 10px;
  z-index: 1;
`;

export const CloseButtonText = styled.Text<ComponentWithIsDarkProps>`
  font-size: 24px;
  font-weight: bold;
  color: ${(props: ComponentWithIsDarkProps) => props.isDark ? '#FFF' : '#000'};
`;

export const MediaCaptionText = styled.Text<ComponentWithIsDarkProps>`
  position: absolute;
  bottom: ${Platform.OS === 'ios' ? 40 : 20}px;
  left: 20px;
  right: 20px;
  padding: 10px;
  background-color: rgba(0,0,0,0.5);
  color: #FFF;
  border-radius: 8px;
  text-align: center;
  font-size: 16px;
`;