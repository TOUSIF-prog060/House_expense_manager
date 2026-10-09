import { NextResponse } from 'next/server';
import { getPublicVapidKey } from '@/lib/notifications/vapid';

export async function GET() {
  const publicKey = getPublicVapidKey();
  if (!publicKey) {
    return NextResponse.json(
      { error: 'VAPID public key not configured on server.' },
      { status: 503 }
    );
  }
  return NextResponse.json({ publicKey });
}
