import React from 'react';
import { View, Text } from 'react-native';
import styled from 'styled-components/native';
import { getRateLimitStatus, RateLimitConfigs } from '../utils/rateLimiter';

interface RateLimitDisplayProps {
  userId?: string;
  email?: string;
  actionType: 'like' | 'message' | 'profileUpdate' | 'login';
  isDark?: boolean;
}

const RateLimitDisplay: React.FC<RateLimitDisplayProps> = ({
  userId = '',
  email = '',
  actionType,
  isDark = false,
}) => {
  const getConfig = () => {
    switch (actionType) {
      case 'like':
        return RateLimitConfigs.LIKE_ACTION(userId);
      case 'message':
        return RateLimitConfigs.SEND_MESSAGE(userId);
      case 'profileUpdate':
        return RateLimitConfigs.PROFILE_UPDATE(userId);
      case 'login':
        return RateLimitConfigs.LOGIN_ATTEMPT(email);
      default:
        return null;
    }
  };

  const config = getConfig();
  if (!config) return null;

  const status = getRateLimitStatus(config);

  const getActionText = () => {
    switch (actionType) {
      case 'like':
        return 'likes';
      case 'message':
        return 'messages';
      case 'profileUpdate':
        return 'profile updates';
      case 'login':
        return 'login attempts';
      default:
        return 'actions';
    }
  };

  const getTimeText = () => {
    const windowMinutes = Math.floor(config.windowMs / (60 * 1000));
    if (windowMinutes >= 60) {
      const hours = Math.floor(windowMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${windowMinutes} minute${windowMinutes > 1 ? 's' : ''}`;
  };

  if (status.isLimited) {
    return (
      <LimitContainer isDark={isDark} isLimited={true}>
        <LimitText isDark={isDark} isLimited={true}>
          Rate limit reached! Please wait {status.resetTime} seconds before trying again.
        </LimitText>
      </LimitContainer>
    );
  }

  if (status.remaining <= 2) {
    return (
      <LimitContainer isDark={isDark} isLimited={false}>
        <LimitText isDark={isDark} isLimited={false}>
          {status.remaining} {getActionText()} remaining in the next {getTimeText()}
        </LimitText>
      </LimitContainer>
    );
  }

  return null;
};

interface LimitContainerProps {
  isDark: boolean;
  isLimited: boolean;
}

interface LimitTextProps {
  isDark: boolean;
  isLimited: boolean;
}

const LimitContainer = styled.View<LimitContainerProps>`
  padding: 8px 12px;
  border-radius: 6px;
  margin: 4px 0;
  background-color: ${({ isDark, isLimited }: LimitContainerProps) => {
    if (isLimited) {
      return isDark ? '#2D1B1B' : '#FFEBEE';
    }
    return isDark ? '#1B2D1B' : '#E8F5E8';
  }};
  border: 1px solid ${({ isDark, isLimited }: LimitContainerProps) => {
    if (isLimited) {
      return isDark ? '#D32F2F' : '#F44336';
    }
    return isDark ? '#4CAF50' : '#8BC34A';
  }};
`;

const LimitText = styled.Text<LimitTextProps>`
  font-size: 12px;
  color: ${({ isDark, isLimited }: LimitTextProps) => {
    if (isLimited) {
      return isDark ? '#FF6B6B' : '#D32F2F';
    }
    return isDark ? '#81C784' : '#2E7D32';
  }};
  text-align: center;
`;

export default RateLimitDisplay;