/**
 * VIDEO SPECS LOOKUP - Platform Technical Specifications
 * =======================================================
 * 
 * fal.ai Video Models: Kling 2.5 Turbo, Wan 2.5
 * MIGRATED: GeminiGen (VEO/Sora) → fal.ai
 * 
 * Last Updated: 2026-01-13
 */

// ============================================================================
// FIXED PROJECT SPECS (Non-Negotiable)
// ============================================================================

export const PROJECT_SPECS = {
  aspectRatio: {
    portrait: '9:16',
    landscape: '16:9',
  },
  resolution: {
    kling: 'auto',
    wan: '1080p',
  },
  frameRate: 24,
  maxSegmentDuration: {
    kling: 10,
    wan: 10,
  },
} as const;

// ============================================================================
// DIALOGUE WORD LIMITS
// ============================================================================

/**
 * Based on Indonesian speech rate: 130 WPM × 0.80 safety margin
 */
export const DIALOGUE_LIMITS: Record<number, number> = {
  5: 9,   // 130/60 × 5 × 0.80 = 8.7 ≈ 9
  10: 17, // 130/60 × 10 × 0.80 = 17.3 ≈ 17
};

/**
 * Get max words for duration
 */
export function getMaxDialogueWords(durationSeconds: number): number {
  if (DIALOGUE_LIMITS[durationSeconds]) {
    return DIALOGUE_LIMITS[durationSeconds];
  }
  return Math.floor((130 / 60) * durationSeconds * 0.80);
}

/**
 * Calculate required duration for word count
 */
export function getRequiredDuration(wordCount: number): number {
  return Math.ceil(wordCount / 1.733);
}

// ============================================================================
// PLATFORM SELECTION
// ============================================================================

export type VideoPlatform = 'kling-25-turbo' | 'wan-25';

export interface PlatformConfig {
  key: VideoPlatform;
  displayName: string;
  maxDuration: number;
  supportedDurations: number[];
  maxResolution: string;
  refImageParam: string;
  supportsAudio: boolean;
  supportsNegativePrompt: boolean;
  supportsSeed: boolean;
  strengths: string[];
  bestFor: string[];
  costEstimate: string;
}

export const VIDEO_PLATFORMS: Record<VideoPlatform, PlatformConfig> = {
  'kling-25-turbo': {
    key: 'kling-25-turbo',
    displayName: 'Kling 2.5 Turbo',
    maxDuration: 10,
    supportedDurations: [5, 10],
    maxResolution: 'auto',
    refImageParam: 'image_url',
    supportsAudio: false,
    supportsNegativePrompt: true,
    supportsSeed: false,
    strengths: ['Top-tier motion fluidity', 'Cinematic visuals', 'Excellent prompt precision'],
    bestFor: ['HOOK', 'CTA', 'Creator shots', 'Short clips'],
    costEstimate: '~$0.10/video',
  },
  'wan-25': {
    key: 'wan-25',
    displayName: 'Wan 2.5',
    maxDuration: 10,
    supportedDurations: [5, 10],
    maxResolution: '1080p',
    refImageParam: 'image_url',
    supportsAudio: true,
    supportsNegativePrompt: true,
    supportsSeed: true,
    strengths: ['1080p resolution', 'Audio support', 'Prompt expansion', 'Seed for reproducibility'],
    bestFor: ['B-roll with BGM', 'Longer narratives', 'High-res output'],
    costEstimate: '~$0.15/video',
  },
};

/**
 * Select best video platform based on requirements
 * DEFAULT: Kling 2.5 Turbo (best motion quality)
 */
export function selectVideoPlatform(params: {
  duration: number;
  needsAudio?: boolean;
  needsHighRes?: boolean;
  needsSeed?: boolean;
  segmentType?: string;
}): VideoPlatform {
  const { needsAudio, needsHighRes, needsSeed } = params;
  
  // If audio needed, use Wan 2.5
  if (needsAudio) {
    return 'wan-25';
  }
  
  // If high-res (1080p explicit) or seed needed, use Wan 2.5
  if (needsHighRes || needsSeed) {
    return 'wan-25';
  }
  
  // Default: Kling 2.5 Turbo (best motion quality)
  return 'kling-25-turbo';
}

/**
 * Get platform config
 */
export function getPlatformConfig(platform: VideoPlatform): PlatformConfig {
  return VIDEO_PLATFORMS[platform];
}

/**
 * Check if duration is supported by platform
 */
export function isDurationSupported(platform: VideoPlatform, duration: number): boolean {
  const config = VIDEO_PLATFORMS[platform];
  return config.supportedDurations.includes(duration);
}

