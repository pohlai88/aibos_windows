/** @jsxImportSource react */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useUIState as _useUIState } from '../store/uiState.ts';
import { analyzeBundle } from '../utils/codeSplitting.ts';

// Strong typing for all interfaces
interface PerformanceMetrics {
  memoryUsage: number;
  renderTime: number;
  bundleSize: number;
  loadTime: number;
  fps: number;
  errors: number;
}

interface PerformanceData {
  timestamp: number;
  metrics: PerformanceMetrics;
}

interface BundleStats {
  loadTime?: number;
  domContentLoaded?: number;
  firstPaint?: number | undefined;
  firstContentfulPaint?: number | undefined;
  totalSize?: number;
  chunkCount?: number;
}

interface PerformanceAverages {
  memoryUsage: number;
  renderTime: number;
  fps: number;
  errors: number;
}

export const PerformanceDashboard: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [bundleStats, setBundleStats] = useState<BundleStats | null>(null);
  const [isLoadingBundle, setIsLoadingBundle] = useState(true);
  
  // Refs for FPS calculation and animation management
  const fpsRef = useRef(60);
  const fpsAnimationId = useRef<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const lastRenderTime = useRef(performance.now());

  // Proper FPS calculation with cleanup
  const calculateFPS = useCallback(() => {
    let frameCount = 0;
    let lastTime = performance.now();

    const tick = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime - lastTime >= 1000) {
        fpsRef.current = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;
      }

      fpsAnimationId.current = requestAnimationFrame(tick);
    };

    fpsAnimationId.current = requestAnimationFrame(tick);
  }, []);

  // Cleanup FPS animation when monitoring stops
  useEffect(() => {
    if (isMonitoring) {
      calculateFPS();
    } else {
      if (fpsAnimationId.current) {
        cancelAnimationFrame(fpsAnimationId.current);
        fpsAnimationId.current = null;
      }
    }

    return () => {
      if (fpsAnimationId.current) {
        cancelAnimationFrame(fpsAnimationId.current);
        fpsAnimationId.current = null;
      }
    };
  }, [isMonitoring, calculateFPS]);

  // Performance monitoring interval with proper state management
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      const currentTime = performance.now();
      const renderDuration = currentTime - lastRenderTime.current;
      lastRenderTime.current = currentTime;

      const metrics: PerformanceMetrics = {
        memoryUsage: ((performance as unknown) as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize || 0,
        renderTime: renderDuration,
        bundleSize: bundleStats?.totalSize || 0,
        loadTime: (() => {
          const timing = ((performance as unknown) as { timing?: { loadEventEnd: number; navigationStart: number } }).timing;
          if (timing?.loadEventEnd && timing?.navigationStart) {
            return timing.loadEventEnd - timing.navigationStart;
          }
          return 0;
        })(),
        fps: fpsRef.current,
        errors: 0 // Will be updated from error tracking
      };

      setPerformanceData(prev => {
        const next = [...prev, { timestamp: Date.now(), metrics }];
        return next.length > 50 ? next.slice(-50) : next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isMonitoring, bundleStats]);

  // Analyze bundle on mount with loading state
  useEffect(() => {
    const analyze = async () => {
      setIsLoadingBundle(true);
      try {
        const stats = await analyzeBundle();
        setBundleStats(stats);
      } catch (error) {
        console.warn('Could not analyze bundle:', error);
        setBundleStats(null);
      } finally {
        setIsLoadingBundle(false);
      }
    };
    
    analyze();
  }, []);

  // Calculate averages with proper typing
  const averages = useMemo((): PerformanceAverages | null => {
    if (performanceData.length === 0) return null;
    
    const sum = performanceData.reduce((acc, data) => ({
      memoryUsage: acc.memoryUsage + data.metrics.memoryUsage,
      renderTime: acc.renderTime + data.metrics.renderTime,
      fps: acc.fps + data.metrics.fps,
      errors: acc.errors + data.metrics.errors
    }), { memoryUsage: 0, renderTime: 0, fps: 0, errors: 0 });
    
    const count = performanceData.length;
    
    return {
      memoryUsage: sum.memoryUsage / count,
      renderTime: sum.renderTime / count,
      fps: sum.fps / count,
      errors: sum.errors / count
    };
  }, [performanceData]);

  // Performance status calculation
  const getPerformanceStatus = useCallback((): 'excellent' | 'good' | 'warning' | 'critical' => {
    if (!averages) return 'good';
    
    if (averages.fps < 30 || averages.memoryUsage > 100 * 1024 * 1024) return 'critical';
    if (averages.fps < 50 || averages.memoryUsage > 50 * 1024 * 1024) return 'warning';
    if (averages.fps >= 55 && averages.memoryUsage < 25 * 1024 * 1024) return 'excellent';
    
    return 'good';
  }, [averages]);

  const status = getPerformanceStatus();
  const statusColors = {
    excellent: 'text-green-500',
    good: 'text-blue-500',
    warning: 'text-yellow-500',
    critical: 'text-red-500'
  };

  // Focus management
  useEffect(() => {
    if (isVisible && modalRef.current) {
      const firstFocusable = modalRef.current.querySelector(
        'button, input, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      firstFocusable?.focus();
    }
  }, [isVisible]);

  // Export performance data
  const handleExportData = useCallback(() => {
    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        performanceData,
        averages,
        status,
        bundleStats
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-metrics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  }, [performanceData, averages, status, bundleStats]);

  // Format memory size
  const formatMemorySize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }, []);

  if (!isVisible) {
    return (
      <button
        type="button"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        title="Performance Dashboard"
        aria-label="Open Performance Dashboard"
      >
        📊
      </button>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="performance-dashboard-title"
      aria-describedby="performance-dashboard-description"
      ref={modalRef}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-2">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <span className="text-2xl" aria-hidden="true">📊</span>
            <div>
              <h2 id="performance-dashboard-title" className="text-xl font-semibold text-gray-900 dark:text-white">
                Performance Dashboard
              </h2>
              <p id="performance-dashboard-description" className="text-sm text-gray-600 dark:text-gray-400">
                Monitor application performance in real-time
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleExportData}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Export performance data"
              aria-label="Export performance data as JSON"
            >
              📥 Export
            </button>
            <button
              type="button"
              onClick={() => setIsMonitoring(!isMonitoring)}
              className={`px-3 py-1 rounded text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 ${
                isMonitoring 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
              aria-label={isMonitoring ? 'Stop monitoring' : 'Start monitoring'}
            >
              {isMonitoring ? '⏹️ Stop' : '▶️ Start'} Monitoring
            </button>
            <button
              type="button"
              onClick={() => setIsVisible(false)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Close performance dashboard"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                <span className={`text-lg font-semibold ${statusColors[status]}`}>
                  {status.toUpperCase()}
                </span>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">FPS</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {averages?.fps.toFixed(1) || 'N/A'}
                </span>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Memory</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {averages ? formatMemorySize(averages.memoryUsage) : 'N/A'}
                </span>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Errors</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {averages?.errors || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Bundle Analysis */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white flex items-center space-x-2">
              <span>📦</span>
              <span>Bundle Analysis</span>
              {isLoadingBundle && (
                <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
              )}
            </h3>
            {bundleStats ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-sm text-blue-600 dark:text-blue-400">Load Time</div>
                  <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                    {bundleStats.loadTime != null ? `${bundleStats.loadTime.toFixed(2)}s` : 'N/A'}
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-sm text-green-600 dark:text-green-400">DOM Ready</div>
                  <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                    {bundleStats.domContentLoaded != null ? `${bundleStats.domContentLoaded.toFixed(2)}s` : 'N/A'}
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="text-sm text-purple-600 dark:text-purple-400">First Paint</div>
                  <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                    {bundleStats.firstPaint != null ? `${bundleStats.firstPaint.toFixed(2)}s` : 'N/A'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                <p className="text-gray-600 dark:text-gray-400">
                  {isLoadingBundle ? 'Analyzing bundle...' : 'Bundle analysis unavailable'}
                </p>
              </div>
            )}
          </div>

          {/* Real-time Metrics */}
          {isMonitoring && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white flex items-center space-x-2">
                <span>⚡</span>
                <span>Real-time Metrics</span>
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="space-y-2">
                  {performanceData
                    .slice(-10)
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .map((data) => (
                      <div key={data.timestamp} className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {new Date(data.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="text-gray-900 dark:text-white">
                          FPS: {data.metrics.fps.toFixed(1)} | 
                          Memory: {formatMemorySize(data.metrics.memoryUsage)} |
                          Render: {data.metrics.renderTime.toFixed(2)}ms
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* System Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white flex items-center space-x-2">
              <span>💻</span>
              <span>System Information</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                <h4 className="font-medium mb-2 text-gray-900 dark:text-white">Browser</h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <div>User Agent: {navigator.userAgent.split(' ')[0]}</div>
                  <div>Platform: {navigator.platform}</div>
                  <div>Language: {navigator.language}</div>
                  <div>Online: {navigator.onLine ? 'Yes' : 'No'}</div>
                  <div>Connection: {((navigator as unknown) as { connection?: { effectiveType?: string } }).connection?.effectiveType || 'Unknown'}</div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                <h4 className="font-medium mb-2 text-gray-900 dark:text-white">Memory</h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <div>Memory Limit: {((performance as unknown) as { memory?: { jsHeapSizeLimit: number; totalJSHeapSize: number; usedJSHeapSize: number } }).memory ? formatMemorySize(((performance as unknown) as { memory: { jsHeapSizeLimit: number } }).memory.jsHeapSizeLimit) : 'N/A'}</div>
                  <div>Total Memory: {((performance as unknown) as { memory?: { jsHeapSizeLimit: number; totalJSHeapSize: number; usedJSHeapSize: number } }).memory ? formatMemorySize(((performance as unknown) as { memory: { totalJSHeapSize: number } }).memory.totalJSHeapSize) : 'N/A'}</div>
                  <div>Used Memory: {((performance as unknown) as { memory?: { jsHeapSizeLimit: number; totalJSHeapSize: number; usedJSHeapSize: number } }).memory ? formatMemorySize(((performance as unknown) as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize) : 'N/A'}</div>
                  <div>Available: {((performance as unknown) as { memory?: { jsHeapSizeLimit: number; usedJSHeapSize: number } }).memory ? formatMemorySize(((performance as unknown) as { memory: { jsHeapSizeLimit: number; usedJSHeapSize: number } }).memory.jsHeapSizeLimit - ((performance as unknown) as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize) : 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white flex items-center space-x-2">
              <span>💡</span>
              <span>Performance Recommendations</span>
            </h3>
            <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                {status === 'critical' && (
                  <>
                    <li>• Memory usage is critically high - consider optimizing component rendering</li>
                    <li>• FPS is below 30 - check for expensive operations in render cycles</li>
                    <li>• Implement React.memo and useMemo for expensive components</li>
                    <li>• Consider code splitting to reduce initial bundle size</li>
                  </>
                )}
                {status === 'warning' && (
                  <>
                    <li>• Performance is degrading - monitor memory usage and FPS</li>
                    <li>• Consider implementing React.memo for expensive components</li>
                    <li>• Optimize re-renders with proper dependency arrays</li>
                    <li>• Review bundle size and implement lazy loading</li>
                  </>
                )}
                {status === 'good' && (
                  <>
                    <li>• Performance is acceptable - continue monitoring</li>
                    <li>• Consider implementing code splitting for better load times</li>
                    <li>• Monitor for memory leaks during extended usage</li>
                    <li>• Optimize images and assets for faster loading</li>
                  </>
                )}
                {status === 'excellent' && (
                  <>
                    <li>• Performance is excellent - keep up the good work!</li>
                    <li>• Consider implementing advanced optimizations for edge cases</li>
                    <li>• Monitor performance in different network conditions</li>
                    <li>• Document performance best practices for the team</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 