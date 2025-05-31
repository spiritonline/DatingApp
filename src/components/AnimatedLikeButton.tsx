import React, { useRef } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AnimatedLikeButtonProps {
  onPress: () => void;
  isDisabled?: boolean;
  size?: number;
  testID?: string;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const AnimatedLikeButton: React.FC<AnimatedLikeButtonProps> = ({
  onPress,
  isDisabled = false,
  size = 64,
  testID = 'like-button',
}) => {
  // Animation values
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const heartScale = useSharedValue(1);
  const particleOpacity = useSharedValue(0);
  const particleScale = useSharedValue(0.5);
  
  // Particle positions
  const particles = useRef(
    Array.from({ length: 8 }, (_, i) => {
      const angle = (i * Math.PI * 2) / 8;
      return {
        x: Math.cos(angle) * 40,
        y: Math.sin(angle) * 40,
      };
    })
  ).current;

  const handlePress = () => {
    if (isDisabled) return;

    // Trigger celebratory animation
    scale.value = withSequence(
      withSpring(0.8, { damping: 5 }),
      withSpring(1.2, { damping: 5 }),
      withSpring(1, { damping: 5 })
    );

    rotation.value = withSequence(
      withTiming(-10, { duration: 100 }),
      withTiming(10, { duration: 100 }),
      withTiming(0, { duration: 100 })
    );

    heartScale.value = withSequence(
      withSpring(1.3, { damping: 5 }),
      withDelay(200, withSpring(1, { damping: 5 }))
    );

    // Particle burst animation
    particleOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withDelay(300, withTiming(0, { duration: 300 }))
    );

    particleScale.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1.5, { duration: 400 })
    );

    // Delay the action slightly to show animation
    setTimeout(() => {
      runOnJS(onPress)();
    }, 300);
  };

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const animatedHeartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const animatedParticleStyle = useAnimatedStyle(() => ({
    opacity: particleOpacity.value,
    transform: [{ scale: particleScale.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Particle Effects */}
      <Animated.View 
        style={[styles.particlesContainer, animatedParticleStyle]}
        pointerEvents="none"
      >
        {particles.map((particle, index) => (
          <View
            key={index}
            style={[
              styles.particle,
              {
                position: 'absolute',
                left: size / 2 - 4,
                top: size / 2 - 4,
                transform: [
                  { translateX: particle.x },
                  { translateY: particle.y },
                ],
              },
            ]}
          >
            <Ionicons name="heart" size={8} color="#FF6B6B" />
          </View>
        ))}
      </Animated.View>

      {/* Main Button */}
      <AnimatedTouchable
        onPress={handlePress}
        disabled={isDisabled}
        style={[
          styles.button,
          animatedButtonStyle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            opacity: isDisabled ? 0.5 : 1,
          },
        ]}
        testID={testID}
        accessibilityLabel="Like profile"
        accessibilityRole="button"
      >
        <Animated.View style={animatedHeartStyle}>
          <Ionicons name="heart" size={size * 0.5} color="#fff" />
        </Animated.View>
      </AnimatedTouchable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  particlesContainer: {
    position: 'absolute',
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    width: 8,
    height: 8,
  },
});