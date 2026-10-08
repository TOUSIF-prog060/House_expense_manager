import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getHouseholdForUser } from '@/lib/backend/read-models';
import { NotificationPreferences } from '@/components/notification-preferences';

export const metadata: Metadata = { title: 'Notification preferences' };
export default async function PreferencesPage(){let auth;try{auth=await createClient()}catch{redirect('/login')}const{data:{user}}=await auth.auth.getUser();if(!user)redirect('/login');let householdId:string|null=null;try{householdId=(await getHouseholdForUser(user.id)).household?.id??null}catch{/* Preferences remain disabled until the workbook is connected. */}return <div className="page-wrap settings-page"><Link className="back-link" href="/profile"><ArrowLeft size={16}/> Profile</Link><div className="page-heading"><span className="eyebrow">INFORMATION, YOUR WAY</span><h1>Notifications</h1><p>Choose what gets your attention.</p></div><NotificationPreferences householdId={householdId}/></div>}
