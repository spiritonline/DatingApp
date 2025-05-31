import { auth } from './firebase';
import { initializeJakeChat } from './chatService';
import { onAuthStateChanged } from '@firebase/auth';

/**
 * Initialize the auto-chat system that handles automatically creating
 * and maintaining a chat conversation between any user and Jake Martinez.
 * 
 * This should be called once when the app starts up.
 */
export function initializeJakeChatSystem() {
  // Listen for auth state changes to detect when any user logs in
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('User detected, ensuring Jake chat exists...');
      try {
        const chatId = await initializeJakeChat();
        if (chatId) {
          console.log('Jake chat ensured successfully with ID:', chatId);
        } else {
          console.log('No Jake chat needed (user might be Jake himself)');
        }
      } catch (error) {
        console.error('Error ensuring Jake chat:', error);
      }
    }
  });

  // Return the unsubscribe function in case it needs to be cleaned up
  return unsubscribe;
}

/**
 * Simple utility function to check if the current environment is development
 * and if the specified feature flag is enabled.
 */
export function isFeatureEnabled(featureName: string): boolean {
  if (!__DEV__) return false;
  
  // In a real app, this might read from a config file or environment variables
  const DEV_FEATURES = {
    testChat: true,
  };
  
  return DEV_FEATURES[featureName as keyof typeof DEV_FEATURES] === true;
}
