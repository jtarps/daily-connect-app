import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { verifyAuthToken } from '../_lib/auth';

/**
 * Test endpoint for verifying push notifications are working.
 * Requires authentication. Only available in development unless ALLOW_TEST_ENDPOINTS is set.
 */
export async function POST(request: NextRequest) {
  // Block in production unless explicitly enabled
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_TEST_ENDPOINTS) {
    return NextResponse.json(
      { error: 'Test endpoint disabled in production' },
      { status: 403 }
    );
  }

  // Require authentication
  const auth = await verifyAuthToken(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (!admin.apps.length) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized. Check FIREBASE_SERVICE_ACCOUNT_KEY.' },
        { status: 500 }
      );
    }

    const db = admin.firestore();
    const messaging = admin.messaging();

    const tokensSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('fcmTokens')
      .get();

    if (tokensSnapshot.empty) {
      return NextResponse.json({
        success: false,
        message: 'No FCM tokens found for this user. Make sure they have enabled notifications.',
        tokensFound: 0,
      });
    }

    const tokens = tokensSnapshot.docs.map(doc => doc.id);

    const message = {
      notification: {
        title: 'Test Notification',
        body: 'If you see this, push notifications are working!',
      },
      webpush: {
        fcmOptions: {
          link: '/check-in',
        },
        notification: {
          icon: '/icon-192.png',
        }
      },
      tokens: tokens,
    };

    const response = await messaging.sendEachForMulticast(message);

    return NextResponse.json({
      success: true,
      message: `Test notification sent!`,
      tokensFound: tokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error) {
    console.error('Test notification error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
