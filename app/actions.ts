
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
              icon: '/logo-192.png',
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
