import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import DiscoverScreen from '../../screens/DiscoverScreen';
import likesReducer from '../../store/likesSlice';
import * as hooks from '../../hooks/useProfiles';
import { Alert } from 'react-native';

// Mock navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
  };
});

// Mock Firebase auth
jest.mock('../../services/firebase', () => ({
  auth: {
    currentUser: { uid: 'test-user-id' }
  },
  db: {
    collection: jest.fn(() => ({
      add: jest.fn().mockResolvedValue({ id: 'new-doc-id' }),
    })),
  },
}));

// Mock the useProfiles hook
jest.mock('../../hooks/useProfiles', () => {
  const originalModule = jest.requireActual('../../hooks/useProfiles');
  return {
    __esModule: true,
    ...originalModule,
    useProfiles: jest.fn(),
  };
});

// Mock the useLikeHandler hook
const mockUseLikeHandler = {
  isLikeModalVisible: false,
  setIsLikeModalVisible: jest.fn(),
  likeText: '',
  setLikeText: jest.fn(),
  isSubmitting: false,
  initiateProfileLike: jest.fn(),
  submitTextLike: jest.fn().mockResolvedValue(true),
};

jest.mock('../../hooks/useLikeHandler', () => ({
  useLikeHandler: () => mockUseLikeHandler,
}));

// Mock Alert.alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Create a test redux store
const createTestStore = () => configureStore({
  reducer: {
    likes: likesReducer,
  },
  preloadedState: {
    likes: {
      todayCount: 3,
      loading: false,
      error: null,
    },
  },
});

// Test QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Wrapper component for tests
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={createTestStore()}>
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        {children}
      </NavigationContainer>
    </QueryClientProvider>
  </Provider>
);

