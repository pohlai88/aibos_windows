/** @jsxImportSource react */
import { memo, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useUIState } from '../store/uiState.ts';
import { themeConfigs, getThemesByCategory, ThemeVariant } from '../utils/themeManager.ts';
import { getColor, getGradient } from '../utils/themeHelpers.ts';
import { animation } from '../utils/designTokens.ts';

interface ThemeSelectorProps {
  onClose?: () => void;
  isWindow?: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = memo(({ onClose, isWindow = false }) => {
  const { theme, setTheme, colorMode } = useUIState();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [previewMode, setPreviewMode] = useState<'gradient' | 'full' | 'minimal'>('gradient');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const themesByCategory = getThemesByCategory();

  // Performance: Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => 
    typeof window !== 'undefined' && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches, 
    []
  );

  // Get all themes as flat array for search and navigation
  const allThemes = useMemo((): ThemeVariant[] => {
    return Object.values(themesByCategory).flat();
  }, [themesByCategory]);

  // Memoized filtered themes for performance
  const filteredThemes = useMemo((): ThemeVariant[] => {
    let themes = allThemes;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      themes = themes.filter(themeVariant => {
        const config = themeConfigs[themeVariant];
        return config.name.toLowerCase().includes(query) ||
               config.description.toLowerCase().includes(query) ||
               themeVariant.toLowerCase().includes(query);
      });
    }

    // Filter by category
    if (activeCategory !== 'all') {
      themes = themes.filter(themeVariant => {
        const config = themeConfigs[themeVariant];
        return config.category === activeCategory;
      });
    }

    return themes;
  }, [allThemes, searchQuery, activeCategory]);

  // Get unique categories with guard against empty config
  const categories = useMemo((): string[] => {
    const cats = [...new Set(Object.values(themeConfigs).map(config => config.category))];
    const categoryList = ['all', ...cats.sort()];
    return categoryList.length > 1 ? categoryList : ['all'];
  }, []);

