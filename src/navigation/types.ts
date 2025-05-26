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
