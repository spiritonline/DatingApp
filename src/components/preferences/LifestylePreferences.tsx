import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DatingPreferences } from '../../types/preferences';
import { PreferenceSection } from './PreferenceSection';
import { RadioPreference } from './controls/RadioPreference';
import { MultiSelectPreference } from './controls/MultiSelectPreference';
import { DropdownPreference } from './controls/DropdownPreference';

interface LifestylePreferencesProps {
  preferences: DatingPreferences;
  onUpdate: (updates: Partial<DatingPreferences>) => void;
}

export const LifestylePreferences: React.FC<LifestylePreferencesProps> = ({
  preferences,
  onUpdate,
}) => {
  const kidsHasOptions = [
    { id: 'yes', label: 'Has Kids', description: 'Already has children' },
    { id: 'no', label: 'No Kids', description: 'Does not have children' },
    { id: 'no_preference', label: 'No Preference', description: 'Either is fine' },
  ];

  const kidsWantsOptions = [
    { id: 'yes', label: 'Wants Kids', description: 'Wants to have children' },
    { id: 'no', label: 'Doesn\'t Want Kids', description: 'Does not want children' },
    { id: 'maybe', label: 'Maybe', description: 'Open to the possibility' },
    { id: 'no_preference', label: 'No Preference', description: 'Haven\'t decided' },
  ];

  // Removed "no_preference" from drug use options - it doesn't make sense for personal use
  const drugsOptions = [
    { id: 'never', label: 'Never', description: 'Does not use drugs' },
    { id: 'occasionally', label: 'Occasionally', description: 'Uses drugs occasionally' },
    { id: 'regularly', label: 'Regularly', description: 'Uses drugs regularly' },
  ];

  const drugsAcceptableOptions = [
    { id: 'never', label: 'Never' },
    { id: 'occasionally', label: 'Occasionally' },
    { id: 'regularly', label: 'Regularly' },
  ];

  // Removed "no_preference" from smoking options - it doesn't make sense for personal habit
  const smokingOptions = [
    { id: 'never', label: 'Never', description: 'Does not smoke' },
    { id: 'occasionally', label: 'Occasionally', description: 'Smokes occasionally' },
    { id: 'regularly', label: 'Regularly', description: 'Smokes regularly' },
    { id: 'trying_to_quit', label: 'Trying to Quit', description: 'Currently trying to quit' },
  ];

  const smokingAcceptableOptions = [
    { id: 'never', label: 'Never' },
    { id: 'occasionally', label: 'Occasionally' },
    { id: 'regularly', label: 'Regularly' },
    { id: 'trying_to_quit', label: 'Trying to Quit' },
  ];

  // Removed "no_preference" from drinking options - it doesn't make sense for personal habit
  const drinkingOptions = [
    { id: 'never', label: 'Never', description: 'Does not drink alcohol' },
    { id: 'social', label: 'Social Drinker', description: 'Drinks socially' },
    { id: 'moderate', label: 'Moderate Drinker', description: 'Drinks moderately' },
    { id: 'regular', label: 'Regular Drinker', description: 'Drinks regularly' },
  ];

  const drinkingAcceptableOptions = [
    { id: 'never', label: 'Never' },
    { id: 'social', label: 'Social' },
    { id: 'moderate', label: 'Moderate' },
    { id: 'regular', label: 'Regular' },
  ];

  const educationOptions = [
    { id: 'high_school', label: 'High School', description: 'High school diploma or equivalent' },
    { id: 'some_college', label: 'Some College', description: 'Some college or trade school' },
    { id: 'bachelors', label: 'Bachelor\'s Degree', description: 'Four-year college degree' },
    { id: 'masters', label: 'Master\'s Degree', description: 'Graduate degree' },
    { id: 'doctorate', label: 'Doctorate', description: 'PhD or professional doctorate' },
    { id: 'no_preference', label: 'No Preference', description: 'Education level doesn\'t matter' },
  ];

  // Helper function to handle values that might be "no_preference" from old data
  const getSafeValue = (value: string, defaultValue: string): string => {
    if (value === 'no_preference') {
      return defaultValue;
    }
    return value;
  };

  return (
    <View style={styles.container}>
      {/* Kids */}
      <PreferenceSection
        title="Children"
        description="Preferences about having or wanting children"
        dealbreaker={preferences.kids.dealbreaker}
        onDealbreakerChange={(dealbreaker) =>
          onUpdate({
            kids: { ...preferences.kids, dealbreaker }
          })
        }
      >
        <View style={styles.subsection}>
          <RadioPreference
            options={kidsHasOptions}
            selectedValue={preferences.kids.hasKids}
            onSelectionChange={(hasKids) =>
              onUpdate({
                kids: { 
                  ...preferences.kids, 
                  hasKids: hasKids as 'yes' | 'no' | 'no_preference'
                }
              })
            }
            layout="vertical"
          />
        </View>
        
        <View style={styles.subsection}>
          <RadioPreference
            options={kidsWantsOptions}
            selectedValue={preferences.kids.wantsKids}
            onSelectionChange={(wantsKids) =>
              onUpdate({
                kids: { 
                  ...preferences.kids, 
                  wantsKids: wantsKids as 'yes' | 'no' | 'maybe' | 'no_preference'
                }
              })
            }
            layout="vertical"
          />
        </View>
      </PreferenceSection>

      {/* Drugs */}
      <PreferenceSection
        title="Drug Use"
        description="Your personal drug use habits and what you accept in a partner"
        dealbreaker={preferences.drugs.dealbreaker}
        onDealbreakerChange={(dealbreaker) =>
          onUpdate({
            drugs: { ...preferences.drugs, dealbreaker }
          })
        }
      >
        <View style={styles.subsection}>
          <RadioPreference
            options={drugsOptions}
            selectedValue={getSafeValue(preferences.drugs.value, 'never')}
            onSelectionChange={(value) =>
              onUpdate({
                drugs: { 
                  ...preferences.drugs, 
                  value: value as 'never' | 'occasionally' | 'regularly'
                }
              })
            }
            layout="vertical"
          />
        </View>
        
        <View style={styles.subsection}>
          <MultiSelectPreference
            options={drugsAcceptableOptions}
            selectedValues={preferences.drugs.acceptable}
            onSelectionChange={(acceptable) =>
              onUpdate({
                drugs: { 
                  ...preferences.drugs, 
                  acceptable: acceptable as ('never' | 'occasionally' | 'regularly')[]
                }
              })
            }
            minSelections={1}
            layout="grid"
          />
        </View>
      </PreferenceSection>

      {/* Smoking */}
      <PreferenceSection
        title="Smoking"
        description="Your personal smoking habits and what you accept in a partner"
        dealbreaker={preferences.smoking.dealbreaker}
        onDealbreakerChange={(dealbreaker) =>
          onUpdate({
            smoking: { ...preferences.smoking, dealbreaker }
          })
        }
      >
        <View style={styles.subsection}>
          <RadioPreference
            options={smokingOptions}
            selectedValue={getSafeValue(preferences.smoking.value, 'never')}
            onSelectionChange={(value) =>
              onUpdate({
                smoking: { 
                  ...preferences.smoking, 
                  value: value as 'never' | 'occasionally' | 'regularly' | 'trying_to_quit'
                }
              })
            }
            layout="vertical"
          />
        </View>
        
        <View style={styles.subsection}>
          <MultiSelectPreference
            options={smokingAcceptableOptions}
            selectedValues={preferences.smoking.acceptable}
            onSelectionChange={(acceptable) =>
              onUpdate({
                smoking: { 
                  ...preferences.smoking, 
                  acceptable: acceptable as ('never' | 'occasionally' | 'regularly' | 'trying_to_quit')[]
                }
              })
            }
            minSelections={1}
            layout="grid"
          />
        </View>
      </PreferenceSection>

      {/* Drinking */}
      <PreferenceSection
        title="Drinking"
        description="Your personal drinking habits and what you accept in a partner"
        dealbreaker={preferences.drinking.dealbreaker}
        onDealbreakerChange={(dealbreaker) =>
          onUpdate({
            drinking: { ...preferences.drinking, dealbreaker }
          })
        }
      >
        <View style={styles.subsection}>
          <RadioPreference
            options={drinkingOptions}
            selectedValue={getSafeValue(preferences.drinking.value, 'never')}
            onSelectionChange={(value) =>
              onUpdate({
                drinking: { 
                  ...preferences.drinking, 
                  value: value as 'never' | 'social' | 'moderate' | 'regular'
                }
              })
            }
            layout="vertical"
          />
        </View>
        
        <View style={styles.subsection}>
          <MultiSelectPreference
            options={drinkingAcceptableOptions}
            selectedValues={preferences.drinking.acceptable}
            onSelectionChange={(acceptable) =>
              onUpdate({
                drinking: { 
                  ...preferences.drinking, 
                  acceptable: acceptable as ('never' | 'social' | 'moderate' | 'regular')[]
                }
              })
            }
            minSelections={1}
            layout="grid"
          />
        </View>
      </PreferenceSection>

      {/* Education */}
      <PreferenceSection
        title="Education Level"
        description="Minimum education level preference"
        dealbreaker={preferences.educationLevel.dealbreaker}
        onDealbreakerChange={(dealbreaker) =>
          onUpdate({
            educationLevel: { ...preferences.educationLevel, dealbreaker }
          })
        }
      >
        <DropdownPreference
          options={educationOptions}
          selectedValue={preferences.educationLevel.minimum}
          onSelectionChange={(minimum) =>
            onUpdate({
              educationLevel: { 
                ...preferences.educationLevel, 
                minimum: minimum as 'high_school' | 'some_college' | 'bachelors' | 'masters' | 'doctorate' | 'no_preference'
              }
            })
          }
          placeholder="Select minimum education level"
        />
      </PreferenceSection>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  subsection: {
    marginTop: 12,
  },
});