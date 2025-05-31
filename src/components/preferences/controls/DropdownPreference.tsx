import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';

interface Option {
  id: string;
  label: string;
  description?: string;
}

interface DropdownPreferenceProps {
  options: Option[];
  selectedValue: string;
  onSelectionChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
}

export const DropdownPreference: React.FC<DropdownPreferenceProps> = ({
  options,
  selectedValue,
  onSelectionChange,
  placeholder = 'Select an option',
  searchable = false,
}) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find(option => option.id === selectedValue);

  const handleSelect = (optionId: string) => {
    onSelectionChange(optionId);
    setIsOpen(false);
  };

  const renderOption = ({ item }: { item: Option }) => (
    <TouchableOpacity
      style={[
        styles.option,
        {
          backgroundColor: item.id === selectedValue ? theme.primary + '20' : 'transparent',
          borderBottomColor: theme.border,
        }
      ]}
      onPress={() => handleSelect(item.id)}
    >
      <View style={styles.optionContent}>
        <View style={styles.optionText}>
          <Text style={[styles.optionLabel, { color: theme.text }]}>
            {item.label}
          </Text>
          {item.description && (
            <Text style={[styles.optionDescription, { color: theme.textSecondary }]}>
              {item.description}
            </Text>
          )}
        </View>
        {item.id === selectedValue && (
          <Ionicons name="checkmark" size={20} color={theme.primary} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Dropdown Trigger */}
      <TouchableOpacity
        style={[styles.trigger, { 
          backgroundColor: theme.surface, 
          borderColor: theme.border 
        }]}
        onPress={() => setIsOpen(true)}
      >
        <View style={styles.triggerContent}>
          <Text style={[
            styles.triggerText,
            { color: selectedOption ? theme.text : theme.textSecondary }
          ]}>
            {selectedOption ? selectedOption.label : placeholder}
          </Text>
          <Ionicons 
            name={isOpen ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={theme.textSecondary} 
          />
        </View>
      </TouchableOpacity>

      {/* Dropdown Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={[styles.dropdown, { backgroundColor: theme.surface }]}>
            {/* Header */}
            <View style={[styles.dropdownHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.dropdownTitle, { color: theme.text }]}>
                Select Option
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsOpen(false)}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Options List */}
            <FlatList
              data={options}
              keyExtractor={(item) => item.id}
              renderItem={renderOption}
              style={styles.optionsList}
              showsVerticalScrollIndicator={false}
              maxToRenderPerBatch={10}
              windowSize={10}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Container styles
  },
  trigger: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerText: {
    fontSize: 16,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdown: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  optionsList: {
    maxHeight: 300,
  },
  option: {
    borderBottomWidth: 1,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionDescription: {
    fontSize: 12,
    marginTop: 2,
  },
});