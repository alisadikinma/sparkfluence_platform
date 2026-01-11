/**
 * METAPHOR LOOKUP - Abstract Concept → Visual Element Mapping
 * ============================================================
 * 
 * Direct O(1) lookup for translating abstract concepts to concrete visuals.
 * Used by B-roll visual extraction pipeline.
 * 
 * Source: 12-broll-visual-extraction.md
 * Last Updated: 2026-01-10
 */

// ============================================================================
// ABSTRACT → VISUAL METAPHOR MAPPINGS
// ============================================================================

export const METAPHOR_MAP: Record<string, string[]> = {
  // ========================================
  // SMARTPHONE BRANDS & PRODUCTS (2026-01-11)
  // For product comparison videos
  // ========================================
  samsung: ['Samsung Galaxy smartphone', 'Samsung phone display', 'Galaxy series lineup', 'Samsung device', 'Galaxy phone'],
  apple: ['iPhone smartphone', 'Apple device', 'iPhone display', 'iOS interface', 'Apple phone'],
  iphone: ['iPhone smartphone', 'iPhone display', 'Apple device', 'iOS interface'],
  galaxy: ['Samsung Galaxy phone', 'Galaxy display', 'Samsung smartphone', 'Galaxy device'],
  xiaomi: ['Xiaomi smartphone', 'Xiaomi device', 'Mi phone display'],
  poco: ['POCO smartphone', 'POCO phone', 'POCO device display'],
  oppo: ['OPPO smartphone', 'OPPO phone display', 'OPPO device'],
  vivo: ['Vivo smartphone', 'Vivo phone display', 'Vivo device'],
  realme: ['Realme smartphone', 'Realme phone', 'Realme device'],
  oneplus: ['OnePlus smartphone', 'OnePlus phone display', 'OnePlus device'],
  google: ['Google Pixel phone', 'Pixel smartphone', 'Google device'],
  pixel: ['Google Pixel smartphone', 'Pixel display', 'Pixel device'],
  smartphone: ['modern smartphone display', 'mobile phone screen', 'smartphone lineup', 'phone comparison'],
  phone: ['smartphone display', 'mobile device', 'phone screen', 'modern phone'],
  
  // Smartphone comparison context
  brand: ['smartphone lineup', 'phone comparison', 'device showcase', 'brand logos'],
  comparison: ['side-by-side devices', 'product comparison layout', 'versus display'],
  bandwagon: ['trending devices', 'popular smartphones', 'tech trend visualization'],
  
  // ========================================
  // TECHNOLOGY & DIGITAL
  // ========================================
  security: ['padlock', 'shield icon', 'vault door', 'fingerprint scanner', 'fortress', 'encrypted lock'],
  password: ['key and lock', 'digital keypad', 'encrypted text on screen', 'safe dial', 'password field UI'],
  encryption: ['lock with binary code', 'scrambled data visualization', 'secure tunnel', 'cipher wheel'],
  data: ['flowing streams of light', 'server racks with LEDs', 'holographic displays', 'data cubes'],
  ai: ['neural network visualization', 'brain with circuits', 'flowing data nodes', 'AI core'],
  algorithm: ['neural network nodes', 'flowchart diagram', 'decision tree', 'code visualization'],
  cloud: ['server farm', 'floating data cubes', 'interconnected nodes in sky', 'cloud servers'],
  hacking: ['red warning screens', 'skull icon', 'breaking chains', 'dark terminal', 'matrix code'],
  privacy: ['eye with shield', 'masked figure silhouette', 'hidden document', 'curtain', 'anonymous icon'],
  cybersecurity: ['digital shield', 'firewall barrier', 'protected network', 'security operations center'],
  network: ['interconnected nodes', 'web of connections', 'network topology', 'fiber optic cables'],
  software: ['code on screen', 'software interface', 'application window', 'IDE editor'],
  hardware: ['circuit board', 'computer components', 'processor chip', 'server rack'],
  automation: ['robotic arm', 'conveyor belt', 'gears turning', 'automated factory'],
  
  // ========================================
  // FINANCE & BUSINESS
  // ========================================
  cryptocurrency: ['Bitcoin coin', 'Ethereum logo', 'blockchain visualization', 'digital wallet', 'mining rig', 'candlestick chart'],
  bitcoin: ['golden Bitcoin coin', 'Bitcoin logo glowing', 'crypto wallet', 'blockchain network'],
  blockchain: ['chain links glowing', 'distributed network nodes', 'encrypted blocks', 'ledger'],
  trading: ['candlestick charts', 'dual monitors with charts', 'fast-moving ticker', 'exchange floor'],
  investment: ['growing plant with coins', 'upward graph', 'golden eggs', 'seedling in coins'],
  profit: ['rising bar chart', 'stacking coins', 'expanding circles', 'green arrows up'],
  growth: ['rising graph', 'sprouting plant', 'sunrise', 'ladder ascending', 'expanding tree'],
  loss: ['falling graph', 'cracking ice', 'storm clouds', 'red arrows down', 'broken piggy bank'],
  risk: ['dice', 'tightrope', 'cliff edge', 'storm approaching', 'warning triangle'],
  wealth: ['gold bars', 'luxury items', 'overflowing chest', 'skyscraper', 'mansion'],
  debt: ['chain and ball', 'sinking weight', 'red numbers', 'hourglass', 'bills piling up'],
  money: ['stacked bills', 'coins', 'wallet', 'safe', 'currency symbols'],
  stock: ['stock chart', 'trading floor', 'ticker tape', 'market graph'],
  market: ['trading floor', 'market graphs', 'stock exchange', 'economic indicators'],
  economy: ['city skyline', 'factory', 'global trade map', 'currency exchange'],
  
  // ========================================
  // CONCEPTS & IDEAS
  // ========================================
  innovation: ['light bulb moment', 'gears turning', 'rocket launch', 'sprouting seed', 'breakthrough'],
  success: ['mountain peak', 'trophy', 'finish line', 'sunrise over horizon', 'champagne'],
  failure: ['broken bridge', 'fallen chess piece', 'wilting plant', 'cracked ground', 'shattered glass'],
  time: ['hourglass', 'clock gears', 'calendar pages flying', 'sun and moon cycle', 'stopwatch'],
  speed: ['motion blur', 'racing elements', 'lightning bolt', 'wind trails', 'speedometer'],
  connection: ['bridge', 'handshake silhouette', 'linked chains', 'network nodes', 'puzzle pieces'],
  problem: ['tangled knots', 'maze', 'puzzle missing piece', 'roadblock', 'obstacle'],
  solution: ['key in lock', 'light through door', 'completed puzzle', 'clear path', 'eureka moment'],
  idea: ['light bulb', 'thought bubble', 'spark', 'brain visualization', 'creative explosion'],
  creativity: ['paint splatter', 'artistic tools', 'colorful explosion', 'canvas', 'imagination'],
  knowledge: ['books', 'library', 'brain visualization', 'wisdom tree', 'enlightenment'],
  learning: ['open book', 'classroom', 'graduation cap', 'ascending steps', 'growth chart'],
  
  // ========================================
  // EMOTIONS & STATES
  // ========================================
  danger: ['warning signs', 'red alert', 'cliff edge', 'storm approaching', 'skull warning'],
  safety: ['shield', 'harbor', 'umbrella in rain', 'secure fortress', 'life preserver'],
  confusion: ['foggy path', 'question marks', 'tangled wires', 'maze', 'scattered puzzle'],
  clarity: ['crystal clear water', 'magnifying glass', 'sunrise', 'clean desk', 'clear sky'],
  stress: ['pressure gauge', 'ticking bomb', 'weight on shoulders', 'storm clouds', 'cracking'],
  relief: ['weight lifting', 'sun breaking clouds', 'exhale visualization', 'calm waters'],
  hope: ['sunrise', 'rainbow', 'seedling', 'light at end of tunnel', 'new beginning'],
  fear: ['dark shadows', 'storm', 'edge of cliff', 'monster silhouette', 'darkness'],
  excitement: ['fireworks', 'sparks', 'celebration', 'energy burst', 'confetti'],
  calm: ['still water', 'zen garden', 'peaceful nature', 'meditation', 'tranquil scene'],
  
  // ========================================
  // PRODUCTIVITY & WORK
  // ========================================
  productivity: ['rising chart', 'checklist with checks', 'efficient workflow', 'productivity tools'],
  efficiency: ['streamlined process', 'well-oiled machine', 'optimized workflow', 'lean operation'],
  organization: ['filing system', 'sorted items', 'clean workspace', 'organized folders'],
  focus: ['spotlight', 'single object isolation', 'clear desk', 'target', 'laser beam'],
  deadline: ['clock ticking', 'calendar deadline', 'countdown timer', 'hourglass running out'],
  collaboration: ['puzzle pieces connecting', 'rowing team', 'bridge building', 'teamwork hands'],
  leadership: ['ship wheel', 'compass', 'leading figure', 'chess king', 'captain'],
  goal: ['target bullseye', 'finish line', 'mountain peak', 'trophy', 'flag on summit'],
  
  // ========================================
  // TECHNOLOGY TOPICS (SPECIFIC)
  // ========================================
  vpn: ['tunnel visualization', 'encrypted pathway', 'globe with shield', 'secure connection'],
  firewall: ['digital wall', 'barrier with flames', 'blocked access', 'security gate'],
  malware: ['virus visualization', 'corrupted data', 'red alerts', 'infected system'],
  phishing: ['fishing hook', 'fake email UI', 'warning sign', 'trap'],
  two_factor: ['phone with code', 'fingerprint', 'dual locks', 'verification'],
  backup: ['cloud upload', 'external drive', 'copy files', 'data protection'],
  
  // ========================================
  // CRYPTOCURRENCY (SPECIFIC)
  // ========================================
  defi: ['connected nodes', 'liquidity pools', 'smart contract', 'decentralized network'],
  nft: ['digital art frame', 'unique token', 'digital collectible', 'artwork token'],
  wallet: ['crypto wallet', 'hardware wallet', 'cold storage', 'digital vault'],
  mining: ['mining rig', 'GPU arrays', 'hash visualization', 'mining farm'],
  staking: ['locked tokens', 'growing stack', 'yield farming', 'staked coins'],
};

