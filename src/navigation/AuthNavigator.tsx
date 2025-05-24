import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import WelcomeScreen from '../screens/WelcomeScreen';
import SignUpScreen from '../screens/SignUpScreen';
import LogInScreen from '../screens/LogInScreen';
import MainFeedScreen from '../screens/MainFeedScreen';
// Import profile setup screens - these will be created next
import PersonalInfoScreen from '../screens/profile-setup/PersonalInfoScreen';
import PhotoUploadScreen from '../screens/profile-setup/PhotoUploadScreen';
import PromptsSetupScreen from '../screens/profile-setup/PromptsSetupScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

interface AuthNavigatorProps {
  initialRouteName?: keyof AuthStackParamList;
}

export function AuthNavigator({ initialRouteName = 'Welcome' }: AuthNavigatorProps) {
  return (
    <Stack.Navigator 
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="LogIn" component={LogInScreen} />
      <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
      <Stack.Screen name="PhotoUpload" component={PhotoUploadScreen} />
      <Stack.Screen name="PromptsSetup" component={PromptsSetupScreen} />
      <Stack.Screen name="MainFeed" component={MainFeedScreen} />
    </Stack.Navigator>
  );
}
