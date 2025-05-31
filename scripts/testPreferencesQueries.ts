import * as dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

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

// Test queries for dating preferences
async function testPreferencesQueries() {
  console.log('Testing preferences queries...\n');
  
  try {
    // 1. Get a sample user to use for matching
    const profilesSnapshot = await getDocs(collection(db, 'profiles'));
    const sampleProfile = profilesSnapshot.docs[0];
    const sampleData = sampleProfile.data();
    
    console.log(`Using ${sampleData.displayName} as reference for matching\n`);
    console.log('Their preferences:', JSON.stringify(sampleData.preferences, null, 2));
    console.log('\n---\n');
    
    // 2. Find users who match basic criteria
    console.log('Query 1: Find all users of preferred gender');
    const genderQuery = query(
      collection(db, 'profiles'),
      where('gender', 'in', sampleData.preferences?.interestedIn?.value || ['male', 'female'])
    );
    
    const genderMatches = await getDocs(genderQuery);
    console.log(`Found ${genderMatches.size} users matching gender preference\n`);
    
    // 3. Complex filtering example (would need to be done client-side after initial query)
    console.log('Query 2: Apply dealbreaker filters (client-side filtering)');
    
    let matchingProfiles = [];
    
    for (const profileDoc of genderMatches.docs) {
      const profile = profileDoc.data();
      
      // Skip self
      if (profileDoc.id === sampleProfile.id) continue;
      
      // Check if profile meets user's dealbreakers
      let meetsAllDealbreakers = true;
      
      // Age dealbreaker check
      if (sampleData.preferences?.ageRange?.dealbreaker) {
        const profileAge = calculateAge(profile.birthdate);
        if (profileAge < sampleData.preferences.ageRange.min || 
            profileAge > sampleData.preferences.ageRange.max) {
          meetsAllDealbreakers = false;
        }
      }
      
      // Check if user meets profile's dealbreakers
      if (profile.preferences?.ageRange?.dealbreaker) {
        const userAge = calculateAge(sampleData.birthdate);
        if (userAge < profile.preferences.ageRange.min || 
            userAge > profile.preferences.ageRange.max) {
          meetsAllDealbreakers = false;
        }
      }
      
      // Check interested in dealbreaker (mutual interest)
      if (profile.preferences?.interestedIn?.dealbreaker) {
        if (!profile.preferences.interestedIn.value.includes(sampleData.gender)) {
          meetsAllDealbreakers = false;
        }
      }
      
      if (meetsAllDealbreakers) {
        matchingProfiles.push({
          id: profileDoc.id,
          name: profile.displayName,
          age: calculateAge(profile.birthdate),
          dealbreakersMatch: true
        });
      }
    }
    
    console.log(`${matchingProfiles.length} profiles pass all dealbreakers:`);
    matchingProfiles.forEach(p => {
      console.log(`  - ${p.name}, age ${p.age}`);
    });
    
    // 4. Test composite index queries (for optimization)
    console.log('\n\nQuery 3: Test composite queries (these would benefit from indexes)');
    
    // Example: Find females in San Francisco
    const locationGenderQuery = query(
      collection(db, 'profiles'),
      where('gender', '==', 'female'),
      where('location.city', '==', 'San Francisco')
    );
    
    try {
      const lgMatches = await getDocs(locationGenderQuery);
      console.log(`Found ${lgMatches.size} females in San Francisco`);
    } catch (error) {
      console.log('This query might need a composite index. Error:', (error as Error).message);
    }
    
    // 5. Show sample preference statistics
    console.log('\n\nPreference Statistics:');
    
    let stats = {
      totalProfiles: profilesSnapshot.size,
      hasPreferences: 0,
      dealbreakers: {
        age: 0,
        distance: 0,
        kids: 0,
        smoking: 0,
        drinking: 0,
        education: 0
      }
    };
    
    profilesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.preferences) {
        stats.hasPreferences++;
        if (data.preferences.ageRange?.dealbreaker) stats.dealbreakers.age++;
        if (data.preferences.maxDistance?.dealbreaker) stats.dealbreakers.distance++;
        if (data.preferences.kids?.dealbreaker) stats.dealbreakers.kids++;
        if (data.preferences.smoking?.dealbreaker) stats.dealbreakers.smoking++;
        if (data.preferences.drinking?.dealbreaker) stats.dealbreakers.drinking++;
        if (data.preferences.educationLevel?.dealbreaker) stats.dealbreakers.education++;
      }
    });
    
    console.log(JSON.stringify(stats, null, 2));
    
  } catch (error) {
    console.error('Error testing queries:', error);
  }
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

// Run tests
testPreferencesQueries()
  .then(() => {
    console.log('\nQuery tests complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test error:', error);
    process.exit(1);
  });