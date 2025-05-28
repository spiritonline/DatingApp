import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import LogInScreen from '../../screens/LogInScreen';
import { Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { View } from 'react-native';

// Mock dependencies
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSignInWithEmailAndPassword = signInWithEmailAndPassword as jest.Mock;

// Mock navigation
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

// Mock Firebase auth
jest.mock('../../services/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-uid',
    },
  },
}));

// Mock Firebase auth functions
jest.mock('firebase/auth', () => ({
  ...jest.requireActual('firebase/auth'),
  signInWithEmailAndPassword: jest.fn(),
}));

// Mock AuthContext
const mockUseAuth = useAuth as jest.Mock;
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock profile service
jest.mock('../../services/profileService', () => ({
  getUserProfile: jest.fn(() => Promise.resolve({ profileComplete: true })),
  isProfileComplete: jest.fn(() => Promise.resolve(true)),
}));

// Mock Alert
const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock ActivityIndicator
const mockActivityIndicator = jest.spyOn(ActivityIndicator.prototype, 'render').mockImplementation(() => {
  return <View testID="loading-indicator" />;
});

// Mock the theme context
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const renderComponent = (authState = { isAuthenticated: false, isProfileComplete: false, isLoading: false }) => {
  mockUseAuth.mockReturnValue({
    isAuthenticated: authState.isAuthenticated,
    isProfileComplete: authState.isProfileComplete,
    isLoading: authState.isLoading,
  });
  
  return render(
    <NavigationContainer>
      <LogInScreen />
    </NavigationContainer>
  );
};

