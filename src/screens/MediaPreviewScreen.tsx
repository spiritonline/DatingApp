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
export interface MediaItem {
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
    <Container isDark={isDark} testID="media-preview-container">
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView style={{ flex: 1 }}>
        <Header>
          <BackButton onPress={() => navigation.goBack()} testID="back-button">
            <BackButtonText isDark={isDark}>✕</BackButtonText>
          </BackButton>
          <HeaderTitle isDark={isDark} testID="preview-title">Preview</HeaderTitle>
          <SendButton onPress={handleSend} disabled={isUploading} testID="send-button">
            <SendButtonText isDark={isDark} testID="send-button-text">
              {isUploading ? 'Sending...' : 'Send'}
            </SendButtonText>
          </SendButton>
        </Header>
        
        {isUploading && (
          <UploadingOverlay>
            <ActivityIndicator size="large" color="#FF6B6B" />
            <UploadText>Uploading... {Math.round(uploadProgress * 100)}%</UploadText>
          </UploadingOverlay>
        )}
        
        {error && (
          <ErrorOverlay>
            <ErrorText>{error}</ErrorText>
            <TouchableOpacity onPress={() => setError(null)} testID="dismiss-error-button">
              <ErrorDismissText>Dismiss</ErrorDismissText>
            </TouchableOpacity>
          </ErrorOverlay>
        )}
        
        <MediaContainer>
          {isVideo ? (
            <StyledVideo
              source={{ uri: selectedItem.uri }}
              resizeMode="contain"
              useNativeControls
              isLooping
              shouldPlay
              testID="video-preview"
            />
          ) : (
            <StyledImage
              source={{ uri: selectedItem.uri }}
              contentFit="contain"
              testID="image-preview"
            />
          )}
        </MediaContainer>
        
        {mediaItems.length > 1 && (
          <ThumbnailList
            horizontal
            data={mediaItems}
            keyExtractor={(item: MediaItem, index: number) => `thumbnail-${index}`}
            renderItem={({ item, index }: { item: MediaItem; index: number }) => (
              <ThumbnailItem
                isActive={index === selectedItemIndex}
                onPress={() => setSelectedItemIndex(index)}
                testID={`thumbnail-${index}`}
              >
                <ThumbnailImage
                  source={{ uri: item.uri }}
                  resizeMode="cover"
                />
                {item.type === 'video' && (
                  <VideoIndicator>
                    <VideoIcon>▶️</VideoIcon>
                  </VideoIndicator>
                )}
              </ThumbnailItem>
            )}
            contentContainerStyle={styles.thumbnailList}
            showsHorizontalScrollIndicator={false}
          />
        )}
        
        <CaptionContainer>
          <CaptionInput
            placeholder="Add a caption..."
            placeholderTextColor={isDark ? '#888' : '#999'}
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={500}
            isDark={isDark}
            testID="caption-input"
          />
          <CharCount isDark={isDark}>{caption.length}/500</CharCount>
        </CaptionContainer>
      </SafeAreaView>
    </Container>
  );
}

// Styled components
interface ContainerProps {
  isDark: boolean;
}

const Container = styled.View<ContainerProps>`
  flex: 1;
  background-color: ${(props: ContainerProps) => props.isDark ? '#121212' : '#FFFFFF'};
`;

const Header = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom-width: 1px;
  border-bottom-color: #EEEEEE;
`;

const HeaderTitle = styled.Text<ContainerProps>`
  font-size: 18px;
  font-weight: 600;
  color: ${(props: ContainerProps) => props.isDark ? '#FFFFFF' : '#000000'};
`;

const BackButton = styled.TouchableOpacity.attrs({
  testID: 'back-button',
})`
  padding: 8px;
`;

const BackButtonText = styled.Text<ContainerProps>`
  font-size: 24px;
  color: ${(props: ContainerProps) => props.isDark ? '#FFFFFF' : '#000000'};
`;

const SendButton = styled.TouchableOpacity.attrs({
  testID: 'send-button',
})`
  padding: 8px 16px;
  background-color: #FF6B6B;
  border-radius: 20px;
  opacity: ${(props: { disabled?: boolean }) => props.disabled ? 0.5 : 1};
`;

const SendButtonText = styled.Text.attrs({
  testID: 'send-button-text',
})<ContainerProps>`
  color: #FFFFFF;
  font-weight: 600;
`;

const MediaContainer = styled.View`
  flex: 1;
  background-color: #000000;
  justify-content: center;
  align-items: center;
`;

const StyledImage = styled(Image).attrs({
  testID: 'image-preview',
})`
  width: 100%;
  height: 100%;
`;

const StyledVideo = styled(Video).attrs({
  testID: 'video-preview',
})`
  width: 100%;
  height: 100%;
`;

const styles = StyleSheet.create({
  thumbnailList: {
    paddingHorizontal: 8,
  },
  // Add any additional styles here
});

// Add proper type for FlatList with MediaItem
type MediaItemFlatList = FlatList<MediaItem>;

const ThumbnailList = styled(FlatList as new (props: any) => MediaItemFlatList)`
  height: 80px;
  padding: 8px 0;
`;

interface ThumbnailItemProps {
  isActive: boolean;
}

const ThumbnailItem = styled.TouchableOpacity<ThumbnailItemProps>`
  width: 60px;
  height: 60px;
  margin-right: 8px;
  border-radius: 4px;
  border-width: ${(props: ThumbnailItemProps) => props.isActive ? '2px' : '0'};
  border-color: #FF6B6B;
  overflow: hidden;
`;

const ThumbnailImage = styled(Image)`
  width: 100%;
  height: 100%;
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

const VideoIcon = styled.Text`
  color: white;
  font-size: 20px;
` as any;

const CaptionInput = styled.TextInput.attrs<ContainerProps>({
  testID: 'caption-input',
})<ContainerProps>`
  flex: 1;
  color: ${(props: ContainerProps) => (props.isDark ? '#FFFFFF' : '#000000')};
  font-size: 16px;
  padding: 12px;
  max-height: 100px;
`;

const CaptionContainer = styled.View`
  margin: 16px;
  padding: 12px;
  border-radius: 8px;
  background-color: ${(props: { isDark: boolean }) => props.isDark ? '#2C2C2C' : '#F0F0F0'};
`;

const CharCount = styled.Text<{ isDark: boolean }>`
  color: ${(props: { isDark: boolean }) => props.isDark ? '#FFFFFF' : '#000000'};
  font-size: 12px;
  text-align: right;
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
  bottom: 20px;
  left: 20px;
  right: 20px;
  background-color: rgba(255, 0, 0, 0.8);
  padding: 12px;
  border-radius: 8px;
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
  text-decoration: underline;
  margin-top: 8px;
`;
