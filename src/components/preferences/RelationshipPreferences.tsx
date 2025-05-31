import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DatingPreferences } from '../../types/preferences';
import { PreferenceSection } from './PreferenceSection';
import { MultiSelectPreference } from './controls/MultiSelectPreference';

interface RelationshipPreferencesProps {
  preferences: DatingPreferences;
  onUpdate: (updates: Partial<DatingPreferences>) => void;
}

export const RelationshipPreferences: React.FC<RelationshipPreferencesProps> = ({
  preferences,
  onUpdate,
}) => {
  const relationshipTypeOptions = [
    {
      id: 'casual',
      label: 'Casual',
      description: 'Looking for something fun and relaxed',
    },
    {
      id: 'serious',
      label: 'Serious',
      description: 'Looking for a committed relationship',
    },
    {
      id: 'friendship',
      label: 'Friendship',
      description: 'Looking to make new friends',
    },
    {
      id: 'open_to_both',
      label: 'Open to Both',
      description: 'Open to casual or serious connections',
    },
  ];

  const datingIntentionsOptions = [
    {
      id: 'long_term',
      label: 'Long-term Partner',
      description: 'Looking for someone to build a future with',
    },
    {
      id: 'short_term',
      label: 'Short-term Dating',
      description: 'Looking for dating without long-term commitment',
    },
    {
      id: 'life_partner',
      label: 'Life Partner',
      description: 'Looking for marriage or life partnership',
    },
    {
      id: 'figuring_out',
      label: 'Figuring it Out',
      description: 'Still exploring what I want',
    },
    {
      id: 'fun',
      label: 'Just for Fun',
      description: 'Looking for fun experiences and connections',
    },
  ];

  return (
    <View style={styles.container}>
      <PreferenceSection
        title="Relationship Type"
        description="What type of relationship are you looking for?"
        dealbreaker={preferences.relationshipType.dealbreaker}
        onDealbreakerChange={(dealbreaker) =>
          onUpdate({
            relationshipType: { ...preferences.relationshipType, dealbreaker }
          })
        }
      >
        <MultiSelectPreference
          options={relationshipTypeOptions}
          selectedValues={preferences.relationshipType.value}
          onSelectionChange={(value) =>
            onUpdate({
              relationshipType: { ...preferences.relationshipType, value }
            })
          }
          minSelections={1}
          maxSelections={3}
          layout="list"
        />
      </PreferenceSection>

      <PreferenceSection
        title="Dating Intentions"
        description="What are you hoping to find through dating?"
        dealbreaker={preferences.datingIntentions.dealbreaker}
        onDealbreakerChange={(dealbreaker) =>
          onUpdate({
            datingIntentions: { ...preferences.datingIntentions, dealbreaker }
          })
        }
      >
        <MultiSelectPreference
          options={datingIntentionsOptions}
          selectedValues={preferences.datingIntentions.value}
          onSelectionChange={(value) =>
            onUpdate({
              datingIntentions: { ...preferences.datingIntentions, value }
            })
          }
          minSelections={1}
          maxSelections={3}
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