import { useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';

interface UseAudioRecordingResult {
  recording: Audio.Recording | null;
  isRecording: boolean;
  recordingUri: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  clearRecording: () => void;
  error: string | null;
}

/**
 * Custom hook for managing audio recording functionality
 */
export function useAudioRecording(): UseAudioRecordingResult {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, [recording]);

  const startRecording = async (): Promise<void> => {
    try {
      setError(null);
      
      // Request permissions
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        setError('Microphone permission is required to record voice notes');
        return;
      }

      // Set audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
      
      // Start recording
      await newRecording.startAsync();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to start recording: ${errorMessage}`);
      console.error('Error starting recording:', err);
    }
  };

  const stopRecording = async (): Promise<void> => {
    if (!recording) return;

    try {
      setError(null);
      
      // Stop recording
      await recording.stopAndUnloadAsync();
      
      // Get the recording URI
      const uri = recording.getURI();
      if (!uri) {
        setError('Failed to get recording URI');
        return;
      }
      
      setRecordingUri(uri);
      setIsRecording(false);
      setRecording(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to stop recording: ${errorMessage}`);
      console.error('Error stopping recording:', err);
    }
  };

  const clearRecording = (): void => {
    setRecordingUri(null);
    setIsRecording(false);
    setRecording(null);
    setError(null);
  };

  return {
    recording,
    isRecording,
    recordingUri,
    startRecording,
    stopRecording,
    clearRecording,
    error
  };
}
