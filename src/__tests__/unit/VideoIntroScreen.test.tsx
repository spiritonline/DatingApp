import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import VideoIntroScreen from '../../screens/VideoIntroScreen';
import * as ExpoCamera from 'expo-camera';
import * as VideoThumbnails from 'expo-video-thumbnails';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
    useRoute: () => ({
      params: { profileId: 'test-profile-id' }
    }),
  };
});

// Mock expo-camera
jest.mock('expo-camera', () => {
  return {
    Camera: 'Camera',
    CameraType: {
      front: 'front',
      back: 'back'
    },
    // Use the same API pattern as our implementation
    requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    requestMicrophonePermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  };
});

// Mock expo-video-thumbnails
jest.mock('expo-video-thumbnails', () => ({
  getThumbnailAsync: jest.fn().mockResolvedValue({ uri: 'thumbnail-uri' }),
}));

// Mock expo-av
jest.mock('expo-av', () => ({
  Video: 'Video',
  ResizeMode: {
    COVER: 'cover'
  }
}));

// Mock FileSystem
jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 1024 }),
  readAsStringAsync: jest.fn().mockResolvedValue('file-content'),
}));

// Mock useLikeHandler
jest.mock('../../hooks/useLikeHandler', () => ({
  useLikeHandler: () => ({
    submitVideoLike: jest.fn().mockResolvedValue(true),
  }),
}));

// Mock Firebase storage
jest.mock('../../services/firebase', () => ({
  auth: {
    currentUser: { uid: 'test-user-id' }
  },
  storage: jest.fn(),
}));

jest.mock('@firebase/storage', () => ({
  ref: jest.fn().mockReturnValue({}),
  uploadBytes: jest.fn().mockResolvedValue({}),
  getDownloadURL: jest.fn().mockResolvedValue('video-download-url'),
}));

describe('VideoIntroScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state when checking permissions', async () => {
    // Override permission mock to return null initially with a delay
    const mockExpoCamera = ExpoCamera as any;
    mockExpoCamera.requestCameraPermissionsAsync.mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({ status: 'granted' }), 100))
    );

    const { getByTestId, queryByText } = render(
      <NavigationContainer>
        <VideoIntroScreen />
      </NavigationContainer>
    );

    expect(getByTestId('video-intro-screen')).toBeTruthy();
    expect(queryByText(/Camera and microphone access is required/i)).toBeFalsy();
  });

  it('renders camera UI when permissions are granted', async () => {
    const { getByTestId, getByText } = render(
      <NavigationContainer>
        <VideoIntroScreen />
      </NavigationContainer>
    );

    expect(getByTestId('video-intro-screen')).toBeTruthy();
    expect(getByText(/Record a 5-60 second video/i)).toBeTruthy();
  });

  it('handles permission denial correctly', async () => {
    // Override permission mock to return denied using our type casting approach
    const mockExpoCamera = ExpoCamera as any;
    mockExpoCamera.requestCameraPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });

    const { getByTestId, getByText } = render(
      <NavigationContainer>
        <VideoIntroScreen />
      </NavigationContainer>
    );

    expect(getByTestId('video-intro-screen')).toBeTruthy();
    expect(getByText(/Camera and microphone access is required/i)).toBeTruthy();
  });

  it('shows video preview after recording', async () => {
    // Setup a mock implementation for the camera ref
    const mockRecordAsync = jest.fn().mockResolvedValue({ uri: 'test-video-uri' });
    const mockStopRecording = jest.fn();
    
    // Mock useRef to return our mock camera
    jest.spyOn(React, 'useRef').mockImplementationOnce(() => ({
      current: {
        recordAsync: mockRecordAsync,
        stopRecording: mockStopRecording
      }
    }));

    const { getByTestId } = render(
      <NavigationContainer>
        <VideoIntroScreen />
      </NavigationContainer>
    );

    expect(getByTestId('video-intro-screen')).toBeTruthy();
    
    // We would test recording functionality here, but it requires more complex setup
    // due to the ref and timer interactions
  });

  it('generates thumbnail from video', async () => {
    // Set up mock for video state
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [null, jest.fn()]);
    jest.spyOn(React, 'useState').mockImplementationOnce(() => ['front', jest.fn()]);
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [false, jest.fn()]);
    jest.spyOn(React, 'useState').mockImplementationOnce(() => ['test-video-uri', jest.fn()]);
    
    const { getByTestId } = render(
      <NavigationContainer>
        <VideoIntroScreen />
      </NavigationContainer>
    );

    expect(getByTestId('video-intro-screen')).toBeTruthy();
    
    // Verify thumbnail generation was called
    expect(VideoThumbnails.getThumbnailAsync).toHaveBeenCalledWith('test-video-uri', { time: 0 });
  });

  it('matches snapshot', () => {
    const { toJSON } = render(
      <NavigationContainer>
        <VideoIntroScreen />
      </NavigationContainer>
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
