import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

export const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border-default bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Privacy Policy</h1>
            <p className="text-text-secondary">Last updated: January 10, 2026</p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-text-secondary">
          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">1. Introduction</h2>
            <p>
              Welcome to Sparkfluence ("we," "our," or "us"). We are committed to protecting your
              privacy and ensuring the security of your personal information. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you use
              our AI-powered video creation platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">2. Information We Collect</h2>
            <p className="mb-4">We collect information you provide directly to us, including:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Account information (name, email address, password)</li>
              <li>Profile information (avatar, preferences, creative DNA settings)</li>
              <li>Content you create (scripts, videos, images)</li>
              <li>Payment information (processed securely via Stripe)</li>
              <li>Connected social media account information (YouTube, Instagram, TikTok)</li>
              <li>Usage data and analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">3. How We Use Your Information</h2>
            <p className="mb-4">We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Generate AI-powered content based on your preferences</li>
              <li>Process transactions and send related information</li>
              <li>Connect and post to your linked social media accounts</li>
              <li>Send you technical notices, updates, and support messages</li>
              <li>Respond to your comments, questions, and requests</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">4. Third-Party Services</h2>
            <p className="mb-4">We integrate with third-party services to provide our features:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Google/YouTube:</strong> For YouTube account connection and video uploads</li>
              <li><strong>Meta/Instagram:</strong> For Instagram account connection and content posting</li>
              <li><strong>TikTok:</strong> For TikTok account connection and video uploads</li>
              <li><strong>Stripe:</strong> For secure payment processing</li>
              <li><strong>Supabase:</strong> For data storage and authentication</li>
            </ul>
            <p className="mt-4">
              Each third-party service has its own privacy policy governing the use of your information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal
              information against unauthorized access, alteration, disclosure, or destruction. This
              includes encryption of sensitive data, secure token storage, and regular security audits.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">6. Your Rights</h2>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access and receive a copy of your personal data</li>
              <li>Rectify or update your personal information</li>
              <li>Delete your account and associated data</li>
              <li>Disconnect linked social media accounts at any time</li>
              <li>Object to or restrict processing of your data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">7. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active or as needed
              to provide you services. You can request deletion of your data at any time by contacting
              us or deleting your account through the settings page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">8. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes
              by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-text-primary mb-4">9. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:{" "}
              <a href="mailto:privacy@sparkfluence.com" className="text-primary hover:underline">
                privacy@sparkfluence.com
              </a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-default mt-12 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-text-secondary text-sm">
          <p>© 2026 Sparkfluence. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link to="/privacy" className="hover:text-primary">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-primary">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
