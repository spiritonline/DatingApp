import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppError, logError, handleServiceError } from '../../utils/errorHandler';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface ScreenLoadMetrics {
  screenName: string;
  loadTime: number;
  componentCount: number;
  imageCount?: number;
  timestamp: number;
}

interface AppStartupMetrics {
  coldStart: boolean;
  splashToAuth: number;
  authToMain: number;
  totalTime: number;
  timestamp: number;
}

interface NetworkMetrics {
  endpoint: string;
  method: string;
  duration: number;
  statusCode?: number;
  size?: number;
  timestamp: number;
  error?: boolean;
}

interface MetricsSummary {
  avgScreenLoadTime: number;
  slowestScreens: Array<{ screen: string; avgTime: number }>;
  avgNetworkLatency: number;
  errorRate: number;
  sessionDuration: number;
}

/**
 * Performance monitoring service
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private screenMetrics: Map<string, ScreenLoadMetrics[]> = new Map();
  private networkMetrics: NetworkMetrics[] = [];
  private sessionStartTime: number;
  private appStartupMetrics: AppStartupMetrics | null = null;
  private readonly METRICS_KEY = '@performance_metrics';
  private readonly MAX_METRICS = 1000;
  private readonly BATCH_SIZE = 50;
  private pendingMetrics: PerformanceMetric[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionStartTime = Date.now();
    this.loadStoredMetrics();
    this.startPeriodicFlush();
  }

  /**
   * Track screen load time
   */
  trackScreenLoad(screenName: string, loadTime: number, metadata?: {
    componentCount?: number;
    imageCount?: number;
    dataFetchTime?: number;
  }): void {
    try {
      const metric: ScreenLoadMetrics = {
        screenName,
        loadTime,
        componentCount: metadata?.componentCount || 0,
        imageCount: metadata?.imageCount,
        timestamp: Date.now(),
      };
      
      // Store screen metrics
      if (!this.screenMetrics.has(screenName)) {
        this.screenMetrics.set(screenName, []);
      }
      this.screenMetrics.get(screenName)!.push(metric);
      
      // Add to general metrics
      this.addMetric(`screen_load_${screenName}`, loadTime, {
        ...metadata,
        screenName,
      });
      
      // Log slow screens
      if (loadTime > 3000) {
        logError(
          new AppError(
            `Slow screen load: ${screenName} took ${loadTime}ms`,
            'performance-slow-screen',
            'low',
            'unknown'
          ),
          { screenName, loadTime, metadata }
        );
      }
    } catch (error) {
      // Don't let performance tracking errors break the app
      if (__DEV__) {
        console.warn('Performance tracking error:', error);
      }
    }
  }

  /**
   * Track app startup time
   */
  trackAppStartup(metrics: {
    coldStart: boolean;
    splashToAuth: number;
    authToMain: number;
  }): void {
    try {
      this.appStartupMetrics = {
        ...metrics,
        totalTime: metrics.splashToAuth + metrics.authToMain,
        timestamp: Date.now(),
      };
      
      this.addMetric('app_startup_total', this.appStartupMetrics.totalTime, {
        coldStart: metrics.coldStart,
      });
      
      // Log slow startup
      if (this.appStartupMetrics.totalTime > 5000) {
        logError(
          new AppError(
            `Slow app startup: ${this.appStartupMetrics.totalTime}ms`,
            'performance-slow-startup',
            'medium',
            'unknown'
          ),
          { ...this.appStartupMetrics }
        );
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('Startup tracking error:', error);
      }
    }
  }

  /**
   * Track network request performance
   */
  trackNetworkRequest(
    endpoint: string,
    method: string,
    duration: number,
    options?: {
      statusCode?: number;
      size?: number;
      error?: boolean;
    }
  ): void {
    try {
      const metric: NetworkMetrics = {
        endpoint,
        method,
        duration,
        statusCode: options?.statusCode,
        size: options?.size,
        error: options?.error,
        timestamp: Date.now(),
      };
      
      this.networkMetrics.push(metric);
      
      // Keep only recent network metrics
      if (this.networkMetrics.length > 100) {
        this.networkMetrics = this.networkMetrics.slice(-100);
      }
      
      this.addMetric(`network_${method}_${endpoint}`, duration, {
        ...options,
        endpoint,
        method,
      });
      
      // Log slow requests
      if (duration > 5000) {
        logError(
          new AppError(
            `Slow network request: ${method} ${endpoint} took ${duration}ms`,
            'performance-slow-network',
            'low',
            'network'
          ),
          { endpoint, method, duration, ...options }
        );
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('Network tracking error:', error);
      }
    }
  }

  /**
   * Track user interaction delay
   */
  trackInteraction(
    action: string,
    delay: number,
    metadata?: Record<string, any>
  ): void {
    try {
      this.addMetric(`interaction_${action}`, delay, metadata);
      
      // Log slow interactions
      if (delay > 1000) {
        logError(
          new AppError(
            `Slow interaction: ${action} took ${delay}ms`,
            'performance-slow-interaction',
            'low',
            'unknown'
          ),
          { action, delay, metadata }
        );
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('Interaction tracking error:', error);
      }
    }
  }

  /**
   * Track custom metric
   */
  trackMetric(name: string, value: number, metadata?: Record<string, any>): void {
    this.addMetric(name, value, metadata);
  }

  /**
   * Get performance summary
   */
  getSummary(): MetricsSummary {
    // Calculate average screen load time
    let totalLoadTime = 0;
    let totalLoads = 0;
    const screenAverages: Map<string, { total: number; count: number }> = new Map();
    
    this.screenMetrics.forEach((metrics, screenName) => {
      const screenTotal = metrics.reduce((sum, m) => sum + m.loadTime, 0);
      totalLoadTime += screenTotal;
      totalLoads += metrics.length;
      screenAverages.set(screenName, { total: screenTotal, count: metrics.length });
    });
    
    const avgScreenLoadTime = totalLoads > 0 ? totalLoadTime / totalLoads : 0;
    
    // Find slowest screens
    const slowestScreens = Array.from(screenAverages.entries())
      .map(([screen, data]) => ({
        screen,
        avgTime: data.total / data.count,
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5);
    
    // Calculate average network latency
    const avgNetworkLatency = this.networkMetrics.length > 0
      ? this.networkMetrics.reduce((sum, m) => sum + m.duration, 0) / this.networkMetrics.length
      : 0;
    
    // Calculate error rate
    const errorCount = this.networkMetrics.filter(m => m.error).length;
    const errorRate = this.networkMetrics.length > 0
      ? errorCount / this.networkMetrics.length
      : 0;
    
    // Calculate session duration
    const sessionDuration = Date.now() - this.sessionStartTime;
    
    return {
      avgScreenLoadTime,
      slowestScreens,
      avgNetworkLatency,
      errorRate,
      sessionDuration,
    };
  }

  /**
   * Get detailed metrics for a specific screen
   */
  getScreenMetrics(screenName: string): {
    loadTimes: number[];
    avgLoadTime: number;
    minLoadTime: number;
    maxLoadTime: number;
    sampleCount: number;
  } | null {
    const metrics = this.screenMetrics.get(screenName);
    if (!metrics || metrics.length === 0) {
      return null;
    }
    
    const loadTimes = metrics.map(m => m.loadTime);
    const avgLoadTime = loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
    const minLoadTime = Math.min(...loadTimes);
    const maxLoadTime = Math.max(...loadTimes);
    
    return {
      loadTimes,
      avgLoadTime,
      minLoadTime,
      maxLoadTime,
      sampleCount: loadTimes.length,
    };
  }

  /**
   * Clear all metrics
   */
  async clearMetrics(): Promise<void> {
    this.metrics = [];
    this.screenMetrics.clear();
    this.networkMetrics = [];
    this.pendingMetrics = [];
    await AsyncStorage.removeItem(this.METRICS_KEY);
  }

  /**
   * Private: Add metric to queue
   */
  private addMetric(name: string, value: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    };
    
    this.metrics.push(metric);
    this.pendingMetrics.push(metric);
    
    // Limit total metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }
    
    // Batch pending metrics
    if (this.pendingMetrics.length >= this.BATCH_SIZE) {
      this.flushMetrics();
    }
  }

  /**
   * Private: Load stored metrics
   */
  private async loadStoredMetrics(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.METRICS_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.metrics = data.metrics || [];
        // Don't load screen/network metrics from storage - start fresh each session
      }
    } catch (error) {
      // Ignore storage errors
    }
  }

  /**
   * Private: Flush pending metrics
   */
  private async flushMetrics(): Promise<void> {
    if (this.pendingMetrics.length === 0) return;
    
    try {
      // In production, this would send to analytics service
      if (!__DEV__) {
        // TODO: Send to Firebase Analytics, Mixpanel, etc.
        // await analytics.logBatch(this.pendingMetrics);
      }
      
      // Store locally for dev/debugging
      await AsyncStorage.setItem(
        this.METRICS_KEY,
        JSON.stringify({
          metrics: this.metrics.slice(-500), // Keep last 500 metrics
          lastFlush: Date.now(),
        })
      );
      
      this.pendingMetrics = [];
    } catch (error) {
      // Don't let analytics errors break the app
      if (__DEV__) {
        console.warn('Metrics flush error:', error);
      }
    }
  }

  /**
   * Private: Start periodic flush
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushMetrics();
    }, 60000); // Flush every minute
  }

  /**
   * Export metrics for debugging
   */
  async exportMetrics(): Promise<string> {
    const summary = this.getSummary();
    const data = {
      summary,
      appStartup: this.appStartupMetrics,
      recentMetrics: this.metrics.slice(-100),
      screenMetrics: Object.fromEntries(this.screenMetrics),
      networkMetrics: this.networkMetrics.slice(-50),
      timestamp: new Date().toISOString(),
    };
    
    return JSON.stringify(data, null, 2);
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Convenience functions
export const trackScreenLoad = (screenName: string, loadTime: number, metadata?: any) =>
  performanceMonitor.trackScreenLoad(screenName, loadTime, metadata);

export const trackAppStartup = (metrics: Parameters<PerformanceMonitor['trackAppStartup']>[0]) =>
  performanceMonitor.trackAppStartup(metrics);

export const trackNetworkRequest = (
  endpoint: string,
  method: string,
  duration: number,
  options?: any
) => performanceMonitor.trackNetworkRequest(endpoint, method, duration, options);

export const trackInteraction = (action: string, delay: number, metadata?: any) =>
  performanceMonitor.trackInteraction(action, delay, metadata);

export const getPerformanceSummary = () => performanceMonitor.getSummary();