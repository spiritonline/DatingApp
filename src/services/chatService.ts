// src/services/chatService.ts
import { collection, doc, getDoc, setDoc, query, where, getDocs, orderBy, addDoc, serverTimestamp, updateDoc, onSnapshot, writeBatch, Timestamp } from '@firebase/firestore';
import { db, auth } from './firebase';
import { ChatServiceMessage, ChatPreview, GalleryMediaItem } from '../types/chat';
import { getUserProfile } from './profileService';

// Jake Martinez - the default chat partner for all users
const JAKE_MARTINEZ_UID = 'Iq8dtHo0rnSbQsbos2bzVfapHp42';

export type { ChatServiceMessage, ChatPreview, GalleryMediaItem };

// Generate chat ID between current user and Jake Martinez
function generateChatId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('_');
}

export async function initializeJakeChat(): Promise<string | null> {
  try {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
      if (__DEV__) {
        console.error('No user is currently logged in for initializeJakeChat');
      }
      return null;
    }

    // Don't create chat if user is Jake Martinez himself
    if (currentUserId === JAKE_MARTINEZ_UID) {
      if (__DEV__) {
        console.log('Current user is Jake Martinez, skipping auto-chat creation');
      }
      return null;
    }

    const chatId = generateChatId(currentUserId, JAKE_MARTINEZ_UID);
    const chatDocRef = doc(db, 'chats', chatId);
    const chatDocSnap = await getDoc(chatDocRef);

    if (!chatDocSnap.exists()) {
      // Get Jake's profile to ensure he exists
      const jakeProfile = await getUserProfile(JAKE_MARTINEZ_UID);
      if (!jakeProfile) {
        if (__DEV__) {
          console.error('Jake Martinez profile not found in database');
        }
        return null;
      }

      // Get current user's profile
      const currentUserProfile = await getUserProfile(currentUserId);
      if (!currentUserProfile) {
        if (__DEV__) {
          console.error('Current user profile not found');
        }
        return null;
      }

      // Create the chat
      await setDoc(chatDocRef, {
        participantIds: [currentUserId, JAKE_MARTINEZ_UID],
        participantNames: {
          [currentUserId]: currentUserProfile.displayName || currentUserProfile.name || 'User',
          [JAKE_MARTINEZ_UID]: jakeProfile.displayName || jakeProfile.name || 'Jake Martinez'
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isDefaultChat: true,
      });

      // Add a welcome message from Jake
      const messagesRef = collection(db, `chats/${chatId}/messages`);
      const welcomeMessage: Partial<ChatServiceMessage> = {
        senderId: JAKE_MARTINEZ_UID,
        content: '👋 Hey there! Welcome to the app. Feel free to message me anytime!',
        type: 'text',
        createdAt: serverTimestamp() as Timestamp,
        status: 'sent',
      };
      await addDoc(messagesRef, welcomeMessage);
      
      if (__DEV__) {
        console.log('Jake chat initialized successfully with ID:', chatId);
      }
    } else {
      if (__DEV__) {
        console.log('Chat with Jake already exists:', chatId);
      }
    }
    
    return chatId;
  } catch (error) {
    if (__DEV__) {
      console.error('Error initializing Jake chat:', error);
    }
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
      
      // Skip chats without valid other participant
      if (!otherParticipantId) {
        console.warn(`Skipping chat ${chatDoc.id}: no valid other participant found`);
        return;
      }
      
      // Skip legacy test chats (but keep Jake Martinez default chats)
      const isLegacyTestChat = chatDoc.id.startsWith('testChat_') && !chatData.isDefaultChat;
      if (isLegacyTestChat) {
        console.warn(`Skipping legacy test chat: ${chatDoc.id}`);
        return;
      }
      
      // Get the other participant's profile
      let participantName = '';
      let profileExists = false;
      
      if (otherParticipantId) {
        try {
          const profile = await getUserProfile(otherParticipantId);
          if (profile) {
            participantName = profile.displayName || profile.name || `User ${otherParticipantId.substring(0, 8)}`;
            profileExists = true;
          }
        } catch (error) {
          console.error(`Error fetching profile for user ${otherParticipantId}:`, error);
        }
      }
      
      // Skip chats where the other participant's profile doesn't exist (orphaned chats)
      // Exception: Keep Jake Martinez chats even if profile fetch fails
      const isJakeChat = otherParticipantId === JAKE_MARTINEZ_UID || chatData.isDefaultChat;
      if (!profileExists && !isJakeChat) {
        console.warn(`Skipping orphaned chat ${chatDoc.id}: participant ${otherParticipantId} profile not found`);
        return;
      }
      
      // For Jake Martinez chats, ensure we have a proper name even if profile fetch fails
      if (isJakeChat && !participantName) {
        participantName = 'Jake Martinez';
      }
      
      // Mark default chats (chats with Jake Martinez)
      const isDefaultChat = chatData.isDefaultChat || isJakeChat;
      
      chats.push({
        id: chatDoc.id,
        participantIds,
        participantNames: {
          ...chatData.participantNames,
          [otherParticipantId]: participantName
        },
        lastMessage: chatData.lastMessage,
        isTestChat: false, // No more test chats
        unreadCount: chatData.unreadCount,
      });
    }));

    // Auto-initialize Jake chat for all users (except Jake himself)
    if (currentUserId !== JAKE_MARTINEZ_UID) {
      const jakeChatId = generateChatId(currentUserId, JAKE_MARTINEZ_UID);
      const existingJakeChat = chats.find(chat => chat.id === jakeChatId);
      
      if (!existingJakeChat) {
        const initializedJakeChatId = await initializeJakeChat();
        if (initializedJakeChatId) {
          // Refresh the specific Jake chat after creation
          const jakeChatDoc = await getDoc(doc(db, 'chats', jakeChatId));
          if (jakeChatDoc.exists()) {
            const jakeChatData = jakeChatDoc.data();
            const jakeProfile = await getUserProfile(JAKE_MARTINEZ_UID);
            
            chats.push({
              id: jakeChatId,
              participantIds: jakeChatData.participantIds || [],
              participantNames: {
                ...jakeChatData.participantNames,
                [JAKE_MARTINEZ_UID]: jakeProfile?.displayName || jakeProfile?.name || 'Jake Martinez'
              },
              lastMessage: jakeChatData.lastMessage,
              isTestChat: false,
              unreadCount: jakeChatData.unreadCount || 0,
            });
          }
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
    if (__DEV__) {
      console.error('Error sending message:', error);
      if (error instanceof Error && 'code' in error && (error as any).code?.startsWith('invalid-argument')) {
          console.error('Firebase invalid argument details (messageData):', JSON.stringify(messageData, null, 2));
      }
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

export async function ensureJakeChatExists(): Promise<string | null> {
  // Helper function to ensure Jake chat exists for current user
  return await initializeJakeChat();
}

/**
 * Create a chat between two matched users
 * @param currentUserId Current user ID
 * @param matchedUserId Matched user ID
 * @returns Promise with chat ID
 */
export async function createMatchChat(currentUserId: string, matchedUserId: string): Promise<string | null> {
  try {
    const chatId = generateChatId(currentUserId, matchedUserId);
    const chatDocRef = doc(db, 'chats', chatId);
    const chatDocSnap = await getDoc(chatDocRef);

    if (!chatDocSnap.exists()) {
      // Get both user profiles
      const [currentUserProfile, matchedUserProfile] = await Promise.all([
        getUserProfile(currentUserId),
        getUserProfile(matchedUserId)
      ]);

      if (!currentUserProfile || !matchedUserProfile) {
        console.error('Could not fetch user profiles for match chat creation');
        return null;
      }

      // Create the chat
      await setDoc(chatDocRef, {
        participantIds: [currentUserId, matchedUserId],
        participantNames: {
          [currentUserId]: currentUserProfile.displayName || currentUserProfile.name || 'User',
          [matchedUserId]: matchedUserProfile.displayName || matchedUserProfile.name || 'User'
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isMatchChat: true, // Mark as match-based chat
      });

      console.log('Match chat created successfully with ID:', chatId);
    } else {
      console.log('Chat between matched users already exists:', chatId);
    }
    
    return chatId;
  } catch (error) {
    console.error('Error creating match chat:', error);
    return null;
  }
}