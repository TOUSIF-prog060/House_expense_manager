import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

type Event = { household_id:string; type:'expense'|'cat'|'payment'|'reminder'; title:string; body:string; entity_id?:string; entity_type?:string; entity_url?:string; exclude_user_id?:string };
const supabaseUrl=Deno.env.get('SUPABASE_URL')!;
const serviceRole=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const publicKey=Deno.env.get('VAPID_PUBLIC_KEY')!;
const privateKey=Deno.env.get('VAPID_PRIVATE_KEY')!;
const subject=Deno.env.get('VAPID_SUBJECT')??'mailto:admin@example.com';
webpush.setVapidDetails(subject,publicKey,privateKey);
const db=createClient(supabaseUrl,serviceRole,{auth:{persistSession:false}});

Deno.serve(async(request)=>{
  if(request.method!=='POST')return new Response('Method not allowed',{status:405});
  const expected=Deno.env.get('PUSH_FUNCTION_SECRET');
  if(expected&&request.headers.get('authorization')!==`Bearer ${expected}`)return new Response('Unauthorized',{status:401});
  let event:Event;try{event=await request.json()}catch{return Response.json({error:'Invalid payload'},{status:400})}
  if(!event.household_id||!event.type||!event.title||!event.body)return Response.json({error:'Missing notification fields'},{status:400});
  const preference={expense:'expense_enabled',cat:'cat_enabled',payment:'payment_enabled',reminder:'reminder_enabled'}[event.type] as string;
  let query=db.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth').eq('household_id',event.household_id).eq('is_active',true).eq(preference,true);
  if(event.exclude_user_id)query=query.neq('user_id',event.exclude_user_id);
  const{subscriptions,error}=await query;
  if(error)return Response.json({error:'Could not load recipients'},{status:500});
  const results=await Promise.allSettled((subscriptions??[]).map(async(subscription)=>{
    await db.from('notifications').insert({user_id:subscription.user_id,household_id:event.household_id,type:event.type,title:event.title,body:event.body,entity_id:event.entity_id??null,entity_type:event.entity_type??null});
    try{await webpush.sendNotification({endpoint:subscription.endpoint,keys:{p256dh:subscription.p256dh,auth:subscription.auth}},JSON.stringify({title:event.title,body:event.body,url:event.entity_url??'/home'}));}
    catch(error){if(typeof error==='object'&&error!==null&&'statusCode'in error&&((error as{statusCode:number}).statusCode===404||(error as{statusCode:number}).statusCode===410))await db.from('push_subscriptions').update({is_active:false}).eq('id',subscription.id);else throw error;}
  }));
  const failed=results.filter((result)=>result.status==='rejected').length;
  return Response.json({delivered:(subscriptions?.length??0)-failed,failed});
});
