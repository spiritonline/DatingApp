import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import WelcomeScreen from '../screens/WelcomeScreen';
import SignUpScreen from '../screens/SignUpScreen';
import LogInScreen from '../screens/LogInScreen';
import MainFeedScreen from '../screens/MainFeedScreen';
import PersonalInfoScreen from '../screens/profile-setup/PersonalInfoScreen';
import PhotoUploadScreen from '../screens/profile-setup/PhotoUploadScreen';
import PromptsSetupScreen from '../screens/profile-setup/PromptsSetupScreen';
import VideoIntroScreen from '../screens/VideoIntroScreen';
import ChatConversationScreen from '../screens/ChatConversationScreen';
import MediaPreviewScreen from '../screens/MediaPreviewScreen';
import ImageViewerScreen from '../screens/ImageViewerScreen';
import DebugImageViewerScreen from '../screens/DebugImageViewerScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ImagePickerTestScreen from '../screens/debug/ImagePickerTestScreen';

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
      <Stack.Screen name="VideoIntro" component={VideoIntroScreen} />
      <Stack.Screen name="ChatConversation" component={ChatConversationScreen} />
      <Stack.Screen name="MediaPreview" component={MediaPreviewScreen} />
      <Stack.Screen name="DebugImageViewer" component={DebugImageViewerScreen} />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
        options={{
          headerShown: true,
          title: 'Edit Profile',
          headerBackTitle: 'Cancel',
          headerTintColor: '#FF6B6B',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen 
        name="ImageViewer" 
        component={ImageViewerScreen} 
        options={{ 
          animation: 'fade',
          presentation: 'fullScreenModal', // Use fullScreenModal for true fullscreen
          headerShown: false
        }}
      />
      <Stack.Screen 
        name="ImagePickerTest" 
        component={ImagePickerTestScreen} 
        options={{
          headerShown: true,
          headerTitle: 'Image Picker Test',
          animation: 'slide_from_right'
        }}
      />
    </Stack.Navigator>
  );
}
