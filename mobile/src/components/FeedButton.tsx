import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing } from '../constants/theme';
import { useTheme } from '../context/theme-context';
import { markCatFed } from '../api/pets';

interface FeedButtonProps {
  householdId: string;
  slotId: string;
  slotName: string;
  feedingDate: string;
  alreadyFed: boolean;
  fedByName?: string;
  fedAtTime?: string;
  petId?: string;
  petName?: string;
  onFedSuccess?: () => void;
}

export function FeedButton({
  householdId,
  slotId,
  slotName,
  feedingDate,
  alreadyFed,
  fedByName,
  fedAtTime,
  petId,
  petName,
  onFedSuccess,
}: FeedButtonProps) {
  const { colors, isDark } = useTheme();
  const [busy, setBusy] = useState(false);
  const [fed, setFed] = useState(alreadyFed);
  const [feeder, setFeeder] = useState(fedByName);
  const [feedTime, setFeedTime] = useState(fedAtTime);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const displayName = petName || 'Cat';

  const animatePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
  };

  const animatePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  async function handleFeed() {
    if (fed || busy) return;

    setBusy(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Ignore haptics fail
    }

    try {
      const feeding = await markCatFed({
        householdId,
        mealSlotId: slotId,
        feedingDate,
        petId,
      });

      setFed(true);
      setFeeder('You');
      const timeStr = new Date(feeding.fed_at).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      });
      setFeedTime(timeStr);

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Ignore
      }

      onFedSuccess?.();
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error.code === 'CAT_ALREADY_FED') {
        setFed(true);
        Alert.alert(
          'Already Fed!',
          `${displayName}'s ${slotName.toLowerCase()} meal was already recorded by a roommate.`
        );
      } else {
        Alert.alert('Feeding Error', error.message || 'Could not record meal. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  const fedTextColor = isDark ? colors.primaryLight : colors.primaryDark;

  if (fed) {
    return (
      <View style={[styles.fedContainer, { backgroundColor: colors.primaryMuted }]}>
        <View style={styles.fedIconBadge}>
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
        </View>
        <View style={styles.fedDetails}>
          <Text style={[styles.fedTitle, { color: fedTextColor }]}>Fed</Text>
          <Text style={[styles.fedSubtitle, { color: fedTextColor }]}>
            {feeder ? `By ${feeder}` : 'Recorded'}
            {feedTime ? ` at ${feedTime}` : ''}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPressIn={animatePressIn}
        onPressOut={animatePressOut}
        style={[styles.button, { backgroundColor: colors.primary }, busy && styles.buttonDisabled]}
        onPress={handleFeed}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.textInverse} />
        ) : (
          <>
            <Ionicons name="restaurant-outline" size={16} color={colors.textInverse} />
            <Text style={[styles.buttonText, { color: colors.textInverse }]}>Feed</Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    gap: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  fedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    gap: 8,
  },
  fedIconBadge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fedDetails: {
    justifyContent: 'center',
  },
  fedTitle: {
    fontWeight: '700',
    fontSize: 12,
  },
  fedSubtitle: {
    fontSize: 11,
    opacity: 0.9,
  },
});
