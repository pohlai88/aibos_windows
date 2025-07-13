import { gradients, colors } from './designTokens.ts';

// Theme types
export type ThemeVariant = 'nebula' | 'purple' | 'gray' | 'blue' | 'slate' | 'ocean' | 'sunset' | 'forest' | 'cosmic' | 'aurora';

// Theme configuration
export interface ThemeConfig {
  name: string;
  description: string;
  gradient: string;
  icon: string;
  category: 'professional' | 'nature' | 'cosmic' | 'branded';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
  };
}

// All available themes with beautiful gradients from design tokens
export const themeConfigs: Record<ThemeVariant, ThemeConfig> = {
  nebula: {
    name: 'Nebula',
    description: 'Professional deep space gradient',
    gradient: gradients.professional.nebula,
    icon: '🌌',
    category: 'professional',
    colors: {
      primary: colors.primary[600],
      secondary: colors.primary[400],
      accent: colors.accent[500],
      background: colors.gray[900],
      surface: colors.gray[800],
      text: colors.gray[100],
      textMuted: colors.gray[400],
    }
  },
  purple: {
    name: 'Purple',
    description: 'AI-BOS branded purple theme',
    gradient: gradients.branded.primary,
    icon: '💜',
    category: 'branded',
    colors: {
      primary: colors.accent[600],
      secondary: colors.accent[400],
      accent: colors.primary[500],
      background: colors.gray[900],
      surface: colors.gray[800],
      text: colors.gray[100],
      textMuted: colors.gray[400],
    }
  },
  gray: {
    name: 'Gray',
    description: 'Clean neutral gray theme',
    gradient: gradients.professional.slate,
    icon: '⚫',
    category: 'professional',
    colors: {
      primary: colors.gray[600],
      secondary: colors.gray[400],
      accent: colors.primary[500],
      background: colors.gray[900],
      surface: colors.gray[800],
      text: colors.gray[100],
      textMuted: colors.gray[400],
    }
  },
  blue: {
    name: 'Blue',
    description: 'Calming ocean blue theme',
    gradient: gradients.nature.ocean,
    icon: '🌊',
    category: 'nature',
    colors: {
      primary: colors.primary[600],
      secondary: colors.primary[400],
      accent: colors.accent[500],
      background: colors.primary[900],
      surface: colors.primary[800],
      text: colors.gray[100],
      textMuted: colors.gray[300],
    }
  },
  slate: {
    name: 'Slate',
    description: 'Elegant slate gradient',
    gradient: gradients.professional.slate,
    icon: '🪨',
    category: 'professional',
    colors: {
      primary: colors.gray[600],
      secondary: colors.gray[400],
      accent: colors.primary[500],
      background: colors.gray[900],
      surface: colors.gray[800],
      text: colors.gray[100],
      textMuted: colors.gray[400],
    }
  },
  ocean: {
    name: 'Ocean',
    description: 'Deep ocean depths',
    gradient: gradients.nature.ocean,
    icon: '🌊',
    category: 'nature',
    colors: {
      primary: colors.primary[600],
      secondary: colors.primary[400],
      accent: colors.accent[500],
      background: colors.primary[900],
      surface: colors.primary[800],
      text: colors.gray[100],
      textMuted: colors.gray[300],
    }
  },
  sunset: {
    name: 'Sunset',
    description: 'Warm sunset colors',
    gradient: gradients.nature.sunset,
    icon: '🌅',
    category: 'nature',
    colors: {
      primary: colors.warning[600],
      secondary: colors.warning[400],
      accent: colors.error[500],
      background: colors.warning[900],
      surface: colors.warning[800],
      text: colors.gray[100],
      textMuted: colors.gray[300],
    }
  },
  forest: {
    name: 'Forest',
    description: 'Deep forest green',
    gradient: gradients.nature.forest,
    icon: '🌲',
    category: 'nature',
    colors: {
      primary: colors.success[600],
      secondary: colors.success[400],
      accent: colors.primary[500],
      background: colors.success[900],
      surface: colors.success[800],
      text: colors.gray[100],
      textMuted: colors.gray[300],
    }
  },
  cosmic: {
    name: 'Cosmic',
    description: 'Galactic purple and blue',
    gradient: gradients.cosmic.galaxy,
    icon: '✨',
    category: 'cosmic',
    colors: {
      primary: colors.accent[600],
      secondary: colors.accent[400],
      accent: colors.primary[500],
      background: colors.accent[900],
      surface: colors.accent[800],
      text: colors.gray[100],
      textMuted: colors.gray[300],
    }
  },
  aurora: {
    name: 'Aurora',
    description: 'Northern lights effect',
    gradient: gradients.cosmic.aurora,
    icon: '🌌',
    category: 'cosmic',
    colors: {
      primary: colors.success[600],
      secondary: colors.primary[400],
      accent: colors.accent[500],
      background: colors.success[900],
      surface: colors.success[800],
      text: colors.gray[100],
      textMuted: colors.gray[300],
    }
  }
};

