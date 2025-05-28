import { NavigationProp, RouteProp } from '@react-navigation/native';
import { MockStoreEnhanced } from 'redux-mock-store';

export interface MockNavigationProps {
  component: React.ComponentType<any>;
  initialParams?: Record<string, any>;
}

export interface RenderWithProvidersOptions {
  initialState?: Record<string, any>;
  store?: MockStoreEnhanced;
  renderOptions?: Record<string, any>;
}

export interface MockMessage {
  id: string;
  text?: string;
  senderId: string;
  timestamp: number;
  mediaUrl?: string;
  isRead?: boolean;
  reactions?: Record<string, string[]>;
}

export interface MockChatService {
  sendMessage: jest.Mock;
  subscribeToMessages: jest.Mock;
  markMessagesAsRead: jest.Mock;
  isTestUser: jest.Mock;
  cleanupTestChat: jest.Mock;
  toggleReactionOnMessage: jest.Mock;
}

export interface MockImagePicker {
  launchImageLibraryAsync: jest.Mock;
  MediaTypeOptions: {
    Images: string;
    Videos: string;
  };
}

export interface MockAuth {
  currentUser: {
    uid: string;
    email: string;
  } | null;
}
