// ============================================================================
// Branding Kit — Type Definitions
// ============================================================================

export type DiscoveryMethod = 'ai_wizard' | 'template' | 'ig_import' | 'competitor_scan';

export type WatermarkPosition = 'center' | 'bottom-right' | 'bottom-left' | 'top-right';

export type WatermarkIconSize = 'small' | 'medium' | 'large';

// --- Color Palette ---
export interface BrandColors {
  primary: string;   // headlines
  secondary: string; // background/cards
  accent: string;    // text/contrast
  highlight: string; // CTAs/badges
  muted: string;     // subtitles
}

// --- Watermark Config ---
export interface WatermarkConfig {
  opacity: number;       // 10-50
  position: WatermarkPosition;
  icon_size: WatermarkIconSize;
}

// --- Text Style Preset ---
export interface TextStylePreset {
  fontSize: number;
  fontWeight: number;
  color: string;
  shadow?: boolean;
  strokeWidth?: number;
  strokeColor?: string;
  bgColor?: string;     // CTA background
  textColor?: string;   // CTA text
  borderRadius?: number; // CTA border radius
  format?: string;       // pagination format
}

export interface TextPresets {
  headline: TextStylePreset;
  subtitle: TextStylePreset;
  cta: TextStylePreset;
  pagination: TextStylePreset;
}

// --- Branding Kit (frontend camelCase) ---
export interface BrandingKit {
  id: string;
  userId: string;
  kitName: string;
  logoUrl: string | null;
  handleText: string | null;
  fontFamily: string;
  fontWeight: string;
  colors: BrandColors;
  watermark: WatermarkConfig;
  textPresets: TextPresets;
  discoveryMethod: DiscoveryMethod | null;
  wizardInputs: WizardInputs | null;
  createdAt: string;
  updatedAt: string;
}

// --- DB row (snake_case) ---
export interface BrandingKitRow {
  id: string;
  user_id: string;
  kit_name: string;
  logo_url: string | null;
  handle_text: string | null;
  font_family: string;
  font_weight: string;
  colors: BrandColors;
  watermark: WatermarkConfig;
  text_presets: TextPresets;
  discovery_method: DiscoveryMethod | null;
  wizard_inputs: WizardInputs | null;
  created_at: string;
  updated_at: string;
}

// --- AI Wizard Inputs ---
export interface WizardInputs {
  niche: string;
  audience: {
    ageGroup: string[];  // ['gen_z', 'millennial', 'gen_x', 'boomer'] — multi-select
    gender: string;      // 'all' | 'male' | 'female'
    income: string[];    // ['budget', 'mid', 'premium', 'luxury'] — multi-select
  };
  vibe: string[];       // 1-2 from: professional, playful, luxury, bold, minimalist, warm, futuristic, vintage, organic
  colorPreference: string | null; // hex color or null if skipped
}

// --- AI-generated kit option ---
export interface GeneratedKitOption {
  variant: 'safe' | 'bold' | 'contrast';
  label: string;
  description: string;
  colors: BrandColors;
  fontFamily: string;
  fontWeight: string;
  watermark: WatermarkConfig;
  textPresets: TextPresets;
}

// --- Niche Template ---
export interface NicheTemplate {
  id: string;
  niche: string;
  variant: 'light' | 'dark';
  label: string;
  colors: BrandColors;
  fontFamily: string;
  fontWeight: string;
  watermark: WatermarkConfig;
  textPresets: TextPresets;
}

// --- Mapper ---
export function mapBrandingKitRow(row: BrandingKitRow): BrandingKit {
  return {
    id: row.id,
    userId: row.user_id,
    kitName: row.kit_name,
    logoUrl: row.logo_url,
    handleText: row.handle_text,
    fontFamily: row.font_family,
    fontWeight: row.font_weight,
    colors: row.colors,
    watermark: row.watermark,
    textPresets: row.text_presets,
    discoveryMethod: row.discovery_method,
    wizardInputs: row.wizard_inputs,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// --- Curated Google Fonts ---
export const CURATED_FONTS = [
  // Sans-Serif
  'Inter', 'Poppins', 'Montserrat', 'DM Sans', 'Nunito',
  'Space Grotesk', 'Oswald', 'Open Sans', 'Roboto', 'Quicksand',
  // Serif
  'Playfair Display', 'Lora', 'Cormorant', 'Merriweather',
  // Display
  'Bebas Neue', 'Righteous', 'Anton', 'Archivo Black', 'Russo One', 'Teko',
] as const;

export type CuratedFont = typeof CURATED_FONTS[number];

// --- Niche options for wizard ---
export const NICHE_OPTIONS = [
  'Food & Beverage', 'Fashion', 'Tech/SaaS', 'Fitness',
  'Education', 'Finance', 'Travel', 'Beauty',
  'Real Estate', 'Entertainment', 'Health', 'Lifestyle',
] as const;

export const VIBE_OPTIONS = [
  'Professional', 'Playful', 'Luxury', 'Bold/Edgy',
  'Minimalist', 'Warm/Friendly', 'Futuristic', 'Vintage', 'Organic/Natural',
] as const;

export const AGE_GROUP_OPTIONS = [
  { value: 'gen_z', label: 'Gen Z (18-27)' },
  { value: 'millennial', label: 'Millennial (28-43)' },
  { value: 'gen_x', label: 'Gen X (44-59)' },
  { value: 'boomer', label: 'Boomer (60+)' },
] as const;

export const GENDER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
] as const;

export const INCOME_OPTIONS = [
  { value: 'budget', label: 'Budget' },
  { value: 'mid', label: 'Mid-Range' },
  { value: 'premium', label: 'Premium' },
  { value: 'luxury', label: 'Luxury' },
] as const;
