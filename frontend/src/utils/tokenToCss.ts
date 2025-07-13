import { designTokens } from './designTokens.ts';

// ============================================================================
// TOKEN TO CSS UTILITIES
// ============================================================================

type TokenObject = Record<string, string | Record<string, unknown> | unknown>;

/**
 * Converts a token object to CSS variables
 */
export function generateCssVars(
  tokens: TokenObject,
  prefix = '--aibos'
): string {
  const lines: string[] = [];

  function process(obj: TokenObject, path: string[]) {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        const varName = [...path, key].join('-');
        lines.push(`${prefix}-${varName}: ${value};`);
      } else if (typeof value === 'object' && value !== null) {
        process(value as TokenObject, [...path, key]);
      }
    }
  }

  process(tokens, []);

  return `:root {\n  ${lines.join('\n  ')}\n}`;
}

/**
 * Generate CSS variables for all design tokens
 */
export function generateAllCssVars(): string {
  return generateCssVars(designTokens);
}

/**
 * Generate CSS variables for specific token category
 */
export function generateCssVarsForCategory(category: keyof typeof designTokens): string {
  return generateCssVars({ [category]: designTokens[category] });
}

/**
 * Generate CSS variables for colors only
 */
export function generateColorCssVars(): string {
  return generateCssVarsForCategory('colors');
}

/**
 * Generate CSS variables for gradients only
 */
export function generateGradientCssVars(): string {
  return generateCssVarsForCategory('gradients');
}

/**
 * Generate CSS variables for spacing only
 */
export function generateSpacingCssVars(): string {
  return generateCssVarsForCategory('spacing');
}

/**
 * Generate CSS variables for typography only
 */
export function generateTypographyCssVars(): string {
  return generateCssVarsForCategory('typography');
}

/**
 * Generate CSS variables for animation only
 */
export function generateAnimationCssVars(): string {
  return generateCssVarsForCategory('animation');
}

/**
 * Generate CSS variables for elevation only
 */
export function generateElevationCssVars(): string {
  return generateCssVarsForCategory('elevation');
}

/**
 * Generate CSS variables for border radius only
 */
export function generateBorderRadiusCssVars(): string {
  return generateCssVarsForCategory('borderRadius');
}

/**
 * Generate CSS variables for blur only
 */
export function generateBlurCssVars(): string {
  return generateCssVarsForCategory('blur');
}

/**
 * Generate CSS variables for z-index only
 */
export function generateZIndexCssVars(): string {
  return generateCssVarsForCategory('zIndex');
}

/**
 * Generate CSS variables for breakpoints only
 */
export function generateBreakpointCssVars(): string {
  return generateCssVarsForCategory('breakpoints');
}

/**
 * Generate complete CSS file with all variables
 */
export function generateCompleteCssFile(): string {
  return `/* AIBOS Design Token CSS Variables */
/* Generated automatically from design tokens */

${generateAllCssVars()}

/* Usage Examples */
.example {
  color: var(--aibos-colors-primary-500);
  background: var(--aibos-gradients-professional-nebula);
  padding: var(--aibos-spacing-4);
  border-radius: var(--aibos-borderRadius-lg);
  box-shadow: var(--aibos-elevation-md);
  font-size: var(--aibos-typography-fontSize-lg);
  font-weight: var(--aibos-typography-fontWeight-semibold);
  backdrop-filter: blur(var(--aibos-blur-md));
  z-index: var(--aibos-zIndex-modal);
  transition: all var(--aibos-animation-duration-normal) var(--aibos-animation-easing-smooth);
}

/* Responsive breakpoints */
@media (min-width: var(--aibos-breakpoints-sm)) {
  .responsive {
    padding: var(--aibos-spacing-6);
  }
}

@media (min-width: var(--aibos-breakpoints-md)) {
  .responsive {
    padding: var(--aibos-spacing-8);
  }
}

@media (min-width: var(--aibos-breakpoints-lg)) {
  .responsive {
    padding: var(--aibos-spacing-12);
  }
}
`;
}

/**
 * Generate CSS variables for a specific theme mode
 */
export function generateThemeCssVars(themeMode: 'light' | 'dark'): string {
  const prefix = `--aibos-${themeMode}`;
  return generateCssVars(designTokens, prefix);
}

/**
 * Generate CSS variables for both light and dark themes
 */
export function generateThemeModeCssVars(): string {
  return `/* Light Theme */
.light {
${generateThemeCssVars('light').replace(':root', '').trim()}
}

/* Dark Theme */
.dark {
${generateThemeCssVars('dark').replace(':root', '').trim()}
}`;
}

export default {
  generateCssVars,
  generateAllCssVars,
  generateCssVarsForCategory,
  generateColorCssVars,
  generateGradientCssVars,
  generateSpacingCssVars,
  generateTypographyCssVars,
  generateAnimationCssVars,
  generateElevationCssVars,
  generateBorderRadiusCssVars,
  generateBlurCssVars,
  generateZIndexCssVars,
  generateBreakpointCssVars,
  generateCompleteCssFile,
  generateThemeCssVars,
  generateThemeModeCssVars,
}; 