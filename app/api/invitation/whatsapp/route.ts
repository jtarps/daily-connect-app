import { sendInvitationWhatsApp } from '@/app/actions';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await sendInvitationWhatsApp(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in invitation WhatsApp API:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

