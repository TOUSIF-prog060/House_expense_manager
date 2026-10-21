import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../context/auth-context';
import {
  createExpenseWithShares,
  updateExpenseWithShares,
  deleteExpense,
  fetchExpenseCategories,
  uploadReceipt,
} from '../../api/expenses';
import { calculateShares, formatRupees, type SplitMethod, type SplitInput } from '@ourhome/core';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { radius, spacing, typography, type ColorPalette } from '../../constants/theme';
import { useTheme } from '../../context/theme-context';

export default function NewExpenseModal() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, household, householdMembers, isAdmin } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{
    editId?: string;
    initialTitle?: string;
    initialAmount?: string;
    initialCategory?: string;
    initialDate?: string;
    initialNotes?: string;
  }>();

  const isEditing = !!params.editId;

  const [title, setTitle] = useState(params.initialTitle || '');
  const [amount, setAmount] = useState(params.initialAmount || '');
  const [date, setDate] = useState(
    params.initialDate || new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState(params.initialNotes || '');
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [paidBy, setPaidBy] = useState<string>(user?.id || '');

  // Participant selection: default all active members selected
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    householdMembers.map((m) => m.user_id)
  );
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});

  // Receipt state
  const [receiptFile, setReceiptFile] = useState<{
    uri: string;
    name: string;
    mimeType: string;
    size: number;
  } | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', household?.id],
    queryFn: () => fetchExpenseCategories(household!.id),
    enabled: !!household?.id,
  });

  // Default category
  React.useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      if (params.initialCategory) {
        const found = categories.find(
          (c) =>
            c.id === params.initialCategory ||
            c.name.toLowerCase() === params.initialCategory?.toLowerCase()
        );
        if (found) {
          setSelectedCategory(found.id);
          return;
        }
      }
      setSelectedCategory(categories[0].id);
    }
  }, [categories, params.initialCategory, selectedCategory]);

  const activeCategory = categories.find((c) => c.id === selectedCategory);
  const isGroceries = activeCategory?.name.trim().toLowerCase() === 'groceries';

  // Calculate shares using our paise-safe engine
  const participants: SplitInput[] = useMemo(() => {
    return selectedUserIds.map((userId) => ({
      userId,
      value: splitValues[userId],
    }));
  }, [selectedUserIds, splitValues]);

  const calculatedShares = useMemo(() => {
    if (!amount || Number(amount) <= 0 || participants.length === 0) return null;
    try {
      return calculateShares(amount, participants, splitMethod);
    } catch {
      return null;
    }
  }, [amount, participants, splitMethod]);

  function toggleParticipant(userId: string) {
    if (selectedUserIds.includes(userId)) {
      if (selectedUserIds.length <= 1) {
        Alert.alert('Required', 'At least one participant must be included.');
        return;
      }
      setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
    } else {
      setSelectedUserIds((prev) => [...prev, userId]);
    }
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setReceiptFile({
        uri: asset.uri,
        name: asset.fileName || `receipt-${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
        size: asset.fileSize || 500000,
      });
    }
  }

  async function pickDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const doc = result.assets[0];
        setReceiptFile({
          uri: doc.uri,
          name: doc.name,
          mimeType: doc.mimeType || 'application/pdf',
          size: doc.size || 500000,
        });
      }
    } catch (err) {
      console.warn('Doc picker error:', err);
    }
  }

  async function handleSubmit() {
    setError('');
    if (!title.trim()) {
      setError('Please enter an expense title.');
      return;
    }
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    if (isGroceries && !isAdmin) {
      setError(
        isEditing
          ? 'Only household admins can edit grocery expenses.'
          : 'Only household admins can create grocery expenses.'
      );
      return;
    }

    if (!calculatedShares) {
      setError('Please verify the split shares add up to the total.');
      return;
    }

    setBusy(true);

    try {
      const sharesPayload = Object.entries(calculatedShares).map(([userId, sharePaise]) => ({
        user_id: userId,
        share_amount: sharePaise / 100,
        share_percentage:
          splitMethod === 'percentage' ? Number(splitValues[userId] || 0) : null,
      }));

      let expenseId = params.editId;

      if (isEditing && expenseId) {
        await updateExpenseWithShares({
          expenseId,
          title: title.trim(),
          amount: numAmount,
          expenseDate: date,
          notes: notes.trim() || undefined,
          shares: sharesPayload,
        });
      } else {
        expenseId = await createExpenseWithShares({
          householdId: household!.id,
          title: title.trim(),
          amount: numAmount,
          categoryId: selectedCategory || null,
          paidBy: paidBy || user!.id,
          expenseDate: date,
          notes: notes.trim() || undefined,
          shares: sharesPayload,
        });
      }

      // Upload receipt if chosen
      if (receiptFile && expenseId) {
        try {
          await uploadReceipt({
            householdId: household!.id,
            expenseId,
            fileUri: receiptFile.uri,
            mimeType: receiptFile.mimeType,
            fileName: receiptFile.name,
            fileSize: receiptFile.size,
            userId: user!.id,
          });
        } catch (uploadErr) {
          console.warn('Receipt upload failed:', uploadErr);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['settlement'] });
      router.back();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save expense.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!params.editId) return;

    Alert.alert('Delete Expense', 'Are you sure you want to permanently delete this expense?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await deleteExpense(params.editId!);
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['settlement'] });
            router.back();
          } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Delete failed.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={18} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Admin Grocery Notice */}
      {isGroceries && !isAdmin ? (
        <View style={styles.warningBox}>
          <Ionicons name="lock-closed" size={18} color={colors.accent} />
          <Text style={styles.warningText}>
            Only household admins can upload or create Groceries expenses.
          </Text>
        </View>
      ) : null}

      <Card style={styles.card}>
        <Input
          label="Expense Title"
          placeholder="e.g. WiFi Bill, Electricity, Milk..."
          value={title}
          onChangeText={setTitle}
        />

        <Input
          label="Total Amount (₹)"
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />

        {/* Category Picker */}
        <Text style={styles.fieldLabel}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((c) => {
            const isSelected = selectedCategory === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.catOption, isSelected && styles.catOptionActive]}
                onPress={() => setSelectedCategory(c.id)}
              >
                <Text style={[styles.catOptionText, isSelected && styles.catOptionTextActive]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Paid By Selection */}
        <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Paid By</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {householdMembers.map((m) => {
            const isSelected = paidBy === m.user_id;
            const isMe = m.user_id === user?.id;
            return (
              <TouchableOpacity
                key={m.user_id}
                style={[styles.catOption, isSelected && styles.catOptionActive]}
                onPress={() => setPaidBy(m.user_id)}
              >
                <Text style={[styles.catOptionText, isSelected && styles.catOptionTextActive]}>
                  {isMe ? 'You' : m.profile?.display_name || 'Member'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Input
          label="Date (YYYY-MM-DD)"
          placeholder="YYYY-MM-DD"
          value={date}
          onChangeText={setDate}
          containerStyle={{ marginTop: spacing.md }}
        />

        <Input
          label="Notes (Optional)"
          placeholder="Additional details..."
          multiline
          numberOfLines={2}
          value={notes}
          onChangeText={setNotes}
        />
      </Card>

      {/* Split Method & Participants */}
      <Card style={[styles.card, { marginTop: spacing.md }]}>
        <Text style={styles.cardHeaderTitle}>Split Method</Text>
        <View style={styles.methodRow}>
          {(['equal', 'exact', 'percentage'] as SplitMethod[]).map((method) => {
            const isSelected = splitMethod === method;
            return (
              <TouchableOpacity
                key={method}
                style={[styles.methodBtn, isSelected && styles.methodBtnActive]}
                onPress={() => setSplitMethod(method)}
              >
                <Text style={[styles.methodText, isSelected && styles.methodTextActive]}>
                  {method.charAt(0).toUpperCase() + method.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>
          Participants ({selectedUserIds.length})
        </Text>
        <View style={styles.participantsList}>
          {householdMembers.map((m) => {
            const isSelected = selectedUserIds.includes(m.user_id);
            const isMe = m.user_id === user?.id;
            const sharePaise = calculatedShares?.[m.user_id];

            return (
              <View key={m.user_id} style={styles.participantRow}>
                <TouchableOpacity
                  style={styles.checkboxTouch}
                  onPress={() => toggleParticipant(m.user_id)}
                >
                  <Ionicons
                    name={isSelected ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={isSelected ? colors.primary : colors.textMuted}
                  />
                  <Text style={styles.participantName}>
                    {isMe ? 'You' : m.profile?.display_name || 'Member'}
                  </Text>
                </TouchableOpacity>

                {isSelected && splitMethod !== 'equal' ? (
                  <View style={styles.customSplitInputWrapper}>
                    <Input
                      placeholder={splitMethod === 'percentage' ? '%' : '₹'}
                      keyboardType="numeric"
                      value={splitValues[m.user_id] || ''}
                      onChangeText={(val) =>
                        setSplitValues((prev) => ({ ...prev, [m.user_id]: val }))
                      }
                      containerStyle={{ marginBottom: 0, width: 80 }}
                      style={{ paddingVertical: 6, textAlign: 'center' }}
                    />
                  </View>
                ) : null}

                {isSelected && sharePaise !== undefined ? (
                  <Text style={styles.sharePreviewText}>{formatRupees(sharePaise)}</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </Card>

      {/* Receipt Attachment */}
      <Card style={[styles.card, { marginTop: spacing.md }]}>
        <Text style={styles.cardHeaderTitle}>Receipt Attachment</Text>
        <Text style={styles.cardDesc}>
          Attach an image or PDF of the receipt (max 10 MB, stored securely).
        </Text>

        {receiptFile ? (
          <View style={styles.receiptPreview}>
            <Ionicons name="document-text" size={24} color={colors.primary} />
            <Text style={styles.receiptFileName} numberOfLines={1}>
              {receiptFile.name}
            </Text>
            <TouchableOpacity onPress={() => setReceiptFile(null)}>
              <Ionicons name="close-circle" size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.receiptActions}>
            <Button
              title="Camera / Photo"
              variant="secondary"
              size="sm"
              icon={<Ionicons name="camera" size={16} color={colors.text} />}
              onPress={pickImage}
            />
            <Button
              title="Choose File (PDF)"
              variant="secondary"
              size="sm"
              icon={<Ionicons name="attach" size={16} color={colors.text} />}
              onPress={pickDocument}
            />
          </View>
        )}
      </Card>

      {/* Action Buttons */}
      <Button
        title={isEditing ? 'Update Expense' : 'Save Expense'}
        onPress={handleSubmit}
        loading={busy}
        size="lg"
        style={{ marginTop: spacing.lg }}
      />

      {isEditing ? (
        <Button
          title="Delete Expense"
          variant="danger"
          size="md"
          onPress={handleDelete}
          style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}
        />
      ) : null}
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
    padding: spacing.md,
  },
  cardHeaderTitle: {
    ...typography.bodyLg,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardDesc: {
    ...typography.bodySm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...typography.bodySm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  categoryScroll: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  catOption: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  catOptionActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  catOptionText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  catOptionTextActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  methodRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  methodBtnActive: {
    backgroundColor: colors.primary,
  },
  methodText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  methodTextActive: {
    color: colors.textInverse,
  },
  participantsList: {
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  checkboxTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  participantName: {
    ...typography.bodyMd,
    color: colors.text,
    fontWeight: '500',
  },
  customSplitInputWrapper: {
    marginHorizontal: spacing.sm,
  },
  sharePreviewText: {
    ...typography.bodyMd,
    fontWeight: '700',
    color: colors.text,
  },
  receiptActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  receiptPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  receiptFileName: {
    ...typography.bodySm,
    color: colors.text,
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerMuted,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.danger,
    flex: 1,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentMuted,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  warningText: {
    ...typography.bodySm,
    color: colors.accentLight,
    flex: 1,
  },
});
