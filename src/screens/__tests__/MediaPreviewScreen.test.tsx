import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import MediaPreviewScreen from '../MediaPreviewScreen';
import { AuthStackParamList } from '../../navigation/types';
import { storage } from '../../services/firebase';
import { ref, uploadBytes, getDownloadURL } from '@firebase/storage';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { sendMessage } from '../../services/chatService';

// Mock navigation
const Stack = createStackNavigator<AuthStackParamList>();

// Mock Firebase Storage and other modules
jest.mock('@firebase/storage');
jest.mock('expo-video-thumbnails');
jest.mock('../../services/chatService');

// Mock the actual implementation of uploadBytes and getDownloadURL
const mockUploadBytes = jest.mocked(uploadBytes);
const mockGetDownloadURL = jest.mocked(getDownloadURL);
const mockSendMessage = jest.mocked(sendMessage);
const mockGetThumbnailAsync = jest.mocked(VideoThumbnails.getThumbnailAsync);

// Mock the return values
mockGetDownloadURL.mockImplementation(() => Promise.resolve('https://example.com/test-download-url'));
mockSendMessage.mockImplementation(() => Promise.resolve(true));
mockGetThumbnailAsync.mockImplementation(() => Promise.resolve({ 
  uri: 'file://test-thumbnail.jpg',
  width: 200,
  height: 200 
}));

// Mock the storage ref function
const mockRef = jest.fn().mockReturnThis();
// @ts-ignore - Mocking storage ref
storage.ref = mockRef;

// Import the actual types for better type safety
import { UploadResult, FullMetadata } from '@firebase/storage';

// Mock UploadResult type for Firebase Storage
const mockUploadResult: UploadResult = {
  ref: {} as any,
  metadata: {
    bucket: 'test-bucket',
    fullPath: 'test/path',
    name: 'test-file',
    size: 12345,
    timeCreated: new Date().toISOString(),
    updated: new Date().toISOString(),
    contentType: 'image/jpeg',
    metadata: {},
    generation: 'test-generation',
    metageneration: 'test-metageneration',
    downloadTokens: ['test-token'],
  } as FullMetadata,
};

