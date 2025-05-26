import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import ChatConversationScreen from '../../screens/ChatConversationScreen';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
    useRoute: () => ({
      params: { chatId: 'test-chat-id', partnerName: 'Test User' }
    }),
  };
});

// Mock Firestore
jest.mock('../../services/firebase', () => ({
  auth: {
    currentUser: { uid: 'current-user-id' }
  },
  db: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    onSnapshot: jest.fn((callback) => {
      callback({
        data: () => ({
          participants: ['current-user-id', 'other-user-id'],
          lastMessage: 'Hello',
          lastMessageTimestamp: new Date(),
        }),
      });
      return jest.fn(); // Return unsubscribe function
    }),
    orderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
      docs: [
        {
          id: 'msg1',
          data: () => ({
            text: 'Hello',
            senderId: 'other-user-id',
            timestamp: new Date(),
          }),
        },
        {
          id: 'msg2',
          data: () => ({
            text: 'Hi there',
            senderId: 'current-user-id',
            timestamp: new Date(),
          }),
        },
      ],
    }),
    add: jest.fn().mockResolvedValue({ id: 'new-message-id' }),
  },
}));

describe('ChatConversationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the chat screen with the partner name', () => {
    const { getByText } = render(
      <NavigationContainer>
        <ChatConversationScreen />
      </NavigationContainer>
    );

    expect(getByText('Test User')).toBeTruthy();
  });

  it('displays messages correctly', async () => {
    const { getByText } = render(
      <NavigationContainer>
        <ChatConversationScreen />
      </NavigationContainer>
    );

    // Wait for messages to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(getByText('Hello')).toBeTruthy();
    expect(getByText('Hi there')).toBeTruthy();
  });

  it('allows sending a new message', async () => {
    const { getByPlaceholderText, getByTestId } = render(
      <NavigationContainer>
        <ChatConversationScreen />
      </NavigationContainer>
    );

    // Type a message
    const input = getByPlaceholderText('Type a message...');
    fireEvent.changeText(input, 'New message');

    // Send the message
    const sendButton = getByTestId('send-button');
    fireEvent.press(sendButton);

    // Verify Firestore add was called
    const firebaseMock = jest.requireMock('../../services/firebase');
    expect(firebaseMock.db.collection().doc().add).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'New message',
        senderId: 'current-user-id',
      })
    );
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <ChatConversationScreen />
      </NavigationContainer>
    );

    const backButton = getByTestId('back-button');
    fireEvent.press(backButton);

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('matches snapshot', () => {
    const { toJSON } = render(
      <NavigationContainer>
        <ChatConversationScreen />
      </NavigationContainer>
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
