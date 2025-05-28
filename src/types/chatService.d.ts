declare module '../../../services/chatService' {
  export function sendMessage(chatId: string, message: any): Promise<boolean>;
  export function subscribeToMessages(chatId: string, callback: (messages: any[]) => void): () => void;
  export function markMessagesAsRead(chatId: string, messageIds: string[]): Promise<boolean>;
  export function isTestUser(userId: string): boolean;
  export function cleanupTestChat(chatId: string): Promise<boolean>;
  export function toggleReactionOnMessage(
    chatId: string, 
    messageId: string, 
    reaction: string, 
    userId: string
  ): Promise<boolean>;
}
