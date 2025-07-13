import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { aibosPlatformService, App, AppInstallation } from '../services/aibos-platform.ts';
import { getColor } from '../utils/themeHelpers.ts';
import { useUIState } from '../store/uiState.ts';
import { animation } from '../utils/designTokens.ts';

export interface AppStoreProps {
  tenantId: string;
  onAppInstalled?: (app: App) => void;
  onAppUninstalled?: (appId: string) => void;
  onAppOpen?: (app: App) => void;
}

interface AppCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon: string;
  color: string;
  sort_order: number;
}

const AppStore: React.FC<AppStoreProps> = ({ 
  tenantId, 
  onAppInstalled, 
  onAppUninstalled,
  onAppOpen 
}) => {
  const { colorMode } = useUIState();
  const [apps, setApps] = useState<App[]>([]);
  const [categories, setCategories] = useState<AppCategory[]>([]);
  const [installedApps, setInstalledApps] = useState<AppInstallation[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [installedLoading, setInstalledLoading] = useState<boolean>(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Performance: Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => 
    typeof window !== 'undefined' && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches, 
    []
  );

  // Memoized theme styles for consistent theming
  const themeStyles = useMemo(() => ({
    container: {
      backgroundColor: getColor('gray.50', colorMode),
    },
    card: {
      backgroundColor: getColor('white', colorMode),
      border: `1px solid ${getColor('gray.200', colorMode)}`,
      transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
    },
    input: {
      backgroundColor: getColor('white', colorMode),
      border: `1px solid ${getColor('gray.300', colorMode)}`,
      color: getColor('gray.900', colorMode),
      transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
    },
    button: {
      primary: {
        backgroundColor: getColor('primary.600', colorMode),
        color: getColor('white', colorMode),
        transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
      },
      secondary: {
        backgroundColor: getColor('gray.100', colorMode),
        color: getColor('gray.700', colorMode),
        transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
      },
      danger: {
        backgroundColor: getColor('error.100', colorMode),
        color: getColor('error.700', colorMode),
        transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
      },
    },
  }), [colorMode, prefersReducedMotion]);

  // Safe icon rendering helper
  const renderAppIcon = useCallback((app: App, size: 'sm' | 'lg' = 'lg') => {
    const iconSize = size === 'sm' ? 'h-8 w-8' : 'h-16 w-16';
    
    if (app.icon_url?.startsWith('<svg')) {
      return (
        <div 
          className={iconSize}
          dangerouslySetInnerHTML={{ __html: app.icon_url }}
        />
      );
    } else if (app.icon_url?.startsWith('http')) {
      return (
        <img 
          src={app.icon_url} 
          alt={`${app.name} icon`} 
          className={iconSize}
          onError={(e) => {
            // Fallback to emoji if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
      );
    }
    
    return (
      <span className={`text-${size === 'sm' ? '2xl' : '6xl'}`}>
        {app.icon_url || '📱'}
      </span>
    );
  }, []);

  // Safe category icon rendering
  const renderCategoryIcon = useCallback((category: AppCategory) => {
    if (category.icon?.startsWith('http')) {
      return (
        <img 
          src={category.icon} 
          alt="" 
          className="inline-block h-4 w-4 mr-1"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
      );
    }
    
    return (
      <span className="mr-1">{category.icon || '📁'}</span>
    );
  }, []);

  // Load apps and categories
  const loadApps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load categories
      const categoriesResponse = await aibosPlatformService.getAppCategories();
      if (categoriesResponse.success) {
        setCategories((categoriesResponse.data || []) as AppCategory[]);
      }

      // Load apps
      const appsResponse = await aibosPlatformService.getPublishedApps();
      if (appsResponse.success) {
        setApps(appsResponse.data || []);
      }

      // Load installed apps
      await loadInstalledApps();
    } catch (err) {
      setError('Failed to load apps');
      console.error('Error loading apps:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Separate function for loading installed apps
  const loadInstalledApps = useCallback(async () => {
    try {
      setInstalledLoading(true);
      const installedResponse = await aibosPlatformService.getTenantApps(tenantId);
      if (installedResponse.success) {
        setInstalledApps((installedResponse.data || []) as unknown as AppInstallation[]);
      }
    } catch (err) {
      console.error('Error loading installed apps:', err);
    } finally {
      setInstalledLoading(false);
    }
  }, [tenantId]);

  // Install app
  const installApp = useCallback(async (app: App) => {
    try {
      setInstalling(app.id);
      setError(null);

      const response = await aibosPlatformService.installApp(app.id, tenantId);
      
      if (response.success) {
        // Refresh installed apps
        await loadInstalledApps();
        
        onAppInstalled?.(app);
        
        // Show success notification with sanitized text
        const sanitizedName = app.name.replace(/[<>]/g, ''); // Basic HTML escape
        await aibosPlatformService.createNotification({
          tenant_id: tenantId,
          user_id: (await aibosPlatformService.getCurrentUser())?.id || '',
          type: 'success',
          title: 'App Installed',
          message: `${sanitizedName} has been successfully installed!`,
          app_id: app.id,
          data: {},
          is_read: false
        });
      } else {
        setError(response.error || 'Failed to install app');
      }
    } catch (err) {
      setError('Failed to install app');
      console.error('Error installing app:', err);
    } finally {
      setInstalling(null);
    }
  }, [tenantId, onAppInstalled, loadInstalledApps]);

  // Uninstall app
  const uninstallApp = useCallback(async (installation: AppInstallation) => {
    try {
      setError(null);

      const response = await aibosPlatformService.uninstallApp(tenantId, installation.app_id);
      
      if (response.success) {
        // Refresh installed apps
        await loadInstalledApps();
        
        onAppUninstalled?.(installation.app_id);
        
        // Show success notification
        await aibosPlatformService.createNotification({
          tenant_id: tenantId,
          user_id: (await aibosPlatformService.getCurrentUser())?.id || '',
          type: 'info',
          title: 'App Uninstalled',
          message: 'App has been successfully uninstalled.',
          app_id: installation.app_id,
          data: {},
          is_read: false
        });
      } else {
        setError(response.error || 'Failed to uninstall app');
      }
    } catch (err) {
      setError('Failed to uninstall app');
      console.error('Error uninstalling app:', err);
    }
  }, [tenantId, onAppUninstalled, loadInstalledApps]);

  // Check if app is installed
  const isAppInstalled = useCallback((appId: string): boolean => {
    return installedApps.some(installation => installation.app_id === appId);
  }, [installedApps]);

  // Get installation status
  const getInstallationStatus = useCallback((appId: string): string | null => {
    const installation = installedApps.find(inst => inst.app_id === appId);
    return installation?.status || null;
  }, [installedApps]);

  // Get installation object safely
  const getInstallation = useCallback((appId: string): AppInstallation | null => {
    return installedApps.find(inst => inst.app_id === appId) || null;
  }, [installedApps]);

  // Filter apps based on category and search
  const filteredApps = useMemo(() => {
    return apps.filter(app => {
      const matchesCategory = selectedCategory === 'all' || app.category_id === selectedCategory;
      const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           app.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (app.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) || false);
      
      return matchesCategory && matchesSearch;
    });
  }, [apps, selectedCategory, searchTerm]);

  // Load data on mount
  useEffect(() => {
    loadApps();
  }, [loadApps]);

  if (loading) {
    return (
              <div 
          className="flex items-center justify-center h-64"
          style={{ backgroundColor: getColor('gray.50', colorMode) }}
        >
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        <span 
          className="ml-2"
          style={{ color: getColor('gray.600', colorMode) }}
        >
          Loading apps...
        </span>
      </div>
    );
  }

  return (
    <div 
      className="max-w-7xl mx-auto p-6"
      style={themeStyles.container}
    >
      {/* Header */}
      <div className="mb-8">
        <h1 
          className="text-3xl font-bold mb-2"
          style={{ color: getColor('gray.900', colorMode) }}
        >
          AI-BOS App Store
        </h1>
        <p style={{ color: getColor('gray.600', colorMode) }}>
          Discover and install powerful apps for your workspace
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search apps..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={themeStyles.input}
            className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Search apps"
          />
        </div>

        {/* Category Filter */}
        <div className="sm:w-48">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={themeStyles.input}
            className="w-full px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Filter by category"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {renderCategoryIcon(category)}
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div 
          className="mb-4 p-4 border rounded-lg flex items-center"
          style={{ 
            backgroundColor: getColor('error.50', colorMode),
            borderColor: getColor('error.200', colorMode),
          }}
        >
          <div className="flex-shrink-0">
            <svg 
              className="h-5 w-5" 
              viewBox="0 0 20 20" 
              fill="currentColor"
              style={{ color: getColor('error.400', colorMode) }}
            >
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <p 
              className="text-sm"
              style={{ color: getColor('error.800', colorMode) }}
            >
              {error}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto text-sm hover:underline"
            style={{ color: getColor('error.600', colorMode) }}
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Apps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredApps.map(app => {
          const isInstalled = isAppInstalled(app.id);
          const installationStatus = getInstallationStatus(app.id);
          const isInstalling = installing === app.id;
          const installation = getInstallation(app.id);

          return (
            <div 
              key={app.id} 
              className="rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              style={themeStyles.card}
            >
              {/* App Icon */}
                              <div 
                  className="h-48 flex items-center justify-center"
                  style={{ 
                    background: `linear-gradient(135deg, ${getColor('primary.50', colorMode)}, ${getColor('primary.100', colorMode)})`
                  }}
                >
                {renderAppIcon(app, 'lg')}
              </div>

              {/* App Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 
                    className="text-lg font-semibold truncate overflow-hidden whitespace-nowrap"
                    style={{ color: getColor('gray.900', colorMode) }}
                  >
                    {app.name}
                  </h3>
                  {app.is_featured && (
                                          <span 
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: getColor('warning.100', colorMode),
                          color: getColor('warning.800', colorMode)
                        }}
                      >
                      ⭐ Featured
                    </span>
                  )}
                </div>

                <p 
                  className="text-sm mb-3 line-clamp-2"
                  style={{ color: getColor('gray.600', colorMode) }}
                >
                  {app.description}
                </p>

                {/* App Stats */}
                <div 
                  className="flex items-center justify-between text-xs mb-4"
                  style={{ color: getColor('gray.500', colorMode) }}
                >
                  <span>📥 {app.downloads_count} downloads</span>
                  <span>⭐ {app.rating_average.toFixed(1)} ({app.rating_count})</span>
                </div>

                {/* Tags */}
                {app.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {app.tags.slice(0, 3).map((tag, i) => (
                      <span
                        key={`${tag}-${i}`}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        style={{ 
                          backgroundColor: getColor('gray.100', colorMode),
                          color: getColor('gray.800', colorMode)
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Button */}
                <div className="flex items-center justify-between">
                  <span 
                    className="text-sm font-medium"
                    style={{ color: getColor('gray.900', colorMode) }}
                  >
                    {app.is_free ? 'Free' : `$${app.price}`}
                  </span>

                  {isInstalled ? (
                    <div className="flex gap-2">
                      {installation && (
                        <button
                          type="button"
                          onClick={() => uninstallApp(installation)}
                          style={themeStyles.button.danger}
                          className="px-3 py-1 text-sm rounded-md hover:bg-opacity-80 transition-colors"
                          aria-label={`Uninstall ${app.name}`}
                        >
                          Uninstall
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onAppOpen?.(app)}
                        style={themeStyles.button.secondary}
                        className="px-3 py-1 text-sm rounded-md hover:bg-opacity-80 transition-colors"
                        aria-label={`Open ${app.name}`}
                      >
                        Open
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => installApp(app)}
                      disabled={isInstalling}
                      style={isInstalling ? themeStyles.button.secondary : themeStyles.button.primary}
                      className="px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Install ${app.name}`}
                    >
                      {isInstalling ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                          Installing...
                        </div>
                      ) : (
                        'Install'
                      )}
                    </button>
                  )}
                </div>

                {/* Installation Status */}
                {installationStatus && installationStatus !== 'installed' && (
                  <div 
                    className="mt-2 text-xs"
                    style={{ color: getColor('gray.500', colorMode) }}
                  >
                    Status: {installationStatus}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredApps.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 
            className="text-lg font-medium mb-2"
            style={{ color: getColor('gray.900', colorMode) }}
          >
            No apps found
          </h3>
          <p style={{ color: getColor('gray.600', colorMode) }}>
            Try adjusting your search terms or category filter
          </p>
        </div>
      )}

      {/* Installed Apps Section */}
      {installedApps.length > 0 && (
        <div className="mt-12">
          <h2 
            className="text-2xl font-bold mb-6"
            style={{ color: getColor('gray.900', colorMode) }}
          >
            Installed Apps
          </h2>
          
          {installedLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-4 border-blue-500 border-t-transparent"></div>
              <span 
                className="ml-2"
                style={{ color: getColor('gray.600', colorMode) }}
              >
                Loading installed apps...
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {installedApps.map(installation => {
                const app = apps.find(a => a.id === installation.app_id);
                if (!app) return null;

                return (
                  <div 
                    key={installation.id} 
                    className="rounded-lg shadow-md overflow-hidden"
                                         style={{
                       ...themeStyles.card,
                       border: `2px solid ${getColor('success.200', colorMode)}`,
                     }}
                   >
                     <div 
                       className="h-32 flex items-center justify-center"
                       style={{ 
                         background: `linear-gradient(135deg, ${getColor('success.50', colorMode)}, ${getColor('success.100', colorMode)})`
                       }}
                     >
                      {renderAppIcon(app, 'sm')}
                    </div>
                    <div className="p-4">
                      <h3 
                        className="font-semibold mb-2"
                        style={{ color: getColor('gray.900', colorMode) }}
                      >
                        {app.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span 
                          className="text-sm"
                          style={{ color: getColor('gray.500', colorMode) }}
                        >
                          Status: {installation.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => uninstallApp(installation)}
                          style={themeStyles.button.danger}
                          className="px-3 py-1 text-sm rounded-md hover:bg-opacity-80 transition-colors"
                          aria-label={`Uninstall ${app.name}`}
                        >
                          Uninstall
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AppStore; 