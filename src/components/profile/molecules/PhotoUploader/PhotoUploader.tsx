import React, { useState } from 'react';
import { View, TouchableOpacity, Alert, Image, FlatList, ActivityIndicator } from 'react-native';
import styled from 'styled-components/native';
import { FontAwesome } from '@expo/vector-icons';
import { PhotoItem, usePhotoUpload } from '../../../../hooks/usePhotoUpload';

interface PhotoUploaderProps {
  initialPhotos?: string[];
  onPhotosChanged?: (photoUrls: string[]) => void;
  isDark?: boolean;
  maxPhotos?: number;
}

export function PhotoUploader({
  initialPhotos = [],
  onPhotosChanged,
  isDark = false,
  maxPhotos = 9
}: PhotoUploaderProps) {
  const {
    photos,
    isLoading,
    error,
    pickImage,
    takePhoto,
    uploadPhoto,
    removePhoto
  } = usePhotoUpload(initialPhotos);
  
  const [activePhoto, setActivePhoto] = useState<PhotoItem | null>(null);
  
  // Handle photo selection from library
  const handlePickImage = async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert('Limit Reached', `You can only upload a maximum of ${maxPhotos} photos.`);
      return;
    }
    
    const newPhotos = await pickImage();
    if (newPhotos && onPhotosChanged) {
      onPhotosChanged(photos.map(p => p.uri));
    }
  };
  
  // Handle taking a photo with camera
  const handleTakePhoto = async () => {
    if (photos.length >= maxPhotos) {
      Alert.alert('Limit Reached', `You can only upload a maximum of ${maxPhotos} photos.`);
      return;
    }
    
    const newPhoto = await takePhoto();
    if (newPhoto && onPhotosChanged) {
      onPhotosChanged(photos.map(p => p.uri));
    }
  };
  
  // Handle photo removal
  const handleRemovePhoto = (photoId: string) => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive', 
          onPress: () => {
            removePhoto(photoId);
            if (onPhotosChanged) {
              const updatedPhotos = photos.filter(p => p.id !== photoId);
              onPhotosChanged(updatedPhotos.map(p => p.uri));
            }
          }
        }
      ]
    );
  };
  
  // Removed the solid 'Add Photo' button to keep only the dashed outline button
  
  // Render an individual photo
  const renderPhoto = ({ item }: { item: PhotoItem }) => (
    <PhotoContainer>
      <Photo source={{ uri: item.uri }} />
      
      {item.isUploading ? (
        <UploadOverlay>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </UploadOverlay>
      ) : (
        <RemoveButton 
          onPress={() => handleRemovePhoto(item.id)}
          accessibilityLabel="Remove photo"
          accessibilityRole="button"
          accessibilityHint="Removes this photo from your profile"
          testID={`remove-photo-${item.id}`}
        >
          <FontAwesome name="trash" size={18} color="#FFFFFF" />
        </RemoveButton>
      )}
    </PhotoContainer>
  );
  
  // Render add photo placeholder
  const renderAddPhoto = () => (
    <AddPhotoContainer 
      onPress={handlePickImage}
      accessibilityLabel="Add photo"
      accessibilityRole="button"
      accessibilityHint="Opens options to add a new photo"
      testID="add-photo-button"
      isDark={isDark}
    >
      <FontAwesome name="plus" size={24} color={isDark ? "#FFFFFF" : "#333333"} />
      <AddPhotoText isDark={isDark}>Add Photo</AddPhotoText>
    </AddPhotoContainer>
  );
  
  return (
    <Container>
      {/* Photo grid - using View instead of FlatList to prevent VirtualizedList nesting error */}
      <PhotoGrid>
        {photos.map(item => renderPhoto({ item }))} 
        {photos.length < maxPhotos && renderAddPhoto()}
      </PhotoGrid>
      
      {/* Error message */}
      {error && <ErrorText>{error}</ErrorText>}
    </Container>
  );
}

// Styled components
const Container = styled.View<{ isDark?: boolean }>`
  width: 100%;
`;

const PhotoGrid = styled.View<{ isDark?: boolean }>`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-start;
  margin-bottom: 16px;
`;

const PhotoContainer = styled.View<{ isDark?: boolean }>`
  width: 100px;
  height: 100px;
  border-radius: 8px;
  margin-bottom: 8px;
  overflow: hidden;
  position: relative;
`;

const Photo = styled(Image)<{ isDark?: boolean }>`
  width: 100%;
  height: 100%;
`;

const RemoveButton = styled.TouchableOpacity<{ isDark?: boolean }>`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 14px;
  background-color: rgba(255, 0, 0, 0.7);
  justify-content: center;
  align-items: center;
`;

const UploadOverlay = styled.View<{ isDark?: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: center;
  align-items: center;
`;

interface AddPhotoContainerProps {
  isDark?: boolean;
}

const AddPhotoContainer = styled.TouchableOpacity<AddPhotoContainerProps>`
  width: 100px;
  height: 100px;
  border-radius: 8px;
  border: 2px dashed ${(props: AddPhotoContainerProps) => props.isDark ? '#444444' : '#CCCCCC'};
  justify-content: center;
  align-items: center;
  background-color: ${(props: AddPhotoContainerProps) => props.isDark ? '#1E1E1E' : '#F5F5F5'};
`;

interface AddPhotoTextProps {
  isDark?: boolean;
}

const AddPhotoText = styled.Text<AddPhotoTextProps>`
  font-size: 12px;
  margin-top: 8px;
  color: ${(props: AddPhotoTextProps) => props.isDark ? '#FFFFFF' : '#333333'};
`;

const OptionsContainer = styled.View<{ isDark?: boolean }>`
  flex-direction: row;
  justify-content: space-around;
  margin-top: 16px;
  margin-bottom: 16px;
`;

const PhotoOption = styled.TouchableOpacity<{ isDark?: boolean }>`
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  background-color: ${(props: { isDark?: boolean }) => props.isDark ? '#2C2C2E' : '#F5F5F5'};
  width: 45%;
`;

const OptionText = styled.Text<{ isDark?: boolean }>`
  font-size: 14px;
  margin-top: 8px;
  color: ${(props: { isDark?: boolean }) => props.isDark ? '#FFFFFF' : '#333333'};
`;

const ErrorText = styled.Text<{ isDark?: boolean }>`
  color: #FF3B30;
  font-size: 14px;
  text-align: center;
  margin-top: 8px;
`;
