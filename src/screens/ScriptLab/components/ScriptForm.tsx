import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useOnboardingStatus } from "../../../hooks/useOnboardingStatus";
import { useAuth } from "../../../contexts/AuthContext";
import { supabase } from "../../../lib/supabase";
import { getAvatarWithCache } from "../../../lib/avatarCache";
import { Sparkles, ChevronDown, ScrollText, User, Upload, X, Loader2 } from "lucide-react";
import { Button } from "../../../components/ui/button";

export interface SelectedTopic {
  id: number;
  title: string;
  description: string;
}

interface ScriptFormProps {
  onSubmit: (data: {
    prompt: string;
    inputType: "topic" | "transcript";
    model: string;
    ratio: string;
    duration: string;
    language: string;
    useDnaTone: boolean;
    characterDescription: string | null;
  }) => void;
  loading: boolean;
  selectedTopic?: SelectedTopic | null;
  onClearTopic?: () => void;
}

type InputType = "topic" | "transcript";
type AvatarOption = "none" | "profile" | "upload";

export const ScriptForm: React.FC<ScriptFormProps> = ({
  onSubmit,
  loading,
  selectedTopic,
  onClearTopic,
}) => {
  // UI language from context (for translations only)
  const { t, language: uiLang } = useLanguage();
  const { data: onboardingData } = useOnboardingStatus();
  const { user } = useAuth();

  const [prompt, setPrompt] = useState("");
  const [inputType, setInputType] = useState<InputType>("topic");
  const [model, setModel] = useState("auto");
  const [ratio, setRatio] = useState("9:16");
  const [duration, setDuration] = useState("30s");
  const [useDnaTone, setUseDnaTone] = useState(true);
  
  // Script output language - INDEPENDENT from UI language
  const [scriptLang, setScriptLang] = useState("en");

  // Avatar state - default to "profile" to use profile picture
  const [avatarOption, setAvatarOption] = useState<AvatarOption>("profile");
  const [characterDescription, setCharacterDescription] = useState<string | null>(null);
  const [profileCharacterDesc, setProfileCharacterDesc] = useState<string | null>(null);
  const [cachedAvatarUrl, setCachedAvatarUrl] = useState<string | null>(null);
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);
  const [analyzingAvatar, setAnalyzingAvatar] = useState(false);
  const [uploadedAvatarPreview, setUploadedAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarDropdownRef = useRef<HTMLDivElement>(null);

  // Check if user has DNA tone configured
  const hasDnaTone = onboardingData?.creative_dna && onboardingData.creative_dna.length > 0;

  // Load avatar and character description on mount
  // Auto-set character description if profile has one (default avatar = profile)
  useEffect(() => {
    const loadProfileData = async () => {
      if (user?.id) {
        const avatarUrl = await getAvatarWithCache(supabase, user.id);
        setCachedAvatarUrl(avatarUrl);
        
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('character_description')
          .eq('user_id', user.id)
          .single();
        
        if (profile?.character_description) {
          setProfileCharacterDesc(profile.character_description);
          // Auto-set for default "profile" avatar option
          setCharacterDescription(profile.character_description);
          setUploadedAvatarPreview(avatarUrl);
          console.log('[ScriptForm] Auto-loaded profile character description');
        } else if (avatarUrl) {
          // Has avatar but no description - will analyze on first use
          setUploadedAvatarPreview(avatarUrl);
          console.log('[ScriptForm] Profile avatar found but no character description yet');
        } else {
          // No avatar - fallback to "none"
          setAvatarOption('none');
          console.log('[ScriptForm] No profile avatar, defaulting to none');
        }
      }
    };
    loadProfileData();
  }, [user?.id]);

  // Close avatar dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (avatarDropdownRef.current && !avatarDropdownRef.current.contains(event.target as Node)) {
        setAvatarDropdownOpen(false);
      }
    };
    if (avatarDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [avatarDropdownOpen]);

  // When selectedTopic changes, populate the prompt with title + description
  useEffect(() => {
    if (selectedTopic) {
      setPrompt(`${selectedTopic.title}\n\n${selectedTopic.description}`);
      setInputType("topic");
    }
  }, [selectedTopic]);

  // Avatar handling functions
  const handleAvatarOptionSelect = async (option: AvatarOption) => {
    setAvatarDropdownOpen(false);
    
    if (option === "none") {
      setAvatarOption("none");
      setCharacterDescription(null);
      setUploadedAvatarPreview(null);
    } else if (option === "profile") {
      if (profileCharacterDesc) {
        setAvatarOption("profile");
        setCharacterDescription(profileCharacterDesc);
        setUploadedAvatarPreview(cachedAvatarUrl);
      } else if (cachedAvatarUrl) {
        setAnalyzingAvatar(true);
        try {
          const { data, error } = await supabase.functions.invoke('analyze-avatar', {
            body: { image_url: cachedAvatarUrl, user_id: user?.id, save_to_profile: true }
          });
          if (error) throw error;
          if (data?.success && data?.data?.character_description) {
            setAvatarOption("profile");
            setCharacterDescription(data.data.character_description);
            setProfileCharacterDesc(data.data.character_description);
            setUploadedAvatarPreview(cachedAvatarUrl);
          }
        } catch (err) {
          console.error('Error analyzing avatar:', err);
        } finally {
          setAnalyzingAvatar(false);
        }
      }
    } else if (option === "upload") {
      fileInputRef.current?.click();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return;

    setAnalyzingAvatar(true);
    try {
      const previewUrl = URL.createObjectURL(file);
      setUploadedAvatarPreview(previewUrl);

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const { data, error } = await supabase.functions.invoke('analyze-avatar', {
          body: { image_base64: base64, user_id: user?.id, save_to_profile: false }
        });
        if (error) throw error;
        if (data?.success && data?.data?.character_description) {
          setAvatarOption("upload");
          setCharacterDescription(data.data.character_description);
        }
        setAnalyzingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error uploading avatar:', err);
      setAnalyzingAvatar(false);
      setUploadedAvatarPreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearAvatar = () => {
    setAvatarOption("none");
    setCharacterDescription(null);
    setUploadedAvatarPreview(null);
  };

  const getAvatarDisplayName = () => {
    if (avatarOption === "none") return uiLang === 'id' ? 'Tanpa Avatar' : 'No Avatar';
    if (avatarOption === "profile") return uiLang === 'id' ? 'Profil' : 'Profile';
    if (avatarOption === "upload") return uiLang === 'id' ? 'Upload' : 'Uploaded';
    return '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    onSubmit({
      prompt: prompt.trim(),
      inputType,
      model,
      ratio,
      duration,
      language: scriptLang,
      useDnaTone: hasDnaTone && useDnaTone,
      characterDescription,
    });
  };

  const handlePromptChange = (value: string) => {
    setPrompt(value);
    if (selectedTopic && onClearTopic) {
      onClearTopic();
    }
  };

  const modelOptions = [
    { value: "auto", label: "Auto" },
    { value: "sora2", label: "SORA 2" },
    { value: "veo31", label: "VEO 3.1" },
  ];

  const ratioOptions = [
    { value: "9:16", label: "9:16" },
    { value: "16:9", label: "16:9" },
  ];

  const durationOptions = [
    { value: "30s", label: "30s" },
    { value: "60s", label: "60s" },
    { value: "90s", label: "90s" },
  ];

  const languageOptions = [
    { value: "id", label: "Indonesia" },
    { value: "en", label: "English" },
    { value: "hi", label: "हिन्दी" },
  ];

  // UI text translations based on UI language (from header)
  const uiText = {
    topic: uiLang === "id" ? "Topik" : uiLang === "hi" ? "विषय" : "Topic",
    transcript: uiLang === "id" ? "Transkrip" : uiLang === "hi" ? "ट्रांसक्रिप्ट" : "Transcript",
    topicPlaceholder: uiLang === "id"
      ? "Contoh: 5 kebiasaan pagi yang meningkatkan produktivitas..."
      : uiLang === "hi"
      ? "उदाहरण: 5 सुबह की आदतें जो उत्पादकता बढ़ाएं..."
      : "e.g., 5 Morning habits that boost productivity...",
    transcriptPlaceholder: uiLang === "id"
      ? "Tempel transkrip video atau narasi yang sudah ada..."
      : uiLang === "hi"
      ? "मौजूदा वीडियो ट्रांसक्रिप्ट या नरेशन पेस्ट करें..."
      : "Paste existing video transcript or narration...",
    characters: uiLang === "id" ? "karakter" : uiLang === "hi" ? "अक्षर" : "characters",
    generate: uiLang === "id" ? "Buat Video" : uiLang === "hi" ? "वीडियो बनाएं" : "Generate",
    scriptLanguageLabel: uiLang === "id" ? "Bahasa Script" : uiLang === "hi" ? "स्क्रिप्ट भाषा" : "Script Language",
  };

  const inputTypeOptions: { value: InputType; label: string; icon: React.ReactNode; placeholder: string }[] = [
    {
      value: "topic",
      label: uiText.topic,
      icon: <Sparkles className="w-4 h-4" />,
      placeholder: uiText.topicPlaceholder,
    },
    {
      value: "transcript",
      label: uiText.transcript,
      icon: <ScrollText className="w-4 h-4" />,
      placeholder: uiText.transcriptPlaceholder,
    },
  ];

  const currentInputType = inputTypeOptions.find((opt) => opt.value === inputType);

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="bg-card border border-border-default rounded-2xl p-3 sm:p-5 lg:p-6">
        {/* Input Type Tabs */}
        <div className="flex gap-1 mb-3 sm:mb-4 lg:mb-5 p-1 sm:p-1.5 bg-page rounded-xl">
          {inputTypeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setInputType(opt.value)}
              disabled={loading}
              className={`
                flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-4 rounded-lg text-xs sm:text-sm lg:text-base font-medium transition-all
                ${inputType === opt.value
                  ? "bg-primary text-white"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface"
                }
              `}
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Textarea / Input */}
        {inputType === "transcript" ? (
          <textarea
            value={prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder={currentInputType?.placeholder}
            className="w-full min-h-[160px] sm:min-h-[180px] lg:min-h-[200px] bg-transparent text-text-primary placeholder:text-text-muted resize-none focus:outline-none text-base sm:text-lg p-2"
            disabled={loading}
          />
        ) : (
          <textarea
            value={prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder={currentInputType?.placeholder}
            className="w-full min-h-[120px] sm:min-h-[120px] lg:min-h-[140px] bg-transparent text-text-primary placeholder:text-text-muted resize-none focus:outline-none text-base sm:text-lg lg:text-xl p-2"
            disabled={loading}
          />
        )}

        {/* Character count for transcript */}
        {inputType === "transcript" && prompt.length > 0 && (
          <div className="text-right text-text-muted text-xs mb-2">
            {prompt.length} {uiText.characters}
          </div>
        )}

        {/* Settings Row - Responsive layout */}
        <div className="pt-4 border-t border-border-default">
          {/* Hidden file input for avatar upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          {/* Dropdowns - 5 columns */}
          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            {/* Model Dropdown */}
            <div className="relative">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={loading}
                className="w-full appearance-none bg-surface border border-border-default rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 pr-6 sm:pr-8 text-text-primary text-xs sm:text-sm lg:text-base focus:outline-none focus:border-primary cursor-pointer truncate"
              >
                {modelOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-text-secondary pointer-events-none" />
            </div>

            {/* Ratio Dropdown */}
            <div className="relative">
              <select
                value={ratio}
                onChange={(e) => setRatio(e.target.value)}
                disabled={loading}
                className="w-full appearance-none bg-surface border border-border-default rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 pr-6 sm:pr-8 text-text-primary text-xs sm:text-sm lg:text-base focus:outline-none focus:border-primary cursor-pointer truncate"
              >
                {ratioOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-text-secondary pointer-events-none" />
            </div>

            {/* Duration Dropdown */}
            <div className="relative">
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                disabled={loading}
                className="w-full appearance-none bg-surface border border-border-default rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 pr-6 sm:pr-8 text-text-primary text-xs sm:text-sm lg:text-base focus:outline-none focus:border-primary cursor-pointer truncate"
              >
                {durationOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-text-secondary pointer-events-none" />
            </div>

            {/* Script Output Language - Independent from UI language */}
            <div className="relative">
              <select
                value={scriptLang}
                onChange={(e) => setScriptLang(e.target.value)}
                disabled={loading}
                title={uiText.scriptLanguageLabel}
                className="w-full appearance-none bg-surface border border-border-default rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 pr-6 sm:pr-8 text-text-primary text-xs sm:text-sm lg:text-base focus:outline-none focus:border-primary cursor-pointer truncate"
              >
                {languageOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-text-secondary pointer-events-none" />
            </div>

            {/* Avatar Dropdown */}
            <div className="relative" ref={avatarDropdownRef}>
              <button
                type="button"
                onClick={() => setAvatarDropdownOpen(!avatarDropdownOpen)}
                disabled={loading || analyzingAvatar}
                className="w-full flex items-center justify-between gap-1 bg-surface border border-border-default rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 text-text-primary text-xs sm:text-sm lg:text-base focus:outline-none focus:border-primary cursor-pointer"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {analyzingAvatar ? (
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-primary" />
                  ) : uploadedAvatarPreview && avatarOption !== 'none' ? (
                    <img src={uploadedAvatarPreview} alt="" className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover" />
                  ) : (
                    <User className="w-3 h-3 sm:w-4 sm:h-4 text-text-secondary" />
                  )}
                  <span className="truncate text-xs sm:text-sm">
                    {analyzingAvatar ? '...' : (avatarOption === 'none' ? 'Avatar' : getAvatarDisplayName())}
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-text-secondary flex-shrink-0" />
              </button>

              {/* Avatar Dropdown Menu */}
              {avatarDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border-default rounded-lg shadow-lg z-50 overflow-hidden">
                  {/* No Avatar */}
                  <button
                    type="button"
                    onClick={() => handleAvatarOptionSelect('none')}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs sm:text-sm hover:bg-page transition-colors ${
                      avatarOption === 'none' ? 'bg-primary/20 text-primary' : 'text-text-secondary'
                    }`}
                  >
                    <X className="w-4 h-4" />
                    <span>{uiLang === 'id' ? 'Tanpa Avatar' : 'No Avatar'}</span>
                  </button>

                  {/* Use Profile Avatar */}
                  {cachedAvatarUrl && (
                    <button
                      type="button"
                      onClick={() => handleAvatarOptionSelect('profile')}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs sm:text-sm hover:bg-page transition-colors ${
                        avatarOption === 'profile' ? 'bg-primary/20 text-primary' : 'text-text-secondary'
                      }`}
                    >
                      <img src={cachedAvatarUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
                      <span>{uiLang === 'id' ? 'Gunakan Profil' : 'Use Profile'}</span>
                      {profileCharacterDesc && <span className="text-green-400 text-xs">✓</span>}
                    </button>
                  )}

                  {/* Upload New */}
                  <button
                    type="button"
                    onClick={() => handleAvatarOptionSelect('upload')}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs sm:text-sm hover:bg-page transition-colors ${
                      avatarOption === 'upload' ? 'bg-primary/20 text-primary' : 'text-text-secondary'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    <span>{uiLang === 'id' ? 'Upload Baru' : 'Upload New'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Row: DNA Toggle + Submit Button */}
          <div className="flex items-center justify-between gap-3 mt-3 sm:mt-4">
            {/* DNA Tone Toggle */}
            {hasDnaTone ? (
              <label className="flex items-center gap-2 sm:gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={useDnaTone}
                    onChange={(e) => setUseDnaTone(e.target.checked)}
                    disabled={loading}
                    className="sr-only"
                  />
                  <div
                    className={`w-9 h-5 sm:w-11 sm:h-6 rounded-full transition-colors ${
                      useDnaTone ? "bg-primary" : "bg-surface"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 sm:top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                        useDnaTone ? "translate-x-4 sm:translate-x-5" : "translate-x-0.5 sm:translate-x-1"
                      }`}
                    />
                  </div>
                </div>
                <span className="text-text-primary text-xs sm:text-sm lg:text-base">DNA</span>
              </label>
            ) : (
              <div />
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="bg-primary hover:bg-primary-hover text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg flex items-center gap-2 text-sm sm:text-base"
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{loading ? "..." : uiText.generate}</span>
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};
