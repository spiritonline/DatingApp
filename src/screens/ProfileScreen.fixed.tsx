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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import styled from 'styled-components/native';
import { ThemeProps } from '../utils/styled-components';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from '@firebase/firestore';
import { MainNavigationProp } from '../navigation/types';
import { useAppTheme } from '../utils/useAppTheme';
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
  
  if (isLoading) {
    return (
      <Container isDark={isDark} testID="profile-screen">
        <LoadingContainer>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </LoadingContainer>
      </Container>
    );
  }
  
  return (
    <Container isDark={isDark} testID="profile-screen">
      <ScrollView>
        <HeaderContainer>
          <Title isDark={isDark}>Profile</Title>
        </HeaderContainer>
        
        {/* Profile header */}
        <ProfileHeaderContainer>
          <ProfileAvatar>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>
              {profile?.displayName?.charAt(0) || 'U'}
            </Text>
          </ProfileAvatar>
          <ProfileName isDark={isDark}>
            {profile?.displayName || 'User'}
          </ProfileName>
          <EditProfileButton
            onPress={() => navigation.navigate('PersonalInfo')}
            testID="edit-profile-button"
          >
            <EditProfileText>Edit Profile</EditProfileText>
          </EditProfileButton>
        </ProfileHeaderContainer>
        
        {/* Settings section */}
        <SectionContainer>
          <SectionTitle isDark={isDark}>Settings</SectionTitle>
          
          <SettingItem>
            <SettingLabel isDark={isDark}>
              Share Location
            </SettingLabel>
            <Switch
              value={locationConsent}
              onValueChange={setLocationConsent}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={locationConsent ? '#FF6B6B' : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              testID="location-switch"
            />
          </SettingItem>
          
          <SettingItem>
            <SettingLabel isDark={isDark}>
              Profile Visible
            </SettingLabel>
            <Switch
              value={profileVisible}
              onValueChange={setProfileVisible}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={profileVisible ? '#FF6B6B' : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              testID="visibility-switch"
            />
          </SettingItem>
          
          <SettingButton
            accessibilityLabel="Manage notifications"
            accessibilityRole="button"
            testID="notifications-button"
          >
            <SettingButtonLabel isDark={isDark}>
              Notifications
            </SettingButtonLabel>
            <SettingButtonValue isDark={isDark}>
              On
            </SettingButtonValue>
          </SettingButton>
          
          <SettingButton
            accessibilityLabel="Manage privacy"
            accessibilityRole="button"
            testID="privacy-button"
          >
            <SettingButtonLabel isDark={isDark}>
              Privacy
            </SettingButtonLabel>
            <SettingButtonValue isDark={isDark}>
              Standard
            </SettingButtonValue>
          </SettingButton>
          
          <SettingButton
            accessibilityLabel="View credits"
            accessibilityRole="button"
            testID="credits-button"
          >
            <SettingButtonLabel isDark={isDark}>
              Credits
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
  );
}

// Styled components with proper typings
interface StyledProps extends ThemeProps { // Use ThemeProps for consistency
    // isDark is already in ThemeProps
}

// Container components
const Container = styled(SafeAreaView)<StyledProps>`
  flex: 1;
  background-color: ${(props: StyledProps) => props.isDark ? '#121212' : '#ffffff'};
`;

const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const HeaderContainer = styled.View`
  padding: 16px;
  border-bottom-width: 1px;
  border-bottom-color: ${(props: { isDark?: boolean }) => props.isDark ? '#333333' : '#EEEEEE'};
`;

const Title = styled.Text<StyledProps>`
  font-size: 28px;
  font-weight: bold;
  color: ${(props: StyledProps) => props.isDark ? '#ffffff' : '#000000'};
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

const ProfileName = styled.Text<StyledProps>`
  font-size: 24px;
  font-weight: bold;
  color: ${(props: StyledProps) => props.isDark ? '#ffffff' : '#000000'};
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

const SectionTitle = styled.Text<StyledProps>`
  font-size: 18px;
  font-weight: bold;
  color: ${(props: StyledProps) => props.isDark ? '#ffffff' : '#000000'};
  margin-bottom: 16px;
`;

const SettingItem = styled.View<StyledProps>`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom-width: 1px;
  border-bottom-color: ${(props: StyledProps) => props.isDark ? '#333333' : '#EEEEEE'};
`;

const SettingLabel = styled.Text<StyledProps>`
  font-size: 16px;
  color: ${(props: StyledProps) => props.isDark ? '#ffffff' : '#000000'};
`;

const SettingButton = styled.TouchableOpacity<StyledProps>`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom-width: 1px;
  border-bottom-color: ${(props: StyledProps) => props.isDark ? '#333333' : '#EEEEEE'};
`;

const SettingButtonLabel = styled.Text<StyledProps>`
  font-size: 16px;
  color: ${(props: StyledProps) => props.isDark ? '#ffffff' : '#000000'};
`;

const SettingButtonValue = styled.Text<StyledProps>`
  font-size: 14px;
  color: ${(props: StyledProps) => props.isDark ? '#888888' : '#666666'};
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
