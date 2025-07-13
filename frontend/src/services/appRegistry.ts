import React from 'react';
import { createAppSearchResult } from './searchRegistry.ts';
import { useUIState } from '../store/uiState.ts';
import { SearchProvider, SearchResult } from '../../shared/types/search.ts';
import { monitorManager } from './monitorManager.ts';
import { EnterpriseLogger } from './core/logger.ts';

// App categories for better organization
export type AppCategory = 
  | 'productivity' 
  | 'development' 
  | 'multimedia' 
  | 'system' 
  | 'utilities' 
  | 'games' 
  | 'communication' 
  | 'finance' 
  | 'education' 
  | 'entertainment';

// App permissions for security
export type AppPermission = 
  | 'file-system' 
  | 'network' 
  | 'system-info' 
  | 'notifications' 
  | 'clipboard' 
  | 'camera' 
  | 'microphone' 
  | 'location' 
  | 'storage' 
  | 'admin';

// App status for lifecycle management
export type AppStatus = 'active' | 'inactive' | 'loading' | 'error' | 'updating';

// App metadata for enhanced information
export interface AppMetadata {
  version: string;
  author: string;
  website?: string;
  repository?: string;
  license?: string;
  tags: string[];
  dependencies?: string[];
  lastUpdated: Date;
  installDate: Date;
  usageCount: number;
  rating?: number;
  size?: number; // in bytes
}

// Enhanced app interface
export interface AppInfo {
  id: string;
  title: string;
  icon: string;
  description: string;
  category: AppCategory;
  permissions: AppPermission[];
  component: React.ComponentType<Record<string, unknown>>;
  status: AppStatus;
  metadata: AppMetadata;
  shortcuts?: string[];
  keywords?: string[];
  isSystem?: boolean;
  isHidden?: boolean;
  requiresUpdate?: boolean;
  updateAvailable?: boolean;
  minWindowSize?: { width: number; height: number };
  defaultWindowSize?: { width: number; height: number };
  defaultWindowPosition?: { x: number; y: number };
}

// App launch options
export interface AppLaunchOptions {
  args?: Record<string, unknown>;
  windowOptions?: {
    size?: { width: number; height: number };
    position?: { x: number; y: number };
    maximized?: boolean;
    minimized?: boolean;
  };
  permissions?: AppPermission[];
}

// App registry service with enhanced functionality
class AppRegistryService {
  private logger = new EnterpriseLogger();
  private apps = new Map<string, AppInfo>();
  private categories = new Map<AppCategory, string>();
  private permissions = new Map<AppPermission, string>();
  private eventListeners = new Map<string, Set<(app: AppInfo) => void>>();

  constructor() {
    this.initializeCategories();
    this.initializePermissions();
  }

  private initializeCategories(): void {
    this.categories.set('productivity', '📊 Productivity');
    this.categories.set('development', '💻 Development');
    this.categories.set('multimedia', '🎵 Multimedia');
    this.categories.set('system', '⚙️ System');
    this.categories.set('utilities', '🔧 Utilities');
    this.categories.set('games', '🎮 Games');
    this.categories.set('communication', '💬 Communication');
    this.categories.set('finance', '💰 Finance');
    this.categories.set('education', '📚 Education');
    this.categories.set('entertainment', '🎬 Entertainment');
  }

  private initializePermissions(): void {
    this.permissions.set('file-system', 'File System Access');
    this.permissions.set('network', 'Network Access');
    this.permissions.set('system-info', 'System Information');
    this.permissions.set('notifications', 'Notifications');
    this.permissions.set('clipboard', 'Clipboard Access');
    this.permissions.set('camera', 'Camera Access');
    this.permissions.set('microphone', 'Microphone Access');
    this.permissions.set('location', 'Location Access');
    this.permissions.set('storage', 'Storage Access');
    this.permissions.set('admin', 'Administrative Access');
  }

  // Register a new app
  register(app: AppInfo): void {
    // Validate required fields
    if (!app.id || !app.title || !app.component) {
      throw new Error('App registration failed: missing required fields');
    }

    // Check for duplicate IDs
    if (this.apps.has(app.id)) {
      this.logger.warn(`App with ID '${app.id}' already exists. Overwriting...`, { component: 'AppRegistry', action: 'registerApp', metadata: { appId: app.id } });
    }

    // Set default values
    const appWithDefaults: AppInfo = {
      id: app.id,
      title: app.title,
      icon: app.icon,
      description: app.description,
      category: app.category,
      permissions: app.permissions,
      component: app.component,
      status: app.status || 'inactive',
      metadata: {
        version: app.metadata?.version || '1.0.0',
        author: app.metadata?.author || 'Unknown',
        tags: app.metadata?.tags || [],
        lastUpdated: app.metadata?.lastUpdated || new Date(),
        installDate: app.metadata?.installDate || new Date(),
        usageCount: app.metadata?.usageCount || 0,
        ...(app.metadata?.website !== undefined && { website: app.metadata.website }),
        ...(app.metadata?.repository !== undefined && { repository: app.metadata.repository }),
        ...(app.metadata?.license !== undefined && { license: app.metadata.license }),
        ...(app.metadata?.dependencies !== undefined && { dependencies: app.metadata.dependencies }),
        ...(app.metadata?.rating !== undefined && { rating: app.metadata.rating }),
        ...(app.metadata?.size !== undefined && { size: app.metadata.size })
      },
      keywords: app.keywords || [],
      isSystem: app.isSystem || false,
      isHidden: app.isHidden || false,
      requiresUpdate: app.requiresUpdate || false,
      updateAvailable: app.updateAvailable || false,
      minWindowSize: app.minWindowSize || { width: 300, height: 200 },
      defaultWindowSize: app.defaultWindowSize || { width: 600, height: 400 },
      defaultWindowPosition: app.defaultWindowPosition || { x: 100, y: 100 }
    };

    this.apps.set(app.id, appWithDefaults);
    this.emitEvent('appRegistered', appWithDefaults);
    this.logger.info(`App registered: ${app.title} (${app.id})`, { component: 'AppRegistry', action: 'registerApp', metadata: { appId: app.id } });
  }

