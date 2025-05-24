import React, { useState } from 'react';
import { 
  useColorScheme, 
  View, 
  Alert, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../services/firebase';
import { doc, setDoc } from '@firebase/firestore';
import { AuthNavigationProp } from '../../navigation/types';
import styled from 'styled-components/native';
import { ThemeProps } from '../../utils/styled-components';
import { validatePersonalInfo, PersonalInfoData, PersonalInfoErrors } from './utils/validation';

// Using types from our validation utility

export default function PersonalInfoScreen() {
  const colorScheme = useColorScheme();
  const navigation = useNavigation<AuthNavigationProp>();
  const isDark = colorScheme === 'dark';

  const [formData, setFormData] = useState<PersonalInfoData>({
    name: '',
    age: '',
    gender: '',
    locationConsent: false
  });

  const [errors, setErrors] = useState<PersonalInfoErrors>({
    name: '',
    age: '',
    gender: '',
    locationConsent: ''
  });

  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const result = validatePersonalInfo(formData);
    setErrors(result.errors);
    return result.isValid;
  };

  const handleNext = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        Alert.alert('Error', 'You must be logged in to continue');
        return;
      }

      // Save to Firestore
      await setDoc(doc(db, 'profiles', userId), {
        name: formData.name,
        age: parseInt(formData.age, 10),
        gender: formData.gender,
        locationConsent: formData.locationConsent
      }, { merge: true });

      // Navigate to next screen
      navigation.navigate('PhotoUpload');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to save personal information. Please try again.'
      );
      console.error('Error saving personal info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameChange = (text: string) => {
    setFormData({ ...formData, name: text });
  };

  const handleAgeChange = (text: string) => {
    setFormData({ ...formData, age: text });
  };

  const handleGenderSelect = (gender: string) => {
    setFormData({ ...formData, gender });
  };

  const toggleLocationConsent = () => {
    setFormData({ ...formData, locationConsent: !formData.locationConsent });
  };

  return (
    <Container isDark={isDark}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, width: '100%' }}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <Header>
            <HeaderText isDark={isDark}>Personal Information</HeaderText>
            <SubHeaderText isDark={isDark}>
              Tell us about yourself to set up your profile
            </SubHeaderText>
          </Header>

          <FormContainer>
            <InputContainer>
              <InputLabel isDark={isDark}>Full Name</InputLabel>
              <Input
                isDark={isDark}
                value={formData.name}
                onChangeText={handleNameChange}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
                testID="name-input"
                accessibilityLabel="Name input"
                accessibilityHint="Enter your full name"
              />
              {errors.name ? <ErrorText>{errors.name}</ErrorText> : null}
            </InputContainer>

            <InputContainer>
              <InputLabel isDark={isDark}>Age</InputLabel>
              <Input
                isDark={isDark}
                value={formData.age}
                onChangeText={handleAgeChange}
                placeholder="Enter your age"
                placeholderTextColor="#999"
                keyboardType="numeric"
                testID="age-input"
                accessibilityLabel="Age input"
                accessibilityHint="Enter your age"
              />
              {errors.age ? <ErrorText>{errors.age}</ErrorText> : null}
            </InputContainer>

            <InputContainer testID="gender-selector">
              <InputLabel isDark={isDark}>Gender</InputLabel>
              <GenderContainer>
                <GenderOption
                  selected={formData.gender === 'male'}
                  onPress={() => handleGenderSelect('male')}
                  testID="gender-option-male"
                  accessibilityRole="radio"
                  accessibilityState={{ checked: formData.gender === 'male' }}
                  accessibilityLabel="Male"
                >
                  <GenderOptionText selected={formData.gender === 'male'}>
                    Male
                  </GenderOptionText>
                </GenderOption>
                
                <GenderOption
                  selected={formData.gender === 'female'}
                  onPress={() => handleGenderSelect('female')}
                  testID="gender-option-female"
                  accessibilityRole="radio"
                  accessibilityState={{ checked: formData.gender === 'female' }}
                  accessibilityLabel="Female"
                >
                  <GenderOptionText selected={formData.gender === 'female'}>
                    Female
                  </GenderOptionText>
                </GenderOption>
                
                <GenderOption
                  selected={formData.gender === 'non-binary'}
                  onPress={() => handleGenderSelect('non-binary')}
                  testID="gender-option-non-binary"
                  accessibilityRole="radio"
                  accessibilityState={{ checked: formData.gender === 'non-binary' }}
                  accessibilityLabel="Non-binary"
                >
                  <GenderOptionText selected={formData.gender === 'non-binary'}>
                    Non-binary
                  </GenderOptionText>
                </GenderOption>

                <GenderOption
                  selected={formData.gender === 'prefer-not-to-say'}
                  onPress={() => handleGenderSelect('prefer-not-to-say')}
                  testID="gender-option-prefer-not-to-say"
                  accessibilityRole="radio"
                  accessibilityState={{ checked: formData.gender === 'prefer-not-to-say' }}
                  accessibilityLabel="Prefer not to say"
                >
                  <GenderOptionText selected={formData.gender === 'prefer-not-to-say'}>
                    Prefer not to say
                  </GenderOptionText>
                </GenderOption>
              </GenderContainer>
              {errors.gender ? <ErrorText>{errors.gender}</ErrorText> : null}
            </InputContainer>

            <InputContainer>
              <CheckboxContainer 
                onPress={toggleLocationConsent}
                testID="location-consent-checkbox"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: formData.locationConsent }}
                accessibilityLabel="Location consent"
                accessibilityHint="Check to give consent for location services"
              >
                <Checkbox isChecked={formData.locationConsent}>
                  {formData.locationConsent && <CheckboxInner />}
                </Checkbox>
                <CheckboxLabel isDark={isDark}>
                  I give permission to access my location data for 3 days to help find matches in my area
                </CheckboxLabel>
              </CheckboxContainer>
              {errors.locationConsent ? <ErrorText>{errors.locationConsent}</ErrorText> : null}
            </InputContainer>

            <NextButton 
              onPress={handleNext}
              disabled={isLoading}
              testID="next-button"
              accessibilityRole="button"
              accessibilityLabel="Next button"
              accessibilityHint="Continue to photo upload"
              accessibilityState={{ disabled: isLoading }}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ButtonText>Next</ButtonText>
              )}
            </NextButton>
            {isLoading && <LoadingText>Saving...</LoadingText>}
          </FormContainer>
        </ScrollView>
      </KeyboardAvoidingView>
    </Container>
  );
}

