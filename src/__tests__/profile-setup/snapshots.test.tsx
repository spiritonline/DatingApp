import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PersonalInfoScreen from '../../screens/profile-setup/PersonalInfoScreen';
import PhotoUploadScreen from '../../screens/profile-setup/PhotoUploadScreen';
import PromptsSetupScreen from '../../screens/profile-setup/PromptsSetupScreen';
import { AuthStackParamList } from '../../navigation/types';

// Mock Firebase
jest.mock('@firebase/firestore', () => ({
  doc: jest.fn().mockReturnValue('mocked-doc-ref'),
  setDoc: jest.fn().mockResolvedValue(undefined),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  collection: jest.fn()
}));

jest.mock('@firebase/storage', () => ({
  ref: jest.fn().mockReturnValue('mocked-storage-ref'),
  uploadBytes: jest.fn().mockResolvedValue(undefined),
  getDownloadURL: jest.fn().mockResolvedValue('https://example.com/test.jpg')
}));

jest.mock('../../services/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-id'
    }
  },
  db: {},
  storage: {}
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file://test/image1.jpg' }]
  }),
  MediaTypeOptions: {
    Images: 'Images'
  },
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true })
}));

// Mock expo-av
jest.mock('expo-av', () => ({
  Audio: {
    Recording: {
      createAsync: jest.fn().mockResolvedValue({
        recording: {
          startAsync: jest.fn().mockResolvedValue({}),
          stopAndUnloadAsync: jest.fn().mockResolvedValue({}),
          getURI: jest.fn().mockReturnValue('file://test/recording.mp3')
        }
      }),
      RECORDING_OPTIONS_PRESET_HIGH_QUALITY: {}
    }
  }
}));

// Mock navigation
const Stack = createNativeStackNavigator<AuthStackParamList>();

// Instead of mocking useColorScheme, we'll use a simpler approach

describe('Profile Setup Screens Snapshots', () => {
  it('renders PersonalInfoScreen correctly in light mode', () => {
    const MockNavigator = () => (
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
    
    const { toJSON } = render(<MockNavigator />);
    expect(toJSON()).toMatchSnapshot();
  });
  
  it('renders PhotoUploadScreen correctly in light mode', () => {
    const MockNavigator = () => (
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="PhotoUpload" component={PhotoUploadScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
    
    const { toJSON } = render(<MockNavigator />);
    expect(toJSON()).toMatchSnapshot();
  });
  
  it('renders PromptsSetupScreen correctly in light mode', () => {
    const MockNavigator = () => (
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="PromptsSetup" component={PromptsSetupScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
    
    const { toJSON } = render(<MockNavigator />);
    expect(toJSON()).toMatchSnapshot();
  });
});
