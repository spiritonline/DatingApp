import React, { useEffect, useState, useCallback } from 'react';
import { Keyboard } from 'react-native';
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
  SafeAreaView as RNSafeAreaView,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
  TextInputProps,
  TextProps,
  Switch
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import styled, { css, DefaultTheme } from 'styled-components/native';
import { useTheme } from 'styled-components';
import { useAuth } from '../../../../contexts/AuthContext';
import { useProfileForm } from '../../../../hooks/useProfileForm';
import { PromptAnswer, UserProfile } from '../../../../types/index';
import { PromptEditor } from '../../molecules/PromptEditor';
import { PhotoUploader } from '../../molecules/PhotoUploader';
import { validateProfile } from '../../../../utils/validators/profileValidators';

// Extend the DefaultTheme to include our custom theme properties
declare module 'styled-components' {
  export interface DefaultTheme {
    isDark: boolean;
    colors: {
      primary: string;
      background: string;
      card: string;
      text: string;
      border: string;
      notification: string;
    };
  }
}

// Styled Components with TypeScript
type DarkModeProps = { isDark: boolean };
type SelectedProps = { selected: boolean };
type DisabledProps = { disabled?: boolean };
type ErrorProps = { hasError?: boolean };

type PromptEditorProps = {
  initialPrompts: PromptAnswer[];
  onPromptsChanged: (prompts: PromptAnswer[]) => void;
  isDark: boolean;
};

type PhotoUploaderProps = {
  initialPhotos: string[];
  onPhotosChanged: (photos: string[]) => void;
  maxPhotos: number;
  isDark: boolean;
};

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

const HelpText = styled(RNText)<DarkModeProps>`
  font-size: 12px;
  color: ${(props: DarkModeProps) => props.isDark ? '#888888' : '#999999'};
  margin-top: 4px;
`;

const ErrorText = styled(RNText)`
  color: #FF3B30;
  font-size: 14px;
  margin-top: 4px;
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

const LocationConsentContainer = styled(View)<DarkModeProps>`
  flex-direction: row;
  align-items: center;
  margin-top: 16px;
  padding: 12px;
  background-color: ${(props: DarkModeProps) => props.isDark ? '#2C2C2E' : '#F5F5F5'};
  border-radius: 8px;
  border: 1px solid ${(props: DarkModeProps) => props.isDark ? '#444444' : '#DDDDDD'};
`;

const LocationConsentText = styled(RNText)<DarkModeProps>`
  flex: 1;
  color: ${(props: DarkModeProps) => props.isDark ? '#FFFFFF' : '#333333'};
  margin-left: 12px;
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

export const EditProfileScreen = () => {
    const theme = useTheme();
  const isDark = theme.isDark;
  const navigation = useNavigation();
  
  const { user } = useAuth();
  const { formData, validation, isLoading, error, fetchProfile, handleChange, saveProfile } = useProfileForm();
  const [isSaving, setIsSaving] = useState(false);
  
  // Local state for form data
  const [localFormData, setLocalFormData] = useState<Partial<UserProfile>>({
    name: formData.name || '',
    age: typeof formData.age === 'string' ? parseInt(formData.age, 10) : formData.age,
    gender: formData.gender || '',
    bio: formData.bio || '',
    locationConsent: formData.locationConsent || false,
    prompts: formData.prompts || [],
    photos: formData.photos || [],
  });
  
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  
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
  
  // Fetch user profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      const profileData = await fetchProfile();
      if (profileData?.gender) {
        setSelectedGender(profileData.gender);
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
  
  // Handle bio change
  const handleBioChange = (text: string) => {
    const newData = { ...localFormData, bio: text };
    setLocalFormData(newData);
    handleChange('bio', text);
  };
  
  // Handle gender selection
  const handleGenderSelect = (gender: string) => {
    setSelectedGender(gender);
    const newData = { ...localFormData, gender };
    setLocalFormData(newData);
    handleChange('gender', gender);
  };
  
  // Toggle location consent
  const toggleLocationConsent = useCallback(() => {
    const newConsent = !localFormData.locationConsent;
    const newData = { ...localFormData, locationConsent: newConsent };
    setLocalFormData(newData);
    handleChange('locationConsent', newConsent);
  }, [localFormData.locationConsent, handleChange]);
  
  // Handle photo updates
  const handlePhotosChange = (photoUrls: string[]) => {
    const newData = { ...localFormData, photos: photoUrls };
    setLocalFormData(newData);
    handleChange('photos', photoUrls);
  };
  
  // Handle prompt answer change
  const handlePromptChange = (id: string, text: string) => {
    const prompts = localFormData.prompts ? [...localFormData.prompts] : [];
    const promptIndex = prompts.findIndex(p => p.id === id);
    
    if (promptIndex !== -1) {
      prompts[promptIndex].answer = text;
      const newData = { ...localFormData, prompts };
      setLocalFormData(newData);
      handleChange('prompts', prompts);
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
  
  if (isLoading) {
    return (
      <LoadingContainer isDark={isDark}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
          
          {/* Location Consent */}
          <FormGroup>
            <LocationConsentContainer isDark={isDark}>
              <Switch
                value={localFormData.locationConsent || false}
                onValueChange={(value) => toggleLocationConsent()}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={localFormData.locationConsent ? '#f5dd4b' : '#f4f3f4'}
              />
              <LocationConsentText isDark={isDark}>
                I agree to share my location to find matches nearby
              </LocationConsentText>
            </LocationConsentContainer>
          </FormGroup>
          
          {/* Bio */}
          <FormGroup>
            <FormLabel isDark={isDark}>Bio</FormLabel>
            <Input
              isDark={isDark}
              value={localFormData.bio || ''}
              onChangeText={handleBioChange}
              placeholder="Tell us about yourself"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              accessibilityLabel="Bio input"
              testID="bio-input"
            />
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
