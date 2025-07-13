import { create } from 'https://esm.sh/zustand@4.4.7';
import { getThemeOrder, type ThemeVariant } from '../utils/themeManager.ts';
import type { ThemeMode } from '../utils/themeHelpers.ts';

interface WindowState {
  id: string;
  component: string;
  props?: Record<string, unknown>;
  zIndex: number;
  minimized?: boolean;
  maximized?: boolean;
  focused?: boolean;
  // Window Groups & Tabs
  groupId?: string;
  tabId?: string;
  isTab?: boolean;
  parentWindowId?: string;
}

interface WindowGroup {
  id: string;
  name: string;
  windowIds: string[];
  activeWindowId?: string;
  isCollapsed?: boolean;
  order?: number;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: number;
}

interface UIState {
  // Window management
  openWindows: WindowState[];
  focusedWindowId: string | null;
  // Window Groups & Tabs
  windowGroups: Record<string, WindowGroup>;
  activeGroupId: string | null;
  // UI overlays
  spotlightVisible: boolean;
  startMenuVisible: boolean;
  userMenuVisible: boolean;
  shortcutHelpVisible: boolean;
  // Theme & accessibility
  theme: ThemeVariant;
  colorMode: ThemeMode;
  highContrastMode: boolean;
  // Spotlight/search
  lastSpotlightQuery?: string;
  lastSpotlightResults?: unknown[];
  // Notifications
  notifications: Notification[];
  // --- Actions ---
  // Window actions
  openWindow: (component: string, props?: Record<string, unknown>) => void;
  closeWindow: (id: string) => void;
  bringToFront: (id: string) => void;
  bringWindowToFront: (component: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  closeAllWindows: () => void;
  focusWindow: (id: string) => void;
  // Window Groups & Tabs actions
  createWindowGroup: (name: string, windowIds?: string[]) => string;
  addWindowToGroup: (windowId: string, groupId: string) => void;
  removeWindowFromGroup: (windowId: string) => void;
  setActiveGroup: (groupId: string) => void;
  setActiveWindowInGroup: (groupId: string, windowId: string) => void;
  collapseGroup: (groupId: string) => void;
  expandGroup: (groupId: string) => void;
  closeGroup: (groupId: string) => void;
  // Overlay actions
  toggleStartMenu: () => void;
  openStartMenu: () => void;
  closeStartMenu: () => void;
  toggleSpotlight: () => void;
  openSpotlight: () => void;
  closeSpotlight: () => void;
  toggleUserMenu: () => void;
  openUserMenu: () => void;
  closeUserMenu: () => void;
  toggleShortcutHelp: () => void;
  openShortcutHelp: () => void;
  closeShortcutHelp: () => void;
  // Theme & accessibility
  setTheme: (theme: ThemeVariant) => void;
  setColorMode: (mode: ThemeMode) => void;
  cycleTheme: () => void;
  toggleHighContrast: () => void;
  // Spotlight/search
  setLastSpotlightQuery: (query: string) => void;
  setLastSpotlightResults: (results: unknown[]) => void;
  // Notifications
  addNotification: (type: Notification['type'], message: string) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  // Navigation
  navigateHome: () => void;
}

export type { WindowState, WindowGroup };

export const useUIState = create<UIState>((set, get) => {
  // --- Theme ---
  const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('aibos-theme') as ThemeVariant : 'nebula';
  const initialTheme = savedTheme || 'nebula';
  const themeOrder: ThemeVariant[] = getThemeOrder();

  return {
    // --- State ---
    openWindows: [],
    focusedWindowId: null,
    windowGroups: {},
    activeGroupId: null,
    spotlightVisible: false,
    startMenuVisible: false,
    userMenuVisible: false,
    shortcutHelpVisible: false,
    theme: initialTheme,
    colorMode: 'light',
    highContrastMode: false,
    lastSpotlightQuery: '',
    lastSpotlightResults: [],
    notifications: [],

    // --- Window Actions ---
    openWindow: (component: string, props?: Record<string, unknown>) => set((state: UIState) => {
      const maxZIndex = Math.max(...state.openWindows.map((win: WindowState) => win.zIndex), 0);
      const newId = `${component}-${Date.now()}`;
      const newWindow: WindowState = {
        id: newId,
        component,
        zIndex: maxZIndex + 1,
        minimized: false,
        maximized: false,
        focused: true,
      };
      
      // Only add props if provided
      if (props) {
        newWindow.props = props;
      }
      
      // Unfocus all others
      const openWindows = state.openWindows.map((win: WindowState) => ({ ...win, focused: false }));
      return {
        openWindows: [...openWindows, newWindow],
        focusedWindowId: newId,
      };
    }),
    closeWindow: (id: string) => set((state: UIState) => {
      const openWindows = state.openWindows.filter((win: WindowState) => win.id !== id);
      let focusedWindowId = state.focusedWindowId;
      if (focusedWindowId === id) {
        focusedWindowId = openWindows.length > 0 ? openWindows[openWindows.length - 1]?.id || null : null;
      }
      
      const result: Partial<UIState> = { openWindows };
      if (focusedWindowId !== null) {
        result.focusedWindowId = focusedWindowId;
      }
      return result;
    }),
    bringToFront: (id: string) => set((state: UIState) => {
      const maxZIndex = Math.max(...state.openWindows.map((win: WindowState) => win.zIndex), 0);
      return {
        openWindows: state.openWindows.map((win: WindowState) =>
          win.id === id ? { ...win, zIndex: maxZIndex + 1, focused: true } : { ...win, focused: false }
        ),
        focusedWindowId: id,
      };
    }),
    bringWindowToFront: (component: string) => set((state: UIState) => {
      const maxZIndex = Math.max(...state.openWindows.map((win: WindowState) => win.zIndex), 0);
      let focusedId: string | null = state.focusedWindowId;
      const openWindows = state.openWindows.map((win: WindowState) => {
        if (win.component === component) {
          focusedId = win.id;
          return { ...win, zIndex: maxZIndex + 1, focused: true };
        }
        return { ...win, focused: false };
      });
      
      const result: Partial<UIState> = { openWindows };
      if (focusedId !== null) {
        result.focusedWindowId = focusedId;
      }
      return result;
    }),
    minimizeWindow: (id: string) => set((state: UIState) => {
      const result: Partial<UIState> = {
        openWindows: state.openWindows.map((win: WindowState) =>
          win.id === id ? { ...win, minimized: true, maximized: false, focused: false } : win
        ),
      };
      
      if (state.focusedWindowId === id) {
        // Don't assign null, just omit the property
      } else if (state.focusedWindowId !== null) {
        result.focusedWindowId = state.focusedWindowId;
      }
      
      return result;
    }),
    maximizeWindow: (id: string) => set((state: UIState) => ({
      openWindows: state.openWindows.map((win: WindowState) =>
        win.id === id ? { ...win, maximized: true, minimized: false, focused: true } : { ...win, focused: false }
      ),
      focusedWindowId: id,
    })),
    restoreWindow: (id: string) => set((state: UIState) => ({
      openWindows: state.openWindows.map((win: WindowState) =>
        win.id === id ? { ...win, minimized: false, maximized: false, focused: true } : { ...win, focused: false }
      ),
      focusedWindowId: id,
    })),
    closeAllWindows: () => set(() => ({ openWindows: [] })),
    focusWindow: (id: string) => set((state: UIState) => ({
      openWindows: state.openWindows.map((win: WindowState) =>
        win.id === id ? { ...win, focused: true } : { ...win, focused: false }
      ),
      focusedWindowId: id,
    })),

    // --- Overlay Actions ---
    toggleStartMenu: () => set((state: UIState) => ({ startMenuVisible: !state.startMenuVisible })),
    openStartMenu: () => set({ startMenuVisible: true }),
    closeStartMenu: () => set({ startMenuVisible: false }),
    toggleSpotlight: () => set((state: UIState) => ({ spotlightVisible: !state.spotlightVisible })),
    openSpotlight: () => set({ spotlightVisible: true }),
    closeSpotlight: () => set({ spotlightVisible: false }),
    toggleUserMenu: () => set((state: UIState) => ({ userMenuVisible: !state.userMenuVisible })),
    openUserMenu: () => set({ userMenuVisible: true }),
    closeUserMenu: () => set({ userMenuVisible: false }),
    toggleShortcutHelp: () => set((state: UIState) => ({ shortcutHelpVisible: !state.shortcutHelpVisible })),
    openShortcutHelp: () => set({ shortcutHelpVisible: true }),
    closeShortcutHelp: () => set({ shortcutHelpVisible: false }),

    // --- Theme & Accessibility ---
    setTheme: (theme: ThemeVariant) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('aibos-theme', theme);
      }
      set({ theme });
    },
    setColorMode: (colorMode: ThemeMode) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('aibos-color-mode', colorMode);
      }
      set({ colorMode });
    },
    cycleTheme: () => set((state: UIState) => {
      const currentIndex = themeOrder.indexOf(state.theme);
      const nextIndex = (currentIndex + 1) % themeOrder.length;
      const newTheme = themeOrder[nextIndex];
      if (typeof window !== 'undefined' && newTheme) {
        localStorage.setItem('aibos-theme', newTheme);
      }
      return { theme: newTheme || 'nebula' };
    }),
    toggleHighContrast: () => set((state: UIState) => ({ highContrastMode: !state.highContrastMode })),

    // --- Spotlight/Search ---
    setLastSpotlightQuery: (query: string) => set({ lastSpotlightQuery: query }),
    setLastSpotlightResults: (results: unknown[]) => set({ lastSpotlightResults: results }),

    // --- Notifications ---
    addNotification: (type: Notification['type'], message: string) => set((state: UIState) => {
      const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const notification: Notification = {
        id,
        type,
        message,
        timestamp: Date.now(),
      };
      return { notifications: [...state.notifications, notification] };
    }),
    removeNotification: (id: string) => set((state: UIState) => ({
      notifications: state.notifications.filter((n: Notification) => n.id !== id)
    })),
    clearNotifications: () => set({ notifications: [] }),

    // --- Window Groups & Tabs Actions ---
    createWindowGroup: (name: string, windowIds: string[] = []) => {
      const groupId = `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const group: WindowGroup = {
        id: groupId,
        name,
        windowIds,
        isCollapsed: false,
        order: Object.keys(get().windowGroups).length,
      };
      
      // Only add activeWindowId if there are windows
      if (windowIds.length > 0) {
        const firstWindowId = windowIds[0];
        if (firstWindowId) {
          group.activeWindowId = firstWindowId;
        }
      }
      
      set((state: UIState) => ({
        windowGroups: { ...state.windowGroups, [groupId]: group },
        activeGroupId: groupId,
      }));
      return groupId;
    },
    addWindowToGroup: (windowId: string, groupId: string) => set((state: UIState) => {
      const group = state.windowGroups[groupId];
      if (!group) return {};
      
      const updatedGroup: WindowGroup = {
        ...group,
        windowIds: [...group.windowIds, windowId],
        activeWindowId: windowId,
      };
      
      return {
        windowGroups: { ...state.windowGroups, [groupId]: updatedGroup },
        openWindows: state.openWindows.map((win: WindowState) =>
          win.id === windowId ? { ...win, groupId } : win
        ),
      };
    }),
    removeWindowFromGroup: (windowId: string) => set((state: UIState) => {
      const updatedGroups = { ...state.windowGroups };
      let updatedWindows = state.openWindows;
      
      // Find and remove window from its group
      Object.keys(updatedGroups).forEach(groupId => {
        const group = updatedGroups[groupId];
        if (group && group.windowIds.includes(windowId)) {
          const newWindowIds = group.windowIds.filter((id: string) => id !== windowId);
          if (newWindowIds.length === 0) {
            delete updatedGroups[groupId];
          } else {
            const updatedGroup: WindowGroup = {
              ...group,
              windowIds: newWindowIds,
            };
            
            if (group.activeWindowId === windowId) {
              const firstWindowId = newWindowIds[0];
              if (firstWindowId) {
                updatedGroup.activeWindowId = firstWindowId;
              }
            } else if (group.activeWindowId !== undefined) {
              updatedGroup.activeWindowId = group.activeWindowId;
            }
            
            updatedGroups[groupId] = updatedGroup;
          }
          updatedWindows = updatedWindows.map((win: WindowState) => {
            if (win.id === windowId) {
              const { groupId: _, ...rest } = win;
              return rest;
            }
            return win;
          });
        }
      });
      
      return { windowGroups: updatedGroups, openWindows: updatedWindows };
    }),
    setActiveGroup: (groupId: string) => set({ activeGroupId: groupId }),
    setActiveWindowInGroup: (groupId: string, windowId: string) => set((state: UIState) => {
      const group = state.windowGroups[groupId];
      if (!group || !group.windowIds.includes(windowId)) return {};
      
      const updatedGroup: WindowGroup = {
        ...group,
        activeWindowId: windowId,
      };
      
      return {
        windowGroups: {
          ...state.windowGroups,
          [groupId]: updatedGroup
        },
        openWindows: state.openWindows.map((win: WindowState) =>
          win.id === windowId ? { ...win, focused: true } : { ...win, focused: false }
        ),
        focusedWindowId: windowId,
      };
    }),
    collapseGroup: (groupId: string) => set((state: UIState) => {
      const group = state.windowGroups[groupId];
      if (!group) return {};
      
      const updatedGroup: WindowGroup = {
        ...group,
        isCollapsed: true
      };
      
      return {
        windowGroups: {
          ...state.windowGroups,
          [groupId]: updatedGroup
        },
        openWindows: state.openWindows.map((win: WindowState) =>
          group.windowIds.includes(win.id) ? { ...win, minimized: true } : win
        ),
      };
    }),
    expandGroup: (groupId: string) => set((state: UIState) => {
      const group = state.windowGroups[groupId];
      if (!group) return {};
      
      const updatedGroup: WindowGroup = {
        ...group,
        isCollapsed: false
      };
      
      return {
        windowGroups: {
          ...state.windowGroups,
          [groupId]: updatedGroup
        },
        openWindows: state.openWindows.map((win: WindowState) =>
          group.windowIds.includes(win.id) ? { ...win, minimized: false } : win
        ),
      };
    }),
    closeGroup: (groupId: string) => set((state: UIState) => {
      const group = state.windowGroups[groupId];
      if (!group) return {};
      
      const updatedGroups = { ...state.windowGroups };
      delete updatedGroups[groupId];
      
      const result: Partial<UIState> = {
        windowGroups: updatedGroups,
        openWindows: state.openWindows.filter((win: WindowState) => !group.windowIds.includes(win.id)),
      };
      
      if (state.focusedWindowId && group.windowIds.includes(state.focusedWindowId)) {
        // Don't assign null, just omit the property
      } else if (state.focusedWindowId !== null) {
        result.focusedWindowId = state.focusedWindowId;
      }
      
      return result;
    }),

    // --- Navigation ---
    navigateHome: () => {
      // Example: close all windows, reset overlays
      set({
        openWindows: [],
        startMenuVisible: false,
        userMenuVisible: false,
        shortcutHelpVisible: false,
        spotlightVisible: false,
      });
      // Add more logic as needed
    },
  };
}); 