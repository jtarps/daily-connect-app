import { NextRequest, NextResponse } from 'next/server';
import { sendRemindersToInactiveMembers } from '@/app/actions';
import * as admin from 'firebase-admin';

/**
 * Cron job endpoint for sending daily reminders to inactive circle members.
 * 
 * This endpoint should be called by Vercel Cron (configured in vercel.json).
 * It checks all circles and sends reminders to members who haven't checked in today.
 * 
 * Security: Protected by CRON_SECRET environment variable.
 * 
 * Schedule: Configure in vercel.json (e.g., daily at 9 AM UTC: "0 9 * * *")
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
    
    // Get all circles
    const circlesSnapshot = await db.collection('circles').get();
    
    if (circlesSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'No circles found',
        sent: 0,
        failed: 0,
      });
    }
    
    let totalSent = 0;
    let totalFailed = 0;
    const results: string[] = [];
    
    // Process each circle
    for (const circleDoc of circlesSnapshot.docs) {
      const circleData = circleDoc.data();
      const memberIds = circleData.memberIds || [];
      
      if (memberIds.length === 0) {
        continue;
      }
      
      // For each member, try to send reminders to inactive members
      // We'll use the first member as the "sender" (could be improved to rotate)
      for (const memberId of memberIds) {
        try {
          // Get user data for sender name
          const userDoc = await db.collection('users').doc(memberId).get();
          if (!userDoc.exists) continue;
          
          const userData = userDoc.data();
          const userName = userData?.firstName || userData?.email?.split('@')[0] || 'Friend';
          
          // Send reminders to inactive members in this circle
          const result = await sendRemindersToInactiveMembers({
            circleId: circleDoc.id,
            senderId: memberId,
            senderName: userName,
          });
          
          if (result.success) {
            totalSent += result.sent || 0;
            totalFailed += result.failed || 0;
            if (result.details) {
              results.push(...result.details);
            }
          } else {
            totalFailed++;
            results.push(`Circle ${circleDoc.id}: ${result.message}`);
          }
          
          // Only process once per circle (using first member as sender)
          break;
        } catch (error) {
          console.error(`Error processing circle ${circleDoc.id}:`, error);
          totalFailed++;
          results.push(`Circle ${circleDoc.id}: Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Cron job completed. Sent ${totalSent} reminder(s), ${totalFailed} failed.`,
      sent: totalSent,
      failed: totalFailed,
      circlesProcessed: circlesSnapshot.size,
      details: results.slice(0, 50), // Limit details to first 50
    });
  } catch (error) {
    console.error('Cron job error:', error);
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

