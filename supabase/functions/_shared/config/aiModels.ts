/**
 * CENTRALIZED AI MODEL CONFIGURATION
 * ===================================
 * 
 * All video and image generation model configurations in one place.
 * To add a new model: just add a new entry to the appropriate config object.
 * 
 * NO CODE CHANGES NEEDED in Edge Functions when adding new models!
 * 
 * Supported Providers:
 * - GeminiGen.AI (Sora 2, VEO 3.1, Nano Banana/Imagen)
 * - OpenAI (DALL-E 3, GPT-Image-1)
 * - HuggingFace (FLUX)
 * 
 * Last Updated: 2026-01-09
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:3' | '3:4';
export type Provider = 'geminigen' | 'openai' | 'huggingface' | 'runway' | 'pika';

export interface ApiMapping<T = string> {
  /** Our internal value */
  internal: T;
  /** Value to send to API */
  api: string;
}

// ============================================================================
// VIDEO MODEL CONFIGURATION
// ============================================================================

export interface VideoModelConfig {
  /** Unique key for this model */
  key: string;
  /** Display name for UI */
  displayName: string;
  /** Provider */
  provider: Provider;
  /** API endpoint URL */
  endpoint: string;
  /** Model name to send to API */
  apiModelName: string;
  /** Supported durations in seconds */
  supportedDurations: number[];
  /** Default duration */
  defaultDuration: number;
  /** Resolution mapping (internal → API) */
  resolutions: {
    [key: string]: {
      apiValue: string;
      dimensions: { width: number; height: number };
    };
  };
  /** Aspect ratio mapping (internal → API) */
  aspectRatios: {
    [K in AspectRatio]?: {
      apiValue: string;
      maxResolution: string;
    };
  };
  /** Reference image parameter name */
  refImageParam: string;
  /** Max words for dialogue per duration */
  dialogueLimits: { [duration: number]: number };
  /** Estimated cost per video */
  costPerVideo: number;
  /** Model strengths */
  strengths: string[];
  /** Model weaknesses */
  weaknesses: string[];
  /** Best use cases */
  bestFor: string[];
  /** Is this model active/enabled */
  enabled: boolean;
  /** Notes/comments */
  notes?: string;
}

