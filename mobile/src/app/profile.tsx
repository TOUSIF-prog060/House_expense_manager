import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/auth-context';
import { useTheme } from '../context/theme-context';
import { setMyUpiId, updateDisplayName } from '../api/households';
import { registerForPushNotificationsAsync } from '../api/notifications';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { radius, spacing, typography, type ColorPalette } from '../constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, household, signOut, refreshHousehold } = useAuth();
  const { themeMode, setThemeMode, colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [upiId, setUpiId] = useState(profile?.upi_id || '');
  const [busy, setBusy] = useState(false);
  const [notifBusy, setNotifBusy] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9]{2,64}$/;

  async function handleSaveProfile() {
    setError('');
    setSuccess('');

    const cleanUpi = upiId.trim();
    if (cleanUpi.length > 0 && !UPI_REGEX.test(cleanUpi)) {
      setError('Invalid UPI ID format. Example: yourname@oksbi or 9876543210@paytm');
      return;
    }

    setBusy(true);

    try {
      if (displayName.trim() && displayName !== profile?.display_name) {
        await updateDisplayName(user!.id, displayName.trim());
      }
      if (cleanUpi !== (profile?.upi_id || '')) {
        await setMyUpiId(cleanUpi);
      }

      await refreshHousehold();
      setSuccess('Profile updated successfully!');
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Ignore
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update profile.');
    } finally {
      setBusy(false);
    }
  }

  async function handleEnablePush() {
    if (!user?.id) return;
    setNotifBusy(true);
    try {
      const token = await registerForPushNotificationsAsync(user.id, household?.id);
      if (token) {
        Alert.alert('Notifications Enabled', 'Your device is registered for household push alerts.');
      } else {
        Alert.alert(
          'Permission Required',
          'Push notifications were not enabled. Please check device notification settings.'
        );
      }
    } finally {
      setNotifBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarBig}>
          <Text style={styles.avatarBigText}>
            {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
          </Text>
        </View>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      {success ? (
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
          <Text style={styles.successText}>{success}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={18} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Card style={styles.card}>
        <Text style={styles.cardHeaderTitle}>Personal Information</Text>

        <Input
          label="Display Name"
          placeholder="Your name"
          value={displayName}
          onChangeText={setDisplayName}
        />

        <Input
          label="UPI VPA ID (For 1-tap Settlements)"
          placeholder="username@okhdfcbank or phone@paytm"
          autoCapitalize="none"
          value={upiId}
          onChangeText={setUpiId}
        />
        <Text style={styles.upiNote}>
          Roommates can pay you directly through GPay, PhonePe, and Paytm using this ID.
        </Text>

        <Button
          title="Save Profile"
          onPress={handleSaveProfile}
          loading={busy}
          size="md"
          style={{ marginTop: spacing.md }}
        />
      </Card>

      {/* Appearance / Theme Card */}
      <Card style={[styles.card, { marginTop: spacing.md }]}>
        <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>Appearance</Text>
        <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
          Choose how OurHome looks on your device.
        </Text>

        <View style={[styles.themeSegment, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          {(['system', 'light', 'dark'] as const).map((mode) => {
            const isSelected = themeMode === mode;
            const iconName =
              mode === 'system' ? 'phone-portrait-outline' : mode === 'light' ? 'sunny-outline' : 'moon-outline';
            const label = mode === 'system' ? 'System' : mode === 'light' ? 'Light' : 'Dark';
            return (
              <TouchableOpacity
                key={mode}
                activeOpacity={0.7}
                style={[
                  styles.themeOption,
                  isSelected && [
                    styles.themeOptionActive,
                    { backgroundColor: colors.surface, borderColor: colors.borderLight },
                  ],
                ]}
                onPress={() => {
                  try {
                    Haptics.selectionAsync();
                  } catch {
                    // Ignore
                  }
                  setThemeMode(mode);
                }}
              >
                <Ionicons
                  name={iconName}
                  size={16}
                  color={isSelected ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    { color: isSelected ? colors.text : colors.textMuted },
                    isSelected && { fontWeight: '700' },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* Push Notifications Card */}
      <Card style={[styles.card, { marginTop: spacing.md }]}>
        <Text style={styles.cardHeaderTitle}>Push Notifications</Text>
        <Text style={styles.cardDesc}>
          Receive alerts when a roommate feeds the cat, adds a shared expense, or sends a payment.
        </Text>

        <Button
          title="Enable Notifications on this Device"
          variant="secondary"
          size="md"
          icon={<Ionicons name="notifications-outline" size={16} color={colors.text} />}
          onPress={handleEnablePush}
          loading={notifBusy}
        />
      </Card>

      {/* App Info Card */}
      <Card style={[styles.card, { marginTop: spacing.md }]}>
        <Text style={styles.cardHeaderTitle}>About OurHome</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>App Version</Text>
          <Text style={styles.infoValue}>1.0.0 (Expo Native)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Active Household</Text>
          <Text style={styles.infoValue}>{household?.name || 'None'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Timezone</Text>
          <Text style={styles.infoValue}>{household?.timezone || 'Asia/Kolkata'}</Text>
        </View>
      </Card>

      {/* Sign Out Button */}
      <Button
        title="Sign Out"
        variant="danger"
        size="lg"
        icon={<Ionicons name="log-out-outline" size={18} color="#ffffff" />}
        onPress={() => {
          Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sign Out',
              style: 'destructive',
              onPress: async () => {
                await signOut();
              },
            },
          ]);
        }}
        style={{ marginTop: spacing.xl, marginBottom: spacing.xxl }}
      />
    </ScrollView>
  );
}

const createStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  avatarBig: {
    width: 76,
    height: 76,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  avatarBigText: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.primaryLight,
  },
  userEmail: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  card: {
    padding: spacing.lg,
  },
  cardHeaderTitle: {
    ...typography.bodyLg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardDesc: {
    ...typography.bodySm,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  upiNote: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: -4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    ...typography.bodySm,
    color: colors.textMuted,
  },
  infoValue: {
    ...typography.bodySm,
    color: colors.text,
    fontWeight: '600',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  successText: {
    ...typography.bodySm,
    color: colors.primaryLight,
    fontWeight: '600',
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
  themeSegment: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 4,
    gap: 4,
    marginTop: spacing.sm,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  themeOptionActive: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  themeOptionText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
