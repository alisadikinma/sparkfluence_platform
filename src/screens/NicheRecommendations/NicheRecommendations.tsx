import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Logo } from "../../components/ui/logo";
import { useOnboarding } from "../../contexts/OnboardingContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { detectCountryFromTimezone } from "../../lib/countryDetection";
import { Loader2, Sparkles, RefreshCw, Database } from "lucide-react";

interface Niche {
  id: number;
  title: string;
  description: string;
  growth_potential: string;
  image_url: string;
}

// Default fallback images
const defaultImages = [
  "https://images.pexels.com/photos/4065876/pexels-photo-4065876.jpeg?auto=compress&cs=tinysrgb&w=400",
  "https://images.pexels.com/photos/4467687/pexels-photo-4467687.jpeg?auto=compress&cs=tinysrgb&w=400",
  "https://images.pexels.com/photos/3755706/pexels-photo-3755706.jpeg?auto=compress&cs=tinysrgb&w=400",
  "https://images.pexels.com/photos/6863332/pexels-photo-6863332.jpeg?auto=compress&cs=tinysrgb&w=400",
  "https://images.pexels.com/photos/3759657/pexels-photo-3759657.jpeg?auto=compress&cs=tinysrgb&w=400",
  "https://images.pexels.com/photos/7915437/pexels-photo-7915437.jpeg?auto=compress&cs=tinysrgb&w=400",
];

