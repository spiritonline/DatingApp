import { initializeApp } from 'firebase/app';
import { getFirestore, doc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';

// Firebase config - should match your project
const firebaseConfig = {
  // You'll need to add your actual Firebase config here
  // This can be found in your Firebase project settings
};

// Initialize Firebase (if not already done)
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Clean up legacy test chats that create "User" entries in chat list
 */
async function cleanupLegacyChats() {
  console.log('Starting cleanup of legacy test chats...');
  
  try {
    // Delete specific legacy test chat documents that were identified
    const legacyChatIds = [
      'testChat_Iq8dtHo0rnSbQsbos2bzVfapHp42_gxCPvaE154aQ6VE1yESLD6dloTy1',
      'testChat_dqrwMcXBVwTYqYBhdcZDNApIu6l1_gxCPvaE154aQ6VE1yESLD6dloTy1'
    ];
    
    for (const chatId of legacyChatIds) {
      try {
        console.log(`Deleting legacy chat: ${chatId}`);
        await deleteDoc(doc(db, 'chats', chatId));
        console.log(`✅ Successfully deleted chat: ${chatId}`);
      } catch (error) {
        console.error(`❌ Error deleting chat ${chatId}:`, error);
      }
    }
    
    // Also look for any other test chats that might exist
    console.log('\nSearching for other test chats...');
    const chatsRef = collection(db, 'chats');
    const testChatsQuery = query(chatsRef, where('isTestChat', '==', true));
    const testChatsSnapshot = await getDocs(testChatsQuery);
    
    if (!testChatsSnapshot.empty) {
      console.log(`Found ${testChatsSnapshot.size} additional test chats to clean up`);
      
      for (const chatDoc of testChatsSnapshot.docs) {
        const chatData = chatDoc.data();
        const chatId = chatDoc.id;
        
        // Skip Jake Martinez chats (they should have isDefaultChat: true)
        if (chatData.isDefaultChat) {
          console.log(`Skipping default chat (Jake Martinez): ${chatId}`);
          continue;
        }
        
        try {
          console.log(`Deleting test chat: ${chatId}`);
          await deleteDoc(doc(db, 'chats', chatId));
          console.log(`✅ Successfully deleted test chat: ${chatId}`);
        } catch (error) {
          console.error(`❌ Error deleting test chat ${chatId}:`, error);
        }
      }
    } else {
      console.log('No additional test chats found');
    }
    
    console.log('\n🎉 Legacy chat cleanup completed!');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Run the cleanup
if (require.main === module) {
  cleanupLegacyChats()
    .then(() => {
      console.log('Cleanup script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cleanup script failed:', error);
      process.exit(1);
    });
}

export { cleanupLegacyChats };