  // Unregister an app
  unregister(id: string): boolean {
    const app = this.apps.get(id);
    if (app) {
      this.apps.delete(id);
      this.emitEvent('appUnregistered', app);
      this.logger.info(`App unregistered: ${app.title} (${id})`, { component: 'AppRegistry', action: 'unregisterApp', metadata: { appId: id } });
      return true;
    }
    return false;
  }

  // Get app by ID
  get(id: string): AppInfo | undefined {
    return this.apps.get(id);
  }

  // Get all apps (with optional filtering)
  getAll(options?: {
    includeHidden?: boolean;
    includeSystem?: boolean;
    category?: AppCategory;
    status?: AppStatus;
  }): AppInfo[] {
    let apps = Array.from(this.apps.values());

    if (options) {
      if (!options.includeHidden) {
        apps = apps.filter(app => !app.isHidden);
      }
      if (!options.includeSystem) {
        apps = apps.filter(app => !app.isSystem);
      }
      if (options.category) {
        apps = apps.filter(app => app.category === options.category);
      }
      if (options.status) {
        apps = apps.filter(app => app.status === options.status);
      }
    }

    return apps.sort((a, b) => a.title.localeCompare(b.title));
  }

  // Get apps by category
  getByCategory(category: AppCategory): AppInfo[] {
    return this.getAll().filter(app => app.category === category);
  }

  // Get apps by permission
  getByPermission(permission: AppPermission): AppInfo[] {
    return this.getAll().filter(app => app.permissions.includes(permission));
  }

  // Get recently used apps
  getRecentlyUsed(limit: number = 10): AppInfo[] {
    return this.getAll()
      .filter(app => app.metadata.usageCount > 0)
      .sort((a, b) => b.metadata.usageCount - a.metadata.usageCount)
      .slice(0, limit);
  }

  // Get popular apps
  getPopular(limit: number = 10): AppInfo[] {
    return this.getAll()
      .filter(app => app.metadata.usageCount > 0)
      .sort((a, b) => (b.metadata.rating || 0) - (a.metadata.rating || 0))
      .slice(0, limit);
  }

  // Search apps with advanced filtering
  search(query: string, options?: {
    category?: AppCategory;
    permissions?: AppPermission[];
    includeHidden?: boolean;
    includeSystem?: boolean;
  }): AppInfo[] {
    const queryLower = query.toLowerCase();
    const apps = this.getAll(options);

    return apps.filter(app => 
      app.title.toLowerCase().includes(queryLower) ||
      app.description.toLowerCase().includes(queryLower) ||
      app.category.toLowerCase().includes(queryLower) ||
      app.metadata.tags.some(tag => tag.toLowerCase().includes(queryLower)) ||
      app.keywords?.some(keyword => keyword.toLowerCase().includes(queryLower)) ||
      app.metadata.author.toLowerCase().includes(queryLower)
    );
  }

  // Launch an app
  launch(id: string, options?: AppLaunchOptions): boolean {
    const app = this.get(id);
    if (!app) {
      this.logger.error(`App '${id}' not found`, { component: 'AppRegistry', action: 'launchApp', metadata: { appId: id } });
      return false;
    }

    try {
      const { openWindow } = useUIState.getState();
      
      // Update usage count
      app.metadata.usageCount++;
      app.metadata.lastUpdated = new Date();
      app.status = 'active';

      // Get monitor-aware positioning
      const primaryMonitor = monitorManager.getPrimaryMonitor();
      const defaultPosition = app.defaultWindowPosition || { x: 100, y: 100 };
      
      // Adjust position to be relative to primary monitor
      const monitorAwarePosition = {
        x: primaryMonitor.bounds.x + defaultPosition.x,
        y: primaryMonitor.bounds.y + defaultPosition.y
      };
      
      // Prepare window options
      const windowOptions = {
        size: options?.windowOptions?.size || app.defaultWindowSize,
        position: options?.windowOptions?.position || monitorAwarePosition,
        ...options?.windowOptions
      };

      // Open the window
      openWindow(id, {
        ...options?.args,
        windowOptions
      });

      this.emitEvent('appLaunched', app);
      this.logger.info(`App launched: ${app.title} (${id})`, { component: 'AppRegistry', action: 'launchApp', metadata: { appId: id } });
      return true;
    } catch (error) {
      this.logger.error(`Failed to launch app: ${app?.title ?? id} (${id}) - ${error}`, { component: 'AppRegistry', action: 'launchApp', metadata: { appId: id } });
      return false;
    }
  }
}

export const appRegistry = new AppRegistryService();