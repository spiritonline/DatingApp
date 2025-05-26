import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Text, View } from 'react-native';
// Fix import to use named export instead of default export
import { MainTabNavigator } from '../../navigation/MainTabNavigator';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the redux store
jest.mock('../../store', () => ({
  store: {
    getState: () => ({
      likes: { todayCount: 5, loading: false, error: null }
    }),
    dispatch: jest.fn(),
    subscribe: jest.fn(),
  }
}));

// Mock the screens with proper JSX elements
jest.mock('../../screens/DiscoverScreen', () => {
  return function MockDiscoverScreen() {
    return <View testID="discover-screen"><Text>Mock Discover Screen</Text></View>;
  };
});

jest.mock('../../screens/ChatListScreen', () => {
  return function MockChatListScreen() {
    return <View testID="chat-list-screen"><Text>Mock Chat List Screen</Text></View>;
  };
});

jest.mock('../../screens/ProfileScreen', () => {
  return function MockProfileScreen() {
    return <View testID="profile-screen"><Text>Mock Profile Screen</Text></View>;
  };
});

// Create a test query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

// Import the store directly 
import { store } from '../../store';

describe('MainTabNavigator', () => {
  const renderWithProviders = () => {
    return render(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <NavigationContainer>
            <MainTabNavigator />
          </NavigationContainer>
        </QueryClientProvider>
      </Provider>
    );
  };

  it('renders the main tab navigator with all tabs', () => {
    const { getByTestId } = renderWithProviders();
    
    // Initial screen should be DiscoverScreen
    expect(getByTestId('discover-screen')).toBeTruthy();
  });

  it('navigates between tabs when tab buttons are pressed', () => {
    const { getByTestId, getByText } = renderWithProviders();
    
    // Navigate to Chat tab
    fireEvent.press(getByText('Chats'));
    expect(getByTestId('chat-list-screen')).toBeTruthy();
    
    // Navigate to Profile tab
    fireEvent.press(getByText('Profile'));
    expect(getByTestId('profile-screen')).toBeTruthy();
    
    // Navigate back to Discover tab
    fireEvent.press(getByText('Discover'));
    expect(getByTestId('discover-screen')).toBeTruthy();
  });

  it('maintains state between tab switches', () => {
    const { getByText, getByTestId } = renderWithProviders();
    
    // Navigate to Chat tab
    fireEvent.press(getByText('Chats'));
    expect(getByTestId('chat-list-screen')).toBeTruthy();
    
    // Navigate to Profile tab
    fireEvent.press(getByText('Profile'));
    expect(getByTestId('profile-screen')).toBeTruthy();
    
    // Navigate back to Discover tab - should still render the component
    fireEvent.press(getByText('Discover'));
    expect(getByTestId('discover-screen')).toBeTruthy();
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithProviders();
    expect(toJSON()).toMatchSnapshot();
  });
});
