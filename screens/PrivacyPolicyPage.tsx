import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';

const PrivacyPolicyPage: React.FC = () => {
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
              <Shield className="text-white" size={32} />
            </div>
            <h1 className="text-5xl sm:text-6xl font-black text-white">
              Privacy Policy
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
            <p className="text-zinc-700 text-lg leading-relaxed mb-4">
              MenuLove ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our video menu platform and services.
            </p>
            <p className="text-zinc-700 text-lg leading-relaxed">
              <strong className="text-zinc-900">This Privacy Policy applies to both restaurants using the MenuLove platform and visitors accessing video menus through links or QR codes.</strong>
            </p>
          </div>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">1. Information We Collect</h2>
            
            <h3 className="text-xl font-bold text-orange-600 mb-3">1.1 Information You Provide</h3>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6 mb-6">
              <ul className="space-y-2 text-zinc-700">
                <li>• <strong className="text-zinc-900">Account Information:</strong> Name, email address, phone number, business details</li>
                <li>• <strong className="text-zinc-900">Payment Information:</strong> Credit card details, billing address (processed securely via Stripe)</li>
                <li>• <strong className="text-zinc-900">Content:</strong> Menu items, photos, videos, descriptions you upload</li>
                <li>• <strong className="text-zinc-900">Communications:</strong> Messages, feedback, and support requests</li>
              </ul>
            </div>

            <h3 className="text-xl font-bold text-orange-600 mb-3">1.2 Automatically Collected Information</h3>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6 mb-6">
              <ul className="space-y-2 text-zinc-700">
                <li>• <strong className="text-zinc-900">Usage Data:</strong> Pages viewed, features used, time spent on platform</li>
                <li>• <strong className="text-zinc-900">Device Information:</strong> IP address, browser type, device type, operating system</li>
                <li>• <strong className="text-zinc-900">Location Data:</strong> Approximate location based on IP address</li>
                <li>• <strong className="text-zinc-900">Cookies:</strong> Session cookies, preference cookies, analytics cookies</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">2. How We Use Your Information</h2>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
              <ul className="space-y-3 text-zinc-700">
                <li>• <strong className="text-zinc-900">Provide Services:</strong> Create and manage video menus and platform features for restaurants and visitors accessing menus through QR codes or links</li>
                <li>• <strong className="text-zinc-900">Improve Platform:</strong> Analyze usage patterns, develop new features</li>
                <li>• <strong className="text-zinc-900">Communications:</strong> Send updates, marketing materials, support responses</li>
                <li>• <strong className="text-zinc-900">Security:</strong> Detect fraud, prevent abuse, ensure platform security</li>
                <li>• <strong className="text-zinc-900">Legal Compliance:</strong> Comply with laws, regulations, and legal processes</li>
              </ul>
              <p className="text-zinc-700 mt-4">
                <strong className="text-zinc-900">Restaurants using MenuLove are solely responsible for the accuracy of their menus, pricing, descriptions, and availability of items displayed on the platform.</strong>
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">3. Information Sharing</h2>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
              <p className="text-zinc-700 mb-4">
                <strong className="text-zinc-900">MenuLove provides a platform for restaurants to display video menus and does not process food orders, payments, or transactions between customers and venues.</strong>
              </p>
              <p className="text-zinc-700 mb-4">We do not sell your personal information. We may share information with:</p>
              <ul className="space-y-3 text-zinc-700">
                <li>• <strong className="text-zinc-900">Service Providers:</strong> Stripe (payments), Supabase (hosting), Google (analytics)</li>
                <li>• <strong className="text-zinc-900">Business Partners:</strong> With your consent for specific integrations</li>
                <li>• <strong className="text-zinc-900">Legal Requirements:</strong> When required by law or to protect rights</li>
                <li>• <strong className="text-zinc-900">Business Transfers:</strong> In case of merger, acquisition, or sale</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">4. Data Security</h2>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
              <p className="text-zinc-700 mb-4">We implement industry-standard security measures:</p>
              <ul className="space-y-2 text-zinc-700">
                <li>• SSL/TLS encryption for data transmission</li>
                <li>• Encrypted storage of sensitive data</li>
                <li>• Regular security audits and updates</li>
                <li>• Access controls and authentication</li>
                <li>• Secure payment processing via PCI-compliant providers</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">5. Your Rights</h2>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
              <p className="text-zinc-700 mb-4">You have the right to:</p>
              <ul className="space-y-2 text-zinc-700">
                <li>• <strong className="text-zinc-900">Access:</strong> Request a copy of your personal data</li>
                <li>• <strong className="text-zinc-900">Correction:</strong> Update or correct inaccurate information</li>
                <li>• <strong className="text-zinc-900">Deletion:</strong> Request deletion of your data (subject to legal requirements)</li>
                <li>• <strong className="text-zinc-900">Opt-Out:</strong> Unsubscribe from marketing communications</li>
                <li>• <strong className="text-zinc-900">Data Portability:</strong> Receive your data in a portable format</li>
              </ul>
              <p className="text-zinc-700 mt-4">
                We handle personal information in accordance with the Australian Privacy Act 1988 where applicable.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">6. Cookies and Tracking</h2>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
              <p className="text-zinc-700 mb-4">We use cookies and similar technologies for:</p>
              <ul className="space-y-2 text-zinc-700">
                <li>• Essential functionality (login sessions, preferences)</li>
                <li>• Analytics (Google Analytics, usage patterns)</li>
                <li>• Marketing (retargeting, conversion tracking)</li>
              </ul>
              <p className="text-zinc-700 mt-4">You can control cookies through your browser settings.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">7. Children's Privacy</h2>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
              <p className="text-zinc-700">
                MenuLove is not intended for children under 18. We do not knowingly collect information from children. If you believe we have collected information from a child, please contact us immediately.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">8. International Data Transfers</h2>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
              <p className="text-zinc-700">
                Your information may be transferred to and processed in countries other than Australia. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">9. Beta Platform Notice</h2>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
              <p className="text-zinc-700">
                MenuLove is currently in a beta stage. Some features may change, be updated, or experience temporary interruptions as we continue improving the platform.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">10. Changes to This Policy</h2>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6">
              <p className="text-zinc-700">
                We may update this Privacy Policy from time to time. We will notify you of significant changes via email or platform notification. Continued use of our services after changes constitutes acceptance of the updated policy.
              </p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-black text-zinc-900 mb-4">11. Contact Us</h2>
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-8">
              <p className="text-zinc-700 mb-6">
                If you have questions about this Privacy Policy or our data practices, please contact us:
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
              This Privacy Policy is effective as of March 6, 2026 and applies to all users of MenuLove services.
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

export default PrivacyPolicyPage;
