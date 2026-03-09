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
export type Provider = 'geminigen' | 'openai' | 'huggingface' | 'fal' | 'runway' | 'pika';

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
  /** Supports audio_url parameter for TTS integration */
  supportsAudio?: boolean;
  /** Extra static form params to always include (e.g. mode=custom for Grok) */
  extraFormParams?: Record<string, string>;
  /** Notes/comments */
  notes?: string;
}

export const VIDEO_MODELS: Record<string, VideoModelConfig> = {
  // ==========================================================================
  // WAN VIDEO 2.5 PREVIEW (FAL.AI) - 5s/10s, 1080p, image-to-video WITH AUDIO SUPPORT
  // Supports audio_url for TTS voice cloning integration
  // Docs: https://fal.ai/models/fal-ai/wan-25-preview/image-to-video/api
  // ==========================================================================
  'wan-2.5': {
    key: 'wan-2.5',
    displayName: 'Wan Video 2.5 + Voice (fal.ai)',
    provider: 'fal',
    endpoint: 'https://queue.fal.run/fal-ai/wan-25-preview/image-to-video',
    apiModelName: 'fal-ai/wan-25-preview/image-to-video',
    supportedDurations: [5, 10],
    defaultDuration: 5,
    resolutions: {
      '1080p': { apiValue: '1080p', dimensions: { width: 1920, height: 1080 } },
      '720p': { apiValue: '720p', dimensions: { width: 1280, height: 720 } },
      '480p': { apiValue: '480p', dimensions: { width: 854, height: 480 } },
    },
    aspectRatios: {
      '9:16': { apiValue: '9:16', maxResolution: '1080p' },
      '16:9': { apiValue: '16:9', maxResolution: '1080p' },
      '1:1': { apiValue: '1:1', maxResolution: '1080p' },
    },
    refImageParam: 'image_url',
    dialogueLimits: { 5: 9, 10: 17 },
    costPerVideo: 0.10, // Base cost, actual: $0.05/sec (480p), $0.10/sec (720p), $0.15/sec (1080p)
    strengths: ['1080p resolution', 'fast generation', '5s/10s duration', 'AUDIO SUPPORT', 'voice cloning via TTS', 'prompt expansion'],
    weaknesses: ['requires reference image', 'audio max 30s'],
    bestFor: ['ALL segments with voice', 'TTS voice cloning', 'cinematic motion'],
    enabled: true,
    supportsAudio: true, // NEW: Flag for audio_url support
    notes: 'Supports audio_url (WAV/MP3 3-30s) for TTS voice cloning. Use with Chatterbox Turbo for voice integration.',
  },

  // ==========================================================================
  // KLING VIDEO 2.5 (FAL.AI) - 5s/10s, 1080p, image-to-video (NO AUDIO)
  // BACKUP model only (if Wan 2.5 fails)
  // ==========================================================================
  'kling-2.5': {
    key: 'kling-2.5',
    displayName: 'Kling Video 2.5 (fal.ai)',
    provider: 'fal',
    endpoint: 'https://queue.fal.run/fal-ai/kling-video/v2.5/standard/image-to-video',
    apiModelName: 'fal-ai/kling-video/v2.5/standard/image-to-video',
    supportedDurations: [5, 10],
    defaultDuration: 5,
    resolutions: {
      '1080p': { apiValue: '1080p', dimensions: { width: 1920, height: 1080 } },
      '720p': { apiValue: '720p', dimensions: { width: 1280, height: 720 } },
    },
    aspectRatios: {
      '9:16': { apiValue: '16:9', maxResolution: '1080p' }, // Note: Kling uses landscape naming
      '16:9': { apiValue: '16:9', maxResolution: '1080p' },
      '1:1': { apiValue: '1:1', maxResolution: '1080p' },
    },
    refImageParam: 'image_url',
    dialogueLimits: { 5: 9, 10: 17 },
    costPerVideo: 0.15,
    strengths: ['1080p resolution', '5s/10s duration', 'image-to-video'],
    weaknesses: ['NO AUDIO SUPPORT', 'slower than Wan 2.5', 'more expensive'],
    bestFor: ['Backup when Wan 2.5 fails', 'silent B-ROLL only'],
    enabled: true,
    notes: 'BACKUP model only. NO audio support - audio will need FFmpeg merge in post-processing.',
  },

  // ==========================================================================
  // VEO 3.1 HD (GeminiGen.AI) - Best lip-sync, highest quality
  // PRIMARY for talking head / CREATOR segments
  // Docs: https://docs.geminigen.ai - Duration 8s, 720p, $0.015/video
  // ==========================================================================
  'veo-3.1-fast-hd': {
    key: 'veo-3.1-fast-hd',
    displayName: 'VEO 3.1 Fast HD',
    provider: 'geminigen',
    endpoint: 'https://api.geminigen.ai/uapi/v1/video-gen/veo',
    apiModelName: 'veo-3.1-fast',
    supportedDurations: [8],
    defaultDuration: 8,
    maxDuration: 8,
    resolutions: {
      '720p': { apiValue: '720p', dimensions: { width: 1280, height: 720 } },
    },
    aspectRatios: {
      '9:16': { apiValue: '9:16', maxResolution: '720p' },
      '16:9': { apiValue: '16:9', maxResolution: '720p' },
    },
    refImageParam: 'ref_images',
    dialogueLimits: { 8: 14 },
    costPerVideo: 0.015,
    strengths: ['Fast generation', 'Good lip-sync', 'Budget-friendly ($0.015)', 'Native audio'],
    weaknesses: ['720p only', '8s fixed duration'],
    bestFor: ['High volume production', 'Most segments', 'Budget-conscious projects'],
    enabled: true,
    notes: 'DEFAULT model. Fast + 720p at $0.015/video.',
  },

  // ==========================================================================
  // VEO 3.1 FAST FULL HD (GeminiGen.AI) - Fast + 1080p
  // Docs: https://docs.geminigen.ai - Duration 8s, 1080p, $0.015/video
  // ==========================================================================
  'veo-3.1-fast-fhd': {
    key: 'veo-3.1-fast-fhd',
    displayName: 'VEO 3.1 Fast FHD',
    provider: 'geminigen',
    endpoint: 'https://api.geminigen.ai/uapi/v1/video-gen/veo',
    apiModelName: 'veo-3.1-fast',
    supportedDurations: [8],
    defaultDuration: 8,
    maxDuration: 8,
    resolutions: {
      '1080p': { apiValue: '1080p', dimensions: { width: 1920, height: 1080 } },
    },
    aspectRatios: {
      '9:16': { apiValue: '9:16', maxResolution: '1080p' },
      '16:9': { apiValue: '16:9', maxResolution: '1080p' },
    },
    refImageParam: 'ref_images',
    dialogueLimits: { 8: 14 },
    costPerVideo: 0.015,
    strengths: ['Fast + 1080p Full HD', 'Good lip-sync', 'Budget-friendly ($0.015)', 'Native audio'],
    weaknesses: ['8s fixed duration'],
    bestFor: ['Full HD output at low cost', 'CREATOR segments'],
    enabled: true,
    notes: 'Fast variant + 1080p at $0.015/video.',
  },

  // ==========================================================================
  // VEO 3.1 HD (GeminiGen.AI) - Premium quality, 720p
  // Docs: https://docs.geminigen.ai - Duration 8s, 720p, $0.50/video
  // ==========================================================================
  'veo-3.1-hd': {
    key: 'veo-3.1-hd',
    displayName: 'VEO 3.1 HD',
    provider: 'geminigen',
    endpoint: 'https://api.geminigen.ai/uapi/v1/video-gen/veo',
    apiModelName: 'veo-3.1',
    supportedDurations: [8],
    defaultDuration: 8,
    maxDuration: 8,
    resolutions: {
      '720p': { apiValue: '720p', dimensions: { width: 1280, height: 720 } },
    },
    aspectRatios: {
      '9:16': { apiValue: '9:16', maxResolution: '720p' },
      '16:9': { apiValue: '16:9', maxResolution: '720p' },
    },
    refImageParam: 'ref_images',
    dialogueLimits: { 8: 14 },
    costPerVideo: 0.50,
    strengths: ['Premium lip-sync quality', 'Native audio', 'Best voice consistency'],
    weaknesses: ['Expensive ($0.50)', '8s fixed', '720p only'],
    bestFor: ['Premium CREATOR shots', 'Hero content', 'High-value segments'],
    enabled: true,
    notes: 'Premium VEO 3.1 + 720p at $0.50/video.',
  },

  // ==========================================================================
  // VEO 3.1 FULL HD (GeminiGen.AI) - Premium quality, 1080p
  // Docs: https://docs.geminigen.ai - Duration 8s, 1080p, $0.50/video
  // ==========================================================================
  'veo-3.1-fhd': {
    key: 'veo-3.1-fhd',
    displayName: 'VEO 3.1 FHD',
    provider: 'geminigen',
    endpoint: 'https://api.geminigen.ai/uapi/v1/video-gen/veo',
    apiModelName: 'veo-3.1',
    supportedDurations: [8],
    defaultDuration: 8,
    maxDuration: 8,
    resolutions: {
      '1080p': { apiValue: '1080p', dimensions: { width: 1920, height: 1080 } },
    },
    aspectRatios: {
      '9:16': { apiValue: '9:16', maxResolution: '1080p' },
      '16:9': { apiValue: '16:9', maxResolution: '1080p' },
    },
    refImageParam: 'ref_images',
    dialogueLimits: { 8: 14 },
    costPerVideo: 0.50,
    strengths: ['Best quality', '1080p Full HD', 'Premium lip-sync', 'Native audio'],
    weaknesses: ['Most expensive ($0.50)', '8s fixed'],
    bestFor: ['Top-tier production', 'Hero HOOK/CTA shots', 'Premium content'],
    enabled: true,
    notes: 'Premium VEO 3.1 + 1080p at $0.50/video.',
  },

  // ==========================================================================
  // GROK 3 (GeminiGen.AI) - Aurora engine, flexible durations
  // Endpoint: POST https://api.geminigen.ai/uapi/v1/video-gen/grok
  // Durations: 6s, 10s, 15s | Resolution: 480p, 720p | $0.015/video
  // ==========================================================================
  'grok-3': {
    key: 'grok-3',
    displayName: 'Grok 3',
    provider: 'geminigen',
    endpoint: 'https://api.geminigen.ai/uapi/v1/video-gen/grok',
    apiModelName: 'grok-3',
    supportedDurations: [6, 10, 15],
    defaultDuration: 6,
    maxDuration: 15,
    resolutions: {
      '720p': { apiValue: '720p', dimensions: { width: 1280, height: 720 } },
      '480p': { apiValue: '480p', dimensions: { width: 854, height: 480 } },
    },
    aspectRatios: {
      '9:16': { apiValue: 'portrait',   maxResolution: '720p' },
      '16:9': { apiValue: 'landscape',  maxResolution: '720p' },
      '1:1':  { apiValue: 'square',     maxResolution: '720p' },
    },
    refImageParam: 'file_urls',
    dialogueLimits: { 6: 10, 10: 15, 15: 25 },
    costPerVideo: 0.015,
    strengths: ['Flexible duration (6/10/15s)', 'Native SFX + audio', 'Fast generation', 'Budget-friendly ($0.015)'],
    weaknesses: ['Max 720p', 'Motion-only prompts required'],
    bestFor: ['B-ROLL segments', 'Dynamic motion', 'Flexible duration needs'],
    enabled: true,
    extraFormParams: { mode: 'custom' },
    notes: 'Grok 3 Aurora engine via GeminiGen.AI. $0.015/video. Uses webhook.',
  },

  // ==========================================================================
  // LEGACY ALIAS — kept for backward compatibility
  // ==========================================================================
  'veo-3.1-fast': {
    key: 'veo-3.1-fast',
    displayName: 'VEO 3.1 Fast HD',
    provider: 'geminigen',
    endpoint: 'https://api.geminigen.ai/uapi/v1/video-gen/veo',
    apiModelName: 'veo-3.1-fast',
    supportedDurations: [8],
    defaultDuration: 8,
    maxDuration: 8,
    resolutions: {
      '720p': { apiValue: '720p', dimensions: { width: 1280, height: 720 } },
    },
    aspectRatios: {
      '9:16': { apiValue: '9:16', maxResolution: '720p' },
      '16:9': { apiValue: '16:9', maxResolution: '720p' },
    },
    refImageParam: 'ref_images',
    dialogueLimits: { 8: 14 },
    costPerVideo: 0.015,
    strengths: ['Fast generation', 'Budget-friendly ($0.015)'],
    weaknesses: ['720p only', '8s fixed'],
    bestFor: ['General use'],
    enabled: true,
    notes: 'Legacy alias → use veo-3.1-fast-hd.',
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

  // ==========================================================================
  // FAL.AI NANO BANANA PRO - Text-to-Image (NO reference image support!)
  // Use for text-only generation when no avatar reference is available
  // ==========================================================================
  'fal-nano-banana': {
    key: 'fal-nano-banana',
    displayName: 'Nano Banana 2 T2I (fal.ai)',
    provider: 'fal',
    endpoint: 'https://fal.run/fal-ai/nano-banana-2',
    apiModelName: 'fal-ai/nano-banana-2',
    aspectRatios: {
      '1:1': { apiValue: '1:1', dimensions: { width: 1024, height: 1024 } },
      '9:16': { apiValue: '9:16', dimensions: { width: 1024, height: 1792 } },
      '16:9': { apiValue: '16:9', dimensions: { width: 1792, height: 1024 } },
      '4:3': { apiValue: '4:3', dimensions: { width: 1024, height: 768 } },
      '3:4': { apiValue: '3:4', dimensions: { width: 768, height: 1024 } },
    },
    qualityOptions: undefined,
    styleOptions: undefined, // T2I doesn't use style presets
    refImageParam: null, // IMPORTANT: Text-to-image does NOT support reference images!
    supportsNegativePrompt: false,
    maxPromptLength: 4000,
    responseFormat: 'url',
    costPerImage: 0.15,
    isFree: false,
    rateLimit: 0,
    strengths: ['semantic understanding', 'typography', 'cinematic quality'],
    weaknesses: ['no reference image', 'no negative prompt', 'paid'],
    bestFor: ['Text-to-image', 'when no avatar reference available'],
    enabled: true,
    notes: 'Text-to-image only - use fal-nano-banana-edit for face consistency!',
  },

  // ==========================================================================
  // FAL.AI NANO BANANA PRO EDIT - Image Edit (WITH reference image support!)
  // PRIMARY for CREATOR shots with avatar reference for face consistency
  // Supports up to 14 reference images via image_urls array
  // ==========================================================================
  'fal-nano-banana-edit': {
    key: 'fal-nano-banana-edit',
    displayName: 'Nano Banana 2 Edit (fal.ai)',
    provider: 'fal',
    endpoint: 'https://fal.run/fal-ai/nano-banana-2/edit',
    apiModelName: 'fal-ai/nano-banana-2/edit',
    aspectRatios: {
      '1:1': { apiValue: '1:1', dimensions: { width: 1024, height: 1024 } },
      '9:16': { apiValue: '9:16', dimensions: { width: 1024, height: 1792 } },
      '16:9': { apiValue: '16:9', dimensions: { width: 1792, height: 1024 } },
      '4:3': { apiValue: '4:3', dimensions: { width: 1024, height: 768 } },
      '3:4': { apiValue: '3:4', dimensions: { width: 768, height: 1024 } },
    },
    qualityOptions: undefined,
    styleOptions: undefined, // Edit endpoint doesn't use style presets
    refImageParam: 'image_urls', // Array of reference image URLs (up to 14)
    supportsNegativePrompt: false,
    maxPromptLength: 4000,
    responseFormat: 'url',
    costPerImage: 0.08, // Updated 2026-03-09: $0.08 standard, 1.5x for 2K, 2x for 4K
    isFree: false,
    rateLimit: 0,
    strengths: ['face consistency', 'character preservation', 'multi-image reference', 'up to 14 refs'],
    weaknesses: ['no negative prompt', 'paid', 'requires reference image'],
    bestFor: ['CREATOR shots with avatar', 'HOOK/CTA', 'face consistency required'],
    enabled: true,
    notes: 'PRIMARY for CREATOR shots - best face consistency via image_urls array',
  },

  // ==========================================================================
  // FAL.AI QWEN IMAGE 2 PRO EDIT - A-ROLL with reference image support
  // Cheaper alternative to Nano Banana for HOOK/CTA segments
  // ==========================================================================
  'fal-qwen-image-2-pro-edit': {
    key: 'fal-qwen-image-2-pro-edit',
    displayName: 'Qwen Image 2 Pro Edit (fal.ai)',
    provider: 'fal',
    endpoint: 'https://fal.run/fal-ai/qwen-image-2/pro/edit',
    apiModelName: 'fal-ai/qwen-image-2/pro/edit',
    aspectRatios: {
      '1:1': { apiValue: '1:1', dimensions: { width: 1024, height: 1024 } },
      '9:16': { apiValue: '9:16', dimensions: { width: 1024, height: 1792 } },
      '16:9': { apiValue: '16:9', dimensions: { width: 1792, height: 1024 } },
      '4:3': { apiValue: '4:3', dimensions: { width: 1024, height: 768 } },
      '3:4': { apiValue: '3:4', dimensions: { width: 768, height: 1024 } },
    },
    qualityOptions: undefined,
    styleOptions: undefined,
    refImageParam: 'image_urls',
    supportsNegativePrompt: false,
    maxPromptLength: 4000,
    responseFormat: 'url',
    costPerImage: 0.075,
    isFree: false,
    rateLimit: 0,
    strengths: ['reference image support', 'good face consistency', 'cheaper than nano-banana'],
    weaknesses: ['no negative prompt', 'paid', 'requires reference image'],
    bestFor: ['CREATOR shots', 'HOOK/CTA', 'budget-conscious production'],
    enabled: true,
    notes: 'A-ROLL edit model — cheaper alternative to Nano Banana 2. $0.075/image',
  },

  // ==========================================================================
  // FAL.AI SEEDREAM V5 LITE EDIT - A-ROLL with reference image support
  // Most affordable edit model for HOOK/CTA segments
  // ==========================================================================
  'fal-seedream-v5-lite-edit': {
    key: 'fal-seedream-v5-lite-edit',
    displayName: 'Seedream v5 Lite Edit (fal.ai)',
    provider: 'fal',
    endpoint: 'https://fal.run/fal-ai/bytedance/seedream/v5/lite/edit',
    apiModelName: 'fal-ai/bytedance/seedream/v5/lite/edit',
    aspectRatios: {
      '1:1': { apiValue: 'custom', dimensions: { width: 1024, height: 1024 } },
      '9:16': { apiValue: 'custom', dimensions: { width: 1024, height: 1792 } },
      '16:9': { apiValue: 'custom', dimensions: { width: 1792, height: 1024 } },
      '4:3': { apiValue: 'custom', dimensions: { width: 1024, height: 768 } },
      '3:4': { apiValue: 'custom', dimensions: { width: 768, height: 1024 } },
    },
    qualityOptions: undefined,
    styleOptions: undefined,
    refImageParam: 'image_urls',
    supportsNegativePrompt: false,
    maxPromptLength: 4000,
    responseFormat: 'url',
    costPerImage: 0.035,
    isFree: false,
    rateLimit: 0,
    strengths: ['most affordable edit model', 'reference image support', 'ByteDance quality'],
    weaknesses: ['no negative prompt', 'lite variant', 'requires reference image'],
    bestFor: ['CREATOR shots', 'HOOK/CTA', 'high volume production'],
    enabled: true,
    notes: 'Most affordable A-ROLL edit model. $0.035/image. Good for high volume.',
  },

  // ==========================================================================
  // FAL.AI SEEDREAM V4 - High-res B-ROLL (ByteDance)
  // Excellent text rendering, up to 4096px, cinematic quality
  // ==========================================================================
  'fal-seedream-v4': {
    key: 'fal-seedream-v4',
    displayName: 'Seedream v4 (fal.ai)',
    provider: 'fal',
    endpoint: 'https://fal.run/fal-ai/bytedance/seedream/v4/text-to-image',
    apiModelName: 'fal-ai/bytedance/seedream/v4/text-to-image',
    aspectRatios: {
      '1:1': { apiValue: 'custom', dimensions: { width: 2048, height: 2048 } },
      '9:16': { apiValue: 'custom', dimensions: { width: 1024, height: 1792 } },
      '16:9': { apiValue: 'custom', dimensions: { width: 1792, height: 1024 } },
      '4:3': { apiValue: 'custom', dimensions: { width: 1536, height: 1152 } },
      '3:4': { apiValue: 'custom', dimensions: { width: 1152, height: 1536 } },
    },
    qualityOptions: undefined,
    styleOptions: undefined,
    refImageParam: null,
    supportsNegativePrompt: false,
    maxPromptLength: 4000,
    responseFormat: 'url',
    costPerImage: 0.03,
    isFree: false,
    rateLimit: 0,
    strengths: ['high resolution (up to 4096px)', 'excellent text rendering', 'cinematic quality', 'fast', 'most affordable'],
    weaknesses: ['no reference image', 'no negative prompt'],
    bestFor: ['B-ROLL', 'high-res visuals', 'text/typography in images', 'hero shots'],
    enabled: true,
    notes: 'HIGH QUALITY B-ROLL - best for text rendering and high-res output. $0.03/image',
  },

  // ==========================================================================
  // FAL.AI SEEDREAM V4.5 - Upgraded B-ROLL (ByteDance)
  // Higher quality than v4, better prompt following
  // ==========================================================================
  'fal-seedream-v4-5': {
    key: 'fal-seedream-v4-5',
    displayName: 'Seedream v4.5 (fal.ai)',
    provider: 'fal',
    endpoint: 'https://fal.run/fal-ai/bytedance/seedream/v4.5/text-to-image',
    apiModelName: 'fal-ai/bytedance/seedream/v4.5/text-to-image',
    aspectRatios: {
      '1:1': { apiValue: 'custom', dimensions: { width: 2048, height: 2048 } },
      '9:16': { apiValue: 'custom', dimensions: { width: 1024, height: 1792 } },
      '16:9': { apiValue: 'custom', dimensions: { width: 1792, height: 1024 } },
      '4:3': { apiValue: 'custom', dimensions: { width: 1536, height: 1152 } },
      '3:4': { apiValue: 'custom', dimensions: { width: 1152, height: 1536 } },
    },
    qualityOptions: undefined,
    styleOptions: undefined,
    refImageParam: null,
    supportsNegativePrompt: false,
    maxPromptLength: 4000,
    responseFormat: 'url',
    costPerImage: 0.04,
    isFree: false,
    rateLimit: 0,
    strengths: ['upgraded from v4', 'better prompt following', 'high resolution', 'cinematic quality'],
    weaknesses: ['no reference image', 'no negative prompt', 'slightly more expensive than v4'],
    bestFor: ['B-ROLL', 'premium visuals', 'when v4 quality not sufficient'],
    enabled: true,
    notes: 'UPGRADED B-ROLL - better quality than v4, $0.04/image',
  },

  // ==========================================================================
  // FAL.AI SEEDREAM V5 LITE - Latest B-ROLL (ByteDance)
  // Newest generation, text-to-image and edit variants
  // ==========================================================================
  'fal-seedream-v5-lite': {
    key: 'fal-seedream-v5-lite',
    displayName: 'Seedream v5 Lite (fal.ai)',
    provider: 'fal',
    endpoint: 'https://fal.run/fal-ai/bytedance/seedream/v5/lite/text-to-image',
    apiModelName: 'fal-ai/bytedance/seedream/v5/lite/text-to-image',
    aspectRatios: {
      '1:1': { apiValue: 'custom', dimensions: { width: 1024, height: 1024 } },
      '9:16': { apiValue: 'custom', dimensions: { width: 1024, height: 1792 } },
      '16:9': { apiValue: 'custom', dimensions: { width: 1792, height: 1024 } },
      '4:3': { apiValue: 'custom', dimensions: { width: 1024, height: 768 } },
      '3:4': { apiValue: 'custom', dimensions: { width: 768, height: 1024 } },
    },
    qualityOptions: undefined,
    styleOptions: undefined,
    refImageParam: null,
    supportsNegativePrompt: false,
    maxPromptLength: 4000,
    responseFormat: 'url',
    costPerImage: 0.035,
    isFree: false,
    rateLimit: 0,
    strengths: ['latest generation', 'better aesthetics than v4', 'balanced price/quality'],
    weaknesses: ['no reference image', 'no negative prompt', 'lite variant'],
    bestFor: ['B-ROLL', 'modern aesthetics', 'general purpose'],
    enabled: true,
    notes: 'LATEST B-ROLL - newest Seedream generation, $0.035/image',
  },

  // ==========================================================================
  // FAL.AI FLUX KONTEXT MAX MULTI - Multi-image reference support
  // For B-ROLL with creator face + reference image (2 images in 1 generation)
  // ==========================================================================
  'fal-flux-kontext-multi': {
    key: 'fal-flux-kontext-multi',
    displayName: 'FLUX Kontext Max Multi (fal.ai)',
    provider: 'fal',
    endpoint: 'https://fal.run/fal-ai/flux-pro/kontext/max/multi',
    apiModelName: 'fal-ai/flux-pro/kontext/max/multi',
    aspectRatios: {
      '1:1': { apiValue: '1:1', dimensions: { width: 1024, height: 1024 } },
      '9:16': { apiValue: '9:16', dimensions: { width: 1024, height: 1792 } },
      '16:9': { apiValue: '16:9', dimensions: { width: 1792, height: 1024 } },
      '4:3': { apiValue: '4:3', dimensions: { width: 1024, height: 768 } },
      '3:4': { apiValue: '3:4', dimensions: { width: 768, height: 1024 } },
    },
    qualityOptions: undefined,
    styleOptions: undefined,
    refImageParam: 'image_urls', // Array of multiple image URLs
    supportsNegativePrompt: false,
    maxPromptLength: 4000,
    responseFormat: 'url',
    costPerImage: 0.10,
    isFree: false,
    rateLimit: 0,
    strengths: [
      'multi-image reference (combine creator face + scene reference)',
      'experimental FLUX Kontext',
      'good quality output',
      'supports 2+ reference images'
    ],
    weaknesses: ['no negative prompt', 'paid', 'experimental'],
    bestFor: ['B-ROLL with creator face', 'multi-reference compositions', 'scene + character combination'],
    enabled: true,
    notes: 'USE FOR B-ROLL when user enables "Include Creator Face" checkbox - combines creator ref + scene ref',
  },

  // ==========================================================================
  // FAL.AI QWEN IMAGE v1 (LEGACY) - Original Qwen, still active
  // fal-ai/qwen-image — $0.02/image, turbo mode, negative prompt
  // ==========================================================================
  'fal-qwen-image-v1': {
    key: 'fal-qwen-image-v1',
    displayName: 'Qwen Image v1 Legacy (fal.ai)',
    provider: 'fal',
    endpoint: 'https://fal.run/fal-ai/qwen-image',
    apiModelName: 'fal-ai/qwen-image',
    aspectRatios: {
      '1:1': { apiValue: 'square', dimensions: { width: 1024, height: 1024 } },
      '9:16': { apiValue: 'portrait_3_4', dimensions: { width: 768, height: 1024 } },
      '16:9': { apiValue: 'landscape_16_9', dimensions: { width: 1024, height: 576 } },
      '4:3': { apiValue: 'landscape_4_3', dimensions: { width: 1024, height: 768 } },
      '3:4': { apiValue: 'portrait_3_4', dimensions: { width: 768, height: 1024 } },
    },
    qualityOptions: {
      'regular': 'none',
      'turbo': 'high',
    },
    styleOptions: undefined,
    refImageParam: null,
    supportsNegativePrompt: true,
    maxPromptLength: 4000,
    responseFormat: 'url',
    costPerImage: 0.02,
    isFree: false,
    rateLimit: 0,
    strengths: ['negative prompt support', 'turbo mode', 'LoRA support', 'cheapest option'],
    weaknesses: ['no reference image', 'max 1024px', 'legacy version'],
    bestFor: ['B-ROLL', 'budget shoots', 'when negative prompt needed'],
    enabled: true,
    notes: 'LEGACY Qwen v1 - still active, $0.02/image. Use qwen-image for budget shoots.',
  },

  // ==========================================================================
  // FAL.AI QWEN IMAGE v2 - B-ROLL with negative prompt support
  // Turbo mode available, supports LoRAs
  // ==========================================================================
  'fal-qwen-image': {
    key: 'fal-qwen-image',
    displayName: 'Qwen Image 2 T2I (fal.ai)',
    provider: 'fal',
    endpoint: 'https://fal.run/fal-ai/qwen-image-2/text-to-image',
    apiModelName: 'fal-ai/qwen-image-2/text-to-image',
    aspectRatios: {
      '1:1': { apiValue: '1:1', dimensions: { width: 1024, height: 1024 } },
      '9:16': { apiValue: '9:16', dimensions: { width: 768, height: 1360 } },
      '16:9': { apiValue: '16:9', dimensions: { width: 1360, height: 768 } },
      '4:3': { apiValue: '4:3', dimensions: { width: 1024, height: 768 } },
      '3:4': { apiValue: '3:4', dimensions: { width: 768, height: 1024 } },
    },
    qualityOptions: undefined,
    styleOptions: undefined,
    refImageParam: null, // T2I - no reference support
    supportsNegativePrompt: true, // KEY FEATURE retained from v1
    maxPromptLength: 4000,
    responseFormat: 'url',
    costPerImage: 0.035,
    isFree: false,
    rateLimit: 0,
    strengths: ['negative prompt support', 'high quality', 'qwen-2 upgraded model'],
    weaknesses: ['no reference image'],
    bestFor: ['B-ROLL', 'environments', 'when negative prompt needed'],
    enabled: true,
    notes: 'B-ROLL with NEGATIVE PROMPT - Qwen Image 2, $0.035/image. Better quality than v1.',
  },
};

// ============================================================================
// TTS (TEXT-TO-SPEECH) MODEL CONFIGURATION
// ============================================================================

export interface TTSModelConfig {
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
  /** Available preset voices */
  presetVoices: {
    [key: string]: {
      id: string;
      gender: 'male' | 'female';
      language: string;
      description: string;
    };
  };
  /** Supports custom voice cloning via audio URL */
  supportsVoiceCloning: boolean;
  /** Required audio duration for voice cloning (seconds) */
  voiceCloneDuration?: { min: number; max: number };
  /** Supports paralinguistic tags ([laugh], [sigh], etc.) */
  supportsParalinguisticTags: boolean;
  /** Available paralinguistic tags */
  paralinguisticTags?: string[];
  /** Temperature range */
  temperatureRange: { min: number; max: number; default: number };
  /** Supports seed for reproducibility */
  supportsSeed: boolean;
  /** Max text length (characters) */
  maxTextLength: number;
  /** Output format */
  outputFormat: 'wav' | 'mp3' | 'flac';
  /** Estimated cost per request */
  costPerRequest: number;
  /** Estimated generation speed (seconds of audio per second of processing) */
  generationSpeed: number;
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

export const TTS_MODELS: Record<string, TTSModelConfig> = {
  // ==========================================================================
  // CHATTERBOX TURBO (fal.ai) - Fast TTS with paralinguistic tags
  // ==========================================================================
  'chatterbox-turbo': {
    key: 'chatterbox-turbo',
    displayName: 'Chatterbox Turbo (fal.ai)',
    provider: 'fal',
    endpoint: 'https://fal.run/fal-ai/chatterbox/text-to-speech/turbo',
    apiModelName: 'fal-ai/chatterbox/text-to-speech/turbo',
    presetVoices: {
      // Male voices
      'aaron': { id: 'aaron', gender: 'male', language: 'en', description: 'Professional male voice' },
      'andy': { id: 'andy', gender: 'male', language: 'en', description: 'Friendly male voice' },
      'archer': { id: 'archer', gender: 'male', language: 'en', description: 'Confident male voice' },
      'brian': { id: 'brian', gender: 'male', language: 'en', description: 'Mature male voice' },
      'dylan': { id: 'dylan', gender: 'male', language: 'en', description: 'Young male voice' },
      'emmanuel': { id: 'emmanuel', gender: 'male', language: 'en', description: 'Authoritative male voice' },
      'ethan': { id: 'ethan', gender: 'male', language: 'en', description: 'Warm male voice' },
      'gavin': { id: 'gavin', gender: 'male', language: 'en', description: 'Energetic male voice' },
      'gordon': { id: 'gordon', gender: 'male', language: 'en', description: 'Deep male voice' },
      'ivan': { id: 'ivan', gender: 'male', language: 'en', description: 'Smooth male voice' },
      'walter': { id: 'walter', gender: 'male', language: 'en', description: 'Distinguished male voice' },
      // Female voices
      'abigail': { id: 'abigail', gender: 'female', language: 'en', description: 'Professional female voice' },
      'anaya': { id: 'anaya', gender: 'female', language: 'en', description: 'Bright female voice' },
      'chloe': { id: 'chloe', gender: 'female', language: 'en', description: 'Friendly female voice' },
      'evelyn': { id: 'evelyn', gender: 'female', language: 'en', description: 'Elegant female voice' },
      'laura': { id: 'laura', gender: 'female', language: 'en', description: 'Warm female voice' },
      'lucy': { id: 'lucy', gender: 'female', language: 'en', description: 'Clear female voice (default)' },
      'madison': { id: 'madison', gender: 'female', language: 'en', description: 'Young female voice' },
      'marisol': { id: 'marisol', gender: 'female', language: 'en', description: 'Energetic female voice' },
      'meera': { id: 'meera', gender: 'female', language: 'en', description: 'Confident female voice' },
    },
    supportsVoiceCloning: true,
    voiceCloneDuration: { min: 5, max: 10 },
    supportsParalinguisticTags: true,
    paralinguisticTags: [
      '[clear throat]',
      '[sigh]',
      '[shush]',
      '[cough]',
      '[groan]',
      '[sniff]',
      '[gasp]',
      '[chuckle]',
      '[laugh]'
    ],
    temperatureRange: { min: 0.05, max: 2.0, default: 0.8 },
    supportsSeed: true,
    maxTextLength: 5000,
    outputFormat: 'wav',
    costPerRequest: 0.05,
    generationSpeed: 10, // ~10x real-time (10s audio in ~1s)
    strengths: [
      'Very fast generation (~10x real-time)',
      'Paralinguistic tags for emotion',
      'Voice cloning from 5-10s audio',
      '20+ preset voices',
      'Reproducible with seed'
    ],
    weaknesses: [
      'English only',
      'No multilingual support',
      'Preset voices may not match all languages'
    ],
    bestFor: [
      'CREATOR segment voiceovers',
      'Fast turnaround needed',
      'Emotional expression with tags',
      'Voice cloning from user recordings'
    ],
    enabled: true,
    notes: 'PRIMARY TTS for Sparkfluence v2. Use voice cloning for personalized creator voice.',
  },
};

// ============================================================================
// MUSIC MODEL CONFIGURATION
// ============================================================================

export interface MusicModelConfig {
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
  /** Supports structure tags like [Intro], [Verse], [Chorus] */
  supportsStructureTags: boolean;
  /** Available structure tags */
  structureTags?: string[];
  /** Supports lyrics input */
  supportsLyrics: boolean;
  /** Output audio format */
  outputFormat: 'mp3' | 'wav';
  /** Prompt length limits */
  promptLimits: { min: number; max: number };
  /** Lyrics length limits */
  lyricsLimits: { min: number; max: number };
  /** Estimated cost per request */
  costPerRequest: number;
  /** Generation speed multiplier (e.g., 2 = generates 2x faster than real-time) */
  generationSpeed: number;
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

export const MUSIC_MODELS: Record<string, MusicModelConfig> = {
  // ==========================================================================
  // MINIMAX MUSIC V2 (fal.ai) - AI Music Generation with Lyrics Support
  // Docs: https://fal.ai/models/fal-ai/minimax-music/v2/api
  // ==========================================================================
  'minimax-music-v2': {
    key: 'minimax-music-v2',
    displayName: 'Minimax Music v2 (fal.ai)',
    provider: 'fal',
    endpoint: 'https://fal.run/fal-ai/minimax-music/v2',
    apiModelName: 'fal-ai/minimax-music/v2',
    supportsStructureTags: true,
    structureTags: ['[Intro]', '[Verse]', '[Chorus]', '[Bridge]', '[Outro]'],
    supportsLyrics: true,
    outputFormat: 'mp3',
    promptLimits: { min: 10, max: 300 },
    lyricsLimits: { min: 10, max: 3000 },
    costPerRequest: 0.10,
    generationSpeed: 2, // ~2x real-time
    strengths: [
      'High-quality AI music generation',
      'Structure tags for song arrangement',
      'Lyrics support for vocal tracks',
      'Multiple genre support',
      'Good for background music'
    ],
    weaknesses: [
      'Fixed output duration (~30s-60s)',
      'English lyrics preferred',
      'May take longer than TTS'
    ],
    bestFor: [
      'Background music for videos',
      'BGM for short-form content',
      'Intro/outro music',
      'Mood-setting ambient tracks'
    ],
    enabled: true,
    notes: 'PRIMARY music model for Sparkfluence BGM feature. Uses fal.ai synchronous endpoint.',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get music model config by key
 */
export function getMusicModel(key: string): MusicModelConfig | undefined {
  return MUSIC_MODELS[key];
}

/**
 * Get all enabled music models
 */
export function getEnabledMusicModels(): MusicModelConfig[] {
  return Object.values(MUSIC_MODELS).filter(m => m.enabled);
}

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
 * Get TTS model config by key
 */
export function getTTSModel(key: string): TTSModelConfig | undefined {
  return TTS_MODELS[key];
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

  // Add any extra static params defined in model config (e.g. mode=custom for Grok)
  if (model.extraFormParams) {
    for (const [k, v] of Object.entries(model.extraFormParams)) {
      formData.append(k, v);
    }
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
 * DEFAULT: VEO 3.1 Fast for best lip-sync and consistent quality
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
  
  // If very long (>15s), use sora-2-pro
  if (duration > 15) {
    return VIDEO_MODELS['sora-2-pro'];
  }
  
  // If duration > 8s but <= 15s, use sora-2
  if (duration > 8) {
    return VIDEO_MODELS['sora-2'];
  }
  
  // Default: VEO 3.1 Fast HD (best value, $0.015/video)
  return VIDEO_MODELS['veo-3.1-fast-hd'];
}

/**
 * Select best image model based on requirements
 * 
 * PRIORITY (2026-01-11 Updated with /edit endpoint):
 * - CREATOR (HOOK/CTA) WITH reference: fal-nano-banana-edit (face consistency via image_urls)
 * - CREATOR (HOOK/CTA) WITHOUT reference: fal-nano-banana (text-to-image)
 * - B-ROLL: fal-wan-t2i (negative prompt) → fal-nano-banana → FLUX
 */
export function selectImageModel(params: {
  needsFaceConsistency?: boolean;
  hasReferenceImage?: boolean;
  preferFree?: boolean;
  isCreatorShot?: boolean;
  segmentType?: string;
}): ImageModelConfig {
  const { hasReferenceImage, isCreatorShot, segmentType } = params;
  
  // Determine if CREATOR shot based on segment type
  const creatorSegments = ['HOOK', 'CTA', 'LOOP-END', 'ENDING_CTA', 'THUMBNAIL'];
  const isCreator = isCreatorShot || (segmentType && creatorSegments.includes(segmentType.toUpperCase()));
  
  // CREATOR shots with reference image: use /edit endpoint for face consistency
  if (isCreator) {
    if (hasReferenceImage) {
      // PRIMARY: fal.ai Nano Banana Pro EDIT - supports image_urls for face reference
      return IMAGE_MODELS['fal-nano-banana-edit'];
    }
    // Without reference: use text-to-image (less reliable for face consistency)
    return IMAGE_MODELS['fal-nano-banana'];
  }
  
  // B-ROLL shots: fal-wan-t2i (supports negative prompt to exclude humans)
  // KEY: Use Visual Brief extraction BEFORE calling this
  return IMAGE_MODELS['fal-wan-t2i'];
}

/**
 * Get image model fallback chain
 * 
 * PRIORITY (2026-01-14 Updated with Seedream v4 + QWEN):
 * - CREATOR with ref: fal-nano-banana-edit → gpt-image-1 → imagen-pro → FLUX
 * - CREATOR no ref: fal-nano-banana → gpt-image-1 → FLUX
 * - B-ROLL: seedream-v4 → qwen-image → fal-nano-banana → FLUX
 */
export function getImageModelFallbackChain(primaryModel: string, isCreatorShot: boolean = false): string[] {
  // CREATOR shots with reference: fal-nano-banana-edit → gpt-image-1 → imagen-pro → FLUX
  if (isCreatorShot) {
    const creatorChains: Record<string, string[]> = {
      'fal-nano-banana-edit': ['gpt-image-1', 'imagen-pro', 'flux-schnell'],
      'fal-nano-banana': ['fal-nano-banana-edit', 'gpt-image-1', 'flux-schnell'],
      'gpt-image-1': ['fal-nano-banana-edit', 'imagen-pro', 'flux-schnell'],
      'imagen-pro': ['fal-nano-banana-edit', 'gpt-image-1', 'flux-schnell'],
      'dall-e-3': ['fal-nano-banana-edit', 'gpt-image-1', 'imagen-pro', 'flux-schnell'],
    };
    return creatorChains[primaryModel] || ['fal-nano-banana-edit', 'gpt-image-1', 'flux-schnell'];
  }
  
  // B-ROLL: primary → seedream-v4 / qwen-image → fal-nano-banana → FLUX
  const brollChains: Record<string, string[]> = {
    'fal-seedream-v4': ['fal-qwen-image', 'fal-nano-banana', 'flux-schnell'],
    'fal-qwen-image': ['fal-seedream-v4', 'fal-nano-banana', 'flux-schnell'],
    'fal-nano-banana': ['fal-seedream-v4', 'fal-qwen-image', 'flux-schnell'],
    'flux-schnell': ['fal-seedream-v4', 'fal-qwen-image', 'fal-nano-banana'],
    'imagen-pro': ['fal-seedream-v4', 'fal-qwen-image', 'fal-nano-banana', 'flux-schnell'],
    'imagen-4-fast': ['fal-seedream-v4', 'fal-qwen-image', 'fal-nano-banana', 'flux-schnell'],
    'imagen-4-ultra': ['fal-seedream-v4', 'fal-qwen-image', 'fal-nano-banana', 'flux-schnell'],
    'dall-e-3': ['fal-seedream-v4', 'fal-qwen-image', 'fal-nano-banana', 'flux-schnell'],
  };
  
  return brollChains[primaryModel] || ['fal-seedream-v4', 'fal-nano-banana', 'flux-schnell'];
}

// ============================================================================
// EXPORTS FOR TYPE CHECKING
// ============================================================================

export type VideoModelKey = keyof typeof VIDEO_MODELS;
export type ImageModelKey = keyof typeof IMAGE_MODELS;