describe('MediaPreviewScreen', () => {
  // Sample media items for testing
  const mockImageItem = {
    uri: 'file:///path/to/image.jpg',
    type: 'image' as const,
    width: 800,
    height: 600,
    fileName: 'test.jpg',
  };

  const mockVideoItem = {
    uri: 'file:///path/to/video.mp4',
    type: 'video' as const,
    width: 1280,
    height: 720,
    duration: 30,
    fileName: 'test.mp4',
  };

  // Define media item type for testing
  type TestMediaItem = {
    uri: string;
    type: 'image' | 'video';
    width: number;
    height: number;
    duration?: number;
    fileName: string;
  };
  
  // Define route params type
  type RouteParams = {
    mediaItems: TestMediaItem[];
    chatId: string;
    replyToMessage?: any;
  };

  // Mock navigation params with proper typing
  const mockRoute = {
    key: 'MediaPreview',
    name: 'MediaPreview' as const,
    params: {
      mediaItems: [{
        uri: 'file://test-image.jpg',
        type: 'image' as const,
        width: 800,
        height: 600,
        fileName: 'test-image.jpg',
        // Add any other required properties for MediaItem type
        duration: undefined,
      }],
      chatId: 'test-chat-id',
    },
  };
  
  // Define test IDs for better test reliability
  const TEST_IDS = {
    MEDIA_PREVIEW_CONTAINER: 'media-preview-container',
    VIDEO_PREVIEW: 'video-preview',
    IMAGE_PREVIEW: 'image-preview',
    CAPTION_INPUT: 'caption-input',
    SEND_BUTTON: 'send-button',
    SEND_BUTTON_TEXT: 'send-button-text',
  };

  // Helper function to render the component with navigation
  const renderScreen = (routeParams: RouteParams = mockRoute.params) => {
    return render(
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="MediaPreview"
            component={MediaPreviewScreen}
            initialParams={routeParams}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  };

  // Helper to wait for async operations
  const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Mock successful responses with proper typing
    mockUploadBytes.mockImplementation(() => Promise.resolve(mockUploadResult));
    mockGetDownloadURL.mockImplementation(() => Promise.resolve('https://example.com/media/123'));
    mockSendMessage.mockImplementation(() => Promise.resolve(true));
    mockGetThumbnailAsync.mockImplementation(() => 
      Promise.resolve({
        uri: 'file:///path/to/thumbnail.jpg',
        width: 400,
        height: 300,
      })
    );
    
    // Mock console methods to prevent test output clutter
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders correctly with image media', async () => {
    const { findByTestId, getByText, getByTestId } = renderScreen();
    
    // Wait for async operations to complete
    await waitForAsync();
    
    // Check if all required elements are rendered
    const container = getByTestId('media-preview-container');
    const preview = getByTestId('image-preview');
    const captionInput = getByTestId('caption-input');
    const sendButton = getByText('Send');
    
    expect(container).toBeTruthy();
    expect(getByText('Preview')).toBeTruthy();
    expect(preview).toBeTruthy();
    expect(captionInput).toBeTruthy();
    expect(sendButton).toBeTruthy();
    
    // Verify image source
    expect(preview.props.source.uri).toBe('file://test-image.jpg');
  });

  it('handles video media type', async () => {
    // Create a new route with video item
    const videoRoute = {
      params: {
        mediaItems: [{
          ...mockVideoItem,
          type: 'video' as const,
        }],
        chatId: 'test-chat-123',
      },
    };
    
    const { getByTestId } = renderScreen(videoRoute.params);
    
    // Wait for async operations to complete
    await waitForAsync();

    // Check if video component is rendered
    const videoPreview = getByTestId('video-preview');
    expect(videoPreview).toBeTruthy();
    
    // Verify video source
    expect(videoPreview.props.source.uri).toBe('file:///path/to/video.mp4');
  });

  it('updates caption text when typing', () => {
    const { getByTestId } = renderScreen();
    const captionInput = getByTestId('caption-input');
    
    fireEvent.changeText(captionInput, 'Test caption');
    expect(captionInput.props.value).toBe('Test caption');
  });

  it('handles send button press with image', async () => {
    const { getByTestId, getByText } = renderScreen();
    
    // Enter a caption
    fireEvent.changeText(getByTestId('caption-input'), 'Test caption');
    
    // Press send button
    await act(async () => {
      fireEvent.press(getByText('Send'));
      // Wait for async operations to complete
      await Promise.resolve();
    });

    // Verify upload and send operations were called
    expect(mockUploadBytes).toHaveBeenCalledTimes(1);
    expect(mockSendMessage).toHaveBeenCalledWith(
      'test-chat-123',
      expect.objectContaining({
        content: 'Test caption',
        type: 'image',
        caption: 'Test caption',
        mediaUrl: 'https://example.com/media/123',
      })
    );
  });

  it('handles video thumbnail generation and upload', async () => {
    // Create a new route with video item
    const videoRoute = {
      params: {
        mediaItems: [{
          ...mockVideoItem,
          type: 'video' as const,
        }],
        chatId: 'test-chat-123',
      },
    };
    
    const { getByText } = renderScreen(videoRoute.params);
    
    // Press send button
    await act(async () => {
      fireEvent.press(getByText('Send'));
      // Wait for async operations to complete
      await Promise.resolve();
    });

    // Verify thumbnail generation and upload
    expect(mockGetThumbnailAsync).toHaveBeenCalled();
    expect(mockUploadBytes).toHaveBeenCalledTimes(2); // One for video, one for thumbnail
    
    // Verify the message includes the thumbnail URL
    expect(mockSendMessage).toHaveBeenCalledWith(
      'test-chat-123',
      expect.objectContaining({
        type: 'video',
        thumbnailUrl: 'https://example.com/media/123',
      })
    );
  });

  it('shows loading state during upload', async () => {
    // Make upload take some time
    let resolveUpload: () => void;
    const uploadPromise = new Promise<typeof mockUploadResult>((resolve) => {
      resolveUpload = () => resolve(mockUploadResult);
    });
    mockUploadBytes.mockImplementationOnce(() => uploadPromise);
    
    const { getByTestId, queryByTestId } = renderScreen();
    
    // Press send button
    fireEvent.press(getByTestId('send-button'));
    
    // Should show loading state
    expect(queryByTestId('send-button-text')?.props.children).toBe('Sending...');
    
    // Resolve the upload
    await act(async () => {
      resolveUpload();
      await uploadPromise;
    });
  });

  it('handles upload errors gracefully', async () => {
    // Mock a failed upload
    mockUploadBytes.mockRejectedValueOnce(new Error('Upload failed'));
    
    const { getByText, findByText } = renderScreen();
    
    // Press send button
    fireEvent.press(getByText('Send'));
    
    // Should show error message
    const errorMessage = await findByText(/Failed to send media/i);
    expect(errorMessage).toBeTruthy();
  });

  it('navigates back after successful send', async () => {
    const { getByText } = renderScreen();
    
    // Mock navigation
    const navigation = require('@react-navigation/native');
    const mockGoBack = jest.fn();
    navigation.useNavigation = () => ({
      goBack: mockGoBack,
    });
    
    // Press send button
    await act(async () => {
      fireEvent.press(getByText('Send'));
      await Promise.resolve();
    });
    
    // Should navigate back
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('displays error when no media items are provided', () => {
    const { getByText } = renderScreen({
      ...mockRoute.params,
      mediaItems: [],
    });
    
    expect(getByText(/No media items to preview/i)).toBeTruthy();
  });
});
