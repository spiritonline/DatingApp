import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Alert, View, Text, TouchableOpacity, Image, TextInput } from 'react-native';
import ChatConversationScreen from '../ChatConversationScreen';
import * as chatService from '@/services/chatService';
import * as firebase from '@/services/firebase';
import { auth } from '@/services/firebase';
import { 
  MockNavigation, 
  mockMessages, 
  mockChatService, 
  mockImagePicker,
  mockAuth,
  waitForAsync,
  MockMessage
} from './test-utils';

// Mock the firebase module
jest.mock('../../../services/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-id',
      email: 'test@example.com',
    },
  },
  __esModule: true,
  default: {
    auth: {
      currentUser: {
        uid: 'test-user-id',
        email: 'test@example.com',
      },
    },
  },
}));

// Mock the react-native-image-picker
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
  launchCamera: jest.fn(),
}));

// Mock the react-native-document-picker
jest.mock('react-native-document-picker', () => ({
  pick: jest.fn(),
  types: {
    allFiles: 'allFiles',
  },
}));

// Mock the react-native-fs
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: 'test-dir',
  readFile: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
}));

type MessageItemProps = {
  message: MockMessage;
  onPress: () => void;
  onLongPress: () => void;
  isCurrentUser: boolean;
};

type ReactionModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelectReaction: (reaction: string) => void;
};

type AttachmentMenuModalProps = {
  visible: boolean;
  onSelectMedia: (type: 'image' | 'camera') => void;
};

type MediaViewerModalProps = {
  visible: boolean;
  media: { uri: string }[];
  onClose: () => void;
};

type ChatInputProps = {
  inputMessage: string;
  onInputChange: (text: string) => void;
  onSendMessage: () => void;
  onAttachmentPress: () => void;
  replyToMessage?: MockMessage;
  onCancelReply: () => void;
};

// Mock the chat service
jest.mock('@/services/chatService', () => ({
  __esModule: true,
  default: {
    sendMessage: jest.fn().mockResolvedValue(true),
    subscribeToMessages: jest.fn((chatId: string, callback: (messages: any[]) => void) => {
      callback(mockMessages);
      return () => {}; // Return unsubscribe function
    }),
    markMessagesAsRead: jest.fn().mockResolvedValue(true),
    isTestUser: jest.fn().mockReturnValue(false),
    cleanupTestChat: jest.fn().mockResolvedValue(true),
    toggleReactionOnMessage: jest.fn().mockResolvedValue(true),
  },
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  __esModule: true,
  ...jest.requireActual('expo-image-picker'),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images', Videos: 'Videos' },
}));

// Mock the auth module
jest.mock('../../../services/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'user1',
      email: 'test@example.com',
    },
  },
}));

