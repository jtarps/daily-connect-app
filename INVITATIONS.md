# Invitation System

## How Invitations Work

### Shareable Links (No Email Required for Sending)

- **Generate a shareable link** for any circle
- **Share via WhatsApp, SMS, Facebook Messenger**, or any platform
- Recipients click the link to accept the invitation
- **Works for anyone**, even if they don't have email

### Email Invitations

- Enter email addresses to invite members
- **Email notifications are sent** (if email service is configured)
- Recipients see invitations when they sign up with that email

## Authentication Requirement

**Important:** Recipients still need to create an account to join circles, even when using shareable links.

### Current Authentication Methods

- **Email/Password** - Traditional signup with email and password
- **Phone Number** - Sign up with phone number (SMS verification)
- Users can choose either method when signing up
- Once signed up, they remain logged in via Firebase Auth

### Phone Authentication Pricing

- **Free tier:** 10,000 verifications per month
- **After free tier:** $0.06 per verification (SMS costs included)
- Very affordable for most apps!

### Why Phone Authentication is Great for Developing Countries

- Many people use phone numbers instead of email
- WhatsApp/Facebook users often sign up with phone numbers
- SMS verification is reliable and widely available
- Shareable links work perfectly with phone authentication

## Email Notifications Setup

### Option 1: Resend (Recommended)

1. Sign up at [resend.com](https://resend.com)
2. Get your API key
3. Add to Vercel environment variables:
   - `EMAIL_SERVICE_URL=https://api.resend.com/emails`
   - `EMAIL_API_KEY=re_your_api_key_here`

### Option 2: SendGrid

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Get your API key
3. Add to Vercel environment variables:
   - `EMAIL_SERVICE_URL=https://api.sendgrid.com/v3/mail/send`
   - `EMAIL_API_KEY=SG.your_api_key_here`

### Option 3: Custom Email Service

Update `sendInvitationEmail` in `app/actions.ts` to use your email service API.

### Development Mode

If email service is not configured, invitations are still created in Firestore, but emails are only logged to the console.

## WhatsApp Notifications Setup (Recommended - Much Cheaper!)

**Cost Comparison:**
- **WhatsApp Business API:** ~$0.0014 per message (utility/authentication)
- **SMS:** $0.06 per message (after Firebase free tier)
- **WhatsApp is ~43x cheaper!** 🎉

### Option 1: Twilio WhatsApp API (Recommended)

1. Sign up at [twilio.com](https://twilio.com)
2. Enable WhatsApp Sandbox or get approved for WhatsApp Business API
3. Get your Account SID, Auth Token, and WhatsApp Phone Number ID
4. Add to Vercel environment variables:
   - `WHATSAPP_SERVICE_URL=https://api.twilio.com/2010-04-01/Accounts/{AccountSID}/Messages.json`
   - `WHATSAPP_API_KEY=your_auth_token_here`
   - `WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id`

### Option 2: Meta WhatsApp Business API

1. Set up WhatsApp Business Account at [business.facebook.com](https://business.facebook.com)
2. Get your Access Token and Phone Number ID
3. Add to Vercel environment variables:
   - `WHATSAPP_SERVICE_URL=https://graph.facebook.com/v18.0/{PhoneNumberID}/messages`
   - `WHATSAPP_API_KEY=your_access_token_here`
   - `WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id`

### Option 3: Custom WhatsApp Service

Update `sendInvitationWhatsApp` in `app/actions.ts` to use your WhatsApp service API.

## SMS Notifications Setup (Fallback)

The system will automatically fall back to SMS if WhatsApp is not configured or fails.

### Option 1: Twilio SMS

1. Sign up at [twilio.com](https://twilio.com)
2. Get your Account SID and Auth Token
3. Add to Vercel environment variables:
   - `SMS_SERVICE_URL=https://api.twilio.com/2010-04-01/Accounts/{AccountSID}/Messages.json`
   - `SMS_API_KEY=your_auth_token_here`
   - Note: You'll need to update the `sendInvitationSMS` function in `app/actions.ts` to use Twilio's API format

### Option 2: Custom SMS Service

Update `sendInvitationSMS` in `app/actions.ts` to use your SMS service API.

### Development Mode

If neither WhatsApp nor SMS service is configured, invitations are still created in Firestore, but notifications are only logged to the console.

## How It Works

1. **Shareable Link Flow:**

   - User generates link → Shares via WhatsApp/SMS → Recipient clicks → Signs up → Accepts invitation → Joins circle

2. **Email Invitation Flow:**
   - User enters email → Invitation created → Email sent → Recipient signs up → Sees invitation → Accepts → Joins circle

## Next Steps

To fully support users without email:

1. Add Firebase Phone Authentication
2. Update signup form to support phone OR email
3. Update invitation system to work with phone numbers
4. Shareable links will work the same way
