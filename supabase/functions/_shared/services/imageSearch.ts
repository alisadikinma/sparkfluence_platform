/**
 * IMAGE SEARCH SERVICE - Pexels + Unsplash + Pixabay Integration
 * ================================================================
 * 
 * Search for product/stock images from free APIs.
 * Used by B-roll pipeline when real product images are preferred over AI-generated.
 * 
 * Priority Order (based on 2025 reviews):
 *   1. Pexels  - Best API, no attribution, professional quality
 *   2. Unsplash - High quality artistic, major brand usage
 *   3. Pixabay - Most versatile but has restrictions
 * 
 * Last Updated: 2026-01-11
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ImageSearchResult {
  url: string;              // Direct image URL (high quality)
  thumbnail: string;        // Preview URL
  width: number;
  height: number;
  source: 'unsplash' | 'pexels' | 'pixabay';
  photographer: string;
  photographerUrl: string;
  description: string;
  downloadUrl: string;      // For attribution tracking
  license: string;
  relevanceScore?: number;  // For smart selection
}

export interface SearchOptions {
  query: string;
  orientation?: 'landscape' | 'portrait' | 'square';
  minWidth?: number;
  minHeight?: number;
  perPage?: number;
  page?: number;
}

// ============================================================================
// PEXELS API (PRIMARY - Best overall)
// Docs: https://www.pexels.com/api/documentation/
// Rate limit: 200 requests/hour, 20,000/month
// ============================================================================

const PEXELS_BASE_URL = 'https://api.pexels.com/v1';

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  alt: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
}

interface PexelsSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  next_page?: string;
}

export async function searchPexels(
  apiKey: string,
  options: SearchOptions
): Promise<ImageSearchResult[]> {
  const {
    query,
    orientation = 'portrait',
    perPage = 10,
    page = 1
  } = options;

  const params = new URLSearchParams({
    query,
    orientation,
    per_page: perPage.toString(),
    page: page.toString(),
  });

  console.log(`[PEXELS] Searching: "${query}" (${orientation})`);

  const response = await fetch(`${PEXELS_BASE_URL}/search?${params}`, {
    headers: {
      'Authorization': apiKey
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[PEXELS] API error: ${response.status} - ${errorText}`);
    throw new Error(`Pexels API error: ${response.status}`);
  }

  const data: PexelsSearchResponse = await response.json();
  console.log(`[PEXELS] Found ${data.total_results} results, returning ${data.photos.length}`);

  return data.photos.map((photo, index) => ({
    url: orientation === 'portrait' ? photo.src.portrait : photo.src.large2x,
    thumbnail: photo.src.medium,
    width: photo.width,
    height: photo.height,
    source: 'pexels' as const,
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    description: photo.alt || query,
    downloadUrl: photo.url,
    license: 'Pexels License (free commercial use, no attribution required)',
    relevanceScore: 100 - index // API returns by relevance, first = highest
  }));
}

// ============================================================================
// UNSPLASH API (SECONDARY - High quality artistic)
// Docs: https://unsplash.com/documentation
// Rate limit: 50 requests/hour (demo), 5000/hour (production)
// ============================================================================

const UNSPLASH_BASE_URL = 'https://api.unsplash.com';

interface UnsplashPhoto {
  id: string;
  width: number;
  height: number;
  description: string | null;
  alt_description: string | null;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  links: {
    download_location: string;
  };
  user: {
    name: string;
    links: {
      html: string;
    };
  };
}

interface UnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: UnsplashPhoto[];
}

export async function searchUnsplash(
  accessKey: string,
  options: SearchOptions
): Promise<ImageSearchResult[]> {
  const {
    query,
    orientation = 'portrait',
    perPage = 10,
    page = 1
  } = options;

  const params = new URLSearchParams({
    query,
    orientation,
    per_page: perPage.toString(),
    page: page.toString(),
  });

  console.log(`[UNSPLASH] Searching: "${query}" (${orientation})`);

  const response = await fetch(`${UNSPLASH_BASE_URL}/search/photos?${params}`, {
    headers: {
      'Authorization': `Client-ID ${accessKey}`,
      'Accept-Version': 'v1'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[UNSPLASH] API error: ${response.status} - ${errorText}`);
    throw new Error(`Unsplash API error: ${response.status}`);
  }

  const data: UnsplashSearchResponse = await response.json();
  console.log(`[UNSPLASH] Found ${data.total} results, returning ${data.results.length}`);

  return data.results.map((photo, index) => ({
    url: photo.urls.regular,
    thumbnail: photo.urls.small,
    width: photo.width,
    height: photo.height,
    source: 'unsplash' as const,
    photographer: photo.user.name,
    photographerUrl: photo.user.links.html,
    description: photo.alt_description || photo.description || query,
    downloadUrl: photo.links.download_location,
    license: 'Unsplash License (free commercial use)',
    relevanceScore: 100 - index
  }));
}

/**
 * Track download for Unsplash attribution (required by API guidelines)
 */
