import { sendRemindersToInactiveMembers } from '@/app/actions';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await sendRemindersToInactiveMembers(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in reminders-inactive API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', sent: 0, failed: 0 },
      { status: 500 }
    );
  }
}

