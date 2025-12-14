/**
 * CINEMATIC IMAGE KNOWLEDGE BASE
 * Static knowledge for image generation - NO DATABASE QUERIES NEEDED
 * 
 * This file contains all the knowledge required for generating cinematic images:
 * - Project Instruction (output format, rules, templates)
 * - Technical Reference (emotion mapping, lighting, camera, film stocks)
 * - DALL-E 3 Platform Specs (API details, best practices)
 * 
 * Source Files:
 * - Image_Project_Instruction.md
 * - Cinematic_Image_Technical_Reference.md
 * - DALL-E_3_Cinematic_Production_Knowledge_File.md
 * 
 * Last Updated: 2025-12-13
 */

// ============================================================================
// DALL-E 3 TECHNICAL SPECS
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
 * Build complete image prompt for creator shot
 */
export function buildCreatorPrompt(params: {
  characterDescription: string;
  emotion: string;
  topic: string;
  shotType?: string;
  aspectRatio?: '9:16' | '16:9';
}): string {
  const {
    characterDescription,
    emotion,
    topic,
    shotType = 'MCU',
    aspectRatio = '9:16'
  } = params;
  
  const emotionMap = getEmotionMapping(emotion);
  const costume = getCostumeForTopic(topic);
  const shotInfo = SHOT_TYPES[shotType] || SHOT_TYPES.MCU;
  const resolution = aspectRatio === '9:16' ? '1024x1792' : '1792x1024';
  const orientation = aspectRatio === '9:16' ? 'Portrait' : 'Landscape';
  
  return `A photorealistic cinematic ${shotInfo.promptPhrase} of ${characterDescription}.

Expression: ${emotionMap.facial}
Body language: ${emotionMap.body}
Wardrobe: ${costume}

Camera: ${shotInfo.frame}, ${shotInfo.lens}, eye-level
Composition: rule of thirds, subject slightly off-center

Lighting: ${emotionMap.lighting}
Color: Kodak Vision3 500T, cinematic grade
Atmosphere: light atmospheric haze

Style: Shot on ARRI Alexa, cinematic photorealistic, natural skin texture, Hollywood production value.

Technical: ${orientation} orientation (${resolution}), HD quality.
Clean frame, sharp focus, no text overlays, no watermarks.`;
}

/**
 * Build complete image prompt for B-roll shot
 */
export function buildBrollPrompt(params: {
  visualDirection: string;
  topic: string;
  emotion?: string;
  shotType?: string;
  aspectRatio?: '9:16' | '16:9';
}): string {
  const {
    visualDirection,
    topic,
    emotion = 'neutral',
    shotType = 'MS',
    aspectRatio = '9:16'
  } = params;
  
  const emotionMap = getEmotionMapping(emotion);
  const shotInfo = SHOT_TYPES[shotType] || SHOT_TYPES.MS;
  const resolution = aspectRatio === '9:16' ? '1024x1792' : '1792x1024';
  const orientation = aspectRatio === '9:16' ? 'Portrait' : 'Landscape';
  
  return `A photorealistic cinematic ${shotInfo.promptPhrase} of ${visualDirection}.
Topic context: ${topic}

Camera: ${shotInfo.frame}, ${shotInfo.lens}, eye-level
Composition: rule of thirds, balanced frame

Lighting: ${emotionMap.lighting}
Color: Kodak Vision3 500T, cinematic grade
Atmosphere: atmospheric depth

Style: Cinematic, Hollywood production value, professional photography.

Technical: ${orientation} orientation (${resolution}), HD quality.
Clean frame, sharp focus, pure product/concept visualization.

IMPORTANT - VISUAL FOCUS:
- Empty scene with ONLY objects, products, or environments
- Isolated subject matter, uninhabited spaces
- Pure concept visualization without people
- Focus entirely on topic elements, textures, and atmosphere`;
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
