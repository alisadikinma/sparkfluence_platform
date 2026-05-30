import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { generateOrderId } from "../../lib/orderIdGenerator";
import { Target, Loader2, Zap, TrendingUp, Users, Clock, Globe, Sparkles, ChevronDown, Brain, PenTool } from "lucide-react";

// Flag icons as SVG components
const FlagIcon = ({ country }: { country: 'id' | 'en' | 'hi' | 'fr' }) => {
  switch (country) {
    case 'id': // Indonesia - Red and White
      return (
        <svg viewBox="0 0 24 16" className="w-6 h-4 rounded-sm overflow-hidden">
          <rect width="24" height="8" fill="#FF0000" />
          <rect y="8" width="24" height="8" fill="#FFFFFF" />
        </svg>
      );
    case 'en': // UK - Union Jack
      return (
        <svg viewBox="0 0 24 16" className="w-6 h-4 rounded-sm overflow-hidden">
          <rect width="24" height="16" fill="#012169" />
          <path d="M0,0 L24,16 M24,0 L0,16" stroke="#FFFFFF" strokeWidth="3" />
          <path d="M0,0 L24,16 M24,0 L0,16" stroke="#C8102E" strokeWidth="1.5" />
          <path d="M12,0 V16 M0,8 H24" stroke="#FFFFFF" strokeWidth="5" />
          <path d="M12,0 V16 M0,8 H24" stroke="#C8102E" strokeWidth="3" />
        </svg>
      );
    case 'hi': // India - Saffron, White, Green with Ashoka Chakra
      return (
        <svg viewBox="0 0 24 16" className="w-6 h-4 rounded-sm overflow-hidden">
          <rect width="24" height="5.33" fill="#FF9933" />
          <rect y="5.33" width="24" height="5.33" fill="#FFFFFF" />
          <rect y="10.66" width="24" height="5.34" fill="#138808" />
          <circle cx="12" cy="8" r="2" fill="none" stroke="#000080" strokeWidth="0.4" />
        </svg>
      );
    case 'fr': // France - Blue, White, Red
      return (
        <svg viewBox="0 0 24 16" className="w-6 h-4 rounded-sm overflow-hidden">
          <rect width="8" height="16" fill="#002654" />
          <rect x="8" width="8" height="16" fill="#FFFFFF" />
          <rect x="16" width="8" height="16" fill="#CE1126" />
        </svg>
      );
    default:
      return null;
  }
};

// Age group type
type AgeGroup = 'Gen_Z' | 'Millennial' | 'Gen_X' | 'Boomer';

// Form data interface
interface AdFormData {
  businessType: 'B2B' | 'B2C';
  productName: string;
  productDescription: string;
  targetAudienceAge: AgeGroup[];
  campaignGoal: 'Awareness' | 'Consideration' | 'Conversion';
  platform: 'TikTok' | 'Instagram_Reels' | 'Facebook_Feed' | 'LinkedIn' | 'YouTube_Shorts';
  duration: number;
  language: 'id' | 'en' | 'hi' | 'fr';
}

// Platform icons as SVG
const PlatformIcon = ({ platform, active }: { platform: string; active: boolean }) => {
  const color = active ? 'white' : 'currentColor';
  switch (platform) {
    case 'TikTok':
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill={color}>
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
      );
    case 'Instagram_Reels':
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill={color}>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.405a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z"/>
        </svg>
      );
    case 'Facebook_Feed':
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill={color}>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      );
    case 'LinkedIn':
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill={color}>
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      );
    case 'YouTube_Shorts':
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill={color}>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      );
    default:
      return null;
  }
};

