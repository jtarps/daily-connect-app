
'use server';

import { z } from 'zod';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK only if it hasn't been initialized yet.
if (!admin.apps.length) {
  try {
    // Try to use service account credentials from environment variable
    // You only need ONE of these methods:
    // Option 1 (Recommended): FIREBASE_SERVICE_ACCOUNT_KEY - JSON string (works on Vercel/Netlify)
    // Option 2: GOOGLE_APPLICATION_CREDENTIALS - path to JSON file (works locally or on Google Cloud)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Option 1: JSON string from environment variable (best for Vercel/Netlify)
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Option 2: Path to service account key file (for local dev or Google Cloud)
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    } else {
      // For local development or when using Application Default Credentials
      // This will work if you're running on Google Cloud or have ADC configured
      admin.initializeApp();
    }
  } catch (error) {
    console.error('Firebase Admin SDK initialization failed:', error);
    // Don't throw - let the function handle the error gracefully
  }
}

const ReminderInputSchema = z.object({
  recipientId: z.string().describe('The user ID of the recipient.'),
  senderName: z.string().describe('The name of the user sending the reminder.'),
  recipientName: z.string().describe('The name of the user receiving the reminder.'),
});
type ReminderInput = z.infer<typeof ReminderInputSchema>;


export async function sendReminder(input: ReminderInput) {
    // Access services inside the function to ensure initialization is complete.
    const db = admin.firestore();
    const messaging = admin.messaging();

    const validation = ReminderInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, message: 'Invalid input.' };
    }

    const { recipientId, senderName, recipientName } = validation.data;

    try {
        // 1. Get the recipient's FCM tokens from Firestore
        const tokensSnapshot = await db
          .collection('users')
          .doc(recipientId)
          .collection('fcmTokens')
          .get();

        if (tokensSnapshot.empty) {
          console.log(`No FCM tokens found for user ${recipientName}.`);
          return {
            success: false,
            message: `Couldn't send a reminder to ${recipientName} as they have not enabled notifications.`,
          };
        }

        const tokens = tokensSnapshot.docs.map(doc => doc.id);
        const reminderMessage = `${senderName} is thinking of you! Don't forget to check in today.`;

        // 2. Construct the FCM message payload
        const message = {
          notification: {
            title: 'Your circle is thinking of you! 👋',
            body: reminderMessage,
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

        // 3. Send the message
        const response = await messaging.sendEachForMulticast(message);
        console.log('Successfully sent message:', response);
        
        if (response.failureCount > 0) {
          const failedTokens: string[] = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              failedTokens.push(tokens[idx]);
            }
          });
          console.log('List of tokens that caused failures: ' + failedTokens);
        }
        
        return {
          success: true,
          message: `A friendly reminder has been sent to ${recipientName}.`,
        };

    } catch (error) {
        console.error('Error sending message:', error);
        return {
            success: false,
            message: 'There was an error sending the reminder.',
        };
    }
}

const SendRemindersToInactiveInputSchema = z.object({
  circleId: z.string().describe('The circle ID.'),
  senderId: z.string().describe('The user ID of the person sending the reminders.'),
  senderName: z.string().describe('The name of the person sending the reminders.'),
});
type SendRemindersToInactiveInput = z.infer<typeof SendRemindersToInactiveInputSchema>;

