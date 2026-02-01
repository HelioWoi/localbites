import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  LogOut, Plus, Play, Trash2, Eye, Heart, MapPin,
  Loader2, X, Upload, Check, Settings, BarChart3,
  Video, Crown, AlertCircle, ChevronRight, Calendar,
  TrendingUp, Clock, Edit2, Save, QrCode, Copy, ExternalLink, Menu, Camera, Image, Star, CreditCard
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PartnerUser } from './PartnerPortal';
import SubscriptionManager from './SubscriptionManager';

interface PartnerDashboardProps {
  user: PartnerUser;
  onLogout: () => void;
}

interface DishVideo {
  id: string;
  name: string;
  video_url: string;
  thumbnail_url?: string;
  views?: number;
  created_at?: string;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  video_url: string;
  thumbnail_url?: string;
  price?: number;
  sort_order: number;
  is_active: boolean;
  is_featured?: boolean;
}

interface PartnerData {
  id: string;
  restaurant_name?: string;
  slug?: string;
  cuisine?: string;
  address?: string;
  phone?: string;
  logo_url?: string;
  photo_url?: string;
  website?: string;
}

interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  address?: string;
  main_photo_url?: string;
}

type Tab = 'overview' | 'menu' | 'analytics' | 'subscription' | 'settings';

