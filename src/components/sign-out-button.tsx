'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();
  return <button className="button button-quiet signout-button" onClick={async () => { await createClient().auth.signOut(); router.replace('/login'); router.refresh(); }}><LogOut size={16}/> Sign out</button>;
}
