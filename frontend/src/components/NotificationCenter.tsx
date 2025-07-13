/**
 * Enterprise Notification Center Component - Enhanced Version
 * Provides comprehensive notification management UI with enterprise-grade features
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationService, Notification } from '../services/notification-service.ts';
import { useMemoryCleanup } from '../utils/memory-management.ts';
import { usePerformanceTracking } from '../utils/performance-monitor.ts';
import { EventEmitter } from 'node:events';

interface NotificationCenterProps {
  className?: string;
  maxVisible?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  theme?: 'light' | 'dark' | 'auto';
}

const icons = {
  info: '🔵',
  success: '✅',
  warning: '⚠️',
  error: '❌',
  system: '⚙️',
};

const colors = {
  low: 'border-gray-300 bg-gray-50',
  normal: 'border-blue-300 bg-blue-50',
  high: 'border-orange-300 bg-orange-50',
  critical: 'border-red-300 bg-red-50',
};

const typeColors = {
  error: 'bg-red-500',
  warning: 'bg-yellow-500',
  success: 'bg-green-500',
  info: 'bg-blue-500',
  system: 'bg-purple-500',
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  className = '',
  maxVisible = 5,
  position = 'top-right',
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState<{
    type?: Notification['type'];
    category?: string;
    priority?: Notification['priority'];
  }>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  const { addCleanup } = useMemoryCleanup();
  const { recordError } = usePerformanceTracking('NotificationCenter');

  // 🔥 ENHANCEMENT 1: Optimized filter function with memoization
  const filterFunction = useCallback((notifications: Notification[]) => {
    let filtered = notifications;

    // Apply filters
    if (filter.type) {
      filtered = filtered.filter(n => n.type === filter.type);
    }
    if (filter.category) {
      filtered = filtered.filter(n => n.category === filter.category);
    }
    if (filter.priority) {
      filtered = filtered.filter(n => n.priority === filter.priority);
    }

    // Apply search with optimized string matching
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(n => {
        const titleMatch = n.title.toLowerCase().includes(query);
        const messageMatch = n.message.toLowerCase().includes(query);
        const categoryMatch = n.category?.toLowerCase().includes(query) || false;
        return titleMatch || messageMatch || categoryMatch;
      });
    }

    return filtered;
  }, [filter.type, filter.category, filter.priority, searchQuery]);

  // Memoized filtered notifications with performance optimization
  const filteredNotifications = useMemo(() => {
    return filterFunction(notifications);
  }, [notifications, filterFunction]);

  // Visible notifications (limited by maxVisible)
  const visibleNotifications = useMemo(() => {
    return isExpanded ? filteredNotifications : filteredNotifications.slice(0, maxVisible);
  }, [filteredNotifications, isExpanded, maxVisible]);

  // Setup event listeners
  useEffect(() => {
    const handleNotificationDelivered = (notification: Notification) => {
      setNotifications(prev => {
        // Check for duplicates
        if (prev.some(n => n.id === notification.id)) {
          return prev;
        }
        return [notification, ...prev].slice(0, 100); // Keep max 100 notifications
      });
    };

    const handleNotificationDismissed = ({ notification }: { notification: Notification }) => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    };

    const handleNotificationUpdated = (notification: Notification) => {
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? notification : n)
      );
    };

    // Subscribe to notification events
    (notificationService as unknown as EventEmitter).on('notification:delivered', handleNotificationDelivered);
    (notificationService as unknown as EventEmitter).on('notification:dismissed', handleNotificationDismissed);
    (notificationService as unknown as EventEmitter).on('notification:updated', handleNotificationUpdated);

    // Cleanup function
    const cleanup = () => {
      (notificationService as unknown as EventEmitter).off('notification:delivered', handleNotificationDelivered);
      (notificationService as unknown as EventEmitter).off('notification:dismissed', handleNotificationDismissed);
      (notificationService as unknown as EventEmitter).off('notification:updated', handleNotificationUpdated);
    };

    addCleanup(cleanup);
    return cleanup;
  }, [addCleanup]);

  // Load existing notifications on mount
  useEffect(() => {
    try {
      const existingNotifications = notificationService.getHistory({ limit: 50 });
      setNotifications(existingNotifications);
    } catch (error) {
      recordError(`Failed to load notifications: ${error}`);
    }
  }, [recordError]);

  const handleDismiss = useCallback(async (id: string) => {
    try {
      await notificationService.dismiss(id, 'user');
    } catch (error) {
      recordError(`Failed to dismiss notification: ${error}`);
    }
  }, [recordError]);

  const handleDismissAll = useCallback(async () => {
    try {
      const dismissPromises = visibleNotifications.map(n => 
        notificationService.dismiss(n.id, 'user')
      );
      await Promise.all(dismissPromises);
    } catch (error) {
      recordError(`Failed to dismiss all notifications: ${error}`);
    }
  }, [visibleNotifications, recordError]);

  const handleNotificationClick = useCallback((notification: Notification) => {
    // Execute notification actions
    if (notification.actions && notification.actions.length > 0) {
      const primaryAction = notification.actions[0];
      try {
        primaryAction.action();
      } catch (error) {
        recordError(`Failed to execute notification action: ${error}`);
      }
    }

    // Auto-dismiss unless persistent
    if (!notification.persistent) {
      handleDismiss(notification.id);
    }
  }, [handleDismiss, recordError]);

  const getPositionClasses = () => {
    const baseClasses = 'fixed z-50';
    switch (position) {
      case 'top-right':
        return `${baseClasses} top-4 right-4`;
      case 'top-left':
        return `${baseClasses} top-4 left-4`;
      case 'bottom-right':
        return `${baseClasses} bottom-4 right-4`;
      case 'bottom-left':
        return `${baseClasses} bottom-4 left-4`;
      default:
        return `${baseClasses} top-4 right-4`;
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    return icons[type as keyof typeof icons] || '📢';
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    return colors[priority as keyof typeof colors] || colors.normal;
  };

  // 🔥 ENHANCEMENT 3: Customizable progress bar colors based on notification type
  const getProgressBarColor = (type: Notification['type'], priority: Notification['priority']) => {
    if (priority === 'critical') return 'bg-red-500';
    if (priority === 'high') return 'bg-orange-500';
    
    return typeColors[type as keyof typeof typeColors] || 'bg-blue-500';
  };

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className={`${getPositionClasses()} ${className}`}>
      {/* 🔥 ENHANCEMENT 2: ARIA live region for screen reader announcements */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-label="Notification updates"
        className="sr-only"
      >
        {visibleNotifications.length > 0 && 
          `${visibleNotifications.length} notification${visibleNotifications.length === 1 ? '' : 's'} available`
        }
      </div>

      {/* Notification Header */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border"
          role="region"
          aria-label="Notification center controls"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Notifications ({filteredNotifications.length})
            </h3>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleDismissAll}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors"
                aria-label={`Clear all ${visibleNotifications.length} notifications`}
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                aria-label="Collapse notification center"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              aria-label="Search notifications"
            />
            
            <div className="flex flex-wrap gap-2" role="group" aria-label="Notification filters">
              <select
                value={filter.type || ''}
                onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value as Notification['type'] || undefined }))}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                aria-label="Filter by notification type"
              >
                <option value="">All Types</option>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="system">System</option>
              </select>
              
              <select
                value={filter.priority || ''}
                onChange={(e) => setFilter(prev => ({ ...prev, priority: e.target.value as Notification['priority'] || undefined }))}
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                aria-label="Filter by notification priority"
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
        </motion.div>
      )}

      {/* Notifications List */}
      <div 
        className="space-y-2 max-h-96 overflow-y-auto"
        role="log"
        aria-label="Notification list"
        aria-live="polite"
      >
        <AnimatePresence mode="popLayout">
          {visibleNotifications.map((notification: Notification, index: number) => (
            <motion.div
              key={notification.id}
              layout
              initial={{ opacity: 0, x: 300, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 300, scale: 0.8 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30,
                delay: index * 0.05
              }}
              className={`
                relative p-4 rounded-lg shadow-lg border-l-4 cursor-pointer
                bg-white dark:bg-gray-800 hover:shadow-xl transition-all duration-200
                ${getPriorityColor(notification.priority)}
                max-w-sm
              `}
              onClick={() => handleNotificationClick(notification)}
              role="alert" // 🔥 ENHANCEMENT 2: ARIA alert role for screen readers
              aria-label={`${notification.type} notification: ${notification.title}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleNotificationClick(notification);
                }
              }}
            >
              {/* Notification Content */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 text-xl" aria-hidden="true">
                  {notification.icon || getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {notification.title}
                    </h4>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismiss(notification.id);
                      }}
                      className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      aria-label={`Dismiss notification: ${notification.title}`}
                    >
                      <span className="text-xs text-gray-400">✕</span>
                    </button>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                  
                  {/* Metadata */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                      {notification.category && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                          {notification.category}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded ${
                        notification.priority === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        notification.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                        notification.priority === 'normal' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {notification.priority}
                      </span>
                    </div>
                    
                    {notification.metadata?.createdAt && (
                      <span className="text-xs text-gray-400">
                        {new Date(notification.metadata.createdAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  
                  {/* Actions */}
                  {notification.actions && notification.actions.length > 0 && (
                    <div className="flex space-x-2 mt-3" role="group" aria-label="Notification actions">
                      {notification.actions.slice(0, 2).map((action: { id: string; label: string; action: () => void; style?: string }) => (
                        <button
                          type="button"
                          key={action.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            try {
                              action.action();
                            } catch (error) {
                              recordError(`Action failed: ${error}`);
                            }
                          }}
                          className={`
                            px-3 py-1 text-xs rounded transition-colors
                            ${
                              action.style === 'primary' ? 'bg-blue-500 hover:bg-blue-600 text-white' :
                              action.style === 'danger' ? 'bg-red-500 hover:bg-red-600 text-white' :
                              'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                            }
                          `}
                          aria-label={`${action.label} for ${notification.title}`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* 🔥 ENHANCEMENT 3: Enhanced progress bar with type-based colors */}
              {notification.expiresAt && (
                <motion.div
                  className={`absolute bottom-0 left-0 h-1 rounded-b ${getProgressBarColor(notification.type, notification.priority)}`}
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{
                    duration: (notification.expiresAt.getTime() - Date.now()) / 1000,
                    ease: 'linear'
                  }}
                  aria-label={`Notification expires in ${Math.ceil((notification.expiresAt.getTime() - Date.now()) / 1000)} seconds`}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Expand/Collapse Button */}
      {filteredNotifications.length > maxVisible && (
        <motion.button
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 w-full p-2 text-sm bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border rounded-lg transition-colors"
          aria-label={isExpanded ? 'Show fewer notifications' : `Show all ${filteredNotifications.length - maxVisible} additional notifications`}
        >
          {isExpanded ? 'Show Less' : `Show All (${filteredNotifications.length - maxVisible} more)`}
        </motion.button>
      )}
    </div>
  );
};

export default NotificationCenter;