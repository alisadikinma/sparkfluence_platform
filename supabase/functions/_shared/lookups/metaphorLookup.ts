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

export function buildVisualBrief(scriptText: string, topic: string): VisualBrief {
  const abstracts = identifyAbstractConcepts(scriptText);
  const topicVisuals = getTopicVisuals(topic);
  const textVisuals = extractVisualsFromText(scriptText);
  
  // Combine and dedupe
  const allVisuals = [...new Set([...topicVisuals, ...textVisuals])];
  
  const primary = allVisuals[0] || 'abstract data visualization';
  const secondary = allVisuals.slice(1, 4);
  
  // Build cinematic image prompt from visual elements
  const secondaryStr = secondary.length > 0 
    ? `Secondary elements: ${secondary.join(', ')}.` 
    : '';
  
  const image_prompt = `Cinematic close-up of ${primary}.
${secondaryStr}
Environment: Modern tech setting with soft ambient lighting.
Film stock: Vision3 500T. Color: Teal-orange grade.
Professional cinematography, 8K quality.
ABSOLUTELY NO human face, NO person, NO hands, NO body parts visible.
Focus ONLY on objects, technology, and environment.
Clean frame, no text, no watermarks.`;
  
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
  general: 'blurry, low quality, distorted, artifacts, noise, grain, pixelated, compression artifacts',
  no_humans: 'human, person, face, body, hands, fingers, portrait, selfie, crowd, people, figure, silhouette',
  no_text: 'text, watermark, logo, signature, username, label, caption, subtitle, overlay, UI elements',
  no_style: 'cartoon, anime, illustration, painting, drawing, sketch, 3D render, CGI, digital art',
  combined: 'blurry, low quality, distorted, artifacts, human face, person, text, watermark, logo, cartoon, anime, illustration, painting, oversaturated, underexposed, flat lighting, cheap CGI, generic stock photo',
};

/**
 * Get negative prompt for B-roll by type
 * @param type - Type of negative prompt: 'general' | 'no_humans' | 'no_text' | 'no_style' | 'combined'
 * @returns Negative prompt string for fal.ai wan/v2.6
 */
export function getBRollNegativePrompt(
  type: keyof typeof NEGATIVE_PROMPTS = 'combined'
): string {
  return NEGATIVE_PROMPTS[type] || NEGATIVE_PROMPTS.combined;
}
