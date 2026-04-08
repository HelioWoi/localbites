import React from 'react';
import { ArrowRight, CheckCircle2, Link2, BadgeDollarSign, Users } from 'lucide-react';

const AffiliateProgramPage: React.FC = () => {
  const steps = [
    {
      icon: Link2,
      title: 'Get your affiliate link',
      description: 'Create your affiliate account and receive a unique MenuLove referral link to share.'
    },
    {
      icon: Users,
      title: 'Share with hospitality owners',
      description: 'Send your link to restaurants, cafés, food trucks, and hospitality operators in your network.'
    },
    {
      icon: BadgeDollarSign,
      title: 'Earn commission on eligible referrals',
      description: 'When a referred partner starts with MenuLove and becomes eligible, you receive commission.'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
      <section className="bg-white border-b border-zinc-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <a
            href="/"
            className="inline-flex items-center gap-3 hover:opacity-80 transition-opacity mb-10"
          >
            <img
              src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/logo%20hor%20slogan.png"
              alt="MenuLove"
              className="h-10 sm:h-12 w-auto"
            />
          </a>

          <div className="rounded-3xl bg-white border border-zinc-200 shadow-xl p-8 sm:p-12">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-4 py-2 mb-5">
              <CheckCircle2 size={16} />
              Affiliate Programme
            </p>
            <h1 className="text-4xl sm:text-5xl font-black text-zinc-900 leading-tight mb-5">
              Grow with MenuLove.
              <br />
              <span className="text-orange-600">Share your link, earn commission.</span>
            </h1>
            <p className="text-zinc-600 text-base sm:text-lg max-w-3xl leading-relaxed mb-8">
              Partner with MenuLove and help hospitality venues launch TikTok-style video menus.
              We provide your referral link and tracking. You focus on introductions and growth.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="/affiliate"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-orange-500 text-white font-bold text-base rounded-2xl hover:bg-orange-600 transition-all"
              >
                Join as an Affiliate
                <ArrowRight size={18} />
              </a>
              <a
                href="/become-a-partner"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-zinc-100 text-zinc-800 font-bold text-base rounded-2xl hover:bg-zinc-200 transition-all"
              >
                Restaurant Owner? Start Here
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center mb-4">
                    <Icon className="text-white" size={22} />
                  </div>
                  <h2 className="text-xl font-black text-zinc-900 mb-2">{step.title}</h2>
                  <p className="text-zinc-600 text-sm leading-relaxed">{step.description}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-10 rounded-2xl bg-zinc-900 text-white p-6 sm:p-8">
            <h3 className="text-2xl font-black mb-3">Why creators and consultants choose MenuLove</h3>
            <ul className="space-y-2 text-white/85 text-sm sm:text-base">
              <li>• Clear referral attribution via affiliate links</li>
              <li>• Product built for real hospitality workflows</li>
              <li>• Trusted by Australian restaurants, cafés, and food trucks</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AffiliateProgramPage;