export const AdStudio = (): JSX.Element => {
  const navigate = useNavigate();
  const { language: uiLanguage } = useLanguage();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [generatingStep, setGeneratingStep] = useState<string>("");
  const [generatingPhase, setGeneratingPhase] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const languageDropdownRef = useRef<HTMLDivElement>(null);

  // Loading phase steps for different languages
  const loadingPhases = {
    id: [
      { step: "Menganalisis produk...", icon: "analyze" },
      { step: "Memuat framework iklan...", icon: "load" },
      { step: "Membuat script iklan...", icon: "write" },
      { step: "Menyelesaikan script...", icon: "finish" }
    ],
    en: [
      { step: "Analyzing product...", icon: "analyze" },
      { step: "Loading ad frameworks...", icon: "load" },
      { step: "Crafting ad script...", icon: "write" },
      { step: "Finalizing script...", icon: "finish" }
    ],
    hi: [
      { step: "उत्पाद का विश्लेषण...", icon: "analyze" },
      { step: "विज्ञापन फ्रेमवर्क लोड हो रहा है...", icon: "load" },
      { step: "विज्ञापन स्क्रिप्ट बना रहा है...", icon: "write" },
      { step: "स्क्रिप्ट पूरी हो रही है...", icon: "finish" }
    ],
    fr: [
      { step: "Analyse du produit...", icon: "analyze" },
      { step: "Chargement des frameworks...", icon: "load" },
      { step: "Création du script...", icon: "write" },
      { step: "Finalisation...", icon: "finish" }
    ]
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
        setLanguageDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const languageOptions = [
    { value: 'id' as const, label: 'Indonesia' },
    { value: 'en' as const, label: 'English' },
    { value: 'hi' as const, label: 'India' },
    { value: 'fr' as const, label: 'France' },
  ];

  // Load saved form data from localStorage or use defaults
  const [formData, setFormData] = useState<AdFormData>(() => {
    const saved = localStorage.getItem('ad_studio_form_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          businessType: parsed.businessType || 'B2C',
          productName: parsed.productName || '',
          productDescription: parsed.productDescription || '',
          targetAudienceAge: parsed.targetAudienceAge || ['Millennial'],
          campaignGoal: parsed.campaignGoal || 'Conversion',
          platform: parsed.platform || 'TikTok',
          duration: parsed.duration || 30,
          language: parsed.language || ((uiLanguage === 'id' || uiLanguage === 'en' || uiLanguage === 'hi') ? uiLanguage : 'en'),
        };
      } catch {
        // Invalid JSON, use defaults
      }
    }
    return {
      businessType: 'B2C',
      productName: '',
      productDescription: '',
      targetAudienceAge: ['Millennial'],
      campaignGoal: 'Conversion',
      platform: 'TikTok',
      duration: 30,
      language: (uiLanguage === 'id' || uiLanguage === 'en' || uiLanguage === 'hi') ? uiLanguage : 'en',
    };
  });

  // Auto-save form data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('ad_studio_form_data', JSON.stringify(formData));
  }, [formData]);

  // Toggle age group selection (multi-select)
  const toggleAgeGroup = (age: AgeGroup) => {
    setFormData(prev => {
      const currentSelection = prev.targetAudienceAge;
      if (currentSelection.includes(age)) {
        // Remove if already selected (but keep at least one)
        if (currentSelection.length > 1) {
          return { ...prev, targetAudienceAge: currentSelection.filter(a => a !== age) };
        }
        return prev;
      } else {
        // Add to selection
        return { ...prev, targetAudienceAge: [...currentSelection, age] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productName.trim() || !formData.productDescription.trim()) {
      setError(uiLanguage === 'id' ? 'Isi nama dan deskripsi produk' : 'Fill in product name and description');
      return;
    }
    setLoading(true);
    setGeneratingPhase(0);
    setError(null);

    // Get current language phases
    const currentPhases = loadingPhases[uiLanguage as keyof typeof loadingPhases] || loadingPhases.en;

    try {
      console.log('Generating ad script with:', formData);

      // Phase 1: Analyzing
      setGeneratingStep(currentPhases[0].step);
      setGeneratingPhase(1);

      // Map language code to edge function format
      const languageMap: Record<string, string> = {
        'id': 'indonesian',
        'en': 'english',
        'hi': 'hindi',
        'fr': 'french'
      };

      // Map age groups to human readable format for prompt
      const ageGroupLabels: Record<AgeGroup, string> = {
        'Gen_Z': 'Gen Z (18-24)',
        'Millennial': 'Millennial (25-39)',
        'Gen_X': 'Gen X (40-54)',
        'Boomer': 'Boomer (55+)'
      };

      // Build content prompt for the AI
      const targetAudience = formData.targetAudienceAge.map(age => ageGroupLabels[age]).join(', ');
      const contentPrompt = `
**Product/Service:** ${formData.productName}
**Business Type:** ${formData.businessType}
**Description & Benefits:** ${formData.productDescription}

**Target Audience:** ${targetAudience}
**Campaign Goal:** ${formData.campaignGoal}
**Platform:** ${formData.platform.replace('_', ' ')}

Create a compelling ${formData.campaignGoal.toLowerCase()} ad script for this ${formData.businessType} product targeting ${targetAudience}.
Focus on emotional storytelling that resonates with the target demographic.
`.trim();

      await new Promise(resolve => setTimeout(resolve, 600));

      // Phase 2: Loading frameworks
      setGeneratingStep(currentPhases[1].step);
      setGeneratingPhase(2);

      await new Promise(resolve => setTimeout(resolve, 600));

      // Phase 3: Crafting script
      setGeneratingStep(currentPhases[2].step);
      setGeneratingPhase(3);

      // Call edge function
      const { data, error: fnError } = await supabase.functions.invoke('generate-script', {
        body: {
          input_type: 'topic',
          content: contentPrompt,
          duration: `${formData.duration}s`,
          aspect_ratio: formData.platform === 'Facebook_Feed' || formData.platform === 'LinkedIn' ? '4:5' : '9:16',
          platform: formData.platform.toLowerCase().replace('_', '-'),
          language: languageMap[formData.language] || 'english',
          user_id: user?.id
        }
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to generate script');
      }

      if (!data?.success) {
        throw new Error(data?.error?.message || 'Script generation failed');
      }

      console.log('Generated script:', data.data);

      // Phase 4: Finalizing
      setGeneratingStep(currentPhases[3].step);
      setGeneratingPhase(4);
      await new Promise(resolve => setTimeout(resolve, 400));

      const segments = data.data.segments;
      const sessionId = `ad_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const orderId = generateOrderId();

      // Save to localStorage for recovery
      const adStudioData = {
        sessionId,
        orderId,
        formData,
        segments,
        metadata: data.data.metadata,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem("ad_studio_data", JSON.stringify(adStudioData));

      // Navigate to Ad Studio workspace
      navigate(`/ad-studio/${orderId}/script`, {
        state: {
          sessionId,
          orderId,
          topic: `${formData.productName} - ${formData.campaignGoal} Ad`,
          segments: segments,
          metadata: data.data.metadata,
          videoSettings: {
            duration: formData.duration,
            aspectRatio: formData.platform === 'Facebook_Feed' || formData.platform === 'LinkedIn' ? '4:5' : '9:16',
            language: languageMap[formData.language] || 'english',
            model: 'kling-2.5'
          },
          characterDescription: '',
          avatarOption: 'none',
          avatarId: null,
          avatarUrl: null,
          fromAdStudio: true,
        },
      });

    } catch (err) {
      console.error('Script generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate ad script');
    } finally {
      setLoading(false);
    }
  };

  // Get framework based on settings
  const getFramework = () => {
    if (formData.campaignGoal === 'Awareness') return 'AIDA';
    if (formData.campaignGoal === 'Consideration') return 'PAS';
    return 'Hook-Story-Offer';
  };

  const getAspectRatio = () => formData.platform === 'Facebook_Feed' ? '4:5' : '9:16';

  // Full-screen loading overlay
  if (loading) {
    const phaseIcons = [
      <Brain key="brain" className="w-8 h-8 text-white" />,
      <Zap key="zap" className="w-8 h-8 text-white" />,
      <PenTool key="pen" className="w-8 h-8 text-white" />,
      <Sparkles key="sparkles" className="w-8 h-8 text-white" />
    ];

    const phaseLabels = {
      id: ["Analisis", "Framework", "Penulisan", "Selesai"],
      en: ["Analyze", "Framework", "Writing", "Complete"],
      hi: ["विश्लेषण", "फ्रेमवर्क", "लेखन", "पूर्ण"],
      fr: ["Analyse", "Framework", "Écriture", "Terminé"]
    };
    const labels = phaseLabels[uiLanguage as keyof typeof phaseLabels] || phaseLabels.en;

    return (
      <div className="w-full h-full bg-page flex flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-8 max-w-md w-full">
          {/* Animated Icon */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <div className="animate-pulse">
                {phaseIcons[Math.min(generatingPhase - 1, 3)] || phaseIcons[0]}
              </div>
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500 animate-spin" style={{ animationDuration: '1.5s' }} />
          </div>

          {/* Title and current step */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-text-primary mb-3">
              {uiLanguage === 'id' ? 'Membuat Script Iklan' : uiLanguage === 'hi' ? 'विज्ञापन स्क्रिप्ट बना रहे हैं' : uiLanguage === 'fr' ? 'Création du Script Pub' : 'Creating Ad Script'}
            </h2>
            <p className="text-violet-400 font-medium text-lg mb-2 min-h-[28px] transition-all duration-300">
              {generatingStep}
            </p>
            <p className="text-text-muted text-sm">
              {uiLanguage === 'id' ? 'Mohon tunggu sebentar...' : uiLanguage === 'hi' ? 'कृपया प्रतीक्षा करें...' : uiLanguage === 'fr' ? 'Veuillez patienter...' : 'Please wait a moment...'}
            </p>
          </div>

          {/* Progress steps */}
          <div className="flex items-center gap-2 w-full px-4">
            {[1, 2, 3, 4].map((phase) => (
              <React.Fragment key={phase}>
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                      generatingPhase >= phase
                        ? 'bg-violet-500 scale-110'
                        : 'bg-surface'
                    }`}
                  >
                    {generatingPhase > phase ? (
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : generatingPhase === phase ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <span className="text-text-muted text-sm font-medium">{phase}</span>
                    )}
                  </div>
                  <span className={`text-xs transition-colors duration-300 ${
                    generatingPhase >= phase ? 'text-violet-400' : 'text-text-muted'
                  }`}>
                    {labels[phase - 1]}
                  </span>
                </div>
                {phase < 4 && (
                  <div
                    className={`h-0.5 flex-1 transition-all duration-500 ${
                      generatingPhase > phase ? 'bg-violet-500' : 'bg-surface'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Product being processed */}
          {formData.productName && (
            <div className="bg-card border border-border-default rounded-xl p-4 w-full">
              <p className="text-text-muted text-xs mb-1">
                {uiLanguage === 'id' ? 'Produk:' : uiLanguage === 'hi' ? 'उत्पाद:' : uiLanguage === 'fr' ? 'Produit:' : 'Product:'}
              </p>
              <p className="text-text-primary text-sm line-clamp-2">{formData.productName}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background">
        <div className="pb-4 pt-6 px-4 sm:px-8 lg:px-10">
          <div className="w-full">

            {/* Main Grid - 3 columns */}
            <div className="grid grid-cols-12 gap-5">

              {/* Left Column - Product Info */}
              <div className="col-span-12 lg:col-span-5">
                <div className="bg-card rounded-2xl border border-border-default p-6 h-full">
                  {/* Header */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
                      <Target className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-text-primary">Ad Studio</h1>
                      <p className="text-sm text-text-secondary">{uiLanguage === 'id' ? 'Buat iklan yang convert' : 'Create ads that convert'}</p>
                    </div>
                  </div>

                  {/* Product Name + Type */}
                  <div className="space-y-5">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-text-secondary mb-2 block">
                          {uiLanguage === 'id' ? 'Produk' : 'Product'}
                        </label>
                        <input
                          type="text"
                          value={formData.productName}
                          onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                          placeholder="Brand name..."
                          className="w-full px-4 py-3.5 rounded-xl bg-surface border border-border-default text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all text-base"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-text-secondary mb-2 block">Type</label>
                        <div className="flex bg-surface rounded-xl p-1.5 border border-border-default">
                          {(['B2C', 'B2B'] as const).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, businessType: type }))}
                              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                formData.businessType === type
                                  ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg'
                                  : 'text-text-secondary hover:text-text-primary'
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="text-sm font-medium text-text-secondary mb-2 block">
                        {uiLanguage === 'id' ? 'Deskripsi & Keunggulan' : 'Description & Benefits'}
                      </label>
                      <textarea
                        value={formData.productDescription}
                        onChange={(e) => setFormData(prev => ({ ...prev, productDescription: e.target.value }))}
                        placeholder={uiLanguage === 'id' ? 'Jelaskan produk dan keunggulan utamanya...' : 'Describe your product and key benefits...'}
                        rows={8}
                        className="w-full px-4 py-3.5 rounded-xl bg-surface border border-border-default text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all resize-none text-base"
                      />
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 rounded-xl p-4 border border-violet-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-4 h-4 text-violet-400" />
                          <span className="text-xs text-text-secondary uppercase tracking-wider">Framework</span>
                        </div>
                        <p className="text-base font-bold text-text-primary">{getFramework()}</p>
                      </div>
                      <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl p-4 border border-cyan-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-cyan-400" />
                          <span className="text-xs text-text-secondary uppercase tracking-wider">Ratio</span>
                        </div>
                        <p className="text-base font-bold text-text-primary">{getAspectRatio()}</p>
                      </div>
                      <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl p-4 border border-amber-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span className="text-xs text-text-secondary uppercase tracking-wider">Duration</span>
                        </div>
                        <p className="text-base font-bold text-text-primary">{formData.duration}s</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle Column - Targeting */}
              <div className="col-span-12 lg:col-span-4 xl:col-span-4">
                <div className="bg-card rounded-2xl border border-border-default p-6 h-full">
                  <div className="flex items-center gap-3 mb-5">
                    <Users className="w-5 h-5 text-violet-400" />
                    <h2 className="text-lg font-semibold text-text-primary">{uiLanguage === 'id' ? 'Target & Tujuan' : 'Targeting & Goal'}</h2>
                  </div>

                  {/* Age Groups - Multi Select */}
                  <div className="mb-5">
                    <label className="text-sm font-medium text-text-secondary mb-3 block">
                      {uiLanguage === 'id' ? 'Kelompok Usia' : 'Age Group'}
                      <span className="text-xs text-text-muted ml-2">({uiLanguage === 'id' ? 'pilih beberapa' : 'select multiple'})</span>
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {([
                        { value: 'Gen_Z' as AgeGroup, label: 'Gen Z', age: '18-24', emoji: '🎮' },
                        { value: 'Millennial' as AgeGroup, label: 'Millennial', age: '25-39', emoji: '💼' },
                        { value: 'Gen_X' as AgeGroup, label: 'Gen X', age: '40-54', emoji: '🏠' },
                        { value: 'Boomer' as AgeGroup, label: 'Boomer', age: '55+', emoji: '📺' },
                      ]).map((age) => {
                        const isSelected = formData.targetAudienceAge.includes(age.value);
                        return (
                          <button
                            key={age.value}
                            type="button"
                            onClick={() => toggleAgeGroup(age.value)}
                            className={`py-4 px-2 rounded-xl text-center transition-all relative ${
                              isSelected
                                ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25'
                                : 'bg-surface hover:bg-surface/80 text-text-secondary border border-border-default hover:border-violet-500/50'
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white/30 flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                            <div className="text-xl mb-1">{age.emoji}</div>
                            <div className="text-xs font-bold">{age.label}</div>
                            <div className="text-[10px] opacity-70">{age.age}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Campaign Goals */}
                  <div className="mb-5">
                    <label className="text-sm font-medium text-text-secondary mb-3 block">
                      {uiLanguage === 'id' ? 'Tujuan Kampanye' : 'Campaign Goal'}
                    </label>
                    <div className="space-y-2.5">
                      {([
                        { value: 'Awareness', icon: '👀', label: 'Awareness', desc: uiLanguage === 'id' ? 'Perkenalkan brand ke audiens baru' : 'Introduce brand to new audience' },
                        { value: 'Consideration', icon: '🤔', label: 'Consideration', desc: uiLanguage === 'id' ? 'Edukasi tentang produk' : 'Educate about product' },
                        { value: 'Conversion', icon: '🎯', label: 'Conversion', desc: uiLanguage === 'id' ? 'Dorong pembelian langsung' : 'Drive direct purchase' },
                      ] as const).map((goal) => (
                        <button
                          key={goal.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, campaignGoal: goal.value }))}
                          className={`w-full p-4 rounded-xl text-left transition-all flex items-center gap-3 ${
                            formData.campaignGoal === goal.value
                              ? 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border-2 border-violet-500'
                              : 'bg-surface border border-border-default hover:border-violet-500/50'
                          }`}
                        >
                          <span className="text-2xl">{goal.icon}</span>
                          <div className="flex-1">
                            <div className={`text-sm font-semibold ${formData.campaignGoal === goal.value ? 'text-violet-400' : 'text-text-primary'}`}>
                              {goal.label}
                            </div>
                            <div className="text-xs text-text-secondary">{goal.desc}</div>
                          </div>
                          {formData.campaignGoal === goal.value && (
                            <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center">
                              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration & Language Row - Dropdowns */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-text-secondary mb-2 block flex items-center gap-1.5">
                        <Clock className="w-4 h-4" /> {uiLanguage === 'id' ? 'Durasi' : 'Duration'}
                      </label>
                      <div className="relative">
                        <select
                          value={formData.duration}
                          onChange={(e) => setFormData(prev => ({ ...prev, duration: Number(e.target.value) }))}
                          className="w-full px-4 py-3 rounded-xl bg-surface border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all appearance-none cursor-pointer text-sm font-medium"
                        >
                          <option value={15}>15 seconds</option>
                          <option value={30}>30 seconds</option>
                          <option value={45}>45 seconds</option>
                          <option value={60}>60 seconds</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-text-secondary mb-2 block flex items-center gap-1.5">
                        <Globe className="w-4 h-4" /> {uiLanguage === 'id' ? 'Bahasa' : 'Language'}
                      </label>
                      <div className="relative" ref={languageDropdownRef}>
                        <button
                          type="button"
                          onClick={() => setLanguageDropdownOpen(!languageDropdownOpen)}
                          className="w-full px-4 py-3 rounded-xl bg-surface border border-border-default text-text-primary focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all cursor-pointer text-sm flex items-center gap-2.5"
                        >
                          <FlagIcon country={formData.language} />
                          <span className="flex-1 text-left">{languageOptions.find(l => l.value === formData.language)?.label}</span>
                          <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${languageDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {languageDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border-default rounded-xl shadow-lg shadow-black/20 overflow-hidden z-50">
                            {languageOptions.map((lang) => (
                              <button
                                key={lang.value}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, language: lang.value }));
                                  setLanguageDropdownOpen(false);
                                }}
                                className={`w-full px-4 py-3 flex items-center gap-2.5 text-sm transition-colors hover:bg-violet-500/10 ${
                                  formData.language === lang.value ? 'bg-violet-500/20 text-violet-400' : 'text-text-primary'
                                }`}
                              >
                                <FlagIcon country={lang.value} />
                                <span>{lang.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Platform & Generate */}
              <div className="col-span-12 lg:col-span-3 xl:col-span-3">
                <div className="bg-card rounded-2xl border border-border-default p-6 h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-5">
                    <Sparkles className="w-5 h-5 text-violet-400" />
                    <h2 className="text-lg font-semibold text-text-primary">Platform</h2>
                  </div>

                  {/* Platforms */}
                  <div className="space-y-2.5 flex-1">
                    {([
                      { value: 'TikTok', label: 'TikTok', desc: '9:16 • Sound ON', hot: true },
                      { value: 'Instagram_Reels', label: 'Instagram Reels', desc: '9:16 • Trending' },
                      { value: 'Facebook_Feed', label: 'Facebook Feed', desc: '4:5 • Captions' },
                      { value: 'LinkedIn', label: 'LinkedIn', desc: '4:5 • Professional' },
                      { value: 'YouTube_Shorts', label: 'YouTube Shorts', desc: '9:16 • Discovery' },
                    ] as const).map((platform) => (
                      <button
                        key={platform.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, platform: platform.value }))}
                        className={`w-full p-4 rounded-xl text-left transition-all flex items-center gap-3 ${
                          formData.platform === platform.value
                            ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25'
                            : 'bg-surface border border-border-default hover:border-violet-500/50'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          formData.platform === platform.value ? 'bg-white/20' : 'bg-violet-500/10'
                        }`}>
                          <PlatformIcon platform={platform.value} active={formData.platform === platform.value} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold truncate">{platform.label}</span>
                            {platform.hot && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500 text-white">HOT</span>
                            )}
                          </div>
                          <div className={`text-xs ${formData.platform === platform.value ? 'text-white/70' : 'text-text-secondary'}`}>
                            {platform.desc}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  {/* Generate Button */}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading || !formData.productName.trim() || !formData.productDescription.trim()}
                    className="mt-5 w-full py-5 rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white font-bold text-lg flex items-center justify-center gap-2.5 hover:shadow-xl hover:shadow-violet-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-6 h-6" />
                        <span>Generate Script</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
};
