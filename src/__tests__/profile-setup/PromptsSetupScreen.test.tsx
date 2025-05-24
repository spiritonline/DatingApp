import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PromptsSetupScreen from '../../screens/profile-setup/PromptsSetupScreen';
import { AuthStackParamList } from '../../navigation/types';
import { auth, db, storage } from '../../services/firebase';

// Mock Firebase storage functions
jest.mock('@firebase/storage', () => ({
  ref: jest.fn().mockReturnValue('mocked-storage-ref'),
  uploadBytes: jest.fn().mockResolvedValue(undefined),
  getDownloadURL: jest.fn().mockResolvedValue('https://example.com/voice-note.mp3')
}));

// Mock Firebase firestore functions
jest.mock('@firebase/firestore', () => ({
  doc: jest.fn().mockReturnValue('mocked-doc-ref'),
  updateDoc: jest.fn().mockResolvedValue(undefined)
}));

// Mock Firebase services
jest.mock('../../services/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-id'
    }
  },
  db: {},
  storage: {}
}));

// Mock expo-av
jest.mock('expo-av', () => ({
  Audio: {
    Recording: {
      createAsync: jest.fn().mockResolvedValue({
        recording: {
          startAsync: jest.fn().mockResolvedValue({}),
          stopAndUnloadAsync: jest.fn().mockResolvedValue({}),
          getURI: jest.fn().mockReturnValue('file://test/recording.mp3')
        }
      }),
      RECORDING_OPTIONS_PRESET_HIGH_QUALITY: {}
    }
  }
}));

// Mock navigation
const Stack = createNativeStackNavigator<AuthStackParamList>();
const MockNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator>
      <Stack.Screen name="PromptsSetup" component={PromptsSetupScreen} />
      <Stack.Screen name="MainFeed" component={() => null} />
    </Stack.Navigator>
  </NavigationContainer>
);

describe('PromptsSetupScreen', () => {
  it('renders correctly', () => {
    const { getByText, getByTestId } = render(<MockNavigator />);
    
    expect(getByText('Prompts Setup')).toBeTruthy();
    expect(getByTestId('prompt-selector')).toBeTruthy();
    expect(getByTestId('finish-button')).toBeTruthy();
  });

  it('disables finish button when less than 3 prompts are answered', () => {
    const { getByTestId } = render(<MockNavigator />);
    
    const finishButton = getByTestId('finish-button');
    expect(finishButton.props.accessibilityState.disabled).toBe(true);
  });

  it('validates prompt answers to be at least 10 characters', async () => {
    const { getByTestId, getByText, getAllByTestId } = render(<MockNavigator />);
    
    // Select a prompt
    fireEvent.press(getByTestId('prompt-selector'));
    fireEvent.press(getByTestId('prompt-option-0'));
    
    // Enter a short answer (less than 10 characters)
    fireEvent.changeText(getByTestId('prompt-answer-input-0'), 'Short');
    
    // Try to add the prompt
    fireEvent.press(getByTestId('save-prompt-button-0'));
    
    // Should show validation error
    expect(getByText('Answer must be at least 10 characters')).toBeTruthy();
  });

  it('enables finish button when exactly 3 prompts are answered', async () => {
    const { getByTestId, getAllByTestId, queryAllByTestId } = render(<MockNavigator />);
    
    // Answer 3 prompts
    for (let i = 0; i < 3; i++) {
      // Select prompt
      fireEvent.press(getByTestId('prompt-selector'));
      fireEvent.press(getByTestId(`prompt-option-${i}`));
      
      // Enter valid answer
      fireEvent.changeText(getByTestId(`prompt-answer-input-${i}`), 'This is a valid answer for the prompt question');
      
      // Save prompt
      fireEvent.press(getByTestId(`save-prompt-button-${i}`));
    }
    
    // Verify 3 prompts are saved
    expect(queryAllByTestId(/^saved-prompt-/)).toHaveLength(3);
    
    // Finish button should be enabled
    const finishButton = getByTestId('finish-button');
    expect(finishButton.props.accessibilityState.disabled).toBe(false);
  });

  it('allows recording and attaching voice notes to prompts', async () => {
    const { getByTestId } = render(<MockNavigator />);
    
    // Select a prompt
    fireEvent.press(getByTestId('prompt-selector'));
    fireEvent.press(getByTestId('prompt-option-0'));
    
    // Enter valid answer
    fireEvent.changeText(getByTestId('prompt-answer-input-0'), 'This is a valid answer for the prompt question');
    
    // Start recording
    fireEvent.press(getByTestId('start-recording-button-0'));
    
    // Stop recording
    fireEvent.press(getByTestId('stop-recording-button-0'));
    
    // Voice note should be attached
    await waitFor(() => {
      expect(getByTestId('voice-note-preview-0')).toBeTruthy();
    });
  });

  it('enables finish button when exactly 3 prompts are answered', async () => {
    const { getByTestId, getByText } = render(<MockNavigator />);
    
    // Select a prompt
    fireEvent.press(getByTestId('prompt-selector'));
    fireEvent.press(getByTestId('prompt-option-0'));
    
    // Enter valid answer
    fireEvent.changeText(getByTestId('prompt-answer-input-0'), 'This is a valid answer for the prompt question');
    
    // Save prompt
    fireEvent.press(getByTestId('save-prompt-button-0'));
    
    // Check that the finish button is still disabled (need 3 prompts)
    const finishButton = getByTestId('finish-button');
    expect(finishButton.props.accessibilityState.disabled).toBe(true);
  });
});
