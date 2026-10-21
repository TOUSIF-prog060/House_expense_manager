import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/auth-context';
import { useTheme } from '../../context/theme-context';
import { createHousehold, joinHousehold } from '../../api/households';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { radius, spacing, typography, type ColorPalette } from '../../constants/theme';

export default function OnboardingScreen() {
  const { user, refreshHousehold, signOut } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [tab, setTab] = useState<'create' | 'join'>('create');

  // Create state
  const [name, setName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Join state
  const [inviteCode, setInviteCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  async function handleCreateHousehold() {
    setCreateError('');
    if (!name.trim()) {
      setCreateError('Please enter a name for your home.');
      return;
    }

    setCreateLoading(true);
    try {
      await createHousehold(name.trim(), 'Asia/Kolkata');
      await refreshHousehold();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Could not create household.');
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleJoinHousehold() {
    setJoinError('');
    if (!inviteCode.trim()) {
      setJoinError('Please enter an invite code.');
      return;
    }

    setJoinLoading(true);
    try {
      await joinHousehold(inviteCode.trim());
      await refreshHousehold();
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : 'Could not join household. Check your code.');
    } finally {
      setJoinLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.brandIcon}>
              <Ionicons name="home" size={28} color={colors.primary} />
            </View>
            <Text style={styles.title}>Welcome Home</Text>
            <Text style={styles.subtitle}>
              Get everyone under one roof to manage expenses, balances, and pets together.
            </Text>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabSelector}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'create' && styles.tabBtnActive]}
              onPress={() => setTab('create')}
            >
              <Text style={[styles.tabText, tab === 'create' && styles.tabTextActive]}>
                Create Home
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, tab === 'join' && styles.tabBtnActive]}
              onPress={() => setTab('join')}
            >
              <Text style={[styles.tabText, tab === 'join' && styles.tabTextActive]}>
                Join With Code
              </Text>
            </TouchableOpacity>
          </View>

          {tab === 'create' ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Create a New Household</Text>
              <Text style={styles.cardDesc}>
                You will be the household admin and can invite your roommates afterwards.
              </Text>

              {createError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color={colors.danger} />
                  <Text style={styles.errorText}>{createError}</Text>
                </View>
              ) : null}

              <Input
                label="Household Name"
                placeholder="e.g. Apartment 402 or Maple Villa"
                value={name}
                onChangeText={setName}
              />

              <Button
                title="Create Household"
                onPress={handleCreateHousehold}
                loading={createLoading}
                size="lg"
                style={styles.btn}
              />
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Join an Existing Home</Text>
              <Text style={styles.cardDesc}>
                Enter the invite code shared by your roommate or household admin.
              </Text>

              {joinError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={18} color={colors.danger} />
                  <Text style={styles.errorText}>{joinError}</Text>
                </View>
              ) : null}

              <Input
                label="Invite Code"
                placeholder="e.g. 8-character invite code"
                autoCapitalize="characters"
                value={inviteCode}
                onChangeText={setInviteCode}
              />

              <Button
                title="Join Household"
                onPress={handleJoinHousehold}
                loading={joinLoading}
                size="lg"
                style={styles.btn}
              />
            </View>
          )}

          <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
            <Ionicons name="log-out-outline" size={18} color={colors.textMuted} />
            <Text style={styles.signOutText}>Sign out of account</Text>
          </TouchableOpacity>
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
    header: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    brandIcon: {
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
      ...typography.titleXl,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    subtitle: {
      ...typography.bodyMd,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: 290,
      lineHeight: 20,
    },
    tabSelector: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.lg,
      padding: 4,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabBtn: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: radius.md,
    },
    tabBtnActive: {
      backgroundColor: colors.primary,
    },
    tabText: {
      fontWeight: '600',
      fontSize: 14,
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.textInverse,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: {
      ...typography.titleMd,
      color: colors.text,
      marginBottom: 4,
    },
  cardDesc: {
    ...typography.bodySm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerMuted,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.danger,
    flex: 1,
  },
  btn: {
    marginTop: spacing.sm,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl,
    gap: spacing.xs,
  },
  signOutText: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
});
