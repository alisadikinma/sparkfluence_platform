import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useOnboardingStatus } from "../../../hooks/useOnboardingStatus";
import { useAuth } from "../../../contexts/AuthContext";
import { supabase } from "../../../lib/supabase";
import { getAvatarWithCache } from "../../../lib/avatarCache";
import { Sparkles, ChevronDown, ScrollText, User, Upload, X, Loader2, Trash2, Edit2, Check } from "lucide-react";
import { Button } from "../../../components/ui/button";

export interface SelectedTopic {
  id: number;
  title: string;
  description: string;
}

interface SavedAvatar {
  id: string;
  name: string;
  avatar_url: string;
  character_description: string | null;
  is_default: boolean;
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
type AvatarOption = "none" | "profile" | "saved" | "upload";

export const ScriptForm: React.FC<ScriptFormProps> = ({
  onSubmit,
  loading,
  selectedTopic,
  onClearTopic,
}) => {
  const { t, language: uiLang } = useLanguage();
  const { data: onboardingData } = useOnboardingStatus();
  const { user } = useAuth();

  const [prompt, setPrompt] = useState("");
  const [inputType, setInputType] = useState<InputType>("topic");
  const [model, setModel] = useState("auto");
  const [ratio, setRatio] = useState("9:16");
  const [duration, setDuration] = useState("30s");
  const [useDnaTone, setUseDnaTone] = useState(true);
  const [scriptLang, setScriptLang] = useState("en");

  // Avatar state
  const [avatarOption, setAvatarOption] = useState<AvatarOption>("profile");
  const [characterDescription, setCharacterDescription] = useState<string | null>(null);
  const [profileCharacterDesc, setProfileCharacterDesc] = useState<string | null>(null);
  const [cachedAvatarUrl, setCachedAvatarUrl] = useState<string | null>(null);
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);
  const [analyzingAvatar, setAnalyzingAvatar] = useState(false);
  const [uploadedAvatarPreview, setUploadedAvatarPreview] = useState<string | null>(null);
  
  // Saved avatars
  const [savedAvatars, setSavedAvatars] = useState<SavedAvatar[]>([]);
  const [selectedSavedAvatar, setSelectedSavedAvatar] = useState<SavedAvatar | null>(null);
  const [loadingAvatars, setLoadingAvatars] = useState(false);
  
