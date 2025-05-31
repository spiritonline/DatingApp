import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../../../theme/ThemeContext';

interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
}

interface LocationPreferenceProps {
  location: LocationData;
  onLocationChange: (location: LocationData) => void;
}

export const LocationPreference: React.FC<LocationPreferenceProps> = ({
  location,
  onLocationChange,
}) => {
  const { theme } = useTheme();
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [cityInput, setCityInput] = useState(location.city || '');

  const getCurrentLocation = async () => {
    try {
      setIsGettingLocation(true);

      // Check if Location is available
      if (!Location) {
        Alert.alert(
          'Location Service Unavailable',
          'Please enter your city manually.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is needed to get your current location.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get current position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocode to get address
      const addresses = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      const address = addresses[0];
      const newLocation: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        city: address?.city || address?.subAdministrativeArea || 'Unknown',
        state: address?.region || address?.administrativeArea || '',
        country: address?.country || 'Unknown',
      };

      onLocationChange(newLocation);
      setCityInput(newLocation.city || '');
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please try again or enter manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleCityChange = (city: string) => {
    setCityInput(city);
    // For simplicity, we'll just update the city field
    // In a real app, you'd want to geocode this to get lat/lng
    onLocationChange({
      ...location,
      city: city.trim(),
    });
  };

  const formatLocationDisplay = () => {
    const parts = [];
    if (location.city) parts.push(location.city);
    if (location.state) parts.push(location.state);
    if (location.country) parts.push(location.country);
    return parts.join(', ') || 'No location set';
  };

  const commonLocations = [
    { name: 'San Francisco, CA', coords: { latitude: 37.7749, longitude: -122.4194 } },
    { name: 'New York, NY', coords: { latitude: 40.7128, longitude: -74.0060 } },
    { name: 'Los Angeles, CA', coords: { latitude: 34.0522, longitude: -118.2437 } },
    { name: 'Chicago, IL', coords: { latitude: 41.8781, longitude: -87.6298 } },
    { name: 'Austin, TX', coords: { latitude: 30.2672, longitude: -97.7431 } },
  ];

  const selectCommonLocation = (locationData: { name: string; coords: { latitude: number; longitude: number } }) => {
    const [city, state] = locationData.name.split(', ');
    onLocationChange({
      latitude: locationData.coords.latitude,
      longitude: locationData.coords.longitude,
      city,
      state,
      country: 'USA',
    });
    setCityInput(city);
  };

  return (
    <View style={styles.container}>
      {/* Current Location Display */}
      <View style={[styles.currentLocation, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.locationInfo}>
          <Ionicons name="location-outline" size={20} color={theme.primary} />
          <View style={styles.locationText}>
            <Text style={[styles.locationDisplay, { color: theme.text }]}>
              {formatLocationDisplay()}
            </Text>
            <Text style={[styles.coordinates, { color: theme.textSecondary }]}>
              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </Text>
          </View>
        </View>
      </View>

      {/* Current Location Button */}
      <TouchableOpacity
        style={[styles.currentLocationButton, { backgroundColor: theme.primary }]}
        onPress={getCurrentLocation}
        disabled={isGettingLocation}
      >
        <Ionicons 
          name={isGettingLocation ? "refresh" : "navigate"} 
          size={20} 
          color={theme.background} 
        />
        <Text style={[styles.currentLocationButtonText, { color: theme.background }]}>
          {isGettingLocation ? 'Getting Location...' : 'Use Current Location'}
        </Text>
      </TouchableOpacity>

      {/* Manual City Input */}
      <View style={styles.manualInput}>
        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
          Or enter city manually:
        </Text>
        <TextInput
          style={[styles.cityInput, { 
            backgroundColor: theme.surface, 
            borderColor: theme.border,
            color: theme.text 
          }]}
          value={cityInput}
          onChangeText={handleCityChange}
          placeholder="Enter city name"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="words"
          autoCorrect={false}
        />
      </View>

      {/* Common Locations */}
      <View style={styles.commonLocations}>
        <Text style={[styles.commonLocationsLabel, { color: theme.textSecondary }]}>
          Popular locations:
        </Text>
        <View style={styles.commonLocationsList}>
          {commonLocations.map((loc, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.commonLocationButton, { 
                backgroundColor: theme.surface, 
                borderColor: theme.border 
              }]}
              onPress={() => selectCommonLocation(loc)}
            >
              <Text style={[styles.commonLocationText, { color: theme.text }]}>
                {loc.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Location Info */}
      <View style={[styles.locationInfo, { backgroundColor: theme.surface }]}>
        <Ionicons name="information-circle-outline" size={16} color={theme.primary} />
        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
          Your location is used to find matches nearby and calculate distances.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  currentLocation: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  locationText: {
    flex: 1,
  },
  locationDisplay: {
    fontSize: 16,
    fontWeight: '500',
  },
  coordinates: {
    fontSize: 12,
    marginTop: 2,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  currentLocationButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  manualInput: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  cityInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  commonLocations: {
    gap: 8,
  },
  commonLocationsLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  commonLocationsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  commonLocationButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  commonLocationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  infoText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
});