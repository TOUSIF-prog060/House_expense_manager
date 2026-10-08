'use client';

import { useState } from 'react';
import { Check, Clock3 } from 'lucide-react';

export function FeedButton({ householdId, slotId, slotName, feedingDate, alreadyFed }: { householdId: string; slotId: string; slotName: string; feedingDate: string; alreadyFed: boolean }) {
  const [fed, setFed] = useState(alreadyFed); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [confirm, setConfirm] = useState(false);
  async function feed() {
    if (!navigator.onLine) { setMessage('Reconnect before recording a meal.'); return; }
    setBusy(true); setMessage('');
    try { const response=await fetch('/api/backend/cat/feedings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({householdId,mealSlotId:slotId,feedingDate})});const result=await response.json() as {error?:string;duplicate?:boolean;code?:string;fedByName?:string;data?:{fed_at?:string}};if(response.status===409&&result.code==='CAT_ALREADY_FED'){const time=result.data?.fed_at?new Date(result.data.fed_at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'';setMessage(`${slotName} meal was already recorded by ${result.fedByName??'a housemate'}${time?` at ${time}`:''}.`);setFed(true);}else if(!response.ok)throw new Error(result.error??'Could not save the feeding.');else setFed(true); } catch (error) { setMessage(error instanceof Error?error.message:'Couldn’t update right now. Check your connection and try again.'); }
    setBusy(false); setConfirm(false);
  }
  return <>{fed ? <span className="meal-status fed"><Check size={15}/> FED</span> : <button type="button" className="button button-primary button-feed" disabled={busy} onClick={() => setConfirm(true)}><Check size={17}/>{busy?'Updating…':'Mark as Fed'}</button>}{message && <p className="meal-message" role="status">{message}</p>}{confirm && <div className="modal-backdrop" role="presentation"><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby={`confirm-${slotId}`}><span className="modal-icon"><Clock3 size={21}/></span><h2 id={`confirm-${slotId}`}>Cat has been fed?</h2><p>Record the {slotName.toLowerCase()} meal as completed for {new Date(`${feedingDate}T12:00:00`).toLocaleDateString(undefined,{month:'long',day:'numeric'})}.</p><div className="modal-actions"><button type="button" className="button button-primary" onClick={feed}>Yes, Cat Has Been Fed</button><button type="button" className="button button-quiet" onClick={() => setConfirm(false)}>Cancel</button></div></section></div>}</>;
}


