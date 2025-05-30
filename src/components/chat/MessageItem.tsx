// src/components/chat/MessageItem.tsx
import React, { useCallback, useEffect } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Swipeable, TouchableOpacity as GestureTouchableOpacity } from 'react-native-gesture-handler';
// Use our cached image component for better performance
import { CachedImage } from '../../components/CachedImage';
// Import prefetchManager for proactive loading
import { prefetchManager } from '../../services/cache/prefetchManager';

import { UIMessage, GalleryMediaItem as UIGalleryMediaItem } from '../../types/chat';

import {
    MessageContainer,
    MessageBubble,
    VideoPreviewContainer,
    PlayIconOverlay,
    PlayIconText,
    MessageText,
    CaptionText,
    GalleryGridContainer,
    GalleryItemTouchable,
    VideoIconText,
    MoreItemsOverlay,
    MoreItemsText,
    MessageTime,
    ReplyContextContainer,
    ReplyContextSender,
    ReplyContextText,
    ReactionsContainer,
    ReactionPill,
    ReactionEmoji,
    ReactionCount,
} from '../../screens/ChatConversationScreen.styles';

interface MessageItemProps {
    item: UIMessage;
    isCurrentUser: boolean;
    isDark: boolean;
    isHighlighted: boolean;
    REPLY_PREVIEW_MAX_LENGTH: number;
    swipeableRefs: React.MutableRefObject<Record<string, Swipeable | null>>;
    messageRefs: React.MutableRefObject<Record<string, View | null>>;
    onSwipeReply: (message: UIMessage) => void;
    onLongPressMessage: (message: UIMessage) => void;
    onReplyContextTap: (originalMessageId: string) => void;
    formatTime: (timestamp: Date) => string;
    truncateText: (text: string | undefined, maxLength: number) => string;
    getDisplayNameForReply: (senderId: string) => string;
    onViewMedia: (message: UIMessage) => void;
    onNavigateToImageViewer: (galleryItems: UIGalleryMediaItem[], initialIndex: number, galleryCaption?: string) => void;
}

