import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { BrandingKit, BrandingKitRow, BrandColors, WatermarkConfig, TextPresets, WizardInputs, DiscoveryMethod } from '../types/branding';
import { mapBrandingKitRow } from '../types/branding';

// Default branding kit values
const DEFAULT_COLORS: BrandColors = {
  primary: '#F5A623',
  secondary: '#0F172A',
  accent: '#FFFFFF',
  highlight: '#F5A623',
  muted: '#A3A3A3',
};

const DEFAULT_WATERMARK: WatermarkConfig = {
  opacity: 30,
  position: 'center',
  icon_size: 'medium',
};

const DEFAULT_TEXT_PRESETS: TextPresets = {
  headline: { fontSize: 48, fontWeight: 900, color: '#FFFFFF', shadow: true, strokeWidth: 0, strokeColor: '#000000' },
  subtitle: { fontSize: 24, fontWeight: 600, color: '#A3A3A3', shadow: false },
  cta: { fontSize: 28, fontWeight: 800, bgColor: '#F5A623', textColor: '#000000', color: '#000000', borderRadius: 8 },
  pagination: { fontSize: 14, fontWeight: 400, color: '#A3A3A3', format: '[N]/[TOTAL]' },
};

interface UseBrandingKitReturn {
  kit: BrandingKit | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  fetchKit: () => Promise<void>;
  saveKit: (updates: Partial<BrandingKitRow>) => Promise<boolean>;
  createKit: (data: {
    kitName?: string;
    colors?: BrandColors;
    fontFamily?: string;
    fontWeight?: string;
    watermark?: WatermarkConfig;
    textPresets?: TextPresets;
    discoveryMethod?: DiscoveryMethod;
    wizardInputs?: WizardInputs;
    handleText?: string;
    logoUrl?: string;
  }) => Promise<boolean>;
  deleteKit: () => Promise<boolean>;
}

export function useBrandingKit(): UseBrandingKitReturn {
  const { user } = useAuth();
  const [kit, setKit] = useState<BrandingKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKit = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('user_branding_kit')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      setError(fetchError.message);
    } else if (data) {
      setKit(mapBrandingKitRow(data as BrandingKitRow));
    } else {
      setKit(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchKit();
  }, [fetchKit]);

  const saveKit = useCallback(async (updates: Partial<BrandingKitRow>): Promise<boolean> => {
    if (!user || !kit) return false;
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('user_branding_kit')
      .update(updates)
      .eq('user_id', user.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return false;
    }

    await fetchKit();
    setSaving(false);
    return true;
  }, [user, kit, fetchKit]);

  const createKit = useCallback(async (data: {
    kitName?: string;
    colors?: BrandColors;
    fontFamily?: string;
    fontWeight?: string;
    watermark?: WatermarkConfig;
    textPresets?: TextPresets;
    discoveryMethod?: DiscoveryMethod;
    wizardInputs?: WizardInputs;
    handleText?: string;
    logoUrl?: string;
  }): Promise<boolean> => {
    if (!user) return false;
    setSaving(true);
    setError(null);

    const row = {
      user_id: user.id,
      kit_name: data.kitName || 'My Brand',
      logo_url: data.logoUrl || null,
      handle_text: data.handleText || null,
      font_family: data.fontFamily || 'Inter',
      font_weight: data.fontWeight || '700',
      colors: data.colors || DEFAULT_COLORS,
      watermark: data.watermark || DEFAULT_WATERMARK,
      text_presets: data.textPresets || DEFAULT_TEXT_PRESETS,
      discovery_method: data.discoveryMethod || null,
      wizard_inputs: data.wizardInputs || null,
    };

    // Upsert — if kit already exists, update it
    const { error: upsertError } = await supabase
      .from('user_branding_kit')
      .upsert(row, { onConflict: 'user_id' });

    if (upsertError) {
      setError(upsertError.message);
      setSaving(false);
      return false;
    }

    await fetchKit();
    setSaving(false);
    return true;
  }, [user, fetchKit]);

  const deleteKit = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    setSaving(true);

    const { error: deleteError } = await supabase
      .from('user_branding_kit')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      setError(deleteError.message);
      setSaving(false);
      return false;
    }

    setKit(null);
    setSaving(false);
    return true;
  }, [user]);

  return { kit, loading, saving, error, fetchKit, saveKit, createKit, deleteKit };
}
