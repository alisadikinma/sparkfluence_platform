/**
 * CINEMATIC IMAGE KNOWLEDGE BASE
 * Static knowledge for image generation - NO DATABASE QUERIES NEEDED
 * 
 * This file contains all the knowledge required for generating cinematic images:
 * - Emotion mapping, lighting patterns, camera settings
 * - Film stocks, atmosphere types, mood setups
 * - Prompt building helpers
 * 
 * NOTE: Image model specs are now centralized in config/aiModels.ts
 * Import IMAGE_MODELS from there for model configurations.
 * 
 * Source Files:
 * - Image_Project_Instruction.md
 * - Cinematic_Image_Technical_Reference.md
 * - DALL-E_3_Cinematic_Production_Knowledge_File.md
 * 
 * Last Updated: 2026-01-09
 */

// ============================================================================
// RE-EXPORT IMAGE MODELS FROM CENTRALIZED CONFIG
// For backward compatibility - new code should import from config/aiModels.ts
// ============================================================================
export {
  IMAGE_MODELS,
  type ImageModelKey,
  getImageModel,
  getAspectRatioApiValue,
  getDimensions,
  buildImageFormData,
  selectImageModel,
  getImageModelFallbackChain,
} from '../config/aiModels.ts';

// ============================================================================
// DALL-E 3 TECHNICAL SPECS (Legacy - kept for backward compatibility)
// New code should use IMAGE_MODELS['dall-e-3'] from config/aiModels.ts
// ============================================================================

export const DALLE3_SPECS = {
  model: 'dall-e-3',
  quality: 'hd', // Always HD for video production
  style: 'vivid', // Cinematic (or 'natural' for realistic)
  sizes: {
    '9:16': '1024x1792', // Vertical (TikTok, Reels, Shorts)
    '16:9': '1792x1024', // Horizontal (YouTube)
    '1:1': '1024x1024'   // Square (Instagram)
  },
  maxPromptLength: 4000,
  optimalPromptLength: '100-200 words',
  pricing: {
    '1024x1024': { standard: 0.04, hd: 0.08 },
    '1792x1024': { standard: 0.08, hd: 0.12 },
    '1024x1792': { standard: 0.08, hd: 0.12 }
  }
} as const;

// ============================================================================
// PROJECT INSTRUCTION
// ============================================================================

export const IMAGE_PROJECT_INSTRUCTION = `
# AI IMAGE PRODUCTION — PROJECT INSTRUCTION

## ROLE
You are an **AI Cinematographer and Image Prompt Engineer** producing Hollywood-grade cinematic images for video production.

## FIXED TECHNICAL SPECS
| Parameter | Value |
|-----------|-------|
| Aspect Ratio | 9:16 vertical OR 16:9 horizontal |
| Resolution | 1024x1792 (9:16) OR 1792x1024 (16:9) |
| Quality | HD (always) |
| Style | vivid (cinematic) |

## RULE 1 - CREATOR FACE ALLOCATION (CRITICAL)

Creator Face appears ONLY in:
| Segment Type | Creator Face? | Visual Type |
|--------------|---------------|-------------|
| HOOK | YES | Talking head (direct to camera) |
| CTA | YES | Talking head (direct to camera) |
| LOOP-END | YES | Match Hook frame |
| THUMBNAIL | YES | Creator + topic visual |
| All Others (BODY, FORE, PEAK) | NO | B-roll (no face) |

## RULE 2 - DALL-E 3 SPECIFIC RULES

### No Negative Prompts
DALL-E 3 ignores exclusions. Use POSITIVE FRAMING:
- "no blur" → "crystal-clear sharp focus"
- "no text" → "clean frame without overlays"
- "no people" → "isolated subject, empty environment"

### Character Consistency via Text
- Use EXACT same character description in every creator prompt
- Include specific unique details (glasses type, skin tone, face shape)
- Avoid generic terms DALL-E might diversify

### Camera/Lens Specs Work Well
DALL-E 3 responds to technical photography terms:
- Lens focal length: 85mm, 50mm, 35mm
- Aperture for DOF: f/1.8, f/2.8, f/4
- Film stocks: Kodak Vision3 500T, Portra 400

## RULE 3 - DYNAMIC COSTUME BY TOPIC

Creator costume MUST match the topic context:
| Topic Category | Costume |
|----------------|---------|
| Medical/Health | White doctor coat, stethoscope |
| Tech/Startup | Dark hoodie, casual tech wear |
| Finance/Business | Navy blazer, white shirt |
| Farming/Agriculture | Farmer outfit, straw hat |
| Cooking/Food | Chef apron, kitchen attire |
| Fitness/Sports | Athletic wear, gym clothes |
| Education | Smart casual, glasses |
| Fashion/Beauty | Trendy stylish outfit |
| Travel | Casual travel wear, backpack |
| Gaming | Gaming headset, casual hoodie |
| Music | Artist attire, accessories |
| Default | Smart casual professional |

## RULE 4 - QUALITY CHECKLIST

Before generating each image:
- [ ] Size: 1024x1792 (9:16) or 1792x1024 (16:9)
- [ ] Quality: HD
- [ ] Style: vivid
- [ ] Shot type specified (CU, MCU, MS, etc.)
- [ ] Lens specified (mm + aperture)
- [ ] Lighting pattern named
- [ ] Film stock referenced
- [ ] Character description verbatim (if creator shot)
- [ ] Costume matches topic
- [ ] No negative prompts - positive framing only
`;

// ============================================================================
// EMOTION TO EXPRESSION MAPPING
// ============================================================================

