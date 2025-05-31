import { AppError } from './errorHandler';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests allowed in the window
  identifier: string; // Unique identifier for the rate limit
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  
  /**
   * Check if an action is allowed based on rate limiting rules
   */
  checkLimit(config: RateLimitConfig): boolean {
    const now = Date.now();
    const entry = this.limits.get(config.identifier);
    
    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired one
      this.limits.set(config.identifier, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return true;
    }
    
    if (entry.count >= config.maxRequests) {
      return false;
    }
    
    // Increment count
    entry.count++;
    return true;
  }
  
  /**
   * Get remaining requests for a specific identifier
   */
  getRemainingRequests(config: RateLimitConfig): number {
    const entry = this.limits.get(config.identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return config.maxRequests;
    }
    return Math.max(0, config.maxRequests - entry.count);
  }
  
  /**
   * Get time until rate limit resets (in seconds)
   */
  getResetTime(identifier: string): number {
    const entry = this.limits.get(identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return 0;
    }
    return Math.ceil((entry.resetTime - Date.now()) / 1000);
  }
  
  /**
   * Clear rate limit for a specific identifier
   */
  clearLimit(identifier: string): void {
    this.limits.delete(identifier);
  }
  
  /**
   * Clear all rate limits
   */
  clearAll(): void {
    this.limits.clear();
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Rate limit configurations for different actions
export const RateLimitConfigs = {
  // Like actions: 10 likes per minute
  LIKE_ACTION: (userId: string): RateLimitConfig => ({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    identifier: `like_${userId}`,
  }),
  
  // Message sending: 30 messages per minute
  SEND_MESSAGE: (userId: string): RateLimitConfig => ({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    identifier: `message_${userId}`,
  }),
  
  // Profile views: 100 profiles per hour
  PROFILE_VIEW: (userId: string): RateLimitConfig => ({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 100,
    identifier: `profile_view_${userId}`,
  }),
  
  // Photo uploads: 10 photos per hour
  PHOTO_UPLOAD: (userId: string): RateLimitConfig => ({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    identifier: `photo_upload_${userId}`,
  }),
  
  // Profile updates: 5 updates per hour
  PROFILE_UPDATE: (userId: string): RateLimitConfig => ({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
    identifier: `profile_update_${userId}`,
  }),
  
  // Login attempts: 5 attempts per 15 minutes
  LOGIN_ATTEMPT: (email: string): RateLimitConfig => ({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    identifier: `login_${email}`,
  }),
  
  // Password reset: 3 requests per hour
  PASSWORD_RESET: (email: string): RateLimitConfig => ({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    identifier: `reset_${email}`,
  }),
};

/**
 * Enforce rate limit for an action
 * @throws AppError if rate limit is exceeded
 */
export function enforceRateLimit(config: RateLimitConfig): void {
  if (!rateLimiter.checkLimit(config)) {
    const resetTime = rateLimiter.getResetTime(config.identifier);
    throw new AppError(
      `Rate limit exceeded. Please try again in ${resetTime} seconds.`,
      'RATE_LIMIT_EXCEEDED',
      'low',
      'security',
      {
        resetTime,
        remaining: 0,
      }
    );
  }
}

/**
 * Check if an action is rate limited without throwing
 */
export function isRateLimited(config: RateLimitConfig): boolean {
  const entry = rateLimiter['limits'].get(config.identifier);
  if (!entry || Date.now() > entry.resetTime) {
    return false;
  }
  return entry.count >= config.maxRequests;
}

/**
 * Get rate limit status for an action
 */
export function getRateLimitStatus(config: RateLimitConfig): {
  isLimited: boolean;
  remaining: number;
  resetTime: number;
} {
  return {
    isLimited: isRateLimited(config),
    remaining: rateLimiter.getRemainingRequests(config),
    resetTime: rateLimiter.getResetTime(config.identifier),
  };
}

/**
 * Decorator for rate-limited async functions
 */
export function withRateLimit(configFactory: (userId: string) => RateLimitConfig) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      // Assume first argument is userId or extract from context
      const userId = args[0] || 'anonymous';
      const config = configFactory(userId);
      
      enforceRateLimit(config);
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}