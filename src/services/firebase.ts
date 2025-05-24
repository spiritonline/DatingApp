import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, getApp } from '@firebase/app';
// @ts-ignore - Suppressing error due to potential type definition issue in Firebase SDK v11.8.1
import { initializeAuth, getReactNativePersistence } from '@firebase/auth';
import { getFirestore } from '@firebase/firestore';
import { getStorage, connectStorageEmulator } from '@firebase/storage';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "datingappbackend-2c3d7.firebaseapp.com",
  projectId: "datingappbackend-2c3d7",
  storageBucket: "datingappbackend-2c3d7.firebasestorage.app", // Using the correct firebasestorage.app format
  messagingSenderId: "37726804970",
  appId: "1:37726804970:web:fa0555dce9e97bcce5b093",
  measurementId: "G-HGJQB6W6P3"
};

// Initialize Firebase with singleton pattern to prevent duplicate app initialization
let app;
try {
  // Try to get existing app instance first
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  console.log('Firebase app initialized or retrieved successfully');
} catch (error) {
  console.error('Error during Firebase app initialization:', error);
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
  console.log('Initializing Firebase Storage with explicit bucket...');
  storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);
  console.log('Firebase Storage initialized successfully with explicit bucket');
  
  // Log the storage bucket for verification
  console.log(`Current storage bucket: ${(storage as any)._bucket || 'unknown'}`);
  
  // Check if we're in development/emulator mode
  if (__DEV__ && false) { // Set to true to use emulator
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    console.log('Connected to Firebase Storage emulator');
  }
} catch (storageError) {
  console.error('Error initializing Firebase Storage with explicit bucket:', storageError);
  
  try {
    // Fallback to default initialization
    storage = getStorage(app);
    console.log('Firebase Storage initialized with default configuration');
  } catch (fallbackError) {
    console.error('All Firebase Storage initialization attempts failed');
    // Create a dummy storage instance to prevent app crashes
    // The app will show appropriate errors when trying to upload
    storage = getStorage();
  }
}

export { auth, db, storage };
export default app;