// Interest-keyed fallback niches (used as last resort when all APIs fail)
const fallbackNichesByInterest: Record<string, Niche[]> = {
  "Technology": [
    { id: 1, title: "AI tools review and tutorials for productivity", description: "AI Tools", growth_potential: "+12% Tech", image_url: defaultImages[0] },
    { id: 2, title: "Latest gadget unboxing and honest reviews", description: "Tech Reviews", growth_potential: "+8% Eng", image_url: defaultImages[1] },
    { id: 3, title: "Coding tutorials and web development tips", description: "Programming", growth_potential: "+10% Dev", image_url: defaultImages[2] },
    { id: 4, title: "Startup tips and tech entrepreneurship stories", description: "Tech Startups", growth_potential: "+6% Biz", image_url: defaultImages[3] },
    { id: 5, title: "Cybersecurity awareness and online safety tips", description: "Cybersecurity", growth_potential: "+9% Sec", image_url: defaultImages[4] },
    { id: 6, title: "SaaS tools comparison and software reviews", description: "Software Reviews", growth_potential: "+7% SaaS", image_url: defaultImages[5] },
  ],
  "Entertainment": [
    { id: 1, title: "Movie reviews and film analysis for cinephiles", description: "Film Analysis", growth_potential: "+8% Eng", image_url: defaultImages[0] },
    { id: 2, title: "Gaming tips, reviews and esports highlights", description: "Gaming", growth_potential: "+10% Game", image_url: defaultImages[1] },
    { id: 3, title: "K-Drama and anime recommendations and reviews", description: "Asian Entertainment", growth_potential: "+12% Pop", image_url: defaultImages[2] },
    { id: 4, title: "Music production tips and song cover tutorials", description: "Music Creation", growth_potential: "+6% Music", image_url: defaultImages[3] },
    { id: 5, title: "Comedy sketches and trending meme content", description: "Comedy Content", growth_potential: "+15% Viral", image_url: defaultImages[4] },
    { id: 6, title: "Celebrity news and pop culture commentary", description: "Pop Culture", growth_potential: "+7% News", image_url: defaultImages[5] },
  ],
  "Culinary": [
    { id: 1, title: "Quick and easy recipes for busy professionals", description: "Quick Meals", growth_potential: "+8% Cook", image_url: defaultImages[0] },
    { id: 2, title: "Street food exploration and restaurant reviews", description: "Food Review", growth_potential: "+10% Food", image_url: defaultImages[1] },
    { id: 3, title: "Healthy meal prep ideas and nutrition tips", description: "Healthy Eating", growth_potential: "+9% Health", image_url: defaultImages[2] },
    { id: 4, title: "Baking tutorials from beginner to advanced", description: "Baking", growth_potential: "+6% Bake", image_url: defaultImages[3] },
    { id: 5, title: "Traditional cuisine recipes from around the world", description: "World Cuisine", growth_potential: "+7% Global", image_url: defaultImages[4] },
    { id: 6, title: "Kitchen hacks and food photography tips", description: "Kitchen Tips", growth_potential: "+5% Tips", image_url: defaultImages[5] },
  ],
  "Fashion": [
    { id: 1, title: "Daily outfit inspiration and style guides", description: "OOTD Style", growth_potential: "+8% Fashion", image_url: defaultImages[0] },
    { id: 2, title: "Sustainable fashion and thrift haul finds", description: "Thrift Fashion", growth_potential: "+10% Eco", image_url: defaultImages[1] },
    { id: 3, title: "Streetwear trends and sneaker culture", description: "Streetwear", growth_potential: "+12% Street", image_url: defaultImages[2] },
    { id: 4, title: "Fashion on a budget — looking stylish for less", description: "Budget Fashion", growth_potential: "+7% Save", image_url: defaultImages[3] },
    { id: 5, title: "Accessory styling tips and wardrobe essentials", description: "Accessories", growth_potential: "+5% Style", image_url: defaultImages[4] },
    { id: 6, title: "Seasonal fashion trends and color coordination", description: "Trend Alert", growth_potential: "+6% Trend", image_url: defaultImages[5] },
  ],
  "Health": [
    { id: 1, title: "Home workout routines for all fitness levels", description: "Home Fitness", growth_potential: "+10% Fit", image_url: defaultImages[0] },
    { id: 2, title: "Mental health awareness and mindfulness practices", description: "Mental Wellness", growth_potential: "+12% Mind", image_url: defaultImages[1] },
    { id: 3, title: "Nutrition tips and healthy eating habits", description: "Nutrition", growth_potential: "+8% Eat", image_url: defaultImages[2] },
    { id: 4, title: "Yoga and meditation guides for beginners", description: "Yoga", growth_potential: "+9% Zen", image_url: defaultImages[3] },
    { id: 5, title: "Sleep optimization and stress management tips", description: "Sleep Health", growth_potential: "+7% Rest", image_url: defaultImages[4] },
    { id: 6, title: "Running tips and marathon training plans", description: "Running", growth_potential: "+6% Run", image_url: defaultImages[5] },
  ],
  "_default": [
    { id: 1, title: "Boost productivity with practical tips and tools", description: "Productivity", growth_potential: "+8% Eng", image_url: defaultImages[0] },
    { id: 2, title: "Personal branding strategies for the digital age", description: "Personal Branding", growth_potential: "+6% Brand", image_url: defaultImages[1] },
    { id: 3, title: "Financial literacy and smart money management", description: "Finance Tips", growth_potential: "+7% Fin", image_url: defaultImages[2] },
    { id: 4, title: "Self-improvement and motivation content", description: "Self Development", growth_potential: "+9% Growth", image_url: defaultImages[3] },
    { id: 5, title: "Creative content ideas and storytelling techniques", description: "Content Creation", growth_potential: "+10% Create", image_url: defaultImages[4] },
    { id: 6, title: "Trending topics and viral content strategies", description: "Viral Content", growth_potential: "+12% Viral", image_url: defaultImages[5] },
  ],
};

// Get fallback niches for a specific interest
function getFallbackNiches(interest?: string): Niche[] {
  if (interest && fallbackNichesByInterest[interest]) {
    return fallbackNichesByInterest[interest];
  }
  return fallbackNichesByInterest["_default"];
}

