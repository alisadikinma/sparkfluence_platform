import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useOnboardingStatus } from "../../../hooks/useOnboardingStatus";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../contexts/AuthContext";
import { RefreshCw, Sparkles, Loader2, Lightbulb, Target, Dna, AlertCircle } from "lucide-react";

interface Topic {
  id: number;
  title: string;
  description: string;
}

interface TopicRecommendationsProps {
  onSelectTopic: (topic: Topic) => void;
  disabled?: boolean;
}

// Cache settings
const TOPICS_CACHE_KEY = 'sparkfluence_scriptlab_topics';
const TOPICS_CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

// Rate limiting constants
const REFRESH_RATE_LIMIT_KEY = 'sparkfluence_scriptlab_refresh_rate';
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
    { id: 5, title: "Cara Cepat Menguasai Skill Baru", description: "Tutorial praktis yang langsung bisa diterapkan" },
  ],
  en: [
    { id: 1, title: "5 Morning Habits That Changed My Life", description: "Share personal productivity tips that resonate with your audience" },
    { id: 2, title: "The Truth About [Your Niche] Nobody Talks About", description: "Reveal insider knowledge that builds trust and authority" },
    { id: 3, title: "How I Went From Beginner to Pro in 30 Days", description: "Document your journey and inspire others to take action" },
    { id: 4, title: "Stop Making This Common Mistake", description: "Address pain points your audience faces daily" },
    { id: 5, title: "The Fastest Way to Learn Any New Skill", description: "Practical tutorial that can be applied immediately" },
  ],
  hi: [
    { id: 1, title: "5 सुबह की आदतें जिन्होंने मेरी ज़िंदगी बदल दी", description: "व्यक्तिगत उत्पादकता टिप्स साझा करें जो आपके दर्शकों से जुड़ें" },
    { id: 2, title: "वो सच जो कोई नहीं बताता", description: "अंदरूनी जानकारी प्रकट करें जो विश्वास और अधिकार बनाती है" },
    { id: 3, title: "30 दिनों में शुरुआत से प्रो तक", description: "अपनी यात्रा का दस्तावेज़ीकरण करें और दूसरों को प्रेरित करें" },
    { id: 4, title: "यह गलती करना बंद करें", description: "आम समस्याओं को संबोधित करें जो आपके दर्शक रोज़ाना झेलते हैं" },
    { id: 5, title: "कोई भी नया स्किल सीखने का सबसे तेज़ तरीका", description: "व्यावहारिक ट्यूटोरियल जो तुरंत लागू किया जा सके" },
  ],
};

// Get fallback topics based on language
const getFallbackTopics = (lang: string): Topic[] => {
  return fallbackTopicsByLang[lang] || fallbackTopicsByLang.en;
};