  // Upload modal state
  const [showNameModal, setShowNameModal] = useState(false);
  const [newAvatarName, setNewAvatarName] = useState("");
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  
  // Edit name state
  const [editingAvatarId, setEditingAvatarId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarDropdownRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const hasDnaTone = onboardingData?.creative_dna && onboardingData.creative_dna.length > 0;

  // Load profile data and saved avatars on mount
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      
      setLoadingAvatars(true);
      
      try {
        // Load profile avatar
        const avatarUrl = await getAvatarWithCache(supabase, user.id);
        setCachedAvatarUrl(avatarUrl);
        
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('character_description')
          .eq('user_id', user.id)
          .single();
        
        if (profile?.character_description) {
          setProfileCharacterDesc(profile.character_description);
          setCharacterDescription(profile.character_description);
          setUploadedAvatarPreview(avatarUrl);
        } else if (avatarUrl) {
          setUploadedAvatarPreview(avatarUrl);
        } else {
          setAvatarOption('none');
        }
        
        // Load saved avatars
        const { data: avatars, error } = await supabase
          .from('user_avatars')
          .select('id, name, avatar_url, character_description, is_default')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (!error && avatars) {
          setSavedAvatars(avatars);
          
          // If there's a default saved avatar, use it
          const defaultAvatar = avatars.find(a => a.is_default);
          if (defaultAvatar) {
            setAvatarOption('saved');
            setSelectedSavedAvatar(defaultAvatar);
            setCharacterDescription(defaultAvatar.character_description);
            setUploadedAvatarPreview(defaultAvatar.avatar_url);
          }
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoadingAvatars(false);
      }
    };
    
    loadData();
  }, [user?.id]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (avatarDropdownRef.current && !avatarDropdownRef.current.contains(event.target as Node)) {
        setAvatarDropdownOpen(false);
        setEditingAvatarId(null);
      }
    };
    if (avatarDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [avatarDropdownOpen]);

  // Focus name input when modal opens
  useEffect(() => {
    if (showNameModal && nameInputRef.current) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [showNameModal]);

  useEffect(() => {
    if (selectedTopic) {
      setPrompt(`${selectedTopic.title}\n\n${selectedTopic.description}`);
      setInputType("topic");
    }
  }, [selectedTopic]);

  // Handle avatar option selection
  const handleAvatarOptionSelect = async (option: AvatarOption, savedAvatar?: SavedAvatar) => {
    if (option === "none") {
      setAvatarOption("none");
      setCharacterDescription(null);
      setUploadedAvatarPreview(null);
      setSelectedSavedAvatar(null);
      setAvatarDropdownOpen(false);
    } else if (option === "profile") {
      if (profileCharacterDesc) {
        setAvatarOption("profile");
        setCharacterDescription(profileCharacterDesc);
        setUploadedAvatarPreview(cachedAvatarUrl);
        setSelectedSavedAvatar(null);
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
            setSelectedSavedAvatar(null);
          }
        } catch (err) {
          console.error('Error analyzing avatar:', err);
        } finally {
          setAnalyzingAvatar(false);
        }
      }
      setAvatarDropdownOpen(false);
    } else if (option === "saved" && savedAvatar) {
      setAvatarOption("saved");
      setSelectedSavedAvatar(savedAvatar);
      setCharacterDescription(savedAvatar.character_description);
      setUploadedAvatarPreview(savedAvatar.avatar_url);
      setAvatarDropdownOpen(false);
    } else if (option === "upload") {
      fileInputRef.current?.click();
    }
  };

  // Handle file selection - show name modal first
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return;
    
    setPendingUploadFile(file);
    setNewAvatarName(`Avatar ${savedAvatars.length + 1}`);
    setShowNameModal(true);
    setAvatarDropdownOpen(false);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Save avatar to storage and database
  const handleSaveAvatar = async () => {
    if (!pendingUploadFile || !user?.id || !newAvatarName.trim()) return;
    
    setSavingAvatar(true);
    setAnalyzingAvatar(true);
    
    try {
      // 1. Upload to storage
      const fileExt = pendingUploadFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, pendingUploadFile, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        // Try creating bucket if it doesn't exist
        if (uploadError.message.includes('Bucket not found')) {
          console.log('Creating avatars bucket...');
          // Bucket needs to be created in Supabase dashboard
          throw new Error(uiLang === 'id' ? 'Bucket storage belum dibuat. Hubungi admin.' : 'Storage bucket not created. Contact admin.');
        }
        throw uploadError;
      }
      
      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      const avatarUrl = urlData.publicUrl;
      
      // 3. Analyze avatar
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(pendingUploadFile);
      });
      const base64 = await base64Promise;
      
      const { data: analyzeData, error: analyzeError } = await supabase.functions.invoke('analyze-avatar', {
        body: { image_base64: base64, user_id: user.id, save_to_profile: false }
      });
      
      const charDescription = analyzeData?.data?.character_description || null;
      
      // 4. Save to database
      const { data: savedData, error: dbError } = await supabase
        .from('user_avatars')
        .insert({
          user_id: user.id,
          name: newAvatarName.trim(),
          storage_path: fileName,
          avatar_url: avatarUrl,
          character_description: charDescription,
          is_default: savedAvatars.length === 0 // First avatar is default
        })
        .select()
        .single();
      
      if (dbError) throw dbError;
      
      // 5. Update local state
      const newAvatar: SavedAvatar = {
        id: savedData.id,
        name: savedData.name,
        avatar_url: savedData.avatar_url,
        character_description: savedData.character_description,
        is_default: savedData.is_default
      };
      
      setSavedAvatars(prev => [newAvatar, ...prev]);
      setAvatarOption("saved");
      setSelectedSavedAvatar(newAvatar);
      setCharacterDescription(charDescription);
      setUploadedAvatarPreview(avatarUrl);
      
      // Close modal
      setShowNameModal(false);
      setPendingUploadFile(null);
      setNewAvatarName("");
      
    } catch (err: any) {
      console.error('Error saving avatar:', err);
      alert(err.message || 'Failed to save avatar');
    } finally {
      setSavingAvatar(false);
      setAnalyzingAvatar(false);
    }
  };

  // Delete saved avatar
  const handleDeleteAvatar = async (avatarId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(uiLang === 'id' ? 'Hapus avatar ini?' : 'Delete this avatar?')) return;
    
    const avatar = savedAvatars.find(a => a.id === avatarId);
    if (!avatar) return;
    
    try {
      // Delete from storage
      const storagePath = avatar.avatar_url.split('/avatars/')[1];
      if (storagePath) {
        await supabase.storage.from('avatars').remove([storagePath]);
      }
      
      // Delete from database
      await supabase.from('user_avatars').delete().eq('id', avatarId);
      
      // Update local state
      setSavedAvatars(prev => prev.filter(a => a.id !== avatarId));
      
      // If deleted avatar was selected, switch to none
      if (selectedSavedAvatar?.id === avatarId) {
        setAvatarOption('none');
        setSelectedSavedAvatar(null);
        setCharacterDescription(null);
        setUploadedAvatarPreview(null);
      }
    } catch (err) {
      console.error('Error deleting avatar:', err);
    }
  };

  // Rename avatar
  const handleRenameAvatar = async (avatarId: string) => {
    if (!editingName.trim()) return;
    
    try {
      await supabase
        .from('user_avatars')
        .update({ name: editingName.trim() })
        .eq('id', avatarId);
      
      setSavedAvatars(prev => prev.map(a => 
        a.id === avatarId ? { ...a, name: editingName.trim() } : a
      ));
      
      if (selectedSavedAvatar?.id === avatarId) {
        setSelectedSavedAvatar(prev => prev ? { ...prev, name: editingName.trim() } : null);
      }
      
      setEditingAvatarId(null);
      setEditingName("");
    } catch (err) {
      console.error('Error renaming avatar:', err);
    }
  };

  const getAvatarDisplayName = () => {
    if (avatarOption === "none") return uiLang === 'id' ? 'Tanpa Avatar' : 'No Avatar';
    if (avatarOption === "profile") return uiLang === 'id' ? 'Profil' : 'Profile';
    if (avatarOption === "saved" && selectedSavedAvatar) return selectedSavedAvatar.name;
    return 'Avatar';
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
    <>
      {/* Name Modal for new avatar */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border-default rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              {uiLang === 'id' ? 'Nama Avatar' : 'Avatar Name'}
            </h3>
            
            {pendingUploadFile && (
              <div className="flex justify-center mb-4">
                <img 
                  src={URL.createObjectURL(pendingUploadFile)} 
                  alt="Preview" 
                  className="w-20 h-20 rounded-full object-cover border-2 border-primary"
                />
              </div>
            )}
            
            <input
              ref={nameInputRef}
              type="text"
              value={newAvatarName}
              onChange={(e) => setNewAvatarName(e.target.value)}
              placeholder={uiLang === 'id' ? 'Masukkan nama...' : 'Enter name...'}
              className="w-full bg-surface border border-border-default rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:border-primary mb-4"
              maxLength={30}
            />
            
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowNameModal(false);
                  setPendingUploadFile(null);
                  setNewAvatarName("");
                }}
                disabled={savingAvatar}
                className="flex-1"
              >
                {uiLang === 'id' ? 'Batal' : 'Cancel'}
              </Button>
              <Button
                type="button"
                onClick={handleSaveAvatar}
                disabled={savingAvatar || !newAvatarName.trim()}
                className="flex-1 bg-primary hover:bg-primary-hover text-white"
              >
                {savingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  uiLang === 'id' ? 'Simpan' : 'Save'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

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

          {/* Textarea */}
          <textarea
            value={prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder={currentInputType?.placeholder}
            className={`w-full bg-transparent text-text-primary placeholder:text-text-muted resize-none focus:outline-none text-base sm:text-lg p-2 ${
              inputType === "transcript" ? "min-h-[160px] sm:min-h-[180px] lg:min-h-[200px]" : "min-h-[120px] sm:min-h-[120px] lg:min-h-[140px] lg:text-xl"
            }`}
            disabled={loading}
          />

          {inputType === "transcript" && prompt.length > 0 && (
            <div className="text-right text-text-muted text-xs mb-2">
              {prompt.length} {uiText.characters}
            </div>
          )}

          {/* Settings Row */}
          <div className="pt-4 border-t border-border-default">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
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
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
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
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
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
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-text-secondary pointer-events-none" />
              </div>

              {/* Language Dropdown */}
              <div className="relative">
                <select
                  value={scriptLang}
                  onChange={(e) => setScriptLang(e.target.value)}
                  disabled={loading}
                  title={uiText.scriptLanguageLabel}
                  className="w-full appearance-none bg-surface border border-border-default rounded-lg px-2 sm:px-3 py-2 sm:py-2.5 pr-6 sm:pr-8 text-text-primary text-xs sm:text-sm lg:text-base focus:outline-none focus:border-primary cursor-pointer truncate"
                >
                  {languageOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
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
                    {analyzingAvatar || loadingAvatars ? (
                      <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-primary" />
                    ) : uploadedAvatarPreview && avatarOption !== 'none' ? (
                      <img src={uploadedAvatarPreview} alt="" className="w-4 h-4 sm:w-5 sm:h-5 rounded-full object-cover" />
                    ) : (
                      <User className="w-3 h-3 sm:w-4 sm:h-4 text-text-secondary" />
                    )}
                    <span className="truncate text-xs sm:text-sm">
                      {analyzingAvatar ? '...' : getAvatarDisplayName()}
                    </span>
                  </div>
                  <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-text-secondary flex-shrink-0" />
                </button>

                {/* Avatar Dropdown Menu */}
                {avatarDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border-default rounded-lg shadow-lg z-50 overflow-hidden max-h-64 overflow-y-auto">
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

                    {/* Saved Avatars */}
                    {savedAvatars.length > 0 && (
                      <>
                        <div className="px-3 py-1 text-xs text-text-muted border-t border-border-default mt-1">
                          {uiLang === 'id' ? 'Avatar Tersimpan' : 'Saved Avatars'}
                        </div>
                        {savedAvatars.map((avatar) => (
                          <div
                            key={avatar.id}
                            className={`flex items-center gap-2 px-3 py-2 hover:bg-page transition-colors ${
                              selectedSavedAvatar?.id === avatar.id ? 'bg-primary/20' : ''
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleAvatarOptionSelect('saved', avatar)}
                              className="flex items-center gap-2 flex-1 min-w-0 text-left"
                            >
                              <img src={avatar.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                              {editingAvatarId === avatar.id ? (
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleRenameAvatar(avatar.id);
                                    if (e.key === 'Escape') setEditingAvatarId(null);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 bg-page border border-primary rounded px-1 py-0.5 text-xs text-text-primary focus:outline-none"
                                  autoFocus
                                />
                              ) : (
                                <span className={`truncate text-xs sm:text-sm ${
                                  selectedSavedAvatar?.id === avatar.id ? 'text-primary' : 'text-text-secondary'
                                }`}>
                                  {avatar.name}
                                </span>
                              )}
                              {avatar.character_description && <span className="text-green-400 text-xs flex-shrink-0">✓</span>}
                            </button>
                            
                            {/* Edit/Delete buttons */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {editingAvatarId === avatar.id ? (
                                <button
                                  type="button"
                                  onClick={() => handleRenameAvatar(avatar.id)}
                                  className="p-1 text-green-400 hover:bg-green-400/20 rounded"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingAvatarId(avatar.id);
                                    setEditingName(avatar.name);
                                  }}
                                  className="p-1 text-text-muted hover:text-primary hover:bg-primary/20 rounded"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => handleDeleteAvatar(avatar.id, e)}
                                className="p-1 text-text-muted hover:text-red-400 hover:bg-red-400/20 rounded"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Upload New */}
                    <button
                      type="button"
                      onClick={() => handleAvatarOptionSelect('upload')}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs sm:text-sm hover:bg-page transition-colors text-text-secondary border-t border-border-default"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{uiLang === 'id' ? 'Upload Baru' : 'Upload New'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row */}
            <div className="flex items-center justify-between gap-3 mt-3 sm:mt-4">
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
                    <div className={`w-9 h-5 sm:w-11 sm:h-6 rounded-full transition-colors ${useDnaTone ? "bg-primary" : "bg-surface"}`}>
                      <div className={`absolute top-0.5 sm:top-1 w-4 h-4 rounded-full bg-white transition-transform ${useDnaTone ? "translate-x-4 sm:translate-x-5" : "translate-x-0.5 sm:translate-x-1"}`} />
                    </div>
                  </div>
                  <span className="text-text-primary text-xs sm:text-sm lg:text-base">DNA</span>
                </label>
              ) : (
                <div />
              )}

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
    </>
  );
};
