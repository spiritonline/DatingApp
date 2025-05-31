import { DatingPreferences } from './preferences';

export interface UserProfile {
  id?: string;
  name?: string;
  age?: number;
  gender?: string;
  bio?: string;
  photos?: string[];
  prompts?: PromptAnswer[];
  locationConsent?: boolean;
  location?: {
    latitude: number;
    longitude: number;
    encrypted?: boolean;
    precision?: number;
    lastUpdated?: Date;
  };
  // Store encrypted location separately for enhanced security
  encryptedLocation?: string;
  preferences?: DatingPreferences;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PromptAnswer {
  id: string;
  promptId: string;
  promptText: string;
  answer: string;
}

export interface PromptOption {
  id: string;
  text: string;
}

// Likes and matches types
export interface Like {
  id: string;
  fromUserId: string;
  toUserId: string;
  createdAt: Date;
  status: 'pending' | 'matched' | 'dismissed';
}

export interface Match {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: Date;
  lastActivity?: Date;
}

export interface LikeWithProfile extends Like {
  fromUserProfile: UserProfile;
}
