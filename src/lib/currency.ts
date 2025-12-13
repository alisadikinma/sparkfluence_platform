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
// These are approximate rates for display purposes
const conversionRates: Record<string, number> = {
  IDR: 1,
  USD: 0.000063, // 1 IDR = ~0.000063 USD
  INR: 0.0053,   // 1 IDR = ~0.0053 INR
};

// Base prices in IDR
export const basePricesIDR = {
  free: 0,
  premium: 160000,
  enterprise: 810000,
};

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
    return `${currency.symbol} ${formattedPrice}`;
  }
  return `${formattedPrice} ${currency.symbol}`;
}

// Hook-friendly function to get currency config
export function getCurrencyConfig(language: Language): CurrencyConfig {
  return currencyByLanguage[language];
}