// Get theme class by variant
export const getThemeClass = (theme: ThemeVariant): string => {
  return themeConfigs[theme].gradient;
};

// Get theme colors by variant
export const getThemeColors = (theme: ThemeVariant) => {
  return themeConfigs[theme].colors;
};

// Get all themes grouped by category
export const getThemesByCategory = () => {
  const categories = {
    professional: [] as ThemeVariant[],
    nature: [] as ThemeVariant[],
    cosmic: [] as ThemeVariant[],
    branded: [] as ThemeVariant[]
  };

  Object.entries(themeConfigs).forEach(([variant, config]) => {
    categories[config.category].push(variant as ThemeVariant);
  });

  return categories;
};

// Get theme order for cycling
export const getThemeOrder = (): ThemeVariant[] => {
  return ['nebula', 'purple', 'gray', 'blue', 'slate', 'ocean', 'sunset', 'forest', 'cosmic', 'aurora'];
};

// Get next theme in cycle
export const getNextTheme = (currentTheme: ThemeVariant): ThemeVariant => {
  const order = getThemeOrder();
  const currentIndex = order.indexOf(currentTheme);
  const nextIndex = (currentIndex + 1) % order.length;
  const nextTheme = order[nextIndex];
  if (!nextTheme) {
    return 'nebula'; // fallback
  }
  return nextTheme;
};

// Get previous theme in cycle
export const getPreviousTheme = (currentTheme: ThemeVariant): ThemeVariant => {
  const order = getThemeOrder();
  const currentIndex = order.indexOf(currentTheme);
  const prevIndex = currentIndex === 0 ? order.length - 1 : currentIndex - 1;
  const prevTheme = order[prevIndex];
  if (!prevTheme) {
    return 'nebula'; // fallback
  }
  return prevTheme;
};

// Apply theme to CSS custom properties
export const applyTheme = (theme: ThemeVariant): void => {
  const colors = getThemeColors(theme);
  const root = document.documentElement;
  
  // Set CSS custom properties for the theme
  root.style.setProperty('--color-primary', colors.primary);
  root.style.setProperty('--color-secondary', colors.secondary);
  root.style.setProperty('--color-accent', colors.accent);
  root.style.setProperty('--color-background', colors.background);
  root.style.setProperty('--color-surface', colors.surface);
  root.style.setProperty('--color-text', colors.text);
  root.style.setProperty('--color-text-muted', colors.textMuted);
  root.style.setProperty('--gradient-background', themeConfigs[theme].gradient);
};

// Get current theme from localStorage or default
export const getCurrentTheme = (): ThemeVariant => {
  const saved = localStorage.getItem('aibos-theme');
  return (saved as ThemeVariant) || 'nebula';
};

// Save theme to localStorage
export const saveTheme = (theme: ThemeVariant): void => {
  localStorage.setItem('aibos-theme', theme);
  applyTheme(theme);
}; 