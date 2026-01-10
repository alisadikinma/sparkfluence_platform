/**
 * VIDEO SPECS LOOKUP - Platform Technical Specifications
 * =======================================================
 * 
 * Direct O(1) lookup for VEO 3.1, Sora 2 technical constraints.
 * Replaces RAG queries for video platform specs.
 * 
 * Sources: 05-Video-Platform-Specs.md
 * Last Updated: 2026-01-10
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
    portrait: '720p',
    landscape: '1080p',
  },
  frameRate: 24,
  maxSegmentDuration: {
    veo: 8,
    sora: 15,
    soraPro: 25,
  },
} as const;

// ============================================================================
// DIALOGUE WORD LIMITS
// ============================================================================

/**
 * Based on Indonesian speech rate: 130 WPM × 0.80 safety margin
 */
export const DIALOGUE_LIMITS: Record<number, number> = {
  4: 7,   // 130/60 × 4 × 0.80 = 6.9 ≈ 7
  6: 10,  // 130/60 × 6 × 0.80 = 10.4 ≈ 10
  8: 14,  // 130/60 × 8 × 0.80 = 13.8 ≈ 14
  10: 17, // 130/60 × 10 × 0.80 = 17.3 ≈ 17
  15: 26, // 130/60 × 15 × 0.80 = 26
  25: 43, // 130/60 × 25 × 0.80 = 43.3 ≈ 43
};

/**
 * Get max words for duration
 */
export function getMaxDialogueWords(durationSeconds: number): number {
  // Exact match
  if (DIALOGUE_LIMITS[durationSeconds]) {
    return DIALOGUE_LIMITS[durationSeconds];
  }
  // Calculate based on formula
  return Math.floor((130 / 60) * durationSeconds * 0.80);
}

/**
 * Calculate required duration for word count
 */
export function getRequiredDuration(wordCount: number): number {
  // wordCount = (130/60) × duration × 0.80
  // duration = wordCount / (130/60 × 0.80) = wordCount / 1.733
  return Math.ceil(wordCount / 1.733);
}

// ============================================================================
// PLATFORM SELECTION
// ============================================================================

export type VideoPlatform = 'veo-3.1-fast' | 'sora-2' | 'sora-2-pro' | 'sora-2-pro-hd';

export interface PlatformConfig {
  key: VideoPlatform;
  displayName: string;
  maxDuration: number;
  supportedDurations: number[];
  maxResolution: {
    portrait: string;
    landscape: string;
  };
  refImageParam: string;
  strengths: string[];
  bestFor: string[];
  costEstimate: string;
}

export const VIDEO_PLATFORMS: Record<VideoPlatform, PlatformConfig> = {
  'veo-3.1-fast': {
    key: 'veo-3.1-fast',
    displayName: 'VEO 3.1 Fast',
    maxDuration: 8,
    supportedDurations: [4, 6, 8],
    maxResolution: {
      portrait: '720p',
      landscape: '1080p',
    },
    refImageParam: 'ref_images',
    strengths: ['Best lip-sync', 'Native audio', '1080p for 16:9'],
    bestFor: ['HOOK', 'CTA', 'Creator talking head', 'Dialogue-heavy'],
    costEstimate: '~$0.20/video',
  },
  'sora-2': {
    key: 'sora-2',
    displayName: 'Sora 2',
    maxDuration: 15,
    supportedDurations: [10, 15],
    maxResolution: {
      portrait: '720p',
      landscape: '720p',
    },
    refImageParam: 'file_urls',
    strengths: ['10-15s duration', 'Good motion', 'AI voiceover'],
    bestFor: ['B-roll', 'Longer segments', 'Narrative sequences'],
    costEstimate: '~$0.10/second',
  },
  'sora-2-pro': {
    key: 'sora-2-pro',
    displayName: 'Sora 2 Pro',
    maxDuration: 25,
    supportedDurations: [25],
    maxResolution: {
      portrait: '720p',
      landscape: '720p',
    },
    refImageParam: 'file_urls',
    strengths: ['25s long duration', 'Consistency'],
    bestFor: ['Long-form content', 'Single-shot narratives'],
    costEstimate: '~$0.30/second',
  },
  'sora-2-pro-hd': {
    key: 'sora-2-pro-hd',
    displayName: 'Sora 2 Pro HD',
    maxDuration: 15,
    supportedDurations: [15],
    maxResolution: {
      portrait: '1080p',
      landscape: '1080p',
    },
    refImageParam: 'file_urls',
    strengths: ['1080p HD quality', '15s duration'],
    bestFor: ['Hero shots', 'Premium content', 'Hook/CTA'],
    costEstimate: '~$0.50/second',
  },
};

/**
 * Select best video platform based on duration
 */
