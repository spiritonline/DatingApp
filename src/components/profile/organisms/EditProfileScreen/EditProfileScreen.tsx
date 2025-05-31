import React, { useEffect, useState } from 'react';
import { Keyboard, Image } from 'react-native';
import { 
  ScrollView, 
  View, 
  ActivityIndicator, 
  Platform, 
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  Alert,
  TouchableOpacity,
  TextInput as RNTextInput,
  Text as RNText,
  SafeAreaView as RNSafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import styled from 'styled-components/native';
import { useAppTheme } from '../../../../utils/useAppTheme';
import { useProfileForm } from '../../../../hooks/useProfileForm';
import { PromptAnswer, UserProfile } from '../../../../types/index';
import { PromptEditor } from '../../molecules/PromptEditor';
import { PhotoUploader } from '../../molecules/PhotoUploader';
import { validateProfile } from '../../../../utils/validators/profileValidators';
import { useImagePicker } from '../../../../hooks/useImagePicker';


// Styled Components with TypeScript
type DarkModeProps = { isDark: boolean };
type DisabledProps = { disabled?: boolean };


const Container = styled(RNSafeAreaView)<DarkModeProps>`
  flex: 1;
  background-color: ${(props: DarkModeProps) => props.isDark ? '#121212' : '#FFFFFF'};
`;

const LoadingContainer = styled(View)<DarkModeProps>`
  flex: 1;
  justify-content: center;
  align-items: center;
  background-color: ${(props: DarkModeProps) => props.isDark ? '#121212' : '#FFFFFF'};
`;

const LoadingText = styled(RNText)<DarkModeProps>`
  margin-top: 16px;
  font-size: 16px;
  color: ${(props: DarkModeProps) => props.isDark ? '#FFFFFF' : '#333333'};
`;

const SectionTitle = styled(RNText)<DarkModeProps>`
  font-size: 20px;
  font-weight: bold;
  color: ${(props: DarkModeProps) => props.isDark ? '#FFFFFF' : '#333333'};
  margin-bottom: 16px;
  margin-top: 24px;
`;

const FormGroup = styled(View)`
  margin-bottom: 16px;
`;

const FormLabel = styled(RNText)<DarkModeProps>`
  font-size: 16px;
  font-weight: bold;
  color: ${(props: DarkModeProps) => props.isDark ? '#FFFFFF' : '#333333'};
  margin-bottom: 8px;
`;

const Input = styled(RNTextInput)<DarkModeProps & { hasError?: boolean }>`
  border-color: ${(props: DarkModeProps & { hasError?: boolean }) => props.hasError ? '#FF3B30' : props.isDark ? '#444444' : '#DDDDDD'};
  background-color: ${(props: DarkModeProps) => props.isDark ? '#2C2C2E' : '#F5F5F5'};
  color: ${(props: DarkModeProps) => props.isDark ? '#FFFFFF' : '#333333'};
  padding: 12px;
  border-radius: 8px;
  border: 1px solid ${(props: DarkModeProps) => props.isDark ? '#444444' : '#DDDDDD'};
`;


const GendersContainer = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  margin-top: 8px;
`;

const GenderOption = styled(TouchableOpacity)<{isSelected: boolean} & DarkModeProps>`
  flex: 0 0 48%;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
  align-items: center;
  background-color: ${(props: {isSelected: boolean} & DarkModeProps) => props.isSelected ? '#FF6B6B' : 'transparent'};
  border: 1px solid ${(props: {isSelected: boolean} & DarkModeProps) => props.isSelected ? '#FF6B6B' : props.isDark ? '#444444' : '#DDDDDD'};
`;

const GenderOptionText = styled(RNText)<{isSelected: boolean} & DarkModeProps>`
  color: ${(props: {isSelected: boolean} & DarkModeProps) => props.isSelected ? '#FFFFFF' : props.isDark ? '#FFFFFF' : '#333333'};
  font-weight: ${(props: {isSelected: boolean}) => props.isSelected ? 'bold' : 'normal'};
`;

const ProfilePictureContainer = styled(View)`
  align-items: center;
  margin-bottom: 24px;
`;

const ProfilePicture = styled(Image)`
  width: 120px;
  height: 120px;
  border-radius: 60px;
  background-color: #F0F0F0;
`;

const ProfilePicturePlaceholder = styled(View)`
  width: 120px;
  height: 120px;
  border-radius: 60px;
  background-color: #FF6B6B;
  justify-content: center;
  align-items: center;
`;

const ProfilePicturePlaceholderText = styled(RNText)`
  font-size: 48px;
  font-weight: bold;
  color: #FFFFFF;
`;

const ChangePhotoButton = styled(TouchableOpacity)<DarkModeProps>`
  margin-top: 12px;
  padding: 8px 16px;
  background-color: ${(props: DarkModeProps) => props.isDark ? '#2C2C2E' : '#F5F5F5'};
  border-radius: 20px;
  border: 1px solid ${(props: DarkModeProps) => props.isDark ? '#444444' : '#DDDDDD'};
`;

const ChangePhotoText = styled(RNText)<DarkModeProps>`
  color: ${(props: DarkModeProps) => props.isDark ? '#FF6B6B' : '#FF6B6B'};
  font-weight: 600;
  font-size: 14px;
`;

const SaveButton = styled(TouchableOpacity).attrs<DisabledProps & DarkModeProps>({
  activeOpacity: 0.8,
})<DisabledProps & DarkModeProps>`
  background-color: ${(props: DisabledProps & DarkModeProps) => props.disabled ? '#CCCCCC' : '#FF6B6B'};
  padding: 16px;
  border-radius: 8px;
  align-items: center;
  margin: 24px 0;
  opacity: ${(props: DisabledProps) => props.disabled ? 0.7 : 1};
`;

const SaveButtonText = styled(RNText)`
  color: #FFFFFF;
  font-size: 16px;
  font-weight: bold;
`;

const GENDER_OPTIONS = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'non-binary', label: 'Non-binary' },
  { id: 'other', label: 'Other' },
  { id: 'prefer-not-to-say', label: 'Prefer not to say' }
];

interface EditProfileScreenProps {
  saveRef?: React.MutableRefObject<(() => Promise<void>) | null>;
}

export const EditProfileScreen = ({ saveRef }: EditProfileScreenProps = {}) => {
  const { isDark, colors } = useAppTheme();
  const navigation = useNavigation();
  
  const { isLoading, fetchProfile, handleChange, saveProfile } = useProfileForm();
  const [isSaving, setIsSaving] = useState(false);
  
  // Local state for form data
  const [localFormData, setLocalFormData] = useState<Partial<UserProfile>>({
    name: '',
    age: undefined,
    gender: '',
    prompts: [],
    photos: [],
  });
  
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  
  // Image picker hook
  const { pickFromGallery } = useImagePicker();
  
  // Toggle keyboard visibility state
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  
  // Fetch user profile on mount and update local state
  useEffect(() => {
    const loadProfile = async () => {
      const profileData = await fetchProfile();
      if (profileData) {
        // Update local form data with fetched data
        setLocalFormData({
          name: profileData.name || profileData.displayName || '',
          age: typeof profileData.age === 'number' ? profileData.age : (typeof profileData.birthdate === 'number' ? profileData.birthdate : undefined),
          gender: profileData.gender || '',
          prompts: profileData.prompts || [],
          photos: profileData.photos || [],
        });
        
        // Update selected gender
        if (profileData.gender) {
          setSelectedGender(profileData.gender);
        }
        
        // Set profile picture (first photo if available)
        if (profileData.photos && profileData.photos.length > 0) {
          setProfilePicture(profileData.photos[0]);
        }
      }
    };
    
    loadProfile();
  }, [fetchProfile]);
  
  // Handle name change
  const handleNameChange = (text: string) => {
    const newData = { ...localFormData, name: text };
    setLocalFormData(newData);
    handleChange('name', text);
  };
  
  // Handle age change
  const handleAgeChange = (text: string) => {
    if (text === '' || /^\d{0,3}$/.test(text)) {
      const age = text ? parseInt(text, 10) : undefined;
      const newData = { ...localFormData, age };
      setLocalFormData(newData);
      handleChange('age', age);
    }
  };
  
  
  // Handle gender selection
  const handleGenderSelect = (gender: string) => {
    setSelectedGender(gender);
    const newData = { ...localFormData, gender };
    setLocalFormData(newData);
    handleChange('gender', gender);
  };
  
  
  // Handle photo updates
  const handlePhotosChange = (photoUrls: string[]) => {
    const newData = { ...localFormData, photos: photoUrls };
    setLocalFormData(newData);
    handleChange('photos', photoUrls);
    
    // Update profile picture if photos change
    if (photoUrls.length > 0) {
      setProfilePicture(photoUrls[0]);
    } else {
      setProfilePicture(null);
    }
  };
  
  // Handle profile picture change
  const handleProfilePictureChange = async () => {
    const result = await pickFromGallery('profile');
    if (result && !result.canceled && result.assets && result.assets[0]) {
      const newPhotoUri = result.assets[0].uri;
      
      // Update photos array with new profile picture at the beginning
      const updatedPhotos = [newPhotoUri, ...(localFormData.photos || []).filter(p => p !== newPhotoUri)];
      handlePhotosChange(updatedPhotos);
    }
  };
  
  
  // Handle prompts change
  const handlePromptsChanged = (prompts: PromptAnswer[]) => {
    const newData = { ...localFormData, prompts };
    setLocalFormData(newData);
    handleChange('prompts', prompts);
  };
  
  // Format age for display (handle both string and number types)
  const formattedAge = typeof localFormData.age === 'number' ? localFormData.age.toString() : localFormData.age || '';
  
  // Handle save button press
    const handleSave = async () => {
    try {
      if (isSaving) return;
      setIsSaving(true);
      Keyboard.dismiss();
      
      // Validate all fields
      const validationResult = validateProfile(localFormData);
      
      if (!validationResult.isValid) {
        // Show error dialog with the validation errors
        const errorMessages = Array.isArray(validationResult.errors) 
          ? validationResult.errors.join('\n')
          : Object.values(validationResult.errors || {}).filter(Boolean).join('\n');

        Alert.alert(
          'Please fix the following errors',
          errorMessages || 'Invalid form data',
          [{ text: 'OK' }]
        );
        setIsSaving(false);
        return;
      }

      // Save profile data
      await saveProfile();
      
      // Provide feedback to user
      Alert.alert(
        'Profile Updated', 
        'Your profile has been successfully updated.', 
        [{ 
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          }
        }]
      );
      
    } catch (error) {
      // Show error dialog
      Alert.alert(
        'Error', 
        'Failed to update your profile. Please try again.',
        [{ text: 'OK' }]
      );
      console.error('Error updating profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Expose save function through ref
  React.useEffect(() => {
    if (saveRef) {
      saveRef.current = handleSave;
    }
    return () => {
      if (saveRef) {
        saveRef.current = null;
      }
    };
  }, [saveRef, handleSave]);
  
  if (isLoading) {
    return (
      <LoadingContainer isDark={isDark}>
        <ActivityIndicator size="large" color={colors.primary} />
        <LoadingText isDark={isDark}>Loading profile...</LoadingText>
      </LoadingContainer>
    );
  }
  
  return (
    <RNKeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <Container isDark={isDark}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* Profile Picture Section */}
          <ProfilePictureContainer>
            {profilePicture ? (
              <ProfilePicture 
                source={{ uri: profilePicture }} 
              />
            ) : (
              <ProfilePicturePlaceholder>
                <ProfilePicturePlaceholderText>
                  {localFormData.name ? localFormData.name.charAt(0).toUpperCase() : 'U'}
                </ProfilePicturePlaceholderText>
              </ProfilePicturePlaceholder>
            )}
            <ChangePhotoButton 
              onPress={handleProfilePictureChange}
              isDark={isDark}
              accessibilityLabel="Change profile picture"
              accessibilityRole="button"
              testID="change-profile-picture-button"
            >
              <ChangePhotoText isDark={isDark}>Change Photo</ChangePhotoText>
            </ChangePhotoButton>
          </ProfilePictureContainer>
          
          <SectionTitle isDark={isDark}>Basic Information</SectionTitle>
          
          {/* Name input */}
          <FormGroup>
            <FormLabel isDark={isDark}>Name</FormLabel>
            <Input
              isDark={isDark}
              value={localFormData.name || ''}
              onChangeText={handleNameChange}
              placeholder="Your name"
              accessibilityLabel="Name input"
              testID="name-input"
            />
          </FormGroup>
          
          {/* Age input */}
          <FormGroup>
            <FormLabel isDark={isDark}>Age</FormLabel>
            <Input
              isDark={isDark}
              value={formattedAge}
              onChangeText={handleAgeChange}
              placeholder="Enter your age"
              keyboardType="number-pad"
              maxLength={3}
              accessibilityLabel="Age input"
              testID="age-input"
            />
          </FormGroup>
          
          {/* Gender selection */}
          <FormGroup>
            <FormLabel isDark={isDark}>Gender</FormLabel>
            <GendersContainer>
              {GENDER_OPTIONS.map((gender) => (
                <GenderOption
                  key={gender.id}
                  isSelected={selectedGender === gender.id}
                  onPress={() => handleGenderSelect(gender.id)}
                  isDark={isDark}
                  accessibilityLabel={`Select ${gender.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedGender === gender.id }}
                >
                  <GenderOptionText 
                    isSelected={selectedGender === gender.id}
                    isDark={isDark}
                  >
                    {gender.label}
                  </GenderOptionText>
                </GenderOption>
              ))}
            </GendersContainer>
          </FormGroup>
          
          
          {/* Photo upload */}
          <FormGroup>
            <FormLabel isDark={isDark}>Photos</FormLabel>
            <PhotoUploader
              initialPhotos={localFormData.photos || []}
              onPhotosChanged={handlePhotosChange}
              maxPhotos={6}
              isDark={isDark}
            />
          </FormGroup>
          
          {/* Prompts */}
          <FormGroup>
            <FormLabel isDark={isDark}>Prompts</FormLabel>
            <PromptEditor
              initialPrompts={localFormData.prompts || []}
              onPromptsChanged={handlePromptsChanged}
              isDark={isDark}
              maxPrompts={10}
            />
          </FormGroup>
          
          {/* Save button - only show when keyboard is not visible */}
          {!isKeyboardVisible && (
            <SaveButton 
              onPress={handleSave} 
              disabled={isSaving}
              isDark={isDark}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <SaveButtonText>Save Changes</SaveButtonText>
              )}
            </SaveButton>
          )}
        </ScrollView>
      </Container>
    </RNKeyboardAvoidingView>
  );
}
