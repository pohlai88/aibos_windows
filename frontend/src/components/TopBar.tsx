/** @jsxImportSource react */
import React, { memo, useState, useEffect, useMemo, useCallback } from 'react';
import { Clock } from './Clock.tsx';
import { useUIState } from '../store/uiState.ts';
import { Tooltip } from './Tooltip.tsx';
import { getColor, getGradient, applyThemeWithCSS } from '../utils/themeHelpers.ts';
import { animation } from '../utils/designTokens.ts';
import { NotificationCenter as _NotificationCenter } from './NotificationCenter.tsx';
// Replace the legacy import
// import { notificationManager } from '../services/notificationManager.ts';

// Add this import instead
import { notificationService } from '../services/notification-service.ts';
import { SystemTray } from './SystemTray.tsx';

const LOGO_TEXT = 'AI-BOS';
const TOPBAR_HEIGHT = 'h-16';
const TOPBAR_Z_INDEX = 'z-50';

interface SystemStatus {
  cpu: number;
  memory: number;
  network: 'online' | 'slow' | 'offline';
  battery: number;
  notifications: number;
}

const Logo: React.FC = memo(() => {
  const { navigateHome } = useUIState();

  // Performance: Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => 
    typeof window !== 'undefined' && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches, 
    []
  );

  const handleHome = useCallback(() => {
    navigateHome();
  }, [navigateHome]);

  return (
    <Tooltip content="AI-BOS Home" shortcut="Ctrl+H">
      <div
        className="text-white text-lg font-bold tracking-widest hover:text-gray-200 cursor-pointer select-none transform hover:scale-105"
        style={{
          transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
        }}
        role="link"
        tabIndex={0}
        aria-label="Go to AI-BOS home screen"
        onClick={handleHome}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleHome();
          }
        }}
      >
        {LOGO_TEXT}
      </div>
    </Tooltip>
  );
});

const ClockWrapper: React.FC = memo(() => {
  const { colorMode } = useUIState();

  // Performance: Memoized theme-aware styles
  const clockStyles = useMemo(() => ({
    backgroundColor: getColor('glass.dark.20', colorMode),
    backdropFilter: `blur(8px)`,
    border: `1px solid ${getColor('glass.dark.30', colorMode)}`,
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
  }), [colorMode]);

  return (
    <div
      style={clockStyles}
      className="text-xs text-gray-200 px-3 py-1 rounded-full"
      role="status"
      aria-live="polite"
      aria-label="Current time and date"
    >
      <Clock />
    </div>
  );
});

const WindowGroupsButton: React.FC<{ onOpen: () => void }> = memo(({ onOpen }) => {
  const { colorMode, windowGroups } = useUIState();

  // Performance: Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => 
    typeof window !== 'undefined' && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches, 
    []
  );

  // Performance: Memoized theme-aware styles
  const buttonStyles = useMemo(() => ({
    background: getGradient('professional.slate', colorMode),
    backdropFilter: `blur(8px)`,
    border: `1px solid ${getColor('glass.light.30', colorMode)}`,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
  }), [colorMode, prefersReducedMotion]);

  const groupCount = Object.keys(windowGroups).length;

  return (
    <Tooltip content="Window Groups & Tabs" shortcut="Ctrl+G" position="bottom">
      <button
        type="button"
        onClick={onOpen}
        style={buttonStyles}
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-medium cursor-pointer hover:shadow-xl transform hover:scale-105 relative"
        aria-label="Window Groups & Tabs"
      >
        📑
        {groupCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {groupCount}
          </span>
        )}
      </button>
    </Tooltip>
  );
});

const GridLayoutButton: React.FC<{ onOpen: () => void }> = memo(({ onOpen }) => {
  const { colorMode } = useUIState();

  // Performance: Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => 
    typeof window !== 'undefined' && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches, 
    []
  );

  // Performance: Memoized theme-aware styles
  const buttonStyles = useMemo(() => ({
    background: getGradient('professional.slate', colorMode),
    backdropFilter: `blur(8px)`,
    border: `1px solid ${getColor('glass.light.30', colorMode)}`,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
  }), [colorMode, prefersReducedMotion]);

  return (
    <Tooltip content="Grid Layout Manager" shortcut="Ctrl+L" position="bottom">
      <button
        type="button"
        onClick={onOpen}
        style={buttonStyles}
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-medium cursor-pointer hover:shadow-xl transform hover:scale-105"
        aria-label="Grid Layout Manager"
      >
        🔲
      </button>
    </Tooltip>
  );
});