/**
 * Get closest supported duration
 */
export function getClosestDuration(platform: VideoPlatform, targetDuration: number): number {
  const config = VIDEO_PLATFORMS[platform];
  const supported = config.supportedDurations;
  
  if (supported.includes(targetDuration)) {
    return targetDuration;
  }
  
  return supported.reduce((prev, curr) => 
    Math.abs(curr - targetDuration) < Math.abs(prev - targetDuration) ? curr : prev
  );
}

// ============================================================================
// AUDIO TEMPLATES
// ============================================================================

export const ENVIRONMENT_AUDIO: Record<string, string> = {
  office: 'Quiet office — soft HVAC hum, distant typing. No music, no subtitles.',
  home: 'Home — soft room tone, distant traffic. No music, no subtitles.',
  studio: 'Clean studio — minimal room tone, professional. No music, no subtitles.',
  tech: 'Data center — server fan hum, electronic ambient. No music, no subtitles.',
  outdoor: 'City street — distant traffic, urban atmosphere. No music, no subtitles.',
  cafe: 'Cafe ambiance — soft chatter, coffee machine. No music, no subtitles.',
  nature: 'Nature — birds chirping, gentle wind. No music, no subtitles.',
};

export function getEnvironmentAudio(environment: string): string {
  const key = environment.toLowerCase();
  return ENVIRONMENT_AUDIO[key] || ENVIRONMENT_AUDIO.office;
}

// ============================================================================
// VOICE CHARACTER ANCHOR (for TTS - Chatterbox)
// ============================================================================

export interface VoiceCharacter {
  description: string;
  gender: 'male' | 'female';
  ageRange: string;
  accent: string;
  tone: string;
  pace: string;
  suggestedPresetVoice?: string;  // Chatterbox preset
}

export const DEFAULT_VOICE_CHARACTERS: Record<string, VoiceCharacter> = {
  indonesian_male: {
    description: 'Indonesian male voice, 25-30 years old',
    gender: 'male',
    ageRange: '25-30 years old',
    accent: 'Indonesian native speaker with Jakarta accent',
    tone: 'warm, friendly, enthusiastic, casual Gen-Z energy',
    pace: 'medium-fast, natural conversational rhythm',
    suggestedPresetVoice: 'dylan',
  },
  indonesian_female: {
    description: 'Indonesian female voice, 22-28 years old',
    gender: 'female',
    ageRange: '22-28 years old',
    accent: 'Indonesian native speaker with modern Jakarta accent',
    tone: 'bright, engaging, relatable, Gen-Z energy',
    pace: 'medium-fast, animated conversational style',
    suggestedPresetVoice: 'anaya',
  },
  hindi_male: {
    description: 'Hindi male voice, 25-32 years old',
    gender: 'male',
    ageRange: '25-32 years old',
    accent: 'Pan-India neutral Hindi with urban inflection',
    tone: 'confident, friendly, engaging',
    pace: 'medium, clear enunciation',
    suggestedPresetVoice: 'emmanuel',
  },
  hindi_female: {
    description: 'Hindi female voice, 22-30 years old',
    gender: 'female',
    ageRange: '22-30 years old',
    accent: 'Pan-India neutral Hindi, modern urban',
    tone: 'warm, confident, approachable',
    pace: 'medium, expressive',
    suggestedPresetVoice: 'meera',
  },
  english_male: {
    description: 'English male voice, 25-35 years old',
    gender: 'male',
    ageRange: '25-35 years old',
    accent: 'Neutral global English',
    tone: 'professional yet casual, engaging',
    pace: 'medium, clear articulation',
    suggestedPresetVoice: 'ethan',
  },
  english_female: {
    description: 'English female voice, 24-32 years old',
    gender: 'female',
    ageRange: '24-32 years old',
    accent: 'Neutral global English',
    tone: 'friendly, professional, relatable',
    pace: 'medium, natural flow',
    suggestedPresetVoice: 'lucy',
  },
};

export function getVoiceCharacter(language: string, gender: 'male' | 'female'): VoiceCharacter {
  const lang = language.toLowerCase();
  const key = `${lang.includes('id') || lang.includes('indonesian') ? 'indonesian' : 
               lang.includes('hi') || lang.includes('hindi') ? 'hindi' : 'english'}_${gender}`;
  return DEFAULT_VOICE_CHARACTERS[key] || DEFAULT_VOICE_CHARACTERS.english_male;
}

// ============================================================================
// SEGMENT DURATION RULES
// ============================================================================

