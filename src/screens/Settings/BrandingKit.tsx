import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Wand2, LayoutTemplate, Palette, Type, Image as ImageIcon,
  ChevronRight, ChevronDown, Check, Upload, Trash2, RefreshCw, Eye,
  Droplets, AlignLeft, AlignCenter, AlignRight, Loader2
} from 'lucide-react';
import { useBrandingKit } from '../../hooks/useBrandingKit';
import { NICHE_TEMPLATES, getTemplatesByNiche } from '../../lib/brandingTemplates';
import type {
  BrandColors, WatermarkConfig, TextPresets, WizardInputs, NicheTemplate,
  GeneratedKitOption, DiscoveryMethod, WatermarkPosition
} from '../../types/branding';
import {
  CURATED_FONTS, NICHE_OPTIONS, VIBE_OPTIONS,
  AGE_GROUP_OPTIONS, GENDER_OPTIONS, INCOME_OPTIONS
} from '../../types/branding';
import { supabase } from '../../lib/supabase';

// ─── Views ───
type View = 'loading' | 'wizard' | 'templates' | 'editor' | 'picker';

// ─── Wizard Steps ───
type WizardStep = 'niche' | 'audience' | 'vibe' | 'color';
const WIZARD_STEPS: WizardStep[] = ['niche', 'audience', 'vibe', 'color'];

// ─── Color Family Swatches ───
const COLOR_FAMILIES = [
  { label: 'Red', hex: '#EF4444' },
  { label: 'Orange', hex: '#F97316' },
  { label: 'Yellow', hex: '#EAB308' },
  { label: 'Green', hex: '#22C55E' },
  { label: 'Blue', hex: '#3B82F6' },
  { label: 'Purple', hex: '#A855F7' },
];

