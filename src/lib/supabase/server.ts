import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';
import type { Database } from './database.types';

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) to your environment variables.');
  return { url, key };
}

export async function createClient() {
  const { url, key } = getSupabaseConfig();
  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values: Array<{ name: string; value: string; options: CookieOptions }>) => {
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          /* Server Components cannot write cookies; middleware refreshes sessions. */
        }
      },
    },
  });
}

/**
 * Signed-in user for this request, verified from the session JWT.
 * The project signs JWTs with an asymmetric key, so getClaims() checks the
 * signature locally against cached JWKS instead of calling the Auth server
 * like getUser() does. Deduplicated per request. Returns null when signed
 * out or when Supabase is not configured.
 */
export const getCurrentUser = cache(async () => {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return null;
  }
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === 'string' ? claims.email : undefined };
});
