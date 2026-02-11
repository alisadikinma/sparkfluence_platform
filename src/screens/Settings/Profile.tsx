import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { supabase } from "../../lib/supabase";
import { clearAvatarCache } from "../../lib/avatarCache";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  ArrowLeft,
  User,
  Lock,
  Globe,
  Camera,
  Loader2,
  Check,
  Phone,
  MessageSquare,
  Shield,
  AlertCircle,
  Sparkles,
  Mic,
  RefreshCw
} from "lucide-react";
import { PhoneInput } from "../../components/ui/phone-input";
import { VoiceRecorder } from "../../components/features/VoiceRecorder";

interface ProfileData {
  full_name: string;
  avatar_url: string;
  bio: string;
  language: string;
  phone_number: string;
  phone_verified: boolean;
  country: string;
}

interface ContentPreferences {
  interest: string;
  profession: string;
  platforms: string[];
  objectives: string[];
  selected_niches: string[];
  creative_dna: string[];
}

type TabType = "info" | "content" | "voice" | "phone" | "password" | "language";

// Options for dropdowns
const interestOptions = [
  "Entertainment", "Travel", "Culinary", "Technology", "Fashion", 
  "Education", "Beauty", "Health", "Finance", "Design", "Others"
];

const professionOptions = [
  "Content Creator", "Freelancer", "Entrepreneur", "Employee", 
  "Student", "Teacher", "Artist", "Other"
];

const platformOptions = ["TikTok", "Instagram", "Youtube"];

const objectiveOptions = ["Growth", "Monetize", "Consistency"];

const dnaOptions = [
  { id: "chill-humorist", name: "Chill Humorist", emoji: "😄" },
  { id: "energetic-storyteller", name: "Energetic Storyteller", emoji: "⚡" },
  { id: "informative-expert", name: "Informative Expert", emoji: "📚" },
  { id: "authentic-relatable", name: "Authentic & Relatable", emoji: "💫" },
  { id: "bold-provocative", name: "Bold & Provocative", emoji: "🔥" },
  { id: "minimalist-aesthetic", name: "Minimalist Aesthetic", emoji: "✨" },
  { id: "motivational-coach", name: "Motivational Coach", emoji: "💪" },
  { id: "quirky-creative", name: "Quirky Creative", emoji: "🎨" },
  { id: "professional-polished", name: "Professional & Polished", emoji: "👔" },
  { id: "community-builder", name: "Community Builder", emoji: "🤝" }
];

// Country options for Google Trends GEO_ID
const countryOptions = [
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
];

