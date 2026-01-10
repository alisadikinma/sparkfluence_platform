/**
 * CINEMATOGRAPHY LOOKUP - Emotion/Mood → Technical Specs Mapping
 * ==============================================================
 * 
 * Direct O(1) lookup for cinematography specifications.
 * Used by image and video prompt generation.
 * 
 * Source: 06-Cinematography-Lookup.md
 * Last Updated: 2026-01-10
 */

// ============================================================================
// EMOTION → EXPRESSION + LIGHTING MAPPING
// ============================================================================

export interface EmotionSpecs {
  expression: string;
  body: string;
  lighting: string;
  ratio: string;
  promptPhrase: string;
}

export const EMOTION_MAP: Record<string, EmotionSpecs> = {
  shock: {
    expression: 'wide eyes, raised brows, open mouth',
    body: 'frozen posture',
    lighting: 'harsh Rembrandt',
    ratio: '8:1',
    promptPhrase: 'wide startled eyes, raised brows, open mouth, frozen posture',
  },
  curiosity: {
    expression: 'bright eyes, raised brows, slight head tilt',
    body: 'lean in',
    lighting: 'soft key',
    ratio: '4:1',
    promptPhrase: 'engaged bright eyes, slight head tilt, open expression',
  },
  authority: {
    expression: 'steady gaze, knowing smile',
    body: 'arms crossed',
    lighting: 'Rembrandt',
    ratio: '4:1',
    promptPhrase: 'steady unwavering gaze, composed expression, knowing smile',
  },
  tension: {
    expression: 'furrowed brow, fixed gaze',
    body: 'rigid',
    lighting: 'chiaroscuro',
    ratio: '8:1+',
    promptPhrase: 'intense fixed gaze, clenched jaw, rigid shoulders',
  },
  resolution: {
    expression: 'relaxed brow, confident smile',
    body: 'squared shoulders',
    lighting: 'balanced 3-point',
    ratio: '3:1',
    promptPhrase: 'steady direct gaze, subtle assured smile, squared shoulders',
  },
  excitement: {
    expression: 'bright eyes, genuine smile',
    body: 'animated',
    lighting: 'high-key warm',
    ratio: '2:1',
    promptPhrase: 'bright excited eyes, genuine smile, animated energy',
  },
  intrigue: {
    expression: 'slightly narrowed eyes, subtle smile',
    body: 'leaning forward',
    lighting: 'low-key mysterious',
    ratio: '6:1',
    promptPhrase: 'slightly narrowed eyes, mysterious subtle smile, leaning forward',
  },
  awe: {
    expression: 'softened eyes, slightly open mouth',
    body: 'chin slightly up',
    lighting: 'rim with volumetric',
    ratio: '3:1',
    promptPhrase: 'softened eyes, slightly open mouth, wonder expression',
  },
  fear: {
    expression: 'wide eyes, tense lips, raised inner brows',
    body: 'pulled-back defensive',
    lighting: 'underlit cold',
    ratio: '8:1',
    promptPhrase: 'wide fearful eyes, tense expression, defensive posture',
  },
  determination: {
    expression: 'set jaw, focused eyes, slight brow furrow',
    body: 'forward lean, squared stance',
    lighting: 'strong key minimal fill',
    ratio: '6:1',
    promptPhrase: 'determined focused eyes, set jaw, forward stance',
  },
  hope: {
    expression: 'warm smile, bright eyes, relaxed expression',
    body: 'open posture, slight upward gaze',
    lighting: 'golden hour warmth',
    ratio: '3:1',
    promptPhrase: 'warm hopeful smile, bright eyes, upward gaze',
  },
  urgency: {
    expression: 'intense gaze, serious expression, alert eyes',
    body: 'forward lean, dynamic posture',
    lighting: 'high contrast dramatic',
    ratio: '6:1',
    promptPhrase: 'intense urgent gaze, alert expression, dynamic posture',
  },
};

/**
 * Get emotion specs (O(1) lookup)
 */
export function getEmotionSpecs(emotion: string): EmotionSpecs {
  return EMOTION_MAP[emotion.toLowerCase()] || EMOTION_MAP.authority;
}

// ============================================================================
// LIGHTING PATTERNS
// ============================================================================

export interface LightingPattern {
  position: string;
  shadow: string;
  mood: string;
  promptPhrase: string;
}

