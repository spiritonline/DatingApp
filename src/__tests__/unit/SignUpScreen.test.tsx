import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import SignUpScreen from '../../screens/SignUpScreen';
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
  createUserWithEmailAndPassword: jest.fn(() => Promise.resolve()),
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('SignUpScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    jest.clearAllMocks();
  });

  it('renders correctly with all form fields', () => {
    const { getByText, getByTestId } = render(
      <NavigationContainer>
        <SignUpScreen />
      </NavigationContainer>
    );
    
    expect(getByText('Create Account')).toBeTruthy();
    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
    expect(getByTestId('confirm-password-input')).toBeTruthy();
    expect(getByTestId('terms-checkbox')).toBeTruthy();
    expect(getByTestId('location-checkbox')).toBeTruthy();
    expect(getByTestId('signup-button')).toBeTruthy();
  });

  it('shows validation errors when form is submitted with empty fields', () => {
    const { getByText: getByTextLocal, getByTestId } = render(
      <NavigationContainer>
        <SignUpScreen />
      </NavigationContainer>
    );
    
    const signUpButton = getByTestId('signup-button');
    fireEvent.press(signUpButton);
    
    expect(getByTextLocal('Email is required')).toBeTruthy();
    expect(getByTextLocal('Password is required')).toBeTruthy();
    expect(getByTextLocal('You must accept the terms and location checks')).toBeTruthy();
  });

  it('shows validation error when passwords do not match', () => {
    const { getByText, getByTestId } = render(
      <NavigationContainer>
        <SignUpScreen />
      </NavigationContainer>
    );
    
    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const confirmPasswordInput = getByTestId('confirm-password-input');
    const signUpButton = getByTestId('signup-button');
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password456');
    
    fireEvent.press(signUpButton);
    
    expect(getByText('Passwords do not match')).toBeTruthy();
  });

  it('navigates to MainFeed after successful sign up', async () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <SignUpScreen />
      </NavigationContainer>
    );
    
    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');
    const confirmPasswordInput = getByTestId('confirm-password-input');
    const termsCheckbox = getByTestId('terms-checkbox');
    const locationCheckbox = getByTestId('location-checkbox');
    const signUpButton = getByTestId('signup-button');
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.changeText(confirmPasswordInput, 'password123');
    fireEvent.press(termsCheckbox);
    fireEvent.press(locationCheckbox);
    
    fireEvent.press(signUpButton);
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('MainFeed');
    });
  });

  it('navigates back when back button is pressed', () => {
    const { getByTestId } = render(
      <NavigationContainer>
        <SignUpScreen />
      </NavigationContainer>
    );
    
    const backButton = getByTestId('back-button');
    fireEvent.press(backButton);
    
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('matches snapshot', () => {
    const { toJSON } = render(
      <NavigationContainer>
        <SignUpScreen />
      </NavigationContainer>
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
