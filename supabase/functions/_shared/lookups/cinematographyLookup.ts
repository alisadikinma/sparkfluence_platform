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
// TOPIC → COSTUME MAPPING (Enhanced 2026-01-14)
// Now includes activity-based costumes, not just professional contexts
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
  cafe: 'casual comfortable outfit, relaxed style',
  coffee: 'casual comfortable outfit, cozy sweater',
  
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
  
  // Travel & Lifestyle (CASUAL - not formal!)
  travel: 'casual travel wear, comfortable t-shirt and light jacket',
  lifestyle: 'casual chic everyday wear',
  vacation: 'relaxed vacation wear, casual shorts or pants with t-shirt',
  tourist: 'casual tourist outfit, comfortable walking clothes',
  explore: 'casual explorer outfit, comfortable streetwear',
  adventure: 'outdoor adventure wear, casual practical clothes',
  
  // Gaming & Entertainment (CASUAL - key fix!)
  gaming: 'casual gamer outfit, graphic tee or hoodie, relaxed streetwear',
  arcade: 'casual streetwear, graphic tee, relaxed comfortable clothes',
  game: 'casual gamer style, comfortable hoodie or t-shirt',
  esports: 'esports jersey, gaming team attire',
  retro: 'vintage casual wear, retro graphic tee',
  
  // Nightlife & Social
  club: 'stylish nightclub attire, trendy casual',
  bar: 'smart casual evening wear',
  party: 'party outfit, stylish casual',
  
  // Default
  default: 'smart casual professional attire',
};

// ============================================================================
// LOCATION CONTEXT MAPPING (NEW 2026-01-14)
// Extracts cultural/environmental context from location keywords
// ============================================================================

export interface LocationContext {
  country: string;
  environment: string;           // Visual environment hints
  peopleDescription: string;     // Ethnicity/cultural appearance hints
  architectureHints: string;     // Building/street style
  signageHints: string;          // Text/signage language
  atmosphereHints: string;       // Cultural atmosphere
}

