import { validatePersonalInfo } from '../../screens/profile-setup/utils/validation';
import { validatePhotoUpload } from '../../screens/profile-setup/utils/validation';
import { validatePromptAnswers } from '../../screens/profile-setup/utils/validation';

// Create utility test file for validation functions
describe('Profile Setup Validation Functions', () => {
  describe('validatePersonalInfo', () => {
    it('validates complete and valid personal info', () => {
      const validInfo = {
        name: 'John Doe',
        age: '25',
        gender: 'male',
        locationConsent: true
      };
      
      const result = validatePersonalInfo(validInfo);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({
        name: '',
        age: '',
        gender: '',
        locationConsent: ''
      });
    });
    
    it('validates empty personal info', () => {
      const emptyInfo = {
        name: '',
        age: '',
        gender: '',
        locationConsent: false
      };
      
      const result = validatePersonalInfo(emptyInfo);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual({
        name: 'Name is required',
        age: 'Age is required',
        gender: 'Gender is required',
        locationConsent: 'Location consent is required'
      });
    });
    
    it('validates age boundaries', () => {
      // Under minimum age
      const underageInfo = {
        name: 'John Doe',
        age: '17',
        gender: 'male',
        locationConsent: true
      };
      
      let result = validatePersonalInfo(underageInfo);
      expect(result.isValid).toBe(false);
      expect(result.errors.age).toBe('You must be at least 18 years old');
      
      // Over maximum age
      const overageInfo = {
        name: 'John Doe',
        age: '100',
        gender: 'male',
        locationConsent: true
      };
      
      result = validatePersonalInfo(overageInfo);
      expect(result.isValid).toBe(false);
      expect(result.errors.age).toBe('Age must be 99 or less');
      
      // Invalid age (not a number)
      const invalidAgeInfo = {
        name: 'John Doe',
        age: 'abc',
        gender: 'male',
        locationConsent: true
      };
      
      result = validatePersonalInfo(invalidAgeInfo);
      expect(result.isValid).toBe(false);
      expect(result.errors.age).toBe('Age must be a number');
    });
  });
  
  describe('validatePhotoUpload', () => {
    it('validates when enough photos are selected', () => {
      const photos = [
        { uri: 'file://photo1.jpg', id: '1' },
        { uri: 'file://photo2.jpg', id: '2' },
        { uri: 'file://photo3.jpg', id: '3' }
      ];
      
      const result = validatePhotoUpload(photos);
      expect(result.isValid).toBe(true);
      expect(result.error).toBe('');
    });
    
    it('validates when not enough photos are selected', () => {
      const photos = [
        { uri: 'file://photo1.jpg', id: '1' },
        { uri: 'file://photo2.jpg', id: '2' }
      ];
      
      const result = validatePhotoUpload(photos);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please upload at least 3 photos');
    });
    
    it('validates when no photos are selected', () => {
      const photos: Array<{uri: string, id: string}> = [];
      
      const result = validatePhotoUpload(photos);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please upload at least 3 photos');
    });
  });
  
  describe('validatePromptAnswers', () => {
    it('validates when enough prompts are answered', () => {
      const answers = [
        { 
          id: '1', 
          promptId: '1', 
          promptText: 'Question 1', 
          answer: 'This is a valid answer that is long enough' 
        },
        { 
          id: '2', 
          promptId: '2', 
          promptText: 'Question 2', 
          answer: 'This is another valid answer that is long enough' 
        },
        { 
          id: '3', 
          promptId: '3', 
          promptText: 'Question 3', 
          answer: 'This is a third valid answer that is long enough' 
        }
      ];
      
      const result = validatePromptAnswers(answers);
      expect(result.isValid).toBe(true);
      expect(result.error).toBe('');
    });
    
    it('validates when not enough prompts are answered', () => {
      const answers = [
        { 
          id: '1', 
          promptId: '1', 
          promptText: 'Question 1', 
          answer: 'This is a valid answer that is long enough' 
        },
        { 
          id: '2', 
          promptId: '2', 
          promptText: 'Question 2', 
          answer: 'This is another valid answer that is long enough' 
        }
      ];
      
      const result = validatePromptAnswers(answers);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please answer exactly 3 prompts');
    });
    
    it('validates when answers are too short', () => {
      const answers = [
        { 
          id: '1', 
          promptId: '1', 
          promptText: 'Question 1', 
          answer: 'Too short' 
        },
        { 
          id: '2', 
          promptId: '2', 
          promptText: 'Question 2', 
          answer: 'This is a valid answer that is long enough' 
        },
        { 
          id: '3', 
          promptId: '3', 
          promptText: 'Question 3', 
          answer: 'This is a third valid answer that is long enough' 
        }
      ];
      
      const result = validatePromptAnswers(answers);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('All answers must be at least 10 characters');
    });
  });
});