const NotificationButton: React.FC<{ onOpen: () => void }> = memo(({ onOpen }) => {
  const { colorMode } = useUIState();
  const [unreadCount, setUnreadCount] = useState(0);

  // Performance: Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => 
    typeof window !== 'undefined' && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches, 
    []
  );

  // Performance: Memoized theme-aware styles
  const buttonStyles = useMemo(() => ({
    background: getGradient('professional.slate', colorMode),
    backdropFilter: `blur(8px)`,
    border: `1px solid ${getColor('glass.light.30', colorMode)}`,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
  }), [colorMode, prefersReducedMotion]);

  // Update unread count
  useEffect(() => {
    const updateCount = () => {
      const notifications = notificationService.getHistory({ limit: 100 });
      const unreadCount = notifications.filter(n => !n.metadata?.['isRead']).length;
      setUnreadCount(unreadCount);
    };
    
    updateCount();
    
    // Listen for notification events
    const handleNotificationChange = () => updateCount();
    notificationService.on('notification:delivered', handleNotificationChange);
    notificationService.on('notification:dismissed', handleNotificationChange);
    
    const interval = setInterval(updateCount, 1000);
    
    return () => {
      clearInterval(interval);
      notificationService.off('notification:delivered', handleNotificationChange);
      notificationService.off('notification:dismissed', handleNotificationChange);
    };
  }, []);

  return (
    <Tooltip content="Notifications" shortcut="Ctrl+N" position="bottom">
      <button
        type="button"
        onClick={onOpen}
        style={buttonStyles}
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-medium cursor-pointer hover:shadow-xl transform hover:scale-105 relative"
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
    </Tooltip>
  );
});

const ThemeToggle: React.FC = memo(() => {
  const { theme, cycleTheme, colorMode, setColorMode } = useUIState();

  // Performance: Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => 
    typeof window !== 'undefined' && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches, 
    []
  );

  // Performance: Memoized theme-aware styles
  const buttonStyles = useMemo(() => ({
    background: getGradient('professional.slate', colorMode),
    backdropFilter: `blur(8px)`,
    border: `1px solid ${getColor('glass.light.30', colorMode)}`,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
  }), [colorMode, prefersReducedMotion]);

  const getThemeIcon = useCallback(() => {
    // Return a generic theme icon since we have many theme variants
    return '🎨';
  }, []);

  const toggleColorMode = useCallback(() => {
    const newMode = colorMode === 'light' ? 'dark' : 'light';
    setColorMode(newMode);
    applyThemeWithCSS(newMode);
  }, [colorMode, setColorMode]);

  return (
    <div className="flex items-center space-x-2">
      <Tooltip content={`Toggle ${colorMode === 'light' ? 'Dark' : 'Light'} Mode`} shortcut="Ctrl+D" position="bottom">
        <button
          type="button"
          onClick={toggleColorMode}
          style={buttonStyles}
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-medium cursor-pointer hover:shadow-xl transform hover:scale-105"
          aria-label={`Toggle ${colorMode === 'light' ? 'Dark' : 'Light'} Mode`}
          aria-pressed={colorMode === 'dark'}
        >
          {colorMode === 'light' ? '🌙' : '☀️'}
        </button>
      </Tooltip>
      
      <Tooltip content={`Cycle theme (${theme})`} shortcut="Ctrl+T" position="bottom">
        <button
          type="button"
          onClick={cycleTheme}
          style={buttonStyles}
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-medium cursor-pointer hover:shadow-xl transform hover:scale-105"
          aria-label={`Cycle theme (current: ${theme})`}
        >
          {getThemeIcon()}
        </button>
      </Tooltip>
    </div>
  );
});

