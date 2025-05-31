import { Alert, Platform } from 'react-native';
import { FirebaseError } from 'firebase/app';

/**
 * Error severity levels for categorizing errors
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Error categories for different types of errors
 */
export type ErrorCategory = 
  | 'auth' 
  | 'network' 
  | 'validation' 
  | 'permission' 
  | 'storage' 
  | 'unknown';

/**
 * Custom application error class with enhanced error information
 */
export class AppError extends Error {
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;
  
  constructor(
    message: string,
    public readonly code: string,
    public readonly severity: ErrorSeverity = 'medium',
    public readonly category: ErrorCategory = 'unknown',
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    this.timestamp = new Date();
    this.context = context;
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Firebase error code mappings to user-friendly messages
 */
const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  // Auth errors
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/user-not-found': 'No account found with this email address.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password should be at least 6 characters long.',
  'auth/network-request-failed': 'Network error. Please check your connection.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/invalid-credential': 'Invalid login credentials. Please try again.',
  
  // Firestore errors
  'permission-denied': 'You don\'t have permission to perform this action.',
  'not-found': 'The requested data was not found.',
  'already-exists': 'This data already exists.',
  'resource-exhausted': 'Too many requests. Please slow down.',
  'deadline-exceeded': 'Request timed out. Please try again.',
  'unavailable': 'Service temporarily unavailable. Please try again later.',
  
  // Storage errors
  'storage/unauthorized': 'You don\'t have permission to upload files.',
  'storage/canceled': 'Upload was cancelled.',
  'storage/retry-limit-exceeded': 'Upload failed. Please try again.',
  'storage/invalid-checksum': 'File upload corrupted. Please try again.',
  'storage/cannot-slice-blob': 'File upload failed. Please try a different file.',
};

/**
 * Convert Firebase errors to AppError
 */
export function fromFirebaseError(error: FirebaseError): AppError {
  const userMessage = FIREBASE_ERROR_MESSAGES[error.code] || error.message;
  const category = error.code.startsWith('auth/') ? 'auth' : 
                   error.code.startsWith('storage/') ? 'storage' : 
                   'network';
  
  const severity: ErrorSeverity = 
    error.code.includes('network') || error.code.includes('unavailable') ? 'low' :
    error.code.includes('permission') || error.code.includes('unauthorized') ? 'high' :
    'medium';
  
  return new AppError(userMessage, error.code, severity, category, {
    originalMessage: error.message,
    stack: error.stack,
  });
}

/**
 * Standardized error handler for service layer
 */
export function handleServiceError(error: unknown): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }
  
  // Firebase error
  if (error && typeof error === 'object' && 'code' in error) {
    return fromFirebaseError(error as FirebaseError);
  }
  
  // Network error
  if (error instanceof TypeError && error.message.includes('Network')) {
    return new AppError(
      'Network connection error. Please check your internet connection.',
      'network-error',
      'low',
      'network'
    );
  }
  
  // Generic Error
  if (error instanceof Error) {
    return new AppError(
      error.message || 'An unexpected error occurred',
      'unknown-error',
      'medium',
      'unknown',
      { originalError: error.toString() }
    );
  }
  
  // Unknown error type
  return new AppError(
    'An unexpected error occurred. Please try again.',
    'unknown-error',
    'medium',
    'unknown',
    { error: String(error) }
  );
}

/**
 * User-friendly error messages by category
 */
const USER_FRIENDLY_MESSAGES: Record<ErrorCategory, string> = {
  auth: 'Authentication error. Please check your credentials.',
  network: 'Connection error. Please check your internet connection.',
  validation: 'Please check your input and try again.',
  permission: 'You don\'t have permission to perform this action.',
  storage: 'File operation failed. Please try again.',
  unknown: 'Something went wrong. Please try again.',
};

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: AppError): string {
  // If we have a specific message, use it
  if (error.message && !error.message.includes('Error:')) {
    return error.message;
  }
  
  // Otherwise, use category-based message
  return USER_FRIENDLY_MESSAGES[error.category] || USER_FRIENDLY_MESSAGES.unknown;
}

/**
 * Show error alert to user
 */
export function showErrorAlert(
  error: AppError,
  title: string = 'Error',
  onDismiss?: () => void
): void {
  const message = getUserFriendlyMessage(error);
  
  Alert.alert(title, message, [
    {
      text: 'OK',
      onPress: onDismiss,
    },
  ]);
}

/**
 * Log error for debugging/monitoring
 */
export function logError(error: AppError, additionalContext?: Record<string, any>): void {
  const errorInfo = {
    timestamp: error.timestamp.toISOString(),
    code: error.code,
    severity: error.severity,
    category: error.category,
    message: error.message,
    context: { ...error.context, ...additionalContext },
    platform: Platform.OS,
    version: Platform.Version,
  };
  
  if (__DEV__) {
    console.error('🚨 AppError:', errorInfo);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  } else {
    // TODO: Send to crash reporting service
    // Example: crashlytics().recordError(error);
  }
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: AppError) => boolean;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  shouldRetry: (error) => error.severity === 'low' && error.category === 'network',
};

/**
 * Retry failed operations with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: AppError | null = null;
  
  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = handleServiceError(error);
      
      if (attempt === finalConfig.maxAttempts || !finalConfig.shouldRetry(lastError)) {
        throw lastError;
      }
      
      const delay = finalConfig.delayMs * Math.pow(finalConfig.backoffMultiplier, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new AppError('Operation failed after retries', 'retry-exhausted', 'high');
}

/**
 * Validation error helper
 */
export function createValidationError(
  field: string,
  message: string,
  value?: any
): AppError {
  return new AppError(
    message,
    `validation-${field}`,
    'low',
    'validation',
    { field, value }
  );
}

/**
 * Permission error helper
 */
export function createPermissionError(
  resource: string,
  action: string
): AppError {
  return new AppError(
    `You don't have permission to ${action} ${resource}`,
    `permission-${resource}-${action}`,
    'high',
    'permission',
    { resource, action }
  );
}

/**
 * Network error helper
 */
export function createNetworkError(
  operation: string,
  details?: string
): AppError {
  return new AppError(
    details || 'Network operation failed. Please check your connection.',
    `network-${operation}`,
    'low',
    'network',
    { operation }
  );
}