import React from 'react';
import { EditProfileScreen as EditProfileComponent } from '../components/profile/organisms/EditProfileScreen/EditProfileScreen';
import { HeaderBackButton } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';

/**
 * Screen for editing user profile
 * Implements the Edit Profile functionality accessible from the Profile screen
 */
export default function EditProfileScreen() {
  const navigation = useNavigation();
  
  // Confirm discard changes when user tries to go back without saving
  const handleBackPress = () => {
    Alert.alert(
      'Discard Changes?',
      'Are you sure you want to go back? Any unsaved changes will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() }
      ]
    );
    return true;
  };
  
  // Use useLayoutEffect to set up custom header with back button
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: (props: React.ComponentProps<typeof HeaderBackButton>) => (
        <HeaderBackButton
          {...props}
          onPress={handleBackPress}
        />
      )
    });
  }, [navigation]);
  
  // Use the component from our organisms
  return <EditProfileComponent />;
}
