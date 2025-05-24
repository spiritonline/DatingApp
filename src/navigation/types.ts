import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  LogIn: undefined;
  MainFeed: undefined; // Placeholder for post-auth navigation
};

export type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;
