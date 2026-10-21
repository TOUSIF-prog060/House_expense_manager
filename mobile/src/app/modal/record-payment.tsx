import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/auth-context';
import { useTheme } from '../../context/theme-context';
import { recordPayment } from '../../api/settlement';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { radius, spacing, typography, type ColorPalette } from '../../constants/theme';

export default function RecordPaymentModal() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, household, householdMembers } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{
    toUserId?: string;
    toUserName?: string;
    amount?: string;
    paymentMethod?: string;
  }>();

  const otherMembers = householdMembers.filter((m) => m.user_id !== user?.id);

  const [toUser, setToUser] = useState<string>(
    params.toUserId || otherMembers[0]?.user_id || ''
  );
  const [amount, setAmount] = useState<string>(params.amount || '');
  const [method, setMethod] = useState<'upi' | 'cash' | 'bank_transfer' | 'other'>(
    (params.paymentMethod as 'upi' | 'cash' | 'bank_transfer' | 'other') || 'upi'
  );
  const [date, setDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');
    if (!toUser) {
      setError('Please select a recipient roommate.');
      return;
    }
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid payment amount.');
      return;
    }

    setBusy(true);

    try {
      await recordPayment({
        householdId: household!.id,
        toUser,
        amount: numAmount,
        paymentMethod: method,
        paymentDate: date,
        notes: notes.trim() || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ['settlement'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      router.back();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not record payment.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={18} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Card style={styles.card}>
        {/* Recipient Picker */}
        <Text style={styles.fieldLabel}>Recipient Roommate</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {otherMembers.map((m) => {
            const isSelected = toUser === m.user_id;
            return (
              <TouchableOpacity
                key={m.user_id}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => setToUser(m.user_id)}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {m.profile?.display_name || 'Roommate'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Input
          label="Amount Paid (₹)"
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          containerStyle={{ marginTop: spacing.md }}
        />

        {/* Payment Method */}
        <Text style={styles.fieldLabel}>Payment Method</Text>
        <View style={styles.methodRow}>
          {[
            { id: 'upi', label: 'UPI' },
            { id: 'cash', label: 'Cash' },
            { id: 'bank_transfer', label: 'Bank' },
            { id: 'other', label: 'Other' },
          ].map((m) => {
            const isSelected = method === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.methodBtn, isSelected && styles.methodBtnActive]}
                onPress={() => setMethod(m.id as any)}
              >
                <Text style={[styles.methodText, isSelected && styles.methodTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Input
          label="Date of Payment (YYYY-MM-DD)"
          placeholder="YYYY-MM-DD"
          value={date}
          onChangeText={setDate}
          containerStyle={{ marginTop: spacing.md }}
        />

        <Input
          label="Notes (Optional)"
          placeholder="e.g. Sent on Google Pay, Reference ID..."
          value={notes}
          onChangeText={setNotes}
        />
      </Card>

      <Button
        title="Record Payment"
        onPress={handleSubmit}
        loading={busy}
        size="lg"
        style={{ marginTop: spacing.lg }}
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
  card: {
    padding: spacing.md,
  },
  fieldLabel: {
    ...typography.bodySm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  horizontalScroll: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  methodRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  methodBtnActive: {
    backgroundColor: colors.primary,
  },
  methodText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  methodTextActive: {
    color: colors.textInverse,
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
});
