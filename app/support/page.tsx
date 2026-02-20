import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support - FamShake",
  description: "Get help with FamShake. FAQ, troubleshooting, and contact information.",
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="text-primary hover:underline text-sm inline-block mb-8"
        >
          &larr; Back to Home
        </Link>

        <h1 className="text-3xl font-bold text-foreground font-headline mb-2">
          Support
        </h1>
        <p className="text-muted-foreground text-sm mb-10">
          Need help with FamShake? Find answers below or reach out to us.
        </p>

        <div className="space-y-8 text-foreground leading-relaxed">
          {/* Getting Started */}
          <section>
            <h2 className="text-xl font-bold font-headline mb-3">
              Getting Started
            </h2>
            <p className="text-muted-foreground">
              FamShake is a daily check-in app that helps families stay
              connected. Create an account, set up a circle with your loved
              ones, and check in each day to let them know you&apos;re okay.
            </p>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-xl font-bold font-headline mb-4">
              Frequently Asked Questions
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold mb-1">
                  How do I create a circle?
                </h3>
                <p className="text-muted-foreground">
                  After signing in, go to the &quot;My Circles&quot; tab and tap
                  the &quot;Create Circle&quot; button. Give your circle a name,
                  then share the invite link with family members so they can
                  join.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-1">
                  How do I join a circle?
                </h3>
                <p className="text-muted-foreground">
                  Ask a circle member to share an invite link with you. Open the
                  link, sign in or create an account, and you&apos;ll be added
                  to the circle automatically.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-1">
                  How do I check in?
                </h3>
                <p className="text-muted-foreground">
                  Go to the &quot;Check-in&quot; tab and tap the check-in
                  button. Your circle members will be notified that you&apos;re
                  okay. You can also add an optional message with your check-in.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-1">
                  How do I change my check-in frequency?
                </h3>
                <p className="text-muted-foreground">
                  Open the Settings (gear icon on mobile, or from the bottom
                  navigation) and choose your preferred check-in interval:
                  daily, weekly, or a custom schedule.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-1">
                  How do notifications work?
                </h3>
                <p className="text-muted-foreground">
                  FamShake sends push notifications to remind you to check in
                  and to let you know when circle members check in. Tap the bell
                  icon in the header to manage your notification settings.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-1">
                  What are emergency alerts?
                </h3>
                <p className="text-muted-foreground">
                  If you haven&apos;t checked in for 2 or more days, FamShake
                  can alert your circle members and an emergency contact. You
                  can set this up in Settings under Emergency Contact.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-1">
                  How do I delete my account?
                </h3>
                <p className="text-muted-foreground">
                  Tap your avatar in the top-right corner of the app, then
                  select &quot;Delete Account.&quot; This will permanently
                  remove your account and all associated data. This action
                  cannot be undone.
                </p>
              </div>
            </div>
          </section>

          {/* Troubleshooting */}
          <section>
            <h2 className="text-xl font-bold font-headline mb-4">
              Troubleshooting
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold mb-1">
                  I&apos;m not receiving notifications
                </h3>
                <p className="text-muted-foreground">
                  Make sure notifications are enabled in the app (tap the bell
                  icon) and in your device settings. On iOS, go to Settings
                  &gt; Notifications &gt; FamShake and ensure notifications are
                  allowed.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-1">
                  I forgot my password
                </h3>
                <p className="text-muted-foreground">
                  On the login page, tap &quot;Forgot password?&quot; and enter
                  your email address. You&apos;ll receive a password reset link
                  via email.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-1">
                  The app isn&apos;t loading
                </h3>
                <p className="text-muted-foreground">
                  Try closing and reopening the app, or check your internet
                  connection. If the issue persists, try signing out and signing
                  back in.
                </p>
              </div>
            </div>
          </section>

          {/* Contact Us */}
          <section>
            <h2 className="text-xl font-bold font-headline mb-3">
              Contact Us
            </h2>
            <p className="text-muted-foreground mb-4">
              If you can&apos;t find the answer to your question above, please
              reach out to us. We&apos;re happy to help.
            </p>
            <p className="text-muted-foreground">
              Email:{" "}
              <a
                href="mailto:support@famshake.app"
                className="text-primary hover:underline"
              >
                support@famshake.app
              </a>
            </p>
            <p className="text-muted-foreground mt-2">
              We aim to respond to all inquiries within 48 hours.
            </p>
          </section>

          {/* Links */}
          <section>
            <h2 className="text-xl font-bold font-headline mb-3">
              Additional Resources
            </h2>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-primary hover:underline"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} FamShake. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
