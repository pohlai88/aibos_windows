import React, { memo, useCallback, useMemo } from 'react';

/**
 * Performance Optimization Utilities
 * 
 * This file contains utilities and HOCs for optimizing React component performance
 */

// HOC to automatically apply React.memo with performance monitoring
export function withPerformanceOptimization<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    name?: string;
    shouldMemoize?: boolean;
    customComparison?: (prevProps: P, nextProps: P) => boolean;
  } = {}
) {
  const { name, shouldMemoize = true, customComparison } = options;
  
  if (!shouldMemoize) {
    return Component;
  }

  const OptimizedComponent = memo(Component, customComparison);
  
  // Add display name for debugging
  if (name) {
    OptimizedComponent.displayName = `Optimized(${name})`;
  }

  return OptimizedComponent;
}

// Hook for expensive calculations with automatic memoization
export function useExpensiveCalculation<T>(
  calculation: () => T,
  dependencies: React.DependencyList
): T {
  return useMemo(calculation, dependencies);
}

// Hook for stable callbacks with automatic memoization
export function useStableCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  dependencies: React.DependencyList
): T {
  return useCallback(callback, dependencies);
}

// Performance monitoring hook
export function usePerformanceMonitor(componentName: string) {
  const renderCount = React.useRef(0);
  const lastRenderTime = React.useRef(performance.now());

  React.useEffect(() => {
    renderCount.current++;
    const currentTime = performance.now();
    const timeSinceLastRender = currentTime - lastRenderTime.current;
    
    // Check if we're in development mode (Deno doesn't have process.env)
    const isDevelopment = typeof window !== 'undefined' && globalThis.location.hostname === 'localhost';
    
    if (isDevelopment) {
      console.log(`🔄 ${componentName} rendered (${renderCount.current} times, ${timeSinceLastRender.toFixed(2)}ms since last render)`);
    }
    
    lastRenderTime.current = currentTime;
  });

  return {
    renderCount: renderCount.current,
    timeSinceLastRender: performance.now() - lastRenderTime.current
  };
}

// Component wrapper for automatic performance optimization
export const PerformanceOptimized: React.FC<{
  children: React.ReactNode;
  name: string;
  shouldOptimize?: boolean;
}> = memo(({ children, name, shouldOptimize = true }) => {
  if (shouldOptimize) {
    usePerformanceMonitor(name);
  }
  
  return <>{children}</>;
});

// Utility to check if props have changed
export function propsChanged<T extends object>(
  prevProps: T,
  nextProps: T,
  keysToCompare?: (keyof T)[]
): boolean {
  const keys = keysToCompare || Object.keys(prevProps) as (keyof T)[];
  
  return keys.some(key => {
    const prevValue = prevProps[key];
    const nextValue = nextProps[key];
    
    // Handle functions specially
    if (typeof prevValue === 'function' && typeof nextValue === 'function') {
      return prevValue.toString() !== nextValue.toString();
    }
    
    // Handle objects and arrays
    if (typeof prevValue === 'object' && typeof nextValue === 'object') {
      return JSON.stringify(prevValue) !== JSON.stringify(nextValue);
    }
    
    return prevValue !== nextValue;
  });
}

// Auto-optimize components based on their usage patterns
export function autoOptimize<P extends object>(
  Component: React.ComponentType<P>,
  optimizationLevel: 'low' | 'medium' | 'high' = 'medium'
) {
  const optimizationConfig = {
    low: { shouldMemoize: true, customComparison: undefined as unknown as (prevProps: P, nextProps: P) => boolean },
    medium: { 
      shouldMemoize: true, 
      customComparison: (prevProps: P, nextProps: P) => !propsChanged(prevProps, nextProps)
    },
    high: { 
      shouldMemoize: true, 
      customComparison: (prevProps: P, nextProps: P) => {
        // Deep comparison for high optimization
        return JSON.stringify(prevProps) === JSON.stringify(nextProps);
      }
    }
  };

  return withPerformanceOptimization(Component, optimizationConfig[optimizationLevel]);
} 