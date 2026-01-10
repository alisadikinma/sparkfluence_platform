/**
 * PRODUCT KEYWORDS LOOKUP - Smart Entity Detection for Stock Image Search
 * ========================================================================
 * 
 * Detects product/brand mentions in script text to trigger stock image search.
 * 
 * KEY PRINCIPLE: Search for SPECIFIC models, not generic categories.
 * Example: "POCO X5 Pro" → search "POCO X5 Pro" (NOT "smartphone")
 * 
 * Priority:
 *   1. Specific product model (POCO X5 Pro, iPhone 15 Pro Max)
 *   2. Brand + product type (Samsung Galaxy, Apple Watch)
 *   3. Generic category only if nothing specific found
 * 
 * Last Updated: 2026-01-11
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ProductEntity {
  term: string;           // Original term found (e.g., "POCO X5 Pro")
  category: string;       // Category for fallback
  searchQuery: string;    // Optimized search query
  useStockImage: boolean; // Should use stock vs AI-generated
  confidence: 'high' | 'medium' | 'low';  // Detection confidence
}

export interface ProductSearchDecision {
  useStockImage: boolean;
  searchQuery: string | null;
  category: string | null;
  detectedProducts: ProductEntity[];
  reason: string;
}

// ============================================================================
// BRAND DATABASE - Known brands for detection
// ============================================================================

const TECH_BRANDS: Record<string, { category: string; variations: string[] }> = {
  // Smartphones
  'apple': { category: 'smartphone', variations: ['iphone', 'apple'] },
  'samsung': { category: 'smartphone', variations: ['samsung', 'galaxy'] },
  'xiaomi': { category: 'smartphone', variations: ['xiaomi', 'mi', 'redmi', 'poco'] },
  'poco': { category: 'smartphone', variations: ['poco'] },
  'oppo': { category: 'smartphone', variations: ['oppo', 'realme', 'oneplus'] },
  'vivo': { category: 'smartphone', variations: ['vivo', 'iqoo'] },
  'google': { category: 'smartphone', variations: ['pixel', 'google pixel'] },
  'sony': { category: 'smartphone', variations: ['sony', 'xperia'] },
  'huawei': { category: 'smartphone', variations: ['huawei', 'honor'] },
  'motorola': { category: 'smartphone', variations: ['motorola', 'moto'] },
  'nokia': { category: 'smartphone', variations: ['nokia'] },
  'asus': { category: 'smartphone', variations: ['asus', 'rog phone', 'zenfone'] },
  'infinix': { category: 'smartphone', variations: ['infinix'] },
  'tecno': { category: 'smartphone', variations: ['tecno'] },
  'nothing': { category: 'smartphone', variations: ['nothing phone'] },
  
  // Laptops/Computers
  'macbook': { category: 'laptop', variations: ['macbook', 'mac'] },
  'thinkpad': { category: 'laptop', variations: ['thinkpad', 'lenovo'] },
  'dell': { category: 'laptop', variations: ['dell', 'xps', 'alienware', 'inspiron'] },
  'hp': { category: 'laptop', variations: ['hp', 'pavilion', 'spectre', 'envy', 'omen'] },
  'acer': { category: 'laptop', variations: ['acer', 'predator', 'nitro'] },
  'msi': { category: 'laptop', variations: ['msi'] },
  'razer': { category: 'laptop', variations: ['razer', 'blade'] },
  
  // Wearables
  'apple watch': { category: 'smartwatch', variations: ['apple watch'] },
  'galaxy watch': { category: 'smartwatch', variations: ['galaxy watch', 'samsung watch'] },
  'garmin': { category: 'smartwatch', variations: ['garmin'] },
  'fitbit': { category: 'smartwatch', variations: ['fitbit'] },
  
  // Audio
  'airpods': { category: 'earbuds', variations: ['airpods'] },
  'sony wh': { category: 'headphones', variations: ['sony wh', 'wh-1000'] },
  'bose': { category: 'headphones', variations: ['bose', 'quietcomfort'] },
  'jbl': { category: 'speaker', variations: ['jbl'] },
  
  // Crypto Hardware
  'ledger': { category: 'hardware_wallet', variations: ['ledger', 'ledger nano'] },
  'trezor': { category: 'hardware_wallet', variations: ['trezor'] },
  
  // Gaming
  'playstation': { category: 'gaming', variations: ['playstation', 'ps5', 'ps4', 'dualshock', 'dualsense'] },
  'xbox': { category: 'gaming', variations: ['xbox', 'series x', 'series s'] },
  'nintendo': { category: 'gaming', variations: ['nintendo', 'switch'] },
  'steam deck': { category: 'gaming', variations: ['steam deck'] },
};

// Cryptocurrency terms (special handling)
const CRYPTO_TERMS: Record<string, string> = {
  'bitcoin': 'bitcoin cryptocurrency',
  'btc': 'bitcoin cryptocurrency',
  'ethereum': 'ethereum cryptocurrency',
  'eth': 'ethereum cryptocurrency',
  'crypto': 'cryptocurrency digital',
  'blockchain': 'blockchain technology',
  'nft': 'nft digital art',
  'defi': 'defi decentralized finance',
};

// Generic category keywords (lowest priority)
const GENERIC_KEYWORDS: Record<string, { category: string; searchQuery: string }> = {
  'smartphone': { category: 'smartphone', searchQuery: 'smartphone mobile phone' },
  'handphone': { category: 'smartphone', searchQuery: 'smartphone mobile' },
  'hp': { category: 'smartphone', searchQuery: 'smartphone mobile device' },
  'laptop': { category: 'laptop', searchQuery: 'laptop computer' },
  'tablet': { category: 'tablet', searchQuery: 'tablet device' },
  'headphone': { category: 'audio', searchQuery: 'headphones audio' },
  'earbuds': { category: 'audio', searchQuery: 'wireless earbuds' },
  'smartwatch': { category: 'smartwatch', searchQuery: 'smartwatch wearable' },
  'server': { category: 'technology', searchQuery: 'server data center' },
  'dashboard': { category: 'software', searchQuery: 'dashboard analytics' },
  'workspace': { category: 'productivity', searchQuery: 'modern workspace office' },
  'trading': { category: 'finance', searchQuery: 'stock trading charts' },
  'investment': { category: 'finance', searchQuery: 'investment finance growth' },
};

// ============================================================================
// MODEL NUMBER PATTERNS
// Regex patterns to detect product model numbers
// ============================================================================

const MODEL_PATTERNS: RegExp[] = [
  // iPhone patterns: iPhone 15, iPhone 15 Pro, iPhone 15 Pro Max
  /iphone\s*\d+\s*(pro\s*max|pro|plus|mini)?/gi,
  
  // Samsung Galaxy: Galaxy S24, Galaxy S24 Ultra, Galaxy A54
  /galaxy\s*[a-z]?\d+\s*(ultra|plus|\+|fe|lite)?/gi,
  
  // Xiaomi/POCO/Redmi: POCO X5 Pro, Redmi Note 12, Xiaomi 14
  /(?:poco|redmi|xiaomi|mi)\s*(?:note\s*)?\w*\s*\d+\s*(?:pro|ultra|lite|plus|\+)?/gi,
  
  // Sony: Sony Xperia 1 V, Sony WH-1000XM5
  /(?:sony\s*)?(?:xperia|wh-?)\s*\d+\s*(?:[a-z]+\s*\d*)?/gi,
  
  // General model pattern: Brand + alphanumeric model
  /(?:vivo|oppo|realme|oneplus|huawei|honor|motorola|moto|nokia|asus|infinix|tecno)\s+[a-z]*\s*\d+\s*(?:pro|ultra|lite|plus|\+|[a-z])?/gi,
  
  // MacBook patterns
  /macbook\s*(?:air|pro)?\s*(?:m\d+)?(?:\s*\d+(?:"|inch)?)?/gi,
  
  // Laptop models: ThinkPad X1, Dell XPS 15
  /(?:thinkpad|xps|spectre|pavilion|inspiron|predator|nitro|omen|blade)\s*[a-z]*\s*\d+/gi,
  
  // Smartwatch: Apple Watch Series 9, Galaxy Watch 6
  /(?:apple\s*watch|galaxy\s*watch|garmin|fitbit)\s*(?:series\s*)?\d*\s*(?:ultra|pro|classic)?/gi,
  
  // Audio: AirPods Pro 2, Sony WH-1000XM5
  /airpods\s*(?:pro|max)?\s*\d*/gi,
  
  // Gaming: PS5, Xbox Series X, Nintendo Switch
  /(?:ps|playstation)\s*\d+|xbox\s*(?:series\s*[xs]|one)|nintendo\s*switch\s*(?:oled|lite)?/gi,
  
  // Crypto wallets: Ledger Nano X, Trezor Model T
  /(?:ledger\s*nano|trezor\s*model)\s*[a-z]/gi,
  
  // ========================================================================
  // STANDALONE MODEL PATTERNS (without brand prefix)
  // These catch "M4 Pro", "X5 Pro", "GT Neo" etc. WITHOUT brand
  // ========================================================================
  // Pattern: Letter + Number + Pro/Ultra/Max/Plus (e.g., M4 Pro, X5 Pro, F5 Pro)
  /\b[A-Z]\d+\s*(pro|ultra|max|plus|lite)\b/gi,
  
  // Pattern: GT/ROG/Find/Reno + optional Neo + Number (e.g., GT 5, GT Neo 5, Find X7)
  /\b(GT|ROG|ZenFone|Find|Reno)\s*(?:Neo\s*)?\d+\s*(pro|ultra|plus)?/gi,
  
  // Pattern: Note + Number (e.g., Note 12, Note 13 Pro) - standalone
  /\bNote\s*\d+\s*(pro|ultra|plus|lite)?/gi,
];

