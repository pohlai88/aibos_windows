import { colors, gradients, blur, elevation, typography, borderRadius, spacing, animation, zIndex, breakpoints } from './designTokens.ts';

// ============================================================================
// THEME WRAPPER
// ============================================================================

export const theme = {
  light: {
    colors,
    gradients,
    blur,
    elevation,
    typography,
    borderRadius,
    spacing,
    animation,
    zIndex,
    breakpoints,
  },
  dark: {
    colors: {
      // Base colors (inverted for dark mode)
      white: '#000000',
      black: '#ffffff',
      
      // Gray scale (inverted)
      gray: {
        50: '#111827',
        100: '#1f2937',
        200: '#374151',
        300: '#4b5563',
        400: '#6b7280',
        500: '#9ca3af',
        600: '#d1d5db',
        700: '#e5e7eb',
        800: '#f3f4f6',
        900: '#f9fafb',
      },
      
      // Primary brand colors (adjusted for dark mode)
      primary: {
        50: '#0c4a6e',
        100: '#075985',
        200: '#0369a1',
        300: '#0284c7',
        400: '#0ea5e9',
        500: '#38bdf8',
        600: '#7dd3fc',
        700: '#bae6fd',
        800: '#e0f2fe',
        900: '#f0f9ff',
      },
      
      // Accent colors (adjusted for dark mode)
      accent: {
        50: '#701a75',
        100: '#86198f',
        200: '#a21caf',
        300: '#c026d3',
        400: '#d946ef',
        500: '#e879f9',
        600: '#f0abfc',
        700: '#f5d0fe',
        800: '#fae8ff',
        900: '#fdf4ff',
      },
      
      // Semantic colors (adjusted for dark mode)
      success: {
        50: '#14532d',
        100: '#166534',
        200: '#15803d',
        300: '#16a34a',
        400: '#22c55e',
        500: '#4ade80',
        600: '#86efac',
        700: '#bbf7d0',
        800: '#dcfce7',
        900: '#f0fdf4',
      },
      
      warning: {
        50: '#78350f',
        100: '#92400e',
        200: '#b45309',
        300: '#d97706',
        400: '#f59e0b',
        500: '#fbbf24',
        600: '#fcd34d',
        700: '#fde68a',
        800: '#fef3c7',
        900: '#fffbeb',
      },
      
      error: {
        50: '#7f1d1d',
        100: '#991b1b',
        200: '#b91c1c',
        300: '#dc2626',
        400: '#ef4444',
        500: '#f87171',
        600: '#fca5a5',
        700: '#fecaca',
        800: '#fee2e2',
        900: '#fef2f2',
      },
      
      info: {
        50: '#1e3a8a',
        100: '#1e40af',
        200: '#1d4ed8',
        300: '#2563eb',
        400: '#3b82f6',
        500: '#60a5fa',
        600: '#93c5fd',
        700: '#bfdbfe',
        800: '#dbeafe',
        900: '#eff6ff',
      },
      
      // Glassmorphism colors (inverted for dark mode)
      glass: {
        light: {
          10: 'rgba(0, 0, 0, 0.1)',
          20: 'rgba(0, 0, 0, 0.2)',
          30: 'rgba(0, 0, 0, 0.3)',
          40: 'rgba(0, 0, 0, 0.4)',
          50: 'rgba(0, 0, 0, 0.5)',
          60: 'rgba(0, 0, 0, 0.6)',
          70: 'rgba(0, 0, 0, 0.7)',
          80: 'rgba(0, 0, 0, 0.8)',
          90: 'rgba(0, 0, 0, 0.9)',
        },
        dark: {
          10: 'rgba(255, 255, 255, 0.1)',
          20: 'rgba(255, 255, 255, 0.2)',
          30: 'rgba(255, 255, 255, 0.3)',
          40: 'rgba(255, 255, 255, 0.4)',
          50: 'rgba(255, 255, 255, 0.5)',
          60: 'rgba(255, 255, 255, 0.6)',
          70: 'rgba(255, 255, 255, 0.7)',
          80: 'rgba(255, 255, 255, 0.8)',
          90: 'rgba(255, 255, 255, 0.9)',
        },
      },
    },
    gradients,
    blur,
    elevation: {
      ...elevation,
      // Dark mode specific shadows (light glows)
      darkLg: '0 10px 15px -3px rgba(255, 255, 255, 0.1)',
      darkXl: '0 20px 25px -5px rgba(255, 255, 255, 0.1)',
      dark2xl: '0 25px 50px -12px rgba(255, 255, 255, 0.25)',
    },
    typography,
    borderRadius,
    spacing,
    animation,
    zIndex,
    breakpoints,
  },
} as const;

// ============================================================================
// THEME UTILITIES
// ============================================================================

export type ThemeMode = 'light' | 'dark';

/**
 * Get current theme based on mode
 */
export function getTheme(mode: ThemeMode) {
  return theme[mode];
}

/**
 * Get color from specific theme
 */
export function getThemeColor(mode: ThemeMode, path: string): string {
  const themeColors = theme[mode].colors;
  const keys = path.split('.');
  let value: unknown = themeColors;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      throw new Error(`Color path "${path}" not found in ${mode} theme`);
    }
  }
  
  if (typeof value === 'string') {
    return value;
  }
  throw new Error(`Color path "${path}" does not resolve to a string`);
}

/**
 * Apply theme to document
 */
export function applyTheme(mode: ThemeMode): void {
  const currentTheme = theme[mode];
  const root = document.documentElement;
  
  // Set theme mode class
  root.classList.remove('light', 'dark');
  root.classList.add(mode);
  
  // Apply CSS custom properties
  Object.entries(currentTheme.colors).forEach(([category, categoryColors]) => {
    if (typeof categoryColors === 'object') {
      Object.entries(categoryColors).forEach(([shade, color]) => {
        if (typeof color === 'string') {
          root.style.setProperty(`--color-${category}-${shade}`, color);
        }
      });
    }
  });
  
  // Apply gradients
  Object.entries(currentTheme.gradients).forEach(([category, categoryGradients]) => {
    Object.entries(categoryGradients).forEach(([name, gradient]) => {
      root.style.setProperty(`--gradient-${category}-${name}`, gradient);
    });
  });
}

export default theme; 