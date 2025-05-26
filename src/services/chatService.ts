import { collection, doc, getDoc, setDoc, query, where, getDocs, orderBy, addDoc, serverTimestamp, updateDoc, onSnapshot, writeBatch } from '@firebase/firestore';
import { db, auth } from './firebase';

// Test user UIDs as defined in the requirements
const TEST_USER_1_UID = 'dqrwMcXBVwTYqYBhdcZDNApIu6l1'; // hiyou
const TEST_USER_2_UID = 'gxCPvaE154aQ6VE1yESLD6dloTy1'; // jasonschot
const TEST_USER_DISPLAY_NAMES: Record<string, string> = {
  [TEST_USER_1_UID]: 'Test User 1',
  [TEST_USER_2_UID]: 'Test User 2',
};

// Define test chat ID - create a deterministic ID based on sorted user IDs
const TEST_CHAT_ID = `testChat_${[TEST_USER_1_UID, TEST_USER_2_UID].sort().join('_')}`;

// Type definitions
export interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio';
  createdAt: any;
  isRead?: boolean;
}

export interface ChatPreview {
  id: string;
  participantIds: string[];
  participantNames?: Record<string, string>;
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: any;
    type: 'text' | 'image' | 'video' | 'audio';
  };
  isTestChat?: boolean;
}

// Check if current user is a test user
export function isTestUser(): boolean {
  const currentUserId = auth.currentUser?.uid;
  return currentUserId === TEST_USER_1_UID || currentUserId === TEST_USER_2_UID;
}

// Get the other test user ID
export function getOtherTestUserId(): string | null {
  const currentUserId = auth.currentUser?.uid;
  
  if (currentUserId === TEST_USER_1_UID) {
    return TEST_USER_2_UID;
  } else if (currentUserId === TEST_USER_2_UID) {
    return TEST_USER_1_UID;
  }
  
  return null;
}

// Initialize test chat if current user is a test user
export async function initializeTestChat(): Promise<string | null> {
  try {
    if (!isTestUser()) {
      return null;
    }
    
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
      console.error('No user is currently logged in');
      return null;
    }
    
    // Check if test chat document already exists
    const chatDocRef = doc(db, 'chats', TEST_CHAT_ID);
    const chatDoc = await getDoc(chatDocRef);
    
    if (!chatDoc.exists()) {
      // Create new test chat document
      await setDoc(chatDocRef, {
        participantIds: [TEST_USER_1_UID, TEST_USER_2_UID],
        participantNames: TEST_USER_DISPLAY_NAMES,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isTestChat: true,
      });
      
      // Add initial system message
      const messagesRef = collection(db, `chats/${TEST_CHAT_ID}/messages`);
      await addDoc(messagesRef, {
        senderId: 'system',
        content: '🧪 This is a test conversation between Test User 1 and Test User 2',
        type: 'text',
        createdAt: serverTimestamp(),
        isRead: true,
      });
      
      console.log('Test chat initialized successfully');
    } else {
      console.log('Test chat already exists');
    }
    
    return TEST_CHAT_ID;
  } catch (error) {
    console.error('Error initializing test chat:', error);
    return null;
  }
}

// Get all chat previews for the current user including test chat if user is a test user
export async function getUserChats(): Promise<ChatPreview[]> {
  try {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
      return [];
    }
    
    const chatsRef = collection(db, 'chats');
    const userChatsQuery = query(chatsRef, where('participantIds', 'array-contains', currentUserId));
    const chatsSnapshot = await getDocs(userChatsQuery);
    
    const chats: ChatPreview[] = [];
    
    chatsSnapshot.forEach((chatDoc) => {
      const chatData = chatDoc.data() as ChatPreview;
      chats.push({
        id: chatDoc.id,
        participantIds: chatData.participantIds,
        participantNames: chatData.participantNames,
        lastMessage: chatData.lastMessage,
        isTestChat: chatData.isTestChat || false,
      });
    });
    
    // If user is a test user but test chat isn't in the list, initialize it
    if (isTestUser() && !chats.some(chat => chat.id === TEST_CHAT_ID)) {
      await initializeTestChat();
      const testChatDoc = await getDoc(doc(db, 'chats', TEST_CHAT_ID));
      
      if (testChatDoc.exists()) {
        const testChatData = testChatDoc.data() as ChatPreview;
        chats.push({
          id: TEST_CHAT_ID,
          participantIds: testChatData.participantIds,
          participantNames: testChatData.participantNames,
          lastMessage: testChatData.lastMessage,
          isTestChat: true,
        });
      }
    }
    
    return chats;
  } catch (error) {
    console.error('Error getting user chats:', error);
    return [];
  }
}

// Send message to a chat
export async function sendMessage(
  chatId: string, 
  content: string, 
  type: 'text' | 'image' | 'video' | 'audio' = 'text'
): Promise<boolean> {
  try {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId || !chatId || !content.trim()) {
      return false;
    }
    
    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const chatRef = doc(db, 'chats', chatId);
    
    // Add new message
    const messageRef = await addDoc(messagesRef, {
      senderId: currentUserId,
      content: content.trim(),
      type,
      createdAt: serverTimestamp(),
      isRead: false,
    });
    
    // Update chat with last message info
    await updateDoc(chatRef, {
      lastMessage: {
        content: content.trim(),
        senderId: currentUserId,
        timestamp: serverTimestamp(),
        type,
      },
      updatedAt: serverTimestamp(),
    });
    
    return true;
  } catch (error) {
    console.error('Error sending message:', error);
    return false;
  }
}

// Subscribe to messages in a chat
export function subscribeToMessages(
  chatId: string, 
  callback: (messages: ChatMessage[]) => void
): () => void {
  const messagesRef = collection(db, `chats/${chatId}/messages`);
  const messagesQuery = query(messagesRef, orderBy('createdAt', 'asc'));
  
  const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
    const messages: ChatMessage[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        senderId: data.senderId,
        content: data.content,
        type: data.type || 'text',
        createdAt: data.createdAt,
        isRead: data.isRead || false,
      });
    });
    
    callback(messages);
  }, (error) => {
    console.error('Error listening to messages:', error);
    callback([]);
  });
  
  return unsubscribe;
}

// Mark messages as read
export async function markMessagesAsRead(chatId: string): Promise<boolean> {
  try {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId || !chatId) {
      return false;
    }
    
    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const unreadMessagesQuery = query(
      messagesRef, 
      where('senderId', '!=', currentUserId),
      where('isRead', '==', false)
    );
    
    const unreadSnapshot = await getDocs(unreadMessagesQuery);
    
    const batch = writeBatch(db);
    unreadSnapshot.forEach((messageDoc) => {
      batch.update(messageDoc.ref, { isRead: true });
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return false;
  }
}

// Clean up test data - only accessible in development mode
export async function cleanupTestChat(): Promise<boolean> {
  if (!__DEV__) {
    console.warn('Test data cleanup is only available in development mode');
    return false;
  }
  
  try {
    // Delete all messages in test chat
    const messagesRef = collection(db, `chats/${TEST_CHAT_ID}/messages`);
    const messagesSnapshot = await getDocs(messagesRef);
    
    const batch = writeBatch(db);
    messagesSnapshot.forEach((messageDoc) => {
      batch.delete(messageDoc.ref);
    });
    
    // Delete test chat document
    const chatRef = doc(db, 'chats', TEST_CHAT_ID);
    batch.delete(chatRef);
    
    await batch.commit();
    console.log('Test chat cleaned up successfully');
    return true;
  } catch (error) {
    console.error('Error cleaning up test chat:', error);
    return false;
  }
}
