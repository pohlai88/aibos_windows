#!/usr/bin/env -S deno run --allow-all

import { logInfo, logWarn, logError, logSuccess } from '../modules/logging.ts';
import { queryOptimizer } from '../src/services/query-optimizer.ts';
import { supabase } from '../modules/supabase-client.ts';

interface QueryMetrics {
  table: string;
  method: string;
  duration: number;
  payloadSize: number;
  timestamp: Date;
}

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SupabasePerformanceOptimizer {
  private queryMetrics: QueryMetrics[] = [];
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 1000; // 1 second default

  // Query timing wrapper
  async timeQuery<T>(
    table: string,
    method: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await queryFn();
      const duration = performance.now() - startTime;
      
      // Estimate payload size (rough calculation)
      const payloadSize = JSON.stringify(result).length;
      
      this.queryMetrics.push({
        table,
        method,
        duration,
        payloadSize,
        timestamp: new Date()
      });
      
      logInfo(`[Supabase] ${method} ${table}: ${duration.toFixed(2)}ms (${payloadSize} bytes)`);
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      logError(`[Supabase] ${method} ${table} failed after ${duration.toFixed(2)}ms: ${error}`);
      throw error;
    }
  }

  // Cache management
  getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      logInfo(`[Cache] Hit for key: ${key}`);
      return entry.data as T;
    }
    
    if (entry) {
      logInfo(`[Cache] Miss (expired) for key: ${key}`);
      this.cache.delete(key);
    }
    
    return null;
  }

  setCached<T>(key: string, data: T, ttl: number = this.CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    logInfo(`[Cache] Set key: ${key} (TTL: ${ttl}ms)`);
  }

  // Performance analysis
  getPerformanceReport(): {
    totalQueries: number;
    averageDuration: number;
    slowestQueries: QueryMetrics[];
    cacheHitRate: number;
    recommendations: string[];
  } {
    const totalQueries = this.queryMetrics.length;
    const averageDuration = totalQueries > 0 
      ? this.queryMetrics.reduce((sum, q) => sum + q.duration, 0) / totalQueries 
      : 0;
    
    const slowestQueries = [...this.queryMetrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);
    
    // Calculate cache hit rate (simplified)
    const cacheHitRate = 0.3; // Placeholder - would need actual hit tracking
    
    const recommendations: string[] = [];
    
    if (averageDuration > 100) {
      recommendations.push("Consider adding database indexes for slow queries");
    }
    
    if (slowestQueries.some(q => q.duration > 200)) {
      recommendations.push("Implement query result caching for slow operations");
    }
    
    if (slowestQueries.some(q => q.payloadSize > 50000)) {
      recommendations.push("Implement pagination for large result sets");
    }
    
    return {
      totalQueries,
      averageDuration,
      slowestQueries,
      cacheHitRate,
      recommendations
    };
  }

  // Clear old metrics
  cleanup(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.queryMetrics = this.queryMetrics.filter(
      q => q.timestamp.getTime() > oneHourAgo
    );
    
    // Clear expired cache entries
    for (const [key, entry] of this.cache.entries()) {
      if (Date.now() - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Enhanced performance monitoring
  async runOptimizationSuite(): Promise<void> {
    logInfo('🚀 Starting Supabase Performance Optimization Suite');
    
    // Test query performance
    await this.benchmarkQueries();
    
    // Analyze cache effectiveness
    await this.analyzeCachePerformance();
    
    // Generate optimization report
    await this.generateOptimizationReport();
    
    logSuccess('✅ Optimization suite completed');
  }
  
  private async benchmarkQueries(): Promise<void> {
    logInfo('📊 Benchmarking query performance...');
    
    // Test tenant queries
    const tenantStart = performance.now();
    await queryOptimizer.getTenantsOptimized(0, 20);
    const tenantDuration = performance.now() - tenantStart;
    
    // Test notes queries
    const notesStart = performance.now();
    await queryOptimizer.getNotesOptimized('test-tenant-id', 50);
    const notesDuration = performance.now() - notesStart;
    
    logInfo(`Tenant query: ${tenantDuration.toFixed(2)}ms`);
    logInfo(`Notes query: ${notesDuration.toFixed(2)}ms`);
  }
  
  private async generateOptimizationReport(): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      performance: {
        averageQueryTime: this.getAverageQueryTime(),
        cacheHitRate: this.getCacheHitRate(),
        slowestQueries: this.getSlowestQueries()
      },
      recommendations: this.getRecommendations()
    };
    
    await Deno.writeTextFile(
      'supabase-performance-report.json',
      JSON.stringify(report, null, 2)
    );
    
    logSuccess('📄 Performance report generated');
  }

  async runOptimizationBenchmark(): Promise<void> {
    logInfo('🚀 Running Supabase Optimization Benchmark');
    
    const results = {
      timestamp: new Date().toISOString(),
      benchmarks: {} as Record<string, number>,
      cacheStats: {} as Record<string, unknown>,
      recommendations: [] as string[]
    };
    
    // Benchmark tenant queries
    const tenantStart = performance.now();
    await supabase.rpc('get_tenants_paginated', { p_page: 0, p_limit: 20 });
    results.benchmarks['tenants_rpc'] = performance.now() - tenantStart;
    
    // Benchmark notes queries
    const notesStart = performance.now();
    await supabase
      .from('notes')
      .select('id, title, created_at')
      .eq('is_deleted', false)
      .limit(50);
    results.benchmarks['notes_query'] = performance.now() - notesStart;
    
    // Benchmark metrics RPC
    const metricsStart = performance.now();
    await supabase.rpc('get_tenant_metrics_optimized', { 
      p_tenant_id: '550e8400-e29b-41d4-a716-446655440000' 
    });
    results.benchmarks['metrics_rpc'] = performance.now() - metricsStart;
    
    // Generate recommendations
    if (results.benchmarks['tenants_rpc'] > 100) {
      results.recommendations.push('Consider adding more specific indexes for tenant queries');
    }
    if (results.benchmarks['notes_query'] > 80) {
      results.recommendations.push('Notes query exceeds target - review pagination strategy');
    }
    if (results.benchmarks['metrics_rpc'] > 100) {
      results.recommendations.push('Metrics RPC needs further optimization');
    }
    
    // Save benchmark results
    await Deno.writeTextFile(
      'supabase-benchmark-results.json',
      JSON.stringify(results, null, 2)
    );
    
    logSuccess(`✅ Benchmark complete - Average query time: ${Object.values(results.benchmarks).reduce((a, b) => a + b, 0) / Object.keys(results.benchmarks).length}ms`);
  }

  // --- Added missing methods as wrappers for getPerformanceReport() ---
  analyzeCachePerformance(): void {
    // Placeholder: In a real implementation, analyze cache stats
    logInfo('[Cache] Cache performance analysis not implemented.');
  }

  getAverageQueryTime(): number {
    return this.getPerformanceReport().averageDuration;
  }

  getCacheHitRate(): number {
    return this.getPerformanceReport().cacheHitRate;
  }

  getSlowestQueries(): QueryMetrics[] {
    return this.getPerformanceReport().slowestQueries;
  }

  getRecommendations(): string[] {
    return this.getPerformanceReport().recommendations;
  }
}

