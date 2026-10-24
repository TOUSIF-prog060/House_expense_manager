import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/auth-context';
import { useTheme } from '../../context/theme-context';
import { fetchExpenses } from '../../api/expenses';
import { formatRupees } from '@ourhome/core';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { radius, spacing } from '../../constants/theme';

export default function ExpensesScreen() {
  const router = useRouter();
  const { user, household } = useAuth();
  const { colors, isDark } = useTheme();

  const [dateOffset, setDateOffset] = useState(0); // 0 = current month, -1 = prev, etc.
  const [filterMode, setFilterMode] = useState<'all' | 'mine'>('all');

  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() + dateOffset);

  const monthKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = targetDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  const {
    data: allExpenses = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['expenses', household?.id, monthKey],
    queryFn: () => fetchExpenses(household!.id, { month: monthKey }),
    enabled: !!household?.id,
  });

  const displayedExpenses =
    filterMode === 'mine'
      ? allExpenses.filter((e) => e.paid_by === user?.id)
      : allExpenses;

  const totalPaise = displayedExpenses.reduce(
    (sum, e) => sum + Math.round(Number(e.amount) * 100),
    0
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#FAF8F3' }]}>
      {/* Month Navigator Header */}
      <View style={[styles.monthBar, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#E7E6E0' }]}>
        <TouchableOpacity
          onPress={() => setDateOffset((prev) => prev - 1)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.monthNavBtn}
        >
          <Ionicons name="chevron-back" size={20} color={isDark ? colors.text : '#19231F'} />
        </TouchableOpacity>

        <Text style={[styles.monthTitle, { color: isDark ? colors.text : '#19231F' }]}>
          {monthLabel}
        </Text>

        <TouchableOpacity
          onPress={() => setDateOffset((prev) => prev + 1)}
          disabled={dateOffset >= 0}
          style={[styles.monthNavBtn, { opacity: dateOffset >= 0 ? 0.3 : 1 }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-forward" size={20} color={isDark ? colors.text : '#19231F'} />
        </TouchableOpacity>
      </View>

      {/* Total Spent Hero Banner */}
      <View style={styles.spentCardWrap}>
        <View style={[styles.spentCard, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#E7E6E0' }]}>
          <View style={styles.spentTopRow}>
            <View>
              <Text style={[styles.spentLabel, { color: colors.textSecondary }]}>Total Spent</Text>
              <Text style={[styles.spentAmount, { color: isDark ? colors.text : '#19231F' }]}>
                {formatRupees(totalPaise)}
              </Text>
            </View>

            <View style={styles.trendBadge}>
              <Ionicons name="arrow-down" size={12} color="#103F32" />
              <Text style={styles.trendText}>vs last month</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            filterMode === 'all'
              ? { backgroundColor: isDark ? colors.primary : '#103F32', borderColor: isDark ? colors.primary : '#103F32' }
              : { backgroundColor: isDark ? colors.surface : '#F2EEE5', borderColor: isDark ? colors.border : '#E7E6E0' },
          ]}
          onPress={() => setFilterMode('all')}
        >
          <Text
            style={[
              styles.filterChipText,
              filterMode === 'all' ? { color: '#FAF8F3' } : { color: isDark ? colors.text : '#19231F' },
            ]}
          >
            All ({allExpenses.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            filterMode === 'mine'
              ? { backgroundColor: isDark ? colors.primary : '#103F32', borderColor: isDark ? colors.primary : '#103F32' }
              : { backgroundColor: isDark ? colors.surface : '#F2EEE5', borderColor: isDark ? colors.border : '#E7E6E0' },
          ]}
          onPress={() => setFilterMode('mine')}
        >
          <Text
            style={[
              styles.filterChipText,
              filterMode === 'mine' ? { color: '#FAF8F3' } : { color: isDark ? colors.text : '#19231F' },
            ]}
          >
            Paid by Me
          </Text>
        </TouchableOpacity>
      </View>

      {/* Expense List */}
      <FlatList
        data={displayedExpenses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={isDark ? colors.primary : '#103F32'}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon={<Ionicons name="receipt-outline" size={48} color={colors.textMuted} />}
              title="No Expenses"
              message={`No expenses recorded for ${monthLabel}.`}
            />
          ) : null
        }
        renderItem={({ item }) => {
          const isPayer = item.paid_by === user?.id;
          const myShare = item.shares.find((s) => s.user_id === user?.id);
          const hasReceipt = (item.attachments?.length ?? 0) > 0;

          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: '/modal/new-expense',
                  params: {
                    editId: item.id,
                    initialTitle: item.title,
                    initialAmount: String(item.amount),
                    initialCategory: item.category_id || '',
                    initialDate: item.expense_date,
                    initialNotes: item.notes || '',
                  },
                })
              }
            >
              <Card style={[styles.expenseCard, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#E7E6E0' }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconCircle, { backgroundColor: isDark ? colors.surfaceElevated : '#F2EEE5' }]}>
                    <Text style={{ fontSize: 18 }}>
                      {item.category?.name === 'Groceries'
                        ? '🛒'
                        : item.category?.is_pet
                        ? '🐾'
                        : '📄'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.title, { color: isDark ? colors.text : '#19231F' }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.meta, { color: colors.textMuted }]}>
                      {item.expense_date} · Paid by{' '}
                      <Text style={{ color: isPayer ? (isDark ? colors.primaryLight : '#103F32') : colors.textSecondary, fontWeight: '700' }}>
                        {isPayer ? 'You' : item.payer?.display_name || 'Roommate'}
                      </Text>
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.amount, { color: isDark ? colors.text : '#19231F' }]}>
                      {formatRupees(Math.round(Number(item.amount) * 100))}
                    </Text>
                    {myShare ? (
                      <Text style={[styles.myShareText, { color: colors.textMuted }]}>
                        Your share: {formatRupees(Math.round(Number(myShare.share_amount) * 100))}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Badges / Extras */}
                <View style={[styles.cardFooter, { borderTopColor: isDark ? colors.border : '#E7E6E0' }]}>
                  <Badge
                    label={item.category?.name || 'General'}
                    variant={item.category?.name === 'Groceries' ? 'success' : 'neutral'}
                  />

                  {hasReceipt ? (
                    <View style={[styles.receiptTag, { backgroundColor: isDark ? colors.accentMuted : '#F2EEE5' }]}>
                      <Ionicons name="document-attach" size={13} color="#D77F57" />
                      <Text style={[styles.receiptText, { color: '#D77F57' }]}>Receipt</Text>
                    </View>
                  ) : null}

                  <Text style={[styles.sharesCount, { color: colors.textMuted }]}>
                    Split {item.shares.length} {item.shares.length === 1 ? 'way' : 'ways'}
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
      />

      {/* Floating Add Expense FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: isDark ? colors.primary : '#103F32' }]}
        onPress={() => router.push('/modal/new-expense')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color="#FAF8F3" />
        <Text style={styles.fabText}>Add Expense</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  monthBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  spentCardWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  spentCard: {
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  spentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  spentLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  spentAmount: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2EBE3',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    gap: 4,
  },
  trendText: {
    color: '#103F32',
    fontSize: 11,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 90,
    gap: spacing.md,
  },
  expenseCard: {
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: '800',
  },
  myShareText: {
    fontSize: 11,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  receiptTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    gap: 4,
  },
  receiptText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sharesCount: {
    marginLeft: 'auto',
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: radius.full,
    gap: 6,
    shadowColor: '#103F32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: '#FAF8F3',
    fontWeight: '800',
    fontSize: 15,
  },
});
