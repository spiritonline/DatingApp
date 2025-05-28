import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import ImageViewerScreen from '../../screens/ImageViewerScreen';

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetParams = jest.fn();

// Mock the StatusBar
jest.mock('react-native/Libraries/Components/StatusBar/StatusBar', () => ({
  setHidden: jest.fn(),
}));

// Mock navigation with params
const mockRoute = {
  params: {
    images: [
      { id: 'image1', uri: 'https://example.com/image1.jpg', caption: 'Test Image 1' },
      { id: 'image2', uri: 'https://example.com/image2.jpg' },
      { id: 'image3', uri: 'https://example.com/image3.jpg', caption: 'Test Image 3' },
    ],
    initialIndex: 0,
  },
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setParams: mockSetParams,
    }),
    useRoute: () => mockRoute,
  };
});

// Mock expo-image
let mockImageLoadError = false;
jest.mock('expo-image', () => {
  const { View, Text } = require('react-native');
  return {
    Image: ({ onLoad, onError, ...props }: any) => {
      React.useEffect(() => {
        if (mockImageLoadError) {
          onError?.({ error: 'Failed to load' });
        } else {
          onLoad?.();
        }
      }, []);
      return <View {...props} testID="mock-image" />;
    },
  };
});

describe('ImageViewerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockImageLoadError = false;
    // Reset the mock route to initial state
    mockRoute.params = {
      images: [
        { id: 'image1', uri: 'https://example.com/image1.jpg', caption: 'Test Image 1' },
        { id: 'image2', uri: 'https://example.com/image2.jpg' },
        { id: 'image3', uri: 'https://example.com/image3.jpg', caption: 'Test Image 3' },
      ],
      initialIndex: 0,
    };
  });

  it('renders the image viewer screen with images', () => {
    const { getByText, getByTestId } = render(
      <NavigationContainer>
        <ImageViewerScreen />
      </NavigationContainer>
    );
    
    expect(getByText('Test Image 1')).toBeTruthy();
    expect(getByTestId('full-image-viewer')).toBeTruthy();
  });

  it('closes the viewer when the close button is pressed', () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <ImageViewerScreen />
      </NavigationContainer>
    );

    const closeButton = getByTestId('close-image-viewer');
    fireEvent.press(closeButton);

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('navigates to the next and previous images', () => {
    const { getByTestId, queryByText, getByLabelText } = render(
      <NavigationContainer>
        <ImageViewerScreen />
      </NavigationContainer>
    );

    // Check initial image
    expect(queryByText('Test Image 1')).toBeTruthy();

    // Go to next image
    const nextButton = getByTestId('next-image');
    fireEvent.press(nextButton);
    
    // Should not show caption for second image
    expect(queryByText('Test Image 1')).toBeNull();
    expect(queryByText('Test Image 3')).toBeNull();

    // Go to previous image
    const prevButton = getByTestId('previous-image');
    fireEvent.press(prevButton);
    
    // Should be back to first image with caption
    expect(queryByText('Test Image 1')).toBeTruthy();
  });

  it('displays loading indicator while image is loading', () => {
    const { getByTestId, queryByText } = render(
      <NavigationContainer>
        <ImageViewerScreen />
      </NavigationContainer>
    );

    // Initially should show loading
    expect(queryByText('Loading image...')).toBeTruthy();
  });

  it('handles image loading error', () => {
    mockImageLoadError = true;
    const { getByText, queryByText } = render(
      <NavigationContainer>
        <ImageViewerScreen />
      </NavigationContainer>
    );

    // Should show error message
    expect(queryByText('Error loading images')).toBeTruthy();
    
    // Should show retry button
    const retryButton = getByText('Go back');
    fireEvent.press(retryButton);
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('handles empty images array', () => {
    mockRoute.params.images = [];
    
    const { getByText } = render(
      <NavigationContainer>
        <ImageViewerScreen />
      </NavigationContainer>
    );

    expect(getByText('No images to display')).toBeTruthy();
  });

  it('hides status bar when mounted and shows when unmounted', () => {
    const { unmount } = render(
      <NavigationContainer>
        <ImageViewerScreen />
      </NavigationContainer>
    );

    expect(StatusBar.setHidden).toHaveBeenCalledWith(true, 'fade');
    
    unmount();
    expect(StatusBar.setHidden).toHaveBeenCalledWith(false, 'fade');
  });

  it('displays correct accessibility labels', () => {
    const { getByLabelText } = render(
      <NavigationContainer>
        <ImageViewerScreen />
      </NavigationContainer>
    );

    expect(getByLabelText('Close image viewer')).toBeTruthy();
    expect(getByLabelText('Full screen image 1 of 3: Test Image 1')).toBeTruthy();
  });

  it('does not show previous button on first image', () => {
    const { queryByTestId } = render(
      <NavigationContainer>
        <ImageViewerScreen />
      </NavigationContainer>
    );

    expect(queryByTestId('previous-image')).toBeNull();
  });

  it('does not show next button on last image', () => {
    // Set initial index to last image
    mockRoute.params.initialIndex = 2;
    
    const { queryByTestId } = render(
      <NavigationContainer>
        <ImageViewerScreen />
      </NavigationContainer>
    );

    expect(queryByTestId('next-image')).toBeNull();
  });

  it('matches snapshot', () => {
    const { toJSON } = render(
      <NavigationContainer>
        <ImageViewerScreen />
      </NavigationContainer>
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
