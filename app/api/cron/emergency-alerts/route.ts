import { NextRequest, NextResponse } from 'next/server';
import { sendEmergencyAlert } from '@/app/actions';
import * as admin from 'firebase-admin';
import { differenceInDays } from 'date-fns';

/**
 * Cron job endpoint for sending emergency alerts to users who haven't checked in for 2+ days.
 * 
 * This endpoint should be called by Vercel Cron (configured in vercel.json).
 * It checks all users with emergency alerts enabled and sends alerts if they haven't checked in for 2+ days.
 * 
 * Security: Protected by CRON_SECRET environment variable.
 * 
 * Schedule: Configure in vercel.json (e.g., daily at 10 AM UTC: "0 10 * * *")
 */
export async function GET(request: NextRequest) {
  // Verify this is a cron request from Vercel
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // If CRON_SECRET is set, require it for security
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Ensure Firebase Admin is initialized
    if (!admin.apps.length) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      );
    }

    const db = admin.firestore();
    
    // Get all users with emergency alerts enabled
    const usersSnapshot = await db
      .collection('users')
      .where('emergencyAlertEnabled', '==', true)
      .get();
    
    if (usersSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'No users with emergency alerts enabled',
        alertsSent: 0,
        failed: 0,
      });
    }
    
    const now = new Date();
    let alertsSent = 0;
    let failed = 0;
    const results: string[] = [];
    
    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        const userId = userDoc.id;
        const userName = userData?.firstName && userData?.lastName
          ? `${userData.firstName} ${userData.lastName}`
          : userData?.firstName || userData?.email?.split('@')[0] || 'User';
        
        // Check if user has emergency contact set
        if (!userData?.emergencyContact) {
          results.push(`${userName}: skipped (no emergency contact set)`);
          continue;
        }

        // Get latest check-in
        const checkInsSnapshot = await db
          .collection('users')
          .doc(userId)
          .collection('checkIns')
          .orderBy('timestamp', 'desc')
          .limit(1)
          .get();

        const latestCheckIn = checkInsSnapshot.docs[0];
        
        if (!latestCheckIn) {
          // No check-ins at all - check if account is new (created less than 2 days ago)
          // For now, we'll skip users with no check-ins to avoid false alarms
          results.push(`${userName}: skipped (no check-ins yet)`);
          continue;
        }

        const checkInDate = latestCheckIn.data().timestamp?.toDate();
        if (!checkInDate) {
          results.push(`${userName}: skipped (invalid check-in date)`);
          continue;
        }

        // Calculate days since last check-in
        const daysSinceLastCheckIn = differenceInDays(now, checkInDate);

        // Only send alert if 2+ days have passed
        if (daysSinceLastCheckIn >= 2) {
          const result = await sendEmergencyAlert({
            userId,
            userName,
            daysSinceLastCheckIn,
          });

          if (result.success) {
            alertsSent++;
            results.push(`${userName}: alert sent (${result.notified} circle members, emergency contact ${result.emergencyContactNotified ? 'notified' : 'failed'})`);
          } else {
            failed++;
            results.push(`${userName}: failed - ${result.message}`);
          }
        } else {
          results.push(`${userName}: skipped (only ${daysSinceLastCheckIn} day${daysSinceLastCheckIn !== 1 ? 's' : ''} since last check-in)`);
        }
      } catch (error) {
        console.error(`Error processing user ${userDoc.id}:`, error);
        failed++;
        results.push(`User ${userDoc.id}: Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Emergency alert cron job completed. ${alertsSent} alert(s) sent, ${failed} failed.`,
      alertsSent,
      failed,
      usersProcessed: usersSnapshot.size,
      details: results.slice(0, 50), // Limit details to first 50
    });
  } catch (error) {
    console.error('Emergency alert cron job error:', error);
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