export const VIDEO_MODELS: Record<string, VideoModelConfig> = {
  // ==========================================================================
  // SORA 2 (GeminiGen) - 10s/15s, 720p
  // ==========================================================================
  'sora-2': {
    key: 'sora-2',
    displayName: 'Sora 2 (10s/15s)',
    provider: 'geminigen',
    endpoint: 'https://api.geminigen.ai/uapi/v1/video-gen/sora',
    apiModelName: 'sora-2',
    supportedDurations: [10, 15],
    defaultDuration: 10,
    resolutions: {
      '720p': { apiValue: 'small', dimensions: { width: 1280, height: 720 } },
    },
    aspectRatios: {
      '9:16': { apiValue: 'portrait', maxResolution: '720p' },
      '16:9': { apiValue: 'landscape', maxResolution: '720p' },
    },
    refImageParam: 'file_urls',
    // Max words based on Indonesian speech rate (130 WPM * 0.80 safety margin)
    // 10s: 130/60 * 10 * 0.80 = 17.3 ≈ 17 words
    // 15s: 130/60 * 15 * 0.80 = 26 words
    dialogueLimits: { 10: 17, 15: 26 },
    costPerVideo: 0.20,
    strengths: ['10s/15s duration', 'good motion', 'AI voiceover'],
    weaknesses: ['720p only', 'lip-sync not best'],
    bestFor: ['B-roll', 'longer segments', 'narrative sequences'],
    enabled: true,
    notes: 'Default model for most use cases',
  },

  // ==========================================================================
  // SORA 2 PRO (GeminiGen) - 25s, 720p
  // ==========================================================================
  'sora-2-pro': {
    key: 'sora-2-pro',
    displayName: 'Sora 2 Pro (25s)',
    provider: 'geminigen',
    endpoint: 'https://api.geminigen.ai/uapi/v1/video-gen/sora',
    apiModelName: 'sora-2-pro',
    supportedDurations: [25],
    defaultDuration: 25,
    resolutions: {
      '720p': { apiValue: 'small', dimensions: { width: 1280, height: 720 } },
    },
    aspectRatios: {
      '9:16': { apiValue: 'portrait', maxResolution: '720p' },
      '16:9': { apiValue: 'landscape', maxResolution: '720p' },
    },
    refImageParam: 'file_urls',
    // 25s: 130/60 * 25 * 0.80 = 43.3 ≈ 43 words
    dialogueLimits: { 25: 43 },
    costPerVideo: 0.50,
    strengths: ['25s long duration', 'consistency'],
    weaknesses: ['720p only', 'expensive'],
    bestFor: ['Long-form content', 'single-shot narratives'],
    enabled: true,
    notes: 'Use for segments requiring >15s',
  },

  // ==========================================================================
  // SORA 2 PRO HD (GeminiGen) - 15s, 1080p
  // ==========================================================================
  'sora-2-pro-hd': {
    key: 'sora-2-pro-hd',
    displayName: 'Sora 2 Pro HD (15s, 1080p)',
    provider: 'geminigen',
    endpoint: 'https://api.geminigen.ai/uapi/v1/video-gen/sora',
    apiModelName: 'sora-2-pro-hd',
    supportedDurations: [15],
    defaultDuration: 15,
    resolutions: {
      '1080p': { apiValue: 'large', dimensions: { width: 1920, height: 1080 } },
    },
    aspectRatios: {
      '9:16': { apiValue: 'portrait', maxResolution: '1080p' },
      '16:9': { apiValue: 'landscape', maxResolution: '1080p' },
    },
    refImageParam: 'file_urls',
    // 15s: 130/60 * 15 * 0.80 = 26 words
    dialogueLimits: { 15: 26 },
    costPerVideo: 0.50,
    strengths: ['1080p HD quality', '15s duration'],
    weaknesses: ['15s only', 'expensive'],
    bestFor: ['Hero shots', 'premium content', 'Hook/CTA'],
    enabled: true,
    notes: 'Best quality option for important segments',
  },

  // ==========================================================================
  // VEO 3.1 FAST (GeminiGen) - 8s, up to 1080p
  // ==========================================================================
  'veo-3.1-fast': {
    key: 'veo-3.1-fast',
    displayName: 'VEO 3.1 Fast (8s)',
    provider: 'geminigen',
    endpoint: 'https://api.geminigen.ai/uapi/v1/video-gen/veo',
    apiModelName: 'veo-3.1-fast',
    supportedDurations: [4, 6, 8],
    defaultDuration: 8,
    resolutions: {
      '720p': { apiValue: '720p', dimensions: { width: 1280, height: 720 } },
      '1080p': { apiValue: '1080p', dimensions: { width: 1920, height: 1080 } },
    },
    aspectRatios: {
      '9:16': { apiValue: '9:16', maxResolution: '720p' },
      '16:9': { apiValue: '16:9', maxResolution: '1080p' },
    },
    refImageParam: 'ref_images',
    // Based on Indonesian 130 WPM * 0.80 safety:
    // 4s: 6.9 ≈ 7 words, 6s: 10.4 ≈ 10 words, 8s: 13.8 ≈ 14 words
    dialogueLimits: { 4: 7, 6: 10, 8: 14 },
    costPerVideo: 0.20,
    strengths: ['best lip-sync', 'native audio', '1080p for 16:9'],
    weaknesses: ['8s max', '720p for portrait'],
    bestFor: ['Creator talking head', 'dialogue-heavy', 'lip-sync critical'],
    enabled: true,
    notes: 'Legacy model - use Sora 2 for most cases',
  },
};

// ============================================================================
// IMAGE MODEL CONFIGURATION
// ============================================================================

export interface ImageModelConfig {
  /** Unique key for this model */
  key: string;
  /** Display name for UI */
  displayName: string;
  /** Provider */
  provider: Provider;
  /** API endpoint URL */
  endpoint: string;
  /** Model name to send to API */
  apiModelName: string;
  /** Supported aspect ratios */
  aspectRatios: {
    [K in AspectRatio]?: {
      apiValue: string;
      dimensions: { width: number; height: number };
    };
  };
  /** Quality options (if supported) */
  qualityOptions?: {
    [key: string]: string; // internal → API
  };
  /** Style options (if supported) */
  styleOptions?: string[];
  /** Reference image parameter name (null if not supported) */
  refImageParam: string | null;
  /** Supports negative prompts */
  supportsNegativePrompt: boolean;
  /** Max prompt length */
  maxPromptLength: number;
  /** Response format */
  responseFormat: 'url' | 'b64_json' | 'both';
  /** Estimated cost per image */
  costPerImage: number;
  /** Is FREE tier */
  isFree: boolean;
  /** Rate limit (requests per minute, 0 = no limit) */
  rateLimit: number;
  /** Model strengths */
  strengths: string[];
  /** Model weaknesses */
  weaknesses: string[];
  /** Best use cases */
  bestFor: string[];
  /** Is this model active/enabled */
  enabled: boolean;
  /** Notes/comments */
  notes?: string;
}

