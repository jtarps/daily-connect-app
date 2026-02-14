import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - FamShake",
  description: "Privacy Policy for the FamShake daily check-in app.",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "February 14, 2026";

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
          Privacy Policy
        </h1>
        <p className="text-muted-foreground text-sm mb-10">
          Last updated: {lastUpdated}
        </p>

        <div className="space-y-8 text-foreground leading-relaxed">
          {/* Introduction */}
          <section>
            <h2 className="text-xl font-bold font-headline mb-3">
              1. Introduction
            </h2>
            <p className="text-muted-foreground">
              Welcome to FamShake (&quot;we,&quot; &quot;our,&quot; or
              &quot;us&quot;). FamShake is a daily check-in app designed to help
              families stay connected. This Privacy Policy explains how we
              collect, use, store, and protect your personal information when you
              use our application. By using FamShake, you agree to the
              collection and use of information in accordance with this policy.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-xl font-bold font-headline mb-3">
              2. Information We Collect
            </h2>
            <p className="text-muted-foreground mb-3">
              We collect the following types of information to provide and
              improve FamShake:
            </p>

            <h3 className="text-lg font-bold mb-2">
              2.1 Account Information
            </h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4 ml-2">
              <li>Email address (used for authentication and account recovery)</li>
              <li>Password (stored securely by Firebase Authentication; we never have access to your plain-text password)</li>
              <li>Display name (if provided)</li>
            </ul>

            <h3 className="text-lg font-bold mb-2">
              2.2 Check-In Data
            </h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4 ml-2">
              <li>Daily check-in status and timestamps</li>
              <li>Check-in messages or notes you choose to include</li>
            </ul>

            <h3 className="text-lg font-bold mb-2">
              2.3 Circle and Social Data
            </h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4 ml-2">
              <li>Family circles you create or join</li>
              <li>Invitation data (tokens, email addresses of invitees)</li>
              <li>Relationships between circle members</li>
            </ul>

            <h3 className="text-lg font-bold mb-2">
              2.4 Device and Notification Data
            </h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>Push notification tokens (used to deliver reminders and alerts)</li>
              <li>Device type and browser information (collected automatically by Firebase)</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-xl font-bold font-headline mb-3">
              3. How We Use Your Information
            </h2>
            <p className="text-muted-foreground mb-3">
              We use your information solely to operate and improve FamShake:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>To authenticate your identity and maintain your account</li>
              <li>To record and display your daily check-ins to your circle members</li>
              <li>To manage family circles, invitations, and memberships</li>
              <li>To send push notifications such as check-in reminders and circle updates</li>
              <li>To provide customer support and respond to your requests</li>
            </ul>
          </section>

          {/* Data Storage and Security */}
          <section>
            <h2 className="text-xl font-bold font-headline mb-3">
              4. Data Storage and Security
            </h2>
            <p className="text-muted-foreground mb-3">
              All data is stored using Google Firebase services, including:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-4 ml-2">
              <li>
                <span className="font-semibold text-foreground">Firebase Authentication</span>{" "}
                &mdash; securely manages user sign-in credentials
              </li>
              <li>
                <span className="font-semibold text-foreground">Cloud Firestore</span>{" "}
                &mdash; stores user profiles, check-ins, circles, and invitations
              </li>
              <li>
                <span className="font-semibold text-foreground">Firebase Cloud Messaging</span>{" "}
                &mdash; delivers push notifications to your devices
              </li>
            </ul>
            <p className="text-muted-foreground">
              Your data is protected by Firebase&apos;s built-in security
              measures, including encryption in transit (TLS) and at rest.
              Access to your data within the app is governed by Firestore
              security rules that ensure users can only access data they are
              authorized to view.
            </p>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-xl font-bold font-headline mb-3">
              5. Third-Party Services
            </h2>
            <p className="text-muted-foreground mb-3">
              FamShake relies on Google Firebase as its backend infrastructure
              provider. By using FamShake, your data is processed by
              Google&apos;s servers in accordance with{" "}
              <a
                href="https://firebase.google.com/support/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Firebase&apos;s Privacy and Security documentation
              </a>{" "}
              and{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google&apos;s Privacy Policy
              </a>
              .
            </p>
            <p className="text-muted-foreground">
              We do not use any analytics services, advertising networks, or
              other third-party trackers. We do not sell, rent, or share your
              personal data with any third parties beyond what is necessary to
              operate the app through Firebase.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-xl font-bold font-headline mb-3">
              6. Data Retention
            </h2>
            <p className="text-muted-foreground">
              We retain your data for as long as your account is active. If you
              delete your account, we will remove your personal data from our
              systems within a reasonable timeframe. Some data may be retained in
              Firebase backups for a limited period before being permanently
              deleted.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-xl font-bold font-headline mb-3">
              7. Your Rights
            </h2>
            <p className="text-muted-foreground mb-3">
              Depending on your jurisdiction, you may have the following rights
              regarding your personal data:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
              <li>
                <span className="font-semibold text-foreground">Access</span>{" "}
                &mdash; request a copy of the personal data we hold about you
              </li>
              <li>
                <span className="font-semibold text-foreground">Correction</span>{" "}
                &mdash; request that we correct inaccurate or incomplete data
              </li>
              <li>
                <span className="font-semibold text-foreground">Deletion</span>{" "}
                &mdash; request that we delete your personal data
              </li>
              <li>
                <span className="font-semibold text-foreground">Portability</span>{" "}
                &mdash; request a copy of your data in a portable format
              </li>
              <li>
                <span className="font-semibold text-foreground">Objection</span>{" "}
                &mdash; object to the processing of your data in certain circumstances
              </li>
            </ul>
            <p className="text-muted-foreground mt-3">
              To exercise any of these rights, please contact us using the
              details provided below.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-xl font-bold font-headline mb-3">
              8. Children&apos;s Privacy
            </h2>
            <p className="text-muted-foreground">
              FamShake is not directed at children under the age of 13. We do
              not knowingly collect personal information from children under 13.
              If you believe we have inadvertently collected such information,
              please contact us so we can promptly remove it.
            </p>
          </section>

          {/* Changes to This Policy */}
          <section>
            <h2 className="text-xl font-bold font-headline mb-3">
              9. Changes to This Policy
            </h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. When we make
              changes, we will update the &quot;Last updated&quot; date at the
              top of this page. We encourage you to review this policy
              periodically. Continued use of FamShake after any changes
              constitutes your acceptance of the updated policy.
            </p>
          </section>

          {/* Contact Us */}
          <section>
            <h2 className="text-xl font-bold font-headline mb-3">
              10. Contact Us
            </h2>
            <p className="text-muted-foreground">
              If you have any questions, concerns, or requests regarding this
              Privacy Policy or your personal data, please contact us at:
            </p>
            <p className="mt-2">
              <a
                href="mailto:privacy@famshake.app"
                className="text-primary hover:underline"
              >
                privacy@famshake.app
              </a>
            </p>
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
