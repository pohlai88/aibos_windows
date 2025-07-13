// Responsive Utilities for AI-BOS Platform
// Provides device detection, breakpoints, and responsive behavior

import React from 'react';
import { breakpoints } from './designTokens.ts';

// ============================================================================
// DEVICE DETECTION
// ============================================================================

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
}

export interface ResponsiveConfig {
  mobileBreakpoint: number;
  tabletBreakpoint: number;
  desktopBreakpoint: number;
  enableTouchOptimizations: boolean;
  enableMobileWindowCollapse: boolean;
  enableTabletAdaptiveLayout: boolean;
}

// Default responsive configuration
export const defaultResponsiveConfig: ResponsiveConfig = {
  mobileBreakpoint: 768, // md breakpoint
  tabletBreakpoint: 1024, // lg breakpoint
  desktopBreakpoint: 1280, // xl breakpoint
  enableTouchOptimizations: true,
  enableMobileWindowCollapse: true,
  enableTabletAdaptiveLayout: true,
};

// ============================================================================
// DEVICE DETECTION UTILITIES
// ============================================================================

/**
 * Get current device information
 */
export function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isTouch: false,
      screenWidth: 1920,
      screenHeight: 1080,
      orientation: 'landscape',
      pixelRatio: 1,
    };
  }

  const screenWidth = globalThis.innerWidth;
  const screenHeight = globalThis.innerHeight;
  const pixelRatio = globalThis.devicePixelRatio || 1;

  // Check for touch capability
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Determine device type based on screen width
  const isMobile = screenWidth < defaultResponsiveConfig.mobileBreakpoint;
  const isTablet = screenWidth >= defaultResponsiveConfig.mobileBreakpoint && 
                   screenWidth < defaultResponsiveConfig.tabletBreakpoint;
  const isDesktop = screenWidth >= defaultResponsiveConfig.tabletBreakpoint;

  // Determine orientation
  const orientation = screenWidth > screenHeight ? 'landscape' : 'portrait';

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouch,
    screenWidth,
    screenHeight,
    orientation,
    pixelRatio,
  };
}

/**
 * Check if current screen matches a breakpoint
 */
export function matchesBreakpoint(breakpoint: keyof typeof breakpoints): boolean {
  if (typeof window === 'undefined') return false;
  
  const breakpointValue = parseInt(breakpoints[breakpoint]);
  return globalThis.innerWidth >= breakpointValue;
}

/**
 * Check if screen is smaller than a breakpoint
 */
export function isSmallerThan(breakpoint: keyof typeof breakpoints): boolean {
  if (typeof window === 'undefined') return false;
  
  const breakpointValue = parseInt(breakpoints[breakpoint]);
  return globalThis.innerWidth < breakpointValue;
}

/**
 * Check if screen is larger than a breakpoint
 */
export function isLargerThan(breakpoint: keyof typeof breakpoints): boolean {
  if (typeof window === 'undefined') return false;
  
  const breakpointValue = parseInt(breakpoints[breakpoint]);
  return globalThis.innerWidth > breakpointValue;
}

// ============================================================================
// RESPONSIVE BEHAVIOR UTILITIES
// ============================================================================

/**
 * Get responsive class names based on device type
 */
export function getResponsiveClasses(deviceInfo: DeviceInfo): {
  container: string;
  window: string;
  dock: string;
  topBar: string;
  startMenu: string;
  spotlight: string;
} {
  const { isMobile, isTablet } = deviceInfo;

  return {
    container: `
      ${isMobile ? 'mobile-layout' : ''}
      ${isTablet ? 'tablet-layout' : ''}
      ${!isMobile && !isTablet ? 'desktop-layout' : ''}
    `.trim(),
    
    window: `
      ${isMobile ? 'mobile-window' : ''}
      ${isTablet ? 'tablet-window' : ''}
      ${!isMobile && !isTablet ? 'desktop-window' : ''}
    `.trim(),
    
    dock: `
      ${isMobile ? 'mobile-dock' : ''}
      ${isTablet ? 'tablet-dock' : ''}
      ${!isMobile && !isTablet ? 'desktop-dock' : ''}
    `.trim(),
    
    topBar: `
      ${isMobile ? 'mobile-topbar' : ''}
      ${isTablet ? 'tablet-topbar' : ''}
      ${!isMobile && !isTablet ? 'desktop-topbar' : ''}
    `.trim(),
    
    startMenu: `
      ${isMobile ? 'mobile-startmenu' : ''}
      ${isTablet ? 'tablet-startmenu' : ''}
      ${!isMobile && !isTablet ? 'desktop-startmenu' : ''}
    `.trim(),
    
    spotlight: `
      ${isMobile ? 'mobile-spotlight' : ''}
      ${isTablet ? 'tablet-spotlight' : ''}
      ${!isMobile && !isTablet ? 'desktop-spotlight' : ''}
    `.trim(),
  };
}

/**
 * Get responsive window configuration
 */
