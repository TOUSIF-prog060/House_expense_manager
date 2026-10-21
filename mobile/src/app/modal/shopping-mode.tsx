import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/Button';
import {
  fetchSupplies,
  toggleSupplyPurchased,
  type SupplyWithProfiles,
} from '../../api/supplies';
import { radius, spacing, typography, type ColorPalette } from '../../constants/theme';
import { useTheme } from '../../context/theme-context';

export default function ShoppingModeModal() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, household } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const { data: supplies = [], isLoading } = useQuery({
    queryKey: ['supplies', household?.id],
    queryFn: () => fetchSupplies(household!.id),
    enabled: !!household?.id,
  });

  const toggleMutation = useMutation({
    mutationFn: toggleSupplyPurchased,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplies', household?.id] });
    },
  });

  function handleCheck(item: SupplyWithProfiles) {
    if (!user?.id) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Ignore
    }
    toggleMutation.mutate({
      id: item.id,
      isPurchased: !item.is_purchased,
      userId: user.id,
    });
  }

  const pendingItems = supplies.filter((s) => !s.is_purchased);
  const purchasedItems = supplies.filter((s) => s.is_purchased);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* High-Contrast Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.title}>Supermarket Mode</Text>
          <Text style={styles.counter}>
            {purchasedItems.length} of {supplies.length} items checked
          </Text>
        </View>

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: supplies.length > 0
                ? `${Math.round((purchasedItems.length / supplies.length) * 100)}%`
                : '0%',
            },
          ]}
        />
      </View>

      <FlatList
        data={[...pendingItems, ...purchasedItems]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.itemCard,
              item.is_purchased && styles.itemCardChecked,
            ]}
            onPress={() => handleCheck(item)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.largeCheckbox,
                item.is_purchased && styles.largeCheckboxChecked,
              ]}
            >
              {item.is_purchased ? (
                <Ionicons name="checkmark" size={22} color={colors.textInverse} />
              ) : null}
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.itemName,
                  item.is_purchased && styles.itemNameChecked,
                ]}
              >
                {item.name}
              </Text>
              <Text style={styles.itemCategory}>{item.category}</Text>
            </View>

            {item.quantity ? (
              <View style={styles.qtyBadge}>
                <Text style={styles.qtyText}>{item.quantity}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        )}
      />

      {/* Floating Bottom Bar */}
      <View style={styles.bottomBar}>
        <Button
          title={`Done Shopping (${purchasedItems.length} items)`}
          variant="primary"
          size="lg"
          icon={<Ionicons name="receipt-outline" size={18} color={colors.textInverse} />}
          onPress={() => {
            if (purchasedItems.length === 0) {
              router.back();
              return;
            }
            Alert.alert(
              'Shopping Finished',
              `Would you like to record these ${purchasedItems.length} purchased items as a shared grocery expense?`,
              [
                { text: 'Just Close', onPress: () => router.back() },
                {
                  text: 'Create Expense',
                  onPress: () => {
                    router.back();
                    router.push({
                      pathname: '/modal/new-expense',
                      params: {
                        initialTitle: `Supermarket Run (${purchasedItems.length} items)`,
                        initialCategory: 'Groceries',
                      },
                    });
                  },
                },
              ]
            );
          }}
          style={{ width: '100%' }}
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorPalette, isDark: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
    },
    counter: {
      ...typography.bodySm,
      color: colors.primaryLight,
      fontWeight: '600',
      marginTop: 2,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressTrack: {
      height: 4,
      backgroundColor: colors.border,
      width: '100%',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
    },
    listContent: {
      padding: spacing.lg,
      paddingBottom: 100,
      gap: spacing.md,
    },
    itemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    itemCardChecked: {
      opacity: 0.5,
      backgroundColor: colors.surfaceElevated,
      borderColor: colors.borderLight,
    },
    largeCheckbox: {
      width: 32,
      height: 32,
      borderRadius: radius.md,
      borderWidth: 2,
      borderColor: colors.borderLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.lg,
    },
    largeCheckboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    itemName: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    itemNameChecked: {
      textDecorationLine: 'line-through',
      color: colors.textMuted,
    },
    itemCategory: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    qtyBadge: {
      backgroundColor: colors.surfaceElevated,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
    },
    qtyText: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 13,
    },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });
