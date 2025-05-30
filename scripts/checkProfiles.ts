import { db } from '../src/services/firebase';
import { collection, getDocs } from '@firebase/firestore';

async function checkProfiles() {
  try {
    console.log('Fetching profiles from Firestore...');
    const profilesRef = collection(db, 'profiles');
    const snapshot = await getDocs(profilesRef);
    
    if (snapshot.empty) {
      console.log('No profiles found in the database.');
      return;
    }
    
    console.log(`Found ${snapshot.size} profiles:`);
    snapshot.forEach(doc => {
      console.log(`\nProfile ID: ${doc.id}`);
      console.log('Data:', JSON.stringify(doc.data(), null, 2));
    });
    
  } catch (error) {
    console.error('Error fetching profiles:', error);
  }
}

// Run the function
checkProfiles();