// ============================================================================
// SMARTPHONE CONTEXT KEYWORDS
// If these words appear, increase confidence that model is a smartphone
// ============================================================================

const SMARTPHONE_CONTEXT_KEYWORDS: string[] = [
  // Camera specs
  'camera', 'mp', 'megapixel', '200mp', '108mp', '50mp', '64mp', '48mp',
  'selfie', 'ultrawide', 'telephoto', 'zoom', 'ois',
  // Battery specs  
  'battery', 'mah', '5000mah', '6000mah', '4500mah', 'charging', 'watt',
  'fast charging', 'quick charge',
  // Display specs
  'amoled', 'oled', 'lcd', 'display', 'screen', 'refresh rate', 'hz',
  '120hz', '90hz', 'fhd', 'qhd',
  // Performance specs
  'snapdragon', 'dimensity', 'mediatek', 'exynos', 'bionic', 'processor',
  'ram', 'storage', 'gb',
  // Phone-specific terms
  'smartphone', 'phone', 'handphone', 'hp', 'mobile', 'unboxing', 'review',
  'flagship', 'mid-range', 'budget phone',
];

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

/**
 * Extract specific product models from text
 * Returns array of detected model names (most specific first)
 */
function extractProductModels(text: string): string[] {
  const models: string[] = [];
  const textLower = text.toLowerCase();
  
  for (const pattern of MODEL_PATTERNS) {
    const matches = text.matchAll(new RegExp(pattern));
    for (const match of matches) {
      const model = match[0].trim();
      if (model.length >= 3 && !models.includes(model.toLowerCase())) {
        models.push(model);
      }
    }
  }
  
  // Sort by length (longer = more specific)
  models.sort((a, b) => b.length - a.length);
  
  return models;
}

