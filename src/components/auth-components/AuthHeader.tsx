import { useColorScheme } from 'react-native';
import styled from 'styled-components/native';
import { ThemeProps } from '../../utils/styled-components';

interface AuthHeaderProps {
  title: string;
  onBack: () => void;
}



export default function AuthHeader({ title, onBack }: AuthHeaderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Container>
      <BackButton 
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Back"
        accessibilityHint="Go back to previous screen"
        testID="back-button"
      >
        <BackArrow isDark={isDark}>←</BackArrow>
      </BackButton>
      <Title isDark={isDark}>{title}</Title>
      <Spacer />
    </Container>
  );
}

const Container = styled.View`
  width: 100%;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
`;

const BackButton = styled.TouchableOpacity`
  padding: 8px;
`;

const BackArrow = styled.Text<ThemeProps>`
  font-size: 24px;
  color: ${(props: ThemeProps) => (props.isDark ? '#e0e0e0' : '#333')};
`;

const Title = styled.Text<ThemeProps>`
  font-size: 22px;
  font-weight: bold;
  color: ${(props: ThemeProps) => (props.isDark ? '#e0e0e0' : '#333')};
`;

const Spacer = styled.View`
  width: 24px;
`;
