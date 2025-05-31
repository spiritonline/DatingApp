import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { useAppTheme } from '../utils/useAppTheme';
import { LikeWithProfile } from '../types';
import { AuthStackParamList } from '../navigation/types';
import { 
  likeUserBack, 
  dismissLike, 
  getLikesReceived,
  subscribeLikes
} from '../services/likesService';
import LikeCard from '../components/LikeCard';

type LikesScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

export default function LikesScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const navigation = useNavigation<LikesScreenNavigationProp>();
  const [likes, setLikes] = useState<LikeWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingLike, setProcessingLike] = useState<string | null>(null);

  const loadLikes = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      // Load initial likes from Firebase
      const likesData = await getLikesReceived(user.uid);
      setLikes(likesData);
    } catch (error) {
      console.error('Error loading likes:', error);
      Alert.alert('Error', 'Failed to load likes. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadLikes();
  }, [loadLikes]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeLikes(user.uid, (updatedLikes) => {
      setLikes(updatedLikes);
    });

    return () => {
      unsubscribe();
    };
  }, [user?.uid]);

  const handleLikeBack = async (likeId: string, targetUserId: string) => {
    if (!user?.uid || processingLike) return;

    setProcessingLike(likeId);
    try {
      const match = await likeUserBack(user.uid, targetUserId);
      
      if (match) {
        // Navigate directly to chat with the new match
        const chatId = [user.uid, targetUserId].sort().join('_');
        const likeData = likes.find(like => like.id === likeId);
        const partnerName = likeData?.fromUserProfile?.name || 'Match';
        
        navigation.navigate('ChatConversation', {
          chatId,
          partnerName,
        });
      }

      // Remove the like from the list
      setLikes(prev => prev.filter(like => like.id !== likeId));
    } catch (error) {
      console.error('Error liking back:', error);
      Alert.alert('Error', 'Failed to like back. Please try again.');
    } finally {
      setProcessingLike(null);
    }
  };

  const handleDismiss = async (likeId: string, targetUserId: string) => {
    if (!user?.uid || processingLike) return;

    setProcessingLike(likeId);
    try {
      await dismissLike(user.uid, targetUserId);
      
      // Remove the like from the list
      setLikes(prev => prev.filter(like => like.id !== likeId));
    } catch (error) {
      console.error('Error dismissing like:', error);
      Alert.alert('Error', 'Failed to dismiss like. Please try again.');
    } finally {
      setProcessingLike(null);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLikes();
  };

  const handleViewProfile = (like: LikeWithProfile) => {
    navigation.navigate('ProfileView', { like });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading likes...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          People Who Like You
        </Text>
        {likes.length > 0 && (
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {likes.length} {likes.length === 1 ? 'person likes' : 'people like'} you
          </Text>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF6B6B"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {likes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No likes yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Keep swiping on the Discover tab to find your matches!
            </Text>
          </View>
        ) : (
          <View style={styles.likesGrid}>
            {likes.map((like) => (
              <LikeCard
                key={like.id}
                like={like}
                onLikeBack={() => handleLikeBack(like.id, like.fromUserId)}
                onDismiss={() => handleDismiss(like.id, like.fromUserId)}
                onViewProfile={() => handleViewProfile(like)}
                isProcessing={processingLike === like.id}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  likesGrid: {
    gap: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});