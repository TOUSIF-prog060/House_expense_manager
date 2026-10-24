import React, { useState } from 'react';
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
import { radius, spacing } from '../../constants/theme';

export default function SettlementScreen() {
  const router = useRouter();
  const { user, household } = useAuth();
  const { colors, isDark } = useTheme();
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
      style={[styles.container, { backgroundColor: isDark ? colors.background : '#FAF8F3' }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refetch}
          tintColor={isDark ? colors.primary : '#103F32'}
        />
      }
    >
      {/* Time Period Filter */}
      <View style={[styles.periodRow, { backgroundColor: isDark ? colors.surfaceElevated : '#F2EEE5', borderColor: isDark ? colors.border : '#E7E6E0' }]}>
        <TouchableOpacity
          style={[styles.periodBtn, period === 'month' && { backgroundColor: isDark ? colors.primary : '#103F32' }]}
          onPress={() => setPeriod('month')}
        >
          <Text
            style={[
              styles.periodText,
              period === 'month' ? { color: '#FAF8F3', fontWeight: '700' } : { color: isDark ? colors.textSecondary : '#6D756F' },
            ]}
          >
            This Month
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodBtn, period === 'all' && { backgroundColor: isDark ? colors.primary : '#103F32' }]}
          onPress={() => setPeriod('all')}
        >
          <Text
            style={[
              styles.periodText,
              period === 'all' ? { color: '#FAF8F3', fontWeight: '700' } : { color: isDark ? colors.textSecondary : '#6D756F' },
            ]}
          >
            All Time
          </Text>
        </TouchableOpacity>
      </View>

      {/* Net Balance Hero Card */}
      <Card style={[styles.heroCard, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#E7E6E0' }]}>
        <View style={styles.heroTop}>
          <Text style={[styles.heroEyebrow, { color: colors.textMuted }]}>YOUR NET BALANCE</Text>
          <Badge
            label={myBalancePaise > 0 ? 'Receivable' : myBalancePaise < 0 ? 'Payable' : 'All Settled'}
            variant={myBalancePaise > 0 ? 'success' : myBalancePaise < 0 ? 'danger' : 'neutral'}
          />
        </View>

        <Text
          style={[
            styles.heroAmount,
            { color: isDark ? colors.text : '#19231F' },
            myBalancePaise > 0 && { color: isDark ? colors.primaryLight : '#103F32' },
            myBalancePaise < 0 && { color: '#D9534F' },
          ]}
        >
          {formatRupees(Math.abs(myBalancePaise))}
        </Text>

        <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
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
          icon={<Ionicons name="swap-horizontal" size={16} color={isDark ? colors.text : '#19231F'} />}
          onPress={() => router.push('/modal/record-payment')}
          style={{ marginTop: spacing.md }}
        />
      </Card>

      {/* Recommended Transfers (Simplified Debt) */}
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="git-merge-outline" size={18} color={isDark ? colors.primaryLight : '#103F32'} />
          <Text style={[styles.sectionTitle, { color: isDark ? colors.text : '#19231F' }]}>
            Simplified Transfers
          </Text>
        </View>
      </View>

      {transfers.length === 0 ? (
        <Card style={[styles.emptyCard, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#E7E6E0' }]}>
          <Ionicons name="checkmark-done-circle" size={36} color={isDark ? colors.primaryLight : '#103F32'} />
          <Text style={[styles.emptyTitle, { color: isDark ? colors.text : '#19231F' }]}>
            Zero Balances Pending
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
            No transfers required. Everyone is squared up!
          </Text>
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
                  { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#E7E6E0' },
                  isMePayer && { borderColor: '#D9534F' },
                  isMeReceiver && { borderColor: '#103F32' },
                ]}
              >
                <View style={styles.transferInfo}>
                  <Text style={styles.transferNames}>
                    <Text style={{ fontWeight: '700', color: isMePayer ? '#D9534F' : (isDark ? colors.text : '#19231F') }}>
                      {isMePayer ? 'You' : t.fromName}
                    </Text>
                    {'  →  '}
                    <Text style={{ fontWeight: '700', color: isMeReceiver ? (isDark ? colors.primaryLight : '#103F32') : (isDark ? colors.text : '#19231F') }}>
                      {isMeReceiver ? 'You' : t.toName}
                    </Text>
                  </Text>
                  <Text style={[styles.transferAmount, { color: isDark ? colors.text : '#19231F' }]}>
                    {formatRupees(t.amountPaise)}
                  </Text>
                </View>

                {isMePayer ? (
                  <Button
                    title="Pay via UPI"
                    variant="primary"
                    size="sm"
                    icon={<Ionicons name="flash" size={14} color="#FAF8F3" />}
                    onPress={() => handleUpiPay(t)}
                    style={{ backgroundColor: isDark ? colors.primary : '#103F32' }}
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
        <Text style={[styles.sectionTitle, { color: isDark ? colors.text : '#19231F' }]}>
          Roommate Balances
        </Text>
      </View>

      <Card style={{ padding: 0, backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#E7E6E0' }}>
        {memberBalances.map((m, idx) => {
          const isMe = m.userId === user?.id;
          return (
            <View
              key={m.userId}
              style={[
                styles.memberRow,
                idx < memberBalances.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? colors.border : '#E7E6E0' },
              ]}
            >
              <View style={[styles.memberAvatar, { backgroundColor: isDark ? colors.surfaceElevated : '#F2EEE5' }]}>
                <Text style={[styles.avatarLetter, { color: isDark ? colors.text : '#19231F' }]}>
                  {m.name.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.memberName, { color: isDark ? colors.text : '#19231F' }]}>
                  {m.name} {isMe ? '(You)' : ''}
                </Text>
                <Text style={[styles.memberSub, { color: colors.textMuted }]}>
                  Paid {formatRupees(m.paidPaise)} · Fair share {formatRupees(m.fairSharePaise)}
                </Text>
              </View>

              <Text
                style={[
                  styles.memberBalance,
                  { color: isDark ? colors.text : '#19231F' },
                  m.balancePaise > 0 && { color: isDark ? colors.primaryLight : '#103F32' },
                  m.balancePaise < 0 && { color: '#D9534F' },
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
            <Text style={[styles.sectionTitle, { color: isDark ? colors.text : '#19231F' }]}>
              Settlement History
            </Text>
          </View>

          <Card style={{ padding: 0, backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#E7E6E0' }}>
            {recentPayments.map((p, idx) => (
              <View
                key={p.id}
                style={[
                  styles.paymentRow,
                  idx < recentPayments.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? colors.border : '#E7E6E0' },
                ]}
              >
                <View style={styles.paymentIcon}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={isDark ? colors.primaryLight : '#103F32'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.paymentTitle, { color: isDark ? colors.text : '#19231F' }]}>
                    {p.fromName} paid {p.toName}
                  </Text>
                  <Text style={[styles.paymentMeta, { color: colors.textMuted }]}>
                    {p.paymentDate} · {p.paymentMethod.toUpperCase()}
                    {p.notes ? ` · "${p.notes}"` : ''}
                  </Text>
                </View>
                <Text style={[styles.paymentAmount, { color: isDark ? colors.text : '#19231F' }]}>
                  {formatRupees(Math.round(p.amount * 100))}
                </Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  periodRow: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
  },
  heroCard: {
    marginBottom: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.xl,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  heroSub: {
    fontSize: 13,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
  },
  transferCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
  },
  transferInfo: {
    flex: 1,
  },
  transferNames: {
    fontSize: 14,
  },
  transferAmount: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarLetter: {
    fontWeight: '800',
    fontSize: 14,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
  },
  memberSub: {
    fontSize: 12,
    marginTop: 2,
  },
  memberBalance: {
    fontSize: 15,
    fontWeight: '800',
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
    fontSize: 14,
    fontWeight: '600',
  },
  paymentMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
});
