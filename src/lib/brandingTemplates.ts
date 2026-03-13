import type { NicheTemplate, BrandColors, WatermarkConfig, TextPresets } from '../types/branding';

// Helper to build a template
function t(
  id: string,
  niche: string,
  variant: 'light' | 'dark',
  label: string,
  colors: BrandColors,
  fontFamily: string,
  fontWeight: string = '700',
): NicheTemplate {
  const watermark: WatermarkConfig = { opacity: 30, position: 'center', icon_size: 'medium' };
  const textPresets: TextPresets = {
    headline: { fontSize: 48, fontWeight: 900, color: colors.accent, shadow: true, strokeWidth: 0, strokeColor: '#000000' },
    subtitle: { fontSize: 24, fontWeight: 600, color: colors.muted, shadow: false },
    cta: { fontSize: 28, fontWeight: 800, bgColor: colors.highlight, textColor: variant === 'dark' ? '#000000' : '#FFFFFF', color: variant === 'dark' ? '#000000' : '#FFFFFF', borderRadius: 8 },
    pagination: { fontSize: 14, fontWeight: 400, color: colors.muted, format: '[N]/[TOTAL]' },
  };
  return { id, niche, variant, label, colors, fontFamily, fontWeight, watermark, textPresets };
}

export const NICHE_TEMPLATES: NicheTemplate[] = [
  // Food & Beverage
  t('food-light', 'Food & Beverage', 'light', 'Warm Orange',
    { primary: '#F97316', secondary: '#FFF7ED', accent: '#1C1917', highlight: '#F97316', muted: '#78716C' },
    'Poppins'),
  t('food-dark', 'Food & Beverage', 'dark', 'Dark + Amber',
    { primary: '#F59E0B', secondary: '#1C1917', accent: '#FAFAF9', highlight: '#F59E0B', muted: '#A8A29E' },
    'Poppins'),

  // Fashion
  t('fashion-light', 'Fashion', 'light', 'Monochrome',
    { primary: '#1C1917', secondary: '#FAFAF9', accent: '#1C1917', highlight: '#1C1917', muted: '#78716C' },
    'Playfair Display'),
  t('fashion-dark', 'Fashion', 'dark', 'Black + Gold',
    { primary: '#D4A843', secondary: '#0C0A09', accent: '#FAFAF9', highlight: '#D4A843', muted: '#A8A29E' },
    'Playfair Display'),

  // Tech/SaaS
  t('tech-light', 'Tech/SaaS', 'light', 'Blue Gradient',
    { primary: '#3B82F6', secondary: '#EFF6FF', accent: '#1E293B', highlight: '#3B82F6', muted: '#64748B' },
    'Inter'),
  t('tech-dark', 'Tech/SaaS', 'dark', 'Dark Navy + Cyan',
    { primary: '#06B6D4', secondary: '#0F172A', accent: '#F1F5F9', highlight: '#06B6D4', muted: '#94A3B8' },
    'Inter'),

  // Fitness
  t('fitness-light', 'Fitness', 'light', 'Bold Red',
    { primary: '#EF4444', secondary: '#FEF2F2', accent: '#1C1917', highlight: '#EF4444', muted: '#78716C' },
    'Oswald', '800'),
  t('fitness-dark', 'Fitness', 'dark', 'Black + Red',
    { primary: '#EF4444', secondary: '#0C0A09', accent: '#FAFAF9', highlight: '#EF4444', muted: '#A8A29E' },
    'Oswald', '800'),

  // Education
  t('edu-light', 'Education', 'light', 'Green Navy',
    { primary: '#10B981', secondary: '#F0FDF4', accent: '#1E293B', highlight: '#10B981', muted: '#64748B' },
    'Nunito'),
  t('edu-dark', 'Education', 'dark', 'Dark + Emerald',
    { primary: '#10B981', secondary: '#0F172A', accent: '#F1F5F9', highlight: '#10B981', muted: '#94A3B8' },
    'Nunito'),

  // Finance
  t('finance-light', 'Finance', 'light', 'Deep Blue',
    { primary: '#1D4ED8', secondary: '#EFF6FF', accent: '#1E293B', highlight: '#1D4ED8', muted: '#64748B' },
    'Roboto'),
  t('finance-dark', 'Finance', 'dark', 'Dark + Gold',
    { primary: '#D4A843', secondary: '#0F172A', accent: '#F1F5F9', highlight: '#D4A843', muted: '#94A3B8' },
    'Roboto'),

  // Travel
  t('travel-light', 'Travel', 'light', 'Teal Orange',
    { primary: '#14B8A6', secondary: '#F0FDFA', accent: '#1C1917', highlight: '#F97316', muted: '#78716C' },
    'Quicksand'),
  t('travel-dark', 'Travel', 'dark', 'Dark + Teal',
    { primary: '#14B8A6', secondary: '#0C0A09', accent: '#FAFAF9', highlight: '#14B8A6', muted: '#A8A29E' },
    'Quicksand'),

  // Beauty
  t('beauty-light', 'Beauty', 'light', 'Rose Gold',
    { primary: '#E11D48', secondary: '#FFF1F2', accent: '#1C1917', highlight: '#E11D48', muted: '#78716C' },
    'Cormorant'),
  t('beauty-dark', 'Beauty', 'dark', 'Dark + Rose',
    { primary: '#FB7185', secondary: '#0C0A09', accent: '#FAFAF9', highlight: '#FB7185', muted: '#A8A29E' },
    'Cormorant'),

  // Real Estate
  t('realestate-light', 'Real Estate', 'light', 'Navy Gold',
    { primary: '#1E3A5F', secondary: '#F8FAFC', accent: '#1E3A5F', highlight: '#D4A843', muted: '#64748B' },
    'Lora'),
  t('realestate-dark', 'Real Estate', 'dark', 'Dark + Gold',
    { primary: '#D4A843', secondary: '#0F172A', accent: '#F1F5F9', highlight: '#D4A843', muted: '#94A3B8' },
    'Lora'),

  // Entertainment
  t('entertainment-light', 'Entertainment', 'light', 'Neon',
    { primary: '#A855F7', secondary: '#FAF5FF', accent: '#1C1917', highlight: '#A855F7', muted: '#78716C' },
    'Space Grotesk'),
  t('entertainment-dark', 'Entertainment', 'dark', 'Black + Neon',
    { primary: '#22D3EE', secondary: '#0C0A09', accent: '#FAFAF9', highlight: '#A855F7', muted: '#A8A29E' },
    'Space Grotesk'),

  // Health
  t('health-light', 'Health', 'light', 'Soft Green',
    { primary: '#22C55E', secondary: '#F0FDF4', accent: '#1C1917', highlight: '#22C55E', muted: '#78716C' },
    'Open Sans'),
  t('health-dark', 'Health', 'dark', 'Dark + Green',
    { primary: '#22C55E', secondary: '#0C0A09', accent: '#FAFAF9', highlight: '#22C55E', muted: '#A8A29E' },
    'Open Sans'),

  // Lifestyle
  t('lifestyle-light', 'Lifestyle', 'light', 'Warm Neutral',
    { primary: '#A16207', secondary: '#FFFBEB', accent: '#1C1917', highlight: '#A16207', muted: '#78716C' },
    'DM Sans'),
  t('lifestyle-dark', 'Lifestyle', 'dark', 'Dark + Warm',
    { primary: '#FBBF24', secondary: '#1C1917', accent: '#FAFAF9', highlight: '#FBBF24', muted: '#A8A29E' },
    'DM Sans'),
];

// Group templates by niche
export function getTemplatesByNiche(): Record<string, NicheTemplate[]> {
  const grouped: Record<string, NicheTemplate[]> = {};
  for (const template of NICHE_TEMPLATES) {
    if (!grouped[template.niche]) grouped[template.niche] = [];
    grouped[template.niche].push(template);
  }
  return grouped;
}