export async function trackUnsplashDownload(
  accessKey: string,
  downloadLocationUrl: string
): Promise<void> {
  try {
    await fetch(downloadLocationUrl, {
      headers: {
        'Authorization': `Client-ID ${accessKey}`
      }
    });
    console.log(`[UNSPLASH] Download tracked`);
  } catch (error) {
    console.warn(`[UNSPLASH] Failed to track download: ${error}`);
  }
}

// ============================================================================
// PIXABAY API (TERTIARY - Most versatile but has restrictions)
// Docs: https://pixabay.com/api/docs/
// Rate limit: 100 requests/minute (5000/hour)
// Note: Must mention Pixabay, no hotlinking
// ============================================================================

const PIXABAY_BASE_URL = 'https://pixabay.com/api';

interface PixabayHit {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  previewURL: string;
  previewWidth: number;
  previewHeight: number;
  webformatURL: string;
  webformatWidth: number;
  webformatHeight: number;
  largeImageURL: string;
  imageWidth: number;
  imageHeight: number;
  imageSize: number;
  views: number;
  downloads: number;
  likes: number;
  user: string;
  userImageURL: string;
}

interface PixabaySearchResponse {
  total: number;
  totalHits: number;
  hits: PixabayHit[];
}

export async function searchPixabay(
  apiKey: string,
  options: SearchOptions
): Promise<ImageSearchResult[]> {
  const {
    query,
    orientation = 'vertical', // Pixabay uses 'vertical' not 'portrait'
    perPage = 10,
    page = 1
  } = options;

  // Map orientation
  const pixabayOrientation = orientation === 'portrait' ? 'vertical' : 
                             orientation === 'landscape' ? 'horizontal' : 'all';

  const params = new URLSearchParams({
    key: apiKey,
    q: query,
    orientation: pixabayOrientation,
    per_page: perPage.toString(),
    page: page.toString(),
    image_type: 'photo',
    safesearch: 'true',
    min_width: '1024',
    min_height: '1024'
  });

  console.log(`[PIXABAY] Searching: "${query}" (${pixabayOrientation})`);

  const response = await fetch(`${PIXABAY_BASE_URL}/?${params}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[PIXABAY] API error: ${response.status} - ${errorText}`);
    throw new Error(`Pixabay API error: ${response.status}`);
  }

  const data: PixabaySearchResponse = await response.json();
  console.log(`[PIXABAY] Found ${data.totalHits} results, returning ${data.hits.length}`);

  return data.hits.map((hit, index) => ({
    url: hit.largeImageURL,
    thumbnail: hit.webformatURL,
    width: hit.imageWidth,
    height: hit.imageHeight,
    source: 'pixabay' as const,
    photographer: hit.user,
    photographerUrl: `https://pixabay.com/users/${hit.user}/`,
    description: hit.tags,
    downloadUrl: hit.pageURL,
    license: 'Pixabay License (free commercial use, Pixabay mention appreciated)',
    relevanceScore: 100 - index + (hit.downloads / 10000) // Boost popular images
  }));
}

// ============================================================================
// SMART IMAGE SELECTION
// Select best image from results based on aspect ratio, resolution, relevance
// ============================================================================

