/**
 * CINEMATIC VIDEO KNOWLEDGE BASE
 * Static knowledge for video generation - NO DATABASE QUERIES NEEDED
 * 
 * This file contains all the knowledge required for generating cinematic videos:
 * - Project Instruction (output format, rules, templates)
 * - Platform Specs (VEO 3.1 Fast Full HD, Sora 2 HD)
 * - Camera Movement Library (VEO-verified terms)
 * - I2V Motion Descriptions
 * - Audio Specifications
 * 
 * Source Files:
 * - Video_Project_Instruction.md
 * - Cinematic_Video_Technical_Reference.md
 * - VEO_3_1_Enhanced.md
 * - OpenAI_Sora_2_Image-to-Video__Complete_Production_Guide.md
 * 
 * Supported Models (geminigen.ai):
 * - Sora 2 HD (10s) - 720p - $0.01/video
 * - Veo 3.1 Fast Full HD (8s) - 1080p - $0.01/video
 * 
 * Last Updated: 2025-12-13
 */

// ============================================================================
// VIDEO MODEL SPECS
// ============================================================================

export const VIDEO_MODELS = {
  'sora-2-hd': {
    name: 'Sora 2 HD (10s)',
    apiModel: 'sora-2-hd',
    resolution: '720p',
    dimensions: { landscape: '1280x720', portrait: '720x1280' },
    maxDuration: 10,
    price: 0.01,
    strengths: ['longer duration', 'multi-shot consistency', 'physics simulation', 'complex motion'],
    weaknesses: ['720p only', 'lip-sync not best'],
    bestFor: ['B-roll', 'complex motion', 'longer segments', 'narrative sequences']
  },
  'veo-3.1-fast': {
    name: 'Veo 3.1 Fast Full HD (8s)',
    apiModel: 'veo-3.1-fast-1080p', // FIXED: Use 1080p model
    resolution: '1080p',
    dimensions: { landscape: '1920x1080', portrait: '1080x1920' },
    maxDuration: 8,
    price: 0.01,
    strengths: ['1080p quality', 'best lip-sync', 'native audio', 'sharp output'],
    weaknesses: ['8s max', 'cannot extend in fast mode'],
    bestFor: ['Creator talking head', 'Hook', 'CTA', 'dialogue-heavy']
  }
} as const;

export type VideoModelKey = keyof typeof VIDEO_MODELS;

// ============================================================================
// PROJECT INSTRUCTION
// ============================================================================

export const VIDEO_PROJECT_INSTRUCTION = `
# AI VIDEO PRODUCTION — PROJECT INSTRUCTION

## ROLE
You are an **AI Film Director and Motion Prompt Engineer** converting static images into Hollywood-grade cinematic video.

## FIXED TECHNICAL SPECS
| Parameter | Sora 2 HD | Veo 3.1 Fast Full HD |
|-----------|-----------|---------------------|
| Resolution | 720p | 1080p |
| Max Duration | 10 seconds | 8 seconds |
| Price | $0.01/video | $0.01/video |
| Aspect Ratios | 9:16, 16:9 | 9:16, 16:9 |

## RULE 1 - PLATFORM SELECTION

### Decision Matrix
Use VEO 3.1 Fast Full HD when:
- Segment <= 8 seconds
- Critical lip-sync required (dialogue-heavy)
- Creator talking head segments
- Hook and CTA shots
- Need 1080p quality

Use Sora 2 HD when:
- Segment needs > 8 seconds (up to 10s)
- Complex physics/motion required
- B-roll with elaborate motion
- Multi-shot narrative sequence
- Extended camera movements

### Default: VEO 3.1 Fast Full HD (better quality, best lip-sync)

## RULE 2 - IMAGE FIRST, VIDEO SECOND (CRITICAL)

The image already contains ALL visual details.
Video prompts describe MOTION ONLY:

| Image Contains | Video Prompt Contains |
|----------------|----------------------|
| Face, wardrobe, environment | Camera movement |
| Lighting, color, composition | Subject micro-motion |
| Film stock, atmosphere | Ambient motion |
| All visual details | Audio specification |

NEVER duplicate visual details in video prompt.
Use: "Maintain exact lighting, environment, and appearance from reference image."

## RULE 3 - AUDIO CONSTRAINTS (CRITICAL)

### VEO 3.1 Audio
| Parameter | Constraint |
|-----------|------------|
| Dialogue per 8s | 12-15 words MAX |
| Dialogue Format | [Character] says: "[dialogue]" |
| Required Exclusions | "no subtitles, no audience sounds, no text overlays" |

### Sora 2 Audio
| Parameter | Constraint |
|-----------|------------|
| Dialogue per 10s | 15-20 words MAX |
| Dialogue Format | "[Character]: [dialogue]" |
| Best practice | Keep minimal, plan ADR |

AUDIO IS NOT OPTIONAL. Always specify ambient + exclusions.

## RULE 4 - SORA 2 SPECIFIC RULES

### ONE Move + ONE Action
- Single camera movement per shot
- Single subject action per shot
- Multiple elements cause chaos

### Beat-Based Timing
- Subject turns (0-2s)
- Pauses, expression changes (2-4s)
- Completes gesture (4-6s)

### Image Reference = First Frame
- Sora 2 uses reference image as starting point
- Prompt describes what happens NEXT
- Don't re-describe visuals already in image

## RULE 5 - QUALITY CHECKLIST

### VEO 3.1 Checklist
- [ ] Duration <= 8 seconds
- [ ] Resolution: 1080p
- [ ] Aspect: 9:16 or 16:9
- [ ] Camera movement uses VEO-verified term
- [ ] Subject micro-motion described
- [ ] Audio block complete (ambient + dialogue + exclusions)
- [ ] NO visual details (motion only)

### Sora 2 Checklist
- [ ] Duration <= 10 seconds
- [ ] Resolution: 720p
- [ ] ONE camera move only
- [ ] ONE subject action only
- [ ] Beat-based timing included
- [ ] Audio in dedicated block
- [ ] No visual re-description
`;

