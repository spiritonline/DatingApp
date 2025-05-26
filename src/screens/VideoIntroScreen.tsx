import { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  useColorScheme, 
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
// Use a simpler approach for Camera imports with proper TypeScript typing
import * as ExpoCamera from 'expo-camera';
import type { CameraType } from 'expo-camera';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system';
import { Video, ResizeMode } from 'expo-av';
import { AuthStackParamList } from '../navigation/types';
import { storage, auth } from '../services/firebase';
import { uploadBytes, ref, getDownloadURL } from '@firebase/storage';
import { useLikeHandler } from '../hooks/useLikeHandler';
import styled from 'styled-components/native';
import { ThemeProps } from '../utils/styled-components';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

// Declare the Camera component to make TypeScript happy
// This is a pragmatic approach for the expo-camera package which has some type inconsistencies
const Camera = ExpoCamera.Camera as any;

type VideoIntroScreenRouteProp = RouteProp<AuthStackParamList, 'VideoIntro'>;

export default function VideoIntroScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const navigation = useNavigation();
  const route = useRoute<VideoIntroScreenRouteProp>();
  const { profileId } = route.params;
  const { submitVideoLike } = useLikeHandler();
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState<CameraType>('front');
  const [isRecording, setIsRecording] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  
  const cameraRef = useRef<any>(null);
  const videoRef = useRef<any>(null);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Request camera permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        // Use a simpler approach with any type casting for permissions
        // This is a pragmatic solution to handle the expo-camera typing issues
        const cameraApi: any = ExpoCamera;
        const cameraPermission = await cameraApi.requestCameraPermissionsAsync();
        const micPermission = await cameraApi.requestMicrophonePermissionsAsync();
        
        const granted = 
          cameraPermission.status === 'granted' && 
          micPermission.status === 'granted';
        
        setHasPermission(granted);
        
        if (!granted) {
          Alert.alert(
            'Permission Required',
            'Camera and microphone permissions are required to record your video intro.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      } catch (error) {
        console.error('Error requesting permissions:', error);
        setHasPermission(false);
      }
    };
    
    requestPermissions();
    
    // Clean up recording timer if component unmounts
    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    };
  }, [navigation]);
  
  // Generate thumbnail from recorded video
  useEffect(() => {
    const generateThumbnail = async () => {
      if (videoUri) {
        try {
          const { uri } = await VideoThumbnails.getThumbnailAsync(
            videoUri,
            { time: 0 }
          );
          setThumbnail(uri);
        } catch (e) {
          console.warn('Error generating thumbnail:', e);
        }
      }
    };
    
    generateThumbnail();
  }, [videoUri]);
  
  // Handle recording start/stop
  const toggleRecording = async () => {
    if (!cameraRef.current) return;
    
    if (isRecording) {
      // Stop recording
      cameraRef.current.stopRecording();
      setIsRecording(false);
      
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
    } else {
      // Start recording
      setIsRecording(true);
      setRecordingDuration(0);
      
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => {
          // Auto-stop at 60 seconds
          if (prev >= 60) {
            if (cameraRef.current) {
              cameraRef.current.stopRecording();
            }
            setIsRecording(false);
            
            if (recordingTimer.current) {
              clearInterval(recordingTimer.current);
            }
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
      
      try {
        const video = await cameraRef.current.recordAsync({
          maxDuration: 60,
          quality: '720p',
          mute: false
        });
        
        setVideoUri(video.uri);
      } catch (e) {
        console.error('Error recording video:', e);
        Alert.alert('Error', 'Failed to record video');
        setIsRecording(false);
        
        if (recordingTimer.current) {
          clearInterval(recordingTimer.current);
          recordingTimer.current = null;
        }
      }
    }
  };
  
  // Toggle between front and back camera
  const toggleCameraType = () => {
    setType((current: CameraType): CameraType => (
      current === 'back' ? 'front' : 'back'
    ));
  };
  
  // Reset recording state
  const resetRecording = () => {
    setVideoUri(null);
    setThumbnail(null);
    setRecordingDuration(0);
  };
  
  // Format seconds as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Upload video to Firebase Storage and submit like
  const handleSubmit = async () => {
    if (!videoUri || !auth.currentUser) return;
    
    setIsUploading(true);
    
    try {
      const userId = auth.currentUser.uid;
      const filename = `video_intros/${userId}_${new Date().getTime()}.mp4`;
      const videoRef = ref(storage, filename);
      
      // Convert local URI to blob
      const response = await fetch(videoUri);
      const blob = await response.blob();
      
      // Upload to Firebase Storage
      await uploadBytes(videoRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(videoRef);
      
      // Submit the video like
      const success = await submitVideoLike(profileId, downloadURL);
      
      if (success) {
        navigation.goBack();
      } else {
        Alert.alert('Error', 'Failed to submit your video intro');
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      Alert.alert('Error', 'Failed to upload video');
    } finally {
      setIsUploading(false);
    }
  };
  
  // If permissions not granted
  if (hasPermission === null) {
    return (
      <Container isDark={isDark} testID="video-intro-screen">
        <LoadingContainer>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </LoadingContainer>
      </Container>
    );
  }
  
  if (hasPermission === false) {
    return (
      <Container isDark={isDark} testID="video-intro-screen">
        <ErrorContainer>
          <ErrorText isDark={isDark}>
            Camera and microphone access is required to record your video intro.
          </ErrorText>
        </ErrorContainer>
      </Container>
    );
  }
  
  return (
    <Container isDark={isDark} testID="video-intro-screen">
      <HeaderContainer>
        <BackButton 
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <BackButtonText isDark={isDark}>←</BackButtonText>
        </BackButton>
        <Title isDark={isDark}>Video Intro</Title>
        <View style={{ width: 40 }} />
      </HeaderContainer>
      
      <ContentContainer>
        {/* Instructions */}
        <InstructionsText isDark={isDark}>
          Record a 5-60 second video to introduce yourself.
        </InstructionsText>
        
        {/* Camera/Video Preview */}
        {videoUri ? (
          <VideoContainer>
            <Video
              ref={videoRef}
              source={{ uri: videoUri }}
              style={styles.preview}
              useNativeControls
              resizeMode={ResizeMode.COVER}
              isLooping
            />
            {thumbnail && (
              <ThumbnailOverlay>
                <PlayIcon>▶️</PlayIcon>
              </ThumbnailOverlay>
            )}
          </VideoContainer>
        ) : (
          <CameraContainer>
            <Camera
              ref={cameraRef}
              style={styles.camera}
              type={type}
              ratio="16:9"
            />
            
            {isRecording && (
              <RecordingIndicator>
                <RecordingText>● {formatDuration(recordingDuration)}</RecordingText>
              </RecordingIndicator>
            )}
          </CameraContainer>
        )}
        
        {/* Controls */}
        <ControlsContainer>
          {videoUri ? (
            <Animated.View 
              style={styles.buttonsRow}
              entering={FadeIn.duration(300)}
            >
              <ActionButton 
                onPress={resetRecording}
                secondary
                accessibilityLabel="Retake video"
                accessibilityRole="button"
                testID="retake-button"
              >
                <ActionButtonText>Retake</ActionButtonText>
              </ActionButton>
              
              <ActionButton 
                onPress={handleSubmit}
                disabled={isUploading}
                accessibilityLabel="Submit video"
                accessibilityRole="button"
                testID="submit-button"
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ActionButtonText>Submit</ActionButtonText>
                )}
              </ActionButton>
            </Animated.View>
          ) : (
            <Animated.View 
              style={styles.buttonsRow}
              entering={FadeIn.duration(300)}
            >
              <CameraButton 
                onPress={toggleCameraType}
                disabled={isRecording}
                accessibilityLabel="Flip camera"
                accessibilityRole="button"
              >
                <CameraButtonText>Flip</CameraButtonText>
              </CameraButton>
              
              <RecordButton 
                onPress={toggleRecording}
                isRecording={isRecording}
                accessibilityLabel={isRecording ? "Stop recording" : "Start recording"}
                accessibilityRole="button"
                testID={isRecording ? "stop-recording-button" : "start-recording-button"}
              >
                <RecordButtonInner isRecording={isRecording} />
              </RecordButton>
              
              <View style={{ width: 50 }} />
            </Animated.View>
          )}
        </ControlsContainer>
      </ContentContainer>
    </Container>
  );
}

// Styled components
const Container = styled(SafeAreaView)<ThemeProps>`
  flex: 1;
  background-color: ${(props: ThemeProps) => props.isDark ? '#121212' : '#ffffff'};
`;

const LoadingContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
`;

const ErrorContainer = styled.View`
  flex: 1;
  justify-content: center;
  align-items: center;
  padding: 20px;
`;

const ErrorText = styled.Text<ThemeProps>`
  font-size: 16px;
  text-align: center;
  color: ${(props: ThemeProps) => props.isDark ? '#FF8A80' : '#F44336'};
`;

const HeaderContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
`;

const BackButton = styled.TouchableOpacity`
  width: 40px;
  height: 40px;
  justify-content: center;
  align-items: center;
`;

const BackButtonText = styled.Text<ThemeProps>`
  font-size: 24px;
  color: ${(props: ThemeProps) => props.isDark ? '#ffffff' : '#000000'};
`;

const Title = styled.Text<ThemeProps>`
  font-size: 20px;
  font-weight: bold;
  color: ${(props: ThemeProps) => props.isDark ? '#ffffff' : '#000000'};
`;

const ContentContainer = styled.View`
  flex: 1;
  padding: 16px;
`;

const InstructionsText = styled.Text<ThemeProps>`
  font-size: 16px;
  text-align: center;
  margin-bottom: 24px;
  color: ${(props: ThemeProps) => props.isDark ? '#cccccc' : '#666666'};
`;

const CameraContainer = styled.View`
  flex: 1;
  overflow: hidden;
  border-radius: 12px;
  position: relative;
  margin-bottom: 24px;
`;

const VideoContainer = styled.View`
  flex: 1;
  overflow: hidden;
  border-radius: 12px;
  position: relative;
  margin-bottom: 24px;
`;

const ThumbnailOverlay = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.3);
`;

const PlayIcon = styled.Text`
  font-size: 50px;
