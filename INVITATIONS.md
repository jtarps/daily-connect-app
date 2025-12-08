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
- **Email/Password** - Required for all users
- Users must sign up with an email address to create an account
- Once signed up, they remain logged in via Firebase Auth

### Why Email is Still Required
- Firebase Authentication requires an email for account creation
- Email is used for:
  - Account recovery
  - Email verification
  - Password resets
  - Staying logged in across devices

### Future: Phone Number Authentication
To support users without email, you could add:
- **Phone number authentication** (Firebase supports this)
- Users sign up with phone number instead of email
- Still works with shareable links

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

