import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from '@firebase/app';
// @ts-ignore - Suppressing error due to potential type definition issue in Firebase SDK v11.8.1
import { initializeAuth, getReactNativePersistence } from '@firebase/auth';
import { getFirestore } from '@firebase/firestore';
import { getStorage } from '@firebase/storage';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "datingappbackend-2c3d7.firebaseapp.com",
  projectId: "datingappbackend-2c3d7",
  storageBucket: "datingappbackend-2c3d7.firebasestorage.app",
  messagingSenderId: "37726804970",
  appId: "1:37726804970:web:fa0555dce9e97bcce5b093",
  measurementId: "G-HGJQB6W6P3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

export { auth, db, storage };
export default app;
