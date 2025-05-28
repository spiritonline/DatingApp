// Message types for chat functionality

// Media type enum
export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
}

// Base Message interface
export interface Message {
  id: string;
  senderId: string;
  content?: string;
  type: 'text' | 'media' | 'gallery' | 'location';
  createdAt: Date | { toDate: () => Date };
  mediaType?: MediaType | string;
  mediaUrl?: string;
  caption?: string;
  reactions?: Record<string, string[]>;
  replyTo?: {
    id: string;
    content?: string;
    senderId: string;
  };
  media?: {
    url: string;
    type: string;
    caption?: string;
    width?: number;
    height?: number;
  }[];
  galleryItems?: GalleryItem[];
  galleryCaption?: string;
  dimensions?: {
    width: number;
    height: number;
  };
  thumbnailUrl?: string;
}

// Gallery item interface
export interface GalleryItem {
  url: string;
  uri: string;
  type: string;
  width: number;
  height: number;
  caption?: string;
  thumbnailUrl?: string;
  dimensions?: {
    width: number;
    height: number;
  };
}

// Message reaction type
export interface MessageReaction {
  emoji: string;
  userId: string;
  timestamp: Date;
}

// Attachment interface
export interface Attachment {
  id: string;
  type: MediaType;
  url: string;
  fileName?: string;
  fileSize?: number;
  duration?: number; // For audio/video
  width?: number; // For images/videos
  height?: number; // For images/videos
  thumbnailUrl?: string; // For videos
}

// Chat service message type
export interface ChatServiceMessageType {
  id: string;
  senderId: string;
  content?: string;
  type: 'text' | 'media' | 'gallery' | 'location';
  createdAt: Date | { toDate: () => Date };
  mediaType?: string;
  mediaUrl?: string;
  caption?: string;
  reactions?: Record<string, string[]>;
  replyTo?: {
    id: string;
    content?: string;
    senderId: string;
  };
}

// Message status enum
export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}
