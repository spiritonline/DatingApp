import { collection, doc, getDoc, setDoc, query, where, getDocs, orderBy, addDoc, serverTimestamp, updateDoc, onSnapshot, writeBatch, Timestamp } from '@firebase/firestore';
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
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  replyTo?: {
    id: string;
    content: string;
    senderId: string;
  };
  participantNames?: Record<string, string>; // Added to ensure consistency with ChatPreview
  reactions?: Record<string, string[]>;
  mediaUrl?: string;
  thumbnailUrl?: string; // For videos
  caption?: string;
  mediaType?: 'image' | 'video';
  duration?: number; // For videos, in seconds
  dimensions?: { width: number; height: number }; // For images and videos
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
    mediaType?: 'image' | 'video'; // Added for consistency
    replyTo?: ChatMessage['replyTo']; // Include replyTo in lastMessage as well
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
        status: 'sent',
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
  messageData: {
    content: string;
    senderId: string;
    type: 'text' | 'image' | 'video' | 'audio';
    replyTo?: {
      id: string;
      content: string;
      senderId: string;
    };
    mediaUrl?: string;
    thumbnailUrl?: string;
    caption?: string;
    duration?: number;
    dimensions?: { width: number; height: number };
    fileName?: string; // Optional: if you want to store original filename
  }
): Promise<boolean> {
  try {
    const currentUserId = auth.currentUser?.uid;
    
    // Check if user is authenticated
    if (!currentUserId || !chatId) {
      console.error('[chatService] Missing user ID or chat ID');
      return false;
    }
    
    // Media message validation (images/videos)
    if (messageData.type === 'image' || messageData.type === 'video') {
      if (!messageData.mediaUrl) {
        console.error('[chatService] Media message missing mediaUrl');
        return false;
      }
      // Content can be empty for media messages, that's fine
    } 
    // Text message validation
    else if (!messageData.content || typeof messageData.content !== 'string' || !messageData.content.trim()) {
      console.error('[chatService] Text message has invalid content:', messageData);
      return false;
    }
    
    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const chatRef = doc(db, 'chats', chatId);
    
    // Use replyTo data directly from messageData if it exists
    const { replyTo } = messageData;

    // Create final message data object with proper structure
    const finalMessageData = {
      senderId: currentUserId, // Always use the authenticated user's ID
      content: messageData.type === 'text' ? (messageData.content || '').trim() : (messageData.content || ''),
      type: messageData.type || 'text',
      createdAt: serverTimestamp(),
      isRead: false,
      status: 'sending', // Initial status for optimistic UI
      ...(replyTo ? { replyTo } : {})
    };

    // Add media fields if present
    if (messageData.type === 'image' || messageData.type === 'video') {
      Object.assign(finalMessageData, {
        mediaUrl: messageData.mediaUrl || null,
        thumbnailUrl: messageData.thumbnailUrl || null,
        caption: messageData.caption || null,
        mediaType: messageData.type, // Redundant but consistent
        duration: messageData.duration || null,
        dimensions: messageData.dimensions || null,
        fileName: messageData.fileName || null,
        // fileSize can also be added if available
      });
    }
    
    console.log('[chatService] Creating message with data:', JSON.stringify(finalMessageData));
    
    // Create new message document
    const messageRef = await addDoc(messagesRef, finalMessageData);
    
    // Update message with 'sent' status
    await updateDoc(messageRef, {
      status: 'sent',
    });
    
    // Update chat with last message info, including reply data if present
    const lastMessageData = {
      content: messageData.type === 'text' ? (messageData.content || '').trim() : (messageData.content || ''),
      senderId: currentUserId,
      timestamp: serverTimestamp(),
      type: messageData.type || 'text',
      ...(replyTo ? { replyTo } : {}),
      ...((messageData.type === 'image' || messageData.type === 'video') ? { mediaType: messageData.type } : {})
    };
    
    await updateDoc(chatRef, {
      lastMessage: lastMessageData,
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
      
      // Check if reply data exists and log it for debugging
      if (data.replyTo) {
        console.log(`[chatService] Message ${doc.id} has reply data:`, JSON.stringify(data.replyTo));
      }
      
      // Create properly structured message object
      const message: ChatMessage = {
        id: doc.id,
        senderId: data.senderId,
        content: data.content,
        type: data.type || 'text',
        reactions: data.reactions || {},
        createdAt: data.createdAt,
        isRead: data.isRead || false,
        mediaUrl: data.mediaUrl,
        thumbnailUrl: data.thumbnailUrl,
        caption: data.caption,
        mediaType: data.mediaType,
        duration: data.duration,
        dimensions: data.dimensions,
        status: data.status || 'sent',
      };
      
      // Only add replyTo if it exists in the data
      if (data.replyTo && typeof data.replyTo === 'object') {
        message.replyTo = {
          id: data.replyTo.id,
          content: data.replyTo.content,
          senderId: data.replyTo.senderId
        };
      }
      
      messages.push(message);
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
      batch.update(messageDoc.ref, { 
        isRead: true,
        status: 'read'
      });
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return false;
  }
}

// Mark messages as delivered
export async function markMessagesAsDelivered(chatId: string): Promise<boolean> {
  try {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId || !chatId) {
      return false;
    }
    
    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const undeliveredMessagesQuery = query(
      messagesRef, 
      where('senderId', '!=', currentUserId),
      where('status', '==', 'sent')
    );
    
    const undeliveredSnapshot = await getDocs(undeliveredMessagesQuery);
    
    const batch = writeBatch(db);
    undeliveredSnapshot.forEach((messageDoc) => {
      batch.update(messageDoc.ref, { status: 'delivered' });
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error marking messages as delivered:', error);
    return false;
  }
}

// Toggle reaction on a message
export async function toggleReactionOnMessage(
  chatId: string,
  messageId: string,
  emoji: string,
  userId: string
): Promise<boolean> {
  try {
    if (!chatId || !messageId || !emoji || !userId) {
      console.error('Invalid parameters for toggleReactionOnMessage');
      return false;
    }

    const messageRef = doc(db, `chats/${chatId}/messages/${messageId}`);
    const messageDoc = await getDoc(messageRef);

    if (!messageDoc.exists()) {
      console.error('Message not found');
      return false;
    }

    const messageData = messageDoc.data() as ChatMessage;
    const reactions = messageData.reactions || {};

    // Remove user from any other existing reactions by them
    Object.keys(reactions).forEach(existingEmoji => {
      if (reactions[existingEmoji]) {
        reactions[existingEmoji] = reactions[existingEmoji].filter(uid => uid !== userId);
        if (reactions[existingEmoji].length === 0) {
          delete reactions[existingEmoji];
        }
      }
    });

    // Add or remove the new reaction
    if (reactions[emoji] && reactions[emoji].includes(userId)) {
      // User already reacted with this emoji, remove it
      reactions[emoji] = reactions[emoji].filter(uid => uid !== userId);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    } else {
      // Add new reaction or replace old one
      reactions[emoji] = [...(reactions[emoji] || []), userId];
    }

    await updateDoc(messageRef, { reactions });
    return true;
  } catch (error) {
    console.error('Error toggling reaction on message:', error);
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
