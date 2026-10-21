import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/auth-context';
import { useTheme } from '../../context/theme-context';
import { fetchPets, fetchMealSlots, fetchFeedings } from '../../api/pets';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { FeedButton } from '../../components/FeedButton';
import { EmptyState } from '../../components/ui/EmptyState';
import { radius, spacing, typography, type ColorPalette } from '../../constants/theme';

export default function PetsScreen() {
  const router = useRouter();
  const { household } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const queryClient = useQueryClient();

  const [dateOffset, setDateOffset] = useState(0); // 0 = today, -1 = yesterday
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + dateOffset);

  const dateKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
  const dateLabel =
    dateOffset === 0
      ? 'Today'
      : dateOffset === -1
      ? 'Yesterday'
      : dateOffset === 1
      ? 'Tomorrow'
      : targetDate.toLocaleDateString('en-IN', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });

  const { data: pets = [], isLoading: petsLoading } = useQuery({
    queryKey: ['pets', household?.id],
    queryFn: () => fetchPets(household!.id),
    enabled: !!household?.id,
  });

  const activePet =
    pets.find((p) => p.id === selectedPetId) ?? pets[0] ?? null;

  const { data: mealSlots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ['mealSlots', household?.id],
    queryFn: () => fetchMealSlots(household!.id),
    enabled: !!household?.id,
  });

  const {
    data: feedings = [],
    isLoading: feedingsLoading,
    refetch,
  } = useQuery({
    queryKey: ['feedings', household?.id, dateKey],
    queryFn: () => fetchFeedings(household!.id, dateKey),
    enabled: !!household?.id,
  });

  const petFeedings = feedings.filter(
    (f) => !f.pet_id || (activePet && f.pet_id === activePet.id)
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={feedingsLoading}
          onRefresh={refetch}
          tintColor={colors.primary}
        />
      }
    >
      {/* Pet Selector Bar */}
      <View style={styles.petSelectorRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {pets.map((pet) => {
            const isSelected = activePet?.id === pet.id;
            return (
              <TouchableOpacity
                key={pet.id}
                style={[styles.petTab, isSelected && styles.petTabActive]}
                onPress={() => setSelectedPetId(pet.id)}
              >
                <Ionicons
                  name="paw"
                  size={16}
                  color={isSelected ? colors.textInverse : colors.primaryLight}
                />
                <Text style={[styles.petTabText, isSelected && styles.petTabTextActive]}>
                  {pet.name}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.addPetBtn}
            onPress={() => router.push('/modal/add-pet')}
          >
            <Ionicons name="add" size={16} color={colors.textSecondary} />
            <Text style={styles.addPetText}>Add Cat</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Date Navigator */}
      <View style={styles.dateNavigator}>
        <TouchableOpacity
          onPress={() => setDateOffset((prev) => prev - 1)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text style={styles.dateTitle}>{dateLabel}</Text>
          <Text style={styles.dateSub}>{dateKey}</Text>
        </View>

        <TouchableOpacity
          onPress={() => setDateOffset((prev) => prev + 1)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Scheduled Meal Slots */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Scheduled Meals</Text>
        <TouchableOpacity
          style={styles.treatBtn}
          onPress={() =>
            router.push({
              pathname: '/modal/extra-feed',
              params: { petId: activePet?.id, petName: activePet?.name },
            })
          }
        >
          <Ionicons name="gift-outline" size={14} color={colors.accent} />
          <Text style={styles.treatText}>Extra Treat</Text>
        </TouchableOpacity>
      </View>

      <Card style={{ padding: spacing.md }}>
        {mealSlots.length === 0 ? (
          <EmptyState title="No Meal Slots" message="No meal slots configured for this home." />
        ) : (
          mealSlots.map((slot, index) => {
            const feeding = petFeedings.find(
              (f) => f.meal_slot_id === slot.id && f.feeding_type === 'scheduled'
            );
            const isFed = !!feeding;
            const feederName = feeding?.feeder?.display_name;
            const fedAtTime = feeding?.fed_at
              ? new Date(feeding.fed_at).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : undefined;

            return (
              <View
                key={slot.id}
                style={[
                  styles.slotRow,
                  index < mealSlots.length - 1 && styles.borderBottom,
                ]}
              >
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
                  feedingDate={dateKey}
                  alreadyFed={isFed}
                  fedByName={feederName}
                  fedAtTime={fedAtTime}
                  petId={activePet?.id}
                  petName={activePet?.name}
                  onFedSuccess={() => queryClient.invalidateQueries({ queryKey: ['feedings'] })}
                />
              </View>
            );
          })
        )}
      </Card>

      {/* Daily Activity / Feeding Log */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Daily Log</Text>
      </View>

      {petFeedings.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="time-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No Feedings Logged Yet</Text>
          <Text style={styles.emptyDesc}>
            Meals recorded for {dateLabel.toLowerCase()} will appear here.
          </Text>
        </Card>
      ) : (
        <Card style={{ padding: 0 }}>
          {petFeedings.map((f, idx) => (
            <View
              key={f.id}
              style={[
                styles.logRow,
                idx < petFeedings.length - 1 && styles.borderBottom,
              ]}
            >
              <View style={styles.logIcon}>
                <Ionicons
                  name={f.feeding_type === 'extra' ? 'sparkles' : 'checkmark-circle'}
                  size={20}
                  color={f.feeding_type === 'extra' ? colors.accent : colors.primary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.logTitle}>
                  {f.feeding_type === 'extra'
                    ? 'Extra meal / treat'
                    : f.meal_slot?.name || 'Scheduled meal'}
                  {f.note ? ` — "${f.note}"` : ''}
                </Text>
                <Text style={styles.logMeta}>
                  Recorded by {f.feeder?.display_name || 'Roommate'} at{' '}
                  {new Date(f.fed_at).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </View>

              <Badge
                label={f.feeding_type === 'extra' ? 'Treat' : 'Scheduled'}
                variant={f.feeding_type === 'extra' ? 'warning' : 'success'}
              />
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ColorPalette, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
    petSelectorRow: {
      marginBottom: spacing.md,
    },
    petTab: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceElevated,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    petTabActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    petTabText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    petTabTextActive: {
      color: colors.textInverse,
    },
    addPetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      gap: 4,
    },
    addPetText: {
      fontSize: 13,
      color: colors.textMuted,
    },
    dateNavigator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      paddingVertical: 10,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.lg,
    },
    dateTitle: {
      ...typography.bodyLg,
      fontWeight: '700',
      color: colors.text,
    },
    dateSub: {
      ...typography.bodySm,
      color: colors.textMuted,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
      marginTop: spacing.sm,
    },
    sectionTitle: {
      ...typography.titleMd,
      color: colors.text,
    },
    treatBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.accentMuted,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: radius.md,
      gap: 4,
    },
    treatText: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? colors.accentLight : colors.accent,
    },
    slotRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    slotName: {
      ...typography.bodyLg,
      fontWeight: '600',
      color: colors.text,
    },
    slotTime: {
      ...typography.bodySm,
      color: colors.textMuted,
      marginTop: 2,
    },
    emptyCard: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      gap: 4,
    },
    emptyTitle: {
      ...typography.bodyLg,
      fontWeight: '600',
      color: colors.text,
      marginTop: 6,
    },
    emptyDesc: {
      ...typography.bodySm,
      color: colors.textMuted,
      textAlign: 'center',
    },
    logRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
    },
    logIcon: {
      marginRight: spacing.md,
    },
    logTitle: {
      ...typography.bodyMd,
      fontWeight: '600',
      color: colors.text,
    },
    logMeta: {
      ...typography.bodySm,
      color: colors.textMuted,
      marginTop: 2,
    },
    borderBottom: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
  });
