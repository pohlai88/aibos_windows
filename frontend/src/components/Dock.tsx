import { memo, useState, useEffect } from 'react';
import { useUIState } from '../store/uiState.ts';
import { getColorVarValue } from '../utils/themeHelpers.ts';
import { audioManager } from '../utils/audio.ts';
import { hapticManager } from '../utils/haptics.ts';
import { useDeviceInfo } from '../utils/responsive.ts';

interface DockItem {
  name: string;
  icon: string;
  component: string;
  description: string;
  isRunning?: boolean;
}

const dockItems: DockItem[] = [
  { 
    name: 'Notepad', 
    icon: '📝', 
    component: 'notepad',
    description: 'Take notes and edit text files'
  },
  { 
    name: 'Program Files', 
    icon: '📁', 
    component: 'files',
    description: 'Browse and manage installed programs'
  },
  { 
    name: 'Calculator', 
    icon: '🧮', 
    component: 'calculator',
    description: 'Perform calculations and conversions'
  },
  { 
    name: 'Clock', 
    icon: '🕐', 
    component: 'clock',
    description: 'Check time, weather, and timers'
  },
  { 
    name: 'Themes', 
    icon: '🎨', 
    component: 'themes',
    description: 'Customize your desktop appearance'
  },
];

export const Dock = memo(() => {
  const { openWindow, openWindows, bringWindowToFront, colorMode } = useUIState();
  const deviceInfo = useDeviceInfo();
  const { isMobile, isTablet } = deviceInfo;
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: DockItem } | null>(null);
  
  // Accessibility: Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  // Auto-hide dock after inactivity with performance optimization
  useEffect(() => {
    // Disable auto-hide on mobile for better UX
    if (isMobile) {
      setIsVisible(true);
      return;
    }

    const handleActivity = () => {
      setLastActivity(Date.now());
      setIsVisible(true);
    };

    const checkInactivity = () => {
      const now = Date.now();
      const inactiveTime = now - lastActivity;
      if (inactiveTime > 3000) { // Hide after 3 seconds of inactivity
        setIsVisible(false);
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, handleActivity));
    
    // Optimized interval - check every 3 seconds since threshold is 3s
    const interval = setInterval(checkInactivity, 3000);
    
    return () => {
      events.forEach(event => document.removeEventListener(event, handleActivity));
      clearInterval(interval);
    };
  }, [lastActivity, isMobile]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Check if apps are running
  const getRunningApps = () => {
    return openWindows.map((win: { component: string }) => win.component);
  };

  const runningApps = getRunningApps();

  const handleItemClick = (item: DockItem) => {
    setLastActivity(Date.now());
    setIsVisible(true);
    
    // Check if app is already running
    const isRunning = runningApps.includes(item.component);
    
    if (isRunning) {
      // Bring existing window to front
      bringWindowToFront(item.component);
    } else {
      // Launch new instance
      openWindow(item.component);
    }

    // Play feedback
    audioManager.playDockClick();
    hapticManager.playDockClick();
  };

  const handleContextMenu = (event: React.MouseEvent, item: DockItem) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, item });
  };

  const handleContextMenuAction = (action: string, item: DockItem) => {
    setContextMenu(null);
    
    switch (action) {
      case 'open':
        handleItemClick(item);
        break;
      case 'close':
        // TODO: Implement close all windows of this app
        console.log('Close all windows of:', item.name);
        break;
      case 'info':
        // TODO: Show app info dialog
        console.log('Show info for:', item.name);
        break;
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, item: DockItem) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleItemClick(item);
    }
  };

  // Remove the global keyboard shortcuts since they're now handled by shortcutManager
  // useEffect(() => {
  //   const handleGlobalKeyDown = (event: KeyboardEvent) => {
  //     // Only trigger if not typing in an input field
  //     if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
  //       return;
  //     }

  //     const shortcuts: Record<string, string> = {
  //       'n': 'notepad',
  //       'f': 'files', 
  //       'c': 'calculator',
  //       't': 'clock',
  //       'h': 'themes'
  //     };

  //     const component = shortcuts[event.key.toLowerCase()];
  //     if (component && !event.ctrlKey && !event.altKey && !event.metaKey) {
  //       event.preventDefault();
  //       const item = dockItems.find(dockItem => dockItem.component === component);
  //       if (item) {
  //         handleItemClick(item);
  //       }
  //     }
  //   };

  //   document.addEventListener('keydown', handleGlobalKeyDown);
  //   return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  // }, [runningApps]);

  return (
    <div 
      className={`fixed z-30 transition-all duration-500 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      } ${
        // Responsive positioning
        isMobile 
          ? 'bottom-2 left-2 right-2' 
          : isTablet 
            ? 'bottom-3 left-1/2 transform -translate-x-1/2' 
            : 'bottom-4 left-1/2 transform -translate-x-1/2'
      }`}
      onMouseEnter={() => !isMobile && setIsVisible(true)}
      onMouseLeave={() => !isMobile && setLastActivity(Date.now())}
    >
      {/* Dock background with enhanced glass effect */}
      <div 
        style={{
          backgroundColor: getColorVarValue('glass.light.20', colorMode),
          backdropFilter: 'blur(40px)',
          border: `1px solid ${getColorVarValue('glass.light.30', colorMode)}`,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        }}
        className={`rounded-2xl ${
          isMobile 
            ? 'px-3 py-2' 
            : isTablet 
              ? 'px-4 py-2' 
              : 'px-6 py-3'
        }`}
      >
        <div className={`flex ${
          isMobile 
            ? 'justify-between space-x-1' 
            : 'justify-center space-x-2'
        }`}>
          {dockItems.map((item) => {
            const isRunning = runningApps.includes(item.component);
            const isHovered = hoveredItem === item.name;
            
            return (
              <div key={item.name} className="relative">
                {/* Tooltip - hide on mobile */}
                {isHovered && !isMobile && (
                  <div 
                    style={{
                      backgroundColor: getColorVarValue('glass.dark.80', colorMode),
                      backdropFilter: 'blur(8px)',
                      border: `1px solid ${getColorVarValue('glass.dark.60', colorMode)}`,
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    }}
                    className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 text-white text-sm rounded-lg whitespace-nowrap z-50"
                  >
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs opacity-75">{item.description}</div>
                    {isRunning && (
                      <div className="text-xs text-green-400 mt-1">● Running</div>
                    )}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                )}
                
                {/* Dock item button */}
                <button
                  type="button"
                  style={{
                    backgroundColor: isHovered ? getColorVarValue('glass.light.30', colorMode) : getColorVarValue('glass.light.10', colorMode),
                    backdropFilter: 'blur(4px)',
                    border: `1px solid ${isHovered ? getColorVarValue('glass.light.40', colorMode) : getColorVarValue('glass.light.20', colorMode)}`,
                    boxShadow: isHovered ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    transform: isHovered && !prefersReducedMotion && !isMobile ? 'scale(1.25)' : 'scale(1)',
                    transition: prefersReducedMotion ? 'none' : 'all 0.3s ease-in-out',
                  }}
                  className={`relative flex items-center justify-center rounded-xl group ${
                    isRunning ? 'ring-2 ring-blue-500/50' : ''
                  } ${
                    isMobile 
                      ? 'w-12 h-12 text-xl' 
                      : isTablet 
                        ? 'w-13 h-13 text-2xl' 
                        : 'w-14 h-14 text-2xl'
                  }`}
                  onClick={() => handleItemClick(item)}
                  onContextMenu={(event) => handleContextMenu(event, item)}
                  onMouseEnter={() => {
                    if (!isMobile) {
                      setHoveredItem(item.name);
                      audioManager.playDockHover();
                      hapticManager.playDockHover();
                    }
                  }}
                  onMouseLeave={() => !isMobile && setHoveredItem(null)}
                  onKeyDown={(event) => handleKeyDown(event, item)}
                  tabIndex={0}
                  title={isMobile ? item.name : undefined}
                  aria-label={`Launch ${item.name}`}
                >
                  {/* Icon with enhanced styling */}
                  <span className={`${prefersReducedMotion ? '' : 'transition-all duration-300'} ${
                    isHovered && !prefersReducedMotion && !isMobile ? 'scale-110' : 'scale-100'
                  }`}>
                    {item.icon}
                  </span>
                  
                  {/* Running indicator */}
                  {isRunning && (
                    <div className={`absolute -bottom-1 -right-1 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse ${
                      isMobile ? 'w-2 h-2' : 'w-3 h-3'
                    }`}></div>
                  )}
                  
                  {/* Hover glow effect - hide on mobile */}
                  {isHovered && !isMobile && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl blur-sm"></div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Dock separator line - hide on mobile */}
      {!isMobile && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mt-2"></div>
      )}
      
      {/* Context Menu */}
      {contextMenu && (
        <div 
          style={{
            backgroundColor: getColorVarValue('glass.light.80', colorMode),
            backdropFilter: 'blur(8px)',
            border: `1px solid ${getColorVarValue('glass.light.60', colorMode)}`,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            left: contextMenu.x, 
            top: contextMenu.y,
            transform: 'translate(-50%, -100%)'
          }}
          className="fixed z-50 rounded-lg py-1 min-w-48"
          role="menu"
          aria-label="Dock context menu"
        >
          <button
            type="button"
            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
            onClick={() => handleContextMenuAction('open', contextMenu.item)}
            role="menuitem"
            aria-label={`Open ${contextMenu.item.name}`}
          >
            <span>🚀</span>
            <span>Open {contextMenu.item.name}</span>
          </button>
          
          {runningApps.includes(contextMenu.item.component) && (
            <button
              type="button"
              className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
              onClick={() => handleContextMenuAction('close', contextMenu.item)}
              role="menuitem"
              aria-label={`Close ${contextMenu.item.name}`}
            >
              <span>❌</span>
              <span>Close {contextMenu.item.name}</span>
            </button>
          )}
          
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" role="separator"></div>
          
          <button
            type="button"
            className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
            onClick={() => handleContextMenuAction('info', contextMenu.item)}
            role="menuitem"
            aria-label={`About ${contextMenu.item.name}`}
          >
            <span>ℹ️</span>
            <span>About {contextMenu.item.name}</span>
          </button>
        </div>
      )}
    </div>
  );
});

Dock.displayName = 'Dock';