/**
 * Detect brand mentions in text
 */
function detectBrands(text: string): Array<{ brand: string; category: string }> {
  const textLower = text.toLowerCase();
  const detected: Array<{ brand: string; category: string }> = [];
  
  for (const [brand, info] of Object.entries(TECH_BRANDS)) {
    for (const variation of info.variations) {
      if (textLower.includes(variation.toLowerCase())) {
        if (!detected.some(d => d.brand === brand)) {
          detected.push({ brand, category: info.category });
        }
        break;
      }
    }
  }
  
  return detected;
}

/**
 * Detect crypto terms in text
 */
function detectCryptoTerms(text: string): Array<{ term: string; searchQuery: string }> {
  const textLower = text.toLowerCase();
  const detected: Array<{ term: string; searchQuery: string }> = [];
  
  for (const [term, searchQuery] of Object.entries(CRYPTO_TERMS)) {
    if (textLower.includes(term)) {
      detected.push({ term, searchQuery });
    }
  }
  
  return detected;
}

/**
 * Detect generic category keywords
 */
function detectGenericKeywords(text: string): Array<{ term: string; category: string; searchQuery: string }> {
  const textLower = text.toLowerCase();
  const detected: Array<{ term: string; category: string; searchQuery: string }> = [];
  
  for (const [keyword, info] of Object.entries(GENERIC_KEYWORDS)) {
    // Use word boundary to avoid partial matches
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(textLower)) {
      detected.push({ term: keyword, ...info });
    }
  }
  
  return detected;
}