const PartnerDashboard: React.FC<PartnerDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [videos, setVideos] = useState<DishVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ views: 0, saves: 0, clicks: 0 });
  
  // Partner data (for menu items)
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Menu upload state
  const [showMenuUploadModal, setShowMenuUploadModal] = useState(false);
  const [menuItemName, setMenuItemName] = useState('');
  const [menuItemCategory, setMenuItemCategory] = useState('');
  const [menuItemDescription, setMenuItemDescription] = useState('');
  const [menuItemPrice, setMenuItemPrice] = useState('');
  const [newCategory, setNewCategory] = useState('');
  
  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Video preview state
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);

  // Settings state
  const [editingRestaurant, setEditingRestaurant] = useState(false);
  const [restaurantForm, setRestaurantForm] = useState({ name: '', cuisine: '', address: '', phone: '', website: '' });
  
  // Photo upload state
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Trial calculation
  const trialDaysLeft = user.trial_ends_at 
    ? Math.max(0, Math.ceil((new Date(user.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const isTrialActive = user.plan === 'trial' && trialDaysLeft > 0;
  const maxVideos = user.plan === 'pro' ? Infinity : 5;

  useEffect(() => {
    console.log('PartnerDashboard mounted, loading data...');
    loadData();
  }, []);

  const loadData = async () => {
    console.log('loadData started');
    try {
      // Load partner data
      const { data: partner, error: partnerError } = await supabase
        .from('partners')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      console.log('Partner loaded:', partner, partnerError);

      let currentPartner = partner;

      // If no partner exists, create one
      if (!currentPartner) {
        console.log('No partner found, creating one...');
        const trialEnds = new Date();
        trialEnds.setDate(trialEnds.getDate() + 14);

        const { data: newPartner, error: createError } = await supabase
          .from('partners')
          .insert({
            user_id: user.id,
            email: user.email,
            plan: 'trial',
            trial_ends_at: trialEnds.toISOString(),
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating partner:', createError);
        } else {
          console.log('Partner created:', newPartner);
          currentPartner = newPartner;
        }
      }

      if (currentPartner) {
        setPartnerData(currentPartner);
        setRestaurantForm({ 
          name: currentPartner.restaurant_name || '', 
          cuisine: currentPartner.cuisine || '', 
          address: currentPartner.address || '',
          phone: currentPartner.phone || '',
          website: currentPartner.website || ''
        });

        // Load menu items
        const { data: items, error: itemsError } = await supabase
          .from('menu_items')
          .select('*')
          .eq('partner_id', currentPartner.id)
          .order('category')
          .order('sort_order');

        console.log('Menu items loaded:', items, itemsError);

        if (items) {
          setMenuItems(items);
          const cats = [...new Set(items.map(i => i.category))].filter(Boolean);
          setCategories(cats);
        }
      }

      // Load stats (mock for now)
      setStats({
        views: Math.floor(Math.random() * 2000) + 500,
        saves: Math.floor(Math.random() * 150) + 30,
        clicks: Math.floor(Math.random() * 300) + 50,
      });
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      console.log('loadData finished, setting isLoading false');
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadPreview(URL.createObjectURL(file));
      setShowMenuUploadModal(true);
    }
  };

  const handleSaveRestaurant = async () => {
    if (!partnerData) return;

    try {
      // Generate slug from restaurant name
      const slug = restaurantForm.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const { error } = await supabase
        .from('partners')
        .update({
          restaurant_name: restaurantForm.name,
          cuisine: restaurantForm.cuisine,
          address: restaurantForm.address,
          phone: restaurantForm.phone,
          website: restaurantForm.website,
          slug: slug,
        })
        .eq('id', partnerData.id);

      if (error) {
        console.error('Save error:', error);
        alert('Error saving: ' + error.message);
        return;
      }

      setPartnerData({ ...partnerData, restaurant_name: restaurantForm.name, cuisine: restaurantForm.cuisine, address: restaurantForm.address, phone: restaurantForm.phone, website: restaurantForm.website, slug });
      setEditingRestaurant(false);
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  // Menu item handlers
  const handleMenuUpload = async () => {
    if (!uploadFile || !menuItemName.trim() || !partnerData) return;

    // Determine the final category name
    const finalCategory = menuItemCategory === '__new__' ? newCategory.trim() : menuItemCategory.trim();
    
    if (!finalCategory) return;

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (uploadFile.size > maxSize) {
      alert('Video must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const fileName = `${partnerData.id}/${Date.now()}-${uploadFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      setUploadProgress(30);

      const { error: uploadError } = await supabase.storage
        .from('menu-videos')
        .upload(fileName, uploadFile);

      if (uploadError) throw uploadError;
      setUploadProgress(70);

      const { data: { publicUrl } } = supabase.storage
        .from('menu-videos')
        .getPublicUrl(fileName);

      const { data: item, error: itemError } = await supabase
        .from('menu_items')
        .insert({
          partner_id: partnerData.id,
          name: menuItemName.trim(),
          category: finalCategory,
          description: menuItemDescription.trim() || null,
          price: menuItemPrice ? parseFloat(menuItemPrice) : null,
          video_url: publicUrl,
          sort_order: menuItems.filter(i => i.category === finalCategory).length,
        })
        .select()
        .single();

      if (itemError) throw itemError;
      setUploadProgress(100);

      setMenuItems([...menuItems, item]);
      if (!categories.includes(finalCategory)) {
        setCategories([...categories, finalCategory]);
      }
      
      setTimeout(() => {
        resetMenuUploadModal();
      }, 800);

    } catch (error: any) {
      console.error('Menu upload error:', error);
      alert('Upload failed: ' + error.message);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const resetMenuUploadModal = () => {
    setShowMenuUploadModal(false);
    setUploadFile(null);
    setUploadPreview(null);
    setMenuItemName('');
    setMenuItemCategory('');
    setMenuItemDescription('');
    setMenuItemPrice('');
    setNewCategory('');
    setUploadProgress(0);
  };

  const handleDeleteMenuItem = async (itemId: string) => {
    if (!confirm('Delete this menu item? This cannot be undone.')) return;

    try {
      await supabase.from('menu_items').delete().eq('id', itemId);
      setMenuItems(menuItems.filter(i => i.id !== itemId));
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleToggleFeatured = async (itemId: string) => {
    if (!partnerData) return;

    try {
      const item = menuItems.find(i => i.id === itemId);
      const newFeaturedState = !item?.is_featured;

      // If setting as featured, unset all other featured items first
      if (newFeaturedState) {
        const updates = menuItems
          .filter(i => i.is_featured && i.id !== itemId)
          .map(i => 
            supabase.from('menu_items').update({ is_featured: false }).eq('id', i.id)
          );
        await Promise.all(updates);
      }

      // Update the selected item
      const { error } = await supabase
        .from('menu_items')
        .update({ is_featured: newFeaturedState })
        .eq('id', itemId);

      if (error) throw error;

      // Update local state
      setMenuItems(menuItems.map(i => ({
        ...i,
        is_featured: i.id === itemId ? newFeaturedState : false
      })));
    } catch (error) {
      console.error('Toggle featured error:', error);
      alert('Failed to update cover video');
    }
  };

  // Photo upload handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !partnerData) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB');
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const fileName = `${partnerData.id}/photo-${Date.now()}.${file.name.split('.').pop()}`;

      const { error: uploadError } = await supabase.storage
        .from('menu-videos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('menu-videos')
        .getPublicUrl(fileName);

      // Update partner with photo URL
      const { error: updateError } = await supabase
        .from('partners')
        .update({ photo_url: publicUrl })
        .eq('id', partnerData.id);

      if (updateError) throw updateError;

      setPartnerData({ ...partnerData, photo_url: publicUrl });
    } catch (error: any) {
      console.error('Photo upload error:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const copyMenuLink = () => {
    if (partnerData?.slug) {
      const url = `${window.location.origin}/r/${partnerData.slug}`;
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <Loader2 size={32} className="text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 partner-portal">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">LB</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">
                  Welcome, {user.email?.split('@')[0] || 'Partner'}
                </p>
                <p className="text-xs text-zinc-500">{partnerData?.restaurant_name || 'Partner Portal'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Plan badge */}
              {user.plan === 'pro' ? (
                <span className="hidden sm:flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full">
                  <Crown size={12} /> PRO
                </span>
              ) : isTrialActive ? (
                <span className="hidden sm:flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                  <Clock size={12} /> {trialDaysLeft} days left
                </span>
              ) : null}

              <button
                onClick={() => setActiveTab('settings')}
                className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings size={18} />
              </button>
              <button
                onClick={onLogout}
                className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Trial/Upgrade Banner */}
      {user.plan === 'trial' && (
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isTrialActive ? (
                <>
                  <Calendar size={16} />
                  <span className="text-sm font-medium">Trial: {trialDaysLeft} days remaining</span>
                </>
              ) : (
                <>
                  <AlertCircle size={16} />
                  <span className="text-sm font-medium">Your trial has ended</span>
                </>
              )}
            </div>
            <button className="px-4 py-1.5 bg-white text-orange-600 text-sm font-bold rounded-lg hover:bg-orange-50 transition-colors">
              Upgrade to Pro
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <nav className="flex gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'menu', label: 'Menu', icon: Menu },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
              { id: 'subscription', label: 'Subscription', icon: CreditCard },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-20">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 border border-zinc-200">
                <div className="flex items-center gap-2 text-zinc-500 mb-2">
                  <Eye size={16} />
                  <span className="text-xs font-medium">Views</span>
                </div>
                <p className="text-2xl font-bold text-zinc-900">{stats.views.toLocaleString()}</p>
                <p className="text-xs text-emerald-600 font-medium mt-1">+12% this week</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-zinc-200">
                <div className="flex items-center gap-2 text-zinc-500 mb-2">
                  <Heart size={16} />
                  <span className="text-xs font-medium">Saves</span>
                </div>
                <p className="text-2xl font-bold text-zinc-900">{stats.saves}</p>
                <p className="text-xs text-emerald-600 font-medium mt-1">+8% this week</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-zinc-200">
                <div className="flex items-center gap-2 text-zinc-500 mb-2">
                  <MapPin size={16} />
                  <span className="text-xs font-medium">Directions</span>
                </div>
                <p className="text-2xl font-bold text-zinc-900">{stats.clicks}</p>
                <p className="text-xs text-emerald-600 font-medium mt-1">+23% this week</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <h3 className="text-sm font-semibold text-zinc-900 mb-4">Quick Actions</h3>
              <button
                onClick={() => { setActiveTab('menu'); setShowMenuUploadModal(true); }}
                className="flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors w-full"
              >
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Upload size={18} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-zinc-900">Add Menu Video</p>
                  <p className="text-xs text-zinc-500">{menuItems.length} items uploaded</p>
                </div>
              </button>
            </div>

            {/* Recent Videos */}
            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-zinc-900">Your Videos</h3>
                <button
                  onClick={() => setActiveTab('menu')}
                  className="text-xs text-orange-500 font-semibold flex items-center gap-1 hover:underline"
                >
                  View all <ChevronRight size={14} />
                </button>
              </div>
              {menuItems.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {menuItems.slice(0, 4).map((item) => (
                    <div 
                      key={item.id} 
                      className="relative aspect-square bg-zinc-100 rounded-lg overflow-hidden cursor-pointer"
                      onClick={() => setPreviewVideo(item.video_url)}
                    >
                      <video src={item.video_url} className="w-full h-full object-cover" muted />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                        <p className="text-white text-xs font-medium truncate">{item.name}</p>
                      </div>
                      <div className="absolute top-2 left-2 w-6 h-6 bg-black/40 rounded-full flex items-center justify-center">
                        <Play size={10} className="text-white" fill="currentColor" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Video size={32} className="text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">No videos yet</p>
                  <button
                    onClick={() => { setActiveTab('menu'); setShowMenuUploadModal(true); }}
                    className="mt-3 text-sm text-orange-500 font-semibold hover:underline"
                  >
                    Add your first menu video
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Menu Tab - QR Code Menu Items */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            {/* QR Code Link Section */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-5 text-white">
              <div className="flex items-start gap-4">
                {/* QR Code - Left */}
                <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
                  <QrCode size={52} className="text-orange-500" />
                </div>
                
                {/* Content - Right */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold mb-1">Your Menu Link</h2>
                  <p className="text-white/80 text-xs mb-3">Share this link or QR code with your customers</p>
                  {partnerData?.slug ? (
                    <div className="flex items-center gap-2">
                      <code className="bg-white/20 px-2 py-1.5 rounded-lg text-xs font-mono truncate flex-1">
                        {window.location.origin}/r/{partnerData.slug}
                      </code>
                      <button onClick={copyMenuLink} className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors flex-shrink-0">
                        <Copy size={14} />
                      </button>
                      <a 
                        href={`/r/${partnerData.slug}`} 
                        target="_blank" 
                        className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors flex-shrink-0"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  ) : (
                    <p className="text-white/60 text-xs">Save your restaurant name in Settings to get your link</p>
                  )}
                </div>
              </div>
            </div>

            {/* Feed Cover Info */}
            {menuItems.length > 0 && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 sm:p-5 border-2 border-amber-300">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Star size={20} className="text-white sm:w-6 sm:h-6" fill="white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-zinc-900 mb-2">
                      Choose Your Feed Cover Video
                    </h3>
                    <div className="space-y-2">
                      <p className="text-sm text-zinc-700 leading-relaxed">
                        <strong>Click the star button</strong> <span className="inline-flex items-center justify-center w-6 h-6 bg-black/60 rounded-full mx-1"><Star size={12} className="text-white" /></span> on any video below to set it as your <strong>feed cover</strong>.
                      </p>
                      <p className="text-xs text-zinc-600">
                        💡 This video will appear <strong>first</strong> when users discover your restaurant in the LocalBites feed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Add Menu Item */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Menu Videos</h2>
                <p className="text-sm text-zinc-500">{menuItems.length} items • {categories.length} categories</p>
              </div>
              <button
                onClick={() => setShowMenuUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
              >
                <Plus size={18} />
                Add Item
              </button>
            </div>

            {/* Menu Items by Category */}
            {categories.length > 0 ? (
              <div className="space-y-6">
                {categories.map(category => (
                  <div key={category} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                    <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-200">
                      <h3 className="font-semibold text-zinc-900">{category}</h3>
                      <p className="text-xs text-zinc-500">{menuItems.filter(i => i.category === category).length} items</p>
                    </div>
                    <div className="p-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {menuItems.filter(i => i.category === category).map(item => (
                        <div key={item.id} className="relative group">
                          <div 
                            className="aspect-square bg-zinc-100 rounded-xl overflow-hidden cursor-pointer"
                            onClick={() => setPreviewVideo(item.video_url)}
                          >
                            <video src={item.video_url} className="w-full h-full object-cover" muted />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
                                <Play size={20} className="text-white ml-1" fill="white" />
                              </div>
                            </div>
                            {/* Featured badge - always visible if featured */}
                            {item.is_featured && (
                              <div className="absolute top-2 left-2 px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center gap-1 shadow-lg z-10">
                                <Star size={12} className="text-white" fill="white" />
                                <span className="text-white text-[10px] font-bold">FEED COVER</span>
                              </div>
                            )}
                            
                            {/* Action buttons - ALWAYS VISIBLE */}
                            <div className="absolute top-2 right-2 flex gap-2 z-10">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleToggleFeatured(item.id); }}
                                className={`p-2 rounded-full text-white transition-all shadow-lg ${item.is_featured ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600' : 'bg-black/60 hover:bg-black/80 backdrop-blur-sm'}`}
                                title={item.is_featured ? 'Remove from feed cover' : 'Set as feed cover'}
                              >
                                <Star size={14} fill={item.is_featured ? 'white' : 'none'} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteMenuItem(item.id); }}
                                className="p-2 bg-red-500/90 backdrop-blur-sm rounded-full text-white hover:bg-red-600 transition-colors shadow-lg"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            
                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                              <p className="text-white font-semibold text-sm truncate">{item.name}</p>
                              {item.price && <p className="text-white/70 text-xs">${item.price.toFixed(2)}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl border border-zinc-200">
                <Video size={48} className="text-zinc-300 mx-auto mb-3" />
                <p className="text-zinc-500 mb-1">No menu items yet</p>
                <p className="text-sm text-zinc-400 mb-4">Add your first menu video to create your digital menu</p>
                <button
                  onClick={() => setShowMenuUploadModal(true)}
                  className="px-4 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Add First Item
                </button>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-zinc-900">Analytics</h2>
            
            {user.plan !== 'pro' ? (
              <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center">
                <Crown size={48} className="text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-zinc-900 mb-2">Unlock Full Analytics</h3>
                <p className="text-zinc-500 mb-6 max-w-md mx-auto">
                  Upgrade to Pro to see which videos are most liked, views per item, directions clicks, and conversion tracking.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 opacity-50">
                  <div className="bg-zinc-50 rounded-xl p-4 text-center">
                    <Eye size={24} className="text-zinc-400 mx-auto mb-2" />
                    <p className="text-xs text-zinc-500">Views per video</p>
                  </div>
                  <div className="bg-zinc-50 rounded-xl p-4 text-center">
                    <Heart size={24} className="text-zinc-400 mx-auto mb-2" />
                    <p className="text-xs text-zinc-500">Most liked items</p>
                  </div>
                  <div className="bg-zinc-50 rounded-xl p-4 text-center">
                    <MapPin size={24} className="text-zinc-400 mx-auto mb-2" />
                    <p className="text-xs text-zinc-500">Direction clicks</p>
                  </div>
                </div>
                <button className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity">
                  Upgrade to Pro - $29/month
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Pro Analytics - Top performing videos */}
                <div className="bg-white rounded-xl border border-zinc-200 p-5">
                  <h3 className="text-sm font-semibold text-zinc-900 mb-4">Top Performing Videos</h3>
                  {menuItems.length > 0 ? (
                    <div className="space-y-3">
                      {menuItems.slice(0, 5).map((item, idx) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <span className="text-lg font-bold text-zinc-400 w-6">#{idx + 1}</span>
                          <div className="w-12 h-12 bg-zinc-100 rounded-lg overflow-hidden">
                            <video src={item.video_url} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm text-zinc-900">{item.name}</p>
                            <p className="text-xs text-zinc-500">{item.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-zinc-900">{Math.floor(Math.random() * 500) + 100} views</p>
                            <p className="text-xs text-emerald-600">+{Math.floor(Math.random() * 30) + 5}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-sm">Add menu items to see analytics</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Subscription Tab */}
        {activeTab === 'subscription' && partnerData && (
          <SubscriptionManager partnerId={partnerData.id} partnerEmail={user.email} />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-zinc-900">Settings</h2>

            {/* Restaurant Info */}
            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-zinc-900">Restaurant Information</h3>
                {!editingRestaurant && (
                  <button
                    onClick={() => setEditingRestaurant(true)}
                    className="text-xs text-orange-500 font-semibold flex items-center gap-1 hover:underline"
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                )}
              </div>

              {/* Restaurant Photo */}
              <div className="mb-6">
                <label className="block text-xs font-medium text-zinc-500 mb-2">Restaurant Photo</label>
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 bg-zinc-100 rounded-xl overflow-hidden flex-shrink-0">
                    {partnerData?.photo_url ? (
                      <img src={partnerData.photo_url} alt="Restaurant" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image size={32} className="text-zinc-300" />
                      </div>
                    )}
                    {isUploadingPhoto && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 size={24} className="text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="px-4 py-2 bg-zinc-100 text-zinc-700 text-sm font-medium rounded-lg hover:bg-zinc-200 transition-colors flex items-center gap-2"
                    >
                      <Camera size={16} />
                      {partnerData?.photo_url ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    <p className="text-xs text-zinc-400 mt-1">Max 2MB. JPG, PNG</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Restaurant Name</label>
                  {editingRestaurant ? (
                    <input
                      type="text"
                      value={restaurantForm.name}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  ) : (
                    <p className="text-sm text-zinc-900">{partnerData?.restaurant_name || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Cuisine Type</label>
                  {editingRestaurant ? (
                    <input
                      type="text"
                      value={restaurantForm.cuisine}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, cuisine: e.target.value })}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  ) : (
                    <p className="text-sm text-zinc-900">{partnerData?.cuisine || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Address</label>
                  {editingRestaurant ? (
                    <input
                      type="text"
                      value={restaurantForm.address}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, address: e.target.value })}
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  ) : (
                    <p className="text-sm text-zinc-900">{partnerData?.address || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Phone</label>
                  {editingRestaurant ? (
                    <input
                      type="tel"
                      value={restaurantForm.phone}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, phone: e.target.value })}
                      placeholder="+61 4XX XXX XXX"
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  ) : (
                    <p className="text-sm text-zinc-900">{partnerData?.phone || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Website</label>
                  {editingRestaurant ? (
                    <input
                      type="url"
                      value={restaurantForm.website}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, website: e.target.value })}
                      placeholder="https://www.example.com"
                      className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  ) : (
                    <p className="text-sm text-zinc-900">{partnerData?.website || '-'}</p>
                  )}
                </div>
              </div>

              {/* Save Button */}
              {editingRestaurant && (
                <div className="flex gap-3 mt-6 pt-4 border-t border-zinc-100">
                  <button
                    onClick={() => setEditingRestaurant(false)}
                    className="flex-1 py-3 border border-zinc-200 text-zinc-700 font-semibold rounded-xl hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveRestaurant}
                    className="flex-1 py-3 bg-orange-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors"
                  >
                    <Save size={18} />
                    Save Changes
                  </button>
                </div>
              )}
            </div>

            {/* Subscription */}
            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <h3 className="text-sm font-semibold text-zinc-900 mb-4">Subscription</h3>
              
              <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg">
                <div>
                  <p className="font-semibold text-zinc-900">
                    {user.plan === 'pro' ? 'Pro Plan' : 'Trial Plan'}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {user.plan === 'pro' 
                      ? '$29/month • Renews monthly' 
                      : isTrialActive 
                        ? `${trialDaysLeft} days remaining`
                        : 'Trial ended'}
                  </p>
                </div>
                {user.plan !== 'pro' && (
                  <button className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold rounded-lg hover:opacity-90 transition-opacity">
                    Upgrade
                  </button>
                )}
              </div>

              {/* Plan comparison */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg border ${user.plan === 'trial' ? 'border-orange-200 bg-orange-50' : 'border-zinc-200'}`}>
                  <p className="font-semibold text-zinc-900 mb-2">Free</p>
                  <ul className="text-xs text-zinc-600 space-y-1">
                    <li>• Up to 5 videos</li>
                    <li>• Basic stats</li>
                    <li>• 14 days trial</li>
                  </ul>
                </div>
                <div className={`p-4 rounded-lg border ${user.plan === 'pro' ? 'border-amber-300 bg-amber-50' : 'border-zinc-200'}`}>
                  <p className="font-semibold text-zinc-900 mb-2">Pro <span className="text-amber-600">$29/mo</span></p>
                  <ul className="text-xs text-zinc-600 space-y-1">
                    <li>• Unlimited videos</li>
                    <li>• Full analytics</li>
                    <li>• Partner badge</li>
                    <li>• Priority in feed</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Account */}
            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <h3 className="text-sm font-semibold text-zinc-900 mb-4">Account</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Email</label>
                  <p className="text-sm text-zinc-900">{user.email}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Password</label>
                  <button
                    onClick={() => {
                      supabase.auth.resetPasswordForEmail(user.email, {
                        redirectTo: `${window.location.origin}/partner`,
                      });
                      alert('Password reset email sent!');
                    }}
                    className="text-sm text-orange-500 font-medium hover:underline"
                  >
                    Change password
                  </button>
                </div>
                <div className="pt-2 border-t border-zinc-100">
                  <button
                    onClick={onLogout}
                    className="text-sm text-red-500 font-medium hover:underline"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {/* Menu Item Upload Modal */}
      {showMenuUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-zinc-900">Add Menu Item</h2>
              <button onClick={resetMenuUploadModal} className="p-2 text-zinc-400 hover:text-zinc-600 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Video Preview */}
              {uploadPreview ? (
                <div className="relative aspect-[9/16] max-h-64 bg-zinc-900 rounded-xl overflow-hidden mx-auto">
                  <video src={uploadPreview} className="w-full h-full object-contain" controls />
                  <button
                    onClick={() => { setUploadFile(null); setUploadPreview(null); }}
                    className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-[9/16] max-h-64 bg-zinc-100 border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-orange-300 transition-colors"
                >
                  <Upload size={32} className="text-zinc-400" />
                  <p className="text-sm font-medium text-zinc-600">Click to select video</p>
                  <p className="text-xs text-zinc-400">MP4, MOV • Max 10 seconds • Max 5MB</p>
                </button>
              )}
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Item Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={menuItemName}
                  onChange={(e) => setMenuItemName(e.target.value)}
                  placeholder="e.g. Margherita Pizza"
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Category *
                </label>
                {categories.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={menuItemCategory}
                      onChange={(e) => setMenuItemCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select category...</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="__new__">+ Create new category</option>
                    </select>
                    {menuItemCategory === '__new__' && (
                      <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="New category name"
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        autoFocus
                      />
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={menuItemCategory}
                    onChange={(e) => setMenuItemCategory(e.target.value)}
                    placeholder="e.g. Breakfast, Lunch, Drinks"
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                )}
              </div>

              {/* Description (optional) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Description <span className="text-zinc-400">(optional)</span>
                </label>
                <textarea
                  value={menuItemDescription}
                  onChange={(e) => setMenuItemDescription(e.target.value)}
                  placeholder="Brief description of the dish..."
                  rows={2}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>

              {/* Price (optional) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Price <span className="text-zinc-400">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={menuItemPrice}
                    onChange={(e) => setMenuItemPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 pl-8 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Progress */}
              {isUploading && (
                <div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-orange-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-2 text-center">
                    {uploadProgress < 100 ? 'Uploading...' : 'Done!'}
                  </p>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-zinc-100 flex gap-3 sticky bottom-0 bg-white">
              <button
                onClick={resetMenuUploadModal}
                className="flex-1 py-3 border border-zinc-200 text-zinc-700 font-semibold rounded-xl hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMenuUpload}
                disabled={!uploadFile || !menuItemName.trim() || (menuItemCategory === '__new__' ? !newCategory.trim() : !menuItemCategory.trim()) || isUploading}
                className="flex-1 py-3 bg-orange-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors"
              >
                {isUploading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : uploadProgress === 100 ? (
                  <>
                    <Check size={18} />
                    Done!
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    Add Item
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {previewVideo && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewVideo(null)}
        >
          <button 
            onClick={() => setPreviewVideo(null)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full"
          >
            <X size={24} />
          </button>
          <video 
            src={previewVideo} 
            className="max-w-full max-h-[80vh] rounded-xl" 
            controls 
            autoPlay
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default PartnerDashboard;
