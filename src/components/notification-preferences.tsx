'use client';
import { useEffect, useState } from 'react';

const preferences=[{key:'expense_enabled',label:'Shared expenses',description:'When a housemate adds or changes an expense.'},{key:'cat_enabled',label:'Cat care',description:'When a meal is recorded.'},{key:'reminder_enabled',label:'Meal reminders',description:'When a scheduled meal is still waiting.'},{key:'payment_enabled',label:'Payments',description:'When a settlement payment is recorded.'}] as const;
type Key=typeof preferences[number]['key'];
type Values=Record<Key,boolean>;
const defaults:Values={expense_enabled:true,cat_enabled:true,reminder_enabled:true,payment_enabled:true};

export function NotificationPreferences({householdId}:{householdId:string|null}){
  const[values,setValues]=useState<Values>(defaults);const[ready,setReady]=useState(false);const[message,setMessage]=useState('');
  useEffect(()=>{if(!householdId){setReady(true);return}void fetch(`/api/backend/notifications/preferences?householdId=${encodeURIComponent(householdId)}`).then(async(response)=>{const result=await response.json() as{data?:Values};if(response.ok&&result.data)setValues(result.data);setReady(true)}).catch(()=>{setMessage('Could not load preferences.');setReady(true)})},[householdId]);
  async function update(key:Key,value:boolean){if(!householdId)return;const previous=values[key];setValues((current)=>({...current,[key]:value}));setMessage('');const response=await fetch('/api/backend/notifications/preferences',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({householdId,key,value})});if(!response.ok){const result=await response.json() as{error?:string};setValues((current)=>({...current,[key]:previous}));setMessage(result.error??'Could not save preference.')}else setMessage('Preference saved. Push delivery still needs to be connected.')}
  return <div className="settings-sections"><section className="settings-card notification-settings"><span className="side-eyebrow">YOUR DEVICE</span><h2>What would you like to hear about?</h2>{!ready&&<p>Loading your preferences…</p>}{preferences.map((item)=><label className="preference-row" key={item.key}><span><b>{item.label}</b><small>{item.description}</small></span><input type="checkbox" role="switch" checked={values[item.key]} disabled={!ready||!householdId} onChange={(event)=>void update(item.key,event.target.checked)}/></label>)}{message&&<p className="settings-message" role="status">{message}</p>}</section><p className="notification-permission-note">Notification preferences are saved in MR HEIGHTS. Push delivery requires a separate notification service setup.</p></div>
}
