import React from 'react';
import { Modal, FlatList } from 'react-native';
import styled from 'styled-components/native';
import { ThemeProps } from '../../utils/styled-components';
import { Prompt } from '../../constants/prompts';

interface PromptSelectionModalProps {
  isVisible: boolean;
  onClose: () => void;
  availablePrompts: Prompt[];
  onSelectPrompt: (promptId: string) => void;
  isDark: boolean;
}

export default function PromptSelectionModal({
  isVisible,
  onClose,
  availablePrompts,
  onSelectPrompt,
  isDark,
}: PromptSelectionModalProps) {
  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <ModalOverlay>
        <ModalContent isDark={isDark}>
          <ModalHeader>
            <ModalTitle isDark={isDark}>Select a Prompt</ModalTitle>
            <CloseModalButton
              onPress={onClose}
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
                onPress={() => onSelectPrompt(item.id)}
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
  );
}

const ModalOverlay = styled.View`
  flex: 1;
  justify-content: flex-end;
  background-color: rgba(0, 0, 0, 0.5);
`;

const ModalContent = styled.View<ThemeProps>`
  background-color: ${(props: ThemeProps) => (props.isDark ? '#222' : '#fff')};
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  padding: 20px;
  max-height: 70%; 
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
  padding: 8px; 
`;

const CloseModalButtonText = styled.Text`
  color: ${(props: ThemeProps) => (props.isDark ? '#fff' : '#333')};
  font-size: 24px;
  font-weight: bold;
`;

const PromptOption = styled.TouchableOpacity`
  width: 100%;
  padding: 16px;
  border-bottom-width: 1px;
  border-bottom-color: ${(props: ThemeProps) => (props.isDark ? '#444' : '#eee')};
`;

const PromptOptionText = styled.Text<ThemeProps>`
  font-size: 16px;
  color: ${(props: ThemeProps) => (props.isDark ? '#ffffff' : '#333333')};
`;
