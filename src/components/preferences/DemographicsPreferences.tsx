import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DatingPreferences, ETHNICITY_OPTIONS, RELIGION_OPTIONS } from '../../types/preferences';
import { PreferenceSection } from './PreferenceSection';
import { MultiSelectPreference } from './controls/MultiSelectPreference';

interface DemographicsPreferencesProps {
  preferences: DatingPreferences;
  onUpdate: (updates: Partial<DatingPreferences>) => void;
}

export const DemographicsPreferences: React.FC<DemographicsPreferencesProps> = ({
  preferences,
  onUpdate,
}) => {
  const ethnicityOptions = ETHNICITY_OPTIONS.map(option => ({
    id: option,
    label: option.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' '),
  }));

  const religionOptions = RELIGION_OPTIONS.map(option => ({
    id: option,
    label: option.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' '),
  }));

  const handleEthnicityChange = (value: string[]) => {
    onUpdate({
      ethnicity: {
        ...preferences.ethnicity,
        value,
        options: value.length > 0 ? value : 'any'
      }
    });
  };

  const handleReligionChange = (value: string[]) => {
    onUpdate({
      religion: {
        ...preferences.religion,
        value,
        options: value.length > 0 ? value : 'any'
      }
    });
  };

  return (
    <View style={styles.container}>
      <PreferenceSection
        title="Ethnicity"
        description="What ethnicities are you interested in? Leave empty for no preference."
        dealbreaker={preferences.ethnicity.dealbreaker}
        onDealbreakerChange={(dealbreaker) =>
          onUpdate({
            ethnicity: { ...preferences.ethnicity, dealbreaker }
          })
        }
      >
        <MultiSelectPreference
          options={ethnicityOptions}
          selectedValues={preferences.ethnicity.value}
          onSelectionChange={handleEthnicityChange}
          minSelections={0}
          layout="list"
        />
      </PreferenceSection>

      <PreferenceSection
        title="Religion"
        description="What religious backgrounds are you interested in? Leave empty for no preference."
        dealbreaker={preferences.religion.dealbreaker}
        onDealbreakerChange={(dealbreaker) =>
          onUpdate({
            religion: { ...preferences.religion, dealbreaker }
          })
        }
      >
        <MultiSelectPreference
          options={religionOptions}
          selectedValues={preferences.religion.value}
          onSelectionChange={handleReligionChange}
          minSelections={0}
          layout="list"
        />
      </PreferenceSection>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
});