export const SEGMENT_DURATION_RULES: Record<string, { min: number; max: number; default: number }> = {
  HOOK: { min: 3, max: 5, default: 5 },
  FORE: { min: 3, max: 5, default: 5 },
  FORESHADOW: { min: 3, max: 5, default: 5 },
  BODY: { min: 5, max: 10, default: 5 },
  PEAK: { min: 5, max: 10, default: 5 },
  TWIST: { min: 5, max: 10, default: 5 },
  CTA: { min: 3, max: 5, default: 5 },
  'LOOP-END': { min: 2, max: 5, default: 5 },
  ENDING_CTA: { min: 3, max: 5, default: 5 },
};

export function getSegmentDurationRules(segmentType: string) {
  const type = segmentType.toUpperCase().replace(/[-_]/g, '-');
  return SEGMENT_DURATION_RULES[type] || SEGMENT_DURATION_RULES.BODY;
}

export function validateSegmentDuration(segmentType: string, duration: number): {
  valid: boolean;
  suggestion?: number;
  message?: string;
} {
  const rules = getSegmentDurationRules(segmentType);
  
  if (duration < rules.min) {
    return {
      valid: false,
      suggestion: rules.min,
      message: `${segmentType} should be at least ${rules.min}s`,
    };
  }
  
  if (duration > rules.max) {
    return {
      valid: false,
      suggestion: rules.max,
      message: `${segmentType} should not exceed ${rules.max}s`,
    };
  }
  
  return { valid: true };
}

// ============================================================================
// CAMERA MOVEMENT (Verified for fal.ai models)
// ============================================================================

export const CAMERA_MOVEMENTS: Record<string, { term: string; effect: string }> = {
  'push-in': { term: 'smooth dolly push-in', effect: 'Intimacy, emphasis' },
  'pull-back': { term: 'gentle dolly pull-back', effect: 'Reveal, context' },
  'track': { term: 'tracking shot following subject', effect: 'Following, energy' },
  'pan': { term: 'slow pan left/right', effect: 'Horizontal reveal' },
  'orbit': { term: 'orbit shot circling subject', effect: 'Tension, interest' },
  'static': { term: 'static locked-off shot', effect: 'Stability, authority' },
  'drift': { term: 'subtle drift', effect: 'Natural, organic' },
};

export function getCameraMovement(type: string): { term: string; effect: string } {
  const key = type.toLowerCase().replace(/[_\s]+/g, '-');
  return CAMERA_MOVEMENTS[key] || CAMERA_MOVEMENTS.static;
}

// ============================================================================
// VIDEO PROMPT BUILDER
// ============================================================================

export interface VideoPromptParams {
  duration: number;
  resolution?: string;
  cameraMovement: string;
  subjectMotion: string;
  ambientMotion?: string;
  negativePrompt?: string;
}

/**
 * Build Kling 2.5 video prompt
 */
export function buildKlingVideoPrompt(params: VideoPromptParams): {
  prompt: string;
  negative_prompt: string;
  duration: string;
  cfg_scale: number;
} {
  const { duration, cameraMovement, subjectMotion, ambientMotion, negativePrompt } = params;
  const cameraMove = getCameraMovement(cameraMovement);
  
  const promptParts = [
    `Camera: ${cameraMove.term}.`,
    subjectMotion,
  ];
  
  if (ambientMotion) {
    promptParts.push(ambientMotion);
  }
  
  return {
    prompt: promptParts.join(' '),
    negative_prompt: negativePrompt || 'blur, distort, low quality, artifacts',
    duration: String(duration) as '5' | '10',
    cfg_scale: 0.5,
  };
}

/**
 * Build Wan 2.5 video prompt
 */
export function buildWanVideoPrompt(params: VideoPromptParams & {
  audioUrl?: string;
  enablePromptExpansion?: boolean;
}): {
  prompt: string;
  negative_prompt: string;
  duration: string;
  resolution: string;
  audio_url?: string;
  enable_prompt_expansion: boolean;
} {
  const { 
    duration, 
    resolution, 
    cameraMovement, 
    subjectMotion, 
    ambientMotion, 
    negativePrompt,
    audioUrl,
    enablePromptExpansion = true,
  } = params;
  
  const cameraMove = getCameraMovement(cameraMovement);
  
  const promptParts = [
    `Camera: ${cameraMove.term}.`,
    subjectMotion,
  ];
  
  if (ambientMotion) {
    promptParts.push(ambientMotion);
  }
  
  return {
    prompt: promptParts.join(' '),
    negative_prompt: negativePrompt || 'low resolution, error, worst quality, low quality, defects',
    duration: String(duration) as '5' | '10',
    resolution: resolution || '1080p',
    audio_url: audioUrl,
    enable_prompt_expansion: enablePromptExpansion,
  };
}
