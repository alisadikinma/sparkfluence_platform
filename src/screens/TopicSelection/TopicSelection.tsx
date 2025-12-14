import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Logo } from "../../components/ui/logo";
import { useOnboardingStatus } from "../../hooks/useOnboardingStatus";
import { useOnboarding } from "../../contexts/OnboardingContext";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { supabase } from "../../lib/supabase";
import { useAvatarManager } from "../../hooks/useAvatarManager";
import { AvatarDropdown, AvatarNameModal } from "../../components/ui/avatar-dropdown";
import { 
  Loader2, Sparkles, RefreshCw, 
  ChevronDown, ScrollText, AlertCircle,
  Dna, Target, Lightbulb, Zap, Brain, PenTool
} from "lucide-react";

interface Topic {
  id: number;
  title: string;
  description: string;
}

type InputType = "topic" | "transcript";

const LANGUAGE_OPTIONS = [
  { value: 'id', label: 'Indonesia' },
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
] as const;

const RATIO_OPTIONS = [
  { value: '9:16', label: '9:16' },
  { value: '16:9', label: '16:9' },
];

const DURATION_OPTIONS = [
  { value: '30s', label: '30s' },
  { value: '60s', label: '60s' },
  { value: '90s', label: '90s' },
];

const MODEL_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'sora2', label: 'SORA 2' },
  { value: 'veo31', label: 'VEO 3.1' },
];

const TOPICS_CACHE_KEY = 'sparkfluence_cached_topics';
const TOPICS_CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour

// Rate limiting constants
const REFRESH_RATE_LIMIT_KEY = 'sparkfluence_refresh_rate';
const MAX_REFRESHES_PER_WINDOW = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const COOLDOWN_MS = 30 * 1000;

// Language-aware fallback topics
const fallbackTopicsByLang: Record<string, Topic[]> = {
  id: [
    { id: 1, title: "5 Kebiasaan Pagi yang Mengubah Hidupku", description: "Bagikan tips produktivitas personal yang relate dengan audience" },
    { id: 2, title: "Rahasia yang Tidak Pernah Dibahas Orang", description: "Ungkap pengetahuan insider yang membangun kepercayaan" },
    { id: 3, title: "Dari Nol hingga Mahir dalam 30 Hari", description: "Dokumentasikan perjalananmu dan inspirasi orang lain" },
    { id: 4, title: "Berhenti Melakukan Kesalahan Ini", description: "Bahas masalah umum yang sering dihadapi audience" },
    { id: 5, title: "Tren Terbaru yang Wajib Kamu Tahu", description: "Update informasi terkini yang relevan dengan niche kamu" },
    { id: 6, title: "Di Balik Layar Proses Kreatifku", description: "Tunjukkan alur kerja kreatif yang menginspirasi viewer" },
  ],
  en: [
    { id: 1, title: "5 Morning Habits That Changed My Life", description: "Share personal productivity tips that resonate with your audience" },
    { id: 2, title: "The Truth About [Your Niche] Nobody Talks About", description: "Reveal insider knowledge that builds trust and authority" },
    { id: 3, title: "How I Went From Beginner to Pro in 30 Days", description: "Document your journey and inspire others to take action" },
    { id: 4, title: "Stop Making This Common Mistake", description: "Address pain points your audience faces daily" },
    { id: 5, title: "Latest Trends & What's Hot Right Now", description: "Stay up to date with what matters in your niche" },
    { id: 6, title: "Behind the Scenes of My Creative Process", description: "Show your workflow and connect with your audience" },
  ],
  hi: [
    { id: 1, title: "5 सुबह की आदतें जिन्होंने मेरी ज़िंदगी बदल दी", description: "व्यक्तिगत उत्पादकता टिप्स साझा करें जो आपके दर्शकों से जुड़ें" },
    { id: 2, title: "वो सच जो कोई नहीं बताता", description: "अंदरूनी जानकारी प्रकट करें जो विश्वास और अधिकार बनाती है" },
    { id: 3, title: "30 दिनों में शुरुआत से प्रो तक", description: "अपनी यात्रा का दस्तावेज़ीकरण करें और दूसरों को प्रेरित करें" },
    { id: 4, title: "यह गलती करना बंद करें", description: "आम समस्याओं को संबोधित करें जो आपके दर्शक रोज़ाना झेलते हैं" },
    { id: 5, title: "नवीनतम ट्रेंड्स और क्या है हॉट", description: "अपडेट रहें जो आपके निच में मायने रखता है" },
    { id: 6, title: "मेरी प्रक्रिया के पर्दे के पीछे", description: "अपना वर्कफ़्लो दिखाएं और अपने दर्शकों से जुड़ें" },
  ],
};

