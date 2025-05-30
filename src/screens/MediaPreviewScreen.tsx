import { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  TextInput, 
  StyleSheet, 
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { AuthStackParamList, AuthNavigationProp } from '../navigation/types';
import styled from 'styled-components/native';
import { useAppTheme } from '../utils/useAppTheme';
import { sendMessage } from '../services/chatService';
import { storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from '@firebase/storage';
import * as VideoThumbnails from 'expo-video-thumbnails';

type MediaPreviewScreenRouteProp = RouteProp<AuthStackParamList, 'MediaPreview'>;

// Media item type for navigation
interface MediaItem {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  duration?: number;
  fileName?: string;
}

export default function MediaPreviewScreen() {
  const { isDark } = useAppTheme();
  const navigation = useNavigation<AuthNavigationProp>();
  const route = useRoute<MediaPreviewScreenRouteProp>();
  
  console.log('MediaPreviewScreen mounted with route params:', JSON.stringify(route.params));
  
  // Safely destructure params with validation
  const { mediaItems = [], chatId = '', replyToMessage } = route.params || {};
  
  // Log important data
  console.log(`MediaPreviewScreen received ${mediaItems?.length || 0} media items for chat ${chatId}`);
  if (mediaItems?.length > 0) {
    console.log('First media item:', JSON.stringify(mediaItems[0]));
  }

  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Check if we have valid media items
  if (!mediaItems || mediaItems.length === 0) {
    console.error('No media items provided to MediaPreviewScreen');
    // Return a fallback UI for when no media items are present
    return (
      <Container isDark={isDark}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: isDark ? '#FFFFFF' : '#000000', fontSize: 18 }}>
            No media items to preview. Please try again.
          </Text>
          <TouchableOpacity 
            style={{ marginTop: 20, padding: 10, backgroundColor: '#FF6B6B', borderRadius: 8 }}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ color: '#FFFFFF' }}>Go Back</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Container>
    );
  }
  
  // Safe access to selected item
  const selectedItem = mediaItems[selectedItemIndex] || mediaItems[0];
  console.log('Selected item for preview:', JSON.stringify(selectedItem));
  
  const isVideo = selectedItem?.type === 'video';

  const handleSend = async () => {
    if (isUploading) return;
    
    try {
      console.log('Starting media upload process...');
      setError(null);
      setIsUploading(true);
      setUploadProgress(0);
      
      const mediaPath = `chat_media/${chatId}/${Date.now()}_${selectedItemIndex}`;
      let mediaUrl = '';
      let thumbnailUrl = '';
      
      console.log(`Uploading media to path: ${mediaPath}`);
      console.log('Media URI:', selectedItem.uri);
      
      // Upload media file
      try {
        console.log('Fetching media content...');
        const response = await fetch(selectedItem.uri);
        console.log('Media fetch response status:', response.status);
        
        const blob = await response.blob();
        console.log(`Got blob of size: ${blob.size} bytes`);  
        
        const mediaRef = ref(storage, mediaPath);
        console.log('Created storage reference');
        
        console.log('Uploading to Firebase Storage...');
        await uploadBytes(mediaRef, blob);
        console.log('Upload complete, getting download URL...');
        
        mediaUrl = await getDownloadURL(mediaRef);
        console.log('Media URL obtained:', mediaUrl.substring(0, 50) + '...');
      } catch (uploadError) {
        console.error('Error during media upload:', uploadError);
        throw new Error(`Media upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
      }
      
      // For videos, generate and upload a thumbnail
      if (isVideo) {
        try {
          console.log('Generating video thumbnail...');
          const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(selectedItem.uri, {
            time: 0,
            quality: 0.7,
          });
          console.log('Thumbnail generated:', thumbnailUri);
          
          const thumbnailResponse = await fetch(thumbnailUri);
          const thumbnailBlob = await thumbnailResponse.blob();
          const thumbnailRef = ref(storage, `${mediaPath}_thumbnail`);
          
          console.log('Uploading thumbnail...');
          await uploadBytes(thumbnailRef, thumbnailBlob);
          thumbnailUrl = await getDownloadURL(thumbnailRef);
          console.log('Thumbnail URL obtained');
        } catch (thumbnailError) {
          console.warn('Error generating thumbnail (continuing without it):', thumbnailError);
          // Continue without thumbnail rather than failing the whole upload
        }
      }
      
      // Prepare message data
      const messageData = {
        content: caption || '',
        senderId: '',  // This will be set by the service
        type: isVideo ? 'video' as const : 'image' as const, // Using 'as const' for type safety
        mediaUrl,
        thumbnailUrl: isVideo ? thumbnailUrl : undefined,
        caption: caption || undefined,
        dimensions: {
          width: selectedItem.width || 0,
          height: selectedItem.height || 0
        },
        duration: selectedItem.duration,
        ...(replyToMessage ? { replyTo: {
          id: replyToMessage.id,
          content: replyToMessage.content,
          senderId: replyToMessage.senderId
        }} : {})
      };
      
      console.log('Sending chat message with media:', JSON.stringify(messageData));
      
      // Send message with media
      await sendMessage(chatId, messageData);
      console.log('Message sent successfully');
      
      // Navigate back to the chat conversation screen by popping the preview screen
      console.log('Navigating back to chat conversation by popping MediaPreviewScreen');
      navigation.goBack();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error sending media message:', errorMessage);
      setError(errorMessage);
      Alert.alert('Error', `Failed to send media: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };
  return (
    <Container isDark={isDark}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={{ flex: 1 }}>
        <Header>
          <BackButton onPress={() => navigation.goBack()}>
            <BackButtonText isDark={isDark}>✕</BackButtonText>
          </BackButton>
          <HeaderTitle isDark={isDark}>Preview</HeaderTitle>
          <SendButton onPress={handleSend} disabled={isUploading}>
            <SendButtonText isDark={isDark}>{isUploading ? 'Sending...' : 'Send'}</SendButtonText>
          </SendButton>
        </Header>
        
        <PreviewContainer>
          {isUploading ? (
            <UploadingOverlay>
              <ActivityIndicator size="large" color="#FF6B6B" />
              <UploadText isDark={isDark}>Uploading media...</UploadText>
              {uploadProgress > 0 && (
                <UploadText isDark={isDark}>{Math.round(uploadProgress)}%</UploadText>
              )}
            </UploadingOverlay>
          ) : null}
          
          {error ? (
            <ErrorOverlay>
              <ErrorText isDark={isDark}>{error}</ErrorText>
              <TouchableOpacity onPress={() => setError(null)}>
                <ErrorDismissText isDark={isDark}>Tap to dismiss</ErrorDismissText>
              </TouchableOpacity>
            </ErrorOverlay>
          ) : null}
          
          {isVideo ? (
            <StyledVideo
              source={{ uri: selectedItem.uri }}
              resizeMode={ResizeMode.CONTAIN}
              useNativeControls
              isLooping
              shouldPlay
            />
          ) : (
            <StyledImage
              source={{ uri: selectedItem.uri }}
              contentFit="contain"
            />
          )}
        </PreviewContainer>
        
        {mediaItems.length > 1 && (
          <ThumbnailList
            data={mediaItems}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item: MediaItem, index: number) => `${item.uri}_${index}`}
            renderItem={({ item, index }: { item: MediaItem, index: number }) => (
              <ThumbnailButton 
                onPress={() => setSelectedItemIndex(index)}
                isSelected={index === selectedItemIndex}
              >
                <ThumbnailImage
                  source={{ uri: item.uri }}
                  contentFit="cover"
                  isSelected={index === selectedItemIndex}
                />
                {item.type === 'video' && (
                  <VideoIndicator>
                    <VideoIndicatorText>▶</VideoIndicatorText>
                  </VideoIndicator>
                )}
              </ThumbnailButton>
            )}
          />
        )}
        
        <CaptionInput
          value={caption}
          onChangeText={setCaption}
          placeholder="Add a caption..."
          placeholderTextColor={isDark ? '#777777' : '#999999'}
          multiline
          maxLength={300}
          isDark={isDark}
        />
      </SafeAreaView>
    </Container>
  );
}

