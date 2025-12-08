# Phone Authentication Setup

## Cost
- **Free tier:** 10,000 verifications per month
- **After free tier:** $0.06 per verification (SMS costs included)
- Very affordable! Most apps stay in the free tier.

## Why Phone Authentication?
- Many people in developing countries use phone numbers instead of email
- WhatsApp/Facebook users often sign up with phone numbers
- SMS verification is reliable and widely available
- Shareable links work perfectly with phone authentication

## Firebase Console Setup

### 1. Enable Phone Authentication
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Authentication** → **Sign-in method**
4. Enable **Phone** provider
5. Add your app's domain to authorized domains if needed

### 2. Set up reCAPTCHA (Required)
Phone authentication uses reCAPTCHA to prevent abuse:
1. In Firebase Console → **Authentication** → **Settings** → **reCAPTCHA**
2. Firebase automatically handles reCAPTCHA v3 for web apps
3. No additional setup needed - it's built into the `RecaptchaVerifier` component

### 3. Test Phone Numbers (Optional)
For testing, you can add test phone numbers:
1. In Firebase Console → **Authentication** → **Settings** → **Phone numbers for testing**
2. Add test numbers with verification codes
3. These bypass SMS sending (useful for development)

## How It Works

### Signup Flow
1. User selects "Phone" tab on signup page
2. Enters name and phone number
3. reCAPTCHA verifies they're human
4. SMS code sent to phone
5. User enters code
6. Account created with phone number
7. User stays logged in

### Login Flow
1. User selects "Phone" tab on login page
2. Enters phone number
3. SMS code sent
4. User enters code
5. Logged in

## Code Implementation

The phone authentication is already implemented:
- `components/daily-connect/phone-auth.tsx` - Phone auth component
- `components/daily-connect/signup-form.tsx` - Updated with phone/email tabs
- `lib/data.ts` - User model supports `phoneNumber` field

## Testing

### Test Phone Numbers
Add test numbers in Firebase Console to avoid SMS costs during development:
- Format: `+1234567890` (with country code)
- Verification code: `123456` (or any 6 digits you set)

### Production
- Remove test numbers before production
- Real SMS will be sent
- First 10,000 verifications are free per month

## Troubleshooting

### "reCAPTCHA not loaded"
- Make sure you're on HTTPS (required for production)
- Check browser console for errors
- Ensure Firebase project has reCAPTCHA enabled

### "Invalid phone number format"
- Phone numbers must include country code
- Format: `+1234567890` (with + prefix)
- Example: `+2341234567890` for Nigeria

### SMS not received
- Check phone number format
- Verify Firebase Phone Auth is enabled
- Check Firebase Console → Authentication → Usage for errors
- Some countries may have restrictions

## Next Steps

1. ✅ Enable Phone Authentication in Firebase Console
2. ✅ Test with a real phone number
3. ✅ Update invitation system to support phone numbers (optional)
4. ✅ Consider adding phone number to invitation links

