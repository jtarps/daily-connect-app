import { notifyCircleOnCheckIn } from '@/app/actions';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../_lib/auth';

export async function POST(request: NextRequest) {
  const auth = await verifyAuthToken(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const result = await notifyCircleOnCheckIn(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in notify-checkin API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', notified: 0 },
      { status: 500 }
    );
  }
}
