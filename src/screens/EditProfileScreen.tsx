import React, { useRef } from 'react';
import { EditProfileScreen as EditProfileComponent } from '../components/profile/organisms/EditProfileScreen/EditProfileScreen';
import { HeaderBackButton } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import { Alert, TouchableOpacity, Text } from 'react-native';

/**
 * Screen for editing user profile
 * Implements the Edit Profile functionality accessible from the Profile screen
 */
export default function EditProfileScreen() {
  const navigation = useNavigation();
  const saveRef = useRef<() => Promise<void> | null>(null);
  
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

  // Handle header save button press
  const handleHeaderSave = async () => {
    if (saveRef.current) {
      await saveRef.current();
    }
  };
  
  // Use useLayoutEffect to set up custom header with back button and save button
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: (props: React.ComponentProps<typeof HeaderBackButton>) => (
        <HeaderBackButton
          {...props}
          onPress={handleBackPress}
        />
      ),
      headerRight: () => (
        <TouchableOpacity 
          onPress={handleHeaderSave}
          style={{ marginRight: 16 }}
          testID="header-save-button"
          accessibilityLabel="Save changes"
          accessibilityRole="button"
        >
          <Text style={{ 
            color: '#FF6B6B', 
            fontSize: 16, 
            fontWeight: 'bold' 
          }}>
            Save
          </Text>
        </TouchableOpacity>
      )
    });
  }, [navigation]);
  
  // Use the component from our organisms
  return <EditProfileComponent saveRef={saveRef} />;
}
