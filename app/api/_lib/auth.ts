import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

/**
 * Verifies the Firebase Auth token from the Authorization header.
 * Returns the decoded token if valid, or a NextResponse error if not.
 */
export async function verifyAuthToken(request: NextRequest): Promise<
  { uid: string } | NextResponse
> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, message: 'Missing or invalid authorization header' },
      { status: 401 }
    );
  }

  const token = authHeader.replace('Bearer ', '');

  if (!admin.apps.length) {
    return NextResponse.json(
      { success: false, message: 'Firebase Admin not initialized' },
      { status: 500 }
    );
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return { uid: decodedToken.uid };
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}
