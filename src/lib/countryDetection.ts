/**
 * Timezone to Country Detection Utility
 * No permission required - uses browser's Intl API
 */

// Comprehensive timezone to country code mapping
const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  // ==================== INDONESIA ====================
  'Asia/Jakarta': 'ID',        // WIB - Java, Sumatra, West Kalimantan
  'Asia/Pontianak': 'ID',      // WIB - West Kalimantan
  'Asia/Makassar': 'ID',       // WITA - Central Indonesia
  'Asia/Ujung_Pandang': 'ID',  // WITA - Alias for Makassar
  'Asia/Jayapura': 'ID',       // WIT - Papua, Maluku
  
  // ==================== INDIA ====================
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',       // Legacy name
  
  // ==================== UNITED STATES ====================
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Phoenix': 'US',
  'America/Anchorage': 'US',
  'America/Honolulu': 'US',
  'America/Detroit': 'US',
  'America/Indiana/Indianapolis': 'US',
  'America/Boise': 'US',
  'Pacific/Honolulu': 'US',
  
  // ==================== UNITED KINGDOM ====================
  'Europe/London': 'GB',
  
  // ==================== SINGAPORE ====================
  'Asia/Singapore': 'SG',
  
  // ==================== MALAYSIA ====================
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Kuching': 'MY',
  
  // ==================== PHILIPPINES ====================
  'Asia/Manila': 'PH',
  
  // ==================== THAILAND ====================
  'Asia/Bangkok': 'TH',
  
  // ==================== VIETNAM ====================
  'Asia/Ho_Chi_Minh': 'VN',
  'Asia/Saigon': 'VN',         // Legacy name
  
  // ==================== JAPAN ====================
  'Asia/Tokyo': 'JP',
  
  // ==================== SOUTH KOREA ====================
  'Asia/Seoul': 'KR',
  
  // ==================== CHINA ====================
  'Asia/Shanghai': 'CN',
  'Asia/Hong_Kong': 'HK',
  
  // ==================== TAIWAN ====================
  'Asia/Taipei': 'TW',
  
  // ==================== AUSTRALIA ====================
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU',
  'Australia/Adelaide': 'AU',
  'Australia/Darwin': 'AU',
  'Australia/Hobart': 'AU',
  
  // ==================== NEW ZEALAND ====================
  'Pacific/Auckland': 'NZ',
  
  // ==================== CANADA ====================
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Montreal': 'CA',
  'America/Edmonton': 'CA',
  'America/Winnipeg': 'CA',
  
  // ==================== MEXICO ====================
  'America/Mexico_City': 'MX',
  'America/Cancun': 'MX',
  'America/Tijuana': 'MX',
  
  // ==================== BRAZIL ====================
  'America/Sao_Paulo': 'BR',
  'America/Rio_Branco': 'BR',
  'America/Manaus': 'BR',
  
  // ==================== ARGENTINA ====================
  'America/Argentina/Buenos_Aires': 'AR',
  
  // ==================== GERMANY ====================
  'Europe/Berlin': 'DE',
  
  // ==================== FRANCE ====================
  'Europe/Paris': 'FR',
  
  // ==================== SPAIN ====================
  'Europe/Madrid': 'ES',
  
  // ==================== ITALY ====================
  'Europe/Rome': 'IT',
  
  // ==================== NETHERLANDS ====================
  'Europe/Amsterdam': 'NL',
  
  // ==================== RUSSIA ====================
  'Europe/Moscow': 'RU',
  
  // ==================== TURKEY ====================
  'Europe/Istanbul': 'TR',
  
  // ==================== SAUDI ARABIA ====================
  'Asia/Riyadh': 'SA',
  
  // ==================== UAE ====================
  'Asia/Dubai': 'AE',
  
  // ==================== PAKISTAN ====================
  'Asia/Karachi': 'PK',
  
  // ==================== BANGLADESH ====================
  'Asia/Dhaka': 'BD',
  
  // ==================== SRI LANKA ====================
  'Asia/Colombo': 'LK',
  
  // ==================== NEPAL ====================
  'Asia/Kathmandu': 'NP',
  
  // ==================== MYANMAR ====================
  'Asia/Yangon': 'MM',
  'Asia/Rangoon': 'MM',        // Legacy name
  
  // ==================== CAMBODIA ====================
  'Asia/Phnom_Penh': 'KH',
  
  // ==================== NIGERIA ====================
  'Africa/Lagos': 'NG',
  
  // ==================== SOUTH AFRICA ====================
  'Africa/Johannesburg': 'ZA',
  
  // ==================== EGYPT ====================
  'Africa/Cairo': 'EG',
  
  // ==================== KENYA ====================
  'Africa/Nairobi': 'KE',
};

