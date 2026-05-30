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
  layout?: string;          // full, split-60-40, split-50-50, pip, creator-center
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
  
  // Layout-aware framing hints for split-screen / PiP compositing
  const layout = params.layout || 'full';
  let layoutFraming = '';
  if (layout === 'split-60-40' || layout === 'split-50-50') {
    layoutFraming = '\nFraming: Subject framed from waist up (medium shot), clean edges for split-screen compositing. Subject centered in frame.';
  } else if (layout === 'pip') {
    layoutFraming = '\nFraming: Close-up portrait from chest up, clean simple background for picture-in-picture overlay.';
  } else if (layout === 'creator-center') {
    layoutFraming = '\nFraming: Subject centered in frame with generous clean background around them for overlay compositing.';
  }

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
Clean frame, no text overlays, no watermarks, no UI elements.${layoutFraming}${visualReference ? `\nVisual reference: ${visualReference} inspired lighting and color palette.` : ''}`;

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

// ============================================================================
// HOOK EXPRESSION MAP (2026-03-09)
// Maps hook category → anatomical expression spec for video HOOK segments
// Unlike EMOTION_MAP (general), these are calibrated specifically for:
//   - 9:16 portrait framing
//   - 5-second sustained expression (not just 1 freeze frame)
//   - Creator-facing camera (direct address)
// ============================================================================

export interface HookExpressionSpec {
  eyes: string;         // Eye shape, direction, intensity
  mouth: string;        // Mouth position, tension, movement
  head: string;         // Head angle, tilt, position
  body: string;         // Shoulder/torso/posture disposition
  gesture: string;      // Hand/arm movement in frame
  promptPhrase: string; // Ready-to-paste phrase for image/video prompt
}

export const HOOK_EXPRESSION_MAP: Record<string, HookExpressionSpec> = {
  visual_shock: {
    eyes:       'eyes blown open to maximum width, pupils dilated, whites visible all around iris, eyebrows raised to hairline',
    mouth:      'jaw dropped open 2-3 cm, lips parted, corners slightly drawn back in shock reflex',
    head:       'micro-recoil backward, chin slightly tucked — the "did I just see that" involuntary flinch',
    body:       'shoulders raised, spine straight, slight backward lean — full-body freeze response',
    gesture:    'hands raised to chest or face level, open palms forward — involuntary "stop" gesture',
    promptPhrase: 'eyes blown wide with shock, jaw dropped open, micro-recoil backward, hands raised to chest level in frozen disbelief — sustained across 5 seconds',
  },
  negative_bias: {
    eyes:       'narrowed intense stare, heavy lower lids, slight squint — "I know something you don\'t" look',
    mouth:      'lips pressed together in tight line or one corner pulled down in serious displeasure, no smile',
    head:       'slight chin-down tilt, head angled 10-15 degrees — makes gaze feel more authoritative and threatening',
    body:       'shoulders square to camera, chest slightly forward — power stance, no retreat',
    gesture:    'one index finger raised as warning point, or arms crossed over chest, or hand palm-flat in "stop" signal',
    promptPhrase: 'intense narrowed stare with heavy lids, lips pressed tight, chin slightly down, shoulders squared and forward — serious warning energy held for 5 seconds',
  },
  curiosity_gap: {
    eyes:       'bright wide eyes with slight upward squint — the "I know a secret" sparkle, one eyebrow raised higher than the other',
    mouth:      'asymmetric smile — one side raised into knowing smirk, corner twitching with suppressed excitement',
    head:       'subtle head tilt 20 degrees to one side — the universal "interesting..." lean',
    body:       'slight forward lean toward camera, shoulders relaxed — conspiratorial closeness',
    gesture:    'hand raised with one finger pointed upward as if about to reveal something, or fingers touching lips as if holding back information',
    promptPhrase: 'one eyebrow arched with knowing sparkle in eyes, asymmetric smirk pulling one corner, slight head tilt toward camera, finger raised as if about to share a secret — held for 5 seconds',
  },
  relatability: {
    eyes:       'warm crinkled eyes — the "I\'ve been there too" look, slightly soft focus at outer corners indicating genuine connection',
    mouth:      'soft natural smile, relaxed lips, slight upward curve — authentic not performative, teeth optionally visible',
    head:       'slight nod or level gaze — equal eye contact, not looking up or down, peer-to-peer connection',
    body:       'relaxed open shoulders, slight lean back into comfort — non-threatening, approachable, like talking to a friend',
    gesture:    'open palm toward viewer or gentle finger-point as if saying "you know how it is" — inclusive body language',
    promptPhrase: 'warm crinkled eyes with genuine smile, relaxed open posture, level eye contact, open palm gesture toward camera — sustained authentic connection energy for 5 seconds',
  },
  speed_value: {
    eyes:       'bright focused eyes, slightly wider than neutral — high-energy alertness, the "pay attention, this is good" look',
    mouth:      'confident smile with energy, slightly open as if about to deliver rapid information, jaw slightly forward',
    head:       'head level, direct engagement — no tilt, straight-on power position for authority delivery',
    body:       'upright energized posture, shoulders back and down — ready stance, kinetic energy contained',
    gesture:    'both hands active and visible — counting gesture, pointing forward, or chopping motion to emphasize points',
    promptPhrase: 'bright alert focused eyes, confident energized smile, upright direct posture, hands active with pointing or counting gestures — high-energy value-delivery expression held for 5 seconds',
  },
};

/**
 * Get expression spec for a given hook category.
 * Returns visual_shock spec as default fallback.
 */
export function getHookExpression(hookCategory: string): HookExpressionSpec {
  return HOOK_EXPRESSION_MAP[hookCategory] ?? HOOK_EXPRESSION_MAP['visual_shock'];
}

// ============================================================================
// HOOK LIGHTING MAP (2026-03-09)
// Maps hook category → specific lighting recipe for video HOOK segments
// Each recipe reinforces the psychological intent of the hook category.
// Calibrated for 9:16 portrait, creator-facing, 5-second sustained.
// ============================================================================

export interface HookLightingSpec {
  pattern: string;      // Lighting pattern name (Rembrandt, butterfly, etc.)
  ratio: string;        // Key:fill ratio (e.g., "4:1")
  keyTemp: string;      // Key light color temperature
  fill: string;         // Fill light description
  rim: string;          // Rim/hair light description
  accent: string;       // Accent/background light color
  mood: string;         // One-line mood description
  promptPhrase: string; // Ready-to-paste phrase for image/video prompt
}

export const HOOK_LIGHTING_MAP: Record<string, HookLightingSpec> = {
  visual_shock: {
    pattern:    'Rembrandt hard shadow',
    ratio:      '4:1',
    keyTemp:    '3200K warm tungsten',
    fill:       'Minimal cold fill (CTB-gelled, 1/4 power) — creates hard shadow triangle under eye',
    rim:        'Sharp rim light from directly behind, no diffusion — creates separation halo',
    accent:     'None or deep red/orange backlight for tension',
    mood:       'Dramatic chiaroscuro — harsh contrast that visually amplifies the shock moment',
    promptPhrase: 'Rembrandt 4:1 ratio, 3200K warm key light, hard shadows creating triangle under eye, sharp rim halo, deep contrast chiaroscuro — dramatic urgent lighting',
  },
  negative_bias: {
    pattern:    'Short-side loop lighting',
    ratio:      '3:1',
    keyTemp:    '3800K neutral-warm',
    fill:       'Gentle warm fill from opposite side (2:1 max) — retains shadow depth without harsh black',
    rim:        'Subtle warm rim from behind-left or behind-right — defines silhouette without glow',
    accent:     'Red-amber gel on background: deepens the warning/threat energy subconsciously',
    mood:       'Authoritative and slightly ominous — you will listen to this person',
    promptPhrase: 'Short-side 3:1 loop lighting, 3800K neutral-warm key, gentle warm fill, red-amber background accent — authoritative with subtle threat undertone',
  },
  curiosity_gap: {
    pattern:    'Soft Rembrandt (diffused)',
    ratio:      '3:1 soft',
    keyTemp:    '3200K warm golden',
    fill:       'Warm soft fill that wraps shadows rather than killing them — mystery preserved',
    rim:        'Warm hair/rim light adds depth and intrigue — slight golden halo effect',
    accent:     'Deep teal or blue-purple background gel — creates cinematic mystery atmosphere',
    mood:       'Intimate and mysterious — golden warm light with deep shadow pools inviting exploration',
    promptPhrase: 'Soft Rembrandt 3:1, 3200K warm golden key, wrapping warm fill, golden rim halo, deep teal-blue background — cinematic mystery inviting atmosphere',
  },
  relatability: {
    pattern:    'Soft loop (window-like)',
    ratio:      '2:1',
    keyTemp:    '3500K natural daylight',
    fill:       'Large soft fill matching key temp — minimizes shadows, maximizes approachability',
    rim:        'Very soft or no rim — natural look, not theatrical',
    accent:     'Natural warm tones, no dramatic color gels — familiar daytime living space feel',
    mood:       'Natural and approachable — soft even light that says "I\'m just like you"',
    promptPhrase: 'Soft loop 2:1 ratio, 3500K natural daylight, large even fill, no dramatic rim — natural approachable window light feel',
  },
  speed_value: {
    pattern:    'Clean butterfly (Paramount)',
    ratio:      '2:1',
    keyTemp:    '4000K neutral-warm',
    fill:       'Clean fill maintaining brightness without shadows — high clarity, professional look',
    rim:        'Clean separation light from directly behind — crisp definition, broadcast quality',
    accent:     'Neutral or subtle green-teal background — slight tech/forward-thinking energy',
    mood:       'Bright, clean, and credible — high-energy clarity that says "this information is valuable"',
    promptPhrase: 'Butterfly Paramount 2:1, 4000K neutral-warm, clean bright fill, crisp separation rim, neutral background — clean broadcast-quality professional energy',
  },
};

/**
 * Get lighting spec for a given hook category.
 * Returns speed_value spec as default fallback (clean, safe).
 */
export function getHookLighting(hookCategory: string): HookLightingSpec {
  return HOOK_LIGHTING_MAP[hookCategory] ?? HOOK_LIGHTING_MAP['speed_value'];
}

/**
 * Build a combined expression + lighting prompt phrase for HOOK segments.
 * Merges the promptPhrase from both maps for direct use in image prompts.
 */
export function buildHookVisualPrompt(hookCategory: string): string {
  const expr = getHookExpression(hookCategory);
  const light = getHookLighting(hookCategory);
  return `${expr.promptPhrase}. Lighting: ${light.promptPhrase}.`;
}


// ============================================================================
// VISUAL ACTION SYNERGY MATRIX (2026-03-09)
// Source: ai-image-carousel-prompt-gen/references/hook-visual-library.md Section 6
//
// When hook category + visual action are BOTH specified, these synergies produce
// more precise expression + pose than each in isolation.
// Key: `hookCategory:visualAction` → use '_fallback' rule if no primary synergy.
// ============================================================================

export interface SynergyRule {
  expressionOverride: string;
  poseOverride: string;
  promptPhrase: string;
}

export const VISUAL_ACTION_SYNERGY_MATRIX: Record<string, SynergyRule | { rule: string }> = {
  'visual_shock:destruction': {
    expressionOverride: 'shocked mid-rip, aggressive both-hands action, jaw dropped',
    poseOverride: 'hands actively tearing/destroying prop, body leaning into action, fragments flying',
    promptPhrase: 'creator mid-destruction, shocked jaw-drop face, aggressive energy, both hands ripping prop, fragments mid-air, full-body commitment',
  },
  'visual_shock:scale_absurd': {
    expressionOverride: 'dwarfed awe, eyes wide looking up at oversized prop, mouth agape',
    poseOverride: 'one hand reaching toward enormous object, body dwarfed by scale, neck craned upward',
    promptPhrase: 'creator tiny next to enormous prop, eyes wide in disbelief looking upward, hand reaching toward scale object',
  },
  'visual_shock:frozen_mid_action': {
    expressionOverride: 'suspended shock — expression caught mid-reaction, not before or after',
    poseOverride: 'entire body frozen in peak-motion frame, motion blur on extremities, eyes wide',
    promptPhrase: 'creator body completely frozen mid-action, motion blur on hands, expression caught at peak shock moment, suspended in time',
  },
  'negative_bias:minum_dramatic': {
    expressionOverride: 'warning intensity over rim — concern eyes locked on camera while sipping',
    poseOverride: 'mug/cup raised to lip, eyes locked directly over rim, slight frown brow',
    promptPhrase: 'creator drinking slowly with intense warning eyes locked over rim of cup, frown brow, measured deliberate energy',
  },
  'negative_bias:objek_absurd': {
    expressionOverride: 'deadpan serious warning with completely absurd prop — zero reaction to the absurdity',
    poseOverride: 'holding absurd object at chest with serious straight-arm grip, zero smile, direct confrontational gaze',
    promptPhrase: 'creator holding wildly absurd object with completely deadpan serious expression, treating it as a normal warning prop',
  },
  'curiosity_gap:satisfying_process': {
    expressionOverride: 'knowing smirk locked on camera while performing satisfying action — eyes never leave viewer',
    poseOverride: 'side profile doing satisfying action (pouring/slicing/peeling), eyes turned to camera, slight smile',
    promptPhrase: 'creator performing satisfying action in side profile, eyes locked on camera with knowing smirk, answer about to be revealed',
  },
  'curiosity_gap:extreme_closeup': {
    expressionOverride: 'macro curiosity — fragment of expression revealing nothing but suggesting everything',
    poseOverride: 'only partial face or hands visible, extreme crop hides more than reveals',
    promptPhrase: 'extreme macro closeup — only eyes or only hands with object, severe crop that hides more than reveals, mystery maximized',
  },
  'relatability:wrong_context': {
    expressionOverride: 'authentic relatable expression in absurd setting — acting like it is completely normal',
    poseOverride: 'casual relaxed posture in completely wrong setting, treating absurd environment as mundane',
    promptPhrase: 'creator with authentic relatable casual expression in completely wrong environment — pajamas at boardroom, casual at formal — treated as totally normal',
  },
  'relatability:mundane_zen': {
    expressionOverride: 'calm zen island in chaos storm — serene face while everything around is mayhem',
    poseOverride: 'seated or standing calmly, props flying/falling around, eyes closed or peaceful direct gaze',
    promptPhrase: 'creator in perfect zen calm, genuine peaceful expression, while objects chaotically fly and fall around them',
  },
  'speed_value:props_overflow': {
    expressionOverride: 'confident authority buried in tool abundance — not overwhelmed, owns the chaos',
    poseOverride: 'surrounded by overflowing topic-related tools, confident direct posture, one hand gesturing toward tools',
    promptPhrase: 'creator surrounded by abundant overflow of relevant tools, confident authoritative expression, gesturing toward the abundance',
  },
  '_fallback': {
    rule: 'pose/body/hands from visual_action; eyes/mouth from hook_category HOOK_EXPRESSION_MAP; lighting ALWAYS from HOOK_LIGHTING_MAP; camera from ANTI_REPETITION_VARIANTS[A]',
  },
};

export function getVisualSynergy(hookCategory: string, visualAction: string): SynergyRule | null {
  const key = `${hookCategory}:${visualAction}`;
  const rule = VISUAL_ACTION_SYNERGY_MATRIX[key];
  if (!rule || 'rule' in rule) return null;
  return rule as SynergyRule;
}


// ============================================================================
// ANTI-REPETITION VARIANTS (2026-03-09)
// Source: hook-visual-library.md Section 7
// Rotate A → B → C for same hook category across multiple content pieces.
// ============================================================================

export interface VariantSpec {
  name: string;
  camera: string;
  lightingMod: string;
  envMod: string;
  expressionIntensity: string;
}

export const ANTI_REPETITION_VARIANTS: Record<string, [VariantSpec, VariantSpec, VariantSpec]> = {
  visual_shock: [
    { name: 'A: Classic Impact',     camera: 'CU 85mm eye-level',    lightingMod: '4:1 Rembrandt warm',    envMod: 'dark disrupted background, scattered objects, warm-cool clash',      expressionIntensity: 'peak shock — full frozen recoil, jaw dropped, hands up' },
    { name: 'B: Dynamic Angle',      camera: 'MCU 50mm low angle',   lightingMod: '3:1 strong cool rim',   envMod: 'industrial concrete blue-teal background, harsh texture',             expressionIntensity: 'aggressive shock — leaning INTO the surprise, active not passive' },
    { name: 'C: Intimate Disbelief', camera: 'CU 135mm dutch tilt',  lightingMod: '5:1 hard spotlight',    envMod: 'near-black void, single warm source, zero distraction',              expressionIntensity: 'quiet internal shock — wide eyes, closed mouth, stunned silence' },
  ],
  negative_bias: [
    { name: 'A: Direct Warning',     camera: 'MCU 85mm eye-level',   lightingMod: '3:1 warm underlit',     envMod: 'dark minimal — exposed brick or dark wood, subtle texture',           expressionIntensity: 'firm confrontational — stop gesture, direct gaze, set jaw' },
    { name: 'B: Authority Concern',  camera: 'MCU 50mm high angle',  lightingMod: '2:1 warm overhead',     envMod: 'dark wood office, warm desk lamp, serious professional setting',       expressionIntensity: 'worried mentor — pointing with concern, furrowed brow, head shake' },
    { name: 'C: Full-Body Stop',     camera: 'MS 35mm eye-level',    lightingMod: '3:1 red accent side',   envMod: 'deep black with danger-red practical light accent',                   expressionIntensity: 'physical urgency — full body leaning forward, both hands up, wide eyes' },
  ],
  curiosity_gap: [
    { name: 'A: Classic Mystery',    camera: 'MCU 85mm slight angle', lightingMod: '4:1 warm Rembrandt',   envMod: 'warm library or golden interior, rich textured background',            expressionIntensity: 'knowing smirk — one side of mouth, eyes narrowed slightly' },
    { name: 'B: Intimate Secret',    camera: 'CU 135mm low angle',   lightingMod: '3:1 warm amber only',   envMod: 'near-dark candle-quality light, mystery shadow pools',                 expressionIntensity: 'intense whisper — lips parted, leaning in toward camera' },
    { name: 'C: Tease Reveal',       camera: 'MS 50mm centered',     lightingMod: '2:1 bright warm',       envMod: 'atmospheric room, blurred reveal prop in foreground',                  expressionIntensity: 'excited anticipation — barely holding back smile, eyes wide with contained excitement' },
  ],
  relatability: [
    { name: 'A: Cafe Conversation',  camera: 'MCU 50mm slight offset',lightingMod: '2:1 soft loop',        envMod: 'cafe or desk with coffee and laptop, warm recognizable lifestyle',      expressionIntensity: 'warm recognition — oh-you-too moment, head nod, knowing smile' },
    { name: 'B: Bedroom Real',       camera: 'MCU 85mm high angle',  lightingMod: '1.5:1 soft window',     envMod: 'bedroom or couch with string lights, authentic personal space',          expressionIntensity: 'vulnerable honesty — genuine micro-expressions, real emotion' },
    { name: 'C: On-the-Go',         camera: 'MS 35mm eye-level',    lightingMod: '2:1 golden backlight',   envMod: 'outdoor urban casual, natural golden hour',                            expressionIntensity: 'casual confident — walking toward camera, relaxed genuine smile, dynamic energy' },
  ],
  speed_value: [
    { name: 'A: Studio Authority',   camera: 'MCU 85mm centered',    lightingMod: '2:1 butterfly clean',   envMod: 'clean professional studio backdrop, organized workspace signals',        expressionIntensity: 'calm confident — direct unwavering gaze, composed authority' },
    { name: 'B: Proof Setup',        camera: 'MS 50mm low angle',    lightingMod: '2:1 cool backlight',    envMod: 'workspace with visible screens/tools showing results in background',    expressionIntensity: 'active teaching — mid-explanation energy, hand gesturing, engaged lean' },
    { name: 'C: Intimate Expertise', camera: 'MCU 35mm eye-level',   lightingMod: '2:1 warm side key',    envMod: 'home setup with tools of craft, warm personal competence environment',    expressionIntensity: 'approachable expert — close warm delivery, personal confidence, friendly authority' },
  ],
};

export function getVariantSpec(hookCategory: string, variant: 'A' | 'B' | 'C' = 'A'): VariantSpec {
  const variants = ANTI_REPETITION_VARIANTS[hookCategory] ?? ANTI_REPETITION_VARIANTS['speed_value'];
  const idx = variant === 'A' ? 0 : variant === 'B' ? 1 : 2;
  return variants[idx];
}


// ============================================================================
// WARDROBE LIBRARY (2026-03-09)
// Source: hook-visual-library.md Section 10
// Priority: user override → scene context → topic category
// ============================================================================

export interface WardrobeSpec {
  elements: string;
  palette: string;
  promptPhrase: string;
}

export const WARDROBE_LIBRARY: Record<string, WardrobeSpec> = {
  finance_investment: {
    elements: 'navy blazer, crisp white shirt, tailored trousers, leather watch',
    palette: 'navy/charcoal/white/gold',
    promptPhrase: 'wearing a fitted navy blazer over crisp white dress shirt, tailored trousers, leather watch — polished financial authority',
  },
  tech_ai: {
    elements: 'dark charcoal hoodie, slim joggers or dark jeans, wireless earbuds, matte texture',
    palette: 'charcoal/black/slate/dark gray',
    promptPhrase: 'dark minimalist tech hoodie, slim dark pants, wireless earbuds, clean matte dark aesthetic — silicon valley builder energy',
  },
  health_fitness: {
    elements: 'athletic tank top or performance tee, training pants or shorts, fitness tracker',
    palette: 'energetic pops on neutral base — black/white/neon accent',
    promptPhrase: 'athletic performance wear — fitted training tank or tee, performance pants, fitness tracker — active health-forward energy',
  },
  food_cooking: {
    elements: 'canvas apron over casual fitted tee, rolled sleeves, kitchen towel tucked in',
    palette: 'natural/cream/warm earth tones',
    promptPhrase: 'canvas apron over casual fitted tee with rolled sleeves, kitchen towel tucked — authentic home chef energy',
  },
  education_tutorial: {
    elements: 'light blue oxford button-up, dark chinos, rolled sleeves (approachable authority)',
    palette: 'soft blue/navy/khaki/white',
    promptPhrase: 'light blue oxford button-up with rolled sleeves, dark chinos — approachable educator authority',
  },
  business_startup: {
    elements: 'crisp white or light button-up, dark tailored trousers, minimal leather accessory',
    palette: 'white/light gray/charcoal/dark navy',
    promptPhrase: 'crisp white business button-up, dark tailored trousers, clean minimal watch — startup founder meets boardroom energy',
  },
  lifestyle_travel: {
    elements: 'relaxed linen shirt or casual overshirt, comfortable chinos or linen pants, travel accessories',
    palette: 'earth tones — beige/tan/warm white/dusty blue',
    promptPhrase: 'relaxed linen overshirt, comfortable chinos, travel accessories — effortless adventurer energy',
  },
  productivity_tools: {
    elements: 'clean minimalist crewneck or sweater, dark slim jeans, smart watch',
    palette: 'clean neutrals — white/gray/navy/black',
    promptPhrase: 'clean minimalist crewneck sweater, dark slim jeans, smart watch — focused productive energy',
  },
  creative_design: {
    elements: 'oversized graphic tee under denim jacket, wide-leg pants, creative accessories (rings, layered)',
    palette: 'creative contrast — denim/black with graphic print',
    promptPhrase: 'oversized graphic tee layered under denim jacket, relaxed wide-leg pants, creative accessories — designer creative director energy',
  },
  news_current_events: {
    elements: 'structured dark blazer or suit jacket, clean black turtleneck, tailored trousers',
    palette: 'authoritative dark — charcoal/black/dark navy',
    promptPhrase: 'structured dark blazer over clean black turtleneck, tailored trousers — journalistic authority, broadcast-ready gravitas',
  },
  gaming_esports: {
    elements: 'gaming jersey or branded hoodie, casual joggers',
    palette: 'team colors or RGB-adjacent — dark with neon accent',
    promptPhrase: 'gaming jersey or branded gaming hoodie, comfortable joggers — authentic esports competitor energy',
  },
  default: {
    elements: 'clean fitted button-up shirt, dark well-fitted jeans, simple watch',
    palette: 'versatile neutral — white/blue/dark gray/black',
    promptPhrase: 'clean fitted button-up, dark jeans, simple watch — smart casual versatile presence',
  },
};

export const SCENE_COSTUME_OVERRIDES: Record<string, string> = {
  'night market': 'casual streetwear tee, relaxed shorts or pants, comfortable footwear',
  'pasar malam': 'casual streetwear tee, relaxed shorts, comfortable street footwear',
  'beach': 'casual tank top, board shorts or light beach pants, sandals',
  'pantai': 'casual tank top, board shorts, sandals',
  'kitchen': 'canvas apron over casual fitted tee, rolled sleeves, kitchen towel tucked in',
  'dapur': 'canvas apron over casual fitted tee, rolled sleeves',
  'gym': 'athletic wear — performance tee, training pants, fitness tracker',
  'lab': 'lab coat over smart casual button-up',
  'construction': 'high-visibility safety vest over workwear',
  'rooftop': 'smart casual — relaxed blazer or overshirt over clean tee',
  'formal': 'full suit or blazer + dress shirt + tie',
  'office': 'business casual — button-up or blazer over smart casual',
  'classroom': 'smart casual — button-up or polo, dark pants',
  'outdoor': 'outdoor casual — linen shirt or light jacket, comfortable bottoms',
  'home': 'relaxed hoodie or casual crewneck, comfortable pants — authentic home energy',
};

export function resolveWardrobe(topicCategory: string, sceneContext?: string): WardrobeSpec {
  if (sceneContext) {
    const sceneKey = Object.keys(SCENE_COSTUME_OVERRIDES).find(k =>
      sceneContext.toLowerCase().includes(k)
    );
    if (sceneKey && SCENE_COSTUME_OVERRIDES[sceneKey]) {
      const phrase = SCENE_COSTUME_OVERRIDES[sceneKey];
      return { elements: phrase, palette: 'scene-appropriate', promptPhrase: phrase };
    }
  }
  return WARDROBE_LIBRARY[topicCategory] ?? WARDROBE_LIBRARY['default'];
}


// ============================================================================
// PROP INTERACTION SYSTEM (2026-03-09)
// Source: hook-visual-library.md Section 11
// ============================================================================

export interface PropBank {
  topicRelated: string[];
  randomAbsurd: string[];
}

export interface PropInteraction {
  propSource: 'topicRelated' | 'randomAbsurd' | 'either';
  interaction: string;
  promptDetail: string;
}

export const TOPIC_PROP_BANK: Record<string, PropBank> = {
  finance_investment: {
    topicRelated: ['briefcase', 'stock chart printout', 'gold coins', 'financial calculator', 'business newspaper'],
    randomAbsurd: ['rubber duck', 'giant lollipop', 'inflatable flamingo', 'toy dinosaur', 'balloon sword'],
  },
  tech_ai: {
    topicRelated: ['laptop showing code', 'circuit board', 'USB drive', 'mechanical keyboard', 'smartwatch'],
    randomAbsurd: ['oversized pencil', 'retro flip phone', 'abacus', 'crystal ball', 'wind-up toy'],
  },
  health_fitness: {
    topicRelated: ['protein shake bottle', 'resistance band', 'gym towel', 'stopwatch', 'nutrition label'],
    randomAbsurd: ['oversized trophy', 'tiny bicycle', 'inflatable dumbbell', 'crown', 'cape'],
  },
  food_cooking: {
    topicRelated: ['wooden spoon', 'fresh ingredients', 'cast iron pan', 'chef knife', 'cookbook'],
    randomAbsurd: ['tiny umbrella cocktail', 'giant fork', 'confetti cannon', 'bouquet of vegetables', 'disco ball'],
  },
  education_tutorial: {
    topicRelated: ['textbook', 'whiteboard marker', 'graduation hat', 'notebook and pencil', 'pointer stick'],
    randomAbsurd: ['oversized pencil', 'wizard hat', 'globe', 'magic wand', 'toy microscope'],
  },
  business_startup: {
    topicRelated: ['pitch deck print', 'coffee cup', 'business card', 'planner', 'pen and notebook'],
    randomAbsurd: ['pirate flag', 'toy rocket', 'golden egg', 'monopoly money', 'tiny suitcase'],
  },
  lifestyle_travel: {
    topicRelated: ['passport', 'vintage map', 'camera', 'travel journal', 'luggage tag'],
    randomAbsurd: ['inflatable globe', 'tiny sombrero', 'rubber duck with sunglasses', 'miniature Eiffel Tower', 'compass'],
  },
  productivity_tools: {
    topicRelated: ['sticky notes', 'open planner', 'mechanical keyboard', 'laptop', 'to-do list'],
    randomAbsurd: ['hourglass', 'toy robot', 'abacus', 'stress ball', 'rubber stamp'],
  },
  gaming_esports: {
    topicRelated: ['gaming controller', 'headset', 'gaming mouse', 'energy drink can', 'keyboard'],
    randomAbsurd: ['golden trophy', 'crown', 'cape', 'toy sword', 'neon sign'],
  },
  creative_design: {
    topicRelated: ['sketchbook', 'color palette swatches', 'stylus pen', 'camera', 'color swatch fan'],
    randomAbsurd: ['oversized crayon', 'paint explosion', 'giant eraser', 'kaleidoscope', 'confetti cannon'],
  },
  default: {
    topicRelated: ['microphone', 'notepad', 'phone', 'coffee cup', 'book'],
    randomAbsurd: ['rubber duck', 'giant pencil', 'confetti cannon', 'toy trophy', 'balloon'],
  },
};

export const VISUAL_ACTION_PROP_INTERACTION: Record<string, PropInteraction> = {
  makan_nyeleneh: {
    propSource: 'either',
    interaction: 'BITES',
    promptDetail: 'creator caught mid-bite into prop, crumbs or residue visible, eyes locked directly on camera mid-chew',
  },
  minum_dramatic: {
    propSource: 'either',
    interaction: 'DRINKS',
    promptDetail: 'prop (mug/glass/bottle) raised to lip, eyes locked directly over rim, deliberate slow dramatic sip',
  },
  objek_absurd: {
    propSource: 'randomAbsurd',
    interaction: 'HOLDS deadpan',
    promptDetail: 'creator holding completely absurd prop at chest height with straight arm, deadpan flat expression, treating it as perfectly normal',
  },
  destruction: {
    propSource: 'topicRelated',
    interaction: 'RIPS/BREAKS',
    promptDetail: 'creator mid-destruction — hands actively ripping or breaking prop, fragments caught mid-air, aggressive forward energy',
  },
  satisfying_process: {
    propSource: 'topicRelated',
    interaction: 'PERFORMS satisfying action',
    promptDetail: 'creator performing peak moment of satisfying action (pouring, slicing, peeling, stacking) — caught at peak of the satisfaction',
  },
  scale_absurd: {
    propSource: 'either',
    interaction: 'DWARFED by oversized prop',
    promptDetail: 'creator standing next to comically oversized prop — dwarfed by scale, one hand reaching toward enormous object',
  },
  wrong_context: {
    propSource: 'topicRelated',
    interaction: 'USES normally in absurd setting',
    promptDetail: 'creator using normal topic-related prop in completely wrong setting — prop is normal, environment is absurd, creator treats it as mundane',
  },
  frozen_mid_action: {
    propSource: 'either',
    interaction: 'FROZEN mid-throw/catch',
    promptDetail: 'creator completely frozen mid-action — body suspended at peak motion, motion blur on prop and extremities, everything else sharp',
  },
  extreme_closeup: {
    propSource: 'topicRelated',
    interaction: 'MACRO of hands + prop',
    promptDetail: 'extreme macro closeup of creator hands interacting with prop — every texture hyper-visible, face intentionally cropped out',
  },
  props_overflow: {
    propSource: 'topicRelated',
    interaction: 'SURROUNDED by many props',
    promptDetail: 'creator surrounded by and partially buried in abundant overflow of topic-related props — stacked, overflowing, falling in abundance',
  },
  contradiction_pose: {
    propSource: 'topicRelated',
    interaction: 'EMOTIONAL MISMATCH with prop',
    promptDetail: 'creator expression completely contradicts the prop — smiling brightly while holding ominous prop, OR horrified while holding cheerful prop',
  },
  mundane_zen: {
    propSource: 'either',
    interaction: 'ZEN amid prop chaos',
    promptDetail: 'creator perfectly calm while props fly, fall, scatter chaotically around them — serene island in a prop storm',
  },
};

export const HOOK_PROP_RULE: Record<string, 'topicRelated' | 'randomAbsurd'> = {
  visual_shock: 'randomAbsurd',
  negative_bias: 'topicRelated',
  curiosity_gap: 'topicRelated',
  relatability: 'topicRelated',
  speed_value: 'topicRelated',
};

export function resolvePropContext(
  hookCategory: string,
  visualAction: string,
  topicCategory: string
): { propType: string; interaction: PropInteraction | null; propPool: string[] } {
  const propRule = HOOK_PROP_RULE[hookCategory] ?? 'topicRelated';
  const bank = TOPIC_PROP_BANK[topicCategory] ?? TOPIC_PROP_BANK['default'];
  const interaction = VISUAL_ACTION_PROP_INTERACTION[visualAction] ?? null;
  const effectiveSource = interaction?.propSource === 'either'
    ? propRule
    : (interaction?.propSource ?? propRule);
  const propPool = effectiveSource === 'randomAbsurd' ? bank.randomAbsurd : bank.topicRelated;
  return { propType: effectiveSource, interaction, propPool };
}


// ============================================================================
// ENVIRONMENT PALETTE (2026-03-09)
// Source: hook-visual-library.md Section 5
// Background/environment spec per hook category for HOOK and CTA segments.
// ============================================================================

export interface EnvironmentSpec {
  background: string;
  palette: string;
  propsInFrame: string;
  blur: string;
  depthLayers: string[];
  avoid: string;
  promptPhrase: string;
}

export const ENVIRONMENT_PALETTE: Record<string, EnvironmentSpec> = {
  visual_shock: {
    background: 'Dynamic disrupted — scattered papers, tipped objects, motion blur elements, or stark minimalist void',
    palette: 'High contrast warm-cool clash — 3200K tungsten on subject, cool blue-teal in background',
    propsInFrame: 'Visual action object prominent in foreground, aftermath elements scattered',
    blur: 'f/1.8 circular bokeh, background dissolving into abstract shapes',
    depthLayers: [
      'Foreground: action detail or prop fragment — sharp',
      'Subject: dramatic warm lighting — sharp',
      'Background: disrupted chaos + bokeh dissolve',
    ],
    avoid: 'Calm orderly backgrounds, neutral tones, corporate clean — contradicts shock energy',
    promptPhrase: 'dark disrupted background, scattered objects and aftermath, high contrast warm-cool color clash, f/1.8 circular bokeh, background dissolving into chaos',
  },
  negative_bias: {
    background: 'Dark minimal texture — exposed brick, dark wood, deep black void with subtle surface detail',
    palette: 'Dark warm browns + deep blacks, single warm key cutting through, faint red-amber danger accent',
    propsInFrame: 'Minimal — one subtle danger signal (red light, warning sign silhouette), nothing cluttered',
    blur: 'f/1.8 dark warm bokeh, background nearly black with texture hint',
    depthLayers: [
      'Foreground: stop-gesture hand or warning element — sharp',
      'Subject: underlit serious face, warm key side',
      'Background: dark void, faint warm practical, minimal texture',
    ],
    avoid: 'Bright cheerful environments, colorful props, cluttered backgrounds',
    promptPhrase: 'dark minimal textured background — exposed brick or dark void, single warm key, faint red-amber danger accent, deep dramatic shadow, warning atmosphere',
  },
  curiosity_gap: {
    background: 'Warm atmospheric — library, candle-lit study, cozy workshop with depth and mystery shadow pools',
    palette: 'Warm ambers and deep golds — #C98B3F, #8B6914 palette, warm shadows, golden practical light',
    propsInFrame: 'One partially hidden object — covered item, closed box, shadow silhouette of something unseen',
    blur: 'f/1.8 large warm golden bokeh orbs from practical lights, creating depth and mystery',
    depthLayers: [
      'Foreground: hidden teaser object — intentionally blurred or partially visible',
      'Subject: knowing expression in warm Rembrandt light',
      'Background: warm atmospheric depth + golden bokeh orbs',
    ],
    avoid: 'Clinical bright settings, stark minimal cold, fully revealed objects',
    promptPhrase: 'warm atmospheric background — library or candle-lit study, deep amber-gold tones, large bokeh golden orbs, mystery shadow pools, partially hidden object in foreground',
  },
  relatability: {
    background: 'Authentic recognizable lifestyle — home desk, cafe corner, bedroom, couch with everyday items',
    palette: 'Warm naturals — cream, soft brown, sage green, warm wood tones, nothing oversaturated',
    propsInFrame: 'Everyday recognizable items naturally placed — coffee mug, phone, laptop, notebook, plant',
    blur: 'f/2.0 soft warm lifestyle bokeh, background readable enough to identify the space',
    depthLayers: [
      'Foreground: lifestyle prop naturally placed',
      'Subject: relatable posture, warm loop lighting',
      'Background: recognizable room, warm practicals, soft blur',
    ],
    avoid: 'Studio setups, stark minimal, luxury locations, anything creating distance instead of identification',
    promptPhrase: 'warm recognizable lifestyle environment — home desk or cozy cafe, everyday props scattered, soft 2:1 loop lighting, warm naturals palette, readable background with lifestyle details',
  },
  speed_value: {
    background: 'Clean professional context — organized modern workspace, competence signals visible',
    palette: 'Clean neutrals with professional warmth — white, warm gray, warm wood, subtle screen blue accent',
    propsInFrame: 'Tools of expertise subtly visible — screens showing results, books, relevant product/tool',
    blur: 'f/2.8 soft clean professional bokeh — background slightly readable (competence signals)',
    depthLayers: [
      'Foreground: product or hand gesture — sharp value signal',
      'Subject: confident creator, butterfly lighting',
      'Background: organized workspace, screen glow, competence signals — slightly soft',
    ],
    avoid: 'Messy backgrounds, dark moody, overly casual, anything undermining professional authority',
    promptPhrase: 'clean organized professional background — modern workspace, subtle screen glow, competence signals visible, 2:1 butterfly lighting, bright clean palette, f/2.8 professional bokeh',
  },
};

export function getEnvironmentSpec(hookCategory: string): EnvironmentSpec {
  return ENVIRONMENT_PALETTE[hookCategory] ?? ENVIRONMENT_PALETTE['speed_value'];
}

/**
 * Build a full HOOK visual prompt combining expression + lighting + environment + camera variant.
 * Enhanced version of buildHookVisualPrompt() that includes environment and camera context.
 */
export function buildHookFullVisualPrompt(hookCategory: string, variant: 'A' | 'B' | 'C' = 'A'): string {
  const expr = getHookExpression(hookCategory);
  const light = getHookLighting(hookCategory);
  const env = getEnvironmentSpec(hookCategory);
  const v = getVariantSpec(hookCategory, variant);
  return `${expr.promptPhrase}. Lighting: ${light.promptPhrase}. Environment: ${env.promptPhrase}. Camera: ${v.camera}.`;
}