// Styled components
const Container = styled.View<{ isDark: boolean }>`
  flex: 1;
  background-color: ${(props: { isDark: boolean }) => props.isDark ? '#121212' : '#FFFFFF'};
`;

const Header = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom-width: 1px;
  border-bottom-color: #EEEEEE;
`;

const HeaderTitle = styled.Text<{ isDark: boolean }>`
  font-size: 18px;
  font-weight: bold;
  color: ${(props: { isDark: boolean }) => props.isDark ? '#FFFFFF' : '#000000'};
`;

const BackButton = styled.TouchableOpacity`
  padding: 8px;
`;

const BackButtonText = styled.Text<{ isDark: boolean }>`
  font-size: 24px;
  color: ${(props: { isDark: boolean }) => props.isDark ? '#FFFFFF' : '#000000'};
`;

const SendButton = styled.TouchableOpacity`
  padding: 8px 16px;
  border-radius: 16px;
  background-color: #FF6B6B;
  opacity: ${(props: { disabled?: boolean }) => props.disabled ? 0.5 : 1};
`;

const SendButtonText = styled.Text<{ isDark: boolean }>`
  color: #FFFFFF;
  font-weight: bold;
`;

const PreviewContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const StyledImage = styled(Image)`
  width: 100%;
  height: 100%;
