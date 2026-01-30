import { supabase } from '../lib/supabase';

// Generate or get device ID for anonymous users
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('lb_device_id');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('lb_device_id', deviceId);
  }
  return deviceId;
};

// Like a restaurant
export const likeRestaurant = async (restaurantId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const deviceId = getDeviceId();

    const { error } = await supabase
      .from('likes')
      .insert({
        restaurant_id: restaurantId,
        user_id: user?.id || null,
        device_id: user ? null : deviceId,
      });

    if (error && error.code !== '23505') { // Ignore duplicate key error
      console.error('Like error:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Like error:', error);
    return false;
  }
};

// Unlike a restaurant
export const unlikeRestaurant = async (restaurantId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const deviceId = getDeviceId();

    const { error } = await supabase
      .from('likes')
      .delete()
      .match(user ? { restaurant_id: restaurantId, user_id: user.id } : { restaurant_id: restaurantId, device_id: deviceId });

    if (error) {
      console.error('Unlike error:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Unlike error:', error);
    return false;
  }
};

// Save a restaurant
export const saveRestaurant = async (restaurantId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const deviceId = getDeviceId();

    const { error } = await supabase
      .from('saves')
      .insert({
        restaurant_id: restaurantId,
        user_id: user?.id || null,
        device_id: user ? null : deviceId,
      });

    if (error && error.code !== '23505') {
      console.error('Save error:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Save error:', error);
    return false;
  }
};

// Unsave a restaurant
export const unsaveRestaurant = async (restaurantId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const deviceId = getDeviceId();

    const { error } = await supabase
      .from('saves')
      .delete()
      .match(user ? { restaurant_id: restaurantId, user_id: user.id } : { restaurant_id: restaurantId, device_id: deviceId });

    if (error) {
      console.error('Unsave error:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Unsave error:', error);
    return false;
  }
};

// Get user's liked restaurant IDs
export const getUserLikes = async (): Promise<Set<string>> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const deviceId = getDeviceId();

    const { data, error } = await supabase
      .from('likes')
      .select('restaurant_id')
      .or(user ? `user_id.eq.${user.id}` : `device_id.eq.${deviceId}`);

    if (error) {
      console.error('Get likes error:', error);
      return new Set();
    }
    return new Set(data?.map(l => l.restaurant_id) || []);
  } catch (error) {
    console.error('Get likes error:', error);
    return new Set();
  }
};

// Get user's saved restaurant IDs
export const getUserSaves = async (): Promise<Set<string>> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const deviceId = getDeviceId();

    const { data, error } = await supabase
      .from('saves')
      .select('restaurant_id')
      .or(user ? `user_id.eq.${user.id}` : `device_id.eq.${deviceId}`);

    if (error) {
      console.error('Get saves error:', error);
      return new Set();
    }
    return new Set(data?.map(s => s.restaurant_id) || []);
  } catch (error) {
    console.error('Get saves error:', error);
    return new Set();
  }
};

// Get restaurant stats (likes count, saves count)
export const getRestaurantStats = async (restaurantId: string): Promise<{ likes: number; saves: number }> => {
  try {
    const { data, error } = await supabase
      .from('restaurant_stats')
      .select('likes_count, saves_count')
      .eq('restaurant_id', restaurantId)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found is ok
      console.error('Get stats error:', error);
    }
    return {
      likes: data?.likes_count || 0,
      saves: data?.saves_count || 0,
    };
  } catch (error) {
    console.error('Get stats error:', error);
    return { likes: 0, saves: 0 };
  }
};

// Get all restaurant stats at once
export const getAllRestaurantStats = async (restaurantIds: string[]): Promise<Map<string, { likes: number; saves: number }>> => {
  try {
    const { data, error } = await supabase
      .from('restaurant_stats')
      .select('restaurant_id, likes_count, saves_count')
      .in('restaurant_id', restaurantIds);

    if (error) {
      console.error('Get all stats error:', error);
      return new Map();
    }

    const statsMap = new Map<string, { likes: number; saves: number }>();
    data?.forEach(stat => {
      statsMap.set(stat.restaurant_id, {
        likes: stat.likes_count || 0,
        saves: stat.saves_count || 0,
      });
    });
    return statsMap;
  } catch (error) {
    console.error('Get all stats error:', error);
    return new Map();
  }
};

// Track view (for analytics)
export const trackView = async (restaurantId: string): Promise<void> => {
  try {
    await supabase
      .from('restaurant_stats')
      .upsert({
        restaurant_id: restaurantId,
        views_count: 1,
      }, {
        onConflict: 'restaurant_id',
      });
    
    // Increment views
    await supabase.rpc('increment_views', { rid: restaurantId }).catch(() => {});
  } catch (error) {
    // Silent fail for analytics
  }
};
