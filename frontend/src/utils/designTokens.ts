/**
 * AIBOS Design Token System
 * 
 * This file contains all design tokens for the AIBOS platform.
 * These tokens ensure consistency across the entire application
 * and enable easy theming and customization.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ColorPaths =
  | 'white'
  | 'black'
  | `gray.${keyof typeof colors.gray}`
  | `primary.${keyof typeof colors.primary}`
  | `accent.${keyof typeof colors.accent}`
  | `success.${keyof typeof colors.success}`
  | `warning.${keyof typeof colors.warning}`
  | `error.${keyof typeof colors.error}`
  | `info.${keyof typeof colors.info}`
  | `glass.light.${keyof typeof colors.glass.light}`
  | `glass.dark.${keyof typeof colors.glass.dark}`;

export type GradientPaths =
  | `professional.${keyof typeof gradients.professional}`
  | `nature.${keyof typeof gradients.nature}`
  | `cosmic.${keyof typeof gradients.cosmic}`
  | `branded.${keyof typeof gradients.branded}`;

// ============================================================================
// COLOR TOKENS
// ============================================================================

export const colors = {
  // Base colors
  white: '#ffffff',
  black: '#000000',
  
  // Gray scale
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  
  // Primary brand colors
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  
  // Accent colors
  accent: {
    50: '#fdf4ff',
    100: '#fae8ff',
    200: '#f5d0fe',
    300: '#f0abfc',
    400: '#e879f9',
    500: '#d946ef',
    600: '#c026d3',
    700: '#a21caf',
    800: '#86198f',
    900: '#701a75',
  },
  
  // Semantic colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  
  // Glassmorphism colors
  glass: {
    light: {
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
    dark: {
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
  },
} as const;

// ============================================================================
// GRADIENT TOKENS
// ============================================================================

export const gradients = {
  // Professional gradients
  professional: {
    nebula: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    slate: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
    carbon: 'linear-gradient(180deg, #1e1e1e 0%, #2c2c2c 100%)',
    steel: 'linear-gradient(135deg, #374151 0%, #4b5563 50%, #6b7280 100%)',
  },
  
  // Nature gradients
  nature: {
    ocean: 'linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #0ea5e9 100%)',
    sunset: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #ec4899 100%)',
    forest: 'linear-gradient(135deg, #14532d 0%, #15803d 50%, #16a34a 100%)',
    aurora: 'linear-gradient(135deg, #16a34a 0%, #0ea5e9 50%, #8b5cf6 100%)',
  },
  
  // Cosmic gradients
  cosmic: {
    galaxy: 'linear-gradient(135deg, #1e1b4b 0%, #3730a3 50%, #7c3aed 100%)',
    nebula: 'linear-gradient(135deg, #581c87 0%, #7c3aed 50%, #ec4899 100%)',
    cosmic: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
    aurora: 'linear-gradient(135deg, #059669 0%, #0ea5e9 50%, #8b5cf6 100%)',
  },
  
  // Brand gradients
  branded: {
    primary: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a855f7 100%)',
    accent: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 50%, #f97316 100%)',
    success: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
    warning: 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)',
  },
} as const;

// ============================================================================
// BLUR TOKENS
// ============================================================================

export const blur = {
  none: '0px',
  xs: '2px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  '3xl': '40px',
} as const;

// ============================================================================
// ELEVATION TOKENS (Shadows)
// ============================================================================

export const elevation = {
  none: 'none',
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  
  // Glassmorphism shadows
  glass: {
    light: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
    dark: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  },
  
  // Inner shadows
  inner: {
    sm: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    md: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.1)',
    lg: 'inset 0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
} as const;

// ============================================================================
// TYPOGRAPHY TOKENS
// ============================================================================

export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    mono: ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
    serif: ['Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
  },
  
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',     // 48px
    '6xl': '3.75rem',  // 60px
  },
  
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
  
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// ============================================================================
// BORDER RADIUS TOKENS
// ============================================================================

export const borderRadius = {
  none: '0px',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
} as const;

// ============================================================================
// SPACING TOKENS
// ============================================================================

export const spacing = {
  0: '0px',
  px: '1px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
  36: '9rem',       // 144px
  40: '10rem',      // 160px
  44: '11rem',      // 176px
  48: '12rem',      // 192px
  52: '13rem',      // 208px
  56: '14rem',      // 224px
  60: '15rem',      // 240px
  64: '16rem',      // 256px
  72: '18rem',      // 288px
  80: '20rem',      // 320px
  96: '24rem',      // 384px
} as const;

// ============================================================================
// ANIMATION TOKENS
// ============================================================================

export const animation = {
  // Duration
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slower: '700ms',
    slowest: '1000ms',
  },
  
  // Easing functions
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    // Custom easing curves
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },
  
  // Keyframe animations
  keyframes: {
    fadeIn: {
      '0%': { opacity: '0' },
      '100%': { opacity: '1' },
    },
    fadeOut: {
      '0%': { opacity: '1' },
      '100%': { opacity: '0' },
    },
    slideUp: {
      '0%': { transform: 'translateY(10px)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    slideDown: {
      '0%': { transform: 'translateY(-10px)', opacity: '0' },
      '100%': { transform: 'translateY(0)', opacity: '1' },
    },
    scaleIn: {
      '0%': { transform: 'scale(0.95)', opacity: '0' },
      '100%': { transform: 'scale(1)', opacity: '1' },
    },
    scaleOut: {
      '0%': { transform: 'scale(1)', opacity: '1' },
      '100%': { transform: 'scale(0.95)', opacity: '0' },
    },
    bounceSoft: {
      '0%, 100%': { transform: 'translateY(0)' },
      '50%': { transform: 'translateY(-5px)' },
    },
    pulse: {
      '0%, 100%': { opacity: '1' },
      '50%': { opacity: '0.5' },
    },
    spin: {
      '0%': { transform: 'rotate(0deg)' },
      '100%': { transform: 'rotate(360deg)' },
    },
  },
  
  // Animation classes
  classes: {
    fadeIn: 'fadeIn 0.3s ease-in-out',
    fadeOut: 'fadeOut 0.3s ease-in-out',
    slideUp: 'slideUp 0.3s ease-out',
    slideDown: 'slideDown 0.3s ease-out',
    scaleIn: 'scaleIn 0.2s ease-out',
    scaleOut: 'scaleOut 0.2s ease-out',
    bounceSoft: 'bounceSoft 0.6s ease-in-out',
    pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    spin: 'spin 1s linear infinite',
  },
} as const;

// ============================================================================
// Z-INDEX TOKENS
// ============================================================================

export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1020,
  banner: 1030,
  overlay: 1040,
  modal: 1050,
  popover: 1060,
  skipLink: 1070,
  toast: 1080,
  tooltip: 1090,
} as const;

// ============================================================================
// BREAKPOINT TOKENS
// ============================================================================

export const breakpoints = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================================================
// EXPORT ALL TOKENS
// ============================================================================

export const designTokens = {
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
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get a color value by path with strong typing
 */
export function getColor(path: ColorPaths): string {
  const keys = path.split('.');
  let value: unknown = colors;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      throw new Error(`Color path "${path}" not found`);
    }
  }
  
  if (typeof value === 'string') {
    return value;
  }
  throw new Error(`Color path "${path}" does not resolve to a string`);
}

/**
 * Get a gradient value by path with strong typing
 */
export function getGradient(path: GradientPaths): string {
  const keys = path.split('.');
  let value: unknown = gradients;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      throw new Error(`Gradient path "${path}" not found`);
    }
  }
  
  if (typeof value === 'string') {
    return value;
  }
  throw new Error(`Gradient path "${path}" does not resolve to a string`);
}

/**
 * Get a spacing value
 */
export function getSpacing(size: keyof typeof spacing): string {
  return spacing[size];
}

/**
 * Get an animation duration
 */
export function getAnimationDuration(type: keyof typeof animation.duration): string {
  return animation.duration[type];
}

/**
 * Get an animation easing
 */
export function getAnimationEasing(type: keyof typeof animation.easing): string {
  return animation.easing[type];
}

export default designTokens; 