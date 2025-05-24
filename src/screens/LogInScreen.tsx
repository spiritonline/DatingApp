import { useState, useEffect } from 'react';
import { useColorScheme, View, Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { signInWithEmailAndPassword } from '@firebase/auth';
import { auth } from '../services/firebase';
import { AuthNavigationProp } from '../navigation/types';
import styled from 'styled-components/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthHeader from '../components/auth-components/AuthHeader';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, isProfileComplete } from '../services/profileService';

export default function LogInScreen() {
  const colorScheme = useColorScheme();
  const navigation = useNavigation<AuthNavigationProp>();
  const isDark = colorScheme === 'dark';
  const { isAuthenticated, isProfileComplete, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });
  
  // Handle authenticated navigation based on profile completion
  useEffect(() => {
    const checkProfileAndNavigate = async () => {
      if (isAuthenticated) {
        try {
          // Get the current user
          const user = auth.currentUser;
          if (!user) return;
          
          // Get user's profile
          const profile = await getUserProfile(user.uid);
          
          // Determine where to navigate based on profile completion
          if (profile && profile.profileComplete) {
            navigation.navigate('MainFeed');
          } else {
            // Profile is incomplete, navigate to the first profile setup screen
            navigation.navigate('PersonalInfo');
          }
        } catch (error) {
          console.error('Error checking profile:', error);
          // Default to profile setup on error
          navigation.navigate('PersonalInfo');
        }
      }
    };
    
    if (!authLoading && isAuthenticated) {
      checkProfileAndNavigate();
    }
  }, [isAuthenticated, authLoading, navigation]);

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      email: '',
      password: '',
    };

    // Email validation
    if (!email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
      isValid = false;
    }

    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleLogIn = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Authenticate with Firebase
      await signInWithEmailAndPassword(auth, email, password);
      // Navigation is handled by the useEffect hook that monitors auth state
    } catch (error: any) {
      console.error('Error logging in:', error);
      Alert.alert(
        'Login Failed',
        error.message || 'Failed to log in. Please check your credentials and try again.'
      );
      setIsLoading(false);
    }
  };

  const handleGoogleLogIn = () => {
    // Implementation would go here in a real app
    Alert.alert('Google Login', 'Google Login would be implemented here');
  };

  const handleAppleLogIn = () => {
    // Implementation would go here in a real app
    Alert.alert('Apple Login', 'Apple Login would be implemented here');
  };

  // Show a loading indicator while authentication state is being determined
  if (authLoading || (isLoading && isAuthenticated)) {
    return (
      <Container isDark={isDark}>
        <LoadingContainer>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </LoadingContainer>
      </Container>
    );
  }

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
          <AuthHeader title="Log In" onBack={() => navigation.goBack()} />
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
                placeholder="Enter your password"
                placeholderTextColor="#999"
                secureTextEntry
                testID="password-input"
                accessibilityLabel="Password input"
                accessibilityHint="Enter your password"
              />
              {errors.password ? <ErrorText>{errors.password}</ErrorText> : null}
            </InputContainer>

            <ForgotPasswordText 
              onPress={() => Alert.alert('Forgot Password', 'Password reset would be implemented here')}
              accessibilityRole="button"
              accessibilityLabel="Forgot Password"
              accessibilityHint="Reset your password"
            >
              Forgot Password?
            </ForgotPasswordText>

            <LoginButton 
              onPress={handleLogIn} 
              disabled={isLoading}
              testID="login-button"
              accessibilityRole="button"
              accessibilityLabel="Log In Button"
              accessibilityHint="Log in with your email and password"
            >
              <ButtonText>{isLoading ? 'Logging In...' : 'Log In'}</ButtonText>
            </LoginButton>

            <Divider isDark={isDark}>
              <DividerLine isDark={isDark} />
              <DividerText isDark={isDark}>or log in with</DividerText>
              <DividerLine isDark={isDark} />
            </Divider>

            <SocialButtonsContainer>
              <SocialButton 
                onPress={handleGoogleLogIn}
                testID="google-login-button"
                accessibilityRole="button"
                accessibilityLabel="Log in with Google"
              >
                <SocialButtonText isDark={isDark}>Google</SocialButtonText>
              </SocialButton>

              <SocialButton 
                onPress={handleAppleLogIn}
                testID="apple-login-button"
                accessibilityRole="button"
                accessibilityLabel="Log in with Apple"
              >
                <SocialButtonText isDark={isDark}>Apple</SocialButtonText>
              </SocialButton>
            </SocialButtonsContainer>

            <BottomText>
              Don't have an account?{' '}
              <LinkText 
                onPress={() => navigation.navigate('SignUp')}
                accessibilityRole="link"
                accessibilityLabel="Sign Up"
                accessibilityHint="Navigate to sign up screen"
              >
                Sign Up
              </LinkText>
            </BottomText>
          </FormContainer>
        </ScrollView>
      </KeyboardAvoidingView>
    </Container>
  );
}

import { ThemeProps } from '../utils/styled-components';

const Container = styled(SafeAreaView)<ThemeProps>`
  flex: 1;
  background-color: ${(props: ThemeProps) => (props.isDark ? '#121212' : '#ffffff')};
`;

const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
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

const ForgotPasswordText = styled.Text`
  color: #FF6B6B;
  font-size: 14px;
  align-self: flex-end;
  margin-bottom: 20px;
`;

interface ButtonProps {
  disabled?: boolean;
}

const LoginButton = styled.TouchableOpacity<ButtonProps>`
  width: 100%;
  padding: 16px;
  border-radius: 8px;
  background-color: #FF6B6B;
  align-items: center;
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
