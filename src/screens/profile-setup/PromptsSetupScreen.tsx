import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  useColorScheme, 
  View, 
  Alert, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { auth, db, storage } from '../../services/firebase';
import { doc, updateDoc } from '@firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { updateUserProfile, updateProfileCompletionStatus } from '../../services/profileService';
import { ref, uploadBytes, getDownloadURL } from '@firebase/storage';
import { AuthNavigationProp } from '../../navigation/types';
import styled from 'styled-components/native';
import { 
  ThemeProps, 
  ButtonProps, 
  AccessibilityProps, 
  ProgressBarProps, 
  ValidationProps 
} from '../../utils/styled-components';
import { validatePromptAnswers, PromptAnswer, SimpleValidationResult } from './utils/validation';
import { useAudioRecording } from '../../hooks/useAudioRecording';
import { PROMPTS, Prompt } from '../../constants/prompts';

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
          {promptAnswers.length > 0 && (
            <SavedPromptsContainer isDark={isDark}>
              <SectionTitle isDark={isDark}>Your Prompts</SectionTitle>
              {promptAnswers.map((pa) => (
                <SavedPromptItem 
                  key={pa.id}
                  testID={`saved-prompt-${pa.id}`}
                  isDark={isDark}
                >
                  <SavedPromptText isDark={isDark}>{pa.promptText}</SavedPromptText>
                  <SavedAnswerText isDark={isDark}>{pa.answer}</SavedAnswerText>
                  {pa.voiceNoteUrl && (
                    <VoiceNoteIndicator isDark={isDark} testID={`voice-note-preview-${pa.promptId}`}>
                      <VoiceNoteText isDark={isDark}>Voice Note Added</VoiceNoteText>
                    </VoiceNoteIndicator>
                  )}
                  <RemoveButton 
                    onPress={() => removePromptAnswer(pa.promptId)}
                    accessibilityLabel="Remove prompt"
                    accessibilityHint="Remove this prompt from your profile"
                  >
                    <RemoveButtonText>Remove</RemoveButtonText>
                  </RemoveButton>
                </SavedPromptItem>
              ))}
            </SavedPromptsContainer>
          )}

          {/* Add new prompt section */}
          {promptAnswers.length < 3 && (
            <AddPromptContainer isDark={isDark}>
              <SectionTitle isDark={isDark}>
                {promptAnswers.length === 0 
                  ? 'Add Your First Prompt' 
                  : `Add ${promptAnswers.length === 1 ? 'Two' : 'One'} More Prompt${promptAnswers.length === 1 ? 's' : ''}`}
              </SectionTitle>
              
              {!currentPromptId ? (
                <SelectPromptButton 
                  onPress={() => setIsPromptModalVisible(true)}
                  testID="select-prompt-button"
                  accessibilityRole="button"
                  accessibilityLabel="Select a prompt"
                  accessibilityHint="Choose a prompt to answer for your profile"
                >
                  <SelectPromptText>Select a Prompt</SelectPromptText>
                </SelectPromptButton>
              ) : (
                <PromptInputContainer isDark={isDark}>
                  <PromptText isDark={isDark}>
                    {PROMPTS.find(p => p.id === currentPromptId)?.text}
                  </PromptText>
                  
                  <PromptAnswerInput 
                    isDark={isDark}
                    value={currentAnswer}
                    onChangeText={setCurrentAnswer}
                    placeholder="Your answer (minimum 10 characters)"
                    placeholderTextColor="#999"
                    multiline
                    testID={`prompt-answer-input-${currentPromptId}`}
                    accessibilityLabel="Prompt answer input"
                  />
                  {answerError ? <ErrorText isDark={isDark}>{answerError}</ErrorText> : null}
                  
                  <PromptOptionsRow isDark={isDark}>
                    <VoiceRecordingContainer isDark={isDark}>
                      {!isRecording && !recordingUri ? (
                        <RecordButton 
                          onPress={startRecording}
                          testID={`start-recording-button-${currentPromptId}`}
                          accessibilityRole="button"
                          accessibilityLabel="Record voice answer"
                          accessibilityHint="Start recording a voice answer for this prompt"
                          isDark={isDark}
                        >
                          <RecordButtonIcon isDark={isDark}>🎤</RecordButtonIcon>
                          <RecordButtonText isDark={isDark}>Add Voice</RecordButtonText>
                        </RecordButton>
                      ) : isRecording ? (
                        <StopRecordingButton 
                          onPress={stopRecording}
                          testID={`stop-recording-button-${currentPromptId}`}
                          accessibilityRole="button"
                          accessibilityLabel="Stop recording"
                          accessibilityHint="Stop the current voice recording"
                          isDark={isDark}
                        >
                          <StopRecordingButtonText isDark={isDark}>Stop Recording</StopRecordingButtonText>
                        </StopRecordingButton>
                      ) : (
                        <VoiceNotePreview 
                          testID={`voice-note-preview-${currentPromptId}`}
                          accessibilityLabel="Voice note recorded"
                          isDark={isDark}
                        >
                          <VoiceNotePreviewText isDark={isDark}>Voice Note Recorded</VoiceNotePreviewText>
                          <RemoveVoiceButton 
                            onPress={clearRecording}
                            accessibilityRole="button"
                            accessibilityLabel="Remove voice recording"
                            accessibilityHint="Delete the current voice recording"
                            isDark={isDark}
                          >
                            <RemoveVoiceButtonText isDark={isDark}>×</RemoveVoiceButtonText>
                          </RemoveVoiceButton>
                        </VoiceNotePreview>
                      )}
                    </VoiceRecordingContainer>
                    
                    <SavePromptButton 
                      onPress={savePromptAnswer}
                      disabled={!currentPromptId || (!currentAnswer && !recordingUri) || isLoading}
                      testID="save-prompt-button"
                      accessibilityRole="button"
                      accessibilityLabel="Save prompt answer"
                      accessibilityHint="Save your answer to this prompt"
                      accessibilityState={{ disabled: !currentPromptId || (!currentAnswer && !recordingUri) || isLoading }}
                    >
                      <SavePromptButtonText isDark={isDark}>Save</SavePromptButtonText>
                    </SavePromptButton>
                  </PromptOptionsRow>
                </PromptInputContainer>
              )}
            </AddPromptContainer>
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
          {isLoading ? (
            <ButtonText>Finishing Setup...</ButtonText>
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
    <Modal
      visible={isPromptModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setIsPromptModalVisible(false)}
    >
      <ModalOverlay>
        <ModalContent isDark={isDark}>
          <ModalHeader>
            <ModalTitle isDark={isDark}>Select a Prompt</ModalTitle>
            <CloseModalButton 
              onPress={() => setIsPromptModalVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Close modal"
              accessibilityHint="Close the prompt selection modal"
            >
              <CloseModalButtonText>×</CloseModalButtonText>
            </CloseModalButton>
          </ModalHeader>
          
          <FlatList
            data={availablePrompts}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <PromptOption 
                onPress={() => {
                  setCurrentPromptId(item.id);
                  setIsPromptModalVisible(false);
                }}
                testID={`prompt-option-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Select prompt: ${item.text}`}
              >
                <PromptOptionText isDark={isDark}>{item.text}</PromptOptionText>
              </PromptOption>
            )}
            style={{ width: '100%' }}
          />
        </ModalContent>
      </ModalOverlay>
    </Modal>
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

const SectionTitle = styled.Text<ThemeProps>`
  font-size: 18px;
  font-weight: bold;
  color: ${(props: ThemeProps) => (props.isDark ? '#ffffff' : '#333333')};
  margin-bottom: 12px;
  align-self: flex-start;
`;

const SavedPromptsContainer = styled.View<ThemeProps>`
  width: 100%;
  margin-bottom: 20px;
`;

const SavedPromptItem = styled.View<ThemeProps>`
  width: 100%;
  padding: 16px;
  border-radius: 8px;
  background-color: ${(props: ThemeProps) => (props.isDark ? '#2c2c2c' : '#f5f5f5')};
  margin-bottom: 12px;
`;

const SavedPromptText = styled.Text<ThemeProps>`
  font-size: 16px;
  font-weight: bold;
  color: ${(props: ThemeProps) => (props.isDark ? '#ffffff' : '#333333')};
  margin-bottom: 8px;
`;

const SavedAnswerText = styled.Text<ThemeProps>`
  font-size: 14px;
  color: ${(props: ThemeProps) => (props.isDark ? '#dddddd' : '#666666')};
`;

const VoiceNoteIndicator = styled.View<ThemeProps>`
  flex-direction: row;
  align-items: center;
  padding: 8px;
  border-radius: 4px;
  background-color: ${(props: ThemeProps) => (props.isDark ? '#3a3a3a' : '#e5e5e5')};
  margin-bottom: 12px;
`;

const VoiceNoteText = styled.Text<ThemeProps>`
  font-size: 12px;
  color: ${(props: ThemeProps) => (props.isDark ? '#bbbbbb' : '#666666')};
`;

const RemoveButton = styled.TouchableOpacity<ThemeProps>`
  position: absolute;
  top: 10px;
  right: 10px;
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background-color: #ff3b30;
  justify-content: center;
  align-items: center;
`;

const RemoveButtonText = styled.Text<ThemeProps>`
  color: white;
  font-size: 14px;
  font-weight: bold;
`;

const AddPromptContainer = styled.View<ThemeProps>`
  width: 100%;
  margin-bottom: 20px;
`;

const SelectPromptButton = styled.TouchableOpacity<ThemeProps>`
  width: 100%;
  padding: 16px;
  border-radius: 8px;
  background-color: #FF6B6B;
  align-items: center;
`;

const SelectPromptText = styled.Text<ThemeProps>`
  color: white;
  font-size: 16px;
  font-weight: bold;
`;

const PromptInputContainer = styled.View<ThemeProps>`
  width: 100%;
`;

const PromptText = styled.Text<ThemeProps>`
  font-size: 16px;
  font-weight: bold;
  color: ${(props: ThemeProps) => (props.isDark ? '#ffffff' : '#333333')};
  margin-bottom: 12px;
`;

const PromptAnswerInput = styled.TextInput<ThemeProps>`
  width: 100%;
  padding: 16px;
  border-radius: 8px;
  min-height: 120px;
  background-color: ${(props: ThemeProps) => (props.isDark ? '#2c2c2c' : '#f5f5f5')};
  color: ${(props: ThemeProps) => (props.isDark ? '#ffffff' : '#000000')};
  border: 1px solid ${(props: ThemeProps) => (props.isDark ? '#444' : '#ddd')};
  margin-bottom: 8px;
  text-align-vertical: top;
`;

const ErrorText = styled.Text<ThemeProps>`
  color: ${(props: ThemeProps) => (props.isDark ? '#ff3b30' : '#ff3b30')};
  font-size: 12px;
  margin-bottom: 8px;
`;

const ModalOverlay = styled.View<ThemeProps>`
  flex: 1;
  justify-content: flex-end;
  background-color: rgba(0, 0, 0, 0.5);
`;

const ModalContent = styled.View<ThemeProps>`
  background-color: ${(props: ThemeProps) => (props.isDark ? '#222' : '#fff')};
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  padding: 20px;
`;

const PromptOptionsRow = styled.View<ThemeProps>`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
`;

const VoiceRecordingContainer = styled.View<ThemeProps>`
  flex: 1;
  margin-right: 10px;
`;

const RecordButton = styled.TouchableOpacity<ThemeProps>`
  flex-direction: row;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  background-color: #444;
`;

const RecordButtonIcon = styled.Text<ThemeProps>`
  font-size: 16px;
  margin-right: 6px;
`;

const RecordButtonText = styled.Text<ThemeProps>`
  color: white;
  font-size: 14px;
`;

const StopRecordingButton = styled.TouchableOpacity<ThemeProps>`
  padding: 10px;
  border-radius: 8px;
  background-color: #ff3b30;
`;

const StopRecordingButtonText = styled.Text<ThemeProps>`
  color: white;
  font-size: 14px;
  text-align: center;
`;

const VoiceNotePreview = styled.View<ThemeProps>`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  border-radius: 8px;
  background-color: #444;
`;

const VoiceNotePreviewText = styled.Text<ThemeProps>`
  color: white;
  font-size: 14px;
`;

const RemoveVoiceButton = styled.TouchableOpacity<ThemeProps>`
  width: 20px;
  height: 20px;
  border-radius: 10px;
  background-color: #ff3b30;
  justify-content: center;
  align-items: center;
`;

const RemoveVoiceButtonText = styled.Text<ThemeProps>`
  color: white;
  font-size: 12px;
  font-weight: bold;
`;

const SavePromptButton = styled.TouchableOpacity<ButtonProps>`
  padding: 10px 16px;
  border-radius: 8px;
  background-color: #FF6B6B;
  opacity: ${(props: ButtonProps) => (props.disabled ? 0.7 : 1)};
`;

const SavePromptButtonText = styled.Text<ThemeProps>`
  color: white;
  font-size: 14px;
  font-weight: bold;
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

const ModalHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 20px;
`;

const ModalTitle = styled.Text<ThemeProps>`
  font-size: 20px;
  font-weight: bold;
  color: ${(props: ThemeProps) => (props.isDark ? '#ffffff' : '#333333')};
`;

const CloseModalButton = styled.TouchableOpacity`
  width: 30px;
  height: 30px;
  border-radius: 15px;
  background-color: #444;
  justify-content: center;
  align-items: center;
`;

const CloseModalButtonText = styled.Text`
  color: white;
  font-size: 18px;
  font-weight: bold;
`;

const PromptOption = styled.TouchableOpacity`
  width: 100%;
  padding: 16px;
  border-bottom-width: 1px;
  border-bottom-color: #444;
`;

const PromptOptionText = styled.Text<ThemeProps>`
  font-size: 16px;
  color: ${(props: ThemeProps) => (props.isDark ? '#ffffff' : '#333333')};
`;