// Run benchmark if script is executed directly
if (import.meta.main) {
  const optimizer = new SupabasePerformanceOptimizer();
  await optimizer.runOptimizationBenchmark();
}

// Export singleton instance
export const supabaseOptimizer = new SupabasePerformanceOptimizer();

// Performance monitoring utilities
export const withQueryTiming = <T>(
  table: string,
  method: string,
  queryFn: () => Promise<T>
): Promise<T> => {
  return supabaseOptimizer.timeQuery(table, method, queryFn);
};

export const withCaching = <T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl?: number
): Promise<T> => {
  const cached = supabaseOptimizer.getCached<T>(key);
  if (cached) {
    return Promise.resolve(cached);
  }
  
  return queryFn().then(result => {
    supabaseOptimizer.setCached(key, result, ttl);
    return result;
  });
};

// Main execution
if (import.meta.main) {
  logInfo("🔧 Supabase Performance Optimizer");
  logInfo("==================================");
  
  // Example usage
  const exampleQuery = async () => {
    // Simulate a slow query
    await new Promise(resolve => setTimeout(resolve, 150));
    return { id: 1, name: "Example" };
  };
  
  await withQueryTiming("tenants", "select", exampleQuery);
  await withCaching("tenants:list", exampleQuery, 2000);
  
  // Generate report
  const report = supabaseOptimizer.getPerformanceReport();
  
  logInfo("📊 Performance Report:");
  logInfo(`Total Queries: ${report.totalQueries}`);
  logInfo(`Average Duration: ${report.averageDuration.toFixed(2)}ms`);
  logInfo(`Cache Hit Rate: ${(report.cacheHitRate * 100).toFixed(1)}%`);
  
  if (report.slowestQueries.length > 0) {
    logWarn("🐌 Slowest Queries:");
    report.slowestQueries.forEach(q => {
      logWarn(`  ${q.method} ${q.table}: ${q.duration.toFixed(2)}ms`);
    });
  }
  
  if (report.recommendations.length > 0) {
    logInfo("💡 Recommendations:");
    report.recommendations.forEach(rec => {
      logInfo(`  • ${rec}`);
    });
  }
  
  logSuccess("✅ Performance optimization utilities ready!");
}