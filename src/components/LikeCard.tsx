import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { useAppTheme } from '../utils/useAppTheme';
import { LikeWithProfile } from '../types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

interface LikeCardProps {
  like: LikeWithProfile;
  onLikeBack: () => void;
  onDismiss: () => void;
  onViewProfile?: () => void;
  isProcessing: boolean;
}

export default function LikeCard({ like, onLikeBack, onDismiss, onViewProfile, isProcessing }: LikeCardProps) {
  const { isDark, colors } = useAppTheme();
  const { fromUserProfile } = like;

  const getAge = () => {
    if (fromUserProfile.age) {
      return typeof fromUserProfile.age === 'string' 
        ? parseInt(fromUserProfile.age) 
        : fromUserProfile.age;
    }
    return null;
  };

  const getDisplayName = () => {
    return fromUserProfile.name || 'Unknown';
  };

  const getMainPhoto = () => {
    return fromUserProfile.photos && fromUserProfile.photos.length > 0 
      ? fromUserProfile.photos[0] 
      : null;
  };

  const getFirstPrompt = () => {
    return fromUserProfile.prompts && fromUserProfile.prompts.length > 0 
      ? fromUserProfile.prompts[0] 
      : null;
  };

  return (
    <View style={[
      styles.card, 
      { 
        backgroundColor: colors.background,
        shadowColor: isDark ? '#FFFFFF' : '#000000',
      }
    ]}>
      {/* Profile Image */}
      <TouchableOpacity 
        style={styles.imageContainer}
        onPress={onViewProfile}
        activeOpacity={0.9}
      >
        {getMainPhoto() ? (
          <Image
            source={{ uri: getMainPhoto()! }}
            style={styles.profileImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.placeholderImage, { backgroundColor: colors.border }]}>
            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
              No Photo
            </Text>
          </View>
        )}
        
        {/* Gradient overlay for better text readability */}
        <View style={styles.imageOverlay} />
        
        {/* Profile info overlay */}
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>
            {getDisplayName()}
            {getAge() && `, ${getAge()}`}
          </Text>
          {fromUserProfile.bio && (
            <Text style={styles.profileBio} numberOfLines={2}>
              {fromUserProfile.bio}
            </Text>
          )}
        </View>
        
        {/* Tap to view indicator */}
        {onViewProfile && (
          <View style={styles.tapIndicator}>
            <Text style={styles.tapText}>Tap to view profile</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Prompt section */}
      {getFirstPrompt() && (
        <View style={styles.promptSection}>
          <Text style={[styles.promptQuestion, { color: colors.textSecondary }]}>
            {getFirstPrompt()!.promptText}
          </Text>
          <Text style={[styles.promptAnswer, { color: colors.text }]} numberOfLines={3}>
            {getFirstPrompt()!.answer}
          </Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.dismissButton,
            { backgroundColor: isDark ? '#444444' : '#F5F5F5' },
            isProcessing && styles.disabledButton
          ]}
          onPress={onDismiss}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <>
              <Text style={styles.dismissIcon}>✕</Text>
              <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
                Pass
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.likeButton,
            isProcessing && styles.disabledButton
          ]}
          onPress={onLikeBack}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.likeIcon}>❤️</Text>
              <Text style={styles.likeButtonText}>Like</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    height: 300,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '500',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  profileInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  profileBio: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 18,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  promptSection: {
    padding: 16,
  },
  promptQuestion: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  promptAnswer: {
    fontSize: 16,
    lineHeight: 22,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    gap: 8,
  },
  dismissButton: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  likeButton: {
    backgroundColor: '#FF6B6B',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  likeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dismissIcon: {
    fontSize: 16,
    color: '#666666',
  },
  likeIcon: {
    fontSize: 16,
  },
  tapIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tapText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
});