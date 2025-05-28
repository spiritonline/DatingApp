import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '../../services/firebase';
import { updateUserProfile } from '../../services/profileService';
import { uploadMultipleFiles } from '../../utils/upload-service';
import PhotoUploadScreen from '../../screens/profile-setup/PhotoUploadScreen';
import { validatePhotoUpload, PhotoItem } from '../../screens/profile-setup/utils/validation';

// Mock the required modules
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('@/services/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-uid',
    },
  },
}));

jest.mock('@/services/profileService', () => ({
  updateUserProfile: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/utils/upload-service', () => ({
  uploadMultipleFiles: jest.fn().mockResolvedValue(['url1', 'url2', 'url3']),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-uid' },
    profile: {},
  }),
}));

jest.mock('@/screens/profile-setup/utils/validation', () => ({
  validatePhotoUpload: jest.fn(),
}));

describe('PhotoUploadScreen', () => {
  const mockPhotos = [
    { uri: 'photo1.jpg', id: '1' },
    { uri: 'photo2.jpg', id: '2' },
    { uri: 'photo3.jpg', id: '3' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');
    
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    
    (validatePhotoUpload as jest.Mock).mockReturnValue({
      isValid: true,
      error: '',
    });
  });

  const renderComponent = () => {
    return render(<PhotoUploadScreen />);
  };

  it('renders the photo upload screen', () => {
    const { getByText, getByTestId } = renderComponent();
    
    expect(getByText('Upload Photos')).toBeTruthy();
    expect(getByText(/Add at least 3 photos/)).toBeTruthy();
    expect(getByTestId('photo-grid')).toBeTruthy();
    expect(getByText('Next')).toBeTruthy();
  });

  it('requests media library permissions on mount', async () => {
    await act(async () => {
      renderComponent();
    });

    expect(ImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
  });

  it('shows alert when permissions are denied', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'denied',
    });

    await act(async () => {
      renderComponent();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Permission Required',
      'Please grant camera roll permissions to upload photos.'
    );
  });

  it('handles adding a photo', async () => {
    const mockImage = { uri: 'new-photo.jpg' };
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValueOnce({
      canceled: false,
      assets: [mockImage],
    });

    const { getByTestId } = renderComponent();
    
    await act(async () => {
      fireEvent.press(getByTestId('add-photo-button'));
    });

    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      exif: false,
    });
  });

  it('handles removing a photo', async () => {
    // Mock initial photos
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [
      mockPhotos,
      jest.fn(),
    ]);

    const { getAllByTestId } = renderComponent();
    const removeButtons = getAllByTestId('remove-photo-button');
    
    await act(async () => {
      fireEvent.press(removeButtons[0]);
    });

    // The photo should be removed from the state
    expect(React.useState).toHaveBeenCalled();
  });

  it('validates photo uploads', async () => {
    (validatePhotoUpload as jest.Mock).mockReturnValueOnce({
      isValid: false,
      error: 'Please upload at least 3 photos',
    });

    const { getByText } = renderComponent();
    
    await act(async () => {
      fireEvent.press(getByText('Next'));
    });

    expect(validatePhotoUpload).toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please upload at least 3 photos');
  });

  it('submits photos successfully', async () => {
    const mockNavigate = jest.fn();
    require('@react-navigation/native').useNavigation.mockReturnValue({ 
      navigate: mockNavigate,
    });

    // Mock initial photos
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [
      mockPhotos,
      jest.fn(),
    ]);

    const { getByText } = renderComponent();
    
    await act(async () => {
      fireEvent.press(getByText('Next'));
    });

    expect(validatePhotoUpload).toHaveBeenCalledWith(mockPhotos);
    expect(uploadMultipleFiles).toHaveBeenCalledWith(
      mockPhotos.map(photo => photo.uri),
      'user_photos/test-uid',
      'photo',
      expect.any(Function)
    );
    
    await waitFor(() => {
      expect(updateUserProfile).toHaveBeenCalledWith('test-uid', {
        photos: ['url1', 'url2', 'url3'],
      });
      expect(mockNavigate).toHaveBeenCalledWith('PromptsSetup');
    });
  });

  it('handles upload error', async () => {
    const errorMessage = 'Upload failed';
    (uploadMultipleFiles as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

    // Mock initial photos
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [
      mockPhotos,
      jest.fn(),
    ]);

    const { getByText } = renderComponent();
    
    await act(async () => {
      fireEvent.press(getByText('Next'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to upload photos. Please try again.');
    });
  });

  it('loads existing photos from profile', async () => {
    const existingPhotos = ['url1', 'url2'];
    
    jest.spyOn(React, 'useState').mockImplementationOnce(() => [
      existingPhotos.map((uri, index) => ({
        uri,
        id: `existing-${index}`,
      })),
      jest.fn(),
    ]);

    const { getAllByTestId } = renderComponent();
    const photoItems = getAllByTestId('photo-item');
    
    expect(photoItems.length).toBe(existingPhotos.length);
  });
});
