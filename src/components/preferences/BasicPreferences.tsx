import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DatingPreferences } from '../../types/preferences';
import { PreferenceSection } from './PreferenceSection';
import { MultiSelectPreference } from './controls/MultiSelectPreference';
import { RangeSliderPreference } from './controls/RangeSliderPreference';
import { SliderPreference } from './controls/SliderPreference';
import { LocationPreference } from './controls/LocationPreference';

interface BasicPreferencesProps {
  preferences: DatingPreferences;
  onUpdate: (updates: Partial<DatingPreferences>) => void;
}

export const BasicPreferences: React.FC<BasicPreferencesProps> = ({
  preferences,
  onUpdate,
}) => {
  const genderOptions = [
    { id: 'male', label: 'Men' },
    { id: 'female', label: 'Women' },
    { id: 'non-binary', label: 'Non-binary' },
  ];

  const distanceUnits = [
    { id: 'miles', label: 'Miles' },
    { id: 'km', label: 'Kilometers' },
  ];

  return (
    <View style={styles.container}>
      <PreferenceSection
        title="Interested In"
        description="Who are you interested in meeting?"
        dealbreaker={preferences.interestedIn.dealbreaker}
        onDealbreakerChange={(dealbreaker) =>
          onUpdate({
            interestedIn: { ...preferences.interestedIn, dealbreaker }
          })
        }
      >
        <MultiSelectPreference
          options={genderOptions}
          selectedValues={preferences.interestedIn.value}
          onSelectionChange={(value) =>
            onUpdate({
              interestedIn: { ...preferences.interestedIn, value }
            })
          }
          minSelections={1}
          maxSelections={3}
        />
      </PreferenceSection>

      <PreferenceSection
        title="Age Range"
        description="What age range are you interested in?"
        dealbreaker={preferences.ageRange.dealbreaker}
        onDealbreakerChange={(dealbreaker) =>
          onUpdate({
            ageRange: { ...preferences.ageRange, dealbreaker }
          })
        }
      >
        <RangeSliderPreference
          minValue={preferences.ageRange.min}
          maxValue={preferences.ageRange.max}
          absoluteMin={18}
          absoluteMax={100}
          step={1}
          onValueChange={(min, max) =>
            onUpdate({
              ageRange: { ...preferences.ageRange, min, max }
            })
          }
          formatValue={(value) => `${value} years`}
        />
      </PreferenceSection>

      <PreferenceSection
        title="Maximum Distance"
        description="How far are you willing to travel?"
        dealbreaker={preferences.maxDistance.dealbreaker}
        onDealbreakerChange={(dealbreaker) =>
          onUpdate({
            maxDistance: { ...preferences.maxDistance, dealbreaker }
          })
        }
      >
        <SliderPreference
          value={preferences.maxDistance.value}
          min={1}
          max={500}
          step={1}
          onValueChange={(value) =>
            onUpdate({
              maxDistance: { ...preferences.maxDistance, value }
            })
          }
          formatValue={(value) => `${value} ${preferences.maxDistance.unit}`}
          unit={preferences.maxDistance.unit}
          unitOptions={distanceUnits}
          onUnitChange={(unit) =>
            onUpdate({
              maxDistance: { ...preferences.maxDistance, unit: unit as 'miles' | 'km' }
            })
          }
        />
      </PreferenceSection>

      <PreferenceSection
        title="Location"
        description="Where should we look for matches?"
        dealbreaker={preferences.location.dealbreaker}
        onDealbreakerChange={(dealbreaker) =>
          onUpdate({
            location: { ...preferences.location, dealbreaker }
          })
        }
      >
        <LocationPreference
          location={preferences.location.value}
          onLocationChange={(value) =>
            onUpdate({
              location: { ...preferences.location, value }
            })
          }
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