describe('DiscoverScreen', () => {
  // Mock profile data
  const mockProfiles = [
    {
      id: 'profile1',
      name: 'Alex',
      age: 28,
      photos: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
      promptAnswers: [
        { prompt: 'My ideal date', answer: 'A picnic in the park' },
        { prompt: 'A fun fact about me', answer: 'I can speak three languages' }
      ],
      mutualFriendsCount: 2,
    },
    {
      id: 'profile2',
      name: 'Taylor',
      age: 30,
      photos: ['https://example.com/photo3.jpg'],
      promptAnswers: [
        { prompt: 'My favorite travel spot', answer: 'Bali, Indonesia' }
      ],
      mutualFriendsCount: 0,
    }
  ];

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Mock the useProfiles hook implementation for tests
    (hooks.useProfiles as jest.Mock).mockReturnValue({
      profiles: mockProfiles,
      isLoading: false,
      isError: false,
      error: null,
      fetchNextPage: jest.fn(),
      resetProfiles: jest.fn(),
      hasMore: true,
    });
  });

  it('renders loading state initially', async () => {
    // Override the mock to return loading state
    (hooks.useProfiles as jest.Mock).mockReturnValue({
      profiles: [],
      isLoading: true,
      isError: false,
      error: null,
      fetchNextPage: jest.fn(),
      resetProfiles: jest.fn(),
      hasMore: true,
    });

    const { getByTestId, getByText } = render(
      <TestWrapper>
        <DiscoverScreen />
      </TestWrapper>
    );

    expect(getByTestId('discover-screen')).toBeTruthy();
    expect(getByText('Finding people for you...')).toBeTruthy();
    
    // Check if loading indicator is shown
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('renders error state if there is an error', async () => {
    // Override the mock to return error state
    (hooks.useProfiles as jest.Mock).mockReturnValue({
      profiles: [],
      isLoading: false,
      isError: true,
      error: new Error('Failed to load'),
      fetchNextPage: jest.fn(),
      resetProfiles: jest.fn(),
      hasMore: true,
    });

    const { getByTestId, getByText } = render(
      <TestWrapper>
        <DiscoverScreen />
      </TestWrapper>
    );

    expect(getByTestId('discover-screen')).toBeTruthy();
    expect(getByText('Failed to load profiles')).toBeTruthy();
    expect(getByText('Try Again')).toBeTruthy();
  });

  it('renders profile content correctly', async () => {
    const { getByTestId, getByText, getAllByTestId } = render(
      <TestWrapper>
        <DiscoverScreen />
      </TestWrapper>
    );

    // Check if the container exists
    expect(getByTestId('discover-screen')).toBeTruthy();
    
    // Check if the profile container exists with the right ID
    expect(getByTestId(`profile-container-${mockProfiles[0].id}`)).toBeTruthy();
    
    // Check if the name and age are displayed
    expect(getByText(`${mockProfiles[0].name}, ${mockProfiles[0].age}`)).toBeTruthy();
    
    // Check if action buttons are rendered
    expect(getByTestId('dismiss-button')).toBeTruthy();
    expect(getByTestId('like-button')).toBeTruthy();
    
    // Check if photos are rendered
    const photos = getAllByTestId(/^profile-photo-/);
    expect(photos.length).toBe(mockProfiles[0].photos.length);
  });

  it('calls initiateProfileLike when like button is pressed', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <DiscoverScreen />
      </TestWrapper>
    );

    fireEvent.press(getByTestId('like-button'));
    expect(mockUseLikeHandler.initiateProfileLike).toHaveBeenCalledWith(mockProfiles[0].id);
  });

  it('shows like modal when initiateProfileLike is called', async () => {
    // Mock the initiateProfileLike to show the modal
    mockUseLikeHandler.initiateProfileLike.mockImplementation(() => {
      mockUseLikeHandler.isLikeModalVisible = true;
    });

    const { getByTestId, queryByTestId } = render(
      <TestWrapper>
        <DiscoverScreen />
      </TestWrapper>
    );

    // Initially, modal should not be visible
    expect(queryByTestId('like-modal')).toBeNull();
    
    // Press like button
    fireEvent.press(getByTestId('like-button'));
    
    // Modal should now be visible
    expect(mockUseLikeHandler.setIsLikeModalVisible).toHaveBeenCalledWith(true);
  });

  it('handles text input in like modal', async () => {
    // Set modal to be visible
    mockUseLikeHandler.isLikeModalVisible = true;
    
    const { getByTestId } = render(
      <TestWrapper>
        <DiscoverScreen />
      </TestWrapper>
    );

    const testText = 'This is a test message for the like modal';
    const input = getByTestId('like-text-input');
    
    fireEvent.changeText(input, testText);
    expect(mockUseLikeHandler.setLikeText).toHaveBeenCalledWith(testText);
  });

  it('shows character counter and validation in like modal', async () => {
    // Set modal to be visible
    mockUseLikeHandler.isLikeModalVisible = true;
    mockUseLikeHandler.likeText = 'Short message';
    
    const { getByTestId, getByText } = render(
      <TestWrapper>
        <DiscoverScreen />
      </TestWrapper>
    );

    // Check character counter
    expect(getByText(`${mockUseLikeHandler.likeText.length}/1000`)).toBeTruthy();
    
    // Test submit with short message
    fireEvent.press(getByTestId('submit-like-button'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Too Short',
      'Please write at least 80 characters to express your interest.'
    );
  });

  it('handles successful like submission', async () => {
    // Set modal to be visible with valid text
    mockUseLikeHandler.isLikeModalVisible = true;
    mockUseLikeHandler.likeText = 'A'.repeat(80); // Valid length
    
    const { getByTestId } = render(
      <TestWrapper>
        <DiscoverScreen />
      </TestWrapper>
    );

    // Submit the like
    await act(async () => {
      fireEvent.press(getByTestId('submit-like-button'));
    });
    
    expect(mockUseLikeHandler.submitTextLike).toHaveBeenCalled();
  });

  it('handles dismiss button press', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <DiscoverScreen />
      </TestWrapper>
    );

    // Initial profile index should be 0
    expect(getByTestId(`profile-container-${mockProfiles[0].id}`)).toBeTruthy();
    
    // Press dismiss button
    fireEvent.press(getByTestId('dismiss-button'));
    
    // Should move to next profile
    // Note: In a real test, we'd need to handle the animation timing
    // For now, we just verify the button is pressable
  });

  it('loads more profiles when reaching end of list', async () => {
    const mockFetchNextPage = jest.fn();
    
    // Mock useProfiles to simulate having only one profile initially
    (hooks.useProfiles as jest.Mock).mockReturnValue({
      profiles: [mockProfiles[0]], // Only one profile
      isLoading: false,
      isError: false,
      error: null,
      fetchNextPage: mockFetchNextPage,
      resetProfiles: jest.fn(),
      hasMore: true,
    });

    const { getByTestId } = render(
      <TestWrapper>
        <DiscoverScreen />
      </TestWrapper>
    );

    // Press dismiss button to trigger end of list
    fireEvent.press(getByTestId('dismiss-button'));
    
    // Should call fetchNextPage when trying to go to next profile with only one profile
    expect(mockFetchNextPage).toHaveBeenCalled();
  });

  it('handles retry when there is an error', async () => {
    const mockResetProfiles = jest.fn();
    
    // Mock error state
    (hooks.useProfiles as jest.Mock).mockReturnValue({
      profiles: [],
      isLoading: false,
      isError: true,
      error: new Error('Failed to load'),
      fetchNextPage: jest.fn(),
      resetProfiles: mockResetProfiles,
      hasMore: true,
    });

    const { getByText } = render(
      <TestWrapper>
        <DiscoverScreen />
      </TestWrapper>
    );

    // Click retry button
    fireEvent.press(getByText('Try Again'));
    
    // Should call resetProfiles
    expect(mockResetProfiles).toHaveBeenCalled();
  });

  it('matches snapshot', () => {
    const { toJSON } = render(
      <TestWrapper>
        <DiscoverScreen />
      </TestWrapper>
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