export function selectVideoPlatform(params: {
  duration: number;
  needsHD?: boolean;
  needsLipSync?: boolean;
  segmentType?: string;
}): VideoPlatform {
  const { duration, needsHD, needsLipSync, segmentType } = params;
  
  // Creator segments (HOOK/CTA) always use VEO for best lip-sync
  const creatorSegments = ['HOOK', 'CTA', 'LOOP-END', 'ENDING_CTA'];
  if (segmentType && creatorSegments.includes(segmentType.toUpperCase())) {
    if (duration <= 8) return 'veo-3.1-fast';
  }
  
  // If lip-sync critical and ≤8s, use VEO
  if (needsLipSync && duration <= 8) {
    return 'veo-3.1-fast';
  }
  
  // If HD required and ≤15s
  if (needsHD && duration <= 15) {
    return 'sora-2-pro-hd';
  }
  
  // Very long (>15s)
  if (duration > 15) {
    return 'sora-2-pro';
  }
  
  // Medium duration (>8s, ≤15s)
  if (duration > 8) {
    return 'sora-2';
  }
  
  // Default: VEO 3.1 Fast (best lip-sync)
  return 'veo-3.1-fast';
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
  
  // Exact match
  if (supported.includes(targetDuration)) {
    return targetDuration;
  }
  
  // Find closest
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

/**
 * Get environment audio prompt
 */
export function getEnvironmentAudio(environment: string): string {
  const key = environment.toLowerCase();
  return ENVIRONMENT_AUDIO[key] || ENVIRONMENT_AUDIO.office;
}

// ============================================================================
// VOICE CHARACTER ANCHOR
// ============================================================================

export interface VoiceCharacter {
  description: string;
  gender: 'male' | 'female';
  ageRange: string;
  accent: string;
  tone: string;
  pace: string;
}

export const DEFAULT_VOICE_CHARACTERS: Record<string, VoiceCharacter> = {
  indonesian_male: {
    description: 'Indonesian male voice, 25-30 years old',
    gender: 'male',
    ageRange: '25-30 years old',
    accent: 'Indonesian native speaker with Jakarta accent',
    tone: 'warm, friendly, enthusiastic, casual Gen-Z energy',
    pace: 'medium-fast, natural conversational rhythm',
  },
  indonesian_female: {
    description: 'Indonesian female voice, 22-28 years old',
    gender: 'female',
    ageRange: '22-28 years old',
    accent: 'Indonesian native speaker with modern Jakarta accent',
    tone: 'bright, engaging, relatable, Gen-Z energy',
    pace: 'medium-fast, animated conversational style',
  },
  hindi_male: {
    description: 'Hindi male voice, 25-32 years old',
    gender: 'male',
    ageRange: '25-32 years old',
    accent: 'Pan-India neutral Hindi with urban inflection',
    tone: 'confident, friendly, engaging',
    pace: 'medium, clear enunciation',
  },
  hindi_female: {
    description: 'Hindi female voice, 22-30 years old',
    gender: 'female',
    ageRange: '22-30 years old',
    accent: 'Pan-India neutral Hindi, modern urban',
    tone: 'warm, confident, approachable',
    pace: 'medium, expressive',
  },
  english_male: {
    description: 'English male voice, 25-35 years old',
    gender: 'male',
    ageRange: '25-35 years old',
    accent: 'Neutral global English',
    tone: 'professional yet casual, engaging',
    pace: 'medium, clear articulation',
  },
  english_female: {
    description: 'English female voice, 24-32 years old',
    gender: 'female',
    ageRange: '24-32 years old',
    accent: 'Neutral global English',
    tone: 'friendly, professional, relatable',
    pace: 'medium, natural flow',
  },
};

/**
 * Get voice character for language and gender
 */
export function getVoiceCharacter(language: string, gender: 'male' | 'female'): VoiceCharacter {
  const lang = language.toLowerCase();
  const key = `${lang.includes('id') || lang.includes('indonesian') ? 'indonesian' : 
               lang.includes('hi') || lang.includes('hindi') ? 'hindi' : 'english'}_${gender}`;
  return DEFAULT_VOICE_CHARACTERS[key] || DEFAULT_VOICE_CHARACTERS.english_male;
}

/**
 * Build voice anchor prompt
 */
export function buildVoiceAnchorPrompt(voice: VoiceCharacter): string {
  return `Voice character: ${voice.description}
Accent: ${voice.accent}
Tone: ${voice.tone}
Pace: ${voice.pace}`;
}

// ============================================================================
// AUDIO DIRECTIVE BUILDER
// ============================================================================

export interface AudioDirectiveParams {
  environment: string;
  dialogue?: string;
  voiceCharacter?: VoiceCharacter;
  isCreatorShot?: boolean;
}

/**
 * Build complete audio directive for video prompt
 */
export function buildAudioDirective(params: AudioDirectiveParams): string {
  const { environment, dialogue, voiceCharacter, isCreatorShot } = params;
  
  const parts: string[] = [];
  
  // Ambient
  parts.push(`Ambient: ${getEnvironmentAudio(environment)}`);
  
  // Dialogue (for CREATOR shots)
  if (dialogue && isCreatorShot) {
    const wordCount = dialogue.split(/\s+/).length;
    parts.push(`Dialogue: [Creator] says: "${dialogue}" (${wordCount} words)`);
    
    if (voiceCharacter) {
      parts.push(`Voice style: ${voiceCharacter.tone}, ${voiceCharacter.accent}`);
    }
  } else if (dialogue) {
    // Voiceover for B-roll
    parts.push(`Voiceover (off-screen): "${dialogue}"`);
  }
  
  // Required exclusions
  parts.push('Exclude: no subtitles, no audience sounds, no background music');
  
  return `AUDIO:\n${parts.join('\n')}`;
}

// ============================================================================
// CAMERA MOVEMENT (VEO-Verified)
// ============================================================================

export const VEO_CAMERA_MOVEMENTS: Record<string, { term: string; effect: string }> = {
  'push-in': { term: 'smooth dolly push-in', effect: 'Intimacy, emphasis' },
  'pull-back': { term: 'gentle dolly pull-back', effect: 'Reveal, context' },
  'track': { term: 'tracking shot following subject', effect: 'Following, energy' },
  'pan': { term: 'slow pan left/right', effect: 'Horizontal reveal' },
  'orbit': { term: 'orbit shot circling subject', effect: 'Tension, interest' },
  'static': { term: 'static locked-off shot', effect: 'Stability, authority' },
  'drift': { term: 'subtle drift', effect: 'Natural, organic' },
};

/**
 * Get VEO-verified camera movement
 */
export function getCameraMovement(type: string): { term: string; effect: string } {
  const key = type.toLowerCase().replace(/[_\s]+/g, '-');
  return VEO_CAMERA_MOVEMENTS[key] || VEO_CAMERA_MOVEMENTS.static;
}

// ============================================================================
// SEGMENT DURATION RULES
// ============================================================================

export const SEGMENT_DURATION_RULES: Record<string, { min: number; max: number; default: number }> = {
  HOOK: { min: 3, max: 5, default: 4 },
  FORE: { min: 3, max: 5, default: 4 },
  FORESHADOW: { min: 3, max: 5, default: 4 },
  BODY: { min: 5, max: 8, default: 6 },
  PEAK: { min: 4, max: 8, default: 6 },
  TWIST: { min: 4, max: 6, default: 5 },
  CTA: { min: 3, max: 5, default: 4 },
  'LOOP-END': { min: 2, max: 3, default: 3 },
  ENDING_CTA: { min: 3, max: 5, default: 4 },
};

/**
 * Get segment duration rules
 */
export function getSegmentDurationRules(segmentType: string) {
  const type = segmentType.toUpperCase().replace(/[-_]/g, '-');
  return SEGMENT_DURATION_RULES[type] || SEGMENT_DURATION_RULES.BODY;
}

/**
 * Validate segment duration
 */
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
// VIDEO PROMPT BUILDER
// ============================================================================

export interface VideoPromptParams {
  duration: number;
  aspectRatio: '9:16' | '16:9';
  cameraMovement: string;
  subjectMotion: string;
  ambientMotion?: string;
  audioDirective: string;
  transition?: string;
}

/**
 * Build VEO 3.1 video prompt
 */
export function buildVeoVideoPrompt(params: VideoPromptParams): string {
  const {
    duration,
    aspectRatio,
    cameraMovement,
    subjectMotion,
    ambientMotion,
    audioDirective,
    transition,
  } = params;
  
  const resolution = aspectRatio === '9:16' ? '720p' : '1080p';
  const cameraMove = getCameraMovement(cameraMovement);
  
  return `[VEO 3.1 — VIDEO]

Duration: ~${duration}s
Resolution: ${resolution}
Aspect: ${aspectRatio}

CAMERA MOTION
Movement: ${cameraMove.term}
Speed: medium

SUBJECT MOTION
${subjectMotion}

${ambientMotion ? `AMBIENT MOTION\n${ambientMotion}\n` : ''}
${audioDirective}

CONTINUITY
Maintain exact lighting, environment, appearance from reference.

${transition ? `TRANSITION\n${transition}\n` : ''}
NEGATIVE
No blurry elements, no distortion, no artifacts.`;
}

/**
 * Build Sora 2 video prompt
 */
export function buildSoraVideoPrompt(params: VideoPromptParams & {
  sceneAction: string;
  beats?: Array<{ time: string; action: string }>;
}): string {
  const {
    duration,
    aspectRatio,
    sceneAction,
    cameraMovement,
    subjectMotion,
    audioDirective,
    beats,
  } = params;
  
  const cameraMove = getCameraMovement(cameraMovement);
  
  let beatSection = '';
  if (beats && beats.length > 0) {
    beatSection = '\nACTIONS (beat-based)\n' + 
      beats.map(b => `- ${b.action} (${b.time})`).join('\n');
  }
  
  return `[SORA 2 — VIDEO]

Duration: ~${duration}s
Resolution: 720p
Aspect: ${aspectRatio}

SCENE ACTION
${sceneAction}

CINEMATOGRAPHY
Camera: ${cameraMove.term}
Movement: ONE camera move only

SUBJECT MOTION
${subjectMotion}
${beatSection}

${audioDirective}

EXCLUSIONS
No text on screen, no morphing, no artifacts.`;
}
