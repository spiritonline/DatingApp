import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import ImageViewerScreen from '../../screens/ImageViewerScreen';

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
      params: { 
        images: [
          { id: 'image1', uri: 'https://example.com/image1.jpg', caption: 'Test Image 1' },
          { id: 'image2', uri: 'https://example.com/image2.jpg' }
        ],
        initialIndex: 0
      }
    }),
  };
});

// Mock expo-image
jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: (props: any) => {
      return <View {...props} testID="mock-image" />;
    },
  };
});

describe('ImageViewerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the image viewer screen with images', () => {
    const { getByTestId, getByText } = render(
      <NavigationContainer>
        <ImageViewerScreen />
      </NavigationContainer>
    );
    
    // Should show the caption for the first image
    expect(getByText('Test Image 1')).toBeTruthy();
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

  it('navigates to the next image when next button is pressed', () => {
    const { getByTestId, queryByText } = render(
      <NavigationContainer>
        <ImageViewerScreen />
      </NavigationContainer>
    );

    // Initially shows the first image with caption
    expect(queryByText('Test Image 1')).toBeTruthy();

    // Press next button
    const nextButton = getByTestId('next-image');
    fireEvent.press(nextButton);

    // Caption should not be visible for second image
    expect(queryByText('Test Image 1')).toBeNull();
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
