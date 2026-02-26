import React, { useEffect } from 'react';
import { ArrowRight, Eye, Brain, Zap, Smartphone, TrendingUp, Users } from 'lucide-react';

const WhyVideoMenusPage: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Why Video Menus Increase Restaurant Orders | MenuLove';
  }, []);

  return (
    <div className="min-h-screen bg-white">
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
          style={{ backgroundImage: 'url(https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/img_Why.jpg)' }}
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative max-w-4xl mx-auto px-6 py-24">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            Why Video Menus Increase Restaurant Orders
          </h1>
          <p className="text-xl text-white/90 mb-8 leading-relaxed">
            Understanding the psychology behind why video menus drive higher engagement, larger orders, and better customer satisfaction.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <article className="max-w-4xl mx-auto px-6 py-16">
        {/* Introduction */}
        <section className="mb-16">
          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            The restaurant industry is experiencing a fundamental shift in how customers discover and order food. While traditional menus rely on text descriptions and static photos, video menus tap into powerful psychological triggers that influence purchasing decisions. The result? Higher order values, faster decision-making, and more satisfied customers.
          </p>
          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            This isn't just a trend—it's a response to how modern consumers process information and make choices. Understanding why video menus work so effectively can help restaurant owners, cafe managers, and pub operators make informed decisions about their digital strategy.
          </p>
        </section>

        {/* The Psychology of Visual Processing */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-6">The Psychology of Visual Processing</h2>
          
          <div className="bg-zinc-50 p-6 rounded-xl mb-6">
            <h3 className="text-2xl font-bold text-zinc-900 mb-4 flex items-center gap-2">
              <Brain size={28} className="text-orange-500" />
              Video Engages Multiple Senses Simultaneously
            </h3>
            <p className="text-lg text-zinc-700 leading-relaxed">
              Human brains process visual information significantly faster than text. When customers watch a video of food being prepared, plated, or served, they're not just seeing the dish—they're imagining the taste, smell, and texture. This multisensory mental simulation creates a stronger desire to experience the actual product.
            </p>
          </div>

          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            Static photos can show what a dish looks like, but video shows how it moves, steams, and comes together. Watching cheese stretch from a pizza slice, sauce being drizzled over a dessert, or steam rising from a hot meal triggers appetite responses that still images simply cannot achieve. The brain interprets these visual cues as immediate sensory experiences, creating anticipation and desire.
          </p>

          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            This phenomenon is rooted in mirror neurons—brain cells that activate both when we perform an action and when we watch someone else perform it. When customers watch a chef preparing their signature dish or a bartender crafting a cocktail, their brains simulate the experience, making them more likely to order it.
          </p>
        </section>

        {/* Motion Captures Attention */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-6">Motion Naturally Captures and Holds Attention</h2>
          
          <div className="bg-zinc-50 p-6 rounded-xl mb-6">
            <h3 className="text-2xl font-bold text-zinc-900 mb-4 flex items-center gap-2">
              <Eye size={28} className="text-orange-500" />
              The Attention Economy
            </h3>
            <p className="text-lg text-zinc-700 leading-relaxed">
              In an environment where customers are constantly distracted by their phones, notifications, and conversations, capturing attention is crucial. Movement naturally draws the eye—it's a survival instinct hardwired into human psychology. Video menus leverage this instinct to keep customers engaged with your offerings.
            </p>
          </div>

          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            When customers browse a traditional menu, they often skim quickly, reading dish names and maybe glancing at descriptions. With video menus, customers pause to watch. This extended engagement time means they're spending more mental energy considering each dish, which increases the likelihood of ordering—and ordering more.
          </p>

          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            The swipeable, TikTok-style interface that platforms like MenuLove use feels natural to modern consumers. They're already accustomed to consuming content in this format, making the experience intuitive and enjoyable rather than feeling like a chore. This familiarity reduces friction in the ordering process.
          </p>
        </section>

        {/* Appetite Stimulation */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-6">Video Stimulates Appetite More Effectively</h2>
          
          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            There's a reason food videos dominate social media platforms. Watching food being prepared, cooked, and served triggers physiological responses—salivation, hunger pangs, and cravings. These aren't just psychological effects; they're measurable physical reactions that influence purchasing decisions.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-orange-50 p-6 rounded-xl">
              <h3 className="text-xl font-bold text-zinc-900 mb-3">Visual Appetite Triggers</h3>
              <p className="text-zinc-700">
                Seeing steam rise from hot food, watching ingredients sizzle in a pan, or observing the perfect pour of a craft beer activates the brain's reward centers. These visual cues signal that satisfying food is available, increasing desire to order.
              </p>
            </div>

            <div className="bg-orange-50 p-6 rounded-xl">
              <h3 className="text-xl font-bold text-zinc-900 mb-3">Emotional Connection</h3>
              <p className="text-zinc-700">
                Video allows restaurants to tell a story. Showing the care that goes into preparation, the quality of ingredients, or the skill of the chef creates an emotional connection that justifies premium pricing and builds brand loyalty.
              </p>
            </div>
          </div>

          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            This appetite stimulation leads to larger orders. When customers are genuinely excited about multiple dishes they've seen in video form, they're more likely to order appetizers, sides, desserts, or additional drinks. The visual appeal creates desire that extends beyond just satisfying hunger—it creates the desire for an experience.
          </p>
        </section>

        {/* Impulse Decisions */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-6">Video Menus Encourage Impulse Decisions</h2>
          
          <div className="bg-zinc-50 p-6 rounded-xl mb-6">
            <h3 className="text-2xl font-bold text-zinc-900 mb-4 flex items-center gap-2">
              <Zap size={28} className="text-orange-500" />
              Reducing Decision Paralysis
            </h3>
            <p className="text-lg text-zinc-700 leading-relaxed">
              Long text menus create decision fatigue. Customers spend mental energy reading descriptions, comparing options, and trying to imagine what each dish looks like. This cognitive load can lead to conservative choices or frustration. Video menus eliminate this problem by showing exactly what customers will receive.
            </p>
          </div>

          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            When customers can see a dish in action, decision-making becomes faster and more confident. They don't need to decode menu descriptions or ask servers questions about ingredients and presentation. The video provides all the information they need, allowing them to make quick, confident choices.
          </p>

          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            This speed benefits both customers and venues. Faster ordering means better table turnover, reduced wait times, and more satisfied diners. It also means customers are more likely to order additional items they see while browsing—impulse additions that increase average order values.
          </p>

          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            The "see it, want it, order it" cycle that video menus create is particularly powerful for high-margin items like specialty cocktails, premium dishes, or desserts. When customers watch a skilled bartender craft a signature cocktail or see a decadent dessert being plated, the impulse to order becomes nearly irresistible.
          </p>
        </section>

        {/* Mobile Behavior */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-6">QR Menus and Mobile-First Behavior</h2>
          
          <div className="bg-zinc-50 p-6 rounded-xl mb-6">
            <h3 className="text-2xl font-bold text-zinc-900 mb-4 flex items-center gap-2">
              <Smartphone size={28} className="text-orange-500" />
              The Mobile Revolution
            </h3>
            <p className="text-lg text-zinc-700 leading-relaxed">
              Modern diners are already on their phones. Rather than fighting this behavior, smart venues embrace it through QR code menus that deliver video content directly to customers' devices. This meets customers where they are and provides an experience they're already comfortable with.
            </p>
          </div>

          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            QR code menus combined with video content create a seamless experience. Customers scan a code, immediately see your menu in video format, and can start browsing without waiting for a server to bring a physical menu. This instant access reduces perceived wait times and gets customers engaged with your offerings faster.
          </p>

          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            Mobile devices are also personal. When customers browse a menu on their own phone, they can take their time, revisit items, and share interesting dishes with dining companions. This personal interaction with your menu creates a more intimate connection with your brand than passing around a shared physical menu.
          </p>

          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            The mobile format also enables features impossible with traditional menus. Customers can save favorite dishes for future visits, filter by dietary preferences, or see real-time updates about sold-out items or daily specials. This functionality enhances the experience while providing venues with valuable data about customer preferences.
          </p>
        </section>

        {/* Social Proof */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-6">Social Sharing and Discovery</h2>
          
          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            Video menus don't just influence the customers currently in your venue—they become marketing tools that attract new customers. When diners see something impressive on your video menu, they're likely to share it with friends, post it on social media, or save it for later. This organic sharing extends your reach far beyond your physical location.
          </p>

          <div className="bg-orange-50 p-6 rounded-xl mb-6">
            <h3 className="text-xl font-bold text-zinc-900 mb-3 flex items-center gap-2">
              <Users size={24} className="text-orange-500" />
              Location-Based Discovery
            </h3>
            <p className="text-zinc-700">
              Platforms like MenuLove enable location-based discovery, where potential customers browsing nearby restaurants can find your venue through your video menu. Your most photogenic dishes become your marketing team, working 24/7 to attract new diners.
            </p>
          </div>

          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            This discovery mechanism is particularly powerful because it reaches customers at the exact moment they're deciding where to eat. Unlike traditional advertising that interrupts, video menus attract customers who are actively seeking dining options. The visual appeal of your dishes becomes the deciding factor that brings them through your door.
          </p>
        </section>

        {/* Transparency Builds Trust */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-6">Transparency Builds Trust and Reduces Returns</h2>
          
          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            One often-overlooked benefit of video menus is how they set accurate expectations. When customers can see exactly what a dish looks like, how it's portioned, and how it's presented, there are fewer surprises when the food arrives. This transparency reduces disappointment, complaints, and the likelihood of items being sent back to the kitchen.
          </p>

          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            For venues, this means fewer wasted ingredients, less staff time handling complaints, and higher customer satisfaction scores. When customers get exactly what they expected based on the video they watched, they're more likely to return and recommend your venue to others.
          </p>

          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            This transparency also allows venues to confidently showcase premium ingredients and preparation techniques. When customers can see the quality that goes into each dish, they're more willing to pay premium prices. The video justifies the cost by demonstrating the value.
          </p>
        </section>

        {/* Data and Optimization */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-6">Data-Driven Menu Optimization</h2>
          
          <div className="bg-zinc-50 p-6 rounded-xl mb-6">
            <h3 className="text-2xl font-bold text-zinc-900 mb-4 flex items-center gap-2">
              <TrendingUp size={28} className="text-orange-500" />
              Actionable Insights
            </h3>
            <p className="text-lg text-zinc-700 leading-relaxed">
              Video menu platforms provide analytics that traditional menus cannot. See which dishes customers watch most, how long they engage with each video, and what items they save for later. This data reveals customer preferences and helps optimize your menu for maximum profitability.
            </p>
          </div>

          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            Understanding which videos generate the most engagement allows you to identify your strongest offerings and promote them more effectively. If a particular dish consistently captures attention but has low order rates, you might adjust pricing or positioning. If another dish has high engagement and high conversion, you know you have a winner worth highlighting.
          </p>

          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            This data-driven approach removes guesswork from menu management. Instead of relying on intuition or anecdotal feedback, you have concrete metrics showing what resonates with customers. This leads to better business decisions and higher profitability.
          </p>
        </section>

        {/* Conclusion */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-zinc-900 mb-6">The Bottom Line: Video Menus Drive Revenue</h2>
          
          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            Video menus increase restaurant orders because they tap into fundamental aspects of human psychology—visual processing, appetite stimulation, impulse decision-making, and social behavior. They meet customers where they are (on their mobile devices), provide the information they need (visual confirmation of dishes), and create the desire they crave (multisensory anticipation).
          </p>

          <p className="text-lg text-zinc-700 mb-4 leading-relaxed">
            For restaurants, cafes, pubs, and food venues, the question isn't whether video menus work—it's whether you can afford not to use them. As customer expectations evolve and competition intensifies, video menus provide a clear competitive advantage. They increase engagement, boost order values, improve customer satisfaction, and provide valuable data for optimization.
          </p>

          <p className="text-lg text-zinc-700 mb-8 leading-relaxed">
            MenuLove makes it easy to implement video menus in your venue. With simple QR code technology, intuitive management tools, and proven results, you can start increasing orders immediately. The platform handles the technical complexity while you focus on what you do best—creating amazing food and beverage experiences.
          </p>

          <div className="bg-gradient-to-br from-orange-500 to-amber-500 text-white p-8 rounded-2xl text-center">
            <h3 className="text-2xl font-bold mb-4">Ready to Increase Your Orders?</h3>
            <p className="text-lg mb-6 opacity-90">
              Join hundreds of Australian venues using MenuLove to boost engagement and revenue.
            </p>
            <a 
              href="/partner" 
              className="inline-flex items-center gap-2 bg-white text-orange-500 px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 hover:shadow-lg"
            >
              Start Your Free Trial
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
            <a href="/video-menu-platform" className="text-orange-500 hover:underline">Video Menu Platform</a>
          </p>
          <p className="text-sm text-zinc-500">
            © 2026 MenuLove Australia. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default WhyVideoMenusPage;
