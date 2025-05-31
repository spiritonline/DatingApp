import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../utils/useAppTheme';

interface Option {
  id: string;
  label: string;
  description?: string;
}

interface MultiSelectPreferenceProps {
  options: Option[];
  selectedValues: string[];
  onSelectionChange: (selectedValues: string[]) => void;
  minSelections?: number;
  maxSelections?: number;
  layout?: 'grid' | 'list';
}

export const MultiSelectPreference: React.FC<MultiSelectPreferenceProps> = ({
  options,
  selectedValues,
  onSelectionChange,
  minSelections = 0,
  maxSelections,
  layout = 'grid',
}) => {
  const { colors } = useAppTheme();

  const handleToggleOption = (optionId: string) => {
    const isSelected = selectedValues.includes(optionId);
    
    if (isSelected) {
      // Don't allow deselection if we're at minimum
      if (selectedValues.length <= minSelections) return;
      
      const newSelection = selectedValues.filter(id => id !== optionId);
      onSelectionChange(newSelection);
    } else {
      // Don't allow selection if we're at maximum
      if (maxSelections && selectedValues.length >= maxSelections) return;
      
      const newSelection = [...selectedValues, optionId];
      onSelectionChange(newSelection);
    }
  };

  const isOptionDisabled = (optionId: string) => {
    const isSelected = selectedValues.includes(optionId);
    
    if (isSelected && selectedValues.length <= minSelections) return true;
    if (!isSelected && maxSelections && selectedValues.length >= maxSelections) return true;
    
    return false;
  };

  return (
    <View style={[
      styles.container,
      layout === 'grid' ? styles.gridLayout : styles.listLayout
    ]}>
      {options.map((option) => {
        const isSelected = selectedValues.includes(option.id);
        const isDisabled = isOptionDisabled(option.id);

        return (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.option,
              layout === 'grid' ? styles.gridOption : styles.listOption,
              isSelected && [styles.optionSelected, { borderColor: colors.primary }],
              isDisabled && styles.optionDisabled,
            ]}
            onPress={() => handleToggleOption(option.id)}
            disabled={isDisabled}
            activeOpacity={0.7}
          >
            <View style={styles.optionContent}>
              <Text style={[
                styles.optionLabel,
                { color: isSelected ? colors.primary : colors.text },
                isSelected && styles.optionLabelSelected,
                isDisabled && { color: colors.textSecondary }
              ]}>
                {option.label}
              </Text>
              {isSelected && (
                <View style={[styles.checkIcon, { backgroundColor: colors.primary }]}>
                  <Ionicons name="checkmark" size={12} color={colors.background} />
                </View>
              )}
            </View>
            {option.description && (
              <Text style={[
                styles.optionDescription,
                { color: colors.textSecondary }
              ]}>
                {option.description}
              </Text>
            )}
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
  gridLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  listLayout: {
    gap: 12,
  },
  option: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  gridOption: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  listOption: {
    width: '100%',
  },
  optionSelected: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  optionLabelSelected: {
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 18,
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});