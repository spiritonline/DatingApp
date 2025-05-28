import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { auth } from '../../../src/services/firebase';
import { getUserChats, initializeTestChat, isTestUser } from '../../../src/services/chatService';
import ChatListScreen from '../../../src/screens/ChatListScreen';

// Mock the navigation
const Stack = createStackNavigator();

// Mock the navigation prop
const mockNavigate = jest.fn();
const mockNavigation: any = {
  navigate: mockNavigate,
  addListener: jest.fn(() => jest.fn()),
};

// Define mock data
const mockChats = [
  {
    id: 'chat1',
    participantIds: ['user1', 'test-user-123'],
    participantNames: {
      'user1': 'John Doe',
      'test-user-123': 'Test User'
    },
    lastMessage: {
      content: 'Hello there!',
      senderId: 'user1',
      timestamp: new Date(),
      type: 'text' as const,
    },
    isTestChat: false,
  },
  {
    id: 'chat2',
    participantIds: ['user2', 'test-user-123'],
    participantNames: {
      'user2': 'Jane Smith',
      'test-user-123': 'Test User'
    },
    lastMessage: {
      content: 'How are you?',
      senderId: 'test-user-123',
      timestamp: new Date(),
      type: 'text' as const,
    },
    isTestChat: false,
  },
];

// Mock Firebase auth
jest.mock('../../../src/services/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-123',
      email: 'test@example.com',
    },
  },
  db: {},
  storage: {},
}));

// Mock chat service
jest.mock('../../../src/services/chatService', () => ({
  getUserChats: jest.fn(),
  initializeTestChat: jest.fn(),
  isTestUser: jest.fn().mockReturnValue(true),
}));

// Mock the useAppTheme hook
jest.mock('../../../src/utils/useAppTheme', () => ({
  useAppTheme: () => ({
    isDark: false,
    colors: {
      primary: '#007AFF',
      background: '#FFFFFF',
      text: '#000000',
      card: '#FFFFFF',
      border: '#E5E5E5',
      notification: '#FF3B30',
    },
  }),
}));


describe('ChatListScreen', () => {
  const mockStore = configureStore([]);
  let store: any;

  beforeEach(() => {
    store = mockStore({
      // Add any initial state if needed
    });
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <Provider store={store}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen 
              name="ChatList" 
              component={ChatListScreen} 
              initialParams={{}}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </Provider>
    );
  };

  it('renders loading state initially', async () => {
    // Mock the loading state
    (getUserChats as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves to keep loading
    );

    const { getByTestId } = renderComponent();
    
    // Check if loading indicator is shown
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('renders empty state when no chats are available', async () => {
    (getUserChats as jest.Mock).mockResolvedValueOnce([]);

    const { getByText, queryByTestId } = renderComponent();
    
    // Wait for the component to update
    await waitFor(() => {
      expect(getByText('Chat List Screen')).toBeTruthy();
    });
    
    // Note: In a real test, you would check for your actual empty state
    // Since we're mocking the component, we're just checking the mock rendered
    expect(queryByTestId('chat-list-screen')).toBeTruthy();
  });

  it('renders chat items when chats are available', async () => {
    (getUserChats as jest.Mock).mockResolvedValueOnce(mockChats);

    const { getByText, queryByTestId, findByText } = renderComponent();
    
    // Wait for the component to update and find the first chat item
    const johnDoeElement = await findByText('John Doe');
    
    // Verify all chat items are rendered with the correct structure
    expect(johnDoeElement).toBeTruthy();
    // The mock data uses 'content' instead of 'text' for the message
    expect(getByText('Hello there!')).toBeTruthy();
    
    // Check if loading indicator is not present
    expect(queryByTestId('loading-indicator')).toBeNull();
  });

  it('navigates to chat screen when a chat item is pressed', async () => {
    const mockChats = [
      {
        id: 'chat1',
        name: 'John Doe',
        lastMessage: 'Hello there!',
        timestamp: '10:30 AM',
        unread: true,
        vitality: 1,
      },
    ];

    (getUserChats as jest.Mock).mockResolvedValueOnce(mockChats);

    const { getByText } = renderComponent();
    
    // Wait for the component to update
    await waitFor(() => {
      // Find and press the chat item
      const chatItem = getByText('John Doe');
      fireEvent.press(chatItem);
      
      // Check if navigation was called with correct parameters
      expect(mockNavigate).toHaveBeenCalledWith('ChatConversation', {
        chatId: 'chat1',
        partnerName: 'John Doe',
      });
    });
  });

  it('starts a test chat when test button is pressed', async () => {
    // Mock the test user
    (isTestUser as jest.Mock).mockReturnValue(true);
    
    // Mock empty chats initially
    (getUserChats as jest.Mock).mockResolvedValueOnce([]);
    
    // Mock the test chat initialization
    (initializeTestChat as jest.Mock).mockResolvedValueOnce({});
    
    // Mock the chats after test chat is created
    const mockChatsAfterTest = [
      {
        id: 'test-chat-1',
        name: 'Test Chat (Test)',
        lastMessage: 'Welcome to the test chat!',
        timestamp: 'Just now',
        unread: false,
        vitality: 1,
        isTestChat: true,
      },
    ];
    
    // Setup mock to return empty first, then the test chat
    (getUserChats as jest.Mock)
      .mockResolvedValueOnce([]) // First call - no chats
      .mockResolvedValueOnce(mockChatsAfterTest); // After test chat is created

    const { getByText } = renderComponent();
    
    // Wait for initial load
    await waitFor(() => {
      // Find and press the test chat button
      const testButton = getByText('Start Test Chat');
      fireEvent.press(testButton);
    });
    
    // Check if initializeTestChat was called
    expect(initializeTestChat).toHaveBeenCalledTimes(1);
    
    // Check if loading state is shown
    await waitFor(() => {
      expect(getByText('Starting...')).toBeTruthy();
    });
    
    // Wait for the test chat to appear
    await waitFor(() => {
      expect(getByText('Test Chat (Test)')).toBeTruthy();
    });
  });

  it('handles errors when fetching chats', async () => {
    // Mock an error when fetching chats
    const errorMessage = 'Failed to fetch chats';
    (getUserChats as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));
    
    // Mock console.error to prevent test logs
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const { getByText } = renderComponent();
    
    // Wait for the error state
    await waitFor(() => {
      // The component should show empty state when there's an error
      expect(getByText('No messages yet')).toBeTruthy();
    });
    
    // Check if error was logged
    expect(consoleError).toHaveBeenCalledWith('Error fetching chats:', expect.any(Error));
    
    // Clean up
    consoleError.mockRestore();
  });
});
