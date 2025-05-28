import { mockMessages } from '../../src/screens/__tests__/test-utils';

export const sendMessage = jest.fn().mockResolvedValue(true);

export const subscribeToMessages = jest.fn((chatId: string, callback: (messages: any[]) => void) => {
  callback(mockMessages);
  return () => {}; // Return unsubscribe function
});

export const markMessagesAsRead = jest.fn().mockResolvedValue(true);

export const isTestUser = jest.fn().mockReturnValue(false);

export const cleanupTestChat = jest.fn().mockResolvedValue(true);

export const toggleReactionOnMessage = jest.fn().mockResolvedValue(true);

const chatService = {
  sendMessage,
  subscribeToMessages,
  markMessagesAsRead,
  isTestUser,
  cleanupTestChat,
  toggleReactionOnMessage,
};

export default chatService;
