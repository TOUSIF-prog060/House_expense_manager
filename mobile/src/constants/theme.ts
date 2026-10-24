export const lightColors = {
  background: '#FAF8F3', // Warm Ivory
  surface: '#FFFFFF', // Pure White
  surfaceElevated: '#F2EEE5', // Cream Surface
  border: '#E7E6E0', // Subtle Border
  borderLight: '#F2EEE5',

  primary: '#103F32', // Primary Forest Green
  primaryLight: '#235D4B',
  primaryDark: '#092E25', // Deep Forest
  primaryMuted: '#E2EBE3', // Soft Sage

  accent: '#D77F57', // Warm Terracotta Accent
  accentLight: '#E8A382',
  accentMuted: 'rgba(215, 127, 87, 0.15)',

  gold: '#C5A77D', // Champagne Gold
  goldMuted: 'rgba(197, 167, 125, 0.18)',

  sage: '#E2EBE3', // Soft Sage
  terracotta: '#D77F57',

  rose: '#D9534F',
  roseMuted: 'rgba(217, 83, 79, 0.12)',

  indigo: '#4A6B82',
  indigoMuted: 'rgba(74, 107, 130, 0.12)',

  cyan: '#2A8C82',
  cyanMuted: 'rgba(42, 140, 130, 0.12)',

  text: '#19231F', // Primary Dark Charcoal Text
  textSecondary: '#6D756F', // Muted Secondary Text
  textMuted: '#9DA39E',
  textInverse: '#FFFFFF',

  danger: '#D9534F',
  dangerMuted: 'rgba(217, 83, 79, 0.12)',
  success: '#103F32',
  warning: '#D77F57',
};

export const darkColors: typeof lightColors = {
  background: '#0B1411', // Dark Forest Background
  surface: '#121F1B', // Dark Surface
  surfaceElevated: '#1A2C27',
  border: '#223832',
  borderLight: '#2B463E',

  primary: '#246351', // Bright Forest Accent
  primaryLight: '#32826C',
  primaryDark: '#092E25',
  primaryMuted: 'rgba(36, 99, 81, 0.25)',

  accent: '#E8926B', // Terracotta Warmth
  accentLight: '#F2A988',
  accentMuted: 'rgba(232, 146, 107, 0.2)',

  gold: '#D4B890', // Champagne Gold Dark
  goldMuted: 'rgba(212, 184, 144, 0.2)',

  sage: '#223832',
  terracotta: '#E8926B',

  rose: '#E57373',
  roseMuted: 'rgba(229, 115, 115, 0.2)',

  indigo: '#78A1BB',
  indigoMuted: 'rgba(120, 161, 187, 0.2)',

  cyan: '#4DB6AC',
  cyanMuted: 'rgba(77, 182, 172, 0.2)',

  text: '#FAF8F3', // Warm Ivory Text
  textSecondary: '#A0ACA6',
  textMuted: '#6D7873',
  textInverse: '#FAF8F3',

  danger: '#E57373',
  dangerMuted: 'rgba(229, 115, 115, 0.2)',
  success: '#32826C',
  warning: '#E8926B',
};

export type ColorPalette = typeof lightColors;

// Default exported colors
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  full: 9999,
};

export const typography = {
  fontFamily: undefined, // System font
  titleXl: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.8 },
  titleLg: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.5 },
  titleMd: { fontSize: 19, fontWeight: '600' as const, letterSpacing: -0.2 },
  bodyLg: { fontSize: 16, fontWeight: '400' as const },
  bodyMd: { fontSize: 14, fontWeight: '400' as const },
  bodySm: { fontSize: 12, fontWeight: '400' as const },
  caption: { fontSize: 11, fontWeight: '600' as const, textTransform: 'uppercase' as const, letterSpacing: 0.8 },
};
