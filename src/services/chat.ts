// src/types/chat.ts
import { Timestamp } from '@firebase/firestore'; // Import Firestore Timestamp for clarity

/**
 * This is the shape of the message object as it's primarily stored in/retrieved from Firestore,
 * often used by service functions.
 * We'll assume this is defined in a central place, perhaps '../types/message.ts' as you had.
 * If not, define it here or ensure it matches your Firestore structure.
 */
export interface ChatServiceMessageType {
  id: string; // Document ID
  senderId: string;
  content: string; // For text, or caption for media
  type: 'text' | 'image' | 'video' | 'audio' | 'gallery';
  createdAt: Timestamp; // Firestore Timestamp
  mediaUrl?: string;
  thumbnailUrl?: string;
  duration?: number; // For video/audio
  dimensions?: { width: number; height: number }; // For image/video
  reactions?: Record<string, string[]>; // emoji: [userId1, userId2]
  replyTo?: {
    id: string;
    content: string;
    senderId: string;
  };
  readBy?: string[]; // Array of user IDs who have read the message
  // Add any other fields that come directly from Firestore
  galleryItems?: GalleryMediaItem[]; // If gallery items are stored directly on the message doc
  galleryCaption?: string; // If gallery caption is stored directly
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'; // Optional: for message status
}

/**
 * Represents an individual item within a gallery message.
 */
export interface GalleryMediaItem {
  uri: string; // Local URI or remote URL for display
  type: 'image' | 'video';
  thumbnailUrl?: string; // For video items
  caption?: string;
  dimensions?: { width: number; height: number };
  duration?: number;
  fileName?: string;
}

/**
 * Represents a message object as used in the UI components.
 * It might have `createdAt` converted to a JavaScript Date object.
 */
export interface Message {
  id: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'gallery';
  createdAt: Date; // For UI consistency, services will handle Timestamp <-> Date conversion
  mediaUrl?: string;
  thumbnailUrl?: string;
  caption?: string; // Combined caption for image/video, or individual if no galleryCaption
  duration?: number;
  dimensions?: { width: number; height: number };
  reactions?: Record<string, string[]>;
  replyTo?: {
    id: string;
    content: string; // Preview of the replied message
    senderId: string;
  };
  isRead?: boolean; // Simplified for UI, derived from readBy
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

  // Gallery specific fields for UI
  galleryItems?: GalleryMediaItem[];
  galleryCaption?: string; // Overall caption for the gallery

  // For UI rendering, you might add other derived properties if needed
  isCurrentUser?: boolean; // Can be derived in the component
  mediaType?: 'image' | 'video' | 'audio'; // Often redundant if `type` is specific
}


/**
 * Represents a media item when preparing for preview or upload.
 * Used as navigation parameters to MediaPreviewScreen.
 */
export interface MediaItem {
  uri: string; // Local URI of the media
  type: 'image' | 'video';
  width?: number;
  height?: number;
  duration?: number; // For videos
  fileName?: string; // Optional original filename
}

/**
 * Represents the preview of a chat conversation in a list.
 * This should align with what `getChats` or similar service function returns.
 */
export interface ChatPreview {
  id: string; // Chat ID
  participantIds: string[];
  participantNames?: Record<string, string>; // UID to display name mapping
  lastMessage?: string; // Text content of the last message or a placeholder like "[Media]"
  lastMessageTime?: Timestamp | Date; // Timestamp of the last message
  lastMessageSenderId?: string;
  lastMessageType?: 'text' | 'image' | 'video' | 'audio' | 'gallery';
  unreadCount?: Record<string, number>; // UID to unread count mapping
  isTestChat?: boolean;
  // Add any other fields relevant for chat list display (e.g., group chat image)
}