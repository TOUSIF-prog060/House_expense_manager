import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/auth-context';
import { useTheme } from '../../context/theme-context';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { radius, spacing } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    setLoading(false);

    if (signInError) {
      setError(signInError.message || 'Login failed. Please check your credentials.');
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.background : '#FAF8F3' }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Editorial Brand Header */}
          <View style={styles.brandHeader}>
            <View style={[styles.logoBadge, { backgroundColor: isDark ? colors.surface : '#103F32' }]}>
              <Ionicons name="home" size={28} color="#FAF8F3" />
            </View>
            <Text style={[styles.brandTitle, { color: isDark ? colors.text : '#19231F' }]}>
              Shared living,{'\n'}made simple.
            </Text>
            <Text style={[styles.brandSubtitle, { color: isDark ? colors.textSecondary : '#6D756F' }]}>
              Track expenses, manage supplies, care for pets — all in one place.
            </Text>
          </View>

          {/* Luxury Form Card */}
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: isDark ? colors.surface : '#FFFFFF',
                borderColor: isDark ? colors.border : '#E7E6E0',
              },
            ]}
          >
            <Text style={[styles.formTitle, { color: isDark ? colors.text : '#19231F' }]}>
              Sign In
            </Text>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerMuted }]}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
              </View>
            ) : null}

            <Input
              label="Email"
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Input
              label="Password"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot-password')}
              style={styles.forgotLink}
            >
              <Text style={[styles.forgotText, { color: isDark ? colors.primaryLight : '#103F32' }]}>
                Forgot password?
              </Text>
            </TouchableOpacity>

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              size="lg"
              style={[styles.submitBtn, { backgroundColor: isDark ? colors.primary : '#103F32' }]}
            />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: isDark ? colors.textSecondary : '#6D756F' }]}>
              Don't have an account yet?
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
              <Text style={[styles.signupLink, { color: isDark ? colors.primaryLight : '#103F32' }]}>
                {' '}Create Account
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  brandHeader: {
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#103F32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 38,
    marginBottom: spacing.xs,
  },
  brandSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
  },
  formCard: {
    borderRadius: 22,
    padding: spacing.xl,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.lg,
    letterSpacing: -0.3,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    marginTop: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  footerText: {
    fontSize: 14,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});
