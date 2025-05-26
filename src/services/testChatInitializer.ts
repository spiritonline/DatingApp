import { auth } from './firebase';
import { initializeTestChat, isTestUser } from './chatService';
import { onAuthStateChanged } from '@firebase/auth';

/**
 * Initialize the test chat system that handles automatically creating
 * and maintaining the test chat conversation between the two test accounts.
 * 
 * This should be called once when the app starts up.
 */
export function initializeTestChatSystem() {
  // Listen for auth state changes to detect when a test user logs in
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user && isTestUser()) {
      console.log('Test user detected, initializing test chat...');
      try {
        const chatId = await initializeTestChat();
        if (chatId) {
          console.log('Test chat initialized successfully with ID:', chatId);
        } else {
          console.warn('Failed to initialize test chat');
        }
      } catch (error) {
        console.error('Error initializing test chat:', error);
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
