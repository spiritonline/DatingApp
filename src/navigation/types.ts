import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';

// Auth navigation stack parameter list
export type AuthStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  LogIn: undefined;
  PersonalInfo: undefined;
  PhotoUpload: undefined;
  PromptsSetup: undefined;
  MainFeed: undefined;
  VideoIntro: { 
    profileId: string 
  };
  ChatConversation: { 
    chatId: string;
    partnerName: string;
  };
  MediaPreview: {
    mediaItems: Array<{ uri: string; type: 'image' | 'video'; width?: number; height?: number; duration?: number; fileName?: string }>;
    chatId: string;
    replyToMessage?: any; // Consider a more specific type from ChatMessage
  };
  ImageViewer: {
    images: Array<{ id: string; uri: string; caption?: string; width?: number; height?: number }>;
    initialIndex?: number;
  };
  DebugImageViewer: undefined;
};

// Main tab navigation parameter list
export type MainTabParamList = {
  Discover: undefined;
  ChatList: undefined;
  Profile: undefined;
};

// Navigation prop types
export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
export type MainTabNavigationProp = BottomTabNavigationProp<MainTabParamList>;

// Combined navigation prop for screens inside tabs
export type MainNavigationProp = CompositeNavigationProp<
  MainTabNavigationProp,
  AuthNavigationProp
>;
