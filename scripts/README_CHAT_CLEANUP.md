# Chat Cleanup Script

This script removes legacy "User" chat threads from the Firestore database while preserving Jake Martinez as the only default test chat.

## What the script does

1. **Deletes specific legacy test chats** that were causing "User" entries in the chat list
2. **Removes orphaned chats** where participant profiles no longer exist
3. **Preserves Jake Martinez chats** (marked with `isDefaultChat: true`)

## How to run the script

### Option 1: Using Firebase CLI (Recommended)

1. Make sure you have Firebase CLI installed and are logged in:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. Navigate to the scripts directory:
   ```bash
   cd scripts
   ```

3. Install dependencies if needed:
   ```bash
   npm install
   ```

4. Update the Firebase config in `cleanupLegacyChats.ts` with your project settings

5. Run the script:
   ```bash
   npx ts-node cleanupLegacyChats.ts
   ```

### Option 2: Through the main app

You can also import and call the cleanup function from your app code:

```typescript
import { cleanupLegacyChats } from './scripts/cleanupLegacyChats';

// Call this once to clean up legacy chats
await cleanupLegacyChats();
```

## What was fixed

### Before:
- Chat list showed "User" entries for orphaned test chats
- Legacy test chat documents existed in Firestore
- Fallback logic created generic "User" names

### After:
- Only Jake Martinez and actual match-based chats appear
- Legacy test chats are filtered out or deleted
- Improved fallback logic with more descriptive names
- Match-based chat creation integrated with likes system

## Code changes made

1. **Updated `getUserChats()` in `chatService.ts`:**
   - Filters out legacy test chats
   - Skips orphaned chats (where participant profiles don't exist)
   - Ensures Jake Martinez chats are preserved

2. **Improved fallback logic in `ChatListScreen.tsx`:**
   - Better handling when user profiles are missing
   - More descriptive fallback names

3. **Added match-based chat creation:**
   - New `createMatchChat()` function
   - Automatic chat creation when users match
   - Integration with the likes system

## Future improvements

The system is now set up to:
- Automatically create chats when users match through the likes system
- Only display legitimate chats (Jake Martinez + actual matches)
- Handle edge cases gracefully without creating "User" entries

## Safety notes

- The script only deletes specific legacy test chats
- Jake Martinez chats are explicitly preserved
- The cleanup is idempotent (safe to run multiple times)
- All changes are logged to the console for transparency