// Mock the chat components
jest.mock('../../../components/chat', () => {
  const MockMessageItem: React.FC<MessageItemProps> = ({ 
    message, 
    onPress, 
    onLongPress, 
    isCurrentUser 
  }) => (
    <TouchableOpacity 
      testID={`message-${message.id}`}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <Text testID={`message-text-${message.id}`}>
        {message.text}
      </Text>
      {isCurrentUser && <Text testID="current-user-indicator">(You)</Text>}
    </TouchableOpacity>
  );

  const MockReactionModal: React.FC<ReactionModalProps> = ({ 
    visible, 
    onClose, 
    onSelectReaction 
  }) => (
    visible ? (
      <View testID="reaction-modal">
        {['❤️', '😂', '😮', '😢', '👍'].map((r, i) => (
          <TouchableOpacity 
            key={i} 
            testID={`reaction-${r}`}
            onPress={() => onSelectReaction(r)}
          >
            <Text>{r}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={onClose} testID="close-reaction-modal">
          <Text>Close</Text>
        </TouchableOpacity>
      </View>
    ) : null
  );

  const MockAttachmentMenuModal: React.FC<AttachmentMenuModalProps> = ({ 
    visible, 
    onSelectMedia 
  }) => (
    visible ? (
      <View testID="attachment-menu">
        <TouchableOpacity 
          onPress={() => onSelectMedia('image')} 
          testID="attach-image"
        >
          <Text>Image</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => onSelectMedia('camera')} 
          testID="take-photo"
        >
          <Text>Camera</Text>
        </TouchableOpacity>
      </View>
    ) : null
  );

  const MockMediaViewerModal: React.FC<MediaViewerModalProps> = ({ 
    visible, 
    media, 
    onClose 
  }) => (
    visible ? (
      <View testID="media-viewer">
        {media.map((m, i) => (
          <Image 
            key={i} 
            source={{ uri: m.uri }} 
            testID={`media-${i}`} 
            accessibilityLabel={`Media ${i + 1}`}
          />
        ))}
        <TouchableOpacity onPress={onClose} testID="close-media-viewer">
          <Text>Close</Text>
        </TouchableOpacity>
      </View>
    ) : null
  );

  const MockChatInput: React.FC<ChatInputProps> = ({ 
    inputMessage, 
    onInputChange, 
    onSendMessage, 
    onAttachmentPress,
    replyToMessage,
    onCancelReply,
  }) => (
    <View testID="chat-input">
      {replyToMessage && (
        <View testID="reply-preview">
          <Text>{replyToMessage.text}</Text>
          <TouchableOpacity onPress={onCancelReply} testID="cancel-reply">
            <Text>×</Text>
          </TouchableOpacity>
        </View>
      )}
      <TextInput
        value={inputMessage}
        onChangeText={onInputChange}
        placeholder="Type a message..."
        testID="message-input"
      />
      <TouchableOpacity 
        onPress={onSendMessage} 
        disabled={!inputMessage.trim()}
        testID="send-button"
      >
        <Text>Send</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        onPress={onAttachmentPress} 
        testID="attach-button"
      >
        <Text>Attach</Text>
      </TouchableOpacity>
    </View>
  );

  return {
    MessageItem: MockMessageItem,
    ReactionModal: MockReactionModal,
    AttachmentMenuModal: MockAttachmentMenuModal,
    MediaViewerModal: MockMediaViewerModal,
    ChatInput: MockChatInput,
  };
});

describe('ChatConversationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mocks to default implementations
    Object.assign(chatService, mockChatService);
    
    // Mock the auth module
    (auth as any) = {
      currentUser: {
        uid: 'test-user-id',
        email: 'test@example.com',
      },
    };
    
    // Mock the chat service
    (chatService.subscribeToMessages as jest.Mock).mockImplementation((callback) => {
      callback(mockMessages);
      return () => {}; // Return unsubscribe function
    });
    Object.assign(ImagePicker, mockImagePicker);
    Object.assign(auth, mockAuth);
  });

  it('renders loading indicator', async () => {
    const { getByTestId } = render(
      <MockNavigation component={ChatConversationScreen} />
    );
    
    // Check if loading indicator is shown
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('displays messages after loading', async () => {
    const { getByText, getByTestId } = render(
      <MockNavigation component={ChatConversationScreen} />
    );
    
    // Wait for messages to load
    await act(async () => {
      await waitForAsync();
    });

    // Check if messages are displayed
    expect(getByText('Hello!')).toBeTruthy();
    expect(getByText('Hi there!')).toBeTruthy();
    expect(getByTestId('message-1')).toHaveTextContent('Hello!');
    expect(getByTestId('message-2')).toHaveTextContent('Hi there!');
  });

  it('handles text input', async () => {
    const { getByTestId } = render(
      <MockNavigation component={ChatConversationScreen} />
    );

    const input = getByTestId('message-input');
    fireEvent(input, 'changeText', 'Hello, World!');

    expect(input.props.value).toBe('Hello, World!');
  });

  it('sends a message when send button is pressed', async () => {
    const { getByTestId } = render(
      <MockNavigation component={ChatConversationScreen} initialParams={{ chatId: 'test-chat-id' }} />
    );

    const input = getByTestId('message-input');
    const sendButton = getByTestId('send-button');

    await act(async () => {
      fireEvent(input, 'changeText', 'Test message');
      fireEvent.press(sendButton);
      await waitForAsync();
    });

    expect(chatService.sendMessage).toHaveBeenCalledWith(
      'test-chat-id',
      expect.objectContaining({
        text: 'Test message',
        senderId: 'test-user-id',
      })
    );
  });

  it('allows sending a new text message', async () => {
    const { getByTestId } = render(
      <MockNavigation component={ChatConversationScreen} />
    );
    
    await act(async () => {
      await waitForAsync();
    });
    
    // Type a message
    const input = getByTestId('message-input');
    fireEvent.change(input, { target: { value: 'New message' } });
    
    // Send the message
    const sendButton = getByTestId('send-button');
    fireEvent.press(sendButton);
    
    // Verify the message was sent
    expect(chatService.sendMessage).toHaveBeenCalledWith('chat123', {
      content: 'New message',
      type: 'text',
    });
  });

  it('shows and handles reaction modal', async () => {
    const { getByTestId, queryByTestId } = render(
      <MockNavigation component={ChatConversationScreen} />
    );
    
    await act(async () => {
      await waitForAsync();
    });
    
    // Long press on a message to show reaction modal
    const message = getByTestId('message-1');
    fireEvent(message, 'longPress');
    
    // Check if reaction modal is shown
    expect(queryByTestId('reaction-modal')).toBeTruthy();
    
    // Select a reaction
    const heartEmoji = getByTestId('reaction-❤️');
    fireEvent.press(heartEmoji);
    
    // Verify the reaction was added
    expect(chatService.toggleReactionOnMessage).toHaveBeenCalledWith(
      'chat123',
      '1',
      '❤️',
      'user1'
    );
  });

  it('handles reply cancellation', async () => {
    const { getByTestId, queryByTestId } = render(
      <MockNavigation component={ChatConversationScreen} />
    );

    // Open reply
    const message = getByTestId('message-1');
    fireEvent(message, 'onLongPress');
    const replyOption = getByTestId('reply-option');
    fireEvent.press(replyOption);

    // Verify reply preview is shown
    const replyPreview = queryByTestId('reply-preview');
    expect(replyPreview).toBeTruthy();

    // Cancel reply
    const cancelReplyButton = getByTestId('cancel-reply');
    fireEvent.press(cancelReplyButton);

    // Verify reply preview is hidden
    expect(queryByTestId('reply-preview')).toBeFalsy();
  });

  it('allows replying to a message', async () => {
    const { getByTestId, queryByTestId } = render(
      <MockNavigation component={ChatConversationScreen} />
    );
    
    await act(async () => {
      await waitForAsync();
    });
    
    // Long press on a message to show reply option
    const message = getByTestId('message-1');
    fireEvent(message, 'longPress');
    
    // In a real test, you would simulate the swipe gesture to reply
    // For now, we'll simulate the reply state directly
    fireEvent.press(getByTestId('message-1'));
    
    // Type a reply
    const input = getByTestId('message-input');
    fireEvent.change(input, { target: { value: 'This is a reply' } });
    
    // Send the reply
    const sendButton = getByTestId('send-button');
    fireEvent.press(sendButton);
    
    // Verify the reply was sent with the correct replyTo data
    expect(chatService.sendMessage).toHaveBeenCalledWith('chat123', {
      content: 'This is a reply',
      type: 'text',
      replyTo: {
        id: '1',
        content: 'Hello!',
        senderId: 'user2',
      },
    });
  });

  it('handles media attachment', async () => {
    const { getByTestId } = render(
      <MockNavigation component={ChatConversationScreen} />
    );
    
    const attachButton = getByTestId('attach-button');
    await act(async () => {
      fireEvent.press(attachButton);
      await waitForAsync();
    });

    // Check if attachment menu is visible
    const attachmentMenu = getByTestId('attachment-menu');
    expect(attachmentMenu).toBeTruthy();

    // Test camera option
    const cameraOption = getByTestId('take-photo');
    await act(async () => {
      await ImagePicker.launchImageLibraryAsync();
      await waitForAsync();
    });
    
    // Verify the media message was sent
    expect(chatService.sendMessage).toHaveBeenCalledWith('chat123', {
      type: 'image',
      mediaUrl: 'file:///path/to/image.jpg',
      mimeType: 'image/jpeg',
      fileName: 'image.jpg',
    });
  });

  it('displays and handles media viewer', async () => {
    const testMedia = [
      { uri: 'https://example.com/image1.jpg' },
      { uri: 'https://example.com/image2.jpg' },
    ];
    
    // Mock the ImagePicker response
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: testMedia,
    });
    
    const { getByTestId, queryByTestId } = render(
      <MockNavigation component={ChatConversationScreen} />
    );
    
    // Simulate selecting an image
    const attachButton = getByTestId('attach-button');
    fireEvent.press(attachButton);
    
    // Wait for the attachment menu to appear and select an image
    await waitForAsync();
    const attachImageButton = getByTestId('attach-image');
    fireEvent.press(attachImageButton);
    
    await waitForAsync();
    
    // Verify the media viewer is displayed
    expect(queryByTestId('media-viewer')).toBeTruthy();
    
    // Close the media viewer
    const closeButton = getByTestId('close-media-viewer');
    fireEvent.press(closeButton);
    
    await waitForAsync();
    
    // Verify the media viewer is closed
    expect(queryByTestId('media-viewer')).toBeFalsy();
    
    // Find and click on a media message
    const mediaMessage = getByTestId('message-3');
    fireEvent.press(mediaMessage);
    
    // Check if media viewer is shown
    expect(queryByTestId('media-viewer')).toBeTruthy();
    
    // Close the media viewer
    const closeButton = getByTestId('close-media-viewer');
    fireEvent.press(closeButton);
    
    // Media viewer should be closed
    expect(queryByTestId('media-viewer')).toBeFalsy();
  });

  it('handles media viewer close', async () => {
    const { getByTestId, queryByTestId } = render(
      <MockNavigation component={ChatConversationScreen} />
    );

    // Open media viewer
    const mediaMessage = getByTestId('media-message-1');
    fireEvent.press(mediaMessage);

    // Verify media viewer is open
    expect(queryByTestId('media-viewer')).toBeTruthy();

    // Close media viewer
    const closeMediaViewerBtn = getByTestId('close-media-viewer');
    fireEvent.press(closeMediaViewerBtn);

    // Verify media viewer is closed
    expect(queryByTestId('media-viewer')).toBeFalsy();
  });

  it('handles reaction modal close', async () => {
    const { getByTestId, queryByTestId } = render(
      <MockNavigation component={ChatConversationScreen} />
    );

    // Open reaction modal
    const message = getByTestId('message-1');
    fireEvent(message, 'onLongPress');

    // Verify reaction modal is open
    expect(queryByTestId('reaction-modal')).toBeTruthy();

    // Close reaction modal
    const closeReactionModalBtn = getByTestId('close-reaction-modal');
    fireEvent.press(closeReactionModalBtn);

    // Verify reaction modal is closed
    expect(queryByTestId('reaction-modal')).toBeFalsy();
  });

  it('handles test chat cleanup', async () => {
    // Mock isTestUser to return true
    (chatService.isTestUser as jest.Mock).mockReturnValue(true);
    
    const { getByTestId } = render(
      <MockNavigation component={ChatConversationScreen} />
    );
    
    await act(async () => {
      await waitForAsync();
    });
    
    // Mock Alert.alert to simulate user confirmation
    const mockAlert = jest.spyOn(Alert, 'alert');
    let confirmAction: (() => void) | undefined;
    mockAlert.mockImplementation((title, message, buttons) => {
      if (buttons && buttons[1]) {
        confirmAction = buttons[1].onPress;
      }
    });
    
    // Click cleanup button
    const cleanupButton = getByTestId('cleanup-button');
    fireEvent.press(cleanupButton);
    
    // Simulate user confirmation
    if (confirmAction) {
      await act(async () => {
        await confirmAction();
        await waitForAsync();
      });
      
      expect(chatService.cleanupTestChat).toHaveBeenCalled();
    }
    
    mockAlert.mockRestore();
  });
});