`;

const StyledVideo = styled(Video)`
  width: 100%;
  height: 100%;
`;

const ThumbnailList = styled(FlatList)`
  height: 80px;
  padding: 8px;
`;

const ThumbnailButton = styled.TouchableOpacity<{ isSelected: boolean }>`
  width: 60px;
  height: 60px;
  margin-horizontal: 4px;
  border-radius: 4px;
  border-width: 2px;
  border-color: ${(props: { isSelected: boolean }) => props.isSelected ? '#FF6B6B' : 'transparent'};
  overflow: hidden;
`;

const ThumbnailImage = styled(Image)<{ isSelected: boolean }>`
  width: 100%;
  height: 100%;
  opacity: ${(props: { isSelected: boolean }) => props.isSelected ? 1 : 0.7};
`;

const VideoIndicator = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.3);
`;

const VideoIndicatorText = styled.Text`
  color: white;
  font-size: 20px;
`;

const CaptionInput = styled.TextInput<{ isDark: boolean }>`
  margin: 16px;
  padding: 12px;
  border-radius: 8px;
  background-color: ${(props: { isDark: boolean }) => props.isDark ? '#2C2C2C' : '#F0F0F0'};
  color: ${(props: { isDark: boolean }) => props.isDark ? '#FFFFFF' : '#000000'};
  min-height: 80px;
  max-height: 120px;
`;

const UploadingOverlay = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  justify-content: center;
  align-items: center;
  z-index: 10;
`;

const UploadText = styled.Text<{ isDark: boolean }>`
  color: white;
  margin-top: 16px;
  font-size: 16px;
`;

const ErrorOverlay = styled.View`
  position: absolute;
  top: 70px;
  left: 20px;
  right: 20px;
  padding: 16px;
  background-color: rgba(255, 0, 0, 0.8);
  border-radius: 8px;
  z-index: 10;
  align-items: center;
`;

const ErrorText = styled.Text<{ isDark: boolean }>`
  color: white;
  font-size: 14px;
  text-align: center;
  margin-bottom: 8px;
`;

const ErrorDismissText = styled.Text<{ isDark: boolean }>`
  color: white;
  font-size: 12px;
  font-weight: bold;
  margin-top: 8px;
  text-decoration: underline;
`;