export const LIGHTING_PATTERNS: Record<string, LightingPattern> = {
  rembrandt: {
    position: '45° side, above',
    shadow: 'triangle on cheek',
    mood: 'dramatic, authoritative',
    promptPhrase: 'Rembrandt lighting, triangle shadow on cheek',
  },
  butterfly: {
    position: 'directly above, on-axis',
    shadow: 'butterfly under nose',
    mood: 'glamorous, beauty',
    promptPhrase: 'Butterfly lighting, glamorous portrait',
  },
  split: {
    position: '90° direct side',
    shadow: 'half face shadow',
    mood: 'intense, duality',
    promptPhrase: 'Split lighting, half-face shadow',
  },
  loop: {
    position: '30-45° from camera',
    shadow: 'small nose loop',
    mood: 'natural, flattering',
    promptPhrase: 'Soft loop lighting, flattering',
  },
  rim: {
    position: 'behind subject',
    shadow: 'glowing outline',
    mood: 'separation, drama',
    promptPhrase: 'Strong rim light, edge separation',
  },
  broad: {
    position: 'lit side toward camera',
    shadow: 'shadow away',
    mood: 'wider appearance',
    promptPhrase: 'Broad lighting, open',
  },
  short: {
    position: 'shadow side toward camera',
    shadow: 'shadow toward camera',
    mood: 'slimming, moody',
    promptPhrase: 'Short lighting, sculptural',
  },
};

/**
 * Get lighting pattern (O(1) lookup)
 */
export function getLightingPattern(pattern: string): LightingPattern {
  return LIGHTING_PATTERNS[pattern.toLowerCase()] || LIGHTING_PATTERNS.rembrandt;
}

// ============================================================================
// LIGHTING RATIOS
// ============================================================================

export interface LightingRatio {
  contrast: string;
  useCase: string;
  promptAddition: string;
}

export const LIGHTING_RATIOS: Record<string, LightingRatio> = {
  '2:1': { contrast: 'low, subtle', useCase: 'beauty, explainer', promptAddition: 'soft 2:1 lighting ratio' },
  '3:1': { contrast: 'natural', useCase: 'standard, balanced', promptAddition: 'natural 3:1 lighting ratio' },
  '4:1': { contrast: 'moderate', useCase: 'drama, dialogue', promptAddition: 'cinematic 4:1 contrast' },
  '6:1': { contrast: 'high', useCase: 'tension, thriller', promptAddition: 'dramatic 6:1 shadows' },
  '8:1': { contrast: 'very high', useCase: 'noir, intense', promptAddition: 'dramatic 8:1 deep shadows' },
  '16:1': { contrast: 'extreme', useCase: 'horror, extreme', promptAddition: 'chiaroscuro extreme contrast' },
};

// ============================================================================
// COLOR TEMPERATURE (KELVIN)
// ============================================================================

export interface ColorTemp {
  kelvin: number;
  character: string;
  promptPhrase: string;
}

export const COLOR_TEMPS: Record<string, ColorTemp> = {
  candlelight: { kelvin: 1900, character: 'deep warm orange', promptPhrase: 'candlelit 1900K warm glow' },
  tungsten: { kelvin: 3200, character: 'classic warm', promptPhrase: 'tungsten 3200K warm interior' },
  golden_hour: { kelvin: 3500, character: 'magic gold', promptPhrase: 'golden hour 3500K' },
  daylight: { kelvin: 5600, character: 'neutral white', promptPhrase: 'daylight 5600K neutral' },
  overcast: { kelvin: 6500, character: 'cool soft', promptPhrase: 'overcast 6500K diffused' },
  shade: { kelvin: 7500, character: 'cool blue', promptPhrase: 'open shade 7500K cool' },
  blue_hour: { kelvin: 9000, character: 'twilight blue', promptPhrase: 'blue hour 9000K mystery' },
};

// ============================================================================
// SHOT TYPES
// ============================================================================

export interface ShotType {
  frame: string;
  lens: string;
  purpose: string;
  promptPhrase: string;
}

export const SHOT_TYPES: Record<string, ShotType> = {
  ECU: { frame: 'eyes/detail only', lens: '100mm macro', purpose: 'intense emotion, detail', promptPhrase: 'ECU 100mm macro, intense detail' },
  CU: { frame: 'face fills frame', lens: '85mm f/1.8', purpose: 'strong emotion', promptPhrase: 'close-up 85mm f/1.8 shallow DOF' },
  MCU: { frame: 'head + shoulders', lens: '50-85mm', purpose: 'dialogue, connection', promptPhrase: 'medium close-up 50mm' },
  MS: { frame: 'waist up', lens: '50mm', purpose: 'standard coverage', promptPhrase: 'medium shot 50mm waist up' },
  MWS: { frame: 'knees up', lens: '35mm', purpose: 'cowboy/action', promptPhrase: 'cowboy shot 35mm knees up' },
  WS: { frame: 'full body + env', lens: '24-35mm', purpose: 'context', promptPhrase: 'wide shot 35mm full body' },
  EWS: { frame: 'landscape dominant', lens: '14-18mm', purpose: 'epic scale', promptPhrase: 'extreme wide 18mm vast scale' },
};