// ============================================================================
// TOPIC-SPECIFIC VISUAL LIBRARIES
// ============================================================================

export const TOPIC_VISUALS: Record<string, string[]> = {
  // Smartphone & Product Reviews (2026-01-11)
  'smartphone comparison': ['smartphone lineup', 'phone comparison display', 'side-by-side devices', 'flagship phones'],
  'phone review': ['smartphone display', 'phone unboxing', 'device showcase', 'phone camera'],
  'ai smartphone': ['AI-powered phone', 'smartphone AI features', 'intelligent device display', 'smart camera'],
  'ai powered': ['AI-enhanced device', 'smart technology', 'intelligent features display', 'neural processing'],
  'unboxing': ['product unboxing', 'new device reveal', 'package opening', 'first impressions'],
  'flagship': ['premium smartphone', 'flagship device', 'high-end phone', 'top-tier device'],
  'best phone': ['smartphone comparison', 'phone lineup', 'device showcase', 'top phones'],
  'samsung vs apple': ['Samsung Galaxy vs iPhone', 'phone comparison', 'flagship comparison', 'brand rivalry'],
  'phone camera': ['smartphone camera module', 'phone photography', 'camera comparison', 'lens array'],
  'phone specs': ['phone specification display', 'tech specs visualization', 'processor benchmark'],
  
  // Cybersecurity
  'password management': ['padlock', 'key', 'secure vault', 'password field UI', 'key ring'],
  'two-factor auth': ['phone with code', 'fingerprint', 'dual locks', 'verification screen'],
  'phishing': ['fishing hook', 'fake email UI', 'warning sign', 'suspicious link'],
  'malware': ['virus visualization', 'corrupted data', 'red alerts', 'infected files'],
  'vpn': ['tunnel visualization', 'encrypted pathway', 'globe with shield'],
  'firewall': ['digital wall', 'barrier with flames', 'blocked access', 'security gate'],
  
  // Cryptocurrency
  'bitcoin basics': ['Bitcoin coin', 'blockchain links', 'wallet', 'BTC symbol'],
  'crypto trading': ['candlestick charts', 'exchange interface', 'price ticker', 'trading screen'],
  'crypto mining': ['mining rig', 'GPU cards', 'hash visualization', 'mining farm'],
  'wallet security': ['hardware wallet', 'cold storage', 'vault', 'secure backup'],
  'market analysis': ['charts', 'graphs', 'data visualization', 'trend lines'],
  'defi': ['connected nodes', 'liquidity pools', 'smart contract visualization'],
  
  // Productivity
  'time management': ['clock', 'calendar', 'hourglass', 'schedule', 'planner'],
  'goal setting': ['target', 'checklist', 'mountain peak', 'milestone markers'],
  'focus': ['spotlight', 'single object isolation', 'clear desk', 'distraction-free'],
  'automation': ['gears', 'conveyor belt', 'robots', 'workflow diagram'],
  'organization': ['filing system', 'sorted items', 'clean workspace', 'folders'],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get visual metaphors for a single concept (O(1) lookup)
 */
export function getVisualsForConcept(concept: string): string[] {
  const key = concept.toLowerCase().replace(/[-\s]+/g, '_');
  return METAPHOR_MAP[key] || [];
}

/**
 * Extract all visual metaphors from text
 * Scans text for known abstract concepts and returns their visual mappings
 */
export function extractVisualsFromText(text: string): string[] {
  const textLower = text.toLowerCase();
  const found: Set<string> = new Set();
  
  // Check each concept in the map
  for (const [concept, visuals] of Object.entries(METAPHOR_MAP)) {
    // Normalize concept to check (handle underscores)
    const conceptWords = concept.replace(/_/g, ' ');
    
    if (textLower.includes(conceptWords) || textLower.includes(concept)) {
      visuals.forEach(v => found.add(v));
    }
  }
  
  return [...found];
}

/**
 * Get topic-specific visuals (O(1) lookup)
 */
export function getTopicVisuals(topic: string): string[] {
  const topicLower = topic.toLowerCase();
  
  // Exact match first
  if (TOPIC_VISUALS[topicLower]) {
    return TOPIC_VISUALS[topicLower];
  }
  
  // Partial match
  for (const [key, visuals] of Object.entries(TOPIC_VISUALS)) {
    if (topicLower.includes(key) || key.includes(topicLower)) {
      return visuals;
    }
  }
  
  // Fall back to concept extraction
  return extractVisualsFromText(topic);
}

/**
 * Identify abstract concepts in text that need metaphor translation
 */
export function identifyAbstractConcepts(text: string): string[] {
  const textLower = text.toLowerCase();
  const found: string[] = [];
  
  for (const concept of Object.keys(METAPHOR_MAP)) {
    const conceptWords = concept.replace(/_/g, ' ');
    if (textLower.includes(conceptWords) || textLower.includes(concept)) {
      found.push(concept);
    }
  }
  
  return found;
}

/**
 * Build visual brief from script text
 * Two-stage extraction: Script → Visual Brief → Cinematic Prompt
 */
export interface VisualBrief {
  topic_keywords: string[];
  abstract_concepts: string[];
  visual_elements: string[];
  primary_visual: string;
  secondary_elements: string[];
  image_prompt: string;  // Generated cinematic prompt
}

// Priority keywords that should be checked FIRST (brands, products)
const PRIORITY_KEYWORDS = [
  'samsung', 'apple', 'iphone', 'galaxy', 'xiaomi', 'poco', 'oppo', 'vivo',
  'realme', 'oneplus', 'google', 'pixel', 'huawei', 'honor', 'motorola',
  'smartphone', 'phone', 'laptop', 'tablet', 'bitcoin', 'ethereum', 'crypto'
];

// Context detection patterns for smarter prompts
const CONTEXT_PATTERNS = {
  comparison: {
    patterns: ['vs', 'versus', 'compare', 'comparison', 'better', 'best', 'which', 'from.*to', 'or'],
    visualStyle: 'side-by-side comparison layout',
    shotType: 'wide shot'
  },
  ranking: {
    patterns: ['top', 'best', 'worst', '#1', 'number one', 'ranking', 'winner'],
    visualStyle: 'podium or trophy display',
    shotType: 'medium shot'
  },
  ai_tech: {
    patterns: ['ai', 'artificial intelligence', 'smart', 'intelligent', 'machine learning', 'neural'],
    visualStyle: 'futuristic AI interface with glowing elements',
    shotType: 'close-up'
  },
  trend: {
    patterns: ['trend', 'bandwagon', 'everyone', 'popular', 'viral', 'hype'],
    visualStyle: 'trending upward graph or wave pattern',
    shotType: 'dynamic angle'
  },
  reveal: {
    patterns: ['secret', 'hidden', 'reveal', 'discover', 'find out', 'truth'],
    visualStyle: 'unveiling or spotlight reveal',
    shotType: 'dramatic lighting'
  },
  warning: {
    patterns: ['danger', 'warning', 'careful', 'stop', 'avoid', 'mistake'],
    visualStyle: 'warning signs or caution elements',
    shotType: 'urgent framing'
  }
};

// Shot type variations to avoid monotony
const SHOT_VARIATIONS = [
  { shot: 'Cinematic close-up', desc: 'detailed view' },
  { shot: 'Cinematic medium shot', desc: 'contextual view' },
  { shot: 'Cinematic wide establishing shot', desc: 'environmental context' },
  { shot: 'Dramatic low-angle shot', desc: 'powerful perspective' },
  { shot: 'Bird\'s eye view', desc: 'overhead perspective' },
  { shot: 'Dynamic Dutch angle', desc: 'energetic framing' },
];

// Lighting variations
const LIGHTING_VARIATIONS = [
  'soft ambient lighting with blue accents',
  'dramatic Rembrandt lighting with deep shadows',
  'high-key bright lighting with minimal shadows',
  'warm golden hour lighting',
  'cool futuristic neon lighting',
  'moody chiaroscuro lighting',
];

/**
 * Detect context from script to generate appropriate visuals
 */
function detectContext(text: string): { context: string; style: string; shot: string } | null {
  const textLower = text.toLowerCase();
  
  for (const [contextName, config] of Object.entries(CONTEXT_PATTERNS)) {
    for (const pattern of config.patterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(textLower)) {
        return {
          context: contextName,
          style: config.visualStyle,
          shot: config.shotType
        };
      }
    }
  }
  
  return null;
}

