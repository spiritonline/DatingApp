import { z } from 'zod';
import { sanitizeInput, filterProfanity } from '../../../utils/validation';

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

  // Name validation with sanitization
  const sanitizedName = sanitizeInput(data.name);
  if (!sanitizedName.trim()) {
    errors.name = 'Name is required';
    isValid = false;
  } else if (sanitizedName.length > 50) {
    errors.name = 'Name must be less than 50 characters';
    isValid = false;
  } else {
    // Filter profanity from name
    const filteredName = filterProfanity(sanitizedName);
    if (filteredName !== sanitizedName) {
      errors.name = 'Please use appropriate language';
      isValid = false;
    }
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
  } else if (!['male', 'female', 'non-binary', 'prefer-not-to-say'].includes(data.gender)) {
    errors.gender = 'Please select a valid gender option';
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
  
  // Validate and sanitize each answer
  for (const answer of answers) {
    const sanitizedAnswer = sanitizeInput(answer.answer);
    
    // Check minimum length
    if (sanitizedAnswer.trim().length < 10) {
      return {
        isValid: false,
        error: 'All answers must be at least 10 characters'
      };
    }
    
    // Check maximum length
    if (sanitizedAnswer.length > 300) {
      return {
        isValid: false,
        error: 'Answers must be less than 300 characters'
      };
    }
    
    // Check for profanity
    const filteredAnswer = filterProfanity(sanitizedAnswer);
    if (filteredAnswer !== sanitizedAnswer) {
      return {
        isValid: false,
        error: 'Please use appropriate language in your answers'
      };
    }
  }
  
  return {
    isValid: true,
    error: ''
  };
}
