import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/auth-context';
import { useTheme } from '../../context/theme-context';
import { fetchSettlementData } from '../../api/settlement';
import { formatRupees, type Transfer } from '@ourhome/core';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { radius, spacing, typography, type ColorPalette } from '../../constants/theme';

export default function SettlementScreen() {
  const router = useRouter();
  const { user, household } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [period, setPeriod] = useState<'month' | 'all'>('month');

  const {
    data: settlement,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['settlement', household?.id, period],
    queryFn: () =>
      fetchSettlementData(household!.id, user!.id, period, household?.timezone),
    enabled: !!household?.id && !!user?.id,
  });

  const myBalancePaise = settlement?.myBalancePaise ?? 0;
  const transfers = settlement?.transfers ?? [];
  const memberBalances = settlement?.memberBalances ?? [];
  const recentPayments = settlement?.recentPayments ?? [];

  async function handleUpiPay(transfer: Transfer) {
    const targetMember = memberBalances.find((m) => m.userId === transfer.toUserId);
    const upiId = targetMember?.upiId;

    if (!upiId) {
      Alert.alert(
        'UPI ID Missing',
        `${transfer.toName} hasn't added a UPI ID yet. Ask them to add their UPI VPA in their Profile.`,
        [
          {
            text: 'Record Cash/Bank Transfer',
            onPress: () =>
              router.push({
                pathname: '/modal/record-payment',
                params: {
                  toUserId: transfer.toUserId,
                  toUserName: transfer.toName,
                  amount: (transfer.amountPaise / 100).toFixed(2),
                },
              }),
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    const amountRupees = (transfer.amountPaise / 100).toFixed(2);
    const payeeName = encodeURIComponent(transfer.toName);
    const note = encodeURIComponent(`OurHome Settlement`);
    const upiUrl = `upi://pay?pa=${upiId}&pn=${payeeName}&am=${amountRupees}&cu=INR&tn=${note}`;

    try {
      Haptics.selectionAsync();
    } catch {
      // Ignore
    }

    try {
      const supported = await Linking.canOpenURL(upiUrl);
      if (supported || Platform.OS === 'android') {
        await Linking.openURL(upiUrl);

        // Prompt user to record payment upon return
        setTimeout(() => {
          Alert.alert(
            'Payment Sent?',
            `Did you complete the ₹${amountRupees} payment to ${transfer.toName}?`,
            [
              {
                text: 'Yes, Record Payment',
                onPress: () =>
                  router.push({
                    pathname: '/modal/record-payment',
                    params: {
                      toUserId: transfer.toUserId,
                      toUserName: transfer.toName,
                      amount: amountRupees,
                      paymentMethod: 'upi',
                    },
                  }),
              },
              { text: 'Not yet / Cancel', style: 'cancel' },
            ]
          );
        }, 1500);
      } else {
        throw new Error('No UPI app found');
      }
    } catch {
      Alert.alert(
        'UPI App Not Available',
        `Could not automatically launch UPI. Recipient VPA: ${upiId}\nAmount: ₹${amountRupees}`,
        [
          {
            text: 'Record Payment Manually',
            onPress: () =>
              router.push({
                pathname: '/modal/record-payment',
                params: {
                  toUserId: transfer.toUserId,
                  toUserName: transfer.toName,
                  amount: amountRupees,
                },
              }),
          },
          { text: 'OK', style: 'cancel' },
        ]
      );
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refetch}
          tintColor={colors.primary}
        />
      }
    >
      {/* Time Period Filter */}
      <View style={styles.periodRow}>
        <TouchableOpacity
          style={[styles.periodBtn, period === 'month' && styles.periodBtnActive]}
          onPress={() => setPeriod('month')}
        >
          <Text style={[styles.periodText, period === 'month' && styles.periodTextActive]}>
            This Month
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodBtn, period === 'all' && styles.periodBtnActive]}
          onPress={() => setPeriod('all')}
        >
          <Text style={[styles.periodText, period === 'all' && styles.periodTextActive]}>
            All Time
          </Text>
        </TouchableOpacity>
      </View>

      {/* Net Balance Hero Card */}
      <Card style={styles.heroCard}>
        <View style={styles.heroTop}>
          <Text style={styles.heroEyebrow}>YOUR NET BALANCE</Text>
          <Badge
            label={myBalancePaise > 0 ? 'Receivable' : myBalancePaise < 0 ? 'Payable' : 'All Settled'}
            variant={myBalancePaise > 0 ? 'success' : myBalancePaise < 0 ? 'danger' : 'neutral'}
          />
        </View>

        <Text
          style={[
            styles.heroAmount,
            myBalancePaise > 0 && { color: colors.primaryLight },
            myBalancePaise < 0 && { color: '#f87171' },
          ]}
        >
          {formatRupees(Math.abs(myBalancePaise))}
        </Text>

        <Text style={styles.heroSub}>
          {myBalancePaise > 0
            ? 'Roommates owe you this net amount.'
            : myBalancePaise < 0
            ? 'You owe this net amount to your household.'
            : 'You are completely settled up!'}
        </Text>

        <Button
          title="Record a Payment"
          variant="secondary"
          size="md"
          icon={<Ionicons name="swap-horizontal" size={16} color={colors.text} />}
          onPress={() => router.push('/modal/record-payment')}
          style={{ marginTop: spacing.md }}
        />
      </Card>

      {/* Recommended Transfers (Simplified Debt) */}
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="git-merge-outline" size={18} color={colors.primary} />
          <Text style={styles.sectionTitle}>Simplified Transfers</Text>
        </View>
      </View>

      {transfers.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="checkmark-done-circle" size={36} color={colors.primary} />
          <Text style={styles.emptyTitle}>Zero Balances Pending</Text>
          <Text style={styles.emptyDesc}>No transfers required. Everyone is squared up!</Text>
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {transfers.map((t, idx) => {
            const isMePayer = t.fromUserId === user?.id;
            const isMeReceiver = t.toUserId === user?.id;

            return (
              <Card
                key={idx}
                style={[
                  styles.transferCard,
                  isMePayer && { borderColor: colors.danger },
                  isMeReceiver && { borderColor: colors.primary },
                ]}
              >
                <View style={styles.transferInfo}>
                  <Text style={styles.transferNames}>
                    <Text style={{ fontWeight: '700', color: isMePayer ? '#f87171' : colors.text }}>
                      {isMePayer ? 'You' : t.fromName}
                    </Text>
                    {'  →  '}
                    <Text style={{ fontWeight: '700', color: isMeReceiver ? colors.primaryLight : colors.text }}>
                      {isMeReceiver ? 'You' : t.toName}
                    </Text>
                  </Text>
                  <Text style={styles.transferAmount}>{formatRupees(t.amountPaise)}</Text>
                </View>

                {isMePayer ? (
                  <Button
                    title="Pay via UPI"
                    variant="primary"
                    size="sm"
                    icon={<Ionicons name="flash" size={14} color={colors.textInverse} />}
                    onPress={() => handleUpiPay(t)}
                  />
                ) : (
                  <Badge label="Pending" variant="neutral" />
                )}
              </Card>
            );
          })}
        </View>
      )}

      {/* Member Balances */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Roommate Balances</Text>
      </View>

      <Card style={{ padding: 0 }}>
        {memberBalances.map((m, idx) => {
          const isMe = m.userId === user?.id;
          return (
            <View
              key={m.userId}
              style={[
                styles.memberRow,
                idx < memberBalances.length - 1 && styles.borderBottom,
              ]}
            >
              <View style={styles.memberAvatar}>
                <Text style={styles.avatarLetter}>{m.name.charAt(0).toUpperCase()}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>
                  {m.name} {isMe ? '(You)' : ''}
                </Text>
                <Text style={styles.memberSub}>
                  Paid {formatRupees(m.paidPaise)} · Fair share {formatRupees(m.fairSharePaise)}
                </Text>
              </View>

              <Text
                style={[
                  styles.memberBalance,
                  m.balancePaise > 0 && { color: colors.primaryLight },
                  m.balancePaise < 0 && { color: '#f87171' },
                ]}
              >
                {m.balancePaise > 0 ? '+' : ''}
                {formatRupees(m.balancePaise)}
              </Text>
            </View>
          );
        })}
      </Card>

      {/* Recent Payments Log */}
      {recentPayments.length > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Settlement History</Text>
          </View>

          <Card style={{ padding: 0 }}>
            {recentPayments.map((p, idx) => (
              <View
                key={p.id}
                style={[
                  styles.paymentRow,
                  idx < recentPayments.length - 1 && styles.borderBottom,
                ]}
              >
                <View style={styles.paymentIcon}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentTitle}>
                    {p.fromName} paid {p.toName}
                  </Text>
                  <Text style={styles.paymentMeta}>
                    {p.paymentDate} · {p.paymentMethod.toUpperCase()}
                    {p.notes ? ` · "${p.notes}"` : ''}
                  </Text>
                </View>
                <Text style={styles.paymentAmount}>{formatRupees(Math.round(p.amount * 100))}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}
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
    periodRow: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.md,
      padding: 3,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    periodBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: radius.sm,
    },
    periodBtnActive: {
      backgroundColor: colors.primary,
    },
    periodText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    periodTextActive: {
      color: colors.textInverse,
    },
    heroCard: {
      marginBottom: spacing.lg,
    },
    heroTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    heroEyebrow: {
      ...typography.caption,
      color: colors.textMuted,
    },
    heroAmount: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
      marginVertical: 4,
    },
    heroSub: {
      ...typography.bodySm,
      color: colors.textSecondary,
    },
    sectionHeader: {
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    },
    sectionTitle: {
      ...typography.titleMd,
      color: colors.text,
    },
    emptyCard: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      gap: 6,
    },
    emptyTitle: {
      ...typography.bodyLg,
      fontWeight: '700',
      color: colors.text,
      marginTop: 4,
    },
    emptyDesc: {
      ...typography.bodySm,
      color: colors.textMuted,
      textAlign: 'center',
    },
    transferCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
    },
    transferInfo: {
      flex: 1,
    },
    transferNames: {
      ...typography.bodyMd,
      color: colors.text,
    },
    transferAmount: {
      ...typography.titleMd,
      color: colors.text,
      marginTop: 2,
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
    },
    memberAvatar: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    avatarLetter: {
      fontWeight: '700',
      color: colors.text,
      fontSize: 14,
    },
    memberName: {
      ...typography.bodyMd,
      fontWeight: '600',
      color: colors.text,
    },
    memberSub: {
      ...typography.bodySm,
      color: colors.textMuted,
      marginTop: 2,
    },
    memberBalance: {
      ...typography.bodyLg,
      fontWeight: '700',
      color: colors.text,
    },
    paymentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
    },
    paymentIcon: {
      marginRight: spacing.md,
    },
    paymentTitle: {
      ...typography.bodyMd,
      fontWeight: '500',
      color: colors.text,
    },
    paymentMeta: {
      ...typography.bodySm,
      color: colors.textMuted,
      marginTop: 2,
    },
    paymentAmount: {
      ...typography.bodyLg,
      fontWeight: '700',
      color: colors.text,
    },
    borderBottom: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
  });
