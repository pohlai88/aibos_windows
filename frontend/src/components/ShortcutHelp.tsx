/** @jsxImportSource react */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useShortcutManager } from '../services/shortcutManager.ts';
import { useDeviceInfo } from '../utils/responsive.ts';

// Strong typing for shortcut objects
interface Shortcut {
  id: string;
  key: string;
  description: string;
  category: string;
  tags?: string[];
  icon?: string;
}

interface ShortcutHelpProps {
  isVisible: boolean;
  onClose: () => void;
}

// Utility function to highlight search matches
const highlightMatch = (text: string, query: string): React.ReactNode => {
  if (!query.trim()) return text;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
  const parts = text.split(regex);
  
  return parts.map((part, i) => 
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 dark:bg-yellow-700 text-yellow-900 dark:text-yellow-100 px-0.5 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  );
};

export const ShortcutHelp: React.FC<ShortcutHelpProps> = React.memo(({ isVisible, onClose }) => {
  const deviceInfo = useDeviceInfo();
  const { isMobile, isTablet } = deviceInfo;
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [copiedShortcutId, setCopiedShortcutId] = useState<string | null>(null);
  
  const { getAllShortcuts } = useShortcutManager();
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Memoize shortcuts to prevent unnecessary re-renders
  const allShortcuts = useMemo(() => getAllShortcuts(), [getAllShortcuts]);

  // Get all unique categories (memoized)
  const categories = useMemo(() => {
    const cats = [...new Set(allShortcuts.map(s => s.category))];
    return ['all', ...cats];
  }, [allShortcuts]);

  // Filter shortcuts based on search and category
  const filteredShortcuts = useMemo(() => {
    let filtered = allShortcuts;

    // Filter by category
    if (activeCategory !== 'all') {
      filtered = filtered.filter(shortcut => shortcut.category === activeCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(shortcut => 
        shortcut.description.toLowerCase().includes(query) ||
        shortcut.key.toLowerCase().includes(query) ||
        shortcut.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        shortcut.category.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [searchQuery, activeCategory, allShortcuts]);

  // Group filtered shortcuts by category
  const groupedShortcuts = useMemo(() => {
    return filteredShortcuts.reduce((acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    }, {} as Record<string, Shortcut[]>);
  }, [filteredShortcuts]);

  // Reset focused index when search or category changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchQuery, activeCategory]);

  // Scroll to top when search or category changes
  useEffect(() => {
    if (scrollContainerRef.current && typeof scrollContainerRef.current.scrollTo === 'function') {
      (scrollContainerRef.current as HTMLElement).scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [filteredShortcuts]);

  // Close on Escape key with proper cleanup
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, onClose]);

  // Focus trap and keyboard navigation
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const shortcuts = Object.values(groupedShortcuts).flat();
      
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex(prev => 
            prev < shortcuts.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex(prev => 
            prev > 0 ? prev - 1 : shortcuts.length - 1
          );
          break;
        case 'Enter': {
          event.preventDefault();
          const focusedShortcut = shortcuts[focusedIndex];
          if (focusedIndex >= 0 && focusedShortcut) {
            handleCopyShortcut(focusedShortcut);
          }
          break;
        }
        case 'Tab':
          // Allow normal tab navigation within modal
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, groupedShortcuts, focusedIndex]);

  // Focus management
  useEffect(() => {
    if (isVisible && modalRef.current) {
      const firstFocusable = modalRef.current.querySelector(
        'input, button, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      firstFocusable?.focus();
    }
  }, [isVisible]);

  const handleCopyShortcut = useCallback(async (shortcut: Shortcut) => {
    try {
      await navigator.clipboard.writeText(shortcut.key);
      setCopiedShortcutId(shortcut.id);
      setShowCopiedMessage(true);
      setTimeout(() => {
        setShowCopiedMessage(false);
        setCopiedShortcutId(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy shortcut:', error);
    }
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setActiveCategory('all');
  }, []);

  if (!isVisible) return null;

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] ${
          isMobile 
            ? 'p-2' 
            : isTablet 
              ? 'p-4' 
              : 'p-4'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-help-title"
        aria-describedby="shortcut-help-description"
        ref={modalRef}
      >
        <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-full overflow-hidden ${
          isMobile 
            ? 'max-w-full max-h-[95vh]' 
            : isTablet 
              ? 'max-w-3xl max-h-[90vh]' 
              : 'max-w-4xl max-h-[90vh]'
        }`}>
          {/* Header */}
          <div className={`flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 ${
            isMobile ? 'p-4' : 'p-6'
          }`}>
            <div className="flex items-center space-x-3">
              <span className={`${isMobile ? 'text-xl' : 'text-2xl'}`} aria-hidden="true">⌨️</span>
              <div>
                <h2 id="shortcut-help-title" className={`font-semibold text-gray-900 dark:text-white ${
                  isMobile ? 'text-lg' : 'text-xl'
                }`}>
                  Keyboard Shortcuts
                </h2>
                {!isMobile && (
                  <p id="shortcut-help-description" className="text-sm text-gray-600 dark:text-gray-400">
                    Master your AIBOS experience with these shortcuts
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                isMobile ? 'p-1' : 'p-2'
              }`}
              aria-label="Close shortcuts help"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>

          {/* Search and Filter */}
          <div className={`border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 ${
            isMobile ? 'p-3' : 'p-6'
          }`}>
            <div className={`flex gap-4 ${
              isMobile 
                ? 'flex-col' 
                : isTablet 
                  ? 'flex-col sm:flex-row' 
                  : 'flex-col sm:flex-row'
            }`}>
              {/* Search Input */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={isMobile ? "Search..." : "Search shortcuts..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full px-4 pl-10 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                      isMobile ? 'py-2 text-sm' : 'py-2 text-base'
                    }`}
                    aria-label="Search shortcuts"
                  />
                  <span className="absolute left-3 top-2.5 text-gray-400" aria-hidden="true">🔍</span>
                </div>
              </div>

              {/* Category Filter - hide on mobile */}
              {!isMobile && (
                <div className="flex flex-wrap gap-2" role="tablist" aria-label="Shortcut categories">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      role="tab"
                      aria-selected={activeCategory === category}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        activeCategory === category
                          ? 'bg-blue-500 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div 
            ref={scrollContainerRef}
            className={`max-h-96 overflow-y-auto shortcuts-scroll-container ${
              isMobile ? 'p-3' : 'p-6'
            }`}
            role="region"
            aria-label="Shortcuts list"
          >
            {Object.keys(groupedShortcuts).length === 0 ? (
              <div className="text-center py-8">
                <span className={`${isMobile ? 'text-3xl' : 'text-4xl'} mb-4 block`} aria-hidden="true">🔍</span>
                <p className="text-gray-600 dark:text-gray-400">
                  {searchQuery.trim() 
                    ? `No shortcuts found for "${searchQuery}"`
                    : 'No shortcuts found'
                  }
                </p>
                {searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="mt-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className={`grid gap-6 ${
                isMobile 
                  ? 'grid-cols-1' 
                  : isTablet 
                    ? 'grid-cols-1 lg:grid-cols-2' 
                    : 'grid-cols-1 lg:grid-cols-2'
              }`}>
                {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
                  <div key={category} className="space-y-3">
                    <h3 className={`font-semibold text-gray-900 dark:text-white flex items-center space-x-2 ${
                      isMobile ? 'text-base' : 'text-lg'
                    }`}>
                      <span className={`${isMobile ? 'text-lg' : 'text-xl'}`} aria-hidden="true">
                        {category === 'Navigation' && '🧭'}
                        {category === 'Applications' && '📱'}
                        {category === 'Windows' && '🪟'}
                        {category === 'Files' && '📁'}
                        {category === 'System' && '⚙️'}
                        {category === 'User' && '👤'}
                        {category === 'Appearance' && '🎨'}
                        {category === 'Help' && '❓'}
                      </span>
                      <span>{category}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({shortcuts.length})
                      </span>
                    </h3>
                    <div className="space-y-2">
                      {shortcuts.map((shortcut) => {
                        const globalIndex = shortcuts.findIndex(s => s.id === shortcut.id);
                        const isFocused = focusedIndex === globalIndex;
                        
                        return (
                          <div 
                            key={shortcut.id} 
                            className={`flex items-center justify-between rounded-lg transition-colors group focus-within:ring-2 focus-within:ring-blue-500 ${
                              isFocused 
                                ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500' 
                                : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                            } ${
                              isMobile ? 'p-2' : 'p-3'
                            }`}
                            tabIndex={0}
                            role="button"
                            aria-label={`${shortcut.description} - ${shortcut.key}`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleCopyShortcut(shortcut);
                              }
                            }}
                          >
                            <div className="flex items-center space-x-3">
                              <span className={`${isMobile ? 'text-base' : 'text-lg'}`} aria-hidden="true">{shortcut.icon}</span>
                              <div>
                                <div className={`text-gray-900 dark:text-white font-medium ${
                                  isMobile ? 'text-xs' : 'text-sm'
                                }`}>
                                  {highlightMatch(shortcut.description, searchQuery)}
                                </div>
                                {shortcut.tags && !isMobile && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {shortcut.tags.slice(0, 2).map((tag) => (
                                      <span 
                                        key={tag}
                                        className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <kbd className={`bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm group-hover:shadow-md transition-shadow ${
                                isMobile 
                                  ? 'px-2 py-1 text-xs' 
                                  : 'px-3 py-1.5 text-sm'
                              }`}>
                                {highlightMatch(shortcut.key, searchQuery)}
                              </kbd>
                              <button
                                type="button"
                                onClick={() => handleCopyShortcut(shortcut)}
                                className={`transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded ${
                                  copiedShortcutId === shortcut.id
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100'
                                } ${
                                  isMobile ? 'p-0.5' : 'p-1'
                                }`}
                                title="Copy shortcut"
                                aria-label={`Copy shortcut: ${shortcut.key}`}
                              >
                                {copiedShortcutId === shortcut.id ? '✓' : '📋'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer - hide on mobile */}
          {!isMobile && (
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>
                    💡 Tip: Press <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-mono rounded border">Esc</kbd> to close
                  </span>
                  <span>
                    Use <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-mono rounded border">↑↓</kbd> to navigate, <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-mono rounded border">Enter</kbd> to copy
                  </span>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {filteredShortcuts.length} of {allShortcuts.length} shortcuts
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating toast for copy feedback */}
      {showCopiedMessage && (
        <div 
          className={`fixed bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-[10000] animate-in slide-in-from-bottom-2 ${
            isMobile 
              ? 'bottom-4 left-4 right-4' 
              : 'bottom-8 left-1/2 transform -translate-x-1/2'
          }`}
          role="status"
          aria-live="polite"
        >
          ✓ Shortcut copied!
        </div>
      )}
    </>
  );
});

ShortcutHelp.displayName = 'ShortcutHelp'; 