export const BrandingKit: React.FC = () => {
  const navigate = useNavigate();
  const { kit, loading, saving, error, createKit, saveKit, deleteKit } = useBrandingKit();

  // View state
  const [view, setView] = useState<View>('loading');

  // Wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep>('niche');
  const [wizardInputs, setWizardInputs] = useState<WizardInputs>({
    niche: '',
    audience: { ageGroup: 'millennial', gender: 'all', income: 'mid' },
    vibe: [],
    colorPreference: null,
  });
  const [customNiche, setCustomNiche] = useState('');
  const [generatedOptions, setGeneratedOptions] = useState<GeneratedKitOption[]>([]);
  const [generating, setGenerating] = useState(false);

  // Editor state
  const [editColors, setEditColors] = useState<BrandColors>({
    primary: '#F5A623', secondary: '#0F172A', accent: '#FFFFFF', highlight: '#F5A623', muted: '#A3A3A3',
  });
  const [editFont, setEditFont] = useState('Inter');
  const [editFontWeight, setEditFontWeight] = useState('700');
  const [editHandle, setEditHandle] = useState('');
  const [editKitName, setEditKitName] = useState('My Brand');
  const [editWatermark, setEditWatermark] = useState<WatermarkConfig>({
    opacity: 30, position: 'center', icon_size: 'medium',
  });
  const [editTextPresets, setEditTextPresets] = useState<TextPresets>({
    headline: { fontSize: 48, fontWeight: 900, color: '#FFFFFF', shadow: true, strokeWidth: 0, strokeColor: '#000000' },
    subtitle: { fontSize: 24, fontWeight: 600, color: '#A3A3A3', shadow: false },
    cta: { fontSize: 28, fontWeight: 800, bgColor: '#F5A623', textColor: '#000000', color: '#000000', borderRadius: 8 },
    pagination: { fontSize: 14, fontWeight: 400, color: '#A3A3A3', format: '[N]/[TOTAL]' },
  });
  const [activeAccordion, setActiveAccordion] = useState<string>('colors');

  // Initialize view based on kit existence
  useEffect(() => {
    if (loading) {
      setView('loading');
      return;
    }
    if (kit) {
      // Existing kit → editor
      setEditColors(kit.colors);
      setEditFont(kit.fontFamily);
      setEditFontWeight(kit.fontWeight);
      setEditHandle(kit.handleText || '');
      setEditKitName(kit.kitName);
      setEditWatermark(kit.watermark);
      setEditTextPresets(kit.textPresets);
      setView('editor');
    } else {
      // No kit → picker (choose method)
      setView('picker');
    }
  }, [loading, kit]);

  // ─── Apply template to editor ───
  const applyTemplate = useCallback((template: NicheTemplate) => {
    setEditColors(template.colors);
    setEditFont(template.fontFamily);
    setEditFontWeight(template.fontWeight);
    setEditWatermark(template.watermark);
    setEditTextPresets(template.textPresets);
    setView('editor');
  }, []);

  // ─── Apply generated option ───
  const applyGeneratedOption = useCallback((option: GeneratedKitOption) => {
    setEditColors(option.colors);
    setEditFont(option.fontFamily);
    setEditFontWeight(option.fontWeight);
    setEditWatermark(option.watermark);
    setEditTextPresets(option.textPresets);
    setView('editor');
  }, []);

  // ─── Save to DB ───
  const handleSave = useCallback(async () => {
    const data = {
      kitName: editKitName,
      colors: editColors,
      fontFamily: editFont,
      fontWeight: editFontWeight,
      watermark: editWatermark,
      textPresets: editTextPresets,
      handleText: editHandle || undefined,
    };

    if (kit) {
      await saveKit({
        kit_name: data.kitName,
        colors: data.colors,
        font_family: data.fontFamily,
        font_weight: data.fontWeight,
        watermark: data.watermark,
        text_presets: data.textPresets,
        handle_text: data.handleText || null,
      });
    } else {
      await createKit(data);
    }
  }, [kit, editKitName, editColors, editFont, editFontWeight, editWatermark, editTextPresets, editHandle, saveKit, createKit]);

  // ─── AI Wizard: generate kits ───
  const handleWizardGenerate = useCallback(async () => {
    setGenerating(true);
    const { data, error: fnError } = await supabase.functions.invoke('generate-brand-kit', {
      body: {
        niche: wizardInputs.niche || customNiche,
        audience: wizardInputs.audience,
        vibe: wizardInputs.vibe,
        color_preference: wizardInputs.colorPreference,
      },
    });

    if (!fnError && data?.kits) {
      setGeneratedOptions(data.kits);
    }
    setGenerating(false);
  }, [wizardInputs, customNiche]);

  // ─── Renders ───

  if (view === 'loading') {
    return (
      <div className="flex items-center justify-center h-full bg-[#0B0E14]">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Method Picker (first-time) ───
  if (view === 'picker') {
    return (
      <div className="min-h-full bg-[#0B0E14]">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-300 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Settings
          </button>

          <h1 className="text-2xl font-bold text-neutral-100 mb-2">Brand Kit</h1>
          <p className="text-sm text-neutral-400 mb-8">
            Create your brand identity. This kit applies to all Sparkfluence features.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* AI Wizard */}
            <button
              onClick={() => { setView('wizard'); setWizardStep('niche'); }}
              className="flex flex-col items-start gap-3 p-5 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-emerald-500/30 hover:bg-neutral-900/80 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Wand2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-200 mb-1">AI Brand Wizard</h3>
                <p className="text-xs text-neutral-500">
                  Answer 4 questions, get 3 AI-generated brand kits (Safe / Bold / Contrast)
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-emerald-400 transition-colors self-end" />
            </button>

            {/* Templates */}
            <button
              onClick={() => setView('templates')}
              className="flex flex-col items-start gap-3 p-5 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-emerald-500/30 hover:bg-neutral-900/80 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <LayoutTemplate className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-200 mb-1">Niche Templates</h3>
                <p className="text-xs text-neutral-500">
                  12 niches x 2 variants = 24 pre-built kits. Pick one and customize.
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-blue-400 transition-colors self-end" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Niche Templates ───
  if (view === 'templates') {
    const grouped = getTemplatesByNiche();

    return (
      <div className="min-h-full bg-[#0B0E14]">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <button
            onClick={() => setView(kit ? 'editor' : 'picker')}
            className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-300 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <h2 className="text-xl font-bold text-neutral-100 mb-6">Choose a Template</h2>

          <div className="space-y-6">
            {Object.entries(grouped).map(([niche, templates]) => (
              <div key={niche}>
                <h3 className="text-sm font-semibold text-neutral-300 mb-3">{niche}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {templates.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      onClick={() => applyTemplate(tmpl)}
                      className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-all text-left group"
                    >
                      {/* Color preview */}
                      <div className="flex gap-1 mb-3">
                        {Object.values(tmpl.colors).map((c, i) => (
                          <div key={i} className="w-6 h-6 rounded-full border border-neutral-700" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <p className="text-sm font-medium text-neutral-200">{tmpl.label}</p>
                      <p className="text-xs text-neutral-500 mt-0.5" style={{ fontFamily: tmpl.fontFamily }}>
                        {tmpl.fontFamily} — {tmpl.variant}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── AI Wizard ───
  if (view === 'wizard') {
    const currentStepIndex = WIZARD_STEPS.indexOf(wizardStep);

    // If we have generated options, show the picker
    if (generatedOptions.length > 0) {
      return (
        <div className="min-h-full bg-[#0B0E14]">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <button
              onClick={() => setGeneratedOptions([])}
              className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-300 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Wizard
            </button>

            <h2 className="text-xl font-bold text-neutral-100 mb-2">Pick Your Brand Kit</h2>
            <p className="text-sm text-neutral-400 mb-6">
              AI generated 3 options. Click one to customize further.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {generatedOptions.map((option) => (
                <button
                  key={option.variant}
                  onClick={() => applyGeneratedOption(option)}
                  className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-emerald-500/30 transition-all text-left"
                >
                  {/* Variant badge */}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mb-3 ${
                    option.variant === 'safe' ? 'bg-emerald-500/10 text-emerald-400' :
                    option.variant === 'bold' ? 'bg-red-500/10 text-red-400' :
                    'bg-amber-500/10 text-amber-400'
                  }`}>
                    {option.variant}
                  </span>

                  <h3 className="text-sm font-semibold text-neutral-200 mb-1">{option.label}</h3>
                  <p className="text-xs text-neutral-500 mb-3">{option.description}</p>

                  {/* Color preview */}
                  <div className="flex gap-1 mb-3">
                    {Object.values(option.colors).map((c, i) => (
                      <div key={i} className="w-6 h-6 rounded-full border border-neutral-700" style={{ backgroundColor: c }} />
                    ))}
                  </div>

                  {/* Mock slide preview */}
                  <div
                    className="aspect-[4/5] rounded-lg flex flex-col items-center justify-center p-4 gap-2"
                    style={{ backgroundColor: option.colors.secondary }}
                  >
                    <p
                      className="text-center font-bold text-sm leading-tight"
                      style={{ color: option.colors.accent, fontFamily: option.fontFamily }}
                    >
                      SAMPLE HEADLINE
                    </p>
                    <p
                      className="text-center text-[10px]"
                      style={{ color: option.colors.muted, fontFamily: option.fontFamily }}
                    >
                      Subtitle text goes here
                    </p>
                    <div
                      className="mt-2 px-3 py-1 rounded text-[10px] font-bold"
                      style={{
                        backgroundColor: option.colors.highlight,
                        color: option.colors.secondary,
                      }}
                    >
                      CTA BUTTON
                    </div>
                  </div>

                  <p className="text-xs text-neutral-600 mt-2" style={{ fontFamily: option.fontFamily }}>
                    {option.fontFamily}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-full bg-[#0B0E14]">
        <div className="max-w-2xl mx-auto px-6 py-8">
          <button
            onClick={() => setView(kit ? 'editor' : 'picker')}
            className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-300 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {WIZARD_STEPS.map((s, i) => (
              <React.Fragment key={s}>
                {i > 0 && <div className={`flex-1 h-px ${i <= currentStepIndex ? 'bg-emerald-500' : 'bg-neutral-800'}`} />}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  i < currentStepIndex ? 'bg-emerald-500 text-white' :
                  i === currentStepIndex ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500' :
                  'bg-neutral-800 text-neutral-600'
                }`}>
                  {i < currentStepIndex ? <Check className="w-4 h-4" /> : i + 1}
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Step: Niche */}
          {wizardStep === 'niche' && (
            <div>
              <h2 className="text-lg font-bold text-neutral-100 mb-2">Bisnis kamu di bidang apa?</h2>
              <p className="text-sm text-neutral-400 mb-6">Pick your niche or type a custom one.</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {NICHE_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => { setWizardInputs(p => ({ ...p, niche: n })); setCustomNiche(''); }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      wizardInputs.niche === n
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Or type your niche..."
                value={customNiche}
                onChange={(e) => { setCustomNiche(e.target.value); setWizardInputs(p => ({ ...p, niche: '' })); }}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors"
              />
              <button
                disabled={!wizardInputs.niche && !customNiche}
                onClick={() => setWizardStep('audience')}
                className="mt-6 bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-800 disabled:text-neutral-600 text-white rounded-lg px-6 py-2 text-sm font-medium transition-colors"
              >
                Next
              </button>
            </div>
          )}

          {/* Step: Audience */}
          {wizardStep === 'audience' && (
            <div>
              <h2 className="text-lg font-bold text-neutral-100 mb-2">Target Audience</h2>
              <p className="text-sm text-neutral-400 mb-6">Who are you trying to reach?</p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-neutral-400 uppercase tracking-wider mb-2 block">Age Group</label>
                  <div className="flex flex-wrap gap-2">
                    {AGE_GROUP_OPTIONS.map(o => (
                      <button key={o.value} onClick={() => setWizardInputs(p => ({ ...p, audience: { ...p.audience, ageGroup: o.value } }))}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          wizardInputs.audience.ageGroup === o.value
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                        }`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 uppercase tracking-wider mb-2 block">Gender</label>
                  <div className="flex flex-wrap gap-2">
                    {GENDER_OPTIONS.map(o => (
                      <button key={o.value} onClick={() => setWizardInputs(p => ({ ...p, audience: { ...p.audience, gender: o.value } }))}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          wizardInputs.audience.gender === o.value
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                        }`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 uppercase tracking-wider mb-2 block">Income Level</label>
                  <div className="flex flex-wrap gap-2">
                    {INCOME_OPTIONS.map(o => (
                      <button key={o.value} onClick={() => setWizardInputs(p => ({ ...p, audience: { ...p.audience, income: o.value } }))}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          wizardInputs.audience.income === o.value
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                        }`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setWizardStep('niche')} className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg px-4 py-2 text-sm transition-colors">Back</button>
                <button onClick={() => setWizardStep('vibe')} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-6 py-2 text-sm font-medium transition-colors">Next</button>
              </div>
            </div>
          )}

          {/* Step: Vibe */}
          {wizardStep === 'vibe' && (
            <div>
              <h2 className="text-lg font-bold text-neutral-100 mb-2">Pilih 1-2 Vibe</h2>
              <p className="text-sm text-neutral-400 mb-6">What feeling should your brand evoke?</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {VIBE_OPTIONS.map(v => {
                  const selected = wizardInputs.vibe.includes(v);
                  return (
                    <button
                      key={v}
                      onClick={() => {
                        setWizardInputs(p => ({
                          ...p,
                          vibe: selected
                            ? p.vibe.filter(x => x !== v)
                            : p.vibe.length < 2 ? [...p.vibe, v] : [p.vibe[1], v],
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        selected
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setWizardStep('audience')} className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg px-4 py-2 text-sm transition-colors">Back</button>
                <button disabled={wizardInputs.vibe.length === 0} onClick={() => setWizardStep('color')}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-800 disabled:text-neutral-600 text-white rounded-lg px-6 py-2 text-sm font-medium transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step: Color */}
          {wizardStep === 'color' && (
            <div>
              <h2 className="text-lg font-bold text-neutral-100 mb-2">Warna Favorit?</h2>
              <p className="text-sm text-neutral-400 mb-6">Optional — AI will pick colors if skipped.</p>
              <div className="flex flex-wrap gap-3 mb-4">
                {COLOR_FAMILIES.map(cf => (
                  <button
                    key={cf.hex}
                    onClick={() => setWizardInputs(p => ({ ...p, colorPreference: p.colorPreference === cf.hex ? null : cf.hex }))}
                    className={`w-12 h-12 rounded-xl border-2 transition-all ${
                      wizardInputs.colorPreference === cf.hex ? 'border-emerald-400 scale-110' : 'border-neutral-700 hover:border-neutral-500'
                    }`}
                    style={{ backgroundColor: cf.hex }}
                    title={cf.label}
                  />
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setWizardStep('vibe')} className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg px-4 py-2 text-sm transition-colors">Back</button>
                <button
                  onClick={handleWizardGenerate}
                  disabled={generating}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-800 disabled:text-neutral-600 text-white rounded-lg px-6 py-2 text-sm font-medium transition-colors"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  {generating ? 'Generating...' : 'Generate Brand Kits'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Brand Kit Editor ───
  return (
    <div className="min-h-full bg-[#0B0E14]">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/settings')}
              className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-neutral-100">Brand Kit</h1>
              <p className="text-xs text-neutral-500">Global — applies to all features</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView(kit ? 'picker' : 'picker')}
              className="flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-generate
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        {/* 2-Column: Controls + Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Controls */}
          <div className="space-y-2">
            {/* Identity */}
            <AccordionSection
              title="Identity"
              icon={<Type className="w-4 h-4" />}
              isOpen={activeAccordion === 'identity'}
              onToggle={() => setActiveAccordion(activeAccordion === 'identity' ? '' : 'identity')}
            >
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">Kit Name</label>
                  <input type="text" value={editKitName} onChange={(e) => setEditKitName(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:border-emerald-500 outline-none transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">@Handle</label>
                  <input type="text" value={editHandle} onChange={(e) => setEditHandle(e.target.value)} placeholder="@username"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:border-emerald-500 outline-none transition-colors" />
                </div>
              </div>
            </AccordionSection>

            {/* Color Palette */}
            <AccordionSection
              title="Color Palette"
              icon={<Palette className="w-4 h-4" />}
              isOpen={activeAccordion === 'colors'}
              onToggle={() => setActiveAccordion(activeAccordion === 'colors' ? '' : 'colors')}
            >
              <div className="space-y-3">
                {(Object.keys(editColors) as (keyof BrandColors)[]).map((key) => (
                  <div key={key} className="flex items-center gap-3">
                    <input
                      type="color"
                      value={editColors[key]}
                      onChange={(e) => setEditColors(p => ({ ...p, [key]: e.target.value }))}
                      className="w-8 h-8 rounded-lg border border-neutral-700 cursor-pointer bg-transparent"
                    />
                    <div className="flex-1">
                      <label className="text-xs text-neutral-400 capitalize">{key}</label>
                      <input
                        type="text"
                        value={editColors[key]}
                        onChange={(e) => setEditColors(p => ({ ...p, [key]: e.target.value }))}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-300 font-mono focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </AccordionSection>

            {/* Typography */}
            <AccordionSection
              title="Typography"
              icon={<Type className="w-4 h-4" />}
              isOpen={activeAccordion === 'typography'}
              onToggle={() => setActiveAccordion(activeAccordion === 'typography' ? '' : 'typography')}
            >
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">Font Family</label>
                  <select
                    value={editFont}
                    onChange={(e) => setEditFont(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:border-emerald-500 outline-none"
                  >
                    {CURATED_FONTS.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">Font Weight</label>
                  <select
                    value={editFontWeight}
                    onChange={(e) => setEditFontWeight(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:border-emerald-500 outline-none"
                  >
                    <option value="400">Regular (400)</option>
                    <option value="600">SemiBold (600)</option>
                    <option value="700">Bold (700)</option>
                    <option value="800">ExtraBold (800)</option>
                    <option value="900">Black (900)</option>
                  </select>
                </div>
              </div>
            </AccordionSection>

            {/* Watermark */}
            <AccordionSection
              title="Watermark"
              icon={<Droplets className="w-4 h-4" />}
              isOpen={activeAccordion === 'watermark'}
              onToggle={() => setActiveAccordion(activeAccordion === 'watermark' ? '' : 'watermark')}
            >
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">Opacity: {editWatermark.opacity}%</label>
                  <input
                    type="range" min="10" max="50" value={editWatermark.opacity}
                    onChange={(e) => setEditWatermark(p => ({ ...p, opacity: parseInt(e.target.value) }))}
                    className="w-full accent-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">Position</label>
                  <select
                    value={editWatermark.position}
                    onChange={(e) => setEditWatermark(p => ({ ...p, position: e.target.value as WatermarkPosition }))}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:border-emerald-500 outline-none"
                  >
                    <option value="center">Center</option>
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="top-right">Top Right</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">Icon Size</label>
                  <div className="flex gap-2">
                    {['small', 'medium', 'large'].map(s => (
                      <button key={s} onClick={() => setEditWatermark(p => ({ ...p, icon_size: s as any }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          editWatermark.icon_size === s
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                        }`}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </AccordionSection>
          </div>

          {/* Right: Live Preview */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Preview</p>
                <Eye className="w-4 h-4 text-neutral-600" />
              </div>

              {/* Mock carousel slide */}
              <div
                className="aspect-[4/5] rounded-lg flex flex-col items-center justify-between p-6 relative overflow-hidden"
                style={{ backgroundColor: editColors.secondary }}
              >
                {/* Pagination */}
                <p className="text-left w-full" style={{ color: editColors.muted, fontSize: 12 }}>
                  1/5
                </p>

                {/* Main content */}
                <div className="flex flex-col items-center gap-3 text-center">
                  {/* Watermark / brand icon */}
                  <div
                    className="w-12 h-12 rounded-full border-2 flex items-center justify-center"
                    style={{
                      borderColor: editColors.primary,
                      opacity: editWatermark.opacity / 100,
                    }}
                  >
                    <span style={{ color: editColors.primary, fontFamily: editFont, fontWeight: Number(editFontWeight), fontSize: 18 }}>
                      {editKitName.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Headline */}
                  <h3
                    style={{
                      color: editColors.accent,
                      fontFamily: editFont,
                      fontWeight: Number(editFontWeight),
                      fontSize: 22,
                      textShadow: editTextPresets.headline.shadow ? '0 2px 8px rgba(0,0,0,0.5)' : 'none',
                    }}
                  >
                    SAMPLE HEADLINE
                  </h3>

                  {/* Subtitle */}
                  <p style={{ color: editColors.muted, fontFamily: editFont, fontSize: 13 }}>
                    Your subtitle text here
                  </p>

                  {/* CTA */}
                  <div
                    className="mt-2 px-4 py-1.5 rounded-lg font-bold text-xs"
                    style={{
                      backgroundColor: editColors.highlight,
                      color: editColors.secondary,
                      fontFamily: editFont,
                      borderRadius: editTextPresets.cta.borderRadius,
                    }}
                  >
                    SWIPE FOR MORE
                  </div>
                </div>

                {/* Handle */}
                <p style={{ color: editColors.muted, fontSize: 10, opacity: editWatermark.opacity / 100 }}>
                  {editHandle || '@handle'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Accordion Section ───
const AccordionSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, icon, isOpen, onToggle, children }) => (
  <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-neutral-800/50 transition-colors"
    >
      <div className="flex items-center gap-2">
        <span className="text-neutral-400">{icon}</span>
        <span className="text-sm font-medium text-neutral-200">{title}</span>
      </div>
      <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    {isOpen && <div className="px-4 pb-4">{children}</div>}
  </div>
);