// Styled components
const Container = styled(SafeAreaView)<{isDark?: boolean}>`
  flex: 1;
  background-color: ${(props: {isDark?: boolean}) => (props.isDark ? '#121212' : '#ffffff')};
`;

const Header = styled.View<{isDark?: boolean}>`
  padding: 20px;
  align-items: center;
`;

const HeaderText = styled.Text<{isDark?: boolean}>`
  font-size: 24px;
  font-weight: bold;
  color: ${(props: {isDark?: boolean}) => (props.isDark ? '#ffffff' : '#333333')};
  margin-bottom: 8px;
`;

const SubHeaderText = styled.Text<{isDark?: boolean}>`
  font-size: 16px;
  color: ${(props: {isDark?: boolean}) => (props.isDark ? '#bbbbbb' : '#666666')};
  text-align: center;
`;

const FormContainer = styled.View`
  flex: 1;
  padding: 20px;
  align-items: center;
`;

const InputContainer = styled.View<{isDark?: boolean}>`
  width: 100%;
  margin-bottom: 20px;
`;

const InputLabel = styled.Text<{isDark?: boolean}>`
  font-size: 16px;
  margin-bottom: 8px;
  color: ${(props: {isDark?: boolean}) => (props.isDark ? '#e0e0e0' : '#333')};
`;

const Input = styled.TextInput<{isDark?: boolean}>`
  width: 100%;
  padding: 16px;
  border-radius: 8px;
  background-color: ${(props: {isDark?: boolean}) => (props.isDark ? '#2c2c2e' : '#ffffff')};
  color: ${(props: {isDark?: boolean}) => (props.isDark ? '#ffffff' : '#000000')};
  border: 1px solid ${(props: {isDark?: boolean}) => (props.isDark ? '#444' : '#ddd')};
`;

const ErrorText = styled.Text<{isDark?: boolean}>`
  color: #ff3b30;
  font-size: 12px;
  margin-top: 4px;
`;

const GenderContainer = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
`;

interface GenderProps {
  selected: boolean;
}

const GenderOption = styled.TouchableOpacity<{selected?: boolean}>`
  flex: 0 0 48%;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 12px;
  align-items: center;
  background-color: ${(props: {selected?: boolean}) => (props.selected ? '#FF6B6B' : 'transparent')};
  border: 1px solid ${(props: {selected?: boolean}) => (props.selected ? '#FF6B6B' : '#ddd')};
`;

const GenderOptionText = styled.Text<{selected?: boolean}>`
  color: ${(props: {selected?: boolean}) => (props.selected ? '#ffffff' : '#333333')};
  font-weight: ${(props: {selected?: boolean}) => (props.selected ? 'bold' : 'normal')};
`;

const CheckboxContainer = styled.TouchableOpacity<{isDark?: boolean}>`
  flex-direction: row;
  align-items: flex-start;
  width: 100%;
`;

interface CheckboxProps {
  isChecked: boolean;
}

const Checkbox = styled.View<{isChecked: boolean}>`
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid ${(props: {isChecked: boolean}) => (props.isChecked ? '#FF6B6B' : '#ddd')};
  background-color: ${(props: {isChecked: boolean}) => (props.isChecked ? '#FF6B6B' : 'transparent')};
  margin-right: 12px;
  justify-content: center;
  align-items: center;
`;

const CheckboxInner = styled.View`
  width: 12px;
  height: 12px;
  background-color: white;
  border-radius: 2px;
`;

const CheckboxLabel = styled.Text<{isDark?: boolean}>`
  flex: 1;
  font-size: 14px;
  color: ${(props: {isDark?: boolean}) => (props.isDark ? '#e0e0e0' : '#333')};
`;

const NextButton = styled.TouchableOpacity<{disabled: boolean}>`
  width: 100%;
  padding: 16px;
  border-radius: 8px;
  background-color: #FF6B6B;
  align-items: center;
  opacity: ${(props: {disabled: boolean}) => (props.disabled ? 0.7 : 1)};
  margin-top: 20px;
`;

const ButtonText = styled.Text`
  color: white;
  font-size: 16px;
  font-weight: bold;
`;

const LoadingText = styled.Text`
  color: #FF6B6B;
  font-size: 14px;
  margin-top: 10px;
`;
