import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, FlatList, Alert, Modal } from 'react-native';
import styled from 'styled-components/native';
import { FontAwesome } from '@expo/vector-icons';
import { PromptAnswer } from '../../../../services/profileService';
import { validatePromptAnswer, validatePrompts } from '../../../../utils/validators/profileValidators';

// Predefined prompts for users to choose from
const AVAILABLE_PROMPTS = [
  { id: 'p1', text: 'My favorite travel story is...' },
  { id: 'p2', text: 'Two truths and a lie...' },
  { id: 'p3', text: 'The way to my heart is...' },
  { id: 'p4', text: 'My most controversial opinion is...' },
  { id: 'p5', text: 'My simple pleasures are...' },
  { id: 'p6', text: 'I get way too excited about...' },
  { id: 'p7', text: 'My childhood crush was...' },
  { id: 'p8', text: 'My go-to karaoke song is...' },
  { id: 'p9', text: 'The last thing I learned was...' },
  { id: 'p10', text: 'My typical Sunday is...' }
];

interface PromptEditorProps {
  initialPrompts?: PromptAnswer[];
  onPromptsChanged?: (prompts: PromptAnswer[]) => void;
  isDark?: boolean;
  maxPrompts?: number;
}

export function PromptEditor({
  initialPrompts = [],
  onPromptsChanged,
  isDark = false,
  maxPrompts = 3
}: PromptEditorProps) {
  const [prompts, setPrompts] = useState<PromptAnswer[]>(initialPrompts);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Only notify parent on internal prompt changes, not when props change
  // Using JSON.stringify to do a deep comparison to prevent unnecessary updates
  const promptsJSON = JSON.stringify(prompts);
  useEffect(() => {
    // Skip the initial render to prevent an update loop
    const isInitialRender = JSON.stringify(initialPrompts) === promptsJSON;
    if (onPromptsChanged && !isInitialRender) {
      onPromptsChanged(prompts);
    }
  }, [promptsJSON, onPromptsChanged]);
  
  // Filter available prompts that haven't been used yet
  const getAvailablePrompts = () => {
    const usedPromptIds = prompts.map(p => p.promptId);
    return AVAILABLE_PROMPTS.filter(p => !usedPromptIds.includes(p.id));
  };
  
  // Handle adding a new prompt
  const handleAddPrompt = () => {
    if (prompts.length >= maxPrompts) {
      Alert.alert('Limit Reached', `You can only add a maximum of ${maxPrompts} prompts.`);
      return;
    }
    
    setIsModalVisible(true);
  };
  
  // Handle selecting a prompt from the modal
  const handleSelectPrompt = (promptId: string) => {
    setSelectedPromptId(promptId);
    setIsModalVisible(false);
    
    // Clear any previous error
    setError(null);
  };
  
  // Handle saving a prompt answer
  const handleSavePrompt = () => {
    if (!selectedPromptId || !currentAnswer.trim()) {
      setError('Please select a prompt and provide an answer');
      return;
    }
    
    if (!validatePromptAnswer(currentAnswer)) {
      setError('Answer must be at least 10 characters');
      return;
    }
    
    const selectedPrompt = AVAILABLE_PROMPTS.find(p => p.id === selectedPromptId);
    if (!selectedPrompt) {
      setError('Invalid prompt selected');
      return;
    }
    
    // Create new prompt answer
    const newPrompt: PromptAnswer = {
      id: `prompt_${Date.now()}`,
      promptId: selectedPromptId,
      promptText: selectedPrompt.text,
      answer: currentAnswer
    };
    
    // Add to prompts array
    setPrompts(prev => [...prev, newPrompt]);
    
    // Reset form
    setSelectedPromptId(null);
    setCurrentAnswer('');
    setError(null);
  };
  
  // Handle editing a prompt answer
  const handleEditPrompt = (promptId: string) => {
    const prompt = prompts.find(p => p.id === promptId);
    if (!prompt) return;
    
    setSelectedPromptId(prompt.promptId);
    setCurrentAnswer(prompt.answer);
    
    // Remove the prompt from the list (will be re-added when saved)
    setPrompts(prev => prev.filter(p => p.id !== promptId));
  };
  
  // Handle removing a prompt answer
  const handleRemovePrompt = (promptId: string) => {
    // Check if removing this prompt would go below minimum
    if (prompts.length <= 3) {
      Alert.alert(
        'Minimum Prompts Required',
        'You must have at least 3 prompts on your profile. Please add another prompt before removing this one.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    Alert.alert(
      'Remove Prompt',
      'Are you sure you want to remove this prompt?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive', 
          onPress: () => {
            setPrompts(prev => prev.filter(p => p.id !== promptId));
          }
        }
      ]
    );
  };
  
  // Render a prompt item
  const renderPromptItem = ({ item }: { item: PromptAnswer }) => (
    <PromptContainer isDark={isDark}>
      <PromptQuestion isDark={isDark}>{item.promptText}</PromptQuestion>
      <StyledPromptAnswer isDark={isDark}>{item.answer}</StyledPromptAnswer>
      
      <PromptActions>
        <ActionButton 
          onPress={() => handleEditPrompt(item.id)}
          accessibilityLabel="Edit prompt"
          accessibilityRole="button"
          accessibilityHint="Edit this prompt answer"
          testID={`edit-prompt-${item.id}`}
        >
          <FontAwesome name="pencil" size={16} color={isDark ? "#FFFFFF" : "#333333"} />
        </ActionButton>
        
        <ActionButton 
          onPress={() => handleRemovePrompt(item.id)}
          accessibilityLabel="Remove prompt"
          accessibilityRole="button"
          accessibilityHint="Remove this prompt from your profile"
          testID={`remove-prompt-${item.id}`}
        >
          <FontAwesome name="trash" size={16} color="#FF3B30" />
        </ActionButton>
      </PromptActions>
    </PromptContainer>
  );
  
  // Render the prompt selection modal
  const renderPromptModal = () => {
    const availablePrompts = getAvailablePrompts();
    
    return (
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <ModalOverlay>
          <ModalContent isDark={isDark}>
            <ModalHeader>
              <ModalTitle isDark={isDark}>Select a Prompt</ModalTitle>
              <CloseButton 
                onPress={() => setIsModalVisible(false)}
                accessibilityLabel="Close modal"
                accessibilityRole="button"
                testID="close-prompt-modal-button"
              >
                <FontAwesome name="times" size={20} color={isDark ? "#FFFFFF" : "#333333"} />
              </CloseButton>
            </ModalHeader>
            <View style={{ maxHeight: '80%' }}>
              {availablePrompts.length > 0 ? (
                availablePrompts.map(item => (
                  <PromptOption 
                    key={item.id}
                    onPress={() => handleSelectPrompt(item.id)}
                    accessibilityLabel={`Select prompt: ${item.text}`}
                    accessibilityRole="button"
                    accessibilityHint="Select this prompt to answer"
                    testID={`select-prompt-${item.id}`}
                    isDark={isDark}
                  >
                    <PromptOptionText isDark={isDark}>{item.text}</PromptOptionText>
                  </PromptOption>
                ))
              ) : (
                <EmptyText isDark={isDark}>No more prompts available</EmptyText>
              )}
            </View>
          </ModalContent>
        </ModalOverlay>
      </Modal>
    );
  };
  
  return (
    <Container>
      {/* Minimum prompts indicator */}
      {prompts.length < 3 && (
        <MinimumPromptsText isDark={isDark}>
          {prompts.length === 0 
            ? 'Add at least 3 prompts to complete your profile'
            : `Add ${3 - prompts.length} more prompt${3 - prompts.length > 1 ? 's' : ''} (minimum 3 required)`
          }
        </MinimumPromptsText>
      )}
      
      {/* Existing prompts - directly render instead of using FlatList */}
      {prompts.length > 0 ? (
        prompts.map(item => (
          <React.Fragment key={item.id}>
            {renderPromptItem({ item })}
          </React.Fragment>
        ))
      ) : (
        <EmptyText isDark={isDark}>No prompts added yet</EmptyText>
      )}
      
      {/* Prompt editor */}
      {selectedPromptId && (
        <EditorContainer isDark={isDark}>
          <PromptQuestion isDark={isDark}>
            {AVAILABLE_PROMPTS.find(p => p.id === selectedPromptId)?.text}
          </PromptQuestion>
          <AnswerInput
            isDark={isDark}
            value={currentAnswer}
            onChangeText={setCurrentAnswer}
            multiline
            placeholder="Your answer..."
            placeholderTextColor={isDark ? '#777777' : '#999999'}
            textAlignVertical="top"
            accessibilityLabel="Answer input"
            testID="prompt-answer-input"
          />
          {error && <ErrorText>{error}</ErrorText>}
          <SaveButton 
            onPress={handleSavePrompt}
            disabled={!currentAnswer.trim()}
            accessibilityLabel="Save prompt"
            accessibilityRole="button"
            testID="save-prompt-button"
          >
            <SaveButtonText>Save</SaveButtonText>
          </SaveButton>
        </EditorContainer>
      )}
      
      {/* Add prompt button - only show if not at the limit */}
      {!selectedPromptId && prompts.length < maxPrompts && (
        <AddButton 
          onPress={handleAddPrompt}
          isDark={isDark}
          accessibilityLabel="Add prompt"
          accessibilityRole="button"
          accessibilityHint="Add a new prompt to your profile"
          testID="add-prompt-button"
        >
          <FontAwesome name="plus" size={16} color={isDark ? "#FFFFFF" : "#FFFFFF"} />
          <AddButtonText>Add Prompt</AddButtonText>
        </AddButton>
      )}
      
      {/* Prompt selection modal */}
      {renderPromptModal()}
    </Container>
  );
}

