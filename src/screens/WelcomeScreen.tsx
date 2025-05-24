import { useColorScheme } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthNavigationProp } from '../navigation/types';
import styled from 'styled-components/native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const colorScheme = useColorScheme();
  const navigation = useNavigation<AuthNavigationProp>();
  const isDark = colorScheme === 'dark';

  const handleSignUp = () => {
    navigation.navigate('SignUp');
  };

  const handleLogIn = () => {
    navigation.navigate('LogIn');
  };

  return (
    <Container isDark={isDark}>
      <Logo accessibilityRole="image" accessibilityLabel="Dating App Logo">
        Dating App
      </Logo>
      <Tagline accessibilityRole="text">Find your perfect match</Tagline>
      <ButtonsContainer>
        <PrimaryButton 
          onPress={handleSignUp} 
          accessibilityRole="button" 
          accessibilityLabel="Sign Up"
          accessibilityHint="Navigate to sign up screen"
        >
          <ButtonText isDark={false}>Sign Up</ButtonText>
        </PrimaryButton>
        <SecondaryButton 
          onPress={handleLogIn} 
          accessibilityRole="button" 
          accessibilityLabel="Log In"
          accessibilityHint="Navigate to log in screen"
        >
          <ButtonText isDark={isDark}>Log In</ButtonText>
        </SecondaryButton>
      </ButtonsContainer>
    </Container>
  );
}

import { ThemeProps } from '../utils/styled-components';

const Container = styled(SafeAreaView)<ThemeProps>`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background-color: ${(props: ThemeProps) => (props.isDark ? '#121212' : '#ffffff')};
`;

const Logo = styled.Text`
  font-size: 36px;
  font-weight: bold;
  color: #FF6B6B;
  margin-bottom: 10px;
`;

const Tagline = styled.Text`
  font-size: 18px;
  color: #666;
  margin-bottom: 60px;
`;

const ButtonsContainer = styled.View`
  width: 100%;
  max-width: 300px;
`;

const BaseButton = styled.TouchableOpacity`
  width: 100%;
  padding: 16px;
  border-radius: 8px;
  align-items: center;
  margin-bottom: 16px;
`;

const PrimaryButton = styled(BaseButton)`
  background-color: #FF6B6B;
`;

const SecondaryButton = styled(BaseButton)<ThemeProps>`
  background-color: transparent;
  border: 1px solid #FF6B6B;
`;

const ButtonText = styled.Text<ThemeProps>`
  font-size: 16px;
  font-weight: bold;
  color: ${(props: ThemeProps) => (props.isDark ? '#FF6B6B' : '#ffffff')};
`;
