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
import LoveBotChat from '../components/LoveBotChat';
import PromoPopup from '../components/PromoPopup';

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
      description: "Showcase your dishes with engaging vertical videos that capture attention and drive orders. Share your special menu link on Instagram bio (like Linktree) to drive traffic directly to your video menu."
    },
    {
      icon: BarChart3,
      title: "Track Performance & Insights",
      description: "Track video plays, order clicks, likes, saves, and shares in real-time. See peak hours, top dishes, and customer engagement with detailed metrics. Export reports in CSV, Excel, or PDF."
    },
    {
      icon: QrCode,
      title: "QR Code + Direct Checkout",
      description: "Customers scan QR codes to browse your menu instantly. Connect your existing checkout (Square, Stripe, Bopple and more). Add 'Order Now' buttons that link directly to your existing ordering system. No commission fees!"
    },
    {
      icon: TrendingUp,
      title: "Public View Counter & Social Proof",
      description: "Show view counts on your dishes to build trust and social proof. Customers see how popular each dish is, driving more orders to your best sellers."
    },
    {
      icon: QrCode,
      title: "QR Code & Shareable Menu Link",
      description: "Generate a custom QR code for your tables and a shareable link for your Instagram bio. Customers browse your video menu instantly, anywhere, anytime."
    },
    {
      icon: Download,
      title: "Import from Uber & Platforms",
      description: "Import your existing menu from Uber Eats, DoorDash, and other platforms in seconds. No manual entry needed."
    }
  ];

  const features = [
    "Upload unlimited menu videos",
    "Import menu from Uber Eats & platforms",
    "Connect your existing checkout (Square, Stripe, Bopple and more)",
    "Order Now buttons (no commission!)",
    "Public view counter & social proof",
    "Track performance & insights",
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
    { number: "#1", label: "Video Menu Platform" },
    { number: "Beta", label: "Early Access" },
    { number: "65%", label: "Decision Rate" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/hero_desktop.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-48">
          {/* Logo */}
          <a 
            href="https://menulove.com.au" 
            className="absolute top-12 left-4 sm:left-6 lg:left-8 flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img 
              src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/icon.png" 
              alt="MenuLove" 
              className="w-7 h-7 sm:w-8 sm:h-8"
            />
            <span className="text-white font-black text-xl sm:text-2xl">MenuLove™</span>
          </a>

          {/* Partner Access Button */}
          <a 
            href="/partner" 
            className="absolute top-12 right-4 sm:right-6 lg:right-8 text-white text-sm font-semibold hover:text-yellow-300 transition-colors"
          >
            Partner Access
          </a>
          
          <div className="text-center mt-16 sm:mt-20">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6 leading-tight">
              <span className="text-white">The </span>
              <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 text-transparent bg-clip-text">TikTok-Style</span>
              <br />
              <span className="text-white">Video Menu </span>
              <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 text-transparent bg-clip-text">for Restaurants</span>
            </h1>
            <p className="text-base sm:text-xl text-white/90 mb-8 max-w-2xl mx-auto font-medium leading-relaxed text-center">
              Show your dishes in short videos so customers stop guessing, decide faster, and are more likely to order your best items.
            </p>
            <div className="mb-8">
              <p className="text-yellow-300 text-xl font-black mb-2 animate-pulse">
                🔥 Only 10 FREE Beta Spots Left
              </p>
              <p className="text-white/80 text-sm">
                30 day trial • No credit card required • No commission fees
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={scrollToForm}
                className="group px-8 py-4 bg-white text-orange-600 font-black text-lg rounded-2xl hover:bg-yellow-300 hover:text-orange-700 transition-all transform hover:scale-105 shadow-2xl flex items-center gap-2"
              >
                Create My Video Menu
                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={24} />
              </button>
              <a
                href="/live-examples"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-bold text-lg rounded-2xl hover:bg-white/20 transition-all border-2 border-white/30"
              >
                See a live example
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
              How MenuLove™ Works
            </h2>
            <p className="text-xl text-zinc-600 max-w-2xl mx-auto">
              The TikTok-style video menu platform built for cafés and restaurants that want to stand out.
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
                    Share It Everywhere
                  </h3>
                  <p className="text-zinc-600 leading-relaxed">
                    Place your QR code on tables, receipts, and windows. Share your menu link on Instagram, WhatsApp, or Google. Customers experience your menu before they even walk in.
                  </p>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex-shrink-0 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-black text-xl">
                  3
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-zinc-900 mb-2">
                    Help Customers Choose Faster
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
                  Create My Video Menu
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
                The Video Menu Built for Australian Hospitality
              </h2>
              <p className="text-xl text-zinc-600 mb-8 leading-relaxed">
                From busy cafés to fine dining, MenuLove™ gives every Australian restaurant a premium video menu experience. No app download required, works on any device, scanned in seconds.
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
                Why Choose MenuLove™?
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
                    <h3 className="font-black text-lg text-zinc-900 mb-1">QR Code & Bio Link</h3>
                    <p className="text-zinc-600">Scan at the table or share your menu link anywhere online</p>
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
                  Create My Video Menu
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

      {/* Video Section - Minimalist */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Title Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-black text-zinc-900 mb-4">
              Your Menu. In Video. Ready to Sell.
            </h2>
            <p className="text-xl text-zinc-600 max-w-2xl mx-auto">
              A smarter video menu for hospitality venues.
            </p>
          </div>

          {/* Video */}
          <div className="flex justify-center mb-8">
            <div className="relative rounded-3xl overflow-hidden w-full max-w-[500px]">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-auto"
              >
                <source src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/final%20video.mp4" type="video/mp4" />
              </video>
            </div>
          </div>

          {/* CTA Button */}
          <div className="flex justify-center">
            <a
              href="/demo/backstreet-cafe/menu"
              className="inline-flex items-center gap-2 px-8 py-4 bg-orange-500 text-white font-bold text-lg rounded-2xl hover:bg-orange-600 transition-all transform hover:scale-105 shadow-lg"
            >
              See a live example →
            </a>
          </div>
        </div>
      </div>

      {/* Food Truck Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-black text-zinc-900 mb-4">
              Perfect for Food Trucks & Market Vendors
            </h2>
            <p className="text-xl text-zinc-600 max-w-3xl mx-auto leading-relaxed">
              Showcase your menu at festivals, markets, and events across Australia. Let customers browse your offerings before they reach your window with a simple QR code scan.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/foodd%20truck.jpg"
                alt="Food truck at outdoor event"
                className="w-full h-[400px] object-cover"
              />
            </div>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/food%20truck%204.jpg"
                alt="Food market vendor"
                className="w-full h-[400px] object-cover"
              />
            </div>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/qr-code%20market.png"
                alt="QR code at market stall"
                className="w-full h-[400px] object-cover"
              />
            </div>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/foodd%20truck%202.B.jpg"
                alt="Food truck festival"
                className="w-full h-[400px] object-cover"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <QrCode className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-black text-zinc-900 mb-2">Display Your QR Code</h3>
              <p className="text-zinc-600">
                Print your QR code on your truck, tent, or signage. Customers scan and see your full video menu instantly.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Video className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-black text-zinc-900 mb-2">Show Your Best Dishes</h3>
              <p className="text-zinc-600">
                Video menus help customers decide faster, reducing queue times and increasing order values at busy events.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MapPin className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-black text-zinc-900 mb-2">Update Your Location</h3>
              <p className="text-zinc-600">
                Moving to a new market or festival? Update your location in real-time so customers always know where to find you.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="text-white" size={32} />
              </div>
              <h3 className="text-xl font-black text-zinc-900 mb-2">Event QR Code (White Label)</h3>
              <p className="text-zinc-600">
                One QR code for all vendors at your event. Custom branding, multiple menus, premium solution. Contact us for pricing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Screenshots Section */}
      <section className="py-20 bg-gradient-to-br from-zinc-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-black text-zinc-900 mb-4">
              Powerful Dashboard, Simple to Use
            </h2>
            <p className="text-xl text-zinc-600 max-w-2xl mx-auto">
              Manage your menu, track analytics, and grow your business from one clean dashboard.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-zinc-200">
              <img
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/dashboard%201%20(1).png"
                alt="MenuLove Dashboard Analytics"
                className="w-full h-auto"
              />
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-zinc-200">
              <img
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/dashboard%202%20(1).png"
                alt="MenuLove Menu Management"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

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
            Be among the first restaurants in Australia to revolutionize how customers experience your menu through engaging video content, QR codes, and your own shareable link.
          </p>
          <button
            onClick={scrollToForm}
            className="inline-flex items-center gap-2 px-10 py-5 bg-white text-orange-600 font-black text-xl rounded-2xl hover:bg-yellow-300 hover:text-orange-700 transition-all transform hover:scale-105 shadow-2xl mb-4"
          >
            Create My Video Menu
            <ArrowRight size={24} />
          </button>
          <p className="text-yellow-300 text-lg font-black mb-3 animate-pulse">
            🔥 Only 10 FREE Beta Spots Left
          </p>
          <p className="text-white/80 text-sm mb-3">
            30 day trial. No credit card required. No commission fees.
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
              Video menus available Australia-wide for restaurants, cafés, and food trucks.
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
                alt="Decisions Cafe" 
                className="h-16 w-auto grayscale hover:grayscale-0 transition-all duration-300 opacity-60 hover:opacity-100"
              />
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/flume.png" 
                alt="Flume by the River" 
                className="h-16 w-auto grayscale hover:grayscale-0 transition-all duration-300 opacity-60 hover:opacity-100"
              />
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/the%20dock.png" 
                alt="The Dock" 
                className="h-16 w-auto grayscale hover:grayscale-0 transition-all duration-300 opacity-60 hover:opacity-100"
              />
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/la%20casa.png" 
                alt="La Casa Beach Bar" 
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
                alt="Decisions Cafe" 
                className="h-12 w-auto grayscale opacity-60 flex-shrink-0"
              />
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/flume.png" 
                alt="Flume by the River" 
                className="h-12 w-auto grayscale opacity-60 flex-shrink-0"
              />
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/the%20dock.png" 
                alt="The Dock" 
                className="h-12 w-auto grayscale opacity-60 flex-shrink-0"
              />
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/la%20casa.png" 
                alt="La Casa Beach Bar" 
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
                alt="Decisions Cafe" 
                className="h-12 w-auto grayscale opacity-60 flex-shrink-0"
              />
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/flume.png" 
                alt="Flume by the River" 
                className="h-12 w-auto grayscale opacity-60 flex-shrink-0"
              />
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/the%20dock.png" 
                alt="The Dock" 
                className="h-12 w-auto grayscale opacity-60 flex-shrink-0"
              />
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/la%20casa.png" 
                alt="La Casa Beach Bar" 
                className="h-12 w-auto grayscale opacity-60 flex-shrink-0"
              />
              {/* Set 3 */}
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
                alt="Decisions Cafe" 
                className="h-12 w-auto grayscale opacity-60 flex-shrink-0"
              />
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/flume.png" 
                alt="Flume by the River" 
                className="h-12 w-auto grayscale opacity-60 flex-shrink-0"
              />
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/the%20dock.png" 
                alt="The Dock" 
                className="h-12 w-auto grayscale opacity-60 flex-shrink-0"
              />
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/la%20casa.png" 
                alt="La Casa Beach Bar" 
                className="h-12 w-auto grayscale opacity-60 flex-shrink-0"
              />
              {/* Set 4 */}
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
                alt="Decisions Cafe" 
                className="h-12 w-auto grayscale opacity-60 flex-shrink-0"
              />
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/flume.png" 
                alt="Flume by the River" 
                className="h-12 w-auto grayscale opacity-60 flex-shrink-0"
              />
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/the%20dock.png" 
                alt="The Dock" 
                className="h-12 w-auto grayscale opacity-60 flex-shrink-0"
              />
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/la%20casa.png" 
                alt="La Casa Beach Bar" 
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
      <footer className="bg-zinc-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Section - Logo + Links */}
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Logo & Tagline */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img 
                  src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/icon.png" 
                  alt="MenuLove" 
                  className="w-10 h-10"
                />
                <span className="text-white font-black text-2xl">MenuLove™</span>
              </div>
              <p className="text-zinc-400 text-sm">
                Video Menus & Smart Ordering
              </p>
            </div>

            {/* Platform Links */}
            <div>
              <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Platform</h3>
              <ul className="space-y-3">
                <li>
                  <a href="/become-a-partner" className="text-zinc-400 hover:text-orange-500 transition-colors text-sm">
                    For Restaurants
                  </a>
                </li>
                <li>
                  <a href="/partner" className="text-zinc-400 hover:text-orange-500 transition-colors text-sm">
                    Partner Portal
                  </a>
                </li>
                <li>
                  <a href="/contact" className="text-zinc-400 hover:text-orange-500 transition-colors text-sm">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Legal</h3>
              <ul className="space-y-3">
                <li>
                  <a href="/faq" className="text-zinc-400 hover:text-orange-500 transition-colors text-sm">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="/privacy-policy" className="text-zinc-400 hover:text-orange-500 transition-colors text-sm">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms-of-service" className="text-zinc-400 hover:text-orange-500 transition-colors text-sm">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>

            {/* Mobile Access QR - Hidden on mobile, shown on desktop */}
            <div className="hidden sm:block">
              <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Mobile Access</h3>
              <p className="text-zinc-400 text-sm mb-4">Best experience on mobile</p>
              <div className="bg-white p-3 rounded-xl inline-block">
                <img 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://menulove.com.au" 
                  alt="QR Code for MenuLove" 
                  className="w-24 h-24"
                />
              </div>
            </div>
          </div>

          {/* Beta Message */}
          <div className="border-t border-zinc-800 pt-8 mb-8">
            <div className="max-w-3xl mx-auto text-center">
              <p className="text-zinc-500 text-sm leading-relaxed">
                <span className="text-orange-500 font-bold">Beta Version:</span> MenuLove™ is currently in beta testing. 
                We're working hard to deliver the best experience for Australian restaurants. 
                Your feedback helps us improve and build the perfect platform for showcasing your culinary creations. 
                Join us in revolutionizing how restaurants connect with customers through video menus.
              </p>
              <p className="text-zinc-500 text-sm mt-4">
                If you have any questions, feel free to <a href="mailto:contact@menulove.com.au" className="text-orange-500 hover:text-orange-400 transition-colors font-semibold">contact us here</a>.
              </p>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="text-center pt-6 border-t border-zinc-800">
            <p className="text-zinc-400 text-sm mb-2">
              MenuLove™ - Video Menus & Smart Ordering
            </p>
            <p className="text-zinc-500 text-sm mb-1">
              Built with <span className="text-orange-500">🧡</span> in Australia | <a href="mailto:contact@menulove.com.au" className="text-orange-500 hover:text-orange-400 transition-colors">contact@menulove.com.au</a>
            </p>
            <p className="text-zinc-500 text-sm">
              All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* LoveBot Custom Chat Widget */}
      <LoveBotChat />

      {/* Promo Popup - 30 Day Free Trial */}
      <PromoPopup />
    </div>
  );
};

export default PartnerLandingPage;
