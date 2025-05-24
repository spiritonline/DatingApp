// Define TypeScript interfaces for our validation functions

export interface PersonalInfoData {
  name: string;
  age: string;
  gender: string;
  locationConsent: boolean;
}

export interface PersonalInfoErrors {
  name: string;
  age: string;
  gender: string;
  locationConsent: string;
}

export interface ValidationResult<T> {
  isValid: boolean;
  errors: T;
}

export interface PhotoItem {
  uri: string;
  id: string;
}

export interface PromptAnswer {
  id: string;
  promptId: string;
  promptText: string;
  answer: string;
  voiceNoteUrl?: string;
}

export interface SimpleValidationResult {
  isValid: boolean;
  error: string;
}

/**
 * Validates personal information for profile setup
 * @param data The personal info data to validate
 * @returns Validation result with errors for each field
 */
export function validatePersonalInfo(data: PersonalInfoData): ValidationResult<PersonalInfoErrors> {
  const errors: PersonalInfoErrors = {
    name: '',
    age: '',
    gender: '',
    locationConsent: ''
  };
  
  let isValid = true;

  // Name validation
  if (!data.name.trim()) {
    errors.name = 'Name is required';
    isValid = false;
  }

  // Age validation
  if (!data.age) {
    errors.age = 'Age is required';
    isValid = false;
  } else {
    const ageNum = parseInt(data.age, 10);
    if (isNaN(ageNum)) {
      errors.age = 'Age must be a number';
      isValid = false;
    } else if (ageNum < 18) {
      errors.age = 'You must be at least 18 years old';
      isValid = false;
    } else if (ageNum > 99) {
      errors.age = 'Age must be 99 or less';
      isValid = false;
    }
  }

  // Gender validation
  if (!data.gender) {
    errors.gender = 'Gender is required';
    isValid = false;
  }

  // Location consent validation
  if (!data.locationConsent) {
    errors.locationConsent = 'Location consent is required';
    isValid = false;
  }

  return {
    isValid,
    errors
  };
}

/**
 * Validates photo uploads for profile setup
 * @param photos Array of photo items to validate
 * @returns Simple validation result with error message
 */
export function validatePhotoUpload(photos: PhotoItem[]): SimpleValidationResult {
  if (photos.length < 3) {
    return {
      isValid: false,
      error: 'Please upload at least 3 photos'
    };
  }
  
  return {
    isValid: true,
    error: ''
  };
}

/**
 * Validates prompt answers for profile setup
 * @param answers Array of prompt answers to validate
 * @returns Simple validation result with error message
 */
export function validatePromptAnswers(answers: PromptAnswer[]): SimpleValidationResult {
  // Check if exactly 3 prompts are answered
  if (answers.length !== 3) {
    return {
      isValid: false,
      error: 'Please answer exactly 3 prompts'
    };
  }
  
  // Check if all answers are at least 10 characters
  const shortAnswers = answers.filter(answer => answer.answer.trim().length < 10);
  if (shortAnswers.length > 0) {
    return {
      isValid: false,
      error: 'All answers must be at least 10 characters'
    };
  }
  
  return {
    isValid: true,
    error: ''
  };
}
