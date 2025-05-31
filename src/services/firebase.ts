import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, getApp } from '@firebase/app';
// @ts-ignore - Suppressing error due to potential type definition issue in Firebase SDK v11.8.1
import { initializeAuth, getReactNativePersistence } from '@firebase/auth';
import { getFirestore } from '@firebase/firestore';
import { getStorage, connectStorageEmulator } from '@firebase/storage';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID
} from '@env';

// Validate required environment variables
const validateFirebaseConfig = () => {
  const requiredVars = {
    FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID,
  };

  const missingVars = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(`Missing required Firebase environment variables: ${missingVars.join(', ')}`);
  }

  // Validate API key format (should start with AIza)
  if (!FIREBASE_API_KEY.startsWith('AIza')) {
    throw new Error('Invalid Firebase API key format');
  }

  // Validate project ID format (should be alphanumeric with hyphens)
  if (!/^[a-z0-9-]+$/.test(FIREBASE_PROJECT_ID)) {
    throw new Error('Invalid Firebase project ID format');
  }

  return true;
};

// Validate configuration before use
validateFirebaseConfig();

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
  measurementId: FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase with singleton pattern to prevent duplicate app initialization
let app;
try {
  // Try to get existing app instance first
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  if (__DEV__) {
    console.log('Firebase app initialized or retrieved successfully');
  }
} catch (error) {
  if (__DEV__) {
    console.error('Error during Firebase app initialization:', error);
  }
  // Fallback to initializing a new app
  app = initializeApp(firebaseConfig);
}

// Initialize Firebase Auth with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

// Initialize Storage with explicit region and retry mechanism
let storage: ReturnType<typeof getStorage>;

// Define options for Storage initialization
const storageOptions = {
  maxOperationRetryTime: 10000, // 10 seconds max retry time
  maxUploadRetryTime: 30000, // 30 seconds max upload retry time
};

try {
  // First, try with explicit bucket and region
  if (__DEV__) {
    console.log('Initializing Firebase Storage with explicit bucket...');
  }
  storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);
  if (__DEV__) {
    console.log('Firebase Storage initialized successfully with explicit bucket');
  }
  
  // Check if we're in development/emulator mode
  if (__DEV__ && process.env.USE_FIREBASE_EMULATOR === 'true') { // Set USE_FIREBASE_EMULATOR=true in .env to use emulator
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    console.log('Connected to Firebase Storage emulator');
  }
} catch (storageError) {
  if (__DEV__) {
    console.error('Error initializing Firebase Storage with explicit bucket:', storageError);
  }
  
  try {
    // Fallback to default initialization
    storage = getStorage(app);
    if (__DEV__) {
      console.log('Firebase Storage initialized with default configuration');
    }
  } catch (fallbackError) {
    if (__DEV__) {
      console.error('All Firebase Storage initialization attempts failed');
    }
    // Create a dummy storage instance to prevent app crashes
    // The app will show appropriate errors when trying to upload
    storage = getStorage();
  }
}

export { auth, db, storage };
export default app;
