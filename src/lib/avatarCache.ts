/**
 * Avatar Cache Utility
 * Caches user avatar URL in localStorage to avoid repeated DB queries
 * 
 * Invalidation triggers:
 * - User updates profile picture in Settings
 * - User logs out
 * - Cache expires (7 days)
 */

const AVATAR_CACHE_KEY = 'sparkfluence_avatar_cache';
const AVATAR_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

interface AvatarCacheData {
  userId: string;
  avatarUrl: string | null;
  cachedAt: number;
}

/**
 * Get cached avatar URL for user
 */
export function getCachedAvatar(userId: string): string | null {
  try {
    const cached = localStorage.getItem(AVATAR_CACHE_KEY);
    if (!cached) return null;

    const data: AvatarCacheData = JSON.parse(cached);
    
    // Check if cache is for same user
    if (data.userId !== userId) {
      clearAvatarCache();
      return null;
    }

    // Check if cache is expired
    if (Date.now() - data.cachedAt > AVATAR_CACHE_TTL) {
      clearAvatarCache();
      return null;
    }

    return data.avatarUrl;
  } catch (e) {
    console.error('[AvatarCache] Error reading cache:', e);
    return null;
  }
}

/**
 * Set avatar URL in cache
 */
export function setCachedAvatar(userId: string, avatarUrl: string | null): void {
  try {
    const data: AvatarCacheData = {
      userId,
      avatarUrl,
      cachedAt: Date.now()
    };
    localStorage.setItem(AVATAR_CACHE_KEY, JSON.stringify(data));
    console.log('[AvatarCache] Avatar cached for user:', userId);
  } catch (e) {
    console.error('[AvatarCache] Error setting cache:', e);
  }
}

/**
 * Clear avatar cache (call when user updates profile or logs out)
 */
export function clearAvatarCache(): void {
  try {
    localStorage.removeItem(AVATAR_CACHE_KEY);
    console.log('[AvatarCache] Cache cleared');
  } catch (e) {
    console.error('[AvatarCache] Error clearing cache:', e);
  }
}

/**
 * Invalidate and refresh avatar from database
 * Call this when user updates their profile picture
 */
export async function invalidateAndRefreshAvatar(
  supabase: any,
  userId: string
): Promise<string | null> {
  clearAvatarCache();
  
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('avatar_url')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('[AvatarCache] Error fetching avatar:', error);
      return null;
    }

    const avatarUrl = data?.avatar_url || null;
    setCachedAvatar(userId, avatarUrl);
    return avatarUrl;
  } catch (e) {
    console.error('[AvatarCache] Exception fetching avatar:', e);
    return null;
  }
}

/**
 * Get avatar URL with cache-first strategy
 * Returns cached value if available, otherwise fetches from DB
 */
export async function getAvatarWithCache(
  supabase: any,
  userId: string
): Promise<string | null> {
  // Check cache first
  const cached = getCachedAvatar(userId);
  if (cached !== null) {
    console.log('[AvatarCache] Using cached avatar');
    return cached;
  }

  // Cache miss - fetch from DB
  console.log('[AvatarCache] Cache miss, fetching from DB');
  return await invalidateAndRefreshAvatar(supabase, userId);
}
