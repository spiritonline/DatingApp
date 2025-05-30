import React, { useState } from 'react';
import { View, Text, Button, Image, FlatList, StyleSheet, ScrollView } from 'react-native';
import { useImagePicker } from '../../hooks/useImagePicker';
import { MediaServiceResult } from '../../types/media';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../utils/useAppTheme';
import { TouchableOpacity } from 'react-native-gesture-handler';

export default function ImagePickerTestScreen() {
  const { isDark } = useAppTheme();
  const [result, setResult] = useState<MediaServiceResult | null>(null);
  
  const { 
    isLoading, 
    pickFromGallery, 
    pickFromCamera,
    cleanup
  } = useImagePicker({
    onPickerSuccess: (newResult) => {
      setResult(newResult);
    }
  });
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F5' }]}>
      <ScrollView>
        <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}>Image Picker Test</Text>
        
        <View style={styles.buttonContainer}>
          <TestButton 
            title="Profile Photo - Gallery" 
            onPress={() => pickFromGallery('profile')}
            disabled={isLoading}
            isDark={isDark}
          />
          
          <TestButton 
            title="Profile Photo - Camera" 
            onPress={() => pickFromCamera('profile')}
            disabled={isLoading}
            isDark={isDark}
          />
          
          <TestButton 
            title="Chat Image - Gallery" 
            onPress={() => pickFromGallery('chat', { 
              freeStyleCropEnabled: true,
              cropperToolbarTitle: 'Crop Chat Image'
            })}
            disabled={isLoading}
            isDark={isDark}
          />
          
          <TestButton 
            title="Chat Image - Camera" 
            onPress={() => pickFromCamera('chat', {
              freeStyleCropEnabled: true,
              cropperToolbarTitle: 'Crop Chat Capture'
            })}
            disabled={isLoading}
            isDark={isDark}
          />
          
          <TestButton 
            title="Clean Temp Files" 
            onPress={cleanup}
            disabled={isLoading}
            isDark={isDark}
          />
        </View>
        
        {isLoading && (
          <Text style={{ color: isDark ? '#FFFFFF' : '#000000', textAlign: 'center', marginVertical: 20 }}>
            Loading...
          </Text>
        )}
        
        {result && (
          <View style={styles.resultContainer}>
            <Text style={[styles.resultTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>Result</Text>
            <Text style={{ color: isDark ? '#FFFFFF' : '#000000' }}>Success: {result.success ? 'Yes' : 'No'}</Text>
            <Text style={{ color: isDark ? '#FFFFFF' : '#000000' }}>Assets: {result.assets.length}</Text>
            
            <FlatList
              data={result.assets}
              keyExtractor={(item, index) => `${item.uri}-${index}`}
              renderItem={({ item }) => (
                <View style={[styles.assetItem, { backgroundColor: isDark ? '#2C2C2C' : '#FFFFFF', borderColor: isDark ? '#444444' : '#DDDDDD' }]}>
                  <Image
                    source={{ uri: item.uri }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                  <View style={styles.assetInfo}>
                    <Text style={{ color: isDark ? '#FFFFFF' : '#000000' }}>Type: {item.type}</Text>
                    <Text style={{ color: isDark ? '#FFFFFF' : '#000000' }}>Size: {item.fileSize ? `${(item.fileSize / 1024).toFixed(2)} KB` : 'Unknown'}</Text>
                    <Text style={{ color: isDark ? '#FFFFFF' : '#000000' }}>Dimensions: {item.width} x {item.height}</Text>
                    {item.mime && <Text style={{ color: isDark ? '#FFFFFF' : '#000000' }}>MIME: {item.mime}</Text>}
                  </View>
                </View>
              )}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Custom button component
const TestButton = ({ title, onPress, disabled, isDark }: { title: string; onPress: () => void; disabled: boolean; isDark: boolean }) => (
  <TouchableOpacity 
    style={[
      styles.button, 
      { 
        backgroundColor: disabled ? '#888888' : '#FF6B6B',
        opacity: disabled ? 0.5 : 1 
      }
    ]} 
    onPress={onPress} 
    disabled={disabled}
  >
    <Text style={styles.buttonText}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  buttonContainer: {
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultContainer: {
    marginTop: 20,
    padding: 10,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  assetItem: {
    flexDirection: 'row',
    marginVertical: 10,
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 4,
  },
  assetInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
});