export const LOCATION_CONTEXTS: Record<string, LocationContext> = {
  // Japan
  japan: {
    country: 'Japan',
    environment: 'Japanese urban setting',
    peopleDescription: 'Japanese people, East Asian appearance',
    architectureHints: 'Japanese architecture, neon signs with Japanese text, narrow streets',
    signageHints: 'Japanese kanji and hiragana signage',
    atmosphereHints: 'clean organized Japanese aesthetic, vending machines, konbini convenience stores',
  },
  tokyo: {
    country: 'Japan',
    environment: 'Tokyo metropolitan area, bustling Japanese city',
    peopleDescription: 'Japanese locals, East Asian appearance, Tokyo fashion style',
    architectureHints: 'Tokyo skyscrapers, dense urban Japanese architecture, train stations',
    signageHints: 'Japanese neon signs, kanji text, Tokyo station signs',
    atmosphereHints: 'busy Tokyo streets, Shibuya crossing vibe, Japanese pop culture',
  },
  shinjuku: {
    country: 'Japan',
    environment: 'Shinjuku district Tokyo, neon-lit entertainment area',
    peopleDescription: 'Japanese locals and salarymen, East Asian appearance',
    architectureHints: 'Shinjuku neon buildings, dense entertainment district, izakaya alleys',
    signageHints: 'bright Japanese neon signs, kanji advertisements, pachinko parlor signs',
    atmosphereHints: 'vibrant Shinjuku nightlife, Japanese arcade culture, Golden Gai vibes',
  },
  akihabara: {
    country: 'Japan',
    environment: 'Akihabara electronics district, otaku paradise',
    peopleDescription: 'Japanese otaku culture, anime fans, East Asian appearance',
    architectureHints: 'multi-story electronics stores, anime billboards, maid cafe signs',
    signageHints: 'Japanese anime advertisements, electronics store kanji signs',
    atmosphereHints: 'anime culture, gaming arcades, Japanese electronics heaven',
  },
  kyoto: {
    country: 'Japan',
    environment: 'traditional Kyoto, ancient Japanese temples',
    peopleDescription: 'Japanese locals, some in traditional kimono, East Asian appearance',
    architectureHints: 'traditional Japanese temples, wooden machiya houses, torii gates',
    signageHints: 'elegant Japanese calligraphy signs, temple names in kanji',
    atmosphereHints: 'serene traditional Japan, geisha district, zen garden aesthetic',
  },
  osaka: {
    country: 'Japan',
    environment: 'Osaka urban area, food paradise',
    peopleDescription: 'Osaka locals, friendly Japanese people, East Asian appearance',
    architectureHints: 'Dotonbori neon, Osaka castle, food stall streets',
    signageHints: 'colorful Osaka neon signs, Japanese food advertisements',
    atmosphereHints: 'Osaka street food culture, takoyaki stands, energetic atmosphere',
  },
  
  // Korea
  korea: {
    country: 'South Korea',
    environment: 'Korean urban setting',
    peopleDescription: 'Korean people, East Asian appearance, K-fashion style',
    architectureHints: 'Korean architecture, hangeul signage, modern Korean buildings',
    signageHints: 'Korean hangeul text signs',
    atmosphereHints: 'Korean pop culture aesthetic, clean modern Korean style',
  },
  seoul: {
    country: 'South Korea',
    environment: 'Seoul metropolitan, K-pop capital',
    peopleDescription: 'Korean locals, trendy K-fashion, East Asian appearance',
    architectureHints: 'Gangnam high-rises, traditional hanok mixed with modern, Myeongdong shopping',
    signageHints: 'Korean hangeul neon signs, K-beauty advertisements',
    atmosphereHints: 'trendy Seoul vibes, K-pop culture, Korean cafe culture',
  },
  
  // China
  china: {
    country: 'China',
    environment: 'Chinese urban setting',
    peopleDescription: 'Chinese people, East Asian appearance',
    architectureHints: 'Chinese architecture, red lanterns, Chinese characters signage',
    signageHints: 'Chinese hanzi characters, Mandarin text signs',
    atmosphereHints: 'Chinese cultural aesthetic, traditional meets modern',
  },
  shanghai: {
    country: 'China',
    environment: 'Shanghai metropolis, financial hub',
    peopleDescription: 'Shanghai locals, cosmopolitan Chinese, East Asian appearance',
    architectureHints: 'Shanghai skyline, The Bund, Pudong towers, old Shanghai lanes',
    signageHints: 'Chinese characters with some English, modern Shanghai signage',
    atmosphereHints: 'cosmopolitan Shanghai energy, East meets West',
  },
  beijing: {
    country: 'China',
    environment: 'Beijing capital, historical Chinese city',
    peopleDescription: 'Beijing locals, Chinese people, East Asian appearance',
    architectureHints: 'Forbidden City style, traditional hutongs, modern CBD',
    signageHints: 'Chinese hanzi signs, government building style',
    atmosphereHints: 'imperial Chinese heritage, capital city gravitas',
  },
  hongkong: {
    country: 'Hong Kong',
    environment: 'Hong Kong dense urban, neon-lit streets',
    peopleDescription: 'Hong Kong locals, Cantonese Chinese, East Asian appearance',
    architectureHints: 'dense Hong Kong high-rises, bamboo scaffolding, neon signs',
    signageHints: 'traditional Chinese characters, some English, neon Cantonese signs',
    atmosphereHints: 'Hong Kong noir aesthetic, Wong Kar-wai vibes, dense urban energy',
  },
  
  // Southeast Asia
  indonesia: {
    country: 'Indonesia',
    environment: 'Indonesian tropical setting',
    peopleDescription: 'Indonesian people, Southeast Asian appearance, diverse ethnicities',
    architectureHints: 'Indonesian architecture, tropical buildings, local markets',
    signageHints: 'Bahasa Indonesia text signs',
    atmosphereHints: 'warm tropical Indonesian atmosphere, friendly local vibes',
  },
  jakarta: {
    country: 'Indonesia',
    environment: 'Jakarta metropolitan, Indonesian capital',
    peopleDescription: 'Jakarta locals, Indonesian people, Southeast Asian appearance',
    architectureHints: 'Jakarta skyscrapers, malls, traditional markets, traffic',
    signageHints: 'Bahasa Indonesia signage, local advertisements',
    atmosphereHints: 'bustling Jakarta energy, Indonesian urban culture',
  },
  bali: {
    country: 'Indonesia',
    environment: 'Bali tropical paradise, Hindu-Balinese culture',
    peopleDescription: 'Balinese locals, Indonesian people, traditional dress',
    architectureHints: 'Balinese temples, rice terraces, beach resorts, pura gates',
    signageHints: 'Balinese and Indonesian text, tourism signs',
    atmosphereHints: 'spiritual Bali vibes, tropical paradise, yoga retreat energy',
  },
  singapore: {
    country: 'Singapore',
    environment: 'Singapore clean modern city-state',
    peopleDescription: 'Singaporean locals, diverse Asian ethnicities (Chinese, Malay, Indian)',
    architectureHints: 'Marina Bay Sands, HDB flats, Gardens by the Bay, hawker centers',
    signageHints: 'multilingual signs (English, Chinese, Malay, Tamil)',
    atmosphereHints: 'ultra-clean Singapore, efficient modern Asian city',
  },
  thailand: {
    country: 'Thailand',
    environment: 'Thai tropical setting',
    peopleDescription: 'Thai people, Southeast Asian appearance',
    architectureHints: 'Thai temples, Buddhist architecture, street food stalls',
    signageHints: 'Thai script signage',
    atmosphereHints: 'warm Thai hospitality, Buddhist culture, street food paradise',
  },
  bangkok: {
    country: 'Thailand',
    environment: 'Bangkok busy metropolis',
    peopleDescription: 'Bangkok locals, Thai people, Southeast Asian appearance',
    architectureHints: 'Bangkok temples, tuk-tuks, sky train, floating markets',
    signageHints: 'Thai script neon signs, street food vendor signs',
    atmosphereHints: 'chaotic Bangkok energy, Thai street food culture, temple visits',
  },
  vietnam: {
    country: 'Vietnam',
    environment: 'Vietnamese setting',
    peopleDescription: 'Vietnamese people, Southeast Asian appearance',
    architectureHints: 'Vietnamese architecture, French colonial influence, tube houses',
    signageHints: 'Vietnamese text with diacritics',
    atmosphereHints: 'Vietnamese coffee culture, motorbike traffic, pho restaurants',
  },
  
  // India
  india: {
    country: 'India',
    environment: 'Indian setting',
    peopleDescription: 'Indian people, South Asian appearance, diverse regional looks',
    architectureHints: 'Indian architecture, colorful buildings, temples, bazaars',
    signageHints: 'Hindi Devanagari script and English signs',
    atmosphereHints: 'vibrant Indian colors, busy markets, chai culture',
  },
  mumbai: {
    country: 'India',
    environment: 'Mumbai metropolitan, Bollywood capital',
    peopleDescription: 'Mumbai locals, Indian people, South Asian appearance',
    architectureHints: 'Mumbai skyline, Victorian Gothic buildings, film city',
    signageHints: 'Hindi and Marathi signs, Bollywood posters',
    atmosphereHints: 'Mumbai hustle, Bollywood energy, financial capital vibes',
  },
  delhi: {
    country: 'India',
    environment: 'Delhi capital city, historical Indian metropolis',
    peopleDescription: 'Delhi locals, North Indian people, South Asian appearance',
    architectureHints: 'Mughal architecture, Red Fort, modern New Delhi, old Delhi bazaars',
    signageHints: 'Hindi Devanagari and English signs',
    atmosphereHints: 'Delhi historical grandeur, street food paradise, political capital',
  },
  
  // Middle East
  dubai: {
    country: 'UAE',
    environment: 'Dubai luxury modern city',
    peopleDescription: 'diverse international residents, Emirati locals, Middle Eastern appearance',
    architectureHints: 'Burj Khalifa, luxury malls, desert architecture, Palm Jumeirah',
    signageHints: 'Arabic and English bilingual signs',
    atmosphereHints: 'Dubai luxury lifestyle, desert meets ultra-modern',
  },
  
  // Europe
  london: {
    country: 'UK',
    environment: 'London British capital',
    peopleDescription: 'diverse London population, British people, European appearance',
    architectureHints: 'Big Ben, red phone booths, Victorian buildings, tube stations',
    signageHints: 'English signs, British spelling',
    atmosphereHints: 'British culture, rainy London vibes, pub culture',
  },
  paris: {
    country: 'France',
    environment: 'Paris romantic French capital',
    peopleDescription: 'Parisian locals, French people, European appearance',
    architectureHints: 'Eiffel Tower, Haussmann buildings, cafes, metro entrances',
    signageHints: 'French text signs',
    atmosphereHints: 'romantic Paris aesthetic, cafe culture, fashion capital',
  },
  
  // Americas
  newyork: {
    country: 'USA',
    environment: 'New York City urban jungle',
    peopleDescription: 'diverse New York population, American melting pot',
    architectureHints: 'NYC skyscrapers, yellow taxis, subway, Times Square',
    signageHints: 'English signs, Broadway marquees',
    atmosphereHints: 'NYC hustle, diverse American culture, 24/7 city energy',
  },
  losangeles: {
    country: 'USA',
    environment: 'Los Angeles sunny California',
    peopleDescription: 'diverse LA population, Hollywood celebrities, American appearance',
    architectureHints: 'Hollywood sign, palm trees, beaches, freeways',
    signageHints: 'English signs, Hollywood style',
    atmosphereHints: 'LA sunshine, entertainment industry, beach vibes',
  },
  
  // Default fallback
  default: {
    country: 'International',
    environment: 'modern urban setting',
    peopleDescription: 'diverse international people',
    architectureHints: 'modern urban architecture',
    signageHints: 'multilingual signage',
    atmosphereHints: 'contemporary urban atmosphere',
  },
};

