import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { auth } from 'services/firebase';
import { updateUserProfile } from 'services/profileService';
import PersonalInfoScreen from 'screens/profile-setup/PersonalInfoScreen';
import { validatePersonalInfo } from 'screens/profile-setup/utils/validation';

// Mock the required modules
jest.mock('services/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-uid'
    }
  }
}));

jest.mock('services/profileService', () => ({
  updateUserProfile: jest.fn().mockResolvedValue({})
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn()
  })
}));

jest.mock('screens/profile-setup/utils/validation', () => ({
  validatePersonalInfo: jest.fn()
}));

describe('PersonalInfoScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');
  });

  const renderComponent = () => {
    return render(<PersonalInfoScreen />);
  };

  it('renders the personal info form', () => {
    const { getByPlaceholderText, getByText } = renderComponent();
    
    expect(getByPlaceholderText('Full Name')).toBeTruthy();
    expect(getByPlaceholderText('Age')).toBeTruthy();
    expect(getByText('Gender')).toBeTruthy();
    expect(getByText(/I agree to share my location/)).toBeTruthy();
    expect(getByText('Next')).toBeTruthy();
  });

  it('shows validation errors when form is empty', async () => {
    (validatePersonalInfo as jest.Mock).mockReturnValue({
      isValid: false,
      errors: {
        name: 'Name is required',
        age: 'Age is required',
        gender: 'Gender is required',
        locationConsent: 'Location consent is required'
      }
    });

    const { getByText, getByTestId } = renderComponent();
    
    await act(async () => {
      fireEvent.press(getByText('Next'));
    });

    expect(validatePersonalInfo).toHaveBeenCalled();
    expect(getByText('Name is required')).toBeTruthy();
    expect(getByText('Age is required')).toBeTruthy();
    expect(getByText('Gender is required')).toBeTruthy();
    expect(getByText('Location consent is required')).toBeTruthy();
    expect(updateUserProfile).not.toHaveBeenCalled();
  });

  it('handles form input changes', async () => {
    const { getByPlaceholderText, getByText, getByTestId } = renderComponent();
    
    // Test name input
    const nameInput = getByPlaceholderText('Full Name');
    fireEvent.changeText(nameInput, 'John Doe');
    expect(nameInput.props.value).toBe('John Doe');
    
    // Test age input
    const ageInput = getByPlaceholderText('Age');
    fireEvent.changeText(ageInput, '25');
    expect(ageInput.props.value).toBe('25');
    
    // Test gender selection
    const maleButton = getByText('Male');
    fireEvent.press(maleButton);
    
    // Test location consent
    const consentCheckbox = getByTestId('location-consent-checkbox');
    fireEvent.press(consentCheckbox);
  });

  it('submits the form successfully', async () => {
    const mockNavigate = jest.fn();
    require('@react-navigation/native').useNavigation.mockReturnValue({ navigate: mockNavigate });
    
    (validatePersonalInfo as jest.Mock).mockReturnValue({
      isValid: true,
      errors: {}
    });

    const { getByPlaceholderText, getByText, getByTestId } = renderComponent();
    
    // Fill out the form
    fireEvent.changeText(getByPlaceholderText('Full Name'), 'John Doe');
    fireEvent.changeText(getByPlaceholderText('Age'), '25');
    fireEvent.press(getByText('Male'));
    fireEvent.press(getByTestId('location-consent-checkbox'));
    
    await act(async () => {
      fireEvent.press(getByText('Next'));
    });

    expect(validatePersonalInfo).toHaveBeenCalledWith({
      name: 'John Doe',
      age: '25',
      gender: 'male',
      locationConsent: true
    });
    
    expect(updateUserProfile).toHaveBeenCalledWith('test-uid', {
      displayName: 'John Doe',
      birthdate: '25',
      name: 'John Doe',
      age: 25,
      gender: 'male',
      locationConsent: true,
      profileComplete: true
    });
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('PhotoUpload');
    });
  });

  it('handles submission error', async () => {
    const errorMessage = 'Failed to save profile';
    (updateUserProfile as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));
    
    (validatePersonalInfo as jest.Mock).mockReturnValue({
      isValid: true,
      errors: {}
    });

    const { getByPlaceholderText, getByText, getByTestId } = renderComponent();
    
    // Fill out the form
    fireEvent.changeText(getByPlaceholderText('Full Name'), 'John Doe');
    fireEvent.changeText(getByPlaceholderText('Age'), '25');
    fireEvent.press(getByText('Male'));
    fireEvent.press(getByTestId('location-consent-checkbox'));
    
    await act(async () => {
      fireEvent.press(getByText('Next'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', errorMessage);
    });
  });

  it('shows error when user is not authenticated', async () => {
    // Mock auth.currentUser being null
    jest.spyOn(auth, 'currentUser', 'get').mockReturnValueOnce(null);
    
    (validatePersonalInfo as jest.Mock).mockReturnValue({
      isValid: true,
      errors: {}
    });

    const { getByText } = renderComponent();
    
    await act(async () => {
      fireEvent.press(getByText('Next'));
    });

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'You must be logged in to continue');
    expect(updateUserProfile).not.toHaveBeenCalled();
  });
});
