/**
 * Performance Optimization Utilities
 * Provides performance monitoring, optimization, and debugging tools
 */

import { InteractionManager, Platform } from 'react-native';

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private isEnabled: boolean = __DEV__;

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }

  startTiming(name: string, metadata?: Record<string, any>) {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      startTime: Date.now(),
      metadata,
    };

    this.metrics.set(name, metric);
    console.log(`⏱️ Started timing: ${name}`);
  }

  endTiming(name: string) {
    if (!this.isEnabled) return;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`⚠️ No timing started for: ${name}`);
      return;
    }

    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;

    console.log(`✅ Completed timing: ${name} - ${metric.duration}ms`);

    // Log slow operations
    if (metric.duration > 1000) {
      console.warn(`🐌 Slow operation detected: ${name} took ${metric.duration}ms`);
    }

    return metric;
  }

  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values()).filter((m) => m.endTime);
  }

  clearMetrics() {
    this.metrics.clear();
  }

  logSummary() {
    const completedMetrics = this.getMetrics();

    if (completedMetrics.length === 0) {
      console.log('📊 No performance metrics recorded');
      return;
    }

    console.log('📊 Performance Summary:');
    completedMetrics
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .forEach((metric) => {
        console.log(`  ${metric.name}: ${metric.duration}ms`);
      });

    const totalTime = completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    console.log(`  Total measured time: ${totalTime}ms`);
  }
}

export const performanceMonitor = new PerformanceMonitor();

// ============================================================================
// DEBOUNCING UTILITIES
// ============================================================================

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ============================================================================
// ASYNC OPTIMIZATION
// ============================================================================

export function runAfterInteractions<T>(callback: () => T): Promise<T> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      resolve(callback());
    });
  });
}

export function batchUpdates<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  batchSize: number = 10,
  delay: number = 0
): Promise<void> {
  return new Promise(async (resolve) => {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      await Promise.all(batch.map(processor));

      if (delay > 0 && i + batchSize < items.length) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    resolve();
  });
}

// ============================================================================
// MEMORY OPTIMIZATION
// ============================================================================

export class MemoryOptimizer {
  private static instance: MemoryOptimizer;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private maxCacheSize: number = 100;
  private cleanupInterval: NodeJS.Timeout;

  private constructor() {
    // Cleanup expired cache entries every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000
    );
  }

  static getInstance(): MemoryOptimizer {
    if (!MemoryOptimizer.instance) {
      MemoryOptimizer.instance = new MemoryOptimizer();
    }
    return MemoryOptimizer.instance;
  }

  setMaxCacheSize(size: number) {
    this.maxCacheSize = size;
  }

  set(key: string, data: any, ttl: number = 10 * 60 * 1000) {
    // 10 minutes default
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  private cleanup() {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      keys: Array.from(this.cache.keys()),
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

export const memoryOptimizer = MemoryOptimizer.getInstance();

// ============================================================================
// RENDER OPTIMIZATION
// ============================================================================

export function shouldComponentUpdate<T extends Record<string, any>>(
  prevProps: T,
  nextProps: T,
  keys?: (keyof T)[]
): boolean {
  const keysToCheck = keys || (Object.keys(nextProps) as (keyof T)[]);

  return keysToCheck.some((key) => prevProps[key] !== nextProps[key]);
}

export function shallowEqual<T extends Record<string, any>>(obj1: T, obj2: T): boolean {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  return keys1.every((key) => obj1[key] === obj2[key]);
}

// ============================================================================
// PLATFORM-SPECIFIC OPTIMIZATIONS
// ============================================================================

export const platformOptimizations = {
  // Optimize for iOS
  ios: {
    enableHardwareAcceleration: () => {
      // iOS-specific optimizations
      return {
        shouldRasterizeIOS: true,
        renderToHardwareTextureAndroid: false,
      };
    },
  },

  // Optimize for Android
  android: {
    enableHardwareAcceleration: () => {
      // Android-specific optimizations
      return {
        shouldRasterizeIOS: false,
        renderToHardwareTextureAndroid: true,
      };
    },
  },

  // Get platform-specific optimizations
  get: () => {
    return Platform.OS === 'ios' ? platformOptimizations.ios : platformOptimizations.android;
  },
};

// ============================================================================
// PERFORMANCE DECORATORS
// ============================================================================

export function measurePerformance(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      performanceMonitor.startTiming(methodName);

      try {
        const result = await originalMethod.apply(this, args);
        performanceMonitor.endTiming(methodName);
        return result;
      } catch (error) {
        performanceMonitor.endTiming(methodName);
        throw error;
      }
    };

    return descriptor;
  };
}

// ============================================================================
// BUNDLE SIZE OPTIMIZATION
// ============================================================================

import React from 'react';

export const bundleOptimizations = {
  // Lazy load components
  lazyLoad: <T extends React.ComponentType<any>>(importFunc: () => Promise<{ default: T }>) => {
    return React.lazy(importFunc);
  },

  // Preload critical resources
  preloadCritical: (resources: string[]) => {
    resources.forEach((resource) => {
      // Preload logic would go here
      console.log(`Preloading: ${resource}`);
    });
  },
};

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================

export default {
  performanceMonitor,
  debounce,
  throttle,
  runAfterInteractions,
  batchUpdates,
  memoryOptimizer,
  shouldComponentUpdate,
  shallowEqual,
  platformOptimizations,
  measurePerformance,
  bundleOptimizations,
};
