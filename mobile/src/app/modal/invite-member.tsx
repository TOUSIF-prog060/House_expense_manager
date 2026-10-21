import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/auth-context';
import { useTheme } from '../../context/theme-context';
import { createHouseholdInvite } from '../../api/households';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { radius, spacing, typography, type ColorPalette } from '../../constants/theme';

export default function InviteMemberModal() {
  const router = useRouter();
  const { household } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleGenerateCode() {
    setError('');
    setBusy(true);

    try {
      const code = await createHouseholdInvite(household!.id);
      setInviteCode(code);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Ignore
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not generate invite code.');
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    if (!inviteCode) return;
    try {
      await Share.share({
        message: `Join our household "${household?.name}" on OurHome! Use this invite code: ${inviteCode}\n\nDeep link: ourhome://join?code=${inviteCode}`,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name="person-add" size={28} color={colors.primary} />
        </View>

        <Text style={styles.title}>Invite a Roommate</Text>
        <Text style={styles.desc}>
          Generate a secure, single-use invite code to bring a roommate into {household?.name}.
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {inviteCode ? (
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>YOUR INVITE CODE</Text>
            <Text style={styles.codeText}>{inviteCode}</Text>
            <Text style={styles.codeExpiry}>Valid for 7 days</Text>

            <View style={styles.actionRow}>
              <Button
                title="Share Invite"
                variant="primary"
                size="md"
                icon={<Ionicons name="share-social-outline" size={16} color={colors.textInverse} />}
                onPress={handleShare}
                style={{ flex: 1 }}
              />
              <Button
                title="Done"
                variant="secondary"
                size="md"
                onPress={() => router.back()}
              />
            </View>
          </View>
        ) : (
          <Button
            title="Generate Invite Code"
            onPress={handleGenerateCode}
            loading={busy}
            size="lg"
            style={{ width: '100%', marginTop: spacing.md }}
          />
        )}
      </Card>
    </View>
  );
}

const createStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: spacing.lg,
      justifyContent: 'center',
    },
    card: {
      alignItems: 'center',
      padding: spacing.xl,
    },
    iconCircle: {
      width: 60,
      height: 60,
      borderRadius: radius.xl,
      backgroundColor: colors.primaryMuted,
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
  desc: {
    ...typography.bodySm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  codeContainer: {
    width: '100%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  codeText: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primaryLight,
    letterSpacing: 2,
    marginVertical: spacing.sm,
  },
  codeExpiry: {
    ...typography.bodySm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  errorText: {
    ...typography.bodySm,
    color: colors.danger,
    marginBottom: spacing.md,
  },
});
