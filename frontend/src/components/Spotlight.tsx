/** @jsxImportSource react */
import { memo, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useUIState } from '../store/uiState.ts';
import { searchRegistry } from '../services/searchRegistry.ts';
import { enhancedSearchProvider } from '../services/enhancedSearchProvider.ts';
import { getColor, getGradient } from '../utils/themeHelpers.ts';

import { animation } from '../utils/designTokens.ts';
import { useDeviceInfo } from '../utils/responsive.ts';

// Simple debounce utility for Deno compatibility
function debounce(fn: (q: string) => void, wait: number): ((q: string) => void) & { cancel: () => void } {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const debounced = (q: string) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(q), wait);
  };
  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout);
    timeout = null;
  };
  return debounced;
}

import type { SearchResult } from '../types/search.ts';

export const Spotlight = memo(() => {
  const { spotlightVisible, closeSpotlight, colorMode } = useUIState();
  const deviceInfo = useDeviceInfo();
  const { isMobile, isTablet } = deviceInfo;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [quickAccess, setQuickAccess] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resultLimit = isMobile ? 6 : isTablet ? 8 : 10;

  // Performance: Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => 
    typeof window !== 'undefined' && globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches, 
    []
  );

  // Performance: Memoized theme-aware styles
  const themeStyles = useMemo(() => ({
    overlay: {
      backgroundColor: getColor('glass.dark.60', colorMode),
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
    resultItem: (isSelected: boolean) => ({
      backgroundColor: isSelected 
        ? getColor('glass.light.40', colorMode) 
        : getColor('glass.light.10', colorMode),
      backdropFilter: `blur(4px)`,
      border: isSelected 
        ? `1px solid ${getColor('glass.light.50', colorMode)}` 
        : '1px solid transparent',
      boxShadow: isSelected 
        ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' 
        : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    }),
    footer: {
      backgroundColor: getColor('glass.light.20', colorMode),
      backdropFilter: `blur(4px)`,
      borderTop: `1px solid ${getColor('glass.light.30', colorMode)}`,
    },
    transition: prefersReducedMotion ? 'none' : `all ${animation.duration.normal} ${animation.easing.smooth}`,
  }), [colorMode, prefersReducedMotion]);

  // Focus management with performance optimization
  useEffect(() => {
    if (spotlightVisible) {
      setQuery('');
      setSelectedIndex(0);
      setResults([]);
      
      // Load quick access items
      searchRegistry.getQuickAccess(8).then((items: SearchResult[]) => {
        setQuickAccess(items);
      });

      // Load search history and suggestions
      setSearchHistory(enhancedSearchProvider.getSearchHistory());
      setSuggestions([]);

      // Performance: Use requestAnimationFrame instead of setTimeout
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [spotlightVisible]);

  // Debounced search handler with memoization
  const debouncedSearch = useMemo(() => debounce((q: string) => {
    setIsLoading(true);
    setResults([]);
    let allResults: SearchResult[] = [];
    
    searchRegistry.searchStream(q, (partial: SearchResult[]) => {
      allResults = [...allResults, ...partial];
      // Remove duplicates by id
      const unique = Array.from(new Map(allResults.map(r => [r.id, r])).values());
      setResults(unique.slice(0, resultLimit));
    }, resultLimit).then((finalResults: SearchResult[]) => {
      setIsLoading(false);
      setResults(finalResults.slice(0, resultLimit));
      setSelectedIndex(0);
    });
  }, 200), []);

  // Search functionality with enhanced features
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      setSuggestions([]);
      return;
    }

    // Update suggestions
    const newSuggestions = enhancedSearchProvider.getSuggestions(query);
    setSuggestions(newSuggestions);

    // Perform search
    debouncedSearch(query);
    return () => {
      debouncedSearch.cancel();
    };
  }, [query, debouncedSearch]);

  // Keyboard navigation with accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        closeSpotlight();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          results[selectedIndex].action();
        }
        break;
      case 'Tab':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
    }
  }, [results, selectedIndex, closeSpotlight]);

  // Handle result selection
  const handleResultClick = useCallback((result: SearchResult) => {
    result.action();
  }, []);

  // Focus trap for accessibility
  useEffect(() => {
    if (!spotlightVisible) return;

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
  }, [spotlightVisible]);

  if (!spotlightVisible) return null;

  return (
    <div 
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Spotlight Search"
      style={themeStyles.overlay}
      className={`fixed inset-0 flex items-center justify-center z-[9999] ${
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
              ? 'max-w-xl max-h-[80vh]' 
              : 'max-w-2xl max-h-[80vh]'
        }`}
      >
        {/* Header */}
        <div 
          style={themeStyles.header}
          className={`${isMobile ? 'p-3' : 'p-4'}`}
        >
          <div className="flex items-center space-x-3">
            <span className={`${isMobile ? 'text-xl' : 'text-2xl'}`} aria-hidden="true">🔍</span>
            <div className="flex-1">
              <input
                ref={inputRef}
                type="text"
                placeholder={isMobile ? "Search..." : "Search apps, commands, shortcuts, and settings..."}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                style={themeStyles.input}
                className={`w-full px-4 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isMobile 
                    ? 'py-2 text-base' 
                    : 'py-3 text-lg'
                }`}
                aria-label="Search input"
                aria-describedby="search-results"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
                isMobile ? 'p-1' : 'p-2'
              }`}
              aria-label="Toggle search filters"
            >
              ⚙️
            </button>
            <button
              type="button"
              onClick={closeSpotlight}
              className={`text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${
                isMobile ? 'p-1' : 'p-2'
              }`}
              aria-label="Close spotlight"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Search Suggestions */}
        {suggestions.length > 0 && !results.length && (
          <div className={`${isMobile ? 'p-2' : 'p-3'} border-b border-gray-200 dark:border-gray-700`}>
            <div className={`text-sm text-gray-600 dark:text-gray-400 mb-2 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>
              Suggestions
            </div>
            <div className="space-y-1">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setQuery(suggestion)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    isMobile ? 'text-xs' : 'text-sm'
                  }`}
                >
                  🔍 {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Filters */}
        {showFilters && (
          <div className={`${isMobile ? 'p-2' : 'p-3'} border-b border-gray-200 dark:border-gray-700`}>
            <div className={`text-sm text-gray-600 dark:text-gray-400 mb-2 ${
              isMobile ? 'text-xs' : 'text-sm'
            }`}>
              Quick Filters
            </div>
            <div className="flex flex-wrap gap-2">
              {['type:file', 'type:dir', 'ext:js', 'ext:ts', 'ext:md', 'size:1m', 'date:7'].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setQuery(prev => `${prev} ${filter}`)}
                  className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        <div 
          id="search-results"
          role="listbox"
          aria-label="Search results"
          className={`overflow-y-auto ${
            isMobile 
              ? 'max-h-64' 
              : isTablet 
                ? 'max-h-80' 
                : 'max-h-96'
          }`}
        >
          {isLoading ? (
            <div className={`text-center ${isMobile ? 'p-6' : 'p-8'}`}>
              <div 
                className="inline-block rounded-full h-8 w-8 border-b-2 border-blue-500"
                style={{ animation: prefersReducedMotion ? 'none' : 'spin 1s linear infinite' }}
                aria-label="Loading search results"
              />
              <p className="mt-2 text-gray-600 dark:text-gray-400">Searching...</p>
            </div>
          ) : results.length > 0 ? (
            <div className={`${isMobile ? 'p-1' : 'p-2'}`}>
              {results.map((result, index) => (
                <button
                  key={result.id}
                  type="button"
                  role="option"
                  aria-selected={index === selectedIndex}
                  style={{
                    ...themeStyles.resultItem(index === selectedIndex),
                    transition: themeStyles.transition,
                  }}
                  className={`w-full text-left rounded-lg flex items-center space-x-3 ${
                    isMobile 
                      ? 'p-3' 
                      : 'p-4'
                  }`}
                  onClick={() => handleResultClick(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className={`${isMobile ? 'text-xl' : 'text-2xl'} flex-shrink-0`} aria-hidden="true">{result.icon || '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium text-gray-900 dark:text-gray-100 truncate ${
                      isMobile ? 'text-sm' : 'text-base'
                    }`}>
                      {result.title}
                    </div>
                    {result.description && (
                      <div className={`text-gray-500 dark:text-gray-400 truncate ${
                        isMobile ? 'text-xs' : 'text-sm'
                      }`}>
                        {result.description}
                      </div>
                    )}
                    {result.category && !isMobile && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {result.category}
                      </div>
                    )}
                  </div>
                  {!isMobile && (
                    <div className="flex-shrink-0">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        result.type === 'app' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        result.type === 'command' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        result.type === 'file' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {result.type}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : query.trim() ? (
            <div className={`text-center ${isMobile ? 'p-6' : 'p-8'}`}>
              <span className={`${isMobile ? 'text-3xl' : 'text-4xl'} mb-4 block`} aria-hidden="true">🔍</span>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                No results found for "{query}"
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
              <div className={`grid gap-2 ${
                isMobile 
                  ? 'grid-cols-1' 
                  : isTablet 
                    ? 'grid-cols-1 sm:grid-cols-2' 
                    : 'grid-cols-1 sm:grid-cols-2'
              }`}>
                {quickAccess.length > 0 ? (
                  quickAccess.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`w-full text-left rounded-lg transition-all duration-200 flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        isMobile ? 'p-2' : 'p-3'
                      }`}
                      onClick={() => item.action()}
                    >
                      <span className={`${isMobile ? 'text-lg' : 'text-xl'} flex-shrink-0`} aria-hidden="true">{item.icon || '📄'}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-gray-900 dark:text-gray-100 truncate ${
                          isMobile ? 'text-sm' : 'text-base'
                        }`}>
                          {item.title}
                        </div>
                        {item.description && !isMobile && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-4">
                    <span className={`${isMobile ? 'text-xl' : 'text-2xl'} mb-2 block`} aria-hidden="true">🚀</span>
                    <p className="text-gray-500 dark:text-gray-400">
                      {isMobile ? 'Start typing to search' : 'Start typing to search apps, commands, and more'}
                    </p>
                  </div>
                )}
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
                <span>⚙️ Filters</span>
              </div>
              <div className="flex items-center space-x-4">
                {results.length > 0 && (
                  <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
                )}
                {searchHistory.length > 0 && (
                  <span>{searchHistory.length} recent searches</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

Spotlight.displayName = 'Spotlight';