export const EMOTION_EXPRESSION_MAP: Record<string, {
  facial: string;
  body: string;
  lighting: string;
}> = {
  shock: {
    facial: 'wide eyes, raised brows, slightly open mouth, tense jaw',
    body: 'frozen posture, pulled back',
    lighting: 'high contrast 8:1, harsh key'
  },
  intrigue: {
    facial: 'slightly narrowed eyes, gentle head tilt, focused gaze',
    body: 'leaning forward subtly',
    lighting: 'low-key, mysterious shadows'
  },
  curiosity: {
    facial: 'bright eyes, engaged look, slightly raised brows',
    body: 'leaning in, open posture',
    lighting: 'soft key, moderate fill 4:1'
  },
  tension: {
    facial: 'furrowed brow, tight lips, intense fixed gaze',
    body: 'rigid shoulders, clenched hands',
    lighting: 'chiaroscuro, 8:1+ ratio'
  },
  awe: {
    facial: 'softened eyes, slightly open mouth, relaxed brow',
    body: 'relaxed shoulders, chin slightly up',
    lighting: 'rim lighting, volumetric rays'
  },
  resolution: {
    facial: 'relaxed brow, subtle confident smile, steady eye contact',
    body: 'squared shoulders, steady posture',
    lighting: 'balanced 3-point, warm 3200K'
  },
  fear: {
    facial: 'wide eyes, tense lips, raised inner brows',
    body: 'pulled-back, defensive posture',
    lighting: 'underlit, cold 6500K+'
  },
  excitement: {
    facial: 'bright eyes, genuine smile, lifted brows',
    body: 'animated, energetic, forward lean',
    lighting: 'high-key, warm, vibrant'
  },
  authority: {
    facial: 'steady gaze, slight knowing smile, relaxed brow',
    body: 'arms crossed or hands steepled',
    lighting: 'Rembrandt, 4:1 ratio'
  },
  contemplation: {
    facial: 'slightly downcast eyes, neutral mouth',
    body: 'hand near chin, slight head tilt',
    lighting: 'soft side light, 4:1'
  },
  determination: {
    facial: 'set jaw, focused eyes, slight brow furrow',
    body: 'forward lean, squared stance',
    lighting: 'strong key, minimal fill'
  },
  hope: {
    facial: 'warm smile, bright eyes, relaxed expression',
    body: 'open posture, slight upward gaze',
    lighting: 'golden hour warmth, soft 3:1'
  },
  frustration: {
    facial: 'furrowed brow, tight lips, narrowed eyes',
    body: 'tense shoulders, restrained gesture',
    lighting: 'cool blue tones, harsh shadows'
  },
  realization: {
    facial: 'widening eyes, parting lips, raised brows',
    body: 'slight backward lean, then forward',
    lighting: 'golden hour, soft glow'
  },
  urgency: {
    facial: 'intense gaze, serious expression, alert eyes',
    body: 'forward lean, dynamic posture',
    lighting: 'high contrast, dramatic shadows'
  }
};

// ============================================================================
// LIGHTING PATTERNS
// ============================================================================

export const LIGHTING_PATTERNS: Record<string, {
  keyPosition: string;
  shadow: string;
  mood: string;
  promptPhrase: string;
}> = {
  rembrandt: {
    keyPosition: '45 degree side, above eye',
    shadow: 'triangle under eye',
    mood: 'dramatic, authoritative',
    promptPhrase: 'Rembrandt lighting, triangle shadow on cheek'
  },
  butterfly: {
    keyPosition: 'directly above, on-axis',
    shadow: 'butterfly under nose',
    mood: 'glamorous, beauty',
    promptPhrase: 'Butterfly lighting, glamorous portrait'
  },
  split: {
    keyPosition: '90 degree direct side',
    shadow: 'half face shadow',
    mood: 'intense, duality',
    promptPhrase: 'Split lighting, half-face shadow'
  },
  loop: {
    keyPosition: '30-45 degree from camera',
    shadow: 'small nose loop',
    mood: 'natural, flattering',
    promptPhrase: 'Soft loop lighting, flattering'
  },
  rim: {
    keyPosition: 'behind subject',
    shadow: 'glowing outline',
    mood: 'separation, drama',
    promptPhrase: 'Strong rim light, edge separation'
  },
  broad: {
    keyPosition: 'lit side toward camera',
    shadow: 'shadow away',
    mood: 'wider appearance',
    promptPhrase: 'Broad lighting, open'
  },
  short: {
    keyPosition: 'shadow side toward camera',
    shadow: 'shadow toward camera',
    mood: 'slimming, moody',
    promptPhrase: 'Short lighting, sculptural'
  }
};

// ============================================================================
// LIGHTING RATIOS
// ============================================================================

export const LIGHTING_RATIOS: Record<string, {
  contrast: string;
  useCase: string;
  promptAddition: string;
}> = {
  '2:1': {
    contrast: 'low, subtle',
    useCase: 'beauty, commercial, explainer',
    promptAddition: 'soft 2:1 lighting ratio'
  },
  '4:1': {
    contrast: 'moderate',
    useCase: 'standard drama, dialogue',
    promptAddition: 'cinematic 4:1 contrast'
  },
  '8:1': {
    contrast: 'high',
    useCase: 'thriller, noir, tension',
    promptAddition: 'dramatic 8:1 deep shadows'
  },
  '16:1': {
    contrast: 'extreme',
    useCase: 'horror, extreme drama',
    promptAddition: 'chiaroscuro extreme contrast'
  }
};

// ============================================================================
// COLOR TEMPERATURE (KELVIN)
// ============================================================================

export const COLOR_TEMPERATURES: Record<string, {
  kelvin: number;
  character: string;
  promptPhrase: string;
}> = {
  candlelight: { kelvin: 1900, character: 'deep warm orange', promptPhrase: 'candlelit 1900K warm glow' },
  tungsten_bulb: { kelvin: 2700, character: 'warm amber', promptPhrase: 'tungsten 2700K amber' },
  tungsten_film: { kelvin: 3200, character: 'classic warm', promptPhrase: 'tungsten 3200K warm interior' },
  golden_hour: { kelvin: 3500, character: 'magic gold', promptPhrase: 'golden hour 3500K' },
  midday_sun: { kelvin: 5600, character: 'neutral white', promptPhrase: 'daylight 5600K neutral' },
  overcast: { kelvin: 6500, character: 'cool soft', promptPhrase: 'overcast 6500K diffused' },
  shade: { kelvin: 7500, character: 'cool blue', promptPhrase: 'open shade 7500K cool' },
  blue_hour: { kelvin: 9000, character: 'twilight blue', promptPhrase: 'blue hour 9000K mystery' }
};

// ============================================================================
// CAMERA & LENS REFERENCE
// ============================================================================

export const SHOT_TYPES: Record<string, {
  frame: string;
  lens: string;
  purpose: string;
  promptPhrase: string;
}> = {
  ECU: { frame: 'eyes/detail only', lens: '100mm macro', purpose: 'intense emotion, detail', promptPhrase: 'ECU 100mm macro, intense detail' },
  CU: { frame: 'face fills frame', lens: '85mm f/1.8', purpose: 'strong emotion', promptPhrase: 'close-up 85mm f/1.8 shallow DOF' },
  MCU: { frame: 'head + shoulders', lens: '50-85mm', purpose: 'dialogue, connection', promptPhrase: 'medium close-up 50mm' },
  MS: { frame: 'waist up', lens: '50mm', purpose: 'standard coverage', promptPhrase: 'medium shot 50mm waist up' },
  MWS: { frame: 'knees up', lens: '35mm', purpose: 'cowboy/action', promptPhrase: 'cowboy shot 35mm knees up' },
  WS: { frame: 'full body + env', lens: '24-35mm', purpose: 'context', promptPhrase: 'wide shot 35mm full body' },
  EWS: { frame: 'landscape dominant', lens: '14-18mm', purpose: 'epic scale', promptPhrase: 'extreme wide 18mm vast scale' }
};

export const CAMERA_ANGLES: Record<string, {
  setup: string;
  psychology: string;
  promptPhrase: string;
}> = {
  eye_level: { setup: 'at subject eye height', psychology: 'neutral, equal', promptPhrase: 'eye-level neutral' },
  low_angle: { setup: 'below eye, up', psychology: 'powerful, heroic', promptPhrase: 'low angle heroic' },
  high_angle: { setup: 'above, down', psychology: 'vulnerable, weak', promptPhrase: 'high angle vulnerable' },
  dutch: { setup: '15-45 degree roll tilt', psychology: 'unease, tension', promptPhrase: 'Dutch angle 25 degree tension' },
  birds_eye: { setup: 'directly overhead', psychology: 'omniscient', promptPhrase: 'bird\'s eye overhead' },
  worms_eye: { setup: 'ground level up', psychology: 'maximum power', promptPhrase: 'worm\'s eye towering' }
};

// ============================================================================
// FILM STOCKS
// ============================================================================

export const FILM_STOCKS: Record<string, {
  iso: number;
  balance: string;
  character: string;
  promptPhrase: string;
}> = {
  kodak_vision3_500t: { iso: 500, balance: '3200K Tungsten', character: 'Hollywood standard, fine grain', promptPhrase: 'Kodak Vision3 500T tungsten' },
  kodak_vision3_250d: { iso: 250, balance: '5500K Daylight', character: 'crisp, accurate', promptPhrase: 'Kodak 250D daylight crisp' },
  kodak_portra_400: { iso: 400, balance: 'Daylight', character: 'warm skin, portrait', promptPhrase: 'Portra 400 warm skin tones' },
  kodak_portra_800: { iso: 800, balance: 'Daylight', character: 'versatile, more grain', promptPhrase: 'Portra 800 natural warmth' },
  cinestill_800t: { iso: 800, balance: '3200K Tungsten', character: 'halation glow, neon', promptPhrase: 'CineStill 800T halation neon' },
  kodak_trix_400: { iso: 400, balance: 'B&W', character: 'high contrast, grain', promptPhrase: 'Tri-X black and white contrasty' },
  kodak_ektar_100: { iso: 100, balance: 'Daylight', character: 'saturated, vivid', promptPhrase: 'Ektar saturated vivid colors' },
  fujifilm_velvia: { iso: 50, balance: 'Daylight', character: 'extreme saturation', promptPhrase: 'Velvia hyper-saturated' }
};

// ============================================================================
// ATMOSPHERIC ELEMENTS
// ============================================================================

export const ATMOSPHERE_TYPES: Record<string, {
  particle: string;
  effect: string;
  promptPhrase: string;
}> = {
  haze: { particle: 'very fine', effect: 'light rays, depth', promptPhrase: 'atmospheric haze volumetric rays' },
  fog: { particle: 'large', effect: 'thick, mysterious', promptPhrase: 'thick fog mysterious' },
  ground_fog: { particle: 'heavy, low', effect: 'floor mist', promptPhrase: 'ground fog low mist' },
  dust: { particle: 'variable', effect: 'golden particles', promptPhrase: 'dust particles in sunbeams' },
  smoke: { particle: 'variable', effect: 'noir, dramatic', promptPhrase: 'wispy smoke noir atmosphere' },
  rain: { particle: 'water', effect: 'wet, moody', promptPhrase: 'rain backlit streaking' },
  snow: { particle: 'flakes', effect: 'cold, soft', promptPhrase: 'falling snow soft diffused' },
  clean: { particle: 'none', effect: 'crisp, clear', promptPhrase: 'clean atmosphere, crystal clear' }
};

// ============================================================================
// MOOD TO COMPLETE SETUP (Quick Lookup)
// ============================================================================

