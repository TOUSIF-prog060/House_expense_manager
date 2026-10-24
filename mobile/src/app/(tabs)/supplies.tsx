import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/auth-context';
import { useTheme } from '../../context/theme-context';
import {
  fetchSupplies,
  addSupplyItem,
  toggleSupplyPurchased,
  deleteSupplyItem,
  type SupplyWithProfiles,
} from '../../api/supplies';
import {
  DEFAULT_SUPPLY_CATEGORIES,
  autoCategorizeSupplyItem,
  parseSupplyInput,
} from '@ourhome/core';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { radius, spacing } from '../../constants/theme';

export default function SuppliesScreen() {
  const router = useRouter();
  const { user, household } = useAuth();
  const { colors, isDark } = useTheme();
  const queryClient = useQueryClient();

  const [inputVal, setInputVal] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'purchased' | 'all'>('pending');

  const {
    data: supplies = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['supplies', household?.id],
    queryFn: () => fetchSupplies(household!.id),
    enabled: !!household?.id,
  });

  const addMutation = useMutation({
    mutationFn: addSupplyItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplies', household?.id] });
      setInputVal('');
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Ignore
      }
    },
    onError: (err) => {
      Alert.alert('Error', err.message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: toggleSupplyPurchased,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplies', household?.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSupplyItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplies', household?.id] });
    },
  });

  function handleQuickAdd() {
    if (!inputVal.trim() || !household?.id || !user?.id) return;

    const { name, quantity } = parseSupplyInput(inputVal);
    const category = autoCategorizeSupplyItem(name);

    addMutation.mutate({
      householdId: household.id,
      name,
      quantity,
      category,
      addedBy: user.id,
    });
  }

  function handleToggle(item: SupplyWithProfiles) {
    if (!user?.id) return;
    try {
      Haptics.selectionAsync();
    } catch {
      // Ignore
    }
    toggleMutation.mutate({
      id: item.id,
      isPurchased: !item.is_purchased,
      userId: user.id,
    });
  }

  const filteredSupplies = supplies.filter((item) => {
    if (statusFilter === 'pending' && item.is_purchased) return false;
    if (statusFilter === 'purchased' && !item.is_purchased) return false;
    if (selectedCat !== 'all' && item.category.toLowerCase() !== selectedCat.toLowerCase())
      return false;
    return true;
  });

  const pendingCount = supplies.filter((s) => !s.is_purchased).length;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#FAF8F3' }]}>
      {/* Quick Input Bar */}
      <View style={[styles.inputContainer, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#E7E6E0' }]}>
        <View style={[styles.inputWrapper, { backgroundColor: isDark ? colors.surfaceElevated : '#F2EEE5', borderColor: isDark ? colors.border : '#E7E6E0' }]}>
          <TextInput
            style={[styles.input, { color: isDark ? colors.text : '#19231F' }]}
            placeholder="e.g. Milk 2L, Onions 1kg, Soap 3..."
            placeholderTextColor={colors.textMuted}
            value={inputVal}
            onChangeText={setInputVal}
            onSubmitEditing={handleQuickAdd}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: isDark ? colors.primary : '#103F32' }, !inputVal.trim() && { opacity: 0.5 }]}
            onPress={handleQuickAdd}
            disabled={!inputVal.trim() || addMutation.isPending}
          >
            <Ionicons name="arrow-up" size={18} color="#FAF8F3" />
          </TouchableOpacity>
        </View>

        {/* Supermarket Shopping Mode Button */}
        <TouchableOpacity
          style={[styles.shoppingModeBtn, { backgroundColor: isDark ? colors.primaryMuted : '#E2EBE3' }]}
          onPress={() => router.push('/modal/shopping-mode')}
          activeOpacity={0.8}
        >
          <Ionicons name="cart" size={16} color={isDark ? colors.primaryLight : '#103F32'} />
          <Text style={[styles.shoppingModeText, { color: isDark ? colors.primaryLight : '#103F32' }]}>
            Shopping Mode ({pendingCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category Chips Scroll */}
      <View style={[styles.categoriesBar, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#E7E6E0' }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ name: 'All' }, ...DEFAULT_SUPPLY_CATEGORIES]}
          keyExtractor={(item) => item.name}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 8 }}
          renderItem={({ item }) => {
            const isSelected =
              (item.name === 'All' && selectedCat === 'all') ||
              selectedCat.toLowerCase() === item.name.toLowerCase();

            return (
              <TouchableOpacity
                style={[
                  styles.catChip,
                  isSelected
                    ? { backgroundColor: isDark ? colors.primaryMuted : '#103F32', borderColor: isDark ? colors.primary : '#103F32' }
                    : { backgroundColor: isDark ? colors.surfaceElevated : '#F2EEE5', borderColor: isDark ? colors.border : '#E7E6E0' },
                ]}
                onPress={() => setSelectedCat(item.name === 'All' ? 'all' : item.name)}
              >
                <Text
                  style={[
                    styles.catChipText,
                    isSelected ? { color: '#FAF8F3', fontWeight: '700' } : { color: isDark ? colors.text : '#19231F' },
                  ]}
                >
                  {item.name === 'All'
                    ? 'All'
                    : `${(item as { emoji?: string }).emoji || ''} ${item.name}`}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Status Filter Row */}
      <View style={styles.statusRow}>
        <TouchableOpacity
          style={[styles.statusBtn, statusFilter === 'pending' && styles.statusBtnActive]}
          onPress={() => setStatusFilter('pending')}
        >
          <Text style={[styles.statusText, statusFilter === 'pending' && styles.statusTextActive]}>
            Needed ({pendingCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statusBtn, statusFilter === 'purchased' && styles.statusBtnActive]}
          onPress={() => setStatusFilter('purchased')}
        >
          <Text
            style={[styles.statusText, statusFilter === 'purchased' && styles.statusTextActive]}
          >
            Purchased
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statusBtn, statusFilter === 'all' && styles.statusBtnActive]}
          onPress={() => setStatusFilter('all')}
        >
          <Text style={[styles.statusText, statusFilter === 'all' && styles.statusTextActive]}>
            All ({supplies.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Supplies List */}
      <FlatList
        data={filteredSupplies}
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
              icon={<Ionicons name="bag-check-outline" size={44} color={colors.textMuted} />}
              title="No Supplies Found"
              message={
                statusFilter === 'pending'
                  ? 'Pantry is fully stocked! Add items when you run low.'
                  : 'No items match your filter.'
              }
            />
          ) : null
        }
        renderItem={({ item }) => (
          <Card
            style={[
              styles.supplyCard,
              { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#E7E6E0' },
              item.is_purchased && { opacity: 0.65, backgroundColor: isDark ? colors.surfaceElevated : '#F2EEE5' },
            ]}
          >
            <TouchableOpacity
              style={styles.checkCircle}
              onPress={() => handleToggle(item)}
              activeOpacity={0.6}
            >
              {item.is_purchased ? (
                <Ionicons name="checkmark-circle" size={24} color={isDark ? colors.primaryLight : '#103F32'} />
              ) : (
                <View style={[styles.emptyCircle, { borderColor: colors.borderLight }]} />
              )}
            </TouchableOpacity>

            <View style={{ flex: 1, marginRight: 8 }}>
              <Text
                style={[
                  styles.itemName,
                  { color: isDark ? colors.text : '#19231F' },
                  item.is_purchased && { textDecorationLine: 'line-through', color: colors.textMuted },
                ]}
              >
                {item.name}
              </Text>
              <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                {item.category}
                {item.adder?.display_name ? ` · Added by ${item.adder.display_name}` : ''}
                {item.is_purchased && item.buyer?.display_name
                  ? ` · Bought by ${item.buyer.display_name}`
                  : ''}
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              {item.quantity ? <Badge label={item.quantity} variant="neutral" /> : null}

              {item.is_purchased ? (
                <TouchableOpacity
                  style={[styles.convertBtn, { backgroundColor: isDark ? colors.primaryMuted : '#E2EBE3' }]}
                  onPress={() =>
                    router.push({
                      pathname: '/modal/new-expense',
                      params: {
                        initialTitle: `${item.name}${item.quantity ? ` (${item.quantity})` : ''}`,
                        initialCategory: item.category,
                      },
                    })
                  }
                >
                  <Ionicons name="receipt-outline" size={13} color={isDark ? colors.primaryLight : '#103F32'} />
                  <Text style={[styles.convertText, { color: isDark ? colors.primaryLight : '#103F32' }]}>
                    Split bill
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => deleteMutation.mutate(item.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inputContainer: {
    padding: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shoppingModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    gap: 6,
  },
  shoppingModeText: {
    fontWeight: '700',
    fontSize: 13,
  },
  categoriesBar: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  catChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  statusBtn: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.md,
  },
  statusBtnActive: {
    backgroundColor: '#F2EEE5',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusTextActive: {
    fontWeight: '800',
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  supplyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
  },
  checkCircle: {
    marginRight: spacing.md,
  },
  emptyCircle: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 2,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
  },
  itemMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  convertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    gap: 4,
  },
  convertText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
