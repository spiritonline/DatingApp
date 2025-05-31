import { db } from '../services/firebase';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Debug utility to check and fix messages with invalid timestamps
 * This should only be used in development to diagnose timestamp issues
 */
export async function debugAndFixMessageTimestamps() {
  if (!__DEV__) {
    console.warn('debugAndFixMessageTimestamps should only be used in development');
    return;
  }

  try {
    console.log('🔍 Checking for messages with invalid timestamps...');
    
    // Get all chats
    const chatsSnapshot = await getDocs(collection(db, 'chats'));
    let totalChecked = 0;
    let totalFixed = 0;

    for (const chatDoc of chatsSnapshot.docs) {
      const chatId = chatDoc.id;
      console.log(`Checking chat: ${chatId}`);
      
      // Get all messages in this chat
      const messagesSnapshot = await getDocs(collection(db, `chats/${chatId}/messages`));
      
      for (const messageDoc of messagesSnapshot.docs) {
        totalChecked++;
        const data = messageDoc.data();
        
        // Check if createdAt is invalid
        const hasValidTimestamp = data.createdAt && 
          (typeof data.createdAt.toDate === 'function' || 
           (data.createdAt.seconds !== undefined && data.createdAt.nanoseconds !== undefined));
        
        if (!hasValidTimestamp) {
          console.warn(`❌ Found invalid timestamp in message ${messageDoc.id}:`, data.createdAt);
          
          // Fix the timestamp
          try {
            await updateDoc(doc(db, `chats/${chatId}/messages`, messageDoc.id), {
              createdAt: serverTimestamp()
            });
            console.log(`✅ Fixed timestamp for message ${messageDoc.id}`);
            totalFixed++;
          } catch (error) {
            console.error(`❌ Failed to fix message ${messageDoc.id}:`, error);
          }
        }
      }
    }
    
    console.log(`🏁 Timestamp check complete:`);
    console.log(`   Total messages checked: ${totalChecked}`);
    console.log(`   Messages fixed: ${totalFixed}`);
    
  } catch (error) {
    console.error('Error debugging timestamps:', error);
  }
}

/**
 * Log timestamp format details for debugging
 */
export function logTimestampDetails(timestamp: any, messageId?: string) {
  if (!__DEV__) return;
  
  const prefix = messageId ? `Message ${messageId}:` : 'Timestamp:';
  
  console.log(`${prefix} Timestamp details:`, {
    type: typeof timestamp,
    value: timestamp,
    hasToDate: timestamp && typeof timestamp.toDate === 'function',
    hasSeconds: timestamp && timestamp.seconds !== undefined,
    hasNanoseconds: timestamp && timestamp.nanoseconds !== undefined,
    hasPrivateSeconds: timestamp && timestamp._seconds !== undefined,
  });
}