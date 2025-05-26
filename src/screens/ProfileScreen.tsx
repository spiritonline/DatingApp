import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAppTheme } from '../utils/useAppTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from '@firebase/firestore';
import { MainNavigationProp } from '../navigation/types';
import styled from 'styled-components/native';
import { ThemeProps } from '../utils/styled-components';
import { UserProfile } from '../services/profileService';

export default function ProfileScreen() {
  const { isDark, colors } = useAppTheme();
  const navigation = useNavigation<MainNavigationProp>();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locationConsent, setLocationConsent] = useState(false);
  const [profileVisible, setProfileVisible] = useState(true);
  
  // Fetch user profile on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!auth.currentUser) return;
      
      try {
        const userProfileRef = doc(db, 'profiles', auth.currentUser.uid);
        const userProfileSnap = await getDoc(userProfileRef);
        
        if (userProfileSnap.exists()) {
          const profileData = userProfileSnap.data() as UserProfile;
          setProfile(profileData);
          setLocationConsent(profileData.locationConsent || false);
          setProfileVisible(profileData.visible !== false); // Default to true if not set
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        Alert.alert('Error', 'Failed to load profile information');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserProfile();
  }, []);
  
  // Handle sign out
  const handleSignOut = async () => {
    try {
      await auth.signOut();
      // Navigate to the auth stack
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' as any }], // Using 'any' for cross-stack navigation
      });
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };
  
  // Confirm account deletion
  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: handleDeleteAccount 
        },
      ]
    );
  };
  
  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;
    
    try {
      // In a real app, you would delete the user's data from Firestore first
      await auth.currentUser.delete();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' as any }], // Using 'any' for cross-stack navigation
      });
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert(
        'Error', 
        'Failed to delete account. You may need to sign in again before deleting.'
      );
    }
  };
  
  // Our custom hook provides the theme values safely
  
  if (isLoading) {
    return (
      <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(300)}>
        <Container isDark={isDark} testID="profile-screen">
          <LoadingContainer>
            <ActivityIndicator size="large" color={colors.primary} />
          </LoadingContainer>
        </Container>
      </Animated.View>
    );
  }
  
  return (
    <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(300)}>
      <Container isDark={isDark} testID="profile-screen">
        <ScrollView>
        <HeaderContainer>
          <Title isDark={isDark}>Profile</Title>
        </HeaderContainer>
        
        {/* Profile header */}
        <ProfileHeaderContainer>
          <ProfileAvatar>
            <Text style={{ color: '#ffffff', fontSize: 24, fontWeight: 'bold' }}>
              {profile?.displayName?.charAt(0) || 'U'}
            </Text>
          </ProfileAvatar>
          <ProfileName isDark={isDark}>
            {profile?.displayName || 'User'}
          </ProfileName>
          <EditProfileButton 
            accessibilityLabel="Edit profile"
            accessibilityRole="button"
          >
            <EditProfileText>Edit Profile</EditProfileText>
          </EditProfileButton>
        </ProfileHeaderContainer>
        
        {/* Settings sections */}
        <SectionContainer>
          <SectionTitle isDark={isDark}>Privacy</SectionTitle>
          
          <SettingItem>
            <SettingLabel isDark={isDark}>Location Services</SettingLabel>
            <Switch
              value={locationConsent}
              onValueChange={setLocationConsent}
              trackColor={{ false: '#767577', true: '#FF6B6B' }}
              thumbColor="#f4f3f4"
              ios_backgroundColor="#3e3e3e"
              accessibilityLabel="Toggle location services"
              accessibilityRole="switch"
              testID="location-consent-switch"
            />
          </SettingItem>
          
          <SettingItem>
            <SettingLabel isDark={isDark}>Profile Visible</SettingLabel>
            <Switch
              value={profileVisible}
              onValueChange={setProfileVisible}
              trackColor={{ false: '#767577', true: '#FF6B6B' }}
              thumbColor="#f4f3f4"
              ios_backgroundColor="#3e3e3e"
              accessibilityLabel="Toggle profile visibility"
              accessibilityRole="switch"
              testID="profile-visible-switch"
            />
          </SettingItem>
        </SectionContainer>
        
        <SectionContainer>
          <SectionTitle isDark={isDark}>Account</SectionTitle>
          
          <SettingButton
            accessibilityLabel="View referral credits"
            accessibilityRole="button"
            testID="referrals-button"
          >
            <SettingButtonLabel isDark={isDark}>
              Referral Credits
            </SettingButtonLabel>
            <SettingButtonValue isDark={isDark}>
              0 credits
            </SettingButtonValue>
          </SettingButton>
          
          <SettingButton
            accessibilityLabel="Declare relationship status"
            accessibilityRole="button"
            testID="relationship-button"
          >
            <SettingButtonLabel isDark={isDark}>
              Declare Relationship
            </SettingButtonLabel>
            <SettingButtonValue isDark={isDark}>
              Single
            </SettingButtonValue>
          </SettingButton>
          
          <SettingButton
            onPress={handleSignOut}
            accessibilityLabel="Sign out"
            accessibilityRole="button"
            testID="sign-out-button"
          >
            <SettingButtonLabel isDark={isDark}>
              Sign Out
            </SettingButtonLabel>
          </SettingButton>
          
          <DeleteAccountButton
            onPress={confirmDeleteAccount}
            accessibilityLabel="Delete account"
            accessibilityRole="button"
            testID="delete-account-button"
          >
            <DeleteAccountText>
              Delete Account
            </DeleteAccountText>
          </DeleteAccountButton>
        </SectionContainer>
        </ScrollView>
      </Container>
    </Animated.View>
  );
}