`;

const RecordingIndicator = styled.View`
  position: absolute;
  top: 16px;
  right: 16px;
  background-color: rgba(0, 0, 0, 0.6);
  padding: 8px 12px;
  border-radius: 16px;
  flex-direction: row;
  align-items: center;
`;

const RecordingText = styled.Text`
  color: #ff0000;
  font-size: 14px;
  font-weight: bold;
`;

const ControlsContainer = styled.View`
  padding: 16px 0;
`;

interface RecordButtonProps {
  isRecording: boolean;
}

const RecordButton = styled.TouchableOpacity<RecordButtonProps>`
  width: 70px;
  height: 70px;
  border-radius: 35px;
  background-color: #ffffff;
  justify-content: center;
  align-items: center;
  border: 4px solid ${(props: RecordButtonProps) => props.isRecording ? '#ff0000' : '#FF6B6B'};
`;

const RecordButtonInner = styled.View<RecordButtonProps>`
  width: ${(props: RecordButtonProps) => props.isRecording ? '24px' : '50px'};
  height: ${(props: RecordButtonProps) => props.isRecording ? '24px' : '50px'};
  border-radius: ${(props: RecordButtonProps) => props.isRecording ? '4px' : '25px'};
  background-color: ${(props: RecordButtonProps) => props.isRecording ? '#ff0000' : '#FF6B6B'};
