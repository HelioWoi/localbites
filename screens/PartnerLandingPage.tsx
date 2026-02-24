import React from 'react';
import { 
  Smartphone, 
  TrendingUp, 
  Users, 
  Video, 
  QrCode, 
  BarChart3,
  Star,
  CheckCircle2,
  ArrowRight,
  Zap,
  Globe,
  Download,
  MapPin,
  Search,
  Sparkles
} from 'lucide-react';

const PartnerLandingPage: React.FC = () => {
  const scrollToForm = () => {
    const formSection = document.getElementById('signup-form');
    if (formSection) {
      formSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  const benefits = [
    {
      icon: Video,
      title: "TikTok-Style Menu Videos",
      description: "Showcase your dishes with engaging vertical videos that capture attention and drive orders"
    },
    {
      icon: Search,
      title: "Smart Discovery (5km Radius)",
      description: "Customers find you automatically through intelligent location-based search - get discovered by hungry people nearby"
    },
    {
      icon: Download,
      title: "Import from Uber & Platforms",
      description: "Import your existing menu from Uber Eats, DoorDash, and other platforms in seconds - no manual entry needed"
    },
    {
      icon: QrCode,
      title: "Smart QR Code System + Promo Banners",
      description: "Customers scan and browse your menu instantly - add promotional banners to boost special offers and drive more orders"
    },
    {
      icon: BarChart3,
      title: "Real-Time Analytics",
      description: "Track views, engagement, and customer behavior to optimize your menu"
    },
    {
      icon: Zap,
      title: "Instant Menu Updates",
      description: "Update dishes, prices, and availability in real-time from your dashboard"
    }
  ];

  const features = [
    "Upload unlimited menu videos",
    "Import menu from Uber Eats & platforms",
    "Smart 5km radius discovery",
    "Custom QR codes for each location",
    "Advanced analytics dashboard",
    "Customer engagement tracking",
    "Featured dish promotions",
    "Category management",
    "Photo & video support",
    "Mobile-optimized experience"
  ];

  const stats = [
    { number: "50+", label: "Partner Restaurants" },
    { number: "10K+", label: "Monthly Views" },
    { number: "Beta", label: "Early Access" },
    { number: "65%", label: "Decision Rate" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 pb-32">
          {/* Logo */}
          <a 
            href="https://menulove.com.au" 
            className="absolute top-6 left-4 sm:left-6 lg:left-8 flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img 
              src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/icon.png" 
              alt="MenuLove" 
              className="w-7 h-7 sm:w-8 sm:h-8"
            />
            <span className="text-white font-black text-xl sm:text-2xl">MenuLove</span>
          </a>
          
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
              Turn Your Menu Into
              <br />
              <span className="text-yellow-300">Viral Content</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-2xl mx-auto font-medium leading-relaxed">
              Join MenuLove and showcase your dishes with TikTok-style videos. 
              Get discovered by customers within 5km through smart location search.
            </p>
            <div className="mb-8">
              <p className="text-yellow-300 text-xl font-black mb-2 animate-pulse">
                🔥 Only 10 FREE Beta Spots Left
              </p>
              <p className="text-white/80 text-sm">
                30-day trial • No credit card required • Sunshine Coast only
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={scrollToForm}
                className="group px-8 py-4 bg-white text-orange-600 font-black text-lg rounded-2xl hover:bg-yellow-300 hover:text-orange-700 transition-all transform hover:scale-105 shadow-2xl flex items-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={24} />
              </button>
              <a
                href="https://menulove.com.au"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-bold text-lg rounded-2xl hover:bg-white/20 transition-all border-2 border-white/30"
              >
                See Live Example
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 mb-16 relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl p-8 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl sm:text-5xl font-black text-orange-600 mb-2">
                {stat.number}
              </div>
              <div className="text-zinc-600 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Signup Form Section */}
      <div id="signup-form" className="bg-gradient-to-br from-zinc-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left: Benefits */}
            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-zinc-900 mb-6">
                Why Choose MenuLove?
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Video className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-zinc-900 mb-1">TikTok-Style Videos</h3>
                    <p className="text-zinc-600">Showcase dishes with engaging vertical videos</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Search className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-zinc-900 mb-1">5km Smart Discovery</h3>
                    <p className="text-zinc-600">Customers find you automatically through location search</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Download className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-zinc-900 mb-1">Import from Uber & Platforms</h3>
                    <p className="text-zinc-600">Import existing menu in seconds - no manual entry</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="text-white" size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-zinc-900 mb-1">Real-Time Analytics</h3>
                    <p className="text-zinc-600">Track views, engagement, and customer behavior</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Signup Form */}
            <div className="bg-white rounded-3xl shadow-2xl p-8 border border-zinc-100">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-black text-zinc-900 mb-2">Create your account</h3>
                <p className="text-zinc-600">Start your 30-day free trial</p>
              </div>
              <form className="space-y-4" onSubmit={(e) => { 
                e.preventDefault(); 
                const formData = new FormData(e.currentTarget);
                const signupData = {
                  restaurantName: formData.get('restaurantName'),
                  email: formData.get('email'),
                  phone: formData.get('phone'),
                  address: formData.get('address')
                };
                sessionStorage.setItem('partnerSignupStep1', JSON.stringify(signupData));
                window.location.href = '/partner';
              }}>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2">Restaurant name</label>
                  <input
                    type="text"
                    name="restaurantName"
                    placeholder="Your restaurant name"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="you@restaurant.com"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="+61 400 000 000"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2">Address</label>
                  <input
                    type="text"
                    name="address"
                    placeholder="Your address"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-lg rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
                >
                  Start free trial
                  <ArrowRight size={20} />
                </button>
                <p className="text-center text-sm text-zinc-500">
                  Already have an account? <a href="/partner" className="text-orange-600 font-bold hover:underline">Sign in</a>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-black text-zinc-900 mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-xl text-zinc-600 max-w-2xl mx-auto">
            Powerful features designed to help restaurants attract more customers and increase sales
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div 
                key={index}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 border border-zinc-100"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center mb-5">
                  <Icon className="text-white" size={28} />
                </div>
                <h3 className="text-lg font-black text-zinc-900 mb-3">
                  {benefit.title}
                </h3>
                <p className="text-zinc-600 leading-relaxed text-sm">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Features List */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
                All Features Included
              </h2>
              <p className="text-lg text-zinc-300 mb-8 leading-relaxed">
                Get access to our complete platform with no hidden fees or limitations
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="text-green-400 flex-shrink-0 mt-1" size={20} />
                    <span className="text-white font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-3xl p-10 text-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-yellow-300 text-orange-900 px-6 py-2 font-black text-sm rounded-bl-2xl">
                BETA SPECIAL
              </div>
              <div className="text-white/90 text-sm font-bold uppercase tracking-wider mb-3 mt-6">
                Limited Beta Access
              </div>
              <div className="mb-2">
                <p className="text-6xl font-black text-white mb-2">FREE</p>
                <p className="text-yellow-300 text-2xl font-black animate-pulse">Only 10 Spots Left</p>
              </div>
              <p className="text-white/80 text-sm mb-6">30-day trial • No credit card required • Sunshine Coast only</p>
              <ul className="text-left space-y-3 mb-8 text-white">
                <li className="flex items-center gap-3">
                  <Star className="text-yellow-300 flex-shrink-0" size={22} fill="currentColor" />
                  <span className="font-semibold">Unlimited menu videos</span>
                </li>
                <li className="flex items-center gap-3">
                  <Star className="text-yellow-300 flex-shrink-0" size={22} fill="currentColor" />
                  <span className="font-semibold">Import from Uber & platforms</span>
                </li>
                <li className="flex items-center gap-3">
                  <Star className="text-yellow-300 flex-shrink-0" size={20} fill="currentColor" />
                  <span className="font-semibold">5km smart discovery</span>
                </li>
                <li className="flex items-center gap-3">
                  <Star className="text-yellow-300 flex-shrink-0" size={20} fill="currentColor" />
                  <span className="font-semibold">Advanced analytics</span>
                </li>
                <li className="flex items-center gap-3">
                  <Star className="text-yellow-300 flex-shrink-0" size={20} fill="currentColor" />
                  <span className="font-semibold">30-day free trial</span>
                </li>
              </ul>
              <button
                onClick={scrollToForm}
                className="block w-full py-4 bg-white text-orange-600 font-black text-lg rounded-2xl hover:bg-yellow-300 hover:text-orange-700 transition-all transform hover:scale-105 shadow-xl"
              >
                Start Your Free Trial
              </button>
              <p className="mt-4 text-white/80 text-sm font-medium">
                No credit card required • Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-3xl p-12 sm:p-16 text-center shadow-2xl">
          <Sparkles className="mx-auto mb-4 text-yellow-300" size={40} />
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-6 leading-tight">
            Ready to Grow Your Restaurant?
          </h2>
          <p className="text-lg text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
            Be among the first restaurants to revolutionize how customers discover your menu through engaging video content and smart location-based discovery
          </p>
          <button
            onClick={scrollToForm}
            className="inline-flex items-center gap-2 px-10 py-5 bg-white text-orange-600 font-black text-xl rounded-2xl hover:bg-yellow-300 hover:text-orange-700 transition-all transform hover:scale-105 shadow-2xl mb-4"
          >
            Click Here and Start Using
            <ArrowRight size={24} />
          </button>
          <p className="text-yellow-300 text-lg font-black mb-3 animate-pulse">
            🔥 Only 10 FREE Beta Spots Left
          </p>
          <p className="text-white/80 text-sm mb-3">
            30-day trial • No credit card required • Sunshine Coast only
          </p>
          <p className="mt-6 text-white/80">
            Questions? Email us at <a href="mailto:contact@menulove.com.au" className="underline font-bold hover:text-yellow-300 transition-colors">contact@menulove.com.au</a>
          </p>
        </div>
      </div>

      {/* Logo Section */}
      <div className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img 
              src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/icon.png" 
              alt="MenuLove" 
              className="w-12 h-12"
            />
            <span className="text-zinc-900 font-black text-3xl">MenuLove</span>
          </div>
          <p className="text-zinc-600 text-sm">
            Transforming restaurant menus into viral content
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-zinc-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <p className="text-zinc-400 text-base mb-4">
              © 2026 MenuLove Australia. All rights reserved.
            </p>
            <div className="max-w-3xl mx-auto">
              <p className="text-zinc-500 text-sm leading-relaxed">
                <span className="text-orange-500 font-bold">Beta Version:</span> MenuLove is currently in beta testing. 
                We're working hard to deliver the best experience for Australian restaurants. 
                Your feedback helps us improve and build the perfect platform for showcasing your culinary creations. 
                Join us in revolutionizing how restaurants connect with customers through video menus.
              </p>
            </div>
          </div>
          <div className="text-center pt-6 border-t border-zinc-800">
            <p className="text-zinc-500 text-sm">
              Made with ❤️ in Australia | <a href="mailto:contact@menulove.com.au" className="text-orange-500 hover:text-orange-400 transition-colors">contact@menulove.com.au</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerLandingPage;
