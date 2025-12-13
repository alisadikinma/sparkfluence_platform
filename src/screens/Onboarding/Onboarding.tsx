import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Logo } from "../../components/ui/logo";
import { useOnboarding } from "../../contexts/OnboardingContext";
import { supabase } from "../../lib/supabase";
import { Loader2 } from "lucide-react";

interface LookupItem {
  id: string;
  name: string;
  category: string;
}

export const Onboarding = (): JSX.Element => {
  const navigate = useNavigate();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  
  // Options from database
  const [interests, setInterests] = useState<LookupItem[]>([]);
  const [professions, setProfessions] = useState<LookupItem[]>([]);
  const [platforms, setPlatforms] = useState<LookupItem[]>([]);
  const [objectives, setObjectives] = useState<LookupItem[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // User selections
  const [selectedInterest, setSelectedInterest] = useState<string>("");
  const [customInterest, setCustomInterest] = useState("");
  const [profession, setProfession] = useState("");
  const [customProfession, setCustomProfession] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Check if form is valid for Next button
  const isFormValid = (() => {
    // Interest validation
    const hasValidInterest = selectedInterest && 
      (selectedInterest !== "Others" || customInterest.trim());
    
    // Profession validation
    const hasValidProfession = profession && 
      (profession !== "Other" || customProfession.trim());
    
    // Platform validation
    const hasValidPlatform = selectedPlatforms.length > 0;
    
    // Objective validation
    const hasValidObjective = selectedObjectives.length > 0;
    
    return hasValidInterest && hasValidProfession && hasValidPlatform && hasValidObjective;
  })();

  // Fetch options from database on mount
  useEffect(() => {
    fetchOnboardingOptions();
  }, []);

  // Load saved data after options loaded
  useEffect(() => {
    if (!loadingOptions && onboardingData.interest) {
      const isPredefinedInterest = interests.some(i => i.name === onboardingData.interest);
      if (isPredefinedInterest) {
        setSelectedInterest(onboardingData.interest);
      } else if (onboardingData.interest) {
        setSelectedInterest("Others");
        setCustomInterest(onboardingData.interest);
      }
    }
    if (!loadingOptions && onboardingData.profession) {
      const isPredefinedProfession = professions.some(p => p.name === onboardingData.profession);
      if (isPredefinedProfession) {
        setProfession(onboardingData.profession);
      } else {
        setProfession("Other");
        setCustomProfession(onboardingData.profession);
      }
    }
    if (onboardingData.platforms.length > 0) {
      setSelectedPlatforms(onboardingData.platforms);
    }
    if (onboardingData.objectives.length > 0) {
      setSelectedObjectives(onboardingData.objectives);
    }
  }, [loadingOptions, interests, professions, onboardingData]);

  const fetchOnboardingOptions = async () => {
    setLoadingOptions(true);
    try {
      // Fetch all from lookup_master
      const { data, error } = await supabase
        .from("lookup_master")
        .select("id, name, category")
        .in("category", ["interest", "profession", "platform", "objective"])
        .order("name");

      if (error) throw error;

      if (data) {
        // Sort interests: Others always last
        const interestItems = data.filter(item => item.category === "interest");
        const sortedInterests = interestItems.sort((a, b) => {
          if (a.name === "Others") return 1;
          if (b.name === "Others") return -1;
          return a.name.localeCompare(b.name);
        });
        setInterests(sortedInterests);
        
        // Sort professions: Other always last
        const professionItems = data.filter(item => item.category === "profession");
        const sortedProfessions = professionItems.sort((a, b) => {
          if (a.name === "Other") return 1;
          if (b.name === "Other") return -1;
          return a.name.localeCompare(b.name);
        });
        setProfessions(sortedProfessions);
        
        setPlatforms(data.filter(item => item.category === "platform"));
        setObjectives(data.filter(item => item.category === "objective"));
      }
    } catch (err) {
      console.error("Error fetching onboarding options:", err);
      // Fallback to default options if database fetch fails
      setInterests([
        { id: "1", name: "Entertainment", category: "interest" },
        { id: "2", name: "Travel", category: "interest" },
        { id: "3", name: "Music", category: "interest" },
        { id: "4", name: "Game", category: "interest" },
        { id: "5", name: "Education", category: "interest" },
        { id: "6", name: "Technology", category: "interest" },
        { id: "7", name: "Fashion", category: "interest" },
        { id: "8", name: "Motivation", category: "interest" },
        { id: "9", name: "Finance", category: "interest" },
        { id: "10", name: "Health", category: "interest" },
        { id: "11", name: "Culinary", category: "interest" },
        { id: "12", name: "Design", category: "interest" },
        { id: "99", name: "Others", category: "interest" },
      ]);
      setProfessions([
        { id: "1", name: "Content Creator", category: "profession" },
        { id: "2", name: "Influencer", category: "profession" },
        { id: "3", name: "Marketer", category: "profession" },
        { id: "4", name: "Entrepreneur", category: "profession" },
        { id: "5", name: "Student", category: "profession" },
        { id: "99", name: "Other", category: "profession" },
      ]);
      setPlatforms([
        { id: "1", name: "TikTok", category: "platform" },
        { id: "2", name: "Instagram", category: "platform" },
        { id: "3", name: "Youtube", category: "platform" },
      ]);
      setObjectives([
        { id: "1", name: "Growth", category: "objective" },
        { id: "2", name: "Monetize", category: "objective" },
        { id: "3", name: "Consistency", category: "objective" },
      ]);
    } finally {
      setLoadingOptions(false);
    }
  };

  // Platform icon component with inline SVGs
  const PlatformIcon = ({ platformName }: { platformName: string }) => {
    switch (platformName.toLowerCase()) {
      case "tiktok":
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
          </svg>
        );
      case "instagram":
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        );
      case "youtube":
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const toggleInterest = (interest: string) => {
    if (selectedInterest === interest) {
      setSelectedInterest("");
      setCustomInterest("");
    } else {
      setSelectedInterest(interest);
      if (interest !== "Others") {
        setCustomInterest("");
      }
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const toggleObjective = (objective: string) => {
    setSelectedObjectives((prev) =>
      prev.includes(objective)
        ? prev.filter((o) => o !== objective)
        : [...prev, objective]
    );
  };

  const handleNext = () => {
    if (!isFormValid) return;

    // Determine final interest value
    let finalInterest = selectedInterest;
    if (selectedInterest === "Others") {
      finalInterest = customInterest.trim();
    }

    setError(null);

    updateOnboardingData({
      interest: finalInterest,
      profession: profession === "Other" ? customProfession : profession,
      platforms: selectedPlatforms,
      objectives: selectedObjectives
    });

    navigate("/niche-recommendations");
  };

  const handlePrevious = () => {
    navigate("/welcome");
  };

  // Loading state
  if (loadingOptions) {
    return (
      <div className="w-full min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#7c3aed] animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#0a0a12] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[600px]">
        <div className="mb-8">
          <div className="flex justify-center mb-6">
            <Logo />
          </div>
          <div className="flex gap-2 mb-8 max-w-md mx-auto">
            {[1, 2, 3, 4, 5, 6, 7].map((step) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  step === 1
                    ? "bg-[#7c3aed]"
                    : "bg-[#4e5562]"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
              <span className="text-2xl">✨</span>
              Get to Know You Better
            </h1>
            <p className="text-white/60 text-sm">
              The more detailed, the more accurate the niche recommendations ✨
            </p>
            {error && (
              <div className="mt-4 bg-red-500/10 border border-red-500/50 rounded-xl p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Interest Selection */}
            <div>
              <label className="text-sm font-medium text-white mb-3 block">
                Interest
              </label>
              <p className="text-xs text-white/50 mb-3">
                Select one option that best matches your interest.
              </p>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <button
                    key={interest.id}
                    onClick={() => toggleInterest(interest.name)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      selectedInterest === interest.name
                        ? "bg-[#7c3aed] text-white border border-[#7c3aed]"
                        : "bg-transparent text-white/70 border border-[#4e5562] hover:border-[#7c3aed]/50"
                    }`}
                  >
                    {interest.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Interest - Only show when "Others" is selected */}
            {selectedInterest === "Others" && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-sm font-medium text-white mb-3 block">
                  Your Other Interest
                </label>
                <input
                  type="text"
                  value={customInterest}
                  onChange={(e) => setCustomInterest(e.target.value)}
                  placeholder="Enter your interest..."
                  className="w-full h-12 px-4 bg-[#1a1a24] border border-[#4e5562] rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent"
                  autoFocus
                />
              </div>
            )}

            {/* Profession Selection */}
            <div>
              <label className="text-sm font-medium text-white mb-3 block">
                Profession
              </label>
              <div className="relative">
                <select
                  value={profession}
                  onChange={(e) => {
                    setProfession(e.target.value);
                    if (e.target.value !== "Other") {
                      setCustomProfession("");
                    }
                  }}
                  className="w-full h-12 px-4 bg-[#1a1a24] border border-[#4e5562] rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent"
                >
                  <option value="">Choose profession</option>
                  {professions.map((prof) => (
                    <option key={prof.id} value={prof.name}>
                      {prof.name}
                    </option>
                  ))}
                </select>
                <svg
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>

            {/* Custom Profession - Only show when "Other" is selected */}
            {profession === "Other" && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-sm font-medium text-white mb-3 block">
                  Your Other Profession
                </label>
                <input
                  type="text"
                  value={customProfession}
                  onChange={(e) => setCustomProfession(e.target.value)}
                  placeholder="Enter your profession..."
                  className="w-full h-12 px-4 bg-[#1a1a24] border border-[#4e5562] rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent"
                  autoFocus
                />
              </div>
            )}

            {/* Platform Selection */}
            <div>
              <label className="text-sm font-medium text-white mb-3 block">
                Main Platform
              </label>
              <div className="flex gap-3">
                {platforms.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => togglePlatform(platform.name)}
                    className={`flex-1 h-12 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-all duration-200 ${
                      selectedPlatforms.includes(platform.name)
                        ? "bg-[#7c3aed] text-white border-2 border-[#7c3aed]"
                        : "bg-[#1a1a24] text-white/70 border border-[#4e5562] hover:border-[#7c3aed]/50"
                    }`}
                  >
                    <PlatformIcon platformName={platform.name} />
                    <span>{platform.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Objective Selection */}
            <div>
              <label className="text-sm font-medium text-white mb-3 block">
                Objective
              </label>
              <div className="flex gap-3">
                {objectives.map((objective) => (
                  <button
                    key={objective.id}
                    onClick={() => toggleObjective(objective.name)}
                    className={`flex-1 h-12 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedObjectives.includes(objective.name)
                        ? "bg-[#7c3aed] text-white border-2 border-[#7c3aed]"
                        : "bg-[#1a1a24] text-white/70 border border-[#4e5562] hover:border-[#7c3aed]/50"
                    }`}
                  >
                    {objective.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6">
            <Button
              onClick={handlePrevious}
              variant="secondary"
              className="bg-white text-[#0a0a12] hover:bg-white/90 h-12 px-8 font-medium"
            >
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={!isFormValid}
              className={`h-12 px-8 font-medium transition-all ${
                isFormValid
                  ? "bg-[#7c3aed] hover:bg-[#6d28d9] text-white"
                  : "bg-[#7c3aed]/50 text-white/50 cursor-not-allowed"
              }`}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
