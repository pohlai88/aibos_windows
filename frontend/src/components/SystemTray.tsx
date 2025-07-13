/** @jsxImportSource react */
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { systemTrayManager, type TrayItem, type TrayMenu } from '../services/systemTrayManager.ts';
import { useUIState } from '../store/uiState.ts';
import { getColor } from '../utils/themeHelpers.ts';
import { Tooltip } from './Tooltip.tsx';

interface SystemTrayProps {
  className?: string;
}

export const SystemTray: React.FC<SystemTrayProps> = memo(({ className = '' }) => {
  const { colorMode } = useUIState();
  const [trayItems, setTrayItems] = useState<TrayItem[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // Subscribe to tray changes
  useEffect(() => {
    const unsubscribe = systemTrayManager.subscribe(setTrayItems);
    return unsubscribe;
  }, []);

  // Get tray menu items
  const menuItems = useMemo(() => {
    return systemTrayManager.getTrayMenu();
  }, [trayItems]);

  // Handle tray icon click
  const handleTrayClick = useCallback((event: React.MouseEvent<HTMLButtonElement>): void => {
    if (trayItems.length === 0) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPosition({
      x: rect.left,
      y: rect.bottom + 8
    });
    setIsMenuOpen(prev => !prev);
  }, [trayItems.length]);

  // Handle menu item click
  const handleMenuItemClick = useCallback((item: TrayMenu) => {
    item.action();
    setIsMenuOpen(false);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (_event: MouseEvent) => {
      if (isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
    return undefined;
  }, [isMenuOpen]);

  // Don't render if no tray items
  if (trayItems.length === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Tray Icon */}
      <Tooltip content={`${trayItems.length} minimized window${trayItems.length > 1 ? 's' : ''}`}>
        <button
          type="button"
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
          onClick={handleTrayClick}
          aria-label={`System tray with ${trayItems.length} minimized windows`}
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
        >
          <div className="relative">
            <span className="text-white text-lg">📱</span>
            {trayItems.length > 0 && (
              <span 
                className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold"
                style={{ fontSize: '10px' }}
              >
                {trayItems.length > 9 ? '9+' : trayItems.length}
              </span>
            )}
          </div>
        </button>
      </Tooltip>

      {/* Tray Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 mt-2 w-64 rounded-xl shadow-2xl border"
            style={{
              left: menuPosition.x - 128, // Center the menu
              top: menuPosition.y,
              backgroundColor: getColor('glass.dark.80', colorMode),
              borderColor: getColor('glass.light.20', colorMode),
              backdropFilter: 'blur(20px)',
            }}
            role="menu"
            aria-label="System tray menu"
          >
            <div className="p-2">
              {menuItems.map((item, _index) => {
                // Render separator
                if (item.title === '') {
                  return (
                    <div 
                      key={item.id}
                      className="my-1 h-px"
                      style={{ backgroundColor: getColor('glass.light.20', colorMode) }}
                      role="separator"
                    />
                  );
                }

                // Render menu item
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full flex items-center px-3 py-2 text-left rounded-lg transition-all duration-150 hover:bg-white/10 focus:outline-none focus:bg-white/10"
                    onClick={() => handleMenuItemClick(item)}
                    role="menuitem"
                  >
                    {item.icon && (
                      <span className="mr-3 text-lg">{item.icon}</span>
                    )}
                    <div className="flex-1">
                      <div className="text-white font-medium">{item.title}</div>
                      {item.shortcut && (
                        <div 
                          className="text-xs mt-1"
                          style={{ color: getColor('gray.400', colorMode) }}
                        >
                          {item.shortcut}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

SystemTray.displayName = 'SystemTray';