// ============================================================================
// CAMERA MOVEMENT LIBRARY (VEO-VERIFIED)
// ============================================================================

export const CAMERA_MOVEMENTS = {
  // Static
  static: {
    terms: ['static shot', 'locked-off shot', 'fixed camera'],
    effect: 'no movement',
    emotion: 'stability, authority, formal',
    promptPhrase: 'static shot, locked camera'
  },
  
  // Push/Pull
  push_in: {
    terms: ['smooth dolly push-in', 'gentle dolly push-in', 'slow dolly-in'],
    effect: 'approach subject',
    emotion: 'building intimacy, focus, tension',
    promptPhrase: 'smooth dolly push-in toward subject'
  },
  pull_back: {
    terms: ['dolly-out', 'gentle dolly pull-back', 'slow pull-back'],
    effect: 'retreat from subject',
    emotion: 'detachment, reveal context, conclusion',
    promptPhrase: 'gentle dolly pull-back revealing environment'
  },
  
  // Lateral
  tracking: {
    terms: ['tracking shot following subject', 'smooth tracking shot'],
    effect: 'parallel movement',
    emotion: 'following action, engagement',
    promptPhrase: 'smooth tracking shot following subject'
  },
  truck: {
    terms: ['truck left', 'truck right'],
    effect: 'lateral slide',
    emotion: 'reveal, transition',
    promptPhrase: 'smooth truck right revealing scene'
  },
  
  // Rotational
  pan: {
    terms: ['slow pan left', 'slow pan right', 'whip pan'],
    effect: 'horizontal rotation',
    emotion: 'environment scan, energy',
    promptPhrase: 'slow pan right across scene'
  },
  tilt: {
    terms: ['tilt up', 'tilt down'],
    effect: 'vertical rotation',
    emotion: 'scale, power, vulnerability',
    promptPhrase: 'slow tilt up revealing height'
  },
  
  // Complex
  crane: {
    terms: ['crane shot rising', 'crane shot descending'],
    effect: 'vertical movement',
    emotion: 'grand reveal, triumph, intimate arrival',
    promptPhrase: 'crane shot rising to reveal scene'
  },
  orbit: {
    terms: ['orbit shot circling subject', '180-degree arc shot'],
    effect: '360° or partial rotation',
    emotion: 'dynamic tension, emphasis',
    promptPhrase: 'slow orbit shot circling subject'
  },
  steadicam: {
    terms: ['Steadicam floating movement'],
    effect: 'smooth complex path',
    emotion: 'immersive following',
    promptPhrase: 'Steadicam floating movement following action'
  },
  
  // Stylistic
  handheld: {
    terms: ['handheld camera', 'documentary-style', 'shaky cam'],
    effect: 'organic shake',
    emotion: 'documentary, visceral, tension',
    promptPhrase: 'subtle handheld camera movement'
  }
} as const;

