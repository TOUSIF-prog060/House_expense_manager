import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../context/auth-context';
import { useTheme } from '../context/theme-context';
import { leaveHousehold } from '../api/households';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { radius, spacing, typography, type ColorPalette } from '../constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, household, householdMembers, refreshHousehold } = useAuth();
  const { colors: themeColors, themeMode, setThemeMode } = useTheme();
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);
  const [leaving, setLeaving] = useState(false);

  function handleThemeChange(mode: 'system' | 'light' | 'dark') {
    try {
      Haptics.selectionAsync();
    } catch {
      // Ignore
    }
    setThemeMode(mode);
  }

  function handleLeave() {
    Alert.alert(
      'Leave Household',
      `Are you sure you want to leave ${household?.name}? Your expense history will be preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setLeaving(true);
            try {
              await leaveHousehold(household!.id);
              await refreshHousehold();
              router.replace('/(onboarding)');
            } catch (err: unknown) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Could not leave household.');
            } finally {
              setLeaving(false);
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]} contentContainerStyle={styles.content}>
      {/* Household Overview */}
      <Card style={styles.card}>
        <View style={styles.houseHeader}>
          <View style={[styles.houseIconBadge, { backgroundColor: themeColors.primaryMuted }]}>
            <Ionicons name="home" size={24} color={themeColors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.houseName, { color: themeColors.text }]}>{household?.name || 'Household'}</Text>
            <Text style={[styles.houseMeta, { color: themeColors.textMuted }]}>
              Timezone: {household?.timezone || 'Asia/Kolkata'} · Currency: {household?.currency || 'INR'}
            </Text>
          </View>
        </View>

        <Button
          title="Invite New Roommate"
          variant="primary"
          size="md"
          icon={<Ionicons name="person-add-outline" size={16} color={themeColors.textInverse} />}
          onPress={() => router.push('/modal/invite-member')}
          style={{ marginTop: spacing.md }}
        />
      </Card>

      {/* Appearance / Theme */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Appearance</Text>
      </View>

      <Card style={styles.card}>
        <Text style={[styles.cardHeaderTitle, { color: themeColors.text }]}>Theme</Text>
        <Text style={[styles.policyDesc, { color: themeColors.textMuted, marginBottom: spacing.md }]}>
          Choose whether OurHome uses a Light, Dark, or System appearance.
        </Text>

        <View style={[styles.themeSegment, { backgroundColor: themeColors.surfaceElevated, borderColor: themeColors.border }]}>
          {(['system', 'light', 'dark'] as const).map((mode) => {
            const isSelected = themeMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                activeOpacity={0.7}
                onPress={() => handleThemeChange(mode)}
                style={[
                  styles.themeOption,
                  isSelected && {
                    backgroundColor: themeColors.surface,
                    borderColor: themeColors.borderLight,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.15,
                    shadowRadius: 2,
                    elevation: 2,
                  },
                ]}
              >
                <Ionicons
                  name={
                    mode === 'system'
                      ? 'phone-portrait-outline'
                      : mode === 'light'
                        ? 'sunny-outline'
                        : 'moon-outline'
                  }
                  size={16}
                  color={isSelected ? themeColors.primary : themeColors.textMuted}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    { color: isSelected ? themeColors.text : themeColors.textSecondary },
                    isSelected && { fontWeight: '700' },
                  ]}
                >
                  {mode === 'system' ? 'System' : mode === 'light' ? 'Light' : 'Dark'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* Members List */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Household Members ({householdMembers.length})</Text>
      </View>

      <Card style={{ padding: 0 }}>
        {householdMembers.map((member, index) => {
          const isMe = member.user_id === user?.id;
          const isMemberAdmin = member.role === 'admin';

          return (
            <View
              key={member.user_id}
              style={[
                styles.memberRow,
                index < householdMembers.length - 1 && styles.borderBottom,
              ]}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarLetter}>
                  {member.profile?.display_name
                    ? member.profile.display_name.charAt(0).toUpperCase()
                    : 'U'}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>
                  {member.profile?.display_name || 'Member'} {isMe ? '(You)' : ''}
                </Text>
                <Text style={styles.memberStatus}>
                  Status: {member.status}
                  {member.profile?.upi_id ? ` · UPI: ${member.profile.upi_id}` : ''}
                </Text>
              </View>

              <Badge
                label={isMemberAdmin ? 'Admin' : 'Member'}
                variant={isMemberAdmin ? 'warning' : 'neutral'}
              />
            </View>
          );
        })}
      </Card>

      {/* Admin Rules & Policies */}
      <Card style={[styles.card, { marginTop: spacing.lg }]}>
        <Text style={styles.cardHeaderTitle}>Household Policies</Text>
        <View style={styles.policyRow}>
          <Ionicons name="cart-outline" size={18} color={themeColors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.policyTitle}>Admin-Only Grocery Expenses</Text>
            <Text style={styles.policyDesc}>
              Bulk pantry orders under the "Groceries" category are restricted to household admins to prevent duplicate orders.
            </Text>
          </View>
        </View>
        <View style={[styles.policyRow, { marginTop: spacing.sm }]}>
          <Ionicons name="paw-outline" size={18} color={themeColors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.policyTitle}>Atomic Cat Feeding Protection</Text>
            <Text style={styles.policyDesc}>
              Database constraints guarantee a meal slot cannot be double-recorded by two roommates at the same time.
            </Text>
          </View>
        </View>
      </Card>

      {/* Leave Household Action */}
      <Button
        title="Leave Household"
        variant="ghost"
        size="md"
        loading={leaving}
        icon={<Ionicons name="exit-outline" size={16} color={themeColors.danger} />}
        onPress={handleLeave}
        textStyle={{ color: themeColors.danger }}
        style={{ marginTop: spacing.xl, borderColor: themeColors.dangerMuted, marginBottom: spacing.xxl }}
      />
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
    card: {
      padding: spacing.lg,
    },
    cardHeaderTitle: {
      ...typography.bodyLg,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.xs,
    },
    houseHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    houseIconBadge: {
      width: 48,
      height: 48,
      borderRadius: radius.lg,
      backgroundColor: colors.primaryMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    houseName: {
      ...typography.titleMd,
      color: colors.text,
    },
    houseMeta: {
      ...typography.bodySm,
      color: colors.textMuted,
      marginTop: 2,
    },
    sectionHeader: {
      marginBottom: spacing.sm,
      marginTop: spacing.lg,
    },
    sectionTitle: {
      ...typography.titleMd,
      color: colors.text,
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
    },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    avatarLetter: {
      fontWeight: '700',
      color: colors.text,
      fontSize: 14,
    },
    memberName: {
      ...typography.bodyMd,
      fontWeight: '600',
      color: colors.text,
    },
    memberStatus: {
      ...typography.bodySm,
      color: colors.textMuted,
      marginTop: 2,
    },
    policyRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingTop: spacing.sm,
    },
    policyTitle: {
      ...typography.bodyMd,
      fontWeight: '600',
      color: colors.text,
    },
    policyDesc: {
      ...typography.bodySm,
      color: colors.textMuted,
      marginTop: 2,
      lineHeight: 18,
    },
    borderBottom: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    themeSegment: {
      flexDirection: 'row',
      borderRadius: radius.lg,
      padding: 4,
      borderWidth: 1,
      gap: 4,
    },
    themeOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: radius.md,
      gap: 6,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    themeOptionText: {
      fontSize: 13,
      fontWeight: '500',
    },
  });
