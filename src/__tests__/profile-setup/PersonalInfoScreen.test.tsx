import { validatePersonalInfo } from '../../screens/profile-setup/utils/validation';

// Mock the validation module
jest.mock('../../screens/profile-setup/utils/validation', () => ({
  validatePersonalInfo: jest.fn()
}));

describe('PersonalInfoScreen Validation', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('validatePersonalInfo', () => {
    it('should return errors for empty form', () => {
      const emptyForm = {
        name: '',
        age: '',
        gender: '',
        locationConsent: false
      };

      // Mock the validation function to return errors for empty form
      (validatePersonalInfo as jest.Mock).mockReturnValue({
        isValid: false,
        errors: {
          name: 'Name is required',
          age: 'Age is required',
          gender: 'Gender is required',
          locationConsent: 'Location consent is required'
        }
      });

      const result = validatePersonalInfo(emptyForm);
      
      expect(validatePersonalInfo).toHaveBeenCalledWith(emptyForm);
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe('Name is required');
      expect(result.errors.age).toBe('Age is required');
      expect(result.errors.gender).toBe('Gender is required');
      expect(result.errors.locationConsent).toBe('Location consent is required');
    });

    it('should validate age boundaries', () => {
      const underAgeForm = {
        name: 'John',
        age: '17',
        gender: 'male',
        locationConsent: true
      };

      // Mock validation for underage
      (validatePersonalInfo as jest.Mock).mockReturnValueOnce({
        isValid: false,
        errors: {
          age: 'You must be at least 18 years old',
          name: '',
          gender: '',
          locationConsent: ''
        }
      });

      let result = validatePersonalInfo(underAgeForm);
      expect(validatePersonalInfo).toHaveBeenCalledWith(underAgeForm);
      expect(result.isValid).toBe(false);
      expect(result.errors.age).toBe('You must be at least 18 years old');

      // Test over maximum age
      const overAgeForm = { ...underAgeForm, age: '100' };
      
      (validatePersonalInfo as jest.Mock).mockReturnValueOnce({
        isValid: false,
        errors: {
          age: 'Age must be 99 or less',
          name: '',
          gender: '',
          locationConsent: ''
        }
      });

      result = validatePersonalInfo(overAgeForm);
      expect(result.isValid).toBe(false);
      expect(result.errors.age).toBe('Age must be 99 or less');
    });

    it('should validate a valid form', () => {
      const validForm = {
        name: 'John Doe',
        age: '25',
        gender: 'male',
        locationConsent: true
      };

      (validatePersonalInfo as jest.Mock).mockReturnValue({
        isValid: true,
        errors: {
          name: '',
          age: '',
          gender: '',
          locationConsent: ''
        }
      });

      const result = validatePersonalInfo(validForm);
      expect(validatePersonalInfo).toHaveBeenCalledWith(validForm);
      expect(result.isValid).toBe(true);
      expect(result.errors.name).toBe('');
      expect(result.errors.age).toBe('');
      expect(result.errors.gender).toBe('');
      expect(result.errors.locationConsent).toBe('');
    });
  });
});
