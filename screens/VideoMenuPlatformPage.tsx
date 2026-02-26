import React, { useEffect } from 'react';
import { ArrowRight, Video, QrCode, MapPin, TrendingUp, Users, Smartphone } from 'lucide-react';

const VideoMenuPlatformPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Video Menu Platform for Restaurants, Cafes & Pubs | MenuLove';
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* SEO Meta Tags handled by helmet or document.title */}
      
      {/* Header */}
      <header className="bg-white border-b border-zinc-100 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img 
              src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/icon.png" 
              alt="MenuLove" 
              className="w-10 h-10 rounded-lg"
            />
            <span className="text-xl font-bold text-zinc-900">MenuLove</span>
          </a>
          <a 
            href="/partner" 
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold text-sm transition-colors"
          >
            Get Started
          </a>
        </div>
      </header>

      {/* Hero Banner with Background Image */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/img_coffeeshop.jpg)' }}
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative max-w-4xl mx-auto px-6 py-24">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            Video Menu Platform for Restaurants, Cafes & Pubs
          </h1>
          <p className="text-xl text-white/90 mb-8 leading-relaxed">
            Transform how customers discover and order from your venue with immersive video menus, smart QR technology, and location-based discovery.
          </p>
          <a 
            href="/partner" 
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105"
          >
            Try MenuLove Free
            <ArrowRight size={20} />
          </a>
        </div>
      </section>

      {/* Main Content */}
      <article className="max-w-4xl mx-auto px-6 py-16">
        {/* What is a Video Menu Platform */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-6">What is a Video Menu Platform?</h2>
          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            A video menu platform is a next-generation digital solution that replaces traditional static menus with engaging video content. Instead of reading text descriptions or viewing still photos, customers watch short, appetizing videos of your dishes being prepared, plated, and served. This immersive experience bridges the gap between browsing a menu and actually tasting the food.
          </p>
          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            MenuLove takes this concept further by combining video menus with smart QR technology and location-based discovery. When customers scan your QR code or discover your venue through our app, they're instantly transported into a visual journey through your menu. Each dish comes alive through video, making it easier for customers to decide what to order and increasing their appetite for multiple items.
          </p>
          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            Unlike traditional digital menus that simply digitize a PDF, a true video menu platform creates an interactive experience. Customers can swipe through dishes TikTok-style, save their favorites, and share discoveries with friends. For venues, this means higher engagement, better conversion rates, and valuable insights into what customers are interested in before they even place an order.
          </p>
        </section>

        {/* Who It's For */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-6">Who Benefits from Video Menu Platforms?</h2>
          <p className="text-lg text-zinc-700 mb-6 leading-relaxed">
            Video menu platforms are transforming the food and beverage industry across multiple venue types. Here's who benefits most:
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-zinc-50 p-6 rounded-xl">
              <h3 className="text-xl font-bold text-zinc-900 mb-3 flex items-center gap-2">
                <Video size={24} className="text-orange-500" />
                Restaurants
              </h3>
              <p className="text-zinc-700">
                From fine dining to casual eateries, restaurants use video menus to showcase signature dishes, daily specials, and chef preparations. The visual storytelling helps justify premium pricing and reduces decision fatigue.
              </p>
            </div>

            <div className="bg-zinc-50 p-6 rounded-xl">
              <h3 className="text-xl font-bold text-zinc-900 mb-3 flex items-center gap-2">
                <Users size={24} className="text-orange-500" />
                Cafes & Coffee Shops
              </h3>
              <p className="text-zinc-700">
                Cafes leverage video menus to highlight latte art, pastry selections, and seasonal drinks. The visual appeal drives impulse purchases and increases average order value, especially for specialty beverages.
              </p>
            </div>

            <div className="bg-zinc-50 p-6 rounded-xl">
              <h3 className="text-xl font-bold text-zinc-900 mb-3 flex items-center gap-2">
                <TrendingUp size={24} className="text-orange-500" />
                Pubs & Bars
              </h3>
              <p className="text-zinc-700">
                Pubs use video menus to showcase craft beers being poured, cocktails being mixed, and pub food being served. This creates atmosphere and excitement, encouraging customers to try new items.
              </p>
            </div>

            <div className="bg-zinc-50 p-6 rounded-xl">
              <h3 className="text-xl font-bold text-zinc-900 mb-3 flex items-center gap-2">
                <Smartphone size={24} className="text-orange-500" />
                Specialty Venues
              </h3>
              <p className="text-zinc-700">
                Pizzerias, dessert bars, seafood restaurants, and other specialty venues use video to highlight their unique offerings. Watching pizza dough being tossed or desserts being decorated creates desire.
              </p>
            </div>
          </div>

          <p className="text-lg text-zinc-700 leading-relaxed">
            Any food or beverage venue that wants to increase customer engagement, boost order values, and stand out from competitors can benefit from a video menu platform. The technology is particularly powerful for venues with visually appealing dishes or unique preparation methods.
          </p>
        </section>

        {/* Key Benefits */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-6">Key Benefits of Video Menu Platforms</h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-3">Increased Customer Engagement</h3>
              <p className="text-lg text-zinc-700 leading-relaxed">
                Video content captures attention in ways that static images and text cannot. Customers spend significantly more time browsing video menus compared to traditional menus, leading to better familiarity with your offerings and higher likelihood of ordering. The swipeable, TikTok-style interface feels natural to modern diners who are accustomed to consuming content in this format.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-3">Higher Conversion Rates</h3>
              <p className="text-lg text-zinc-700 leading-relaxed">
                When customers can see dishes in motion—steam rising from a hot meal, cheese stretching from a pizza, or a cocktail being garnished—their appetite is stimulated in ways that static photos cannot achieve. This sensory engagement leads to faster decision-making and increased order values. Venues using video menus report higher average transaction sizes and more frequent upsells.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-3">Smart QR Menu Technology</h3>
              <p className="text-lg text-zinc-700 leading-relaxed">
                MenuLove's QR code system eliminates the need for physical menus while providing a superior digital experience. Customers simply scan a code at their table to access your full video menu on their phone. This is more hygienic, easier to update, and provides valuable analytics about which dishes generate the most interest. You can update prices, add specials, or remove sold-out items instantly without reprinting menus.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-3">Location-Based Discovery</h3>
              <p className="text-lg text-zinc-700 leading-relaxed">
                Beyond serving existing customers, MenuLove helps you attract new ones through location-based discovery. Potential customers browsing the app can find your venue based on proximity, cuisine type, or specific dishes. Your video menu becomes a powerful marketing tool that works 24/7 to attract nearby diners who are actively looking for their next meal.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-3">Reduced Decision Fatigue</h3>
              <p className="text-lg text-zinc-700 leading-relaxed">
                Long text menus overwhelm customers and slow down ordering. Video menus simplify the decision process by showing exactly what each dish looks like and how it's prepared. This clarity reduces questions to staff, speeds up table turnover, and leads to more satisfied customers who get exactly what they expected.
              </p>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-3">Valuable Customer Insights</h3>
              <p className="text-lg text-zinc-700 leading-relaxed">
                Video menu platforms provide analytics that traditional menus cannot. See which dishes customers view most, how long they watch each video, and what items they save for later. This data helps you optimize your menu, identify popular items, and make informed decisions about pricing and promotions.
              </p>
            </div>
          </div>
        </section>

        {/* Why MenuLove */}
        <section className="mb-16 bg-gradient-to-br from-orange-50 to-amber-50 p-8 rounded-2xl">
          <h2 className="text-3xl font-bold text-zinc-900 mb-6">Why Choose MenuLove?</h2>
          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            MenuLove is Australia's leading video menu platform, purpose-built for restaurants, cafes, pubs, and food venues of all sizes. We combine cutting-edge video technology with intuitive design to create an experience that delights customers and drives revenue for venues.
          </p>
          <p className="text-lg text-zinc-700 mb-6 leading-relaxed">
            Our platform is easy to set up, simple to manage, and designed to work seamlessly with your existing operations. Upload your dish videos, generate your QR code, and start engaging customers immediately. No technical expertise required, no expensive hardware needed.
          </p>
          
          <ul className="space-y-3 mb-8">
            <li className="flex items-start gap-3">
              <QrCode size={24} className="text-orange-500 flex-shrink-0 mt-1" />
              <span className="text-lg text-zinc-700">Instant QR code generation for contactless menu access</span>
            </li>
            <li className="flex items-start gap-3">
              <MapPin size={24} className="text-orange-500 flex-shrink-0 mt-1" />
              <span className="text-lg text-zinc-700">Location-based discovery to attract new customers</span>
            </li>
            <li className="flex items-start gap-3">
              <Video size={24} className="text-orange-500 flex-shrink-0 mt-1" />
              <span className="text-lg text-zinc-700">TikTok-style video feed that customers love</span>
            </li>
            <li className="flex items-start gap-3">
              <TrendingUp size={24} className="text-orange-500 flex-shrink-0 mt-1" />
              <span className="text-lg text-zinc-700">Analytics dashboard to track engagement and optimize your menu</span>
            </li>
          </ul>

          <a 
            href="/partner" 
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105"
          >
            Start Your Free Trial
            <ArrowRight size={20} />
          </a>
        </section>

        {/* Conclusion */}
        <section>
          <h2 className="text-3xl font-bold text-zinc-900 mb-6">The Future of Restaurant Menus is Here</h2>
          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            Video menu platforms represent the natural evolution of how customers discover and order food. As mobile technology becomes more sophisticated and customer expectations continue to rise, static menus feel increasingly outdated. Video menus meet customers where they are—on their phones, consuming video content, and making quick decisions based on visual appeal.
          </p>
          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            For restaurants, cafes, pubs, and food venues, adopting a video menu platform isn't just about keeping up with trends—it's about gaining a competitive advantage. Venues using MenuLove report higher customer satisfaction, increased order values, and better table turnover. The platform pays for itself through improved efficiency and increased revenue.
          </p>
          <p className="text-lg text-zinc-700 mb-8 leading-relaxed">
            Whether you're a small cafe looking to showcase your specialty drinks or a multi-location restaurant chain wanting to standardize your digital presence, MenuLove provides the tools you need to succeed. Join hundreds of Australian venues already using video menus to transform their customer experience.
          </p>

          <div className="bg-zinc-900 text-white p-8 rounded-2xl text-center">
            <h3 className="text-2xl font-bold mb-4">Ready to Transform Your Menu?</h3>
            <p className="text-lg text-zinc-300 mb-6">
              Start your free trial today and see why venues across Australia are switching to MenuLove.
            </p>
            <a 
              href="/partner" 
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105"
            >
              Get Started Free
              <ArrowRight size={20} />
            </a>
          </div>
        </section>
      </article>

      {/* Footer */}
      <footer className="bg-zinc-50 border-t border-zinc-100 py-8 mt-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-zinc-600 mb-4">
            <a href="/" className="text-orange-500 hover:underline">Home</a>
            {' · '}
            <a href="/partner" className="text-orange-500 hover:underline">For Restaurants</a>
            {' · '}
            <a href="/why-video-menus-increase-orders" className="text-orange-500 hover:underline">Why Video Menus Work</a>
          </p>
          <p className="text-sm text-zinc-500">
            © 2026 MenuLove Australia. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default VideoMenuPlatformPage;
