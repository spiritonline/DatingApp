import { UserProfile } from '../../services/profileService';

export interface ProfileValidationErrors {
  name?: string;
  birthdate?: string;
  gender?: string;
  photos?: string;
  prompts?: string;
  bio?: string;
}

// Security patterns for input validation
const SECURITY_PATTERNS = {
  // HTML/Script tags detection
  HTML_TAGS: /<[^>]*>/g,
  SCRIPT_TAGS: /<script[^>]*>.*?<\/script>/gi,
  
  // JavaScript event handlers
  JS_EVENTS: /on\w+\s*=/gi,
  
  // URL/Link detection (for bio and prompts)
  URLS: /(https?:\/\/[^\s]+)/gi,
  
  // Email detection
  EMAILS: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  
  // Phone numbers (basic pattern)
  PHONE_NUMBERS: /(\+?\d{1,4}[-.\s]?)?\(?\d{1,3}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
  
  // Profanity and inappropriate content (basic list - should be expanded)
  PROFANITY: /\b(fuck|shit|damn|bitch|asshole|bastard|cunt|whore|slut)\b/gi,
  
  // SQL injection patterns
  SQL_INJECTION: /(union|select|insert|delete|update|drop|exec|script)/gi,
  
  // Excessive special characters (potential code injection)
  EXCESSIVE_SPECIAL_CHARS: /[!@#$%^&*()_+=\[\]{}|;':",./<>?~`]{5,}/g,
};

/**
 * Sanitize text input to prevent XSS and other security issues
 */
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // Remove HTML tags
  let sanitized = input.replace(SECURITY_PATTERNS.HTML_TAGS, '');
  
  // Remove script tags specifically
  sanitized = sanitized.replace(SECURITY_PATTERNS.SCRIPT_TAGS, '');
  
  // Remove JavaScript event handlers
  sanitized = sanitized.replace(SECURITY_PATTERNS.JS_EVENTS, '');
  
  // Encode remaining special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  // Trim whitespace
  return sanitized.trim();
};

/**
 * Check for potentially malicious content
 */
export const detectMaliciousContent = (input: string): string[] => {
  const issues: string[] = [];
  
  if (!input || typeof input !== 'string') {
    return issues;
  }
  
  // Check for HTML/Script tags
  if (SECURITY_PATTERNS.HTML_TAGS.test(input)) {
    issues.push('HTML tags are not allowed');
  }
  
  if (SECURITY_PATTERNS.SCRIPT_TAGS.test(input)) {
    issues.push('Script tags are not allowed');
  }
  
  // Check for JavaScript events
  if (SECURITY_PATTERNS.JS_EVENTS.test(input)) {
    issues.push('JavaScript event handlers are not allowed');
  }
  
  // Check for SQL injection patterns
  if (SECURITY_PATTERNS.SQL_INJECTION.test(input)) {
    issues.push('Potentially malicious content detected');
  }
  
  // Check for excessive special characters
  if (SECURITY_PATTERNS.EXCESSIVE_SPECIAL_CHARS.test(input)) {
    issues.push('Too many special characters');
  }
  
  return issues;
};

/**
 * Validate name with security checks
 */
export const validateName = (name: string): string[] => {
  const errors: string[] = [];
  
  if (!name || !name.trim()) {
    errors.push('Name is required');
    return errors;
  }
  
  const sanitizedName = sanitizeInput(name);
  
  // Check for malicious content
  const securityIssues = detectMaliciousContent(name);
  if (securityIssues.length > 0) {
    errors.push(...securityIssues);
  }
  
  // Length validation
  if (sanitizedName.length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  
  if (sanitizedName.length > 50) {
    errors.push('Name must be less than 50 characters');
  }
  
  // Check for numbers (names shouldn't contain numbers)
  if (/\d/.test(sanitizedName)) {
    errors.push('Name should not contain numbers');
  }
  
  // Check for special characters (only allow letters, spaces, hyphens, apostrophes)
  if (!/^[a-zA-Z\s\-']+$/.test(sanitizedName)) {
    errors.push('Name can only contain letters, spaces, hyphens, and apostrophes');
  }
  
  return errors;
};

/**
 * Validate bio with security and content checks
 */
export const validateBio = (bio: string): string[] => {
  const errors: string[] = [];
  
  if (!bio) {
    return errors; // Bio is optional
  }
  
  const sanitizedBio = sanitizeInput(bio);
  
  // Check for malicious content
  const securityIssues = detectMaliciousContent(bio);
  if (securityIssues.length > 0) {
    errors.push(...securityIssues);
  }
  
  // Length validation
  if (sanitizedBio.length > 500) {
    errors.push('Bio must be less than 500 characters');
  }
  
  // Check for contact information (privacy concern)
  if (SECURITY_PATTERNS.EMAILS.test(bio)) {
    errors.push('Please do not include email addresses in your bio');
  }
  
  if (SECURITY_PATTERNS.PHONE_NUMBERS.test(bio)) {
    errors.push('Please do not include phone numbers in your bio');
  }
  
  // Check for URLs (prevent external links)
  if (SECURITY_PATTERNS.URLS.test(bio)) {
    errors.push('Please do not include URLs in your bio');
  }
  
  // Basic profanity check
  if (SECURITY_PATTERNS.PROFANITY.test(bio)) {
    errors.push('Please keep your bio appropriate and respectful');
  }
  
  return errors;
};

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
  
  // Validate name with security checks (support both naming conventions)
  const nameValue = profile.displayName?.trim() || profile.name?.trim() || '';
  const nameErrors = validateName(nameValue);
  if (nameErrors.length > 0) {
    errors.name = nameErrors.join(', ');
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
  
  // Validate bio with security checks
  if (profile.bio) {
    const bioErrors = validateBio(profile.bio);
    if (bioErrors.length > 0) {
      errors.bio = bioErrors.join(', ');
    }
  }
  
  // Validate prompts with security checks
  if (profile.prompts && profile.prompts.length > 0) {
    const promptErrors: string[] = [];
    
    for (const prompt of profile.prompts) {
      if (!prompt.answer || prompt.answer.trim().length < 10) {
        promptErrors.push('All prompt answers must be at least 10 characters');
        continue;
      }
      
      // Check for security issues in prompt answers
      const securityIssues = detectMaliciousContent(prompt.answer);
      if (securityIssues.length > 0) {
        promptErrors.push(`Prompt answer contains inappropriate content: ${securityIssues.join(', ')}`);
      }
      
      // Check for contact info in prompts
      if (SECURITY_PATTERNS.EMAILS.test(prompt.answer)) {
        promptErrors.push('Please do not include email addresses in your prompts');
      }
      
      if (SECURITY_PATTERNS.PHONE_NUMBERS.test(prompt.answer)) {
        promptErrors.push('Please do not include phone numbers in your prompts');
      }
      
      if (SECURITY_PATTERNS.URLS.test(prompt.answer)) {
        promptErrors.push('Please do not include URLs in your prompts');
      }
      
      // Basic profanity check
      if (SECURITY_PATTERNS.PROFANITY.test(prompt.answer)) {
        promptErrors.push('Please keep your prompts appropriate and respectful');
      }
      
      // Length check
      if (prompt.answer.length > 300) {
        promptErrors.push('Prompt answers must be less than 300 characters');
      }
    }
    
    if (promptErrors.length > 0) {
      errors.prompts = [...new Set(promptErrors)].join(', '); // Remove duplicates
    }
  }
  
  // Check if there are any errors
  const isValid = Object.keys(errors).length === 0;
  
  return {
    isValid,
    errors
  };
}

/**
 * Validates a single prompt answer with security checks
 * @param answer The prompt answer text
 * @returns True if valid, false otherwise
 */
export function validatePromptAnswer(answer: string): boolean {
  if (!answer || answer.trim().length < 10) {
    return false;
  }
  
  // Check for security issues
  const securityIssues = detectMaliciousContent(answer);
  if (securityIssues.length > 0) {
    return false;
  }
  
  // Check for contact information
  if (SECURITY_PATTERNS.EMAILS.test(answer) || 
      SECURITY_PATTERNS.PHONE_NUMBERS.test(answer) || 
      SECURITY_PATTERNS.URLS.test(answer)) {
    return false;
  }
  
  // Check for profanity
  if (SECURITY_PATTERNS.PROFANITY.test(answer)) {
    return false;
  }
  
  // Check length
  if (answer.length > 300) {
    return false;
  }
  
  return true;
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
