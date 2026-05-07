import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowRight, CheckCircle2, QrCode, Video, Sparkles, Star, Camera, Play, UtensilsCrossed, Coffee, Pizza, CloudUpload, WandSparkles, BarChart3 } from 'lucide-react';
import LoveBotChat from '../components/LoveBotChat';
import PromoPopup from '../components/PromoPopup';

// ── Before/After Slider ──────────────────────────────────────────────────────
interface SliderProps {
  beforeSrc: string;
  afterSrc: string;
  label: string;
  sublabel: string;
  imageHeightClass?: string;
  imageFitClass?: string;
  imageAspectRatio?: number;
  containerClassName?: string;
  Icon?: React.ElementType;
}

const BeforeAfterSlider: React.FC<SliderProps> = ({ beforeSrc, afterSrc, label, sublabel, imageHeightClass, imageFitClass = 'object-cover', imageAspectRatio, containerClassName, Icon }) => {
  const [pos, setPos] = useState(50);
  const [hasInteracted, setHasInteracted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const move = (clientX: number) => {
    if (!ref.current) return;
    const { left, width } = ref.current.getBoundingClientRect();
    setPos(Math.min(95, Math.max(5, ((clientX - left) / width) * 100)));
  };

  return (
    <div className={`rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 ${containerClassName ?? ''}`}>
      <div
        ref={ref}
        className={`relative select-none cursor-ew-resize overflow-hidden touch-none ${imageHeightClass ?? 'h-[375px]'}`}
        style={imageAspectRatio ? { aspectRatio: `${imageAspectRatio}` } : undefined}
        onPointerDown={(e) => {
          dragging.current = true;
          setHasInteracted(true);
          e.currentTarget.setPointerCapture(e.pointerId);
          move(e.clientX);
        }}
        onPointerMove={(e) => {
          if (dragging.current) move(e.clientX);
        }}
        onPointerUp={() => { dragging.current = false; }}
        onPointerCancel={() => { dragging.current = false; }}
        onClick={e => {
          setHasInteracted(true);
          move(e.clientX);
        }}
        onDragStart={(e) => e.preventDefault()}
      >
        <img
          src={afterSrc}
          className={`absolute inset-0 w-full h-full ${imageFitClass}`}
          alt="after"
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
        />
        <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <img
            src={beforeSrc}
            className={`absolute inset-0 w-full h-full ${imageFitClass}`}
            alt="before"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
          />
        </div>
        <div className="absolute top-0 bottom-0 w-0.5 bg-white/90 pointer-events-none" style={{ left: `${pos}%` }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className={`w-9 h-9 bg-white rounded-full border border-zinc-200 shadow-xl flex items-center justify-center ${!hasInteracted ? 'animate-[dragHintSlide_2.2s_ease-in-out_infinite]' : ''}`}>
              <span className="text-[10px] text-zinc-500 font-semibold tracking-tight">↔</span>
            </div>
          </div>
        </div>
        <span className="absolute top-3 left-3 text-xs font-black bg-black/70 text-zinc-300 px-2.5 py-1 rounded-full pointer-events-none">BEFORE</span>
        <span className="absolute top-3 right-3 text-xs font-black bg-orange-500 text-white px-2.5 py-1 rounded-full pointer-events-none">AFTER</span>
      </div>
      {label && (
        <div className="p-4 border-t border-white/5">
          <p className="font-bold text-white flex items-center gap-2">
            {Icon && <Icon size={16} className="text-orange-500" />}
            {label}
          </p>
          <p className="text-sm text-zinc-500 mt-1">{sublabel}</p>
        </div>
      )}
    </div>
  );
};

const PartnerLandingPage: React.FC = () => {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isPhotoTestModalOpen, setIsPhotoTestModalOpen] = useState(false);
  const [testOriginalImage, setTestOriginalImage] = useState<string | null>(null);
  const [testEnhancedImage, setTestEnhancedImage] = useState<string | null>(null);
  const [isEnhancingTestImage, setIsEnhancingTestImage] = useState(false);
  const [photoTestError, setPhotoTestError] = useState<string>('');
  const [selectedPhotoName, setSelectedPhotoName] = useState<string>('');
  const [didUpscaleLowResPhoto, setDidUpscaleLowResPhoto] = useState(false);
  const [testImageAspectRatio, setTestImageAspectRatio] = useState<number | null>(null);
  const [aiProgress, setAiProgress] = useState(0);
  const photoTestInputRef = useRef<HTMLInputElement>(null);
  const photoTestCameraInputRef = useRef<HTMLInputElement>(null);
  const aiProgressTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      const normalizedRef = refCode.trim().toUpperCase();
      const nowTs = Date.now().toString();
      localStorage.setItem('affiliate_ref_code', normalizedRef);
      localStorage.setItem('affiliate_ref_timestamp', nowTs);
      localStorage.setItem('menulove_ref', normalizedRef);
      localStorage.setItem('menulove_ref_timestamp', nowTs);
      window.location.href = `/partner?step=2&ref=${encodeURIComponent(normalizedRef)}`;
    }
  }, []);

  const scrollToForm = () => {
    document.getElementById('signup-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Could not read photo. Please try another file.'));
      reader.readAsDataURL(file);
    });

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not process this image. Please try another photo.'));
      img.src = src;
    });

  const preprocessPhotoForDemo = async (file: File) => {
    const inputDataUrl = await readFileAsDataUrl(file);
    const image = await loadImage(inputDataUrl);
    const originalWidth = image.naturalWidth || image.width;
    const originalHeight = image.naturalHeight || image.height;

    const maxSide = 1280;
    const minPixelsTarget = 1024 * 768;
    const currentPixels = originalWidth * originalHeight;

    let scale = Math.min(1, maxSide / Math.max(originalWidth, originalHeight));
    if (currentPixels < minPixelsTarget) {
      scale = Math.max(scale, Math.sqrt(minPixelsTarget / currentPixels));
    }

    const targetWidth = Math.max(1, Math.round(originalWidth * scale));
    const targetHeight = Math.max(1, Math.round(originalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Image processing failed on this browser. Please try another photo.');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

    return {
      processedDataUrl: canvas.toDataURL('image/jpeg', 0.82),
      wasUpscaled: scale > 1.01,
      aspectRatio: originalWidth / originalHeight,
    };
  };

  const handlePhotoTestSelection = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setPhotoTestError('Please upload an image file (JPG, PNG or WEBP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setPhotoTestError('This file is too large. Please use an image up to 10MB.');
      return;
    }

    try {
      setPhotoTestError('');
      setSelectedPhotoName(file.name);
      setTestEnhancedImage(null);

      const { processedDataUrl, wasUpscaled, aspectRatio } = await preprocessPhotoForDemo(file);
      setDidUpscaleLowResPhoto(wasUpscaled);
      setTestImageAspectRatio(aspectRatio);
      setTestOriginalImage(processedDataUrl);
    } catch (error: any) {
      setPhotoTestError(error.message || 'Could not prepare this photo. Try another image.');
    }
  };

  const restartPhotoTestFlow = () => {
    if (aiProgressTimerRef.current) {
      window.clearInterval(aiProgressTimerRef.current);
      aiProgressTimerRef.current = null;
    }
    setPhotoTestError('');
    setAiProgress(0);
    setIsEnhancingTestImage(false);
    setSelectedPhotoName('');
    setDidUpscaleLowResPhoto(false);
    setTestImageAspectRatio(null);
    setTestOriginalImage(null);
    setTestEnhancedImage(null);
    if (photoTestInputRef.current) photoTestInputRef.current.value = '';
    if (photoTestCameraInputRef.current) photoTestCameraInputRef.current.value = '';
  };

  const runPhotoTestEnhancement = async () => {
    if (!testOriginalImage || isEnhancingTestImage) return;

    setIsEnhancingTestImage(true);
    setPhotoTestError('');
    setAiProgress(2);

    if (aiProgressTimerRef.current) window.clearInterval(aiProgressTimerRef.current);
    aiProgressTimerRef.current = window.setInterval(() => {
      setAiProgress((prev) => +(prev + (91 - prev) * 0.018).toFixed(1));
    }, 400);

    try {
      const jobId = crypto.randomUUID();

      const commaIdx = testOriginalImage.indexOf(',');
      const base64Only = commaIdx >= 0 ? testOriginalImage.slice(commaIdx + 1) : testOriginalImage;
      const byteChars = atob(base64Only);
      const byteArr = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
      const imageBlob = new Blob([byteArr], { type: 'image/jpeg' });

      const tempPath = `ai-temp/${jobId}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from('menu-videos')
        .upload(tempPath, imageBlob, { contentType: 'image/jpeg', upsert: true });
      if (uploadErr) throw new Error('Could not upload photo. Please try again.');

      const { data: { publicUrl: imageUrl } } = supabase.storage
        .from('menu-videos')
        .getPublicUrl(tempPath);

      const kickoffRes = await fetch('/.netlify/functions/enhance-photo-demo-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, jobId }),
      });

      if (!kickoffRes.ok) {
        const kickoffData = await kickoffRes.json().catch(() => ({}));
        throw new Error(kickoffData?.error || `AI enhancement request failed (${kickoffRes.status}).`);
      }

      const enhancedImage = await new Promise<string>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 120;
        let transientStatusErrors = 0;

        const pollInterval = window.setInterval(async () => {
          attempts += 1;

          if (attempts > maxAttempts) {
            window.clearInterval(pollInterval);
            reject(new Error('AI request timed out. Try again with another photo.'));
            return;
          }

          try {
            const statusRes = await fetch(`/.netlify/functions/enhance-photo-status?jobId=${jobId}`);
            if (!statusRes.ok) {
              const statusErrorData = await statusRes.json().catch(() => ({}));
              window.clearInterval(pollInterval);
              reject(new Error(statusErrorData?.error || `Status check failed (${statusRes.status}).`));
              return;
            }

            const statusData = await statusRes.json();
            transientStatusErrors = 0;

            if (statusData?.status === 'done') {
              window.clearInterval(pollInterval);
              if (!statusData?.enhancedImage) {
                reject(new Error('No enhanced image was returned. Please try another photo.'));
                return;
              }
              resolve(statusData.enhancedImage);
            } else if (statusData?.status === 'error') {
              window.clearInterval(pollInterval);
              reject(new Error(statusData?.error || 'Enhancement failed. Please try again.'));
            }
          } catch {
            transientStatusErrors += 1;
            if (transientStatusErrors >= 3) {
              window.clearInterval(pollInterval);
              reject(new Error('Could not check enhancement status. Please try again.'));
            }
          }
        }, 2500);
      });

      setAiProgress(100);
      setTestEnhancedImage(enhancedImage);
    } catch (error: any) {
      setPhotoTestError(error.message || 'Enhancement failed. Please try again.');
      setAiProgress(0);
    } finally {
      if (aiProgressTimerRef.current) {
        window.clearInterval(aiProgressTimerRef.current);
        aiProgressTimerRef.current = null;
      }
      setIsEnhancingTestImage(false);
    }
  };

  const resetPhotoTestModal = () => {
    setIsPhotoTestModalOpen(false);
    setTestOriginalImage(null);
    setTestEnhancedImage(null);
    setPhotoTestError('');
    setSelectedPhotoName('');
    setDidUpscaleLowResPhoto(false);
    setTestImageAspectRatio(null);
    setAiProgress(0);
    if (photoTestInputRef.current) photoTestInputRef.current.value = '';
    if (photoTestCameraInputRef.current) photoTestCameraInputRef.current.value = '';
    if (aiProgressTimerRef.current) {
      window.clearInterval(aiProgressTimerRef.current);
      aiProgressTimerRef.current = null;
    }
  };

  const logos = [
    { src: 'https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/bkstreet.png', alt: 'Backstreet Cafe' },
    { src: 'https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/flume.png', alt: 'Flume' },
    { src: 'https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/brazzos.png', alt: 'Brazzos' },
    { src: 'https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/decision.png', alt: 'Decision Cafe' },
    { src: 'https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/the%20dock.png', alt: 'The Dock' },
    { src: 'https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/la%20casa.png', alt: 'La Casa' },
    { src: 'https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/MoolooBrew.png', alt: 'Mooloo Brew' },
  ];

  const baItems = [
    {
      beforeSrc: 'https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/new-landing/before_breakfast.jpg',
      afterSrc: 'https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/new-landing/after_breakfast.jpg',
      label: 'Breakfast & Mains',
      sublabel: 'More appetite. More orders.',
      Icon: UtensilsCrossed
    },
    {
      beforeSrc: 'https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/new-landing/before_drinks.jpg',
      afterSrc: 'https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/new-landing/after_drinks.jpg',
      label: 'Drinks & Coffee',
      sublabel: 'Looks better. Tastes better.',
      Icon: Coffee
    },
    {
      beforeSrc: 'https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/new-landing/before_pizza.jpg',
      afterSrc: 'https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/new-landing/after_pizza.jpg',
      label: 'Pizza & Mains',
      sublabel: 'More crave. More orders.',
      Icon: Pizza
    },
  ];

  const steps = [
    { num: '1', Icon: CloudUpload, title: 'Upload your photo', desc: 'Take a photo with your phone and upload it.' },
    { num: '2', Icon: WandSparkles, title: 'We enhance it with AI', desc: 'Our AI instantly transforms it into a professional visual.' },
    { num: '3', Icon: CheckCircle2, title: 'Add to your menu', desc: 'Use your enhanced photo in your menu and start selling more.' },
  ];

  const featureList = [
    { title: 'AI Photo Enhancement', desc: 'Instantly turn phone photos into professional menu visuals.' },
    { title: 'Video-Ready Menu', desc: 'Engage customers with beautiful TikTok-style food videos.' },
    { title: 'Use your current checkout', desc: 'Add your existing payment checkout link without changing the system you already use.' },
    { title: 'No Commission Fees', desc: 'Keep 100% of your revenue. No per-order fees ever.' },
  ];

  const pricingPlans = [
    {
      name: 'Free', price: '$0', period: '/month', highlight: false,
      features: ['QR code video menu', 'Video upload (basic)', 'Up to 10 menu items', '1 location', 'Standard support'],
      cta: 'Get Started Free', href: '/partner',
    },
    {
      name: 'Basic', price: '$29', period: '/month', highlight: true,
      features: ['Everything in Free', 'Unlimited menu items', 'Custom branding', 'Connect your checkout link', 'Analytics (basic)', '30 AI photo credits / month!', 'Priority support'],
      cta: 'Start Basic', href: '/partner',
    },
    {
      name: 'Pro', price: '$69', period: '/month', highlight: false,
      features: ['Everything in Basic', 'Analytics (advanced)', 'Up to 3 locations', '100 AI photo credits / month!', 'Faster AI processing', 'White-label options'],
      cta: 'Start Pro', href: '/partner',
    },
  ];

  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen overflow-x-hidden">
      <style>{`@keyframes dragHintSlide { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } } @keyframes aiPulse { 0%,100% { opacity: .45; transform: scale(1); } 50% { opacity: 1; transform: scale(1.03); } } @keyframes aiShimmer { 0% { transform: translateX(-120%); } 100% { transform: translateX(220%); } } @keyframes marqueeLogos { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-7 pb-3 sm:py-4 flex items-center justify-between">
          <a href="https://menulove.com.au">
            <img
              src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/new-landing/logo_top.png"
              alt="MenuLove™"
              className="h-12 sm:h-14 w-auto"
            />
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="/live-examples" className="hover:text-white transition-colors">Live Examples</a>
          </div>
          <a
            href="/partner"
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm rounded-xl transition-colors shadow-md shadow-orange-500/20"
          >
            Start Free
          </a>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="pt-12 sm:pt-16 lg:pt-28 pb-16 sm:pb-24 lg:pb-32 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[0.85fr_1.15fr] gap-10 sm:gap-12 lg:gap-16 items-center lg:items-center">
          <div className="order-1 lg:col-start-1 lg:row-start-1">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-semibold px-4 py-2 rounded-full mb-8">
              <Sparkles size={14} />
              Video Menu Experience
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-[4.5rem] font-black leading-[1.05] mb-6">
              <span className="block">Turn Your</span>
              <span className="block">Menu Into</span>
              <span className="block text-orange-500">Video That Sells</span>
            </h1>
          </div>

          <div className="order-2 lg:order-2 lg:col-start-2 lg:row-span-2 relative w-full overflow-hidden bg-[#0b0b0b] h-[420px] sm:h-[540px] lg:h-[650px] flex items-center justify-center">
            <img
              src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/hero2.png"
              alt="MenuLove™ video menu showcase"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="order-3 lg:col-start-1 lg:row-start-2">
            <p className="text-xl text-zinc-400 mb-10 leading-relaxed max-w-lg">
              Showcase your dishes in short mobile-first videos your customers love to scroll.
              Add AI-enhanced photos whenever you need, all in one menu platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-12">
              <button
                onClick={scrollToForm}
                className="flex items-center justify-center gap-2 min-w-[230px] h-14 px-6 bg-orange-500 hover:bg-orange-400 text-white font-bold text-[1.03rem] rounded-xl transition-colors shadow-lg shadow-orange-500/20 whitespace-nowrap"
              >
                <Sparkles size={20} />
                Start Free • 14-Day Trial
              </button>
              <a
                href="/live-examples"
                className="flex items-center justify-center gap-2 min-w-[190px] h-14 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-[1.03rem] rounded-xl transition-colors whitespace-nowrap"
              >
                <Play size={18} />
                See Live Examples
              </a>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {[
                  'https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/new-landing/joao.jpg',
                  'https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/new-landing/jessica.png',
                  'https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/new-landing/garry.jpg',
                  'https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/new-landing/will.png'
                ].map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`Customer ${i + 1}`}
                    className="w-8 h-8 rounded-full border-2 border-[#0a0a0a] object-cover"
                  />
                ))}
              </div>
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => <Star key={i} size={13} fill="currentColor" />)}
              </div>
              <span className="text-zinc-500 text-sm">Loved by Australian restaurants</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ─────────────────────────────────────────────────────── */}
      <section className="pt-10 pb-12 sm:pt-12 sm:pb-14 border-y border-white/5">
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-center text-zinc-600 text-xs font-bold uppercase tracking-widest mb-6 sm:mb-7">
            Trusted by Australian restaurants
          </p>
          <div className="relative overflow-hidden md:hidden">
            <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-10 bg-gradient-to-r from-[#0a0a0a] to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-10 bg-gradient-to-l from-[#0a0a0a] to-transparent" />
            <div className="flex w-max items-center gap-10 animate-[marqueeLogos_22s_linear_infinite]">
              {[...logos, ...logos].map((l, i) => (
                <img
                  key={`${l.alt}-${i}`}
                  src={l.src}
                  alt={l.alt}
                  className="h-10 w-auto opacity-70 grayscale brightness-125 contrast-95 shrink-0"
                />
              ))}
            </div>
          </div>
          <div className="hidden md:flex flex-wrap items-center justify-center gap-x-7 sm:gap-x-9 lg:gap-x-11 gap-y-5">
            {logos.map((l) => (
              <img
                key={l.alt}
                src={l.src}
                alt={l.alt}
                className="h-10 md:h-12 w-auto opacity-70 grayscale brightness-125 contrast-95 hover:opacity-90 transition-opacity"
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── QR / VIDEO MENU SECTION ──────────────────────────────────────────── */}
      <section className="pt-12 pb-16 sm:pt-16 sm:pb-24 lg:pt-20 lg:pb-28 px-4 sm:px-6 bg-zinc-950">
        <div className="max-w-7xl mx-auto rounded-[30px] border border-orange-500/20 bg-[#090d15] overflow-hidden shadow-[0_0_0_1px_rgba(249,115,22,0.07)]">
          <div className="grid lg:grid-cols-[1.05fr_1fr_0.95fr] items-stretch">
            <div className="order-1 relative min-h-[440px] lg:min-h-[620px] h-full">
              <img
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/new-landing/qr%20cod.png"
                alt="QR Code menu scan"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="order-2 px-8 sm:px-12 lg:px-10 py-12 lg:py-20 flex flex-col justify-center border-l border-r border-white/5">
              <p className="text-orange-500 text-sm font-bold uppercase tracking-widest mb-4">QR CODE VIDEO MENU</p>
              <h2 className="text-[2.35rem] sm:text-5xl font-black mb-8 leading-[1.05]">
                A menu experience your customers <span className="text-orange-500">love.</span>
              </h2>
              <div className="space-y-5 mb-10">
                {[
                  { text: 'Scan the QR code' },
                  { text: 'Upload your video and showcase it' },
                  { text: 'Scroll like TikTok' },
                  { text: 'Tap to order instantly' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border-2 border-orange-500 text-orange-500 text-xs font-black flex-shrink-0">✓</span>
                    <span className="font-semibold text-white text-[1.03rem]">{item.text}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-zinc-300">
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500" /> No app required</span>
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500" /> Works on any device</span>
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500" /> No commission fees</span>
              </div>
            </div>

            <div className="order-3 relative flex items-center justify-center px-4 sm:px-6 lg:px-4 py-8 lg:py-0">
              <video
                autoPlay
                loop
                muted
                playsInline
                poster="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/new-landing/mockup.png"
                className="w-full max-w-[190px] sm:max-w-[240px] lg:max-w-[285px] h-auto object-contain"
              >
                <source src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/new-landing/video%20demo.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRODUCT EXPERIENCE ───────────────────────────────────────────────── */}
      <section id="features" className="py-20 sm:py-28 lg:py-36 px-4 sm:px-6 bg-zinc-950">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-black mb-4">How <span className="text-orange-500">MenuLove™</span> Works</h2>
          <p className="text-zinc-400 text-xl">The TikTok-style video menu platform built for cafés and restaurants that want to stand out.</p>
        </div>
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-orange-500/10 max-h-[620px] flex items-center justify-center bg-black">
            <video autoPlay loop muted playsInline className="w-full h-full object-contain rounded-3xl">
              <source src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/new-landing/DecisionsCafe.mp4" type="video/mp4" />
            </video>
          </div>

          <div>
            <p className="text-orange-500 text-sm font-bold uppercase tracking-widest mb-4">Built for modern restaurants</p>
            <h2 className="text-4xl sm:text-5xl font-black mb-8 leading-tight">
              Not just photos.
              <span className="block text-orange-500">A menu that sells.</span>
            </h2>
            <div className="space-y-6 mb-12">
              {featureList.map((f) => (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 size={13} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-white">{f.title}</p>
                    <p className="text-zinc-400 text-sm mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={scrollToForm}
              className="flex items-center gap-2 px-8 py-4 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-2xl transition-colors shadow-md shadow-orange-500/20"
            >
              Start Free <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ── AI PHOTO ENHANCEMENT BLOCK ───────────────────────────────────────── */}
      <section className="pt-6 pb-20 sm:pb-28 lg:pb-36 px-4 sm:px-6 bg-zinc-950">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-semibold px-4 py-2 rounded-full mb-7">
            <Sparkles size={14} />
            AI-Powered Photo Enhancement
          </div>

          <div className="grid lg:grid-cols-[0.8fr_1.05fr_0.75fr] gap-5 lg:gap-7 items-stretch">
            <div className="rounded-3xl border border-white/10 bg-zinc-900/65 p-7 sm:p-9 flex flex-col">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.02] mb-5">
                Turn Any Food Photo Into
                <span className="block text-orange-500">Something That Sells</span>
              </h2>
              <p className="text-zinc-400 text-lg leading-relaxed mb-7">
                From a simple phone photo to a professional menu visual in seconds. No photographer, no studio.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900/50 p-3 sm:p-4 flex flex-col">
              <BeforeAfterSlider
                beforeSrc="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/new-landing/before_breakfast.jpg"
                afterSrc="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/new-landing/after_breakfast.jpg"
                label=""
                sublabel=""
                imageHeightClass="h-[360px] sm:h-[470px] lg:h-[520px]"
              />
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsPhotoTestModalOpen(true)}
                  className="flex items-center justify-center gap-2 w-full max-w-[320px] h-14 px-5 bg-violet-600 hover:bg-violet-500 border border-violet-400/40 text-white font-bold text-[1.01rem] rounded-xl transition-colors shadow-[0_0_0_1px_rgba(139,92,246,0.35),0_0_35px_rgba(139,92,246,0.35)]"
                >
                  <Sparkles size={17} />
                  Test With Your Photo
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 lg:grid-cols-1 gap-3 lg:gap-5">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6">
                <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5"><Sparkles size={12} /> Texture Boost</p>
                <p className="text-white font-semibold text-base">Sharper details on crusts, layers, and sauces.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6">
                <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5"><Sparkles size={12} /> Color Balance</p>
                <p className="text-white font-semibold text-base">Natural tones with premium restaurant mood lighting.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-6">
                <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5"><Sparkles size={12} /> Feed Ready</p>
                <p className="text-white font-semibold text-base">Optimized framing for a stronger mobile first impression.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BEFORE/AFTER GRID ────────────────────────────────────────────────── */}
      <section className="pt-16 pb-20 sm:pt-24 sm:pb-28 lg:pt-28 lg:pb-36 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-orange-500 text-sm font-bold uppercase tracking-widest mb-4">Real Results</p>
            <h2 className="text-4xl sm:text-5xl font-black mb-3 leading-tight text-white">
              This is what your customers <span className="text-orange-500">see today...</span>
            </h2>
            <p className="text-4xl sm:text-5xl font-black text-white leading-tight">
              This is what they could <span className="text-orange-500">see instead.</span>
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-7">
            {baItems.map((item) => (
              <BeforeAfterSlider key={item.label} {...item} />
            ))}
          </div>
          <div className="text-center mt-14">
            <button
              type="button"
              onClick={() => setIsPhotoTestModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 h-12 px-6 bg-violet-600 hover:bg-violet-500 border border-violet-400/40 text-white font-bold rounded-xl transition-colors shadow-[0_0_0_1px_rgba(139,92,246,0.35),0_0_35px_rgba(139,92,246,0.35)]"
            >
              <Sparkles size={17} />
              Test Demo
            </button>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="pt-16 pb-20 sm:pt-24 sm:pb-28 lg:pt-28 lg:pb-36 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-orange-500 text-sm font-bold uppercase tracking-[0.22em] mb-3">Simple as 1-2-3</p>
            <h2 className="text-4xl sm:text-5xl font-black mb-2">How <span className="text-orange-500">MenuLove™</span> Photo Enhancement works</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 md:gap-8">
            {steps.map(({ num, Icon, title, desc }, index) => (
              <div key={num} className="relative">
                {index > 0 && (
                  <ArrowRight size={30} className="hidden md:block absolute -left-5 lg:-left-6 top-1/2 -translate-y-1/2 text-zinc-500" />
                )}
                <div className="h-full min-h-[300px] p-8 sm:p-10 bg-[#07090d] border border-orange-500/25 rounded-[24px] shadow-[0_0_0_1px_rgba(249,115,22,0.08),0_12px_28px_rgba(249,115,22,0.14),inset_0_1px_0_rgba(255,255,255,0.03)] text-center md:text-left">
                  <div className="w-10 h-10 rounded-full bg-orange-500 text-white font-black flex items-center justify-center text-lg mb-7 mx-auto md:mx-0">{num}</div>
                  <div className="mb-7 flex justify-center md:justify-start">
                    <Icon className="text-orange-400" size={44} strokeWidth={1.75} />
                  </div>
                  <h3 className="text-2xl font-black text-white leading-tight mb-3">{title}</h3>
                  <p className="text-zinc-400 text-base leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xl sm:text-2xl font-normal text-zinc-300 mt-12 tracking-[0.01em]">
            <span className="text-orange-500 font-black">NO</span> photographer. <span className="text-orange-500 font-black">NO</span> studio. <span className="text-orange-500 font-black">NO</span> complexity.
          </p>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 sm:py-28 lg:py-36 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-orange-500 text-sm font-bold uppercase tracking-widest mb-4">Choose your plan</p>
            <h2 className="text-4xl sm:text-5xl font-black mb-4">Simple, transparent pricing</h2>
            <p className="text-zinc-400 text-lg">Start free. Upgrade when you're ready. Cancel anytime.</p>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-9 rounded-3xl flex flex-col ${
                  plan.highlight
                    ? 'bg-orange-500 border border-orange-400'
                    : 'bg-zinc-900 border border-white/10'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-orange-600 text-xs font-black px-4 py-1 rounded-full shadow-lg whitespace-nowrap">
                    Most popular
                  </div>
                )}
                <p className={`text-sm font-bold uppercase tracking-wider mb-4 ${plan.highlight ? 'text-orange-100' : 'text-zinc-400'}`}>
                  {plan.name}
                </p>
                <div className="mb-6 flex items-end gap-1">
                  <span className={`text-5xl font-black ${plan.highlight ? 'text-white' : 'text-white'}`}>{plan.price}</span>
                  {plan.period && <span className={`mb-1 ${plan.highlight ? 'text-orange-200' : 'text-zinc-400'}`}>{plan.period}</span>}
                </div>
                <ul className={`space-y-3 text-sm flex-1 mb-8 ${plan.highlight ? 'text-orange-100' : 'text-zinc-400'}`}>
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle2 size={14} className={`flex-shrink-0 ${plan.highlight ? 'text-white' : 'text-orange-500'}`} />
                      {f.endsWith('!') ? (
                        <span className="inline-flex items-center gap-2">
                          <span>{f.replace('!', '')}</span>
                          <span className="relative group inline-flex">
                            <span
                              className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-black cursor-help ${plan.highlight ? 'bg-white text-orange-600' : 'bg-orange-500/20 text-orange-400 border border-orange-500/40'}`}
                              aria-label="More info"
                            >
                              !
                            </span>
                            <span className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] -translate-x-1/2 z-20 w-[250px] rounded-xl border border-white/10 bg-[#0b111b] px-3 py-2 text-[11px] font-medium leading-relaxed text-zinc-200 opacity-0 invisible transition-all duration-150 group-hover:opacity-100 group-hover:visible">
                              {f.includes('30 AI')
                                ? '1 AI photo enhancement uses 1 credit. 30 credits = up to 30 edits/month. Need more? Add +50 extra credits for the current billing cycle.'
                                : '1 AI photo enhancement uses 1 credit. 100 credits = up to 100 edits/month. Need more? Add +50 extra credits for the current billing cycle.'}
                            </span>
                          </span>
                        </span>
                      ) : (
                        f
                      )}
                    </li>
                  ))}
                </ul>
                <a
                  href={plan.href}
                  className={`block text-center py-3 font-bold rounded-xl transition-colors ${
                    plan.highlight
                      ? 'bg-white text-orange-600 hover:bg-orange-50'
                      : 'border border-white/20 text-white hover:border-orange-500/50 hover:bg-white/5'
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
            <div className="p-9 rounded-3xl bg-zinc-900 border border-white/10">
              <h3 className="text-4xl font-black leading-[1.05] mb-4">Use your existing checkout.</h3>
              <p className="text-zinc-400 text-base leading-relaxed mb-6">
                Connect your current ordering or payment system in just a few clicks.
                No need to change what already works.
              </p>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Lightspeed</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Clover</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Square & more</li>
              </ul>
            </div>
          </div>
          <p className="text-center text-zinc-500 text-sm mt-10">
            14-day free trial included on all plans · No credit card required · Cancel anytime
          </p>
        </div>
      </section>


      <div id="signup-form" className="h-0" />

      {/* ── PROOF + CTA BLOCK ───────────────────────────────────────────────── */}
      <section className="pt-6 pb-14 sm:pt-8 sm:pb-20 lg:pb-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-5">
          <div className="rounded-[24px] border border-orange-500/25 bg-[radial-gradient(circle_at_18%_20%,rgba(249,115,22,0.12),transparent_45%),linear-gradient(120deg,#0a101b_0%,#090b12_56%,#0d1626_100%)] px-6 py-7 sm:px-9 sm:py-8 shadow-[0_0_0_1px_rgba(249,115,22,0.08),0_12px_34px_rgba(0,0,0,0.45)]">
            <div className="grid lg:grid-cols-[1.15fr_auto_1.3fr] items-center gap-5 sm:gap-7">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0 mt-1">
                  <BarChart3 size={23} className="text-orange-400" />
                </div>
                <div>
                  <p className="text-zinc-200 text-2xl sm:text-3xl font-semibold leading-tight">Average increase in</p>
                  <p className="text-orange-500 text-5xl sm:text-6xl font-black leading-none my-1 sm:my-2">73%</p>
                  <p className="text-zinc-300 text-sm sm:text-lg leading-snug max-w-xl">
                    menu views and cross-item interest from customers exploring more dishes.
                  </p>
                </div>
              </div>

              <div className="hidden lg:block w-px h-24 bg-white/15" />

              <div className="flex items-center gap-3 sm:gap-4">
                <img
                  src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/new-landing/joao.jpg"
                  alt="Joao Packer"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-orange-400/65 shadow-[0_0_16px_rgba(249,115,22,0.4)]"
                />
                <div>
                  <div className="flex items-center gap-1 text-amber-400 mb-1.5">
                    {[...Array(5)].map((_, i) => <Star key={`cta-proof-star-${i}`} size={12} fill="currentColor" />)}
                  </div>
                  <p className="text-zinc-100 text-sm sm:text-base leading-relaxed">
                    “The guest experience has changed completely. Customers now explore more dishes, share the menu, and engage more with what we offer.”
                  </p>
                  <p className="text-zinc-300 text-xs sm:text-sm mt-1.5 font-semibold">Joao Packer · Backstreet Cafe owner</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── FULL-WIDTH CTA BANNER ────────────────────────────────────────────── */}
      <section className="bg-[radial-gradient(ellipse_at_80%_50%,rgba(249,115,22,0.22),transparent_42%),linear-gradient(108deg,#080b10_0%,#09090f_52%,#0b1020_100%)] pb-14 sm:pb-20 lg:pb-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center lg:items-end justify-center gap-8 lg:gap-10">
            <div className="order-2 lg:order-1 shrink-0 w-[220px] sm:w-[260px] lg:w-[320px]">
              <img
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/new-landing/mockup%20haf2.png"
                alt="MenuLove™ mobile menu preview"
                className="w-full object-contain block"
              />
            </div>

            <div className="order-1 lg:order-2 w-full max-w-[560px] px-1 sm:px-6 lg:px-2 pb-0 lg:pb-16 pt-6 lg:pt-14 text-center lg:text-left">
              <h3 className="text-4xl sm:text-5xl font-black leading-[1.05] mb-5">
                Ready to make
                <span className="block text-orange-500">your menu</span>
                <span className="block text-orange-500">irresistible?</span>
              </h3>
              <p className="text-zinc-300 text-base sm:text-lg leading-relaxed max-w-md mx-auto lg:mx-0 mb-7">
                Join restaurants creating a stronger visual experience that keeps customers exploring and engaging with more menu items.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <a
                  href="/live-examples"
                  className="inline-flex items-center justify-center gap-2 h-12 px-7 bg-orange-500 hover:bg-orange-400 text-white font-bold text-base rounded-xl transition-colors"
                >
                  See Live Example <ArrowRight size={16} />
                </a>
                <a
                  href="/partner"
                  className="inline-flex items-center justify-center gap-2 h-12 px-7 border border-white/25 hover:border-orange-400/60 hover:bg-white/5 text-white font-bold text-base rounded-xl transition-colors"
                >
                  Start FREE <ArrowRight size={16} />
                </a>
              </div>
            </div>

            <div className="hidden lg:flex lg:order-3 items-center justify-center self-center shrink-0 w-24">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-orange-500/55 blur-3xl scale-[2.6]" />
                <div className="relative w-[92px] h-[92px] rounded-full bg-orange-500/15 border border-orange-300/55 flex items-center justify-center shadow-[0_0_50px_rgba(249,115,22,0.85)]">
                  <Play size={34} className="text-white fill-white ml-1" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="bg-zinc-900/70 border-t border-white/5 text-white py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 md:gap-12 mb-12 md:mb-14">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <img
                  src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/icon.png"
                  alt="MenuLove™"
                  className="w-8 h-8 rounded-lg"
                />
                <span className="text-2xl font-black">MenuLove™</span>
              </div>
              <p className="text-zinc-400 text-sm">Video Menus & Smart Ordering</p>
            </div>

            <div className="text-center md:text-left">
              <h4 className="font-bold text-sm uppercase tracking-wider text-zinc-300 mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li><a href="/partner" className="hover:text-white transition-colors">For Restaurants</a></li>
                <li><a href="/partner" className="hover:text-white transition-colors">Partner Portal</a></li>
                <li><a href="/affiliate-program" className="hover:text-white transition-colors">Affiliate Program</a></li>
                <li><a href="/contact" className="hover:text-white transition-colors">Contact Us</a></li>
              </ul>
            </div>

            <div className="text-center md:text-left">
              <h4 className="font-bold text-sm uppercase tracking-wider text-zinc-300 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-zinc-400">
                <li><a href="/faq" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8">
            <div className="max-w-3xl mx-auto text-center space-y-3">
              <p className="text-zinc-400 text-sm leading-relaxed">
                <span className="text-orange-500 font-bold">Beta Version:</span> MenuLove™ is currently in beta testing. We're working hard to deliver the best experience for Australian restaurants. Your feedback helps us improve and build the perfect platform for showcasing your culinary creations. Join us in revolutionizing how restaurants connect with customers through video menus.
              </p>
              <p className="text-zinc-500 text-sm">
                If you have any questions, feel free to <a href="/contact" className="text-orange-400 hover:text-orange-300 transition-colors font-medium">contact us here</a>.
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 mt-6 pt-6 text-center text-sm">
            <p className="text-zinc-400">MenuLove™ - Video Menus & Smart Ordering</p>
            <p className="text-zinc-500 mt-1">
              Built with <span className="text-orange-500">🧡</span> in Australia | <a href="mailto:contact@menulove.com.au" className="text-orange-500 hover:text-orange-400 transition-colors">contact@menulove.com.au</a>
            </p>
            <p className="text-zinc-500 mt-1">All rights reserved.</p>
          </div>
        </div>
      </footer>

      {isPhotoTestModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-5xl mx-auto my-8 bg-zinc-900 border border-orange-500/25 rounded-3xl shadow-[0_0_55px_rgba(249,115,22,0.28),0_30px_90px_rgba(0,0,0,0.65)]">
            <div className="flex items-start justify-between gap-6 p-6 sm:p-8 border-b border-white/10">
              <div>
                <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-2">Live photo test</p>
                <h3 className="text-2xl sm:text-3xl font-black text-white">See how your dish looks with AI enhancement</h3>
                <p className="text-zinc-400 mt-2 text-sm sm:text-base">Upload a real photo from your phone and preview the before/after result without leaving this page. The enhancement improves quality while preserving your original dish.</p>
              </div>
              <button
                type="button"
                onClick={resetPhotoTestModal}
                className="shrink-0 px-4 py-2 rounded-xl border border-white/15 text-zinc-300 hover:text-white hover:border-white/30 transition-colors"
              >
                Close
              </button>
            </div>

            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-6">
                <div className="text-sm text-zinc-400">
                  Best results: bright photo, food centered, no heavy blur.
                  {didUpscaleLowResPhoto && <span className="block text-orange-400 mt-1">Low-resolution photo detected. We auto-adjusted it before enhancement.</span>}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
                  <input
                    ref={photoTestInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoTestSelection(file);
                    }}
                  />
                  <input
                    ref={photoTestCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoTestSelection(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => photoTestInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-colors"
                  >
                    <CloudUpload size={16} />
                    {testOriginalImage ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => photoTestCameraInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-colors"
                  >
                    <Camera size={16} />
                    Use Camera
                  </button>
                </div>
              </div>

              {selectedPhotoName && (
                <p className="text-zinc-500 text-sm mb-4">Selected: {selectedPhotoName}</p>
              )}

              {photoTestError && (
                <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 px-4 py-3 text-sm">
                  {photoTestError}
                </div>
              )}

              {!testOriginalImage && (
                <div className="rounded-2xl border border-dashed border-white/20 bg-black/30 px-6 py-14 text-center">
                  <p className="text-white font-semibold mb-2">Upload a food or drink photo to start</p>
                  <p className="text-zinc-400 text-sm">JPG, PNG or WEBP · up to 10MB</p>
                </div>
              )}

              {testOriginalImage && !testEnhancedImage && (
                <div className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black">
                      <img src={testOriginalImage} alt="Uploaded preview" className="w-full h-[300px] sm:h-[420px] object-contain" />
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
                        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white/80 bg-black/50 border border-white/20 rounded-lg px-2.5 py-1">Preview · MenuLove™ AI</span>
                      </div>
                    </div>
                    <div className="relative rounded-2xl overflow-hidden border border-orange-500/35 bg-black/70 flex items-center justify-center h-[300px] sm:h-[420px]">
                      <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-orange-400/25 to-transparent animate-[aiShimmer_1.8s_linear_infinite]" />
                      </div>
                      <div className="relative z-10 text-center px-6">
                        <div className="w-20 h-20 mx-auto rounded-full border border-orange-400/50 bg-orange-500/10 flex items-center justify-center animate-[aiPulse_1.8s_ease-in-out_infinite]">
                          <Sparkles size={28} className="text-orange-300" />
                        </div>
                        <p className="mt-5 text-white font-bold text-lg">AI is processing your photo</p>
                        <p className="text-zinc-400 text-sm mt-1">{aiProgress < 60 ? 'Analysing dish, light and texture…' : aiProgress < 80 ? 'Applying AI enhancement…' : 'Finalising your image…'}</p>
                        <div className="mt-5 w-full max-w-[240px] mx-auto h-2.5 rounded-full bg-white/10 overflow-hidden border border-white/10">
                          <div className="h-full bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 transition-all duration-500" style={{ width: `${aiProgress}%` }} />
                        </div>
                        <p className="mt-2 text-orange-300 font-bold">{aiProgress}%</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={runPhotoTestEnhancement}
                      disabled={isEnhancingTestImage}
                      className="inline-flex items-center justify-center gap-2 h-12 px-6 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors shadow-[0_0_0_1px_rgba(249,115,22,0.35),0_0_40px_rgba(249,115,22,0.7),0_0_88px_rgba(249,115,22,0.4)]"
                    >
                      <Sparkles size={18} />
                      {isEnhancingTestImage ? `Enhancing... ${aiProgress}%` : 'Run AI Enhancement'}
                    </button>
                  </div>
                </div>
              )}

              {testOriginalImage && testEnhancedImage && (
                <div className="space-y-5">
                  <div className="flex justify-center">
                    <div className="relative inline-block">
                      <BeforeAfterSlider
                        beforeSrc={testOriginalImage}
                        afterSrc={testEnhancedImage}
                        label=""
                        sublabel=""
                        imageHeightClass="h-[300px] sm:h-[420px] w-auto"
                        imageFitClass="object-cover"
                        imageAspectRatio={testImageAspectRatio ?? undefined}
                        containerClassName="inline-block"
                      />
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
                        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white/80 bg-black/50 border border-white/20 rounded-lg px-2.5 py-1">Demo Result · MenuLove™ AI</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={restartPhotoTestFlow}
                      disabled={isEnhancingTestImage}
                      className="inline-flex items-center justify-center gap-2 h-12 px-6 bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
                    >
                      <Sparkles size={18} />
                      Try Again
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPhotoTestModalOpen(false);
                        scrollToForm();
                      }}
                      className="inline-flex items-center justify-center gap-2 h-12 px-6 bg-orange-500 hover:bg-orange-400 text-white font-bold rounded-xl transition-colors"
                    >
                      Start Free <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <LoveBotChat />
      <PromoPopup />
    </div>
  );
};

export default PartnerLandingPage;
