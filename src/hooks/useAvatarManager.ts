import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getAvatarWithCache } from '../lib/avatarCache';

export interface SavedAvatar {
  id: string;
  name: string;
  avatar_url: string;
  character_description: string | null; // Keep for fallback (non-gpt-image-1 providers)
  is_default: boolean;
}

export type AvatarOption = 'none' | 'profile' | 'saved' | 'upload';

interface UseAvatarManagerProps {
  userId: string | undefined;
  language: string;
}

interface UseAvatarManagerReturn {
  // State
  avatarOption: AvatarOption;
  characterDescription: string | null; // Fallback for providers without image reference
  selectedAvatarUrl: string | null;    // PRIMARY: for image reference (gpt-image-1)
  uploadedAvatarPreview: string | null;
  savedAvatars: SavedAvatar[];
  selectedSavedAvatar: SavedAvatar | null;
  cachedAvatarUrl: string | null;
  profileCharacterDesc: string | null;
  
  // Loading states
  loadingAvatars: boolean;
  analyzingAvatar: boolean; // Renamed: now means "uploading/processing"
  savingAvatar: boolean;
  
  // Modal state
  showNameModal: boolean;
  newAvatarName: string;
  pendingUploadFile: File | null;
  
  // Edit state
  editingAvatarId: string | null;
  editingName: string;
  
  // Refs
  fileInputRef: React.RefObject<HTMLInputElement>;
  avatarDropdownRef: React.RefObject<HTMLDivElement>;
  nameInputRef: React.RefObject<HTMLInputElement>;
  
  // Actions
  setAvatarDropdownOpen: (open: boolean) => void;
  avatarDropdownOpen: boolean;
  handleAvatarOptionSelect: (option: AvatarOption, savedAvatar?: SavedAvatar) => Promise<void>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSaveAvatar: () => Promise<void>;
  handleDeleteAvatar: (avatarId: string, e: React.MouseEvent) => Promise<void>;
  handleRenameAvatar: (avatarId: string) => Promise<void>;
  setShowNameModal: (show: boolean) => void;
  setNewAvatarName: (name: string) => void;
  setPendingUploadFile: (file: File | null) => void;
  setEditingAvatarId: (id: string | null) => void;
  setEditingName: (name: string) => void;
  getAvatarDisplayName: () => string;
  clearAvatar: () => void;
  
  // NEW: Analyze avatar on-demand (for fallback text description)
  analyzeAvatarOnDemand: () => Promise<string | null>;
}

export function useAvatarManager({ userId, language }: UseAvatarManagerProps): UseAvatarManagerReturn {
  // Avatar state
  const [avatarOption, setAvatarOption] = useState<AvatarOption>('profile');
  const [characterDescription, setCharacterDescription] = useState<string | null>(null);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(null); // NEW
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
  const [newAvatarName, setNewAvatarName] = useState('');
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [savingAvatar, setSavingAvatar] = useState(false);
  
  // Edit name state
  const [editingAvatarId, setEditingAvatarId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarDropdownRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Load profile data and saved avatars on mount
  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      
      setLoadingAvatars(true);
      
      try {
        // Load profile avatar
        const avatarUrl = await getAvatarWithCache(supabase, userId);
        setCachedAvatarUrl(avatarUrl);
        
        // Load character description from profile (fallback for non-image-reference providers)
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('character_description')
          .eq('user_id', userId)
          .single();
        
        if (profile?.character_description) {
          setProfileCharacterDesc(profile.character_description);
          setCharacterDescription(profile.character_description);
        }
        
        // Set profile avatar URL as default selected
        if (avatarUrl) {
          setUploadedAvatarPreview(avatarUrl);
          setSelectedAvatarUrl(avatarUrl); // NEW: set URL for image reference
        } else {
          setAvatarOption('none');
        }
        
        // Load saved avatars
        const { data: avatars, error } = await supabase
          .from('user_avatars')
          .select('id, name, avatar_url, character_description, is_default')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        if (!error && avatars) {
          setSavedAvatars(avatars);
          
          // If there's a default saved avatar, use it instead of profile
          const defaultAvatar = avatars.find(a => a.is_default);
          if (defaultAvatar) {
            setAvatarOption('saved');
            setSelectedSavedAvatar(defaultAvatar);
            setCharacterDescription(defaultAvatar.character_description);
            setUploadedAvatarPreview(defaultAvatar.avatar_url);
            setSelectedAvatarUrl(defaultAvatar.avatar_url); // NEW
          }
        }
      } catch (err) {
        console.error('Error loading avatar data:', err);
      } finally {
        setLoadingAvatars(false);
      }
    };
    
    loadData();
  }, [userId]);

  // Handle avatar option selection - NO MORE AUTO-ANALYZE
  const handleAvatarOptionSelect = useCallback(async (option: AvatarOption, savedAvatar?: SavedAvatar) => {
    if (option === 'none') {
      setAvatarOption('none');
      setCharacterDescription(null);
      setSelectedAvatarUrl(null); // NEW
      setUploadedAvatarPreview(null);
      setSelectedSavedAvatar(null);
      setAvatarDropdownOpen(false);
    } else if (option === 'profile') {
      // Just set the URL - no need to analyze anymore
      setAvatarOption('profile');
      setCharacterDescription(profileCharacterDesc); // Use cached if exists
      setSelectedAvatarUrl(cachedAvatarUrl); // NEW: URL for image reference
      setUploadedAvatarPreview(cachedAvatarUrl);
      setSelectedSavedAvatar(null);
      setAvatarDropdownOpen(false);
    } else if (option === 'saved' && savedAvatar) {
      setAvatarOption('saved');
      setSelectedSavedAvatar(savedAvatar);
      setCharacterDescription(savedAvatar.character_description);
      setSelectedAvatarUrl(savedAvatar.avatar_url); // NEW
      setUploadedAvatarPreview(savedAvatar.avatar_url);
      setAvatarDropdownOpen(false);
    } else if (option === 'upload') {
      fileInputRef.current?.click();
    }
  }, [profileCharacterDesc, cachedAvatarUrl]);

  // Handle file selection - show name modal first
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return;
    
    setPendingUploadFile(file);
    setNewAvatarName(`Avatar ${savedAvatars.length + 1}`);
    setShowNameModal(true);
    setAvatarDropdownOpen(false);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [savedAvatars.length]);

  // Save avatar to storage and database - NO ANALYZE, just upload
  const handleSaveAvatar = useCallback(async () => {
    if (!pendingUploadFile || !userId || !newAvatarName.trim()) return;
    
    setSavingAvatar(true);
    setAnalyzingAvatar(true); // Shows loading state
    
    try {
      // 1. Upload to storage
      const fileExt = pendingUploadFile.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, pendingUploadFile, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error(language === 'id' ? 'Bucket storage belum dibuat. Hubungi admin.' : 'Storage bucket not created. Contact admin.');
        }
        throw uploadError;
      }
      
      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      const avatarUrl = urlData.publicUrl;
      
      // 3. SKIP analyze-avatar - just save URL
      // character_description will be null initially
      // Can be analyzed on-demand later if needed for fallback providers
      
      // 4. Save to database (without character_description)
      const { data: savedData, error: dbError } = await supabase
        .from('user_avatars')
        .insert({
          user_id: userId,
          name: newAvatarName.trim(),
          storage_path: fileName,
          avatar_url: avatarUrl,
          character_description: null, // Will be analyzed on-demand if needed
          is_default: savedAvatars.length === 0
        })
        .select()
        .single();
      
      if (dbError) throw dbError;
      
      // 5. Update local state
      const newAvatar: SavedAvatar = {
        id: savedData.id,
        name: savedData.name,
        avatar_url: savedData.avatar_url,
        character_description: null,
        is_default: savedData.is_default
      };
      
      setSavedAvatars(prev => [newAvatar, ...prev]);
      setAvatarOption('saved');
      setSelectedSavedAvatar(newAvatar);
      setCharacterDescription(null);
      setSelectedAvatarUrl(avatarUrl); // NEW: set URL for image reference
      setUploadedAvatarPreview(avatarUrl);
      
      // Close modal
      setShowNameModal(false);
      setPendingUploadFile(null);
      setNewAvatarName('');
      
      console.log('[useAvatarManager] Avatar saved without analysis. URL ready for image reference:', avatarUrl);
      
    } catch (err: any) {
      console.error('Error saving avatar:', err);
      alert(err.message || 'Failed to save avatar');
    } finally {
      setSavingAvatar(false);
      setAnalyzingAvatar(false);
    }
  }, [pendingUploadFile, userId, newAvatarName, savedAvatars.length, language]);

  // NEW: Analyze avatar on-demand (for providers that don't support image reference)
  const analyzeAvatarOnDemand = useCallback(async (): Promise<string | null> => {
    // If we already have a description, return it
    if (characterDescription) return characterDescription;
    
    // If no avatar URL selected, return null
    if (!selectedAvatarUrl) return null;
    
    setAnalyzingAvatar(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-avatar', {
        body: { 
          image_url: selectedAvatarUrl, 
          user_id: userId, 
          save_to_profile: avatarOption === 'profile'
        }
      });
      
      if (error) throw error;
      
      const desc = data?.data?.character_description || null;
      
      if (desc) {
        setCharacterDescription(desc);
        
        // Update profile or saved avatar with the description
        if (avatarOption === 'profile') {
          setProfileCharacterDesc(desc);
        } else if (avatarOption === 'saved' && selectedSavedAvatar) {
          // Update in database
          await supabase
            .from('user_avatars')
            .update({ character_description: desc })
            .eq('id', selectedSavedAvatar.id);
          
          // Update local state
          setSavedAvatars(prev => prev.map(a => 
            a.id === selectedSavedAvatar.id ? { ...a, character_description: desc } : a
          ));
          setSelectedSavedAvatar(prev => prev ? { ...prev, character_description: desc } : null);
        }
      }
      
      return desc;
    } catch (err) {
      console.error('Error analyzing avatar on-demand:', err);
      return null;
    } finally {
      setAnalyzingAvatar(false);
    }
  }, [characterDescription, selectedAvatarUrl, userId, avatarOption, selectedSavedAvatar]);

  // Delete saved avatar
  const handleDeleteAvatar = useCallback(async (avatarId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(language === 'id' ? 'Hapus avatar ini?' : 'Delete this avatar?')) return;
    
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
        setSelectedAvatarUrl(null); // NEW
        setUploadedAvatarPreview(null);
      }
    } catch (err) {
      console.error('Error deleting avatar:', err);
    }
  }, [savedAvatars, selectedSavedAvatar, language]);

  // Rename avatar
  const handleRenameAvatar = useCallback(async (avatarId: string) => {
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
      setEditingName('');
    } catch (err) {
      console.error('Error renaming avatar:', err);
    }
  }, [editingName, selectedSavedAvatar]);

  const getAvatarDisplayName = useCallback(() => {
    if (avatarOption === 'none') return language === 'id' ? 'Tanpa Avatar' : 'No Avatar';
    if (avatarOption === 'profile') return language === 'id' ? 'Profil' : 'Profile';
    if (avatarOption === 'saved' && selectedSavedAvatar) return selectedSavedAvatar.name;
    return 'Avatar';
  }, [avatarOption, selectedSavedAvatar, language]);

  const clearAvatar = useCallback(() => {
    setAvatarOption('none');
    setCharacterDescription(null);
    setSelectedAvatarUrl(null); // NEW
    setUploadedAvatarPreview(null);
    setSelectedSavedAvatar(null);
  }, []);

  return {
    // State
    avatarOption,
    characterDescription,
    selectedAvatarUrl, // NEW: primary for image reference
    uploadedAvatarPreview,
    savedAvatars,
    selectedSavedAvatar,
    cachedAvatarUrl,
    profileCharacterDesc,
    
    // Loading states
    loadingAvatars,
    analyzingAvatar,
    savingAvatar,
    
    // Modal state
    showNameModal,
    newAvatarName,
    pendingUploadFile,
    
    // Edit state
    editingAvatarId,
    editingName,
    
    // Refs
    fileInputRef,
    avatarDropdownRef,
    nameInputRef,
    
    // Actions
    setAvatarDropdownOpen,
    avatarDropdownOpen,
    handleAvatarOptionSelect,
    handleFileSelect,
    handleSaveAvatar,
    handleDeleteAvatar,
    handleRenameAvatar,
    setShowNameModal,
    setNewAvatarName,
    setPendingUploadFile,
    setEditingAvatarId,
    setEditingName,
    getAvatarDisplayName,
    clearAvatar,
    analyzeAvatarOnDemand, // NEW: call this when provider doesn't support image reference
  };
}
