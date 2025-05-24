import React from 'react';
import styled from 'styled-components/native';
import { ThemeProps, ButtonProps } from '../../utils/styled-components';
import { Prompt } from '../../constants/prompts';

interface AddPromptFormProps {
  isDark: boolean;
  currentPromptId: string | null;
  currentAnswer: string;
  onAnswerChange: (text: string) => void;
  answerError: string;
  onSelectPromptClick: () => void;
  prompts: Prompt[]; // Full list of prompts to find text
  isRecording: boolean;
  recordingUri: string | null;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => Promise<void>;
  onClearRecording: () => void;
  onSavePrompt: () => Promise<void>;
  isLoading: boolean;
  promptAnswersCount: number;
}

export default function AddPromptForm({
  isDark,
  currentPromptId,
  currentAnswer,
  onAnswerChange,
  answerError,
  onSelectPromptClick,
  prompts,
  isRecording,
  recordingUri,
  onStartRecording,
  onStopRecording,
  onClearRecording,
  onSavePrompt,
  isLoading,
  promptAnswersCount,
}: AddPromptFormProps) {
  const selectedPromptText = prompts.find(p => p.id === currentPromptId)?.text;

  const getTitle = () => {
    if (promptAnswersCount === 0) return 'Add Your First Prompt';
    if (promptAnswersCount === 1) return 'Add Two More Prompts';
    if (promptAnswersCount === 2) return 'Add One More Prompt';
    return '';
  };

  return (
    <AddPromptContainer isDark={isDark}>
      <SectionTitle isDark={isDark}>{getTitle()}</SectionTitle>

      {!currentPromptId ? (
        <SelectPromptButton
          onPress={onSelectPromptClick}
          testID="select-prompt-button"
          accessibilityRole="button"
          accessibilityLabel="Select a prompt"
          accessibilityHint="Choose a prompt to answer for your profile"
        >
          <SelectPromptText>Select a Prompt</SelectPromptText>
        </SelectPromptButton>
      ) : (
        <PromptInputContainer isDark={isDark}>
          <PromptText isDark={isDark}>{selectedPromptText}</PromptText>

          <PromptAnswerInput
            isDark={isDark}
            value={currentAnswer}
            onChangeText={onAnswerChange}
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
                  onPress={onStartRecording}
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
                  onPress={onStopRecording}
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
                    onPress={onClearRecording}
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
              onPress={onSavePrompt}
              disabled={isLoading || !currentPromptId || (!currentAnswer.trim() && !recordingUri)}
              testID="save-prompt-button"
              accessibilityRole="button"
              accessibilityLabel="Save prompt answer"
              accessibilityHint="Save your answer to this prompt"
              accessibilityState={{ disabled: isLoading || !currentPromptId || (!currentAnswer.trim() && !recordingUri) }}
            >
              <SavePromptButtonText isDark={isDark}>Save</SavePromptButtonText>
            </SavePromptButton>
          </PromptOptionsRow>
        </PromptInputContainer>
      )}
    </AddPromptContainer>
  );
}

const AddPromptContainer = styled.View<ThemeProps>`
  width: 100%;
  margin-bottom: 20px;
`;

const SectionTitle = styled.Text<ThemeProps>`
  font-size: 18px;
  font-weight: bold;
  color: ${(props: ThemeProps) => (props.isDark ? '#ffffff' : '#333333')};
  margin-bottom: 12px;
  align-self: flex-start;
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
  background-color: ${(props: ThemeProps) => (props.isDark ? '#444' : '#e0e0e0')};
`;

const RecordButtonIcon = styled.Text<ThemeProps>`
  font-size: 16px;
  margin-right: 6px;
  color: ${(props: ThemeProps) => (props.isDark ? '#fff' : '#333')};
`;

const RecordButtonText = styled.Text<ThemeProps>`
  color: ${(props: ThemeProps) => (props.isDark ? '#fff' : '#333')};
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
  background-color: ${(props: ThemeProps) => (props.isDark ? '#444' : '#e0e0e0')};
`;

const VoiceNotePreviewText = styled.Text<ThemeProps>`
  color: ${(props: ThemeProps) => (props.isDark ? '#fff' : '#333')};
  font-size: 14px;
`;

const RemoveVoiceButton = styled.TouchableOpacity<ThemeProps>`
  width: 20px;
  height: 20px;
  border-radius: 10px;
  background-color: #ff3b30;
  justify-content: center;
  align-items: center;
  margin-left: 8px;
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