// Define theme interface for styled components
interface ThemeProps {
  isDark?: boolean;
}

// Styled components
const Container = styled.View`
  width: 100%;
`;

const PromptContainer = styled.View<ThemeProps>`
  background-color: ${(props: ThemeProps) => props.isDark ? '#2C2C2E' : '#F5F5F5'};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
`;

const PromptQuestion = styled.Text<ThemeProps>`
  font-size: 16px;
  font-weight: bold;
  color: ${(props: ThemeProps) => props.isDark ? '#FFFFFF' : '#333333'};
  margin-bottom: 8px;
`;

// Styled component for prompt answer text
const StyledPromptAnswer = styled.Text<ThemeProps>`
  font-size: 14px;
  color: ${(props: ThemeProps) => props.isDark ? '#CCCCCC' : '#555555'};
  line-height: 20px;
`;

const PromptActions = styled.View`
  flex-direction: row;
  justify-content: flex-end;
  margin-top: 12px;
`;

const ActionButton = styled.TouchableOpacity`
  padding: 8px;
  margin-left: 8px;
`;

const EditorContainer = styled.View<ThemeProps>`
  background-color: ${(props: ThemeProps) => props.isDark ? '#2C2C2E' : '#F5F5F5'};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
`;

const AnswerInput = styled.TextInput<ThemeProps>`
  background-color: ${(props: ThemeProps) => props.isDark ? '#1C1C1E' : '#FFFFFF'};
  color: ${(props: ThemeProps) => props.isDark ? '#FFFFFF' : '#333333'};
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
  min-height: 100px;
  border: 1px solid ${(props: ThemeProps) => props.isDark ? '#444444' : '#DDDDDD'};
`;

