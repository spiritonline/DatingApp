import { ChatPreview } from '../services/chatService';

// Mock data
export const mockChats: ChatPreview[] = [
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
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
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
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      type: 'text' as const,
    },
    isTestChat: false,
  },
];

// Create a typed mock of the chat service
const chatService = {
  getUserChats: jest.fn().mockResolvedValue([...mockChats]),
  initializeTestChat: jest.fn().mockResolvedValue({
    id: 'test-chat-1',
    participantIds: ['test-user-123', 'test-bot-1'],
    participantNames: {
      'test-user-123': 'Test User',
      'test-bot-1': 'Test Bot (Test)'
    },
    lastMessage: {
      content: 'Welcome to the test chat!',
      senderId: 'test-bot-1',
      timestamp: new Date(),
      type: 'text' as const,
    },
    isTestChat: true,
  }),
  isTestUser: jest.fn().mockReturnValue(true),
};

export default chatService;
