import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getStore } from '@/lib/backend/supabase-store';

const schema=z.object({name:z.string().trim().min(1).max(40)});
export async function POST(request:NextRequest,context:{params:Promise<{id:string}>}){
  try{const auth=await createClient();const{data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:'Sign in required.'},{status:401});const parsed=schema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:'Meal slot name must be 1 to 40 characters.'},{status:400});const{id}=await context.params;const store=getStore();const members=await store.list('household_members');const member=members.find((row)=>row.household_id===id&&row.user_id===user.id&&row.status==='active');if(member?.role!=='admin')return NextResponse.json({error:'Household admin required.'},{status:403});const slots=await store.list('meal_slots');if(slots.some((slot)=>slot.household_id===id&&slot.name.toLowerCase()===parsed.data.name.toLowerCase()))return NextResponse.json({error:'That meal slot already exists.'},{status:409});const record={id:randomUUID(),household_id:id,name:parsed.data.name,display_order:String(slots.filter((slot)=>slot.household_id===id).length+1),reminder_enabled:'false',reminder_time:'',created_at:new Date().toISOString()};await store.append('meal_slots',[record]);return NextResponse.json({data:record},{status:201})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Could not add meal slot.'},{status:503})}
}
