import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, useColorScheme } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { useAuth } from '../contexts/AuthContext';

/**
 * Navigation controller component that handles navigation based on auth state
 * and profile completion status
 */
export function NavigationController() {
  const { isAuthenticated, isProfileComplete, isLoading, user } = useAuth();
  const colorScheme = useColorScheme();
  
  // Log navigation state for debugging
  useEffect(() => {
    if (isAuthenticated) {
      console.log(`User authenticated: ${user?.uid}`);
      console.log(`Profile complete: ${isProfileComplete ? 'Yes' : 'No'}`);
    }
  }, [isAuthenticated, isProfileComplete, user]);

  // Show loading indicator while checking auth state
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, {
        backgroundColor: colorScheme === 'dark' ? '#121212' : '#ffffff'
      }]}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthNavigator 
        initialRouteName={
          !isAuthenticated
            ? 'Welcome'
            : !isProfileComplete
              ? 'PersonalInfo' // Start of profile setup flow
              : 'MainFeed'     // Main app
        }
      />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
