import React from 'react';
import styled from 'styled-components/native';
import { ThemeProps } from '../../utils/styled-components';
import { PromptAnswer } from '../../screens/profile-setup/utils/validation';

interface SavedPromptsListProps {
  promptAnswers: PromptAnswer[];
  onRemovePrompt: (promptId: string) => void;
  isDark: boolean;
}

export default function SavedPromptsList({
  promptAnswers,
  onRemovePrompt,
  isDark,
}: SavedPromptsListProps) {
  if (promptAnswers.length === 0) {
    return null;
  }

  return (
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
              <VoiceNoteText isDark={isDark}>🎤 Voice Note Added</VoiceNoteText>
            </VoiceNoteIndicator>
          )}
          <RemoveButton
            onPress={() => onRemovePrompt(pa.promptId)}
            accessibilityLabel="Remove prompt"
            accessibilityHint="Remove this prompt from your profile"
          >
            <RemoveButtonText>×</RemoveButtonText>
          </RemoveButton>
        </SavedPromptItem>
      ))}
    </SavedPromptsContainer>
  );
}

const SavedPromptsContainer = styled.View<ThemeProps>`
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

const SavedPromptItem = styled.View<ThemeProps>`
  width: 100%;
  padding: 16px;
  border-radius: 8px;
  background-color: ${(props: ThemeProps) => (props.isDark ? '#2c2c2c' : '#f5f5f5')};
  margin-bottom: 12px;
  position: relative; 
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
  margin-bottom: 8px; 
`;

const VoiceNoteIndicator = styled.View<ThemeProps>`
  flex-direction: row;
  align-items: center;
  padding: 8px 0; 
`;

const VoiceNoteText = styled.Text<ThemeProps>`
  font-size: 12px;
  font-style: italic;
  color: ${(props: ThemeProps) => (props.isDark ? '#bbbbbb' : '#666666')};
`;

const RemoveButton = styled.TouchableOpacity`
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 8px;
`;

const RemoveButtonText = styled.Text`
  color: #ff3b30;
  font-size: 18px;
  font-weight: bold;
`;
