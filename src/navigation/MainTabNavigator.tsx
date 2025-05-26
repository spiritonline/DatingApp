import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import DiscoverScreen from '../screens/DiscoverScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useAppTheme } from '../utils/useAppTheme';

// Create tab navigator
const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  const { isDark, colors } = useAppTheme();

  return (
    <Tab.Navigator
      initialRouteName="Discover"
      screenOptions={{
        tabBarActiveTintColor: '#FF6B6B',
        tabBarInactiveTintColor: isDark ? '#888888' : '#999999',
        tabBarStyle: {
          backgroundColor: isDark ? '#121212' : '#FFFFFF',
          borderTopColor: isDark ? '#333333' : '#EEEEEE',
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          tabBarLabel: 'Discover',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="❤️" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="💬" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="👤" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Simple emoji-based tab bar icon component
function TabBarIcon({ name, color, size }: { name: string; color: string; size: number }) {
  // Ensure emoji is properly wrapped in a Text component
  return (
    <Text style={{ fontSize: size, color }} accessibilityLabel={`${name} icon`}>
      {name}
    </Text>
  );
}