const SystemStatusIndicator: React.FC = memo(() => {
  const { colorMode: _colorMode } = useUIState();
  const [status, setStatus] = useState<SystemStatus>({
    cpu: 45,
    memory: 62,
    network: 'online',
    battery: 87,
    notifications: 3
  });

  // Performance: Memoized status color logic
  const getStatusColor = useCallback((type: 'cpu' | 'memory' | 'network' | 'battery') => {
    switch (type) {
      case 'cpu':
        return status.cpu > 80 ? 'bg-red-500' : status.cpu > 60 ? 'bg-yellow-500' : 'bg-green-500';
      case 'memory':
        return status.memory > 80 ? 'bg-red-500' : status.memory > 60 ? 'bg-yellow-500' : 'bg-green-500';
      case 'network':
        return status.network === 'online' ? 'bg-green-500' : status.network === 'slow' ? 'bg-yellow-500' : 'bg-red-500';
      case 'battery':
        return status.battery > 20 ? 'bg-green-500' : status.battery > 10 ? 'bg-yellow-500' : 'bg-red-500';
      default:
        return 'bg-green-500';
    }
  }, [status]);

  const getNetworkIcon = useCallback(() => {
    switch (status.network) {
      case 'online': return '📶';
      case 'slow': return '📶';
      case 'offline': return '❌';
      default: return '📶';
    }
  }, [status.network]);

  const getBatteryIcon = useCallback(() => {
    if (status.battery > 80) return '🔋';
    if (status.battery > 60) return '🔋';
    if (status.battery > 40) return '🔋';
    if (status.battery > 20) return '🔋';
    return '🔋';
  }, [status.battery]);

  // Simulate system status updates with performance optimization
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus((prev: SystemStatus) => ({
        ...prev,
        cpu: Math.floor(Math.random() * 30) + 30,
        memory: Math.floor(Math.random() * 20) + 50,
        battery: Math.max(0, prev.battery - Math.random() * 0.1)
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hidden sm:flex items-center space-x-2" role="status" aria-label="System status indicators">
      {/* CPU Usage */}
      <Tooltip content={`CPU: ${status.cpu}%`} position="bottom">
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${getStatusColor('cpu')} opacity-80`} />
          <span className="text-xs text-gray-300">{status.cpu}%</span>
        </div>
      </Tooltip>

      {/* Memory Usage */}
      <Tooltip content={`Memory: ${status.memory}%`} position="bottom">
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${getStatusColor('memory')} opacity-80`} />
          <span className="text-xs text-gray-300">{status.memory}%</span>
        </div>
      </Tooltip>

      {/* Network Status */}
      <Tooltip content={`Network: ${status.network}`} position="bottom">
        <div className="flex items-center space-x-1">
          <span className="text-xs" aria-hidden="true">{getNetworkIcon()}</span>
          <div className={`w-2 h-2 rounded-full ${getStatusColor('network')} opacity-80`} />
        </div>
      </Tooltip>

      {/* Battery Status */}
      <Tooltip content={`Battery: ${Math.round(status.battery)}%`} position="bottom">
        <div className="flex items-center space-x-1">
          <span className="text-xs" aria-hidden="true">{getBatteryIcon()}</span>
          <span className="text-xs text-gray-300">{Math.round(status.battery)}%</span>
        </div>
      </Tooltip>
    </div>
  );
});

const NotificationIndicator: React.FC = memo(() => {
  const { colorMode: _colorMode } = useUIState();
  const [notifications, setNotifications] = useState(3);
  const [isOpen, setIsOpen] = useState(false);

  // Performance: Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => 
    typeof window !== 'undefined' && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches, 
    []
  );

  // Performance: Memoized theme-aware styles
  const buttonStyles = useMemo(() => ({
    background: getGradient('professional.slate', _colorMode),
    backdropFilter: `blur(8px)`,
    border: `1px solid ${getColor('glass.light.30', _colorMode)}`,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
  }), [_colorMode, prefersReducedMotion]);

  const handleToggle = useCallback(() => {
    setIsOpen(!isOpen);
    if (notifications > 0) {
      setNotifications(0);
    }
  }, [isOpen, notifications]);

  return (
    <Tooltip content={`${notifications} notifications`} position="bottom">
      <div className="relative">
        <button
          type="button"
          onClick={handleToggle}
          style={buttonStyles}
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-medium cursor-pointer hover:shadow-xl transform hover:scale-105 relative"
          aria-label={`${notifications} notifications`}
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          <span aria-hidden="true">🔔</span>
          {notifications > 0 && (
            <span 
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold"
              style={{ 
                animation: prefersReducedMotion ? 'none' : 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' 
              }}
              aria-label={`${notifications} unread notifications`}
            >
              {notifications > 9 ? '9+' : notifications}
            </span>
          )}
        </button>
      </div>
    </Tooltip>
  );
});

