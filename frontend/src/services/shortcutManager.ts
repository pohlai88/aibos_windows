import { SearchProvider, SearchResult } from '../types/search.ts';
import { createCommandSearchResult } from './searchRegistry.ts';
import { EnterpriseLogger } from './core/logger.ts';

export interface ShortcutDefinition {
  id: string;
  key: string;
  description: string;
  category: string;
  icon?: string;
  tags?: string[];
  action: () => void;
  context?: 'global' | 'app' | 'component';
  appId?: string; // For app-specific shortcuts
  priority?: number; // Higher priority shortcuts take precedence
  enabled?: boolean;
  preventDefault?: boolean;
  helpText?: string; // Additional help text for the shortcut
  isSystem?: boolean; // System shortcuts cannot be unregistered
  requiresConfirmation?: boolean; // For destructive actions
  confirmationMessage?: string;
}

export interface ShortcutContext {
  isInputFocused: boolean;
  activeApp?: string;
  activeComponent?: string;
  activeWindow?: string;
}

export interface ShortcutConflict {
  shortcut1: ShortcutDefinition;
  shortcut2: ShortcutDefinition;
  key: string;
  severity: 'warning' | 'error';
}

class ShortcutManager {
  private shortcuts: Map<string, ShortcutDefinition> = new Map();
  private eventListeners: Map<string, () => void> = new Map();
  private isInitialized = false;
  private keyMap: Map<string, ShortcutDefinition[]> = new Map(); // For quick key lookup
  private conflicts: ShortcutConflict[] = [];
  private searchProvider?: SearchProvider;
  private logger = new EnterpriseLogger();

  // Register a new shortcut with conflict detection
  register(shortcut: ShortcutDefinition): void {
    if (this.shortcuts.has(shortcut.id)) {
      this.logger.warn(`Shortcut ${shortcut.id} already registered, overwriting...`, { component: 'ShortcutManager', action: 'registerShortcut', metadata: { shortcutId: shortcut.id } });
    }
    
    const normalizedShortcut: ShortcutDefinition = {
      ...shortcut,
      enabled: shortcut.enabled ?? true,
      preventDefault: shortcut.preventDefault ?? true,
      priority: shortcut.priority ?? 0,
      isSystem: shortcut.isSystem ?? false,
      requiresConfirmation: shortcut.requiresConfirmation ?? false
    };

    this.shortcuts.set(shortcut.id, normalizedShortcut);
    this.updateKeyMap(normalizedShortcut);
    this.detectConflicts(normalizedShortcut);
  }

  // Unregister a shortcut (cannot unregister system shortcuts)
  unregister(shortcutId: string): boolean {
    const shortcut = this.shortcuts.get(shortcutId);
    if (!shortcut) return false;
    
    if (shortcut.isSystem) {
      this.logger.warn(`Cannot unregister system shortcut: ${shortcutId}`, { component: 'ShortcutManager', action: 'unregisterShortcut', metadata: { shortcutId } });
      return false;
    }

    this.shortcuts.delete(shortcutId);
    this.removeFromKeyMap(shortcut);
    this.resolveConflicts(shortcutId);
    return true;
  }

