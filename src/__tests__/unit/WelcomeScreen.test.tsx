import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import WelcomeScreen from '../../screens/WelcomeScreen';

// Mock the navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

describe('WelcomeScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders correctly with sign up and log in buttons', () => {
    const { getByText } = render(
      <NavigationContainer>
        <WelcomeScreen />
      </NavigationContainer>
    );
    
    expect(getByText('Dating App')).toBeTruthy();
    expect(getByText('Find your perfect match')).toBeTruthy();
    expect(getByText('Sign Up')).toBeTruthy();
    expect(getByText('Log In')).toBeTruthy();
  });

  it('navigates to SignUp screen when Sign Up button is pressed', () => {
    const { getByText } = render(
      <NavigationContainer>
        <WelcomeScreen />
      </NavigationContainer>
    );
    
    const signUpButton = getByText('Sign Up');
    fireEvent.press(signUpButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('SignUp');
  });

  it('navigates to LogIn screen when Log In button is pressed', () => {
    const { getByText } = render(
      <NavigationContainer>
        <WelcomeScreen />
      </NavigationContainer>
    );
    
    const logInButton = getByText('Log In');
    fireEvent.press(logInButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('LogIn');
  });

  it('matches snapshot', () => {
    const { toJSON } = render(
      <NavigationContainer>
        <WelcomeScreen />
      </NavigationContainer>
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
