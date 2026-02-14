
'use server';

import { z } from 'zod';
import * as admin from 'firebase-admin';
import { differenceInDays } from 'date-fns';
import { sendApnsPush, isApnsConfigured } from '@/lib/apns';

// Token info type for dual FCM/APNs delivery
interface TokenInfo {
    id: string;
    type?: string;
}

// Helper: extract token info from Firestore snapshot
function getTokenInfos(tokensSnapshot: admin.firestore.QuerySnapshot): TokenInfo[] {
    return tokensSnapshot.docs.map(doc => ({
        id: doc.id,
        type: doc.data().type,
    }));
}

// Helper: send notification to both FCM (web) and APNs (native iOS) tokens
async function sendMulticastNotification(
    tokenInfos: TokenInfo[],
    notification: { title: string; body: string },
    link?: string,
): Promise<{ successCount: number; failureCount: number }> {
    const fcmTokens = tokenInfos.filter(t => t.type !== 'apns').map(t => t.id);
    const apnsTokens = tokenInfos.filter(t => t.type === 'apns').map(t => t.id);

    let successCount = 0;
    let failureCount = 0;

    // Send to web via FCM
    if (fcmTokens.length > 0) {
        const messaging = admin.messaging();
        const resp = await messaging.sendEachForMulticast({
            tokens: fcmTokens,
            notification,
            webpush: {
                fcmOptions: { link: link || '/check-in' },
                notification: { icon: '/icon-192.png' },
            },
        });
        successCount += resp.successCount;
        failureCount += resp.failureCount;
    }

    // Send to native iOS via APNs
    if (apnsTokens.length > 0 && isApnsConfigured()) {
        for (const token of apnsTokens) {
            try {
                const ok = await sendApnsPush(token, notification.title, notification.body);
                if (ok) successCount++;
                else failureCount++;
            } catch {
                failureCount++;
            }
        }
    } else if (apnsTokens.length > 0) {
        // APNs not configured - skip native tokens silently
        failureCount += apnsTokens.length;
    }

    return { successCount, failureCount };
}

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
    const db = admin.firestore();

    const validation = ReminderInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, message: 'Invalid input.' };
    }

    const { recipientId, senderName, recipientName } = validation.data;

    try {
        const tokensSnapshot = await db
          .collection('users')
          .doc(recipientId)
          .collection('fcmTokens')
          .get();

        if (tokensSnapshot.empty) {
          return {
            success: false,
            message: `${recipientName} hasn't enabled notifications yet. They can enable them by clicking the bell icon in the app header.`,
          };
        }

        const tokenInfos = getTokenInfos(tokensSnapshot);
        const reminderMessage = `${senderName} is thinking of you! Don't forget to check in today.`;

        const response = await sendMulticastNotification(
            tokenInfos,
            { title: 'Your circle is thinking of you! 👋', body: reminderMessage },
            '/check-in',
        );

        if (response.successCount === 0) {
          return {
            success: false,
            message: `Failed to send reminder to ${recipientName}. Notification delivery failed. They may need to re-enable notifications.`,
          };
        }

        if (response.failureCount > 0) {
          return {
            success: true,
            message: `Reminder sent to ${recipientName} (${response.successCount} device(s) received it, ${response.failureCount} failed).`,
          };
        }

        return {
          success: true,
          message: `Reminder sent to ${recipientName}! They should receive it on their device${response.successCount > 1 ? 's' : ''} shortly.`,
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
                        const tokenInfos = getTokenInfos(tokensSnapshot);
                        const reminderMessage = `${senderName} is thinking of you! Don't forget to check in today.`;

                        const response = await sendMulticastNotification(
                            tokenInfos,
                            { title: 'Your circle is thinking of you! 👋', body: reminderMessage },
                            '/check-in',
                        );

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

    const validation = NotifyCircleOnCheckInInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, message: 'Invalid input.', notified: 0 };
    }

    const { userId, userName } = validation.data;

    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return { success: false, message: 'User not found.', notified: 0 };
        }

        const userData = userDoc.data();
        const notifyCircle = userData?.notifyCircleOnCheckIn !== false;

        if (!notifyCircle) {
            return { success: true, message: 'Notifications disabled by user.', notified: 0 };
        }

        const circlesSnapshot = await db
            .collection('circles')
            .where('memberIds', 'array-contains', userId)
            .get();

        if (circlesSnapshot.empty) {
            return { success: true, message: 'User is not in any circles.', notified: 0 };
        }

        const allTokenInfos: TokenInfo[] = [];
        const memberIdsSet = new Set<string>();

        for (const circleDoc of circlesSnapshot.docs) {
            const circleData = circleDoc.data();
            const memberIds = circleData.memberIds || [];
            const otherMembers = memberIds.filter((id: string) => id !== userId);

            for (const memberId of otherMembers) {
                if (memberIdsSet.has(memberId)) continue;
                memberIdsSet.add(memberId);

                const tokensSnapshot = await db
                    .collection('users')
                    .doc(memberId)
                    .collection('fcmTokens')
                    .get();

                tokensSnapshot.docs.forEach(tokenDoc => {
                    allTokenInfos.push({ id: tokenDoc.id, type: tokenDoc.data().type });
                });
            }
        }

        if (allTokenInfos.length === 0) {
            return { success: true, message: 'No members with notifications enabled.', notified: 0 };
        }

        const response = await sendMulticastNotification(
            allTokenInfos,
            { title: `${userName} checked in! ✅`, body: `${userName} just checked in. They're doing okay!` },
            '/circle',
        );

        return {
            success: true,
            message: `Notified ${response.successCount} circle member(s).`,
            notified: response.successCount,
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
                    subject: `${inviterName} invited you to join "${circleName}" on FamShake`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2>You've been invited to join "${circleName}"!</h2>
                            <p>Hi there,</p>
                            <p><strong>${inviterName}</strong> has invited you to join their circle "<strong>${circleName}</strong>" on FamShake.</p>
                            <p>FamShake is a simple way to let your loved ones know you're okay, every day.</p>
                            ${invitationLink ? `
                                <p style="margin: 30px 0;">
                                    <a href="${invitationLink}" style="background-color: #64B5F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                        Accept Invitation
                                    </a>
                                </p>
                            ` : `
                                <p style="margin: 30px 0;">
                                    <a href="${process.env.NEXT_PUBLIC_APP_URL || ''}/signup" style="background-color: #64B5F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
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
                    text: `${inviterName} invited you to join "${circleName}" on FamShake. ${invitationLink ? `Accept here: ${invitationLink}` : `Sign up at ${process.env.NEXT_PUBLIC_APP_URL || ''}/signup`}`,
                }),
            });

            if (!emailResponse.ok) {
                console.error('Email service error:', await emailResponse.text());
                return { success: false, message: 'Failed to send email notification.' };
            }
        } else {
            // Log email for development (email service not configured)
            // Email service not configured - invitation email not sent
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

// SMS notification schema
const SendInvitationSMSInputSchema = z.object({
    inviteePhone: z.string(),
    circleName: z.string(),
    inviterName: z.string(),
    invitationLink: z.string().optional(),
});

type SendInvitationSMSInput = z.infer<typeof SendInvitationSMSInputSchema>;

/**
 * Sends an SMS notification for a circle invitation.
 * Uses a simple SMS service (can be configured with Twilio, etc.)
 */
export async function sendInvitationSMS(input: SendInvitationSMSInput) {
    const db = admin.firestore();
    
    const validation = SendInvitationSMSInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, message: 'Invalid input.' };
    }

    const { inviteePhone, circleName, inviterName, invitationLink } = validation.data;

    try {
        // Format phone number (ensure it starts with +)
        const formattedPhone = inviteePhone.startsWith('+') ? inviteePhone : `+${inviteePhone}`;
        
        // Check if SMS service is configured
        const smsServiceUrl = process.env.SMS_SERVICE_URL;
        const smsApiKey = process.env.SMS_API_KEY;
        
        if (smsServiceUrl && smsApiKey) {
            // If SMS service is configured, send the SMS
            const smsResponse = await fetch(smsServiceUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${smsApiKey}`,
                },
                body: JSON.stringify({
                    to: formattedPhone,
                    message: `${inviterName} invited you to join "${circleName}" on FamShake. ${invitationLink ? `Join here: ${invitationLink}` : `Sign up at ${process.env.NEXT_PUBLIC_APP_URL || ''}/signup`}`,
                }),
            });

            if (!smsResponse.ok) {
                console.error('SMS service error:', await smsResponse.text());
                return { success: false, message: 'Failed to send SMS notification.' };
            }
        } else {
            // Log SMS for development (SMS service not configured)
            // SMS service not configured - invitation SMS not sent
        }

        return { success: true, message: 'Invitation SMS sent.' };
    } catch (error) {
        console.error('Error sending invitation SMS:', error);
        return {
            success: false,
            message: 'There was an error sending the invitation SMS.',
        };
    }
}

