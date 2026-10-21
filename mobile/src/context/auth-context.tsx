import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../api/supabase';
import type { Database, Household, Member } from '@ourhome/core';

export type UserProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  upi_id?: string | null;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  household: Household | null;
  membership: Member | null;
  householdMembers: Member[];
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshHousehold: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  household: null,
  membership: null,
  householdMembers: [],
  isLoading: true,
  isAdmin: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  refreshHousehold: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [membership, setMembership] = useState<Member | null>(null);
  const [householdMembers, setHouseholdMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadUserData(currentUser: User) {
    try {
      // 1. Fetch user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData as UserProfile);
      }

      // 2. Fetch active household membership
      const { data: memberData } = await supabase
        .from('household_members')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!memberData) {
        setHousehold(null);
        setMembership(null);
        setHouseholdMembers([]);
        return;
      }

      setMembership(memberData as Member);

      // 3. Fetch household details and all active members
      const [householdRes, membersRes] = await Promise.all([
        supabase
          .from('households')
          .select('*')
          .eq('id', memberData.household_id)
          .maybeSingle(),
        supabase
          .from('household_members')
          .select('*')
          .eq('household_id', memberData.household_id)
          .eq('status', 'active'),
      ]);

      if (householdRes.data) {
        setHousehold(householdRes.data as Household);
      }

      const activeMembers = (membersRes.data ?? []) as Member[];
      const userIds = activeMembers.map((m) => m.user_id);

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, upi_id')
          .in('id', userIds);

        const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
        const populated = activeMembers.map((m) => ({
          ...m,
          profile: profileMap.get(m.user_id) ?? {
            display_name: 'Member',
            avatar_url: null,
            upi_id: null,
          },
        }));
        setHouseholdMembers(populated);
      } else {
        setHouseholdMembers([]);
      }
    } catch (err) {
      console.warn('Error loading user data:', err);
    }
  }

  useEffect(() => {
    console.log('[Auth] Starting auth check...');
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    // Initial session restoration
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      clearTimeout(timer);
      console.log('[Auth] getSession completed. Session:', initialSession ? 'exists' : 'null');
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        loadUserData(initialSession.user).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    }).catch((err) => {
      clearTimeout(timer);
      console.error('[Auth] getSession error:', err);
      setIsLoading(false);
    });

    // Listen to Supabase auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await loadUserData(newSession.user);
      } else {
        setProfile(null);
        setHousehold(null);
        setMembership(null);
        setHouseholdMembers([]);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: error as Error | null };
  }

  async function signUp(email: string, password: string, displayName: string) {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          display_name: displayName.trim(),
        },
      },
    });
    return { error: error as Error | null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function refreshHousehold() {
    if (user) {
      await loadUserData(user);
    }
  }

  const isAdmin = membership?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        household,
        membership,
        householdMembers,
        isLoading,
        isAdmin,
        signIn,
        signUp,
        signOut,
        refreshHousehold,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
