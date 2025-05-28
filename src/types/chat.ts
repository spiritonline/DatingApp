// src/types/chat.ts
import { Timestamp } from '@firebase/firestore'; // For Firestore timestamps

// Represents an individual item within a gallery message.
export interface GalleryMediaItem {
    uri: string; // Local URI or remote URL for display
    type: 'image' | 'video';
    thumbnailUrl?: string; // For video items
    caption?: string;
    dimensions?: { width: number; height: number };
    duration?: number; // For videos, in seconds
    fileName?: string; // Optional original filename
}

// Base message structure, closely mirroring Firestore data
// This is what chatService will primarily work with.
export interface ChatServiceMessage {
    id: string; // Document ID
    senderId: string;
    content: string; // For text, or general caption for media/gallery
    type: 'text' | 'image' | 'video' | 'audio' | 'gallery';
    createdAt: Timestamp; // Firestore Timestamp
    
    // Media-specific fields (for type 'image', 'video', 'audio')
    mediaUrl?: string;
    thumbnailUrl?: string; // e.g., for video
    duration?: number; // For video/audio, in seconds
    dimensions?: { width: number; height: number }; // For image/video
    caption?: string; // Specific caption for a single media item if different from `content`

    // Gallery-specific fields (for type 'gallery')
    galleryItems?: GalleryMediaItem[];
    galleryCaption?: string; // Overall caption for the gallery

    // Common optional fields
    reactions?: Record<string, string[]>; // emoji: [userId1, userId2]
    replyTo?: {
        id: string; // ID of the message being replied to
        content: string; // Snippet of the content of the replied message
        senderId: string; // Sender of the replied message
    };
    readBy?: string[]; // Array of user IDs who have read the message
    status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

// Message type specifically for UI rendering (e.g., in FlatList)
// It might convert Firestore Timestamps to JS Dates, etc.
export interface UIMessage extends Omit<ChatServiceMessage, 'createdAt'> {
    createdAt: Date; // JavaScript Date object for easier UI formatting
    // Add any UI-specific derived properties if needed in the future
    // e.g., isCurrentUser?: boolean; (though often calculated in component)
}

// For MediaPreviewScreen navigation
export interface MediaItemForPreview {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  duration?: number; // For videos, in seconds
  fileName?: string;
}

// For ChatListScreen
export interface ChatPreview {
  id: string; // Chat ID
  participantIds: string[];
  participantNames?: Record<string, string>; // UID to display name mapping
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: Timestamp | Date; // Can be either until fully processed
    type: ChatServiceMessage['type'];
    replyTo?: ChatServiceMessage['replyTo'];
  };
  isTestChat?: boolean;
  unreadCount?: number; // Simplified unread count for current user
}