const SearchButton: React.FC = memo(() => {
  const { toggleSpotlight, colorMode } = useUIState();

  // Performance: Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => 
    typeof window !== 'undefined' && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches, 
    []
  );

  // Performance: Memoized theme-aware styles
  const buttonStyles = useMemo(() => ({
    background: getGradient('professional.slate', colorMode),
    backdropFilter: `blur(8px)`,
    border: `1px solid ${getColor('glass.light.30', colorMode)}`,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
  }), [colorMode, prefersReducedMotion]);

  const handleSearch = useCallback(() => {
    toggleSpotlight();
  }, [toggleSpotlight]);

  return (
    <Tooltip content="Search" shortcut="Ctrl+K" position="bottom">
      <button
        type="button"
        onClick={handleSearch}
        style={buttonStyles}
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-medium cursor-pointer hover:shadow-xl transform hover:scale-105"
        aria-label="Search"
      >
        <span aria-hidden="true">🔍</span>
      </button>
    </Tooltip>
  );
});

// Add UserAvatar component
const UserAvatar: React.FC = memo(() => {
  return (
    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-white text-sm">
      👤
    </div>
  );
});

interface TopBarProps {
  className?: string;
  deviceInfo?: import('../utils/responsive.ts').DeviceInfo;
  onOpenWindowGroups?: () => void;
  onOpenGridLayout?: () => void;
  onOpenNotifications?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ className = '', onOpenWindowGroups, onOpenGridLayout, onOpenNotifications }) => {
  const { theme: _theme, setTheme: _setTheme, colorMode } = useUIState();

  // Performance: Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => 
    typeof window !== 'undefined' && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches, 
    []
  );

  // Performance: Memoized theme-aware styles
  const headerStyles = useMemo(() => ({
    backgroundColor: getColor('glass.dark.40', colorMode),
    backdropFilter: `blur(12px)`,
    borderBottom: `1px solid ${getColor('glass.dark.30', colorMode)}`,
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
  }), [colorMode, prefersReducedMotion]);

  return (
    <header
      style={headerStyles}
      // cSpell:disable-next-line
      className={`fixed top-0 left-0 w-full flex items-center justify-between px-6 ${TOPBAR_HEIGHT} ${TOPBAR_Z_INDEX} bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-lg border-b border-gray-700/40 shadow-lg transition-all duration-300 ${className}`}
      role="banner"
      aria-label="Top navigation bar"
    >
      {/* Left side - Logo */}
      <div className="flex items-center">
        <Logo />
      </div>

      {/* Center - Clock */}
      <div className="flex items-center justify-center flex-1 max-w-xs">
        <ClockWrapper />
      </div>

      {/* Right side - System icons + User */}
      <div className="flex items-center space-x-3">
        {/* System Status Indicators */}
        <SystemStatusIndicator />
        
        {/* Search Button */}
        <SearchButton />
        
        {/* Window Groups Button */}
        {onOpenWindowGroups && (
          <WindowGroupsButton onOpen={onOpenWindowGroups} />
        )}
        
        {/* Grid Layout Button */}
        {onOpenGridLayout && (
          <GridLayoutButton onOpen={onOpenGridLayout} />
        )}
        
        {/* Notification Button */}
        {onOpenNotifications && (
          <NotificationButton onOpen={onOpenNotifications} />
        )}
        
        {/* System Tray */}
        <SystemTray className="mr-3" />
        
        {/* Theme Toggle Button */}
        <ThemeToggle />
        
        {/* User Avatar */}
        <UserAvatar />
      </div>
    </header>
  );
};

export default memo(TopBar);

TopBar.displayName = 'TopBar';
UserAvatar.displayName = 'UserAvatar';
Logo.displayName = 'Logo';
ClockWrapper.displayName = 'ClockWrapper';
WindowGroupsButton.displayName = 'WindowGroupsButton';
GridLayoutButton.displayName = 'GridLayoutButton';
ThemeToggle.displayName = 'ThemeToggle';
SystemStatusIndicator.displayName = 'SystemStatusIndicator';
NotificationIndicator.displayName = 'NotificationIndicator';
SearchButton.displayName = 'SearchButton';
