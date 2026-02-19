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
import OnboardingModal from './OnboardingModal';
import RestaurantAnalytics from './RestaurantAnalytics';
import { compressVideo, shouldCompressVideo } from '../../utils/videoCompression';
import { QRCodeSVG } from 'qrcode.react';
import { sanitizeFileName } from '../../utils/fileUtils';

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
  photo_url?: string;
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
  instagram_url?: string;
  facebook_url?: string;
  tiktok_url?: string;
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
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Photo upload for menu items
  const [menuPhotoFile, setMenuPhotoFile] = useState<File | null>(null);
  const [menuPhotoPreview, setMenuPhotoPreview] = useState<string | null>(null);
  const menuPhotoInputRef = useRef<HTMLInputElement>(null);
  const [mediaType, setMediaType] = useState<'video' | 'photo'>('video');

  // Settings state
  const [editingRestaurant, setEditingRestaurant] = useState(false);
  const [restaurantForm, setRestaurantForm] = useState({ 
    name: '', 
    cuisine: '', 
    address: '', 
    phone: '', 
    website: '',
    instagramUrl: '',
    facebookUrl: '',
    tiktokUrl: ''
  });
  
  // Photo upload state
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Edit category state
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  // Edit menu item state
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);

  // Analytics state - views tracking will be implemented when interactions table is created
  const [menuItemsWithViews, setMenuItemsWithViews] = useState<Map<string, number>>(new Map());

  // Trial calculation from partner subscription data
  const [subscriptionDaysLeft, setSubscriptionDaysLeft] = useState(0);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [hasPaidSubscription, setHasPaidSubscription] = useState(false); // Stripe subscription
  
  useEffect(() => {
    const loadSubscriptionStatus = async () => {
      if (!partnerData?.id) return;
      
      const { data: partner } = await supabase
        .from('partners')
        .select('subscription_status, subscription_end_date, trial_ends_at, lifetime_access')
        .eq('id', partnerData.id)
        .single();
      
      // Priority 0: Lifetime Access (NEVER EXPIRES)
      if (partner?.lifetime_access === true) {
        setSubscriptionDaysLeft(999); // Show as unlimited
        setHasActiveSubscription(true);
        setHasPaidSubscription(true); // Treat as premium
        return;
      }
      
      // Priority 1: Active Stripe subscription (PAID)
      if (partner?.subscription_status === 'active' && partner?.subscription_end_date) {
        const endDate = new Date(partner.subscription_end_date);
        const today = new Date();
        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setSubscriptionDaysLeft(Math.max(0, diffDays));
        setHasActiveSubscription(true);
        setHasPaidSubscription(true); // User has PAID subscription
      } 
      // Priority 2: Trial period (FREE - no Stripe subscription yet)
      else if (partner?.trial_ends_at) {
        const endDate = new Date(partner.trial_ends_at);
        const today = new Date();
        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0) {
          setSubscriptionDaysLeft(diffDays);
          setHasActiveSubscription(true);
          setHasPaidSubscription(false); // Still on FREE trial
        } else {
          // Trial expired
          setSubscriptionDaysLeft(0);
          setHasActiveSubscription(false);
          setHasPaidSubscription(false);
        }
      } else {
        setSubscriptionDaysLeft(0);
        setHasActiveSubscription(false);
        setHasPaidSubscription(false);
      }
    };
    
    loadSubscriptionStatus();
  }, [partnerData?.id]);
  
  // Trial is active only if user is on FREE trial (not paid subscription)
  const isTrialActive = hasActiveSubscription && !hasPaidSubscription && subscriptionDaysLeft > 0 && subscriptionDaysLeft <= 14;
  const isTrialExpired = !hasActiveSubscription && subscriptionDaysLeft === 0;
  const maxVideos = hasActiveSubscription ? Infinity : 5;

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
        .eq('id', user.id)
        .maybeSingle();

      console.log('Partner loaded:', partner, partnerError);

      let currentPartner = partner;

      // If no partner exists, create one
      if (!currentPartner) {
        console.log('No partner found, creating one...');
        const trialEnds = new Date();
        trialEnds.setDate(trialEnds.getDate() + 14);

        // Check for pending signup data (saved during registration)
        let pendingData: any = null;
        try {
          const raw = localStorage.getItem('pending_partner_signup');
          if (raw) pendingData = JSON.parse(raw);
        } catch (e) { /* ignore */ }

        const restaurantName = pendingData?.restaurant_name || '';
        const slug = restaurantName
          ? restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
          : '';

        const { data: newPartner, error: createError } = await supabase
          .from('partners')
          .insert({
            id: user.id,
            email: user.email,
            restaurant_name: restaurantName || null,
            abn: pendingData?.abn || null,
            address: pendingData?.address || null,
            postal_code: pendingData?.postal_code || null,
            phone: pendingData?.phone || null,
            website: pendingData?.website || null,
            slug: slug || null,
            plan: pendingData?.hasLifetimeAccess ? 'lifetime' : 'trial',
            trial_ends_at: pendingData?.hasLifetimeAccess ? null : trialEnds.toISOString(),
            subscription_status: 'active',
            lifetime_access: pendingData?.hasLifetimeAccess || false,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating partner:', createError);
        } else {
          console.log('Partner created:', newPartner);
          currentPartner = newPartner;
          // Clear pending signup data
          localStorage.removeItem('pending_partner_signup');
        }
      }

      if (currentPartner) {
        setPartnerData(currentPartner);
        setRestaurantForm({ 
          name: currentPartner.restaurant_name || '', 
          cuisine: currentPartner.cuisine || '', 
          address: currentPartner.address || '',
          phone: currentPartner.phone || '',
          website: currentPartner.website || '',
          instagramUrl: currentPartner.instagram_url || '',
          facebookUrl: currentPartner.facebook_url || '',
          tiktokUrl: currentPartner.tiktok_url || ''
        });

        // Check if this is first time (no restaurant name set) and hasn't seen onboarding
        const hasSeenOnboarding = localStorage.getItem(`onboarding_completed_${user.id}`);
        if (!currentPartner.restaurant_name && !hasSeenOnboarding) {
          setShowOnboarding(true);
        }

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

      // Initialize stats at zero for new partners
      setStats({
        views: 0,
        saves: 0,
        clicks: 0,
      });
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      console.log('loadData finished, setting isLoading false');
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = async (data: { restaurantName: string; cuisine: string; address: string }) => {
    if (!partnerData) return;

    try {
      // Generate slug from restaurant name
      const slug = data.restaurantName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const { error } = await supabase
        .from('partners')
        .update({
          restaurant_name: data.restaurantName,
          cuisine: data.cuisine,
          address: data.address || null,
          slug: slug,
        })
        .eq('id', partnerData.id);

      if (error) {
        console.error('Error saving onboarding data:', error);
        alert('Error saving: ' + error.message);
        return;
      }

      // Update local state
      setPartnerData({ 
        ...partnerData, 
        restaurant_name: data.restaurantName, 
        cuisine: data.cuisine, 
        address: data.address,
        slug 
      });
      setRestaurantForm({ 
        name: data.restaurantName, 
        cuisine: data.cuisine, 
        address: data.address,
        phone: '',
        website: ''
      });

      // Mark onboarding as completed
      localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
      setShowOnboarding(false);

      // Optionally open the upload modal to encourage first video upload
      setTimeout(() => {
        setShowMenuUploadModal(true);
      }, 500);
    } catch (error) {
      console.error('Error in onboarding:', error);
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
          instagram_url: restaurantForm.instagramUrl,
          facebook_url: restaurantForm.facebookUrl,
          tiktok_url: restaurantForm.tiktokUrl,
          slug: slug,
        })
        .eq('id', partnerData.id);

      if (error) {
        console.error('Save error:', error);
        alert('Error saving: ' + error.message);
        return;
      }

      setPartnerData({ 
        ...partnerData, 
        restaurant_name: restaurantForm.name, 
        cuisine: restaurantForm.cuisine, 
        address: restaurantForm.address, 
        phone: restaurantForm.phone, 
        website: restaurantForm.website,
        instagram_url: restaurantForm.instagramUrl,
        facebook_url: restaurantForm.facebookUrl,
        tiktok_url: restaurantForm.tiktokUrl,
        slug 
      });
      setEditingRestaurant(false);
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  // Menu item handlers
  const handleMenuUpload = async () => {
    // If editing, use update function instead
    if (editingMenuItem) {
      return handleUpdateMenuItem();
    }

    const hasVideo = mediaType === 'video' && uploadFile;
    const hasPhoto = mediaType === 'photo' && menuPhotoFile;
    
    if ((!hasVideo && !hasPhoto) || !menuItemName.trim() || !partnerData) return;

    // Block upload if trial expired
    if (isTrialExpired) {
      alert('Your trial has ended. Please upgrade to Pro to continue uploading.');
      setShowMenuUploadModal(false);
      setActiveTab('subscription');
      return;
    }

    // Determine the final category name
    const finalCategory = menuItemCategory === '__new__' ? newCategory.trim() : menuItemCategory.trim();
    
    if (!finalCategory) return;

    // === PHOTO UPLOAD ===
    if (mediaType === 'photo' && menuPhotoFile) {
      setIsUploading(true);
      setUploadProgress(20);

      try {
        const sanitizedName = sanitizeFileName(menuPhotoFile.name, menuItemName.trim());
        const fileName = `${partnerData.id}/photos/${sanitizedName}`;

        const { error: uploadError } = await supabase.storage
          .from('menu-videos')
          .upload(fileName, menuPhotoFile);

        if (uploadError) throw uploadError;
        setUploadProgress(60);

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
            photo_url: publicUrl,
            video_url: '',
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
        console.error('Photo upload error:', error);
        alert('Upload failed: ' + error.message);
        setUploadProgress(0);
      } finally {
        setIsUploading(false);
      }
      return;
    }

    // === VIDEO UPLOAD ===
    if (!uploadFile) return;

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (uploadFile.size > maxSize) {
      const sizeMB = (uploadFile.size / (1024 * 1024)).toFixed(1);
      alert(`Video is too large (${sizeMB}MB). Maximum size is 5MB.\n\nTip: Compress your video to 720p quality.\nUse this free tool: https://www.freeconvert.com/video-compressor`);
      return;
    }

    // Validate video duration (10 seconds max)
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = video.duration;
        
        if (duration > 12) {
          alert(`Video is too long (${Math.round(duration)}s). Please upload a video of 10 seconds or less for best engagement.`);
          reject(new Error('Video too long'));
        } else {
          resolve();
        }
      };
      
      video.onerror = () => {
        reject(new Error('Error loading video'));
      };
      
      video.src = URL.createObjectURL(uploadFile);
    }).catch((error) => {
      console.error('Video validation error:', error);
      return;
    });

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Check if video needs compression
      let fileToUpload = uploadFile;
      const needsCompression = await shouldCompressVideo(uploadFile);
      
      if (needsCompression) {
        setUploadProgress(15);
        console.log('Compressing video for optimal mobile playback...');
        
        // Compress video with progress callback
        fileToUpload = await compressVideo(uploadFile, {
          maxWidth: 720,
          maxHeight: 1280,
          quality: 0.8,
          onProgress: (progress) => {
            // Map compression progress to 15-50% of total progress
            setUploadProgress(15 + (progress * 0.35));
          },
        });
        
        console.log(`Video compressed: ${(uploadFile.size / 1024 / 1024).toFixed(2)}MB → ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`);
        setUploadProgress(50);
      } else {
        setUploadProgress(30);
      }

      // Sanitizar nome do arquivo para garantir URLs seguras
      const sanitizedName = sanitizeFileName(fileToUpload.name, menuItemName.trim());
      const fileName = `${partnerData.id}/${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from('menu-videos')
        .upload(fileName, fileToUpload);

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

  const handleUpdateMenuItem = async () => {
    if (!editingMenuItem || !menuItemName.trim() || !partnerData) return;

    const finalCategory = menuItemCategory === '__new__' ? newCategory.trim() : menuItemCategory.trim();
    if (!finalCategory) return;

    setIsUploading(true);
    setUploadProgress(50);

    try {
      const { error } = await supabase
        .from('menu_items')
        .update({
          name: menuItemName.trim(),
          category: finalCategory,
          description: menuItemDescription.trim() || null,
          price: menuItemPrice ? parseFloat(menuItemPrice) : null,
        })
        .eq('id', editingMenuItem.id);

      if (error) throw error;
      setUploadProgress(100);

      // Update local state
      setMenuItems(menuItems.map(i => 
        i.id === editingMenuItem.id 
          ? { ...i, name: menuItemName.trim(), category: finalCategory, description: menuItemDescription.trim() || null, price: menuItemPrice ? parseFloat(menuItemPrice) : null }
          : i
      ));

      // Update categories if new category was added
      if (!categories.includes(finalCategory)) {
        setCategories([...categories, finalCategory]);
      }

      resetMenuUploadModal();
      alert('Menu item updated successfully!');
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update menu item. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetMenuUploadModal = () => {
    setShowMenuUploadModal(false);
    setUploadFile(null);
    setUploadPreview(null);
    setMenuPhotoFile(null);
    setMenuPhotoPreview(null);
    setMediaType('video');
    setMenuItemName('');
    setMenuItemCategory('');
    setMenuItemDescription('');
    setMenuItemPrice('');
    setNewCategory('');
    setUploadProgress(0);
    setEditingMenuItem(null);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (2MB max for photos)
      if (file.size > 2 * 1024 * 1024) {
        alert('Photo is too large. Maximum size is 2MB.');
        return;
      }
      setMenuPhotoFile(file);
      setMenuPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleDeleteMenuItem = async (itemId: string) => {
    if (!confirm('Delete this menu item? This cannot be undone.')) return;

    try {
      await supabase.from('menu_items').delete().eq('id', itemId);
      setMenuItems(menuItems.filter(i => i.id !== itemId));
      
      // Close modal if deleting from edit mode
      if (editingMenuItem?.id === itemId) {
        resetMenuUploadModal();
      }
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

  const handleDeleteCategory = async (category: string) => {
    if (!partnerData) return;

    const categoryItems = menuItems.filter(i => i.category === category);
    const confirmMessage = categoryItems.length > 0
      ? `Delete category "${category}"?\n\nThis will also delete ${categoryItems.length} video${categoryItems.length > 1 ? 's' : ''} in this category. This action cannot be undone.`
      : `Delete empty category "${category}"?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      // Delete all menu items in this category
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('partner_id', partnerData.id)
        .eq('category', category);

      if (error) throw error;

      // Update local state
      setMenuItems(menuItems.filter(i => i.category !== category));
      setCategories(categories.filter(c => c !== category));
      setEditingCategory(null);
      
      alert(`Category "${category}" deleted successfully`);
    } catch (error) {
      console.error('Delete category error:', error);
      alert('Failed to delete category. Please try again.');
    }
  };

  const handleEditCategory = async () => {
    if (!partnerData || !editingCategory || !editCategoryName.trim()) return;

    const newName = editCategoryName.trim();
    
    // Check if new name already exists
    if (newName !== editingCategory && categories.includes(newName)) {
      alert('A category with this name already exists.');
      return;
    }

    try {
      // Update all menu items in this category
      const { error } = await supabase
        .from('menu_items')
        .update({ category: newName })
        .eq('partner_id', partnerData.id)
        .eq('category', editingCategory);

      if (error) throw error;

      // Update local state
      setMenuItems(menuItems.map(i => 
        i.category === editingCategory ? { ...i, category: newName } : i
      ));
      setCategories(categories.map(c => c === editingCategory ? newName : c));
      setEditingCategory(null);
      setEditCategoryName('');
      
      alert(`Category renamed to "${newName}" successfully`);
    } catch (error) {
      console.error('Edit category error:', error);
      alert('Failed to rename category. Please try again.');
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
      // Sanitizar nome do arquivo para garantir URLs seguras
      const sanitizedName = sanitizeFileName(file.name, 'restaurant-photo');
      const fileName = `${partnerData.id}/${sanitizedName}`;

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
      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => {
          setShowOnboarding(false);
          localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
        }}
        onComplete={handleOnboardingComplete}
      />

      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-40 pt-8 pb-2">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <img 
                src="https://quybuvapflnzcaedjbkl.supabase.co/storage/v1/object/public/media/icon.png" 
                alt="MenuLove" 
                className="w-9 h-9 rounded-lg"
              />
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
                  <Clock size={12} /> {subscriptionDaysLeft} days left
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

      {/* Trial/Upgrade Banner - Only show for FREE trial or expired trial, NOT for paid subscriptions */}
      {(isTrialActive || isTrialExpired) && (
        <div className={`${isTrialExpired ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-orange-500 to-amber-500'} text-white`}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isTrialExpired ? (
                <>
                  <AlertCircle size={16} />
                  <span className="text-sm font-medium">Your trial has ended</span>
                </>
              ) : isTrialActive ? (
                <>
                  <Calendar size={16} />
                  <span className="text-sm font-medium">Premium Trial: {subscriptionDaysLeft} days remaining</span>
                </>
              ) : null}
            </div>
            <button 
              onClick={() => setActiveTab('subscription')}
              className="px-4 py-1.5 bg-white text-orange-600 text-sm font-bold rounded-lg hover:bg-orange-50 transition-colors"
            >
              {isTrialExpired ? 'Upgrade to Pro' : 'Upgrade Now'}
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
              </div>
              <div className="bg-white rounded-xl p-4 border border-zinc-200">
                <div className="flex items-center gap-2 text-zinc-500 mb-2">
                  <Heart size={16} />
                  <span className="text-xs font-medium">Saves</span>
                </div>
                <p className="text-2xl font-bold text-zinc-900">{stats.saves}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-zinc-200">
                <div className="flex items-center gap-2 text-zinc-500 mb-2">
                  <MapPin size={16} />
                  <span className="text-xs font-medium">Directions</span>
                </div>
                <p className="text-2xl font-bold text-zinc-900">{stats.clicks}</p>
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
                      <video src={`${item.video_url}#t=0.5`} className="w-full h-full object-cover" muted preload="metadata" />
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
                <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center flex-shrink-0 p-1.5">
                  {partnerData?.slug ? (
                    <QRCodeSVG 
                      value={`${window.location.origin}/r/${partnerData.slug}`}
                      size={68}
                      fgColor="#f97316"
                      bgColor="#ffffff"
                      level="M"
                    />
                  ) : (
                    <QrCode size={52} className="text-orange-500" />
                  )}
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
                        💡 This video will appear <strong>first</strong> when users discover your restaurant in the MenuLove feed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Add Menu Item */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Menu Items</h2>
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
                {categories.map(category => {
                  const categoryItems = menuItems.filter(i => i.category === category);
                  return (
                  <div key={category} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                    <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-zinc-900">{category}</h3>
                        <p className="text-xs text-zinc-500">{categoryItems.length} items</p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingCategory(category);
                          setEditCategoryName(category);
                        }}
                        className="p-2 text-zinc-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Edit category"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                    <div className="p-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {menuItems.filter(i => i.category === category).map(item => {
                        const hasVideo = item.video_url && item.video_url !== '';
                        const hasPhoto = !!item.photo_url;
                        return (
                        <div key={item.id} className="relative group">
                          <div 
                            className="aspect-square bg-zinc-100 rounded-xl overflow-hidden cursor-pointer"
                            onClick={() => hasVideo ? setPreviewVideo(item.video_url) : hasPhoto ? setPreviewPhoto(item.photo_url!) : null}
                          >
                            {hasVideo ? (
                              <video src={`${item.video_url}#t=0.5`} className="w-full h-full object-cover" muted preload="metadata" />
                            ) : hasPhoto ? (
                              <img src={item.photo_url} className="w-full h-full object-cover" alt={item.name} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-zinc-200">
                                <Camera size={24} className="text-zinc-400" />
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
                                {hasVideo ? (
                                  <Play size={20} className="text-white ml-1" fill="white" />
                                ) : (
                                  <Camera size={20} className="text-white" />
                                )}
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
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setEditingMenuItem(item);
                                  setMenuItemName(item.name);
                                  setMenuItemCategory(item.category);
                                  setMenuItemDescription(item.description || '');
                                  setMenuItemPrice(item.price?.toString() || '');
                                  setShowMenuUploadModal(true);
                                }}
                                className="p-2 bg-orange-500/90 backdrop-blur-sm rounded-full text-white hover:bg-orange-600 transition-colors shadow-lg"
                                title="Edit menu item"
                              >
                                <Edit2 size={14} />
                              </button>
                            </div>
                            
                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                              <p className="text-white font-semibold text-sm truncate">{item.name}</p>
                              {item.price && <p className="text-white/70 text-xs">${item.price.toFixed(2)}</p>}
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                  );
                })}
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
        {activeTab === 'analytics' && partnerData && (
          <RestaurantAnalytics restaurantId={partnerData.id} />
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

                {/* Social Media Section */}
                <div className="pt-4 border-t border-zinc-100">
                  <h4 className="text-xs font-semibold text-zinc-700 mb-3">Social Media</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Instagram</label>
                      {editingRestaurant ? (
                        <input
                          type="url"
                          value={restaurantForm.instagramUrl}
                          onChange={(e) => setRestaurantForm({ ...restaurantForm, instagramUrl: e.target.value })}
                          placeholder="https://instagram.com/yourrestaurant"
                          className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      ) : (
                        <p className="text-sm text-zinc-900">{partnerData?.instagram_url || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Facebook</label>
                      {editingRestaurant ? (
                        <input
                          type="url"
                          value={restaurantForm.facebookUrl}
                          onChange={(e) => setRestaurantForm({ ...restaurantForm, facebookUrl: e.target.value })}
                          placeholder="https://facebook.com/yourrestaurant"
                          className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      ) : (
                        <p className="text-sm text-zinc-900">{partnerData?.facebook_url || '-'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">TikTok</label>
                      {editingRestaurant ? (
                        <input
                          type="url"
                          value={restaurantForm.tiktokUrl}
                          onChange={(e) => setRestaurantForm({ ...restaurantForm, tiktokUrl: e.target.value })}
                          placeholder="https://tiktok.com/@yourrestaurant"
                          className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      ) : (
                        <p className="text-sm text-zinc-900">{partnerData?.tiktok_url || '-'}</p>
                      )}
                    </div>
                  </div>
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
                    {hasPaidSubscription ? 'Pro Plan' : isTrialActive ? 'Trial Plan' : 'Free Plan'}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {hasPaidSubscription 
                      ? '$29.90/month • Renews automatically' 
                      : isTrialActive 
                        ? `${subscriptionDaysLeft} days remaining`
                        : 'Trial ended'}
                  </p>
                </div>
                {!hasPaidSubscription && (
                  <button 
                    onClick={() => setActiveTab('subscription')}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Upgrade
                  </button>
                )}
                {hasPaidSubscription && (
                  <button 
                    onClick={() => setActiveTab('subscription')}
                    className="px-4 py-2 border border-zinc-300 text-zinc-700 text-sm font-semibold rounded-lg hover:bg-zinc-50 transition-colors"
                  >
                    Manage Plan
                  </button>
                )}
              </div>

              {/* Plan details */}
              <div className="mt-4">
                <div className={`p-4 rounded-lg border ${hasPaidSubscription ? 'border-amber-300 bg-amber-50' : isTrialActive ? 'border-orange-200 bg-orange-50' : 'border-zinc-200'}`}>
                  <p className="font-semibold text-zinc-900 mb-2">
                    {hasPaidSubscription ? 'Pro Plan Active' : isTrialActive ? 'Trial Period' : 'No Active Plan'}
                    {hasPaidSubscription && <span className="text-amber-600 ml-2">$29.90/month</span>}
                  </p>
                  <ul className="text-xs text-zinc-600 space-y-1">
                    <li>• Unlimited videos</li>
                    <li>• Full analytics</li>
                    <li>• Partner badge</li>
                    <li>• Priority in feed</li>
                  </ul>
                  {hasPaidSubscription && (
                    <p className="text-xs text-zinc-500 mt-3 pt-3 border-t border-zinc-200">
                      Your subscription renews automatically. Cancel anytime from the Subscription tab.
                    </p>
                  )}
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
              <h2 className="text-lg font-bold text-zinc-900">{editingMenuItem ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
              <button onClick={resetMenuUploadModal} className="p-2 text-zinc-400 hover:text-zinc-600 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Media Type Toggle - Only show in add mode */}
              {!editingMenuItem && (
                <>
              <div className="flex bg-zinc-100 rounded-xl p-1">
                <button
                  onClick={() => { setMediaType('video'); setMenuPhotoFile(null); setMenuPhotoPreview(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    mediaType === 'video' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
                  }`}
                >
                  <Video size={16} />
                  Video
                </button>
                <button
                  onClick={() => { setMediaType('photo'); setUploadFile(null); setUploadPreview(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    mediaType === 'photo' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
                  }`}
                >
                  <Image size={16} />
                  Photo
                </button>
              </div>

              {/* Video Upload */}
              {mediaType === 'video' && (
                <>
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
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </>
              )}

              {/* Photo Upload */}
              {mediaType === 'photo' && (
                <>
                  {menuPhotoPreview ? (
                    <div className="relative w-64 aspect-square bg-zinc-100 rounded-xl overflow-hidden mx-auto">
                      <img src={menuPhotoPreview} className="w-full h-full object-cover" alt="Preview" />
                      <button
                        onClick={() => { setMenuPhotoFile(null); setMenuPhotoPreview(null); }}
                        className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => menuPhotoInputRef.current?.click()}
                      className="w-full aspect-square max-h-64 bg-zinc-100 border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-orange-300 transition-colors"
                    >
                      <Image size={32} className="text-zinc-400" />
                      <p className="text-sm font-medium text-zinc-600">Click to select photo</p>
                      <p className="text-xs text-zinc-400">JPG, PNG • Max 2MB</p>
                    </button>
                  )}
                  <input
                    ref={menuPhotoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </>
              )}
              <p className="text-xs text-zinc-400 text-center">
                {mediaType === 'video' 
                  ? 'Videos appear in the video feed and full menu' 
                  : 'Photos appear only in the full menu'}
              </p>
              </>
              )}

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

            <div className="p-5 border-t border-zinc-100 sticky bottom-0 bg-white">
              <div className="flex gap-3">
                <button
                  onClick={resetMenuUploadModal}
                  className="px-6 py-3 border border-zinc-200 text-zinc-700 font-semibold rounded-xl hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMenuUpload}
                  disabled={isUploading || (!editingMenuItem && !uploadFile && !menuPhotoFile) || !menuItemName.trim() || (!menuItemCategory.trim() && menuItemCategory !== '__new__') || (menuItemCategory === '__new__' && !newCategory.trim())}
                  className="flex-1 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-sm">{editingMenuItem ? 'Updating...' : 'Uploading...'} {uploadProgress}%</span>
                    </>
                  ) : (
                    <>
                      {editingMenuItem ? (
                        <>
                          <Save size={16} />
                          <span className="text-sm">Save</span>
                        </>
                      ) : (
                        <>
                          <Plus size={16} />
                          <span className="text-sm">Add Item</span>
                        </>
                      )}
                    </>
                  )}
                </button>
                {editingMenuItem && (
                  <button
                    onClick={() => handleDeleteMenuItem(editingMenuItem.id)}
                    className="px-6 py-3 border-2 border-red-500 text-red-500 font-semibold rounded-xl hover:bg-red-50 transition-colors flex items-center gap-2"
                    title="Delete menu item"
                  >
                    <Trash2 size={18} />
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-900">Edit Category</h2>
              <button 
                onClick={() => {
                  setEditingCategory(null);
                  setEditCategoryName('');
                }}
                className="p-2 text-zinc-400 hover:text-zinc-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter category name"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleEditCategory}
                  disabled={!editCategoryName.trim()}
                  className="flex-1 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => handleDeleteCategory(editingCategory)}
                  className="px-4 py-3 border-2 border-red-500 text-red-500 font-semibold rounded-xl hover:bg-red-50 transition-colors flex items-center gap-2"
                  title="Delete category"
                >
                  <Trash2 size={18} />
                  Delete
                </button>
              </div>
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

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <button 
            onClick={() => setPreviewPhoto(null)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-full z-10"
          >
            <X size={24} />
          </button>
          <img 
            src={previewPhoto} 
            className="max-w-full max-h-[80vh] rounded-xl object-contain" 
            alt="Menu item"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default PartnerDashboard;