// ============================================================================
// BRAND-SPECIFIC SEARCH QUERIES
// When only brand is mentioned (no model), use these optimized queries
// ============================================================================

const BRAND_SEARCH_QUERIES: Record<string, string> = {
  // Smartphones
  'apple': 'iPhone Apple smartphone',
  'samsung': 'Samsung Galaxy smartphone',
  'xiaomi': 'Xiaomi smartphone',
  'poco': 'POCO smartphone',
  'oppo': 'OPPO smartphone',
  'vivo': 'Vivo smartphone',
  'realme': 'Realme smartphone',
  'oneplus': 'OnePlus smartphone',
  'google': 'Google Pixel phone',
  'huawei': 'Huawei smartphone',
  'honor': 'Honor smartphone',
  'motorola': 'Motorola phone',
  'nokia': 'Nokia smartphone',
  'asus': 'ASUS ROG phone',
  'infinix': 'Infinix smartphone',
  'tecno': 'Tecno smartphone',
  'nothing': 'Nothing Phone',
  'sony': 'Sony Xperia phone',
  
  // Laptops
  'macbook': 'MacBook laptop Apple',
  'thinkpad': 'ThinkPad laptop Lenovo',
  'dell': 'Dell laptop',
  'hp': 'HP laptop',
  'acer': 'Acer laptop',
  'msi': 'MSI gaming laptop',
  'razer': 'Razer Blade laptop',
  'lenovo': 'Lenovo laptop',
  
  // Wearables
  'garmin': 'Garmin smartwatch',
  'fitbit': 'Fitbit fitness tracker',
  
  // Audio
  'airpods': 'Apple AirPods',
  'bose': 'Bose headphones',
  'jbl': 'JBL speaker',
  
  // Gaming
  'playstation': 'PlayStation PS5 console',
  'xbox': 'Xbox console',
  'nintendo': 'Nintendo Switch',
};

/**
 * Main detection function - comprehensive product entity detection
 */
export function detectProductEntities(text: string): ProductEntity[] {
  const entities: ProductEntity[] = [];
  
  // 1. HIGH PRIORITY: Specific product models (e.g., "Galaxy S24", "iPhone 15 Pro")
  const models = extractProductModels(text);
  for (const model of models) {
    const brands = detectBrands(model);
    const category = brands.length > 0 ? brands[0].category : 'technology';
    
    entities.push({
      term: model,
      category,
      searchQuery: model, // Use exact model name!
      useStockImage: true,
      confidence: 'high'
    });
  }
  
  // 2. MEDIUM-HIGH PRIORITY: Brand-only mentions (e.g., "Samsung", "Apple")
  // Only if no specific model already detected for that brand
  const detectedBrands = detectBrands(text);
  for (const brandInfo of detectedBrands) {
    // Skip if we already have a specific model for this brand
    const hasModelForBrand = entities.some(e => 
      e.term.toLowerCase().includes(brandInfo.brand.toLowerCase())
    );
    
    if (!hasModelForBrand) {
      // Get optimized search query for this brand
      const searchQuery = BRAND_SEARCH_QUERIES[brandInfo.brand.toLowerCase()] || 
        `${brandInfo.brand} ${brandInfo.category}`;
      
      entities.push({
        term: brandInfo.brand,
        category: brandInfo.category,
        searchQuery: searchQuery,
        useStockImage: true,
        confidence: 'medium'  // Brand-only is medium confidence
      });
    }
  }
  
  // 3. MEDIUM PRIORITY: Crypto terms (specific enough)
  const cryptoTerms = detectCryptoTerms(text);
  for (const crypto of cryptoTerms) {
    // Skip if already detected as part of a model
    if (!entities.some(e => e.term.toLowerCase().includes(crypto.term))) {
      entities.push({
        term: crypto.term,
        category: 'cryptocurrency',
        searchQuery: crypto.searchQuery,
        useStockImage: true,
        confidence: 'medium'
      });
    }
  }
  
  // 4. LOW PRIORITY: Generic keywords (only if nothing specific found)
  if (entities.length === 0) {
    const genericTerms = detectGenericKeywords(text);
    for (const generic of genericTerms) {
      entities.push({
        term: generic.term,
        category: generic.category,
        searchQuery: generic.searchQuery,
        useStockImage: true,
        confidence: 'low'
      });
    }
  }
  
  return entities;
}

