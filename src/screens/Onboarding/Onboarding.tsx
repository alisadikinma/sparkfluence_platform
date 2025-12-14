import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Logo } from "../../components/ui/logo";
import { useOnboarding } from "../../contexts/OnboardingContext";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { supabase } from "../../lib/supabase";
import { Loader2, Camera, User, ArrowRight, ArrowLeft, Check } from "lucide-react";

interface LookupItem {
  id: string;
  name: string;
  category: string;
}

type OnboardingStep = "profile" | "preferences";

export const Onboarding = (): JSX.Element => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  
  // Current step
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("profile");
  
  // Profile step state
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Options from database
  const [interests, setInterests] = useState<LookupItem[]>([]);
  const [professions, setProfessions] = useState<LookupItem[]>([]);
  const [platforms, setPlatforms] = useState<LookupItem[]>([]);
  const [objectives, setObjectives] = useState<LookupItem[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // User selections (preferences step)
  const [selectedInterest, setSelectedInterest] = useState<string>("");
  const [customInterest, setCustomInterest] = useState("");
  const [profession, setProfession] = useState("");
  const [customProfession, setCustomProfession] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Text based on language
  const text = {
    step1Title: language === 'id' ? 'Siapkan Profil Kamu' : 'Set Up Your Profile',
    step1Subtitle: language === 'id' ? 'Beri tahu kami siapa kamu untuk pengalaman yang lebih personal' : 'Let us know who you are for a more personal experience',
    displayNameLabel: language === 'id' ? 'Nama Tampilan' : 'Display Name',
    displayNamePlaceholder: language === 'id' ? 'Nama yang akan ditampilkan...' : 'Name to be displayed...',
    displayNameHint: language === 'id' ? 'Ini akan digunakan untuk sapaan di dashboard' : 'This will be used for greetings on dashboard',
    photoLabel: language === 'id' ? 'Foto Profil' : 'Profile Photo',
    photoHint: language === 'id' ? 'Opsional - bisa diubah nanti di Settings' : 'Optional - can be changed later in Settings',
    uploadPhoto: language === 'id' ? 'Upload Foto' : 'Upload Photo',
    changePhoto: language === 'id' ? 'Ganti Foto' : 'Change Photo',
    step2Title: language === 'id' ? 'Kenali Kamu Lebih Dekat' : 'Get to Know You Better',
    step2Subtitle: language === 'id' ? 'Semakin detail, semakin akurat rekomendasi niche-nya ✨' : 'The more detailed, the more accurate the niche recommendations ✨',
    interestLabel: language === 'id' ? 'Minat' : 'Interest',
    interestHint: language === 'id' ? 'Pilih satu yang paling sesuai dengan minatmu.' : 'Select one option that best matches your interest.',
    professionLabel: language === 'id' ? 'Profesi' : 'Profession',
    professionPlaceholder: language === 'id' ? 'Pilih profesi' : 'Choose profession',
    customInterestLabel: language === 'id' ? 'Minat Lainnya' : 'Your Other Interest',
    customInterestPlaceholder: language === 'id' ? 'Masukkan minatmu...' : 'Enter your interest...',
    customProfessionLabel: language === 'id' ? 'Profesi Lainnya' : 'Your Other Profession',
    customProfessionPlaceholder: language === 'id' ? 'Masukkan profesimu...' : 'Enter your profession...',
    platformLabel: language === 'id' ? 'Platform Utama' : 'Main Platform',
    objectiveLabel: language === 'id' ? 'Tujuan' : 'Objective',
    previous: language === 'id' ? 'Sebelumnya' : 'Previous',
    next: language === 'id' ? 'Lanjut' : 'Next',
    nameRequired: language === 'id' ? 'Nama tampilan wajib diisi' : 'Display name is required',
  };

  // Load user data on mount
  useEffect(() => {
    if (user) {
      // Pre-fill name from user metadata if available
      const existingName = user.user_metadata?.full_name || user.email?.split('@')[0] || "";
      setDisplayName(existingName);
      
      // Check if user already has profile data
      fetchExistingProfile();
    }
  }, [user]);

  const fetchExistingProfile = async () => {
    if (!user) return;
    
    try {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("full_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (profile) {
        if (profile.full_name) setDisplayName(profile.full_name);
        if (profile.avatar_url) {
          setAvatarUrl(profile.avatar_url);
          setAvatarPreview(profile.avatar_url);
        }
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  // Check if profile step is valid
  const isProfileValid = displayName.trim().length >= 2;

  // Check if preferences step is valid
  const isPreferencesValid = (() => {
    const hasValidInterest = selectedInterest && 
      (selectedInterest !== "Others" || customInterest.trim());
    const hasValidProfession = profession && 
      (profession !== "Other" || customProfession.trim());
    const hasValidPlatform = selectedPlatforms.length > 0;
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
      const { data, error } = await supabase
        .from("lookup_master")
        .select("id, name, category")
        .in("category", ["interest", "profession", "platform", "objective"])
        .order("name");

      if (error) throw error;

      if (data) {
        const interestItems = data.filter(item => item.category === "interest");
        const sortedInterests = interestItems.sort((a, b) => {
          if (a.name === "Others") return 1;
          if (b.name === "Others") return -1;
          return a.name.localeCompare(b.name);
        });
        setInterests(sortedInterests);
        
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
      // Fallback to default options
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

  // Handle avatar file selection
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError(language === 'id' ? "Ukuran file maksimal 5MB" : "Maximum file size is 5MB");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setError(null);
  };

  // Upload avatar to Supabase
  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return avatarUrl || null;

    setUploadingAvatar(true);
    try {
      const fileExt = avatarFile.name.split(".").pop();
      const avatarFileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(avatarFileName, avatarFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(avatarFileName);

      return urlData.publicUrl;
    } catch (err) {
      console.error("Error uploading avatar:", err);
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Platform icon component
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

  // Handle profile step completion
  const handleProfileNext = async () => {
    if (!isProfileValid) {
      setError(text.nameRequired);
      return;
    }

    setError(null);

    // Upload avatar if selected
    let finalAvatarUrl = avatarUrl;
    if (avatarFile) {
      const uploadedUrl = await uploadAvatar();
      if (uploadedUrl) {
        finalAvatarUrl = uploadedUrl;
      }
    }

    // Save profile to database
    if (user) {
      try {
        await supabase
          .from("user_profiles")
          .upsert({
            user_id: user.id,
            full_name: displayName.trim(),
            avatar_url: finalAvatarUrl,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        // Also update auth user metadata
        await supabase.auth.updateUser({
          data: { full_name: displayName.trim() }
        });
      } catch (err) {
        console.error("Error saving profile:", err);
      }
    }

    // Move to preferences step
    setCurrentStep("preferences");
  };

  // Handle preferences step completion (final)
  const handlePreferencesNext = () => {
    if (!isPreferencesValid) return;

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
    if (currentStep === "preferences") {
      setCurrentStep("profile");
    } else {
      navigate("/welcome");
    }
  };

  // Loading state
  if (loadingOptions) {
    return (
      <div className="w-full min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#7c3aed] animate-spin" />
      </div>
    );
  }

  const stepNumber = currentStep === "profile" ? 1 : 2;

  return (
    <div className="w-full min-h-screen bg-[#0a0a12] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[600px]">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-center mb-6">
            <Logo />
          </div>
          
          {/* Step Progress */}
          <div className="flex gap-2 mb-8 max-w-md mx-auto">
            {[1, 2, 3, 4, 5, 6, 7].map((step) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  step <= stepNumber
                    ? "bg-[#7c3aed]"
                    : "bg-[#4e5562]"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Profile Setup */}
        {currentStep === "profile" && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                <span className="text-2xl">👋</span>
                {text.step1Title}
              </h1>
              <p className="text-white/60 text-sm">
                {text.step1Subtitle}
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative w-28 h-28 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ec4899] flex items-center justify-center cursor-pointer group overflow-hidden"
              >
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-white" />
                )}
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarSelect}
              />
              
              <div className="text-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[#7c3aed] hover:text-[#6d28d9] text-sm font-medium transition-colors"
                >
                  {avatarPreview ? text.changePhoto : text.uploadPhoto}
                </button>
                <p className="text-white/40 text-xs mt-1">{text.photoHint}</p>
              </div>
            </div>

            {/* Display Name Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white block">
                {text.displayNameLabel} <span className="text-red-400">*</span>
              </label>
              <Input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={text.displayNamePlaceholder}
                className="w-full h-12 px-4 bg-[#1a1a24] border border-[#4e5562] rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent"
                maxLength={50}
              />
              <p className="text-white/40 text-xs">{text.displayNameHint}</p>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6">
              <Button
                onClick={handlePrevious}
                variant="secondary"
                className="bg-white text-[#0a0a12] hover:bg-white/90 h-12 px-8 font-medium"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {text.previous}
              </Button>
              <Button
                onClick={handleProfileNext}
                disabled={!isProfileValid || uploadingAvatar}
                className={`h-12 px-8 font-medium transition-all ${
                  isProfileValid && !uploadingAvatar
                    ? "bg-[#7c3aed] hover:bg-[#6d28d9] text-white"
                    : "bg-[#7c3aed]/50 text-white/50 cursor-not-allowed"
                }`}
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {text.next}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Preferences */}
        {currentStep === "preferences" && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                <span className="text-2xl">✨</span>
                {text.step2Title}
              </h1>
              <p className="text-white/60 text-sm">
                {text.step2Subtitle}
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
                  {text.interestLabel}
                </label>
                <p className="text-xs text-white/50 mb-3">
                  {text.interestHint}
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

              {/* Custom Interest */}
              {selectedInterest === "Others" && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-sm font-medium text-white mb-3 block">
                    {text.customInterestLabel}
                  </label>
                  <input
                    type="text"
                    value={customInterest}
                    onChange={(e) => setCustomInterest(e.target.value)}
                    placeholder={text.customInterestPlaceholder}
                    className="w-full h-12 px-4 bg-[#1a1a24] border border-[#4e5562] rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent"
                    autoFocus
                  />
                </div>
              )}

              {/* Profession Selection */}
              <div>
                <label className="text-sm font-medium text-white mb-3 block">
                  {text.professionLabel}
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
                    <option value="">{text.professionPlaceholder}</option>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Custom Profession */}
              {profession === "Other" && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-sm font-medium text-white mb-3 block">
                    {text.customProfessionLabel}
                  </label>
                  <input
                    type="text"
                    value={customProfession}
                    onChange={(e) => setCustomProfession(e.target.value)}
                    placeholder={text.customProfessionPlaceholder}
                    className="w-full h-12 px-4 bg-[#1a1a24] border border-[#4e5562] rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent"
                    autoFocus
                  />
                </div>
              )}

              {/* Platform Selection */}
              <div>
                <label className="text-sm font-medium text-white mb-3 block">
                  {text.platformLabel}
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
                  {text.objectiveLabel}
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

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6">
              <Button
                onClick={handlePrevious}
                variant="secondary"
                className="bg-white text-[#0a0a12] hover:bg-white/90 h-12 px-8 font-medium"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {text.previous}
              </Button>
              <Button
                onClick={handlePreferencesNext}
                disabled={!isPreferencesValid}
                className={`h-12 px-8 font-medium transition-all ${
                  isPreferencesValid
                    ? "bg-[#7c3aed] hover:bg-[#6d28d9] text-white"
                    : "bg-[#7c3aed]/50 text-white/50 cursor-not-allowed"
                }`}
              >
                {text.next}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
