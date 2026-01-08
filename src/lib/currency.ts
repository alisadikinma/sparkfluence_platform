import { Language } from '../i18n';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  locale: string;
  position: 'prefix' | 'suffix';
}

export const currencyByLanguage: Record<Language, CurrencyConfig> = {
  en: {
    code: 'USD',
    symbol: '$',
    locale: 'en-US',
    position: 'prefix',
  },
  id: {
    code: 'IDR',
    symbol: 'Rp',
    locale: 'id-ID',
    position: 'prefix',
  },
  hi: {
    code: 'INR',
    symbol: '₹',
    locale: 'hi-IN',
    position: 'prefix',
  },
};

// Price conversion rates (relative to IDR as base)
const conversionRates: Record<string, number> = {
  IDR: 1,
  USD: 0.000063, // 1 IDR = ~0.000063 USD
  INR: 0.0053,   // 1 IDR = ~0.0053 INR
};

// Base prices in IDR (Monthly) - SALE PRICES
export const basePricesIDR = {
  free: 0,
  starter: 149000,
  pro: 349000,
  business: 749000,
};

// Original prices in IDR (for strikethrough display)
export const originalPricesIDR = {
  free: 0,
  starter: 299000,
  pro: 699000,
  business: 1499000,
};

// Sparks allocation per tier (monthly)
export const sparksPerTier = {
  free: 30,
  starter: 1000,
  pro: 3000,
  business: 10000,
};

// Sparks cost per action
export const sparksCost = {
  fullPipeline: 100,  // Script Lab - full video production
  imageOnly: 10,      // Visual Forge - single image
  videoOnly: 15,      // Video Genie - single video segment
  viralScript: 5,     // Viral Script Gen - script consultation
};

// Yearly prices in IDR (33% discount from sale price)
export const yearlyPricesIDR = {
  free: 0,
  starter: 1199000,  // Rp149K x 12 x 0.67 = ~Rp1.199K
  pro: 2799000,      // Rp349K x 12 x 0.67 = ~Rp2.799K
  business: 5999000, // Rp749K x 12 x 0.67 = ~Rp5.999K
};

// Original yearly prices in IDR (for strikethrough display)
export const originalYearlyPricesIDR = {
  free: 0,
  starter: 3588000,  // Rp299K x 12 = Rp3.588K
  pro: 8388000,      // Rp699K x 12 = Rp8.388K
  business: 17988000, // Rp1.499K x 12 = Rp17.988K
};

// Sparks per tier (yearly includes 10% bonus)
export const creditsPerTier = {
  free: 30,
  starter: {
    monthly: 1000,
    yearly: 13200, // 1000 x 12 + 10% bonus
  },
  pro: {
    monthly: 3000,
    yearly: 39600, // 3000 x 12 + 10% bonus
  },
  business: {
    monthly: 10000,
    yearly: 132000, // 10000 x 12 + 10% bonus
  },
};

// Top-up packages in IDR (Sparks) - subscriber only
export const topUpPackagesIDR = [
  { id: 'spark', sparks: 300, price: 59000 },
  { id: 'blaze', sparks: 1000, price: 149000 },
  { id: 'inferno', sparks: 3500, price: 399000 },
];

export function getPrice(basePriceIDR: number, language: Language): number {
  const currency = currencyByLanguage[language];
  const rate = conversionRates[currency.code] || 1;
  
  if (basePriceIDR === 0) return 0;
  
  const convertedPrice = basePriceIDR * rate;
  
  // Round appropriately based on currency
  if (currency.code === 'USD') {
    return Math.round(convertedPrice * 100) / 100; // 2 decimal places
  } else if (currency.code === 'INR') {
    return Math.round(convertedPrice); // No decimals for INR
  }
  
  return Math.round(convertedPrice); // Default: no decimals
}

export function formatPrice(price: number, language: Language): string {
  const currency = currencyByLanguage[language];
  
  if (price === 0) return '0';
  
  return new Intl.NumberFormat(currency.locale, {
    minimumFractionDigits: currency.code === 'USD' ? 2 : 0,
    maximumFractionDigits: currency.code === 'USD' ? 2 : 0,
  }).format(price);
}

export function formatPriceWithSymbol(price: number, language: Language): string {
  const currency = currencyByLanguage[language];
  const formattedPrice = formatPrice(price, language);
  
  if (currency.position === 'prefix') {
    return `${currency.symbol}${formattedPrice}`;
  }
  return `${formattedPrice}${currency.symbol}`;
}

// Hook-friendly function to get currency config
export function getCurrencyConfig(language: Language): CurrencyConfig {
  return currencyByLanguage[language];
}

// Calculate yearly savings
export function getYearlySavings(tier: 'starter' | 'pro' | 'business', language: Language): number {
  const monthlyTotal = basePricesIDR[tier] * 12;
  const yearlyPrice = yearlyPricesIDR[tier];
  const savingsIDR = monthlyTotal - yearlyPrice;
  return getPrice(savingsIDR, language);
}

// Get bonus credits for yearly
export function getBonusCredits(tier: 'starter' | 'pro' | 'business'): number {
  const monthlyCredits = creditsPerTier[tier].monthly;
  const yearlyCredits = creditsPerTier[tier].yearly;
  return yearlyCredits - (monthlyCredits * 12);
}
