// src/components/chat/MessageItem.tsx
import React, { useCallback } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Swipeable, TouchableOpacity as GestureTouchableOpacity } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { ImageMessageThumbnail } from './index';

import { UIMessage, GalleryMediaItem as UIGalleryMediaItem } from '../../types/chat';

import {
    MessageContainer,
    MessageBubble,
    StyledImage,
    VideoPreviewContainer,
    PlayIconOverlay,
    PlayIconText,
    MessageText,
    CaptionText,
    GalleryGridContainer,
    GalleryItemTouchable,
    GalleryThumbnailImage,
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
} from '../../screens/ChatConversationScreen.styles'; // Path to styles

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
                                    onPress={() => item.replyTo && onReplyContextTap(item.replyTo.id)} // Added null check
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

                            {item.type === 'image' && item.mediaUrl ? (
                                <ImageMessageThumbnail
                                    uri={item.mediaUrl}
                                    caption={item.caption}
                                    dimensions={item.dimensions}
                                    isDark={isDark}
                                    isCurrentUser={isCurrentUser}
                                />
                            ) : item.type === 'video' && (item.mediaUrl || item.thumbnailUrl) ? (
                                <TouchableOpacity onPress={() => onViewMedia(item)}>
                                    <VideoPreviewContainer isDark={isDark} isCurrentUser={isCurrentUser}>
                                        <StyledImage
                                            source={{ uri: item.thumbnailUrl || item.mediaUrl }}
                                            isDark={isDark}
                                            isCurrentUser={isCurrentUser}
                                            contentFit="cover"
                                        />
                                        <PlayIconOverlay>
                                            <PlayIconText>▶</PlayIconText>
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
                                                <GalleryThumbnailImage source={{ uri: galleryItem.thumbnailUrl || galleryItem.uri }} contentFit="cover" />
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