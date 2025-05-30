import { validateProfile, validatePromptAnswer, validatePrompts } from '../profileValidators';
import { UserProfile } from '../../../services/profileService';

describe('validateProfile', () => {
  it('should validate required name field', () => {
    const profile: Partial<UserProfile> = {
      uid: 'test123',
      birthdate: '1990-01-01',
      gender: 'male',
      photos: ['photo1.jpg'],
      profileComplete: false
    };
    
    // Without name
    let result = validateProfile(profile);
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBe('Name is required');
    
    // With displayName
    profile.displayName = 'John Doe';
    result = validateProfile(profile);
    expect(result.isValid).toBe(true);
    expect(result.errors.name).toBeUndefined();
    
    // With legacy name field
    delete profile.displayName;
    profile.name = 'John Doe';
    result = validateProfile(profile);
    expect(result.isValid).toBe(true);
    expect(result.errors.name).toBeUndefined();
  });
  
  it('should validate required birthdate/age field', () => {
    const profile: Partial<UserProfile> = {
      uid: 'test123',
      displayName: 'John Doe',
      gender: 'male',
      photos: ['photo1.jpg'],
      profileComplete: false
    };
    
    // Without birthdate or age
    let result = validateProfile(profile);
    expect(result.isValid).toBe(false);
    expect(result.errors.birthdate).toBe('Birthdate is required');
    
    // With invalid birthdate
    profile.birthdate = 'invalid-date';
    result = validateProfile(profile);
    expect(result.isValid).toBe(false);
    expect(result.errors.birthdate).toBe('Invalid date format');
    
    // With valid birthdate
    profile.birthdate = '1990-01-01';
    result = validateProfile(profile);
    expect(result.isValid).toBe(true);
    expect(result.errors.birthdate).toBeUndefined();
    
    // With underage birthdate
    const today = new Date();
    const underage = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate() + 1);
    profile.birthdate = underage.toISOString().split('T')[0];
    result = validateProfile(profile);
    expect(result.isValid).toBe(false);
    expect(result.errors.birthdate).toBe('You must be at least 18 years old');
    
    // With legacy age field
    delete profile.birthdate;
    profile.age = 25;
    result = validateProfile(profile);
    expect(result.isValid).toBe(true);
    expect(result.errors.birthdate).toBeUndefined();
    
    // With underage legacy field
    profile.age = 17;
    result = validateProfile(profile);
    expect(result.isValid).toBe(false);
    expect(result.errors.birthdate).toBe('You must be at least 18 years old');
  });
  
  it('should validate required gender field', () => {
    const profile: Partial<UserProfile> = {
      uid: 'test123',
      displayName: 'John Doe',
      birthdate: '1990-01-01',
      photos: ['photo1.jpg'],
      profileComplete: false
    };
    
    // Without gender
    let result = validateProfile(profile);
    expect(result.isValid).toBe(false);
    expect(result.errors.gender).toBe('Gender is required');
    
    // With gender
    profile.gender = 'male';
    result = validateProfile(profile);
    expect(result.isValid).toBe(true);
    expect(result.errors.gender).toBeUndefined();
  });
  
  it('should validate photos', () => {
    const profile: Partial<UserProfile> = {
      uid: 'test123',
      displayName: 'John Doe',
      birthdate: '1990-01-01',
      gender: 'male',
      profileComplete: false
    };
    
    // Without photos
    let result = validateProfile(profile);
    expect(result.isValid).toBe(false);
    expect(result.errors.photos).toBe('At least one photo is required');
    
    // With empty photos array
    profile.photos = [];
    result = validateProfile(profile);
    expect(result.isValid).toBe(false);
    expect(result.errors.photos).toBe('At least one photo is required');
    
    // With photos
    profile.photos = ['photo1.jpg'];
    result = validateProfile(profile);
    expect(result.isValid).toBe(true);
    expect(result.errors.photos).toBeUndefined();
  });
  
  it('should return isValid=true for a complete profile', () => {
    const profile: Partial<UserProfile> = {
      uid: 'test123',
      displayName: 'John Doe',
      birthdate: '1990-01-01',
      gender: 'male',
      photos: ['photo1.jpg'],
      profileComplete: true
    };
    
    const result = validateProfile(profile);
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors).length).toBe(0);
  });
});

describe('validatePromptAnswer', () => {
  it('should validate minimum length', () => {
    // Too short
    expect(validatePromptAnswer('Short')).toBe(false);
    
    // Exactly 10 characters
    expect(validatePromptAnswer('1234567890')).toBe(true);
    
    // More than 10 characters
    expect(validatePromptAnswer('This is a longer answer')).toBe(true);
    
    // Whitespace is trimmed
    expect(validatePromptAnswer('   Short   ')).toBe(false);
    expect(validatePromptAnswer('   1234567890   ')).toBe(true);
  });
});

describe('validatePrompts', () => {
  it('should validate prompt collection', () => {
    // No prompts
    expect(validatePrompts()).toBe('At least one prompt answer is required');
    expect(validatePrompts([])).toBe('At least one prompt answer is required');
    
    // Invalid prompt answers
    const shortAnswers = [
      { id: '1', promptId: 'p1', promptText: 'Prompt 1', answer: 'Short' }
    ];
    expect(validatePrompts(shortAnswers)).toBe('All prompt answers must be at least 10 characters');
    
    // Valid prompt answers
    const validAnswers = [
      { id: '1', promptId: 'p1', promptText: 'Prompt 1', answer: 'This is a good answer' }
    ];
    expect(validatePrompts(validAnswers)).toBe('');
  });
});
