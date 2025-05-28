import { MockChatService, MockImagePicker, MockAuth } from '../__tests__/types/test-utils';

declare module '../../__tests__/types/test-utils' {
  export interface MockChatService {
    sendMessage: jest.Mock;
    subscribeToMessages: jest.Mock;
    // Add other methods as needed
  }

  export interface MockImagePicker {
    launchImageLibraryAsync: jest.Mock;
    MediaTypeOptions: {
      Images: string;
      Videos: string;
      All: string;
    };
  }

  export interface MockAuthUser {
    uid: string;
    email: string;
    // Add other user properties as needed
  }

  export interface MockAuth {
    currentUser: MockAuthUser | null;
    // Add other auth methods as needed
  }
}