export async function sendRemindersToInactiveMembers(input: SendRemindersToInactiveInput) {
    const db = admin.firestore();
    const messaging = admin.messaging();

    const validation = SendRemindersToInactiveInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, message: 'Invalid input.', sent: 0, failed: 0 };
    }

    const { circleId, senderId, senderName } = validation.data;

    try {
        // 1. Get the circle to find all members
        const circleDoc = await db.collection('circles').doc(circleId).get();
        if (!circleDoc.exists) {
            return { success: false, message: 'Circle not found.', sent: 0, failed: 0 };
        }

        const circleData = circleDoc.data();
        const memberIds = circleData?.memberIds || [];
        
        // Filter out the sender
        const otherMemberIds = memberIds.filter((id: string) => id !== senderId);

        if (otherMemberIds.length === 0) {
            return { success: true, message: 'No other members in the circle.', sent: 0, failed: 0 };
        }

        // 2. For each member, check if they've checked in today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let sentCount = 0;
        let failedCount = 0;
        const results: string[] = [];

        for (const memberId of otherMemberIds) {
            try {
                // Get user data
                const userDoc = await db.collection('users').doc(memberId).get();
                if (!userDoc.exists) {
                    failedCount++;
                    continue;
                }

                const userData = userDoc.data();
                const userName = userData?.firstName || 'Friend';

                // Get latest check-in
                const checkInsSnapshot = await db
                    .collection('users')
                    .doc(memberId)
                    .collection('checkIns')
                    .orderBy('timestamp', 'desc')
                    .limit(1)
                    .get();

                const latestCheckIn = checkInsSnapshot.docs[0];
                let hasCheckedInToday = false;

                if (latestCheckIn) {
                    const checkInDate = latestCheckIn.data().timestamp?.toDate();
                    if (checkInDate) {
                        const checkInDay = new Date(checkInDate);
                        checkInDay.setHours(0, 0, 0, 0);
                        hasCheckedInToday = checkInDay.getTime() === today.getTime();
                    }
                }

                // Only send reminder if they haven't checked in today
                if (!hasCheckedInToday) {
                    // Get FCM tokens
                    const tokensSnapshot = await db
                        .collection('users')
                        .doc(memberId)
                        .collection('fcmTokens')
                        .get();

                    if (!tokensSnapshot.empty) {
                        const tokens = tokensSnapshot.docs.map(doc => doc.id);
                        const reminderMessage = `${senderName} is thinking of you! Don't forget to check in today.`;

                        const message = {
                            notification: {
                                title: 'Your circle is thinking of you! 👋',
                                body: reminderMessage,
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
                        
                        if (response.successCount > 0) {
                            sentCount++;
                            results.push(`${userName}: sent`);
                        } else {
                            failedCount++;
                            results.push(`${userName}: failed (no valid tokens)`);
                        }
                    } else {
                        // No tokens, but don't count as failed since they just haven't enabled notifications
                        results.push(`${userName}: skipped (notifications not enabled)`);
                    }
                } else {
                    results.push(`${userName}: skipped (already checked in)`);
                }
            } catch (error) {
                console.error(`Error sending reminder to member ${memberId}:`, error);
                failedCount++;
            }
        }

        return {
            success: true,
            message: `Sent ${sentCount} reminder(s) to inactive members.`,
            sent: sentCount,
            failed: failedCount,
            details: results,
        };

    } catch (error) {
        console.error('Error sending reminders to inactive members:', error);
        return {
            success: false,
            message: 'There was an error sending reminders.',
            sent: 0,
            failed: 0,
        };
    }
}

const NotifyCircleOnCheckInInputSchema = z.object({
  userId: z.string().describe('The user ID of the person who checked in.'),
  userName: z.string().describe('The name of the person who checked in.'),
});
type NotifyCircleOnCheckInInput = z.infer<typeof NotifyCircleOnCheckInInputSchema>;

export async function notifyCircleOnCheckIn(input: NotifyCircleOnCheckInInput) {
    const db = admin.firestore();
    const messaging = admin.messaging();

    const validation = NotifyCircleOnCheckInInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, message: 'Invalid input.', notified: 0 };
    }

    const { userId, userName } = validation.data;

    try {
        // 1. Get user's preference
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return { success: false, message: 'User not found.', notified: 0 };
        }

        const userData = userDoc.data();
        const notifyCircle = userData?.notifyCircleOnCheckIn !== false; // Default to true

        if (!notifyCircle) {
            return { success: true, message: 'Notifications disabled by user.', notified: 0 };
        }

        // 2. Find all circles this user belongs to
        const circlesSnapshot = await db
            .collection('circles')
            .where('memberIds', 'array-contains', userId)
            .get();

        if (circlesSnapshot.empty) {
            return { success: true, message: 'User is not in any circles.', notified: 0 };
        }

        // 3. For each circle, notify all other members
        let totalNotified = 0;
        const allTokens: string[] = [];
        const memberIdsSet = new Set<string>();

        for (const circleDoc of circlesSnapshot.docs) {
            const circleData = circleDoc.data();
            const memberIds = circleData.memberIds || [];
            
            // Get all other members (excluding the user who checked in)
            const otherMembers = memberIds.filter((id: string) => id !== userId);
            
            for (const memberId of otherMembers) {
                if (memberIdsSet.has(memberId)) continue; // Avoid duplicates
                memberIdsSet.add(memberId);

                // Get FCM tokens for this member
                const tokensSnapshot = await db
                    .collection('users')
                    .doc(memberId)
                    .collection('fcmTokens')
                    .get();

                tokensSnapshot.docs.forEach(tokenDoc => {
                    allTokens.push(tokenDoc.id);
                });
            }
        }

        if (allTokens.length === 0) {
            return { success: true, message: 'No members with notifications enabled.', notified: 0 };
        }

        // 4. Send notification to all tokens
        const message = {
            notification: {
                title: `${userName} checked in! ✅`,
                body: `${userName} just checked in. They're doing okay!`,
            },
            webpush: {
                fcmOptions: {
                    link: '/circle',
                },
                notification: {
                    icon: '/icon-192.png',
                }
            },
            tokens: allTokens,
        };

        const response = await messaging.sendEachForMulticast(message);
        
        if (response.failureCount > 0) {
            const failedTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(allTokens[idx]);
                }
            });
            console.log('List of tokens that caused failures: ' + failedTokens);
        }

        totalNotified = response.successCount;

        return {
            success: true,
            message: `Notified ${totalNotified} circle member(s).`,
            notified: totalNotified,
        };

    } catch (error) {
        console.error('Error notifying circle on check-in:', error);
        return {
            success: false,
            message: 'There was an error notifying your circle.',
            notified: 0,
        };
    }
}

