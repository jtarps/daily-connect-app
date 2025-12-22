import { notifyCircleOnCheckIn } from '@/app/actions';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
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