/**
 * Extract location context from text (script, topic, visual direction)
 * Returns location context with cultural/environmental hints
 * @param text - Text to analyze (script, topic, or visual direction)
 * @returns LocationContext or null if no location detected
 */
export function extractLocationContext(text: string): LocationContext | null {
  if (!text) return null;
  
  const textLower = text.toLowerCase();
  
  // Priority order: specific locations first, then countries
  const locationPriority = [
    // Japan specific (most detailed first)
    'akihabara', 'shinjuku', 'shibuya', 'harajuku', 'ginza', 'roppongi',
    'kyoto', 'osaka', 'tokyo',
    // Korea specific
    'gangnam', 'myeongdong', 'hongdae', 'seoul',
    // China specific  
    'shanghai', 'beijing', 'hongkong', 'hong kong', 'shenzhen',
    // Southeast Asia specific
    'bali', 'jakarta', 'singapore', 'bangkok', 'ho chi minh', 'hanoi',
    // India specific
    'mumbai', 'delhi', 'bangalore', 'goa',
    // Middle East
    'dubai', 'abu dhabi',
    // Europe specific
    'london', 'paris', 'berlin', 'amsterdam', 'rome', 'barcelona',
    // Americas specific
    'new york', 'newyork', 'los angeles', 'losangeles', 'san francisco',
    // Countries (fallback)
    'japan', 'japanese', 'korea', 'korean', 'china', 'chinese',
    'indonesia', 'indonesian', 'thailand', 'thai', 'vietnam', 'vietnamese',
    'india', 'indian', 'singapore', 'singaporean',
    'uk', 'british', 'england', 'france', 'french', 'germany', 'german',
    'usa', 'america', 'american',
  ];
  
  for (const location of locationPriority) {
    if (textLower.includes(location)) {
      // Normalize location key
      let key = location.replace(/\s+/g, '').toLowerCase();
      
      // Map variations to canonical keys
      const keyMap: Record<string, string> = {
        'japanese': 'japan',
        'korean': 'korea', 
        'chinese': 'china',
        'indonesian': 'indonesia',
        'thai': 'thailand',
        'vietnamese': 'vietnam',
        'singaporean': 'singapore',
        'british': 'london',
        'england': 'london',
        'french': 'paris',
        'german': 'berlin',
        'american': 'newyork',
        'usa': 'newyork',
        'america': 'newyork',
        'uk': 'london',
        'shibuya': 'tokyo',
        'harajuku': 'tokyo',
        'ginza': 'tokyo',
        'roppongi': 'tokyo',
        'gangnam': 'seoul',
        'myeongdong': 'seoul',
        'hongdae': 'seoul',
        'shenzhen': 'china',
        'hochiminh': 'vietnam',
        'hanoi': 'vietnam',
        'abudhabi': 'dubai',
        'bangalore': 'india',
        'goa': 'india',
        'berlin': 'paris', // Use Paris as European fallback
        'amsterdam': 'paris',
        'rome': 'paris',
        'barcelona': 'paris',
        'sanfrancisco': 'losangeles',
      };
      
      key = keyMap[key] || key;
      
      if (LOCATION_CONTEXTS[key]) {
        return LOCATION_CONTEXTS[key];
      }
    }
  }
  
  return null;
}

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