// ============================================================================
// TRANSITION MAPPING
// ============================================================================

export const TRANSITIONS: Record<string, {
  endInstruction: string;
  whenToUse: string;
}> = {
  cut: {
    endInstruction: 'Hard cut, immediate switch to next shot.',
    whenToUse: 'standard scene change'
  },
  jump_cut: {
    endInstruction: 'Jump cut with slight position shift, jarring energy.',
    whenToUse: 'fast-paced content, emphasis'
  },
  flash_cut: {
    endInstruction: '1-2 frame white flash between shots.',
    whenToUse: 'impact moments'
  },
  zoom_in: {
    endInstruction: 'End with quick zoom toward subject for emphasis.',
    whenToUse: 'dramatic reveal, focus'
  },
  zoom_out: {
    endInstruction: 'End with zoom out revealing wider context.',
    whenToUse: 'context reveal, conclusion'
  },
  push_in: {
    endInstruction: 'End with slow dolly push-in toward subject.',
    whenToUse: 'building intensity'
  },
  pull_back: {
    endInstruction: 'End with gentle pull-back revealing environment.',
    whenToUse: 'context reveal'
  },
  whip_pan: {
    endInstruction: 'Fast horizontal pan with motion blur, then cut.',
    whenToUse: 'energy, quick transitions'
  },
  wipe: {
    endInstruction: 'Horizontal wipe transition, subject exits frame.',
    whenToUse: 'scene change, time passage'
  },
  fade: {
    endInstruction: 'Gentle fade, hold final pose as opacity reduces.',
    whenToUse: 'soft ending, resolution'
  },
  fade_black: {
    endInstruction: 'Slow opacity fade to black over final 12 frames.',
    whenToUse: 'scene end'
  },
  fade_white: {
    endInstruction: 'Slow opacity fade to white over final 12 frames.',
    whenToUse: 'dream, memory'
  },
  dissolve: {
    endInstruction: 'Cross-dissolve preparation, hold final pose.',
    whenToUse: 'soft transition'
  },
  match_cut: {
    endInstruction: 'End framing matches first frame of next shot.',
    whenToUse: 'visual continuity'
  },
  hold: {
    endInstruction: 'Hold final frame steady for clean edit point.',
    whenToUse: 'default, flexible editing'
  }
};

// ============================================================================
// I2V MOTION DESCRIPTIONS
// ============================================================================

export const SUBJECT_MOTIONS = {
  face_expression: [
    'subtle eye blinks every 2-3 seconds',
    'gentle micro-expressions shifting',
    'slight narrowing of eyes in focus',
    'subtle smile emerging gradually',
    'eyebrows raising slightly in interest',
    'natural facial muscle micro-movements'
  ],
  head_posture: [
    'subtle head tilt suggesting thought',
    'gentle nod of understanding',
    'slight turn toward camera',
    'natural postural sway while standing',
    'subtle forward lean of engagement',
    'relaxed breathing motion in shoulders'
  ],
  hands_gestures: [
    'subtle hand gesture emphasizing point',
    'fingers gently tapping surface',
    'natural hand position adjustment',
    'gesture completing then returning to rest',
    'subtle fidget of held object'
  ]
};

export const AMBIENT_MOTIONS = {
  atmospheric: [
    'floating dust particles drifting through light beam',
    'subtle haze drift across frame',
    'gentle smoke wisps rising',
    'atmospheric particles catching light',
    'volumetric rays shifting subtly'
  ],
  environmental: [
    'monitor screen content subtly shifting',
    'LED indicator lights blinking naturally',
    'subtle fabric movement from air',
    'background foliage gentle sway',
    'water surface micro-ripples',
    'curtain edge gentle flutter'
  ],
  light_shadow: [
    'subtle light flicker from screen',
    'gentle shadow shift as clouds pass',
    'warm light slowly intensifying',
    'cool ambient light subtle pulse'
  ]
};

// ============================================================================
// EMOTION TO MOTION MAPPING
// ============================================================================

