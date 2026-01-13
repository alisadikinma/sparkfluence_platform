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
  /** Notes/comments */
  notes?: string;
}

export const VIDEO_MODELS: Record<string, VideoModelConfig> = {
  // ==========================================================================
  // WAN VIDEO 2.5 (FAL.AI) - 5s/10s, 1080p, image-to-video WITH AUDIO SUPPORT
  // PRIMARY for ALL segments (CREATOR + B-ROLL) - Both 5s and 10s
  // ==========================================================================
  'wan-2.5': {
    key: 'wan-2.5',
    displayName: 'Wan Video 2.5 (fal.ai)',
    provider: 'fal',
    endpoint: 'https://queue.fal.run/fal-ai/wan/video',
    apiModelName: 'fal-ai/wan/video',
    supportedDurations: [5, 10],  // Updated: Supports both 5s and 10s
    defaultDuration: 5,
    resolutions: {
      '1080p': { apiValue: '1080p', dimensions: { width: 1920, height: 1080 } },
      '720p': { apiValue: '720p', dimensions: { width: 1280, height: 720 } },
    },
    aspectRatios: {
      '9:16': { apiValue: '9:16', maxResolution: '1080p' },
      '16:9': { apiValue: '16:9', maxResolution: '1080p' },
      '1:1': { apiValue: '1:1', maxResolution: '1080p' },
    },
    refImageParam: 'image_url',
    dialogueLimits: { 5: 9, 10: 17 },
    costPerVideo: 0.10,
    strengths: ['1080p resolution', 'fast generation', '5s/10s duration', 'AUDIO SUPPORT', 'cinematic', 'TTS integration'],
    weaknesses: ['requires reference image', 'audio truncated if >10s'],
    bestFor: ['ALL segments (CREATOR + B-ROLL)', '5s and 10s clips', 'segments with TTS audio'],
    enabled: true,
    notes: 'PRIMARY model - supports audio_url for TTS integration on BOTH 5s and 10s. Use for all segments.',
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
    displayName: 'Nano Banana Pro T2I (fal.ai)',
    provider: 'fal',
    endpoint: 'https://fal.run/fal-ai/nano-banana-pro',
    apiModelName: 'fal-ai/nano-banana-pro',
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
    displayName: 'Nano Banana Pro Edit (fal.ai)',
    provider: 'fal',
    endpoint: 'https://fal.run/fal-ai/nano-banana-pro/edit',
    apiModelName: 'fal-ai/nano-banana-pro/edit',
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
    costPerImage: 0.15,
    isFree: false,
    rateLimit: 0,
    strengths: ['face consistency', 'character preservation', 'multi-image reference', 'up to 14 refs'],
    weaknesses: ['no negative prompt', 'paid', 'requires reference image'],
    bestFor: ['CREATOR shots with avatar', 'HOOK/CTA', 'face consistency required'],
    enabled: true,
    notes: 'PRIMARY for CREATOR shots - best face consistency via image_urls array',
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
    refImageParam: null, // Not supported
    supportsNegativePrompt: false, // Not supported
    maxPromptLength: 4000,
    responseFormat: 'url',
    costPerImage: 0.03,
    isFree: false,
    rateLimit: 0,
    strengths: ['high resolution (up to 4096px)', 'excellent text rendering', 'cinematic quality', 'fast'],
    weaknesses: ['no reference image', 'no negative prompt'],
    bestFor: ['B-ROLL', 'high-res visuals', 'text/typography in images', 'hero shots'],
    enabled: true,
    notes: 'HIGH QUALITY B-ROLL - best for text rendering and high-res output',
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
  // FAL.AI QWEN IMAGE - B-ROLL with negative prompt support
  // Turbo mode available, supports LoRAs
  // ==========================================================================
  'fal-qwen-image': {
    key: 'fal-qwen-image',
    displayName: 'Qwen Image (fal.ai)',
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
    refImageParam: null, // Not supported
    supportsNegativePrompt: true, // KEY FEATURE!
    maxPromptLength: 4000,
    responseFormat: 'url',
    costPerImage: 0.02,
    isFree: false,
    rateLimit: 0,
    strengths: ['negative prompt support', 'turbo mode', 'LoRA support', 'good quality'],
    weaknesses: ['no reference image', 'max 1024px'],
    bestFor: ['B-ROLL', 'environments', 'when negative prompt needed'],
    enabled: true,
    notes: 'B-ROLL with NEGATIVE PROMPT - use when need to exclude specific elements',
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
  
  // Default: VEO 3.1 Fast (best lip-sync, up to 8s)
  return VIDEO_MODELS['veo-3.1-fast'];
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
