import React from 'react';

const LegalFooter: React.FC = () => {
  return (
    <footer className="bg-white border-t border-zinc-200 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center space-y-3">
          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <a
              href="/legal/privacy-policy.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-600 hover:text-orange-500 transition-colors"
            >
              Privacy Policy
            </a>
            <span className="text-zinc-300">|</span>
            <a
              href="/legal/terms-of-service.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-600 hover:text-orange-500 transition-colors"
            >
              Terms of Service
            </a>
            <span className="text-zinc-300">|</span>
            <a
              href="/legal/content-moderation.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-600 hover:text-orange-500 transition-colors"
            >
              Content Policy
            </a>
          </div>

          {/* Copyright */}
          <div className="text-xs text-zinc-500 text-center">
            © 2026 LocalBites Pty Ltd. ABN: 33 234 268 637. All rights reserved.
          </div>

          {/* Contact */}
          <div className="text-xs text-zinc-400 text-center">
            <a
              href="mailto:contact@localbites.com.au"
              className="hover:text-orange-500 transition-colors"
            >
              contact@localbites.com.au
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LegalFooter;