export const EMOTION_MOTION_MAP: Record<string, {
  camera: string;
  subject: string;
  expression: string;
  ambient: string;
  audio: string;
}> = {
  authority: {
    camera: 'static shot or very slow dolly push-in',
    subject: 'minimal movement, steady posture, deliberate slow gestures',
    expression: 'unwavering gaze, subtle controlled smile',
    ambient: 'clean, minimal distraction',
    audio: 'quiet confident space, no nervous energy sounds'
  },
  curiosity: {
    camera: 'gentle tracking or subtle orbit',
    subject: 'slight head tilts, engaged forward lean, active eye movement',
    expression: 'brightening eyes, raised brows, open expression',
    ambient: 'dynamic but not chaotic',
    audio: 'interested/anticipatory ambiance'
  },
  tension: {
    camera: 'slow push-in building pressure, or handheld slight shake',
    subject: 'rigid stillness or tense micro-movements',
    expression: 'fixed intense gaze, tight jaw, minimal blinks',
    ambient: 'oppressive, closing in',
    audio: 'low tension drone or charged silence'
  },
  shock: {
    camera: 'quick push-in or sudden stop',
    subject: 'frozen moment, then reactive micro-expressions',
    expression: 'widening eyes, raised brows, opening mouth',
    ambient: 'sudden shift or stillness',
    audio: 'beat of silence or sharp audio cue'
  },
  warmth: {
    camera: 'gentle approach or soft orbit',
    subject: 'relaxed natural movement, genuine gestures',
    expression: 'warm smile developing, soft eye contact',
    ambient: 'inviting, comfortable',
    audio: 'warm pleasant ambiance, possibly soft music'
  },
  contemplation: {
    camera: 'static or very slow drift',
    subject: 'subtle weight shifts, hand to chin, gaze movement',
    expression: 'thoughtful distant look, processing visible',
    ambient: 'quiet, space for thought',
    audio: 'minimal, contemplative silence or soft ambient'
  },
  excitement: {
    camera: 'dynamic tracking, subtle handheld energy',
    subject: 'animated gestures, energetic posture shifts',
    expression: 'bright eyes, genuine smile, lifted brows',
    ambient: 'vibrant, dynamic elements',
    audio: 'upbeat energy, positive atmosphere'
  },
  urgency: {
    camera: 'fast push-in, handheld shake',
    subject: 'forward lean, intense posture, rapid gestures',
    expression: 'intense gaze, serious expression, alert',
    ambient: 'high energy, movement',
    audio: 'tension, urgency cues'
  },
  hope: {
    camera: 'slow crane up or gentle push-in',
    subject: 'opening posture, upward gaze',
    expression: 'softening eyes, growing smile',
    ambient: 'light increasing, warm glow',
    audio: 'uplifting ambiance, soft warmth'
  },
  determination: {
    camera: 'steady push-in, unwavering',
    subject: 'squared stance, controlled power',
    expression: 'set jaw, focused eyes',
    ambient: 'solid, grounded',
    audio: 'confident, steady presence'
  }
};

// ============================================================================
// AUDIO TEMPLATES
// ============================================================================

export const AUDIO_TEMPLATES = {
  office: 'Quiet modern office ambiance - soft HVAC hum, distant keyboard typing, occasional muffled voices. No music, no audience sounds, no subtitles.',
  
  stage: 'Professional event atmosphere - room tone with subtle reverb, soft audience presence (no laughter/applause unless specified). No music, no subtitles.',
  
  home: 'Comfortable home atmosphere - soft room tone, subtle ambient life sounds (distant traffic, birds). No music, no audience, no subtitles.',
  
  tech: 'Data center atmosphere - server fan hum, subtle electronic ambient, cool mechanical space. No music, no voice, no subtitles.',
  
  outdoor: 'Natural outdoor ambiance - wind, birds, environmental sounds appropriate to location. No music unless specified, no subtitles.',
  
  studio: 'Clean studio atmosphere - controlled quiet, minimal ambient, professional recording space. No music, no audience, no subtitles.',
  
  urban: 'City atmosphere - distant traffic, urban hum, occasional pedestrian sounds. No music unless specified, no subtitles.',
  
  cafe: 'Casual cafe atmosphere - soft background chatter, coffee machine sounds, relaxed ambiance. No music, no subtitles.'
};

// ============================================================================
// CONTENT TYPE TEMPLATES
// ============================================================================

export const VIDEO_CONTENT_TEMPLATES = {
  hook: {
    duration: '3-5s',
    platform: 'veo-3.1-fast',
    camera: 'medium-speed dolly push-in toward face, ending at close-up',
    subject: 'direct eye contact, expression shifts from neutral to intrigue',
    ambient: 'single floating dust particle, subtle background glow',
    audio: 'brief attention sound, then quiet focused atmosphere',
    transition: 'hold'
  },
  
  explanation: {
    duration: '8s',
    platform: 'veo-3.1-fast',
    camera: 'static or very gentle drift',
    subject: 'natural teaching gestures, regular eye contact, subtle postural shifts',
    ambient: 'minimal distraction, clean professional',
    audio: 'clear speaking space, soft room tone',
    transition: 'hold'
  },
  
  broll_product: {
    duration: '4-6s',
    platform: 'sora-2-hd',
    camera: 'slow orbit around product, or gentle dolly past',
    subject: 'product hero, subtle light interaction on surfaces',
    ambient: 'floating dust particles, subtle reflections',
    audio: 'soft ambient, subtle product-appropriate sound',
    transition: 'smooth movement continuing'
  },
  
  broll_environment: {
    duration: '6-8s',
    platform: 'sora-2-hd',
    camera: 'slow pan across environment, or gentle crane',
    subject: 'environment itself, depth layers',
    ambient: 'atmospheric haze, natural environmental motion',
    audio: 'rich environmental ambiance',
    transition: 'movement continuing'
  },
  
  cta: {
    duration: '4-6s',
    platform: 'veo-3.1-fast',
    camera: 'static or very gentle push-in to close-up',
    subject: 'direct warm eye contact, genuine expression, subtle forward lean',
    ambient: 'clean, warm atmosphere',
    audio: 'warm personal delivery, soft pleasant room tone',
    transition: 'gentle hold or fade-ready'
  },
  
  transition_shot: {
    duration: '3-4s',
    platform: 'sora-2-hd',
    camera: 'dynamic movement (whip pan, crane rise, motivated push)',
    subject: 'abstract or environmental, motion-rich elements',
    ambient: 'high motion energy, particles, light streaks',
    audio: 'rhythmic ambient or transitional music swell',
    transition: 'motion blur into next'
  }
};

// ============================================================================
// VIDEO PROMPT TEMPLATES
// ============================================================================

