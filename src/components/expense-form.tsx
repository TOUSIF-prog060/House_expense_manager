'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { calculateShares, formatRupees, type SplitMethod } from '@/lib/calculations/money';
import { expenseSchema } from '@/lib/validation/schemas';

type Person = { userId: string; name: string };
type Category = { id: string; name: string; is_pet: boolean };
const petCategory = (name: string) => name.toLowerCase().startsWith('cat ');
export function ExpenseForm({ householdId, people, categories, currentUserId }: { householdId: string; people: Person[]; categories: Category[]; currentUserId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState(''); const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? ''); const [paidBy, setPaidBy] = useState(currentUserId);
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA')); const [notes, setNotes] = useState('');
  const [method, setMethod] = useState<SplitMethod>('equal'); const [participantIds, setParticipantIds] = useState<string[]>(people.map((person) => person.userId));
  const [values, setValues] = useState<Record<string, string>>({}); const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const isPet = selectedCategory?.is_pet ?? (selectedCategory ? petCategory(selectedCategory.name) : false);
  const participants = useMemo(() => participantIds.map((userId) => ({ userId, value: values[userId] })), [participantIds, values]);
  const calculated = useMemo(() => { try { return amount && participants.length ? calculateShares(amount, participants, method) : null; } catch { return null; } }, [amount, participants, method]);
  function updateCategory(id: string) { setCategoryId(id); const pet = categories.find((category) => category.id === id); if (pet?.is_pet || (pet && petCategory(pet.name))) setParticipantIds(people.map((person) => person.userId)); }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const validation = expenseSchema.safeParse({ householdId, title, amount, category: categoryId, expenseDate: date, paidBy, participants, splitMethod: method, notes });
    if (!validation.success) { setError(validation.error.issues[0]?.message ?? 'Please check the expense details.'); return; }
    try { calculateShares(amount, participants, method); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Check participant shares.'); return; }
    if (!navigator.onLine) { setError('Reconnect to the internet before saving this expense.'); return; }
    if (file && (!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type) || file.size > 10 * 1024 * 1024)) { setError('Choose a JPG, PNG, WEBP, or PDF under 10 MB.'); return; }
    setBusy(true);
    const response=await fetch('/api/backend/expenses',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({householdId,title:title.trim(),amount,category:categoryId,expenseDate:date,paidBy,participants,splitMethod:method,notes:notes.trim()||undefined})});
    const result=await response.json() as {data?:{id:string};error?:string};
    if(!response.ok||!result.data?.id){setError(result.error??'Could not save the expense. Check your connection and try again.');setBusy(false);return;}
    const expenseId=result.data.id;
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        await fetch(`/api/backend/expenses/${expenseId}/receipt`, { method: 'POST', body: formData });
      } catch (uploadErr) {
        console.error('Receipt upload failed:', uploadErr);
      }
    }
    router.push(`/expenses/${expenseId}`); router.refresh();
  }
  return <form className="expense-form" onSubmit={submit}>
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="form-grid"><label className="field field-wide"><span>What was it for?</span><input required maxLength={120} placeholder="e.g. Groceries" value={title} onChange={(event) => setTitle(event.target.value)}/></label>
    <label className="field"><span>Amount</span><div className="amount-input"><span>₹</span><input required inputMode="decimal" pattern="\d+(\.\d{1,2})?" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)}/></div></label>
    <label className="field"><span>Category</span><select value={categoryId} onChange={(event) => updateCategory(event.target.value)}>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
    <label className="field"><span>Paid by</span><select value={paidBy} onChange={(event) => setPaidBy(event.target.value)}>{people.map((person) => <option key={person.userId} value={person.userId}>{person.name}</option>)}</select></label>
    <label className="field"><span>Date</span><input required type="date" value={date} onChange={(event) => setDate(event.target.value)}/></label>
    </div>
    <div className="section-label"><div><h2>Split between</h2><p>{isPet ? 'Cat expenses start with everyone included.' : 'Choose who shares this expense.'}</p></div><span className="member-count">{participantIds.length} people</span></div>
    <div className="participant-list">{people.map((person) => <label className={`participant-row ${participantIds.includes(person.userId) ? 'selected' : ''}`} key={person.userId}><span className="check-wrap"><input type="checkbox" checked={participantIds.includes(person.userId)} onChange={(event) => setParticipantIds((current) => event.target.checked ? [...current,person.userId] : current.filter((id) => id !== person.userId))}/><span className="custom-check"/></span><span className="member-avatar">{person.name.trim().charAt(0).toUpperCase()}</span><span className="participant-name">{person.name}</span>{participantIds.includes(person.userId) && method !== 'equal' && <span className="share-entry"><input aria-label={`${person.name} ${method === 'exact' ? 'share in rupees' : 'percentage'}`} inputMode="decimal" placeholder={method === 'exact' ? '₹0.00' : '0%'} value={values[person.userId] ?? ''} onChange={(event) => setValues((previous) => ({ ...previous, [person.userId]: event.target.value }))}/>{method === 'percentage' && <span>%</span>}</span>}</label>)}</div>
    <div className="split-summary"><div className="split-method"><span>Split method</span><div className="segmented">{(['equal','exact','percentage'] as const).map((item) => <button type="button" key={item} className={method===item?'selected':''} onClick={() => setMethod(item)}>{item==='equal'?'Equal':item==='exact'?'Exact':'Percent'}</button>)}</div></div><div className="share-preview">{calculated && people.filter((person) => calculated[person.userId] !== undefined).map((person) => <div key={person.userId}><span>{person.name}</span><strong>{formatRupees(calculated[person.userId])}</strong></div>)}</div></div>
    <label className="field"><span>Receipt <em>optional</em></span><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" capture="environment" onChange={(event) => setFile(event.target.files?.[0] ?? null)}/>{file && <small>{file.name} · {(file.size/1024/1024).toFixed(1)} MB</small>}</label>
    <label className="field"><span>Note <em>optional</em></span><textarea rows={3} maxLength={2000} placeholder="Anything else to remember?" value={notes} onChange={(event) => setNotes(event.target.value)}/></label>
    <div className="form-actions"><Link className="button button-quiet" href="/expenses">Cancel</Link><button className="button button-primary" disabled={busy || !calculated}>{busy?'Saving…':'Save expense'}</button></div>
  </form>;
}
