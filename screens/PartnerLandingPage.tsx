import React, { useState } from 'react';
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
  const [formSubmitted, setFormSubmitted] = useState(false);

  const scrollToForm = () => {
    const formSection = document.getElementById('signup-form');
    if (formSection) {
      formSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };
  const benefits = [
    {
      icon: Video,
      title: "TikTok-Style Menu Videos + Instagram Bio Link",
      description: "Showcase your dishes with engaging vertical videos that capture attention and drive orders. Share your special menu link on Instagram bio (like Linktree) to drive traffic directly to your video menu"
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics Dashboard",
      description: "Track video plays, order clicks, likes, saves, and shares in real-time. See peak hours, top dishes, and customer engagement with detailed metrics. Export reports in CSV, Excel, or PDF"
    },
    {
      icon: QrCode,
      title: "QR Code + Direct Checkout Integration",
      description: "Customers scan QR codes to browse your menu instantly. Integrate with Square, Stripe, or any checkout platform - add 'Order Now' buttons that link directly to your existing ordering system. No commission fees!"
    },
    {
      icon: TrendingUp,
      title: "Public View Counter & Social Proof",
      description: "Show view counts on your dishes to build trust and social proof. Customers see how popular each dish is, driving more orders to your best sellers"
    },
    {
      icon: Search,
      title: "Smart Discovery (Sunshine Coast)",
      description: "Currently live in Sunshine Coast region - customers find you through intelligent 5km location search. Expanding to Gold Coast, Brisbane & more soon!"
    },
    {
      icon: Download,
      title: "Import from Uber & Platforms",
      description: "Import your existing menu from Uber Eats, DoorDash, and other platforms in seconds - no manual entry needed"
    }
  ];

  const features = [
    "Upload unlimited menu videos",
    "Import menu from Uber Eats & platforms",
    "Square/Stripe checkout integration",
    "Order Now buttons (no commission!)",
    "Public view counter & social proof",
    "Advanced analytics dashboard",
    "Real-time metrics & reports",
    "Custom QR codes for each location",
    "Customer engagement tracking",
    "Featured dish promotions",
    "Category management",
    "Photo & video support",
    "Mobile-optimized experience"
  ];

  const stats = [
    { number: "100%", label: "Video Menus" },
    { number: "5km", label: "Smart Discovery" },
    { number: "Beta", label: "Early Access" },
    { number: "65%", label: "Decision Rate" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/page-become-partner.jpg)' }}
        />
        <div className="absolute inset-0 bg-black/60" />
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
              Join Australian restaurants using TikTok-style video menus.
            </p>
            <div className="mb-8">
              <p className="text-yellow-300 text-xl font-black mb-2 animate-pulse">
                🔥 Only 10 FREE Beta Spots Left
              </p>
              <p className="text-white/80 text-sm">
                30-day trial • No credit card required • Smart location discovery
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

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black text-zinc-900 mb-4">
              How MenuLove Works
            </h2>
            <p className="text-xl text-zinc-600 max-w-2xl mx-auto">
              Transform your restaurant's menu into engaging video content in 3 simple steps
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Demo Video Side */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <video
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/video%20backstreet%20cafe.mp4"
                className="w-full h-[500px] object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            </div>

            {/* Steps Side */}
            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="flex-shrink-0 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-black text-xl">
                  1
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-zinc-900 mb-2">
                    Create Your Video Menu
                  </h3>
                  <p className="text-zinc-600 leading-relaxed">
                    Upload short videos of your best dishes. Show the sizzle, the presentation, the experience. No professional equipment needed.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex-shrink-0 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-black text-xl">
                  2
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-zinc-900 mb-2">
                    Get Discovered Locally
                  </h3>
                  <p className="text-zinc-600 leading-relaxed">
                    Customers within 5km find you through our location-based search. Your videos appear in their feed like TikTok.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex-shrink-0 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-black text-xl">
                  3
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-zinc-900 mb-2">
                    Watch Orders Increase
                  </h3>
                  <p className="text-zinc-600 leading-relaxed">
                    Video menus increase order value by 65%. Customers see your food in action and make faster, bigger decisions.
                  </p>
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={scrollToForm}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg rounded-xl transition-all transform hover:scale-105 shadow-lg"
                >
                  Start Your Free Trial
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Restaurant Showcase Section */}
      <section className="py-20 bg-gradient-to-br from-zinc-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl sm:text-5xl font-black text-zinc-900 mb-6">
                Video Menus for Australian Restaurants
              </h2>
              <p className="text-xl text-zinc-600 mb-8 leading-relaxed">
                From cozy cafes to fine dining, MenuLove helps restaurants across Australia showcase their best dishes with engaging video content. Smart discovery currently live in Sunshine Coast, expanding soon.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="text-white" size={20} />
                  </div>
                  <span className="text-lg font-semibold text-zinc-900">No setup fees or hidden costs</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="text-white" size={20} />
                  </div>
                  <span className="text-lg font-semibold text-zinc-900">30-day free trial included</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="text-white" size={20} />
                  </div>
                  <span className="text-lg font-semibold text-zinc-900">Cancel anytime, no questions asked</span>
                </div>
              </div>
            </div>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/img_coffeeshop.jpg"
                alt="Restaurant using MenuLove"
                className="w-full h-[500px] object-cover object-left-center"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Signup Form Section */}
      <div id="signup-form" className="bg-white py-16">
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
              {!formSubmitted ? (
                <>
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
                    setFormSubmitted(true);
                    setTimeout(() => {
                      window.location.href = '/partner';
                    }, 2000);
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
              </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="text-green-600" size={48} />
                  </div>
                  <h3 className="text-2xl font-black text-zinc-900 mb-3">Thank You!</h3>
                  <p className="text-zinc-600 mb-6 leading-relaxed">
                    Your information has been saved.<br />
                    Redirecting you to complete your registration...
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              )}
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
              <p className="text-white/80 text-sm mb-6">30-day trial • No credit card required • Smart location discovery</p>
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
      <div className="relative bg-gradient-to-br from-orange-500 to-amber-500 py-20 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/img_Why.jpg)' }}
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center p-12 sm:p-16">
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
            30-day trial • No credit card required • Smart location discovery
          </p>
          <p className="mt-6 text-white/80">
            Questions? Email us at <a href="mailto:contact@menulove.com.au" className="underline font-bold hover:text-yellow-300 transition-colors">contact@menulove.com.au</a>
          </p>
        </div>
      </div>

      {/* Partner Logos Section */}
      <div className="bg-white py-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-zinc-500 text-sm font-semibold uppercase tracking-wider mb-2">
              Trusted by Local Restaurants
            </p>
            <h3 className="text-2xl font-black text-zinc-900">
              Join Australian Restaurants Using Video Menus
            </h3>
            <p className="text-zinc-600 text-sm mt-2">
              Smart Discovery currently in Sunshine Coast • Video menus available Australia-wide
            </p>
          </div>
          
          {/* Desktop: Static logos */}
          <div className="hidden lg:block">
            <div className="flex gap-12 items-center justify-center">
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/bkstreet.png" 
                alt="Backstreet Cafe" 
                className="h-16 w-auto grayscale hover:grayscale-0 transition-all duration-300 opacity-60 hover:opacity-100"
              />
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/brazzos.png" 
                alt="Brazzos Smokehouse" 
                className="h-16 w-auto grayscale hover:grayscale-0 transition-all duration-300 opacity-60 hover:opacity-100"
              />
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/decision.png" 
                alt="Decision" 
                className="h-16 w-auto grayscale hover:grayscale-0 transition-all duration-300 opacity-60 hover:opacity-100"
              />
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/flume.png" 
                alt="Flume by the River" 
                className="h-16 w-auto grayscale hover:grayscale-0 transition-all duration-300 opacity-60 hover:opacity-100"
              />
            </div>
          </div>

          {/* Mobile: Infinite slider */}
          <div className="lg:hidden relative overflow-hidden">
            <div className="flex gap-8 items-center animate-infinite-scroll">
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/bkstreet.png" 
                alt="Backstreet Cafe" 
                className="h-12 w-auto grayscale opacity-60 flex-shrink-0"
              />
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/brazzos.png" 
                alt="Brazzos Smokehouse" 
                className="h-12 w-auto grayscale opacity-60 flex-shrink-0"
              />
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/decision.png" 
                alt="Decision" 
                className="h-12 w-auto grayscale opacity-60 flex-shrink-0"
              />
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/flume.png" 
                alt="Flume by the River" 
                className="h-12 w-auto grayscale opacity-60 flex-shrink-0"
              />
              {/* Duplicate for infinite effect */}
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/bkstreet.png" 
                alt="Backstreet Cafe" 
                className="h-12 w-auto grayscale opacity-60 flex-shrink-0"
              />
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/brazzos.png" 
                alt="Brazzos Smokehouse" 
                className="h-12 w-auto grayscale opacity-60 flex-shrink-0"
              />
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/decision.png" 
                alt="Decision" 
                className="h-12 w-auto grayscale opacity-60 flex-shrink-0"
              />
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/flume.png" 
                alt="Flume by the River" 
                className="h-12 w-auto grayscale opacity-60 flex-shrink-0"
              />
            </div>
          </div>
          
          <p className="text-center text-zinc-500 text-sm mt-8">
            And many more joining soon...
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-zinc-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* MenuLove Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <img 
              src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/icon.png" 
              alt="MenuLove" 
              className="w-10 h-10"
            />
            <span className="text-white font-black text-2xl">MenuLove</span>
          </div>

          <div className="text-center mb-6">
            <div className="max-w-3xl mx-auto">
              <p className="text-zinc-500 text-sm leading-relaxed mb-4">
                <span className="text-orange-500 font-bold">Beta Version:</span> MenuLove is currently in beta testing. 
                We're working hard to deliver the best experience for Australian restaurants. 
                Your feedback helps us improve and build the perfect platform for showcasing your culinary creations. 
                Join us in revolutionizing how restaurants connect with customers through video menus.
              </p>
            </div>
          </div>
          <div className="text-center pt-6 border-t border-zinc-800">
            <p className="text-zinc-400 text-sm mb-2">
              MenuLove - Video Menus & Smart Discovery
            </p>
            <p className="text-zinc-500 text-sm mb-1">
              Built with <span className="text-orange-500">🧡</span> in Australia | <a href="mailto:contact@menulove.com.au" className="text-orange-500 hover:text-orange-400 transition-colors">contact@menulove.com.au</a>
            </p>
            <p className="text-zinc-500 text-sm">
              All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerLandingPage;
