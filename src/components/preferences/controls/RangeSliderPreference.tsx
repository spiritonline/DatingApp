import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';

interface RangeSliderPreferenceProps {
  minValue: number;
  maxValue: number;
  absoluteMin: number;
  absoluteMax: number;
  step?: number;
  onValueChange: (min: number, max: number) => void;
  formatValue?: (value: number) => string;
}

export const RangeSliderPreference: React.FC<RangeSliderPreferenceProps> = ({
  minValue,
  maxValue,
  absoluteMin,
  absoluteMax,
  step = 1,
  onValueChange,
  formatValue = (value) => value.toString(),
}) => {
  const { theme } = useTheme();

  const handleMinDecrease = () => {
    const newMin = Math.max(absoluteMin, minValue - step);
    if (newMin < maxValue) {
      onValueChange(newMin, maxValue);
    }
  };

  const handleMinIncrease = () => {
    const newMin = Math.min(maxValue - step, minValue + step);
    onValueChange(newMin, maxValue);
  };

  const handleMaxDecrease = () => {
    const newMax = Math.max(minValue + step, maxValue - step);
    onValueChange(minValue, newMax);
  };

  const handleMaxIncrease = () => {
    const newMax = Math.min(absoluteMax, maxValue + step);
    if (newMax > minValue) {
      onValueChange(minValue, newMax);
    }
  };

  const handleMinTextChange = (text: string) => {
    const value = parseInt(text);
    if (!isNaN(value) && value >= absoluteMin && value < maxValue) {
      onValueChange(value, maxValue);
    }
  };

  const handleMaxTextChange = (text: string) => {
    const value = parseInt(text);
    if (!isNaN(value) && value <= absoluteMax && value > minValue) {
      onValueChange(minValue, value);
    }
  };

  return (
    <View style={styles.container}>
      {/* Min Value Control */}
      <View style={styles.valueControl}>
        <Text style={[styles.valueLabel, { color: theme.textSecondary }]}>Minimum</Text>
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={[styles.controlButton, { borderColor: theme.border }]}
            onPress={handleMinDecrease}
            disabled={minValue <= absoluteMin}
          >
            <Ionicons 
              name="remove" 
              size={16} 
              color={minValue <= absoluteMin ? theme.border : theme.text} 
            />
          </TouchableOpacity>
          
          <View style={[styles.valueDisplay, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.valueText, { color: theme.text }]}>
              {formatValue(minValue)}
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.controlButton, { borderColor: theme.border }]}
            onPress={handleMinIncrease}
            disabled={minValue >= maxValue - step}
          >
            <Ionicons 
              name="add" 
              size={16} 
              color={minValue >= maxValue - step ? theme.border : theme.text} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Max Value Control */}
      <View style={styles.valueControl}>
        <Text style={[styles.valueLabel, { color: theme.textSecondary }]}>Maximum</Text>
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={[styles.controlButton, { borderColor: theme.border }]}
            onPress={handleMaxDecrease}
            disabled={maxValue <= minValue + step}
          >
            <Ionicons 
              name="remove" 
              size={16} 
              color={maxValue <= minValue + step ? theme.border : theme.text} 
            />
          </TouchableOpacity>
          
          <View style={[styles.valueDisplay, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.valueText, { color: theme.text }]}>
              {formatValue(maxValue)}
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.controlButton, { borderColor: theme.border }]}
            onPress={handleMaxIncrease}
            disabled={maxValue >= absoluteMax}
          >
            <Ionicons 
              name="add" 
              size={16} 
              color={maxValue >= absoluteMax ? theme.border : theme.text} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Visual Range Indicator */}
      <View style={styles.rangeIndicator}>
        <View style={[styles.rangeTrack, { backgroundColor: theme.border }]}>
          <View 
            style={[
              styles.rangeActive,
              { 
                backgroundColor: theme.primary,
                left: `${((minValue - absoluteMin) / (absoluteMax - absoluteMin)) * 100}%`,
                width: `${((maxValue - minValue) / (absoluteMax - absoluteMin)) * 100}%`,
              }
            ]}
          />
        </View>
        <View style={styles.rangeBounds}>
          <Text style={[styles.rangeBoundText, { color: theme.textSecondary }]}>
            {formatValue(absoluteMin)}
          </Text>
          <Text style={[styles.rangeBoundText, { color: theme.textSecondary }]}>
            {formatValue(absoluteMax)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  valueControl: {
    gap: 8,
  },
  valueLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
  },
  valueText: {
    fontSize: 16,
    fontWeight: '600',
  },
  rangeIndicator: {
    gap: 8,
  },
  rangeTrack: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
  },
  rangeActive: {
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    top: 0,
  },
  rangeBounds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeBoundText: {
    fontSize: 12,
  },
});