  // Get all shortcuts for display in ShortcutHelp
  getAllShortcuts(): ShortcutDefinition[] {
    return Array.from(this.shortcuts.values())
      .filter(shortcut => shortcut.enabled)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  // Get shortcuts by category
  getShortcutsByCategory(category: string): ShortcutDefinition[] {
    return this.getAllShortcuts().filter(shortcut => shortcut.category === category);
  }

  // Get shortcuts by context
  getShortcutsByContext(context: ShortcutContext): ShortcutDefinition[] {
    return this.getAllShortcuts().filter(shortcut => {
      // Global shortcuts always apply
      if (shortcut.context === 'global') return true;
      
      // App-specific shortcuts only when that app is active
      if (shortcut.context === 'app' && shortcut.appId === context.activeApp) return true;
      
      // Component shortcuts only when that component is active
      if (shortcut.context === 'component' && shortcut.appId === context.activeComponent) return true;
      
      return false;
    });
  }

  // Get shortcuts by key combination
  getShortcutsByKey(key: string): ShortcutDefinition[] {
    const normalizedKey = this.normalizeKey(key);
    return this.keyMap.get(normalizedKey) || [];
  }

  // Check if a key combination is already registered
  isKeyRegistered(key: string, context?: ShortcutContext): boolean {
    const matchingShortcuts = this.getShortcutsByKey(key);

    if (!context) return matchingShortcuts.length > 0;

    return matchingShortcuts.some(shortcut => {
      if (shortcut.context === 'global') return true;
      if (shortcut.context === 'app' && shortcut.appId === context.activeApp) return true;
      if (shortcut.context === 'component' && shortcut.appId === context.activeComponent) return true;
      return false;
    });
  }

  // Get all conflicts
  getConflicts(): ShortcutConflict[] {
    return this.conflicts;
  }

  // Resolve conflicts by unregistering one of the conflicting shortcuts
  resolveConflict(conflict: ShortcutConflict, keepShortcutId: string): void {
    const shortcutToRemove = conflict.shortcut1.id === keepShortcutId ? conflict.shortcut2 : conflict.shortcut1;
    this.unregister(shortcutToRemove.id);
  }

  // Normalize key combinations for comparison
  private normalizeKey(key: string): string {
    return key.toLowerCase()
      .replace(/\s+/g, '')
      .replace('ctrl', 'ctrl')
      .replace('cmd', 'ctrl')
      .replace('meta', 'ctrl');
  }

  // Update key map for quick lookup
  private updateKeyMap(shortcut: ShortcutDefinition): void {
    const normalizedKey = this.normalizeKey(shortcut.key);
    const existing = this.keyMap.get(normalizedKey) || [];
    existing.push(shortcut);
    this.keyMap.set(normalizedKey, existing);
  }

  // Remove from key map
  private removeFromKeyMap(shortcut: ShortcutDefinition): void {
    const normalizedKey = this.normalizeKey(shortcut.key);
    const existing = this.keyMap.get(normalizedKey) || [];
    const filtered = existing.filter(s => s.id !== shortcut.id);
    if (filtered.length > 0) {
      this.keyMap.set(normalizedKey, filtered);
    } else {
      this.keyMap.delete(normalizedKey);
    }
  }

  // Detect conflicts
  private detectConflicts(shortcut: ShortcutDefinition): void {
    const normalizedKey = this.normalizeKey(shortcut.key);
    const existing = this.keyMap.get(normalizedKey) || [];
    
    if (existing.length > 1) {
      existing.forEach(existingShortcut => {
        if (existingShortcut.id !== shortcut.id) {
          const conflict: ShortcutConflict = {
            shortcut1: shortcut,
            shortcut2: existingShortcut,
            key: shortcut.key,
            severity: existingShortcut.isSystem || shortcut.isSystem ? 'error' : 'warning'
          };
          
          // Avoid duplicate conflicts
          const exists = this.conflicts.some(c => 
            (c.shortcut1.id === conflict.shortcut1.id && c.shortcut2.id === conflict.shortcut2.id) ||
            (c.shortcut1.id === conflict.shortcut2.id && c.shortcut2.id === conflict.shortcut1.id)
          );
          
          if (!exists) {
            this.conflicts.push(conflict);
            this.logger.warn(`Shortcut conflict detected: ${shortcut.key}`, { component: 'ShortcutManager', action: 'detectConflict', metadata: { shortcutId: shortcut.id } });
          }
        }
      });
    }
  }

  // Resolve conflicts when a shortcut is removed
  private resolveConflicts(removedShortcutId: string): void {
    this.conflicts = this.conflicts.filter(conflict => 
      conflict.shortcut1.id !== removedShortcutId && conflict.shortcut2.id !== removedShortcutId
    );
  }

  // Initialize the shortcut manager
  initialize(): void {
    if (this.isInitialized) return;
    
    this.registerDefaultShortcuts();
    this.createSearchProvider();
    this.setupGlobalEventListeners();
    
    this.isInitialized = true;
    this.logger.info('ShortcutManager initialized', { component: 'ShortcutManager', action: 'initialize' });
  }

  // Create search provider for shortcuts
  private createSearchProvider(): void {
    this.searchProvider = {
      id: 'shortcuts',
      name: 'Keyboard Shortcuts',
      search: (query: string, limit?: number): Promise<SearchResult[]> => {
        const shortcuts = this.getAllShortcuts();
        const filtered = shortcuts.filter(shortcut => 
          shortcut.description.toLowerCase().includes(query.toLowerCase()) ||
          shortcut.key.toLowerCase().includes(query.toLowerCase()) ||
          shortcut.category.toLowerCase().includes(query.toLowerCase())
        );
        
        return Promise.resolve(filtered.slice(0, limit || 10).map(shortcut => 
          createCommandSearchResult(
            shortcut.id,
            shortcut.description,
            shortcut.key,
            shortcut.action,
            shortcut.helpText
          )
        ));
      }
    };
  }

  // Get the search provider
  getSearchProvider(): SearchProvider | undefined {
    return this.searchProvider;
  }

  // Register default system shortcuts
  private registerDefaultShortcuts(): void {
    // Window management shortcuts
    this.register({
      id: 'window-close',
      key: 'Ctrl+W',
      description: 'Close Window',
      category: 'Window Management',
      action: () => {
        this.logger.info('Close window shortcut triggered', { component: 'ShortcutManager', action: 'closeWindow' });
      },
      context: 'global',
      priority: 60,
      helpText: 'Close the currently active window'
    });

    this.register({
      id: 'window-minimize',
      key: 'Ctrl+M',
      description: 'Minimize Window',
      category: 'Window Management',
      action: () => {
        this.logger.info('Minimize window shortcut triggered', { component: 'ShortcutManager', action: 'minimizeWindow' });
      },
      context: 'global',
      priority: 60,
      helpText: 'Minimize the currently active window'
    });
  }

  // Setup global event listeners with performance optimizations
  private setupGlobalEventListeners(): void {
    const handleKeyDown = (event: KeyboardEvent) => {
      const context: ShortcutContext = {
        isInputFocused: event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement
      };
      
      const activeApp = this.getActiveApp();
      if (activeApp) context.activeApp = activeApp;
      
      const activeComponent = this.getActiveComponent();
      if (activeComponent) context.activeComponent = activeComponent;
      
      const activeWindow = this.getActiveWindow();
      if (activeWindow) context.activeWindow = activeWindow;

      // Don't handle shortcuts when typing in input fields (except global ones)
      if (context.isInputFocused) {
        const globalShortcuts = this.getShortcutsByContext({ ...context, isInputFocused: false });
        const matchingGlobal = this.findMatchingShortcut(event, globalShortcuts);
        if (matchingGlobal) {
          if (matchingGlobal.preventDefault) {
            event.preventDefault();
          }
          matchingGlobal.action();
          return;
        }
        return;
      }

      // Find matching shortcut using optimized key map
      const eventKey = this.buildKeyString(event);
      const normalizedKey = this.normalizeKey(eventKey);
      const shortcutsForKey = this.keyMap.get(normalizedKey) || [];
      
      const availableShortcuts = shortcutsForKey.filter(shortcut => {
        if (!shortcut.enabled) return false;
        if (shortcut.context === 'global') return true;
        if (shortcut.context === 'app' && shortcut.appId === context.activeApp) return true;
        if (shortcut.context === 'component' && shortcut.appId === context.activeComponent) return true;
        return false;
      });

      const matchingShortcut = availableShortcuts.sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];

      if (matchingShortcut) {
        if (matchingShortcut.preventDefault) {
          event.preventDefault();
        }
        matchingShortcut.action();
      }
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    this.eventListeners.set('keydown', () => {
      globalThis.removeEventListener('keydown', handleKeyDown);
    });
  }

  // Find matching shortcut for a key event (legacy method)
  private findMatchingShortcut(event: KeyboardEvent, shortcuts: ShortcutDefinition[]): ShortcutDefinition | null {
    const eventKey = this.buildKeyString(event);
    
    return shortcuts
      .filter(shortcut => shortcut.enabled)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .find(shortcut => this.normalizeKey(shortcut.key) === this.normalizeKey(eventKey)) || null;
  }

  // Build key string from event
  private buildKeyString(event: KeyboardEvent): string {
    const modifiers: string[] = [];
    
    if (event.ctrlKey || event.metaKey) modifiers.push('Ctrl');
    if (event.altKey) modifiers.push('Alt');
    if (event.shiftKey) modifiers.push('Shift');
    
    const key = event.key.toUpperCase();
    if (modifiers.length > 0) {
      return `${modifiers.join('+')}+${key}`;
    }
    return key;
  }

  // Get currently active app (enhanced)
  private getActiveApp(): string | undefined {
    // This could be enhanced to track active windows
    // For now, return undefined to allow all app shortcuts
    return undefined;
  }

  // Get currently active component (enhanced)
  private getActiveComponent(): string | undefined {
    // This could be enhanced to track active components
    return undefined;
  }

  // Get currently active window (new method)
  private getActiveWindow(): string | undefined {
    // This could be enhanced to track active windows
    return undefined;
  }

  // Cleanup event listeners
  cleanup(): void {
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners.clear();
    this.shortcuts.clear();
    this.keyMap.clear();
    this.conflicts = [];
    this.isInitialized = false;
  }

  // Register app-specific shortcuts
  registerAppShortcuts(appId: string, shortcuts: Omit<ShortcutDefinition, 'context' | 'appId'>[]): void {
    shortcuts.forEach(shortcut => {
      this.register({
        ...shortcut,
        context: 'app',
        appId
      });
    });
  }

  // Register component-specific shortcuts
  registerComponentShortcuts(componentId: string, shortcuts: Omit<ShortcutDefinition, 'context' | 'appId'>[]): void {
    shortcuts.forEach(shortcut => {
      this.register({
        ...shortcut,
        context: 'component',
        appId: componentId
      });
    });
  }

  // Unregister all shortcuts for an app/component
  unregisterAppShortcuts(appId: string): void {
    const shortcutsToRemove = Array.from(this.shortcuts.keys()).filter(id => {
      const shortcut = this.shortcuts.get(id);
      return shortcut && shortcut.appId === appId && !shortcut.isSystem;
    });
    
    shortcutsToRemove.forEach(id => this.unregister(id));
  }

  // Get statistics about shortcuts
  getStats(): {
    total: number;
    byCategory: Record<string, number>;
    byContext: Record<string, number>;
    conflicts: number;
    systemShortcuts: number;
  } {
    const shortcuts = this.getAllShortcuts();
    const byCategory: Record<string, number> = {};
    const byContext: Record<string, number> = {};

    shortcuts.forEach(shortcut => {
      byCategory[shortcut.category] = (byCategory[shortcut.category] || 0) + 1;
      byContext[shortcut.context || 'global'] = (byContext[shortcut.context || 'global'] || 0) + 1;
    });

    return {
      total: shortcuts.length,
      byCategory,
      byContext,
      conflicts: this.conflicts.length,
      systemShortcuts: shortcuts.filter(s => s.isSystem).length
    };
  }
}

// Export singleton instance
export const shortcutManager = new ShortcutManager();

// Hook for components to use shortcuts
export const useShortcutManager = () => {
  return {
    register: shortcutManager.register.bind(shortcutManager),
    unregister: shortcutManager.unregister.bind(shortcutManager),
    getAllShortcuts: shortcutManager.getAllShortcuts.bind(shortcutManager),
    getShortcutsByCategory: shortcutManager.getShortcutsByCategory.bind(shortcutManager),
    getShortcutsByKey: shortcutManager.getShortcutsByKey.bind(shortcutManager),
    isKeyRegistered: shortcutManager.isKeyRegistered.bind(shortcutManager),
    getConflicts: shortcutManager.getConflicts.bind(shortcutManager),
    resolveConflict: shortcutManager.resolveConflict.bind(shortcutManager),
    registerAppShortcuts: shortcutManager.registerAppShortcuts.bind(shortcutManager),
    registerComponentShortcuts: shortcutManager.registerComponentShortcuts.bind(shortcutManager),
    unregisterAppShortcuts: shortcutManager.unregisterAppShortcuts.bind(shortcutManager),
    getSearchProvider: shortcutManager.getSearchProvider.bind(shortcutManager),
    getStats: shortcutManager.getStats.bind(shortcutManager)
  };
};