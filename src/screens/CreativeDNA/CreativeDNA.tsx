import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Logo } from "../../components/ui/logo";
import { ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { useOnboarding } from "../../contexts/OnboardingContext";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { completeOnboarding } from "../../hooks/useOnboardingStatus";
import { supabase } from "../../lib/supabase";

interface CreativeStyle {
  id: string;
  name: string;
  emoji: string;
  description: string;
  descriptionId: string;
}

const creativeStyles: CreativeStyle[] = [
  {
    id: "chill-humorist",
    name: "Chill Humorist",
    emoji: "😄",
    description: "Relaxed, humorous, but still relevant",
    descriptionId: "Santai, humoris, tapi tetap relevan"
  },
  {
    id: "energetic-storyteller",
    name: "Energetic Storyteller",
    emoji: "⚡",
    description: "Enthusiastic and inspiring",
    descriptionId: "Antusias dan menginspirasi"
  },
  {
    id: "informative-expert",
    name: "Informative Expert",
    emoji: "📚",
    description: "Educational and authoritative",
    descriptionId: "Edukatif dan berwibawa"
  },
  {
    id: "authentic-relatable",
    name: "Authentic & Relatable",
    emoji: "💫",
    description: "Genuine and down-to-earth",
    descriptionId: "Autentik dan membumi"
  },
  {
    id: "bold-provocative",
    name: "Bold & Provocative",
    emoji: "🔥",
    description: "Daring and thought-provoking",
    descriptionId: "Berani dan provokatif"
  },
  {
    id: "minimalist-aesthetic",
    name: "Minimalist Aesthetic",
    emoji: "✨",
    description: "Clean and visually refined",
    descriptionId: "Bersih dan estetik"
  },
  {
    id: "motivational-coach",
    name: "Motivational Coach",
    emoji: "💪",
    description: "Uplifting and empowering",
    descriptionId: "Memotivasi dan memberdayakan"
  },
  {
    id: "quirky-creative",
    name: "Quirky Creative",
    emoji: "🎨",
    description: "Unique and unconventional",
    descriptionId: "Unik dan tidak konvensional"
  },
  {
    id: "professional-polished",
    name: "Professional & Polished",
    emoji: "👔",
    description: "Sophisticated and refined",
    descriptionId: "Profesional dan berkelas"
  },
  {
    id: "community-builder",
    name: "Community Builder",
    emoji: "🤝",
    description: "Collaborative and inclusive",
    descriptionId: "Kolaboratif dan inklusif"
  }
];

export const CreativeDNA = (): JSX.Element => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Recommendation states
  const [recommendedStyles, setRecommendedStyles] = useState<string[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [orderedStyles, setOrderedStyles] = useState<CreativeStyle[]>(creativeStyles);

  // Fetch recommendations from LLM
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoadingRecommendations(true);
        
        const niches = onboardingData.selectedNiches?.split("; ").filter(Boolean) || [];
        
        const { data, error } = await supabase.functions.invoke('recommend-styles', {
          body: {
            interest: onboardingData.interest,
            profession: onboardingData.profession,
            platforms: onboardingData.platforms,
            objectives: onboardingData.objectives,
            niches,
            language
          }
        });

        if (error) {
          console.error('Error fetching recommendations:', error);
          return;
        }

        if (data?.data?.recommended) {
          const recommended = data.data.recommended as string[];
          setRecommendedStyles(recommended);
          
          // Reorder styles: recommended first, then others
          const recommendedStyleObjects = recommended
            .map(id => creativeStyles.find(s => s.id === id))
            .filter(Boolean) as CreativeStyle[];
          
          const otherStyles = creativeStyles.filter(
            s => !recommended.includes(s.id)
          );
          
          setOrderedStyles([...recommendedStyleObjects, ...otherStyles]);
          
          console.log('Recommended styles:', recommended);
        }
      } catch (err) {
        console.error('Error fetching recommendations:', err);
      } finally {
        setLoadingRecommendations(false);
      }
    };

    fetchRecommendations();
  }, [onboardingData, language]);

  // Load saved DNA from context
  useEffect(() => {
    if (onboardingData.creativeDNA && onboardingData.creativeDNA.length > 0) {
      const styleIds = onboardingData.creativeDNA
        .map(name => creativeStyles.find(s => s.name === name)?.id)
        .filter(Boolean) as string[];
      setSelectedStyles(styleIds);
    } else if (onboardingData.creativeStyle) {
      const styleIds = onboardingData.creativeStyle
        .split(", ")
        .map(name => creativeStyles.find(s => s.name === name)?.id)
        .filter(Boolean) as string[];
      setSelectedStyles(styleIds);
    }
  }, []);

  const visibleCards = 3;
  const maxIndex = Math.max(0, orderedStyles.length - visibleCards);

  const toggleStyle = (styleId: string) => {
    setSelectedStyles((prev) => {
      if (prev.includes(styleId)) {
        return prev.filter((id) => id !== styleId);
      }
      if (prev.length < 3) {
        return [...prev, styleId];
      }
      return prev;
    });
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < maxIndex) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleContinue = async () => {
    if (selectedStyles.length === 0) {
      setError(language === 'id' 
        ? "Pilih minimal satu gaya kreatif" 
        : "Please select at least one creative style"
      );
      return;
    }

    setError(null);
    setSaving(true);

    try {
      // Get style names from IDs
      const selectedStyleNames = selectedStyles
        .map(id => creativeStyles.find(s => s.id === id)?.name)
        .filter(Boolean) as string[];

      // Update context
      updateOnboardingData({
        creativeDNA: selectedStyleNames,
        creativeStyle: selectedStyleNames.join(", ")
      });

      // Save to database and mark onboarding complete
      if (user) {
        const niches = onboardingData.selectedNiches?.split("; ").filter(Boolean) || [];
        
        await completeOnboarding(user.id, {
          interest: onboardingData.interest,
          profession: onboardingData.profession,
          platforms: onboardingData.platforms,
          objectives: onboardingData.objectives,
          selected_niches: niches,
          creative_dna: selectedStyleNames
        });
      }

      // Navigate to topic selection
      navigate("/topic-selection");
    } catch (err: any) {
      console.error("Error saving onboarding:", err);
      setError(language === 'id' 
        ? "Gagal menyimpan. Silakan coba lagi." 
        : "Failed to save. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate("/niche-recommendations");
  };

  const getSelectedStylesText = () => {
    if (selectedStyles.length === 0) return "";
    return selectedStyles
      .map(id => creativeStyles.find(s => s.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  const isRecommended = (styleId: string) => recommendedStyles.includes(styleId);

  return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center p-6">
      <div className="w-full max-w-6xl">
        <div className="mb-12">
          <div className="flex justify-center mb-6">
            <Logo />
          </div>
          <div className="flex gap-2 mb-8 justify-center max-w-md mx-auto">
            {[1, 2, 3, 4, 5, 6, 7].map((step) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  step <= 3
                    ? "bg-[#7c3aed]"
                    : "bg-[#4e5562]"
                }`}
              />
            ))}
          </div>

          <h1 className="text-3xl font-bold text-white text-center mb-3">
            <span className="mr-2">✨</span>
            {language === 'id' 
              ? 'Temukan Gaya DNA Kreatifmu' 
              : 'Discover Your Creative DNA Style'
            }
          </h1>
          <p className="text-white/60 text-center text-sm max-w-2xl mx-auto">
            {language === 'id'
              ? 'Setiap kreator punya DNA unik. Pilih dan kombinasikan hingga 3 gaya untuk menciptakan identitas konten yang benar-benar kamu.'
              : 'Every creator has unique DNA. Choose and combine up to 3 styles to create a content identity that is truly you.'
            }
            <span className="ml-1">🚀</span>
          </p>
        </div>

        {/* Loading skeleton */}
        {loadingRecommendations ? (
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="w-10 h-10" /> {/* Spacer for arrow */}
            <div className="flex gap-6 max-w-4xl">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-64 h-80 rounded-2xl border-2 border-[#2a2a3a] bg-[#1a1a24] animate-pulse"
                >
                  <div className="flex flex-col items-center justify-center h-full p-6">
                    <div className="w-32 h-32 rounded-full bg-[#2a2a3a] mb-6" />
                    <div className="h-5 w-32 bg-[#2a2a3a] rounded mb-2" />
                    <div className="h-4 w-24 bg-[#2a2a3a] rounded" />
                  </div>
                </div>
              ))}
            </div>
            <div className="w-10 h-10" /> {/* Spacer for arrow */}
          </div>
        ) : (
          <div className="relative mb-8">
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                  currentIndex === 0
                    ? "bg-white/5 text-white/20 cursor-not-allowed"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Carousel container with clip for horizontal only */}
              <div 
                className="flex-1 max-w-4xl pt-4"
                style={{ 
                  clipPath: 'inset(-20px 0px -20px 0px)',
                  overflow: 'hidden'
                }}
              >
                <div
                  className="flex gap-6 transition-transform duration-300 ease-out"
                  style={{
                    transform: `translateX(-${currentIndex * (100 / visibleCards)}%)`
                  }}
                >
                  {orderedStyles.map((style) => (
                    <div
                      key={style.id}
                      className="flex-shrink-0 relative pt-2"
                      style={{ width: `calc(${100 / visibleCards}% - ${(visibleCards - 1) * 24 / visibleCards}px)` }}
                    >
                      {/* Recommended Badge - On top of card */}
                      {isRecommended(style.id) && (
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20">
                          <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#7c3aed] to-[#ec4899] text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg shadow-purple-500/25">
                            <Sparkles className="w-3.5 h-3.5" />
                            {language === 'id' ? 'Direkomendasikan' : 'Recommended'}
                          </div>
                        </div>
                      )}
                      
                      <button
                        onClick={() => toggleStyle(style.id)}
                        disabled={!selectedStyles.includes(style.id) && selectedStyles.length >= 3}
                        className={`w-full h-80 rounded-2xl border-2 transition-all duration-200 ${
                          selectedStyles.includes(style.id)
                            ? "border-[#7c3aed] bg-[#7c3aed]/10"
                            : !selectedStyles.includes(style.id) && selectedStyles.length >= 3
                            ? "border-[#2a2a3a] bg-[#1a1a24]/50 opacity-50 cursor-not-allowed"
                            : "border-[#2a2a3a] bg-[#1a1a24] hover:border-[#7c3aed]/50"
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center h-full p-6">
                          <div className={`w-32 h-32 rounded-full mb-6 flex items-center justify-center ${
                            selectedStyles.includes(style.id)
                              ? "bg-[#b794f6]"
                              : isRecommended(style.id)
                              ? "bg-gradient-to-br from-[#b794f6] to-[#ec4899]/70"
                              : "bg-[#b794f6]/70"
                          }`}>
                            <div className="text-6xl">{style.emoji}</div>
                          </div>
                          <h3 className="text-lg font-semibold text-white mb-2">
                            {style.emoji} {style.name}
                          </h3>
                          <p className="text-sm text-white/60">
                            {language === 'id' ? style.descriptionId : style.description}
                          </p>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleNext}
                disabled={currentIndex >= maxIndex}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                  currentIndex >= maxIndex
                    ? "bg-white/5 text-white/20 cursor-not-allowed"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {selectedStyles.length > 0 && (
          <div className="text-center mb-8">
            <p className="text-white/80 text-sm">
              {language === 'id' ? 'DNA yang kamu pilih: ' : 'The DNA you choose: '}
              <span className="text-white font-medium">{getSelectedStylesText()}</span>
            </p>
          </div>
        )}

        {error && (
          <div className="text-center mb-8">
            <div className="inline-block bg-red-500/10 border border-red-500/50 rounded-xl p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button
            onClick={handleBack}
            variant="secondary"
            className="bg-white text-[#0a0a12] hover:bg-white/90 h-12 px-8 font-medium"
          >
            {language === 'id' ? 'Sebelumnya' : 'Previous'}
          </Button>
          <Button
            onClick={handleContinue}
            disabled={selectedStyles.length === 0 || saving}
            className={`h-12 px-8 font-medium ${
              selectedStyles.length === 0 || saving
                ? "bg-[#7c3aed]/50 text-white/50 cursor-not-allowed"
                : "bg-[#7c3aed] hover:bg-[#6d28d9] text-white"
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {language === 'id' ? 'Menyimpan...' : 'Saving...'}
              </>
            ) : (
              language === 'id' ? 'Selanjutnya' : 'Next'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