/**
 * Get CONTEXTUAL costume based on topic AND script/activity analysis (NEW 2026-01-14)
 * This is smarter than getCostumeForTopic() - analyzes actual activity keywords
 * 
 * @param topic - Video topic
 * @param scriptText - Optional script text to analyze for activity context
 * @returns Appropriate costume string
 */
export function getContextualCostume(topic: string, scriptText?: string): string {
  const topicLower = (topic || '').toLowerCase();
  const scriptLower = (scriptText || '').toLowerCase();

  // Activity keyword priorities
  // NOTE: We check TOPIC FIRST, then script. Topic determines costume, not script content.
  // This prevents script mentioning "health" from overriding a "tech" topic's costume.
  const activityKeywords: Array<{ keywords: string[]; costume: string }> = [
    // Gaming/Entertainment (CASUAL - must override formal defaults)
    {
      keywords: ['gaming', 'arcade', 'game center', 'video game', 'esports', 'gamer', 'playing games', 'retro gaming', 'gaming cafe'],
      costume: 'casual gamer outfit, comfortable graphic tee or hoodie, relaxed streetwear',
    },
    // Travel/Exploration (CASUAL - tourist style)
    {
      keywords: ['travel', 'exploring', 'vacation', 'tourist', 'trip', 'journey', 'adventure', 'backpack', 'sightseeing'],
      costume: 'casual travel wear, comfortable t-shirt and light jacket, tourist style',
    },
    // Food/Cafe (CASUAL)
    {
      keywords: ['cafe', 'coffee shop', 'restaurant visit', 'food tour', 'eating', 'dining', 'food review'],
      costume: 'casual comfortable outfit, relaxed cafe style, cozy sweater or casual shirt',
    },
    // Nightlife (STYLISH CASUAL)
    {
      keywords: ['nightlife', 'club', 'bar', 'party', 'night out', 'clubbing'],
      costume: 'stylish casual nightlife attire, trendy evening wear',
    },
    // Sports/Fitness (ATHLETIC)
    {
      keywords: ['gym', 'workout', 'fitness', 'exercise', 'running', 'yoga', 'sports'],
      costume: 'athletic wear, fitness outfit, gym clothes',
    },
    // Beach/Outdoor (CASUAL)
    {
      keywords: ['beach', 'outdoor', 'hiking', 'nature', 'park', 'camping'],
      costume: 'outdoor casual wear, comfortable adventure clothes',
    },
    // Tech/Coding (CASUAL TECH)
    {
      keywords: ['coding', 'programming', 'developer', 'tech', 'startup', 'hacking', 'ai', 'software', 'trends'],
      costume: 'casual tech wear, comfortable hoodie, developer style',
    },
    // Business/Professional (FORMAL)
    {
      keywords: ['business', 'meeting', 'corporate', 'office', 'presentation', 'pitch', 'investor'],
      costume: 'professional business attire, navy blazer over white shirt',
    },
    // Medical/Health (PROFESSIONAL)
    {
      keywords: ['medical', 'doctor', 'hospital', 'clinic', 'pharmacy', 'nurse', 'healthcare worker'],
      costume: 'white doctor coat with stethoscope',
    },
  ];

  // PRIORITY 1: Check TOPIC keywords first (topic determines costume)
  for (const activity of activityKeywords) {
    for (const keyword of activity.keywords) {
      if (topicLower.includes(keyword)) {
        return activity.costume;
      }
    }
  }

  // PRIORITY 2: If topic doesn't match, check script (but NOT for medical/professional)
  // This prevents "health tech" in script from making tech topic wear doctor coat
  const nonMedicalActivities = activityKeywords.filter(a =>
    !a.keywords.some(k => ['medical', 'doctor', 'hospital', 'clinic', 'pharmacy', 'nurse', 'healthcare worker'].includes(k))
  );

  for (const activity of nonMedicalActivities) {
    for (const keyword of activity.keywords) {
      if (scriptLower.includes(keyword)) {
        return activity.costume;
      }
    }
  }

  // PRIORITY 3: Fallback to topic-based costume lookup
  return getCostumeForTopic(topic);
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
 * Build complete cinematography string for prompt (BASIC - deprecated)
 * Use buildFullCinematographyPrompt() for rich 400+ char prompts
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

// ============================================================================
// ENHANCED PROMPT BUILDER (2026-01-11)
// Target: 400+ chars with full cinematography specs
// Source: 07-Prompt-Templates.md, 06-Cinematography-Lookup.md
// ============================================================================

// CHARACTER BIBLE - Default creator appearance (Ali Sadikin Ma)
// Source: 07-Prompt-Templates.md Section 11
export const DEFAULT_CHARACTER_BIBLE = `A 37-year-old Indonesian man with a bald head and round face shape. Warm skin undertone with natural texture and visible pores. Dark brown almond-shaped eyes behind rectangular gunmetal semi-rimless glasses. Clean-shaven with a confident, approachable expression.`;

export interface FullPromptParams {
  characterDescription?: string; // Optional - uses CHARACTER_BIBLE if not provided
  emotion: string;
  topic: string;
  shotType?: string;        // CU, MCU, MS, etc.
  segmentType: string;      // HOOK, CTA, BODY, etc.
  aspectRatio: string;      // 9:16, 16:9, 1:1
  costume?: string;         // Override costume
  visualReference?: string; // Film reference (Blade Runner, etc.)
  useCharacterBible?: boolean; // Force use of default character bible
}

/**
 * Build RICH cinematography prompt (400+ chars target)
 * Includes: Camera specs, lighting ratios, film stock, atmosphere, character
 */
export function buildFullCinematographyPrompt(params: FullPromptParams): string {
  const {
    emotion,
    topic,
    segmentType,
    aspectRatio,
    costume,
    visualReference,
    useCharacterBible = true // Default to using character bible for CREATOR shots
  } = params;
  
  // Use CHARACTER BIBLE for CREATOR shots (CRITICAL for face consistency)
  // Only use custom description if explicitly provided AND not forcing character bible
  const characterDescription = (useCharacterBible || !params.characterDescription)
    ? DEFAULT_CHARACTER_BIBLE
    : params.characterDescription;
  
  // Get specs from lookup tables
  const emotionSpecs = getEmotionSpecs(emotion);
  const segmentDefaults = getSegmentDefaults(segmentType);
  const shotTypeKey = params.shotType || segmentDefaults.shot || 'MCU';
  const shotType = getShotType(shotTypeKey);
  
  // Determine mood setup based on segment type
  let moodSetup: MoodSetup;
  if (['HOOK', 'TWIST'].includes(segmentType.toUpperCase())) {
    moodSetup = MOOD_SETUPS.dramatic_authority;
  } else if (['CTA', 'ENDING'].includes(segmentType.toUpperCase())) {
    moodSetup = MOOD_SETUPS.warm_inspiring;
  } else if (['PEAK'].includes(segmentType.toUpperCase())) {
    moodSetup = MOOD_SETUPS.epic_reveal;
  } else {
    moodSetup = MOOD_SETUPS.tech_modern;
  }
  
  const filmStock = FILM_STOCKS[moodSetup.filmStock] || FILM_STOCKS.vision3_500t;
  
  // Get costume (override or topic-based)
  const finalCostume = costume || getCostumeForTopic(topic);
  
  // Determine lighting pattern and ratio
  const lightingRatio = emotionSpecs.ratio || '4:1';
  const lightingPattern = segmentDefaults.lighting.split(' ')[0] || 'Rembrandt';
  const keyPosition = ['HOOK', 'CTA'].includes(segmentType.toUpperCase()) 
    ? 'camera left' 
    : 'camera right';
  
  // Get atmosphere type
  const atmosphereType = ATMOSPHERE_TYPES[segmentDefaults.atmosphere] || ATMOSPHERE_TYPES.haze;
  
  // Resolution based on aspect ratio
  const resolution = aspectRatio === '9:16' 
    ? 'Portrait 1024×1792' 
    : aspectRatio === '16:9'
      ? 'Landscape 1792×1024'
      : 'Square 1024×1024';
  
  // Build the FULL prompt (target 400+ chars)
  // NOTE: Costume instruction is emphasized for image-to-image models (Nano Banana /edit)
  // to override the original clothing from reference image
  const prompt = `A photorealistic cinematic ${shotType.frame} of ${characterDescription}.

Expression: ${emotionSpecs.promptPhrase}
Pose: ${emotionSpecs.body}, engaged with camera
OUTFIT/CLOTHING: Subject is wearing ${finalCostume}. This outfit is REQUIRED and must match the ${topic || 'content'} theme.

Camera: ${shotTypeKey}, ${shotType.lens}, eye-level to slight low angle
Composition: Rule of thirds, subject positioned off-center

Lighting: ${lightingPattern} lighting, ${lightingRatio} ratio, key from ${keyPosition}
Color temperature: ${moodSetup.lighting.includes('3200') ? '3200K warm tungsten' : '5600K neutral daylight'}

Film Stock: ${filmStock.promptPhrase}
Color Grade: ${moodSetup.color}
Atmosphere: ${atmosphereType.promptPhrase}

Environment: Modern professional studio setting appropriate for ${topic || 'content creation'}
Background: Moderate depth bokeh, subtle contextual elements

Style: Cinematic photorealistic, natural skin texture, Hollywood production quality.
Technical: ${resolution}, HD quality.
Clean frame, no text overlays, no watermarks, no UI elements.${visualReference ? `\nVisual reference: ${visualReference} inspired lighting and color palette.` : ''}`;

  return prompt;
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

// ============================================================================
// NEGATIVE PROMPT TEMPLATES (Moved from metaphorLookup.ts - 2026-01-11)
// Used by fal.ai wan/v2.6 for B-roll quality control
// ============================================================================

export const NEGATIVE_PROMPTS = {
  // Quality issues only (DEFAULT)
  general: 'blurry, low quality, distorted, artifacts, noise, grain, pixelated, compression artifacts',
  // Text/watermark exclusion
  no_text: 'text, watermark, logo, signature, username, label, caption, subtitle, overlay, UI elements',
  // Style exclusion (keep photorealistic)
  no_style: 'cartoon, anime, illustration, painting, drawing, sketch, 3D render, CGI, digital art',
  // Combined quality + text + style (NO human exclusion - humans allowed in all segments)
  combined: 'blurry, low quality, distorted, artifacts, text, watermark, logo, cartoon, anime, illustration, painting, oversaturated, underexposed, flat lighting, cheap CGI',
};

/**
 * Get negative prompt for B-roll (fal.ai wan/v2.6)
 * NOTE: Humans are ALLOWED in all segments. Only creator face differs (HOOK/CTA use reference image).
 * @param type - Type of negative prompt: 'general' | 'no_text' | 'no_style' | 'combined'
 * @returns Negative prompt string
 */
export function getBRollNegativePrompt(
  type: keyof typeof NEGATIVE_PROMPTS = 'combined'
): string {
  return NEGATIVE_PROMPTS[type] || NEGATIVE_PROMPTS.combined;
}

// ============================================================================
// COSTUME CATEGORIES (2026-01-15)
// Constrained list for LLM classification - ensures consistent, valid outputs
// LLM picks category, we return predefined costume description
// ============================================================================

export const COSTUME_CATEGORIES = {
  // ===== PROFESSIONAL =====
  MEDICAL: 'white doctor coat with stethoscope around neck',
  LEGAL: 'formal black suit with tie, lawyer attire',
  BUSINESS: 'navy blazer over crisp white shirt, professional',
  FINANCE: 'formal suit with power tie, banker style',
  CORPORATE: 'executive business attire, tailored suit',
  
  // ===== TECH & DIGITAL =====
  TECH: 'dark tech hoodie over minimal tee, developer style',
  STARTUP: 'casual smart, hoodie with company logo tee',
  GAMING: 'casual gamer hoodie, graphic tee, relaxed streetwear',
  ESPORTS: 'esports jersey, gaming team attire',
  STREAMING: 'trendy casual, comfortable streaming setup attire',
  
  // ===== HEALTH & FITNESS =====
  FITNESS: 'athletic wear, fitted gym clothes, sports attire',
  YOGA: 'yoga attire, comfortable stretchy activewear',
  MARTIAL_ARTS: 'martial arts gi or athletic training wear',
  SPORTS: 'sports jersey or athletic team wear',
  WELLNESS: 'comfortable athleisure, relaxed health-conscious style',
  
  // ===== FOOD & CULINARY =====
  CHEF: 'professional white chef coat with apron',
  COOKING_CASUAL: 'casual apron over comfortable home clothes',
  BARISTA: 'cafe worker style, apron over casual hipster outfit',
  FOOD_REVIEW: 'smart casual, food blogger style',
  
  // ===== CREATIVE & ARTS =====
  ARTIST: 'creative casual, paint-splattered apron or artsy layers',
  MUSICIAN: 'rock casual, leather jacket or band tee style',
  FASHION: 'trendy designer outfit, fashion-forward statement piece',
  PHOTOGRAPHY: 'functional casual with camera strap aesthetic',
  
  // ===== EDUCATION =====
  TEACHER: 'smart casual teacher attire, approachable professional',
  ACADEMIC: 'professorial style, blazer with elbow patches',
  TUTOR: 'casual smart, friendly approachable educator look',
  STUDENT: 'casual student style, backpack-ready comfort',
  
  // ===== LIFESTYLE & TRAVEL =====
  TRAVEL: 'casual travel wear, comfortable light jacket, tourist style',
  ADVENTURE: 'outdoor adventure gear, hiking-ready practical wear',
  BEACH: 'resort casual, tropical vacation wear',
  URBAN_EXPLORE: 'streetwear casual, city explorer style',
  LUXURY: 'upscale elegant casual, designer accessories',
  
  // ===== ENTERTAINMENT =====
  NIGHTLIFE: 'stylish club attire, trendy evening wear',
  PARTY: 'festive party outfit, celebration ready',
  CINEMA: 'casual movie buff style, comfortable entertainment wear',
  COMEDY: 'casual relatable everyday clothes',
  
  // ===== HOME & FAMILY =====
  PARENTING: 'comfortable casual parent attire, practical family wear',
  HOME_DIY: 'work clothes, practical DIY project attire',
  GARDENING: 'outdoor gardening wear, practical earth-toned clothes',
  PETS: 'casual comfortable pet-owner style',
  
  // ===== AUTOMOTIVE & MECHANICAL =====
  AUTOMOTIVE: 'mechanic jumpsuit or car enthusiast casual',
  MOTORCYCLE: 'biker jacket, motorcycle enthusiast style',
  
  // ===== BEAUTY & PERSONAL CARE =====
  BEAUTY: 'elegant polished look, beauty influencer style',
  SKINCARE: 'clean minimal aesthetic, spa-ready fresh look',
  HAIR_STYLING: 'trendy salon professional style',
  
  // ===== SPIRITUAL & CULTURAL =====
  RELIGIOUS: 'modest respectful attire appropriate for worship',
  MEDITATION: 'comfortable loose meditation wear, zen aesthetic',
  CULTURAL_ID: 'Indonesian traditional or batik-inspired modern wear',
  CULTURAL_IN: 'Indian traditional or kurta-inspired modern wear',
  
  // ===== SCIENCE & NATURE =====
  SCIENCE: 'lab coat, scientific researcher attire',
  NATURE: 'nature documentary style, khaki outdoor wear',
  ENVIRONMENTAL: 'eco-conscious casual, sustainable fashion',
  
  // ===== FINANCE & INVESTING =====
  CRYPTO: 'tech-finance hybrid, modern smart casual',
  INVESTING: 'professional but approachable, business casual',
  REAL_ESTATE: 'polished real estate agent professional wear',
  
  // ===== TRADES & SKILLS =====
  CONSTRUCTION: 'work site attire, hard hat and safety vest',
  ELECTRICAL: 'technician uniform, practical work wear',
  CRAFTS: 'artisan workshop attire, maker aesthetic',
  
  // ===== DEFAULT =====
  DEFAULT: 'smart casual professional attire, versatile neutral'
} as const;

export type CostumeCategory = keyof typeof COSTUME_CATEGORIES;

/**
 * Get costume by category key
 */
export function getCostumeByCategory(category: string): string {
  const key = category.toUpperCase() as CostumeCategory;
  return COSTUME_CATEGORIES[key] || COSTUME_CATEGORIES.DEFAULT;
}

/**
 * Get all valid category keys (for LLM prompt)
 */
export function getCostumeCategoryKeys(): string[] {
  return Object.keys(COSTUME_CATEGORIES);
}

// ============================================================================
// LANGUAGE → ETHNICITY MAPPING (2026-01-15)
// Maps selected content language to appropriate ethnicity for B-ROLL people
// ============================================================================

export interface EthnicityContext {
  ethnicity: string;           // Primary ethnicity description
  appearance: string;          // Detailed appearance hints
  culturalHints: string;       // Cultural styling hints
}

export const LANGUAGE_ETHNICITY_MAP: Record<string, EthnicityContext> = {
  // Indonesian
  id: {
    ethnicity: 'Indonesian',
    appearance: 'Southeast Asian appearance, Indonesian features, warm brown skin tone',
    culturalHints: 'Indonesian people, local Indonesian style, Nusantara aesthetic'
  },
  // Hindi (India)
  hi: {
    ethnicity: 'Indian',
    appearance: 'South Asian appearance, Indian features, brown skin tone',
    culturalHints: 'Indian people, desi style, Bollywood-inspired aesthetic'
  },
  // English (default to American/Western)
  en: {
    ethnicity: 'American',
    appearance: 'diverse Western appearance, American features',
    culturalHints: 'American people, Western style, Hollywood aesthetic'
  },
  // Fallback
  default: {
    ethnicity: 'diverse international',
    appearance: 'diverse global appearance',
    culturalHints: 'international diverse people'
  }
};

/**
 * Get ethnicity context for B-ROLL based on content language
 * @param language - Content language code (id, hi, en) or full name (indonesian, hindi, english)
 * @returns EthnicityContext with appearance hints
 */
export function getEthnicityForLanguage(language: string): EthnicityContext {
  const langLower = (language || 'en').toLowerCase().trim();

  // Map full language names to codes
  const langNameMap: Record<string, string> = {
    'indonesian': 'id',
    'indonesia': 'id',
    'bahasa': 'id',
    'tamil': 'hi',
    'hindi': 'hi',
    'india': 'hi',
    'indian': 'hi',
    'english': 'en',
    'american': 'en',
    'uk': 'en',
    'us': 'en',
  };

  // Try full name mapping first
  if (langNameMap[langLower]) {
    return LANGUAGE_ETHNICITY_MAP[langNameMap[langLower]];
  }

  // Try first 2 characters (id, hi, en)
  const langCode = langLower.substring(0, 2);
  return LANGUAGE_ETHNICITY_MAP[langCode] || LANGUAGE_ETHNICITY_MAP.default;
}

/**
 * Build ethnicity prompt injection for B-ROLL
 * @param language - Content language code
 * @returns String to inject into B-ROLL prompts
 */
export function buildEthnicityPrompt(language: string): string {
  const ctx = getEthnicityForLanguage(language);
  return `People in scene: ${ctx.appearance}. ${ctx.culturalHints}.`;
}

// ============================================================================
// CTA EMOTION OVERRIDE (2026-01-15)
// CTA segments MUST have friendly/smile expression regardless of script emotion
// ============================================================================

export const CTA_EMOTION_OVERRIDE: EmotionSpecs = {
  expression: 'warm genuine smile, bright friendly eyes, inviting expression',
  body: 'open welcoming posture, slight forward lean',
  lighting: 'Butterfly 2:1',
  ratio: '2:1',
  promptPhrase: 'warm genuine smile, bright friendly eyes, welcoming open expression, inviting energy'
};

/**
 * Get emotion specs with CTA override
 * CTA segments always get friendly/smile expression
 */
export function getEmotionSpecsWithOverride(emotion: string, segmentType: string): EmotionSpecs {
  // CTA segments ALWAYS use friendly expression
  if (segmentType.toUpperCase() === 'CTA' || segmentType.toUpperCase() === 'ENDING_CTA') {
    return CTA_EMOTION_OVERRIDE;
  }
  
  // Other segments use specified emotion
  return getEmotionSpecs(emotion);
}
