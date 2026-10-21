import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { radius } from '../../constants/theme';
import { useTheme } from '../../context/theme-context';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
}

export function Badge({ label, variant = 'neutral', style }: BadgeProps) {
  const { colors } = useTheme();

  const variantContainerStyles: Record<BadgeVariant, ViewStyle> = {
    success: { backgroundColor: colors.primaryMuted },
    warning: { backgroundColor: colors.accentMuted },
    danger: { backgroundColor: colors.dangerMuted },
    info: { backgroundColor: colors.indigoMuted },
    neutral: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  };

  const variantTextColors: Record<BadgeVariant, string> = {
    success: colors.primaryDark || colors.primary,
    warning: colors.accentLight || colors.accent,
    danger: colors.danger,
    info: colors.indigo,
    neutral: colors.textSecondary,
  };

  return (
    <View style={[styles.badge, variantContainerStyles[variant], style]}>
      <Text style={[styles.text, { color: variantTextColors[variant] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
