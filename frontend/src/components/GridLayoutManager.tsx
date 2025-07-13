import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useUIState } from '../store/uiState.ts';
import { getColor } from '../utils/themeHelpers.ts';
import { useDeviceInfo } from '../utils/responsive.ts';
import { gridLayoutManager } from '../utils/gridLayoutManager.ts';

interface GridLayoutManagerProps {
  isVisible: boolean;
  onClose: () => void;
}

export const GridLayoutManager: React.FC<GridLayoutManagerProps> = ({ isVisible, onClose }) => {
  const { colorMode, openWindows } = useUIState();
  const deviceInfo = useDeviceInfo();
  const { isMobile } = deviceInfo;
  
  const [selectedLayout, setSelectedLayout] = useState<string>('grid-2x2');
  const [selectedWindows, setSelectedWindows] = useState<Set<string>>(new Set());

  const layouts = useMemo(() => gridLayoutManager.getAllLayouts(), []);
  const activeLayout = useMemo(() => gridLayoutManager.getActiveLayout(), []);
  const availableWindows = useMemo(() => 
    openWindows.filter((win: { groupId?: string }) => !win.groupId), [openWindows]
  );

  const handleLayoutSelect = useCallback((layoutId: string) => {
    setSelectedLayout(layoutId);
    gridLayoutManager.setActiveLayout(layoutId);
  }, []);

  const handleWindowSelect = useCallback((windowId: string) => {
    setSelectedWindows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(windowId)) {
        newSet.delete(windowId);
      } else {
        newSet.add(windowId);
      }
      return newSet;
    });
  }, []);

  const handleAutoArrange = useCallback(() => {
    if (selectedWindows.size === 0) return;
    
    const windowIds = Array.from(selectedWindows);
    gridLayoutManager.autoArrangeWindows(windowIds);
    onClose();
  }, [selectedWindows, onClose]);

  const handleApplyLayout = useCallback(() => {
    if (!activeLayout) return;
    
    // Apply layout to selected windows
    const windowIds = Array.from(selectedWindows);
    const availableCells = gridLayoutManager.getAvailableCells();
    
    windowIds.forEach((windowId, index) => {
      if (index < availableCells.length && availableCells[index]) {
        gridLayoutManager.assignWindowToCell(windowId, availableCells[index].id);
      }
    });
    
    onClose();
  }, [activeLayout, selectedWindows, onClose]);

  // Performance: Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => 
    typeof window !== 'undefined' && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches, 
    []
  );

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        exit={{ y: 20 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
        className={`
          bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4
          ${isMobile ? 'max-h-[90vh]' : 'max-h-[80vh]'}
        `}
        style={{
          backgroundColor: getColor('glass.dark.20', colorMode),
          backdropFilter: 'blur(16px)',
          border: `1px solid ${getColor('glass.dark.30', colorMode)}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 border-b"
          style={{ borderBottom: `1px solid ${getColor('glass.dark.30', colorMode)}` }}
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Grid Layout Manager
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Layout Selection */}
          <div className="space-y-3">
            <h3 className="text-md font-medium text-gray-900 dark:text-white">
              Choose Layout
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {layouts.map((layout) => (
                <div
                  key={layout.id}
                  className={`
                    p-3 border rounded-lg cursor-pointer transition-all
                    ${selectedLayout === layout.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }
                  `}
                  onClick={() => handleLayoutSelect(layout.id)}
                >
                  <div className="font-medium text-gray-900 dark:text-white">
                    {layout.name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {layout.description}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {layout.columns}×{layout.rows} • {layout.cells.length} cells
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Layout Preview */}
          {activeLayout && (
            <div className="space-y-3">
              <h3 className="text-md font-medium text-gray-900 dark:text-white">
                Layout Preview: {activeLayout.name}
              </h3>
              
              <div 
                className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-700"
                style={{
                  aspectRatio: `${activeLayout.columns}/${activeLayout.rows}`,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${activeLayout.columns}, 1fr)`,
                  gridTemplateRows: `repeat(${activeLayout.rows}, 1fr)`,
                  gap: '4px'
                }}
              >
                {activeLayout.cells.map((cell) => (
                  <div
                    key={cell.id}
                    className={`
                      border-2 border-dashed rounded transition-colors
                      ${cell.isOccupied
                        ? 'border-green-500 bg-green-100 dark:bg-green-900'
                        : 'border-gray-300 dark:border-gray-600'
                      }
                    `}
                    style={{
                      gridColumn: `span ${cell.width}`,
                      gridRow: `span ${cell.height}`
                    }}
                  >
                    <div className="text-xs text-center text-gray-600 dark:text-gray-400 p-1">
                      {cell.id}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Window Selection */}
          <div className="space-y-3">
            <h3 className="text-md font-medium text-gray-900 dark:text-white">
              Select Windows to Arrange ({selectedWindows.size} selected)
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
              {availableWindows.map((window: { id: string; component: string }) => (
                <label
                  key={window.id}
                  className={`
                    flex items-center p-2 rounded cursor-pointer transition-colors
                    ${selectedWindows.has(window.id)
                      ? 'bg-blue-100 dark:bg-blue-900'
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selectedWindows.has(window.id)}
                    onChange={() => handleWindowSelect(window.id)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-900 dark:text-white truncate">
                    {window.component}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleAutoArrange}
              disabled={selectedWindows.size === 0}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Auto Arrange ({selectedWindows.size} windows)
            </button>
            
            <button
              type="button"
              onClick={handleApplyLayout}
              disabled={selectedWindows.size === 0 || !activeLayout}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Apply Layout
            </button>
            
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}; 