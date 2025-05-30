import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import DiscoverScreen from '../../screens/DiscoverScreen';
import likesReducer from '../../store/likesSlice';
import * as hooks from '../../hooks/useProfiles';

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
jest.mock('../../hooks/useLikeHandler', () => ({
  useLikeHandler: () => ({
    isLikeModalVisible: false,
    setIsLikeModalVisible: jest.fn(),
    likeText: '',
    setLikeText: jest.fn(),
    isSubmitting: false,
    initiateProfileLike: jest.fn(),
    submitTextLike: jest.fn().mockResolvedValue(true),
  }),
}));

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

    const { getByTestId, queryByText } = render(
      <TestWrapper>
        <DiscoverScreen />
      </TestWrapper>
    );

    expect(getByTestId('discover-screen')).toBeTruthy();
    expect(queryByText('Finding people for you...')).toBeTruthy();
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
    const { getByTestId, getByText } = render(
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
    
    // Check if mutual friends badge is displayed
    expect(getByText(`👥 ${mockProfiles[0].mutualFriendsCount} mutual friends`)).toBeTruthy();
    
    // Check if prompt answers are displayed
    expect(getByText(mockProfiles[0].promptAnswers[0].prompt)).toBeTruthy();
    expect(getByText(mockProfiles[0].promptAnswers[0].answer)).toBeTruthy();
    
    // Check if action buttons exist
    expect(getByTestId('dismiss-button')).toBeTruthy();
    expect(getByTestId('like-button')).toBeTruthy();
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
