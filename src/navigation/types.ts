import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  LogIn: undefined;
  PersonalInfo: undefined;
  PhotoUpload: undefined;
  PromptsSetup: undefined;
  MainFeed: undefined; // Post-auth navigation
};

export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
