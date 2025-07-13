/**
 * Code Splitting Utilities
 * 
 * This file contains utilities for implementing code splitting and lazy loading
 * to improve initial bundle size and loading performance.
 */

import { EnterpriseLogger } from '../services/core/logger.ts';

const logger = new EnterpriseLogger();

class _CodeSplittingManager {
  private logger = new EnterpriseLogger();
  
  // Replace:
  // logWarn() → this.logger.warn('message', { component: 'CodeSplitting', action: 'actionName' })
}

// Simple loading component
export const LoadingSpinner = (message: string = 'Loading...') => {
  const div = document.createElement('div');
  div.className = 'flex items-center justify-center p-8';
  div.innerHTML = `
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
    <span class="text-gray-600 dark:text-gray-400">${message}</span>
  `;
  return div;
};

// Dynamic import with retry logic
export async function dynamicImport<T>(
  importFunc: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await importFunc();
    } catch (error) {
      lastError = error as Error;
      logger.warn(`Import attempt ${attempt} failed: ${error instanceof Error ? error.message : String(error)}`, { component: 'CodeSplitting', action: 'dynamicImport' });
      
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  throw lastError!;
}

// Bundle analyzer utility
export function analyzeBundle() {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    return {
      loadTime: navigation.loadEventEnd - navigation.loadEventStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
      firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime
    };
  }
  
  return null;
}

// Preload critical components on app start
export function preloadCriticalComponents() {
  // Preload the most commonly used components
  const criticalComponents = [
    () => import('../components/Desktop.tsx'),
    () => import('../components/Window.tsx'),
    () => import('../components/Spotlight.tsx')
  ];
  
  // Use requestIdleCallback if available, otherwise setTimeout
  const schedulePreload = (callback: () => void) => {
    if ('requestIdleCallback' in window) {
      (globalThis as typeof globalThis & { requestIdleCallback?: (callback: () => void) => void }).requestIdleCallback?.(callback);
    } else {
      setTimeout(callback, 1000);
    }
  };
  
  schedulePreload(() => {
    criticalComponents.forEach(importFunc => {
      importFunc().catch(error => {
        logger.warn(`Failed to preload component: ${error instanceof Error ? error.message : String(error)}`, { component: 'CodeSplitting', action: 'preloadCriticalComponents' });
      });
    });
  });
}

// Component loading registry
export class ComponentRegistry {
  private static cache = new Map<string, Promise<unknown>>();
  
  static loadComponent(name: string, importFunc: () => Promise<unknown>) {
    if (!this.cache.has(name)) {
      this.cache.set(name, importFunc());
    }
    return this.cache.get(name);
  }
  
  static preloadComponent(name: string, importFunc: () => Promise<unknown>) {
    if (!this.cache.has(name)) {
      this.cache.set(name, importFunc());
    }
  }
  
  static clearCache() {
    this.cache.clear();
  }
}