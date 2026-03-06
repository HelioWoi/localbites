import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';

const TermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Banner */}
      <div className="relative h-[40vh] bg-gradient-to-br from-orange-500 to-amber-500 overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors mb-6 w-fit"
          >
            <ArrowLeft size={20} />
            <span className="font-semibold">Back to Home</span>
          </a>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <FileText className="text-white" size={32} />
            </div>
            <h1 className="text-5xl sm:text-6xl font-black text-white">
              Terms of Service
            </h1>
          </div>
          <p className="text-xl text-white/90 max-w-2xl">
            Last updated: March 6, 2026
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="prose max-w-none">
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-8 mb-8">
            <p className="text-zinc-700 text-lg leading-relaxed">
              Welcome to MenuLove. By accessing or using our video menu platform and services, you agree to be bound by these Terms of Service. Please read them carefully.
            </p>
          </div>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">1. Acceptance of Terms</h2>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
              <p className="text-zinc-700 mb-4">
                By creating an account, accessing, or using MenuLove services, you agree to:
              </p>
              <ul className="space-y-2 text-zinc-700">
                <li>• Comply with these Terms of Service</li>
                <li>• Comply with all applicable laws and regulations</li>
                <li>• Be at least 18 years old or have parental consent</li>
                <li>• Provide accurate and complete information</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">2. Service Description</h2>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
              <p className="text-zinc-700 mb-4">MenuLove provides:</p>
              <ul className="space-y-2 text-zinc-700">
                <li>• <strong className="text-zinc-900">Video Menu Platform:</strong> Tools to create and manage short-form vertical video menus</li>
                <li>• <strong className="text-zinc-900">QR Code Generation:</strong> Custom QR codes for menu access</li>
                <li>• <strong className="text-zinc-900">Analytics:</strong> Insights into menu views, engagement, and customer behavior</li>
                <li>• <strong className="text-zinc-900">Integrations:</strong> Connections with ordering and payment systems</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">3. Third-Party Ordering and Payments</h2>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
              <p className="text-zinc-700 mb-4">
                <strong className="text-zinc-900">MenuLove does not process food orders, payments, or transactions between customers and restaurants.</strong>
              </p>
              <ul className="space-y-2 text-zinc-700">
                <li>• Any purchase, order, or payment is handled directly by the restaurant or through third-party services such as Square, Stripe, or other systems chosen by the venue</li>
                <li>• MenuLove is not responsible for pricing, availability, food quality, delivery, refunds, or customer service related to any order</li>
                <li>• MenuLove does not sell food or process transactions</li>
                <li>• All disputes regarding orders must be resolved directly with the restaurant</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">4. Restaurant Content Responsibility</h2>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
              <p className="text-zinc-700 mb-4">
                Restaurants are solely responsible for the accuracy of their menus, pricing, descriptions, and availability of items displayed on the platform.
              </p>
              <ul className="space-y-2 text-zinc-700">
                <li>• Menu prices and availability may change without notice</li>
                <li>• Information displayed may be outdated or inaccurate</li>
                <li>• MenuLove is not responsible for menu content accuracy</li>
                <li>• Customers should verify details directly with the restaurant</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">5. QR Code Usage</h2>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
              <p className="text-zinc-700 mb-4">
                QR codes generated through MenuLove may be used by the venue for promotional and menu access purposes.
              </p>
              <ul className="space-y-2 text-zinc-700">
                <li>• MenuLove is not responsible for how third parties distribute or display QR codes</li>
                <li>• Venues are responsible for proper placement and usage of QR codes</li>
                <li>• QR codes remain property of MenuLove but are licensed for venue use</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">6. Account Registration</h2>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
              <h3 className="text-xl font-bold text-orange-600 mb-3">6.1 Account Creation</h3>
              <ul className="space-y-2 text-zinc-700 mb-6">
                <li>• You must provide accurate business and contact information</li>
                <li>• You are responsible for maintaining account security</li>
                <li>• You must notify us immediately of unauthorized access</li>
                <li>• One account per business entity</li>
              </ul>

              <h3 className="text-xl font-bold text-orange-600 mb-3">6.2 Account Termination</h3>
              <ul className="space-y-2 text-zinc-700">
                <li>• You may cancel your account at any time</li>
                <li>• We may suspend or terminate accounts for violations</li>
                <li>• Upon termination, access to services will cease</li>
                <li>• Data retention follows our Privacy Policy</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">7. Subscription and Payments</h2>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
              <h3 className="text-xl font-bold text-orange-600 mb-3">7.1 Free Trial</h3>
              <p className="text-zinc-700 mb-4">
                New accounts receive a 30-day free trial. No credit card required. Trial automatically ends unless you subscribe.
              </p>

              <h3 className="text-xl font-bold text-orange-600 mb-3">7.2 Paid Subscriptions</h3>
              <ul className="space-y-2 text-zinc-700 mb-6">
                <li>• Subscription fees are billed monthly or annually</li>
                <li>• Prices are in AUD and subject to change with notice</li>
                <li>• Automatic renewal unless cancelled</li>
                <li>• Refunds subject to our refund policy</li>
              </ul>

              <h3 className="text-xl font-bold text-orange-600 mb-3">7.3 Payment Processing</h3>
              <p className="text-zinc-700">
                Payments are processed securely via Stripe. We do not store credit card information. By subscribing, you authorize recurring charges.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">8. Content and Intellectual Property</h2>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
              <h3 className="text-xl font-bold text-orange-600 mb-3">8.1 Your Content</h3>
              <ul className="space-y-2 text-zinc-700 mb-6">
                <li>• You retain ownership of content you upload</li>
                <li>• You grant us license to display, store, and process your content</li>
                <li>• You are responsible for content legality and accuracy</li>
                <li>• You must have rights to all uploaded content</li>
              </ul>

              <h3 className="text-xl font-bold text-orange-600 mb-3">8.2 Prohibited Content</h3>
              <ul className="space-y-2 text-zinc-700 mb-6">
                <li>• Illegal, harmful, or offensive content</li>
                <li>• Copyrighted material without permission</li>
                <li>• Misleading or fraudulent information</li>
                <li>• Spam or malicious code</li>
              </ul>

              <h3 className="text-xl font-bold text-orange-600 mb-3">8.3 Our Intellectual Property</h3>
              <p className="text-zinc-700">
                MenuLove platform, logo, design, and features are our property. You may not copy, modify, or distribute our intellectual property without permission.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">9. Acceptable Use</h2>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
              <p className="text-zinc-700 mb-4">You agree NOT to:</p>
              <ul className="space-y-2 text-zinc-700">
                <li>• Violate laws or regulations</li>
                <li>• Infringe on others' rights</li>
                <li>• Attempt to hack or compromise security</li>
                <li>• Use automated systems to access services</li>
                <li>• Resell or redistribute our services</li>
                <li>• Interfere with other users' access</li>
                <li>• Impersonate others or provide false information</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">10. Service Availability and Beta Features</h2>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
              <p className="text-zinc-700 mb-4">
                We strive for 99.9% uptime but cannot guarantee uninterrupted service. We reserve the right to:
              </p>
              <ul className="space-y-2 text-zinc-700">
                <li>• Perform maintenance and updates</li>
                <li>• Modify or discontinue features</li>
                <li>• Suspend service for technical issues</li>
                <li>• Change pricing with 30 days notice</li>
              </ul>
              <p className="text-zinc-700 mt-4">
                <strong className="text-zinc-900">Beta Features:</strong> Some features may be in beta and subject to change or temporary interruption. Beta features are provided "as is" without warranty.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">11. No Guarantee of Business Results</h2>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
              <p className="text-zinc-700">
                <strong className="text-zinc-900">MenuLove does not guarantee increased sales, customer engagement, or business results.</strong> Success depends on many factors including restaurant quality, marketing, location, and customer service. Any testimonials or case studies represent individual results and are not typical.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">12. Limitation of Liability</h2>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
              <p className="text-zinc-700 mb-4">
                To the maximum extent permitted by law:
              </p>
              <ul className="space-y-2 text-zinc-700">
                <li>• Services provided "as is" without warranties</li>
                <li>• We are not liable for indirect or consequential damages</li>
                <li>• Total liability limited to fees paid in last 12 months</li>
                <li>• We are not responsible for third-party services or content</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">13. Indemnification</h2>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
              <p className="text-zinc-700">
                You agree to indemnify and hold MenuLove harmless from claims, damages, and expenses arising from your use of services, content you upload, or violation of these terms.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">14. Dispute Resolution</h2>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
              <h3 className="text-xl font-bold text-orange-600 mb-3">14.1 Governing Law</h3>
              <p className="text-zinc-700 mb-4">
                These terms are governed by the laws of Queensland, Australia.
              </p>

              <h3 className="text-xl font-bold text-orange-600 mb-3">14.2 Dispute Process</h3>
              <ul className="space-y-2 text-zinc-700">
                <li>• Contact us first to resolve informally</li>
                <li>• Mediation before legal action</li>
                <li>• Jurisdiction in Queensland courts</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">15. Changes to Terms</h2>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
              <p className="text-zinc-700">
                We may update these Terms of Service. Significant changes will be notified via email or platform notification. Continued use after changes constitutes acceptance.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">16. Contact Information</h2>
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-8">
              <p className="text-zinc-700 mb-6">
                Questions about these Terms of Service? Contact us:
              </p>
              <div className="space-y-3 text-zinc-700">
                <p><strong className="text-zinc-900">Email:</strong> <a href="mailto:contact@menulove.com.au" className="text-orange-600 hover:text-orange-700">contact@menulove.com.au</a></p>
                <p><strong className="text-zinc-900">Address:</strong> Australia</p>
              </div>
            </div>
          </section>

          {/* Footer Note */}
          <div className="mt-16 pt-8 border-t border-zinc-200">
            <p className="text-zinc-500 text-sm text-center">
              These Terms of Service are effective as of March 6, 2026 and apply to all users of MenuLove services.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-zinc-50 border-t border-zinc-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/icon.png" 
                alt="MenuLove" 
                className="w-8 h-8"
              />
              <span className="text-zinc-900 font-black text-xl">MenuLove</span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6">
              <a href="/contact" className="text-zinc-600 hover:text-orange-500 transition-colors font-medium">
                Contact
              </a>
              <a href="/faq" className="text-zinc-600 hover:text-orange-500 transition-colors font-medium">
                FAQ
              </a>
              <a href="/privacy-policy" className="text-zinc-600 hover:text-orange-500 transition-colors font-medium">
                Privacy
              </a>
              <a href="/terms-of-service" className="text-zinc-600 hover:text-orange-500 transition-colors font-medium">
                Terms
              </a>
            </div>

            {/* Copyright */}
            <p className="text-zinc-500 text-sm">
              © 2026 MenuLove. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TermsOfServicePage;