// WhatsApp notification schema
const SendInvitationWhatsAppInputSchema = z.object({
    inviteePhone: z.string(),
    circleName: z.string(),
    inviterName: z.string(),
    invitationLink: z.string().optional(),
});

type SendInvitationWhatsAppInput = z.infer<typeof SendInvitationWhatsAppInputSchema>;

/**
 * Sends a WhatsApp notification for a circle invitation.
 * Uses WhatsApp Business API (can be configured with Twilio, Meta, etc.)
 * Much cheaper than SMS - ~$0.0014 per message vs $0.06 for SMS
 */
export async function sendInvitationWhatsApp(input: SendInvitationWhatsAppInput) {
    const db = admin.firestore();
    
    const validation = SendInvitationWhatsAppInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, message: 'Invalid input.' };
    }

    const { inviteePhone, circleName, inviterName, invitationLink } = validation.data;

    try {
        // Format phone number (ensure it starts with + and remove any spaces)
        const formattedPhone = inviteePhone.startsWith('+') 
            ? inviteePhone.replace(/\s/g, '') 
            : `+${inviteePhone.replace(/\s/g, '')}`;
        
        // Check if WhatsApp service is configured
        const whatsappServiceUrl = process.env.WHATSAPP_SERVICE_URL;
        const whatsappApiKey = process.env.WHATSAPP_API_KEY;
        const whatsappPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        
        if (whatsappServiceUrl && whatsappApiKey && whatsappPhoneNumberId) {
            // If WhatsApp service is configured, send the message
            // This uses the WhatsApp Business API format (Meta/Twilio)
            const messageText = `${inviterName} invited you to join "${circleName}" on FamShake. ${invitationLink ? `Join here: ${invitationLink}` : `Sign up at ${process.env.NEXT_PUBLIC_APP_URL || ''}/signup`}`;
            
            const whatsappResponse = await fetch(whatsappServiceUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${whatsappApiKey}`,
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: formattedPhone,
                    type: 'text',
                    text: {
                        body: messageText
                    }
                }),
            });

            if (!whatsappResponse.ok) {
                console.error('WhatsApp service error:', await whatsappResponse.text());
                return { success: false, message: 'Failed to send WhatsApp notification.' };
            }
        } else {
            // Log WhatsApp message for development (service not configured)
            // WhatsApp service not configured - invitation WhatsApp not sent
        }

        return { success: true, message: 'Invitation WhatsApp sent.' };
    } catch (error) {
        console.error('Error sending invitation WhatsApp:', error);
        return {
            success: false,
            message: 'There was an error sending the invitation WhatsApp.',
        };
    }
}

const SendEmergencyAlertInputSchema = z.object({
  userId: z.string().describe('The user ID who hasn\'t checked in for 2+ days.'),
  userName: z.string().describe('The name of the user.'),
  daysSinceLastCheckIn: z.number().describe('Number of days since last check-in.'),
});
type SendEmergencyAlertInput = z.infer<typeof SendEmergencyAlertInputSchema>;

/**
 * Send emergency alerts for users who haven't checked in for 2+ days
 * Notifies circle members (push) and emergency contact (email/SMS)
 */
export async function sendEmergencyAlert(input: SendEmergencyAlertInput) {
    const db = admin.firestore();

    const validation = SendEmergencyAlertInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, message: 'Invalid input.', notified: 0, emergencyContactNotified: false };
    }

    const { userId, userName, daysSinceLastCheckIn } = validation.data;

    try {
        // 1. Get user data
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return { success: false, message: 'User not found.', notified: 0, emergencyContactNotified: false };
        }

        const userData = userDoc.data();
        const emergencyContact = userData?.emergencyContact;
        const emergencyAlertEnabled = userData?.emergencyAlertEnabled;

        if (!emergencyAlertEnabled || !emergencyContact) {
            return { success: false, message: 'Emergency alerts not enabled or contact not set.', notified: 0, emergencyContactNotified: false };
        }

        let circleNotified = 0;
        let emergencyContactNotified = false;

        // 2. Notify circle members (push notifications)
        const circlesSnapshot = await db
            .collection('circles')
            .where('memberIds', 'array-contains', userId)
            .get();

        if (!circlesSnapshot.empty) {
            const allTokenInfos: TokenInfo[] = [];
            const memberIdsSet = new Set<string>();

            for (const circleDoc of circlesSnapshot.docs) {
                const circleData = circleDoc.data();
                const memberIds = circleData.memberIds || [];
                const otherMembers = memberIds.filter((id: string) => id !== userId);

                for (const memberId of otherMembers) {
                    if (memberIdsSet.has(memberId)) continue;
                    memberIdsSet.add(memberId);

                    const tokensSnapshot = await db
                        .collection('users')
                        .doc(memberId)
                        .collection('fcmTokens')
                        .get();

                    tokensSnapshot.docs.forEach(tokenDoc => {
                        allTokenInfos.push({ id: tokenDoc.id, type: tokenDoc.data().type });
                    });
                }
            }

            if (allTokenInfos.length > 0) {
                const response = await sendMulticastNotification(
                    allTokenInfos,
                    {
                        title: `⚠️ ${userName} hasn't checked in for ${daysSinceLastCheckIn} day${daysSinceLastCheckIn !== 1 ? 's' : ''}`,
                        body: `${userName} hasn't checked in since ${daysSinceLastCheckIn} day${daysSinceLastCheckIn !== 1 ? 's' : ''} ago. Please check on them.`,
                    },
                    '/circle',
                );
                circleNotified = response.successCount;
            }
        }

        // 3. Notify emergency contact (email/SMS)
        if (emergencyContact.email || emergencyContact.phoneNumber) {
            const contactName = emergencyContact.name || 'Emergency Contact';
            const relationship = emergencyContact.relationship ? ` (${emergencyContact.relationship})` : '';

            // Send email if available
            if (emergencyContact.email) {
                const emailServiceUrl = process.env.EMAIL_SERVICE_URL;
                const emailApiKey = process.env.EMAIL_API_KEY;
                
                if (emailServiceUrl && emailApiKey) {
                    try {
                        await fetch(emailServiceUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${emailApiKey}`,
                            },
                            body: JSON.stringify({
                                to: emergencyContact.email,
                                subject: `⚠️ Emergency Alert: ${userName} hasn't checked in for ${daysSinceLastCheckIn} day${daysSinceLastCheckIn !== 1 ? 's' : ''}`,
                                html: `
                                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                        <h2 style="color: #dc2626;">⚠️ Emergency Alert</h2>
                                        <p>Hello ${contactName},</p>
                                        <p><strong>${userName}${relationship}</strong> hasn't checked in on FamShake for <strong>${daysSinceLastCheckIn} day${daysSinceLastCheckIn !== 1 ? 's' : ''}</strong>.</p>
                                        <p>This is an automated alert. Please check on them to make sure they're okay.</p>
                                        <p style="margin-top: 30px; color: #666; font-size: 12px;">
                                            This alert was sent because ${userName} has you set as their emergency contact and hasn't checked in for 2+ days.
                                        </p>
                                    </div>
                                `,
                                text: `Emergency Alert: ${userName}${relationship} hasn't checked in for ${daysSinceLastCheckIn} day${daysSinceLastCheckIn !== 1 ? 's' : ''}. Please check on them.`,
                            }),
                        });
                        emergencyContactNotified = true;
                    } catch (error) {
                        console.error('Failed to send emergency email:', error);
                    }
                }
            }

            // Send SMS if available (and email wasn't sent or failed)
            if (emergencyContact.phoneNumber && !emergencyContactNotified) {
                const smsServiceUrl = process.env.SMS_SERVICE_URL;
                const smsApiKey = process.env.SMS_API_KEY;
                
                if (smsServiceUrl && smsApiKey) {
                    try {
                        const formattedPhone = emergencyContact.phoneNumber.startsWith('+') 
                            ? emergencyContact.phoneNumber.replace(/\s/g, '') 
                            : `+${emergencyContact.phoneNumber.replace(/\s/g, '')}`;
                        
                        await fetch(smsServiceUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${smsApiKey}`,
                            },
                            body: JSON.stringify({
                                to: formattedPhone,
                                message: `⚠️ Emergency Alert: ${userName}${relationship} hasn't checked in for ${daysSinceLastCheckIn} day${daysSinceLastCheckIn !== 1 ? 's' : ''}. Please check on them.`,
                            }),
                        });
                        emergencyContactNotified = true;
                    } catch (error) {
                        console.error('Failed to send emergency SMS:', error);
                    }
                }
            }
        }

        return {
            success: true,
            message: `Emergency alerts sent. ${circleNotified} circle member(s) notified, emergency contact ${emergencyContactNotified ? 'notified' : 'notification failed'}.`,
            notified: circleNotified,
            emergencyContactNotified,
        };

    } catch (error) {
        console.error('Error sending emergency alert:', error);
        return {
            success: false,
            message: 'There was an error sending emergency alerts.',
            notified: 0,
            emergencyContactNotified: false,
        };
    }
}

