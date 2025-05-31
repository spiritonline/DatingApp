export interface DatingPreferences {
  // Basic preferences
  interestedIn: {
    value: ('male' | 'female' | 'non-binary')[];
    dealbreaker: boolean;
  };
  
  location: {
    value: {
      latitude: number;
      longitude: number;
      city?: string;
      state?: string;
      country?: string;
    };
    dealbreaker: boolean;
  };
  
  maxDistance: {
    value: number; // in miles
    unit: 'miles' | 'km';
    dealbreaker: boolean;
  };
  
  ageRange: {
    min: number;
    max: number;
    dealbreaker: boolean;
  };
  
  // Demographics
  ethnicity: {
    value: string[]; // Multiple selections allowed
    options: 'any' | string[]; // 'any' means no preference
    dealbreaker: boolean;
  };
  
  religion: {
    value: string[];
    options: 'any' | string[]; // 'any' means no preference
    dealbreaker: boolean;
  };
  
  // Relationship preferences
  relationshipType: {
    value: ('casual' | 'serious' | 'friendship' | 'open_to_both')[];
    dealbreaker: boolean;
  };
  
  datingIntentions: {
    value: ('long_term' | 'short_term' | 'life_partner' | 'figuring_out' | 'fun')[];
    dealbreaker: boolean;
  };
  
  // Physical preferences
  height: {
    min?: number; // in inches
    max?: number; // in inches
    dealbreaker: boolean;
  };
  
  // Lifestyle preferences
  kids: {
    hasKids: 'yes' | 'no' | 'no_preference';
    wantsKids: 'yes' | 'no' | 'maybe' | 'no_preference';
    dealbreaker: boolean;
  };
  
  drugs: {
    value: 'never' | 'occasionally' | 'regularly';
    acceptable: ('never' | 'occasionally' | 'regularly')[];
    dealbreaker: boolean;
  };
  
  smoking: {
    value: 'never' | 'occasionally' | 'regularly' | 'trying_to_quit';
    acceptable: ('never' | 'occasionally' | 'regularly' | 'trying_to_quit')[];
    dealbreaker: boolean;
  };
  
  drinking: {
    value: 'never' | 'social' | 'moderate' | 'regular';
    acceptable: ('never' | 'social' | 'moderate' | 'regular')[];
    dealbreaker: boolean;
  };
  
  // Education
  educationLevel: {
    minimum: 'high_school' | 'some_college' | 'bachelors' | 'masters' | 'doctorate' | 'no_preference';
    dealbreaker: boolean;
  };
}

// Ethnicity options
export const ETHNICITY_OPTIONS = [
  'asian',
  'black',
  'hispanic_latino',
  'middle_eastern',
  'native_american',
  'pacific_islander',
  'white',
  'south_asian',
  'mixed',
  'other',
  'prefer_not_to_say'
];

// Religion options
export const RELIGION_OPTIONS = [
  'agnostic',
  'atheist',
  'buddhist',
  'catholic',
  'christian',
  'hindu',
  'jewish',
  'muslim',
  'sikh',
  'spiritual',
  'other',
  'prefer_not_to_say'
];

// Height conversion utilities
export const heightToInches = (feet: number, inches: number): number => feet * 12 + inches;
export const inchesToHeight = (totalInches: number): { feet: number; inches: number } => ({
  feet: Math.floor(totalInches / 12),
  inches: totalInches % 12
});

// Default preferences for new users
export const DEFAULT_PREFERENCES: DatingPreferences = {
  interestedIn: {
    value: [],
    dealbreaker: false
  },
  location: {
    value: {
      latitude: 0,
      longitude: 0
    },
    dealbreaker: false
  },
  maxDistance: {
    value: 50,
    unit: 'miles',
    dealbreaker: false
  },
  ageRange: {
    min: 18,
    max: 100,
    dealbreaker: false
  },
  ethnicity: {
    value: [],
    options: 'any',
    dealbreaker: false
  },
  religion: {
    value: [],
    options: 'any',
    dealbreaker: false
  },
  relationshipType: {
    value: ['open_to_both'],
    dealbreaker: false
  },
  datingIntentions: {
    value: ['figuring_out'],
    dealbreaker: false
  },
  height: {
    dealbreaker: false
  },
  kids: {
    hasKids: 'no_preference',
    wantsKids: 'no_preference',
    dealbreaker: false
  },
  drugs: {
    value: 'no_preference',
    acceptable: ['never', 'occasionally', 'regularly'],
    dealbreaker: false
  },
  smoking: {
    value: 'no_preference',
    acceptable: ['never', 'occasionally', 'regularly', 'trying_to_quit'],
    dealbreaker: false
  },
  drinking: {
    value: 'no_preference',
    acceptable: ['never', 'social', 'moderate', 'regular'],
    dealbreaker: false
  },
  educationLevel: {
    minimum: 'no_preference',
    dealbreaker: false
  }
};