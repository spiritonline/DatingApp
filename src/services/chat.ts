import { collection, doc, getDoc, setDoc, query, where, getDocs, orderBy, addDoc, serverTimestamp, updateDoc, onSnapshot, writeBatch, Timestamp } from '@firebase/firestore';
import { db, auth } from './firebase';
// Import types from the new central location
import { ChatServiceMessage, ChatPreview as ServiceChatPreviewType, GalleryMediaItem } from '../types/chat'; // Renamed ChatPreview to avoid conflict

// Test user UIDs
const TEST_USER_1_UID = 'dqrwMcXBVwTYqYBhdcZDNApIu6l1';
const TEST_USER_2_UID = 'gxCPvaE154aQ6VE1yESLD6dloTy1';
const TEST_USER_DISPLAY_NAMES: Record<string, string> = {
  [TEST_USER_1_UID]: 'Test User 1',
  [TEST_USER_2_UID]: 'Test User 2',
};
const TEST_CHAT_ID = `testChat_${[TEST_USER_1_UID, TEST_USER_2_UID].sort().join('_')}`;

// Re-export types for consumers of this service
export type { ChatServiceMessage, ServiceChatPreviewType, GalleryMediaItem };

export function isTestUser(): boolean {
  const currentUserId = auth.currentUser?.uid;
  return currentUserId === TEST_USER_1_UID || currentUserId === TEST_USER_2_UID;
}

export function getOtherTestUserId(): string | null {
  const currentUserId = auth.currentUser?.uid;
  if (currentUserId === TEST_USER_1_UID) return TEST_USER_2_UID;
  if (currentUserId === TEST_USER_2_UID) return TEST_USER_1_UID;
  return null;
}

export async function initializeTestChat(): Promise<string | null> {
  try {
    if (!isTestUser()) return null;
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
      console.error('No user is currently logged in');
      return null;
    }

    const chatDocRef = doc(db, 'chats', TEST_CHAT_ID);
    const chatDocSnap = await getDoc(chatDocRef);

    if (!chatDocSnap.exists()) {
      await setDoc(chatDocRef, {
        participantIds: [TEST_USER_1_UID, TEST_USER_2_UID],
        participantNames: TEST_USER_DISPLAY_NAMES,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isTestChat: true,
      });

      const messagesRef = collection(db, `chats/${TEST_CHAT_ID}/messages`);
      const initialMessage: Partial<ChatServiceMessage> = { // Use Partial for initial system message
        senderId: 'system',
        content: '🧪 This is a test conversation between Test User 1 and Test User 2',
        type: 'text',
        createdAt: serverTimestamp() as Timestamp, // Cast for serverTimestamp
        status: 'sent',
      };
      await addDoc(messagesRef, initialMessage);
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

export async function getUserChats(): Promise<ServiceChatPreviewType[]> {
  try {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return [];

    const chatsRef = collection(db, 'chats');
    const userChatsQuery = query(chatsRef, where('participantIds', 'array-contains', currentUserId));
    const chatsSnapshot = await getDocs(userChatsQuery);

    const chats: ServiceChatPreviewType[] = [];
    chatsSnapshot.forEach((chatDoc) => {
      const chatData = chatDoc.data();
      chats.push({
        id: chatDoc.id,
        participantIds: chatData.participantIds,
        participantNames: chatData.participantNames,
        lastMessage: chatData.lastMessage, // Assuming lastMessage structure matches
        isTestChat: chatData.isTestChat || false,
      });
    });

    if (isTestUser() && !chats.some(chat => chat.id === TEST_CHAT_ID)) {
      const initializedTestChatId = await initializeTestChat(); // Ensure it's initialized
      if (initializedTestChatId) {
          const testChatDoc = await getDoc(doc(db, 'chats', TEST_CHAT_ID));
          if (testChatDoc.exists()) {
            const testChatData = testChatDoc.data();
            chats.push({
              id: TEST_CHAT_ID,
              participantIds: testChatData.participantIds,
              participantNames: testChatData.participantNames,
              lastMessage: testChatData.lastMessage,
              isTestChat: true,
            });
          }
      }
    }
    return chats;
  } catch (error) {
    console.error('Error getting user chats:', error);
    return [];
  }
}

// Define a more specific type for the messageData parameter in sendMessage
export type SendMessagePayload = Omit<ChatServiceMessage, 'id' | 'createdAt' | 'senderId' | 'status' | 'readBy'> & {
    senderId?: string; // senderId is set by the service
};

export async function sendMessage(
  chatId: string,
  messageData: SendMessagePayload
): Promise<boolean> {
  try {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId || !chatId) {
      console.error('[chatService] Missing user ID or chat ID');
      return false;
    }

    if ((messageData.type === 'image' || messageData.type === 'video' || messageData.type === 'audio') && !messageData.mediaUrl) {
      console.error('[chatService] Media message missing mediaUrl');
      return false;
    }
    if (messageData.type === 'text' && (!messageData.content || !messageData.content.trim())) {
      console.error('[chatService] Text message has invalid content');
      return false;
    }

    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const chatRef = doc(db, 'chats', chatId);

    const finalMessageData: Omit<ChatServiceMessage, 'id'> = {
      ...messageData,
      senderId: currentUserId,
      content: messageData.content || '', // Ensure content is always a string
      createdAt: serverTimestamp() as Timestamp, // Cast serverTimestamp
      status: 'sending',
    };

    console.log('[chatService] Creating message with data:', JSON.stringify(finalMessageData));
    const messageRef = await addDoc(messagesRef, finalMessageData);
    await updateDoc(messageRef, { status: 'sent' });

    const lastMessageUpdate = {
      content: finalMessageData.content,
      senderId: currentUserId,
      timestamp: serverTimestamp(), // Firestore will convert this
      type: finalMessageData.type,
      ...(finalMessageData.replyTo && { replyTo: finalMessageData.replyTo }),
    };

    await updateDoc(chatRef, {
      lastMessage: lastMessageUpdate,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error sending message:', error);
    return false;
  }
}

export function subscribeToMessages(
  chatId: string,
  callback: (messages: ChatServiceMessage[]) => void // Use ChatServiceMessage
): () => void {
  const messagesRef = collection(db, `chats/${chatId}/messages`);
  const messagesQuery = query(messagesRef, orderBy('createdAt', 'asc'));

  const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
    const messages: ChatServiceMessage[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      messages.push({
        id: docSnap.id,
        senderId: data.senderId,
        content: data.content || '',
        type: data.type || 'text',
        createdAt: data.createdAt as Timestamp, // Assume it's a Timestamp from Firestore
        mediaUrl: data.mediaUrl,
        thumbnailUrl: data.thumbnailUrl,
        duration: data.duration,
        dimensions: data.dimensions,
        reactions: data.reactions || {},
        replyTo: data.replyTo,
        readBy: data.readBy || [],
        galleryItems: data.galleryItems,
        galleryCaption: data.galleryCaption,
        status: data.status || 'sent',
        caption: data.caption, // Ensure caption is mapped
      } as ChatServiceMessage); // Cast to ensure all fields are covered
    });
    callback(messages);
  }, (error) => {
    console.error('Error listening to messages:', error);
    callback([]);
  });
  return unsubscribe;
}


