/**
 * Memory Management Utilities for AI-BOS Platform
 * Provides automatic cleanup and memory tracking
 */

import React from 'react';
import { CleanupFunction, MemoryTracker } from '../types/enhanced-types.ts';

// Memory tracker implementation
export class MemoryTrackerImpl implements MemoryTracker {
  private resources = new Map<symbol, CleanupFunction>();
  private static instance: MemoryTrackerImpl;

  static getInstance(): MemoryTrackerImpl {
    if (!this.instance) {
      this.instance = new MemoryTrackerImpl();
    }
    return this.instance;
  }

  track<T>(resource: T, cleanup: CleanupFunction): T {
    const id = Symbol('resource');
    this.resources.set(id, cleanup);
    
    // Auto-cleanup on page unload
    if (typeof window !== 'undefined') {
      globalThis.addEventListener('beforeunload', () => this.cleanup());
    }
    
    return resource;
  }

  cleanup(): void {
    for (const [id, cleanupFn] of this.resources) {
      try {
        cleanupFn();
      } catch (error) {
        console.warn('Cleanup function failed:', error);
      }
      this.resources.delete(id);
    }
  }

  getActiveResources(): number {
    return this.resources.size;
  }
}

// React hook for automatic cleanup
export function useMemoryCleanup() {
  const _tracker = MemoryTrackerImpl.getInstance();
  const cleanupFunctions = React.useRef<CleanupFunction[]>([]);

  const addCleanup = React.useCallback((cleanup: CleanupFunction) => {
    cleanupFunctions.current.push(cleanup);
  }, []);

  React.useEffect(() => {
    return () => {
      cleanupFunctions.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn('Cleanup failed:', error);
        }
      });
      cleanupFunctions.current = [];
    };
  }, []);

  return { addCleanup, activeCleanups: cleanupFunctions.current.length };
}

// Enhanced useEffect with automatic cleanup
export function useEffectWithCleanup(
  effect: () => CleanupFunction | void,
  deps?: React.DependencyList
): void {
  const { addCleanup } = useMemoryCleanup();

  React.useEffect(() => {
    const cleanup = effect();
    if (cleanup) {
      addCleanup(cleanup);
      return cleanup;
    }
    return undefined;
  }, deps);
}

// Observer cleanup utilities
export function createObserverWithCleanup<T extends { disconnect(): void }>(
  observer: T,
  tracker: MemoryTracker = MemoryTrackerImpl.getInstance()
): T {
  return tracker.track(observer, () => observer.disconnect());
}

// Timer cleanup utilities
export function setTimeoutWithCleanup(
  callback: () => void,
  delay: number,
  tracker: MemoryTracker = MemoryTrackerImpl.getInstance()
): number {
  const timeoutId = setTimeout(callback, delay);
  tracker.track(timeoutId, () => clearTimeout(timeoutId));
  return timeoutId;
}

export function setIntervalWithCleanup(
  callback: () => void,
  delay: number,
  tracker: MemoryTracker = MemoryTrackerImpl.getInstance()
): number {
  const intervalId = setInterval(callback, delay);
  tracker.track(intervalId, () => clearInterval(intervalId));
  return intervalId;
}

// Cache with TTL and memory limits
export class MemoryEfficientCache<K, V> {
  private cache = new Map<K, { value: V; expiry: number; size: number }>();
  private maxSize: number;
  private maxMemory: number;
  private currentMemory = 0;

  constructor(maxSize = 1000, maxMemoryMB = 50) {
    this.maxSize = maxSize;
    this.maxMemory = maxMemoryMB * 1024 * 1024; // Convert to bytes
  }

  set(key: K, value: V, ttlMs = 300000): void { // 5 min default TTL
    const size = this.estimateSize(value);
    const expiry = Date.now() + ttlMs;

    // Clean expired entries first
    this.cleanExpired();

    // Check memory limits
    if (this.currentMemory + size > this.maxMemory) {
      this.evictLRU();
    }

    // Check size limits
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, { value, expiry, size });
    this.currentMemory += size;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiry) {
      this.delete(key);
      return undefined;
    }

    return entry.value;
  }

  delete(key: K): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentMemory -= entry.size;
      return this.cache.delete(key);
    }
    return false;
  }

  clear(): void {
    this.cache.clear();
    this.currentMemory = 0;
  }

  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiry) {
        this.delete(key);
      }
    }
  }

  private evictLRU(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.delete(firstKey);
    }
  }

  private estimateSize(value: V): number {
    // Simple size estimation
    return JSON.stringify(value).length * 2; // Rough estimate
  }

  getStats() {
    return {
      size: this.cache.size,
      memoryUsage: this.currentMemory,
      memoryUsageMB: this.currentMemory / (1024 * 1024),
      maxSize: this.maxSize,
      maxMemoryMB: this.maxMemory / (1024 * 1024)
    };
  }
}