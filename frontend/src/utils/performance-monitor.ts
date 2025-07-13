/**
 * Performance Monitoring for AI-BOS Platform
 * Tracks memory usage, type errors, and component performance
 */

import React from 'react';
import { MemoryTrackerImpl } from './memory-management.ts';

interface PerformanceMetrics {
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  componentRenderTimes: Map<string, number[]>;
  typeErrors: Array<{
    timestamp: number;
    error: string;
    component?: string;
  }>;
  cacheHitRates: Map<string, { hits: number; misses: number }>;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics = {
    memoryUsage: { used: 0, total: 0, percentage: 0 },
    componentRenderTimes: new Map(),
    typeErrors: [],
    cacheHitRates: new Map()
  };
  private observers: Array<(metrics: PerformanceMetrics) => void> = [];

  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }

  startMonitoring(): void {
    // Memory monitoring
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize?: number } }).memory;
        if (memory) {
          this.metrics.memoryUsage = {
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize || memory.usedJSHeapSize * 2, // Fallback if total not available
            percentage: memory.totalJSHeapSize ? (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100 : 50
          };
          this.notifyObservers();
        }
      }, 5000);
    }

    // Global error handling for type errors
    globalThis.addEventListener('error', (event) => {
      if (event.error && event.error.name === 'TypeError') {
        this.recordTypeError(event.error.message);
      }
    });

    // Unhandled promise rejections
    globalThis.addEventListener('unhandledrejection', (event) => {
      this.recordTypeError(`Unhandled promise rejection: ${event.reason}`);
    });
  }

  recordComponentRender(componentName: string, renderTime: number): void {
    if (!this.metrics.componentRenderTimes.has(componentName)) {
      this.metrics.componentRenderTimes.set(componentName, []);
    }
    const times = this.metrics.componentRenderTimes.get(componentName)!;
    times.push(renderTime);
    
    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift();
    }
  }

  recordTypeError(error: string, component?: string): void {
    const errorEntry: {
      timestamp: number;
      error: string;
      component?: string;
    } = {
      timestamp: Date.now(),
      error,
    };
    
    if (component !== undefined) {
      errorEntry.component = component;
    }
    
    this.metrics.typeErrors.push(errorEntry);
    
    // Keep only last 50 errors
    if (this.metrics.typeErrors.length > 50) {
      this.metrics.typeErrors.shift();
    }
    
    console.warn('Type Error Detected:', { error, component });
    this.notifyObservers();
  }

  recordCacheHit(cacheName: string): void {
    if (!this.metrics.cacheHitRates.has(cacheName)) {
      this.metrics.cacheHitRates.set(cacheName, { hits: 0, misses: 0 });
    }
    this.metrics.cacheHitRates.get(cacheName)!.hits++;
  }

  recordCacheMiss(cacheName: string): void {
    if (!this.metrics.cacheHitRates.has(cacheName)) {
      this.metrics.cacheHitRates.set(cacheName, { hits: 0, misses: 0 });
    }
    this.metrics.cacheHitRates.get(cacheName)!.misses++;
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getComponentStats(componentName: string) {
    const times = this.metrics.componentRenderTimes.get(componentName) || [];
    if (times.length === 0) return null;

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const max = Math.max(...times);
    const min = Math.min(...times);
    
    return { avg, max, min, count: times.length };
  }

  getCacheStats(cacheName: string) {
    const stats = this.metrics.cacheHitRates.get(cacheName);
    if (!stats) return null;

    const total = stats.hits + stats.misses;
    const hitRate = total > 0 ? (stats.hits / total) * 100 : 0;
    
    return { ...stats, total, hitRate };
  }

  subscribe(observer: (metrics: PerformanceMetrics) => void): () => void {
    this.observers.push(observer);
    return () => {
      const index = this.observers.indexOf(observer);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  private notifyObservers(): void {
    this.observers.forEach(observer => observer(this.metrics));
  }

  generateReport(): string {
    const memTracker = MemoryTrackerImpl.getInstance();
    const report = {
      timestamp: new Date().toISOString(),
      memory: this.metrics.memoryUsage,
      activeResources: memTracker.getActiveResources(),
      typeErrors: this.metrics.typeErrors.length,
      recentTypeErrors: this.metrics.typeErrors.slice(-5),
      componentPerformance: Array.from(this.metrics.componentRenderTimes.entries())
        .map(([name, _times]) => ({
          component: name,
          ...this.getComponentStats(name)
        })),
      cachePerformance: Array.from(this.metrics.cacheHitRates.entries())
        .map(([name, _stats]) => ({
          cache: name,
          ...this.getCacheStats(name)
        }))
    };

    return JSON.stringify(report, null, 2);
  }
}

// React hook for component performance tracking
export function usePerformanceTracking(componentName: string) {
  const monitor = PerformanceMonitor.getInstance();
  
  React.useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const renderTime = performance.now() - startTime;
      monitor.recordComponentRender(componentName, renderTime);
    };
  });

  return {
    recordError: (error: string) => monitor.recordTypeError(error, componentName),
    getStats: () => monitor.getComponentStats(componentName)
  };
}