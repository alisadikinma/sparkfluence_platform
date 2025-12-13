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

// Fallback niches if everything fails
const fallbackNiches: Niche[] = [
  {
    id: 1,
    title: "Help your audience boost productivity with reviews of tech tools and apps to use everyday",
    description: "Tech reviews and productivity",
    growth_potential: "+8% Eng",
    image_url: "https://images.pexels.com/photos/4065876/pexels-photo-4065876.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    id: 2,
    title: "Focus on strategies for building a personalized brand that aligns with image in the digital age",
    description: "Personal branding strategies",
    growth_potential: "+4% Agg",
    image_url: "https://images.pexels.com/photos/4467687/pexels-photo-4467687.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    id: 3,
    title: "The role of eco-friendly fashion, how new starts are redefining fashion to energy-saving tips",
    description: "Sustainable fashion",
    growth_potential: "+3% Exp",
    image_url: "https://images.pexels.com/photos/3755706/pexels-photo-3755706.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    id: 4,
    title: "Personal financial education for the younger generation — from budgeting and investing",
    description: "Financial literacy for Gen Z",
    growth_potential: "+2% Emag",
    image_url: "https://images.pexels.com/photos/6863332/pexels-photo-6863332.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    id: 5,
    title: "A niche that discusses emotional balance, self-motivation, and mindfulness practices",
    description: "Mental wellness",
    growth_potential: "+9% Art",
    image_url: "https://images.pexels.com/photos/3759657/pexels-photo-3759657.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    id: 6,
    title: "Explore the world of modern gaming, from game reviews and competitive tips to esports",
    description: "Gaming and esports",
    growth_potential: "+10% Lk",
    image_url: "https://images.pexels.com/photos/7915437/pexels-photo-7915437.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    id: 7,
    title: "Share quick and healthy recipes for busy professionals looking to maintain wellness",
    description: "Healthy cooking tips",
    growth_potential: "+7% Eng",
    image_url: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    id: 8,
    title: "Travel content focused on hidden gems and authentic local experiences",
    description: "Off-the-beaten-path travel",
    growth_potential: "+6% Exp",
    image_url: "https://images.pexels.com/photos/2376997/pexels-photo-2376997.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    id: 9,
    title: "DIY home improvement projects and interior design inspiration on a budget",
    description: "Budget home decor",
    growth_potential: "+5% Home",
    image_url: "https://images.pexels.com/photos/1457842/pexels-photo-1457842.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    id: 10,
    title: "Fitness routines and workout tips for beginners starting their wellness journey",
    description: "Beginner fitness",
    growth_potential: "+8% Fit",
    image_url: "https://images.pexels.com/photos/4162491/pexels-photo-4162491.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    id: 11,
    title: "Educational content about environmental conservation and sustainable living practices",
    description: "Eco-conscious lifestyle",
    growth_potential: "+4% Eco",
    image_url: "https://images.pexels.com/photos/4022092/pexels-photo-4022092.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
  {
    id: 12,
    title: "Photography tips and creative editing techniques for mobile content creators",
    description: "Mobile photography",
    growth_potential: "+9% Photo",
    image_url: "https://images.pexels.com/photos/2916450/pexels-photo-2916450.jpeg?auto=compress&cs=tinysrgb&w=400",
  },
];

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
        setAllNiches(fallbackNiches);
        setLoading(false);
        return;
      }

      // If force regenerate, skip cache on backend
      console.log('[NicheRec] Calling API with country:', userCountry);
      const { data, error: funcError } = await supabase.functions.invoke('generate-niche-recommendations', {
        body: {
          interest: onboardingData.interest,
          profession: onboardingData.profession,
          country: userCountry,  // Pass user's country for Google Trends
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
      console.error('Error generating niches:', err);
      setAllNiches(fallbackNiches);
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
            {[1, 2, 3, 4, 5, 6, 7].map((step) => (
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
