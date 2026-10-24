import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
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
import { BalanceHeroCard } from '../../components/ui/BalanceHeroCard';
import { ActionTile } from '../../components/ui/ActionTile';
import { radius, spacing } from '../../constants/theme';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, household, profile } = useAuth();
  const { colors, isDark } = useTheme();
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

  const myBalanceRupees = (settlement?.myBalancePaise ?? 0) / 100;
  const totalMonthRupees = (settlement?.totalPaise ?? 0) / 100;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: isDark ? colors.background : '#FAF8F3' }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={expLoading || setLoading}
          onRefresh={handleRefresh}
          tintColor={isDark ? colors.primary : '#103F32'}
        />
      }
    >
      {/* Editorial Header Greeting */}
      <View style={styles.greetingHeader}>
        <View>
          <Text style={[styles.greetingSub, { color: isDark ? colors.textSecondary : '#6D756F' }]}>
            Good morning,
          </Text>
          <Text style={[styles.greetingName, { color: isDark ? colors.text : '#19231F' }]}>
            {profile?.display_name || 'Roommate'} 👋
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/settings')}
          style={[styles.householdPill, { backgroundColor: isDark ? colors.surfaceElevated : '#F2EEE5' }]}
        >
          <Text style={[styles.householdPillText, { color: isDark ? colors.text : '#103F32' }]}>
            {household?.name || 'OurHome'}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={isDark ? colors.textSecondary : '#6D756F'} />
        </TouchableOpacity>
      </View>

      {/* Luxury Forest Green Hero Card */}
      <BalanceHeroCard
        netBalanceRupees={myBalanceRupees}
        totalHouseholdSpentRupees={totalMonthRupees}
        monthLabel={monthName.toUpperCase()}
        onSettlePress={() => router.push('/(tabs)/settle')}
      />

      {/* Quick Action Tiles */}
      <View style={styles.actionsGrid}>
        <ActionTile
          label="Add Expense"
          iconName="add"
          accentColor="#103F32"
          backgroundColor="#E2EBE3"
          onPress={() => router.push('/modal/new-expense')}
        />
        <ActionTile
          label="Add Supply"
          iconName="cart-outline"
          accentColor="#D77F57"
          backgroundColor="#F2EEE5"
          onPress={() => router.push('/(tabs)/supplies')}
        />
        <ActionTile
          label="Settle Up"
          iconName="swap-horizontal"
          accentColor="#103F32"
          backgroundColor="#E2EBE3"
          onPress={() => router.push('/modal/record-payment')}
        />
        <ActionTile
          label="More"
          iconName="ellipsis-horizontal"
          accentColor="#6D756F"
          backgroundColor="#F2EEE5"
          onPress={() => router.push('/settings')}
        />
      </View>

      {/* Pet Care Overview */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleWrap}>
          <Text style={{ fontSize: 16 }}>🐾</Text>
          <Text style={[styles.sectionTitle, { color: isDark ? colors.text : '#19231F' }]}>
            Today's Pet Care
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/pets')}>
          <Text style={[styles.seeAllText, { color: isDark ? colors.primaryLight : '#103F32' }]}>
            See all
          </Text>
        </TouchableOpacity>
      </View>

      <Card style={[styles.petCard, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#E7E6E0' }]}>
        {mealSlots.length === 0 ? (
          <Text style={[styles.emptyNote, { color: colors.textMuted }]}>
            No meal slots provisioned yet.
          </Text>
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
                  <Text style={[styles.slotName, { color: isDark ? colors.text : '#19231F' }]}>
                    {slot.name}
                  </Text>
                  {slot.reminder_time ? (
                    <Text style={[styles.slotTime, { color: colors.textMuted }]}>
                      {slot.reminder_time}
                    </Text>
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

      {/* Needed Supplies */}
      {pendingSupplies.length > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWrap}>
              <Ionicons name="cart" size={18} color={isDark ? colors.primaryLight : '#103F32'} />
              <Text style={[styles.sectionTitle, { color: isDark ? colors.text : '#19231F' }]}>
                Needed Supplies
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/supplies')}>
              <Text style={[styles.seeAllText, { color: isDark ? colors.primaryLight : '#103F32' }]}>
                Grocery Board
              </Text>
            </TouchableOpacity>
          </View>

          <Card style={{ padding: spacing.md, backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#E7E6E0' }}>
            {pendingSupplies.map((item, idx) => (
              <View
                key={item.id}
                style={[
                  styles.supplyItemRow,
                  idx < pendingSupplies.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? colors.border : '#E7E6E0' },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.supplyName, { color: isDark ? colors.text : '#19231F' }]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.supplyCategory, { color: colors.textMuted }]}>
                    {item.category}
                  </Text>
                </View>
                {item.quantity ? (
                  <Badge label={item.quantity} variant="neutral" />
                ) : null}
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {/* Recent Activity */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleWrap}>
          <Ionicons name="receipt" size={18} color={isDark ? colors.primaryLight : '#103F32'} />
          <Text style={[styles.sectionTitle, { color: isDark ? colors.text : '#19231F' }]}>
            Recent Activity
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/expenses')}>
          <Text style={[styles.seeAllText, { color: isDark ? colors.primaryLight : '#103F32' }]}>
            View all
          </Text>
        </TouchableOpacity>
      </View>

      {expenses.length === 0 ? (
        <Card style={[styles.emptyCard, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#E7E6E0' }]}>
          <Text style={[styles.emptyNote, { color: colors.textMuted }]}>
            No expenses recorded for this month yet.
          </Text>
          <Button
            title="Add First Expense"
            variant="secondary"
            size="sm"
            onPress={() => router.push('/modal/new-expense')}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      ) : (
        <Card style={{ padding: 0, backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#E7E6E0' }}>
          {expenses.map((exp, index) => (
            <View
              key={exp.id}
              style={[
                styles.expenseRow,
                index < expenses.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? colors.border : '#E7E6E0' },
              ]}
            >
              <View style={[styles.expenseIconBadge, { backgroundColor: isDark ? colors.surfaceElevated : '#F2EEE5' }]}>
                <Text style={{ fontSize: 18 }}>
                  {exp.category?.name === 'Groceries'
                    ? '🛒'
                    : exp.category?.is_pet
                    ? '🐾'
                    : '📄'}
                </Text>
              </View>

              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.expenseTitle, { color: isDark ? colors.text : '#19231F' }]} numberOfLines={1}>
                  {exp.title}
                </Text>
                <Text style={[styles.expenseMeta, { color: colors.textMuted }]}>
                  Paid by {exp.payer?.display_name || 'Roommate'} · {exp.expense_date}
                </Text>
              </View>

              <Text style={[styles.expenseAmount, { color: isDark ? colors.text : '#19231F' }]}>
                {formatRupees(Math.round(Number(exp.amount) * 100))}
              </Text>
            </View>
          ))}
        </Card>
      )}
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
  greetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  greetingSub: {
    fontSize: 13,
    fontWeight: '500',
  },
  greetingName: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  householdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    gap: 4,
    marginTop: 4,
  },
  householdPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  petCard: {
    padding: spacing.md,
    borderRadius: 20,
  },
  mealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  slotName: {
    fontSize: 15,
    fontWeight: '700',
  },
  slotTime: {
    fontSize: 12,
    marginTop: 2,
  },
  supplyItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  supplyName: {
    fontSize: 14,
    fontWeight: '600',
  },
  supplyCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  expenseIconBadge: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  expenseTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  expenseMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderRadius: 20,
  },
  emptyNote: {
    fontSize: 14,
    textAlign: 'center',
  },
});