// Email notification schema
const SendInvitationEmailInputSchema = z.object({
    inviteeEmail: z.string().email(),
    circleName: z.string(),
    inviterName: z.string(),
    invitationLink: z.string().optional(),
});

type SendInvitationEmailInput = z.infer<typeof SendInvitationEmailInputSchema>;

/**
 * Sends an email notification for a circle invitation.
 * Uses a simple email service (can be configured with Resend, SendGrid, etc.)
 */
export async function sendInvitationEmail(input: SendInvitationEmailInput) {
    const db = admin.firestore();
    
    const validation = SendInvitationEmailInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, message: 'Invalid input.' };
    }

    const { inviteeEmail, circleName, inviterName, invitationLink } = validation.data;

    try {
        // For now, we'll use a simple approach that logs the email
        // In production, you can integrate with Resend, SendGrid, or another email service
        
        // Check if email service is configured
        const emailServiceUrl = process.env.EMAIL_SERVICE_URL;
        const emailApiKey = process.env.EMAIL_API_KEY;
        
        if (emailServiceUrl && emailApiKey) {
            // If email service is configured, send the email
            const emailResponse = await fetch(emailServiceUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${emailApiKey}`,
                },
                body: JSON.stringify({
                    to: inviteeEmail,
                    subject: `${inviterName} invited you to join "${circleName}" on Daily Connect`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2>You've been invited to join "${circleName}"!</h2>
                            <p>Hi there,</p>
                            <p><strong>${inviterName}</strong> has invited you to join their circle "<strong>${circleName}</strong>" on Daily Connect.</p>
                            <p>Daily Connect is a simple way to let your loved ones know you're okay, every day.</p>
                            ${invitationLink ? `
                                <p style="margin: 30px 0;">
                                    <a href="${invitationLink}" style="background-color: #64B5F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                        Accept Invitation
                                    </a>
                                </p>
                            ` : `
                                <p style="margin: 30px 0;">
                                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://daily-connect-app.vercel.app'}/signup" style="background-color: #64B5F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                        Sign Up to Join
                                    </a>
                                </p>
                            `}
                            <p>Once you sign up, you'll automatically see the invitation and can join the circle.</p>
                            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                            <p style="color: #666; font-size: 12px;">
                                If you didn't expect this invitation, you can safely ignore this email.
                            </p>
                        </div>
                    `,
                    text: `${inviterName} invited you to join "${circleName}" on Daily Connect. ${invitationLink ? `Accept here: ${invitationLink}` : `Sign up at ${process.env.NEXT_PUBLIC_APP_URL || 'https://daily-connect-app.vercel.app'}/signup`}`,
                }),
            });

            if (!emailResponse.ok) {
                console.error('Email service error:', await emailResponse.text());
                return { success: false, message: 'Failed to send email notification.' };
            }
        } else {
            // Log email for development (email service not configured)
            console.log('📧 Invitation Email (email service not configured):', {
                to: inviteeEmail,
                subject: `${inviterName} invited you to join "${circleName}"`,
                invitationLink: invitationLink || 'Sign up to see invitation',
            });
        }

        return { success: true, message: 'Invitation email sent.' };
    } catch (error) {
        console.error('Error sending invitation email:', error);
        return {
            success: false,
            message: 'There was an error sending the invitation email.',
        };
    }
}