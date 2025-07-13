import React, { useState as _useState, useEffect as _useEffect, useRef as _useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIState } from '../store/uiState.ts';
import { getColor } from '../utils/themeHelpers.ts';
import { useDeviceInfo } from '../utils/responsive.ts';
import type { WindowState } from '../store/uiState.ts';

interface TabbedWindowProps {
  groupId: string;
  onClose?: () => void;
}

export const TabbedWindow: React.FC<TabbedWindowProps> = ({ groupId, onClose }) => {
  const { colorMode, windowGroups, openWindows, setActiveWindowInGroup, closeWindow } = useUIState();
  const deviceInfo = useDeviceInfo();
  const { isMobile, isTablet: _isTablet } = deviceInfo;
  
  const group = windowGroups[groupId];
  const groupWindows = useMemo<WindowState[]>(() => {
    if (!group) return [];
    return openWindows.filter((win: WindowState) => group.windowIds.includes(win.id));
  }, [group, openWindows]);

  const activeWindow = useMemo<WindowState | null>(() => {
    if (!group || !group.activeWindowId) return null;
    return openWindows.find((win: WindowState) => win.id === group.activeWindowId) || null;
  }, [group, openWindows]);

  const handleTabClick = useCallback((windowId: string) => {
    setActiveWindowInGroup(groupId, windowId);
  }, [groupId, setActiveWindowInGroup]);

  const handleTabClose = useCallback((windowId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    closeWindow(windowId);
  }, [closeWindow]);

  if (!group || groupWindows.length === 0) {
    return null;
  }

  // Performance: Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => 
    typeof window !== 'undefined' && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches, 
    []
  );

  return (
    <div className="tabbed-window h-full flex flex-col">
      {/* Tab Bar */}
      <div 
        className="flex items-center bg-gray-800 border-b border-gray-700"
        style={{ 
          backgroundColor: getColor('glass.dark.20', colorMode),
          borderBottom: `1px solid ${getColor('glass.dark.30', colorMode)}`
        }}
      >
        {/* Group Name */}
        <div className="flex items-center px-3 py-2 border-r border-gray-700 min-w-0">
          <span className="text-sm font-medium text-gray-300 truncate">
            {group.name}
          </span>
          <span className="ml-2 text-xs text-gray-500">
            ({groupWindows.length})
          </span>
        </div>

        {/* Tabs */}
        <div className="flex-1 flex overflow-x-auto">
          <AnimatePresence mode="wait">
            {groupWindows.map((window: WindowState) => (
              <motion.div
                key={window.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
                className={`
                  flex items-center px-3 py-2 cursor-pointer border-r border-gray-700 min-w-0
                  transition-all duration-200
                  ${window.id === group.activeWindowId
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                  }
                `}
                onClick={() => handleTabClick(window.id)}
                style={{
                  backgroundColor: window.id === group.activeWindowId 
                    ? getColor('glass.dark.30', colorMode)
                    : getColor('glass.dark.20', colorMode),
                  borderRight: `1px solid ${getColor('glass.dark.30', colorMode)}`
                }}
              >
                {/* Window Icon */}
                <span className="text-sm mr-2" aria-hidden="true">
                  {window.component === 'Files' ? '📁' :
                   window.component === 'Notepad' ? '📝' :
                   window.component === 'Calculator' ? '🧮' :
                   window.component === 'iPod' ? '🎵' : '📱'}
                </span>

                {/* Window Title */}
                <span className="text-sm truncate max-w-32">
                  {window.component}
                </span>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={(e: React.MouseEvent) => handleTabClose(window.id, e)}
                  className={`
                    ml-2 p-1 rounded hover:bg-gray-600 transition-colors
                    ${isMobile ? 'w-6 h-6' : 'w-5 h-5'}
                  `}
                  aria-label={`Close ${window.component}`}
                >
                  <svg 
                    className="w-full h-full" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M6 18L18 6M6 6l12 12" 
                    />
                  </svg>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Group Controls */}
        <div className="flex items-center px-2">
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            aria-label="Close group"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {activeWindow && (
            <motion.div
              key={activeWindow.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
              className="absolute inset-0"
            >
              {/* This will be replaced with the actual window content */}
              <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <div className="text-center text-gray-400">
                  <div className="text-4xl mb-4">
                    {activeWindow.component === 'Files' ? '📁' :
                     activeWindow.component === 'Notepad' ? '📝' :
                     activeWindow.component === 'Calculator' ? '🧮' :
                     activeWindow.component === 'iPod' ? '🎵' : '📱'}
                  </div>
                  <div className="text-lg font-medium">{activeWindow.component}</div>
                  <div className="text-sm">Tabbed Window Content</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}; 