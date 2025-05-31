# Firestore Index Setup for Likes Feature

## Required Indexes

The likes feature requires composite indexes to be created in Firestore. These indexes can be created in one of two ways:

### Option 1: Automatic Creation (Recommended)
1. Run the app and navigate to the Likes tab
2. When you see the index error in the console, click the provided link
3. Firebase will automatically create the required index for you
4. Wait 2-3 minutes for the index to be built

### Option 2: Manual Creation via Firebase Console

Navigate to your Firebase Console → Firestore Database → Indexes and create the following composite indexes:

#### 1. Likes Collection - Pending Likes Query
- **Collection ID**: `likes`
- **Fields to index**:
  - `toUserId` - Ascending
  - `status` - Ascending  
  - `createdAt` - Descending
- **Query scope**: Collection

#### 2. Matches Collection - User1 Query
- **Collection ID**: `matches`
- **Fields to index**:
  - `user1Id` - Ascending
  - `lastActivity` - Descending
- **Query scope**: Collection

#### 3. Matches Collection - User2 Query
- **Collection ID**: `matches`
- **Fields to index**:
  - `user2Id` - Ascending
  - `lastActivity` - Descending
- **Query scope**: Collection

## Temporary Workaround

While the indexes are being created (which can take 2-10 minutes), the app includes a fallback mechanism that:

1. Detects when an index is missing
2. Falls back to a simpler query
3. Performs filtering and sorting in memory
4. Shows a warning in the console

This ensures the app remains functional even without the indexes, though performance may be slightly degraded for users with many likes.

## Verifying Index Creation

To verify the indexes have been created:
1. Go to Firebase Console → Firestore → Indexes
2. Look for the indexes listed above with status "Enabled"
3. Once enabled, the app will automatically use the optimized queries

## Deployment via CLI

To deploy indexes via Firebase CLI:
```bash
firebase deploy --only firestore:indexes
```

Note: If you encounter errors about existing indexes, you may need to manually delete conflicting indexes in the Firebase Console first.