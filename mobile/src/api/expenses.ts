import { supabase } from './supabase';
import type { Database } from '@ourhome/core';

export type ExpenseWithDetails = {
  id: string;
  household_id: string;
  title: string;
  amount: number;
  category_id: string | null;
  paid_by: string;
  created_by: string;
  expense_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  category?: { id: string; name: string; icon: string; is_pet: boolean } | null;
  payer?: { id: string; display_name: string; avatar_url: string | null } | null;
  shares: Array<{
    id: string;
    expense_id: string;
    user_id: string;
    share_amount: number;
    share_percentage: number | null;
    profile?: { id: string; display_name: string; avatar_url: string | null } | null;
  }>;
  attachments?: Array<{
    id: string;
    object_path: string;
    mime_type: string;
    file_size: number;
  }>;
};

export async function fetchExpenseCategories(householdId: string) {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .or(`household_id.eq.${householdId},household_id.is.null`)
    .order('name');

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchExpenses(
  householdId: string,
  options?: { month?: string; memberId?: string; limit?: number }
): Promise<ExpenseWithDetails[]> {
  let query = supabase
    .from('expenses')
    .select(`
      *,
      category:expense_categories(id, name, icon, is_pet),
      payer:profiles!expenses_paid_by_fkey(id, display_name, avatar_url),
      shares:expense_shares(
        id,
        expense_id,
        user_id,
        share_amount,
        share_percentage,
        profile:profiles(id, display_name, avatar_url)
      ),
      attachments:expense_attachments(id, object_path, mime_type, file_size)
    `)
    .eq('household_id', householdId)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (options?.month) {
    const start = `${options.month}-01`;
    // Approximate next month start
    const [year, m] = options.month.split('-').map(Number);
    const nextMonth = m === 12 ? `${year + 1}-01-01` : `${year}-${String(m + 1).padStart(2, '0')}-01`;
    query = query.gte('expense_date', start).lt('expense_date', nextMonth);
  }

  if (options?.memberId) {
    query = query.eq('paid_by', options.memberId);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as unknown as ExpenseWithDetails[]) ?? [];
}

export async function createExpenseWithShares(params: {
  householdId: string;
  title: string;
  amount: number;
  categoryId: string | null;
  paidBy: string;
  expenseDate: string;
  notes?: string | null;
  shares: Array<{ user_id: string; share_amount: number; share_percentage?: number | null }>;
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_expense_with_shares', {
    p_household_id: params.householdId,
    p_title: params.title.trim(),
    p_amount: params.amount,
    p_category_id: params.categoryId,
    p_paid_by: params.paidBy,
    p_expense_date: params.expenseDate,
    p_notes: params.notes?.trim() || null,
    p_shares: params.shares,
  });

  if (error) {
    // Admin/grocery restriction – surface clearly
    if (error.message.includes('Only household admins can upload grocery expenses')) {
      throw new Error('Only household admins can create grocery expenses.');
    }

    // RLS block or ambiguous column – fall back to direct insert
    if (
      error.code === '42501' ||
      error.message.includes('row-level security') ||
      error.message.includes('ambiguous') ||
      error.message.includes('item')
    ) {
      const { data: newExpense, error: expError } = await supabase
        .from('expenses')
        .insert({
          household_id: params.householdId,
          title: params.title.trim(),
          amount: params.amount,
          category_id: params.categoryId || null,
          paid_by: params.paidBy,
          expense_date: params.expenseDate,
          notes: params.notes?.trim() || null,
        })
        .select('id')
        .single();

      if (expError) {
        if (expError.message.includes('Only household admins can upload grocery expenses')) {
          throw new Error('Only household admins can create grocery expenses.');
        }
        throw new Error(expError.message);
      }

      if (params.shares.length > 0) {
        const shareRows = params.shares.map((s) => ({
          expense_id: newExpense.id,
          user_id: s.user_id,
          share_amount: s.share_amount,
          share_percentage: s.share_percentage ?? null,
        }));
        const { error: sharesError } = await supabase
          .from('expense_shares')
          .insert(shareRows);
        if (sharesError) {
          console.warn('[Expenses] share insert error (non-fatal):', sharesError.message);
        }
      }

      return newExpense.id as string;
    }

    throw new Error(error.message);
  }

  return data as string;
}

export async function updateExpenseWithShares(params: {
  expenseId: string;
  title: string;
  amount: number;
  expenseDate: string;
  notes?: string | null;
  shares: Array<{ user_id: string; share_amount: number; share_percentage?: number | null }>;
}): Promise<void> {
  const { error } = await supabase.rpc('update_expense_with_shares', {
    p_expense_id: params.expenseId,
    p_title: params.title.trim(),
    p_amount: params.amount,
    p_expense_date: params.expenseDate,
    p_notes: params.notes?.trim() || null,
    p_shares: params.shares,
  });

  if (error) throw new Error(error.message);
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_expense', {
    p_expense_id: expenseId,
  });

  if (error) throw new Error(error.message);
}

export async function uploadReceipt(params: {
  householdId: string;
  expenseId: string;
  fileUri: string;
  mimeType: string;
  fileName: string;
  fileSize: number;
  userId: string;
}): Promise<string> {
  const ext = params.fileName.split('.').pop() || 'jpg';
  const objectPath = `${params.householdId}/${params.expenseId}/${Date.now()}.${ext}`;

  // Read file as blob
  const response = await fetch(params.fileUri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(objectPath, blob, {
      contentType: params.mimeType,
      upsert: true,
    });

  if (uploadError) throw new Error(`Receipt upload failed: ${uploadError.message}`);

  // Insert attachment row
  const { error: dbError } = await supabase.from('expense_attachments').insert({
    household_id: params.householdId,
    expense_id: params.expenseId,
    object_path: objectPath,
    mime_type: params.mimeType,
    file_size: params.fileSize,
    uploaded_by: params.userId,
  });

  if (dbError) throw new Error(`Attachment record failed: ${dbError.message}`);

  return objectPath;
}

export async function getReceiptSignedUrl(objectPath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('receipts')
    .createSignedUrl(objectPath, 3600); // 1 hour expiry

  if (error || !data?.signedUrl) {
    throw new Error('Failed to generate secure receipt link');
  }
  return data.signedUrl;
}