/**
 * Get varied shot based on script hash (deterministic but varied)
 */
function getVariedShot(scriptText: string): { shot: string; desc: string } {
  // Simple hash to get consistent but varied results
  let hash = 0;
  for (let i = 0; i < scriptText.length; i++) {
    hash = ((hash << 5) - hash) + scriptText.charCodeAt(i);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % SHOT_VARIATIONS.length;
  return SHOT_VARIATIONS[index];
}

/**
 * Get varied lighting based on script hash
 */
function getVariedLighting(scriptText: string): string {
  let hash = 0;
  for (let i = 0; i < scriptText.length; i++) {
    hash = ((hash << 3) + hash) + scriptText.charCodeAt(i);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % LIGHTING_VARIATIONS.length;
  return LIGHTING_VARIATIONS[index];
}

export function buildVisualBrief(scriptText: string, topic: string): VisualBrief {
  const scriptLower = scriptText.toLowerCase();
  const topicLower = topic.toLowerCase();
  
  // 0. DETECT CONTEXT first (comparison, AI, trend, etc.)
  const contextInfo = detectContext(scriptText);
  
  // 1. Check for priority keywords (brands/products)
  const priorityVisuals: string[] = [];
  const detectedBrands: string[] = [];
  
  for (const keyword of PRIORITY_KEYWORDS) {
    if (scriptLower.includes(keyword) || topicLower.includes(keyword)) {
      const visuals = METAPHOR_MAP[keyword];
      if (visuals && visuals.length > 0) {
        priorityVisuals.push(...visuals);
        detectedBrands.push(keyword);
      }
    }
  }
  
  // 2. Get topic-based and text-based visuals
  const abstracts = identifyAbstractConcepts(scriptText);
  const topicVisuals = getTopicVisuals(topic);
  const textVisuals = extractVisualsFromText(scriptText);
  
  // 3. Combine with deduplication
  const seen = new Set<string>();
  const allVisuals: string[] = [];
  
  // Add priority visuals first
  for (const v of priorityVisuals) {
    const key = v.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      allVisuals.push(v);
    }
  }
  
  // Then topic visuals
  for (const v of topicVisuals) {
    const key = v.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      allVisuals.push(v);
    }
  }
  
  // Then text-extracted (filter generic security if products exist)
  const hasProductVisuals = priorityVisuals.length > 0;
  for (const v of textVisuals) {
    const key = v.toLowerCase();
    if (hasProductVisuals && (key.includes('padlock') || key.includes('shield') || key.includes('vault'))) {
      continue;
    }
    if (!seen.has(key)) {
      seen.add(key);
      allVisuals.push(v);
    }
  }
  
  // 4. Build contextual primary visual
  let primary = allVisuals[0] || 'modern technology visualization';
  let contextualModifier = '';
  
  // Apply context-specific modifications
  if (contextInfo) {
    if (contextInfo.context === 'comparison' && detectedBrands.length >= 2) {
      // Multiple brands in comparison context
      primary = `side-by-side ${detectedBrands[0]} and ${detectedBrands[1]} smartphones comparison display`;
      contextualModifier = 'arranged in versus layout';
    } else if (contextInfo.context === 'ai_tech') {
      // AI/tech context - add futuristic elements
      contextualModifier = 'with AI neural network overlay and glowing interface elements';
    } else if (contextInfo.context === 'trend') {
      // Trend/bandwagon context
      if (hasProductVisuals) {
        primary = `array of flagship smartphones showcasing ${topic || 'latest technology trends'}`;
      }
      contextualModifier = 'with trending indicators and wave patterns';
    } else if (contextInfo.context === 'ranking') {
      contextualModifier = 'with podium or ranking visualization';
    } else if (contextInfo.context === 'reveal') {
      contextualModifier = 'with dramatic spotlight and unveiling effect';
    } else if (contextInfo.context === 'warning') {
      contextualModifier = 'with warning indicators and cautionary elements';
    }
  }
  
  const secondary = allVisuals.slice(1, 4);
  
  // 5. Get VARIED shot and lighting (avoid monotony)
  const shotInfo = getVariedShot(scriptText);
  const lighting = getVariedLighting(scriptText);
  
  // Logging
  console.log(`[buildVisualBrief] Script: "${scriptText.substring(0, 80)}..."`);
  console.log(`[buildVisualBrief] Context detected: ${contextInfo?.context || 'none'}`);
  console.log(`[buildVisualBrief] Brands found: ${detectedBrands.join(', ') || 'none'}`);
  console.log(`[buildVisualBrief] Primary visual: "${primary}"`);
  console.log(`[buildVisualBrief] Shot type: ${shotInfo.shot}`);
  
  // 6. Build contextual cinematic prompt (ENHANCED 2026-01-11 - target 400+ chars)
  const secondaryStr = secondary.length > 0 
    ? `Supporting visual elements include ${secondary.slice(0, 3).join(', ')}, creating depth and context.`
    : '';
  
  const contextStr = contextualModifier ? `Scene composition ${contextualModifier}.` : '';
  
  // Camera specs based on shot type
  const cameraSpecs = shotInfo.shot.includes('close-up')
    ? '85mm f/1.8 lens, shallow depth of field'
    : shotInfo.shot.includes('wide')
      ? '35mm anamorphic lens, deep focus'
      : '50mm f/2.8 lens, moderate depth of field';
  
  // Lighting setup based on context
  const lightingSetup = contextInfo?.context === 'ai_tech'
    ? 'Cyan and blue accent lighting with subtle rim light separation, tech noir atmosphere'
    : contextInfo?.context === 'warning'
      ? 'High contrast dramatic lighting with red accent warnings'
      : `${lighting}, professional three-point setup with soft fill`;
  
  const image_prompt = `${shotInfo.shot} of ${primary}.
${contextStr}
${secondaryStr}

Camera: ${cameraSpecs}, ${shotInfo.desc}
Composition: Rule of thirds, visual hierarchy emphasizing main subject

Lighting: ${lightingSetup}
Color temperature: 5600K neutral with creative color accents

Film Stock: Kodak Vision3 500T tungsten
Color Grade: Cinematic teal-orange with lifted shadows
Atmosphere: ${contextInfo?.context === 'mystery' ? 'Atmospheric haze with volumetric rays' : 'Clean professional with subtle depth haze'}

Environment: Modern tech studio appropriate for ${topic || 'technology content'}
Background: Contextual elements with moderate bokeh separation

Style: Cinematic photorealistic, Hollywood production quality.
Technical: Portrait 1024×1792, 8K detail.
Clean frame, no text overlays, no watermarks, no UI elements.`;
  
  console.log(`[buildVisualBrief] Generated prompt length: ${image_prompt.length} chars`);
  
  return {
    topic_keywords: topic.split(/\s+/).filter(w => w.length > 3),
    abstract_concepts: abstracts,
    visual_elements: allVisuals,
    primary_visual: primary,
    secondary_elements: secondary,
    image_prompt,
  };
}

