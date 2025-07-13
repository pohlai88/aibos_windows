import { memo, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useUIState } from '../store/uiState.ts';
import { appRegistry } from '../services/appRegistry.ts';
import { systemCommands } from '../services/systemCommands.ts';
import { useShortcutManager } from '../services/shortcutManager.ts';
import { getColor, getGradient } from '../utils/themeHelpers.ts';

import { animation } from '../utils/designTokens.ts';
import { audioManager } from '../utils/audio.ts';
import { hapticManager } from '../utils/haptics.ts';
import { useDeviceInfo } from '../utils/responsive.ts';

interface MenuItem {
  id: string;
  name: string;
  icon: string;
  description?: string;
  type: 'app' | 'command' | 'shortcut';
  category: string;
  action: () => void;
  shortcut?: string;
}

export const StartMenu = memo(() => {
  const { startMenuVisible, toggleStartMenu, openWindow, colorMode } = useUIState();
  const deviceInfo = useDeviceInfo();
  const { isMobile, isTablet } = deviceInfo;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { getAllShortcuts } = useShortcutManager();

  // Performance: Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => 
    typeof window !== 'undefined' && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches, 
    []
  );

  // Performance: Memoized theme-aware styles
  const themeStyles = useMemo(() => ({
    overlay: {
      backgroundColor: getColor('glass.dark.20', colorMode),
      backdropFilter: `blur(8px)`,
    },
    container: {
      backgroundColor: getColor('glass.light.90', colorMode),
      backdropFilter: `blur(16px)`,
      border: `1px solid ${getColor('glass.light.60', colorMode)}`,
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    },
    header: {
      background: getGradient('professional.slate', colorMode),
      backdropFilter: `blur(8px)`,
      borderBottom: `1px solid ${getColor('glass.light.40', colorMode)}`,
    },
    input: {
      backgroundColor: getColor('glass.light.80', colorMode),
      backdropFilter: `blur(4px)`,
      border: `1px solid ${getColor('glass.light.50', colorMode)}`,
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    },
    categoryTab: (isActive: boolean) => ({
      backgroundColor: isActive 
        ? getColor('primary.500', colorMode) 
        : getColor('white', colorMode),
      color: isActive 
        ? getColor('white', colorMode) 
        : getColor('gray.700', colorMode),
      transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
    }),
    menuItem: (isSelected: boolean) => ({
      backgroundColor: isSelected 
        ? getColor('primary.100', colorMode) 
        : 'transparent',
      border: isSelected 
        ? `1px solid ${getColor('primary.300', colorMode)}` 
        : '1px solid transparent',
      transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
    }),
    footer: {
      backgroundColor: getColor('gray.50', colorMode),
      borderTop: `1px solid ${getColor('gray.200', colorMode)}`,
    },
    transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
  }), [colorMode, prefersReducedMotion]);

  // Get all menu items with memoization
  const allMenuItems = useMemo((): MenuItem[] => {
    const items: MenuItem[] = [];

    // Add apps from registry
    const apps = appRegistry.getAll();
    apps.forEach(app => {
      items.push({
        id: `app-${app.id}`,
        name: app.title,
        icon: app.icon,
        description: app.description,
        type: 'app',
        category: app.category,
        action: () => {
          openWindow(app.id);
          toggleStartMenu();
          audioManager.playMenuOpen();
          hapticManager.playMenuOpen();
        }
      });
    });

    // Add system commands
    const commands = systemCommands.getAll();
    commands.forEach(cmd => {
      const menuItem: MenuItem = {
        id: `cmd-${cmd.id}`,
        name: cmd.title,
        icon: cmd.icon || '⚙️',
        description: cmd.description,
        type: 'command',
        category: cmd.category,
        action: () => {
          cmd.action();
          toggleStartMenu();
          audioManager.playButtonClick();
          hapticManager.playButtonPress();
        }
      };
      
      if (cmd.shortcut) {
        menuItem.shortcut = cmd.shortcut;
      }
      
      items.push(menuItem);
    });

    // Add keyboard shortcuts
    const shortcuts = getAllShortcuts();
    shortcuts.forEach(shortcut => {
      items.push({
        id: `shortcut-${shortcut.id}`,
        name: shortcut.description,
        icon: shortcut.icon || '⌨️',
        description: `Shortcut: ${shortcut.key}`,
        type: 'shortcut',
        category: `Shortcuts - ${shortcut.category}`,
        action: () => {
          shortcut.action();
          toggleStartMenu();
          audioManager.playButtonClick();
          hapticManager.playButtonPress();
        },
        shortcut: shortcut.key
      });
    });

    return items;
  }, [openWindow, toggleStartMenu, getAllShortcuts]);

  // Filter and sort menu items with memoization
  const filteredItems = useMemo((): MenuItem[] => {
    let items = allMenuItems;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (activeCategory !== 'all') {
      items = items.filter(item => item.category === activeCategory);
    }

    // Sort by relevance and type
    return items.sort((a, b) => {
      // Apps first, then commands, then shortcuts
      const typeOrder = { app: 0, command: 1, shortcut: 2 };
      const typeDiff = typeOrder[a.type] - typeOrder[b.type];
      if (typeDiff !== 0) return typeDiff;

      // Then alphabetically by name
      return a.name.localeCompare(b.name);
    });
  }, [allMenuItems, searchQuery, activeCategory]);

  // Get unique categories with memoization
  const categories = useMemo((): string[] => {
    const cats = [...new Set(allMenuItems.map(item => item.category))];
    return ['all', ...cats.sort()];
  }, [allMenuItems]);

  // Focus management with performance optimization
  useEffect(() => {
    if (startMenuVisible) {
      setSearchQuery('');
      setSelectedIndex(0);
      setActiveCategory('all');
      
      // Performance: Use requestAnimationFrame instead of setTimeout
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [startMenuVisible]);

  // Keyboard navigation with accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = filteredItems;
    
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        toggleStartMenu();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < items.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : items.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (items[selectedIndex]) {
          items[selectedIndex].action();
        }
        break;
      case 'Tab':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < items.length - 1 ? prev + 1 : 0
        );
        break;
    }
  }, [filteredItems, selectedIndex, toggleStartMenu]);

  // Handle item click
  const handleItemClick = useCallback((item: MenuItem) => {
    item.action();
    audioManager.playButtonClick();
    hapticManager.playButtonPress();
  }, []);

  // Handle category selection
  const handleCategoryClick = useCallback((category: string) => {
    setActiveCategory(category);
    setSelectedIndex(0);
    audioManager.playButtonClick();
    hapticManager.playButtonPress();
  }, []);

  // Focus trap for accessibility
  useEffect(() => {
    if (!startMenuVisible) return;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && containerRef.current) {
        const focusableElements = containerRef.current.querySelectorAll(
          'button, input, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [startMenuVisible]);

  if (!startMenuVisible) return null;

  const menuItems = filteredItems;
  const categoryList = categories;

  return (
    <div 
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Start Menu"
      style={themeStyles.overlay}
      className={`fixed inset-0 z-50 flex items-end justify-start ${
        isMobile 
          ? 'p-2' 
          : isTablet 
            ? 'p-4' 
            : 'p-4'
      }`}
    >
      <div 
        style={{
          ...themeStyles.container,
          transition: themeStyles.transition,
        }}
        className={`rounded-xl w-full overflow-hidden ${
          isMobile 
            ? 'max-w-full max-h-[90vh]' 
            : isTablet 
              ? 'max-w-lg max-h-[80vh]' 
              : 'max-w-md max-h-[80vh]'
        }`}
      >
        {/* Header */}
        <div 
          style={themeStyles.header}
          className={`${isMobile ? 'p-3' : 'p-4'}`}
        >
          <div className="flex items-center space-x-3">
            <span className={`${isMobile ? 'text-xl' : 'text-2xl'}`} aria-hidden="true">🏠</span>
            <div className="flex-1">
              <input
                ref={searchInputRef}
                type="text"
                placeholder={isMobile ? "Search..." : "Search applications and commands..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                style={themeStyles.input}
                className={`w-full px-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isMobile 
                    ? 'py-2 text-sm' 
                    : 'py-2 text-base'
                }`}
                aria-label="Search start menu"
                aria-describedby="menu-items"
              />
            </div>
            <button
              type="button"
              onClick={toggleStartMenu}
              className={`text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
                isMobile ? 'p-1' : 'p-2'
              }`}
              aria-label="Close start menu"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Category Tabs - hide on mobile */}
        {!isMobile && (
          <div 
            style={{
              backgroundColor: getColor('gray.50', colorMode),
              borderBottom: `1px solid ${getColor('gray.200', colorMode)}`,
            }}
            className="p-4"
            role="tablist"
            aria-label="Menu categories"
          >
            <div className="flex flex-wrap gap-2">
              {categoryList.map((category) => (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === category}
                  aria-controls="menu-items"
                  onClick={() => handleCategoryClick(category)}
                  style={themeStyles.categoryTab(activeCategory === category)}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg"
                >
                  {category === 'all' ? 'All' : category}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Menu Items */}
        <div 
          id="menu-items"
          role="listbox"
          aria-label="Menu items"
          className={`overflow-y-auto ${
            isMobile 
              ? 'max-h-64' 
              : isTablet 
                ? 'max-h-80' 
                : 'max-h-96'
          }`}
        >
          {menuItems.length > 0 ? (
            <div className={`${isMobile ? 'p-1' : 'p-2'}`}>
              {menuItems.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={index === selectedIndex}
                  style={{
                    ...themeStyles.menuItem(index === selectedIndex),
                  }}
                  className={`w-full text-left rounded-lg flex items-center space-x-3 ${
                    isMobile 
                      ? 'p-2' 
                      : 'p-3'
                  }`}
                  onClick={() => handleItemClick(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className={`${isMobile ? 'text-xl' : 'text-2xl'} flex-shrink-0`} aria-hidden="true">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium text-gray-900 dark:text-gray-100 truncate ${
                      isMobile ? 'text-sm' : 'text-base'
                    }`}>
                      {item.name}
                    </div>
                    {item.description && !isMobile && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {item.description}
                      </div>
                    )}
                    {!isMobile && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {item.category}
                      </div>
                    )}
                  </div>
                  {!isMobile && (
                    <div className="flex-shrink-0 flex items-center space-x-2">
                      {item.shortcut && (
                        <span 
                          style={{
                            backgroundColor: getColor('gray.100', colorMode),
                            color: getColor('gray.600', colorMode),
                          }}
                          className="px-2 py-1 text-xs rounded font-mono"
                        >
                          {item.shortcut}
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        item.type === 'app' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        item.type === 'command' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      }`}>
                        {item.type}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : searchQuery.trim() ? (
            <div className={`text-center ${isMobile ? 'p-6' : 'p-8'}`}>
              <span className={`${isMobile ? 'text-3xl' : 'text-4xl'} mb-4 block`} aria-hidden="true">🔍</span>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                No results found for "{searchQuery}"
              </p>
              {!isMobile && (
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Try different keywords or check your spelling
                </p>
              )}
            </div>
          ) : (
            <div className={`${isMobile ? 'p-4' : 'p-6'}`}>
              <div className={`font-medium text-gray-700 dark:text-gray-300 mb-4 ${
                isMobile ? 'text-sm' : 'text-sm'
              }`}>
                Quick Access
              </div>
              <div className="grid grid-cols-1 gap-2">
                {allMenuItems.slice(0, isMobile ? 4 : 6).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center space-x-3 ${
                      isMobile ? 'p-2' : 'p-3'
                    }`}
                    onClick={() => handleItemClick(item)}
                  >
                    <span className={`${isMobile ? 'text-lg' : 'text-xl'}`} aria-hidden="true">{item.icon}</span>
                    <div className="min-w-0">
                      <div className={`font-medium text-gray-900 dark:text-gray-100 truncate ${
                        isMobile ? 'text-sm' : 'text-sm'
                      }`}>
                        {item.name}
                      </div>
                      {item.category && !isMobile && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {item.category}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer - hide on mobile */}
        {!isMobile && (
          <div 
            style={themeStyles.footer}
            className="p-4"
          >
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-4">
                <span>↑↓ Navigate</span>
                <span>Enter Select</span>
                <span>Esc Close</span>
              </div>
              <div>
                {menuItems.length > 0 && (
                  <span>{menuItems.length} item{menuItems.length !== 1 ? 's' : ''}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

StartMenu.displayName = 'StartMenu';
