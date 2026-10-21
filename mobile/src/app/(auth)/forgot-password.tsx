import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../api/supabase';
import { useTheme } from '../../context/theme-context';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { radius, spacing, typography, type ColorPalette } from '../../constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleReset() {
    setError('');
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'ourhome://update-password',
    });
    setLoading(false);

    if (resetError) {
      setError(resetError.message || 'Failed to send reset link.');
    } else {
      setSent(true);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <View style={styles.iconBadge}>
              <Ionicons name="key-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email and we'll send you instructions to reset your password.
            </Text>

            {sent ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                <Text style={styles.successText}>
                  Reset link sent! Please check your email inbox to proceed.
                </Text>
                <Button
                  title="Back to Sign In"
                  variant="secondary"
                  onPress={() => router.replace('/(auth)/login')}
                  style={{ marginTop: spacing.md, width: '100%' }}
                />
              </View>
            ) : (
              <>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <Input
                  label="Email"
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
                <Button
                  title="Send Reset Link"
                  onPress={handleReset}
                  loading={loading}
                  size="lg"
                  style={styles.btn}
                />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: spacing.xl,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    iconBadge: {
      width: 60,
      height: 60,
      borderRadius: radius.xl,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    title: {
      ...typography.titleLg,
      color: colors.text,
      marginBottom: spacing.xs,
      textAlign: 'center',
    },
    subtitle: {
      ...typography.bodyMd,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
    lineHeight: 20,
  },
  btn: {
    width: '100%',
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.danger,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  successBox: {
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    padding: spacing.lg,
    borderRadius: radius.lg,
    width: '100%',
  },
  successText: {
    ...typography.bodyMd,
    color: colors.primaryLight,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
