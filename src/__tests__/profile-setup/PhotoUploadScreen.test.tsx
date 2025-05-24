import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PhotoUploadScreen from '../../screens/profile-setup/PhotoUploadScreen';
import { AuthStackParamList } from '../../navigation/types';
import { auth, db, storage } from '../../services/firebase';

// Mock Firebase storage functions
jest.mock('@firebase/storage', () => ({
  ref: jest.fn().mockReturnValue('mocked-storage-ref'),
  uploadBytes: jest.fn().mockResolvedValue(undefined),
  getDownloadURL: jest.fn().mockResolvedValue('https://example.com/photo-1.jpg')
}));

// Mock Firebase firestore functions
jest.mock('@firebase/firestore', () => ({
  doc: jest.fn().mockReturnValue('mocked-doc-ref'),
  updateDoc: jest.fn().mockResolvedValue(undefined)
}));

// Mock Firebase services
jest.mock('../../services/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-id'
    }
  },
  db: {},
  storage: {}
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({
    canceled: false,
    assets: [
      { uri: 'file://test/image1.jpg' }
    ]
  }),
  MediaTypeOptions: {
    Images: 'Images'
  },
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true })
}));

// Mock navigation
const Stack = createNativeStackNavigator<AuthStackParamList>();
const MockNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator>
      <Stack.Screen name="PhotoUpload" component={PhotoUploadScreen} />
      <Stack.Screen name="PromptsSetup" component={() => null} />
    </Stack.Navigator>
  </NavigationContainer>
);

describe('PhotoUploadScreen', () => {
  it('renders correctly', () => {
    const { getByText, getByTestId } = render(<MockNavigator />);
    
    expect(getByText('Photo Upload')).toBeTruthy();
    expect(getByTestId('photo-upload-button')).toBeTruthy();
    expect(getByTestId('next-button')).toBeTruthy();
  });

  it('disables next button when less than 3 photos are selected', () => {
    const { getByTestId } = render(<MockNavigator />);
    
    const nextButton = getByTestId('next-button');
    expect(nextButton.props.accessibilityState.disabled).toBe(true);
  });

  it('enables next button when at least 3 photos are selected', async () => {
    const { getByTestId } = render(<MockNavigator />);
    
    // Mock the state where 3 photos are already selected
    // This implementation will depend on how you're storing the photos in state
    await waitFor(() => {
      // Trigger photo selection 3 times
      fireEvent.press(getByTestId('photo-upload-button'));
      fireEvent.press(getByTestId('photo-upload-button'));
      fireEvent.press(getByTestId('photo-upload-button'));
    });
    
    const nextButton = getByTestId('next-button');
    expect(nextButton.props.accessibilityState.disabled).toBe(false);
  });

  it('uploads photos to Firebase Storage and updates Firestore on submit', async () => {
    const { getByTestId } = render(<MockNavigator />);
    
    // Simulate having 3 photos selected
    await waitFor(() => {
      fireEvent.press(getByTestId('photo-upload-button'));
      fireEvent.press(getByTestId('photo-upload-button'));
      fireEvent.press(getByTestId('photo-upload-button'));
    });
    
    // Submit form
    fireEvent.press(getByTestId('next-button'));
    
    // Verify Storage and Firestore were called
    await waitFor(() => {
      expect(storage.ref).toHaveBeenCalledWith('profiles/test-user-id');
      expect(db.collection).toHaveBeenCalledWith('profiles');
      expect(db.doc).toHaveBeenCalledWith('test-user-id');
      expect(db.update).toHaveBeenCalledWith({
        photos: expect.any(Array)
      });
    });
  });

  it('shows loading state during photo upload', async () => {
    const { getByTestId, getByText } = render(<MockNavigator />);
    
    // Simulate having 3 photos selected
    await waitFor(() => {
      fireEvent.press(getByTestId('photo-upload-button'));
      fireEvent.press(getByTestId('photo-upload-button'));
      fireEvent.press(getByTestId('photo-upload-button'));
    });
    
    // Submit form
    fireEvent.press(getByTestId('next-button'));
    
    // Check loading state
    expect(getByText('Uploading...')).toBeTruthy();
  });

  it('allows removing selected photos', async () => {
    const { getByTestId, getAllByTestId } = render(<MockNavigator />);
    
    // Add 3 photos
    await waitFor(() => {
      fireEvent.press(getByTestId('photo-upload-button'));
      fireEvent.press(getByTestId('photo-upload-button'));
      fireEvent.press(getByTestId('photo-upload-button'));
    });
    
    // Get remove buttons for photos
    const removeButtons = getAllByTestId('remove-photo-button');
    expect(removeButtons.length).toBe(3);
    
    // Remove one photo
    fireEvent.press(removeButtons[0]);
    
    // Next button should be disabled again
    const nextButton = getByTestId('next-button');
    expect(nextButton.props.accessibilityState.disabled).toBe(true);
  });
});
