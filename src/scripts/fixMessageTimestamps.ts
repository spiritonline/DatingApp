// Script to fix message timestamps in the database
// Run this in development if you continue to see timestamp warnings

import { debugAndFixMessageTimestamps } from '../utils/debugTimestamps';

async function main() {
  console.log('🛠️  Starting message timestamp fix...');
  
  try {
    await debugAndFixMessageTimestamps();
    console.log('✅ Message timestamp fix completed successfully');
  } catch (error) {
    console.error('❌ Error fixing message timestamps:', error);
  }
}

// Uncomment the line below and run this script if needed
// main();

export default main;