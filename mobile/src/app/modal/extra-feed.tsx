import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/auth-context';
import { useTheme } from '../../context/theme-context';
import { recordExtraFeeding } from '../../api/pets';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { spacing, typography, type ColorPalette } from '../../constants/theme';

export default function ExtraFeedModal() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { household } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{ petId?: string; petName?: string }>();

  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const displayName = params.petName || 'Cat';

  async function handleRecord() {
    setError('');
    setBusy(true);

    try {
      await recordExtraFeeding({
        householdId: household!.id,
        petId: params.petId,
        note: note.trim() || undefined,
      });

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Ignore
      }

      queryClient.invalidateQueries({ queryKey: ['feedings'] });
      router.back();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not record treat.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>Extra Meal or Treat</Text>
        <Text style={styles.desc}>
          Log an unscheduled treat, medicine, or snack for {displayName} so roommates stay informed.
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Input
          label="Note (Optional)"
          placeholder="e.g. Salmon creamy treat, Flea medicine, Chicken snack..."
          value={note}
          onChangeText={setNote}
          autoFocus
        />

        <Button
          title="Log Treat"
          onPress={handleRecord}
          loading={busy}
          size="lg"
          style={{ marginTop: spacing.md }}
        />
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
    },
    card: {
      padding: spacing.xl,
    },
    title: {
      ...typography.titleMd,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    desc: {
      ...typography.bodySm,
      color: colors.textMuted,
      marginBottom: spacing.lg,
    },
    errorText: {
      ...typography.bodySm,
      color: colors.danger,
      marginBottom: spacing.md,
    },
  });
