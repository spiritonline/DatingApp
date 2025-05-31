import * as dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

// Define types locally
interface DatingPreferences {
  interestedIn: { value: ('male' | 'female' | 'non-binary')[]; dealbreaker: boolean; };
  location: { 
    value: { latitude: number; longitude: number; city?: string; state?: string; country?: string; }; 
    dealbreaker: boolean; 
  };
  maxDistance: { value: number; unit: 'miles' | 'km'; dealbreaker: boolean; };
  ageRange: { min: number; max: number; dealbreaker: boolean; };
  ethnicity: { value: string[]; options: 'any' | string[]; dealbreaker: boolean; };
  religion: { value: string[]; options: 'any' | string[]; dealbreaker: boolean; };
  relationshipType: { value: ('casual' | 'serious' | 'friendship' | 'open_to_both')[]; dealbreaker: boolean; };
  datingIntentions: { value: ('long_term' | 'short_term' | 'life_partner' | 'figuring_out' | 'fun')[]; dealbreaker: boolean; };
  height: { min?: number; max?: number; dealbreaker: boolean; };
  kids: { hasKids: 'yes' | 'no' | 'no_preference'; wantsKids: 'yes' | 'no' | 'maybe' | 'no_preference'; dealbreaker: boolean; };
  drugs: { value: 'never' | 'occasionally' | 'regularly' | 'no_preference'; acceptable: ('never' | 'occasionally' | 'regularly')[]; dealbreaker: boolean; };
  smoking: { value: 'never' | 'occasionally' | 'regularly' | 'trying_to_quit' | 'no_preference'; acceptable: ('never' | 'occasionally' | 'regularly' | 'trying_to_quit')[]; dealbreaker: boolean; };
  drinking: { value: 'never' | 'social' | 'moderate' | 'regular' | 'no_preference'; acceptable: ('never' | 'social' | 'moderate' | 'regular')[]; dealbreaker: boolean; };
  educationLevel: { minimum: 'high_school' | 'some_college' | 'bachelors' | 'masters' | 'doctorate' | 'no_preference'; dealbreaker: boolean; };
}

const heightToInches = (feet: number, inches: number): number => feet * 12 + inches;

