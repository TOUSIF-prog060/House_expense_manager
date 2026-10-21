import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/auth-context';
import { useTheme } from '../../context/theme-context';
import { fetchExpenses } from '../../api/expenses';
import { fetchSettlementData } from '../../api/settlement';
import { fetchMealSlots, fetchFeedings, fetchPets } from '../../api/pets';
import { fetchSupplies } from '../../api/supplies';
import { formatRupees } from '@ourhome/core';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { FeedButton } from '../../components/FeedButton';
import { radius, spacing, typography, type ColorPalette } from '../../constants/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, household } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const monthName = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  // 1. Fetch dashboard data
  const { data: expenses = [], isLoading: expLoading, refetch: refetchExp } = useQuery({
    queryKey: ['expenses', household?.id, monthKey],
    queryFn: () => fetchExpenses(household!.id, { month: monthKey, limit: 5 }),
    enabled: !!household?.id,
  });

  const { data: settlement, isLoading: setLoading, refetch: refetchSet } = useQuery({
    queryKey: ['settlement', household?.id],
    queryFn: () => fetchSettlementData(household!.id, user!.id, 'month', household?.timezone),
    enabled: !!household?.id && !!user?.id,
  });

  const { data: mealSlots = [], refetch: refetchSlots } = useQuery({
    queryKey: ['mealSlots', household?.id],
    queryFn: () => fetchMealSlots(household!.id),
    enabled: !!household?.id,
  });

  const { data: feedings = [], refetch: refetchFeedings } = useQuery({
    queryKey: ['feedings', household?.id, todayKey],
    queryFn: () => fetchFeedings(household!.id, todayKey),
    enabled: !!household?.id,
  });

  const { data: pets = [] } = useQuery({
    queryKey: ['pets', household?.id],
    queryFn: () => fetchPets(household!.id),
    enabled: !!household?.id,
  });

  const { data: supplies = [] } = useQuery({
    queryKey: ['supplies', household?.id],
    queryFn: () => fetchSupplies(household!.id),
    enabled: !!household?.id,
  });

  const pendingSupplies = supplies.filter((s) => !s.is_purchased).slice(0, 3);

  async function handleRefresh() {
    await Promise.all([
      refetchExp(),
      refetchSet(),
      refetchSlots(),
      refetchFeedings(),
    ]);
  }

  const myBalancePaise = settlement?.myBalancePaise ?? 0;
  const totalMonthPaise = settlement?.totalPaise ?? 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={expLoading || setLoading}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Overview Banner */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <Text style={styles.heroEyebrow}>{monthName.toUpperCase()}</Text>
          <Badge
            label={myBalancePaise > 0 ? 'You are owed' : myBalancePaise < 0 ? 'You owe' : 'Settled'}
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

        <Text style={styles.heroSubtitle}>
          {myBalancePaise > 0
            ? 'Total net amount you are due to receive'
            : myBalancePaise < 0
            ? 'Total net amount you owe roommates'
            : 'All household debts are balanced'}
        </Text>

        <View style={styles.heroStatsRow}>
          <View>
            <Text style={styles.statLabel}>Shared Household Total</Text>
            <Text style={styles.statValue}>{formatRupees(totalMonthPaise)}</Text>
          </View>
          <TouchableOpacity
            style={styles.settleLink}
            onPress={() => router.push('/(tabs)/settle')}
          >
            <Text style={styles.settleLinkText}>Settle Up</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push('/modal/new-expense')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconBadge, { backgroundColor: colors.primaryMuted }]}>
            <Ionicons name="add" size={20} color={colors.primary} />
          </View>
          <Text style={styles.actionBtnText}>Add Expense</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push('/(tabs)/supplies')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconBadge, { backgroundColor: colors.accentMuted }]}>
            <Ionicons name="cart" size={20} color={colors.accent} />
          </View>
          <Text style={styles.actionBtnText}>Add Supply</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push('/modal/record-payment')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIconBadge, { backgroundColor: colors.indigoMuted }]}>
            <Ionicons name="swap-horizontal" size={20} color={colors.indigo} />
          </View>
          <Text style={styles.actionBtnText}>Pay / Settle</Text>
        </TouchableOpacity>
      </View>

      {/* Pet Care Check-in */}
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="paw" size={18} color={colors.accent} />
          <Text style={styles.sectionTitle}>Today's Pet Care</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/pets')}>
          <Text style={styles.seeAllText}>See all</Text>
        </TouchableOpacity>
      </View>

      <Card style={styles.catCard}>
        {mealSlots.length === 0 ? (
          <Text style={styles.emptyNote}>No meal slots provisioned yet.</Text>
        ) : (
          mealSlots.map((slot) => {
            const feeding = feedings.find((f) => f.meal_slot_id === slot.id);
            const isFed = !!feeding;
            const feederName = feeding?.feeder?.display_name;
            const fedAtTime = feeding?.fed_at
              ? new Date(feeding.fed_at).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : undefined;

            return (
              <View key={slot.id} style={styles.mealRow}>
                <View>
                  <Text style={styles.slotName}>{slot.name}</Text>
                  {slot.reminder_time ? (
                    <Text style={styles.slotTime}>{slot.reminder_time}</Text>
                  ) : null}
                </View>

                <FeedButton
                  householdId={household!.id}
                  slotId={slot.id}
                  slotName={slot.name}
                  feedingDate={todayKey}
                  alreadyFed={isFed}
                  fedByName={feederName}
                  fedAtTime={fedAtTime}
                  petId={pets[0]?.id}
                  petName={pets[0]?.name}
                  onFedSuccess={() => queryClient.invalidateQueries({ queryKey: ['feedings'] })}
                />
              </View>
            );
          })
        )}
      </Card>

      {/* Pending Supplies */}
      {pendingSupplies.length > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="cart" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Needed Supplies</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/supplies')}>
              <Text style={styles.seeAllText}>Grocery Board</Text>
            </TouchableOpacity>
          </View>

          <Card style={{ padding: spacing.md }}>
            {pendingSupplies.map((item, idx) => (
              <View
                key={item.id}
                style={[
                  styles.supplyItemRow,
                  idx < pendingSupplies.length - 1 && styles.borderBottom,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.supplyName}>{item.name}</Text>
                  <Text style={styles.supplyCategory}>{item.category}</Text>
                </View>
                {item.quantity ? (
                  <Badge label={item.quantity} variant="neutral" />
                ) : null}
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {/* Recent Expenses */}
      <View style={styles.sectionHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="receipt" size={18} color={colors.primary} />
          <Text style={styles.sectionTitle}>Recent Expenses</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/expenses')}>
          <Text style={styles.seeAllText}>View all</Text>
        </TouchableOpacity>
      </View>

      {expenses.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyNote}>No expenses recorded for this month yet.</Text>
          <Button
            title="Add First Expense"
            variant="secondary"
            size="sm"
            onPress={() => router.push('/modal/new-expense')}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          {expenses.map((exp, index) => (
            <View
              key={exp.id}
              style={[
                styles.expenseRow,
                index < expenses.length - 1 && styles.borderBottom,
              ]}
            >
              <View style={styles.expenseIconBadge}>
                <Text style={{ fontSize: 18 }}>
                  {exp.category?.name === 'Groceries'
                    ? '🛒'
                    : exp.category?.is_pet
                    ? '🐾'
                    : '📄'}
                </Text>
              </View>

              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.expenseTitle} numberOfLines={1}>
                  {exp.title}
                </Text>
                <Text style={styles.expenseMeta}>
                  Paid by {exp.payer?.display_name || 'Roommate'} · {exp.expense_date}
                </Text>
              </View>

              <Text style={styles.expenseAmount}>
                {formatRupees(Math.round(Number(exp.amount) * 100))}
              </Text>
            </View>
          ))}
        </Card>
      )}
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
    heroCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.lg,
    },
    heroHeader: {
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
      fontSize: 34,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
      marginVertical: 4,
    },
    heroSubtitle: {
      ...typography.bodySm,
      color: colors.textSecondary,
      marginBottom: spacing.lg,
    },
    heroStatsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    statLabel: {
      ...typography.bodySm,
      color: colors.textMuted,
    },
    statValue: {
      ...typography.bodyLg,
      fontWeight: '700',
      color: colors.text,
    },
    settleLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primaryMuted,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radius.md,
    },
    settleLinkText: {
      color: colors.primary,
      fontWeight: '600',
      fontSize: 13,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    actionBtn: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.md,
      alignItems: 'center',
      gap: 6,
    },
    actionIconBadge: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionBtnText: {
      ...typography.bodySm,
      fontWeight: '600',
      color: colors.text,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    },
    sectionTitle: {
      ...typography.titleMd,
      color: colors.text,
    },
    seeAllText: {
      ...typography.bodySm,
      color: colors.primary,
      fontWeight: '600',
    },
    catCard: {
      padding: spacing.md,
    },
    mealRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    slotName: {
      ...typography.bodyLg,
      fontWeight: '600',
      color: colors.text,
    },
    slotTime: {
      ...typography.bodySm,
      color: colors.textMuted,
    },
    supplyItemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    supplyName: {
      ...typography.bodyMd,
      color: colors.text,
      fontWeight: '500',
    },
    supplyCategory: {
      ...typography.bodySm,
      color: colors.textMuted,
    },
    expenseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
    },
    expenseIconBadge: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    expenseTitle: {
      ...typography.bodyMd,
      fontWeight: '600',
      color: colors.text,
    },
    expenseMeta: {
      ...typography.bodySm,
      color: colors.textMuted,
      marginTop: 2,
    },
    expenseAmount: {
      ...typography.bodyLg,
      fontWeight: '700',
      color: colors.text,
    },
    borderBottom: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    emptyCard: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
    },
    emptyNote: {
      ...typography.bodyMd,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });
