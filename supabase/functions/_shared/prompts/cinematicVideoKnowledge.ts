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
    name: 'Veo 3.1 Fast (8s)',
    apiModel: 'veo-3.1-fast',
    resolution: '720p-1080p', // Depends on aspect: 9:16=720p, 16:9=1080p
    dimensions: { landscape: '1920x1080', portrait: '720x1280' }, // Portrait limited to 720p
    maxDuration: 8,
    price: 0.01,
    strengths: ['best lip-sync', 'native audio', 'sharp output', '1080p for 16:9'],
    weaknesses: ['8s max', '720p for 9:16 portrait'],
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
// VIDEO PROMPT TEMPLATES (Claude Project Quality)
// ============================================================================

export const VIDEO_PROMPT_TEMPLATES = {
  veo: `[VEO 3.1 PROMPT — {segment_id}]

DURATION: {duration} seconds

STARTING FRAME:
Continue from the provided image — {character_description}. {props_description}. {background_description}.

CAMERA:
{focal_length} {shot_type}, {camera_angle}, {camera_stability}. {camera_movement_description}.

SETTING & LIGHTING:
{time_of_day}, {lighting_description}. {environment_details}.

ACTION SEQUENCE:
{action_beats}

DIALOGUE:
{character_name} ({emotion_tone}):
"{dialogue}"

SOUND:
- Voice: {voice_description}
- Ambient: {ambient_sounds}
- Effects: {sound_effects}

CONTINUITY NOTES:
{continuity_notes}

OUTPUT INTENT:
{output_intent}`,

  sora: `[SORA 2 PROMPT — {segment_id}]

DURATION: {duration} seconds

STARTING FRAME:
Continue from the provided image — {character_description}. {props_description}. {background_description}.

CAMERA:
{focal_length} {shot_type}, {camera_angle}, {camera_stability}. {camera_movement_description}.

SETTING & LIGHTING:
{time_of_day}, {lighting_description}. {environment_details}.

ACTION SEQUENCE:
{action_beats}

DIALOGUE:
{character_name} ({emotion_tone}):
"{dialogue}"

SOUND:
- Voice: {voice_description}
- Ambient: {ambient_sounds}
- Effects: {sound_effects}

PHYSICS:
Natural motion, realistic timing, gravity applies normally. {physics_notes}

CONTINUITY NOTES:
{continuity_notes}

OUTPUT INTENT:
{output_intent}`
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

// ============================================================================
// EXTENDED PROMPT PARAMETERS TYPE
// ============================================================================

export interface ExtendedPromptParams {
  // Basic
  segmentId: string;
  segmentNumber: number;
  duration: number;
  aspectRatio: '9:16' | '16:9';
  segmentType: string;
  emotion: string;
  
  // Character & Scene
  characterName: string;
  characterDescription?: string;  // "bald, glasses, navy blazer, white shirt"
  propsDescription?: string;      // "holding tablet showing dashboard"
  backgroundDescription?: string; // "modern office with glass windows"
  
  // Camera
  shotType?: string;              // "medium shot", "close-up", "wide shot"
  cameraAngle?: string;           // "eye-level", "low angle", "high angle"
  cameraMovement?: string;        // from getCameraMovement or custom
  focalLength?: string;           // "35mm", "50mm", "85mm"
  
  // Lighting & Environment
  environment: string;
  timeOfDay?: string;             // "mid-morning", "golden hour", "night"
  lightingDescription?: string;   // "soft diffused sunlight", "dramatic side lighting"
  
  // Action
  actionBeats?: ActionBeat[];     // Timestamped actions
  visualDirection?: string;       // Legacy support
  
  // Audio
  dialogue?: string;
  voiceTone?: string;             // "confident", "warm", "excited"
  ambientSounds?: string;         // Specific ambient description
  soundEffects?: string;          // "soft beep", "door closing"
  
  // Continuity
  continuityNotes?: string[];     // Array of continuity reminders
  
  // Creative
  outputIntent?: string;          // "Establish authority and expertise"
  transition?: string;
}

export interface ActionBeat {
  timeRange: string;              // "0s-4s"
  action: string;                 // "holds tablet, gestures explaining"
}

// ============================================================================
// SHOT TYPE MAPPING
// ============================================================================

export const SHOT_TYPES: Record<string, {
  name: string;
  focalLength: string;
  framing: string;
}> = {
  'extreme_close_up': { name: 'extreme close-up', focalLength: '85mm', framing: 'eyes or specific detail only' },
  'close_up': { name: 'close-up', focalLength: '85mm', framing: 'face fills frame' },
  'medium_close_up': { name: 'medium close-up', focalLength: '50mm', framing: 'head and shoulders' },
  'medium': { name: 'medium shot', focalLength: '50mm', framing: 'waist up' },
  'medium_wide': { name: 'medium wide shot', focalLength: '35mm', framing: 'knees up' },
  'wide': { name: 'wide shot', focalLength: '24mm', framing: 'full body with environment' },
  'extreme_wide': { name: 'extreme wide shot', focalLength: '18mm', framing: 'environment dominant' },
  'group': { name: 'group shot', focalLength: '35mm', framing: 'multiple subjects in frame' }
};

// ============================================================================
// VOICE TONE MAPPING
// ============================================================================

export const VOICE_TONES: Record<string, string> = {
  'authority': 'confident, measured pace, clear articulation',
  'curiosity': 'interested, slightly higher pitch, engaged',
  'tension': 'tight, controlled, urgent undertone',
  'warmth': 'gentle, welcoming, soft delivery',
  'excitement': 'energetic, enthusiastic, upbeat pace',
  'urgency': 'fast-paced, intense, commanding',
  'hope': 'optimistic, rising intonation, warm',
  'determination': 'steady, resolute, powerful',
  'contemplation': 'thoughtful, slower pace, reflective',
  'explaining': 'clear, educational, patient pace'
};

// ============================================================================
// SEGMENT TYPE TO SHOT TYPE MAPPING
// ============================================================================

function getDefaultShotType(segmentType: string): string {
  const mapping: Record<string, string> = {
    'HOOK': 'medium_close_up',
    'FORE': 'wide',
    'FORESHADOW': 'wide',
    'BODY': 'medium',
    'BODY-1': 'medium',
    'BODY-2': 'medium_wide',
    'BODY-3': 'medium',
    'PEAK': 'close_up',
    'CTA': 'medium_close_up',
    'ENDING': 'medium',
    'ENDING_CTA': 'medium_close_up',
    'LOOP-END': 'medium_close_up'
  };
  return mapping[segmentType.toUpperCase()] || 'medium';
}

// ============================================================================
// GENERATE ACTION BEATS
// ============================================================================

function generateActionBeats(params: {
  duration: number;
  segmentType: string;
  emotion: string;
  characterName: string;
  hasDialogue: boolean;
  propsDescription?: string;
}): ActionBeat[] {
  const { duration, segmentType, emotion, characterName, hasDialogue, propsDescription } = params;
  const emotionMotion = getEmotionMotion(emotion);
  const typeUpper = segmentType.toUpperCase();
  
  // Calculate beat timing based on duration
  const beat1End = Math.floor(duration * 0.33);
  const beat2End = Math.floor(duration * 0.66);
  
  // Default beats based on segment type
  const defaultBeats: Record<string, ActionBeat[]> = {
    'HOOK': [
      { timeRange: `0s-${beat1End}s`, action: `${characterName} looks directly at camera, expression shifts to intrigue` },
      { timeRange: `${beat1End}s-${beat2End}s`, action: hasDialogue ? `speaks with ${emotion} energy, subtle hand gesture` : `${emotionMotion.expression}` },
      { timeRange: `${beat2End}s-${duration}s`, action: 'holds gaze, slight head tilt, inviting viewer in' }
    ],
    'CTA': [
      { timeRange: `0s-${beat1End}s`, action: `${characterName} maintains warm eye contact, slight forward lean` },
      { timeRange: `${beat1End}s-${beat2End}s`, action: hasDialogue ? 'delivers call-to-action with genuine enthusiasm' : `${emotionMotion.expression}` },
      { timeRange: `${beat2End}s-${duration}s`, action: 'warm smile, subtle nod, holds for emphasis' }
    ],
    'BODY': [
      { timeRange: `0s-${beat1End}s`, action: propsDescription ? `${characterName} ${propsDescription}` : `${characterName} in natural speaking position` },
      { timeRange: `${beat1End}s-${beat2End}s`, action: hasDialogue ? `explains with natural gestures, ${emotionMotion.subject}` : emotionMotion.subject },
      { timeRange: `${beat2End}s-${duration}s`, action: `${emotionMotion.expression}, maintains engagement` }
    ]
  };
  
  // Return type-specific beats or default BODY beats
  return defaultBeats[typeUpper] || defaultBeats['BODY'];
}

// ============================================================================
// GENERATE CONTINUITY NOTES
// ============================================================================

function generateContinuityNotes(params: {
  characterName: string;
  characterDescription?: string;
  propsDescription?: string;
  environment?: string;
}): string[] {
  const notes: string[] = [];
  
  if (params.characterDescription) {
    notes.push(`- ${params.characterName}: ${params.characterDescription} — consistent throughout`);
  } else {
    notes.push(`- ${params.characterName}: maintain exact appearance from reference image`);
  }
  
  if (params.propsDescription) {
    notes.push(`- Props: ${params.propsDescription}`);
  }
  
  notes.push('- Lighting and color grade must match reference exactly');
  notes.push('- No identity drift or morphing between frames');
  
  return notes;
}

// ============================================================================
// GENERATE OUTPUT INTENT
// ============================================================================

function generateOutputIntent(segmentType: string, emotion: string): string {
  const intents: Record<string, string> = {
    'HOOK': 'Capture attention immediately. Create intrigue that compels viewer to keep watching.',
    'FORE': 'Build anticipation. Hint at value to come without revealing everything.',
    'FORESHADOW': 'Plant seeds for upcoming content. Create curiosity loop.',
    'BODY': 'Deliver core value. Maintain engagement through clear, compelling delivery.',
    'BODY-1': 'Establish first key point. Build foundation for argument.',
    'BODY-2': 'Develop narrative. Deepen understanding with examples or evidence.',
    'BODY-3': 'Reinforce message. Add final layer of value before conclusion.',
    'PEAK': 'Climactic moment. Maximum emotional impact and revelation.',
    'CTA': 'Drive action. Convert attention into engagement (follow, like, comment, click).',
    'ENDING': 'Satisfying conclusion. Leave viewer with clear takeaway.',
    'ENDING_CTA': 'Combine closure with action. End strong with clear next step.',
    'LOOP-END': 'Create seamless loop back to hook. Encourage rewatch.'
  };
  
  return intents[segmentType.toUpperCase()] || intents['BODY'];
}

/**
 * Build VEO video prompt (Claude Project Quality)
 */
export function buildVeoPrompt(params: ExtendedPromptParams): string {
  const {
    segmentId = 'CLIP',
    segmentNumber = 1,
    duration,
    aspectRatio,
    segmentType,
    emotion,
    characterName = 'Creator',
    characterDescription,
    propsDescription,
    backgroundDescription,
    shotType,
    cameraAngle = 'eye-level',
    cameraMovement,
    focalLength,
    environment = 'studio',
    timeOfDay = 'soft natural light',
    lightingDescription,
    actionBeats,
    visualDirection,
    dialogue = '',
    voiceTone,
    ambientSounds,
    soundEffects,
    continuityNotes,
    outputIntent,
    transition = 'hold'
  } = params;
  
  // Determine shot type and camera settings
  const defaultShot = getDefaultShotType(segmentType);
  const shotConfig = SHOT_TYPES[shotType || defaultShot] || SHOT_TYPES['medium'];
  const actualFocalLength = focalLength || shotConfig.focalLength;
  
  // Get camera movement
  const cameraMove = getCameraMovement(segmentType, emotion);
  const actualCameraMovement = cameraMovement || cameraMove.promptPhrase;
  
  // Get emotion settings
  const emotionMotion = getEmotionMotion(emotion);
  const actualVoiceTone = voiceTone || VOICE_TONES[emotion.toLowerCase()] || VOICE_TONES['authority'];
  
  // Get audio template
  const audioTemplate = getAudioTemplate(environment);
  const actualAmbient = ambientSounds || audioTemplate.split('.')[0];
  
  // Resolution based on aspect ratio
  const resolution = aspectRatio === '16:9' ? '1080p' : '720p';
  
  // Generate action beats if not provided
  const hasDialogue = dialogue.length > 0;
  const actualActionBeats = actionBeats || generateActionBeats({
    duration: Math.min(duration, 8),
    segmentType,
    emotion,
    characterName,
    hasDialogue,
    propsDescription
  });
  
  // Format action beats
  const actionBeatsFormatted = actualActionBeats
    .map(beat => `- (${beat.timeRange}): ${beat.action}`)
    .join('\n');
  
  // Generate continuity notes if not provided
  const actualContinuityNotes = continuityNotes || generateContinuityNotes({
    characterName,
    characterDescription,
    propsDescription,
    environment
  });
  const continuityFormatted = actualContinuityNotes.join('\n');
  
  // Generate output intent if not provided
  const actualOutputIntent = outputIntent || generateOutputIntent(segmentType, emotion);
  
  // Build character description line
  const charDescLine = characterDescription 
    ? `${characterName} (${characterDescription})`
    : `${characterName} as shown in reference image`;
  
  // Build props line
  const propsLine = propsDescription || 'no specific props';
  
  // Build background line  
  const bgLine = backgroundDescription || `${environment} setting as shown in reference`;
  
  // Build lighting line
  const lightingLine = lightingDescription || `${timeOfDay}, professional ${environment} lighting`;
  
  // Build dialogue section
  const dialogueSection = hasDialogue
    ? `${characterName} (${emotion}):\n"${dialogue}"`
    : `No dialogue. ${characterName} maintains ${emotionMotion.expression}.`;
  
  // Build sound effects line
  const effectsLine = soundEffects || 'subtle ambient only, no music';
  
  return `[VEO 3.1 PROMPT — ${segmentId}.${segmentNumber}]

DURATION: ${Math.min(duration, 8)} seconds
RESOLUTION: ${resolution}
ASPECT: ${aspectRatio}

STARTING FRAME:
Continue from the provided image — ${charDescLine}. ${propsLine}. Background: ${bgLine}.

CAMERA:
${actualFocalLength} ${shotConfig.name}, ${cameraAngle}, stable tripod. ${actualCameraMovement}. All key elements remain in frame throughout.

SETTING & LIGHTING:
${lightingLine}. ${environment.charAt(0).toUpperCase() + environment.slice(1)} environment clearly visible.

ACTION SEQUENCE:
${actionBeatsFormatted}

DIALOGUE:
${dialogueSection}

SOUND:
- Voice: ${actualVoiceTone}
- Ambient: ${actualAmbient}
- Effects: ${effectsLine}
- Exclude: no subtitles, no text overlays, no background music unless specified

CONTINUITY NOTES:
${continuityFormatted}

TRANSITION:
${getTransition(transition)}

OUTPUT INTENT:
${actualOutputIntent}

NEGATIVE:
No blurry elements, no distortion, no artifacts, no text overlays, no identity morphing.`;
}

/**
 * Build Sora 2 video prompt (Claude Project Quality)
 */
export function buildSoraPrompt(params: ExtendedPromptParams): string {
  const {
    segmentId = 'CLIP',
    segmentNumber = 1,
    duration,
    aspectRatio,
    segmentType,
    emotion,
    characterName = 'Creator',
    characterDescription,
    propsDescription,
    backgroundDescription,
    shotType,
    cameraAngle = 'eye-level',
    cameraMovement,
    focalLength,
    environment = 'studio',
    timeOfDay = 'soft natural light',
    lightingDescription,
    actionBeats,
    visualDirection,
    dialogue = '',
    voiceTone,
    ambientSounds,
    soundEffects,
    continuityNotes,
    outputIntent,
    transition = 'hold'
  } = params;
  
  // Determine shot type and camera settings
  const defaultShot = getDefaultShotType(segmentType);
  const shotConfig = SHOT_TYPES[shotType || defaultShot] || SHOT_TYPES['medium'];
  const actualFocalLength = focalLength || shotConfig.focalLength;
  
  // Get camera movement - Sora prefers ONE clear movement
  const cameraMove = getCameraMovement(segmentType, emotion);
  const actualCameraMovement = cameraMovement || cameraMove.promptPhrase;
  
  // Get emotion settings
  const emotionMotion = getEmotionMotion(emotion);
  const actualVoiceTone = voiceTone || VOICE_TONES[emotion.toLowerCase()] || VOICE_TONES['authority'];
  
  // Get audio template
  const audioTemplate = getAudioTemplate(environment);
  const actualAmbient = ambientSounds || audioTemplate.split('.')[0];
  
  // Generate action beats if not provided
  const hasDialogue = dialogue.length > 0;
  const actualActionBeats = actionBeats || generateActionBeats({
    duration: Math.min(duration, 10),
    segmentType,
    emotion,
    characterName,
    hasDialogue,
    propsDescription
  });
  
  // Format action beats
  const actionBeatsFormatted = actualActionBeats
    .map(beat => `- (${beat.timeRange}): ${beat.action}`)
    .join('\n');
  
  // Generate continuity notes if not provided
  const actualContinuityNotes = continuityNotes || generateContinuityNotes({
    characterName,
    characterDescription,
    propsDescription,
    environment
  });
  const continuityFormatted = actualContinuityNotes.join('\n');
  
  // Generate output intent if not provided
  const actualOutputIntent = outputIntent || generateOutputIntent(segmentType, emotion);
  
  // Build character description line
  const charDescLine = characterDescription 
    ? `${characterName} (${characterDescription})`
    : `${characterName} as shown in reference image`;
  
  // Build props line
  const propsLine = propsDescription || 'no specific props';
  
  // Build background line  
  const bgLine = backgroundDescription || `${environment} setting as shown in reference`;
  
  // Build lighting line
  const lightingLine = lightingDescription || `${timeOfDay}, professional ${environment} lighting`;
  
  // Build dialogue section
  const dialogueSection = hasDialogue
    ? `${characterName} (${emotion}):\n"${dialogue}"`
    : `No dialogue. ${characterName} maintains ${emotionMotion.expression}.`;
  
  // Build sound effects line
  const effectsLine = soundEffects || 'subtle ambient only';
  
  return `[SORA 2 PROMPT — ${segmentId}.${segmentNumber}]

DURATION: ${Math.min(duration, 10)} seconds
RESOLUTION: 720p
ASPECT: ${aspectRatio}

STARTING FRAME:
Continue from the provided image — ${charDescLine}. ${propsLine}. Background: ${bgLine}.

CAMERA:
${actualFocalLength} ${shotConfig.name}, ${cameraAngle}, stable. ${actualCameraMovement}.

SETTING & LIGHTING:
${lightingLine}. ${environment.charAt(0).toUpperCase() + environment.slice(1)} environment.

ACTION SEQUENCE:
${actionBeatsFormatted}

DIALOGUE:
${dialogueSection}

SOUND:
- Voice: ${actualVoiceTone}
- Ambient: ${actualAmbient}
- Effects: ${effectsLine}

PHYSICS:
Natural motion, realistic timing, gravity applies normally. Single camera movement, single subject action per beat.

CONTINUITY NOTES:
${continuityFormatted}

TRANSITION:
${getTransition(transition)}

OUTPUT INTENT:
${actualOutputIntent}

EXCLUSIONS:
No text overlays, no morphing, no artifacts, no identity drift. Maintain proportions throughout.`;
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
