import React, { useState, useEffect, useCallback } from 'react';
import { 
  useColorScheme, 
  View, 
  Alert, 
  ScrollView, 
  ActivityIndicator,
  FlatList,
  Image,
  useWindowDimensions,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../../services/firebase';
import { doc, updateDoc, getDoc, setDoc } from '@firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserProfile, updateProfileCompletionStatus } from '../../services/profileService';
import { ref, uploadBytes, getDownloadURL } from '@firebase/storage';
import { AuthNavigationProp } from '../../navigation/types';
import styled from 'styled-components/native';
import { 
  ThemeProps, 
  ButtonProps, 
  AccessibilityProps, 
  ProgressBarProps 
} from '../../utils/styled-components';
import { validatePhotoUpload, PhotoItem, SimpleValidationResult } from './utils/validation';

// Using PhotoItem from our validation utility

export default function PhotoUploadScreen() {
  const colorScheme = useColorScheme();
  const navigation = useNavigation<AuthNavigationProp>();
  const isDark = colorScheme === 'dark';
  const { width } = useWindowDimensions();
  const { user, profile } = useAuth();
  
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Load existing photos if available
  useEffect(() => {
    if (profile?.photos && profile.photos.length > 0) {
      const existingPhotos: PhotoItem[] = profile.photos.map((url, index) => ({
        uri: url,
        id: `existing-${index}`,
      }));
      setPhotos(existingPhotos);
    }
  }, [profile]);

  // Request permissions when component mounts
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera roll permissions to upload photos.'
        );
      }
    })();
  }, []);

  const handleAddPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newPhoto = {
          uri: result.assets[0].uri,
          id: Date.now().toString(),
        };
        setPhotos([...photos, newPhoto]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleRemovePhoto = useCallback((idToRemove: string) => {
    setPhotos(photos => photos.filter(photo => photo.id !== idToRemove));
  }, []);

  const handleNext = async (): Promise<void> => {
    try {
      const validation = validatePhotoUpload(photos);
      if (!validation.isValid) {
        Alert.alert('Error', validation.error || 'Please add at least 3 photos');
        return;
      }

      setIsLoading(true);
      setUploadProgress(0);

      const userId = user?.uid;
      
      if (!userId) {
        Alert.alert('Error', 'You must be logged in to continue');
        setIsLoading(false);
        return;
      }

      // Check if we need to upload new photos
      const newPhotos = photos.filter(photo => photo.uri.startsWith('file:'));
      let photoUrls = photos
        .filter(photo => !photo.uri.startsWith('file:'))
        .map(photo => photo.uri);
      
      // Upload new photos to Firebase Storage
      if (newPhotos.length > 0) {
        const newPhotoUrls = await Promise.all(
          newPhotos.map(async (photo, index) => {
            const timestamp = Date.now();
            const storageRef = ref(storage, `profiles/${userId}/photo-${timestamp}-${index}`);
            
            // Upload the file
            const response = await fetch(photo.uri);
            const blob = await response.blob();
            await uploadBytes(storageRef, blob);
            
            // Get download URL
            const downloadURL = await getDownloadURL(storageRef);
            
            // Update progress
            setUploadProgress(((index + 1) / newPhotos.length) * 100);
            
            return downloadURL;
          })
        );
        
        // Combine existing and new photo URLs
        photoUrls = [...photoUrls, ...newPhotoUrls];
      }

      // Update profile in Firestore
      await updateUserProfile(userId, {
        photos: photoUrls,
      });
      
      // Check if profile is complete after this update
      await updateProfileCompletionStatus(userId);

      // Navigate to next screen
      navigation.navigate('PromptsSetup');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error uploading photos:', error);
      Alert.alert(
        'Error',
        `Failed to upload photos: ${errorMessage}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate photo item dimensions
  const itemWidth = (width - 60) / 3;

  return (
    <Container isDark={isDark}>
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <Header>
          <HeaderText isDark={isDark}>Photo Upload</HeaderText>
          <SubHeaderText isDark={isDark}>
            Upload at least 3 photos to complete your profile
          </SubHeaderText>
        </Header>

        <ContentContainer>
          <PhotoGrid>
            {photos.map((photo) => (
              <PhotoItemContainer key={photo.id} style={{ width: itemWidth, height: itemWidth }}>
                <PhotoImage source={{ uri: photo.uri }} />
                <RemoveButton 
                  onPress={() => handleRemovePhoto(photo.id)}
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                  accessibilityHint={`Remove this photo from your profile`}
                  testID="remove-photo-button"
                >
                  <RemoveButtonText>×</RemoveButtonText>
                </RemoveButton>
              </PhotoItemContainer>
            ))}
            
            {photos.length < 6 && (
              <AddPhotoButton 
                onPress={handleAddPhoto} 
                style={{ width: itemWidth, height: itemWidth }}
                accessibilityRole="button"
                accessibilityLabel="Add photo"
                accessibilityHint="Upload a photo from your device"
                testID="photo-upload-button"
              >
                <AddPhotoButtonText>+</AddPhotoButtonText>
              </AddPhotoButton>
            )}
          </PhotoGrid>

          <PhotoCountText isDark={isDark}>
            {photos.length}/6 photos added {photos.length < 3 ? `(minimum 3 required)` : ''}
          </PhotoCountText>

          {isLoading && (
            <ProgressContainer>
              <ProgressBarOuter>
                <ProgressBarInner width={uploadProgress} />
              </ProgressBarOuter>
              <ProgressText>{Math.round(uploadProgress)}% uploaded</ProgressText>
            </ProgressContainer>
          )}

          <NextButton 
            onPress={handleNext}
            disabled={isLoading || photos.length < 3}
            testID="next-button"
            accessibilityRole="button"
            accessibilityLabel="Next button"
            accessibilityHint="Continue to prompts setup"
            accessibilityState={{ disabled: isLoading || photos.length < 3 }}
          >
            {isLoading ? (
              <NextButtonText>Uploading...</NextButtonText>
            ) : (
              <NextButtonText>Next</NextButtonText>
            )}
          </NextButton>
        </ContentContainer>
      </ScrollView>
    </Container>
  );
}

// Styled components
const Container = styled(SafeAreaView)<ThemeProps>`
  flex: 1;
  background-color: ${(props: ThemeProps) => (props.isDark ? '#121212' : '#ffffff')};
`;

const Header = styled.View`
  padding: 20px;
  align-items: center;
`;

const HeaderText = styled.Text<ThemeProps>`
  font-size: 24px;
  font-weight: bold;
  color: ${(props: ThemeProps) => (props.isDark ? '#ffffff' : '#333333')};
  margin-bottom: 8px;
`;

const SubHeaderText = styled.Text<ThemeProps>`
  font-size: 16px;
  color: ${(props: ThemeProps) => (props.isDark ? '#bbbbbb' : '#666666')};
  text-align: center;
`;

const ContentContainer = styled.View<{isDark?: boolean}>`
  flex: 1;
  padding: 20px;
  align-items: center;
`;

const PhotoGrid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-start;
  width: 100%;
  gap: 10px;
`;

const PhotoItemContainer = styled.View`
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  margin-bottom: 10px;
`;

const PhotoImage = styled.Image`
  width: 100%;
  height: 100%;
`;

const RemoveButton = styled.TouchableOpacity`
  position: absolute;
  top: 5px;
  right: 5px;
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background-color: rgba(0, 0, 0, 0.6);
  justify-content: center;
  align-items: center;
`;

const RemoveButtonText = styled.Text`
  color: white;
  font-size: 14px;
  font-weight: bold;
`;

const AddPhotoButton = styled.TouchableOpacity`
  border-radius: 8px;
  border: 1px dashed #999;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
`;

const AddPhotoButtonText = styled.Text`
  font-size: 32px;
  color: #999;
`;

const PhotoCountText = styled.Text<ThemeProps>`
  font-size: 14px;
  color: ${(props: ThemeProps) => (props.isDark ? '#bbbbbb' : '#666666')};
  margin: 10px 0 20px;
`;

const NextButton = styled.TouchableOpacity<ButtonProps>`
  width: 100%;
  padding: 16px;
  border-radius: 8px;
  background-color: #FF6B6B;
  align-items: center;
  opacity: ${(props: ButtonProps) => (props.disabled ? 0.7 : 1)};
  margin-top: 20px;
`;

const NextButtonText = styled.Text<ThemeProps>`
  color: white;
  font-size: 16px;
  font-weight: bold;
`;

const ProgressContainer = styled.View`
  width: 100%;
  margin-bottom: 20px;
`;

const ProgressBarOuter = styled.View`
  width: 100%;
  height: 8px;
  background-color: #E0E0E0;
  border-radius: 4px;
  overflow: hidden;
`;

const ProgressBarInner = styled.View<ProgressBarProps>`
  width: ${(props: ProgressBarProps) => props.width}%;
  height: 100%;
  background-color: #FF6B6B;
`;

const ProgressText = styled.Text`
  font-size: 12px;
  color: #666;
  text-align: center;
  margin-top: 5px;
`;
