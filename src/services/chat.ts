import { collection, doc, getDoc, setDoc, query, where, getDocs, orderBy, addDoc, serverTimestamp, updateDoc, onSnapshot, writeBatch, Timestamp } from '@firebase/firestore';
import { db, auth } from './firebase';
// Import types from the new central location
import { ChatServiceMessage, ChatPreview as ServiceChatPreviewType, GalleryMediaItem } from '../types/chat'; // Renamed ChatPreview to avoid conflict
import { getUserProfile } from './profileService';

// Test user UIDs
const TEST_USER_1_UID = 'dqrwMcXBVwTYqYBhdcZDNApIu6l1';
const TEST_USER_2_UID = 'gxCPvaE154aQ6VE1yESLD6dloTy1';
const TEST_CHAT_ID = `testChat_${[TEST_USER_1_UID, TEST_USER_2_UID].sort().join('_')}`;

// Cache for user display names
const userDisplayNames: Record<string, string> = {};

/**
 * Fetches user display names from Firestore
 * @param userIds Array of user IDs to fetch names for
 */
async function fetchUserDisplayNames(userIds: string[]): Promise<Record<string, string>> {
  const names: Record<string, string> = {};
  const userIdsToFetch = userIds.filter(id => !userDisplayNames[id]);

  if (userIdsToFetch.length === 0) {
    return {};
  }

  try {
    // Fetch user profiles in batch
    const profilesQuery = query(
      collection(db, 'profiles'),
      where('uid', 'in', userIdsToFetch)
    );
    
    const querySnapshot = await getDocs(profilesQuery);
    
    querySnapshot.forEach(doc => {
      const userData = doc.data();
      const uid = userData.uid;
      const displayName = userData.displayName || userData.name || 'Unknown User';
      names[uid] = displayName;
      userDisplayNames[uid] = displayName; // Cache the result
    });
  } catch (error) {
    console.error('Error fetching user display names:', error);
  }

  return names;
}

/**
 * Gets display name for a user, either from cache or Firestore
 * @param userId User ID to get name for
 * @returns Display name or 'Unknown User' if not found
 */
export async function getUserDisplayName(userId: string): Promise<string> {
  if (!userId) return 'Unknown User';
  
  // Check cache first
  if (userDisplayNames[userId]) {
    return userDisplayNames[userId];
  }

  // Fetch from Firestore if not in cache
  try {
    const userProfile = await getUserProfile(userId);
    const displayName = userProfile?.displayName || userProfile?.name || 'Unknown User';
    userDisplayNames[userId] = displayName; // Cache the result
    return displayName;
  } catch (error) {
    console.error(`Error fetching display name for user ${userId}:`, error);
    return 'Unknown User';
  }
}

// Re-export types for consumers of this service
export type { ChatServiceMessage, ServiceChatPreviewType, GalleryMediaItem };

// getUserDisplayName is already exported at its declaration above

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
      // Get display names for test users
      const participantIds = [TEST_USER_1_UID, TEST_USER_2_UID];
      const participantNames = {} as Record<string, string>;
      
      // Fetch display names for both test users
      await Promise.all(participantIds.map(async (uid) => {
        participantNames[uid] = await getUserDisplayName(uid);
      }));

      await setDoc(chatDocRef, {
        participantIds,
        participantNames,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isTestChat: true,
      });

      const messagesRef = collection(db, `chats/${TEST_CHAT_ID}/messages`);
      // Get display names for the initial message
      const userName1 = await getUserDisplayName(TEST_USER_1_UID);
      const userName2 = await getUserDisplayName(TEST_USER_2_UID);
      
      const initialMessage: Partial<ChatServiceMessage> = {
        senderId: 'system',
        content: `🧪 This is a test conversation between ${userName1} and ${userName2}`,
        type: 'text',
        createdAt: serverTimestamp() as Timestamp,
        status: 'sent',
      };
      
      // Pre-fetch display names for the chat participants
      await fetchUserDisplayNames([TEST_USER_1_UID, TEST_USER_2_UID]);
      
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
    // First collect all participant IDs to fetch their display names in batch
    const allParticipantIds = new Set<string>();
    const chatsData = chatsSnapshot.docs.map(chatDoc => {
      const chatData = chatDoc.data() as {
        participantIds?: string[];
        participantNames?: Record<string, string>;
        lastMessage?: any;
        isTestChat?: boolean;
      };
      chatData.participantIds?.forEach((id: string) => allParticipantIds.add(id));
      return { 
        id: chatDoc.id, 
        participantIds: chatData.participantIds || [],
        participantNames: chatData.participantNames || {},
        lastMessage: chatData.lastMessage,
        isTestChat: chatData.isTestChat || false
      };
    });

    // Fetch all display names in a single batch
    if (allParticipantIds.size > 0) {
      await fetchUserDisplayNames(Array.from(allParticipantIds));
    }

    // Now create chat objects with the fetched display names
    for (const chatData of chatsData) {
      const participantNames = {} as Record<string, string>;
      
      // Get display names from cache
      for (const uid of chatData.participantIds || []) {
        participantNames[uid] = userDisplayNames[uid] || 'Unknown User';
      }
      
      chats.push({
        id: chatData.id,
        participantIds: chatData.participantIds,
        participantNames,
        lastMessage: chatData.lastMessage,
        isTestChat: chatData.isTestChat || false,
      });
    }

    if (isTestUser() && !chats.some(chat => chat.id === TEST_CHAT_ID)) {
      const initializedTestChatId = await initializeTestChat(); // Ensure it's initialized
      if (initializedTestChatId) {
          const testChatDoc = await getDoc(doc(db, 'chats', TEST_CHAT_ID));
          if (testChatDoc.exists()) {
            const testChatData = testChatDoc.data();
            const participantNames = {} as Record<string, string>;
            
            // Ensure we have display names for test chat participants
            const participantIds = testChatData.participantIds || [];
            await Promise.all(participantIds.map(async (uid: string) => {
              participantNames[uid] = await getUserDisplayName(uid);
            }));
            
            chats.push({
              id: TEST_CHAT_ID,
              participantIds,
              participantNames,
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