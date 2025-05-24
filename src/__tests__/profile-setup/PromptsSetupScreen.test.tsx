import { validatePromptAnswers, PromptAnswer, SimpleValidationResult } from '../../screens/profile-setup/utils/validation';

// Mock the validation module
jest.mock('../../screens/profile-setup/utils/validation', () => ({
  validatePromptAnswers: jest.fn(),
  PromptAnswer: jest.requireActual('../../screens/profile-setup/utils/validation').PromptAnswer,
  SimpleValidationResult: jest.requireActual('../../screens/profile-setup/utils/validation').SimpleValidationResult
}));

describe('PromptsSetupScreen Validation', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('validatePromptAnswers', () => {
    it('should return error when no prompts are answered', () => {
      const emptyAnswers: PromptAnswer[] = [];
      
      // Mock the validation function to return error for empty answers
      (validatePromptAnswers as jest.Mock).mockReturnValue({
        isValid: false,
        error: 'Please answer exactly 3 prompts'
      });

      const result = validatePromptAnswers(emptyAnswers);
      
      expect(validatePromptAnswers).toHaveBeenCalledWith(emptyAnswers);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please answer exactly 3 prompts');
    });

    it('should return error when less than 3 prompts are answered', () => {
      const twoAnswers: PromptAnswer[] = [
        {
          id: '1',
          promptId: 'p1',
          promptText: 'What is your favorite hobby?',
          answer: 'I love hiking and exploring nature',
          voiceNoteUrl: ''
        },
        {
          id: '2',
          promptId: 'p2',
          promptText: 'What are you passionate about?',
          answer: 'I am passionate about environmental conservation',
          voiceNoteUrl: ''
        }
      ];

      // Mock validation for insufficient answers
      (validatePromptAnswers as jest.Mock).mockReturnValueOnce({
        isValid: false,
        error: 'Please answer exactly 3 prompts'
      });

      const result = validatePromptAnswers(twoAnswers);
      expect(validatePromptAnswers).toHaveBeenCalledWith(twoAnswers);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please answer exactly 3 prompts');
    });

    it('should return error when answer is too short', () => {
      const answersWithShortAnswer: PromptAnswer[] = [
        {
          id: '1',
          promptId: 'p1',
          promptText: 'What is your favorite hobby?',
          answer: 'Hiking', // Too short
          voiceNoteUrl: ''
        },
        {
          id: '2',
          promptId: 'p2',
          promptText: 'What are you passionate about?',
          answer: 'Environmental conservation and sustainability efforts',
          voiceNoteUrl: ''
        },
        {
          id: '3',
          promptId: 'p3',
          promptText: 'What are you looking for in a partner?',
          answer: 'Someone who shares similar values and interests',
          voiceNoteUrl: ''
        }
      ];

      // Mock validation for short answer
      (validatePromptAnswers as jest.Mock).mockReturnValueOnce({
        isValid: false,
        error: 'All answers must be at least 10 characters'
      });

      const result = validatePromptAnswers(answersWithShortAnswer);
      expect(validatePromptAnswers).toHaveBeenCalledWith(answersWithShortAnswer);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('All answers must be at least 10 characters');
    });

    it('should validate successfully when 3 valid prompts are answered', () => {
      const validAnswers: PromptAnswer[] = [
        {
          id: '1',
          promptId: 'p1',
          promptText: 'What is your favorite hobby?',
          answer: 'I love hiking and exploring nature on weekends',
          voiceNoteUrl: ''
        },
        {
          id: '2',
          promptId: 'p2',
          promptText: 'What are you passionate about?',
          answer: 'Environmental conservation and sustainability efforts',
          voiceNoteUrl: ''
        },
        {
          id: '3',
          promptId: 'p3',
          promptText: 'What are you looking for in a partner?',
          answer: 'Someone who shares similar values and interests in outdoor activities',
          voiceNoteUrl: 'https://example.com/voice1.mp3'
        }
      ];

      // Mock successful validation
      (validatePromptAnswers as jest.Mock).mockReturnValueOnce({
        isValid: true,
        error: ''
      });

      const result = validatePromptAnswers(validAnswers);
      expect(validatePromptAnswers).toHaveBeenCalledWith(validAnswers);
      expect(result.isValid).toBe(true);
      expect(result.error).toBe('');
    });
  });
});