interface SelectionCriteria {
  targetAspectRatio: '9:16' | '16:9' | '1:1';
  minWidth?: number;
  minHeight?: number;
  preferHighRelevance?: boolean;
}

/**
 * Calculate aspect ratio score (0-100)
 * Higher = closer to target aspect ratio
 */
function calculateAspectScore(
  width: number, 
  height: number, 
  target: '9:16' | '16:9' | '1:1'
): number {
  const actualRatio = width / height;
  
  const targetRatios: Record<string, number> = {
    '9:16': 9 / 16,   // 0.5625 (portrait)
    '16:9': 16 / 9,   // 1.777 (landscape)
    '1:1': 1          // 1.0 (square)
  };
  
  const targetRatio = targetRatios[target];
  const difference = Math.abs(actualRatio - targetRatio);
  
  // Score: 100 = perfect match, decreases with difference
  // Max acceptable difference: 0.5
  const score = Math.max(0, 100 - (difference * 200));
  return score;
}

/**
 * Calculate resolution score (0-100)
 * Prefer images >= 1024px on shortest side
 */
function calculateResolutionScore(width: number, height: number): number {
  const minDimension = Math.min(width, height);
  
  if (minDimension >= 1024) return 100;
  if (minDimension >= 800) return 80;
  if (minDimension >= 600) return 60;
  if (minDimension >= 400) return 40;
  return 20;
}

/**
 * Select best image from results based on multiple criteria
 */
export function selectBestImage(
  results: ImageSearchResult[],
  criteria: SelectionCriteria
): ImageSearchResult | null {
  if (results.length === 0) return null;
  if (results.length === 1) return results[0];
  
  const {
    targetAspectRatio,
    minWidth = 800,
    minHeight = 800,
    preferHighRelevance = true
  } = criteria;
  
  // Filter by minimum resolution first
  const filtered = results.filter(r => r.width >= minWidth && r.height >= minHeight);
  const candidates = filtered.length > 0 ? filtered : results;
  
  // Score each image
  const scored = candidates.map(img => {
    const aspectScore = calculateAspectScore(img.width, img.height, targetAspectRatio);
    const resolutionScore = calculateResolutionScore(img.width, img.height);
    const relevanceScore = img.relevanceScore || 50;
    
    // Weighted total
    // Aspect ratio is most important for video, then relevance, then resolution
    const totalScore = preferHighRelevance
      ? (aspectScore * 0.4) + (relevanceScore * 0.4) + (resolutionScore * 0.2)
      : (aspectScore * 0.5) + (resolutionScore * 0.3) + (relevanceScore * 0.2);
    
    return { ...img, totalScore };
  });
  
  // Sort by total score descending
  scored.sort((a, b) => b.totalScore - a.totalScore);
  
  const best = scored[0];
  console.log(`[SELECT] Best image: ${best.source} (score: ${best.totalScore.toFixed(1)}, ${best.width}x${best.height})`);
  
  return best;
}

// ============================================================================
// UNIFIED SEARCH (Pexels → Unsplash → Pixabay)
// ============================================================================

export interface UnifiedSearchResult {
  results: ImageSearchResult[];
  source: 'pexels' | 'unsplash' | 'pixabay' | 'mixed';
  totalFound: number;
}

/**
 * Search images from all sources with priority order:
 * 1. Pexels (best API, no attribution)
 * 2. Unsplash (high quality)
 * 3. Pixabay (most versatile)
 */
