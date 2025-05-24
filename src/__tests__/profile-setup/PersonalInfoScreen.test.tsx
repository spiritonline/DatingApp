import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PersonalInfoScreen from '../../screens/profile-setup/PersonalInfoScreen';
import { AuthStackParamList } from '../../navigation/types';
import { auth, db } from '../../services/firebase';

// Mock Firebase
jest.mock('@firebase/firestore', () => ({
  doc: jest.fn().mockReturnValue('mocked-doc-ref'),
  setDoc: jest.fn().mockResolvedValue(undefined),
  collection: jest.fn()
}));

jest.mock('../../services/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-id'
    }
  },
  db: {}
}));

// Mock navigation
const Stack = createNativeStackNavigator<AuthStackParamList>();
const MockNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator>
      <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
      <Stack.Screen name="PhotoUpload" component={() => null} />
    </Stack.Navigator>
  </NavigationContainer>
);

describe('PersonalInfoScreen', () => {
  it('renders correctly', () => {
    const { getByText, getByTestId } = render(<MockNavigator />);
    
    expect(getByText('Personal Information')).toBeTruthy();
    expect(getByTestId('name-input')).toBeTruthy();
    expect(getByTestId('age-input')).toBeTruthy();
    expect(getByTestId('gender-selector')).toBeTruthy();
    expect(getByTestId('location-consent-checkbox')).toBeTruthy();
    expect(getByTestId('next-button')).toBeTruthy();
  });

  it('validates form inputs properly', () => {
    const { getByTestId, getByText } = render(<MockNavigator />);
    
    // Submit form without filling inputs
    fireEvent.press(getByTestId('next-button'));
    
    // Expect validation errors
    expect(getByText('Name is required')).toBeTruthy();
    expect(getByText('Age is required')).toBeTruthy();
    expect(getByText('Gender is required')).toBeTruthy();
    expect(getByText('Location consent is required')).toBeTruthy();
  });

  it('validates age boundaries', () => {
    const { getByTestId, getByText } = render(<MockNavigator />);
    
    // Test under minimum age
    fireEvent.changeText(getByTestId('age-input'), '17');
    fireEvent.press(getByTestId('next-button'));
    expect(getByText('You must be at least 18 years old')).toBeTruthy();
    
    // Test over maximum age
    fireEvent.changeText(getByTestId('age-input'), '100');
    fireEvent.press(getByTestId('next-button'));
    expect(getByText('Age must be 99 or less')).toBeTruthy();
    
    // Test valid age
    fireEvent.changeText(getByTestId('age-input'), '25');
    fireEvent.press(getByTestId('next-button'));
    // We should not see age-specific error anymore, but we'll still see other validation errors
    expect(() => getByText('You must be at least 18 years old')).toThrow();
    expect(() => getByText('Age must be 99 or less')).toThrow();
  });

  it('submits form and navigates to PhotoUpload when valid', async () => {
    const mockNavigate = jest.fn();
    jest.mock('@react-navigation/native', () => ({
      ...jest.requireActual('@react-navigation/native'),
      useNavigation: () => ({
        navigate: mockNavigate
      })
    }));

    const { getByTestId } = render(<MockNavigator />);
    
    // Fill form with valid values
    fireEvent.changeText(getByTestId('name-input'), 'John Doe');
    fireEvent.changeText(getByTestId('age-input'), '25');
    // Gender selection - depends on the implementation
    fireEvent.press(getByTestId('gender-option-male'));
    // Location consent
    fireEvent.press(getByTestId('location-consent-checkbox'));
    
    // Submit form
    fireEvent.press(getByTestId('next-button'));
    
    // Verify Firestore was called with correct data
    await waitFor(() => {
      expect(db.collection).toHaveBeenCalledWith('profiles');
      expect(db.doc).toHaveBeenCalledWith('test-user-id');
      expect(db.set).toHaveBeenCalledWith({
        name: 'John Doe',
        age: 25,
        gender: 'male',
        locationConsent: true
      }, { merge: true });
    });
  });

  it('shows loading state during submission', async () => {
    const { getByTestId, getByText } = render(<MockNavigator />);
    
    // Fill form with valid values
    fireEvent.changeText(getByTestId('name-input'), 'John Doe');
    fireEvent.changeText(getByTestId('age-input'), '25');
    fireEvent.press(getByTestId('gender-option-male'));
    fireEvent.press(getByTestId('location-consent-checkbox'));
    
    // Submit form
    fireEvent.press(getByTestId('next-button'));
    
    // Check loading state
    expect(getByText('Saving...')).toBeTruthy();
  });
});