export const IMAGE_MODELS: Record<string, ImageModelConfig> = {
  // ==========================================================================
  // DALL-E 3 (OpenAI) - Premium quality
  // ==========================================================================
  'dall-e-3': {
    key: 'dall-e-3',
    displayName: 'DALL-E 3',
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1/images/generations',
    apiModelName: 'dall-e-3',
    aspectRatios: {
      '1:1': { apiValue: '1024x1024', dimensions: { width: 1024, height: 1024 } },
      '9:16': { apiValue: '1024x1792', dimensions: { width: 1024, height: 1792 } },
      '16:9': { apiValue: '1792x1024', dimensions: { width: 1792, height: 1024 } },
    },
    qualityOptions: {
      'standard': 'standard',
      'hd': 'hd',
    },
    styleOptions: ['vivid', 'natural'],
    refImageParam: null, // DALL-E 3 doesn't support reference images
    supportsNegativePrompt: false,
    maxPromptLength: 4000,
    responseFormat: 'both',
    costPerImage: 0.08, // HD 1024x1792
    isFree: false,
    rateLimit: 15, // ~4s between calls
    strengths: ['highest quality', 'best prompt following', 'HD output'],
    weaknesses: ['no reference image', 'no negative prompt', 'expensive'],
    bestFor: ['Hero images', 'thumbnails', 'high-quality B-roll'],
    enabled: true,
    notes: 'Best quality but no face consistency support',
  },

  // ==========================================================================
  // GPT-Image-1 (OpenAI) - Face consistency with Edit API
  // ==========================================================================
  'gpt-image-1': {
    key: 'gpt-image-1',
    displayName: 'GPT-Image-1',
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1/images/generations',
    apiModelName: 'gpt-image-1',
    aspectRatios: {
      '1:1': { apiValue: '1024x1024', dimensions: { width: 1024, height: 1024 } },
      '9:16': { apiValue: '1024x1536', dimensions: { width: 1024, height: 1536 } },
      '16:9': { apiValue: '1536x1024', dimensions: { width: 1536, height: 1024 } },
    },
    qualityOptions: {
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
      'auto': 'auto',
    },
    styleOptions: undefined,
    refImageParam: 'image[]', // For Edit API (multipart form)
    supportsNegativePrompt: false,
    maxPromptLength: 4000,
    responseFormat: 'b64_json',
    costPerImage: 0.04,
    isFree: false,
    rateLimit: 15,
    strengths: ['face consistency', 'Edit API support', 'good quality'],
    weaknesses: ['no negative prompt'],
    bestFor: ['CREATOR shots (Hook/CTA)', 'face consistency required'],
    enabled: true,
    notes: 'Use Edit API with reference image for face consistency',
  },

  // ==========================================================================
  // NANO BANANA PRO / IMAGEN-PRO (GeminiGen) - Fast, good quality
  // ==========================================================================
  'imagen-pro': {
    key: 'imagen-pro',
    displayName: 'Nano Banana Pro',
    provider: 'geminigen',
    endpoint: 'https://api.geminigen.ai/uapi/v1/generate_image',
    apiModelName: 'imagen-pro',
    aspectRatios: {
      '1:1': { apiValue: '1:1', dimensions: { width: 1024, height: 1024 } },
      '9:16': { apiValue: '9:16', dimensions: { width: 1024, height: 1792 } },
      '16:9': { apiValue: '16:9', dimensions: { width: 1792, height: 1024 } },
      '4:3': { apiValue: '4:3', dimensions: { width: 1024, height: 768 } },
      '3:4': { apiValue: '3:4', dimensions: { width: 768, height: 1024 } },
    },
    qualityOptions: undefined,
    styleOptions: [
      'None', '3D Render', 'Acrylic', 'Anime General', 'Creative',
      'Dynamic', 'Fashion', 'Game Concept', 'Graphic Design 3D',
      'Illustration', 'Photorealistic', 'Portrait', 'Portrait Cinematic',
      'Portrait Fashion', 'Ray Traced', 'Stock Photo', 'Watercolor'
    ],
    refImageParam: 'file_urls',
    supportsNegativePrompt: false,
    maxPromptLength: 4000,
    responseFormat: 'url',
    costPerImage: 0.0, // FREE with rate limit
    isFree: true,
    rateLimit: 5, // 5 req/min, 100/hour, 1000/day
    strengths: ['FREE', 'fast', 'good quality', 'reference image support'],
    weaknesses: ['rate limited', 'async (need polling)'],
    bestFor: ['High volume', 'B-roll images', 'cost-effective production'],
    enabled: true,
    notes: 'Best FREE option with reference image support',
  },

  // ==========================================================================
  // IMAGEN-4-FAST (GeminiGen) - Quick, high quality
  // ==========================================================================
  'imagen-4-fast': {
    key: 'imagen-4-fast',
    displayName: 'Imagen 4 Fast',
    provider: 'geminigen',
    endpoint: 'https://api.geminigen.ai/uapi/v1/generate_image',
    apiModelName: 'imagen-4-fast',
    aspectRatios: {
      '1:1': { apiValue: '1:1', dimensions: { width: 1024, height: 1024 } },
      '9:16': { apiValue: '9:16', dimensions: { width: 1024, height: 1792 } },
      '16:9': { apiValue: '16:9', dimensions: { width: 1792, height: 1024 } },
    },
    qualityOptions: undefined,
    styleOptions: [
      'None', 'Photorealistic', 'Illustration', 'Anime General',
      '3D Render', 'Creative', 'Dynamic'
    ],
    refImageParam: 'file_urls',
    supportsNegativePrompt: false,
    maxPromptLength: 4000,
    responseFormat: 'url',
    costPerImage: 0.02,
    isFree: false,
    rateLimit: 0, // No rate limit
    strengths: ['fast', 'high quality', 'no rate limit'],
    weaknesses: ['paid'],
    bestFor: ['Production use', 'when speed matters'],
    enabled: true,
  },

  // ==========================================================================
  // IMAGEN-4-ULTRA (GeminiGen) - Premium quality
  // ==========================================================================
  'imagen-4-ultra': {
    key: 'imagen-4-ultra',
    displayName: 'Imagen 4 Ultra',
    provider: 'geminigen',
    endpoint: 'https://api.geminigen.ai/uapi/v1/generate_image',
    apiModelName: 'imagen-4-ultra',
    aspectRatios: {
      '1:1': { apiValue: '1:1', dimensions: { width: 1024, height: 1024 } },
      '9:16': { apiValue: '9:16', dimensions: { width: 1024, height: 1792 } },
      '16:9': { apiValue: '16:9', dimensions: { width: 1792, height: 1024 } },
    },
    qualityOptions: undefined,
    styleOptions: [
      'None', 'Photorealistic', 'Portrait Cinematic', 'Ray Traced',
      'Creative', 'Dynamic', 'Fashion'
    ],
    refImageParam: 'file_urls',
    supportsNegativePrompt: false,
    maxPromptLength: 4000,
    responseFormat: 'url',
    costPerImage: 0.05,
    isFree: false,
    rateLimit: 0,
    strengths: ['premium quality', 'best results'],
    weaknesses: ['more expensive', 'slower'],
    bestFor: ['Hero images', 'thumbnails', 'premium content'],
    enabled: true,
  },

  // ==========================================================================
  // FLUX (HuggingFace) - FREE fallback
  // ==========================================================================
  'flux-schnell': {
    key: 'flux-schnell',
    displayName: 'FLUX.1-schnell',
    provider: 'huggingface',
    endpoint: 'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
    apiModelName: 'FLUX.1-schnell',
    aspectRatios: {
      '1:1': { apiValue: 'custom', dimensions: { width: 1024, height: 1024 } },
      '9:16': { apiValue: 'custom', dimensions: { width: 576, height: 1024 } },
      '16:9': { apiValue: 'custom', dimensions: { width: 1024, height: 576 } },
    },
    qualityOptions: undefined,
    styleOptions: undefined,
    refImageParam: null, // FLUX doesn't support reference images
    supportsNegativePrompt: false,
    maxPromptLength: 2000,
    responseFormat: 'b64_json', // Returns raw image blob
    costPerImage: 0.0,
    isFree: true,
    rateLimit: 0, // Depends on HF tier
    strengths: ['FREE', 'fast', 'no rate limit'],
    weaknesses: ['lower resolution', 'no reference image'],
    bestFor: ['B-roll fallback', 'high volume testing'],
    enabled: true,
    notes: 'Use as fallback when other providers fail',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get video model config by key
 */
export function getVideoModel(key: string): VideoModelConfig | undefined {
  return VIDEO_MODELS[key];
}

/**
 * Get image model config by key
 */
export function getImageModel(key: string): ImageModelConfig | undefined {
  return IMAGE_MODELS[key];
}

/**
 * Get all enabled video models
 */
export function getEnabledVideoModels(): VideoModelConfig[] {
  return Object.values(VIDEO_MODELS).filter(m => m.enabled);
}

/**
 * Get all enabled image models
 */
export function getEnabledImageModels(): ImageModelConfig[] {
  return Object.values(IMAGE_MODELS).filter(m => m.enabled);
}

/**
 * Get FREE image models
 */
export function getFreeImageModels(): ImageModelConfig[] {
  return Object.values(IMAGE_MODELS).filter(m => m.enabled && m.isFree);
}

/**
 * Get aspect ratio API value for a model
 */
export function getAspectRatioApiValue(
  model: VideoModelConfig | ImageModelConfig,
  aspectRatio: AspectRatio
): string | undefined {
  return model.aspectRatios[aspectRatio]?.apiValue;
}

/**
 * Get dimensions for aspect ratio
 */
export function getDimensions(
  model: VideoModelConfig | ImageModelConfig,
  aspectRatio: AspectRatio
): { width: number; height: number } | undefined {
  return model.aspectRatios[aspectRatio]?.dimensions;
}

/**
 * Validate duration for video model
 */
export function isValidDuration(model: VideoModelConfig, duration: number): boolean {
  return model.supportedDurations.includes(duration);
}

/**
 * Get closest valid duration for video model
 */
export function getClosestDuration(model: VideoModelConfig, targetDuration: number): number {
  if (model.supportedDurations.includes(targetDuration)) {
    return targetDuration;
  }
  // Find closest supported duration
  return model.supportedDurations.reduce((prev, curr) => 
    Math.abs(curr - targetDuration) < Math.abs(prev - targetDuration) ? curr : prev
  );
}

/**
 * Get max dialogue words for video duration
 */
export function getMaxDialogueWords(model: VideoModelConfig, duration: number): number {
  return model.dialogueLimits[duration] || Math.floor(duration * 2); // ~2 words/sec fallback
}

/**
 * Build FormData for video generation API call
 */
export function buildVideoFormData(
  model: VideoModelConfig,
  params: {
    prompt: string;
    aspectRatio: AspectRatio;
    duration: number;
    referenceImageUrl?: string;
  }
): FormData {
  const formData = new FormData();
  
  formData.append('prompt', params.prompt);
  formData.append('model', model.apiModelName);
  formData.append('duration', String(params.duration));
  
  // Get API-specific aspect ratio value
  const aspectApiValue = getAspectRatioApiValue(model, params.aspectRatio);
  if (aspectApiValue) {
    formData.append('aspect_ratio', aspectApiValue);
  }
  
  // Get resolution based on aspect ratio
  const maxRes = model.aspectRatios[params.aspectRatio]?.maxResolution;
  if (maxRes && model.resolutions[maxRes]) {
    formData.append('resolution', model.resolutions[maxRes].apiValue);
  }
  
  // Add reference image if supported and provided
  if (params.referenceImageUrl && model.refImageParam) {
    formData.append(model.refImageParam, params.referenceImageUrl);
  }
  
  return formData;
}

/**
 * Build FormData for image generation API call (GeminiGen)
 */
export function buildImageFormData(
  model: ImageModelConfig,
  params: {
    prompt: string;
    aspectRatio: AspectRatio;
    style?: string;
    referenceImageUrl?: string;
  }
): FormData {
  const formData = new FormData();
  
  formData.append('prompt', params.prompt);
  formData.append('model', model.apiModelName);
  
  // Get API-specific aspect ratio value
  const aspectApiValue = getAspectRatioApiValue(model, params.aspectRatio);
  if (aspectApiValue) {
    formData.append('aspect_ratio', aspectApiValue);
  }
  
  // Add style if supported and provided
  if (params.style && model.styleOptions?.includes(params.style)) {
    formData.append('style', params.style);
  }
  
  // Add reference image if supported and provided
  if (params.referenceImageUrl && model.refImageParam) {
    formData.append(model.refImageParam, params.referenceImageUrl);
  }
  
  return formData;
}

/**
 * Select best video model based on requirements
 */
export function selectVideoModel(params: {
  duration: number;
  needsHD?: boolean;
  needsLipSync?: boolean;
  preferFree?: boolean;
}): VideoModelConfig {
  const { duration, needsHD, needsLipSync } = params;
  
  // If HD required and 15s works, use sora-2-pro-hd
  if (needsHD && duration <= 15) {
    return VIDEO_MODELS['sora-2-pro-hd'];
  }
  
  // If lip-sync critical and <= 8s, consider VEO
  if (needsLipSync && duration <= 8) {
    return VIDEO_MODELS['veo-3.1-fast'];
  }
  
  // If very long (>15s), use sora-2-pro
  if (duration > 15) {
    return VIDEO_MODELS['sora-2-pro'];
  }
  
  // Default: sora-2 (best balance)
  return VIDEO_MODELS['sora-2'];
}

/**
 * Select best image model based on requirements
 * 
 * PRIORITY (Cost-optimized):
 * - HOOK/CTA (CREATOR): Nano Banana (FREE) → GPT-Image-1 (fallback for face)
 * - B-ROLL: FLUX (FREE) → Nano Banana (fallback)
 */
export function selectImageModel(params: {
  needsFaceConsistency?: boolean;
  hasReferenceImage?: boolean;
  preferFree?: boolean;
  isCreatorShot?: boolean;
}): ImageModelConfig {
  const { needsFaceConsistency, hasReferenceImage, preferFree = true, isCreatorShot } = params;
  
  // CREATOR shots (HOOK/CTA): Nano Banana first, GPT-Image-1 if face consistency critical
  if (isCreatorShot) {
    // If face consistency is CRITICAL and has reference → GPT-Image-1
    if (needsFaceConsistency && hasReferenceImage) {
      return IMAGE_MODELS['gpt-image-1'];
    }
    // Default for CREATOR: Nano Banana (FREE, supports reference)
    return IMAGE_MODELS['imagen-pro'];
  }
  
  // B-ROLL: FLUX first (FREE), Nano Banana fallback
  // FLUX is fastest and completely free with no rate limit
  return IMAGE_MODELS['flux-schnell'];
}

/**
 * Get image model fallback chain
 * 
 * PRIORITY (Cost-optimized):
 * - HOOK/CTA: Nano Banana → GPT-Image-1 → FLUX
 * - B-ROLL: FLUX → Nano Banana
 */
export function getImageModelFallbackChain(primaryModel: string, isCreatorShot: boolean = false): string[] {
  // CREATOR shots: Nano Banana → GPT-Image-1 → FLUX
  if (isCreatorShot) {
    const creatorChains: Record<string, string[]> = {
      'imagen-pro': ['gpt-image-1', 'flux-schnell'],
      'gpt-image-1': ['imagen-pro', 'flux-schnell'],
      'dall-e-3': ['gpt-image-1', 'imagen-pro', 'flux-schnell'],
    };
    return creatorChains[primaryModel] || ['gpt-image-1', 'flux-schnell'];
  }
  
  // B-ROLL: FLUX → Nano Banana
  const brollChains: Record<string, string[]> = {
    'flux-schnell': ['imagen-pro'],
    'imagen-pro': ['flux-schnell'],
    'imagen-4-fast': ['imagen-pro', 'flux-schnell'],
    'imagen-4-ultra': ['imagen-4-fast', 'imagen-pro', 'flux-schnell'],
    'dall-e-3': ['imagen-pro', 'flux-schnell'],
  };
  
  return brollChains[primaryModel] || ['imagen-pro'];
}

// ============================================================================
// EXPORTS FOR TYPE CHECKING
// ============================================================================

export type VideoModelKey = keyof typeof VIDEO_MODELS;
export type ImageModelKey = keyof typeof IMAGE_MODELS;