interface SaveButtonProps {
  disabled?: boolean;
}

const SaveButton = styled.TouchableOpacity<SaveButtonProps>`
  background-color: #FF6B6B;
  padding: 12px;
  border-radius: 8px;
  align-items: center;
  opacity: ${(props: SaveButtonProps) => props.disabled ? 0.5 : 1};
`;

const SaveButtonText = styled.Text`
  color: #FFFFFF;
  font-weight: bold;
`;

const AddButton = styled.TouchableOpacity<ThemeProps>`
  background-color: #FF6B6B;
  padding: 12px;
  border-radius: 8px;
  flex-direction: row;
  justify-content: center;
  align-items: center;
`;

const AddButtonText = styled.Text`
  color: #FFFFFF;
  font-weight: bold;
  margin-left: 8px;
`;

const ErrorText = styled.Text`
  color: #FF3B30;
  font-size: 14px;
  margin-top: 8px;
  text-align: center;
`;

const ModalOverlay = styled.View`
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: center;
  align-items: center;
`;

const ModalContent = styled.View<ThemeProps>`
  width: 90%;
  max-height: 80%;
  background-color: ${(props: ThemeProps) => props.isDark ? '#121212' : '#FFFFFF'};
  border-radius: 12px;
  padding: 16px;
`;

const ModalHeader = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const ModalTitle = styled.Text<ThemeProps>`
  font-size: 18px;
  font-weight: bold;
  color: ${(props: ThemeProps) => props.isDark ? '#FFFFFF' : '#333333'};
`;

const CloseButton = styled.TouchableOpacity`
  padding: 8px;
`;

const PromptOption = styled.TouchableOpacity<ThemeProps>`
  padding: 16px;
  border-bottom-width: 1px;
  border-bottom-color: ${(props: ThemeProps) => props.isDark ? '#333333' : '#EEEEEE'};
`;

const PromptOptionText = styled.Text<ThemeProps>`
  font-size: 16px;
  color: ${(props: ThemeProps) => props.isDark ? '#FFFFFF' : '#333333'};
`;

const EmptyText = styled.Text<ThemeProps>`
  font-size: 14px;
  color: ${(props: ThemeProps) => props.isDark ? '#888888' : '#999999'};
  text-align: center;
  padding: 16px;
`;

const MinimumPromptsText = styled.Text<ThemeProps>`
  font-size: 14px;
  color: ${(props: ThemeProps) => props.isDark ? '#FF6B6B' : '#FF6B6B'};
  text-align: center;
  padding: 12px;
  margin-bottom: 8px;
  background-color: ${(props: ThemeProps) => props.isDark ? 'rgba(255, 107, 107, 0.1)' : 'rgba(255, 107, 107, 0.1)'};
  border-radius: 8px;
`;
