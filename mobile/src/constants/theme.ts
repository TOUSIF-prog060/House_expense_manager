export const darkColors = {
  background: '#121316',
  surface: '#1a1c22',
  surfaceElevated: '#242731',
  border: '#2c303c',
  borderLight: '#383d4c',

  primary: '#10b981', // Emerald
  primaryLight: '#34d399',
  primaryDark: '#059669',
  primaryMuted: 'rgba(16, 185, 129, 0.15)',

  accent: '#f59e0b', // Amber
  accentLight: '#fbbf24',
  accentMuted: 'rgba(245, 158, 11, 0.15)',

  rose: '#f43f5e',
  roseMuted: 'rgba(244, 63, 94, 0.15)',

  indigo: '#6366f1',
  indigoMuted: 'rgba(99, 102, 241, 0.15)',

  cyan: '#06b6d4',
  cyanMuted: 'rgba(6, 182, 212, 0.15)',

  text: '#f3f4f6',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',
  textInverse: '#121316',

  danger: '#ef4444',
  dangerMuted: 'rgba(239, 68, 68, 0.15)',
  success: '#10b981',
  warning: '#f59e0b',
};

export const lightColors: typeof darkColors = {
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceElevated: '#f1f5f9',
  border: '#e2e8f0',
  borderLight: '#cbd5e1',

  primary: '#10b981', // Emerald
  primaryLight: '#34d399',
  primaryDark: '#047857',
  primaryMuted: 'rgba(16, 185, 129, 0.12)',

  accent: '#f59e0b', // Amber
  accentLight: '#fbbf24',
  accentMuted: 'rgba(245, 158, 11, 0.12)',

  rose: '#f43f5e',
  roseMuted: 'rgba(244, 63, 94, 0.12)',

  indigo: '#6366f1',
  indigoMuted: 'rgba(99, 102, 241, 0.12)',

  cyan: '#06b6d4',
  cyanMuted: 'rgba(6, 182, 212, 0.12)',

  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#64748b',
  textInverse: '#ffffff',

  danger: '#ef4444',
  dangerMuted: 'rgba(239, 68, 68, 0.12)',
  success: '#10b981',
  warning: '#f59e0b',
};

export type ColorPalette = typeof darkColors;

// Default exported colors (preserves backward compatibility)
export const colors = darkColors;

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
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
};

export const typography = {
  fontFamily: undefined, // Default system font
  titleXl: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  titleLg: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.3 },
  titleMd: { fontSize: 18, fontWeight: '600' as const },
  bodyLg: { fontSize: 16, fontWeight: '400' as const },
  bodyMd: { fontSize: 14, fontWeight: '400' as const },
  bodySm: { fontSize: 12, fontWeight: '400' as const },
  caption: { fontSize: 11, fontWeight: '500' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
};
