import React, { useState, useCallback, useEffect } from 'react';
import { 
  Text, 
  View, 
  Alert, 
  ScrollView, 
  ActivityIndicator,
  Platform,
  useColorScheme
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db, storage } from '../../services/firebase';
import { doc, updateDoc } from '@firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserProfile, updateProfileCompletionStatus } from '../../services/profileService';
import { ref, uploadBytes, getDownloadURL } from '@firebase/storage';
import { Audio } from 'expo-av';
import { AuthNavigationProp } from '../../navigation/types';
import styled from 'styled-components/native';
import { ThemeProps, ButtonProps } from '../../utils/styled-components';
import { validatePromptAnswers, PromptAnswer, SimpleValidationResult } from './utils/validation';
import { useAudioRecording } from '../../hooks/useAudioRecording';
import { PROMPTS, Prompt } from '../../constants/prompts';
import AddPromptForm from '../../components/profile-setup/AddPromptForm';
import SavedPromptsList from '../../components/profile-setup/SavedPromptsList';
import PromptSelectionModal from '../../components/profile-setup/PromptSelectionModal';

// Using PromptAnswer from our validation utility and Prompt from our constants

export default function PromptsSetupScreen() {
  const colorScheme = useColorScheme();
  const navigation = useNavigation<AuthNavigationProp>();
  const isDark = colorScheme === 'dark';
  const { user, profile } = useAuth();
  
  // Prompt selection modal state
  const [isPromptModalVisible, setIsPromptModalVisible] = useState(false);
  const [availablePrompts, setAvailablePrompts] = useState<Prompt[]>([...PROMPTS]);
  
  // Current prompt state
  const [currentPromptId, setCurrentPromptId] = useState<string | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [answerError, setAnswerError] = useState('');
  
  // Use the custom audio recording hook
  const { 
    recording, 
    isRecording, 
    recordingUri, 
    startRecording: startAudioRecording, 
    stopRecording: stopAudioRecording, 
    clearRecording,
    error: recordingError
  } = useAudioRecording();
  
  // Selected prompts with answers
  const [promptAnswers, setPromptAnswers] = useState<PromptAnswer[]>([]);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  
  // Load existing prompt answers if available
  useEffect(() => {
    if (profile?.prompts && profile.prompts.length > 0) {
      // Convert from service format to component format if needed
      const formattedPrompts = profile.prompts.map(prompt => ({
        id: prompt.id,
        promptId: prompt.promptId,
        promptText: prompt.promptText,
        answer: prompt.answer,
        voiceNoteUrl: prompt.voiceNoteUrl
      }));
      setPromptAnswers(formattedPrompts);
    }
  }, [profile]);

  // Filter available prompts to exclude already selected ones
  useEffect(() => {
    const selectedPromptIds = promptAnswers.map(pa => pa.promptId);
    setAvailablePrompts(
      PROMPTS.filter(prompt => !selectedPromptIds.includes(prompt.id))
    );
  }, [promptAnswers]);

  // Display recording errors
  useEffect(() => {
    if (recordingError) {
      Alert.alert('Recording Error', recordingError);
    }
  }, [recordingError]);

  // Wrapper functions for the audio recording hook
  const startRecording = useCallback(async (): Promise<void> => {
    setAnswerError('');
    await startAudioRecording();
  }, [startAudioRecording]);

  const stopRecording = useCallback(async (): Promise<void> => {
    await stopAudioRecording();
  }, [stopAudioRecording]);

  const removePromptAnswer = useCallback((id: string): void => {
    setPromptAnswers(prev => prev.filter(answer => answer.promptId !== id));
  }, []);

  const validatePromptAnswer = useCallback((): boolean => {
    // Check if we have a prompt selected
    if (!currentPromptId) {
      setAnswerError('Please select a prompt');
      return false;
    }

    // Check if we have a text answer or voice recording
    if (!currentAnswer && !recordingUri) {
      setAnswerError('Please provide a text answer or voice recording');
      return false;
    }
    
    // Check if text answer is long enough
    if (currentAnswer && currentAnswer.trim().length < 10) {
      setAnswerError('Text answer must be at least 10 characters');
      return false;
    }

    setAnswerError('');
    return true;
  }, [currentPromptId, currentAnswer, recordingUri]);

  const savePromptAnswer = useCallback(async (): Promise<void> => {
    // Validate prompt answer
    if (!validatePromptAnswer()) {
      return;
    }

    // Set loading state
    setIsLoading(true);

    try {
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        Alert.alert('Error', 'You must be logged in to continue');
        setIsLoading(false);
        return;
      }

      // If we have a voice recording, upload it to Firebase Storage
      let voiceUrl: string | undefined = undefined;
      if (recordingUri) {
        const storageRef = ref(storage, `profiles/${userId}/prompts/${currentPromptId}-voice`);
        
        // Upload the file
        const response = await fetch(recordingUri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        
        // Get download URL
        voiceUrl = await getDownloadURL(storageRef);
      }

      // Get prompt text from available prompts
      const promptText = PROMPTS.find(p => p.id === currentPromptId)?.text || '';

      // Create new prompt answer
      const newPromptAnswer: PromptAnswer = {
        id: Date.now().toString(),
        promptId: currentPromptId!,
        promptText,
        answer: currentAnswer,
        voiceNoteUrl: voiceUrl,
      };

      // Add to answers
      setPromptAnswers(prev => [...prev, newPromptAnswer]);

      // Clear current answer
      setCurrentPromptId(null);
      setCurrentAnswer('');
      if (recordingUri) {
        clearRecording();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error saving prompt answer:', error);
      Alert.alert('Error', `Failed to save prompt answer: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [validatePromptAnswer, recordingUri, currentPromptId, currentAnswer, clearRecording]);

  const handleSelectPrompt = (promptId: string) => {
    setCurrentPromptId(promptId);
    setIsPromptModalVisible(false);
  };

  const validateAllPrompts = useCallback((): SimpleValidationResult => {
    return validatePromptAnswers(promptAnswers);
  }, [promptAnswers]);

  const handleFinish = async (): Promise<void> => {
    try {
      // Validate prompt answers
      const validation = validatePromptAnswers(promptAnswers);
      if (!validation.isValid) {
        Alert.alert('Error', validation.error || 'Please add at least 2 prompt answers');
        return;
      }

      setIsLoading(true);

      const userId = user?.uid;
      
      if (!userId) {
        Alert.alert('Error', 'You must be logged in to continue');
        setIsLoading(false);
        return;
      }

      // Format the prompts data for storage
      const promptsData = promptAnswers.map(answer => {
        const prompt = PROMPTS.find(p => p.id === answer.promptId);
        return {
          id: answer.id,
          promptId: answer.promptId,
          promptText: prompt ? prompt.text : answer.promptText,
          answer: answer.answer || '',
          voiceNoteUrl: answer.voiceNoteUrl || '',
        };
      });

      // Update profile in Firestore
      await updateUserProfile(userId, {
        prompts: promptsData,
        profileComplete: true, // Mark profile as complete
      });
      
      // Update profile completion status
      await updateProfileCompletionStatus(userId);

      // Navigate to main app
      navigation.navigate('MainFeed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error saving prompts:', error);
      Alert.alert(
        'Error',
        `Failed to save your prompts: ${errorMessage}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container isDark={isDark}>
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <Header>
          <HeaderText isDark={isDark}>Prompts Setup</HeaderText>
          <SubHeaderText isDark={isDark}>
            Choose 3 prompts and share a bit about yourself
          </SubHeaderText>
        </Header>

        <ContentContainer isDark={isDark}>
          {/* Saved prompt answers */}
          <SavedPromptsList
            promptAnswers={promptAnswers}
            onRemovePrompt={removePromptAnswer}
            isDark={isDark}
          />

          {/* Add new prompt section */}
          {promptAnswers.length < 3 && (
            <AddPromptForm
              isDark={isDark}
              currentPromptId={currentPromptId}
              currentAnswer={currentAnswer}
              onAnswerChange={setCurrentAnswer}
              answerError={answerError}
              onSelectPromptClick={() => setIsPromptModalVisible(true)}
              prompts={PROMPTS}
              isRecording={isRecording}
              recordingUri={recordingUri}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              onClearRecording={clearRecording}
              onSavePrompt={savePromptAnswer}
              isLoading={isLoading}
              promptAnswersCount={promptAnswers.length}
            />
          )}

          <FinishButton 
            onPress={handleFinish}
            disabled={isLoading || promptAnswers.length !== 3}
            accessibilityRole="button"
            accessibilityLabel="Finish setup"
            accessibilityHint="Complete the profile setup process"
            accessibilityState={{ disabled: isLoading || promptAnswers.length !== 3 }}
            testID="finish-button"
          >
            {isLoading && currentPromptId === null ? ( // Only show "Finishing" if not saving individual prompt
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ButtonText>Finish Setup</ButtonText>
            )}
          </FinishButton>
        
        <PromptRequiredText isDark={isDark}>
          {promptAnswers.length}/3 prompts added {promptAnswers.length < 3 ? '(3 required)' : ''}
        </PromptRequiredText>
      </ContentContainer>
    </ScrollView>

    {/* Prompt Selection Modal */}
    <PromptSelectionModal
      isVisible={isPromptModalVisible}
      onClose={() => setIsPromptModalVisible(false)}
      availablePrompts={availablePrompts}
      onSelectPrompt={handleSelectPrompt}
      isDark={isDark}
    />
  </Container>
  );
}

// Styled components
const Container = styled(SafeAreaView)<ThemeProps>`
  flex: 1;
  background-color: ${(props: ThemeProps) => (props.isDark ? '#121212' : '#ffffff')};
`;

const Header = styled.View<ThemeProps>`
  padding: 20px;
  align-items: center;
`;

const HeaderText = styled.Text<ThemeProps>`
  font-size: 24px;
  font-weight: bold;
  color: ${(props: ThemeProps) => (props.isDark ? '#ffffff' : '#333333')};
  margin-bottom: 8px;
`;

const SubHeaderText = styled.Text<ThemeProps>`
  font-size: 16px;
  color: ${(props: ThemeProps) => (props.isDark ? '#bbbbbb' : '#666666')};
  text-align: center;
`;

const ContentContainer = styled.View<ThemeProps>`
  flex: 1;
  padding: 20px;
  align-items: center;
`;



const FinishButton = styled.TouchableOpacity<ButtonProps>`
  width: 100%;
  padding: 16px;
  border-radius: 8px;
  background-color: #FF6B6B;
  align-items: center;
  opacity: ${(props: ButtonProps) => (props.disabled ? 0.7 : 1)};
  margin-top: 20px;
`;

const ButtonText = styled.Text<ThemeProps>`
  color: white;
  font-size: 16px;
  font-weight: bold;
`;

const PromptRequiredText = styled.Text<ThemeProps>`
  font-size: 14px;
  color: ${(props: ThemeProps) => (props.isDark ? '#bbbbbb' : '#666666')};
  margin-top: 10px;
  text-align: center;
`;