export const TopicRecommendations: React.FC<TopicRecommendationsProps> = ({
  onSelectTopic,
  disabled = false,
}) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { data: onboardingData, loading: onboardingLoading } = useOnboardingStatus();

  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Mobile carousel state
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-play carousel every 3 seconds
  useEffect(() => {
    if (topics.length === 0) return;

    const startAutoPlay = () => {
      autoPlayRef.current = setInterval(() => {
        setCarouselIndex((prev) => {
          if (prev >= topics.length - 1) {
            return 0;
          }
          return prev + 1;
        });
      }, 3000);
    };

    startAutoPlay();

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [topics.length]);

  // Reset auto-play timer on manual interaction
  const resetAutoPlay = () => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
    }
    autoPlayRef.current = setInterval(() => {
      setCarouselIndex((prev) => (prev >= topics.length - 1 ? 0 : prev + 1));
    }, 3000);
  };

  // Rate limiting state
  const [rateLimited, setRateLimited] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
      if (data) {
        return JSON.parse(data);
      }
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

  // Cache helper functions - NOW INCLUDES LANGUAGE AND NICHES HASH
  const getCachedTopics = () => {
    try {
      const cached = localStorage.getItem(TOPICS_CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.error('Error reading cache:', e);
    }
    return null;
  };

  // Generate hash from niches to detect changes
  const getNichesHash = () => {
    if (!onboardingData) return '';
    const niches = onboardingData.selected_niches?.slice().sort().join('|') || '';
    const dna = onboardingData.creative_dna?.slice().sort().join('|') || '';
    const interest = onboardingData.interest || '';
    return `${interest}:${niches}:${dna}`;
  };

  const isCacheValid = (timestamp: number, cachedLang: string, cachedNichesHash?: string) => {
    const currentNichesHash = getNichesHash();
    // Cache is valid if within expiry AND language matches AND niches match
    return Date.now() - timestamp < TOPICS_CACHE_EXPIRY && 
           cachedLang === language && 
           cachedNichesHash === currentNichesHash;
  };

  const cacheTopics = (topics: Topic[]) => {
    try {
      localStorage.setItem(TOPICS_CACHE_KEY, JSON.stringify({
        topics,
        timestamp: Date.now(),
        language: language,
        nichesHash: getNichesHash(), // Include niches hash in cache
      }));
    } catch (e) {
      console.error('Error caching topics:', e);
    }
  };

  // Load topics from cache or generate new ones
  const loadTopics = useCallback(async (forceRefresh = false) => {
    if (!user) {
      setTopics(getFallbackTopics(language));
      setLoading(false);
      return;
    }

    // Try cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = getCachedTopics();
      if (cached && cached.topics && cached.topics.length > 0 && 
          isCacheValid(cached.timestamp, cached.language || 'en', cached.nichesHash)) {
        setTopics(cached.topics);
        setLoading(false);
        return;
      }
    }

    // Generate new topics
    await generateTopics();
  }, [user, language, onboardingData]);

  const generateTopics = async () => {
    if (!onboardingData) {
      console.log('[TopicRecommendations] No onboarding data, using fallback');
      setTopics(getFallbackTopics(language));
      setLoading(false);
      setRefreshing(false);
      return;
    }

    console.log('[TopicRecommendations] Generating topics with:', {
      interest: onboardingData.interest,
      niches: onboardingData.selected_niches,
      dnaStyles: onboardingData.creative_dna,
      language
    });

    try {
      // Get country for Google Trends
      const savedCountry = localStorage.getItem('sparkfluence_user_country') || 'ID';

      const { data, error } = await supabase.functions.invoke("generate-topic-suggestions", {
        body: {
          interest: onboardingData.interest,
          profession: onboardingData.profession,
          niches: onboardingData.selected_niches,
          objectives: onboardingData.objectives,
          dnaStyles: onboardingData.creative_dna,
          language: language === "id" ? "indonesian" : language === "hi" ? "hindi" : "english",
          count: 5,
          country: savedCountry,  // For Google Trends RSS
        },
      });

      console.log('[TopicRecommendations] Edge Function response:', { data, error });

      if (error) {
        console.error('[TopicRecommendations] Edge Function error:', error);
        throw error;
      }

      if (data?.success && data?.data?.topics) {
        const generatedTopics: Topic[] = data.data.topics.slice(0, 5).map((t: any, idx: number) => ({
          id: idx + 1,
          title: t.title,
          description: t.description,
        }));

        console.log('[TopicRecommendations] Generated topics:', generatedTopics);
        setTopics(generatedTopics);
        cacheTopics(generatedTopics);
      } else {
        console.log('[TopicRecommendations] Invalid response, using fallback:', data);
        setTopics(getFallbackTopics(language));
      }
    } catch (err) {
      console.error("[TopicRecommendations] Error generating topics:", err);
      setTopics(getFallbackTopics(language));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (!onboardingLoading) {
      loadTopics();
    }
  }, [onboardingLoading, loadTopics]);

  // IMPORTANT: Regenerate topics when language changes
  useEffect(() => {
    const cached = getCachedTopics();
    // If language changed from cached language, regenerate
    if (cached && cached.language !== language && !loading) {
      console.log('[TopicRecommendations] Language changed, regenerating topics:', { from: cached.language, to: language });
      localStorage.removeItem(TOPICS_CACHE_KEY);
      setSelectedId(null);
      setLoading(true);
      generateTopics();
    }
  }, [language]);

  // Handle refresh
  const handleRefresh = async () => {
    if (refreshing || disabled || rateLimited) return;

    if (!checkRateLimit()) {
      return;
    }

    recordRefresh();

    setRefreshing(true);
    setSelectedId(null);

    localStorage.removeItem(TOPICS_CACHE_KEY);

    await loadTopics(true);
  };

  // Handle topic selection
  const handleSelectTopic = (topic: Topic) => {
    if (disabled) return;
    setSelectedId(topic.id);
    onSelectTopic(topic);
  };

  // Carousel navigation
  const goToPrev = () => {
    setCarouselIndex((prev) => (prev === 0 ? topics.length - 1 : prev - 1));
    resetAutoPlay();
  };

  const goToNext = () => {
    setCarouselIndex((prev) => (prev === topics.length - 1 ? 0 : prev + 1));
    resetAutoPlay();
  };

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;
    
    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
  };

  // Handle dot click
  const handleDotClick = (idx: number) => {
    setCarouselIndex(idx);
    resetAutoPlay();
  };

  // Loading skeleton
  if (loading || onboardingLoading) {
    const loadingText = {
      title: language === "id" ? "Topik Rekomendasi AI" : language === "hi" ? "AI-जनित विषय" : "AI-Generated Topics",
      generating: language === "id" ? "Sedang membuat rekomendasi topik..." : language === "hi" ? "विषय अनुशंसाएं बना रहे हैं..." : "Generating topic recommendations...",
      pleaseWait: language === "id" ? "Mohon tunggu sebentar" : language === "hi" ? "कृपया प्रतीक्षा करें" : "Please wait a moment",
    };

    return (
      <div className="mb-6 sm:mb-8 w-full max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <h3 className="text-sm sm:text-lg font-semibold text-text-primary">
              {loadingText.title}
            </h3>
          </div>
        </div>

        {/* Loading Message */}
        <div className="mb-4 flex items-center justify-center gap-3 py-3">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <div className="text-center">
            <p className="text-text-secondary text-sm font-medium">{loadingText.generating}</p>
            <p className="text-text-muted text-xs mt-0.5">{loadingText.pleaseWait}</p>
          </div>
        </div>

        {/* Mobile skeleton */}
        <div className="sm:hidden px-8">
          <div className="h-24 bg-card border border-border-default rounded-xl animate-pulse flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
          <div className="flex justify-center gap-1.5 mt-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-surface" />
            ))}
          </div>
        </div>
        {/* Desktop skeleton */}
        <div className="hidden sm:grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-28 bg-card border border-border-default rounded-xl animate-pulse flex items-center justify-center"
            >
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // UI text translations
  const uiText = {
    title: language === "id" ? "Topik Rekomendasi AI" : language === "hi" ? "AI-जनित विषय" : "AI-Generated Topics",
    refresh: language === "id" ? "Refresh" : language === "hi" ? "रीफ्रेश" : "Refresh",
    wait: language === "id" ? "Tunggu" : language === "hi" ? "रुकें" : "Wait",
    basedOn: language === "id" ? "Berdasarkan:" : language === "hi" ? "आधारित:" : "Based on:",
    orType: language === "id" ? "atau ketik topik sendiri" : language === "hi" ? "या अपना विषय टाइप करें" : "or type your own topic",
    rateLimitWarning: language === "id" 
      ? `Terlalu banyak refresh. Tunggu ${cooldownRemaining} detik.`
      : language === "hi"
      ? `बहुत सारे रीफ्रेश। ${cooldownRemaining} सेकंड प्रतीक्षा करें।`
      : `Too many refresh attempts. Please wait ${cooldownRemaining} seconds.`,
  };

  return (
    <div className="mb-6 sm:mb-8 w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
          <h3 className="text-sm sm:text-xl font-semibold text-text-primary">
            {uiText.title}
          </h3>
        </div>

        {/* Refresh Button with Rate Limit */}
        <button
          onClick={handleRefresh}
          disabled={refreshing || disabled || rateLimited}
          className={`flex items-center gap-2 text-sm transition-colors ${
            rateLimited
              ? "text-orange-400 cursor-not-allowed"
              : refreshing || disabled
                ? "text-primary/50 cursor-not-allowed"
                : "text-primary hover:text-primary-hover"
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
            {rateLimited
              ? `${uiText.wait} ${cooldownRemaining}s`
              : uiText.refresh}
          </span>
        </button>
      </div>

      {/* Rate Limit Warning */}
      {rateLimited && (
        <div className="mb-4 bg-orange-500/10 border border-orange-500/30 rounded-lg px-4 py-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
          <p className="text-orange-400 text-xs">
            {uiText.rateLimitWarning}
          </p>
        </div>
      )}

      {/* Context Badges - Show user's personalization (hidden on mobile) */}
      {(onboardingData?.interest || onboardingData?.selected_niches || onboardingData?.creative_dna) && (
        <div className="hidden sm:flex flex-wrap items-center gap-2 mb-4">
          <span className="text-text-muted text-xs">
            {uiText.basedOn}
          </span>

          {onboardingData?.interest && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-card border border-border-default rounded-full">
              <Lightbulb className="w-3 h-3 text-yellow-400" />
              <span className="text-text-secondary text-xs">{onboardingData.interest}</span>
            </div>
          )}

          {onboardingData?.selected_niches && onboardingData.selected_niches.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-card border border-border-default rounded-full">
              <Target className="w-3 h-3 text-primary" />
              <span className="text-text-secondary text-xs truncate max-w-[150px]">
                {onboardingData.selected_niches.slice(0, 2).join(', ')}
                {onboardingData.selected_niches.length > 2 && '...'}
              </span>
            </div>
          )}

          {onboardingData?.creative_dna && onboardingData.creative_dna.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-card border border-border-default rounded-full">
              <Dna className="w-3 h-3 text-[#ec4899]" />
              <span className="text-text-secondary text-xs">
                {onboardingData.creative_dna.slice(0, 2).join(', ')}
                {onboardingData.creative_dna.length > 2 && '...'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Mobile Carousel - Show only on mobile */}
      <div className="sm:hidden relative">
        <div 
          className="relative overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div 
            ref={carouselRef}
            className="flex transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
          >
            {topics.map((topic) => {
              const isSelected = selectedId === topic.id;
              return (
                <div key={topic.id} className="w-full flex-shrink-0">
                  <button
                    onClick={() => handleSelectTopic(topic)}
                    disabled={disabled}
                    className={`
                      w-full text-left p-4 rounded-xl border-2 transition-all duration-200
                      ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                      ${isSelected
                        ? "bg-primary/20 border-primary shadow-lg shadow-primary/20"
                        : "bg-card border-border-default"
                      }
                    `}
                  >
                    <h4 className="text-text-primary font-semibold text-base mb-2">
                      {topic.title}
                    </h4>
                    <p className="text-text-muted text-sm line-clamp-3">
                      {topic.description}
                    </p>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dots Indicator */}
        <div className="flex justify-center gap-1.5 mt-3">
          {topics.map((_, idx) => (
            <button
              key={idx}
              onClick={() => handleDotClick(idx)}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === carouselIndex ? "bg-primary" : "bg-surface"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Desktop Grid - Hidden on mobile */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 lg:gap-4">
        {topics.map((topic) => {
          const isSelected = selectedId === topic.id;

          return (
            <button
              key={topic.id}
              onClick={() => handleSelectTopic(topic)}
              disabled={disabled}
              className={`
                text-left p-4 lg:p-5 rounded-xl border-2 transition-all duration-200
                hover:scale-[1.02] active:scale-[0.98]
                ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                ${isSelected
                  ? "bg-primary/20 border-primary shadow-lg shadow-primary/20"
                  : "bg-card border-border-default hover:border-primary/50 hover:bg-card/80"
                }
              `}
            >
              <h4 className="text-text-primary font-medium text-sm lg:text-base mb-2 line-clamp-2">
                {topic.title}
              </h4>
              <p className="text-text-muted text-xs lg:text-sm line-clamp-2">
                {topic.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 mt-4 sm:mt-6 lg:mt-8">
        <div className="flex-1 h-px bg-border-default" />
        <span className="text-text-muted text-xs sm:text-sm lg:text-base whitespace-nowrap">
          {uiText.orType}
        </span>
        <div className="flex-1 h-px bg-border-default" />
      </div>
    </div>
  );
};