export function getResponsiveWindowConfig(deviceInfo: DeviceInfo) {
  const { isMobile, isTablet, screenWidth, screenHeight } = deviceInfo;

  if (isMobile) {
    return {
      minWidth: screenWidth - 40, // Full width minus margins
      minHeight: screenHeight * 0.6, // 60% of screen height
      maxWidth: screenWidth - 20,
      maxHeight: screenHeight - 100, // Account for top bar and dock
      defaultWidth: screenWidth - 40,
      defaultHeight: screenHeight * 0.7,
      resizable: false, // Disable resize on mobile
      draggable: false, // Disable drag on mobile
      collapsible: true, // Enable collapse to tabs
    };
  }

  if (isTablet) {
    return {
      minWidth: 400,
      minHeight: 300,
      maxWidth: screenWidth - 60,
      maxHeight: screenHeight - 120,
      defaultWidth: 600,
      defaultHeight: 500,
      resizable: true,
      draggable: true,
      collapsible: false,
    };
  }

  // Desktop
  return {
    minWidth: 300,
    minHeight: 200,
    maxWidth: screenWidth - 40,
    maxHeight: screenHeight - 120,
    defaultWidth: 800,
    defaultHeight: 600,
    resizable: true,
    draggable: true,
    collapsible: false,
  };
}

/**
 * Get responsive dock configuration
 */
export function getResponsiveDockConfig(deviceInfo: DeviceInfo) {
  const { isMobile, isTablet } = deviceInfo;

  if (isMobile) {
    return {
      position: 'bottom' as const,
      autoHide: false, // Always visible on mobile
      itemSize: 60, // Larger touch targets
      spacing: 8,
      maxItems: 5, // Limit items on mobile
      showLabels: false, // Hide labels to save space
      background: 'glass-dark-strong',
    };
  }

  if (isTablet) {
    return {
      position: 'bottom' as const,
      autoHide: true,
      itemSize: 50,
      spacing: 6,
      maxItems: 8,
      showLabels: false,
      background: 'glass-dark',
    };
  }

  // Desktop
  return {
    position: 'bottom' as const,
    autoHide: true,
    itemSize: 56,
    spacing: 8,
    maxItems: 12,
    showLabels: true,
    background: 'glass-light',
  };
}

/**
 * Get responsive top bar configuration
 */
export function getResponsiveTopBarConfig(deviceInfo: DeviceInfo) {
  const { isMobile, isTablet } = deviceInfo;

  if (isMobile) {
    return {
      height: 60,
      showTitle: true,
      showControls: true,
      showMenu: false, // Hide menu on mobile
      showSearch: false, // Hide search on mobile
      showNotifications: false, // Hide notifications on mobile
      compact: true,
    };
  }

  if (isTablet) {
    return {
      height: 50,
      showTitle: true,
      showControls: true,
      showMenu: true,
      showSearch: true,
      showNotifications: false,
      compact: false,
    };
  }

  // Desktop
  return {
    height: 40,
    showTitle: true,
    showControls: true,
    showMenu: true,
    showSearch: true,
    showNotifications: true,
    compact: false,
  };
}

// ============================================================================
// TOUCH OPTIMIZATION UTILITIES
// ============================================================================

/**
 * Get touch-friendly dimensions
 */
export function getTouchDimensions(deviceInfo: DeviceInfo) {
  const { isTouch, pixelRatio } = deviceInfo;
  
  if (!isTouch) {
    return {
      minTouchTarget: 44,
      buttonPadding: 12,
      iconSize: 24,
      spacing: 8,
    };
  }

  // Adjust for high-DPI displays
  const scaleFactor = Math.min(pixelRatio, 3);
  
  return {
    minTouchTarget: Math.max(44, 44 * scaleFactor),
    buttonPadding: Math.max(12, 12 * scaleFactor),
    iconSize: Math.max(24, 24 * scaleFactor),
    spacing: Math.max(8, 8 * scaleFactor),
  };
}

/**
 * Get gesture-friendly configuration
 */
export function getGestureConfig(deviceInfo: DeviceInfo) {
  const { isTouch, isMobile } = deviceInfo;

  if (!isTouch) {
    return {
      enableSwipe: false,
      enablePinch: false,
      enableLongPress: false,
      swipeThreshold: 50,
      longPressDelay: 500,
    };
  }

  return {
    enableSwipe: true,
    enablePinch: !isMobile, // Pinch only on tablets and larger
    enableLongPress: true,
    swipeThreshold: 50,
    longPressDelay: 500,
  };
}

// ============================================================================
// RESPONSIVE HOOKS (for React components)
// ============================================================================

/**
 * Hook to get current device information
 */
export function useDeviceInfo(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = React.useState<DeviceInfo>(getDeviceInfo);

  React.useEffect(() => {
    const updateDeviceInfo = () => {
      setDeviceInfo(getDeviceInfo());
    };

    // Update on resize and orientation change
    globalThis.addEventListener('resize', updateDeviceInfo);
    globalThis.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      globalThis.removeEventListener('resize', updateDeviceInfo);
      globalThis.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
}

/**
 * Hook to get responsive configuration
 */
export function useResponsiveConfig() {
  const deviceInfo = useDeviceInfo();
  
  return {
    deviceInfo,
    windowConfig: getResponsiveWindowConfig(deviceInfo),
    dockConfig: getResponsiveDockConfig(deviceInfo),
    topBarConfig: getResponsiveTopBarConfig(deviceInfo),
    touchDimensions: getTouchDimensions(deviceInfo),
    gestureConfig: getGestureConfig(deviceInfo),
    responsiveClasses: getResponsiveClasses(deviceInfo),
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Debounce function for responsive updates
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for responsive updates
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

 