import React, { useState } from 'react';
import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      question: "What is MenuLove?",
      answer: "MenuLove is a video menu platform that helps restaurants showcase their dishes through short-form vertical videos, similar to TikTok. Customers can scan a QR code or visit a link to browse your menu in an engaging, visual way before ordering."
    },
    {
      question: "How does the free trial work?",
      answer: "New restaurants get a 30-day free trial with full access to all features. No credit card required to start. You can upload videos, generate QR codes, and access analytics. After the trial, choose a plan that fits your needs or cancel anytime."
    },
    {
      question: "Do I need technical skills to use MenuLove?",
      answer: "Not at all! MenuLove is designed to be simple. Just upload videos of your dishes, add descriptions and prices, and we'll generate a QR code for you. The entire setup takes less than 30 minutes."
    },
    {
      question: "Can customers order directly through MenuLove?",
      answer: "MenuLove is a menu display platform. We don't process orders or payments. However, you can add a checkout URL to each menu item that directs customers to your ordering platform (Square, Stripe, UberEats, etc.) or to order at the counter, online, or via phone."
    },
    {
      question: "What video format should I use?",
      answer: "We recommend vertical videos (9:16 ratio) shot on your smartphone, 1-30 seconds long. Show the dish being prepared, plated, or enjoyed. Good lighting and a clean background work best. No professional equipment needed!"
    },
    {
      question: "How do customers access my video menu?",
      answer: "Customers scan your unique QR code (which you can print and display) or visit your custom MenuLove link. They'll see your video menu instantly on their phone - no app download required."
    },
    {
      question: "Can I update my menu anytime?",
      answer: "Yes! You have full control through the Partner Portal. Add new videos, update prices, change descriptions, or remove items anytime. Changes appear instantly on your live menu."
    },
    {
      question: "What analytics do I get?",
      answer: "Track QR code scans, video views, most popular dishes, peak viewing times, and customer engagement. Analytics help you understand what dishes attract attention and optimize your menu accordingly."
    },
    {
      question: "Is MenuLove suitable for food trucks and market vendors?",
      answer: "Absolutely! MenuLove is perfect for mobile vendors. Display your QR code on your truck, tent, or signage. Customers can browse your menu while waiting in line, reducing decision time and increasing order speed."
    },
    {
      question: "What if I need help or have questions?",
      answer: "We're here to help! Contact us at contact@menulove.com.au and our team will respond within 24 hours. We also provide setup guides and video tutorials in your Partner Portal."
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

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
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <HelpCircle className="text-white" size={32} />
            </div>
            <h1 className="text-5xl sm:text-6xl font-black text-white">
              FAQ
            </h1>
          </div>
          <p className="text-xl text-white/90 max-w-2xl">
            Frequently Asked Questions
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <p className="text-zinc-700 text-lg leading-relaxed">
            Find answers to common questions about MenuLove. Can't find what you're looking for? <a href="/contact" className="text-orange-600 hover:text-orange-700 font-semibold">Contact us</a> and we'll be happy to help!
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden transition-all"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-zinc-100 transition-colors"
              >
                <span className="text-lg font-bold text-zinc-900 pr-4">
                  {faq.question}
                </span>
                {openIndex === index ? (
                  <ChevronUp className="text-orange-500 flex-shrink-0" size={24} />
                ) : (
                  <ChevronDown className="text-zinc-400 flex-shrink-0" size={24} />
                )}
              </button>
              {openIndex === index && (
                <div className="px-6 pb-5 pt-2">
                  <p className="text-zinc-700 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 p-8 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-2xl text-center">
          <h2 className="text-2xl font-black text-zinc-900 mb-3">
            Still have questions?
          </h2>
          <p className="text-zinc-700 mb-6">
            Our team is here to help you get started with MenuLove.
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all"
          >
            Contact Us
          </a>
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

export default FAQPage;
