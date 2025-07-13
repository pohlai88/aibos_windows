import { theme, ThemeMode } from './themeWrapper.ts';
import type { ColorPaths, GradientPaths } from './designTokens.ts';
import type { CSSProperties } from 'https://esm.sh/react@18.2.0';

// ============================================================================
// STRONGLY TYPED THEME HELPERS
// ============================================================================

/**
 * Get color with full type safety
 */
export function getColor(path: ColorPaths, mode: ThemeMode = 'light'): string {
  const themeColors = theme[mode].colors;
  const keys = path.split('.') as (keyof typeof themeColors)[];
  let value: Record<string, unknown> = themeColors as Record<string, unknown>;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key] as Record<string, unknown>;
    } else {
      console.warn(`Color path "${path}" not found in ${mode} theme, falling back to light theme`);
      return getColor(path, 'light');
    }
  }
  
  return typeof value === 'string' ? value : getColor(path, 'light');
}

/**
 * Get gradient with full type safety
 */
export function getGradient(path: GradientPaths, mode: ThemeMode = 'light'): string {
  const themeGradients = theme[mode].gradients;
  const keys = path.split('.') as (keyof typeof themeGradients)[];
  let value: Record<string, unknown> = themeGradients as Record<string, unknown>;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key] as Record<string, unknown>;
    } else {
      console.warn(`Gradient path "${path}" not found in ${mode} theme, falling back to light theme`);
      return getGradient(path, 'light');
    }
  }
  
  return typeof value === 'string' ? value : getGradient(path, 'light');
}

/**
 * Get CSS variable name for color
 */
export function getColorVar(path: ColorPaths): string {
  return `--aibos-${path.replace(/\./g, '-')}`;
}

/**
 * Get CSS variable name for gradient
 */
export function getGradientVar(path: GradientPaths): string {
  return `--aibos-gradient-${path.replace(/\./g, '-')}`;
}

/**
 * Get CSS variable value with fallback
 */
export function getColorVarValue(path: ColorPaths, mode: ThemeMode = 'light'): string {
  return `var(${getColorVar(path)}, ${getColor(path, mode)})`;
}

/**
 * Get gradient CSS variable value with fallback
 */
export function getGradientVarValue(path: GradientPaths, mode: ThemeMode = 'light'): string {
  return `var(${getGradientVar(path)}, ${getGradient(path, mode)})`;
}

// ============================================================================
// THEME SWITCHING UTILITIES
// ============================================================================

/**
 * Generate CSS variables for current theme
 */
export function generateThemeCSS(mode: ThemeMode): string {
  const currentTheme = theme[mode];
  let css = `:root {\n`;
  
  // Generate color variables
  Object.entries(currentTheme.colors).forEach(([category, colors]) => {
    if (typeof colors === 'object' && colors !== null) {
      Object.entries(colors).forEach(([name, value]) => {
        if (typeof value === 'object' && value !== null) {
          Object.entries(value).forEach(([shade, color]) => {
            css += `  --aibos-${category}-${name}-${shade}: ${color};\n`;
          });
        } else {
          css += `  --aibos-${category}-${name}: ${value};\n`;
        }
      });
    } else {
      css += `  --aibos-${category}: ${colors};\n`;
    }
  });
  
  // Generate gradient variables
  Object.entries(currentTheme.gradients).forEach(([category, gradients]) => {
    Object.entries(gradients).forEach(([name, gradient]) => {
      css += `  --aibos-gradient-${category}-${name}: ${gradient};\n`;
    });
  });
  
  css += `}\n`;
  return css;
}

/**
 * Apply theme to document with CSS variables
 */
export function applyThemeWithCSS(mode: ThemeMode): void {
  const css = generateThemeCSS(mode);
  
  // Remove existing theme styles
  const existingStyle = document.getElementById('aibos-theme-vars');
  if (existingStyle) {
    existingStyle.remove();
  }
  
  // Add new theme styles
  const style = document.createElement('style');
  style.id = 'aibos-theme-vars';
  style.textContent = css;
  document.head.appendChild(style);
  
  // Set data attribute for CSS targeting
  document.documentElement.setAttribute('data-theme', mode);
}

// ============================================================================
// COMPONENT HELPERS
// ============================================================================

/**
 * Create glassmorphism style object
 */
export function createGlassStyle(
  opacity: '10' | '20' | '30' | '40' | '50' | '60' | '70' | '80' | '90' = '20',
  mode: ThemeMode = 'light',
  blur: keyof typeof theme.light.blur = 'md'
): CSSProperties {
  const nextOpacity = String(Number(opacity) + 10) as '10' | '20' | '30' | '40' | '50' | '60' | '70' | '80' | '90';
  return {
    backgroundColor: getColorVarValue(`glass.${mode}.${opacity}` as ColorPaths, mode),
    backdropFilter: `blur(${theme[mode].blur[blur]})`,
    border: `1px solid ${getColorVarValue(`glass.${mode}.${nextOpacity}` as ColorPaths, mode)}`,
    boxShadow: theme[mode].elevation.glass?.[mode] || theme[mode].elevation.md,
  };
}

/**
 * Create gradient background style
 */
export function createGradientStyle(
  path: GradientPaths,
  mode: ThemeMode = 'light'
): CSSProperties {
  return {
    backgroundImage: getGradientVarValue(path, mode),
  };
}

/**
 * Create button style with glass effect
 */
export function createGlassButtonStyle(
  variant: 'primary' | 'secondary' | 'success' | 'warning' | 'error' = 'primary',
  mode: ThemeMode = 'light'
): CSSProperties {
  const baseStyle = createGlassStyle('30', mode, 'sm');
  
  const variantColors = {
    primary: getColorVarValue('primary.500', mode),
    secondary: getColorVarValue('accent.500', mode),
    success: getColorVarValue('success.500', mode),
    warning: getColorVarValue('warning.500', mode),
    error: getColorVarValue('error.500', mode),
  };
  
  const variantColorMap = {
    primary: 'primary.600',
    secondary: 'accent.600',
    success: 'success.600',
    warning: 'warning.600',
    error: 'error.600',
  } as const;
  
  return {
    ...baseStyle,
    background: `linear-gradient(135deg, ${variantColors[variant]}, ${getColorVarValue(variantColorMap[variant] as ColorPaths, mode)})`,
    color: mode === 'light' ? '#ffffff' : '#000000',
  };
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { ThemeMode, ColorPaths, GradientPaths }; 