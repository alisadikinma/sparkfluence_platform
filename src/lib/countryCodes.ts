// International country codes for phone number verification
export interface CountryCode {
  code: string;      // ISO 3166-1 alpha-2
  name: string;
  dialCode: string;  // Without +
  flag: string;
  placeholder: string;
}

export const countryCodes: CountryCode[] = [
  // Popular countries first
  { code: "ID", name: "Indonesia", dialCode: "62", flag: "🇮🇩", placeholder: "812 3456 7890" },
  { code: "US", name: "United States", dialCode: "1", flag: "🇺🇸", placeholder: "201 555 0123" },
  { code: "IN", name: "India", dialCode: "91", flag: "🇮🇳", placeholder: "98765 43210" },
  { code: "GB", name: "United Kingdom", dialCode: "44", flag: "🇬🇧", placeholder: "7400 123456" },
  { code: "AU", name: "Australia", dialCode: "61", flag: "🇦🇺", placeholder: "412 345 678" },
  { code: "SG", name: "Singapore", dialCode: "65", flag: "🇸🇬", placeholder: "8123 4567" },
  { code: "MY", name: "Malaysia", dialCode: "60", flag: "🇲🇾", placeholder: "12 345 6789" },
  { code: "PH", name: "Philippines", dialCode: "63", flag: "🇵🇭", placeholder: "917 123 4567" },
  { code: "TH", name: "Thailand", dialCode: "66", flag: "🇹🇭", placeholder: "81 234 5678" },
  { code: "VN", name: "Vietnam", dialCode: "84", flag: "🇻🇳", placeholder: "91 234 56 78" },
  { code: "JP", name: "Japan", dialCode: "81", flag: "🇯🇵", placeholder: "90 1234 5678" },
  { code: "KR", name: "South Korea", dialCode: "82", flag: "🇰🇷", placeholder: "10 1234 5678" },
  { code: "CN", name: "China", dialCode: "86", flag: "🇨🇳", placeholder: "131 2345 6789" },
  { code: "TW", name: "Taiwan", dialCode: "886", flag: "🇹🇼", placeholder: "912 345 678" },
  { code: "HK", name: "Hong Kong", dialCode: "852", flag: "🇭🇰", placeholder: "5123 4567" },
  
  // Europe
  { code: "DE", name: "Germany", dialCode: "49", flag: "🇩🇪", placeholder: "151 12345678" },
  { code: "FR", name: "France", dialCode: "33", flag: "🇫🇷", placeholder: "6 12 34 56 78" },
  { code: "IT", name: "Italy", dialCode: "39", flag: "🇮🇹", placeholder: "312 345 6789" },
  { code: "ES", name: "Spain", dialCode: "34", flag: "🇪🇸", placeholder: "612 34 56 78" },
  { code: "NL", name: "Netherlands", dialCode: "31", flag: "🇳🇱", placeholder: "6 12345678" },
  { code: "BE", name: "Belgium", dialCode: "32", flag: "🇧🇪", placeholder: "470 12 34 56" },
  { code: "PT", name: "Portugal", dialCode: "351", flag: "🇵🇹", placeholder: "912 345 678" },
  { code: "PL", name: "Poland", dialCode: "48", flag: "🇵🇱", placeholder: "512 345 678" },
  { code: "SE", name: "Sweden", dialCode: "46", flag: "🇸🇪", placeholder: "70 123 45 67" },
  { code: "NO", name: "Norway", dialCode: "47", flag: "🇳🇴", placeholder: "412 34 567" },
  { code: "DK", name: "Denmark", dialCode: "45", flag: "🇩🇰", placeholder: "20 12 34 56" },
  { code: "FI", name: "Finland", dialCode: "358", flag: "🇫🇮", placeholder: "41 2345678" },
  { code: "CH", name: "Switzerland", dialCode: "41", flag: "🇨🇭", placeholder: "78 123 45 67" },
  { code: "AT", name: "Austria", dialCode: "43", flag: "🇦🇹", placeholder: "664 123456" },
  { code: "IE", name: "Ireland", dialCode: "353", flag: "🇮🇪", placeholder: "85 123 4567" },
  { code: "RU", name: "Russia", dialCode: "7", flag: "🇷🇺", placeholder: "912 345 67 89" },
  { code: "UA", name: "Ukraine", dialCode: "380", flag: "🇺🇦", placeholder: "50 123 4567" },
  { code: "TR", name: "Turkey", dialCode: "90", flag: "🇹🇷", placeholder: "501 234 56 78" },
  { code: "GR", name: "Greece", dialCode: "30", flag: "🇬🇷", placeholder: "691 234 5678" },
  
  // Americas
  { code: "CA", name: "Canada", dialCode: "1", flag: "🇨🇦", placeholder: "204 555 0123" },
  { code: "MX", name: "Mexico", dialCode: "52", flag: "🇲🇽", placeholder: "1 234 567 8901" },
  { code: "BR", name: "Brazil", dialCode: "55", flag: "🇧🇷", placeholder: "11 91234 5678" },
  { code: "AR", name: "Argentina", dialCode: "54", flag: "🇦🇷", placeholder: "9 11 1234 5678" },
  { code: "CO", name: "Colombia", dialCode: "57", flag: "🇨🇴", placeholder: "301 234 5678" },
  { code: "CL", name: "Chile", dialCode: "56", flag: "🇨🇱", placeholder: "9 1234 5678" },
  { code: "PE", name: "Peru", dialCode: "51", flag: "🇵🇪", placeholder: "912 345 678" },
  
  // Middle East
  { code: "AE", name: "UAE", dialCode: "971", flag: "🇦🇪", placeholder: "50 123 4567" },
  { code: "SA", name: "Saudi Arabia", dialCode: "966", flag: "🇸🇦", placeholder: "50 123 4567" },
  { code: "QA", name: "Qatar", dialCode: "974", flag: "🇶🇦", placeholder: "3312 3456" },
  { code: "KW", name: "Kuwait", dialCode: "965", flag: "🇰🇼", placeholder: "5012 3456" },
  { code: "BH", name: "Bahrain", dialCode: "973", flag: "🇧🇭", placeholder: "3600 0000" },
  { code: "OM", name: "Oman", dialCode: "968", flag: "🇴🇲", placeholder: "9212 3456" },
  { code: "IL", name: "Israel", dialCode: "972", flag: "🇮🇱", placeholder: "50 123 4567" },
  { code: "EG", name: "Egypt", dialCode: "20", flag: "🇪🇬", placeholder: "100 123 4567" },
  
  // Africa
  { code: "ZA", name: "South Africa", dialCode: "27", flag: "🇿🇦", placeholder: "71 123 4567" },
  { code: "NG", name: "Nigeria", dialCode: "234", flag: "🇳🇬", placeholder: "802 123 4567" },
  { code: "KE", name: "Kenya", dialCode: "254", flag: "🇰🇪", placeholder: "712 123456" },
  { code: "GH", name: "Ghana", dialCode: "233", flag: "🇬🇭", placeholder: "23 123 4567" },
  { code: "MA", name: "Morocco", dialCode: "212", flag: "🇲🇦", placeholder: "6 50 123456" },
  
  // Oceania
  { code: "NZ", name: "New Zealand", dialCode: "64", flag: "🇳🇿", placeholder: "21 123 4567" },
  
  // Other Asia
  { code: "BD", name: "Bangladesh", dialCode: "880", flag: "🇧🇩", placeholder: "1812 345678" },
  { code: "PK", name: "Pakistan", dialCode: "92", flag: "🇵🇰", placeholder: "301 2345678" },
  { code: "LK", name: "Sri Lanka", dialCode: "94", flag: "🇱🇰", placeholder: "71 234 5678" },
  { code: "NP", name: "Nepal", dialCode: "977", flag: "🇳🇵", placeholder: "984 1234567" },
  { code: "MM", name: "Myanmar", dialCode: "95", flag: "🇲🇲", placeholder: "9 123 456 789" },
  { code: "KH", name: "Cambodia", dialCode: "855", flag: "🇰🇭", placeholder: "91 234 567" },
  { code: "LA", name: "Laos", dialCode: "856", flag: "🇱🇦", placeholder: "20 23 456 789" },
];

