import React, { useState } from 'react';
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
import { Badge } from '../../components/ui/Badge';
import { FeedButton } from '../../components/FeedButton';
import { EmptyState } from '../../components/ui/EmptyState';
import { radius, spacing } from '../../constants/theme';

export default function PetsScreen() {
  const router = useRouter();
  const { household } = useAuth();
  const { colors, isDark } = useTheme();
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

  const { data: pets = [] } = useQuery({
    queryKey: ['pets', household?.id],
    queryFn: () => fetchPets(household!.id),
    enabled: !!household?.id,
  });

  const activePet =
    pets.find((p) => p.id === selectedPetId) ?? pets[0] ?? null;

  const { data: mealSlots = [] } = useQuery({
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
      style={[styles.container, { backgroundColor: isDark ? colors.background : '#FAF8F3' }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={feedingsLoading}
          onRefresh={refetch}
          tintColor={isDark ? colors.primary : '#103F32'}
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
                style={[
                  styles.petTab,
                  isSelected
                    ? { backgroundColor: isDark ? colors.primary : '#103F32', borderColor: isDark ? colors.primary : '#103F32' }
                    : { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#E7E6E0' },
                ]}
                onPress={() => setSelectedPetId(pet.id)}
              >
                <Ionicons
                  name="paw"
                  size={15}
                  color={isSelected ? '#FAF8F3' : (isDark ? colors.primaryLight : '#103F32')}
                />
                <Text
                  style={[
                    styles.petTabText,
                    isSelected ? { color: '#FAF8F3', fontWeight: '700' } : { color: isDark ? colors.text : '#19231F' },
                  ]}
                >
                  {pet.name}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[styles.addPetBtn, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#E7E6E0' }]}
            onPress={() => router.push('/modal/add-pet')}
          >
            <Ionicons name="add" size={16} color={colors.textSecondary} />
            <Text style={[styles.addPetText, { color: isDark ? colors.textSecondary : '#6D756F' }]}>
              Add Cat
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Date Navigator */}
      <View style={[styles.dateNavigator, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#E7E6E0' }]}>
        <TouchableOpacity
          onPress={() => setDateOffset((prev) => prev - 1)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={20} color={isDark ? colors.text : '#19231F'} />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.dateTitle, { color: isDark ? colors.text : '#19231F' }]}>
            {dateLabel}
          </Text>
          <Text style={[styles.dateSub, { color: colors.textMuted }]}>{dateKey}</Text>
        </View>

        <TouchableOpacity
          onPress={() => setDateOffset((prev) => prev + 1)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-forward" size={20} color={isDark ? colors.text : '#19231F'} />
        </TouchableOpacity>
      </View>

      {/* Scheduled Meal Slots */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: isDark ? colors.text : '#19231F' }]}>
          Scheduled Meals
        </Text>
        <TouchableOpacity
          style={[styles.treatBtn, { backgroundColor: isDark ? colors.accentMuted : '#F2EEE5' }]}
          onPress={() =>
            router.push({
              pathname: '/modal/extra-feed',
              params: { petId: activePet?.id, petName: activePet?.name },
            })
          }
        >
          <Ionicons name="gift-outline" size={14} color="#D77F57" />
          <Text style={[styles.treatText, { color: '#D77F57' }]}>Extra Treat</Text>
        </TouchableOpacity>
      </View>

      <Card style={{ padding: spacing.md, backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#E7E6E0', borderRadius: 20 }}>
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
                  index < mealSlots.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? colors.border : '#E7E6E0' },
                ]}
              >
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
        <Text style={[styles.sectionTitle, { color: isDark ? colors.text : '#19231F' }]}>
          Daily Log
        </Text>
      </View>

      {petFeedings.length === 0 ? (
        <Card style={[styles.emptyCard, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#E7E6E0', borderRadius: 20 }]}>
          <Ionicons name="time-outline" size={32} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: isDark ? colors.text : '#19231F' }]}>
            No Feedings Logged Yet
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
            Meals recorded for {dateLabel.toLowerCase()} will appear here.
          </Text>
        </Card>
      ) : (
        <Card style={{ padding: 0, backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: isDark ? colors.border : '#E7E6E0', borderRadius: 20 }}>
          {petFeedings.map((f, idx) => (
            <View
              key={f.id}
              style={[
                styles.logRow,
                idx < petFeedings.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? colors.border : '#E7E6E0' },
              ]}
            >
              <View style={styles.logIcon}>
                <Ionicons
                  name={f.feeding_type === 'extra' ? 'sparkles' : 'checkmark-circle'}
                  size={20}
                  color={f.feeding_type === 'extra' ? '#D77F57' : (isDark ? colors.primaryLight : '#103F32')}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.logTitle, { color: isDark ? colors.text : '#19231F' }]}>
                  {f.feeding_type === 'extra'
                    ? 'Extra meal / treat'
                    : f.meal_slot?.name || 'Scheduled meal'}
                  {f.note ? ` — "${f.note}"` : ''}
                </Text>
                <Text style={[styles.logMeta, { color: colors.textMuted }]}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: 1,
    gap: 6,
  },
  petTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  addPetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 4,
  },
  addPetText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dateNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: spacing.lg,
  },
  dateTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  dateSub: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  treatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    gap: 4,
  },
  treatText: {
    fontSize: 12,
    fontWeight: '700',
  },
  slotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  slotName: {
    fontSize: 15,
    fontWeight: '700',
  },
  slotTime: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  emptyDesc: {
    fontSize: 12,
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
    fontSize: 14,
    fontWeight: '700',
  },
  logMeta: {
    fontSize: 12,
    marginTop: 2,
  },
});
