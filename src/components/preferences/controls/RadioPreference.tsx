import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../utils/useAppTheme';

interface Option {
  id: string;
  label: string;
  description?: string;
}

interface RadioPreferenceProps {
  options: Option[];
  selectedValue: string;
  onSelectionChange: (value: string) => void;
  layout?: 'vertical' | 'horizontal';
}

export const RadioPreference: React.FC<RadioPreferenceProps> = ({
  options,
  selectedValue,
  onSelectionChange,
  layout = 'vertical',
}) => {
  const { colors } = useAppTheme();

  return (
    <View style={[
      styles.container,
      layout === 'horizontal' ? styles.horizontalLayout : styles.verticalLayout
    ]}>
      {options.map((option) => {
        const isSelected = selectedValue === option.id;

        return (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.option,
              layout === 'horizontal' ? styles.horizontalOption : styles.verticalOption,
            ]}
            onPress={() => onSelectionChange(option.id)}
            activeOpacity={0.7}
          >
            <View style={styles.optionContent}>
              <View style={[
                styles.radioButton,
                { 
                  borderColor: isSelected ? colors.primary : colors.border,
                  backgroundColor: isSelected ? colors.primary : 'transparent'
                }
              ]}>
                {isSelected && (
                  <Ionicons name="checkmark" size={14} color={colors.background} />
                )}
              </View>

              <View style={styles.optionText}>
                <Text style={[
                  styles.optionLabel,
                  { 
                    color: isSelected ? colors.primary : colors.text,
                    fontWeight: isSelected ? '600' : '400'
                  }
                ]}>
                  {option.label}
                </Text>
                {option.description && (
                  <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                    {option.description}
                  </Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Container styles will be set by layout
  },
  verticalLayout: {
    gap: 12,
  },
  horizontalLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  option: {
    paddingVertical: 16,
  },
  verticalOption: {
    width: '100%',
  },
  horizontalOption: {
    flex: 1,
    minWidth: '45%',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    lineHeight: 20,
  },
  optionDescription: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 18,
  },
});