const MessageItem: React.FC<MessageItemProps> = ({
    item,
    isCurrentUser,
    isDark,
    isHighlighted,
    REPLY_PREVIEW_MAX_LENGTH,
    swipeableRefs,
    messageRefs,
    onSwipeReply,
    onLongPressMessage,
    onReplyContextTap,
    formatTime,
    truncateText,
    getDisplayNameForReply,
    onViewMedia,
    onNavigateToImageViewer,
}) => {

    const renderLeftActions = useCallback(() => {
        return <View style={{ width: 70, backgroundColor: 'transparent' }} />;
    }, []);
    
    // Prefetch media content when the component mounts
    useEffect(() => {
        if (item.type === 'image') {
            // Prefetch image content for faster loading
            if (item.mediaUrl) {
                prefetchManager.prefetchImage(item.mediaUrl, 'high');
            } else if (item.content) {
                prefetchManager.prefetchImage(item.content, 'high');
            }
        } else if (item.type === 'video' && item.thumbnailUrl) {
            // Prefetch video thumbnails
            prefetchManager.prefetchImage(item.thumbnailUrl, 'normal');
        } else if (item.type === 'gallery' && item.galleryItems && item.galleryItems.length > 0) {
            // Prefetch the first few gallery thumbnails
            const thumbnailUrls = item.galleryItems
                .slice(0, 4)
                .map(galleryItem => galleryItem.thumbnailUrl || galleryItem.uri)
                .filter(Boolean);
            
            if (thumbnailUrls.length) {
                prefetchManager.prefetchImages(thumbnailUrls, 'normal');
            }
        }
    }, [item]);

    const replyContent = item.replyTo ? truncateText(item.replyTo.content, REPLY_PREVIEW_MAX_LENGTH) : '';
    const replySenderName = item.replyTo ? getDisplayNameForReply(item.replyTo.senderId) : '';

    return (
        <Swipeable
            ref={(ref) => {
                if (ref) swipeableRefs.current[item.id] = ref;
            }}
            renderLeftActions={renderLeftActions}
            onSwipeableOpen={() => onSwipeReply(item)}
            overshootLeft={false}
            friction={1.5}
        >
            <GestureTouchableOpacity
                onLongPress={() => onLongPressMessage(item)}
                delayLongPress={300}
                activeOpacity={0.8}
            >
                <View
                    ref={(ref) => {
                        if (ref) messageRefs.current[item.id] = ref;
                    }}
                >
                    <MessageContainer
                        isCurrentUser={isCurrentUser}
                        isDark={isDark}
                        testID={isCurrentUser ? 'sent-message' : 'received-message'}
                    >
                        <MessageBubble isDark={isDark} isCurrentUser={isCurrentUser} isHighlighted={isHighlighted}>
                            {item.replyTo && (
                                <ReplyContextContainer
                                    onPress={() => item.replyTo && onReplyContextTap(item.replyTo.id)}
                                    isCurrentUser={isCurrentUser}
                                    isDark={isDark}
                                >
                                    <ReplyContextSender isDark={isDark} isCurrentUser={isCurrentUser}>
                                        {replySenderName}
                                    </ReplyContextSender>
                                    <ReplyContextText isDark={isDark} isCurrentUser={isCurrentUser}>
                                        {replyContent}
                                    </ReplyContextText>
                                </ReplyContextContainer>
                            )}

                            {item.type === 'image' ? (
                                <View style={{ maxWidth: 250, alignSelf: isCurrentUser ? 'flex-end' : 'flex-start' }}>
                                    {/* Use direct press handler function to avoid closure issues */}
                                    <GestureTouchableOpacity 
                                        onPress={() => {
                                            console.log('Image pressed, item ID:', item.id);
                                            console.log('Image type:', item.type);
                                            console.log('Image URL:', item.mediaUrl || item.content);
                                            
                                            // Create gallery item for the ImageViewer with all required properties
                                            const imageUri = item.mediaUrl || item.content;
                                            if (imageUri) {
                                                const galleryItems: UIGalleryMediaItem[] = [{
                                                    uri: imageUri,
                                                    type: 'image' as const, // Use type literal with 'as const' for type safety
                                                    dimensions: item.dimensions,
                                                    caption: item.caption || ''
                                                }];
                                                onNavigateToImageViewer(galleryItems, 0);
                                            }
                                        }}
                                        activeOpacity={0.7}
                                        delayPressIn={0}
                                    >
                                        <View style={{ width: 250, height: 200, borderRadius: 10, overflow: 'hidden' }}>
                                            <CachedImage 
                                                source={{ uri: item.mediaUrl || item.content || '' }} 
                                                style={{ 
                                                    width: '100%', 
                                                    height: '100%'
                                                }}
                                                resizeMode="cover"
                                                prefetch={true}
                                                priority="high"
                                                showLoadingIndicator={true}
                                            />
                                        </View>
                                        {item.caption && <CaptionText isDark={isDark} isCurrentUser={isCurrentUser}>{item.caption}</CaptionText>}
                                    </GestureTouchableOpacity>
                                </View>
                            ) : item.type === 'video' && (item.mediaUrl || item.thumbnailUrl) ? (
                                <TouchableOpacity onPress={() => onViewMedia(item)}>
                                    <VideoPreviewContainer isDark={isDark} isCurrentUser={isCurrentUser}>
                                        <CachedImage 
                                            source={{ uri: item.thumbnailUrl || item.mediaUrl || '' }} 
                                            style={{ width: '100%', height: 200, borderRadius: 8 }}
                                            prefetch={true}
                                            priority="normal"
                                            showLoadingIndicator={true}
                                        />
                                        <PlayIconOverlay>
                                            <PlayIconText>▶️</PlayIconText>
                                        </PlayIconOverlay>
                                    </VideoPreviewContainer>
                                    {item.caption && <CaptionText isDark={isDark} isCurrentUser={isCurrentUser}>{item.caption}</CaptionText>}
                                </TouchableOpacity>
                            ) : item.type === 'gallery' && item.galleryItems && item.galleryItems.length > 0 ? (
                                <View>
                                    {item.galleryCaption && (
                                        <CaptionText isDark={isDark} isCurrentUser={isCurrentUser} style={{ marginBottom: 8 }}>
                                            {item.galleryCaption}
                                        </CaptionText>
                                    )}
                                    <GalleryGridContainer>
                                        {(item.galleryItems || []).slice(0, 4).map((galleryItem: UIGalleryMediaItem, index: number) => (
                                            <GalleryItemTouchable
                                                key={galleryItem.uri + index}
                                                onPress={() => {
                                                    if (item.galleryItems) {
                                                        onNavigateToImageViewer(item.galleryItems, index, item.galleryCaption);
                                                    }
                                                }}
                                            >
                                                <CachedImage 
                                                    source={{ uri: galleryItem.thumbnailUrl || galleryItem.uri }} 
                                                    style={{ width: '100%', height: '100%', borderRadius: 4 }}
                                                    prefetch={true}
                                                    priority="normal"
                                                    showLoadingIndicator={true}
                                                />
                                                {galleryItem.type === 'video' && <VideoIconText>▶️</VideoIconText>}
                                                {item.galleryItems && item.galleryItems.length > 4 && index === 3 && (
                                                    <MoreItemsOverlay>
                                                        <MoreItemsText>+{item.galleryItems.length - 4}</MoreItemsText>
                                                    </MoreItemsOverlay>
                                                )}
                                            </GalleryItemTouchable>
                                        ))}
                                    </GalleryGridContainer>
                                </View>
                            ) : (
                                <MessageText isDark={isDark} isCurrentUser={isCurrentUser}>
                                    {item.content}
                                </MessageText>
                            )}

                            <MessageTime isDark={isDark} isCurrentUser={isCurrentUser}>
                                {formatTime(item.createdAt)}
                            </MessageTime>

                            {item.reactions && Object.keys(item.reactions).length > 0 && (
                                <ReactionsContainer>
                                    {Object.entries(item.reactions).map(([emoji, userIds]) => {
                                        return userIds && userIds.length > 0 ? (
                                            <ReactionPill key={emoji}>
                                                <ReactionEmoji>{emoji}</ReactionEmoji>
                                                <ReactionCount>{userIds.length}</ReactionCount>
                                            </ReactionPill>
                                        ) : null;
                                    })}
                                </ReactionsContainer>
                            )}
                        </MessageBubble>
                    </MessageContainer>
                </View>
            </GestureTouchableOpacity>
        </Swipeable>
    );
};

export default React.memo(MessageItem);