/**
 * Get shot type specs (O(1) lookup)
 */
export function getShotType(type: string): ShotType {
  return SHOT_TYPES[type.toUpperCase()] || SHOT_TYPES.MCU;
}

// ============================================================================
// CAMERA ANGLES
// ============================================================================

export interface CameraAngle {
  setup: string;
  psychology: string;
  promptPhrase: string;
}

export const CAMERA_ANGLES: Record<string, CameraAngle> = {
  eye_level: { setup: 'at subject eye height', psychology: 'neutral, equal', promptPhrase: 'eye-level neutral' },
  low_angle: { setup: 'below eye, up', psychology: 'powerful, heroic', promptPhrase: 'low angle heroic' },
  high_angle: { setup: 'above, down', psychology: 'vulnerable, weak', promptPhrase: 'high angle vulnerable' },
  dutch: { setup: '15-45° roll tilt', psychology: 'unease, tension', promptPhrase: 'Dutch angle 25° tension' },
  birds_eye: { setup: 'directly overhead', psychology: 'omniscient', promptPhrase: 'bird\'s eye overhead' },
  worms_eye: { setup: 'ground level up', psychology: 'maximum power', promptPhrase: 'worm\'s eye towering' },
};

// ============================================================================
// FILM STOCKS
// ============================================================================

export interface FilmStock {
  iso: number;
  balance: string;
  character: string;
  promptPhrase: string;
}

export const FILM_STOCKS: Record<string, FilmStock> = {
  vision3_500t: { iso: 500, balance: '3200K Tungsten', character: 'Hollywood standard', promptPhrase: 'Kodak Vision3 500T tungsten' },
  vision3_250d: { iso: 250, balance: '5500K Daylight', character: 'crisp, accurate', promptPhrase: 'Kodak 250D daylight crisp' },
  portra_400: { iso: 400, balance: 'Daylight', character: 'warm skin, portrait', promptPhrase: 'Portra 400 warm skin tones' },
  portra_800: { iso: 800, balance: 'Daylight', character: 'versatile, grain', promptPhrase: 'Portra 800 natural warmth' },
  cinestill_800t: { iso: 800, balance: '3200K Tungsten', character: 'halation glow, neon', promptPhrase: 'CineStill 800T halation neon' },
  ektar_100: { iso: 100, balance: 'Daylight', character: 'saturated, vivid', promptPhrase: 'Ektar saturated vivid colors' },
};

// ============================================================================
// ATMOSPHERE TYPES
// ============================================================================

export interface AtmosphereType {
  particle: string;
  effect: string;
  promptPhrase: string;
}

export const ATMOSPHERE_TYPES: Record<string, AtmosphereType> = {
  haze: { particle: 'very fine', effect: 'light rays, depth', promptPhrase: 'atmospheric haze volumetric rays' },
  fog: { particle: 'large', effect: 'thick, mysterious', promptPhrase: 'thick fog mysterious' },
  ground_fog: { particle: 'heavy, low', effect: 'floor mist', promptPhrase: 'ground fog low mist' },
  dust: { particle: 'variable', effect: 'golden particles', promptPhrase: 'dust particles in sunbeams' },
  smoke: { particle: 'variable', effect: 'noir, dramatic', promptPhrase: 'wispy smoke noir atmosphere' },
  rain: { particle: 'water', effect: 'wet, moody', promptPhrase: 'rain backlit streaking' },
  clean: { particle: 'none', effect: 'crisp, clear', promptPhrase: 'clean atmosphere, crystal clear' },
};

// ============================================================================
// MOOD → COMPLETE SETUP (Quick Combos)
// ============================================================================

export interface MoodSetup {
  lighting: string;
  color: string;
  atmosphere: string;
  camera: string;
  filmStock: string;
}

