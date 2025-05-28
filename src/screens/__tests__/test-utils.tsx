import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { render } from '@testing-library/react-native';
import { AuthStackParamList } from '../../../navigation/types';
import { View } from 'react-native';

type MockNavigationProps = {
  component: React.ComponentType<any>;
  params?: any;
};

export const MockNavigation = ({
  component: Component,
  params = {},
}: MockNavigationProps) => {
  const Stack = createStackNavigator<AuthStackParamList>();
  
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="ChatConversation" 
          component={Component} 
          initialParams={params}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export const mockMessages = [
  {
    id: '1',
    content: 'Hello!',
    senderId: 'user2',
    createdAt: new Date('2023-01-01T00:00:00Z'),
    type: 'text',
  },
  {
    id: '2',
    content: 'Hi there!',
    senderId: 'user1',
    createdAt: new Date('2023-01-01T00:00:01Z'),
    type: 'text',
  },
  {
    id: '3',
    content: 'Check this out!',
    senderId: 'user2',
    mediaUrl: 'https://example.com/image.jpg',
    type: 'image',
    caption: 'A beautiful image',
    createdAt: new Date('2023-01-01T00:00:02Z'),
  },
];

export const mockCurrentUser = {
  uid: 'user1',
  email: 'test@example.com',
};

export const mockChatService = {
  sendMessage: jest.fn().mockResolvedValue(true),
  subscribeToMessages: jest.fn((chatId, callback) => {
    callback(mockMessages);
    return jest.fn();
  }),
  markMessagesAsRead: jest.fn().mockResolvedValue(true),
  isTestUser: jest.fn().mockReturnValue(false),
  cleanupTestChat: jest.fn().mockResolvedValue(true),
  toggleReactionOnMessage: jest.fn().mockResolvedValue(true),
};

export const mockImagePicker = {
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [{
      uri: 'file:///path/to/image.jpg',
      type: 'image/jpeg',
      name: 'image.jpg',
    }],
  }),
  MediaTypeOptions: { Images: 'Images', Videos: 'Videos' },
};

export const mockAuth = {
  currentUser: mockCurrentUser,
};

export const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  setOptions: jest.fn(),
};

export const mockRoute = {
  params: {
    chatId: 'chat123',
    partnerName: 'Test User',
  },
  key: 'test-key',
  name: 'ChatConversation',
};

// Helper to wait for async operations
export const waitForAsync = async (ms = 0) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
