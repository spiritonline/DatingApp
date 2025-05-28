import { NavigatorScreenParams } from '@react-navigation/native';
import { MediaItem } from '../screens/ChatConversationScreen';

// Root stack parameter list
export type RootStackParamList = {
  // Auth screens
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  
  // Main app screens
  Main: NavigatorScreenParams<MainTabParamList>;
  ProfileSetup: NavigatorScreenParams<ProfileSetupParamList>;
  
  // Chat screens
  ChatList: undefined;
  ChatConversation: {
    chatId: string;
    partnerName: string;
  };
  
  // Media screens
  MediaPreview: {
    mediaItems: MediaItem[];
    initialIndex?: number;
  };
  ImageViewer: {
    images: {
      id: string;
      uri: string;
      caption?: string;
      width?: number;
      height?: number;
    }[];
    initialIndex?: number;
  };
  
  // Utility screens
  Settings: undefined;
  Notifications: undefined;
  UserProfile: { userId: string };
};

// Main tab navigator parameter list
export type MainTabParamList = {
  Home: undefined;
  Explore: undefined;
  Chat: undefined;
  Profile: undefined;
};

// Profile setup flow parameter list
export type ProfileSetupParamList = {
  Welcome: undefined;
  BasicInfo: undefined;
  Photos: undefined;
  Preferences: undefined;
  Bio: undefined;
  Complete: undefined;
};

// Auth stack parameter list
export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};
