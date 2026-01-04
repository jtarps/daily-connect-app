import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

/**
 * Test endpoint for verifying push notifications are working.
 * 
 * Usage:
 * POST /api/test-notification
 * Body: { "userId": "user-id-here" }
 * 
 * This will send a test notification to all FCM tokens for the specified user.
 * 
 * ⚠️ Only use in development or with proper authentication!
 */
export async function POST(request: NextRequest) {
  // In production, you might want to add authentication here
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_TEST_ENDPOINTS) {
    return NextResponse.json(
      { error: 'Test endpoint disabled in production' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Ensure Firebase Admin is initialized
    if (!admin.apps.length) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized. Check FIREBASE_SERVICE_ACCOUNT_KEY.' },
        { status: 500 }
      );
    }

    const db = admin.firestore();
    const messaging = admin.messaging();

    // Get user's FCM tokens
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

    // Send test notification
    const message = {
      notification: {
        title: '🧪 Test Notification',
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
      responses: response.responses.map((resp, idx) => ({
        token: tokens[idx].substring(0, 20) + '...',
        success: resp.success,
        error: resp.error?.message || null,
      })),
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