export const MOOD_SETUPS: Record<string, {
  lighting: string;
  color: string;
  atmosphere: string;
  camera: string;
}> = {
  dramatic_authority: {
    lighting: 'Rembrandt 4:1, 3200K',
    color: 'Vision3 500T, muted',
    atmosphere: 'light haze',
    camera: '85mm, eye-level'
  },
  tense_thriller: {
    lighting: 'Split 8:1, cool 5600K',
    color: 'bleach bypass',
    atmosphere: 'heavy haze',
    camera: '35mm, Dutch'
  },
  warm_inspiring: {
    lighting: 'Loop 2:1, 3500K golden',
    color: 'Portra 400, warm',
    atmosphere: 'clean',
    camera: '50mm, slight low'
  },
  mystery_intrigue: {
    lighting: 'Low-key 8:1, cool',
    color: 'desaturated teal',
    atmosphere: 'fog',
    camera: '35mm, shadows'
  },
  epic_reveal: {
    lighting: 'Rim + volumetric',
    color: 'teal orange',
    atmosphere: 'dust, god rays',
    camera: '24mm, crane'
  },
  intimate_dialogue: {
    lighting: 'Soft 4:1, warm practical',
    color: 'Portra, natural',
    atmosphere: 'clean',
    camera: '85mm, eye-level'
  },
  urban_noir: {
    lighting: 'Hard 8:1, mixed temp',
    color: 'CineStill 800T',
    atmosphere: 'rain, wet streets',
    camera: '35mm, low'
  },
  tech_modern: {
    lighting: 'Clean 2:1, 5600K',
    color: 'neutral, slight teal',
    atmosphere: 'clean, screen glow',
    camera: '50mm, straight'
  }
};

// ============================================================================
// CONTENT TYPE DEFAULTS
// ============================================================================

export const CONTENT_TYPE_DEFAULTS: Record<string, {
  shot: string;
  lens: string;
  lighting: string;
  atmosphere: string;
}> = {
  hook: { shot: 'CU or MCU', lens: '85mm', lighting: 'Rembrandt 4:1', atmosphere: 'light haze' },
  explanation: { shot: 'MCU or MS', lens: '50mm', lighting: 'Loop 2:1', atmosphere: 'clean' },
  demo: { shot: 'MS or MWS', lens: '35mm', lighting: 'Soft 2:1', atmosphere: 'clean' },
  testimonial: { shot: 'MCU', lens: '85mm', lighting: 'Butterfly 2:1', atmosphere: 'clean' },
  cta: { shot: 'CU', lens: '85mm', lighting: 'Rembrandt 4:1', atmosphere: 'light haze' },
  broll_product: { shot: 'various', lens: '50-100mm', lighting: 'soft commercial', atmosphere: 'clean' },
  broll_environment: { shot: 'WS/EWS', lens: '24-35mm', lighting: 'natural', atmosphere: 'atmospheric' },
  thumbnail: { shot: 'tight CU', lens: '85mm f/1.8', lighting: 'Rembrandt 4:1 to 6:1', atmosphere: 'light haze' }
};

// ============================================================================
// TOPIC TO COSTUME MAPPING
// ============================================================================

export const TOPIC_COSTUME_MAP: Record<string, string> = {
  // Health & Medical
  medical: 'white doctor coat with stethoscope around neck',
  health: 'white doctor coat with stethoscope around neck',
  doctor: 'white doctor coat with stethoscope around neck',
  hospital: 'medical scrubs in teal',
  nurse: 'nursing uniform',
  pharmacy: 'white pharmacist coat',
  
  // Technology
  tech: 'dark tech hoodie, casual smart',
  startup: 'dark hoodie with company logo tee underneath',
  coding: 'comfortable hoodie, developer style',
  programming: 'casual tech wear, hoodie',
  software: 'smart casual tech attire',
  ai: 'modern minimalist tech wear',
  crypto: 'modern tech casual, sleek',
  
  // Business & Finance
  business: 'navy blazer over white open-collar shirt',
  finance: 'formal suit with tie',
  investment: 'professional suit, power tie',
  banking: 'formal business suit',
  corporate: 'executive suit attire',
  entrepreneur: 'smart casual blazer',
  
  // Food & Cooking
  cooking: 'white chef apron over casual clothes',
  food: 'chef apron, kitchen attire',
  restaurant: 'professional chef uniform',
  baking: 'baker apron with flour dusting',
  recipe: 'home cook apron, casual',
  
  // Agriculture & Farming
  farming: 'farmer outfit with straw hat',
  agriculture: 'farm work clothes, boots',
  gardening: 'gardener apron, gloves',
  plants: 'casual outdoor gardening wear',
  
  // Fitness & Sports
  fitness: 'athletic wear, gym clothes',
  gym: 'fitted workout attire',
  sports: 'sports jersey or athletic wear',
  yoga: 'yoga attire, comfortable',
  running: 'running gear, athletic',
  
  // Education
  education: 'smart casual with glasses',
  teaching: 'professional teacher attire',
  school: 'academic casual wear',
  university: 'professorial smart casual',
  
  // Fashion & Beauty
  fashion: 'trendy stylish outfit, on-trend',
  beauty: 'elegant fashionable attire',
  makeup: 'glamorous stylish outfit',
  style: 'fashion-forward ensemble',
  
  // Travel & Lifestyle
  travel: 'casual travel wear, light jacket',
  adventure: 'outdoor adventure gear',
  lifestyle: 'casual chic everyday wear',
  
  // Gaming & Entertainment
  gaming: 'gaming headset, casual hoodie',
  esports: 'esports jersey, gamer style',
  entertainment: 'casual trendy outfit',
  
  // Music & Arts
  music: 'artist attire, creative accessories',
  art: 'artistic creative wear',
  creative: 'unique artistic outfit',
  
  // Default
  default: 'smart casual professional attire'
};

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

