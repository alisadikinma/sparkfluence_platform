import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useOnboardingStatus } from "../../../hooks/useOnboardingStatus";
import { useRateLimit } from "../../../hooks/useRateLimit";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../contexts/AuthContext";
import { getScriptLanguageFromCountry } from "../../../lib/countryDetection";
import { RefreshCw, Sparkles, Loader2, Lightbulb, Target, Dna, AlertCircle, Hash, TrendingUp, Check, Plus, Search, X } from "lucide-react";
import { Topic, SOURCE_BADGE_CONFIG } from "../../../types/topic";
import { getFallbackTopics } from "../../../constants/fallbackTopics";

interface TopicRecommendationsProps {
  onSelectTopic: (topic: Topic) => void;
  disabled?: boolean;
}

// Cache settings - v3: invalidated to remove stale instagram source data
const TOPICS_CACHE_KEY = 'sparkfluence_scriptlab_topics_v3';
const TOPICS_CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

export const TopicRecommendations: React.FC<TopicRecommendationsProps> = ({
  onSelectTopic,
  disabled = false,
}) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { data: onboardingData, loading: onboardingLoading } = useOnboardingStatus();

  // Script/content language derived from user's country (consistent with LLM call)
  const scriptLanguage = onboardingData?.country
    ? getScriptLanguageFromCountry(onboardingData.country)
    : language;

  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [currentBatch, setCurrentBatch] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const MAX_BATCHES = 4;
  const INITIAL_COUNT = 9;
  const LOAD_MORE_COUNT = 3;

  // Search keyword state
  const [searchKeyword, setSearchKeyword] = useState('');
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [trendingChips, setTrendingChips] = useState<Array<{ keyword: string; source: string; volume_score: number }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const autocompleteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Mobile carousel state
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const autoPlayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Rate limiting (extracted hook)
  const { rateLimited, cooldownRemaining, checkRateLimit, recordRefresh } = useRateLimit();

  // Cleanup autocomplete debounce on unmount
  useEffect(() => {
    return () => {
      if (autocompleteDebounceRef.current) {
        clearTimeout(autocompleteDebounceRef.current);
      }
    };
  }, []);

  // Fetch trending chips on mount
  useEffect(() => {
    const fetchTrendingChips = async () => {
      try {
        const savedCountry = localStorage.getItem('sparkfluence_user_country') || 'ID';
        const { data, error } = await supabase
          .from('trending_topics')
          .select('keyword, source, volume_score')
          .eq('country', savedCountry)
          .gt('expires_at', new Date().toISOString())
          .order('volume_score', { ascending: false })
          .limit(15);

        if (error || !data) {
          console.log('[TopicRecommendations] No trending chips:', error?.message);
          return;
        }

        // Deduplicate by lowercase keyword
        const seen = new Set<string>();
        const unique = data.filter((item: any) => {
          const key = item.keyword.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 10);

        setTrendingChips(unique);
      } catch (err) {
        console.error('[TopicRecommendations] Error fetching trending chips:', err);
      }
    };

    fetchTrendingChips();
  }, []);

  // Close autocomplete on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch autocomplete suggestions from YouTube/Google suggest API
  const fetchAutocompleteSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setAutocompleteSuggestions([]);
      return;
    }
    try {
      const langCode = language === 'id' ? 'id' : language === 'hi' ? 'hi' : 'en';
      const { data, error } = await supabase.functions.invoke('autocomplete-keywords', {
        body: { query: query.trim(), lang: langCode }
      });
      if (error) throw error;
      if (data?.suggestions) {
        setAutocompleteSuggestions(data.suggestions.slice(0, 8));
      }
    } catch (err) {
      console.error('[Autocomplete] Error:', err);
      // Fallback: filter trending chips locally
      const q = query.trim().toLowerCase();
      const fallback = trendingChips
        .filter(chip => chip.keyword.toLowerCase().includes(q))
        .map(chip => chip.keyword);
      setAutocompleteSuggestions(fallback.length > 0 ? fallback : trendingChips.map(c => c.keyword));
    }
  }, [language, trendingChips]);

  // Handle search input change with debounced API call
  const handleSearchInputChange = (value: string) => {
    setSearchKeyword(value);
    if (value.trim().length >= 1) {
      setShowSuggestions(true);
      // Debounce API call (300ms)
      if (autocompleteDebounceRef.current) clearTimeout(autocompleteDebounceRef.current);
      if (value.trim().length >= 2) {
        autocompleteDebounceRef.current = setTimeout(() => {
          fetchAutocompleteSuggestions(value);
        }, 300);
      } else {
        // 1 char: filter trending chips by input
        const q = value.trim().toLowerCase();
        const filtered = trendingChips
          .filter(c => c.keyword.toLowerCase().includes(q))
          .map(c => c.keyword);
        setAutocompleteSuggestions(filtered.length > 0 ? filtered : []);
      }
    } else {
      setShowSuggestions(false);
      setAutocompleteSuggestions([]);
    }
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

  const isCacheValid = (timestamp: number, cachedNichesHash?: string, cachedKeyword?: string | null) => {
    if (Date.now() - timestamp >= TOPICS_CACHE_EXPIRY) return false;
    // Keyword cache: keyword must match current active keyword
    if (activeKeyword || cachedKeyword) {
      return cachedKeyword === activeKeyword;
    }
    // Default mode: niches must match
    return cachedNichesHash === getNichesHash();
  };

  const cacheTopics = (topics: Topic[], batch: number = 1, keyword?: string | null) => {
    try {
      localStorage.setItem(TOPICS_CACHE_KEY, JSON.stringify({
        topics,
        timestamp: Date.now(),
        language: language,
        nichesHash: getNichesHash(),
        batch,
        keyword: keyword || null,
      }));
    } catch (e) {
      console.error('Error caching topics:', e);
    }
  };

  // Load topics from cache or generate new ones
  const loadTopics = useCallback(async (forceRefresh = false) => {
    if (!user) {
      setTopics(getFallbackTopics(scriptLanguage));
      setLoading(false);
      return;
    }

    // Try cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = getCachedTopics();
      if (cached && cached.topics && cached.topics.length > 0 &&
          isCacheValid(cached.timestamp, cached.nichesHash, cached.keyword)) {
        setTopics(cached.topics);
        if (cached.batch) setCurrentBatch(cached.batch);
        if (cached.keyword) {
          setActiveKeyword(cached.keyword);
          setSearchKeyword(cached.keyword);
        }
        setLoading(false);
        return;
      }
    }

    // Generate new topics
    await generateTopics();
  }, [user, onboardingData, language]);

  const generateTopics = async (batch: number = 1, existingTopics: Topic[] = [], keyword?: string) => {
    // Keyword mode doesn't require onboarding data
    if (!keyword && !onboardingData) {
      console.log('[TopicRecommendations] No onboarding data, using fallback');
      setTopics(getFallbackTopics(scriptLanguage));
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      return;
    }

    console.log('[TopicRecommendations] Generating topics with:', {
      interest: onboardingData?.interest,
      niches: onboardingData?.selected_niches,
      dnaStyles: onboardingData?.creative_dna,
      language,
      batch,
      keyword: keyword || null,
    });

    try {
      // Get country for trending data
      const savedCountry = localStorage.getItem('sparkfluence_user_country') || 'ID';

      // Build exclude list from existing topics for dedup
      const excludeTitles = existingTopics.map(t => t.title);

      // Timeout wrapper: 30s (LLM calls need time, especially with key fallbacks)
      const timeoutMs = 30000;
      const invokePromise = supabase.functions.invoke("generate-topic-suggestions", {
        body: {
          interest: onboardingData?.interest,
          profession: onboardingData?.profession,
          niches: onboardingData?.selected_niches,
          objectives: onboardingData?.objectives,
          dnaStyles: onboardingData?.creative_dna,
          language: (() => {
            const sl = getScriptLanguageFromCountry(onboardingData?.country);
            return sl === "id" ? "indonesian" : sl === "hi" ? "hindi" : "english";
          })(),
          count: batch === 1 ? INITIAL_COUNT : LOAD_MORE_COUNT,
          country: savedCountry,
          batch,
          exclude_titles: excludeTitles,
          user_id: user?.id,
          search_keyword: keyword || null,
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeoutMs)
      );

      const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

      if (error) {
        let errorMessage = error.message || 'Unknown error';
        // Extract actual error body from FunctionsHttpError
        if (error.context) {
          try {
            const errorBody = await error.context.json();
            errorMessage = errorBody?.error?.message || errorBody?.message || errorMessage;
            console.error('[TopicRecommendations] Edge Function error body:', errorBody);
          } catch { /* context may not be JSON */ }
        }
        console.error('[TopicRecommendations] Edge Function error:', errorMessage);
        throw new Error(errorMessage);
      }

      if (data?.success && data?.data?.topics) {
        const batchCount = batch === 1 ? INITIAL_COUNT : LOAD_MORE_COUNT;
        const rawNewTopics: Topic[] = data.data.topics.slice(0, batchCount).map((t: any, idx: number) => ({
          id: existingTopics.length + idx + 1,
          title: t.title,
          description: t.description,
          trending_source: t.trending_source || 'ai',
          trending_keyword: t.trending_keyword || null,
          hashtags: Array.isArray(t.hashtags) ? t.hashtags.slice(0, 3) : [],
        }));

        // Client-side dedup: filter out topics with titles already shown
        const existingTitlesLower = new Set(existingTopics.map(t => t.title.toLowerCase()));
        const uniqueNewTopics = batch > 1
          ? rawNewTopics.filter(t => !existingTitlesLower.has(t.title.toLowerCase()))
          : rawNewTopics;

        // Re-assign sequential IDs after dedup
        const startId = existingTopics.length + 1;
        uniqueNewTopics.forEach((t, idx) => { t.id = startId + idx; });

        const allTopics = batch > 1 ? [...existingTopics, ...uniqueNewTopics] : uniqueNewTopics;
        console.log('[TopicRecommendations] Generated topics:', uniqueNewTopics.length, 'total:', allTopics.length);
        setTopics(allTopics);
        setCurrentBatch(batch);
        cacheTopics(allTopics, batch, keyword);
      } else {
        console.log('[TopicRecommendations] Invalid response, using fallback:', data);
        if (batch === 1) {
          setTopics(getFallbackTopics(scriptLanguage));
        }
      }
    } catch (err: any) {
      console.error("[TopicRecommendations] Error generating topics:", err);
      if (batch === 1) {
        setTopics(getFallbackTopics(scriptLanguage));
      }
      // For batch > 1: keep existing topics, don't crash
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (!onboardingLoading) {
      loadTopics();
    }
  }, [onboardingLoading, loadTopics]);

  // Note: Language change no longer triggers topic regeneration
  // Topics are universal ideas - only the script output language matters
  // The language is passed to generate-script edge function for script generation

  // Handle refresh
  const handleRefresh = async () => {
    if (refreshing || disabled || rateLimited) return;

    if (!checkRateLimit()) {
      return;
    }

    recordRefresh();

    setRefreshing(true);
    setSelectedId(null);
    setCurrentBatch(1);

    localStorage.removeItem(TOPICS_CACHE_KEY);

    if (activeKeyword) {
      await generateTopics(1, [], activeKeyword);
    } else {
      await loadTopics(true);
    }
  };

  // Handle load more topics
  const handleLoadMore = async () => {
    if (loadingMore || currentBatch >= MAX_BATCHES || disabled) return;
    setLoadingMore(true);
    await generateTopics(currentBatch + 1, topics, activeKeyword || undefined);
  };

  // Handle keyword search
  const handleKeywordSearch = async (keyword?: string) => {
    const kw = (keyword || searchKeyword).trim();
    if (!kw) return;

    if (!checkRateLimit()) return;
    recordRefresh();

    setActiveKeyword(kw);
    setSearchKeyword(kw);
    setSearchLoading(true);
    setSelectedId(null);
    setCurrentBatch(1);

    localStorage.removeItem(TOPICS_CACHE_KEY);

    await generateTopics(1, [], kw);
    setSearchLoading(false);
  };

  // Clear keyword search and return to personalized topics
  const handleClearKeyword = async () => {
    setActiveKeyword(null);
    setSearchKeyword('');
    setSelectedId(null);
    setCurrentBatch(1);

    localStorage.removeItem(TOPICS_CACHE_KEY);

    setLoading(true);
    await loadTopics(true);
  };

  // Record topic selection to user_topic_history
  const recordTopicSelection = async (topic: Topic) => {
    if (!user?.id) return;
    try {
      await supabase.from('user_topic_history').insert({
        user_id: user.id,
        topic_title: topic.title,
        topic_description: topic.description,
        trending_source: topic.trending_source || 'ai',
        trending_keyword: topic.trending_keyword || null,
        action: 'selected',
      });
    } catch (err) {
      console.error('[TopicRecommendations] Error recording selection:', err);
    }
  };

  // Handle topic selection
  const handleSelectTopic = (topic: Topic) => {
    if (disabled) return;
    setSelectedId(topic.id);
    recordTopicSelection(topic);
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
      title: language === "id" ? "Topik Trending" : language === "hi" ? "ट्रेंडिंग विषय" : "Trending Topics",
      generating: language === "id" ? "Mencari topik trending..." : language === "hi" ? "ट्रेंडिंग विषय खोज रहे हैं..." : "Finding trending topics...",
      pleaseWait: language === "id" ? "Mohon tunggu sebentar" : language === "hi" ? "कृपया प्रतीक्षा करें" : "Please wait a moment",
    };

    return (
      <div className="mb-6 sm:mb-8 w-full">
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
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="h-20 bg-card border border-border-default rounded-lg animate-pulse flex items-center justify-center"
            >
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // UI text translations
  const uiText = {
    title: language === "id" ? "Topik Trending" : language === "hi" ? "ट्रेंडिंग विषय" : "Trending Topics",
    refresh: language === "id" ? "Refresh" : language === "hi" ? "रीफ्रेश" : "Refresh",
    wait: language === "id" ? "Tunggu" : language === "hi" ? "रुकें" : "Wait",
    basedOn: language === "id" ? "Berdasarkan Niche:" : language === "hi" ? "निच के आधार पर:" : "Based on Niches:",
    orType: language === "id" ? "atau ketik topik sendiri" : language === "hi" ? "या अपना विषय टाइप करें" : "or type your own topic",
    loadMore: language === "id" ? "Muat Lebih Banyak" : language === "hi" ? "और लोड करें" : "Load More Topics",
    loadingMore: language === "id" ? "Memuat..." : language === "hi" ? "लोड हो रहा है..." : "Loading...",
    topicCount: language === "id" ? "topik" : language === "hi" ? "विषय" : "topics",
    rateLimitWarning: language === "id"
      ? `Terlalu banyak refresh. Tunggu ${cooldownRemaining} detik.`
      : language === "hi"
      ? `बहुत सारे रीफ्रेश। ${cooldownRemaining} सेकंड प्रतीक्षा करें।`
      : `Too many refresh attempts. Please wait ${cooldownRemaining} seconds.`,
    searchPlaceholder: language === "id" ? "Cari keyword trending..." : language === "hi" ? "ट्रेंडिंग कीवर्ड खोजें..." : "Search trending keyword...",
    trendingNow: language === "id" ? "Trending:" : language === "hi" ? "ट्रेंडिंग:" : "Trending:",
    resultsFor: language === "id" ? "Hasil untuk:" : language === "hi" ? "परिणाम:" : "Results for:",
    searching: language === "id" ? "Mencari topik" : language === "hi" ? "विषय खोज रहे हैं" : "Searching topics for",
  };

  return (
    <div className="mb-6 sm:mb-8 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
          <h3 className="text-sm sm:text-xl font-semibold text-text-primary">
            {uiText.title}
          </h3>
          {topics.length > 0 && (
            <span className="text-text-muted text-xs">
              {topics.length} {uiText.topicCount}
            </span>
          )}
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

      {/* Context Badges - Show user's personalization ABOVE search bar */}
      {!activeKeyword && (onboardingData?.interest || onboardingData?.selected_niches || onboardingData?.creative_dna) && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
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

      {/* Search Bar */}
      <div className="mb-3 sm:mb-4" ref={searchContainerRef}>
        <div className="relative">
          {searchLoading ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          )}
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { handleKeywordSearch(); setShowSuggestions(false); }
              if (e.key === 'Escape') setShowSuggestions(false);
            }}
            onFocus={() => { if (searchKeyword.trim().length >= 1) setShowSuggestions(true); }}
            placeholder={uiText.searchPlaceholder}
            className="w-full pl-9 pr-9 py-2 sm:py-2.5 bg-card border border-border-default rounded-lg text-sm text-text-primary placeholder-text-muted focus:border-primary focus:outline-none transition-colors"
            disabled={disabled || searchLoading}
          />
          {searchKeyword && !searchLoading && (
            <button
              onClick={() => { activeKeyword ? handleClearKeyword() : setSearchKeyword(''); setShowSuggestions(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Autocomplete Dropdown - Google-like suggestions */}
          {showSuggestions && autocompleteSuggestions.length > 0 && (
            <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-card border border-border-default rounded-lg shadow-lg overflow-hidden max-h-[320px] overflow-y-auto">
              {autocompleteSuggestions.map((suggestion, i) => {
                // Highlight the part that matches user input
                const query = searchKeyword.trim().toLowerCase();
                const idx = suggestion.toLowerCase().indexOf(query);
                return (
                  <button
                    key={i}
                    onClick={() => { handleKeywordSearch(suggestion); setShowSuggestions(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm text-text-secondary hover:bg-surface hover:text-text-primary transition-colors"
                  >
                    <Search className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                    <span className="flex-1 truncate">
                      {idx >= 0 ? (
                        <>
                          {suggestion.slice(0, idx)}
                          <span className="text-text-muted">{suggestion.slice(idx, idx + query.length)}</span>
                          <span className="font-medium text-text-primary">{suggestion.slice(idx + query.length)}</span>
                        </>
                      ) : (
                        <span className="font-medium text-text-primary">{suggestion}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Active keyword indicator */}
        {activeKeyword && !searchLoading && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-text-muted text-xs">{uiText.resultsFor}</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/15 border border-primary/30 rounded-full text-xs text-primary font-medium">
              #{activeKeyword}
              <button onClick={handleClearKeyword} className="hover:text-primary-hover">
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}

        {/* Trending Chips - horizontally scrollable */}
        {!activeKeyword && trendingChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="text-text-muted text-xs whitespace-nowrap">{uiText.trendingNow}</span>
            {trendingChips.map((chip, i) => {
              const sourceColor = chip.source === 'tiktok' ? 'bg-pink-500' : chip.source === 'google' ? 'bg-blue-500' : chip.source === 'youtube' ? 'bg-red-500' : chip.source === 'news' ? 'bg-emerald-500' : 'bg-amber-500';
              return (
                <button
                  key={i}
                  onClick={() => handleKeywordSearch(chip.keyword)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-card border border-border-default rounded-full text-xs text-text-secondary hover:border-primary/50 hover:text-primary transition-colors whitespace-nowrap"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${sourceColor}`} />
                  #{chip.keyword}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Search Loading State */}
      {searchLoading && (
        <>
          <div className="flex items-center justify-center gap-3 py-4 mb-3">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <p className="text-text-secondary text-sm">
              {uiText.searching} <span className="text-primary font-medium">"{activeKeyword}"</span>...
            </p>
          </div>
          {/* Mobile skeleton */}
          <div className="sm:hidden px-8 mb-4">
            <div className="h-24 bg-card border border-border-default rounded-xl animate-pulse flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          </div>
          {/* Desktop skeleton */}
          <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={`search-skeleton-${i}`} className="h-20 bg-card border border-border-default rounded-lg animate-pulse flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Topic Content - Hidden during search loading */}
      {!searchLoading && (<>

      {/* Mobile Carousel - Show only on mobile, sorted by source */}
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
            {[...topics].sort((a, b) => {
              const order: Record<string, number> = { google: 0, tiktok: 1, youtube: 2, news: 3, ai_creative: 4, ai: 5 };
              return (order[a.trending_source || 'ai'] ?? 3) - (order[b.trending_source || 'ai'] ?? 3);
            }).map((topic) => {
              const isSelected = selectedId === topic.id;
              const badge = (topic.trending_source && SOURCE_BADGE_CONFIG[topic.trending_source]) || SOURCE_BADGE_CONFIG.ai;
              return (
                <div key={topic.id} className="w-full flex-shrink-0">
                  <button
                    onClick={() => handleSelectTopic(topic)}
                    disabled={disabled}
                    className={`
                      w-full text-left p-3 rounded-lg border transition-all duration-200
                      ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                      ${isSelected
                        ? "bg-primary/20 border-primary shadow-md shadow-primary/20"
                        : "bg-card border-border-default"
                      }
                    `}
                  >
                    {/* Source badge + check */}
                    <div className="flex items-center justify-between mb-1.5">
                      {badge && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${badge.bg} ${badge.border} ${badge.text}`}>
                          {badge.label}
                        </span>
                      )}
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </span>
                      )}
                    </div>
                    <h4 className="text-text-primary font-semibold text-sm mb-1 line-clamp-2 leading-tight">
                      {topic.title}
                    </h4>
                    <p className="text-text-muted text-xs line-clamp-2 leading-tight">
                      {topic.description}
                    </p>
                    {/* Hashtags */}
                    {topic.hashtags && topic.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {topic.hashtags.map((tag, i) => (
                          <span key={i} className="text-[9px] text-primary/70 bg-primary/10 px-1 py-0.5 rounded flex items-center gap-0.5">
                            <Hash className="w-2 h-2" />
                            {tag.replace('#', '')}
                          </span>
                        ))}
                      </div>
                    )}
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

      {/* Desktop Grid - Sorted by source, compact single row */}
      <div className="hidden sm:block">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {[...topics].sort((a, b) => {
            const order: Record<string, number> = { google: 0, tiktok: 1, youtube: 2, news: 3, ai_creative: 4, ai: 5 };
            return (order[a.trending_source || 'ai'] ?? 3) - (order[b.trending_source || 'ai'] ?? 3);
          }).map((topic) => {
            const isSelected = selectedId === topic.id;
            const badge = (topic.trending_source && SOURCE_BADGE_CONFIG[topic.trending_source]) || SOURCE_BADGE_CONFIG.ai;
            return (
              <button
                key={topic.id}
                onClick={() => handleSelectTopic(topic)}
                disabled={disabled}
                className={`
                  text-left p-3 rounded-lg border transition-all duration-200 flex flex-col
                  hover:scale-[1.01] active:scale-[0.99]
                  ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                  ${isSelected
                    ? "bg-primary/20 border-primary shadow-md shadow-primary/20"
                    : "bg-card border-border-default hover:border-primary/50 hover:bg-card/80"
                  }
                `}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${badge.bg} ${badge.border} ${badge.text}`}>
                    {badge.label}
                  </span>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </span>
                  )}
                </div>
                <h4 className="text-text-primary font-medium text-sm mb-1 line-clamp-2 leading-snug">
                  {topic.title}
                </h4>
                <p className="text-text-muted text-[11px] line-clamp-2 leading-snug flex-1">
                  {topic.description}
                </p>
                {topic.hashtags && topic.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {topic.hashtags.map((tag, i) => (
                      <span key={i} className="text-[8px] text-primary/70 bg-primary/10 px-1 py-0.5 rounded flex items-center gap-0.5">
                        <Hash className="w-2 h-2" />
                        {tag.replace('#', '')}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Load More Skeleton Cards */}
        {loadingMore && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`skeleton-${i}`} className="p-2.5 rounded-lg border border-border-default bg-card animate-pulse flex flex-col gap-1">
                <div className="w-12 h-3 bg-surface rounded-full" />
                <div className="w-full h-3 bg-surface rounded" />
                <div className="w-3/4 h-3 bg-surface rounded" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Load More Button */}
      {currentBatch < MAX_BATCHES && topics.length > 0 && !loading && (
        <div className="flex justify-center mt-4">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore || disabled || rateLimited}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all
              ${loadingMore || disabled || rateLimited
                ? 'bg-surface text-text-muted cursor-not-allowed'
                : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30'
              }
            `}
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {uiText.loadingMore}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                {uiText.loadMore}
                <span className="text-xs text-text-muted">({currentBatch}/{MAX_BATCHES})</span>
              </>
            )}
          </button>
        </div>
      )}

      </>)}

      {/* Divider - hidden on desktop 2-column layout */}
      <div className="flex items-center gap-2 sm:gap-4 mt-4 sm:mt-6 lg:hidden">
        <div className="flex-1 h-px bg-border-default" />
        <span className="text-text-muted text-xs sm:text-sm whitespace-nowrap">
          {uiText.orType}
        </span>
        <div className="flex-1 h-px bg-border-default" />
      </div>
    </div>
  );
};
