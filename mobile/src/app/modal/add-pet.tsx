import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/auth-context';
import { useTheme } from '../../context/theme-context';
import { addPet } from '../../api/pets';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { spacing, typography, type ColorPalette } from '../../constants/theme';

export default function AddPetModal() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { household } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleAdd() {
    setError('');
    if (!name.trim()) {
      setError('Please enter a name for the cat / pet.');
      return;
    }

    setBusy(true);
    try {
      await addPet(household!.id, name.trim());
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      router.back();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not add pet.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>Register a Cat or Pet</Text>
        <Text style={styles.desc}>
          Add your household pet so roommates can coordinate feeding schedules.
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Input
          label="Pet's Name"
          placeholder="e.g. Luna, Milo, Oliver..."
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <Button
          title="Save Pet"
          onPress={handleAdd}
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