// Load environment variables
dotenv.config({ path: '../.env' });

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Calculate age from birthdate
function calculateAge(birthdate: string): number {
  const birth = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

// Generate realistic preferences based on user profile
function generatePreferences(profile: any): DatingPreferences {
  const userAge = profile.age || calculateAge(profile.birthdate);
  const isMale = profile.gender === 'male';
  const isFemale = profile.gender === 'female';
  
  // Age preferences based on gender and age
  let minAge = 18;
  let maxAge = 100;
  
  if (isMale) {
    minAge = Math.max(18, userAge - 5);
    maxAge = Math.min(100, userAge + 3);
  } else if (isFemale) {
    minAge = Math.max(18, userAge - 2);
    maxAge = Math.min(100, userAge + 8);
  } else {
    minAge = Math.max(18, userAge - 5);
    maxAge = Math.min(100, userAge + 5);
  }

  // Generate preferences based on profile
  const preferences: DatingPreferences = {
    interestedIn: {
      value: profile.interestedIn || (isMale ? ['female'] : isFemale ? ['male'] : ['male', 'female', 'non-binary']),
      dealbreaker: true
    },
    
    location: {
      value: {
        latitude: profile.location?._lat || profile.location?.latitude || 37.7749,
        longitude: profile.location?._long || profile.location?.longitude || -122.4194,
        city: 'San Francisco',
        state: 'CA',
        country: 'USA'
      },
      dealbreaker: false
    },
    
    maxDistance: {
      value: userAge < 25 ? 75 : userAge < 30 ? 50 : 35,
      unit: 'miles',
      dealbreaker: userAge > 30
    },
    
    ageRange: {
      min: minAge,
      max: maxAge,
      dealbreaker: true
    },
    
    ethnicity: {
      value: [],
      options: 'any',
      dealbreaker: false
    },
    
    religion: {
      value: [],
      options: userAge > 30 ? ['christian', 'catholic', 'jewish', 'agnostic', 'atheist'] : 'any',
      dealbreaker: userAge > 35
    },
    
    relationshipType: {
      value: userAge < 25 ? ['casual', 'open_to_both'] : ['serious', 'open_to_both'],
      dealbreaker: userAge > 30
    },
    
    datingIntentions: {
      value: userAge < 25 ? ['fun', 'figuring_out', 'short_term'] : 
              userAge < 30 ? ['figuring_out', 'long_term'] : 
              ['long_term', 'life_partner'],
      dealbreaker: userAge > 28
    },
    
    height: {
      ...(isFemale ? { min: heightToInches(5, 8) } : {}),
      ...(isMale ? { max: heightToInches(5, 10) } : {}),
      dealbreaker: Math.random() > 0.7
    },
    
    kids: {
      hasKids: userAge > 35 ? 'no' : 'no_preference',
      wantsKids: userAge < 28 ? 'maybe' : userAge < 35 ? 'yes' : 'no',
      dealbreaker: userAge > 32
    },
    
    drugs: {
      value: 'never',
      acceptable: ['never', 'occasionally'],
      dealbreaker: true
    },
    
    smoking: {
      value: 'never',
      acceptable: userAge < 25 ? ['never', 'occasionally', 'trying_to_quit'] : ['never'],
      dealbreaker: userAge > 30
    },
    
    drinking: {
      value: 'social',
      acceptable: ['never', 'social', 'moderate'],
      dealbreaker: false
    },
    
    educationLevel: {
      minimum: userAge < 25 ? 'high_school' : userAge < 30 ? 'some_college' : 'bachelors',
      dealbreaker: userAge > 32
    }
  };

  // Add some variation based on specific profiles
  if (profile.displayName?.includes('Emma')) {
    // Yoga instructor - values healthy lifestyle
    preferences.drugs.dealbreaker = true;
    preferences.smoking.dealbreaker = true;
    preferences.drinking.acceptable = ['never', 'social'];
  } else if (profile.displayName?.includes('Michael')) {
    // Tech entrepreneur - values education
    preferences.educationLevel.minimum = 'bachelors';
    preferences.educationLevel.dealbreaker = true;
  } else if (profile.displayName?.includes('Sophia')) {
    // Artist - more open minded
    preferences.ethnicity.options = 'any';
    preferences.religion.options = 'any';
    preferences.relationshipType.value = ['casual', 'serious', 'open_to_both'];
  } else if (profile.displayName?.includes('Jake')) {
    // Adventure seeker
    preferences.maxDistance.value = 100;
    preferences.maxDistance.dealbreaker = false;
  }

  return preferences;
}

async function updateAllUsersWithPreferences() {
  console.log('Starting to update all users with preferences...');
  
  try {
    // Get all profiles
    const profilesSnapshot = await getDocs(collection(db, 'profiles'));
    console.log(`Found ${profilesSnapshot.size} profiles to update`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const profileDoc of profilesSnapshot.docs) {
      try {
        const profile = profileDoc.data();
        const preferences = generatePreferences(profile);
        
        // Update the profile
        await updateDoc(doc(db, 'profiles', profileDoc.id), {
          preferences,
          updatedAt: new Date()
        });
        
        successCount++;
        console.log(`✓ Updated preferences for ${profile.displayName || profileDoc.id}`);
        
      } catch (error) {
        errorCount++;
        console.error(`✗ Error updating profile ${profileDoc.id}:`, error);
      }
    }
    
    console.log('\nUpdate completed!');
    console.log(`Successfully updated: ${successCount} profiles`);
    console.log(`Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }
}

// Run the update
updateAllUsersWithPreferences()
  .then(() => {
    console.log('All users updated with preferences!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });