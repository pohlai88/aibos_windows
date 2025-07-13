/**
 * AIBOS Search Performance Optimization
 * Provides utilities for optimizing search performance and user experience
 */

import { EnterpriseLogger } from '../services/core/logger.ts';

export interface SearchPerformanceMetrics {
  queryLength: number;
  searchTime: number;
  resultCount: number;
  cacheHit: boolean;
  fuzzySearchUsed: boolean;
  filtersApplied: number;
}

export interface SearchPerformanceConfig {
  maxQueryLength: number;
  minQueryLength: number;
  debounceDelay: number;
  cacheTTL: number;
  maxResults: number;
  fuzzyThreshold: number;
  performanceMonitoring: boolean;
}

class SearchPerformanceOptimizer {
  private performanceCache: Map<string, SearchPerformanceMetrics> = new Map();
  private logger = new EnterpriseLogger();
  
  // Replace all logging calls:
  // logInfo('message') → this.logger.info('message', { component: 'SearchPerformance', action: 'actionName' })
  // logWarn('message') → this.logger.warn('message', { component: 'SearchPerformance', action: 'actionName' })
  private isOptimizing = false;
  private optimizationLevel: 'minimal' | 'balanced' | 'aggressive' = 'balanced';

  private config: SearchPerformanceConfig = {
    maxQueryLength: 100,
    minQueryLength: 1,
    debounceDelay: 200,
    cacheTTL: 10000, // 10 seconds
    maxResults: 50,
    fuzzyThreshold: 0.3,
    performanceMonitoring: true,
  };

  private searchCache = new Map<string, { results: unknown[]; timestamp: number }>();
  private performanceHistory: SearchPerformanceMetrics[] = [];

  // In-flight promise for debounce
  private inflightPromise: Promise<unknown[]> | null = null;
  private inflightQuery: string | null = null;

  /**
   * Optimize search query
   */
  optimizeQuery(query: string): string {
    if (!query) return '';

    // Trim and normalize
    let optimized = query.trim().toLowerCase();

    // Limit length
    if (optimized.length > this.config.maxQueryLength) {
      optimized = optimized.substring(0, this.config.maxQueryLength);
    }

    // Remove excessive whitespace
    optimized = optimized.replace(/\s+/g, ' ');

    return optimized;
  }

  /**
   * Check if query should trigger search
   */
  shouldSearch(query: string): boolean {
    const optimized = this.optimizeQuery(query);
    return optimized.length >= this.config.minQueryLength;
  }

  /**
   * Get cached results if available
   */
  getCachedResults(query: string): unknown[] | null {
    const cacheKey = this.generateCacheKey(query);
    const cached = this.searchCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < this.config.cacheTTL) {
      return cached.results;
    }

