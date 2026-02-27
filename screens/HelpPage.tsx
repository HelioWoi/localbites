import React, { useState } from 'react';
import { ArrowLeft, Mail, MessageCircle, Book, Video, QrCode, CreditCard, ChevronDown, ChevronUp } from 'lucide-react';

const HelpPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "How do I upload my first video?",
      answer: "Go to your Partner Dashboard, click on 'Menu' tab, then click 'Add Menu Video'. Select your video file (max 30 seconds, 10MB), add a name, category, and description, then click 'Upload'. Your video will be live instantly!"
    },
    {
      question: "What are the video requirements?",
      answer: "Videos must be maximum 30 seconds long and 10MB in size. We recommend 720p quality for best results. Supported formats: MP4, MOV. Keep your videos short and engaging to showcase your dishes!"
    },
    {
      question: "How do I get my QR Code?",
      answer: "Your QR Code is automatically generated when you create your account. Go to your Dashboard and click 'Download QR Code'. Print it and display it at your restaurant so customers can scan and view your video menu!"
    },
    {
      question: "How does the 30-day free trial work?",
      answer: "When you sign up, you get 30 days of full Premium access with no credit card required. You can upload unlimited videos, access analytics, and use all features. After the trial, choose to subscribe for $29.90/month or your account will revert to free tier (limited features)."
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes! You can cancel your subscription anytime from the Subscription page in your dashboard. There are no cancellation fees or penalties. Your access will continue until the end of your current billing period."
    },
    {
      question: "How do customers find my restaurant?",
      answer: "Customers can find you through: 1) Smart search in the MenuLove app, 2) Scanning your QR Code, 3) Featured listings (Premium members), 4) Category browsing. Premium members get priority placement in search results!"
    },
    {
      question: "What analytics can I see?",
      answer: "Your Analytics dashboard shows: total views, saves, directions requested, top performing videos, engagement trends, and weekly insights. This helps you understand what dishes customers love most!"
    },
    {
      question: "Can I edit or delete videos after uploading?",
      answer: "Yes! Go to your Menu tab, click on any video, and you'll see options to edit details or delete the video. Changes are reflected immediately on your public menu."
    },
    {
      question: "What if I need help with my account?",
      answer: "Contact us anytime at contact@menulove.com.au. Premium members get priority support with responses within 24 hours. We're here to help you succeed!"
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <a 
            href="/"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Home</span>
          </a>
          <h1 className="text-4xl font-bold mb-4">Help Center</h1>
          <p className="text-white/90 text-lg">
            Everything you need to know about MenuLove
          </p>
        </div>
      </div>

      {/* Quick Contact */}
      <div className="max-w-4xl mx-auto px-4 -mt-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-zinc-900 mb-4">Need immediate help?</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <a
              href="mailto:contact@menulove.com.au"
              className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors"
            >
              <Mail className="text-orange-500" size={24} />
              <div>
                <p className="font-semibold text-zinc-900">Email Support</p>
                <p className="text-sm text-zinc-600">contact@menulove.com.au</p>
              </div>
            </a>
            <a
              href="/partner"
              className="flex items-center gap-3 p-4 bg-zinc-50 border border-zinc-200 rounded-xl hover:bg-zinc-100 transition-colors"
            >
              <MessageCircle className="text-zinc-500" size={24} />
              <div>
                <p className="font-semibold text-zinc-900">Partner Dashboard</p>
                <p className="text-sm text-zinc-600">Manage your account</p>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Getting Started Guide */}
      <div className="max-w-4xl mx-auto px-4 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8">
          <div className="flex items-center gap-2 mb-6">
            <Book className="text-orange-500" size={24} />
            <h2 className="text-2xl font-bold text-zinc-900">Getting Started</h2>
          </div>
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-bold">1</span>
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 mb-2">Create Your Account</h3>
                <p className="text-zinc-600">Sign up at menulove.com.au/partner with your restaurant details. Get instant access to your 30-day free trial.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Video size={20} className="text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 mb-2">Upload Your Videos</h3>
                <p className="text-zinc-600">Record short videos (max 30s) of your best dishes. Upload them to your menu with names, categories, and descriptions.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <QrCode size={20} className="text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 mb-2">Display Your QR Code</h3>
                <p className="text-zinc-600">Download your unique QR Code from the dashboard. Print and display it at your restaurant for customers to scan.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-bold">4</span>
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 mb-2">Track Your Success</h3>
                <p className="text-zinc-600">Monitor views, saves, and engagement in your Analytics dashboard. See which dishes are most popular!</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto px-4 mb-12">
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8">
          <h2 className="text-2xl font-bold text-zinc-900 mb-6">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border border-zinc-200 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 transition-colors text-left"
                >
                  <span className="font-semibold text-zinc-900">{faq.question}</span>
                  {openFaq === index ? (
                    <ChevronUp className="text-orange-500 flex-shrink-0" size={20} />
                  ) : (
                    <ChevronDown className="text-zinc-400 flex-shrink-0" size={20} />
                  )}
                </button>
                {openFaq === index && (
                  <div className="px-4 pb-4 text-zinc-600 leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-zinc-200 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-zinc-600 mb-2">Still have questions?</p>
          <a
            href="mailto:contact@menulove.com.au"
            className="inline-flex items-center gap-2 text-orange-500 font-semibold hover:text-orange-600 transition-colors"
          >
            <Mail size={20} />
            Contact us at contact@menulove.com.au
          </a>
          <div className="mt-8 pt-8 border-t border-zinc-200">
            <p className="text-zinc-500 text-sm mb-1">
              MenuLove - Video Menus & Smart Discovery
            </p>
            <p className="text-zinc-400 text-sm mb-1">
              Made with <span className="text-red-500">❤️</span> in Australia | <a href="mailto:contact@menulove.com.au" className="text-orange-500 hover:text-orange-600 transition-colors">contact@menulove.com.au</a>
            </p>
            <p className="text-zinc-400 text-sm">
              All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