export const NicheRecommendations = (): JSX.Element => {
  const navigate = useNavigate();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const { language: uiLanguage } = useLanguage();
  const { user } = useAuth();
  
  const [allNiches, setAllNiches] = useState<Niche[]>([]);
  const [visibleCount, setVisibleCount] = useState(6);
  const [selectedNiches, setSelectedNiches] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCached, setIsCached] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userCountry, setUserCountry] = useState<string>('ID');

  // Fetch user's country from profile or detect from timezone
  useEffect(() => {
    const fetchUserCountry = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('user_profiles')
          .select('country')
          .eq('user_id', user.id)
          .single();
        
        if (data?.country) {
          setUserCountry(data.country);
          console.log('[NicheRec] User country from DB:', data.country);
        } else {
          // Fallback to timezone detection
          const detected = detectCountryFromTimezone();
          setUserCountry(detected);
          console.log('[NicheRec] Detected country:', detected);
        }
      } else {
        // No user, detect from timezone
        const detected = detectCountryFromTimezone();
        setUserCountry(detected);
      }
    };
    fetchUserCountry();
  }, [user]);

  useEffect(() => {
    generateNiches();
  }, []);

  // Restore selected niches from context
  useEffect(() => {
    if (onboardingData.selectedNiches && allNiches.length > 0) {
      const selectedTitles = onboardingData.selectedNiches.split("; ");
      const nicheIds = allNiches
        .filter(n => selectedTitles.includes(n.title))
        .map(n => n.id);
      setSelectedNiches(nicheIds);
    }
  }, [allNiches, onboardingData.selectedNiches]);

  const generateNiches = async (forceRegenerate = false) => {
    setLoading(true);
    setError(null);

    try {
      if (!onboardingData.interest || !onboardingData.profession) {
        console.warn('Missing onboarding data, using fallback');
        setAllNiches(getFallbackNiches());
        setLoading(false);
        return;
      }

      // Primary: generate-niche-recommendations (heavy, Tavily + LLM + images)
      console.log('[NicheRec] Calling API with country:', userCountry);
      const { data, error: funcError } = await supabase.functions.invoke('generate-niche-recommendations', {
        body: {
          interest: onboardingData.interest,
          profession: onboardingData.profession,
          country: userCountry,
          skipCache: forceRegenerate
        }
      });

      if (funcError) {
        throw new Error(funcError.message);
      }

      if (!data?.success || !data?.data?.niches) {
        throw new Error(data?.error?.message || 'Failed to generate niches');
      }

      setAllNiches(data.data.niches);
      setIsCached(data.data.cached || false);

    } catch (err: any) {
      console.error('Error generating niches (primary):', err);

      // Secondary fallback: lightweight generate-niche-suggestions in browse mode
      try {
        console.log('[NicheRec] Trying lightweight fallback...');
        const { data: lightData } = await supabase.functions.invoke('generate-niche-suggestions', {
          body: {
            mode: 'browse',
            interest: onboardingData.interest,
            profession: onboardingData.profession,
          }
        });

        if (lightData?.success && lightData?.niches?.length > 0) {
          const lightNiches: Niche[] = lightData.niches.map((title: string, idx: number) => ({
            id: idx + 1,
            title,
            description: title,
            growth_potential: 'Trending',
            image_url: defaultImages[idx % defaultImages.length],
          }));
          setAllNiches(lightNiches);
          console.log('[NicheRec] Lightweight fallback succeeded:', lightNiches.length, 'niches');
          return;
        }
      } catch (lightErr) {
        console.error('Lightweight fallback also failed:', lightErr);
      }

      // Last resort: interest-specific static fallback
      setAllNiches(getFallbackNiches(onboardingData.interest));
    } finally {
      setLoading(false);
    }
  };

  const toggleNiche = (id: number) => {
    setSelectedNiches((prev) => {
      if (prev.includes(id)) {
        return prev.filter((nicheId) => nicheId !== id);
      } else {
        if (prev.length >= 3) {
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  const handleShowMore = () => {
    setVisibleCount(12);
  };

  const handleNext = () => {
    if (selectedNiches.length === 0) return;

    const selectedNicheObjects = allNiches.filter(n => selectedNiches.includes(n.id));
    const nicheDescriptions = selectedNicheObjects.map(n => n.title).join("; ");

    updateOnboardingData({
      selectedNiches: nicheDescriptions
    });
    navigate("/creative-dna");
  };

  const handlePrevious = () => {
    navigate("/onboarding");
  };

  const visibleNiches = allNiches.slice(0, visibleCount);
  const hasMoreNiches = visibleCount < allNiches.length;
  const canProceed = selectedNiches.length > 0;

  // Loading state
  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#0a0a12] flex flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-[#7c3aed] animate-spin" />
            <Sparkles className="w-5 h-5 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Finding Your Perfect Niches...</h2>
            <p className="text-white/60 text-sm">
              AI is analyzing your interest & profession
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#0a0a12] px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-center mb-6">
            <Logo />
          </div>
          <div className="flex gap-2 mb-8 max-w-md mx-auto">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  step <= 2
                    ? "bg-[#7c3aed]"
                    : "bg-[#4e5562]"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            <span className="text-2xl">✨</span>
            Niche Recommendations for You
          </h1>
          <p className="text-white/60 text-sm">
            Based on your interest ({onboardingData.interest}) and profession ({onboardingData.profession}). 
            Choose up to 3 niches 🚀
          </p>
          
          {/* Status & Regenerate */}
          <div className="mt-4 flex items-center justify-center gap-4">
            {isCached && (
              <span className="inline-flex items-center gap-1 text-green-400/70 text-xs">
                <Database className="w-3 h-3" />
                Loaded from cache
              </span>
            )}
            <button
              onClick={() => generateNiches(true)}
              className="inline-flex items-center gap-2 text-[#7c3aed] hover:text-[#9f67ff] text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate new niches
            </button>
          </div>

          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500/50 rounded-xl p-3 max-w-md mx-auto">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {visibleNiches.map((niche) => {
            const isDisabled = !selectedNiches.includes(niche.id) && selectedNiches.length >= 3;
            return (
              <Card
                key={niche.id}
                className={`relative bg-[#1a1a24] border overflow-hidden transition-all duration-200 group ${
                  selectedNiches.includes(niche.id)
                    ? "border-[#7c3aed] ring-2 ring-[#7c3aed] cursor-pointer"
                    : isDisabled
                    ? "border-[#2b2b38] opacity-50 cursor-not-allowed"
                    : "border-[#2b2b38] hover:border-[#7c3aed]/50 cursor-pointer"
                }`}
                onClick={() => !isDisabled && toggleNiche(niche.id)}
              >
                <div className="absolute top-3 left-3 z-10">
                  <div
                    className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                      selectedNiches.includes(niche.id)
                        ? "bg-[#7c3aed] border-[#7c3aed]"
                        : "bg-transparent border-white/30"
                    }`}
                  >
                    {selectedNiches.includes(niche.id) && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </div>

                <div className="relative h-48 overflow-hidden">
                  <img
                    src={niche.image_url}
                    alt={niche.description}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.pexels.com/photos/4065876/pexels-photo-4065876.jpeg?auto=compress&cs=tinysrgb&w=400";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a24] via-transparent to-transparent" />
                </div>

                <div className="p-4">
                  <p className="text-white/90 text-sm leading-relaxed mb-3 line-clamp-3">
                    {niche.title}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-white/50 text-xs">{niche.description}</span>
                    <span className="text-[#7c3aed] text-xs font-medium bg-[#7c3aed]/10 px-2 py-1 rounded">
                      {niche.growth_potential}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* See other options */}
        {hasMoreNiches && (
          <div className="text-center mb-8">
            <button
              onClick={handleShowMore}
              className="text-white/60 text-sm hover:text-white transition-colors duration-200 underline"
            >
              See other options ({allNiches.length - visibleCount} more)
            </button>
          </div>
        )}

        {/* Selection counter */}
        {selectedNiches.length > 0 && (
          <div className="text-center mb-6">
            <span className="text-white/60 text-sm">
              {selectedNiches.length} of 3 niches selected
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button
            onClick={handlePrevious}
            variant="secondary"
            className="bg-white text-[#0a0a12] hover:bg-white/90 h-12 px-8 font-medium"
          >
            Previous
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed}
            className={`h-12 px-8 font-medium transition-all ${
              canProceed
                ? "bg-[#7c3aed] hover:bg-[#6d28d9] text-white"
                : "bg-[#7c3aed]/50 text-white/50 cursor-not-allowed"
            }`}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};
