import { FirebaseAuthTypes } from '@react-native-firebase/auth';

declare module '../../../services/firebase' {
  export const auth: {
    currentUser: FirebaseAuthTypes.User | null;
    // Add other auth methods as needed
  };
  
  // Add other Firebase exports as needed
}
