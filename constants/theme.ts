/**
 * Kin App Theme
 * Brand Identity: grounded, peaceful, purposeful
 */

export const Colors = {
  // Brand Colors
  darkBrown: '#3B2F2F',
  darkBrownDarker: '#2A1F1F', // Darker shade for gradient
  darkBrownLighter: '#4A3D3D', // Lighter shade for gradient
  beige: '#F5E9D5',
  orange: '#E07A5F', // Burnt Orange accent
  
  // Semantic Colors (Dark Theme)
  background: '#2A1F1F', // Dark brown background
  surface: '#3B2F2F', // Dark brown surface (cards)
  surfaceElevated: '#4A3D3D', // Lighter dark brown for elevated surfaces
  text: '#F5E9D5', // Beige text for contrast
  textSecondary: '#D4C4B0', // Lighter beige for secondary text
  accent: '#E07A5F', // Orange accent
  success: '#E07A5F', // Orange for success states
  error: '#D32F2F',
  
  // Gradient (Dark Brown gradient)
  gradientStart: '#2A1F1F', // Darker dark brown
  gradientEnd: '#3B2F2F',   // Dark brown
} as const;

export const Typography = {
  // Font Families
  headingFont: 'Playfair Display',
  bodyFont: 'Inter',
  
  // Font Sizes
  h1: 32,
  h2: 24,
  h3: 20,
  h4: 18,
  body: 16,
  bodySmall: 14,
  caption: 12,
  
  // Font Weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

