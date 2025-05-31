import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../utils/useAppTheme';

interface PreferenceSectionProps {
  title: string;
  description?: string;
  dealbreaker: boolean;
  onDealbreakerChange: (dealbreaker: boolean) => void;
  children: React.ReactNode;
  showDealbreaker?: boolean;
}

export const PreferenceSection: React.FC<PreferenceSectionProps> = ({
  title,
  description,
  dealbreaker,
  onDealbreakerChange,
  children,
  showDealbreaker = true,
}) => {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {title}
        </Text>
        
        {showDealbreaker && (
          <View style={styles.dealbreakerToggle}>
            <Ionicons 
              name={dealbreaker ? "lock-closed" : "lock-open"} 
              size={16} 
              color={dealbreaker ? colors.error : colors.textSecondary} 
            />
            <Text style={[
              styles.dealbreakerText, 
              { color: dealbreaker ? colors.error : colors.textSecondary }
            ]}>
              Dealbreaker
            </Text>
            <Switch
              value={dealbreaker}
              onValueChange={onDealbreakerChange}
              trackColor={{
                false: colors.border,
                true: colors.primary,
              }}
              thumbColor={colors.background}
              ios_backgroundColor={colors.border}
              style={styles.switch}
            />
          </View>
        )}
      </View>

      {/* Description */}
      {description && (
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {description}
        </Text>
      )}

      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>

      {/* Dealbreaker Info */}
      {dealbreaker && (
        <View style={[styles.dealbreakerInfo, { backgroundColor: `${colors.primary}10` }]}>
          <Ionicons name="information-circle" size={14} color={colors.primary} />
          <Text style={[styles.dealbreakerInfoText, { color: colors.text }]}>
            Strict requirement - only matching profiles will be shown
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  dealbreakerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dealbreakerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
    marginLeft: 4,
  },
  description: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 16,
  },
  content: {
    // Content will be styled by individual preference components
  },
  dealbreakerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    gap: 8,
  },
  dealbreakerInfoText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 16,
  },
});