`;

const CameraButton = styled.TouchableOpacity<{ disabled?: boolean }>`
  width: 50px;
  height: 50px;
  border-radius: 25px;
  background-color: rgba(255, 255, 255, 0.3);
  justify-content: center;
  align-items: center;
  opacity: ${(props: { disabled?: boolean }) => props.disabled ? 0.5 : 1};
`;

const CameraButtonText = styled.Text`
  color: #ffffff;
  font-size: 14px;
`;

interface ActionButtonProps {
  secondary?: boolean;
  disabled?: boolean;
}

const ActionButton = styled.TouchableOpacity<ActionButtonProps>`
  flex: 1;
  height: 50px;
  border-radius: 25px;
  background-color: ${(props: ActionButtonProps) => props.secondary ? 'transparent' : '#FF6B6B'};
  justify-content: center;
  align-items: center;
  margin: 0 8px;
  border: ${(props: ActionButtonProps) => props.secondary ? '1px solid #FF6B6B' : 'none'};
  opacity: ${(props: ActionButtonProps) => props.disabled ? 0.7 : 1};
`;

const ActionButtonText = styled.Text`
  color: #ffffff;
  font-size: 16px;
  font-weight: bold;
`;

// Regular StyleSheet for more complex styles
const styles = StyleSheet.create({
  camera: {
    flex: 1,
  },
  preview: {
    flex: 1,
    borderRadius: 12,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
});
