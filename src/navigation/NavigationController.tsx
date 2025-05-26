import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { useAuth } from '../contexts/AuthContext';
import { useAppTheme } from '../utils/useAppTheme';

/**
 * Navigation controller component that handles navigation based on auth state
 * and profile completion status
 */
export function NavigationController() {
  const { isAuthenticated, isProfileComplete, isLoading, user, refreshProfileStatus } = useAuth();
  const { isDark, colors } = useAppTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasAttemptedRefresh = useRef(false);
  
  // Log navigation state for debugging
  useEffect(() => {
    if (isAuthenticated) {
      console.log(`User authenticated: ${user?.uid}`);
      console.log(`Profile complete: ${isProfileComplete ? 'Yes' : 'No'}`);
    }
  }, [isAuthenticated, isProfileComplete, user]);
  
  // Handle one-time profile refresh on initial authentication
  useEffect(() => {
    // Only trigger this on initial authentication when we have a user
    // but isProfileComplete is false, and we haven't attempted a refresh yet
    if (isAuthenticated && user && !isProfileComplete && !isRefreshing && refreshProfileStatus && !hasAttemptedRefresh.current) {
      console.log('Initial profile verification for user:', user.uid);
      
      // Mark that we've attempted a refresh for this session
      hasAttemptedRefresh.current = true;
      setIsRefreshing(true);
      
      // Only attempt the refresh once
      refreshProfileStatus()
        .then(complete => {
          console.log('Profile refresh complete. Is profile complete?', complete);
        })
        .catch(err => {
          console.error('Error refreshing profile:', err);
        })
        .finally(() => {
          setIsRefreshing(false);
        });
    }
  }, [isAuthenticated, user, isProfileComplete, refreshProfileStatus]);
  
  // Reset the refresh flag if auth or profile state changes
  useEffect(() => {
    return () => {
      hasAttemptedRefresh.current = false;
    };
  }, [isAuthenticated, isProfileComplete]);

  // Determine initial route based on auth and profile status
  const determineInitialRoute = () => {
    if (!isAuthenticated) {
      return 'Welcome';
    }
    if (!isProfileComplete) {
      return 'PersonalInfo'; // Start of profile setup flow
    }
    return 'MainFeed'; // Main app
  };

  // Show loading indicator while checking auth state
  if (isLoading || isRefreshing) {
    return (
      <View style={[styles.loadingContainer, {
        backgroundColor: isDark ? '#121212' : '#ffffff'
      }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        {isRefreshing && (
          <Text style={{
            marginTop: 20,
            color: isDark ? '#FFFFFF' : '#333333',
            fontSize: 14
          }}>
            Verifying profile status...
          </Text>
        )}
      </View>
    );
  }

  return (
    <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
      <AuthNavigator initialRouteName={determineInitialRoute()} />
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
