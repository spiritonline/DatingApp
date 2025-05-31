import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { DatingPreferences, ETHNICITY_OPTIONS, RELIGION_OPTIONS, heightToInches } from '../src/types/preferences';

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Helper function to generate realistic preferences based on user profile
function generatePreferencesForUser(profile: any): DatingPreferences {
  // Determine interested in based on user's gender and existing interestedIn field
  const interestedInValue = profile.interestedIn || 
    (profile.gender === 'male' ? ['female'] : 
     profile.gender === 'female' ? ['male'] : 
     ['male', 'female', 'non-binary']);

  // Calculate age range based on user's age
  const userAge = profile.age || calculateAge(profile.birthdate);
  const minAge = Math.max(18, userAge - 5);
  const maxAge = Math.min(100, userAge + 10);

  // Random selection helpers
  const randomBool = () => Math.random() > 0.5;
  const randomFromArray = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const randomMultipleFromArray = <T>(arr: T[], min: number, max: number): T[] => {
    const count = Math.floor(Math.random() * (max - min + 1)) + min;
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  // Generate preferences with some randomization
  const preferences: DatingPreferences = {
    interestedIn: {
      value: interestedInValue,
      dealbreaker: true // Usually a dealbreaker
    },
    
    location: {
      value: {
        latitude: profile.location?.latitude || 37.7749,
        longitude: profile.location?.longitude || -122.4194,
        city: 'San Francisco',
        state: 'CA',
        country: 'USA'
      },
      dealbreaker: false
    },
    
    maxDistance: {
      value: randomFromArray([25, 50, 75, 100, 150]),
      unit: 'miles',
      dealbreaker: randomBool()
    },
    
    ageRange: {
      min: minAge,
      max: maxAge,
      dealbreaker: Math.random() > 0.3 // 70% chance of being a dealbreaker
    },
    
    ethnicity: {
      value: Math.random() > 0.7 ? [] : randomMultipleFromArray(ETHNICITY_OPTIONS, 1, 3),
      options: Math.random() > 0.7 ? 'any' : randomMultipleFromArray(ETHNICITY_OPTIONS, 1, 5),
      dealbreaker: Math.random() > 0.8 // 20% chance
    },
    
    religion: {
      value: Math.random() > 0.6 ? [] : randomMultipleFromArray(RELIGION_OPTIONS, 1, 2),
      options: Math.random() > 0.6 ? 'any' : randomMultipleFromArray(RELIGION_OPTIONS, 1, 3),
      dealbreaker: Math.random() > 0.7 // 30% chance
    },
    
    relationshipType: {
      value: randomMultipleFromArray(['casual', 'serious', 'friendship', 'open_to_both'], 1, 2),
      dealbreaker: Math.random() > 0.6 // 40% chance
    },
    
    datingIntentions: {
      value: randomMultipleFromArray(['long_term', 'short_term', 'life_partner', 'figuring_out', 'fun'], 1, 3),
      dealbreaker: Math.random() > 0.7 // 30% chance
    },
    
    height: {
      min: profile.gender === 'female' ? heightToInches(5, 6) : undefined, // Women might prefer taller
      max: profile.gender === 'male' ? heightToInches(5, 8) : undefined, // Men might have max preference
      dealbreaker: Math.random() > 0.8 // 20% chance
    },
    
    kids: {
      hasKids: randomFromArray(['yes', 'no', 'no_preference']),
      wantsKids: randomFromArray(['yes', 'no', 'maybe', 'no_preference']),
      dealbreaker: Math.random() > 0.6 // 40% chance
    },
    
    drugs: {
      value: randomFromArray(['never', 'occasionally', 'regularly', 'no_preference']),
      acceptable: Math.random() > 0.5 ? 
        ['never', 'occasionally'] : 
        ['never', 'occasionally', 'regularly'],
      dealbreaker: Math.random() > 0.7 // 30% chance
    },
    
    smoking: {
      value: randomFromArray(['never', 'occasionally', 'regularly', 'trying_to_quit', 'no_preference']),
      acceptable: Math.random() > 0.6 ? 
        ['never', 'trying_to_quit'] : 
        ['never', 'occasionally', 'regularly', 'trying_to_quit'],
      dealbreaker: Math.random() > 0.6 // 40% chance
    },
    
    drinking: {
      value: randomFromArray(['never', 'social', 'moderate', 'regular', 'no_preference']),
      acceptable: Math.random() > 0.3 ? 
        ['never', 'social', 'moderate'] : 
        ['never', 'social', 'moderate', 'regular'],
      dealbreaker: Math.random() > 0.8 // 20% chance
    },
    
    educationLevel: {
      minimum: randomFromArray(['high_school', 'some_college', 'bachelors', 'masters', 'doctorate', 'no_preference']),
      dealbreaker: Math.random() > 0.7 // 30% chance
    }
  };

  return preferences;
}

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

async function migrateUserPreferences() {
  console.log('Starting user preferences migration...');
  
  try {
    // Get all profiles
    const profilesSnapshot = await db.collection('profiles').get();
    console.log(`Found ${profilesSnapshot.size} profiles to update`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process each profile
    for (const doc of profilesSnapshot.docs) {
      try {
        const profile = doc.data();
        const preferences = generatePreferencesForUser(profile);
        
        // Update the profile with preferences
        await db.collection('profiles').doc(doc.id).update({
          preferences,
          updatedAt: new Date()
        });
        
        // Also update the corresponding user document if it exists
        const userDoc = await db.collection('users').doc(doc.id).get();
        if (userDoc.exists) {
          await db.collection('users').doc(doc.id).update({
            preferences,
            updatedAt: new Date()
          });
        }
        
        successCount++;
        console.log(`✓ Updated preferences for ${profile.displayName || doc.id}`);
        
      } catch (error) {
        errorCount++;
        console.error(`✗ Error updating profile ${doc.id}:`, error);
      }
    }
    
    console.log('\nMigration completed!');
    console.log(`Successfully updated: ${successCount} profiles`);
    console.log(`Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateUserPreferences()
  .then(() => {
    console.log('Migration finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
  });