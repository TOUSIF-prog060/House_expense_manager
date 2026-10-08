'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, LogOut, Plus, Save } from 'lucide-react';

type Member = { user_id: string; role: string; profiles: { display_name: string } | null };
type Slot = { id: string; name: string; display_order: number; reminder_enabled: boolean; reminder_time: string | null };

export function HouseholdSettingsForm({
  householdId,
  initialName,
  members,
  mealSlots,
  isAdmin,
}: {
  householdId: string;
  initialName: string;
  members: Member[];
  mealSlots: Slot[];
  isAdmin: boolean;
  currentUserId?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [slots, setSlots] = useState(mealSlots);
  const [invite, setInvite] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function call(url: string, method: string, body?: unknown) {
    const response = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = (await response.json()) as { data?: Record<string, string>; error?: string };
    if (!response.ok) throw new Error(result.error ?? 'Request failed.');
    return result.data;
  }

  async function save() {
    setBusy(true);
    setMessage('');
    try {
      await call(`/api/backend/households/${householdId}`, 'PATCH', { name: name.trim() });
      setMessage('Household name saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save household settings.');
    } finally {
      setBusy(false);
    }
  }

  async function createInvite() {
    setBusy(true);
    setMessage('');
    try {
      const data = await call(`/api/backend/households/${householdId}/invites`, 'POST');
      setInvite(data?.code ?? '');
      setMessage('Invite code is ready. It expires in seven days.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create invite code.');
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(invite);
    setMessage('Invite copied.');
  }

  async function addSlot() {
    const value = window.prompt('Name this meal or care slot:');
    if (!value?.trim()) return;
    setBusy(true);
    try {
      const row = await call(`/api/backend/households/${householdId}/meal-slots`, 'POST', { name: value.trim() });
      if (row) {
        setSlots((prev) => [
          ...prev,
          { id: row.id, name: row.name, display_order: Number(row.display_order), reminder_enabled: false, reminder_time: null },
        ]);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not add meal slot.');
    } finally {
      setBusy(false);
    }
  }

  async function leaveHousehold() {
    if (!window.confirm('Are you sure you want to leave this household?')) return;
    setBusy(true);
    setMessage('');
    try {
      await call(`/api/backend/households/${householdId}/leave`, 'POST');
      router.push('/onboarding');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not leave household.');
      setBusy(false);
    }
  }

  return (
    <div className="settings-sections">
      {message && (
        <p role="status" className="settings-message">
          {message}
        </p>
      )}
      <section className="settings-card">
        <span className="side-eyebrow">HOUSEHOLD</span>
        <h2>What do you call home?</h2>
        <label className="field">
          <span>Household name</span>
          <input maxLength={80} disabled={!isAdmin} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        {isAdmin && (
          <button className="button button-primary" onClick={save} disabled={busy || name.trim() === initialName}>
            <Save size={15} /> Save changes
          </button>
        )}
      </section>

      {isAdmin && (
        <section className="settings-card">
          <span className="side-eyebrow">BRING SOMEONE IN</span>
          <h2>Invite a housemate</h2>
          <p>Make a one-time code for someone you trust. It expires after seven days.</p>
          <button className="button button-secondary" onClick={createInvite} disabled={busy}>
            <Plus size={16} /> Create invite code
          </button>
          {invite && (
            <div className="invite-code">
              <code>{invite}</code>
              <button className="plain-icon" onClick={copy} aria-label="Copy invite code">
                <Copy size={16} />
              </button>
            </div>
          )}
        </section>
      )}

      <section className="settings-card">
        <span className="side-eyebrow">UNDER ONE ROOF</span>
        <h2>Your household members</h2>
        <div className="settings-members">
          {members.map((member) => (
            <div className="member-balance-row" key={member.user_id}>
              <span className="member-avatar">
                {member.profiles?.display_name?.[0]?.toUpperCase() ?? 'H'}
              </span>
              <span>{member.profiles?.display_name || 'Housemate'}</span>
              <b className="member-role-tag">{member.role}</b>
            </div>
          ))}
        </div>
      </section>

      <section className="settings-card">
        <span className="side-eyebrow">CAT CARE</span>
        <h2>Meal times</h2>
        <p>Choose the check-ins your household uses. Time-of-day reminders can be configured later.</p>
        <div className="settings-members">
          {slots.map((slot, index) => (
            <div className="member-balance-row" key={slot.id}>
              <span className="slot-number">0{index + 1}</span>
              <span>{slot.name}</span>
              <b className="member-role-tag">
                {slot.reminder_enabled && slot.reminder_time ? slot.reminder_time : 'Daily'}
              </b>
            </div>
          ))}
        </div>
        {isAdmin && (
          <button className="button button-secondary" onClick={addSlot} disabled={busy}>
            <Plus size={15} /> Add meal slot
          </button>
        )}
      </section>

      <section className="settings-card">
        <span className="side-eyebrow">REGIONAL SETTINGS</span>
        <h2>India · Indian rupee</h2>
        <p>Timezone: Asia/Kolkata · Currency: INR (₹)</p>
      </section>

      <section className="settings-card">
        <span className="side-eyebrow">MEMBERSHIP</span>
        <h2>Leave household</h2>
        <p>Remove yourself from this household. You will need a new invite code to rejoin.</p>
        <button className="button button-danger" onClick={leaveHousehold} disabled={busy}>
          <LogOut size={15} /> Leave household
        </button>
      </section>
    </div>
  );
}
