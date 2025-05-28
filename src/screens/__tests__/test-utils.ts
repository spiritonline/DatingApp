// Mock types
type MockChatService = {
  sendMessage: jest.Mock;
  subscribeToMessages: jest.Mock;
  markMessagesAsRead: jest.Mock;
  isTestUser: jest.Mock;
  cleanupTestChat: jest.Mock;
  toggleReactionOnMessage: jest.Mock;
};

type MockImagePicker = {
  launchImageLibraryAsync: jest.Mock;
  MediaTypeOptions: {
    Images: string;
    Videos: string;
    All: string;
  };
};

type MockAuth = {
  currentUser: {
    uid: string;
    email: string;
  } | null;
};

// Define the MockMessage type
export interface MockMessage {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
  isRead: boolean;
  mediaUrl?: string;
  reactions?: Record<string, string[]>;
}

export const mockMessages: MockMessage[] = [
  {
    id: '1',
    text: 'Hello!',
    senderId: 'user1',
    timestamp: Date.now() - 10000,
    isRead: true,
  },
  {
    id: '2',
    text: 'Hi there!',
    senderId: 'user2',
    timestamp: Date.now() - 5000,
    isRead: true,
  },
];

export const mockChatService: MockChatService = {
  sendMessage: jest.fn().mockResolvedValue(true),
  subscribeToMessages: jest.fn((callback) => {
    callback(mockMessages);
    return () => {}; // Return unsubscribe function
  }),
  markMessagesAsRead: jest.fn().mockResolvedValue(true),
  isTestUser: jest.fn().mockReturnValue(false),
  cleanupTestChat: jest.fn().mockResolvedValue(true),
  toggleReactionOnMessage: jest.fn().mockResolvedValue(true),
};

export const mockImagePicker: MockImagePicker = {
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'test-uri' }],
  }),
  MediaTypeOptions: {
    Images: 'Images',
    Videos: 'Videos',
    All: 'All',
  },
};

export const mockAuth: MockAuth = {
  currentUser: {
    uid: 'test-user-id',
    email: 'test@example.com',
  },
};

export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

// Navigation component props
type NavigationComponentProps = {
  route: {
    params: Record<string, unknown>;
  };
};

// Mock navigation component
type MockNavigationProps = {
  component: React.ComponentType<NavigationComponentProps>;
  initialParams?: Record<string, unknown>;
};

export const MockNavigation: React.FC<MockNavigationProps> = ({ 
  component: Component, 
  initialParams = {} 
}) => {
  return <Component route={{ params: initialParams }} />;
};