export const MOOD_SETUPS: Record<string, MoodSetup> = {
  dramatic_authority: {
    lighting: 'Rembrandt 4:1, 3200K',
    color: 'muted teal-orange',
    atmosphere: 'light haze',
    camera: '85mm, eye-level',
    filmStock: 'vision3_500t',
  },
  tense_thriller: {
    lighting: 'Split 8:1, cool 5600K',
    color: 'bleach bypass',
    atmosphere: 'heavy haze',
    camera: '35mm, Dutch',
    filmStock: 'vision3_500t',
  },
  warm_inspiring: {
    lighting: 'Loop 2:1, 3500K golden',
    color: 'warm natural',
    atmosphere: 'clean',
    camera: '50mm, slight low',
    filmStock: 'portra_400',
  },
  mystery_intrigue: {
    lighting: 'Low-key 8:1, cool',
    color: 'desaturated teal',
    atmosphere: 'fog',
    camera: '35mm, shadows',
    filmStock: 'cinestill_800t',
  },
  tech_modern: {
    lighting: 'Clean 2:1, 5600K',
    color: 'neutral slight teal',
    atmosphere: 'clean screen glow',
    camera: '50mm, straight',
    filmStock: 'vision3_250d',
  },
  epic_reveal: {
    lighting: 'Rim + volumetric',
    color: 'teal orange',
    atmosphere: 'dust god rays',
    camera: '24mm, low angle',
    filmStock: 'vision3_500t',
  },
  urban_noir: {
    lighting: 'Hard 8:1, mixed temp',
    color: 'CineStill look',
    atmosphere: 'rain wet streets',
    camera: '35mm, low',
    filmStock: 'cinestill_800t',
  },
};

/**
 * Get mood setup (O(1) lookup)
 */
export function getMoodSetup(mood: string): MoodSetup {
  const key = mood.toLowerCase().replace(/\s+/g, '_');
  return MOOD_SETUPS[key] || MOOD_SETUPS.dramatic_authority;
}

// ============================================================================
// SEGMENT TYPE → DEFAULT CINEMATOGRAPHY
// ============================================================================

export interface SegmentDefaults {
  shot: string;
  lens: string;
  lighting: string;
  atmosphere: string;
}

export const SEGMENT_DEFAULTS: Record<string, SegmentDefaults> = {
  HOOK: { shot: 'CU', lens: '85mm', lighting: 'Rembrandt 4:1', atmosphere: 'light haze' },
  CTA: { shot: 'CU', lens: '85mm', lighting: 'Butterfly 2:1', atmosphere: 'clean' },
  FORE: { shot: 'MS', lens: '50mm', lighting: 'Loop 4:1', atmosphere: 'haze' },
  FORESHADOW: { shot: 'MS', lens: '50mm', lighting: 'Low-key 6:1', atmosphere: 'fog' },
  BODY: { shot: 'MCU', lens: '50mm', lighting: 'Loop 2:1', atmosphere: 'clean' },
  'BODY-1': { shot: 'MCU', lens: '50mm', lighting: 'Loop 2:1', atmosphere: 'clean' },
  'BODY-2': { shot: 'MCU', lens: '50mm', lighting: 'Loop 2:1', atmosphere: 'clean' },
  'BODY-3': { shot: 'MCU', lens: '50mm', lighting: 'Loop 3:1', atmosphere: 'clean' },
  PEAK: { shot: 'WS', lens: '35mm', lighting: 'Dramatic 6:1', atmosphere: 'volumetric' },
  TWIST: { shot: 'CU', lens: '85mm', lighting: 'Hard 8:1', atmosphere: 'smoke' },
  ENDING: { shot: 'MCU', lens: '50mm', lighting: 'Warm 3:1', atmosphere: 'clean' },
  THUMBNAIL: { shot: 'CU', lens: '85mm f/1.8', lighting: 'Rembrandt 4:1-6:1', atmosphere: 'haze' },
};

/**
 * Get segment defaults (O(1) lookup)
 */
export function getSegmentDefaults(segmentType: string): SegmentDefaults {
  return SEGMENT_DEFAULTS[segmentType.toUpperCase()] || SEGMENT_DEFAULTS.BODY;
}

// ============================================================================
// TOPIC → COSTUME MAPPING
// ============================================================================

