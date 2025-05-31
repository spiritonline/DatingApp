import { useState } from 'react';
import { useColorScheme, View, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { AuthNavigationProp } from '../navigation/types';
import styled from 'styled-components/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthHeader from '../components/auth-components/AuthHeader';
import { validateEmail, validatePassword } from '../utils/validation';

export default function SignUpScreen() {
  const colorScheme = useColorScheme();
  const navigation = useNavigation<AuthNavigationProp>();
  const isDark = colorScheme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [hasAcceptedLocationChecks, setHasAcceptedLocationChecks] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    terms: '',
  });

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      email: '',
      password: '',
      confirmPassword: '',
      terms: '',
    };

    // Email validation with comprehensive checks
    if (!email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    // Password validation with strength checking
    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        newErrors.password = passwordValidation.suggestions[0] || 'Password is invalid';
        isValid = false;
      } else if (passwordValidation.strength === 'weak') {
        // Show suggestions for weak passwords
        newErrors.password = 'Weak password: ' + passwordValidation.suggestions.join(', ');
        isValid = false;
      }
    }

    // Confirm password validation
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    // Terms validation
    if (!hasAcceptedTerms || !hasAcceptedLocationChecks) {
      newErrors.terms = 'You must accept the terms and location checks';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigation.navigate('MainFeed');
    } catch (error: any) {
      console.error('Error signing up:', error);
      Alert.alert(
        'Sign Up Failed',
        error.message || 'Failed to create account. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    // Implementation would go here in a real app
    Alert.alert('Google Sign Up', 'Google Sign Up would be implemented here');
  };

  const handleAppleSignUp = () => {
    // Implementation would go here in a real app
    Alert.alert('Apple Sign Up', 'Apple Sign Up would be implemented here');
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
          <AuthHeader title="Create Account" onBack={() => navigation.goBack()} />
          <FormContainer>
            <InputContainer>
              <InputLabel isDark={isDark}>Email</InputLabel>
              <Input
                isDark={isDark}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                testID="email-input"
                accessibilityLabel="Email input"
                accessibilityHint="Enter your email address"
              />
              {errors.email ? <ErrorText>{errors.email}</ErrorText> : null}
            </InputContainer>

            <InputContainer>
              <InputLabel isDark={isDark}>Password</InputLabel>
              <Input
                isDark={isDark}
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password"
                placeholderTextColor="#999"
                secureTextEntry
                testID="password-input"
                accessibilityLabel="Password input"
                accessibilityHint="Create a password with at least 6 characters"
              />
              {errors.password ? <ErrorText>{errors.password}</ErrorText> : null}
            </InputContainer>

            <InputContainer>
              <InputLabel isDark={isDark}>Confirm Password</InputLabel>
              <Input
                isDark={isDark}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                placeholderTextColor="#999"
                secureTextEntry
                testID="confirm-password-input"
                accessibilityLabel="Confirm password input"
                accessibilityHint="Confirm your password"
              />
              {errors.confirmPassword ? <ErrorText>{errors.confirmPassword}</ErrorText> : null}
            </InputContainer>

            <CheckboxContainer>
              <Checkbox
                accessibilityRole="checkbox"
                accessibilityState={{ checked: hasAcceptedTerms }}
                onPress={() => setHasAcceptedTerms(!hasAcceptedTerms)}
                testID="terms-checkbox"
              >
                <CheckboxBox isChecked={hasAcceptedTerms} isDark={isDark}>
                  {hasAcceptedTerms && <CheckboxCheck>✓</CheckboxCheck>}
                </CheckboxBox>
                <CheckboxLabel isDark={isDark}>
                  I accept the Terms of Service and Privacy Policy
                </CheckboxLabel>
              </Checkbox>
            </CheckboxContainer>

            <CheckboxContainer>
              <Checkbox
                accessibilityRole="checkbox"
                accessibilityState={{ checked: hasAcceptedLocationChecks }}
                onPress={() => setHasAcceptedLocationChecks(!hasAcceptedLocationChecks)}
                testID="location-checkbox"
              >
                <CheckboxBox isChecked={hasAcceptedLocationChecks} isDark={isDark}>
                  {hasAcceptedLocationChecks && <CheckboxCheck>✓</CheckboxCheck>}
                </CheckboxBox>
                <CheckboxLabel isDark={isDark}>
                  I consent to 3-day location checks
                </CheckboxLabel>
              </Checkbox>
            </CheckboxContainer>

            {errors.terms ? <ErrorText>{errors.terms}</ErrorText> : null}

            <SignUpButton 
              onPress={handleSignUp} 
              disabled={isLoading}
              testID="signup-button"
              accessibilityRole="button"
              accessibilityLabel="Sign Up Button"
              accessibilityHint="Create a new account with the provided information"
            >
              <ButtonText>{isLoading ? 'Creating Account...' : 'Sign Up'}</ButtonText>
            </SignUpButton>

            <Divider isDark={isDark}>
              <DividerLine isDark={isDark} />
              <DividerText isDark={isDark}>or sign up with</DividerText>
              <DividerLine isDark={isDark} />
            </Divider>

            <SocialButtonsContainer>
              <SocialButton 
                onPress={handleGoogleSignUp}
                testID="google-signup-button"
                accessibilityRole="button"
                accessibilityLabel="Sign up with Google"
              >
                <SocialButtonText isDark={isDark}>Google</SocialButtonText>
              </SocialButton>

              <SocialButton 
                onPress={handleAppleSignUp}
                testID="apple-signup-button"
                accessibilityRole="button"
                accessibilityLabel="Sign up with Apple"
              >
                <SocialButtonText isDark={isDark}>Apple</SocialButtonText>
              </SocialButton>
            </SocialButtonsContainer>

            <BottomText>
              Already have an account?{' '}
              <LinkText 
                onPress={() => navigation.navigate('LogIn')}
                accessibilityRole="link"
                accessibilityLabel="Log In"
                accessibilityHint="Navigate to log in screen"
              >
                Log In
              </LinkText>
            </BottomText>
          </FormContainer>
        </ScrollView>
      </KeyboardAvoidingView>
    </Container>
  );
}

