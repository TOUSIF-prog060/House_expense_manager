import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

if (typeof window !== 'undefined') {
  throw new Error('Supabase admin client cannot be used in browser environments.');
}

/**
 * Privileged server-only Supabase client using SUPABASE_SECRET_KEY.
 * Must NEVER be imported or executed in client components.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error('Supabase admin is not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY to your server environment.');
  }
  return createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