// Get country by dial code
export const getCountryByDialCode = (dialCode: string): CountryCode | undefined => {
  return countryCodes.find(c => c.dialCode === dialCode);
};

// Get country by ISO code
export const getCountryByCode = (code: string): CountryCode | undefined => {
  return countryCodes.find(c => c.code === code);
};

// Detect country from timezone (for auto-selection)
export const detectCountryFromTimezone = (): CountryCode => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const timezoneToCountry: Record<string, string> = {
    // Asia
    'Asia/Jakarta': 'ID',
    'Asia/Makassar': 'ID',
    'Asia/Jayapura': 'ID',
    'Asia/Pontianak': 'ID',
    'Asia/Singapore': 'SG',
    'Asia/Kuala_Lumpur': 'MY',
    'Asia/Manila': 'PH',
    'Asia/Bangkok': 'TH',
    'Asia/Ho_Chi_Minh': 'VN',
    'Asia/Tokyo': 'JP',
    'Asia/Seoul': 'KR',
    'Asia/Shanghai': 'CN',
    'Asia/Hong_Kong': 'HK',
    'Asia/Taipei': 'TW',
    'Asia/Kolkata': 'IN',
    'Asia/Dubai': 'AE',
    'Asia/Riyadh': 'SA',
    'Asia/Dhaka': 'BD',
    'Asia/Karachi': 'PK',
    
    // Americas
    'America/New_York': 'US',
    'America/Los_Angeles': 'US',
    'America/Chicago': 'US',
    'America/Denver': 'US',
    'America/Toronto': 'CA',
    'America/Vancouver': 'CA',
    'America/Mexico_City': 'MX',
    'America/Sao_Paulo': 'BR',
    'America/Buenos_Aires': 'AR',
    
    // Europe
    'Europe/London': 'GB',
    'Europe/Paris': 'FR',
    'Europe/Berlin': 'DE',
    'Europe/Rome': 'IT',
    'Europe/Madrid': 'ES',
    'Europe/Amsterdam': 'NL',
    'Europe/Moscow': 'RU',
    'Europe/Istanbul': 'TR',
    
    // Oceania
    'Australia/Sydney': 'AU',
    'Australia/Melbourne': 'AU',
    'Australia/Brisbane': 'AU',
    'Australia/Perth': 'AU',
    'Pacific/Auckland': 'NZ',
    
    // Africa
    'Africa/Johannesburg': 'ZA',
    'Africa/Lagos': 'NG',
    'Africa/Cairo': 'EG',
  };
  
  const countryCode = timezoneToCountry[timezone] || 'ID';
  return getCountryByCode(countryCode) || countryCodes[0];
};

// Format phone number for API (with country code, no leading zero)
export const formatPhoneForAPI = (phone: string, dialCode: string): string => {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove leading zero if present
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  
  // Return with country code
  return dialCode + cleaned;
};

// Format phone number for display (local format with leading zero)
export const formatPhoneForDisplay = (phone: string, dialCode: string): string => {
  // If phone starts with dial code, remove it and add leading 0
  if (phone.startsWith(dialCode)) {
    return '0' + phone.slice(dialCode.length);
  }
  return phone;
};