import { ThemeProps, CheckboxProps } from '../utils/styled-components';

const Container = styled(SafeAreaView)<ThemeProps>`
  flex: 1;
  background-color: ${(props: ThemeProps) => (props.isDark ? '#121212' : '#ffffff')};
`;

const FormContainer = styled.View`
  flex: 1;
  padding: 20px;
  align-items: center;
`;

const InputContainer = styled.View`
  width: 100%;
  margin-bottom: 16px;
`;

const InputLabel = styled.Text<ThemeProps>`
  font-size: 14px;
  margin-bottom: 8px;
  color: ${(props: ThemeProps) => (props.isDark ? '#e0e0e0' : '#333')};
`;

const Input = styled.TextInput<ThemeProps>`
  width: 100%;
  padding: 16px;
  border-radius: 8px;
  background-color: ${(props: ThemeProps) => (props.isDark ? '#2c2c2c' : '#f5f5f5')};
  color: ${(props: ThemeProps) => (props.isDark ? '#ffffff' : '#000000')};
  border: 1px solid ${(props: ThemeProps) => (props.isDark ? '#444' : '#ddd')};
`;

const ErrorText = styled.Text`
  color: #ff3b30;
  font-size: 12px;
  margin-top: 4px;
`;

const CheckboxContainer = styled.View`
  width: 100%;
  margin-bottom: 12px;
`;

const Checkbox = styled.TouchableOpacity`
  flex-direction: row;
  align-items: center;
`;

const CheckboxBox = styled.View<CheckboxProps>`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid ${(props: CheckboxProps) => (props.isDark ? '#666' : '#ccc')};
  background-color: ${(props: CheckboxProps) => (props.isChecked ? '#FF6B6B' : 'transparent')};
  justify-content: center;
  align-items: center;
  margin-right: 8px;
`;

const CheckboxCheck = styled.Text`
  color: white;
  font-size: 14px;
`;

const CheckboxLabel = styled.Text<ThemeProps>`
  flex: 1;
  font-size: 14px;
  color: ${(props: ThemeProps) => (props.isDark ? '#e0e0e0' : '#333')};
`;

interface ButtonProps {
  disabled?: boolean;
}

const SignUpButton = styled.TouchableOpacity<ButtonProps>`
  width: 100%;
  padding: 16px;
  border-radius: 8px;
  background-color: #FF6B6B;
  align-items: center;
  margin-top: 20px;
  opacity: ${(props: ButtonProps) => (props.disabled ? 0.7 : 1)};
`;

const ButtonText = styled.Text`
  color: white;
  font-size: 16px;
  font-weight: bold;
`;

const Divider = styled.View<ThemeProps>`
  flex-direction: row;
  align-items: center;
  width: 100%;
  margin: 30px 0;
`;

const DividerLine = styled.View<ThemeProps>`
  flex: 1;
  height: 1px;
  background-color: ${(props: ThemeProps) => (props.isDark ? '#444' : '#ddd')};
`;

const DividerText = styled.Text<ThemeProps>`
  color: ${(props: ThemeProps) => (props.isDark ? '#888' : '#999')};
  padding: 0 10px;
  font-size: 12px;
`;

const SocialButtonsContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  width: 100%;
`;

const SocialButton = styled.TouchableOpacity`
  flex: 0.48;
  padding: 14px;
  border-radius: 8px;
  border: 1px solid #ddd;
  align-items: center;
`;

const SocialButtonText = styled.Text<ThemeProps>`
  font-size: 14px;
  color: ${(props: ThemeProps) => (props.isDark ? '#e0e0e0' : '#333')};
`;

const BottomText = styled.Text`
  margin-top: 30px;
  font-size: 14px;
  color: #999;
`;

const LinkText = styled.Text`
  color: #FF6B6B;
  font-weight: bold;
`;