export const TOPIC_COSTUMES: Record<string, string> = {
  // Health & Medical
  medical: 'white doctor coat with stethoscope',
  health: 'white doctor coat with stethoscope',
  doctor: 'white doctor coat with stethoscope',
  pharmacy: 'white pharmacist coat',
  
  // Technology
  tech: 'dark tech hoodie, casual smart',
  startup: 'dark hoodie with company logo tee',
  coding: 'comfortable hoodie, developer style',
  programming: 'casual tech wear, hoodie',
  software: 'smart casual tech attire',
  ai: 'modern minimalist tech wear',
  crypto: 'modern tech casual, sleek',
  cybersecurity: 'tech professional, smart casual',
  
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
  
  // Fitness & Sports
  fitness: 'athletic wear, gym clothes',
  gym: 'fitted workout attire',
  sports: 'sports jersey or athletic wear',
  yoga: 'yoga attire, comfortable',
  
  // Education
  education: 'smart casual with glasses',
  teaching: 'professional teacher attire',
  
  // Fashion & Beauty
  fashion: 'trendy stylish outfit, on-trend',
  beauty: 'elegant fashionable attire',
  
  // Travel & Lifestyle
  travel: 'casual travel wear, light jacket',
  lifestyle: 'casual chic everyday wear',
  
  // Gaming
  gaming: 'gaming headset, casual hoodie',
  
  // Default
  default: 'smart casual professional attire',
};

/**
 * Get costume for topic (O(1) lookup with partial matching)
 */
export function getCostumeForTopic(topic: string): string {
  const topicLower = topic.toLowerCase();
  
  // Exact match first
  if (TOPIC_COSTUMES[topicLower]) {
    return TOPIC_COSTUMES[topicLower];
  }
  
  // Partial match
  for (const [key, costume] of Object.entries(TOPIC_COSTUMES)) {
    if (topicLower.includes(key) || key.includes(topicLower)) {
      return costume;
    }
  }
  
  return TOPIC_COSTUMES.default;
}

// ============================================================================
// VEO-VERIFIED CAMERA MOVEMENTS
// ============================================================================

export const CAMERA_MOVEMENTS: Record<string, { effect: string; veoTerm: string }> = {
  push_in: { effect: 'intimacy', veoTerm: 'smooth dolly push-in' },
  pull_back: { effect: 'reveal', veoTerm: 'gentle dolly pull-back' },
  track: { effect: 'following', veoTerm: 'tracking shot following subject' },
  pan: { effect: 'horizontal scan', veoTerm: 'slow pan left/right' },
  orbit: { effect: 'tension', veoTerm: 'orbit shot circling subject' },
  static: { effect: 'stability', veoTerm: 'static locked-off shot' },
};

// ============================================================================
// TRANSITIONS
// ============================================================================

export const TRANSITIONS: Record<string, { veoInstruction: string; when: string }> = {
  cut: { veoInstruction: 'Hard cut', when: 'standard' },
  flash_cut: { veoInstruction: '1-2 frame white flash', when: 'revelation' },
  push_in: { veoInstruction: 'End with slow dolly push-in', when: 'intensity' },
  pull_back: { veoInstruction: 'End with gentle pull-back', when: 'conclusion' },
  whip_pan: { veoInstruction: 'Fast pan with blur', when: 'energy' },
  fade_black: { veoInstruction: 'Slow fade over 12 frames', when: 'scene end' },
};

// ============================================================================
// BUILDER FUNCTIONS
// ============================================================================

/**
 * Build complete cinematography string for prompt
 */
export function buildCinematographyPrompt(params: {
  emotion: string;
  segmentType: string;
  topic?: string;
}): string {
  const emotionSpecs = getEmotionSpecs(params.emotion);
  const segmentDefaults = getSegmentDefaults(params.segmentType);
  const shotType = getShotType(segmentDefaults.shot);
  
  return `${shotType.promptPhrase}. ${emotionSpecs.promptPhrase}. ${segmentDefaults.lighting}. ${segmentDefaults.atmosphere}.`;
}

/**
 * Build complete visual specs for a segment
 */
export interface VisualSpecs {
  shot: ShotType;
  emotion: EmotionSpecs;
  lighting: string;
  atmosphere: string;
  costume: string;
  filmStock: FilmStock;
}

export function getVisualSpecs(params: {
  emotion: string;
  segmentType: string;
  topic: string;
  mood?: string;
}): VisualSpecs {
  const emotionSpecs = getEmotionSpecs(params.emotion);
  const segmentDefaults = getSegmentDefaults(params.segmentType);
  const shotType = getShotType(segmentDefaults.shot);
  const costume = getCostumeForTopic(params.topic);
  const moodSetup = params.mood ? getMoodSetup(params.mood) : MOOD_SETUPS.dramatic_authority;
  const filmStock = FILM_STOCKS[moodSetup.filmStock] || FILM_STOCKS.vision3_500t;
  
  return {
    shot: shotType,
    emotion: emotionSpecs,
    lighting: segmentDefaults.lighting,
    atmosphere: segmentDefaults.atmosphere,
    costume,
    filmStock,
  };
}