export const IMAGE_PROMPT_TEMPLATES = {
  creator: `[DALL-E 3 - CREATOR SHOT]

A photorealistic cinematic {shot_type} of {character_description}.

Expression: {expression}
Pose/Action: {pose_action}
Wardrobe: {costume}

Camera: {shot_size}, {lens} f/{aperture}, {angle}
Composition: {composition}

Lighting: {lighting_pattern} lighting, {lighting_ratio} ratio, {color_temp}K
Key from {key_direction}, {light_quality} quality.

Color: {film_stock}, {color_grade}
Atmosphere: {atmosphere}

Environment: {environment}
Background: {background}

Style: Shot on {camera_film}, cinematic photorealistic, natural skin texture, Hollywood production value.

Technical: {orientation} orientation ({resolution}), HD quality.
Clean frame, sharp focus, no text overlays, no watermarks.`,

  broll: `[DALL-E 3 - B-ROLL SHOT]

A photorealistic cinematic {shot_type} of {subject_description}.
{topic_visual_description}

Camera: {shot_size}, {lens} f/{aperture}, {angle}
Composition: {composition}

Lighting: {lighting_setup}, {color_temp}K
Atmosphere: {atmosphere}

Color: {film_stock}, {color_grade}
Environment: {environment}

Style: Cinematic, Hollywood production value.

Technical: {orientation} orientation ({resolution}), HD quality.
Clean frame, no text, no watermarks, no human faces.`,

  thumbnail: `[DALL-E 3 - THUMBNAIL]

A photorealistic cinematic thumbnail composition:

PRIMARY SUBJECT (50-60% of frame):
{character_description}

Expression: {exaggerated_expression} - wide eyes, raised brows, {mouth_position}, energy that creates curiosity gap.
Position: Face positioned {face_position}, {face_angle}.

SECONDARY ELEMENT:
{topic_visual} - {topic_description}
Visual relationship: {spatial_relationship}

Camera: Tight close-up with topic visible
Lens: 85mm f/1.8
Angle: Eye-level, slight dutch tilt (5-10 degrees) for dynamic energy

Lighting: High-contrast dramatic (Rembrandt or Split), 4:1 to 6:1 ratio
Temperature: Warm face (3200K) / cool topic element contrast

Color: HIGH SATURATION, boosted contrast, vibrant teal-orange grade
Film: Kodak Vision3 500T

Composition: Creator dominant {dominant_side}, topic element opposite side
TEXT ZONES: Reserve {text_zone} for title overlay - keep clear

Technical: Portrait orientation (1024x1792), HD quality, vivid style.
Clean, no text rendered, no watermarks.`
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get costume based on topic
 */
export function getCostumeForTopic(topic: string): string {
  const topicLower = topic.toLowerCase();
  
  // Check for exact match first
  if (TOPIC_COSTUME_MAP[topicLower]) {
    return TOPIC_COSTUME_MAP[topicLower];
  }
  
  // Check for partial match
  for (const [key, costume] of Object.entries(TOPIC_COSTUME_MAP)) {
    if (topicLower.includes(key) || key.includes(topicLower)) {
      return costume;
    }
  }
  
  return TOPIC_COSTUME_MAP.default;
}

/**
 * Get emotion mapping
 */
export function getEmotionMapping(emotion: string): {
  facial: string;
  body: string;
  lighting: string;
} {
  const emotionLower = emotion.toLowerCase();
  return EMOTION_EXPRESSION_MAP[emotionLower] || EMOTION_EXPRESSION_MAP.authority;
}

/**
 * Get lighting setup for mood
 */
export function getLightingForMood(mood: string): {
  lighting: string;
  color: string;
  atmosphere: string;
  camera: string;
} {
  const moodKey = mood.toLowerCase().replace(/\s+/g, '_');
  return MOOD_SETUPS[moodKey] || MOOD_SETUPS.dramatic_authority;
}

/**
 * Get content type defaults
 */
export function getContentTypeDefaults(contentType: string): {
  shot: string;
  lens: string;
  lighting: string;
  atmosphere: string;
} {
  const typeKey = contentType.toLowerCase().replace(/\s+/g, '_');
  return CONTENT_TYPE_DEFAULTS[typeKey] || CONTENT_TYPE_DEFAULTS.hook;
}

/**
 * Build complete CINEMATIC image prompt for creator shot
 * Uses FULL knowledge tables for Hollywood-grade output
 */
export function buildCreatorPrompt(params: {
  characterDescription: string;
  emotion: string;
  topic: string;
  shotType?: string;
  aspectRatio?: '9:16' | '16:9';
  segmentType?: string; // HOOK, CTA, etc.
}): string {
  const {
    characterDescription,
    emotion,
    topic,
    shotType = 'CU',
    aspectRatio = '9:16',
    segmentType = 'HOOK'
  } = params;
  
  const emotionMap = getEmotionMapping(emotion);
  const costume = getCostumeForTopic(topic);
  const shotInfo = SHOT_TYPES[shotType] || SHOT_TYPES.CU;
  const resolution = aspectRatio === '9:16' ? '1024x1792' : '1792x1024';
  const orientation = aspectRatio === '9:16' ? 'Portrait' : 'Landscape';
  
  // ========================================================================
  // CINEMATIC ENHANCEMENT - Select film stock & color grade based on emotion
  // ========================================================================
  const filmStockMap: Record<string, { stock: string; grade: string }> = {
    shock: { stock: 'Kodak Vision3 500T tungsten', grade: 'high contrast, desaturated, bleach bypass look' },
    intrigue: { stock: 'CineStill 800T halation', grade: 'moody teal shadows, warm highlights' },
    curiosity: { stock: 'Kodak Portra 400 warm skin tones', grade: 'natural warmth, lifted shadows' },
    tension: { stock: 'Kodak Vision3 500T', grade: 'bleach bypass, crushed blacks, cold midtones' },
    awe: { stock: 'Kodak Portra 400', grade: 'golden hour warmth, soft contrast' },
    authority: { stock: 'Kodak Vision3 500T tungsten', grade: 'rich cinematic, teal-orange complementary' },
    excitement: { stock: 'Kodak Ektar vivid saturated', grade: 'punchy contrast, vibrant colors' },
    determination: { stock: 'Kodak Vision3 500T', grade: 'strong contrast, desaturated, powerful' },
    hope: { stock: 'Kodak Portra 400', grade: 'warm golden tones, soft lifted blacks' },
    urgency: { stock: 'CineStill 800T', grade: 'high contrast, cool shadows, warm highlights' }
  };
  const emotionKey = (emotion || 'authority').toLowerCase();
  const filmChoice = filmStockMap[emotionKey] || filmStockMap.authority;
  
  // ========================================================================
  // LIGHTING ENHANCEMENT - Detailed setup based on emotion
  // ========================================================================
  const lightingSetupMap: Record<string, string> = {
    shock: 'Hard Rembrandt lighting from camera-left at 45°, 8:1 contrast ratio, minimal fill, deep shadows carving the face',
    intrigue: 'Low-key lighting, single strong rim light from behind, mysterious shadows obscuring half the face',
    curiosity: 'Soft butterfly lighting from above with gentle fill, 4:1 ratio, catchlights in eyes, inviting warmth',
    tension: 'Split lighting from hard side source, half face in complete shadow, 8:1 ratio, chiaroscuro drama',
    awe: 'Rim lighting with volumetric rays from behind, soft key fill, ethereal glow, 3:1 gentle contrast',
    authority: 'Classic Rembrandt from 45° camera-left, defined triangle shadow on cheek, 4:1 ratio, professional warmth 3200K',
    excitement: 'High-key vibrant lighting, strong key with bounced fill, energetic catchlights, 2:1 open ratio',
    determination: 'Low angle key light emphasizing jaw, minimal fill, heroic shadows, 6:1 dramatic ratio',
    hope: 'Soft golden hour wrap-around light, warm practical glow, gentle 3:1 ratio, lifted shadows',
    urgency: 'Hard dramatic key with cool rim separation, 6:1 contrast, tension in shadows'
  };
  const lightingSetup = lightingSetupMap[emotionKey] || lightingSetupMap.authority;
  
  // ========================================================================
  // ATMOSPHERE ENHANCEMENT - Based on segment type and emotion
  // ========================================================================
  const atmosphereMap: Record<string, string> = {
    shock: 'heavy atmospheric haze catching harsh light beams, dust particles suspended in air',
    intrigue: 'thick mysterious fog rolling at floor level, volumetric light shafts',
    curiosity: 'subtle golden dust particles floating in warm light, clean background',
    tension: 'smoky noir atmosphere, hard light cutting through haze, oppressive mood',
    awe: 'ethereal volumetric god rays streaming through, magical floating particles',
    authority: 'professional studio atmosphere with subtle haze for depth, clean production',
    excitement: 'dynamic energy, slight motion blur suggestion, vibrant clean air',
    determination: 'subtle smoke wisps, dramatic atmosphere, powerful presence',
    hope: 'warm golden hour particles, soft diffused atmosphere, uplifting glow',
    urgency: 'atmospheric tension, slight haze, dramatic shadows'
  };
  const atmosphere = atmosphereMap[emotionKey] || atmosphereMap.authority;
  
  // ========================================================================
  // COMPOSITION ENHANCEMENT
  // ========================================================================
  const compositionMap: Record<string, string> = {
    HOOK: 'Subject positioned using golden ratio, slightly off-center left, negative space right for visual breathing room, direct eye contact with lens',
    CTA: 'Centered composition for intimacy, close framing, direct engagement with viewer, warm inviting space',
    ENDING_CTA: 'Centered composition for intimacy, close framing, direct engagement with viewer, warm inviting space',
    'LOOP-END': 'Match exact HOOK composition for seamless loop, identical framing and positioning'
  };
  const segmentKey = (segmentType || 'HOOK').toUpperCase();
  const composition = compositionMap[segmentKey] || compositionMap.HOOK;
  
  return `[DALL-E 3 — CINEMATIC CREATOR SHOT]

A stunning photorealistic cinematic ${shotInfo.promptPhrase} of ${characterDescription}.

══════════════════════════════════════════════════════════════
PERFORMANCE DIRECTION
══════════════════════════════════════════════════════════════
Facial Expression: ${emotionMap.facial}
Body Language: ${emotionMap.body}
Energy: ${emotionKey.charAt(0).toUpperCase() + emotionKey.slice(1)} - commanding presence
Eye Contact: Direct to camera lens, piercing connection with viewer

══════════════════════════════════════════════════════════════
WARDROBE & STYLING
══════════════════════════════════════════════════════════════
Costume: ${costume}
Grooming: Impeccable, camera-ready, professional finish
Accessories: Contextually appropriate for ${topic}

══════════════════════════════════════════════════════════════
CINEMATOGRAPHY
══════════════════════════════════════════════════════════════
Shot Type: ${shotInfo.frame}
Lens: ${shotInfo.lens}, creating beautiful bokeh separation
Camera Angle: Eye-level for equal engagement, slight hero angle
Composition: ${composition}
Depth of Field: Shallow, subject razor-sharp, background creamy blur

══════════════════════════════════════════════════════════════
LIGHTING DESIGN
══════════════════════════════════════════════════════════════
${lightingSetup}
Color Temperature: 3200K warm tungsten key, balanced fill
Catchlights: Visible in both eyes, positioned at 10 o'clock
Skin Rendering: Natural texture with visible pores, not plastic

══════════════════════════════════════════════════════════════
COLOR SCIENCE
══════════════════════════════════════════════════════════════
Film Stock: ${filmChoice.stock}
Color Grade: ${filmChoice.grade}
Skin Tones: True-to-life, warm undertones, healthy glow
Contrast: Cinematic S-curve, rich blacks, clean highlights

══════════════════════════════════════════════════════════════
ATMOSPHERE & ENVIRONMENT
══════════════════════════════════════════════════════════════
${atmosphere}
Background: Professional studio with deep bokeh, contextual to ${topic}
Production Value: Hollywood A-list quality, premium finish

══════════════════════════════════════════════════════════════
TECHNICAL SPECIFICATIONS
══════════════════════════════════════════════════════════════
Camera: ARRI Alexa 65, anamorphic characteristics
Format: ${orientation} ${resolution}
Quality: HD, crystal-clear sharp focus on subject
Frame: Clean, no text overlays, no watermarks, no distractions

DELIVER: A frame worthy of a Hollywood movie poster.`;
}

/**
 * Build complete CINEMATIC B-roll image prompt
 * Uses FULL knowledge tables for Hollywood-grade visual storytelling
 */
export function buildBrollPrompt(params: {
  visualDirection: string;
  topic: string;
  emotion?: string;
  shotType?: string;
  aspectRatio?: '9:16' | '16:9';
  segmentType?: string; // BODY, FORE, PEAK, etc.
}): string {
  const {
    visualDirection,
    topic,
    emotion = 'authority',
    shotType = 'MS',
    aspectRatio = '9:16',
    segmentType = 'BODY'
  } = params;
  
  const shotInfo = SHOT_TYPES[shotType] || SHOT_TYPES.MS;
  const resolution = aspectRatio === '9:16' ? '1024x1792' : '1792x1024';
  const orientation = aspectRatio === '9:16' ? 'Portrait' : 'Landscape';
  
  // ========================================================================
  // CINEMATIC B-ROLL ENHANCEMENT - Based on emotion/mood
  // ========================================================================
  const brollMoodMap: Record<string, {
    filmStock: string;
    colorGrade: string;
    lighting: string;
    atmosphere: string;
    visualStyle: string;
  }> = {
    shock: {
      filmStock: 'Kodak Vision3 500T',
      colorGrade: 'high contrast, desaturated, cold teal shadows with harsh highlights',
      lighting: 'Hard dramatic side lighting, deep shadows, 8:1 contrast ratio, stark pools of light',
      atmosphere: 'Heavy atmospheric haze with dust particles catching harsh light beams',
      visualStyle: 'Jarring visual impact, uncomfortable beauty, tension in every element'
    },
    intrigue: {
      filmStock: 'CineStill 800T halation glow',
      colorGrade: 'moody teal-cyan shadows, warm amber highlights, mysterious color separation',
      lighting: 'Low-key noir lighting, single source creating long shadows, 6:1 mysterious contrast',
      atmosphere: 'Thick fog rolling through scene, volumetric light shafts piercing darkness',
      visualStyle: 'Mysterious and alluring, hidden details in shadows, visual secrets'
    },
    curiosity: {
      filmStock: 'Kodak Portra 400 natural warmth',
      colorGrade: 'warm inviting tones, lifted shadows, natural color science',
      lighting: 'Soft diffused key light, gentle wrap-around fill, 3:1 inviting ratio',
      atmosphere: 'Golden dust particles floating in warm light, clean inviting space',
      visualStyle: 'Welcoming and engaging, draws viewer in, discovery feeling'
    },
    tension: {
      filmStock: 'Kodak Vision3 500T bleach bypass',
      colorGrade: 'crushed blacks, desaturated midtones, cold clinical feel',
      lighting: 'Split lighting with hard edges, chiaroscuro drama, 8:1+ extreme contrast',
      atmosphere: 'Smoky noir atmosphere, oppressive shadows, claustrophobic feeling',
      visualStyle: 'Uncomfortable pressure, visual weight, impending confrontation'
    },
    awe: {
      filmStock: 'Kodak Portra 400 with golden warmth',
      colorGrade: 'ethereal golden tones, soft lifted blacks, heavenly glow',
      lighting: 'Rim lighting with volumetric god rays, soft ethereal fill, magical 3:1',
      atmosphere: 'Ethereal volumetric rays streaming through, magical floating particles',
      visualStyle: 'Breathtaking wonder, scale and majesty, transcendent beauty'
    },
    authority: {
      filmStock: 'Kodak Vision3 500T tungsten',
      colorGrade: 'rich cinematic teal-orange complementary, confident color palette',
      lighting: 'Professional Rembrandt setup, defined shadows, 4:1 authoritative contrast',
      atmosphere: 'Clean professional atmosphere with subtle depth haze',
      visualStyle: 'Commanding presence, premium production, confident visual statement'
    },
    excitement: {
      filmStock: 'Kodak Ektar 100 vivid saturation',
      colorGrade: 'punchy vibrant colors, dynamic contrast, energetic palette',
      lighting: 'High-key energetic lighting, multiple sources, 2:1 open vibrant ratio',
      atmosphere: 'Clean dynamic air, sense of motion and energy',
      visualStyle: 'Dynamic and alive, visual excitement, celebration of subject'
    },
    resolution: {
      filmStock: 'Kodak Portra 400 balanced',
      colorGrade: 'satisfying warm tones, resolved contrast, complete feeling',
      lighting: 'Balanced 3-point lighting, warm key, gentle fill, 3:1 satisfying ratio',
      atmosphere: 'Clear resolved atmosphere, sense of completion',
      visualStyle: 'Conclusive and satisfying, visual resolution, answered questions'
    },
    hope: {
      filmStock: 'Kodak Portra 400 golden warmth',
      colorGrade: 'warm golden hour tones, soft lifted blacks, optimistic glow',
      lighting: 'Golden hour wrap-around warmth, soft diffused glow, 3:1 uplifting ratio',
      atmosphere: 'Warm golden particles, soft diffused light, uplifting feeling',
      visualStyle: 'Optimistic and uplifting, new beginnings, visual promise'
    },
    urgency: {
      filmStock: 'CineStill 800T high contrast',
      colorGrade: 'high contrast, cool shadows with warm urgent highlights',
      lighting: 'Hard dramatic key, cool rim separation, 6:1 urgent contrast',
      atmosphere: 'Tense atmospheric haze, dynamic light quality',
      visualStyle: 'Pressing importance, visual urgency, immediate attention'
    }
  };
  const emotionKey = (emotion || 'authority').toLowerCase();
  const moodSetup = brollMoodMap[emotionKey] || brollMoodMap.authority;
  
  // ========================================================================
  // SEGMENT-SPECIFIC VISUAL APPROACH
  // ========================================================================
  const segmentApproachMap: Record<string, string> = {
    FORE: 'FORESHADOWING: Teasing visual that hints without revealing. Create anticipation through partial views, silhouettes, or mysterious angles. The viewer should sense something important is coming.',
    FORESHADOW: 'FORESHADOWING: Teasing visual that hints without revealing. Create anticipation through partial views, silhouettes, or mysterious angles. The viewer should sense something important is coming.',
    BODY: 'SUPPORTING VISUAL: Strong visual storytelling that illustrates the concept. Clear, impactful imagery that reinforces the narrative without distraction.',
    'BODY-1': 'FIRST KEY POINT: Visual evidence for the first main argument. Concrete, tangible imagery that proves the point being made.',
    'BODY-2': 'SECOND KEY POINT: Visual continuation that builds on previous. Complementary imagery that advances the story.',
    'BODY-3': 'THIRD KEY POINT: Visual escalation toward climax. Increasing intensity and importance in the imagery.',
    PEAK: 'CLIMACTIC REVEAL: Maximum visual impact moment. This is the most striking, memorable frame. Hero shot that demands attention.',
    TWIST: 'REVELATION MOMENT: The visual that changes everything. Surprising angle or unexpected element that reframes understanding.',
    ENDING: 'RESOLUTION VISUAL: Satisfying conclusion imagery. Complete, resolved feeling that provides closure.'
  };
  const segmentKey = (segmentType || 'BODY').toUpperCase();
  const segmentApproach = segmentApproachMap[segmentKey] || segmentApproachMap.BODY;
  
  return `[DALL-E 3 — CINEMATIC B-ROLL]

${segmentApproach}

══════════════════════════════════════════════════════════════
VISUAL SUBJECT
══════════════════════════════════════════════════════════════
A stunning photorealistic cinematic ${shotInfo.promptPhrase} of:
${visualDirection}

Topic Context: ${topic}
Visual Mood: ${emotionKey.charAt(0).toUpperCase() + emotionKey.slice(1)}

══════════════════════════════════════════════════════════════
CINEMATOGRAPHY
══════════════════════════════════════════════════════════════
Shot Type: ${shotInfo.frame}
Lens: ${shotInfo.lens}, creating cinematic depth
Camera Angle: Dramatic angle that enhances the subject's importance
Composition: Rule of thirds with strong visual weight, leading lines to subject
Depth of Field: Selective focus drawing eye to key element

══════════════════════════════════════════════════════════════
LIGHTING DESIGN
══════════════════════════════════════════════════════════════
${moodSetup.lighting}
Light Quality: Motivated, cinematic, purposeful shadows
Specular Highlights: Controlled, adding dimension and texture

══════════════════════════════════════════════════════════════
COLOR SCIENCE
══════════════════════════════════════════════════════════════
Film Stock: ${moodSetup.filmStock}
Color Grade: ${moodSetup.colorGrade}
Contrast: Cinematic S-curve, rich shadows, controlled highlights
Color Harmony: Intentional palette supporting the ${emotionKey} mood

══════════════════════════════════════════════════════════════
ATMOSPHERE & ENVIRONMENT
══════════════════════════════════════════════════════════════
${moodSetup.atmosphere}
Environmental Context: ${topic}-relevant setting with production design
Production Value: Hollywood blockbuster quality, premium finish

══════════════════════════════════════════════════════════════
VISUAL STYLE DIRECTIVE
══════════════════════════════════════════════════════════════
${moodSetup.visualStyle}

══════════════════════════════════════════════════════════════
TECHNICAL SPECIFICATIONS
══════════════════════════════════════════════════════════════
Camera: ARRI Alexa 65 or RED V-Raptor, cinema-grade
Format: ${orientation} ${resolution}
Quality: HD, tack-sharp where intended, beautiful bokeh elsewhere
Frame: Clean, uninhabited by humans, pure visual storytelling

CRITICAL: NO HUMAN FACES OR PEOPLE. Pure object/concept/environment visualization.

DELIVER: A frame that could be a movie still or museum-quality photograph.`;
}

/**
 * Build thumbnail prompt
 */
export function buildThumbnailPrompt(params: {
  characterDescription: string;
  emotion: string;
  topic: string;
  topicVisual: string;
}): string {
  const {
    characterDescription,
    emotion,
    topic,
    topicVisual
  } = params;
  
  const emotionMap = getEmotionMapping(emotion);
  
  return `A photorealistic cinematic thumbnail composition:

PRIMARY SUBJECT (50-60% of frame):
${characterDescription}

Expression: EXAGGERATED ${emotionMap.facial}, intense energy that creates curiosity gap.
Position: Face positioned left side, angled toward camera.

SECONDARY ELEMENT:
${topicVisual} related to ${topic}
Visual relationship: topic element on right side, creating visual contrast

Camera: Tight close-up with topic visible
Lens: 85mm f/1.8
Angle: Eye-level, slight dutch tilt (5-10 degrees) for dynamic energy

Lighting: High-contrast dramatic Rembrandt, 4:1 to 6:1 ratio
Temperature: Warm face (3200K) / cool topic element contrast

Color: HIGH SATURATION, boosted contrast, vibrant teal-orange grade
Film: Kodak Vision3 500T

Composition: Creator dominant left, topic element right
TEXT ZONES: Reserve top and bottom areas for title overlay - keep clear

Technical: Portrait orientation (1024x1792), HD quality, vivid style.
Clean, no text rendered, no watermarks.`;
}
