import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import LogInScreen from '../../screens/LogInScreen';
import { Alert } from 'react-native';

// Mock dependencies
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
  };
});

// Mock Firebase auth
jest.mock('../../services/firebase', () => ({
  auth: {},
}));

jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(() => Promise.resolve()),
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('LogInScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    jest.clearAllMocks();
  });

  it('renders correctly with all form fields', () => {
    const { getByText, getByTestId } = render(
      <NavigationContainer>
        <LogInScreen />
      </NavigationContainer>
    );
    
    // Check for essential elements
    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
    expect(getByText('Forgot Password?')).toBeTruthy();
    expect(getByTestId('login-button')).toBeTruthy();
  });

  it('shows validation errors when form is submitted with empty fields', () => {
    const { getByText, getByTestId } = render(
      <NavigationContainer>
        <LogInScreen />
      </NavigationContainer>
    );
    
    const loginButton = getByTestId('login-button');
    fireEvent.press(loginButton);
    
    expect(getByText('Email is required')).toBeTruthy();
    expect(getByText('Password is required')).toBeTruthy();
  });

  it('navigates to MainFeed after successful login', async () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <LogInScreen />
      </NavigationContainer>
    );
    
    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const loginButton = getByTestId('login-button');
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    
    fireEvent.press(loginButton);
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('MainFeed');
    });
  });

  it('navigates back when back button is pressed', () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <LogInScreen />
      </NavigationContainer>
    );
    
    const backButton = getByTestId('back-button');
    fireEvent.press(backButton);
    
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('navigates to SignUp screen when Sign Up link is pressed', () => {
    const { getByText } = render(
      <NavigationContainer>
        <LogInScreen />
      </NavigationContainer>
    );
    
    const signUpLink = getByText('Sign Up');
    fireEvent.press(signUpLink);
    
    expect(mockNavigate).toHaveBeenCalledWith('SignUp');
  });

  it('shows alert when Forgot Password is pressed', () => {
    const { getByText } = render(
      <NavigationContainer>
        <LogInScreen />
      </NavigationContainer>
    );
    
    const forgotPasswordText = getByText('Forgot Password?');
    fireEvent.press(forgotPasswordText);
    
    expect(Alert.alert).toHaveBeenCalledWith('Forgot Password', 'Password reset would be implemented here');
  });

  it('matches snapshot', () => {
    const { toJSON } = render(
      <NavigationContainer>
        <LogInScreen />
      </NavigationContainer>
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
