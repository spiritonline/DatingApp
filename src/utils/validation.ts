import { z } from 'zod';
import { AppError, createValidationError } from './errorHandler';

// Common validation patterns
const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{4,6}$/;
const nameRegex = /^[a-zA-Z\s\-']+$/;
const alphanumericRegex = /^[a-zA-Z0-9\s]+$/;
const urlRegex = /^https?:\/\/.+/;

// Profile validation schemas
export const ProfileSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(50, 'Name must be less than 50 characters')
    .regex(nameRegex, 'Name can only contain letters, spaces, hyphens, and apostrophes')
    .transform(val => val.trim()),
  
  bio: z.string()
    .max(500, 'Bio must be less than 500 characters')
    .optional()
    .transform(val => val?.trim()),
  
  age: z.number()
    .min(18, 'Must be at least 18 years old')
    .max(100, 'Age must be valid'),
  
  gender: z.enum(['male', 'female', 'other']),
  
  interestedIn: z.array(z.enum(['male', 'female', 'other']))
    .min(1, 'Must select at least one preference'),
});

// Prompt validation schema
export const PromptSchema = z.object({
  promptText: z.string()
    .min(1, 'Prompt is required')
    .max(200, 'Prompt must be less than 200 characters'),
  
  answer: z.string()
    .min(10, 'Answer must be at least 10 characters')
    .max(300, 'Answer must be less than 300 characters')
    .transform(val => val.trim()),
});

// Message validation schema
export const MessageSchema = z.object({
  content: z.string()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message must be less than 1000 characters')
    .transform(val => val.trim()),
  
  type: z.enum(['text', 'image', 'video', 'audio']),
});

// User auth validation schemas
export const EmailSchema = z.string()
  .email('Invalid email address')
  .toLowerCase()
  .transform(val => val.trim());

export const PasswordSchema = z.string()
  .min(6, 'Password must be at least 6 characters')
  .max(100, 'Password must be less than 100 characters');

export const SignUpSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Location validation schema
export const LocationSchema = z.object({
  latitude: z.number()
    .min(-90, 'Invalid latitude')
    .max(90, 'Invalid latitude'),
  
  longitude: z.number()
    .min(-180, 'Invalid longitude')
    .max(180, 'Invalid longitude'),
});

// Preferences validation schema
export const PreferencesSchema = z.object({
  ageRange: z.object({
    min: z.number().min(18).max(100),
    max: z.number().min(18).max(100),
  }).refine(data => data.min <= data.max, {
    message: 'Minimum age must be less than or equal to maximum age',
  }),
  
  distance: z.number()
    .min(1, 'Distance must be at least 1 km')
    .max(500, 'Distance must be less than 500 km'),
  
  interestedIn: z.array(z.enum(['male', 'female', 'other']))
    .min(1, 'Must select at least one preference'),
});

/**
 * Sanitize input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  // Remove script tags and other dangerous HTML
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/<audio\b[^>]*>/gi, '')
    .replace(/<video\b[^>]*>/gi, '')
    .replace(/<object\b[^>]*>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Escape remaining HTML entities
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  return sanitized.trim();
}

/**
 * Sanitize and validate user input for profiles
 */
export function sanitizeProfileInput(input: any): any {
  const sanitized = { ...input };
  
  // Sanitize text fields
  if (sanitized.name) {
    sanitized.name = sanitizeInput(sanitized.name);
  }
  
  if (sanitized.bio) {
    sanitized.bio = sanitizeInput(sanitized.bio);
  }
  
  // Sanitize prompts
  if (sanitized.prompts && Array.isArray(sanitized.prompts)) {
    sanitized.prompts = sanitized.prompts.map((prompt: any) => ({
      ...prompt,
      promptText: sanitizeInput(prompt.promptText || ''),
      answer: sanitizeInput(prompt.answer || ''),
    }));
  }
  
  return sanitized;
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validate image URL
 */
export function isValidImageUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'];
  const lowercaseUrl = url.toLowerCase();
  
  return imageExtensions.some(ext => lowercaseUrl.includes(ext));
}

/**
 * Filter profanity from text
 */
const profanityList: string[] = [
  // Add actual profanity words here
  // This is a simplified version - in production, use a proper profanity filter library
];

export function filterProfanity(text: string): string {
  let filtered = text;
  
  // Simple profanity filter - replace with asterisks
  profanityList.forEach((word: string) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    filtered = filtered.replace(regex, '*'.repeat(word.length));
  });
  
  return filtered;
}

/**
 * Validate and sanitize message content
 */
export function validateMessage(content: string): { valid: boolean; sanitized: string; error?: string } {
  try {
    // First sanitize
    const sanitized = sanitizeInput(content);
    
    // Then validate with schema
    MessageSchema.shape.content.parse(sanitized);
    
    // Filter profanity
    const filtered = filterProfanity(sanitized);
    
    return { valid: true, sanitized: filtered };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        valid: false, 
        sanitized: '', 
        error: error.errors[0]?.message || 'Invalid message' 
      };
    }
    return { valid: false, sanitized: '', error: 'Invalid message' };
  }
}

/**
 * Validate profile data
 */
export function validateProfile(data: any): { valid: boolean; data?: any; errors?: Record<string, string> } {
  try {
    // Sanitize first
    const sanitized = sanitizeProfileInput(data);
    
    // Then validate
    const validated = ProfileSchema.parse(sanitized);
    
    return { valid: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach(err => {
        const path = err.path.join('.');
        errors[path] = err.message;
      });
      return { valid: false, errors };
    }
    return { valid: false, errors: { general: 'Invalid profile data' } };
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  try {
    EmailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  valid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  suggestions: string[];
} {
  const suggestions: string[] = [];
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  
  try {
    PasswordSchema.parse(password);
  } catch (error) {
    if (error instanceof z.ZodError) {
      suggestions.push(error.errors[0]?.message || 'Invalid password');
      return { valid: false, strength, suggestions };
    }
  }
  
  // Check password strength
  let score = 0;
  
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  if (score <= 2) {
    strength = 'weak';
    if (!/[A-Z]/.test(password)) suggestions.push('Add uppercase letters');
    if (!/[0-9]/.test(password)) suggestions.push('Add numbers');
    if (!/[^a-zA-Z0-9]/.test(password)) suggestions.push('Add special characters');
  } else if (score <= 4) {
    strength = 'medium';
    if (password.length < 12) suggestions.push('Make it longer for better security');
  } else {
    strength = 'strong';
  }
  
  return { valid: true, strength, suggestions };
}

/**
 * Sanitize file name
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
}

/**
 * Validate file size
 */
export function validateFileSize(sizeInBytes: number, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return sizeInBytes <= maxSizeBytes;
}

/**
 * Validate image dimensions
 */
export function validateImageDimensions(
  width: number,
  height: number,
  minWidth = 200,
  minHeight = 200,
  maxWidth = 4000,
  maxHeight = 4000
): boolean {
  return width >= minWidth && 
         height >= minHeight && 
         width <= maxWidth && 
         height <= maxHeight;
}