describe('LogInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockSignInWithEmailAndPassword.mockClear();
    mockAlert.mockClear();
    
    // Default mock implementation
    mockSignInWithEmailAndPassword.mockResolvedValue({ user: { uid: 'test-uid' } });
    mockUseAuth.mockReturnValue({ 
      isAuthenticated: false, 
      isProfileComplete: false, 
      isLoading: false 
    });
  });

  it('renders correctly with all form fields', () => {
    const { getByText, getByPlaceholderText, getByTestId } = renderComponent();
    
    // Check for essential elements
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
    expect(getByText('Forgot Password?')).toBeTruthy();
    expect(getByTestId('login-button')).toBeTruthy();
    expect(getByTestId('google-login-button')).toBeTruthy();
    expect(getByTestId('apple-login-button')).toBeTruthy();
  });

  describe('Form Validation', () => {
    it('shows validation errors when form is submitted with empty fields', async () => {
      const { getByText, getByTestId } = renderComponent();
      
      const loginButton = getByTestId('login-button');
      await act(async () => {
        fireEvent.press(loginButton);
      });
      
      expect(getByText('Email is required')).toBeTruthy();
      expect(getByText('Password is required')).toBeTruthy();
      expect(mockSignInWithEmailAndPassword).not.toHaveBeenCalled();
    });

    it('shows error for invalid email format', async () => {
      // Render the component
      const { getByText, getByTestId, queryByText, debug, getByPlaceholderText } = renderComponent();
      
      // Find the email input and login button
      const emailInput = getByPlaceholderText('Enter your email');
      const loginButton = getByTestId('login-button');
      
      // Verify the error message is not shown initially
      expect(queryByText('Email is invalid')).toBeNull();
      
      // Enter an invalid email
      const invalidEmail = 'invalid-email';
      await act(async () => {
        fireEvent.changeText(emailInput, invalidEmail);
      });
      
      // Verify the email was entered
      expect(emailInput.props.value).toBe(invalidEmail);
      
      // Submit the form
      await act(async () => {
        fireEvent.press(loginButton);
      });
      
      // Check if the form validation was called
      expect(mockSignInWithEmailAndPassword).not.toHaveBeenCalled();
      
      // Check if the error message is shown
      const errorMessage = queryByText('Email is invalid');
      
      // If the error message is not found, log the current component tree for debugging
      if (!errorMessage) {
        console.log('Current component tree:');
        debug();
        console.log('All text nodes in the component:');
        console.log(getByTestId('login-screen').props.children);
      }
      
      // Assert that the error message is in the document
      expect(errorMessage).toBeTruthy();
    });
  });

  describe('Login Flow', () => {
    it('calls signInWithEmailAndPassword with correct credentials', async () => {
      const { getByTestId, getByPlaceholderText } = renderComponent();
      
      const email = 'test@example.com';
      const password = 'password123';
      
      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Enter your email'), email);
        fireEvent.changeText(getByTestId('password-input'), password);
        fireEvent.press(getByTestId('login-button'));
      });
      
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.any(Object), // auth object
        email,
        password
      );
    });

    it('shows loading indicator during login', async () => {
      // Mock a slow login
      let resolveLogin: any;
      mockSignInWithEmailAndPassword.mockImplementationOnce(
        () => new Promise(resolve => {
          resolveLogin = () => resolve({ user: { uid: 'test-uid' } });
        })
      );
      
      const { getByTestId } = renderComponent();
      
      await act(async () => {
        fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
        fireEvent.changeText(getByTestId('password-input'), 'password123');
        fireEvent.press(getByTestId('login-button'));
      });
      
      // Check if loading state is shown
      expect(getByTestId('login-button')).toHaveTextContent('Logging In...');
      
      // Resolve the login promise
      await act(async () => {
        resolveLogin();
      });
    });

    it('shows error message on login failure', async () => {
      const errorMessage = 'Invalid email or password';
      mockSignInWithEmailAndPassword.mockRejectedValueOnce(new Error(errorMessage));
      
      const { getByTestId, findByText } = renderComponent();
      
      await act(async () => {
        fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
        fireEvent.changeText(getByTestId('password-input'), 'wrongpassword');
        fireEvent.press(getByTestId('login-button'));
      });
      
      // Wait for the error alert
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Login Failed', expect.stringContaining(errorMessage));
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to MainFeed when already authenticated and profile is complete', async () => {
      // Mock getUserProfile to return complete profile
      const { getUserProfile } = require('../../services/profileService');
      getUserProfile.mockResolvedValueOnce({ profileComplete: true });
      
      // Mock auth.currentUser to return a user
      require('../../services/firebase').auth.currentUser = { uid: 'test-uid' };
      
      renderComponent({ isAuthenticated: true, isProfileComplete: true, isLoading: false });
      
      // Wait for the navigation to complete
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('MainFeed');
      });
    });

    it('navigates to PersonalInfo when authenticated but profile is incomplete', async () => {
      // Mock getUserProfile to return incomplete profile
      const { getUserProfile } = require('../../services/profileService');
      getUserProfile.mockResolvedValueOnce({ profileComplete: false });
      
      // Mock auth.currentUser to return a user
      require('../../services/firebase').auth.currentUser = { uid: 'test-uid' };
      
      renderComponent({ isAuthenticated: true, isProfileComplete: false, isLoading: false });
      
      // Wait for the navigation to complete
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('PersonalInfo');
      });
    });

    it('navigates back when back button is pressed', () => {
      const { getByTestId } = renderComponent();
      
      fireEvent.press(getByTestId('back-button'));
      
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Social Login', () => {
    it('shows alert when Google login is pressed', () => {
      const { getByTestId } = renderComponent();
      
      fireEvent.press(getByTestId('google-login-button'));
      
      expect(mockAlert).toHaveBeenCalledWith('Google Login', 'Google Login would be implemented here');
    });

    it('shows alert when Apple login is pressed', () => {
      const { getByTestId } = renderComponent();
      
      fireEvent.press(getByTestId('apple-login-button'));
      
      expect(mockAlert).toHaveBeenCalledWith('Apple Login', 'Apple Login would be implemented here');
    });
  });

  it('matches snapshot', async () => {
    // Mock the theme and auth state for consistent snapshots
    const { toJSON } = render(
      <NavigationContainer>
        <LogInScreen />
      </NavigationContainer>
    );
    
    // Wait for any async operations to complete
    await act(async () => {
      await Promise.resolve();
    });
    
    expect(toJSON()).toMatchSnapshot();
  });
});