export async function searchImages(
  pexelsKey: string | undefined,
  unsplashKey: string | undefined,
  pixabayKey: string | undefined,
  options: SearchOptions
): Promise<UnifiedSearchResult> {
  let results: ImageSearchResult[] = [];
  let source: 'pexels' | 'unsplash' | 'pixabay' | 'mixed' = 'pexels';

  // 1. Try Pexels first (PRIMARY)
  if (pexelsKey) {
    try {
      results = await searchPexels(pexelsKey, options);
      source = 'pexels';
      
      if (results.length > 0) {
        console.log(`[SEARCH] ✅ Pexels returned ${results.length} results`);
        return { results, source, totalFound: results.length };
      }
    } catch (error) {
      console.warn(`[SEARCH] Pexels failed: ${error}`);
    }
  }

  // 2. Try Unsplash (SECONDARY)
  if (unsplashKey) {
    try {
      const unsplashResults = await searchUnsplash(unsplashKey, options);
      source = 'unsplash';
      
      if (unsplashResults.length > 0) {
        console.log(`[SEARCH] ✅ Unsplash returned ${unsplashResults.length} results`);
        return { results: unsplashResults, source, totalFound: unsplashResults.length };
      }
    } catch (error) {
      console.warn(`[SEARCH] Unsplash failed: ${error}`);
    }
  }

  // 3. Try Pixabay (TERTIARY)
  if (pixabayKey) {
    try {
      const pixabayResults = await searchPixabay(pixabayKey, options);
      source = 'pixabay';
      
      if (pixabayResults.length > 0) {
        console.log(`[SEARCH] ✅ Pixabay returned ${pixabayResults.length} results`);
        return { results: pixabayResults, source, totalFound: pixabayResults.length };
      }
    } catch (error) {
      console.warn(`[SEARCH] Pixabay failed: ${error}`);
    }
  }

  console.log(`[SEARCH] ⚠️ No results from any source`);
  return { results: [], source: 'pexels', totalFound: 0 };
}

// ============================================================================
// PRODUCT-SPECIFIC SEARCH
// Optimized for specific product models, not generic categories
// ============================================================================

/**
 * Search for product images with smart keyword extraction
 * Returns the BEST single image (not first)
 */
export async function searchProductImage(
  query: string,
  unsplashKey: string | undefined,
  pexelsKey: string | undefined,
  pixabayKey?: string | undefined,
  aspectRatio: '9:16' | '16:9' | '1:1' = '9:16'
): Promise<ImageSearchResult | null> {
  console.log(`[PRODUCT SEARCH] Query: "${query}"`);

  const result = await searchImages(pexelsKey, unsplashKey, pixabayKey, {
    query: query,
    orientation: aspectRatio === '9:16' ? 'portrait' : 
                 aspectRatio === '16:9' ? 'landscape' : 'square',
    perPage: 10,  // Get more results for better selection
    minResults: 1
  });

  if (result.results.length === 0) {
    console.log(`[PRODUCT SEARCH] No results for "${query}"`);
    return null;
  }

  // Use smart selection instead of just first result
  const best = selectBestImage(result.results, {
    targetAspectRatio: aspectRatio,
    minWidth: 800,
    minHeight: 800,
    preferHighRelevance: true
  });

  if (best) {
    console.log(`[PRODUCT SEARCH] ✅ Selected: ${best.description} from ${best.source}`);
  }
  
  return best;
}

// ============================================================================
// DOWNLOAD & UPLOAD HELPER
// ============================================================================

/**
 * Download image and upload to Supabase storage
 */
export async function downloadAndUploadSearchImage(
  imageResult: ImageSearchResult,
  supabase: any,
  unsplashKey?: string
): Promise<string> {
  // Track download for Unsplash (required by API guidelines)
  if (imageResult.source === 'unsplash' && unsplashKey) {
    await trackUnsplashDownload(unsplashKey, imageResult.downloadUrl);
  }

  // Download image
  const response = await fetch(imageResult.url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  const imageBlob = await response.blob();
  
  // Determine content type
  const contentType = imageResult.url.includes('.png') ? 'image/png' : 'image/jpeg';
  const extension = contentType === 'image/png' ? 'png' : 'jpg';
  
  // Generate filename with source attribution
  const filename = `stock/${imageResult.source}_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;

  // Upload to Supabase
  const { error: uploadError } = await supabase.storage
    .from('generated-images')
    .upload(filename, imageBlob, { 
      contentType, 
      upsert: false 
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage.from('generated-images').getPublicUrl(filename);
  
  console.log(`[STOCK] ✅ Uploaded: ${filename}`);
  return urlData.publicUrl;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  PEXELS_BASE_URL,
  UNSPLASH_BASE_URL,
  PIXABAY_BASE_URL
};
