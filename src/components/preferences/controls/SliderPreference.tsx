import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';

interface UnitOption {
  id: string;
  label: string;
}

interface SliderPreferenceProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number) => void;
  formatValue?: (value: number) => string;
  unit?: string;
  unitOptions?: UnitOption[];
  onUnitChange?: (unit: string) => void;
}

export const SliderPreference: React.FC<SliderPreferenceProps> = ({
  value,
  min,
  max,
  step = 1,
  onValueChange,
  formatValue = (value) => value.toString(),
  unit,
  unitOptions,
  onUnitChange,
}) => {
  const { theme } = useTheme();

  const handleDecrease = () => {
    const newValue = Math.max(min, value - step);
    onValueChange(newValue);
  };

  const handleIncrease = () => {
    const newValue = Math.min(max, value + step);
    onValueChange(newValue);
  };

  const getStepSize = () => {
    const range = max - min;
    if (range <= 50) return 1;
    if (range <= 200) return 5;
    return 10;
  };

  const quickStep = getStepSize();

  const handleQuickDecrease = () => {
    const newValue = Math.max(min, value - quickStep);
    onValueChange(newValue);
  };

  const handleQuickIncrease = () => {
    const newValue = Math.min(max, value + quickStep);
    onValueChange(newValue);
  };

  return (
    <View style={styles.container}>
      {/* Value Control */}
      <View style={styles.valueControl}>
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={[styles.controlButton, { borderColor: theme.border }]}
            onPress={handleQuickDecrease}
            disabled={value <= min}
          >
            <Ionicons 
              name="remove-circle-outline" 
              size={20} 
              color={value <= min ? theme.border : theme.text} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, { borderColor: theme.border }]}
            onPress={handleDecrease}
            disabled={value <= min}
          >
            <Ionicons 
              name="remove" 
              size={16} 
              color={value <= min ? theme.border : theme.text} 
            />
          </TouchableOpacity>
          
          <View style={[styles.valueDisplay, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.valueText, { color: theme.text }]}>
              {formatValue(value)}
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.controlButton, { borderColor: theme.border }]}
            onPress={handleIncrease}
            disabled={value >= max}
          >
            <Ionicons 
              name="add" 
              size={16} 
              color={value >= max ? theme.border : theme.text} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, { borderColor: theme.border }]}
            onPress={handleQuickIncrease}
            disabled={value >= max}
          >
            <Ionicons 
              name="add-circle-outline" 
              size={20} 
              color={value >= max ? theme.border : theme.text} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Visual Indicator */}
      <View style={styles.progressIndicator}>
        <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
          <View 
            style={[
              styles.progressFill,
              { 
                backgroundColor: theme.primary,
                width: `${((value - min) / (max - min)) * 100}%`,
              }
            ]}
          />
        </View>
        <View style={styles.progressBounds}>
          <Text style={[styles.progressBoundText, { color: theme.textSecondary }]}>
            {formatValue(min)}
          </Text>
          <Text style={[styles.progressBoundText, { color: theme.textSecondary }]}>
            {formatValue(max)}
          </Text>
        </View>
      </View>

      {/* Unit Selection */}
      {unitOptions && onUnitChange && (
        <View style={styles.unitSelection}>
          <Text style={[styles.unitLabel, { color: theme.textSecondary }]}>Unit:</Text>
          <View style={styles.unitOptions}>
            {unitOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.unitOption,
                  {
                    backgroundColor: unit === option.id ? theme.primary : 'transparent',
                    borderColor: theme.border,
                  }
                ]}
                onPress={() => onUnitChange(option.id)}
              >
                <Text style={[
                  styles.unitOptionText,
                  { color: unit === option.id ? theme.background : theme.text }
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickActionButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => onValueChange(min)}
        >
          <Text style={[styles.quickActionText, { color: theme.text }]}>Min</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.quickActionButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => onValueChange(Math.round((min + max) / 2))}
        >
          <Text style={[styles.quickActionText, { color: theme.text }]}>Average</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.quickActionButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => onValueChange(max)}
        >
          <Text style={[styles.quickActionText, { color: theme.text }]}>Max</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  valueControl: {
    alignItems: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueDisplay: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 120,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  valueText: {
    fontSize: 18,
    fontWeight: '600',
  },
  progressIndicator: {
    gap: 8,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  progressBounds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressBoundText: {
    fontSize: 12,
  },
  unitSelection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unitLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  unitOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  unitOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  unitOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
  },
});