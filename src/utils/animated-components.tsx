import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

/**
 * AnimatedContainer component for wrapping content with animation capabilities
 * Use this directly instead of HOCs to avoid TypeScript complexity
 */
export const AnimatedContainer: React.FC<{
  children: React.ReactNode;
  duration?: number;
  style?: any;
}> = ({ children, duration = 300, style }) => {
  return (
    <Animated.View 
      entering={FadeIn.duration(duration)}
      style={[styles.container, style]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