// Country names for display
export const COUNTRY_NAMES: Record<string, string> = {
  'ID': 'Indonesia',
  'IN': 'India',
  'US': 'United States',
  'GB': 'United Kingdom',
  'SG': 'Singapore',
  'MY': 'Malaysia',
  'PH': 'Philippines',
  'TH': 'Thailand',
  'VN': 'Vietnam',
  'JP': 'Japan',
  'KR': 'South Korea',
  'CN': 'China',
  'HK': 'Hong Kong',
  'TW': 'Taiwan',
  'AU': 'Australia',
  'NZ': 'New Zealand',
  'CA': 'Canada',
  'MX': 'Mexico',
  'BR': 'Brazil',
  'AR': 'Argentina',
  'DE': 'Germany',
  'FR': 'France',
  'ES': 'Spain',
  'IT': 'Italy',
  'NL': 'Netherlands',
  'RU': 'Russia',
  'TR': 'Turkey',
  'SA': 'Saudi Arabia',
  'AE': 'United Arab Emirates',
  'PK': 'Pakistan',
  'BD': 'Bangladesh',
  'LK': 'Sri Lanka',
  'NP': 'Nepal',
  'MM': 'Myanmar',
  'KH': 'Cambodia',
  'NG': 'Nigeria',
  'ZA': 'South Africa',
  'EG': 'Egypt',
  'KE': 'Kenya',
};

// Countries supported by Google Trends RSS
export const GOOGLE_TRENDS_SUPPORTED_COUNTRIES = [
  'ID', 'IN', 'US', 'GB', 'SG', 'MY', 'PH', 'TH', 'VN', 'JP', 'KR',
  'AU', 'NZ', 'CA', 'MX', 'BR', 'AR', 'DE', 'FR', 'ES', 'IT', 'NL',
  'RU', 'TR', 'SA', 'AE', 'PK', 'BD', 'NG', 'ZA', 'EG', 'KE'
];

/**
 * Detect user's country from browser timezone
 * No permission required!
 * 
 * @returns Country code (e.g., 'ID', 'US', 'IN') or 'US' as fallback
 */
export function detectCountryFromTimezone(): string {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log('[Country Detection] Timezone:', timezone);
    
    const country = TIMEZONE_TO_COUNTRY[timezone];
    
    if (country) {
      console.log('[Country Detection] Detected country:', country);
      return country;
    }
    
    // Fallback: try to extract from timezone string
    // e.g., "America/New_York" → check if America/* maps to US
    const region = timezone.split('/')[0];
    if (region === 'Asia') {
      // Default Asian timezone to ID if not specifically mapped
      console.log('[Country Detection] Unknown Asian timezone, defaulting to ID');
      return 'ID';
    }
    
    console.log('[Country Detection] Unknown timezone, defaulting to US');
    return 'US';
    
  } catch (error) {
    console.error('[Country Detection] Error:', error);
    return 'US'; // Safe fallback
  }
}

/**
 * Get browser timezone string
 * @returns Timezone string (e.g., 'Asia/Jakarta')
 */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

/**
 * Get country name from code
 * @param code Country code (e.g., 'ID')
 * @returns Country name (e.g., 'Indonesia')
 */
export function getCountryName(code: string): string {
  return COUNTRY_NAMES[code] || code;
}

/**
 * Check if country is supported by Google Trends
 * @param code Country code
 * @returns boolean
 */
export function isGoogleTrendsSupported(code: string): boolean {
  return GOOGLE_TRENDS_SUPPORTED_COUNTRIES.includes(code);
}

/**
 * Get list of all supported countries for dropdown
 * @returns Array of { code, name } objects
 */
export function getSupportedCountries(): Array<{ code: string; name: string }> {
  return GOOGLE_TRENDS_SUPPORTED_COUNTRIES.map(code => ({
    code,
    name: COUNTRY_NAMES[code] || code
  })).sort((a, b) => a.name.localeCompare(b.name));
}
