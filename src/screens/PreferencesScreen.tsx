import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../utils/useAppTheme';
import { DatingPreferences } from '../types/preferences';
import { usePreferences } from '../hooks/usePreferences';
import { PreferenceSection } from '../components/preferences/PreferenceSection';
import { BasicPreferences } from '../components/preferences/BasicPreferences';
import { DemographicsPreferences } from '../components/preferences/DemographicsPreferences';
import { RelationshipPreferences } from '../components/preferences/RelationshipPreferences';
import { LifestylePreferences } from '../components/preferences/LifestylePreferences';
import { PhysicalPreferences } from '../components/preferences/PhysicalPreferences';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.9;
const CARD_HEIGHT = screenHeight * 0.65;

export const PreferencesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useAppTheme();
  const {
    preferences,
    loading,
    error,
    updatePreferences,
    hasUnsavedChanges,
    savePreferences
  } = usePreferences();

  const [activeSection, setActiveSection] = useState<number>(0);
  const [scrollContentWidth, setScrollContentWidth] = useState<number>(0);
  const flatListRef = useRef<FlatList>(null);
  const topicScrollRef = useRef<ScrollView>(null);
  const topicPillRefs = useRef<(View | null)[]>([]);

  // Section configuration with placeholder illustrations
  const sections = [
    { 
      id: 'basic', 
      title: 'Basic', 
      icon: 'heart-outline',
      illustration: '❤️',
      description: 'Who are you looking for?'
    },
    { 
      id: 'demographics', 
      title: 'Demographics', 
      icon: 'people-outline',
      illustration: '👥',
      description: 'Your ideal match demographics'
    },
    { 
      id: 'relationship', 
      title: 'Relationship', 
      icon: 'hand-left-outline',
      illustration: '💑',
      description: 'What are you looking for?'
    },
    { 
      id: 'lifestyle', 
      title: 'Lifestyle', 
      icon: 'leaf-outline',
      illustration: '🌿',
      description: 'Lifestyle preferences'
    },
    { 
      id: 'physical', 
      title: 'Physical', 
      icon: 'fitness-outline',
      illustration: '💪',
      description: 'Physical attributes'
    },
  ];

  const navigateToSection = (index: number) => {
    setActiveSection(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
    
    // Auto-scroll the horizontal navigation to keep current button visible
    setTimeout(() => {
      if (topicScrollRef.current && topicPillRefs.current[index]) {
        topicPillRefs.current[index]?.measureLayout(
          topicScrollRef.current as any,
          (x, y, width, height) => {
            const scrollViewWidth = screenWidth;
            const buttonCenter = x + width / 2;
            const buttonRight = x + width;
            const padding = 20; // Account for padding
            let scrollX = 0;
            
            if (index === 0) {
              // First button - align to left
              scrollX = 0;
              topicScrollRef.current?.scrollTo({ x: scrollX, animated: true });
            } else if (index === sections.length - 1) {
              // Last button - ensure it's visible with some padding
              // Calculate position to show the button with right padding
              const maxScrollX = Math.max(0, scrollContentWidth - scrollViewWidth);
              scrollX = Math.min(maxScrollX, Math.max(0, buttonRight - scrollViewWidth + padding * 2));
              topicScrollRef.current?.scrollTo({ x: scrollX, animated: true });
            } else {
              // Middle buttons - center in view
              scrollX = Math.max(0, buttonCenter - scrollViewWidth / 2);
              topicScrollRef.current?.scrollTo({ x: scrollX, animated: true });
            }
          },
          () => {
            // Fallback if measure fails
            console.log('Failed to measure button position');
          }
        );
      }
    }, 100); // Small delay to ensure layout is complete
  };

  useEffect(() => {
    // Show unsaved changes warning when leaving screen
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasUnsavedChanges) {
        return;
      }

      e.preventDefault();

      Alert.alert(
        'Unsaved Changes',
        'You have unsaved preference changes. Do you want to save them?',
        [
          { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Save', 
            onPress: async () => {
              await savePreferences();
              navigation.dispatch(e.data.action);
            }
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, hasUnsavedChanges, savePreferences]);

  const handleSave = async () => {
    try {
      await savePreferences();
      Alert.alert('Success', 'Your preferences have been saved!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    }
  };

  const renderSectionContent = (sectionId: string) => {
    if (!preferences) return null;

    switch (sectionId) {
      case 'basic':
        return (
          <BasicPreferences
            preferences={preferences}
            onUpdate={updatePreferences}
          />
        );
      case 'demographics':
        return (
          <DemographicsPreferences
            preferences={preferences}
            onUpdate={updatePreferences}
          />
        );
      case 'relationship':
        return (
          <RelationshipPreferences
            preferences={preferences}
            onUpdate={updatePreferences}
          />
        );
      case 'lifestyle':
        return (
          <LifestylePreferences
            preferences={preferences}
            onUpdate={updatePreferences}
          />
        );
      case 'physical':
        return (
          <PhysicalPreferences
            preferences={preferences}
            onUpdate={updatePreferences}
          />
        );
      default:
        return null;
    }
  };

  const renderCard = ({ item, index }: { item: typeof sections[0], index: number }) => {
    return (
      <View style={styles.cardWrapper}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <ScrollView 
            style={styles.scrollableCard}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {/* Card Header with Illustration */}
            <View style={styles.cardHeader}>
              <View style={[styles.illustrationContainer, { backgroundColor: colors.surface }]}>
                <Text style={styles.illustrationEmoji}>{item.illustration}</Text>
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {item.title}
              </Text>
              <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
                {item.description}
              </Text>
            </View>

            {/* Card Content */}
            <View style={styles.cardContent}>
              {renderSectionContent(item.id)}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading your preferences...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => window.location.reload()}
          >
            <Text style={[styles.retryButtonText, { color: colors.background }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.saveButton, { 
            backgroundColor: hasUnsavedChanges ? colors.primary : colors.border,
            opacity: hasUnsavedChanges ? 1 : 0.5
          }]}
          onPress={handleSave}
          disabled={!hasUnsavedChanges}
        >
          <Text style={[styles.saveButtonText, { color: colors.background }]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      {/* Topic Navigation Pills */}
      <View style={styles.topicNavContainer}>
        <ScrollView 
          ref={topicScrollRef}
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.topicNavContent}
          onContentSizeChange={(width) => setScrollContentWidth(width)}
        >
          {sections.map((section, index) => (
            <TouchableOpacity
              key={section.id}
              ref={(ref) => {
                if (ref) topicPillRefs.current[index] = ref as any;
              }}
              style={[
                styles.topicPill,
                {
                  backgroundColor: activeSection === index 
                    ? colors.primary 
                    : colors.surface,
                  borderColor: activeSection === index 
                    ? colors.primary 
                    : colors.border,
                }
              ]}
              onPress={() => navigateToSection(index)}
            >
              <Ionicons
                name={section.icon as any}
                size={18}
                color={activeSection === index ? colors.background : colors.textSecondary}
              />
              <Text
                style={[
                  styles.topicPillText,
                  {
                    color: activeSection === index 
                      ? colors.background 
                      : colors.textSecondary,
                    fontWeight: activeSection === index ? '600' : '400',
                  }
                ]}
              >
                {section.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Cards Container */}
      <View style={styles.cardsContainer}>
        <FlatList
          ref={flatListRef}
          data={sections}
          renderItem={renderCard}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          onMomentumScrollEnd={(event) => {
            const newIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
            if (newIndex !== activeSection) {
              navigateToSection(newIndex);
            }
          }}
          getItemLayout={(_, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
        />
      </View>

      {/* Navigation Dots */}
      <View style={styles.dotsContainer}>
        {sections.map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => navigateToSection(index)}
          >
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: activeSection === index 
                    ? colors.primary 
                    : colors.border,
                  width: activeSection === index ? 24 : 8,
                }
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Navigation Arrows */}
      {activeSection > 0 && (
        <TouchableOpacity
          style={[styles.navArrow, styles.navArrowLeft, { backgroundColor: colors.card }]}
          onPress={() => navigateToSection(activeSection - 1)}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
      )}
      
      {activeSection < sections.length - 1 && (
        <TouchableOpacity
          style={[styles.navArrow, styles.navArrowRight, { backgroundColor: colors.card }]}
          onPress={() => navigateToSection(activeSection + 1)}
        >
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  topicNavContainer: {
    paddingVertical: 8,
    maxHeight: 60,
  },
  topicNavContent: {
    paddingHorizontal: 20,
    paddingRight: 40, // Extra padding on the right to ensure last button is visible
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topicPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  topicPillText: {
    fontSize: 14,
  },
  cardsContainer: {
    flex: 1,
    marginTop: 20,
  },
  cardWrapper: {
    width: screenWidth,
    alignItems: 'center',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  scrollableCard: {
    flex: 1,
  },
  cardHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  illustrationContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  illustrationEmoji: {
    fontSize: 40,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
  },
  cardContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  navArrowLeft: {
    left: 10,
  },
  navArrowRight: {
    right: 10,
  },
});