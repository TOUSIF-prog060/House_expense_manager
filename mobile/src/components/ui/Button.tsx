import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { radius, spacing } from '../../constants/theme';
import { useTheme } from '../../context/theme-context';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost' | 'quiet';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    if (disabled || loading) return;
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }

  function handlePress() {
    if (disabled || loading) return;
    try {
      Haptics.selectionAsync();
    } catch {
      // Ignore haptics fail
    }
    onPress();
  }

  const dynamicVariantStyles: Record<ButtonVariant, ViewStyle> = {
    primary: { backgroundColor: colors.primary },
    secondary: { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
    accent: { backgroundColor: colors.accent },
    danger: { backgroundColor: colors.danger },
    ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
    quiet: { backgroundColor: 'transparent' },
  };

  const dynamicTextStyles: Record<ButtonVariant, TextStyle> = {
    primary: { color: colors.textInverse },
    secondary: { color: colors.text },
    accent: { color: colors.textInverse },
    danger: { color: '#ffffff' },
    ghost: { color: colors.text },
    quiet: { color: colors.textSecondary },
  };

  const buttonStyles = [
    styles.base,
    dynamicVariantStyles[variant],
    styles[`size_${size}`],
    (disabled || loading) && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    dynamicTextStyles[variant],
    styles[`textSize_${size}`],
    textStyle,
  ];

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled || loading}
        style={buttonStyles}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? colors.textInverse : colors.primary}
          />
        ) : (
          <>
            {icon ? <>{icon}</> : null}
            <Text style={textStyles}>{title}</Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  size_sm: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  size_md: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  size_lg: {
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600',
  },
  textSize_sm: {
    fontSize: 13,
  },
  textSize_md: {
    fontSize: 15,
  },
  textSize_lg: {
    fontSize: 16,
  },
});
