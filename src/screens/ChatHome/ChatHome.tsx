import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useOnboardingStatus } from '../../hooks/useOnboardingStatus';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { generateOrderId } from '../../lib/orderIdGenerator';
import { getScriptLanguageFromCountry } from '../../lib/countryDetection';
import { ScriptForm, SelectedTopic } from '../ScriptLab/components/ScriptForm';
import { TopicRecommendations } from '../ScriptLab/components/TopicRecommendations';
import { TikTokChallenge } from '../../types/topic';
import { Sparkles, Loader2, Brain, Zap, PenTool, X, ChevronDown } from 'lucide-react';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ChatHome: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language: uiLanguage } = useLanguage();
  const { updateOnboardingData } = useOnboarding();
  const { data: onboardingData } = useOnboardingStatus();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [generatingStep, setGeneratingStep] = useState<string>('');
  const [generatingPhase, setGeneratingPhase] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<SelectedTopic | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<TikTokChallenge | null>(null);

  // Lifted state: script language + DNA toggle (shared between TopicRecommendations & ScriptForm)
  const [scriptLang, setScriptLang] = useState('en');
  const [scriptLangInitialized, setScriptLangInitialized] = useState(false);
  const [useDnaTone, setUseDnaTone] = useState(true);

  const hasDnaTone = !!(onboardingData?.creative_dna && onboardingData.creative_dna.length > 0);

  // Set script language based on user's country (only once when data loads)
  useEffect(() => {
    if (!scriptLangInitialized && onboardingData?.country) {
      const defaultLang = getScriptLanguageFromCountry(onboardingData.country);
      setScriptLang(defaultLang);
      setScriptLangInitialized(true);
    }
  }, [onboardingData?.country, scriptLangInitialized]);

  // Ref to scroll ScriptForm into view when topic selected
  const formRef = useRef<HTMLDivElement>(null);

  // Determine session type from current URL path
  const getSessionType = (): 'script_gen' | 'creator_lab' | 'ad_studio' => {
    if (location.pathname.startsWith('/creator-lab')) return 'creator_lab';
    if (location.pathname.startsWith('/ad-studio')) return 'ad_studio';
    return 'script_gen';
  };

  const sessionType = getSessionType();

  const handleSelectTopic = (topic: SelectedTopic) => {
    setSelectedTopic(topic);
  };

  // Scroll form into view when topic or challenge is selected
  useEffect(() => {
    if ((selectedTopic || selectedChallenge) && formRef.current) {
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [selectedTopic, selectedChallenge]);

  const handleClearTopic = () => {
    setSelectedTopic(null);
  };

  const handleSubmit = async (formData: {
    prompt: string;
    inputType: 'topic' | 'transcript';
    model: string;
    ratio: string;
    duration: string;
    language: string;
    useDnaTone: boolean;
    creativeDna: string[] | null;
    characterDescription: string | null;
    avatarOption?: 'none' | 'profile' | 'saved' | 'upload';
    avatarId?: string | null;
    avatarUrl?: string | null;
  }) => {
    // Allow empty prompt when challenge is selected (AI auto-picks topic)
    if (!formData.prompt.trim() && !selectedChallenge) return;

    setLoading(true);
    setGeneratingPhase(0);
    setError(null);

    const phases = {
      id: [
        { step: 'Menganalisis topik...', icon: 'analyze' },
        { step: 'Memuat framework viral...', icon: 'load' },
        { step: 'Membuat script viral...', icon: 'write' },
        { step: 'Menyelesaikan script...', icon: 'finish' },
      ],
      en: [
        { step: 'Analyzing topic...', icon: 'analyze' },
        { step: 'Loading viral frameworks...', icon: 'load' },
        { step: 'Crafting viral script...', icon: 'write' },
        { step: 'Finalizing script...', icon: 'finish' },
      ],
      hi: [
        { step: 'विषय का विश्लेषण...', icon: 'analyze' },
        { step: 'वायरल फ्रेमवर्क लोड हो रहा है...', icon: 'load' },
        { step: 'वायरल स्क्रिप्ट बना रहा है...', icon: 'write' },
        { step: 'स्क्रिप्ट पूरी हो रही है...', icon: 'finish' },
      ],
    };

    const currentPhases = phases[uiLanguage as keyof typeof phases] || phases.en;

    try {
      setGeneratingStep(currentPhases[0].step);
      setGeneratingPhase(1);

      const langMap: Record<string, string> = {
        id: 'indonesian',
        en: 'english',
        hi: 'hindi',
        fr: 'french',
      };

      await new Promise((resolve) => setTimeout(resolve, 600));
      setGeneratingStep(currentPhases[1].step);
      setGeneratingPhase(2);

      await new Promise((resolve) => setTimeout(resolve, 600));
      setGeneratingStep(currentPhases[2].step);
      setGeneratingPhase(3);

      const { data: scriptData, error: scriptError } = await supabase.functions.invoke(
        'generate-script',
        {
          body: {
            input_type: formData.inputType,
            content: formData.prompt.trim(),
            duration: formData.duration,
            aspect_ratio: formData.ratio,
            platform: formData.ratio === '9:16' ? 'tiktok' : 'youtube',
            language: langMap[formData.language] || 'english',
            user_id: user?.id,
            use_dna_tone: formData.useDnaTone,
            creative_dna: formData.creativeDna,
            video_model: formData.model === 'auto' ? 'veo31' : formData.model,
            ...(selectedChallenge ? {
              challenge_format: selectedChallenge.name,
              challenge_instruction: selectedChallenge.script_instruction,
            } : {}),
          },
        },
      );

      if (scriptError) throw new Error(scriptError.message);

      if (
        !scriptData?.success ||
        !scriptData?.data?.segments ||
        scriptData.data.segments.length === 0
      ) {
        throw new Error(
          scriptData?.error?.message || 'Failed to generate script. Please try again.',
        );
      }

      setGeneratingStep(currentPhases[3].step);
      setGeneratingPhase(4);
      await new Promise((resolve) => setTimeout(resolve, 400));

      const segments = scriptData.data.segments;
      const orderId = generateOrderId();

      // Save to localStorage for backward compat
      const scriptLabData = {
        topic: formData.prompt,
        inputType: formData.inputType,
        model: formData.model,
        aspectRatio: formData.ratio,
        duration: formData.duration,
        language: formData.language,
        useDnaTone: formData.useDnaTone,
        orderId: orderId,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('script_lab_data', JSON.stringify(scriptLabData));

      updateOnboardingData({
        platforms: formData.ratio === '9:16' ? ['tiktok', 'instagram'] : ['youtube'],
      });

      // Navigate to workspace with script data
      const basePath =
        sessionType === 'creator_lab'
          ? '/creator-lab'
          : sessionType === 'ad_studio'
            ? '/ad-studio'
            : '/script-gen';

      navigate(`${basePath}/${orderId}/script`, {
        state: {
          sessionId: `video_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          orderId,
          topic: formData.prompt.trim(),
          segments: segments,
          metadata: scriptData.data.metadata,
          hookOptions: scriptData.data.hook_options || null,
          qualityReport: scriptData.data.quality_report || null,
          videoSettings: {
            duration: formData.duration,
            aspectRatio: formData.ratio,
            language: langMap[formData.language] || 'english',
            model: formData.model,
          },
          characterDescription: formData.characterDescription,
          avatarOption: formData.avatarOption || 'none',
          avatarId: formData.avatarId || null,
          avatarUrl: formData.avatarUrl || null,
          sessionType,
        },
      });
    } catch (err: any) {
      console.error('Error generating script:', err);
      setError(err.message || 'Failed to generate script. Please try again.');
      setLoading(false);
    }
  };

  // Greeting text
  const userName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Creator';
  const greeting = {
    id: `Hai ${userName}`,
    en: `Hi ${userName}`,
    hi: `नमस्ते ${userName}`,
  };
  const subtitle = {
    id: 'Pilih topik yang menarik, lalu kita buatkan scriptnya.',
    en: 'Pick a topic that excites you, then we\'ll craft the script.',
    hi: 'एक रोचक विषय चुनें, फिर हम स्क्रिप्ट बनाएंगे।',
  };

  // ── Full-screen loading overlay ──
  if (loading) {
    const phaseIcons = [
      <Brain key="brain" className="w-8 h-8 text-white" />,
      <Zap key="zap" className="w-8 h-8 text-white" />,
      <PenTool key="pen" className="w-8 h-8 text-white" />,
      <Sparkles key="sparkles" className="w-8 h-8 text-white" />,
    ];

    const phaseLabels = {
      id: ['Analisis', 'Framework', 'Penulisan', 'Selesai'],
      en: ['Analyze', 'Framework', 'Writing', 'Complete'],
      hi: ['विश्लेषण', 'फ्रेमवर्क', 'लेखन', 'पूर्ण'],
    };
    const labels = phaseLabels[uiLanguage as keyof typeof phaseLabels] || phaseLabels.en;

    const currentTopic = selectedTopic?.title || (selectedChallenge ? `${selectedChallenge.name} Challenge` : '');

    return (
      <div className="w-full min-h-screen bg-[#0B0E14] flex flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-8 max-w-md w-full">
          {/* Animated Icon */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <div className="animate-pulse">
                {phaseIcons[Math.min(generatingPhase - 1, 3)] || phaseIcons[0]}
              </div>
            </div>
            <div
              className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-500 animate-spin"
              style={{ animationDuration: '1.5s' }}
            />
          </div>

          {/* Title and current step */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#FAFAF9] mb-3">
              {uiLanguage === 'id'
                ? 'Membuat Script Viral'
                : uiLanguage === 'hi'
                  ? 'वायरल स्क्रिप्ट बना रहे हैं'
                  : 'Creating Viral Script'}
            </h2>
            <p className="text-emerald-400 font-medium text-lg mb-2 min-h-[28px] transition-all duration-300">
              {generatingStep}
            </p>
            <p className="text-[#78716C] text-sm">
              {uiLanguage === 'id'
                ? 'Mohon tunggu sebentar...'
                : uiLanguage === 'hi'
                  ? 'कृपया प्रतीक्षा करें...'
                  : 'Please wait a moment...'}
            </p>
          </div>

          {/* Progress steps */}
          <div className="flex items-center gap-2 w-full px-4">
            {[1, 2, 3, 4].map((phase) => (
              <React.Fragment key={phase}>
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                      generatingPhase >= phase ? 'bg-emerald-500 scale-110' : 'bg-[#161616]'
                    }`}
                  >
                    {generatingPhase > phase ? (
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : generatingPhase === phase ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <span className="text-[#78716C] text-sm font-medium">{phase}</span>
                    )}
                  </div>
                  <span
                    className={`text-xs transition-colors duration-300 ${
                      generatingPhase >= phase ? 'text-emerald-400' : 'text-[#78716C]'
                    }`}
                  >
                    {labels[phase - 1]}
                  </span>
                </div>
                {phase < 4 && (
                  <div
                    className={`h-0.5 flex-1 transition-all duration-500 ${
                      generatingPhase > phase ? 'bg-emerald-500' : 'bg-[#161616]'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Topic being processed */}
          {currentTopic && (
            <div className="bg-[#12121a] border border-[#262626] rounded-xl p-4 w-full">
              <p className="text-[#78716C] text-xs mb-1">
                {uiLanguage === 'id'
                  ? 'Topik:'
                  : uiLanguage === 'hi'
                    ? 'विषय:'
                    : 'Topic:'}
              </p>
              <p className="text-[#FAFAF9] text-sm line-clamp-2">{currentTopic}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Main Layout: Topic-first (Gemini-style) ──
  return (
    <div className="w-full min-h-screen bg-[#0B0E14] overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Greeting Section ── */}
        <div className={`pt-8 sm:pt-12 pb-6 sm:pb-8 text-center transition-all duration-500 ${selectedTopic ? 'pt-4 sm:pt-6 pb-3 sm:pb-4' : ''}`}>
          <h1 className={`font-bold text-[#FAFAF9] transition-all duration-500 ${selectedTopic ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-4xl'}`}>
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              {greeting[uiLanguage as keyof typeof greeting] || greeting.en}
            </span>
          </h1>
          {!selectedTopic && (
            <p className="text-[#A8A29E] text-sm sm:text-base mt-2 sm:mt-3">
              {subtitle[uiLanguage as keyof typeof subtitle] || subtitle.en}
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6">
            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          </div>
        )}

        {/* ── Topics Section (full width, primary focus) ── */}
        <div className={`transition-all duration-500 ${selectedTopic ? 'opacity-60 pointer-events-none max-h-[200px] overflow-hidden' : ''}`}>
          <TopicRecommendations
            onSelectTopic={handleSelectTopic}
            onSelectChallenge={setSelectedChallenge}
            disabled={loading}
            scriptLang={scriptLang}
            onScriptLangChange={setScriptLang}
            useDnaTone={useDnaTone}
            onDnaToneChange={setUseDnaTone}
            hasDnaTone={hasDnaTone}
          />
        </div>

        {/* ── Selected Topic Indicator + Expand to collapse topics ── */}
        {selectedTopic && (
          <div className="flex items-center justify-center my-3">
            <button
              onClick={() => {
                setSelectedTopic(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 text-[#78716C] hover:text-[#A8A29E] transition-colors text-xs"
            >
              <ChevronDown className="w-3.5 h-3.5 rotate-180" />
              {uiLanguage === 'id' ? 'Ganti topik' : uiLanguage === 'hi' ? 'विषय बदलें' : 'Change topic'}
            </button>
          </div>
        )}

        {/* ── Script Form Section (shows when topic OR challenge is selected) ── */}
        <div
          ref={formRef}
          className={`transition-all duration-500 ease-out ${
            (selectedTopic || selectedChallenge)
              ? 'opacity-100 translate-y-0 max-h-[2000px]'
              : 'opacity-0 translate-y-8 max-h-0 overflow-hidden pointer-events-none'
          }`}
        >
          {/* Selected topic card */}
          {selectedTopic && (
            <div className="mb-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-emerald-400 text-xs font-medium mb-1">
                    {uiLanguage === 'id' ? 'Topik Terpilih' : uiLanguage === 'hi' ? 'चयनित विषय' : 'Selected Topic'}
                  </p>
                  <h3 className="text-[#FAFAF9] font-semibold text-base sm:text-lg leading-snug">
                    {selectedTopic.title}
                  </h3>
                  {selectedTopic.description && (
                    <p className="text-[#A8A29E] text-sm mt-1 line-clamp-2">
                      {selectedTopic.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleClearTopic}
                  className="p-1.5 rounded-lg text-[#78716C] hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                  title={uiLanguage === 'id' ? 'Hapus topik' : 'Clear topic'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Challenge format badge — always visible in form area when selected */}
          {selectedChallenge && (
            <div className="mb-4 bg-pink-500/5 border border-pink-500/20 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-pink-400 text-xs font-medium mb-1">
                    {uiLanguage === 'id' ? 'Format Challenge' : 'Challenge Format'}
                  </p>
                  <h3 className="text-[#FAFAF9] font-semibold text-sm sm:text-base leading-snug">
                    {selectedChallenge.name}
                  </h3>
                  <p className="text-[#A8A29E] text-xs mt-1">
                    {selectedChallenge.description}
                  </p>
                  <p className="text-pink-400/60 text-xs mt-1.5 italic">
                    {selectedChallenge.example_format}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedChallenge(null)}
                  className="p-1.5 rounded-lg text-[#78716C] hover:text-pink-400 hover:bg-pink-500/10 transition-colors flex-shrink-0"
                  title={uiLanguage === 'id' ? 'Hapus challenge' : 'Remove challenge'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Script form with settings */}
          <div className="max-w-2xl mx-auto pb-8">
            <div className="flex items-center gap-2 mb-3">
              <PenTool className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-[#FAFAF9]">
                {uiLanguage === 'id'
                  ? 'Pengaturan Script'
                  : uiLanguage === 'hi'
                    ? 'स्क्रिप्ट सेटिंग्स'
                    : 'Script Settings'}
              </h3>
            </div>
            <ScriptForm
              onSubmit={handleSubmit}
              loading={loading}
              selectedTopic={selectedTopic}
              onClearTopic={handleClearTopic}
              selectedChallenge={selectedChallenge}
              scriptLang={scriptLang}
              useDnaTone={useDnaTone}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