  // Memoized theme styles for consistent theming
  const themeStyles = useMemo(() => ({
    container: {
      backgroundColor: getColor('glass.light.90', colorMode),
      border: `1px solid ${getColor('glass.light.60', colorMode)}`,
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    },
    header: {
      background: getGradient('professional.slate', colorMode),
      borderBottom: `1px solid ${getColor('glass.light.40', colorMode)}`,
    },
    searchInput: {
      backgroundColor: getColor('white', colorMode),
      border: `1px solid ${getColor('gray.300', colorMode)}`,
      color: getColor('gray.900', colorMode),
      transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
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
    themeCard: (isSelected: boolean, isHighlighted: boolean) => ({
      border: `2px solid ${isSelected 
        ? getColor('primary.500', colorMode) 
        : isHighlighted 
        ? getColor('primary.300', colorMode)
        : getColor('gray.200', colorMode)}`,
      backgroundColor: isSelected 
        ? getColor('primary.50', colorMode) 
        : isHighlighted 
        ? getColor('primary.100', colorMode)
        : 'transparent',
      transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
    }),
    footer: {
      backgroundColor: getColor('gray.50', colorMode),
      borderTop: `1px solid ${getColor('gray.200', colorMode)}`,
    },
  }), [colorMode, prefersReducedMotion]);

  // Focus search input when component mounts
  useEffect(() => {
    if (!isWindow) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isWindow]);

  // Focus trap for modal mode
  useEffect(() => {
    if (isWindow) return;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const focusableElements = document.querySelectorAll(
          'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
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
  }, [isWindow]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const themes = filteredThemes;
    
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        if (!isWindow) {
          onClose?.();
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < themes.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : themes.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (themes[selectedIndex]) {
          handleThemeSelect(themes[selectedIndex]);
        }
        break;
      case 'Tab':
        e.preventDefault();
        // Cycle through results
        setSelectedIndex(prev => 
          prev < themes.length - 1 ? prev + 1 : 0
        );
        break;
      case ' ':
        e.preventDefault();
        // Cycle only filtered themes for consistency
        if (themes.length > 0) {
          const currentIndex = themes.findIndex(t => t === theme);
          const nextIndex = currentIndex < themes.length - 1 ? currentIndex + 1 : 0;
          if (themes[nextIndex] !== undefined) handleThemeSelect(themes[nextIndex]);
        }
        break;
    }
  }, [filteredThemes, selectedIndex, theme, isWindow, onClose]);

  const handleThemeSelect = useCallback((selectedTheme: ThemeVariant) => {
    setTheme(selectedTheme);
    onClose?.();
  }, [setTheme, onClose]);

  const handlePreviewModeChange = useCallback((mode: 'gradient' | 'full' | 'minimal') => {
    setPreviewMode(mode);
  }, []);

  const handleFocus = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const renderThemePreview = useCallback((themeVariant: ThemeVariant) => {
    const config = themeConfigs[themeVariant];
    
    switch (previewMode) {
      case 'full':
        return (
          <div 
            className="mt-3 rounded-lg relative overflow-hidden"
            style={{
              minHeight: '64px',
              background: config.gradient,
            }}
          >
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-2 left-2 w-3 h-3 bg-white/20 rounded-full"></div>
            <div className="absolute top-2 right-2 w-8 h-2 bg-white/20 rounded"></div>
            <div className="absolute bottom-2 left-2 w-6 h-2 bg-white/20 rounded"></div>
            <div className="absolute bottom-2 right-2 w-4 h-2 bg-white/20 rounded"></div>
          </div>
        );
      case 'minimal':
        return (
          <div 
            className="mt-2 rounded-full"
            style={{
              minHeight: '8px',
              background: config.gradient,
              opacity: 0.6,
            }}
          />
        );
      default:
        return (
          <div 
            className="mt-2 rounded"
            style={{
              minHeight: '32px',
              background: config.gradient,
              opacity: 0.8,
            }}
          />
        );
    }
  }, [previewMode]);

  const themes = filteredThemes;
  const categoryList = categories;

  return (
    <div className={`${isWindow ? 'h-full' : 'fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4'}`}>
      <div 
        style={themeStyles.container}
        className={`rounded-xl ${
          isWindow ? 'h-full flex flex-col' : 'w-full max-w-4xl max-h-[90vh] overflow-hidden'
        }`}
      >
        {/* Header */}
        <div 
          style={themeStyles.header}
          className="p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">🎨</span>
              <div>
                <h2 
                  className="text-2xl font-bold"
                  style={{ color: getColor('gray.900', colorMode) }}
                >
                  Theme Selector
                </h2>
                <p 
                  className="text-sm"
                  style={{ color: getColor('gray.600', colorMode) }}
                >
                  Choose from {allThemes.length} beautiful themes
                </p>
              </div>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 transition-colors rounded-lg hover:bg-opacity-20"
                style={{ 
                  color: getColor('gray.500', colorMode),
                  backgroundColor: getColor('glass.light.10', colorMode),
                }}
                aria-label="Close theme selector"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search and Controls */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search themes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                style={themeStyles.searchInput}
                className="w-full px-4 py-3 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span 
                className="text-sm"
                style={{ color: getColor('gray.600', colorMode) }}
              >
                Preview:
              </span>
              <div 
                className="flex rounded-lg p-1"
                style={{ backgroundColor: getColor('gray.100', colorMode) }}
              >
                {(['gradient', 'full', 'minimal'] as const).map((mode) => (
                  <button
                    type="button"
                    key={mode}
                    onClick={() => handlePreviewModeChange(mode)}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      previewMode === mode
                        ? 'shadow-sm'
                        : 'hover:text-gray-900'
                    }`}
                    style={{
                      backgroundColor: previewMode === mode 
                        ? getColor('white', colorMode) 
                        : 'transparent',
                      color: previewMode === mode 
                        ? getColor('gray.900', colorMode) 
                        : getColor('gray.600', colorMode),
                    }}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div 
          className="p-4"
          style={{ 
            backgroundColor: getColor('gray.50', colorMode),
            borderBottom: `1px solid ${getColor('gray.200', colorMode)}`,
          }}
        >
          <div className="flex flex-wrap gap-2">
            {categoryList.map((category) => (
              <button
                type="button"
                key={category}
                onClick={() => setActiveCategory(category)}
                style={themeStyles.categoryTab(activeCategory === category)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg"
              >
                {category === 'all' ? 'All Themes' : category}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {themes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {themes.map((themeVariant, index) => {
                const config = themeConfigs[themeVariant];
                const isSelected = theme === themeVariant;
                const isHighlighted = index === selectedIndex;
                
                return (
                  <button
                    key={themeVariant}
                    type="button"
                    onClick={() => handleThemeSelect(themeVariant)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    onFocus={() => handleFocus(index)}
                    style={themeStyles.themeCard(isSelected, isHighlighted)}
                    className="p-4 rounded-xl text-left group relative"
                    aria-label={`Select theme ${config.name}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-3xl">{config.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div 
                          className="font-semibold truncate"
                          style={{ color: getColor('gray.900', colorMode) }}
                        >
                          {config.name}
                        </div>
                        <div 
                          className="text-sm mt-1 line-clamp-2"
                          style={{ color: getColor('gray.500', colorMode) }}
                        >
                          {config.description}
                        </div>
                        <div 
                          className="text-xs mt-2"
                          style={{ color: getColor('gray.400', colorMode) }}
                        >
                          {config.category}
                        </div>
                      </div>
                      {isSelected && (
                        <div 
                          className="text-xl"
                          style={{ color: getColor('primary.500', colorMode) }}
                        >
                          ✓
                        </div>
                      )}
                    </div>
                    
                    {/* Theme preview */}
                    {renderThemePreview(themeVariant)}
                    
                    {/* Enhanced hover effect */}
                    <div 
                      className="absolute inset-0 rounded-xl transition-opacity"
                      style={{ 
                        background: config.gradient,
                        opacity: isSelected ? 0 : 0.1,
                        transition: prefersReducedMotion ? 'none' : `opacity ${animation.duration.normal} ${animation.easing.smooth}`,
                      }}
                    />
                  </button>
                );
              })}
            </div>
          ) : searchQuery.trim() ? (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">🎨</span>
              <p 
                className="mb-2"
                style={{ color: getColor('gray.600', colorMode) }}
              >
                No themes found for "{searchQuery}"
              </p>
              <p 
                className="text-sm"
                style={{ color: getColor('gray.500', colorMode) }}
              >
                Try different keywords or check your spelling
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <span className="text-6xl mb-4 block">🎨</span>
              <p style={{ color: getColor('gray.600', colorMode) }}>
                No themes available in this category
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          style={themeStyles.footer}
          className="p-6"
        >
          <div className="flex items-center justify-between text-sm">
            <div 
              className="flex items-center space-x-6"
              style={{ color: getColor('gray.600', colorMode) }}
            >
              <span>↑↓ Navigate</span>
              <span>Enter Select</span>
              <span>Space Cycle Filtered</span>
              <span>Esc Close</span>
            </div>
            <div className="flex items-center space-x-4">
              <span style={{ color: getColor('gray.600', colorMode) }}>
                {themes.length} of {allThemes.length} theme{themes.length !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (themes.length > 0) {
                    const currentIndex = themes.findIndex(t => t === theme);
                    const nextIndex = currentIndex < themes.length - 1 ? currentIndex + 1 : 0;
                    if (themes[nextIndex] !== undefined) handleThemeSelect(themes[nextIndex]);
                  }
                }}
                disabled={themes.length === 0}
                className="px-3 py-1.5 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                style={{
                  backgroundColor: getColor('primary.500', colorMode),
                  color: getColor('white', colorMode),
                }}
              >
                Cycle Filtered
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

ThemeSelector.displayName = 'ThemeSelector'; 