const getFallbackTopics = (lang: string): Topic[] => {
  return fallbackTopicsByLang[lang] || fallbackTopicsByLang.en;
};

export const TopicSelection = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { onboardingData } = useOnboarding();
  const { data: dbOnboardingData, loading: onboardingLoading } = useOnboardingStatus();
  const { language: uiLang } = useLanguage();
  
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  
  // Rate limiting state
  const [rateLimited, setRateLimited] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Form state
  const [prompt, setPrompt] = useState("");
  const [inputType, setInputType] = useState<InputType>("topic");
  const [model, setModel] = useState("auto");
  const [ratio, setRatio] = useState("9:16");
  const [duration, setDuration] = useState("30s");
  const [outputLang, setOutputLang] = useState<string>(uiLang);
  const [useDnaTone, setUseDnaTone] = useState(true);
  const [generatingPhase, setGeneratingPhase] = useState(0);
  
  // Avatar management - using shared hook
  const avatarManager = useAvatarManager({
    userId: user?.id,
    language: uiLang
  });

  const hasDnaTone = dbOnboardingData?.creative_dna && dbOnboardingData.creative_dna.length > 0;
  const isReturning = location.state?.returning === true;

  // Cleanup cooldown interval on unmount
  useEffect(() => {
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, []);

  // Check rate limit status on mount
  useEffect(() => {
    checkRateLimit();
  }, []);

  // Rate limiting functions
  const getRateLimitData = (): { timestamps: number[]; cooldownUntil: number | null } => {
    try {
      const data = localStorage.getItem(REFRESH_RATE_LIMIT_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Error reading rate limit data:', e);
    }
    return { timestamps: [], cooldownUntil: null };
  };

  const setRateLimitData = (data: { timestamps: number[]; cooldownUntil: number | null }) => {
    try {
      localStorage.setItem(REFRESH_RATE_LIMIT_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving rate limit data:', e);
    }
  };

  const checkRateLimit = (): boolean => {
    const now = Date.now();
    const data = getRateLimitData();

    if (data.cooldownUntil && now < data.cooldownUntil) {
      const remaining = Math.ceil((data.cooldownUntil - now) / 1000);
      setRateLimited(true);
      setCooldownRemaining(remaining);
      startCooldownTimer(data.cooldownUntil);
      return false;
    }

    const recentTimestamps = data.timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    
    if (recentTimestamps.length >= MAX_REFRESHES_PER_WINDOW) {
      const cooldownUntil = now + COOLDOWN_MS;
      setRateLimitData({ timestamps: recentTimestamps, cooldownUntil });
      setRateLimited(true);
      setCooldownRemaining(Math.ceil(COOLDOWN_MS / 1000));
      startCooldownTimer(cooldownUntil);
      return false;
    }

    setRateLimitData({ timestamps: recentTimestamps, cooldownUntil: null });
    setRateLimited(false);
    return true;
  };

  const recordRefresh = () => {
    const now = Date.now();
    const data = getRateLimitData();
    const recentTimestamps = data.timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    recentTimestamps.push(now);
    setRateLimitData({ timestamps: recentTimestamps, cooldownUntil: data.cooldownUntil });
  };

  const startCooldownTimer = (cooldownUntil: number) => {
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
    }

    cooldownIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.ceil((cooldownUntil - now) / 1000);
      
      if (remaining <= 0) {
        setRateLimited(false);
        setCooldownRemaining(0);
        const data = getRateLimitData();
        setRateLimitData({ timestamps: data.timestamps, cooldownUntil: null });
        if (cooldownIntervalRef.current) {
          clearInterval(cooldownIntervalRef.current);
        }
      } else {
        setCooldownRemaining(remaining);
      }
    }, 1000);
  };

  // Initial load
  useEffect(() => {
    if (!onboardingLoading) {
      loadTopics();
    }
  }, [onboardingLoading]);

  // Regenerate topics when OUTPUT language changes
  useEffect(() => {
    const cached = getCachedTopics();
    if (cached && cached.language !== outputLang && !loading) {
      localStorage.removeItem(TOPICS_CACHE_KEY);
      setSelectedTopic(null);
      setPrompt("");
      generateTopics();
    } else if (!cached && !loading) {
      generateTopics();
    }
  }, [outputLang]);

  const isCacheMatchingPreferences = (cached: any): boolean => {
    if (!cached) return false;
    
    const currentInterest = dbOnboardingData?.interest || '';
    const currentNiches = dbOnboardingData?.selected_niches || [];
    const currentDna = dbOnboardingData?.creative_dna || [];
    
    if (cached.interest !== currentInterest) return false;
    
    const cachedNiches = cached.niches || [];
    if (cachedNiches.length !== currentNiches.length || 
        !cachedNiches.every((n: string, i: number) => n === currentNiches[i])) return false;
    
    const cachedDna = cached.dna || [];
    if (cachedDna.length !== currentDna.length || 
        !cachedDna.every((d: string, i: number) => d === currentDna[i])) return false;
    
    return true;
  };

  const loadTopics = useCallback(async () => {
    const cached = getCachedTopics();
    
    if (cached && 
        (isReturning || isCacheValid(cached.timestamp)) && 
        cached.language === outputLang &&
        isCacheMatchingPreferences(cached)) {
      setTopics(cached.topics);
      setLoading(false);
      return;
    }
    
    await generateTopics();
  }, [isReturning, outputLang, dbOnboardingData]);

  const getCachedTopics = () => {
    try {
      const cached = localStorage.getItem(TOPICS_CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.error('Error reading cache:', e);
    }
    return null;
  };

  const isCacheValid = (timestamp: number) => {
    return Date.now() - timestamp < TOPICS_CACHE_EXPIRY;
  };

  const cacheTopics = (topics: Topic[]) => {
    try {
      localStorage.setItem(TOPICS_CACHE_KEY, JSON.stringify({
        topics,
        timestamp: Date.now(),
        interest: dbOnboardingData?.interest || '',
        niches: dbOnboardingData?.selected_niches || [],
        dna: dbOnboardingData?.creative_dna || [],
        language: outputLang
      }));
    } catch (e) {
      console.error('Error caching topics:', e);
    }
  };

  const generateTopics = async () => {
    setLoading(true);
    setRefreshing(true);
    setError(null);

    const langMap: Record<string, 'indonesian' | 'english' | 'hindi'> = {
      'id': 'indonesian',
      'en': 'english',
      'hi': 'hindi',
    };
    const targetLanguage = langMap[outputLang] || 'indonesian';

    try {
      const interest = dbOnboardingData?.interest || '';
      const selectedNiches = dbOnboardingData?.selected_niches || [];
      const dnaStyles = dbOnboardingData?.creative_dna || [];

      if (!interest || selectedNiches.length === 0 || dnaStyles.length === 0) {
        const fallbackTopics = getFallbackTopics(outputLang);
        setTopics(fallbackTopics);
        cacheTopics(fallbackTopics);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const savedCountry = localStorage.getItem('sparkfluence_user_country') || 'ID';

      const { data, error: funcError } = await supabase.functions.invoke('generate-topic-suggestions', {
        body: { 
          interest, 
          niches: selectedNiches,
          dnaStyles,
          language: targetLanguage,
          count: 6,
          country: savedCountry
        }
      });

      if (funcError) throw new Error(funcError.message);

      if (!data?.success || !data?.data?.topics) {
        throw new Error(data?.error?.message || 'Failed to generate topics');
      }

      const generatedTopics: Topic[] = data.data.topics.slice(0, 6).map((t: any, index: number) => ({
        id: index + 1,
        title: t.title,
        description: t.description
      }));

      const fallbackTopics = getFallbackTopics(outputLang);
      while (generatedTopics.length < 6) {
        const fallbackIndex = generatedTopics.length;
        generatedTopics.push({
          ...fallbackTopics[fallbackIndex],
          id: generatedTopics.length + 1
        });
      }

      setTopics(generatedTopics);
      cacheTopics(generatedTopics);
    } catch (err: any) {
      console.error('Error generating topics:', err);
      const fallbackTopics = getFallbackTopics(outputLang);
      setTopics(fallbackTopics);
      cacheTopics(fallbackTopics);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing || rateLimited) return;
    if (!checkRateLimit()) return;

    recordRefresh();
    localStorage.removeItem(TOPICS_CACHE_KEY);
    setSelectedTopic(null);
    setPrompt("");
    await generateTopics();
  };

  const handleTopicSelect = (topic: Topic) => {
    setSelectedTopic(prev => prev === topic.id ? null : topic.id);
    setPrompt(`${topic.title}\n\n${topic.description}`);
  };

  const handlePromptChange = (value: string) => {
    setPrompt(value);
    if (value && selectedTopic) {
      setSelectedTopic(null);
    }
  };

  const handleBack = () => {
    navigate("/creative-dna");
  };

  const canProceed = prompt.trim().length > 0;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setGenerating(true);
    setGeneratingPhase(0);
    setError(null);

    const phases = {
      id: [
        { step: "Menganalisis topik...", icon: "analyze" },
        { step: "Memuat framework viral...", icon: "load" },
        { step: "Membuat script viral...", icon: "write" },
        { step: "Menyelesaikan script...", icon: "finish" }
      ],
      en: [
        { step: "Analyzing topic...", icon: "analyze" },
        { step: "Loading viral frameworks...", icon: "load" },
        { step: "Crafting viral script...", icon: "write" },
        { step: "Finalizing script...", icon: "finish" }
      ],
      hi: [
        { step: "विषय का विश्लेषण...", icon: "analyze" },
        { step: "वायरल फ्रेमवर्क लोड हो रहा है...", icon: "load" },
        { step: "वायरल स्क्रिप्ट बना रहा है...", icon: "write" },
        { step: "स्क्रिप्ट पूरी हो रही है...", icon: "finish" }
      ]
    };

    const currentPhases = phases[uiLang as keyof typeof phases] || phases.en;

    try {
      setGeneratingStep(currentPhases[0].step);
      setGeneratingPhase(1);
      
      const langMap: Record<string, string> = {
        'id': 'indonesian',
        'en': 'english',
        'hi': 'hindi',
      };

      await new Promise(resolve => setTimeout(resolve, 600));
      setGeneratingStep(currentPhases[1].step);
      setGeneratingPhase(2);
      
      await new Promise(resolve => setTimeout(resolve, 600));
      setGeneratingStep(currentPhases[2].step);
      setGeneratingPhase(3);
      
      const { data: scriptData, error: scriptError } = await supabase.functions.invoke('generate-script', {
        body: {
          input_type: inputType,
          content: prompt.trim(),
          duration: duration,
          aspect_ratio: ratio,
          platform: onboardingData.platforms?.[0] || 'tiktok',
          language: langMap[outputLang] || 'indonesian',
          user_id: user?.id
        }
      });

      if (scriptError) throw new Error(scriptError.message);

      if (!scriptData?.success || !scriptData?.data?.segments) {
        throw new Error(scriptData?.error?.message || 'Failed to generate script');
      }

      setGeneratingStep(currentPhases[3].step);
      setGeneratingPhase(4);
      await new Promise(resolve => setTimeout(resolve, 400));

      const segments = scriptData.data.segments;
      const existingSessionId = location.state?.sessionId;
      const sessionId = existingSessionId || `video_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Pass avatar data to VideoEditor
      // PRIMARY: selectedAvatarUrl for image reference (gpt-image-1)
      // FALLBACK: characterDescription for providers without image reference (Z-Image, FLUX)
      navigate("/video-editor", {
        state: {
          sessionId,
          topic: prompt.trim(),
          segments: segments,
          metadata: scriptData.data.metadata,
          videoSettings: {
            duration,
            aspectRatio: ratio,
            language: langMap[outputLang] || 'indonesian',
            model: model
          },
          // Hybrid approach:
          // - selectedAvatarUrl: for gpt-image-1 image reference (primary)
          // - characterDescription: for fallback text-based providers
          selectedAvatarUrl: avatarManager.selectedAvatarUrl,
          characterDescription: avatarManager.characterDescription
        }
      });

    } catch (err: any) {
      console.error('Error generating script:', err);
      setError(err.message || 'Failed to generate script. Please try again.');
      setGenerating(false);
      setGeneratingPhase(0);
    }
  };

  // Loading state
  if (loading) {
    const loadingText = {
      id: {
        title: refreshing ? "Memperbarui Topik..." : "Membuat Ide Topik...",
        subtitle: refreshing 
          ? "AI sedang membuat topik baru berdasarkan preferensi terbaru kamu"
          : "AI sedang menyusun topik berdasarkan niche & gaya kamu"
      },
      en: {
        title: refreshing ? "Refreshing Topics..." : "Generating Topic Ideas...",
        subtitle: refreshing 
          ? "AI is creating new topics based on your latest preferences"
          : "AI is crafting topics based on your niches & style"
      },
      hi: {
        title: refreshing ? "विषय अपडेट हो रहे हैं..." : "विषय विचार बना रहे हैं...",
        subtitle: refreshing 
          ? "AI आपकी नवीनतम प्राथमिकताओं के आधार पर नए विषय बना रहा है"
          : "AI आपके निच और शैली के आधार पर विषय तैयार कर रहा है"
      }
    };
    const currentText = loadingText[uiLang as keyof typeof loadingText] || loadingText.en;
    
    return (
      <div className="w-full min-h-screen bg-[#0a0a12] flex flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-[#7c3aed] animate-spin" />
            <Sparkles className="w-5 h-5 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-white mb-2">{currentText.title}</h2>
            <p className="text-white/60 text-sm max-w-md">{currentText.subtitle}</p>
          </div>
        </div>
      </div>
    );
  }

  // Generating script state
  if (generating) {
    const phaseIcons = [
      <Brain key="brain" className="w-8 h-8 text-white" />,
      <Zap key="zap" className="w-8 h-8 text-white" />,
      <PenTool key="pen" className="w-8 h-8 text-white" />,
      <Sparkles key="sparkles" className="w-8 h-8 text-white" />
    ];

    const phaseLabels = {
      id: ["Analisis", "Framework", "Penulisan", "Selesai"],
      en: ["Analyze", "Framework", "Writing", "Complete"],
      hi: ["विश्लेषण", "फ्रेमवर्क", "लेखन", "पूर्ण"]
    };
    const labels = phaseLabels[uiLang as keyof typeof phaseLabels] || phaseLabels.en;

    return (
      <div className="w-full min-h-screen bg-[#0a0a12] flex flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-8 max-w-md w-full">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#ec4899] flex items-center justify-center shadow-lg shadow-[#7c3aed]/30">
              <div className="animate-pulse">
                {phaseIcons[Math.min(generatingPhase - 1, 3)] || phaseIcons[0]}
              </div>
            </div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#7c3aed] animate-spin" style={{ animationDuration: '1.5s' }} />
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-3">
              {uiLang === 'id' ? 'Membuat Script Viral' : uiLang === 'hi' ? 'वायरल स्क्रिप्ट बना रहे हैं' : 'Creating Viral Script'}
            </h2>
            <p className="text-[#7c3aed] font-medium text-lg mb-2 min-h-[28px] transition-all duration-300">
              {generatingStep}
            </p>
            <p className="text-white/50 text-sm">
              {uiLang === 'id' ? 'Mohon tunggu sebentar...' : uiLang === 'hi' ? 'कृपया प्रतीक्षा करें...' : 'Please wait a moment...'}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full px-4">
            {[1, 2, 3, 4].map((phase) => (
              <React.Fragment key={phase}>
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                      generatingPhase >= phase ? 'bg-[#7c3aed] scale-110' : 'bg-[#2a2a38]'
                    }`}
                  >
                    {generatingPhase > phase ? (
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : generatingPhase === phase ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <span className="text-white/50 text-sm font-medium">{phase}</span>
                    )}
                  </div>
                  <span className={`text-xs transition-colors duration-300 ${
                    generatingPhase >= phase ? 'text-[#7c3aed]' : 'text-white/40'
                  }`}>
                    {labels[phase - 1]}
                  </span>
                </div>
                {phase < 4 && (
                  <div className={`h-0.5 flex-1 transition-all duration-500 ${
                    generatingPhase > phase ? 'bg-[#7c3aed]' : 'bg-[#2a2a38]'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="bg-[#1a1a24] border border-[#2b2b38] rounded-xl p-4 w-full">
            <p className="text-white/40 text-xs mb-1">
              {uiLang === 'id' ? 'Topik:' : uiLang === 'hi' ? 'विषय:' : 'Topic:'}
            </p>
            <p className="text-white text-sm line-clamp-2">{prompt.split('\n')[0]}</p>
          </div>
        </div>
      </div>
    );
  }

  const inputTypeOptions = [
    {
      value: "topic" as InputType,
      label: uiLang === 'id' ? "Topik" : uiLang === 'hi' ? "विषय" : "Topic",
      icon: <Sparkles className="w-4 h-4" />,
      placeholder: uiLang === 'id' 
        ? "Contoh: 5 kebiasaan pagi yang meningkatkan produktivitas..." 
        : uiLang === 'hi' 
        ? "उदाहरण: 5 सुबह की आदतें जो उत्पादकता बढ़ाएं..." 
        : "e.g., 5 Morning habits that boost productivity...",
    },
    {
      value: "transcript" as InputType,
      label: uiLang === 'id' ? "Transkrip" : uiLang === 'hi' ? "ट्रांसक्रिप्ट" : "Transcript",
      icon: <ScrollText className="w-4 h-4" />,
      placeholder: uiLang === 'id' 
        ? "Tempel transkrip video atau narasi yang sudah ada..." 
        : uiLang === 'hi' 
        ? "मौजूदा वीडियो ट्रांसक्रिप्ट या नरेशन पेस्ट करें..." 
        : "Paste existing video transcript or narration...",
    },
  ];

  const currentInputType = inputTypeOptions.find((opt) => opt.value === inputType);

  const uiText = {
    title: uiLang === 'id' ? "Pilih topik" : uiLang === 'hi' ? "एक विषय चुनें" : "Choose a topic",
    subtitle: uiLang === 'id' 
      ? "Pilih satu topik AI atau masukkan ide kamu sendiri" 
      : uiLang === 'hi' 
      ? "AI-जनित विषय चुनें या अपना विचार दर्ज करें" 
      : "Select one AI-generated topic or enter your own idea",
    basedOn: uiLang === 'id' ? "Berdasarkan:" : uiLang === 'hi' ? "आधारित:" : "Based on:",
    aiTopics: uiLang === 'id' ? "Topik Rekomendasi AI" : uiLang === 'hi' ? "AI-जनित विषय" : "AI-Generated Topics",
    refresh: uiLang === 'id' ? "Refresh" : uiLang === 'hi' ? "रीफ्रेश" : "Refresh",
    wait: uiLang === 'id' ? "Tunggu" : uiLang === 'hi' ? "रुकें" : "Wait",
    orType: uiLang === 'id' ? "atau ketik topik sendiri" : uiLang === 'hi' ? "या अपना विषय टाइप करें" : "or type your own topic",
    generateVideo: uiLang === 'id' ? "Buat Script" : uiLang === 'hi' ? "स्क्रिप्ट बनाएं" : "Generate Script",
    previous: uiLang === 'id' ? "Sebelumnya" : uiLang === 'hi' ? "पिछला" : "Previous",
    step: uiLang === 'id' ? "Langkah" : uiLang === 'hi' ? "चरण" : "Step",
    rateLimitWarning: uiLang === 'id' 
      ? "Terlalu banyak percobaan refresh. Mohon tunggu" 
      : uiLang === 'hi' 
      ? "बहुत अधिक रीफ्रेश प्रयास। कृपया प्रतीक्षा करें" 
      : "Too many refresh attempts. Please wait",
    seconds: uiLang === 'id' ? "detik" : uiLang === 'hi' ? "सेकंड" : "seconds",
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-center mb-6">
            <Logo />
          </div>
          
          <div className="flex gap-2 mb-8 justify-center max-w-md mx-auto">
            {[1, 2, 3, 4, 5, 6, 7].map((step) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  step <= 4 ? "bg-[#7c3aed]" : "bg-[#4e5562]"
                }`}
              />
            ))}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white text-center mb-3">
            {uiText.title}
          </h1>
          <p className="text-white/60 text-center text-sm max-w-2xl mx-auto mb-4">
            {uiText.subtitle}
          </p>
          
          {(dbOnboardingData?.interest || dbOnboardingData?.selected_niches?.length || hasDnaTone) && (
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <span className="text-white/40 text-xs">{uiText.basedOn}</span>
              
              {dbOnboardingData?.interest && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-[#1a1a24] border border-[#2b2b38] rounded-full">
                  <Lightbulb className="w-3 h-3 text-yellow-400" />
                  <span className="text-white/70 text-xs">{dbOnboardingData.interest}</span>
                </div>
              )}
              
              {dbOnboardingData?.selected_niches && dbOnboardingData.selected_niches.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-[#1a1a24] border border-[#2b2b38] rounded-full">
                  <Target className="w-3 h-3 text-[#7c3aed]" />
                  <span className="text-white/70 text-xs truncate max-w-[150px]">
                    {dbOnboardingData.selected_niches.slice(0, 2).join(', ')}
                    {dbOnboardingData.selected_niches.length > 2 && '...'}
                  </span>
                </div>
              )}
              
              {hasDnaTone && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-[#1a1a24] border border-[#2b2b38] rounded-full">
                  <Dna className="w-3 h-3 text-[#ec4899]" />
                  <span className="text-white/70 text-xs">
                    {dbOnboardingData?.creative_dna?.slice(0, 2).join(', ')}
                    {(dbOnboardingData?.creative_dna?.length || 0) > 2 && '...'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-xl p-4">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Topic Recommendations Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#7c3aed]" />
              <h3 className="text-base sm:text-lg font-semibold text-white">
                {uiText.aiTopics}
              </h3>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing || rateLimited}
              className={`flex items-center gap-2 text-sm transition-colors ${
                rateLimited 
                  ? "text-orange-400 cursor-not-allowed" 
                  : refreshing 
                    ? "text-[#7c3aed]/50 cursor-not-allowed"
                    : "text-[#7c3aed] hover:text-[#9f67ff]"
              }`}
              title={rateLimited ? `Rate limited. Try again in ${cooldownRemaining}s` : "Refresh topics"}
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : rateLimited ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {rateLimited ? `${uiText.wait} ${cooldownRemaining}s` : uiText.refresh}
              </span>
            </button>
          </div>

          {rateLimited && (
            <div className="mb-4 bg-orange-500/10 border border-orange-500/30 rounded-lg px-4 py-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <p className="text-orange-400 text-xs">
                {uiText.rateLimitWarning} {cooldownRemaining} {uiText.seconds}.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {topics.slice(0, 6).map((topic) => {
              const isSelected = selectedTopic === topic.id;

              return (
                <button
                  key={topic.id}
                  onClick={() => handleTopicSelect(topic)}
                  className={`
                    text-left p-4 rounded-xl border-2 transition-all duration-200
                    hover:scale-[1.02] active:scale-[0.98] cursor-pointer
                    ${isSelected
                      ? "bg-[#7c3aed]/20 border-[#7c3aed] shadow-lg shadow-[#7c3aed]/20"
                      : "bg-[#1a1a24] border-[#2b2b38] hover:border-[#7c3aed]/50 hover:bg-[#1a1a24]/80"
                    }
                  `}
                >
                  <h4 className="text-white font-medium text-sm mb-2 line-clamp-2">
                    {topic.title}
                  </h4>
                  <p className="text-white/50 text-xs line-clamp-2">
                    {topic.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-[#2b2b38]" />
          <span className="text-white/40 text-sm">{uiText.orType}</span>
          <div className="flex-1 h-px bg-[#2b2b38]" />
        </div>

        {/* Input Form */}
        <div className="bg-[#1a1a24] border border-[#2b2b38] rounded-2xl p-4 mb-8">
          <div className="flex gap-1 mb-4 p-1 bg-[#0a0a12] rounded-xl">
            {inputTypeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setInputType(opt.value)}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all
                  ${inputType === opt.value
                    ? "bg-[#7c3aed] text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                  }
                `}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>

          {inputType === "transcript" ? (
            <textarea
              value={prompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              placeholder={currentInputType?.placeholder}
              className="w-full h-40 bg-transparent text-white placeholder:text-white/40 resize-none focus:outline-none text-base"
            />
          ) : (
            <textarea
              value={prompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              placeholder={currentInputType?.placeholder}
              className="w-full h-24 bg-transparent text-white placeholder:text-white/40 resize-none focus:outline-none text-lg"
            />
          )}

          {inputType === "transcript" && prompt.length > 0 && (
            <div className="text-right text-white/40 text-xs mb-2">
              {prompt.length} characters
            </div>
          )}

          {/* Settings Row */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[#2b2b38]">
            {/* Model Dropdown */}
            <div className="relative">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="appearance-none bg-[#2a2a38] border border-[#3b3b48] rounded-lg px-4 py-2 pr-8 text-white text-sm focus:outline-none focus:border-[#7c3aed] cursor-pointer"
              >
                {MODEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
            </div>

            {/* Ratio Dropdown */}
            <div className="relative">
              <select
                value={ratio}
                onChange={(e) => setRatio(e.target.value)}
                className="appearance-none bg-[#2a2a38] border border-[#3b3b48] rounded-lg px-4 py-2 pr-8 text-white text-sm focus:outline-none focus:border-[#7c3aed] cursor-pointer"
              >
                {RATIO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
            </div>

            {/* Duration Dropdown */}
            <div className="relative">
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="appearance-none bg-[#2a2a38] border border-[#3b3b48] rounded-lg px-4 py-2 pr-8 text-white text-sm focus:outline-none focus:border-[#7c3aed] cursor-pointer"
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
            </div>

            {/* Language Dropdown */}
            <div className="relative">
              <select
                value={outputLang}
                onChange={(e) => setOutputLang(e.target.value)}
                className="appearance-none bg-[#2a2a38] border border-[#3b3b48] rounded-lg px-4 py-2 pr-8 text-white text-sm focus:outline-none focus:border-[#7c3aed] cursor-pointer"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
            </div>

            {/* Avatar Dropdown - Using shared component */}
            <AvatarDropdown
              avatarOption={avatarManager.avatarOption}
              avatarDropdownOpen={avatarManager.avatarDropdownOpen}
              uploadedAvatarPreview={avatarManager.uploadedAvatarPreview}
              savedAvatars={avatarManager.savedAvatars}
              selectedSavedAvatar={avatarManager.selectedSavedAvatar}
              cachedAvatarUrl={avatarManager.cachedAvatarUrl}
              profileCharacterDesc={avatarManager.profileCharacterDesc}
              loadingAvatars={avatarManager.loadingAvatars}
              analyzingAvatar={avatarManager.analyzingAvatar}
              editingAvatarId={avatarManager.editingAvatarId}
              editingName={avatarManager.editingName}
              onDropdownToggle={() => avatarManager.setAvatarDropdownOpen(!avatarManager.avatarDropdownOpen)}
              onAvatarSelect={avatarManager.handleAvatarOptionSelect}
              onDelete={avatarManager.handleDeleteAvatar}
              onEditStart={(id, name) => {
                avatarManager.setEditingAvatarId(id);
                avatarManager.setEditingName(name);
              }}
              onEditNameChange={avatarManager.setEditingName}
              onEditSave={avatarManager.handleRenameAvatar}
              onEditCancel={() => avatarManager.setEditingAvatarId(null)}
              getDisplayName={avatarManager.getAvatarDisplayName}
              onClear={avatarManager.clearAvatar}
              dropdownRef={avatarManager.avatarDropdownRef}
              fileInputRef={avatarManager.fileInputRef}
              onFileSelect={avatarManager.handleFileSelect}
              language={uiLang}
            />

            {/* DNA Tone Toggle */}
            {hasDnaTone && (
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={useDnaTone}
                    onChange={(e) => setUseDnaTone(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-10 h-6 rounded-full transition-colors ${
                      useDnaTone ? "bg-[#7c3aed]" : "bg-[#3b3b48]"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        useDnaTone ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </div>
                </div>
                <span className="text-white text-sm">DNA</span>
              </label>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={!canProceed}
              className="ml-auto bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              {uiText.generateVideo}
            </Button>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <Button
            onClick={handleBack}
            variant="secondary"
            className="bg-white text-[#0a0a12] hover:bg-white/90 h-12 px-6 sm:px-8 font-medium"
          >
            {uiText.previous}
          </Button>
          <div className="text-white/40 text-sm">
            {uiText.step} 4 of 7
          </div>
        </div>
      </div>

      {/* Avatar Name Modal - for new uploads */}
      <AvatarNameModal
        show={avatarManager.showNameModal}
        name={avatarManager.newAvatarName}
        previewFile={avatarManager.pendingUploadFile}
        saving={avatarManager.savingAvatar}
        language={uiLang}
        onNameChange={avatarManager.setNewAvatarName}
        onSave={avatarManager.handleSaveAvatar}
        onCancel={() => {
          avatarManager.setShowNameModal(false);
          avatarManager.setPendingUploadFile(null);
        }}
        nameInputRef={avatarManager.nameInputRef}
      />
    </div>
  );
};
