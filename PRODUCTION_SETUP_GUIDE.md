# Production Setup Guide

This guide will walk you through setting up your Daily Connect app for production.

## Phase 1: Domain Setup 🌐

### Step 1: Choose and Purchase Domain

1. **Choose a domain name** (e.g., `dailyconnect.app`, `dailyconnect.io`, `mydailyconnect.com`)
   - Keep it short and memorable
   - Consider `.app` or `.io` for tech products
   - Check availability on:
     - [Namecheap](https://www.namecheap.com/)
     - [Google Domains](https://domains.google/)
     - [Cloudflare](https://www.cloudflare.com/products/registrar/)

2. **Purchase the domain** (usually $10-15/year)

### Step 2: Configure Domain in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Domains**
3. Click **Add Domain**
4. Enter your domain (e.g., `dailyconnect.app`)
5. Vercel will provide DNS records to add:
   - **A Record** or **CNAME** for root domain
   - **CNAME** for `www` subdomain

### Step 3: Update DNS Records

1. Go to your domain registrar's DNS settings
2. Add the DNS records provided by Vercel:
   - For root domain: Add **A Record** pointing to Vercel's IP
   - For `www`: Add **CNAME** pointing to `cname.vercel-dns.com`
3. Wait for DNS propagation (usually 5-60 minutes)

### Step 4: Update Environment Variables

Once your domain is live, update these in Vercel:

1. Go to **Settings** → **Environment Variables**
2. Add/Update:
   ```
   NEXT_PUBLIC_APP_URL=https://yourdomain.com
   ```
3. Update Firebase Authorized Domains:
   - Go to Firebase Console → Authentication → Settings → Authorized domains
   - Add your new domain

---

## Phase 2: Email Service Setup 📧

### Step 1: Sign Up for Resend

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account (3,000 emails/month)
3. Verify your email address

### Step 2: Get API Key

1. In Resend dashboard, go to **API Keys**
2. Click **Create API Key**
3. Name it (e.g., "Daily Connect Production")
4. Copy the API key (starts with `re_`)

### Step 3: Add to Vercel

1. Go to Vercel → **Settings** → **Environment Variables**
2. Add these variables:
   ```
   EMAIL_SERVICE_URL=https://api.resend.com/emails
   EMAIL_API_KEY=re_your_api_key_here
   ```
3. Make sure to add to **Production**, **Preview**, and **Development** environments

### Step 4: (Optional) Verify Your Domain in Resend

For better deliverability:
1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Follow the DNS setup instructions
4. Add the provided DNS records to your domain registrar

### Step 5: Test Email Sending

1. Send a test invitation from your app
2. Check if the email arrives
3. Check spam folder if needed

---

## Phase 3: Security & Monitoring 🔒

### Step 1: Set CRON_SECRET

1. Generate a secure random string:
   ```bash
   openssl rand -base64 32
   ```
2. Add to Vercel environment variables:
   ```
   CRON_SECRET=your_generated_secret_here
   ```
3. This protects your cron endpoints from unauthorized access

### Step 2: Set Up Error Monitoring (Optional but Recommended)

**Option A: Sentry (Recommended)**
1. Sign up at [sentry.io](https://sentry.io)
2. Create a new project (Next.js)
3. Install: `npm install @sentry/nextjs`
4. Run setup: `npx @sentry/wizard@latest -i nextjs`
5. Add `SENTRY_DSN` to Vercel environment variables

**Option B: Vercel Analytics**
- Already included with Vercel Pro
- Enable in Vercel dashboard → Analytics

### Step 3: Review Firebase Security Rules

1. Test your Firestore security rules in production
2. Use Firebase Console → Firestore → Rules → Test
3. Verify all rules are working correctly

---

## Phase 4: Final Checklist ✅

Before going live, verify:

- [ ] Domain is configured and SSL certificate is active
- [ ] `NEXT_PUBLIC_APP_URL` is set to your domain
- [ ] Firebase authorized domains include your domain
- [ ] Email service (Resend) is configured and tested
- [ ] `CRON_SECRET` is set for cron job security
- [ ] All environment variables are set in Vercel
- [ ] Test invitation emails are working
- [ ] Test push notifications are working
- [ ] Test check-in functionality
- [ ] Test circle creation and invitations
- [ ] Mobile responsiveness is verified
- [ ] Error monitoring is set up (optional)

---

## Quick Commands Reference

### Check DNS Propagation
```bash
# Check if domain is pointing to Vercel
dig yourdomain.com
nslookup yourdomain.com
```

### Test Email API
```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "onboarding@resend.dev",
    "to": "your-email@example.com",
    "subject": "Test Email",
    "html": "<p>Test email from Daily Connect</p>"
  }'
```

---

## Next Steps After Production Setup

1. **Native App Setup** (iOS/Android)
2. **Analytics** (optional)
3. **Performance Optimization**
4. **SEO** (meta tags, Open Graph)

---

## Need Help?

If you encounter issues:
1. Check Vercel deployment logs
2. Check Firebase console for errors
3. Verify all environment variables are set
4. Test in browser console for client-side errors
