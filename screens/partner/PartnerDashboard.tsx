import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  LogOut, Plus, Play, Trash2, Eye, Heart, MapPin,
  Loader2, X, Upload, Check, Settings, BarChart3,
  Video, Crown, AlertCircle, ChevronRight, Calendar,
  TrendingUp, Clock, Edit2, Save, QrCode, Copy, ExternalLink, Menu, Camera, Image, Star, CreditCard, Search, CheckCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PartnerUser } from './PartnerPortal';
import SubscriptionManager from './SubscriptionManager';
import OnboardingModal from './OnboardingModal';
import RestaurantAnalytics from './RestaurantAnalytics';
import MenuImportModal from '../../components/MenuImportModal';
import { compressVideo, shouldCompressVideo } from '../../utils/videoCompression';
import { QRCodeSVG } from 'qrcode.react';
import { sanitizeFileName } from '../../utils/fileUtils';
import ChatWidget from '../../components/chat/ChatWidget';
import WelcomeBanner from '../../components/WelcomeBanner';
import GuidedTour from '../../components/GuidedTour';

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

type Tab = 'analytics' | 'menu' | 'subscription' | 'settings';

const PartnerDashboard: React.FC<PartnerDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<Tab>('analytics');
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [videos, setVideos] = useState<DishVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ views: 0, saves: 0, clicks: 0 });
  
  // Partner data (for menu items)
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  
  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Password change modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Menu upload state
  const [showMenuUploadModal, setShowMenuUploadModal] = useState(false);
  const [showMenuImportModal, setShowMenuImportModal] = useState(false);
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

  // Banner images upload state (up to 3 images for QR code promo)
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [uploadingBannerIndex, setUploadingBannerIndex] = useState<number | null>(null);
  const [bannerImages, setBannerImages] = useState<string[]>([]);
  const bannerInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null]);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Welcome banner and guided tour state
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [showGuidedTour, setShowGuidedTour] = useState(false);

  // Edit category state
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  // Edit menu item state
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);

  // Delete confirmation modal state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    show: boolean;
    type: 'item' | 'category' | 'menu';
    itemId?: string;
    categoryName?: string;
    itemCount?: number;
  }>({ show: false, type: 'item' });

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
      
      console.log('[PartnerDashboard] Subscription status check:', {
        partner_id: partnerData.id,
        trial_ends_at: partner?.trial_ends_at,
        subscription_status: partner?.subscription_status,
        subscription_end_date: partner?.subscription_end_date,
        lifetime_access: partner?.lifetime_access
      });
      
      // Priority 0: Lifetime Access (NEVER EXPIRES)
      if (partner?.lifetime_access === true) {
        setSubscriptionDaysLeft(999); // Show as unlimited
        setHasActiveSubscription(true);
        setHasPaidSubscription(true); // Treat as premium
        console.log('[PartnerDashboard] Lifetime access detected');
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
  const isTrialActive = hasActiveSubscription && !hasPaidSubscription && subscriptionDaysLeft > 0 && subscriptionDaysLeft <= 30;
  const isTrialExpired = !!partnerData && !hasActiveSubscription && subscriptionDaysLeft === 0;
  const maxVideos = hasActiveSubscription ? Infinity : 5;

  // Listen for chat navigation events
  useEffect(() => {
    const handleChatNavigate = (event: CustomEvent) => {
      const { tab } = event.detail;
      if (tab && ['analytics', 'menu', 'subscription', 'settings'].includes(tab)) {
        setActiveTab(tab as Tab);
      }
    };

    window.addEventListener('chat-navigate', handleChatNavigate as EventListener);
    
    return () => {
      window.removeEventListener('chat-navigate', handleChatNavigate as EventListener);
    };
  }, []);

  useEffect(() => {
    console.log('PartnerDashboard mounted or user changed, loading data...');
    console.log('Current user:', user);
    loadData();
    
    // Check if user is first-time visitor (show welcome banner)
    const hasSeenWelcome = localStorage.getItem(`welcome_seen_${user.id}`);
    if (!hasSeenWelcome) {
      setShowWelcomeBanner(true);
    }
    
    // Check if should show password modal after welcome modal
    const shouldShowPasswordModal = sessionStorage.getItem('show_password_modal');
    if (shouldShowPasswordModal) {
      console.log('[PartnerDashboard] Opening password modal after welcome');
      sessionStorage.removeItem('show_password_modal');
      setShowPasswordModal(true);
    }
  }, [user.id]);

  const loadData = async () => {
    console.log('loadData started');
    try {
      // Load partner data by ID first
      const { data: partner, error: partnerError } = await supabase
        .from('partners')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      console.log('Partner loaded:', partner, partnerError);

      let currentPartner = partner;

      // Check if email is confirmed
      if (currentPartner && !currentPartner.email_confirmed) {
        console.log('Email not confirmed, blocking dashboard access');
        await supabase.auth.signOut();
        window.location.href = '/partner/login?email_not_confirmed=true';
        return;
      }

      // Fallback: if not found by ID, try by email (handles ID mismatch after re-signup)
      if (!currentPartner && user.email) {
        console.log('Partner not found by ID, trying by email:', user.email);
        const { data: partnerByEmail } = await supabase
          .from('partners')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();

        if (partnerByEmail) {
          console.log('Partner found by email, fixing ID mismatch...');
          // Update the partner ID to match the current auth user ID
          const { data: updatedPartner, error: updateError } = await supabase
            .from('partners')
            .update({ id: user.id })
            .eq('email', user.email)
            .select()
            .single();

          if (updateError) {
            console.error('Error fixing partner ID:', updateError);
            // Still use the partner data we found
            currentPartner = partnerByEmail;
          } else {
            console.log('Partner ID fixed:', updatedPartner);
            currentPartner = updatedPartner;
          }
        }
      }

      // If no partner exists, only create if we have pending signup data
      if (!currentPartner) {
        console.log('No partner found, checking for pending signup data...');
        
        // Check for pending signup data (saved during registration)
        let pendingData: any = null;
        try {
          const raw = localStorage.getItem('pending_partner_signup');
          if (raw) pendingData = JSON.parse(raw);
        } catch (e) { /* ignore */ }

        // Only create partner if we have pending signup data (signup flow)
        // Otherwise, partner should already exist (login flow)
        if (pendingData) {
          console.log('Found pending signup data, creating partner...');
          const trialEnds = new Date();
          trialEnds.setDate(trialEnds.getDate() + 30);

          const restaurantName = pendingData?.restaurant_name || '';
          const slug = restaurantName
            ? restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
            : '';

          const partnerInsert = {
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
          };

          const { data: newPartner, error: createError } = await supabase
            .from('partners')
            .upsert(partnerInsert, { onConflict: 'id' })
            .select()
            .single();

          if (createError) {
            console.error('Error creating partner:', createError);
          } else {
            console.log('Partner created/updated:', newPartner);
            currentPartner = newPartner;
            // Clear pending signup data
            localStorage.removeItem('pending_partner_signup');
          }
        } else {
          console.log('No pending signup data - partner should exist but was not found. This may be a data issue.');
        }

        // If still no partner, try fetching again in case it exists but wasn't returned
        if (!currentPartner) {
          const { data: refetchedPartner, error: refetchError } = await supabase
            .from('partners')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          console.log('Partner refetched:', refetchedPartner, refetchError);
          if (refetchedPartner) currentPartner = refetchedPartner;
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

        // Load banner images
        setBannerImages(currentPartner.banner_images || []);

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

      // Auto-fetch Google Place ID if not already set
      let googleData: any = {};
      if (!partnerData.google_place_id && restaurantForm.address) {
        try {
          const { textSearchRestaurants } = await import('../../services/googlePlacesProxy');
          const results = await textSearchRestaurants(
            partnerData.latitude || 0,
            partnerData.longitude || 0,
            5000,
            `${restaurantForm.name} ${restaurantForm.address}`
          );
          
          if (results.length > 0) {
            const place = results[0];
            googleData = {
              google_place_id: place.id,
              google_maps_url: place.googleMapsUrl,
              rating: place.rating,
              total_reviews: place.totalReviews
            };
            console.log('[Auto-fetch] Found Google Place ID:', place.id);
          }
        } catch (err) {
          console.log('[Auto-fetch] Could not fetch Google Place ID:', err);
        }
      }

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
          ...googleData
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
        slug,
        ...googleData
      });
      setEditingRestaurant(false);
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  // Password change handler
  const handleChangePassword = async () => {
    setPasswordError('');
    
    // Validation
    if (!newPasswordInput || !confirmPasswordInput) {
      setPasswordError('Please fill in all fields');
      return;
    }
    
    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (newPasswordInput.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    
    setIsChangingPassword(true);
    
    try {
      // Update to new password directly (no current password needed)
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPasswordInput,
      });
      
      if (updateError) throw updateError;
      
      // Success
      alert('Password updated successfully!');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
    } catch (error: any) {
      setPasswordError(error.message || 'Failed to update password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Menu item handlers
  // Helper function to insert menu item (handles admin impersonation)
  const insertMenuItem = async (insertData: any) => {
    const impersonatePartnerId = localStorage.getItem('admin_impersonate_partner_id');
    const isAdminImpersonating = !!impersonatePartnerId;

    if (isAdminImpersonating) {
      console.log('Using admin Edge Function for INSERT');
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('admin-update-menu-item', {
        body: {
          insertData,
          adminImpersonatePartnerId: impersonatePartnerId
        }
      });

      if (edgeError) {
        throw edgeError;
      }
      if (edgeData?.error) {
        throw new Error(edgeData.error);
      }
      return edgeData?.data;
    } else {
      // Normal insert for non-admin users
      const { data, error } = await supabase
        .from('menu_items')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  };

  const handleMenuUpload = async () => {
    // If editing, use update function instead
    if (editingMenuItem) {
      return handleUpdateMenuItem();
    }

    const hasVideo = mediaType === 'video' && uploadFile;
    const hasPhoto = mediaType === 'photo' && menuPhotoFile;
    
    // Only require name and partner data - media is optional
    if (!menuItemName.trim() || !partnerData) return;

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

    // If no media, create item without photo/video
    if (!hasVideo && !hasPhoto) {
      setIsUploading(true);
      try {
        const item = await insertMenuItem({
          partner_id: partnerData.id,
          name: menuItemName.trim(),
          category: finalCategory,
          description: menuItemDescription.trim() || null,
          price: menuItemPrice ? parseFloat(menuItemPrice) : null,
          photo_url: null,
          video_url: '',
          sort_order: menuItems.filter(i => i.category === finalCategory).length,
        });

        setMenuItems([...menuItems, item]);
        if (!categories.includes(finalCategory)) {
          setCategories([...categories, finalCategory]);
        }
        
        alert('Menu item added successfully! You can add photo/video later by editing.');
        resetMenuUploadModal();
      } catch (error: any) {
        console.error('Item creation error:', error);
        alert('Failed to create item: ' + error.message);
      } finally {
        setIsUploading(false);
      }
      return;
    }

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

        const item = await insertMenuItem({
          partner_id: partnerData.id,
          name: menuItemName.trim(),
          category: finalCategory,
          description: menuItemDescription.trim() || null,
          price: menuItemPrice ? parseFloat(menuItemPrice) : null,
          photo_url: publicUrl,
          video_url: '',
          sort_order: menuItems.filter(i => i.category === finalCategory).length,
        });
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

    // Validate file size (10MB strict limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (uploadFile.size > maxSize) {
      const sizeMB = (uploadFile.size / (1024 * 1024)).toFixed(1);
      alert(`Video is too large (${sizeMB}MB). Maximum size is 10MB.\n\nTip: Compress your video to 720p quality.\nUse this free tool: https://www.freeconvert.com/video-compressor`);
      return;
    }

    // Validate video duration (30 seconds strict limit)
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = video.duration;
        
        if (duration > 30) {
          alert(`Video is too long (${Math.round(duration)}s). Maximum duration is 30 seconds.\n\nPlease trim your video and try again.`);
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
      // TEMPORARY: Skip compression to test if that's the issue
      let fileToUpload = uploadFile;
      console.log('Skipping compression for testing - uploading original video');
      setUploadProgress(30);
      
      // Check if video needs compression
      // const needsCompression = await shouldCompressVideo(uploadFile);
      
      // if (needsCompression) {
      //   setUploadProgress(15);
      //   console.log('Compressing video for optimal mobile playback...');
      //   
      //   // Compress video with progress callback
      //   fileToUpload = await compressVideo(uploadFile, {
      //     maxWidth: 720,
      //     maxHeight: 1280,
      //     quality: 0.8,
      //     onProgress: (progress) => {
      //       // Map compression progress to 15-50% of total progress
      //       setUploadProgress(15 + (progress * 0.35));
      //     },
      //   });
      //   
      //   console.log(`Video compressed: ${(uploadFile.size / 1024 / 1024).toFixed(2)}MB → ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`);
      //   setUploadProgress(50);
      // } else {
      //   setUploadProgress(30);
      // }

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

      console.log('Inserting menu item into database:', {
        partner_id: partnerData.id,
        name: menuItemName.trim(),
        category: finalCategory,
        video_url: publicUrl,
      });

      const insertData = {
        partner_id: partnerData.id,
        name: menuItemName.trim(),
        category: finalCategory,
        description: menuItemDescription.trim() || null,
        price: menuItemPrice ? parseFloat(menuItemPrice) : null,
        video_url: publicUrl,
        sort_order: menuItems.filter(i => i.category === finalCategory).length,
      };
      
      console.log('Attempting to insert menu item:', insertData);
      console.log('Current auth user:', (await supabase.auth.getUser()).data.user?.id);

      const item = await insertMenuItem(insertData);
      
      console.log('✅ Menu item inserted successfully:', item);
      setUploadProgress(100);

      setMenuItems([...menuItems, item]);
      if (!categories.includes(finalCategory)) {
        setCategories([...categories, finalCategory]);
      }
      
      console.log('Updated menuItems state:', [...menuItems, item]);
      
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
    console.log('=== handleUpdateMenuItem STARTED ===');
    console.log('Form state at save time:');
    console.log('  menuItemName:', menuItemName);
    console.log('  menuItemCategory:', menuItemCategory);
    console.log('  menuItemDescription:', menuItemDescription);
    console.log('  menuItemPrice:', menuItemPrice);
    console.log('  editingMenuItem:', editingMenuItem);
    
    if (!editingMenuItem || !menuItemName.trim() || !partnerData) return;

    const finalCategory = menuItemCategory === '__new__' ? newCategory.trim() : menuItemCategory.trim();
    if (!finalCategory) return;

    setIsUploading(true);

    try {
      let photoUrl = editingMenuItem.photo_url;
      let videoUrl = editingMenuItem.video_url;

      // Handle photo upload if new photo selected
      if (mediaType === 'photo' && menuPhotoFile) {
        setUploadProgress(20);
        const timestamp = Date.now();
        const sanitizedName = sanitizeFileName(menuPhotoFile.name, menuItemName.trim());
        const fileName = `${partnerData.id}/photos/${timestamp}-${sanitizedName}`;

        const { error: uploadError } = await supabase.storage
          .from('menu-videos')
          .upload(fileName, menuPhotoFile, {
            upsert: true
          });

        if (uploadError) throw uploadError;
        setUploadProgress(50);

        const { data: { publicUrl } } = supabase.storage
          .from('menu-videos')
          .getPublicUrl(fileName);

        photoUrl = publicUrl;
        videoUrl = ''; // Clear video if adding photo
      }

      // Handle video upload if new video selected
      if (mediaType === 'video' && uploadFile) {
        setUploadProgress(20);
        
        // TEMPORARY: Skip compression to test if that's the issue
        let fileToUpload = uploadFile;
        console.log('Skipping compression for testing - uploading original video');
        setUploadProgress(50);
        
        // let fileToUpload = uploadFile;
        // if (shouldCompressVideo(uploadFile)) {
        //   setUploadProgress(30);
        //   fileToUpload = await compressVideo(uploadFile);
        //   setUploadProgress(50);
        // }

        const timestamp = Date.now();
        // Get original file extension
        const originalExtension = fileToUpload.name.split('.').pop()?.toLowerCase() || 'mp4';
        // Sanitize just the name part, then add correct extension
        const baseName = menuItemName.trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/[\s_]+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '')
          .substring(0, 50);
        const fileName = `${partnerData.id}/${baseName}-${timestamp}.${originalExtension}`;
        
        console.log('Upload filename:', fileName, 'Original file:', fileToUpload.name);

        const { error: uploadError } = await supabase.storage
          .from('menu-videos')
          .upload(fileName, fileToUpload, {
            upsert: true
          });

        if (uploadError) throw uploadError;
        setUploadProgress(70);

        const { data: { publicUrl } } = supabase.storage
          .from('menu-videos')
          .getPublicUrl(fileName);

        console.log('Got publicUrl from storage:', publicUrl);
        videoUrl = publicUrl;
        photoUrl = null; // Clear photo if adding video (photo_url can be null)
        console.log('Set videoUrl to:', videoUrl, 'photoUrl to:', photoUrl);
      }

      setUploadProgress(80);

      console.log('Before creating updateData - videoUrl:', videoUrl, 'photoUrl:', photoUrl);
      console.log('Price field - raw value:', menuItemPrice);
      
      // Parse price correctly - empty string should be null, not 0
      const parsedPrice = menuItemPrice && menuItemPrice.trim() !== '' ? parseFloat(menuItemPrice) : null;
      console.log('Price field - parsed:', parsedPrice);

      const updateData = {
        name: menuItemName.trim(),
        category: finalCategory,
        description: menuItemDescription.trim() || null,
        price: parsedPrice,
        photo_url: photoUrl,
        video_url: videoUrl,
      };

      const currentUser = (await supabase.auth.getUser()).data.user;
      
      // Check if admin is impersonating
      const impersonatePartnerId = localStorage.getItem('admin_impersonate_partner_id');
      const effectiveUserId = impersonatePartnerId || currentUser?.id;
      
      console.log('Updating menu item ID:', editingMenuItem.id);
      console.log('Item partner_id:', editingMenuItem.partner_id);
      console.log('Current auth user ID:', currentUser?.id);
      console.log('Admin impersonate ID:', impersonatePartnerId);
      console.log('Effective user ID:', effectiveUserId);
      console.log('IDs match?', editingMenuItem.partner_id === effectiveUserId);
      
      // Check if user owns this item (or admin is impersonating)
      if (editingMenuItem.partner_id !== effectiveUserId) {
        alert(`ERROR: You cannot edit this item!\n\nThis item belongs to partner: ${editingMenuItem.partner_id}\nYou are logged in as: ${currentUser?.id}\n\nPlease logout and login with the correct account.`);
        setIsUploading(false);
        return;
      }
      
      console.log('Update data:', JSON.stringify(updateData, null, 2));
      console.log('video_url in updateData:', updateData.video_url);

      // If admin is impersonating, use Edge Function to bypass RLS
      // because RLS policies check auth.uid() which will be the admin's ID
      const isAdminImpersonating = !!impersonatePartnerId;
      console.log('Is admin impersonating?', isAdminImpersonating);

      let updateResult;
      let error;

      if (isAdminImpersonating) {
        console.log('Using admin Edge Function to bypass RLS');
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('admin-update-menu-item', {
          body: {
            itemId: editingMenuItem.id,
            updateData,
            adminImpersonatePartnerId: impersonatePartnerId
          }
        });
        
        console.log('Edge Function response:', edgeData);
        console.log('Edge Function error:', edgeError);
        
        if (edgeError) {
          error = edgeError;
        } else if (edgeData?.error) {
          error = { message: edgeData.error };
        } else {
          updateResult = edgeData?.data ? [edgeData.data] : null;
        }
      } else {
        const { data, error: dbError } = await supabase
          .from('menu_items')
          .update(updateData)
          .eq('id', editingMenuItem.id)
          .select('*');
        
        updateResult = data;
        error = dbError;
      }
      
      console.log('Update result:', updateResult);
      console.log('Update result price:', updateResult?.[0]?.price);
      console.log('Expected price:', updateData.price);
      console.log('Full update result object:', JSON.stringify(updateResult, null, 2));

      if (error) {
        console.error('❌ DATABASE UPDATE FAILED:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        alert(`Database update error: ${error.message}\nDetails: ${error.details || 'No details'}\nHint: ${error.hint || 'No hint'}`);
        throw error;
      }
      
      console.log('✅ Menu item updated successfully');
      
      // Verify the update was actually saved
      const { data: verifyData, error: verifyError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('id', editingMenuItem.id)
        .single();
      
      if (verifyError) {
        console.error('❌ Failed to verify update:', verifyError);
      } else {
        console.log('✅ Verified data in database:', verifyData);
        console.log('Price verification - Expected:', updateData.price, 'Actual in DB:', verifyData.price);
        if (verifyData.video_url !== videoUrl) {
          console.error('⚠️ WARNING: Database has different video_url!', {
            expected: videoUrl,
            actual: verifyData.video_url
          });
          alert('WARNING: Video URL in database does not match! Check console.');
        }
        if (verifyData.price !== updateData.price) {
          console.error('⚠️ WARNING: Database has different price!', {
            expected: updateData.price,
            actual: verifyData.price
          });
        }
      }
      
      setUploadProgress(100);

      // Update local state
      setMenuItems(menuItems.map(i => 
        i.id === editingMenuItem.id 
          ? { 
              ...i, 
              name: menuItemName.trim(), 
              category: finalCategory, 
              description: menuItemDescription.trim() || null, 
              price: menuItemPrice ? parseFloat(menuItemPrice) : null,
              photo_url: photoUrl,
              video_url: videoUrl
            }
          : i
      ));

      // Update categories if new category was added
      if (!categories.includes(finalCategory)) {
        setCategories([...categories, finalCategory]);
      }

      setTimeout(() => {
        resetMenuUploadModal();
        setToast({ message: 'Menu item updated successfully!', type: 'success' });
        setTimeout(() => setToast(null), 3000);
      }, 500);
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update menu item. Please try again.');
      setUploadProgress(0);
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
    setDeleteConfirmation({ show: true, type: 'item', itemId });
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

  // Welcome banner and guided tour handlers
  const handleStartTour = () => {
    setShowWelcomeBanner(false);
    setShowGuidedTour(true);
  };

  const handleDismissWelcome = () => {
    setShowWelcomeBanner(false);
    localStorage.setItem(`welcome_seen_${user.id}`, 'true');
  };

  const handleCompleteTour = () => {
    localStorage.setItem(`welcome_seen_${user.id}`, 'true');
  };

  const handleDeleteCategory = async (category: string) => {
    if (!partnerData) return;
    const categoryItems = menuItems.filter(i => i.category === category && !i.deleted_at);
    setDeleteConfirmation({ 
      show: true, 
      type: 'category', 
      categoryName: category,
      itemCount: categoryItems.length 
    });
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

  // Banner images upload (up to 3 images for QR code promo)
  const handleBannerUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !partnerData) {
      console.log('Upload cancelled - file or partnerData missing:', { file: !!file, partnerData: !!partnerData });
      return;
    }

    console.log('Starting banner upload:', { index, fileName: file.name, partnerId: partnerData.id, currentBanners: bannerImages });

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File too large. Maximum size is 2MB');
      return;
    }

    setIsUploadingBanner(true);
    setUploadingBannerIndex(index);

    try {
      const sanitizedName = sanitizeFileName(file.name, 'banner');
      const fileName = `${partnerData.id}/banners/${Date.now()}-${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from('menu-videos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('menu-videos')
        .getPublicUrl(fileName);

      // Update specific index in banner images array
      // Ensure array always has 3 positions
      const newBanners = [
        bannerImages[0] || null,
        bannerImages[1] || null,
        bannerImages[2] || null
      ];
      newBanners[index] = publicUrl;
      
      // Filter out nulls for cleaner array
      const cleanBanners = newBanners.filter(b => b !== null);
      setBannerImages(cleanBanners);

      console.log('Updating banners:', cleanBanners);

      // Update partner with banner images
      const { error: updateError } = await supabase
        .from('partners')
        .update({ banner_images: cleanBanners })
        .eq('id', partnerData.id);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      console.log('Banners updated successfully');
      setPartnerData({ ...partnerData, banner_images: cleanBanners });
    } catch (error: any) {
      console.error('Banner upload error:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setIsUploadingBanner(false);
      setUploadingBannerIndex(null);
      if (bannerInputRefs.current[index]) {
        bannerInputRefs.current[index]!.value = '';
      }
    }
  };

  // Remove banner image
  const handleRemoveBanner = async (index: number) => {
    if (!partnerData) return;

    const newBanners = bannerImages.filter((_, i) => i !== index);
    setBannerImages(newBanners);

    try {
      const { error: updateError } = await supabase
        .from('partners')
        .update({ banner_images: newBanners })
        .eq('id', partnerData.id);

      if (updateError) throw updateError;

      setPartnerData({ ...partnerData, banner_images: newBanners });
    } catch (error: any) {
      console.error('Banner remove error:', error);
      alert('Failed to remove banner: ' + error.message);
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
                  Welcome, {partnerData?.restaurant_name || user.email?.split('@')[0] || 'Partner'}
                </p>
                <p className="text-xs text-zinc-500">{user.email}</p>
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
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
              { id: 'menu', label: 'Menu', icon: Menu },
              { id: 'subscription', label: 'Subscription', icon: CreditCard },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
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
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-20 overflow-y-auto">
        {/* Welcome Banner */}
        {showWelcomeBanner && partnerData && (
          <WelcomeBanner
            restaurantName={partnerData.restaurant_name || 'Partner'}
            onStartTour={handleStartTour}
            onDismiss={handleDismissWelcome}
          />
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && partnerData && (
          <RestaurantAnalytics restaurantId={partnerData.id} />
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

            {/* Promo Banner Images (QR Code Only) */}
            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Image size={24} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-zinc-900 mb-1">
                    Promo Banners <span className="text-orange-500 text-sm font-normal">(QR Code Only)</span>
                  </h3>
                  <p className="text-sm text-zinc-600 mb-4">Upload up to 3 promotional images. These will appear as a slider on your QR code link only.</p>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {[0, 1, 2].map((index) => (
                      <div key={index} className="relative">
                        <input
                          ref={(el) => (bannerInputRefs.current[index] = el)}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleBannerUpload(index, e)}
                          className="hidden"
                        />
                        <button
                          onClick={() => bannerInputRefs.current[index]?.click()}
                          disabled={isUploadingBanner}
                          className="relative aspect-square bg-zinc-100 rounded-lg overflow-hidden w-full hover:bg-zinc-200 transition-colors disabled:cursor-not-allowed"
                        >
                          {bannerImages[index] ? (
                            <>
                              <img src={bannerImages[index]} alt={`Banner ${index + 1}`} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                                <div className="opacity-0 hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2">
                                  <Camera size={16} className="text-zinc-700" />
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                              <Image size={20} className="text-zinc-300" />
                              <span className="text-xs text-zinc-400">Banner {index + 1}</span>
                            </div>
                          )}
                          {uploadingBannerIndex === index && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <Loader2 size={20} className="text-white animate-spin" />
                            </div>
                          )}
                        </button>
                        {bannerImages[index] && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveBanner(index);
                            }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg z-10"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-400 mt-3">Click on any slot to upload. Max 2MB per image. Recommended: 1080x1080px</p>
                </div>
              </div>
            </div>

            {/* Feed Cover Info */}
            {menuItems.length > 0 && (
              <div className="bg-zinc-50 rounded-xl p-4 sm:p-5 border border-zinc-200">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Star size={20} className="text-zinc-400 sm:w-6 sm:h-6" />
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
            <div className="space-y-3">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">Menu Items</h2>
                <p className="text-sm text-zinc-500">{menuItems.filter(i => !i.deleted_at).length} items • {categories.length} categories</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={menuSearchQuery}
                    onChange={(e) => setMenuSearchQuery(e.target.value)}
                    placeholder="Search menu items..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                  {menuSearchQuery && (
                    <button
                      onClick={() => setMenuSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-zinc-100 rounded transition-colors"
                    >
                      <X size={14} className="text-zinc-400" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                {menuItems.filter(i => !i.deleted_at).length > 0 && (
                  <button
                    onClick={async () => {
                      setDeleteConfirmation({ 
                        show: true, 
                        type: 'menu',
                        itemCount: menuItems.filter(i => !i.deleted_at).length
                      });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                  >
                    <X size={16} />
                    <span>Delete Menu</span>
                  </button>
                )}
                <button
                  onClick={() => setShowMenuImportModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  <Upload size={16} />
                  <span>Import Menu</span>
                </button>
                <button
                  onClick={() => setShowMenuUploadModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  <Plus size={16} />
                  <span>Add Item</span>
                </button>
                </div>
              </div>
            </div>

            {/* Featured Items Section */}
            {menuItems.filter(i => {
              if (!i.is_featured || i.deleted_at) return false;
              if (menuSearchQuery && !i.name.toLowerCase().includes(menuSearchQuery.toLowerCase())) return false;
              return true;
            }).length > 0 && (
              <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-200 flex items-center gap-2">
                  <Star size={18} className="text-orange-500 fill-orange-500" />
                  <div>
                    <h3 className="font-semibold text-zinc-900">Featured Items</h3>
                    <p className="text-xs text-zinc-500">{menuItems.filter(i => {
                      if (!i.is_featured || i.deleted_at) return false;
                      if (menuSearchQuery && !i.name.toLowerCase().includes(menuSearchQuery.toLowerCase())) return false;
                      return true;
                    }).length} items marked as featured</p>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {menuItems.filter(i => {
                    if (!i.is_featured || i.deleted_at) return false;
                    if (menuSearchQuery && !i.name.toLowerCase().includes(menuSearchQuery.toLowerCase())) return false;
                    return true;
                  }).map(item => {
                    const hasVideo = item.video_url && item.video_url !== '';
                    const hasPhoto = !!item.photo_url;
                    return (
                    <div key={item.id} className="relative group">
                      <div 
                        className="aspect-square bg-zinc-100 rounded-xl overflow-hidden cursor-pointer ring-2 ring-orange-400"
                        onClick={() => hasVideo ? setPreviewVideo(item.video_url) : hasPhoto ? setPreviewPhoto(item.photo_url!) : null}
                      >
                        {hasVideo ? (
                          <video src={`${item.video_url}#t=0.5`} className="w-full h-full object-cover" muted preload="metadata" />
                        ) : hasPhoto ? (
                          <img src={item.photo_url} className="w-full h-full object-cover" alt={item.name} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Camera size={32} className="text-zinc-300" />
                          </div>
                        )}
                      </div>
                      <div className="absolute top-2 left-2 flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFeatured(item.id);
                          }}
                          className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center shadow-md hover:bg-orange-600 transition-colors"
                          title="Featured item"
                        >
                          <Star size={14} className="text-white fill-white" />
                        </button>
                      </div>
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Editing item:', item);
                            console.log('Item price:', item.price);
                            console.log('Price as string:', item.price?.toString());
                            setEditingMenuItem(item);
                            setMenuItemName(item.name);
                            setMenuItemCategory(item.category);
                            setMenuItemDescription(item.description || '');
                            const priceValue = item.price?.toString() || '';
                            console.log('Setting menuItemPrice to:', priceValue);
                            setMenuItemPrice(priceValue);
                            setShowMenuUploadModal(true);
                          }}
                          className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center shadow-md hover:bg-orange-600 transition-colors"
                          title="Edit item"
                        >
                          <Edit2 size={14} className="text-white" />
                        </button>
                      </div>
                      <p className="mt-1.5 text-xs font-medium text-zinc-900 line-clamp-2 leading-tight">{item.name}</p>
                      <p className="text-xs text-orange-600 font-semibold">{item.category}</p>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Menu Items by Category */}
            {categories.length > 0 ? (
              <div className="space-y-6">
                {categories.map(category => {
                  const categoryItems = menuItems.filter(i => {
                    if (i.deleted_at) return false;
                    if (i.category !== category) return false;
                    if (menuSearchQuery && !i.name.toLowerCase().includes(menuSearchQuery.toLowerCase())) return false;
                    return true;
                  });
                  
                  // Skip empty categories when search is active
                  if (categoryItems.length === 0) return null;
                  
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
                      {categoryItems.map(item => {
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

        {/* Subscription Tab */}
        {activeTab === 'subscription' && partnerData && (
          <SubscriptionManager partnerId={partnerData.id} partnerEmail={user.email} />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-zinc-900">Settings</h2>

            {/* Guided Tour */}
            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <BarChart3 size={24} className="text-orange-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-zinc-900 mb-1">Dashboard Tour</h3>
                  <p className="text-xs text-zinc-600 mb-3">
                    Need a refresher? Take the guided tour again to learn about all the features.
                  </p>
                  <button
                    onClick={() => {
                      setShowWelcomeBanner(false);
                      setShowGuidedTour(true);
                    }}
                    className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
                  >
                    <Play size={16} />
                    Restart Tour
                  </button>
                </div>
              </div>
            </div>

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
                <label className="block text-xs font-medium text-zinc-500 mb-2">
                  Restaurant Photo <span className="text-zinc-400 font-normal">(recommended: 500x500px)</span>
                </label>
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

            {/* Archived Items */}
            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <h3 className="text-sm font-semibold text-zinc-900 mb-4">Archived Items</h3>
              <p className="text-xs text-zinc-500 mb-4">
                Items deleted in the last 7 days. After 7 days, items are permanently deleted.
              </p>
              
              {(() => {
                const archivedItems = menuItems.filter(item => item.deleted_at);
                
                if (archivedItems.length === 0) {
                  return (
                    <div className="text-center py-8 text-zinc-400 text-sm">
                      No archived items
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-2">
                    {archivedItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-zinc-900">{item.name}</p>
                          <p className="text-xs text-zinc-500">{item.category}</p>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const { error } = await supabase
                                .from('menu_items')
                                .update({ deleted_at: null })
                                .eq('id', item.id);
                              
                              if (error) throw error;
                              
                              // Reload menu items
                              const { data: items } = await supabase
                                .from('menu_items')
                                .select('*')
                                .eq('partner_id', partnerData.id)
                                .order('category')
                                .order('sort_order');
                              
                              if (items) {
                                setMenuItems(items);
                                const activeItems = items.filter(i => !i.deleted_at);
                                const cats = [...new Set(activeItems.map(i => i.category))].filter(Boolean);
                                setCategories(cats);
                              }
                              
                              alert('Item restored successfully');
                            } catch (error) {
                              console.error('Restore error:', error);
                              alert('Failed to restore item');
                            }
                          }}
                          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}
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
                    onClick={() => setShowPasswordModal(true)}
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
              {/* Media Type Toggle */}
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
                  ) : editingMenuItem?.video_url ? (
                    <div className="space-y-3">
                      <div className="relative aspect-[9/16] max-h-64 bg-zinc-900 rounded-xl overflow-hidden mx-auto">
                        <video src={`${editingMenuItem.video_url}#t=0.5`} className="w-full h-full object-contain" controls />
                        <div className="absolute top-2 right-2 flex gap-2">
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 bg-orange-500 rounded-full text-white hover:bg-orange-600 shadow-lg"
                            title="Change video"
                          >
                            <Upload size={16} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Remove this video? The item will have no video.')) {
                                setEditingMenuItem({ ...editingMenuItem, video_url: '' });
                              }
                            }}
                            className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600 shadow-lg"
                            title="Remove video"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-center text-zinc-500">Current video • Click icons to change or remove</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full aspect-[9/16] max-h-64 bg-zinc-100 border-2 border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-orange-300 transition-colors"
                    >
                      <Upload size={32} className="text-zinc-400" />
                      <p className="text-sm font-medium text-zinc-600">Click to select video</p>
                      <p className="text-xs text-zinc-400">MP4, MOV • Max 30 seconds • Max 10MB</p>
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
                  ) : editingMenuItem?.photo_url ? (
                    <div className="space-y-3">
                      <div className="relative w-64 aspect-square bg-zinc-100 rounded-xl overflow-hidden mx-auto">
                        <img src={editingMenuItem.photo_url} className="w-full h-full object-cover" alt="Current photo" />
                        <div className="absolute top-2 right-2 flex gap-2">
                          <button
                            onClick={() => menuPhotoInputRef.current?.click()}
                            className="p-2 bg-orange-500 rounded-full text-white hover:bg-orange-600 shadow-lg"
                            title="Change photo"
                          >
                            <Upload size={16} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Remove this photo? The item will have no photo.')) {
                                setEditingMenuItem({ ...editingMenuItem, photo_url: null });
                              }
                            }}
                            className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600 shadow-lg"
                            title="Remove photo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-center text-zinc-500">Current photo • Click icons to change or remove</p>
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
                    key={`price-${editingMenuItem?.id || 'new'}`}
                    type="number"
                    step="0.01"
                    value={menuItemPrice}
                    onClick={() => console.log('Price input clicked, current value:', menuItemPrice)}
                    onFocus={() => console.log('Price input focused, current value:', menuItemPrice)}
                    onChange={(e) => {
                      console.log('Price input changed to:', e.target.value);
                      setMenuItemPrice(e.target.value);
                    }}
                    onBlur={() => console.log('Price input blur, final value:', menuItemPrice)}
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

      {/* Menu Import Modal */}
      {showMenuImportModal && partnerData && (
        <MenuImportModal
          isOpen={showMenuImportModal}
          onClose={() => setShowMenuImportModal(false)}
          partnerId={partnerData.id}
          onImportComplete={async () => {
            // Reload menu items after import
            const { data: items } = await supabase
              .from('menu_items')
              .select('*')
              .eq('partner_id', partnerData.id)
              .order('category')
              .order('sort_order');
            
            if (items) {
              setMenuItems(items);
              const activeItems = items.filter(i => !i.deleted_at);
              const cats = [...new Set(activeItems.map(i => i.category))].filter(Boolean);
              setCategories(cats);
            }
            setShowMenuImportModal(false);
          }}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-[10000] animate-in slide-in-from-top-2 duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm ${
            toast.type === 'success' 
              ? 'bg-white border border-green-200' 
              : 'bg-white border border-red-200'
          }`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              toast.type === 'success' ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {toast.type === 'success' ? (
                <CheckCircle size={18} className="text-green-600" />
              ) : (
                <AlertCircle size={18} className="text-red-600" />
              )}
            </div>
            <p className={`text-sm font-medium ${
              toast.type === 'success' ? 'text-green-900' : 'text-red-900'
            }`}>
              {toast.message}
            </p>
            <button
              onClick={() => setToast(null)}
              className="flex-shrink-0 ml-2 p-1 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <X size={14} className="text-zinc-400" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteConfirmation.show}
        type={deleteConfirmation.type}
        itemCount={deleteConfirmation.itemCount}
        categoryName={deleteConfirmation.categoryName}
        onConfirm={async () => {
          const { type, itemId, categoryName } = deleteConfirmation;
          
          try {
            if (type === 'item' && itemId) {
              const { error } = await supabase.from('menu_items')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', itemId);
              
              if (error) throw error;
              
              // Update menuItems with deleted_at timestamp
              const updatedItems = menuItems.map(i => 
                i.id === itemId ? { ...i, deleted_at: new Date().toISOString() } : i
              );
              setMenuItems(updatedItems);
              
              // Recalculate categories based on updated items (excluding deleted)
              const activeItems = updatedItems.filter(i => !i.deleted_at);
              const cats = [...new Set(activeItems.map(i => i.category))].filter(Boolean);
              setCategories(cats);
              
              if (editingMenuItem?.id === itemId) {
                setShowMenuUploadModal(false);
                setEditingMenuItem(null);
              }
              
              alert('Item archived successfully');
            } else if (type === 'category' && categoryName) {
              const itemsToDelete = menuItems.filter(i => i.category === categoryName && !i.deleted_at);
              const { error } = await supabase
                .from('menu_items')
                .update({ deleted_at: new Date().toISOString() })
                .in('id', itemsToDelete.map(i => i.id));
              
              if (error) throw error;
              
              setMenuItems(menuItems.map(i => 
                i.category === categoryName ? { ...i, deleted_at: new Date().toISOString() } : i
              ));
              setCategories(categories.filter(c => c !== categoryName));
              setEditingCategory(null);
              alert('Category archived successfully');
            } else if (type === 'menu') {
              const { error } = await supabase
                .from('menu_items')
                .update({ deleted_at: new Date().toISOString() })
                .eq('partner_id', partnerData?.id)
                .is('deleted_at', null);
              
              if (error) throw error;
              
              setMenuItems(menuItems.map(i => ({ ...i, deleted_at: new Date().toISOString() })));
              setCategories([]);
              alert('Menu archived successfully');
            }
          } catch (error) {
            console.error('Archive error:', error);
            alert('Failed to archive');
          }
          
          setDeleteConfirmation({ show: false, type: 'item' });
        }}
        onCancel={() => setDeleteConfirmation({ show: false, type: 'item' })}
      />

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-900">Change Password</h2>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordError('');
                  setCurrentPassword('');
                  setNewPasswordInput('');
                  setConfirmPasswordInput('');
                }}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Re-enter new password"
                />
              </div>

              {passwordError && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-start gap-2">
                  <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-900">{passwordError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordError('');
                    setCurrentPassword('');
                    setNewPasswordInput('');
                    setConfirmPasswordInput('');
                  }}
                  className="flex-1 px-4 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 py-8 border-t border-zinc-200 bg-white">
        <div className="text-center">
          <p className="text-zinc-500 text-sm mb-1">
            MenuLove - Video Menus & Smart Discovery
          </p>
          <p className="text-zinc-400 text-sm mb-1">
            Built with <span className="text-orange-500">🧡</span> in Australia | <a href="mailto:contact@menulove.com.au" className="text-orange-500 hover:text-orange-600 transition-colors">contact@menulove.com.au</a>
          </p>
          <p className="text-zinc-400 text-sm">
            All rights reserved.
          </p>
        </div>
      </footer>

      {/* AI Chat Assistant */}
      <ChatWidget />

      {/* Guided Tour */}
      <GuidedTour
        isOpen={showGuidedTour}
        onClose={() => setShowGuidedTour(false)}
        onComplete={handleCompleteTour}
      />
    </div>
  );
};

// Delete Confirmation Modal Component
const DeleteConfirmModal: React.FC<{
  isOpen: boolean;
  type: 'item' | 'category' | 'menu';
  itemCount?: number;
  categoryName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, type, itemCount, categoryName, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  const getTitle = () => {
    if (type === 'item') return 'Archive Menu Item?';
    if (type === 'category') return `Archive "${categoryName}"?`;
    return 'Archive Entire Menu?';
  };

  const getMessage = () => {
    if (type === 'item') {
      return 'This item will be moved to archived items. You can restore it from Settings within 7 days.';
    }
    if (type === 'category') {
      return `This will archive ${itemCount} item${itemCount !== 1 ? 's' : ''} in this category. You can restore them from Settings within 7 days.`;
    }
    return 'All menu items will be archived. You can restore them from Settings within 7 days.';
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        {/* Icon */}
        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} className="text-orange-500" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-zinc-900 text-center mb-2">
          {getTitle()}
        </h3>

        {/* Message */}
        <p className="text-sm text-zinc-600 text-center mb-6 leading-relaxed">
          {getMessage()}
        </p>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
          <p className="text-xs text-blue-700 font-medium">
            💡 Items will be permanently deleted after 7 days
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors"
          >
            Archive
          </button>
        </div>
      </div>
    </div>
  );
};

export default PartnerDashboard;
