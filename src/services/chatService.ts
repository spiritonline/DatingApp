// src/services/chatService.ts
import { collection, doc, getDoc, setDoc, query, where, getDocs, orderBy, addDoc, serverTimestamp, updateDoc, onSnapshot, writeBatch, Timestamp } from '@firebase/firestore';
import { db, auth } from './firebase';
import { ChatServiceMessage, ChatPreview, GalleryMediaItem } from '../types/chat';
import { getUserProfile } from './profileService';

const TEST_USER_1_UID = 'dqrwMcXBVwTYqYBhdcZDNApIu6l1';
const TEST_USER_2_UID = 'gxCPvaE154aQ6VE1yESLD6dloTy1';
const TEST_USER_DISPLAY_NAMES: Record<string, string> = {
  [TEST_USER_1_UID]: 'Test User 1',
  [TEST_USER_2_UID]: 'Test User 2',
};
const TEST_CHAT_ID = `testChat_${[TEST_USER_1_UID, TEST_USER_2_UID].sort().join('_')}`;

export type { ChatServiceMessage, ChatPreview, GalleryMediaItem };

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
      console.error('No user is currently logged in for initializeTestChat');
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
      const initialMessage: Partial<ChatServiceMessage> = {
        senderId: 'system',
        content: '🧪 This is a test conversation between Test User 1 and Test User 2',
        type: 'text',
        createdAt: serverTimestamp() as Timestamp,
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

export async function getUserChats(): Promise<ChatPreview[]> {
  try {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) return [];

    const chatsRef = collection(db, 'chats');
    const userChatsQuery = query(chatsRef, where('participantIds', 'array-contains', currentUserId));
    const chatsSnapshot = await getDocs(userChatsQuery);

    const chats: ChatPreview[] = [];
    
    // Process each chat in parallel
    await Promise.all(chatsSnapshot.docs.map(async (chatDoc) => {
      const chatData = chatDoc.data();
      const participantIds = chatData.participantIds || [];
      const otherParticipantId = participantIds.find((id: string) => id !== currentUserId);
      
      // Get the other participant's profile
      let participantName = 'Unknown User';
      if (otherParticipantId) {
        try {
          const profile = await getUserProfile(otherParticipantId);
          participantName = profile?.displayName || profile?.name || otherParticipantId.substring(0, 8);
        } catch (error) {
          console.error(`Error fetching profile for user ${otherParticipantId}:`, error);
        }
      }
      
      // For test chats, ensure we have a clear indicator
      const isTestChat = chatData.isTestChat || false;
      const displayName = isTestChat ? `${participantName} (Test)` : participantName;
      
      chats.push({
        id: chatDoc.id,
        participantIds,
        participantNames: {
          ...chatData.participantNames,
          [otherParticipantId || '']: displayName
        },
        lastMessage: chatData.lastMessage,
        isTestChat,
        unreadCount: chatData.unreadCount,
      });
    }));

    // If this is a test user and test chat doesn't exist, initialize it
    if (isTestUser() && !chats.some(chat => chat.id === TEST_CHAT_ID)) {
      const initializedTestChatId = await initializeTestChat();
      if (initializedTestChatId) {
        const testChatDoc = await getDoc(doc(db, 'chats', TEST_CHAT_ID));
        if (testChatDoc.exists()) {
          const testChatData = testChatDoc.data();
          const otherTestUserId = getOtherTestUserId();
          const otherTestUserName = otherTestUserId ? TEST_USER_DISPLAY_NAMES[otherTestUserId] : 'Test User';
          
          chats.push({
            id: TEST_CHAT_ID,
            participantIds: testChatData.participantIds || [],
            participantNames: {
              ...testChatData.participantNames,
              [otherTestUserId || '']: `${otherTestUserName} (Test)`
            },
              lastMessage: testChatData.lastMessage,
              isTestChat: true,
              unreadCount: testChatData.unreadCount,
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

export type SendMessagePayload = Omit<ChatServiceMessage, 'id' | 'createdAt' | 'senderId' | 'status' | 'readBy'> & {
    senderId?: string;
};

export async function sendMessage(
  chatId: string,
  messageData: SendMessagePayload
): Promise<boolean> {
  try {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId || !chatId) {
      console.error('[chatService] Missing user ID or chat ID for sendMessage');
      return false;
    }

    if ((messageData.type === 'image' || messageData.type === 'video' || messageData.type === 'audio') && !messageData.mediaUrl) {
      console.error('[chatService] Media message missing mediaUrl:', messageData);
      return false;
    }
    if (messageData.type === 'text' && (!messageData.content || !messageData.content.trim())) {
      console.error('[chatService] Text message has invalid content:', messageData);
      return false;
    }

    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const chatRef = doc(db, 'chats', chatId);

    const dataForFirestore: { [key: string]: any } = {
      senderId: currentUserId,
      content: messageData.content || '',
      type: messageData.type,
      createdAt: serverTimestamp(),
      status: 'sending',
      readBy: [],
    };

    if (messageData.mediaUrl !== undefined) dataForFirestore.mediaUrl = messageData.mediaUrl;
    if (messageData.thumbnailUrl !== undefined) dataForFirestore.thumbnailUrl = messageData.thumbnailUrl;
    if (messageData.duration !== undefined) dataForFirestore.duration = messageData.duration;
    if (messageData.dimensions !== undefined) dataForFirestore.dimensions = messageData.dimensions;
    if (messageData.caption !== undefined) dataForFirestore.caption = messageData.caption;
    if (messageData.galleryItems !== undefined && messageData.galleryItems.length > 0) {
        dataForFirestore.galleryItems = messageData.galleryItems.map(item => ({ ...item }));
    }
    if (messageData.galleryCaption !== undefined) dataForFirestore.galleryCaption = messageData.galleryCaption;
    if (messageData.reactions !== undefined) dataForFirestore.reactions = messageData.reactions;
    if (messageData.replyTo !== undefined) {
        dataForFirestore.replyTo = { ...messageData.replyTo };
    }

    const typedFinalMessageData = dataForFirestore as Omit<ChatServiceMessage, 'id'>;

    const messageDocRef = await addDoc(messagesRef, typedFinalMessageData);
    await updateDoc(messageDocRef, { status: 'sent' });

    const lastMessageUpdate: ChatPreview['lastMessage'] = {
      content: typedFinalMessageData.content,
      senderId: currentUserId,
      timestamp: serverTimestamp() as Timestamp,
      type: typedFinalMessageData.type,
      ...(typedFinalMessageData.replyTo && { replyTo: typedFinalMessageData.replyTo }),
    };

    await updateDoc(chatRef, {
      lastMessage: lastMessageUpdate,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error sending message:', error);
    if (error instanceof Error && 'code' in error && (error as any).code?.startsWith('invalid-argument')) {
        console.error('Firebase invalid argument details (messageData):', JSON.stringify(messageData, null, 2));
    }
    return false;
  }
}

export function subscribeToMessages(
  chatId: string,
  callback: (messages: ChatServiceMessage[]) => void
): () => void {
  const messagesRef = collection(db, `chats/${chatId}/messages`);
  const messagesQuery = query(messagesRef, orderBy('createdAt', 'asc'));

  const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
    const messages: ChatServiceMessage[] = snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      
      // *** ADDED SAFETY CHECK FOR createdAt ***
      let createdAtValue: Timestamp;
      if (data.createdAt && typeof data.createdAt.toDate === 'function') {
        createdAtValue = data.createdAt as Timestamp;
      } else {
        // Fallback if createdAt is missing, null, or not a Firestore Timestamp
        console.warn(`Message ${docSnap.id} has invalid or missing createdAt. Using current server time as fallback.`);
        createdAtValue = Timestamp.now(); // Or handle as an error, or use a placeholder
      }

      return {
        id: docSnap.id,
        senderId: data.senderId,
        content: data.content || '',
        type: data.type || 'text',
        createdAt: createdAtValue, // Use the sanitized value
        mediaUrl: data.mediaUrl,
        thumbnailUrl: data.thumbnailUrl,
        duration: data.duration,
        dimensions: data.dimensions,
        caption: data.caption,
        galleryItems: data.galleryItems,
        galleryCaption: data.galleryCaption,
        reactions: data.reactions || {},
        replyTo: data.replyTo,
        readBy: data.readBy || [],
        status: data.status || 'sent',
      } as ChatServiceMessage;
    });
    callback(messages);
  }, (error) => {
    console.error(`Error listening to messages for chat ${chatId}:`, error);
    callback([]);
  });
  return unsubscribe;
}

export async function markMessagesAsRead(chatId: string): Promise<boolean> {
  try {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId || !chatId) return false;

    const messagesRef = collection(db, `chats/${chatId}/messages`);
    const unreadQuery = query(
      messagesRef,
      where('senderId', '!=', currentUserId)
    );

    const snapshot = await getDocs(unreadQuery);
    const batch = writeBatch(db);
    let madeUpdates = false;

    snapshot.forEach(docSnap => {
      const message = docSnap.data() as ChatServiceMessage;
      if (!message.readBy || !message.readBy.includes(currentUserId)) {
        const newReadBy = Array.isArray(message.readBy) ? [...message.readBy, currentUserId] : [currentUserId];
        batch.update(docSnap.ref, { readBy: newReadBy, status: 'read' });
        madeUpdates = true;
      }
    });

    if (madeUpdates) {
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
    const undeliveredQuery = query(
      messagesRef,
      where('senderId', '!=', currentUserId),
      where('status', '==', 'sent')
    );
    const snapshot = await getDocs(undeliveredQuery);
    if (snapshot.empty) return true;

    const batch = writeBatch(db);
    snapshot.forEach(docSnap => batch.update(docSnap.ref, { status: 'delivered' }));
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
      console.error('Message not found for reaction:', messageId);
      return false;
    }

    const messageData = messageDocSnap.data() as ChatServiceMessage;
    const currentReactions = { ...(messageData.reactions || {}) };

    let userPreviousReactionEmoji: string | null = null;
    for (const e in currentReactions) {
      if (currentReactions[e]?.includes(userId)) {
        userPreviousReactionEmoji = e;
        currentReactions[e] = currentReactions[e]!.filter(uid => uid !== userId);
        if (currentReactions[e]!.length === 0) {
          delete currentReactions[e];
        }
        break;
      }
    }

    if (userPreviousReactionEmoji !== emoji) {
        currentReactions[emoji] = [...(currentReactions[emoji] || []), userId];
    }

    await updateDoc(messageRef, { reactions: currentReactions });
    return true;
  } catch (error) {
    console.error('Error toggling reaction on message:', error);
    return false;
  }
}

export async function cleanupTestChat(): Promise<boolean> {
  if (!__DEV__) {
    console.warn('Test data cleanup is only available in development mode.');
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
    console.log('Test chat cleaned up successfully.');
    return true;
  } catch (error) {
    console.error('Error cleaning up test chat:', error);
    return false;
  }
}