// Styled components
// Use SafeAreaView with styled-components
const Container = styled(SafeAreaView)<ThemeProps>`
  flex: 1;
  background-color: ${(props: ThemeProps) => props.isDark ? '#121212' : '#ffffff'};
`;

const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const HeaderContainer = styled.View<ThemeProps>`
  padding: 16px;
  border-bottom-width: 1px;
  border-bottom-color: ${(props: ThemeProps) => props.isDark ? '#333333' : '#EEEEEE'};
`;

const Title = styled.Text<ThemeProps>`
  font-size: 28px;
  font-weight: bold;
  color: ${(props: ThemeProps) => props.isDark ? '#ffffff' : '#000000'};
`;

const ProfileHeaderContainer = styled.View`
  align-items: center;
  padding: 24px 16px;
`;

const ProfileAvatar = styled.View`
  width: 100px;
  height: 100px;
  border-radius: 50px;
  background-color: #FF6B6B;
  justify-content: center;
  align-items: center;
  margin-bottom: 16px;
`;

const ProfileName = styled.Text<ThemeProps>`
  font-size: 24px;
  font-weight: bold;
  color: ${(props: ThemeProps) => props.isDark ? '#ffffff' : '#000000'};
  margin-bottom: 8px;
`;

const EditProfileButton = styled.TouchableOpacity`
  padding: 8px 16px;
  border-radius: 20px;
  background-color: #FF6B6B;
`;

const EditProfileText = styled.Text`
  color: #ffffff;
  font-weight: bold;
`;

const SectionContainer = styled.View`
  margin: 24px 16px;
`;

const SectionTitle = styled.Text<ThemeProps>`
  font-size: 18px;
  font-weight: bold;
  color: ${(props: ThemeProps) => props.isDark ? '#ffffff' : '#000000'};
  margin-bottom: 16px;
`;

const SettingItem = styled.View<ThemeProps>`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom-width: 1px;
  border-bottom-color: ${(props: ThemeProps) => props.isDark ? '#333333' : '#EEEEEE'};
`;

const SettingLabel = styled.Text<ThemeProps>`
  font-size: 16px;
  color: ${(props: ThemeProps) => props.isDark ? '#ffffff' : '#000000'};
`;

const SettingButton = styled.TouchableOpacity<ThemeProps>`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom-width: 1px;
  border-bottom-color: ${(props: ThemeProps) => props.isDark ? '#333333' : '#EEEEEE'};
`;

const SettingButtonLabel = styled.Text<ThemeProps>`
  font-size: 16px;
  color: ${(props: ThemeProps) => props.isDark ? '#ffffff' : '#000000'};
`;

const SettingButtonValue = styled.Text<ThemeProps>`
  font-size: 14px;
  color: ${(props: ThemeProps) => props.isDark ? '#888888' : '#666666'};
`;

const DeleteAccountButton = styled.TouchableOpacity`
  padding: 16px 0;
  align-items: center;
  margin-top: 24px;
`;

const DeleteAccountText = styled.Text`
  color: #FF3B30;
  font-size: 16px;
  font-weight: bold;
`;
