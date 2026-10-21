import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/auth-context';
import { useTheme } from '../../context/theme-context';
import { fetchExpenses, type ExpenseWithDetails } from '../../api/expenses';
import { formatRupees } from '@ourhome/core';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { radius, spacing, typography, type ColorPalette } from '../../constants/theme';

export default function ExpensesScreen() {
  const router = useRouter();
  const { user, household } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

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
    <View style={styles.container}>
      {/* Month Navigator Header */}
      <View style={styles.monthBar}>
        <TouchableOpacity
          onPress={() => setDateOffset((prev) => prev - 1)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text style={styles.monthTitle}>{monthLabel}</Text>
          <Text style={styles.monthTotal}>{formatRupees(totalPaise)}</Text>
        </View>

        <TouchableOpacity
          onPress={() => setDateOffset((prev) => prev + 1)}
          disabled={dateOffset >= 0}
          style={{ opacity: dateOffset >= 0 ? 0.3 : 1 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filterMode === 'all' && styles.filterChipActive]}
          onPress={() => setFilterMode('all')}
        >
          <Text
            style={[
              styles.filterChipText,
              filterMode === 'all' && styles.filterChipTextActive,
            ]}
          >
            All Household ({allExpenses.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterMode === 'mine' && styles.filterChipActive]}
          onPress={() => setFilterMode('mine')}
        >
          <Text
            style={[
              styles.filterChipText,
              filterMode === 'mine' && styles.filterChipTextActive,
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
            tintColor={colors.primary}
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
              activeOpacity={0.7}
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
              <Card style={styles.expenseCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconCircle}>
                    <Text style={{ fontSize: 18 }}>
                      {item.category?.name === 'Groceries'
                        ? '🛒'
                        : item.category?.is_pet
                        ? '🐾'
                        : '📄'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.title} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.meta}>
                      {item.expense_date} · Paid by{' '}
                      <Text style={{ color: isPayer ? colors.primaryLight : colors.textSecondary }}>
                        {isPayer ? 'You' : item.payer?.display_name || 'Roommate'}
                      </Text>
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.amount}>
                      {formatRupees(Math.round(Number(item.amount) * 100))}
                    </Text>
                    {myShare ? (
                      <Text style={styles.myShareText}>
                        Your share: {formatRupees(Math.round(Number(myShare.share_amount) * 100))}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Badges / Extras */}
                <View style={styles.cardFooter}>
                  <Badge
                    label={item.category?.name || 'General'}
                    variant={item.category?.name === 'Groceries' ? 'success' : 'neutral'}
                  />

                  {hasReceipt ? (
                    <View style={styles.receiptTag}>
                      <Ionicons name="document-attach" size={13} color={colors.accent} />
                      <Text style={styles.receiptText}>Receipt</Text>
                    </View>
                  ) : null}

                  <Text style={styles.sharesCount}>
                    Split {item.shares.length} {item.shares.length === 1 ? 'way' : 'ways'}
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
      />

      {/* Floating Add Expense Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/modal/new-expense')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={26} color={colors.textInverse} />
        <Text style={styles.fabText}>Add Expense</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ColorPalette, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    monthBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    monthTitle: {
      ...typography.bodySm,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    monthTotal: {
      ...typography.titleLg,
      color: colors.text,
    },
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    filterChip: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: colors.primaryMuted,
      borderColor: colors.primary,
    },
    filterChipText: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: '500',
    },
    filterChipTextActive: {
      color: isDark ? colors.primaryLight : colors.primaryDark,
      fontWeight: '600',
    },
    listContent: {
      padding: spacing.lg,
      paddingBottom: 90,
      gap: spacing.md,
    },
    expenseCard: {
      padding: spacing.md,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    title: {
      ...typography.bodyLg,
      fontWeight: '600',
      color: colors.text,
    },
    meta: {
      ...typography.bodySm,
      color: colors.textMuted,
      marginTop: 2,
    },
    amount: {
      ...typography.titleMd,
      color: colors.text,
    },
    myShareText: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: spacing.sm,
    },
    receiptTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.accentMuted,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.full,
      gap: 4,
    },
    receiptText: {
      fontSize: 11,
      color: colors.accentLight,
      fontWeight: '600',
    },
    sharesCount: {
      marginLeft: 'auto',
      fontSize: 12,
      color: colors.textMuted,
    },
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 20,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: radius.full,
      gap: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 6,
    },
    fabText: {
      color: colors.textInverse,
      fontWeight: '700',
      fontSize: 15,
    },
  });