export const Profile = (): JSX.Element => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();

  // Sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  // Listen for sidebar toggle
  useEffect(() => {
    const handleSidebarToggle = (e: CustomEvent) => {
      setSidebarCollapsed(e.detail.collapsed);
    };
    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    return () => window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
  }, []);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("info");

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Profile Info State
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    avatar_url: "",
    bio: "",
    language: "id",
    phone_number: "",
    phone_verified: false,
    country: "ID",
  });

  // Content Preferences State
  const [contentPrefs, setContentPrefs] = useState<ContentPreferences>({
    interest: "",
    profession: "",
    platforms: [],
    objectives: [],
    selected_niches: [],
    creative_dna: [],
  });
  const [customInterest, setCustomInterest] = useState("");
  const [customProfession, setCustomProfession] = useState("");
  const [nicheInput, setNicheInput] = useState("");
  const [showNicheSuggestions, setShowNicheSuggestions] = useState(false);
  const [llmNicheSuggestions, setLlmNicheSuggestions] = useState<string[]>([]);
  const [isLoadingNiches, setIsLoadingNiches] = useState(false);
  const nicheDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // AI-generated niche suggestions (browse mode)
  const [aiNicheSuggestions, setAiNicheSuggestions] = useState<string[]>([]);
  const [isLoadingAiNiches, setIsLoadingAiNiches] = useState(false);
  const aiNicheRequestRef = useRef(0);

  // Voice State
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [voiceDuration, setVoiceDuration] = useState(0);

  // Password State
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Phone Verification State
  const [phoneInput, setPhoneInput] = useState("");
  const [dialCode, setDialCode] = useState("62");
  const [fullPhoneNumber, setFullPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [phoneSuccess, setPhoneSuccess] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(3);

  // Fetch profile on mount
  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const fetchProfile = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setProfile({
          full_name: data.full_name || user.user_metadata?.full_name || "",
          avatar_url: data.avatar_url || "",
          bio: data.bio || "",
          language: data.language || "id",
          phone_number: data.phone_number || "",
          phone_verified: data.phone_verified || false,
          country: data.country || "ID",
          voice_reference_url: data.voice_reference_url || "",
          voice_reference_duration_seconds: data.voice_reference_duration_seconds || 0,
        });

        // Load voice reference data
        if (data.voice_reference_url) {
          setVoiceUrl(data.voice_reference_url);
          setVoiceDuration(data.voice_reference_duration_seconds || 0);
        }

        setContentPrefs({
          interest: data.interest || "",
          profession: data.profession || "",
          platforms: data.platforms || [],
          objectives: data.objectives || [],
          selected_niches: data.selected_niches || [],
          creative_dna: data.creative_dna || [],
        });

        if (data.interest && !interestOptions.includes(data.interest)) {
          setCustomInterest(data.interest);
        }
        if (data.profession && !professionOptions.includes(data.profession)) {
          setCustomProfession(data.profession);
        }
        if (data.phone_number) {
          setPhoneInput(formatPhoneDisplay(data.phone_number));
        }
      } else if (error && error.code === "PGRST116") {
        setProfile({
          full_name: user.user_metadata?.full_name || "",
          avatar_url: "",
          bio: "",
          language: "id",
          phone_number: "",
          phone_verified: false,
          country: "ID",
        });
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneDisplay = (phone: string): string => {
    if (phone.startsWith("62")) {
      return "0" + phone.slice(2);
    }
    return phone;
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      alert(language === 'id' ? "Ukuran file maksimal 5MB" : "Maximum file size is 5MB");
      return;
    }

    setSaving(true);

    try {
      const fileExt = file.name.split(".").pop();
      const avatarFileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: avatarError } = await supabase.storage
        .from("avatars")
        .upload(avatarFileName, file, { upsert: true });

      if (avatarError) throw avatarError;

      const { data: avatarUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(avatarFileName);

      const pngFileName = `character-references/${user.id}_face.png`;
      
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to convert to PNG'));
          }, 'image/png', 1.0);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
      });

      const { error: pngError } = await supabase.storage
        .from("generated-images")
        .upload(pngFileName, pngBlob, { 
          contentType: 'image/png', 
          upsert: true 
        });

      if (!pngError) {
        const { data: pngUrlData } = supabase.storage
          .from("generated-images")
          .getPublicUrl(pngFileName);
        
        await supabase
          .from("user_profiles")
          .upsert({
            user_id: user.id,
            avatar_url: avatarUrlData.publicUrl,
            character_ref_png: pngUrlData.publicUrl,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
      }

      setProfile(prev => ({ ...prev, avatar_url: avatarUrlData.publicUrl }));
      
      // Invalidate avatar cache so TopicSelection fetches fresh URL
      clearAvatarCache();
      console.log('[Profile] Avatar updated, cache invalidated');
      
      // Auto-trigger analyze-avatar to generate character description
      console.log('[Profile] Auto-analyzing avatar with Gemini Vision...');
      let characterDesc: string | null = null;
      try {
        const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-avatar', {
          body: {
            image_url: avatarUrlData.publicUrl,
            user_id: user.id,
            save_to_profile: true
          }
        });
        
        if (analysisError) {
          console.error('[Profile] Avatar analysis error:', analysisError);
        } else if (analysisData?.success) {
          characterDesc = analysisData.data.character_description;
          console.log('[Profile] Character description generated:', characterDesc?.slice(0, 100) + '...');
        }
      } catch (analysisErr) {
        console.error('[Profile] Failed to analyze avatar:', analysisErr);
      }
      
      // Also save to user_avatars table for ScriptLab/TopicSelection reuse
      try {
        // Check how many avatars user has
        const { count } = await supabase
          .from('user_avatars')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        const avatarCount = count || 0;
        const isFirstAvatar = avatarCount === 0;
        
        // Insert into user_avatars
        await supabase
          .from('user_avatars')
          .insert({
            user_id: user.id,
            name: language === 'id' ? `Profil ${new Date().toLocaleDateString('id-ID')}` : `Profile ${new Date().toLocaleDateString()}`,
            storage_path: avatarFileName,
            avatar_url: avatarUrlData.publicUrl,
            character_description: characterDesc,
            is_default: isFirstAvatar
          });
        
        console.log('[Profile] Avatar also saved to user_avatars table');
      } catch (avatarTableErr) {
        console.error('[Profile] Failed to save to user_avatars:', avatarTableErr);
      }
      
    } catch (err) {
      console.error("Error uploading avatar:", err);
      alert(language === 'id' ? "Gagal upload avatar." : "Failed to upload avatar.");
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      const { error } = await supabase
        .from("user_profiles")
        .upsert({
          user_id: user.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          language: profile.language,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      // Extract detailed error message
      if (error) {
        const errorBody = error.context?.body ? JSON.parse(error.context.body) : null;
        if (errorBody?.error?.message) {
          setPhoneError(errorBody.error.message);
          setSendingOtp(false);
          return;
        }
        throw error;
      }

      await supabase.auth.updateUser({
        data: { full_name: profile.full_name }
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving profile:", err);
      alert(language === 'id' ? "Gagal menyimpan profil." : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const saveContentPreferences = async () => {
    if (!user) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      const actualInterest = contentPrefs.interest === "Others" ? customInterest : contentPrefs.interest;
      const actualProfession = contentPrefs.profession === "Other" ? customProfession : contentPrefs.profession;

      const { error } = await supabase
        .from("user_profiles")
        .upsert({
          user_id: user.id,
          interest: actualInterest,
          profession: actualProfession,
          platforms: contentPrefs.platforms,
          objectives: contentPrefs.objectives,
          selected_niches: contentPrefs.selected_niches,
          creative_dna: contentPrefs.creative_dna,
          country: profile.country,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      // Extract detailed error message
      if (error) {
        const errorBody = error.context?.body ? JSON.parse(error.context.body) : null;
        if (errorBody?.error?.message) {
          setPhoneError(errorBody.error.message);
          setSendingOtp(false);
          return;
        }
        throw error;
      }

      const onboardingData = {
        interest: actualInterest,
        profession: actualProfession,
        platforms: contentPrefs.platforms,
        objectives: contentPrefs.objectives,
        selectedNiches: contentPrefs.selected_niches.join("; "),
        creativeDNA: contentPrefs.creative_dna,
        creativeStyle: contentPrefs.creative_dna.join(", "),
      };
      localStorage.setItem("onboarding_data", JSON.stringify(onboardingData));

      // Clear topic caches so they regenerate with new preferences
      localStorage.removeItem('sparkfluence_cached_topics');      // TopicSelection cache
      localStorage.removeItem('sparkfluence_scriptlab_topics');   // ScriptLab cache
      console.log('[Profile] Content preferences saved, topic caches cleared');

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving content preferences:", err);
      alert(language === 'id' ? "Gagal menyimpan preferensi." : "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setContentPrefs(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const toggleObjective = (objective: string) => {
    setContentPrefs(prev => ({
      ...prev,
      objectives: prev.objectives.includes(objective)
        ? prev.objectives.filter(o => o !== objective)
        : [...prev.objectives, objective]
    }));
  };

  const addNiche = (niche?: string) => {
    const trimmed = (niche || nicheInput).trim();
    if (!trimmed) return;
    if (contentPrefs.selected_niches.includes(trimmed)) {
      setNicheInput("");
      setShowNicheSuggestions(false);
      return;
    }
    if (contentPrefs.selected_niches.length >= 5) return;
    setContentPrefs(prev => ({
      ...prev,
      selected_niches: [...prev.selected_niches, trimmed]
    }));
    setNicheInput("");
    setShowNicheSuggestions(false);
  };

  const removeNiche = (niche: string) => {
    setContentPrefs(prev => ({
      ...prev,
      selected_niches: prev.selected_niches.filter(n => n !== niche)
    }));
  };

  const handleNicheKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addNiche();
    } else if (e.key === 'Escape') {
      setShowNicheSuggestions(false);
    }
  };

  // LLM-based niche suggestion generator
  const generateNicheSuggestionsLLM = async (query: string) => {
    if (!query.trim() || query.length < 2) return;
    
    setIsLoadingNiches(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-niche-suggestions', {
        body: {
          query: query.trim(),
          interest: contentPrefs.interest,
          profession: contentPrefs.profession,
          language: language,
          existing_niches: contentPrefs.selected_niches
        }
      });

      // Extract detailed error message
      if (error) {
        const errorBody = error.context?.body ? JSON.parse(error.context.body) : null;
        if (errorBody?.error?.message) {
          setPhoneError(errorBody.error.message);
          setSendingOtp(false);
          return;
        }
        throw error;
      }
      
      if (data?.success && data?.niches) {
        setLlmNicheSuggestions(data.niches);
      }
    } catch (err) {
      console.error('[Profile] LLM niche generation error:', err);
    } finally {
      setIsLoadingNiches(false);
    }
  };

  // Fetch AI-generated niches when interest/profession changes
  const fetchAiNichesForInterest = async (interest: string, profession: string) => {
    if (!interest) {
      setAiNicheSuggestions([]);
      return;
    }

    const requestId = ++aiNicheRequestRef.current;
    setIsLoadingAiNiches(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-niche-suggestions', {
        body: {
          mode: 'browse',
          interest,
          profession: profession || 'Content Creator',
          language,
          existing_niches: contentPrefs.selected_niches
        }
      });

      // Only update if this is still the latest request
      if (requestId !== aiNicheRequestRef.current) return;

      if (error) throw error;
      if (data?.success && data?.niches) {
        setAiNicheSuggestions(data.niches);
      }
    } catch (err) {
      console.error('[Profile] AI niche fetch error:', err);
      if (requestId === aiNicheRequestRef.current) {
        setAiNicheSuggestions([]);
      }
    } finally {
      if (requestId === aiNicheRequestRef.current) {
        setIsLoadingAiNiches(false);
      }
    }
  };

  // Trigger AI niche generation when interest/profession changes
  useEffect(() => {
    const actualInterest = contentPrefs.interest === 'Others' ? customInterest : contentPrefs.interest;
    const actualProfession = contentPrefs.profession === 'Other' ? customProfession : contentPrefs.profession;

    if (actualInterest) {
      fetchAiNichesForInterest(actualInterest, actualProfession);
    } else {
      setAiNicheSuggestions([]);
    }
  }, [contentPrefs.interest, contentPrefs.profession, customInterest, customProfession]);

  // Debounced LLM call for search-by-query (typing in niche input)
  useEffect(() => {
    if (nicheDebounceRef.current) {
      clearTimeout(nicheDebounceRef.current);
    }

    setLlmNicheSuggestions([]);

    if (nicheInput.trim().length >= 2) {
      nicheDebounceRef.current = setTimeout(() => {
        generateNicheSuggestionsLLM(nicheInput);
      }, 600);
    }

    return () => {
      if (nicheDebounceRef.current) {
        clearTimeout(nicheDebounceRef.current);
      }
    };
  }, [nicheInput, contentPrefs.interest, contentPrefs.profession]);

  const toggleDNA = (dnaName: string) => {
    setContentPrefs(prev => {
      if (prev.creative_dna.includes(dnaName)) {
        return { ...prev, creative_dna: prev.creative_dna.filter(d => d !== dnaName) };
      }
      if (prev.creative_dna.length >= 3) return prev;
      return { ...prev, creative_dna: [...prev.creative_dna, dnaName] };
    });
  };

  const changePassword = async () => {
    setPasswordError("");
    setPasswordSuccess(false);

    if (passwords.new !== passwords.confirm) {
      setPasswordError(language === 'id' ? "Password baru tidak cocok" : "New passwords don't match");
      return;
    }

    if (passwords.new.length < 6) {
      setPasswordError(language === 'id' ? "Password minimal 6 karakter" : "Password must be at least 6 characters");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new
      });

      // Extract detailed error message
      if (error) {
        const errorBody = error.context?.body ? JSON.parse(error.context.body) : null;
        if (errorBody?.error?.message) {
          setPhoneError(errorBody.error.message);
          setSendingOtp(false);
          return;
        }
        throw error;
      }

      setPasswords({ current: "", new: "", confirm: "" });
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message || (language === 'id' ? "Gagal mengubah password" : "Failed to change password"));
    } finally {
      setSaving(false);
    }
  };

  const sendOtp = async () => {
    setPhoneError("");
    setPhoneSuccess("");

    // Validate phone - use fullPhoneNumber which has country code
    if (!fullPhoneNumber || fullPhoneNumber.length < 10) {
      setPhoneError(language === 'id' ? "Format nomor WhatsApp tidak valid" : "Invalid WhatsApp number format");
      return;
    }

    setSendingOtp(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp-otp", {
        body: { phone_number: fullPhoneNumber }
      });

      // Extract detailed error message
      if (error) {
        const errorBody = error.context?.body ? JSON.parse(error.context.body) : null;
        if (errorBody?.error?.message) {
          setPhoneError(errorBody.error.message);
          setSendingOtp(false);
          return;
        }
        throw error;
      }

      if (data.success) {
        setOtpSent(true);
        setPhoneSuccess(language === 'id' ? `Kode OTP dikirim ke ${data.data.phone_masked}` : `OTP code sent to ${data.data.phone_masked}`);
        setCooldown(60);
        setAttemptsLeft(3);
      } else {
        if (data.error.code === "COOLDOWN") {
          setCooldown(data.error.remaining_seconds);
        }
        setPhoneError(data.error.message);
      }
    } catch (err: any) {
      setPhoneError(err.message || (language === 'id' ? "Gagal mengirim OTP." : "Failed to send OTP."));
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    setPhoneError("");
    setPhoneSuccess("");

    if (otpCode.length !== 6) {
      setPhoneError(language === 'id' ? "Kode OTP harus 6 digit" : "OTP code must be 6 digits");
      return;
    }

    setVerifyingOtp(true);

    try {
      const { data, error } = await supabase.functions.invoke("verify-whatsapp-otp", {
        body: {
          phone_number: fullPhoneNumber,
          otp_code: otpCode,
          user_id: user?.id
        }
      });

      // Extract detailed error message
      if (error) {
        const errorBody = error.context?.body ? JSON.parse(error.context.body) : null;
        if (errorBody?.error?.message) {
          setPhoneError(errorBody.error.message);
          setSendingOtp(false);
          return;
        }
        throw error;
      }

      if (data.success) {
        setPhoneSuccess(data.data.message);
        setProfile(prev => ({
          ...prev,
          phone_number: data.data.phone_number,
          phone_verified: true
        }));
        setOtpSent(false);
        setOtpCode("");
      } else {
        if (data.error.attempts_left !== undefined) {
          setAttemptsLeft(data.error.attempts_left);
        }
        if (data.error.code === "RATE_LIMITED") {
          setCooldown(data.error.remaining_seconds || 86400);
        }
        setPhoneError(data.error.message);
      }
    } catch (err: any) {
      setPhoneError(err.message || (language === 'id' ? "Gagal verifikasi." : "Verification failed."));
    } finally {
      setVerifyingOtp(false);
    }
  };

  const resetPhoneVerification = () => {
    setOtpSent(false);
    setOtpCode("");
    setPhoneError("");
    setPhoneSuccess("");
  };

  if (authLoading || loading) {
    return (
      <div className="flex w-full min-h-screen bg-page items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  const tabs = [
    { id: "info" as TabType, label: language === 'id' ? "Info" : "Info", icon: User },
    { id: "content" as TabType, label: language === 'id' ? "Konten" : "Content", icon: Sparkles },
    { id: "voice" as TabType, label: language === 'id' ? "Suara" : "Voice", icon: Mic },
    { id: "phone" as TabType, label: "WhatsApp", icon: Phone },
    { id: "password" as TabType, label: "Password", icon: Lock },
    { id: "language" as TabType, label: language === 'id' ? "Bahasa" : "Language", icon: Globe },
  ];

  const mainLeftMargin = sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[240px]';

  return (
    <div className="w-full min-h-screen bg-page">
      <main className="pb-8 px-4 sm:px-6">
          {/* Back Button & Title */}
          <button
            onClick={() => navigate("/settings")}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{language === 'id' ? 'Kembali ke Pengaturan' : 'Back to Settings'}</span>
          </button>

          <h1 className="text-2xl font-bold text-text-primary mb-6">{t.settings.profile.title}</h1>

          {/* Tab Buttons */}
          <div className="flex gap-1 sm:gap-2 mb-6 p-1 bg-card border border-border-default rounded-lg w-fit overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isPhoneTab = tab.id === "phone";
              const showBadge = isPhoneTab && !profile.phone_verified;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-primary text-white"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="w-full">
            {/* Info Tab */}
            {activeTab === "info" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ec4899] flex items-center justify-center overflow-hidden">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                        ) : (
                          <User className="w-8 h-8 text-white" />
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 w-7 h-7 bg-[#7c3aed] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#6d28d9] transition-colors">
                        <Camera className="w-3.5 h-3.5 text-white" />
                        <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={saving} />
                      </label>
                    </div>
                    <div>
                      <p className="text-white font-medium">{language === 'id' ? 'Foto Profil' : 'Profile Photo'}</p>
                      <p className="text-[#9ca3af] text-sm">JPG, PNG, WebP. Max 5MB</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">{language === 'id' ? 'Nama Lengkap' : 'Full Name'}</Label>
                    <Input
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      className="bg-[#1a1a24] border-[#2b2b38] text-white focus:border-[#7c3aed] h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white">Email</Label>
                    <Input value={user?.email || ""} disabled className="bg-[#1a1a24] border-[#2b2b38] text-[#9ca3af] cursor-not-allowed h-10" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white">Bio</Label>
                    <textarea
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      className="w-full bg-[#1a1a24] border border-[#2b2b38] text-white min-h-[120px] rounded-lg px-3 py-2 focus:border-[#7c3aed] focus:outline-none placeholder:text-[#9ca3af] resize-none"
                      placeholder={language === 'id' ? 'Ceritakan tentang dirimu...' : 'Tell us about yourself...'}
                      maxLength={500}
                    />
                    <p className="text-[#9ca3af] text-xs text-right">{profile.bio.length}/500</p>
                  </div>

                  <Button onClick={saveProfile} disabled={saving} className="bg-[#7c3aed] hover:bg-[#6d28d9] h-10 px-6">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saveSuccess ? <Check className="w-4 h-4 mr-2" /> : null}
                    {saveSuccess ? (language === 'id' ? 'Tersimpan!' : 'Saved!') : t.common.save}
                  </Button>
                </div>
              </div>
            )}

            {/* Content Preferences Tab - Responsive Layout */}
            {activeTab === "content" && (
              <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
                {/* Left Side - Settings */}
                <div className="flex-1 space-y-6 lg:space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-8">
                    {/* Interest */}
                    <div className="space-y-2">
                      <Label className="text-white text-sm lg:text-base font-medium">{language === 'id' ? 'Minat' : 'Interest'}</Label>
                      <select
                        value={interestOptions.includes(contentPrefs.interest) ? contentPrefs.interest : "Others"}
                        onChange={(e) => {
                          setContentPrefs({ ...contentPrefs, interest: e.target.value });
                          if (e.target.value !== "Others") setCustomInterest("");
                        }}
                        className="w-full bg-neutral-800 border border-neutral-700 text-white text-sm lg:text-base h-11 lg:h-12 rounded-lg px-3 lg:px-4 focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="">{language === 'id' ? 'Pilih minat' : 'Select interest'}</option>
                        {interestOptions.map(opt => (<option key={opt} value={opt} className="bg-[#1a1a24]">{opt}</option>))}
                      </select>
                    </div>

                    {/* Profession */}
                    <div className="space-y-2">
                      <Label className="text-white text-sm lg:text-base font-medium">{language === 'id' ? 'Profesi' : 'Profession'}</Label>
                      <select
                        value={professionOptions.includes(contentPrefs.profession) ? contentPrefs.profession : "Other"}
                        onChange={(e) => {
                          setContentPrefs({ ...contentPrefs, profession: e.target.value });
                          if (e.target.value !== "Other") setCustomProfession("");
                        }}
                        className="w-full bg-neutral-800 border border-neutral-700 text-white text-sm lg:text-base h-11 lg:h-12 rounded-lg px-3 lg:px-4 focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="">{language === 'id' ? 'Pilih profesi' : 'Select profession'}</option>
                        {professionOptions.map(opt => (<option key={opt} value={opt} className="bg-[#1a1a24]">{opt}</option>))}
                      </select>
                    </div>
                  </div>

                  {/* Country */}
                  <div className="space-y-2">
                    <Label className="text-white text-sm lg:text-base font-medium">{language === 'id' ? 'Negara' : 'Country'} <span className="text-[#9ca3af] text-xs lg:text-sm">(Google Trends)</span></Label>
                    <select
                      value={profile.country}
                      onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                      className="w-full bg-neutral-800 border border-neutral-700 text-white text-sm lg:text-base h-11 lg:h-12 rounded-lg px-3 lg:px-4 focus:border-emerald-500 focus:outline-none"
                    >
                      {countryOptions.map(country => (
                        <option key={country.code} value={country.code} className="bg-[#1a1a24]">{country.flag} {country.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Niche */}
                  <div className="space-y-3">
                    <Label className="text-white text-sm lg:text-base font-medium">
                      Niche <span className="text-neutral-400 text-xs lg:text-sm">({language === 'id' ? 'maks 5' : 'max 5'})</span>
                    </Label>

                    {/* Selected niches */}
                    {contentPrefs.selected_niches.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {contentPrefs.selected_niches.map((niche, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-full text-sm"
                          >
                            {niche}
                            <button
                              onClick={() => removeNiche(niche)}
                              className="hover:text-white transition-colors"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* AI-generated niche suggestions */}
                    {contentPrefs.interest && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-neutral-400 text-xs">
                            {language === 'id' ? `Saran AI untuk ${contentPrefs.interest}:` : `AI suggestions for ${contentPrefs.interest}:`}
                          </p>
                          <button
                            onClick={() => {
                              const actualInterest = contentPrefs.interest === 'Others' ? customInterest : contentPrefs.interest;
                              const actualProfession = contentPrefs.profession === 'Other' ? customProfession : contentPrefs.profession;
                              fetchAiNichesForInterest(actualInterest, actualProfession);
                            }}
                            disabled={isLoadingAiNiches}
                            className="text-emerald-400 hover:text-emerald-300 transition-colors"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAiNiches ? 'animate-spin' : ''}`} />
                          </button>
                        </div>

                        {isLoadingAiNiches ? (
                          <div className="flex items-center gap-2 py-3">
                            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                            <span className="text-neutral-400 text-sm">{language === 'id' ? 'Generating niches...' : 'Generating niches...'}</span>
                          </div>
                        ) : aiNicheSuggestions.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {aiNicheSuggestions
                              .filter(s => !contentPrefs.selected_niches.includes(s))
                              .map((suggestion, idx) => (
                                <button
                                  key={`ai-${idx}`}
                                  type="button"
                                  onClick={() => addNiche(suggestion)}
                                  disabled={contentPrefs.selected_niches.length >= 5}
                                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors ${
                                    contentPrefs.selected_niches.length >= 5
                                      ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                                  }`}
                                >
                                  + {suggestion}
                                </button>
                              ))}
                          </div>
                        ) : !isLoadingAiNiches && contentPrefs.interest ? (
                          <p className="text-neutral-500 text-xs">{language === 'id' ? 'Tidak ada saran. Coba refresh atau ketik manual.' : 'No suggestions. Try refreshing or type manually.'}</p>
                        ) : null}
                      </div>
                    )}

                    {/* Custom niche input */}
                    <div className="relative">
                      <div className="flex gap-2">
                        <Input
                          value={nicheInput}
                          onChange={(e) => {
                            setNicheInput(e.target.value);
                            setShowNicheSuggestions(true);
                          }}
                          onFocus={() => setShowNicheSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowNicheSuggestions(false), 200)}
                          onKeyDown={handleNicheKeyDown}
                          placeholder={language === 'id' ? 'Ketik niche custom...' : 'Type custom niche...'}
                          className="bg-neutral-800 border-neutral-700 text-white text-sm h-10 flex-1 focus:border-emerald-500"
                          disabled={contentPrefs.selected_niches.length >= 5}
                        />
                        <Button
                          type="button"
                          onClick={() => addNiche()}
                          disabled={!nicheInput.trim() || contentPrefs.selected_niches.length >= 5}
                          className="bg-emerald-500 hover:bg-emerald-600 h-10 px-4 text-sm"
                        >
                          {language === 'id' ? 'Tambah' : 'Add'}
                        </Button>
                      </div>

                      {/* Search dropdown (LLM suggestions when typing) */}
                      {showNicheSuggestions && (llmNicheSuggestions.length > 0 || isLoadingNiches || nicheInput.trim()) && (
                        <div className="absolute z-50 w-full mt-1 bg-neutral-900 border border-neutral-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {/* Custom add option */}
                          {nicheInput.trim() && !llmNicheSuggestions.some(s => s.toLowerCase() === nicheInput.toLowerCase()) && !contentPrefs.selected_niches.includes(nicheInput.trim()) && (
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                addNiche(nicheInput.trim());
                              }}
                              className="w-full px-4 py-2.5 text-left text-sm text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center gap-2 border-b border-neutral-700"
                            >
                              <span>+</span>
                              {language === 'id' ? `Tambah "${nicheInput.trim()}"` : `Add "${nicheInput.trim()}"`}
                            </button>
                          )}

                          {/* Loading */}
                          {isLoadingNiches && (
                            <div className="w-full px-4 py-3 text-center text-sm text-neutral-400 flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {language === 'id' ? 'Mencari niche...' : 'Finding niches...'}
                            </div>
                          )}

                          {/* LLM search suggestions */}
                          {llmNicheSuggestions.filter(s => !contentPrefs.selected_niches.includes(s)).map((suggestion, idx) => (
                            <button
                              key={`llm-${idx}`}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                addNiche(suggestion);
                              }}
                              className="w-full px-4 py-2.5 text-left text-sm text-emerald-300 hover:bg-emerald-500/10 transition-colors flex items-center gap-2"
                            >
                              <Sparkles className="w-3 h-3 text-emerald-500" />
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {contentPrefs.selected_niches.length === 0 && !contentPrefs.interest && (
                      <p className="text-neutral-500 text-xs">{language === 'id' ? 'Pilih interest dulu untuk mendapatkan saran niche AI.' : 'Select an interest first to get AI niche suggestions.'}</p>
                    )}
                  </div>

                  {/* Platforms & Objectives */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-8">
                    <div className="space-y-2">
                      <Label className="text-white text-sm lg:text-base font-medium">{language === 'id' ? 'Platform Target' : 'Target Platforms'}</Label>
                      <div className="flex flex-wrap gap-2">
                        {platformOptions.map(platform => (
                          <button
                            key={platform}
                            onClick={() => togglePlatform(platform)}
                            className={`px-3 lg:px-5 py-2 lg:py-2.5 rounded-lg text-sm lg:text-base font-medium transition-all ${
                              contentPrefs.platforms.includes(platform)
                                ? "bg-emerald-500 text-white"
                                : "bg-neutral-800 border border-neutral-700 text-neutral-400 hover:border-emerald-500"
                            }`}
                          >
                            {platform}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white text-sm lg:text-base font-medium">{language === 'id' ? 'Tujuan Konten' : 'Content Objectives'}</Label>
                      <div className="flex flex-wrap gap-2">
                        {objectiveOptions.map(objective => (
                          <button
                            key={objective}
                            onClick={() => toggleObjective(objective)}
                            className={`px-3 lg:px-5 py-2 lg:py-2.5 rounded-lg text-sm lg:text-base font-medium transition-all ${
                              contentPrefs.objectives.includes(objective)
                                ? "bg-emerald-500 text-white"
                                : "bg-neutral-800 border border-neutral-700 text-neutral-400 hover:border-emerald-500"
                            }`}
                          >
                            {objective}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Creative DNA - Mobile Only */}
                  <div className="lg:hidden space-y-2">
                    <Label className="text-white text-sm font-medium">{language === 'id' ? 'DNA Kreatif (maks 3)' : 'Creative DNA (max 3)'}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {dnaOptions.map(dna => (
                        <button
                          key={dna.id}
                          onClick={() => toggleDNA(dna.name)}
                          disabled={!contentPrefs.creative_dna.includes(dna.name) && contentPrefs.creative_dna.length >= 3}
                          className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                            contentPrefs.creative_dna.includes(dna.name)
                              ? "bg-emerald-500 text-white"
                              : contentPrefs.creative_dna.length >= 3
                              ? "bg-neutral-800 border border-neutral-700 text-neutral-500 cursor-not-allowed"
                              : "bg-neutral-800 border border-neutral-700 text-neutral-400 hover:border-emerald-500"
                          }`}
                        >
                          {dna.emoji} {dna.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button onClick={saveContentPreferences} disabled={saving} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 h-11 lg:h-12 px-8 lg:px-10 text-sm lg:text-base">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saveSuccess ? <Check className="w-4 h-4 mr-2" /> : null}
                    {saveSuccess ? (language === 'id' ? 'Tersimpan!' : 'Saved!') : (language === 'id' ? 'Simpan Preferensi' : 'Save Preferences')}
                  </Button>
                </div>

                {/* Right Side - Creative DNA (Desktop Only) */}
                <div className="hidden lg:block w-72 space-y-3 flex-shrink-0">
                  <Label className="text-white text-base font-medium">{language === 'id' ? 'DNA Kreatif (maks 3)' : 'Creative DNA (max 3)'}</Label>
                  <div className="space-y-2">
                    {dnaOptions.map(dna => (
                      <button
                        key={dna.id}
                        onClick={() => toggleDNA(dna.name)}
                        disabled={!contentPrefs.creative_dna.includes(dna.name) && contentPrefs.creative_dna.length >= 3}
                        className={`w-full px-4 py-3 rounded-lg text-base font-medium transition-all text-left ${
                          contentPrefs.creative_dna.includes(dna.name)
                            ? "bg-emerald-500 text-white"
                            : contentPrefs.creative_dna.length >= 3
                            ? "bg-neutral-800 border border-neutral-700 text-neutral-500 cursor-not-allowed"
                            : "bg-neutral-800 border border-neutral-700 text-neutral-400 hover:border-emerald-500"
                        }`}
                      >
                        {dna.emoji} {dna.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Voice Tab */}
            {activeTab === "voice" && (
              <div className="max-w-lg space-y-4">
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4">
                  <h3 className="text-white font-medium mb-2">
                    {language === 'id' ? 'Untuk Model WAN 2.5' : 'For WAN 2.5 Model'}
                  </h3>
                  <p className="text-white/70 text-sm">
                    {language === 'id'
                      ? 'Rekaman suara ini akan digunakan untuk clone suara kamu di video yang menggunakan model WAN 2.5 dengan fitur voice integration.'
                      : 'This voice recording will be used to clone your voice in videos using WAN 2.5 model with voice integration feature.'}
                  </p>
                </div>

                <VoiceRecorder
                  userId={user?.id || ''}
                  currentVoiceUrl={voiceUrl}
                  currentDuration={voiceDuration}
                  onVoiceSaved={(url, duration) => {
                    setVoiceUrl(url);
                    setVoiceDuration(duration);
                  }}
                  language={language as 'id' | 'en'}
                />
              </div>
            )}

            {/* Phone Tab */}
            {activeTab === "phone" && (
              <div className="max-w-md space-y-4">
                {profile.phone_verified ? (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-green-400 font-medium">{language === 'id' ? 'WhatsApp Terverifikasi' : 'WhatsApp Verified'}</p>
                        <p className="text-green-300/70 text-sm">{formatPhoneDisplay(profile.phone_number)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                        <p className="text-amber-400 text-sm">{language === 'id' ? 'Verifikasi WhatsApp untuk keamanan akun' : 'Verify WhatsApp for account security'}</p>
                      </div>
                    </div>

                    <div className="bg-[#1a1a24] border border-[#2b2b38] rounded-xl p-4 space-y-3">
                      {!otpSent ? (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-white text-sm">{language === 'id' ? 'Nomor WhatsApp' : 'WhatsApp Number'}</Label>
                            <PhoneInput
                              value={phoneInput}
                              onChange={(phone, dial, fullNum) => {
                                setPhoneInput(phone);
                                setDialCode(dial);
                                setFullPhoneNumber(fullNum);
                              }}
                              disabled={sendingOtp}
                              autoDetect={true}
                            />
                          </div>
                          {phoneError && <p className="text-red-400 text-sm">{phoneError}</p>}
                          <Button onClick={sendOtp} disabled={sendingOtp || cooldown > 0 || !fullPhoneNumber || fullPhoneNumber.length < 10} className="w-full h-9 bg-[#25D366] hover:bg-[#1ea952]">
                            {sendingOtp ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-2" />}
                            {cooldown > 0 ? `Resend (${cooldown}s)` : (language === 'id' ? 'Kirim Kode OTP' : 'Send OTP Code')}
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-white text-sm">{language === 'id' ? 'Masukkan Kode OTP' : 'Enter OTP Code'}</Label>
                            <Input
                              type="text"
                              value={otpCode}
                              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              className="bg-[#0a0a12] border-[#2b2b38] text-white h-12 text-center text-xl tracking-[0.5em] font-mono"
                              placeholder="000000"
                              maxLength={6}
                            />
                          </div>
                          {phoneSuccess && <p className="text-green-400 text-sm">{phoneSuccess}</p>}
                          {phoneError && <p className="text-red-400 text-sm">{phoneError}</p>}
                          <div className="flex gap-2">
                            <Button onClick={verifyOtp} disabled={verifyingOtp || otpCode.length !== 6} className="flex-1 h-9 bg-[#7c3aed] hover:bg-[#6d28d9]">
                              {verifyingOtp && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                              {language === 'id' ? 'Verifikasi' : 'Verify'}
                            </Button>
                            <Button onClick={sendOtp} disabled={sendingOtp || cooldown > 0} variant="outline" className="flex-1 h-9 border-[#2b2b38] text-white hover:bg-[#2a2a38]">
                              {cooldown > 0 ? `(${cooldown}s)` : 'Resend'}
                            </Button>
                          </div>
                          <button onClick={resetPhoneVerification} className="text-[#9ca3af] text-xs hover:text-white">← {language === 'id' ? 'Ganti nomor' : 'Change number'}</button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Password Tab */}
            {activeTab === "password" && (
              <div className="max-w-md space-y-4">
                <div className="space-y-2">
                  <Label className="text-white">{language === 'id' ? 'Password Saat Ini' : 'Current Password'}</Label>
                  <Input type="password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} className="bg-[#1a1a24] border-[#2b2b38] text-white h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">{language === 'id' ? 'Password Baru' : 'New Password'}</Label>
                  <Input type="password" value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} className="bg-[#1a1a24] border-[#2b2b38] text-white h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">{language === 'id' ? 'Konfirmasi Password Baru' : 'Confirm New Password'}</Label>
                  <Input type="password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} className="bg-[#1a1a24] border-[#2b2b38] text-white h-10" />
                </div>
                {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
                {passwordSuccess && <p className="text-green-400 text-sm">{language === 'id' ? 'Password berhasil diperbarui!' : 'Password updated!'}</p>}
                <Button onClick={changePassword} disabled={saving || !passwords.new || !passwords.confirm} className="bg-[#7c3aed] hover:bg-[#6d28d9] h-10 px-6">
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {language === 'id' ? 'Ubah Password' : 'Change Password'}
                </Button>
              </div>
            )}

            {/* Language Tab */}
            {activeTab === "language" && (
              <div className="max-w-md space-y-4">
                <div className="space-y-2">
                  <Label className="text-white">{language === 'id' ? 'Bahasa Tampilan' : 'Display Language'}</Label>
                  <select
                    value={profile.language}
                    onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                    className="w-full bg-[#1a1a24] border border-[#2b2b38] text-white h-10 rounded-lg px-3 focus:border-[#7c3aed] focus:outline-none"
                  >
                    <option value="en" className="bg-[#1a1a24]">English</option>
                    <option value="id" className="bg-[#1a1a24]">Bahasa Indonesia</option>
                    <option value="ta" className="bg-[#1a1a24]">Tamil</option>
                    <option value="hi" className="bg-[#1a1a24]">Hindi</option>
                  </select>
                </div>
                <Button onClick={saveProfile} disabled={saving} className="bg-[#7c3aed] hover:bg-[#6d28d9] h-10 px-6">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saveSuccess ? <Check className="w-4 h-4 mr-2" /> : null}
                  {saveSuccess ? (language === 'id' ? 'Tersimpan!' : 'Saved!') : (language === 'id' ? 'Simpan Bahasa' : 'Save Language')}
                </Button>
              </div>
            )}
          </div>
      </main>
    </div>
  );
};
