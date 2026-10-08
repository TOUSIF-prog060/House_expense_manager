import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getStore } from '@/lib/backend/supabase-store';

const schema=z.object({name:z.string().trim().min(1).max(80)});
export async function PATCH(request:NextRequest,context:{params:Promise<{id:string}>}){
  try{const auth=await createClient();const{data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:'Sign in required.'},{status:401});const parsed=schema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:'Household name must be 1 to 80 characters.'},{status:400});const{id}=await context.params;const store=getStore();const members=await store.list('household_members');const member=members.find((row)=>row.household_id===id&&row.user_id===user.id&&row.status==='active');if(member?.role!=='admin')return NextResponse.json({error:'Household admin required.'},{status:403});await store.update('households',id,{name:parsed.data.name,updated_at:new Date().toISOString()});return NextResponse.json({ok:true})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Could not update household.'},{status:503})}
}
