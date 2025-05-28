import React, { ReactNode } from 'react';
import { render, RenderOptions, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureStore, { MockStoreEnhanced, MockStore } from 'redux-mock-store';
import { NavigationContainer, NavigationProp } from '@react-navigation/native';
import { MockChatService, MockImagePicker, MockAuth, MockMessage } from './types/test-utils';
import { AnyAction } from 'redux';

// Mock store setup
const mockStore = configureStore([]);

// Custom render function that includes providers
export const renderWithProviders = <T extends object>(
  component: React.ReactElement,
  {
    initialState,
    store = mockStore(initialState || {}) as MockStore<T, AnyAction>,
    ...renderOptions
  }: {
    initialState?: T;
    store?: MockStore<T, AnyAction>;
  } & RenderOptions = {}
) => {
  const Wrapper: React.FC<{ children: ReactNode }> = ({ children }) => (
    <Provider store={store as any}>
      <NavigationContainer>{children}</NavigationContainer>
    </Provider>
  );

  return {
    ...render(component, { wrapper: Wrapper, ...renderOptions }),
    store,
  };
};

// Re-export everything from testing-library
// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react-native';

export { default as userEvent } from '@testing-library/user-event';

// Mock navigation
type NavigationProps = {
  navigate: (screen: string, params?: object) => void;
  goBack: () => void;
  setOptions: (options: object) => void;
  addListener: (event: string, callback: () => void) => () => void;
  isFocused: () => boolean;
  canGoBack: () => boolean;
  reset?: (props: any) => void;
  dispatch?: (action: any) => void;
};

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();

export const useNavigation = (): NavigationProps => ({
  navigate: mockNavigate,
  goBack: mockGoBack,
  setOptions: mockSetOptions,
  addListener: jest.fn(() => jest.fn()),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
  reset: jest.fn(),
  dispatch: jest.fn(),
  getParent: jest.fn(),
  getState: jest.fn(),
  getId: jest.fn(),
} as NavigationProps);

export const useRoute = <T extends object = {}>() => ({
  params: {} as T,
  key: 'test',
  name: 'Test',
});

// Mock timers
export const advanceTimersByTime = (time: number): void => {
  act(() => {
    jest.advanceTimersByTime(time);
  });
};

// Mock chat service
export const mockChatService: MockChatService = {
  sendMessage: jest.fn(),
  subscribeToMessages: jest.fn(),
  markMessagesAsRead: jest.fn(),
  isTestUser: jest.fn(),
  cleanupTestChat: jest.fn(),
  toggleReactionOnMessage: jest.fn(),
};

// Mock image picker
export const mockImagePicker: MockImagePicker = {
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images',
    Videos: 'Videos',
  },
};

// Mock auth
export const mockAuth: MockAuth = {
  currentUser: {
    uid: 'test-user-id',
    email: 'test@example.com',
  },
};

// Mock messages
export const mockMessages: MockMessage[] = [
  {
    id: '1',
    text: 'Test message 1',
    senderId: 'user1',
    timestamp: Date.now(),
    isRead: true,
  },
  {
    id: '2',
    text: 'Test message 2',
    senderId: 'user2',
    timestamp: Date.now() + 1000,
    isRead: true,
  },
];

// Mock navigation component
export const MockNavigation = <P extends {}>({
  component: Component,
  initialParams = {},
}: {
  component: React.ComponentType<P>;
  initialParams?: Partial<P>;
}) => {
  return <Component {...(initialParams as P)} />;
};
