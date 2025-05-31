import AsyncStorage from '@react-native-async-storage/async-storage';
import { handleServiceError, logError, AppError } from '../../utils/errorHandler';

interface OfflineAction {
  id: string;
  type: 'like' | 'dislike' | 'message' | 'profile_update';
  data: any;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

interface OfflineConfig {
  maxRetries: number;
  maxQueueSize: number;
  syncInterval: number;
}

/**
 * Offline storage and sync manager
 */
export class OfflineStorage {
  private readonly QUEUE_KEY = '@offline_queue';
  private readonly CACHE_PREFIX = '@offline_cache:';
  private queue: OfflineAction[] = [];
  private isOnline = true;
  private syncInProgress = false;
  private syncTimer: NodeJS.Timeout | null = null;
  
  private config: OfflineConfig = {
    maxRetries: 3,
    maxQueueSize: 100,
    syncInterval: 30000, // 30 seconds
  };

  constructor() {
    this.initialize();
  }

  /**
   * Initialize offline storage
   */
  private async initialize(): Promise<void> {
    try {
      // Load queue from storage
      await this.loadQueue();
      
      // For now, assume we're always online to avoid dependency issues
      // In a production app, you would implement proper network monitoring
      this.isOnline = true;
      
      // Start periodic sync
      this.startPeriodicSync();
    } catch (error) {
      logError(handleServiceError(error), { operation: 'offline_init' });
    }
  }

  /**
   * Queue an action for offline execution
   */
  async queueAction(type: OfflineAction['type'], data: any): Promise<void> {
    try {
      if (this.queue.length >= this.config.maxQueueSize) {
        throw new AppError(
          'Offline queue is full. Please sync your data first.',
          'offline-queue-full',
          'high',
          'storage'
        );
      }
      
      const action: OfflineAction = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        timestamp: Date.now(),
        retryCount: 0,
      };
      
      this.queue.push(action);
      await this.saveQueue();
      
      // Try to sync immediately if online
      if (this.isOnline) {
        this.syncQueue();
      }
    } catch (error) {
      const appError = handleServiceError(error);
      logError(appError, { operation: 'queue_action', type });
      throw appError;
    }
  }

  /**
   * Store data for offline access
   */
  async cacheData<T>(key: string, data: T): Promise<void> {
    try {
      const cacheKey = this.CACHE_PREFIX + key;
      const cacheData = {
        data,
        timestamp: Date.now(),
      };
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      // Cache errors shouldn't break functionality
      if (__DEV__) {
        console.warn('Failed to cache data:', error);
      }
    }
  }

  /**
   * Retrieve cached data
   */
  async getCachedData<T>(key: string, maxAge?: number): Promise<T | null> {
    try {
      const cacheKey = this.CACHE_PREFIX + key;
      const stored = await AsyncStorage.getItem(cacheKey);
      
      if (!stored) return null;
      
      const { data, timestamp } = JSON.parse(stored);
      
      // Check if data is too old
      if (maxAge && Date.now() - timestamp > maxAge) {
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }
      
      return data as T;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear cached data
   */
  async clearCache(prefix?: string): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith(this.CACHE_PREFIX + (prefix || ''))
      );
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      logError(handleServiceError(error), { operation: 'clear_cache' });
    }
  }

  /**
   * Get offline queue status
   */
  getQueueStatus(): {
    isOnline: boolean;
    queueSize: number;
    oldestAction: Date | null;
    syncInProgress: boolean;
  } {
    const oldestAction = this.queue.length > 0 
      ? new Date(this.queue[0].timestamp)
      : null;
    
    return {
      isOnline: this.isOnline,
      queueSize: this.queue.length,
      oldestAction,
      syncInProgress: this.syncInProgress,
    };
  }

  /**
   * Private: Load queue from storage
   */
  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      this.queue = [];
    }
  }

  /**
   * Private: Save queue to storage
   */
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      logError(handleServiceError(error), { operation: 'save_queue' });
    }
  }

  /**
   * Private: Start periodic sync
   */
  private startPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    this.syncTimer = setInterval(() => {
      if (this.isOnline && !this.syncInProgress && this.queue.length > 0) {
        this.syncQueue();
      }
    }, this.config.syncInterval);
  }

  /**
   * Private: Sync offline queue
   */
  private async syncQueue(): Promise<void> {
    if (this.syncInProgress || !this.isOnline || this.queue.length === 0) {
      return;
    }
    
    this.syncInProgress = true;
    
    try {
      const actionsToProcess = [...this.queue];
      const failedActions: OfflineAction[] = [];
      
      for (const action of actionsToProcess) {
        try {
          await this.processAction(action);
          
          // Remove successful action from queue
          this.queue = this.queue.filter(a => a.id !== action.id);
        } catch (error) {
          action.retryCount++;
          action.lastError = error instanceof Error ? error.message : String(error);
          
          if (action.retryCount < this.config.maxRetries) {
            failedActions.push(action);
          } else {
            // Max retries reached, remove from queue
            logError(
              new AppError(
                'Offline action failed after max retries',
                'offline-sync-failed',
                'high',
                'network'
              ),
              { action }
            );
          }
        }
      }
      
      // Update queue with failed actions
      this.queue = failedActions;
      await this.saveQueue();
    } catch (error) {
      logError(handleServiceError(error), { operation: 'sync_queue' });
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Private: Process a single offline action
   */
  private async processAction(action: OfflineAction): Promise<void> {
    // TODO: Implement actual processing based on action type
    // This would call the appropriate service methods
    
    switch (action.type) {
      case 'like':
        // await likesService.createLike(action.data.fromUserId, action.data.toUserId);
        break;
      case 'dislike':
        // await likesService.createDislike(action.data.fromUserId, action.data.toUserId);
        break;
      case 'message':
        // await chatService.sendMessage(action.data.chatId, action.data.message);
        break;
      case 'profile_update':
        // await profileService.updateProfile(action.data.userId, action.data.updates);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Force sync now (for user-triggered sync)
   */
  async forceSyncNow(): Promise<{ success: boolean; synced: number; failed: number }> {
    const initialQueueSize = this.queue.length;
    
    try {
      await this.syncQueue();
      
      const synced = initialQueueSize - this.queue.length;
      const failed = this.queue.length;
      
      return { success: true, synced, failed };
    } catch (error) {
      return { success: false, synced: 0, failed: initialQueueSize };
    }
  }

  /**
   * Clear all offline data
   */
  async clearAll(): Promise<void> {
    try {
      this.queue = [];
      await AsyncStorage.removeItem(this.QUEUE_KEY);
      await this.clearCache();
    } catch (error) {
      logError(handleServiceError(error), { operation: 'clear_all' });
    }
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorage();