import { UserProfile } from '../../services/profileService';

export interface ProfileValidationErrors {
  name?: string;
  birthdate?: string;
  gender?: string;
  photos?: string;
  prompts?: string;
}

export interface ProfileValidationResult {
  isValid: boolean;
  errors: ProfileValidationErrors;
}

/**
 * Validates profile data for completeness and correctness
 * @param profile Partial profile data to validate
 * @returns Validation result with errors
 */
export function validateProfile(profile: Partial<UserProfile>): ProfileValidationResult {
  const errors: ProfileValidationErrors = {};
  
  // Validate name (support both naming conventions)
  if (!profile.displayName?.trim() && !profile.name?.trim()) {
    errors.name = 'Name is required';
  }
  
  // Validate birthdate/age (support both naming conventions)
  if (!profile.birthdate && !profile.age) {
    errors.birthdate = 'Birthdate is required';
  } else if (profile.birthdate) {
    // Check if birthdate is a valid date format
    const date = new Date(profile.birthdate);
    if (isNaN(date.getTime())) {
      errors.birthdate = 'Invalid date format';
    } else {
      // Calculate age to ensure they're at least 18
      const today = new Date();
      let age = today.getFullYear() - date.getFullYear();
      const monthDiff = today.getMonth() - date.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
        age--;
      }
      
      if (age < 18) {
        errors.birthdate = 'You must be at least 18 years old';
      } else if (age > 99) {
        errors.birthdate = 'Age must be 99 or less';
      }
    }
  } else if (profile.age) {
    // If using the legacy age field, ensure it's a valid number
    const ageNum = typeof profile.age === 'string' ? parseInt(profile.age, 10) : profile.age;
    
    if (isNaN(ageNum)) {
      errors.birthdate = 'Age must be a number';
    } else if (ageNum < 18) {
      errors.birthdate = 'You must be at least 18 years old';
    } else if (ageNum > 99) {
      errors.birthdate = 'Age must be 99 or less';
    }
  }
  
  // Validate gender
  if (!profile.gender) {
    errors.gender = 'Gender is required';
  }
  
  // Validate photos
  if (!profile.photos || profile.photos.length < 1) {
    errors.photos = 'At least one photo is required';
  }
  
  // Check if there are any errors
  const isValid = Object.keys(errors).length === 0;
  
  return {
    isValid,
    errors
  };
}

/**
 * Validates a single prompt answer
 * @param answer The prompt answer text
 * @returns True if valid, false otherwise
 */
export function validatePromptAnswer(answer: string): boolean {
  return answer.trim().length >= 10;
}

/**
 * Validates a collection of prompt answers
 * @param prompts Array of prompt answers
 * @returns Validation error message or empty string if valid
 */
export function validatePrompts(prompts?: any[]): string {
  if (!prompts || prompts.length === 0) {
    return 'At least one prompt answer is required';
  }
  
  // Check if any prompt answers are too short
  const invalidPrompts = prompts.filter(p => !validatePromptAnswer(p.answer));
  if (invalidPrompts.length > 0) {
    return 'All prompt answers must be at least 10 characters';
  }
  
  return '';
}