    return null;
  }

  /**
   * Cache search results
   */
  cacheResults(query: string, results: unknown[]): void {
    const cacheKey = this.generateCacheKey(query);
    this.searchCache.set(cacheKey, {
      results,
      timestamp: Date.now(),
    });

    // Clean up old cache entries
    this.cleanupCache();
  }

  /**
   * Measure search performance
   */
  measureSearch<T>(
    query: string,
    searchFunction: () => Promise<T[]>,
    options: {
      useCache?: boolean;
      fuzzySearch?: boolean;
      filters?: unknown;
      maxResults?: number;
    } = {}
  ): Promise<{ results: T[]; metrics: SearchPerformanceMetrics }> {
    const startTime = performance.now();
    const optimizedQuery = this.optimizeQuery(query);

    // Check cache first
    if (options.useCache !== false) {
      const cached = this.getCachedResults(optimizedQuery);
      if (cached) {
        const metrics: SearchPerformanceMetrics = {
          queryLength: optimizedQuery.length,
          searchTime: performance.now() - startTime,
          resultCount: cached.length,
          cacheHit: true,
          fuzzySearchUsed: false,
          filtersApplied:
            options.filters && typeof options.filters === 'object' && !Array.isArray(options.filters)
              ? Object.keys(options.filters).length
              : 0,
        };

        this.recordMetrics(metrics);
        return Promise.resolve({ results: cached as T[], metrics });
      }
    }

    // Perform search
    return searchFunction().then(results => {
      const searchTime = performance.now() - startTime;
      const metrics: SearchPerformanceMetrics = {
        queryLength: optimizedQuery.length,
        searchTime,
        resultCount: results.length,
        cacheHit: false,
        fuzzySearchUsed: options.fuzzySearch || false,
        filtersApplied:
          options.filters && typeof options.filters === 'object' && !Array.isArray(options.filters)
            ? Object.keys(options.filters).length
            : 0,
      };

      // Cache results
      if (options.useCache !== false) {
        this.cacheResults(optimizedQuery, results);
      }

      this.recordMetrics(metrics);
      return { results, metrics };
    });
  }

  /**
   * Optimize search results
   */
  optimizeResults<T>(results: T[], limit?: number): T[] {
    const maxResults = limit || this.config.maxResults;
    
    // Limit results
    if (results.length > maxResults) {
      results = results.slice(0, maxResults);
    }

    return results;
  }

  /**
   * Debounce search function with in-flight promise tracking
   */
  debounceSearch<T>(
    searchFunction: (query: string) => Promise<T[]>,
    delay: number = this.config.debounceDelay
  ): (query: string) => Promise<T[]> {
    let timeoutId: number | null = null;
    let lastQuery = '';
    let inflightPromise: Promise<T[]> | null = null;
    return (query: string): Promise<T[]> => {
      if (query === lastQuery && inflightPromise) {
        return inflightPromise;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      inflightPromise = new Promise((resolve, reject) => {
        timeoutId = setTimeout(async () => {
          try {
            lastQuery = query;
            const results = await searchFunction(query);
            inflightPromise = null;
            resolve(results);
          } catch (error) {
            inflightPromise = null;
            reject(error);
          }
        }, delay);
      });
      return inflightPromise;
    };
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    averageSearchTime: number;
    cacheHitRate: number;
    totalSearches: number;
    averageResults: number;
    recommendations: string[];
  } {
    if (this.performanceHistory.length === 0) {
      return {
        averageSearchTime: 0,
        cacheHitRate: 0,
        totalSearches: 0,
        averageResults: 0,
        recommendations: [],
      };
    }

    const totalSearches = this.performanceHistory.length;
    const averageSearchTime = this.performanceHistory.reduce((sum, m) => sum + m.searchTime, 0) / totalSearches;
    const cacheHitRate = this.performanceHistory.filter(m => m.cacheHit).length / totalSearches;
    const averageResults = this.performanceHistory.reduce((sum, m) => sum + m.resultCount, 0) / totalSearches;

    const recommendations: string[] = [];
    
    if (averageSearchTime > 100) {
      recommendations.push('Consider increasing cache TTL or optimizing search algorithms');
    }
    
    if (cacheHitRate < 0.3) {
      recommendations.push('Low cache hit rate - consider adjusting cache strategy');
    }
    
    if (averageResults > this.config.maxResults) {
      recommendations.push('High result count - consider reducing max results');
    }

    return {
      averageSearchTime,
      cacheHitRate,
      totalSearches,
      averageResults,
      recommendations,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SearchPerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Search performance config updated', { component: 'SearchPerformance', action: 'updateConfig' });
  }

  /**
   * Clear performance data
   */
  clearPerformanceData(): void {
    this.performanceHistory = [];
    this.searchCache.clear();
    this.logger.info('Search performance data cleared', { component: 'SearchPerformance', action: 'clearPerformanceData' });
  }

  /**
   * Generate cache key (normalized, privacy-safe)
   */
  private generateCacheKey(query: string): string {
    return `search_${query.toLowerCase().trim().replace(/\s+/g, ' ')}`;
  }

  /**
   * Clean up old cache entries and limit cache size
   */
  private cleanupCache(): void {
    const now = Date.now();
    const maxAge = this.config.cacheTTL * 2; // Keep entries for 2x TTL
    for (const [key, value] of this.searchCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.searchCache.delete(key);
      }
    }
    // Limit cache size
    while (this.searchCache.size > 1000) {
      const oldestKey = this.searchCache.keys().next().value;
      if (typeof oldestKey === 'string') {
        this.searchCache.delete(oldestKey);
      } else {
        break;
      }
    }
  }

  /**
   * Record performance metrics (efficient array trimming)
   */
  private recordMetrics(metrics: SearchPerformanceMetrics): void {
    if (!this.config.performanceMonitoring) return;
    this.performanceHistory.push(metrics);
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory.splice(0, this.performanceHistory.length - 1000);
    }
    if (metrics.searchTime > 100) {
      this.logger.warn(`Slow search detected: ${metrics.searchTime.toFixed(2)}ms for query \"${metrics.queryLength} chars\"`, { component: 'SearchPerformance', action: 'recordMetrics' });
    }
  }
}

// Export singleton instance
export const searchPerformanceOptimizer = new SearchPerformanceOptimizer();

/**
 * React hook for optimized search
 */
export function useOptimizedSearch<T>(
  searchFunction: (query: string) => Promise<T[]>,
  options: {
    debounce?: number;
    useCache?: boolean;
    maxResults?: number;
  } = {}
) {
  const debouncedSearch = searchPerformanceOptimizer.debounceSearch(
    searchFunction,
    options.debounce
  );

  return {
    search: async (query: string) => {
      if (!searchPerformanceOptimizer.shouldSearch(query)) {
        return [];
      }

      const searchOptions: {
        useCache?: boolean;
        maxResults?: number;
      } = {};
      
      if (options.useCache !== undefined) {
        searchOptions.useCache = options.useCache;
      }
      
      if (options.maxResults !== undefined) {
        searchOptions.maxResults = options.maxResults;
      }

      const { results } = await searchPerformanceOptimizer.measureSearch(
        query,
        () => debouncedSearch(query),
        searchOptions
      );

      return searchPerformanceOptimizer.optimizeResults(results, options.maxResults);
    },
    getStats: () => searchPerformanceOptimizer.getPerformanceStats(),
  };
}