export const VIDEO_PROMPT_TEMPLATES = {
  veo: `[VEO 3.1 - VIDEO]

Duration: ~{duration} seconds (max 8s)
Resolution: 1080p
Aspect: {aspect_ratio}

CAMERA MOTION
Movement: {camera_movement}
Speed: {camera_speed}

SUBJECT MOTION
{subject_motion}

AMBIENT MOTION
{ambient_motion}

AUDIO
Ambient: {ambient_audio}
Dialogue: {character_name} says: "{dialogue}"
Exclude: no subtitles, no audience sounds, no text overlays

CONTINUITY
Maintain exact lighting, environment, and appearance from reference image.

TRANSITION
{transition_instruction}

NEGATIVE
No blurry elements, no distortion, no artifacts, no text overlays.`,

  sora: `[SORA 2 - VIDEO]

Duration: ~{duration} seconds (max 10s)
Resolution: 720p
Aspect: {aspect_ratio}

SCENE ACTION
{scene_action}

CINEMATOGRAPHY
Camera: {camera_framing} + {camera_movement}
Mood: {emotional_tone}

ACTIONS (beat-based timing)
- {beat_1} (0-3s)
- {beat_2} (3-6s)
- {beat_3} (6-10s)

AUDIO
Ambient: {ambient_audio}
Dialogue: "{character_name}: {dialogue}"

PHYSICS
{physics_description}

EXCLUSIONS
No text on screen, no morphing, no artifacts.
Maintain proportions and identity throughout.`
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Select optimal video platform based on segment requirements
 */
export function selectVideoPlatform(params: {
  duration: number;
  hasDialogue: boolean;
  isCreatorShot: boolean;
  segmentType: string;
  needsComplexMotion?: boolean;
}): VideoModelKey {
  const { duration, hasDialogue, isCreatorShot, segmentType, needsComplexMotion } = params;
  
  // Creator shots with dialogue → VEO (best lip-sync)
  if (isCreatorShot && hasDialogue) {
    return 'veo-3.1-fast';
  }
  
  // Hook and CTA → VEO (quality matters most)
  if (['HOOK', 'CTA', 'LOOP-END'].includes(segmentType.toUpperCase())) {
    return 'veo-3.1-fast';
  }
  
  // Duration > 8s → must use Sora 2
  if (duration > 8) {
    return 'sora-2-hd';
  }
  
  // Complex motion B-roll → Sora 2
  if (needsComplexMotion && !isCreatorShot) {
    return 'sora-2-hd';
  }
  
  // Default → VEO for quality
  return 'veo-3.1-fast';
}

/**
 * Get camera movement for segment type
 */
export function getCameraMovement(segmentType: string, emotion: string): {
  movement: string;
  speed: string;
  promptPhrase: string;
} {
  const typeUpper = segmentType.toUpperCase();
  
  const movements: Record<string, { movement: string; speed: string; promptPhrase: string }> = {
    'HOOK': { movement: 'dolly push-in', speed: 'medium', promptPhrase: 'smooth dolly push-in toward subject face' },
    'FORE': { movement: 'pan', speed: 'slow', promptPhrase: 'slow pan revealing scene' },
    'BODY': { movement: 'static', speed: 'none', promptPhrase: 'static shot, stable framing' },
    'BODY-1': { movement: 'tracking', speed: 'slow', promptPhrase: 'slow tracking shot' },
    'BODY-2': { movement: 'static', speed: 'none', promptPhrase: 'static shot, subtle drift' },
    'BODY-3': { movement: 'dolly', speed: 'slow', promptPhrase: 'slow dolly movement' },
    'PEAK': { movement: 'push-in', speed: 'medium', promptPhrase: 'dolly push-in for emphasis' },
    'CTA': { movement: 'static', speed: 'none', promptPhrase: 'static shot, gentle push-in at end' },
    'ENDING': { movement: 'pull-back', speed: 'slow', promptPhrase: 'gentle dolly pull-back' }
  };
  
  return movements[typeUpper] || movements['BODY'];
}

/**
 * Get emotion-based motion settings
 */
export function getEmotionMotion(emotion: string): {
  camera: string;
  subject: string;
  expression: string;
  ambient: string;
  audio: string;
} {
  const emotionLower = emotion.toLowerCase();
  return EMOTION_MOTION_MAP[emotionLower] || EMOTION_MOTION_MAP.authority;
}

/**
 * Get audio template for environment
 */
export function getAudioTemplate(environment: string): string {
  const envLower = environment.toLowerCase();
  
  if (envLower.includes('office') || envLower.includes('work')) return AUDIO_TEMPLATES.office;
  if (envLower.includes('stage') || envLower.includes('event')) return AUDIO_TEMPLATES.stage;
  if (envLower.includes('home') || envLower.includes('room')) return AUDIO_TEMPLATES.home;
  if (envLower.includes('tech') || envLower.includes('server') || envLower.includes('data')) return AUDIO_TEMPLATES.tech;
  if (envLower.includes('outdoor') || envLower.includes('nature') || envLower.includes('park')) return AUDIO_TEMPLATES.outdoor;
  if (envLower.includes('city') || envLower.includes('urban') || envLower.includes('street')) return AUDIO_TEMPLATES.urban;
  if (envLower.includes('cafe') || envLower.includes('restaurant')) return AUDIO_TEMPLATES.cafe;
  
  return AUDIO_TEMPLATES.studio; // Default
}

/**
 * Get transition instruction
 * Handles various formats: Flash-Cut, flash_cut, Flash Cut, etc.
 */
export function getTransition(transitionType: string): string {
  // Normalize: lowercase, replace hyphens and spaces with underscores
  const type = transitionType.toLowerCase().replace(/[-\s]+/g, '_');
  return TRANSITIONS[type]?.endInstruction || TRANSITIONS.hold.endInstruction;
}

/**
 * Build VEO video prompt
 */
export function buildVeoPrompt(params: {
  duration: number;
  aspectRatio: '9:16' | '16:9';
  segmentType: string;
  emotion: string;
  dialogue?: string;
  characterName?: string;
  environment?: string;
}): string {
  const {
    duration,
    aspectRatio,
    segmentType,
    emotion,
    dialogue = '',
    characterName = 'Creator',
    environment = 'studio'
  } = params;
  
  const cameraMove = getCameraMovement(segmentType, emotion);
  const emotionMotion = getEmotionMotion(emotion);
  const audioTemplate = getAudioTemplate(environment);
  
  const dialogueLine = dialogue 
    ? `${characterName} says: "${dialogue.substring(0, 100)}"` 
    : 'No dialogue, ambient only';
  
  return `Duration: ~${Math.min(duration, 8)} seconds
Resolution: 1080p
Aspect: ${aspectRatio}

CAMERA MOTION
Movement: ${cameraMove.promptPhrase}
Speed: ${cameraMove.speed}

SUBJECT MOTION
${emotionMotion.subject}
Expression: ${emotionMotion.expression}

AMBIENT MOTION
${emotionMotion.ambient}

AUDIO
Ambient: ${audioTemplate.split('.')[0]}
Dialogue: ${dialogueLine}
Exclude: no subtitles, no audience sounds, no text overlays

CONTINUITY
Maintain exact lighting, environment, and appearance from reference image.

TRANSITION
${TRANSITIONS.hold.endInstruction}

NEGATIVE
No blurry elements, no distortion, no artifacts, no text overlays.`;
}

/**
 * Build Sora 2 video prompt
 */
export function buildSoraPrompt(params: {
  duration: number;
  aspectRatio: '9:16' | '16:9';
  segmentType: string;
  emotion: string;
  sceneAction: string;
  dialogue?: string;
  characterName?: string;
  environment?: string;
}): string {
  const {
    duration,
    aspectRatio,
    segmentType,
    emotion,
    sceneAction,
    dialogue = '',
    characterName = 'Creator',
    environment = 'studio'
  } = params;
  
  const cameraMove = getCameraMovement(segmentType, emotion);
  const emotionMotion = getEmotionMotion(emotion);
  const audioTemplate = getAudioTemplate(environment);
  
  const dialogueLine = dialogue 
    ? `"${characterName}: ${dialogue.substring(0, 80)}"` 
    : 'No dialogue';
  
  return `Duration: ~${Math.min(duration, 10)} seconds
Resolution: 720p
Aspect: ${aspectRatio}

SCENE ACTION
${sceneAction}

CINEMATOGRAPHY
Camera: ${cameraMove.promptPhrase}
Mood: ${emotion}

ACTIONS (beat-based timing)
- Scene begins, subject in starting position (0-3s)
- ${emotionMotion.subject} (3-6s)
- ${emotionMotion.expression}, hold for emphasis (6-10s)

AUDIO
Ambient: ${audioTemplate.split('.')[0]}
Dialogue: ${dialogueLine}

PHYSICS
Natural motion, realistic timing, gravity applies normally.

EXCLUSIONS
No text on screen, no morphing, no artifacts.
Maintain proportions and identity throughout.`;
}

/**
 * Get content template for segment type
 */
export function getContentTemplate(segmentType: string): {
  duration: string;
  platform: VideoModelKey;
  camera: string;
  subject: string;
  ambient: string;
  audio: string;
  transition: string;
} {
  const typeKey = segmentType.toLowerCase().replace(/[-_\s]+/g, '_');
  
  // Map segment types to content templates
  const mapping: Record<string, keyof typeof VIDEO_CONTENT_TEMPLATES> = {
    'hook': 'hook',
    'fore': 'broll_environment',
    'foreshadow': 'broll_environment',
    'body': 'explanation',
    'body_1': 'explanation',
    'body_2': 'broll_product',
    'body_3': 'broll_environment',
    'peak': 'broll_product',
    'cta': 'cta',
    'ending': 'cta',
    'ending_cta': 'cta',
    'broll': 'broll_environment',
    'transition': 'transition_shot'
  };
  
  const templateKey = mapping[typeKey] || 'explanation';
  return VIDEO_CONTENT_TEMPLATES[templateKey];
}

/**
 * Calculate estimated cost for video generation
 */
export function calculateVideoCost(segments: Array<{ platform: VideoModelKey }>): number {
  return segments.reduce((total, segment) => {
    const model = VIDEO_MODELS[segment.platform];
    return total + (model?.price || 0.01);
  }, 0);
}

/**
 * Validate dialogue length for platform
 */
export function validateDialogueLength(dialogue: string, platform: VideoModelKey): {
  valid: boolean;
  wordCount: number;
  maxWords: number;
  message?: string;
} {
  const words = dialogue.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const maxWords = platform === 'veo-3.1-fast' ? 15 : 20;
  
  if (wordCount > maxWords) {
    return {
      valid: false,
      wordCount,
      maxWords,
      message: `Dialogue too long: ${wordCount} words (max ${maxWords} for ${VIDEO_MODELS[platform].name})`
    };
  }
  
  return { valid: true, wordCount, maxWords };
}