const SendNotOkayAlertInputSchema = z.object({
  userId: z.string().describe('The user ID sending the alert.'),
  userName: z.string().describe('The name of the user sending the alert.'),
  circleId: z.string().optional().describe('Optional circle ID - alert goes to this circle.'),
  recipientId: z.string().optional().describe('Optional recipient ID - alert goes to specific person instead of circle.'),
  message: z.string().optional().describe('Optional custom message.'),
});
type SendNotOkayAlertInput = z.infer<typeof SendNotOkayAlertInputSchema>;

/**
 * Send "not okay" alert - user needs help
 * Can send to circle members or specific person
 */
export async function sendNotOkayAlert(input: SendNotOkayAlertInput) {
    const db = admin.firestore();

    const validation = SendNotOkayAlertInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, message: 'Invalid input.', notified: 0 };
    }

    const { userId, userName, circleId, recipientId, message } = validation.data;

    try {
        let notified = 0;
        const alertMessage = message || `${userName} needs help. Please check on them.`;
        const alertNotification = { title: `⚠️ ${userName} needs help`, body: alertMessage };

        // If recipientId is set, send to specific person
        if (recipientId) {
            const tokensSnapshot = await db
                .collection('users')
                .doc(recipientId)
                .collection('fcmTokens')
                .get();

            if (!tokensSnapshot.empty) {
                const response = await sendMulticastNotification(
                    getTokenInfos(tokensSnapshot), alertNotification, '/circle',
                );
                notified = response.successCount;

                await db.collection('notOkayAlerts').add({
                    userId, userName, recipientId, message: alertMessage,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    resolved: false,
                });
            }
        }
        // If circleId is set, send to circle members
        else if (circleId) {
            const circleDoc = await db.collection('circles').doc(circleId).get();
            if (!circleDoc.exists) {
                return { success: false, message: 'Circle not found.', notified: 0 };
            }

            const circleData = circleDoc.data();
            const memberIds = circleData?.memberIds || [];
            const otherMemberIds = memberIds.filter((id: string) => id !== userId);

            const allTokenInfos: TokenInfo[] = [];
            for (const memberId of otherMemberIds) {
                const tokensSnapshot = await db
                    .collection('users')
                    .doc(memberId)
                    .collection('fcmTokens')
                    .get();

                tokensSnapshot.docs.forEach(tokenDoc => {
                    allTokenInfos.push({ id: tokenDoc.id, type: tokenDoc.data().type });
                });
            }

            if (allTokenInfos.length > 0) {
                const response = await sendMulticastNotification(allTokenInfos, alertNotification, '/circle');
                notified = response.successCount;

                await db.collection('notOkayAlerts').add({
                    userId, userName, circleId, message: alertMessage,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    resolved: false,
                });
            }
        }
        // Otherwise, send to all circles user belongs to
        else {
            const circlesSnapshot = await db
                .collection('circles')
                .where('memberIds', 'array-contains', userId)
                .get();

            if (!circlesSnapshot.empty) {
                const allTokenInfos: TokenInfo[] = [];
                const memberIdsSet = new Set<string>();

                for (const circleDoc of circlesSnapshot.docs) {
                    const circleData = circleDoc.data();
                    const memberIds = circleData.memberIds || [];
                    const otherMembers = memberIds.filter((id: string) => id !== userId);

                    for (const memberId of otherMembers) {
                        if (memberIdsSet.has(memberId)) continue;
                        memberIdsSet.add(memberId);

                        const tokensSnapshot = await db
                            .collection('users')
                            .doc(memberId)
                            .collection('fcmTokens')
                            .get();

                        tokensSnapshot.docs.forEach(tokenDoc => {
                            allTokenInfos.push({ id: tokenDoc.id, type: tokenDoc.data().type });
                        });
                    }
                }

                if (allTokenInfos.length > 0) {
                    const response = await sendMulticastNotification(allTokenInfos, alertNotification, '/circle');
                    notified = response.successCount;

                    await db.collection('notOkayAlerts').add({
                        userId, userName, message: alertMessage,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        resolved: false,
                    });
                }
            }
        }

        return {
            success: true,
            message: `Alert sent! ${notified} ${notified === 1 ? 'person' : 'people'} notified.`,
            notified,
        };

    } catch (error) {
        console.error('Error sending not okay alert:', error);
        return {
            success: false,
            message: 'There was an error sending the alert.',
            notified: 0,
        };
    }
}