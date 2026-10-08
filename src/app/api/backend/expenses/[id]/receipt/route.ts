import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    }

    const { id: expenseId } = await context.params;

    const { data: expense, error: expenseError } = await supabase
      .from('expenses')
      .select('id, household_id')
      .eq('id', expenseId)
      .maybeSingle();

    if (expenseError || !expense) {
      return NextResponse.json({ error: 'Expense not found or access denied.' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type. Use JPG, PNG, WEBP, or PDF.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE || file.size <= 0) {
      return NextResponse.json({ error: 'File size must be between 1 byte and 10 MB.' }, { status: 400 });
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${expense.household_id}/${expenseId}/${Date.now()}-${sanitizedName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    let uploadErr = uploadError;
    if (uploadErr) {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const admin = createAdminClient();
      const { error: adminUploadErr } = await admin.storage
        .from('receipts')
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: false,
        });
      uploadErr = adminUploadErr;
    }

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    let { data: attachment, error: attachError } = await supabase
      .from('expense_attachments')
      .insert({
        expense_id: expenseId,
        household_id: expense.household_id,
        object_path: storagePath,
        mime_type: file.type,
        file_size: file.size,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (attachError) {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      const admin = createAdminClient();
      const res = await admin
        .from('expense_attachments')
        .insert({
          expense_id: expenseId,
          household_id: expense.household_id,
          object_path: storagePath,
          mime_type: file.type,
          file_size: file.size,
          uploaded_by: user.id,
        })
        .select()
        .single();
      attachment = res.data;
      attachError = res.error;
    }

    if (attachError) {
      return NextResponse.json({ error: attachError.message }, { status: 500 });
    }

    return NextResponse.json({ data: attachment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not upload receipt.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
