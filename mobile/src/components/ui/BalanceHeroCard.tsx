import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing } from '../../constants/theme';
import { useTheme } from '../../context/theme-context';

interface BalanceHeroCardProps {
  netBalanceRupees: number;
  totalHouseholdSpentRupees: number;
  monthLabel?: string;
  onSettlePress?: () => void;
}

export function BalanceHeroCard({
  netBalanceRupees,
  totalHouseholdSpentRupees,
  monthLabel = 'OCTOBER 2026',
  onSettlePress,
}: BalanceHeroCardProps) {
  const { colors, isDark } = useTheme();

  const isOwed = netBalanceRupees > 0;
  const owes = netBalanceRupees < 0;
  const isSettled = netBalanceRupees === 0;

  const formattedNet = `₹${Math.abs(netBalanceRupees).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const formattedTotal = `₹${totalHouseholdSpentRupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return (
    <View style={styles.card}>
      {/* Decorative Warm Ambient Glow */}
      <View style={styles.ambientGlow} />

      <View style={styles.topRow}>
        <View style={styles.subtitleWrap}>
          <Text style={styles.subtitleLabel}>Household Balance</Text>
          <Text style={styles.monthPillText}>{monthLabel}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onSettlePress}
          style={styles.arrowButton}
        >
          <Ionicons name="arrow-forward" size={18} color="#103F32" />
        </TouchableOpacity>
      </View>

      {/* Main Net Amount */}
      <View style={styles.amountContainer}>
        <Text style={styles.netAmountText}>
          {owes ? `-${formattedNet}` : isOwed ? `+${formattedNet}` : '₹0.00'}
        </Text>

        {/* Status Tag */}
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {isSettled
              ? 'All settled! 🎉'
              : isOwed
              ? 'You are owed'
              : 'You owe'}
          </Text>
        </View>
      </View>

      {/* Bottom Row */}
      <View style={styles.divider} />

      <View style={styles.bottomRow}>
        <View>
          <Text style={styles.bottomLabel}>Shared Household Total</Text>
          <Text style={styles.bottomValue}>{formattedTotal}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onSettlePress}
          style={styles.settlePillBtn}
        >
          <Text style={styles.settlePillText}>Settle Up</Text>
          <Ionicons name="arrow-forward" size={14} color="#103F32" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#092E25',
    borderRadius: 24,
    padding: spacing.xl,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#092E25',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginVertical: spacing.sm,
  },
  ambientGlow: {
    position: 'absolute',
    right: -30,
    top: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(197, 167, 125, 0.18)', // Champagne Gold ambient
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subtitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  subtitleLabel: {
    color: '#E2EBE3',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  monthPillText: {
    color: '#C5A77D',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAF8F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amountContainer: {
    marginVertical: spacing.md,
  },
  netAmountText: {
    color: '#FAF8F3',
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(226, 235, 227, 0.18)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    marginTop: spacing.xs,
  },
  statusText: {
    color: '#E2EBE3',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(231, 230, 224, 0.15)',
    marginVertical: spacing.md,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomLabel: {
    color: 'rgba(226, 235, 227, 0.75)',
    fontSize: 11,
    fontWeight: '500',
  },
  bottomValue: {
    color: '#FAF8F3',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  settlePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2EBE3',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    gap: 6,
  },
  settlePillText: {
    color: '#103F32',
    fontSize: 12,
    fontWeight: '700',
  },
});
