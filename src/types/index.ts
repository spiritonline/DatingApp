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
  };
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
