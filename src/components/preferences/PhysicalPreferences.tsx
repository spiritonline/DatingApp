import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DatingPreferences, heightToInches, inchesToHeight } from '../../types/preferences';
import { PreferenceSection } from './PreferenceSection';
import { useTheme } from '../../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface PhysicalPreferencesProps {
  preferences: DatingPreferences;
  onUpdate: (updates: Partial<DatingPreferences>) => void;
}

export const PhysicalPreferences: React.FC<PhysicalPreferencesProps> = ({
  preferences,
  onUpdate,
}) => {
  const { theme } = useTheme();

  const formatHeight = (inches: number) => {
    const { feet, inches: remainingInches } = inchesToHeight(inches);
    return `${feet}'${remainingInches}"`;
  };

  const adjustMinHeight = (change: number) => {
    const currentMin = preferences.height.min || 48; // 4'0" default
    const newMin = Math.max(48, Math.min(84, currentMin + change)); // 4'0" to 7'0"
    
    onUpdate({
      height: {
        ...preferences.height,
        min: newMin,
      }
    });
  };

  const adjustMaxHeight = (change: number) => {
    const currentMax = preferences.height.max || 84; // 7'0" default
    const newMax = Math.max(48, Math.min(84, currentMax + change)); // 4'0" to 7'0"
    
    onUpdate({
      height: {
        ...preferences.height,
        max: newMax,
      }
    });
  };

  const clearMinHeight = () => {
    const { min, ...rest } = preferences.height;
    onUpdate({
      height: rest,
    });
  };

  const clearMaxHeight = () => {
    const { max, ...rest } = preferences.height;
    onUpdate({
      height: rest,
    });
  };

  const setMinHeight = () => {
    if (!preferences.height.min) {
      onUpdate({
        height: {
          ...preferences.height,
          min: 60, // 5'0" default
        }
      });
    }
  };

  const setMaxHeight = () => {
    if (!preferences.height.max) {
      onUpdate({
        height: {
          ...preferences.height,
          max: 72, // 6'0" default
        }
      });
    }
  };

  return (
    <View style={styles.container}>
      <PreferenceSection
        title="Height Preferences"
        description="Set your height preferences for potential matches"
        dealbreaker={preferences.height.dealbreaker}
        onDealbreakerChange={(dealbreaker) =>
          onUpdate({
            height: { ...preferences.height, dealbreaker }
          })
        }
      >
        <View style={styles.heightControls}>
          {/* Minimum Height */}
          <View style={styles.heightSection}>
            <Text style={[styles.heightLabel, { color: theme.textSecondary }]}>
              Minimum Height
            </Text>
            
            {preferences.height.min ? (
              <View style={styles.heightControl}>
                <View style={styles.heightValueRow}>
                  <TouchableOpacity
                    style={[styles.heightButton, { borderColor: theme.border }]}
                    onPress={() => adjustMinHeight(-1)}
                    disabled={preferences.height.min <= 48}
                  >
                    <Ionicons 
                      name="remove" 
                      size={16} 
                      color={preferences.height.min <= 48 ? theme.border : theme.text} 
                    />
                  </TouchableOpacity>
                  
                  <View style={[styles.heightDisplay, { 
                    backgroundColor: theme.surface, 
                    borderColor: theme.border 
                  }]}>
                    <Text style={[styles.heightText, { color: theme.text }]}>
                      {formatHeight(preferences.height.min)}
                    </Text>
                    <Text style={[styles.heightInches, { color: theme.textSecondary }]}>
                      ({preferences.height.min}")
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.heightButton, { borderColor: theme.border }]}
                    onPress={() => adjustMinHeight(1)}
                    disabled={preferences.height.min >= 84}
                  >
                    <Ionicons 
                      name="add" 
                      size={16} 
                      color={preferences.height.min >= 84 ? theme.border : theme.text} 
                    />
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity
                  style={[styles.clearButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={clearMinHeight}
                >
                  <Text style={[styles.clearButtonText, { color: theme.text }]}>
                    No Minimum
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.setButton, { backgroundColor: theme.primary }]}
                onPress={setMinHeight}
              >
                <Text style={[styles.setButtonText, { color: theme.background }]}>
                  Set Minimum Height
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Maximum Height */}
          <View style={styles.heightSection}>
            <Text style={[styles.heightLabel, { color: theme.textSecondary }]}>
              Maximum Height
            </Text>
            
            {preferences.height.max ? (
              <View style={styles.heightControl}>
                <View style={styles.heightValueRow}>
                  <TouchableOpacity
                    style={[styles.heightButton, { borderColor: theme.border }]}
                    onPress={() => adjustMaxHeight(-1)}
                    disabled={preferences.height.max <= 48}
                  >
                    <Ionicons 
                      name="remove" 
                      size={16} 
                      color={preferences.height.max <= 48 ? theme.border : theme.text} 
                    />
                  </TouchableOpacity>
                  
                  <View style={[styles.heightDisplay, { 
                    backgroundColor: theme.surface, 
                    borderColor: theme.border 
                  }]}>
                    <Text style={[styles.heightText, { color: theme.text }]}>
                      {formatHeight(preferences.height.max)}
                    </Text>
                    <Text style={[styles.heightInches, { color: theme.textSecondary }]}>
                      ({preferences.height.max}")
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={[styles.heightButton, { borderColor: theme.border }]}
                    onPress={() => adjustMaxHeight(1)}
                    disabled={preferences.height.max >= 84}
                  >
                    <Ionicons 
                      name="add" 
                      size={16} 
                      color={preferences.height.max >= 84 ? theme.border : theme.text} 
                    />
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity
                  style={[styles.clearButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={clearMaxHeight}
                >
                  <Text style={[styles.clearButtonText, { color: theme.text }]}>
                    No Maximum
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.setButton, { backgroundColor: theme.primary }]}
                onPress={setMaxHeight}
              >
                <Text style={[styles.setButtonText, { color: theme.background }]}>
                  Set Maximum Height
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Height Range Display */}
          {(preferences.height.min || preferences.height.max) && (
            <View style={[styles.rangeDisplay, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="resize-outline" size={20} color={theme.primary} />
              <Text style={[styles.rangeText, { color: theme.text }]}>
                {preferences.height.min ? formatHeight(preferences.height.min) : 'Any'} - {preferences.height.max ? formatHeight(preferences.height.max) : 'Any'}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Presets */}
        <View style={styles.quickPresets}>
          <Text style={[styles.presetsLabel, { color: theme.textSecondary }]}>
            Quick presets:
          </Text>
          
          <View style={styles.presetButtons}>
            <TouchableOpacity
              style={[styles.presetButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => onUpdate({
                height: { ...preferences.height, min: heightToInches(5, 6) } // 5'6"
              })}
            >
              <Text style={[styles.presetButtonText, { color: theme.text }]}>
                5'6"+ (Average)
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.presetButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => onUpdate({
                height: { ...preferences.height, min: heightToInches(6, 0) } // 6'0"
              })}
            >
              <Text style={[styles.presetButtonText, { color: theme.text }]}>
                6'0"+ (Tall)
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.presetButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => onUpdate({
                height: { dealbreaker: false }
              })}
            >
              <Text style={[styles.presetButtonText, { color: theme.text }]}>
                No Preference
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </PreferenceSection>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  heightControls: {
    gap: 20,
  },
  heightSection: {
    gap: 12,
  },
  heightLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  heightControl: {
    gap: 12,
  },
  heightValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  heightButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heightDisplay: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 120,
  },
  heightText: {
    fontSize: 18,
    fontWeight: '600',
  },
  heightInches: {
    fontSize: 12,
    marginTop: 2,
  },
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  setButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  setButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  rangeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    justifyContent: 'center',
  },
  rangeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  quickPresets: {
    gap: 8,
    marginTop: 16,
  },
  presetsLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  presetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  presetButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
});