export async function markMessagesAsRead(chatId: string): Promise<boolean> {
  try {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId || !chatId) return false;

    const messagesRef = collection(db, `chats/${chatId}/messages`);
    // Query for messages not sent by current user and not already read by them
    const unreadMessagesQuery = query(
      messagesRef,
      where('senderId', '!=', currentUserId)
      // Firestore doesn't support 'array-not-contains' for readBy.
      // We'll have to filter client-side or update readBy more directly.
      // For simplicity, let's assume we update a 'read' flag or add to 'readBy'
    );

    const unreadSnapshot = await getDocs(unreadMessagesQuery);
    const batch = writeBatch(db);
    let updatesMade = false;

    unreadSnapshot.forEach((messageDoc) => {
      const data = messageDoc.data() as ChatServiceMessage;
      const readBy = data.readBy || [];
      if (!readBy.includes(currentUserId)) {
        batch.update(messageDoc.ref, {
          readBy: [...readBy, currentUserId],
          status: 'read', // Optionally update status
        });
        updatesMade = true;
      }
    });

    if (updatesMade) {
        await batch.commit();
    }
    return true;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return false;
  }
}

export async function markMessagesAsDelivered(chatId: string): Promise<boolean> {
  try {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId || !chatId) return false;

    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const undeliveredMessagesQuery = query(
      messagesRef,
      where('senderId', '!=', currentUserId),
      where('status', '==', 'sent')
    );

    const undeliveredSnapshot = await getDocs(undeliveredMessagesQuery);
    if (undeliveredSnapshot.empty) return true;

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
    const messageDocSnap = await getDoc(messageRef);

    if (!messageDocSnap.exists()) {
      console.error('Message not found');
      return false;
    }

    const messageData = messageDocSnap.data() as ChatServiceMessage;
    const reactions = { ...(messageData.reactions || {}) }; // Clone reactions

    // Remove user from any other existing reactions by them
    Object.keys(reactions).forEach(existingEmoji => {
      if (reactions[existingEmoji]) {
        reactions[existingEmoji] = reactions[existingEmoji]!.filter(uid => uid !== userId);
        if (reactions[existingEmoji]!.length === 0) {
          delete reactions[existingEmoji];
        }
      }
    });

    // Add or remove the new reaction
    if (reactions[emoji] && reactions[emoji]!.includes(userId)) {
      reactions[emoji] = reactions[emoji]!.filter(uid => uid !== userId);
      if (reactions[emoji]!.length === 0) {
        delete reactions[emoji];
      }
    } else {
      reactions[emoji] = [...(reactions[emoji] || []), userId];
    }

    await updateDoc(messageRef, { reactions });
    return true;
  } catch (error) {
    console.error('Error toggling reaction on message:', error);
    return false;
  }
}

export async function cleanupTestChat(): Promise<boolean> {
  if (!__DEV__) {
    console.warn('Test data cleanup is only available in development mode');
    return false;
  }
  try {
    const messagesRef = collection(db, `chats/${TEST_CHAT_ID}/messages`);
    const messagesSnapshot = await getDocs(messagesRef);
    const batch = writeBatch(db);
    messagesSnapshot.forEach((messageDoc) => batch.delete(messageDoc.ref));
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