// ============================================================================
// NEGATIVE PROMPT TEMPLATES
// ============================================================================

export const NEGATIVE_PROMPTS = {
  // Quality issues only (DEFAULT - humans allowed)
  general: 'blurry, low quality, distorted, artifacts, noise, grain, pixelated, compression artifacts',
  // Text/watermark exclusion
  no_text: 'text, watermark, logo, signature, username, label, caption, subtitle, overlay, UI elements',
  // Style exclusion (keep photorealistic)
  no_style: 'cartoon, anime, illustration, painting, drawing, sketch, 3D render, CGI, digital art',
  // Combined quality + text + style (NO human exclusion - humans allowed in all segments)
  combined: 'blurry, low quality, distorted, artifacts, text, watermark, logo, cartoon, anime, illustration, painting, oversaturated, underexposed, flat lighting, cheap CGI',
};

/**
 * Get negative prompt for B-roll
 * NOTE: Humans are ALLOWED in all segments. Only creator face differs (HOOK/CTA use reference image).
 * @param type - Type of negative prompt: 'general' | 'no_text' | 'no_style' | 'combined'
 * @returns Negative prompt string for fal.ai wan/v2.6
 */
export function getBRollNegativePrompt(
  type: keyof typeof NEGATIVE_PROMPTS = 'combined'
): string {
  return NEGATIVE_PROMPTS[type] || NEGATIVE_PROMPTS.combined;
}