/**
 * Check if text contains any product that should use stock images
 */
export function shouldUseStockImage(text: string): boolean {
  const entities = detectProductEntities(text);
  return entities.some(e => e.useStockImage);
}

/**
 * Get the best search query for detected products
 * Prioritizes specific models over generic terms
 */
export function getProductSearchQuery(text: string): string | null {
  const entities = detectProductEntities(text);
  if (entities.length === 0) return null;
  
  // Sort by confidence (high > medium > low) then by term length (longer first)
  const sorted = entities.sort((a, b) => {
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    const confDiff = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
    if (confDiff !== 0) return confDiff;
    return b.term.length - a.term.length;
  });
  
  return sorted[0].searchQuery;
}

/**
 * Get product category
 */
export function getProductCategory(text: string): string | null {
  const entities = detectProductEntities(text);
  if (entities.length === 0) return null;
  return entities[0].category;
}

// ============================================================================
// INTEGRATION HELPER - Used by generate-images handler
// ============================================================================

/**
 * Decide whether to use stock image search for a script segment
 * 
 * @param scriptText - The script/voiceover text
 * @param topic - The overall video topic
 * @returns Decision with search query and reasoning
 */
export function decideImageSource(
  scriptText: string,
  topic: string
): ProductSearchDecision {
  // Combine script and topic for comprehensive detection
  const combinedText = `${scriptText} ${topic}`;
  const entities = detectProductEntities(combinedText);
  
  if (entities.length === 0) {
    return {
      useStockImage: false,
      searchQuery: null,
      category: null,
      detectedProducts: [],
      reason: 'No product keywords detected - use AI generation'
    };
  }
  
  // Find highest confidence entity
  const sorted = entities.sort((a, b) => {
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    const confDiff = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
    if (confDiff !== 0) return confDiff;
    return b.term.length - a.term.length;
  });
  
  const primary = sorted[0];
  
  return {
    useStockImage: true,
    searchQuery: primary.searchQuery,
    category: primary.category,
    detectedProducts: entities,
    reason: `Product detected: "${primary.term}" (${primary.confidence} confidence) → Search: "${primary.searchQuery}"`
  };
}

// ============================================================================
// TESTING HELPERS
// ============================================================================

/**
 * Test detection with sample texts
 */
export function testDetection(text: string): void {
  console.log(`\n=== Testing: "${text}" ===`);
  const entities = detectProductEntities(text);
  console.log(`Found ${entities.length} entities:`);
  for (const e of entities) {
    console.log(`  - ${e.term} (${e.category}, ${e.confidence}) → Search: "${e.searchQuery}"`);
  }
  
  const decision = decideImageSource(text, '');
  console.log(`Decision: ${decision.reason}`);
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  TECH_BRANDS,
  CRYPTO_TERMS,
  GENERIC_KEYWORDS,
  MODEL_PATTERNS,
  BRAND_SEARCH_QUERIES,
  extractProductModels,
  detectBrands,
  detectCryptoTerms,
  detectGenericKeywords,
};
