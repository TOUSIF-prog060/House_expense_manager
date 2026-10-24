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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/auth-context';
import { useTheme } from '../../context/theme-context';
import { createHousehold, joinHousehold } from '../../api/households';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { radius, spacing } from '../../constants/theme';

export default function OnboardingScreen() {
  const { refreshHousehold, signOut } = useAuth();
  const { colors, isDark } = useTheme();
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.background : '#FAF8F3' }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={[styles.brandIcon, { backgroundColor: isDark ? colors.surface : '#103F32' }]}>
              <Ionicons name="home" size={28} color="#FAF8F3" />
            </View>
            <Text style={[styles.title, { color: isDark ? colors.text : '#19231F' }]}>
              Welcome to{'\n'}OurHome
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? colors.textSecondary : '#6D756F' }]}>
              Create a new home or join an existing one to get started.
            </Text>
          </View>

          {/* Tab Selector */}
          <View style={[styles.tabSelector, { backgroundColor: isDark ? colors.surfaceElevated : '#F2EEE5', borderColor: isDark ? colors.border : '#E7E6E0' }]}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'create' && { backgroundColor: isDark ? colors.primary : '#103F32' }]}
              onPress={() => setTab('create')}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === 'create' ? { color: '#FAF8F3', fontWeight: '700' } : { color: isDark ? colors.textSecondary : '#6D756F' },
                ]}
              >
                Create Home
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, tab === 'join' && { backgroundColor: isDark ? colors.primary : '#103F32' }]}
              onPress={() => setTab('join')}
            >
              <Text
                style={[
                  styles.tabText,
                  tab === 'join' ? { color: '#FAF8F3', fontWeight: '700' } : { color: isDark ? colors.textSecondary : '#6D756F' },
                ]}
              >
                Join With Code
              </Text>
            </TouchableOpacity>
          </View>

          {tab === 'create' ? (
            <View style={[styles.card, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#E7E6E0' }]}>
              <Text style={[styles.cardTitle, { color: isDark ? colors.text : '#19231F' }]}>
                Create a New Household
              </Text>
              <Text style={[styles.cardDesc, { color: colors.textMuted }]}>
                You will be the household admin and can invite your roommates afterwards.
              </Text>

              {createError ? (
                <View style={[styles.errorBox, { backgroundColor: colors.dangerMuted }]}>
                  <Ionicons name="alert-circle" size={18} color={colors.danger} />
                  <Text style={[styles.errorText, { color: colors.danger }]}>{createError}</Text>
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
                style={[styles.btn, { backgroundColor: isDark ? colors.primary : '#103F32' }]}
              />
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#E7E6E0' }]}>
              <Text style={[styles.cardTitle, { color: isDark ? colors.text : '#19231F' }]}>
                Join an Existing Home
              </Text>
              <Text style={[styles.cardDesc, { color: colors.textMuted }]}>
                Enter the invite code shared by your roommate or household admin.
              </Text>

              {joinError ? (
                <View style={[styles.errorBox, { backgroundColor: colors.dangerMuted }]}>
                  <Ionicons name="alert-circle" size={18} color={colors.danger} />
                  <Text style={[styles.errorText, { color: colors.danger }]}>{joinError}</Text>
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
                style={[styles.btn, { backgroundColor: isDark ? colors.primary : '#103F32' }]}
              />
            </View>
          )}

          <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
            <Ionicons name="log-out-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.signOutText, { color: colors.textMuted }]}>Sign out of account</Text>
          </TouchableOpacity>
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
  header: {
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  brandIcon: {
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
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 38,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
  },
  tabSelector: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    padding: 4,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  tabText: {
    fontWeight: '600',
    fontSize: 14,
  },
  card: {
    borderRadius: 22,
    padding: spacing.xl,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    marginBottom: spacing.lg,
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
    fontSize: 13,
    fontWeight: '600',
  },
});
