import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Logo } from "../../components/ui/logo";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { calculateSegmentDuration, getDurationExplanation } from "../../lib/segmentDuration";
import { getWordLimitStatus, getMaxWords, type LanguageCode } from "../../lib/wordLimits";
import {
  VisualPreviewGallery, GenerateBRollModal, type BRollOptions,
  LayoutPopover, LayoutIcon, parseVisualDirection, StructuredVDChips,
  CreatorOptionsModal, ImageGallery,
  StockImageModal, RegenerateModal, ReferenceImageModal,
} from "./components";
import {
  type Segment, type SegmentImage, type VideoSettings, type ImageJob,
  type ImageModelSettings,
  JOB_STATUS, IMAGE_MODELS, SUPPORTED_DURATIONS,
} from "./types";
import {
  RefreshCw, ImageIcon, Loader2,
  Sparkles, X, Maximize2, AlertCircle,
  CloudOff, Cloud, CheckCircle2, Download,
  ChevronDown, ChevronUp, Upload, Search, Camera,
  Scissors, Undo2, Merge,
  LayoutList, List, LayoutGrid, Settings2, Columns2
} from "lucide-react";

// Keyword extraction functions imported from lib/keywordExtractor.ts

/**
 * Snap duration to nearest supported video duration
 * This ensures frontend doesn't display unsupported durations like 3s, 4s, 6s, etc.
 */
function snapToSupportedDuration(duration: number): number {
  let nearest = SUPPORTED_DURATIONS[0];
  let minDiff = Math.abs(duration - nearest);

  for (const supported of SUPPORTED_DURATIONS) {
    const diff = Math.abs(duration - supported);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = supported;
    }
  }

  return nearest;
}

// Inner components extracted to ./components/ — see types.ts for shared types

export const ImageGeneration = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { language } = useLanguage();
  
  const [segments, setSegments] = useState<Segment[]>([]);
  const [currentTopic, setCurrentTopic] = useState("Your Video");
  const [videoSettings, setVideoSettings] = useState<VideoSettings | null>(null);
  const [characterDescription, setCharacterDescription] = useState<string>("");
  const [characterRefPng, setCharacterRefPng] = useState<string>("");
  const [userAvatarUrl, setUserAvatarUrl] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isBackgroundMode, setIsBackgroundMode] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0, completed: 0, failed: 0 });
  const [showBackgroundToast, setShowBackgroundToast] = useState(false);
  const processingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialSyncedRef = useRef(false);  // Track if initial images sync has been done
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [regenerateModal, setRegenerateModal] = useState<{ isOpen: boolean; segment: Segment | null }>({ isOpen: false, segment: null });
  
  // NEW: Image model selection state
  const [imageModels, setImageModels] = useState<ImageModelSettings>({ aRoll: 'auto', bRoll: 'auto' });
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  const [referenceImageModal, setReferenceImageModal] = useState<{ isOpen: boolean; segment: Segment | null }>({ isOpen: false, segment: null });
  const [bRollModal, setBRollModal] = useState<{ isOpen: boolean; segment: Segment | null }>({ isOpen: false, segment: null });
  const [optionsModal, setOptionsModal] = useState<{ isOpen: boolean; segment: Segment | null }>({ isOpen: false, segment: null });

  // Detect language from script text (for initial sync)
  const detectScriptLanguage = (scripts: string[]): string => {
    const combinedText = scripts.join(' ');
    const hindiPattern = /[\u0900-\u097F]/;
    const indonesianPattern = /\b(gue|lo|banget|sih|dong|nih|tuh|gitu|aja|udah|nggak|kan)\b/i;
    if (hindiPattern.test(combinedText)) return 'hi';
    if (indonesianPattern.test(combinedText)) return 'id';
    return 'en';
  };

  // Avatar info for voice prompt retrieval in VideoGeneration
  const [avatarOption, setAvatarOption] = useState<'none' | 'profile' | 'saved' | 'upload'>('none');
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Saved avatars for B-ROLL modal picker
  const [savedAvatars, setSavedAvatars] = useState<{ id: string; name: string; url: string }[]>([]);

  // Draft persistence state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'offline'>('idle');
  const saveStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // View mode state (full / compact / grid)
  const [viewMode, setViewMode] = useState<'full' | 'compact' | 'grid'>(() => {
    try { return (localStorage.getItem('sparkfluence_view_mode') as any) || 'full'; } catch { return 'full'; }
  });
  const [expandedSegmentId, setExpandedSegmentId] = useState<string | null>(null);
  const [fullViewColumns, setFullViewColumns] = useState<1 | 2>(() => {
    try { return localStorage.getItem('sparkfluence_full_view_cols') === '2' ? 2 : 1; } catch { return 1; }
  });

  // AI Script Shortener state
  const [shorteningSegmentId, setShorteningSegmentId] = useState<string | null>(null);
  // VD rewriting indicator (triggered by inline layout change)
  const [rewritingVDSegmentId, setRewritingVDSegmentId] = useState<string | null>(null);
  // Merge picker popover state
  const [mergePickerSegmentId, setMergePickerSegmentId] = useState<string | null>(null);


  const fromScriptLab = location.state?.fromScriptLab === true;
  const fromAdStudio = location.state?.fromAdStudio === true;

  const uiText = {
    title: language === 'id' ? 'Editor Video' : language === 'hi' ? 'वीडियो एडिटर' : 'Video Editor',
    duration: language === 'id' ? 'Durasi' : language === 'hi' ? 'अवधि' : 'Duration',
    generateAll: language === 'id' ? 'Generate Semua Gambar' : language === 'hi' ? 'सभी छवियां जनरेट करें' : 'Generate All Images',
    generating: language === 'id' ? 'Generating...' : language === 'hi' ? 'जनरेट हो रहा है...' : 'Generating...',
    script: language === 'id' ? 'Script (VO)' : language === 'hi' ? 'स्क्रिप्ट (VO)' : 'Script (VO)',
    visualDirection: language === 'id' ? 'Arahan Visual' : language === 'hi' ? 'विजुअल निर्देश' : 'Visual Direction',
    visualPreview: language === 'id' ? 'Preview Visual' : language === 'hi' ? 'विजुअल प्रीव्यू' : 'Visual Preview',
    creatorShot: language === 'id' ? 'Creator Shot' : language === 'hi' ? 'क्रिएटर शॉट' : 'Creator Shot',
    generateImage: language === 'id' ? 'Generate' : language === 'hi' ? 'जनरेट' : 'Generate',
    regenerate: language === 'id' ? 'Regenerate' : language === 'hi' ? 'रीजनरेट' : 'Regenerate',
    previous: language === 'id' ? 'Sebelumnya' : language === 'hi' ? 'पिछला' : 'Previous',
    next: language === 'id' ? 'Generate Video' : language === 'hi' ? 'वीडियो जनरेट करें' : 'Generate Videos',
    imagesRequired: language === 'id' ? 'Generate semua gambar dulu' : language === 'hi' ? 'पहले सभी छवियां जनरेट करें' : 'Generate all images first',
    loading: language === 'id' ? 'Memuat progress...' : language === 'hi' ? 'प्रगति लोड हो रहा है...' : 'Loading your progress...',
    step: language === 'id' ? 'Langkah' : language === 'hi' ? 'चरण' : 'Step',
    backgroundProcessing: language === 'id' 
      ? 'Gambar sedang di-generate di background. Anda bisa menutup browser atau melakukan aktivitas lain. Kami akan kirim notifikasi saat selesai!'
      : language === 'hi'
      ? 'छवियां बैकग्राउंड में जनरेट हो रही हैं। आप ब्राउज़र बंद कर सकते हैं। हम आपको सूचित करेंगे!'
      : 'Images are being generated in the background. You can close your browser or do other activities. We\'ll notify you when done!',
    resuming: language === 'id' ? 'Melanjutkan proses...' : language === 'hi' ? 'प्रक्रिया जारी...' : 'Resuming process...',
    processingComplete: language === 'id' ? 'Semua gambar selesai!' : language === 'hi' ? 'सभी छवियां तैयार!' : 'All images complete!',
  };

  useEffect(() => {
    return () => {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
      }
      if (saveStatusTimeoutRef.current) {
        clearTimeout(saveStatusTimeoutRef.current);
      }
    };
  }, []);

  const saveProgress = (updatedSegments: Segment[], topic: string, settings: VideoSettings | null) => {
    if (!sessionId) return;
    const progressData = {
      sessionId,
      topic,
      videoSettings: settings,
      segments: updatedSegments,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(`sparkfluence_video_progress_${sessionId}`, JSON.stringify(progressData));
    localStorage.setItem('sparkfluence_active_session', sessionId);
  };

  const loadProgress = (sid: string): any | null => {
    try {
      const saved = localStorage.getItem(`sparkfluence_video_progress_${sid}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrate old drafts: ensure isEnabled field exists
        if (parsed?.segments) {
          parsed.segments = parsed.segments.map((seg: any) => ({
            ...seg,
            isEnabled: seg.isEnabled ?? seg.loopEndEnabled ?? true,
          }));
        }
        return parsed;
      }
    } catch (err) {
      console.error('Error loading progress:', err);
    }
    return null;
  };

  // Draft Persistence: Save to Supabase DB (background, silent)
  const saveDraftToDB = useCallback(async (
    updatedSegments: Segment[],
    topic: string,
    settings: VideoSettings | null
  ) => {
    if (!sessionId || !user) return;

    setSaveStatus('saving');

    try {
      // Strip transient fields before saving
      const cleanSegments = updatedSegments.map(seg => ({
        ...seg,
        isGeneratingImage: false,
        imageError: null,
        images: [],        // Images stored separately in image_generation_jobs
        imageUrl: null,    // Reconstructed on load from image_generation_jobs
      }));

      const scriptData = {
        version: 2,
        segments: cleanSegments,
        topic,
        videoSettings: settings,
        viewMode,
        savedAt: new Date().toISOString(),
      };

      // Map language to allowed DB values (constraint: id, en, hi)
      const dbLanguage = ['id', 'en', 'hi'].includes(settings?.language || '')
        ? settings!.language
        : 'en';

      const { error } = await supabase
        .from('generation_sessions')
        .upsert({
          id: crypto.randomUUID(),  // Only used for new rows; ignored on conflict
          session_id: sessionId,
          user_id: user.id,
          topic: topic,
          script_data: scriptData,
          segments_count: updatedSegments.length,
          status: 'script_ready',
          language: dbLanguage,
          duration: settings?.duration || '60s',
          aspect_ratio: settings?.aspectRatio || '9:16',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'session_id' });

      if (error) {
        console.warn('[DraftSave] DB save failed:', error.message);
        setSaveStatus('offline');
      } else {
        setSaveStatus('saved');
        // Auto-hide "Saved" after 2s
        if (saveStatusTimeoutRef.current) clearTimeout(saveStatusTimeoutRef.current);
        saveStatusTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (err) {
      console.warn('[DraftSave] DB save error:', err);
      setSaveStatus('offline');
    }
  }, [sessionId, user, viewMode]);

  // Draft Persistence: Load from Supabase DB
  const loadDraftFromDB = useCallback(async (sid: string): Promise<{
    segments: Segment[];
    topic: string;
    videoSettings: VideoSettings | null;
    viewMode?: 'full' | 'compact' | 'grid';
  } | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('generation_sessions')
        .select('script_data, topic, status')
        .eq('session_id', sid)
        .single();

      if (error || !data?.script_data?.version || data.script_data.version < 2) {
        return null;
      }

      console.log('[DraftLoad] Loaded from DB, version:', data.script_data.version,
        'segments:', data.script_data.segments?.length);

      // Migrate old drafts: ensure isEnabled field exists (backward compat)
      const migratedSegments = (data.script_data.segments || []).map((seg: any) => ({
        ...seg,
        isEnabled: seg.isEnabled ?? seg.loopEndEnabled ?? true,
      }));

      return {
        segments: migratedSegments,
        topic: data.script_data.topic || data.topic || 'Your Video',
        videoSettings: data.script_data.videoSettings || null,
        viewMode: data.script_data.viewMode,
      };
    } catch (err) {
      console.warn('[DraftLoad] DB load error:', err);
      return null;
    }
  }, [user]);

  // Auto-save: localStorage + DB with 2s debounce
  useEffect(() => {
    if (sessionId && segments.length > 0 && currentTopic && currentTopic !== "Your Video") {
      const timeoutId = setTimeout(() => {
        saveProgress(segments, currentTopic, videoSettings);   // localStorage (instant)
        saveDraftToDB(segments, currentTopic, videoSettings);   // DB (background)
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [segments, sessionId, currentTopic, videoSettings, saveDraftToDB]);

  const checkExistingJobs = async (sid: string): Promise<ImageJob[] | null> => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('image_generation_jobs')
        .select('*')
        .eq('session_id', sid)
        .eq('user_id', user.id)
        .order('segment_number', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error checking existing jobs:', err);
      return null;
    }
  };

  const syncJobsWithSegments = (jobs: ImageJob[], currentSegments: Segment[]): Segment[] => {
    return currentSegments.map((seg, index) => {
      const job = jobs.find(j => j.segment_number === index + 1);
      if (job) {
        return {
          ...seg,
          imageUrl: job.image_url || seg.imageUrl,
          images: seg.images || [],          // Preserve existing images array
          imageError: job.error_message || null,
          isGeneratingImage: job.status === JOB_STATUS.PROCESSING,
          jobId: job.id
        };
      }
      return {
        ...seg,
        images: seg.images || []              // Ensure images array exists
      };
    });
  };

  // Fetch all images for a session (multi-image support)
  const fetchSegmentImages = async (sid: string): Promise<Map<number, SegmentImage[]>> => {
    if (!user) return new Map();

    try {
      const { data, error } = await supabase
        .from('image_generation_jobs')
        .select('*')
        .eq('session_id', sid)
        .eq('user_id', user.id)
        .order('segment_number', { ascending: true })
        .order('generation_number', { ascending: true });

      if (error) throw error;

      // Group by segment_number
      const imageMap = new Map<number, SegmentImage[]>();
      (data || []).forEach(job => {
        const segNum = job.segment_number;
        if (!imageMap.has(segNum)) imageMap.set(segNum, []);
        imageMap.get(segNum)!.push({
          id: job.id,
          imageUrl: job.image_url || '',
          generationNumber: job.generation_number || 1,
          sourceType: job.source_type || 'generated',
          isSelected: job.is_selected || false,
          scriptText: job.script_text || undefined,
          regenerationNotes: job.regeneration_notes || undefined,
          referenceImageUrl: job.reference_image_url || undefined,
          status: job.status,
          errorMessage: job.error_message || undefined,
          createdAt: job.created_at
        });
      });

      return imageMap;
    } catch (err) {
      console.error('Error fetching segment images:', err);
      return new Map();
    }
  };

  // Sync images with segments
  const syncImagesWithSegments = (imageMap: Map<number, SegmentImage[]>, currentSegments: Segment[]): Segment[] => {
    return currentSegments.map((seg, index) => {
      const images = imageMap.get(index + 1) || [];
      const selectedImage = images.find(img => img.isSelected);

      return {
        ...seg,
        images,
        imageUrl: selectedImage?.imageUrl || seg.imageUrl,
        isGeneratingImage: images.some(img => img.status === JOB_STATUS.PROCESSING), // Any processing
        imageError: images.find(img => img.status === JOB_STATUS.FAILED)?.errorMessage || null
      };
    });
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      try {
        // Fetch profile
        const { data } = await supabase
          .from('user_profiles')
          .select('character_description, avatar_url, character_ref_png')
          .eq('user_id', user.id)
          .single();

        if (data?.character_description) setCharacterDescription(data.character_description);
        if (data?.avatar_url) setUserAvatarUrl(data.avatar_url);
        if (data?.character_ref_png) setCharacterRefPng(data.character_ref_png);

        // Fetch saved avatars for B-ROLL modal picker
        const { data: avatars } = await supabase
          .from('user_avatars')
          .select('id, name, avatar_url')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (avatars && avatars.length > 0) {
          setSavedAvatars(avatars.map(a => ({
            id: a.id,
            name: a.name,
            url: a.avatar_url
          })));
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    const initializeEditor = async () => {
      const urlSessionId = searchParams.get('session');
      const stateData = location.state;
      
      let sid = urlSessionId || stateData?.sessionId || null;
      
      if (stateData?.segments && stateData.segments.length > 0) {
        sid = sid || `video_${Date.now()}`;
        setSessionId(sid);
        
        if (stateData.characterDescription) {
          setCharacterDescription(stateData.characterDescription);
        }
        
        const existingJobs = await checkExistingJobs(sid);
        const savedProgress = loadProgress(sid);

        let formattedSegments: Segment[];

        // Check if savedProgress has valid script data
        // If scripts are missing, prefer fresh data from navigation state
        const savedHasScripts = savedProgress?.segments?.some((s: Segment) => s.script && s.script.trim().length > 0);

        if (savedProgress && savedProgress.segments?.length > 0 && savedHasScripts) {
          // Normalize durations from saved progress to supported values
          formattedSegments = savedProgress.segments.map((seg: Segment) => ({
            ...seg,
            durationSeconds: snapToSupportedDuration(seg.durationSeconds || 8)
          }));
          setCurrentTopic(savedProgress.topic?.split('\n')[0].trim() || 'Your Video');
          setVideoSettings(savedProgress.videoSettings || stateData.videoSettings || null);
          console.log('[Init] Using savedProgress with scripts');
        } else {
          // Auto-calculate duration based on segment type and video duration
          const videoDuration = stateData.videoSettings?.duration || '60s';

          formattedSegments = stateData.segments.map((seg: any, index: number) => {
            const segmentType = seg.type || `SEGMENT_${index + 1}`;
            // Use duration from backend (post-processed) if available, otherwise auto-calculate
            const backendDuration = seg.duration_seconds || seg.durationSeconds;
            const calculatedDuration = backendDuration || calculateSegmentDuration(segmentType, videoDuration);
            // Always snap to supported durations (5s, 8s, 10s) to avoid unsupported values
            const segmentDuration = snapToSupportedDuration(calculatedDuration);

            return {
              id: String(index + 1),
              segmentId: seg.segment_id || `VIDEO-${String(index + 1).padStart(3, '0')}`,
              type: segmentType,
              timing: seg.timing || `${index * 8}-${(index + 1) * 8}s`,
              durationSeconds: segmentDuration,  // Normalized to supported duration (5s, 8s, 10s)
              shotType: seg.shot_type || 'B-ROLL',
              creatorAvatarUrl: seg.creator_avatar_url || undefined,
              emotion: seg.emotion || '',
              transition: seg.transition || 'Cut',
              script: seg.script_text || seg.script || '',
              visualDirection: seg.visual_direction || '',
              structuredVD: parseVisualDirection(seg.visual_direction || ''),
              creatorCostume: seg.creator_costume || '',  // Topic-appropriate outfit for CREATOR shots
              creatorAppearance: seg.creator_appearance || '',  // Generic face description fallback
              layout: 'full' as const,             // Default: full screen, user can change per segment
              loopEndEnabled: segmentType.toUpperCase() !== 'LOOP-END',
              isEnabled: segmentType.toUpperCase() !== 'LOOP-END',  // LOOP-END off by default
              imageUrl: null,
              images: [],                        // Initialize empty images array
              isGeneratingImage: false,
              imageError: null,
              optionsApplied: false,
            };
          });

          setCurrentTopic(stateData.topic?.split('\n')[0].trim() || 'Your Video');
          setVideoSettings(stateData.videoSettings || null);

          // Set avatar info from TopicSelection/ScriptLab
          // TopicSelection sends: selectedAvatarUrl, characterDescription
          // ScriptLab sends: avatarOption, avatarId, avatarUrl
          if (stateData.avatarOption) setAvatarOption(stateData.avatarOption);
          if (stateData.avatarId) setAvatarId(stateData.avatarId);
          // Support both keys: selectedAvatarUrl (from TopicSelection) and avatarUrl (from ScriptLab)
          const avatarUrlFromState = stateData.selectedAvatarUrl || stateData.avatarUrl;
          if (avatarUrlFromState) {
            setAvatarUrl(avatarUrlFromState);
            // Also set creatorAvatarUrl for all segments that don't have one yet
            formattedSegments = formattedSegments.map(seg => ({
              ...seg,
              creatorAvatarUrl: seg.creatorAvatarUrl || avatarUrlFromState
            }));
          }
        }
        
        if (existingJobs && existingJobs.length > 0) {
          formattedSegments = syncJobsWithSegments(existingJobs, formattedSegments);

          const hasPending = existingJobs.some(j => j.status === JOB_STATUS.PENDING || j.status === JOB_STATUS.PROCESSING);
          if (hasPending) {
            setIsBackgroundMode(true);
            setShowBackgroundToast(true);
            startBackgroundProcessing(sid);
          }
        }

        setSegments(formattedSegments);
        setIsLoaded(true);

        // Auto-detect language from actual script content and sync with videoSettings
        // This ensures the language selector always matches the script language
        const scripts = formattedSegments.map((seg: Segment) => seg.script).filter(Boolean);
        if (scripts.length > 0) {
          const detectedLang = detectScriptLanguage(scripts);
          console.log('[Init] Auto-detected script language:', detectedLang);
          const baseSettings = stateData.videoSettings || { duration: '60s', aspectRatio: '9:16', resolution: '720p' };
          setVideoSettings({ ...baseSettings, language: detectedLang });
        } else {
          setVideoSettings(stateData.videoSettings || null);
        }

        // Save progress to localStorage immediately after initialization from navigation state
        // This ensures script data is persisted for page refresh/reload scenarios
        const topicToSave = stateData.topic?.split('\n')[0].trim() || 'Your Video';
        const settingsToSave = stateData.videoSettings || null;
        const progressData = {
          sessionId: sid,
          topic: topicToSave,
          videoSettings: settingsToSave,
          segments: formattedSegments,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(`sparkfluence_video_progress_${sid}`, JSON.stringify(progressData));
        localStorage.setItem('sparkfluence_active_session', sid);
        console.log('[Init] Saved initial progress to localStorage with', formattedSegments.length, 'segments');

      } else if (sid) {
        const existingJobs = await checkExistingJobs(sid);

        // Priority: DB draft (cross-device) → localStorage (device-local) → rebuild from jobs
        const dbDraft = await loadDraftFromDB(sid);
        const savedProgress = dbDraft || loadProgress(sid);

        if (savedProgress && savedProgress.segments?.length > 0) {
          setSessionId(sid);
          let formattedSegments = savedProgress.segments;

          // Restore viewMode from DB draft if available
          if (dbDraft?.viewMode) {
            setViewMode(dbDraft.viewMode);
          }

          if (existingJobs && existingJobs.length > 0) {
            formattedSegments = syncJobsWithSegments(existingJobs, formattedSegments);

            const hasPending = existingJobs.some(j => j.status === JOB_STATUS.PENDING || j.status === JOB_STATUS.PROCESSING);
            if (hasPending) {
              setIsBackgroundMode(true);
              setShowBackgroundToast(true);
              startBackgroundProcessing(sid);
            }
          }

          setSegments(formattedSegments);
          setCurrentTopic(savedProgress.topic?.split('\n')[0].trim() || 'Your Video');

          // Auto-detect language from actual script content and sync with videoSettings
          const scripts = formattedSegments.map((seg: Segment) => seg.script).filter(Boolean);
          if (scripts.length > 0) {
            const detectedLang = detectScriptLanguage(scripts);
            console.log('[Init] Auto-detected script language from savedProgress:', detectedLang);
            const baseSettings = savedProgress.videoSettings || { duration: '60s', aspectRatio: '9:16', resolution: '720p' };
            setVideoSettings({ ...baseSettings, language: detectedLang });
          } else {
            setVideoSettings(savedProgress.videoSettings || null);
          }
          setIsLoaded(true);
          console.log('[Init] Loaded from', dbDraft ? 'DB' : 'localStorage');
        } else if (existingJobs && existingJobs.length > 0) {
          // ✅ FIX: Rebuild segments from database when localStorage is empty (new browser/computer)
          // This ensures images are not lost when switching devices
          console.log('[Init] No localStorage, rebuilding from database jobs:', existingJobs.length);
          setSessionId(sid);

          // Get unique segment numbers and rebuild basic segments structure
          const segmentNumbers = [...new Set(existingJobs.map(j => j.segment_number))].sort((a, b) => a - b);

          let formattedSegments: Segment[] = segmentNumbers.map(segNum => {
            const job = existingJobs.find(j => j.segment_number === segNum);
            return {
              id: String(segNum),
              segmentId: `VIDEO-${String(segNum).padStart(3, '0')}`,
              type: job?.segment_type || `SEGMENT_${segNum}`,
              timing: `${(segNum - 1) * 8}-${segNum * 8}s`,
              durationSeconds: 5,
              shotType: job?.segment_type?.includes('HOOK') || job?.segment_type?.includes('CTA') ? 'CREATOR' : 'B-ROLL',
              emotion: '',
              transition: 'Cut',
              script: '',
              visualDirection: '',
              layout: 'full' as const,
              loopEndEnabled: true,
              isEnabled: true,
              imageUrl: job?.image_url || null,
              images: [],
              isGeneratingImage: job?.status === JOB_STATUS.PROCESSING,
              imageError: job?.error_message || null,
              jobId: job?.id
            };
          });

          // Fetch all images for this session to populate images array
          const imageMap = await fetchSegmentImages(sid);
          if (imageMap.size > 0) {
            formattedSegments = syncImagesWithSegments(imageMap, formattedSegments);
          }

          const hasPending = existingJobs.some(j => j.status === JOB_STATUS.PENDING || j.status === JOB_STATUS.PROCESSING);
          if (hasPending) {
            setIsBackgroundMode(true);
            setShowBackgroundToast(true);
            startBackgroundProcessing(sid);
          }

          setSegments(formattedSegments);
          setCurrentTopic('Your Video');
          setIsLoaded(true);

          // Save to localStorage for future loads
          saveProgress(formattedSegments, 'Your Video', null);
        } else {
          navigate('/script-lab');
        }
      } else {
        const activeSessionId = localStorage.getItem('sparkfluence_active_session');
        if (activeSessionId) {
          const existingJobs = await checkExistingJobs(activeSessionId);
          // Priority: DB draft → localStorage
          const dbDraft = await loadDraftFromDB(activeSessionId);
          const savedProgress = dbDraft || loadProgress(activeSessionId);

          if (savedProgress && savedProgress.segments?.length > 0) {
            setSessionId(activeSessionId);
            let formattedSegments = savedProgress.segments;

            if (dbDraft?.viewMode) setViewMode(dbDraft.viewMode);

            if (existingJobs && existingJobs.length > 0) {
              formattedSegments = syncJobsWithSegments(existingJobs, formattedSegments);

              const hasPending = existingJobs.some(j => j.status === JOB_STATUS.PENDING || j.status === JOB_STATUS.PROCESSING);
              if (hasPending) {
                setIsBackgroundMode(true);
                setShowBackgroundToast(true);
                startBackgroundProcessing(activeSessionId);
              }
            }

            setSegments(formattedSegments);
            setCurrentTopic(savedProgress.topic?.split('\n')[0].trim() || 'Your Video');
            setVideoSettings(savedProgress.videoSettings || null);
            setIsLoaded(true);
            console.log('[Init] Loaded active session from', dbDraft ? 'DB' : 'localStorage');
          } else {
            navigate('/script-lab');
          }
        } else {
          navigate('/script-lab');
        }
      }
    };
    
    initializeEditor();
  }, [location.state, searchParams, navigate, user]);

  // NEW: Sync images array from database after initialization
  // This ensures VisualPreviewGallery displays all regenerated images on page refresh
  // ✅ FIX: Always sync once on load to ensure database is source of truth for images
  useEffect(() => {
    const syncImagesOnLoad = async () => {
      // Only run after initialization is complete and we have segments
      if (!sessionId || !isLoaded || !user || segments.length === 0) return;

      // Skip if any segment is currently generating (will be handled by background processing)
      if (segments.some(seg => seg.isGeneratingImage)) return;

      // ✅ FIX: Only skip if we've already done the initial sync for this session
      // This ensures we always fetch from database once, even if localStorage has stale data
      if (hasInitialSyncedRef.current) return;

      console.log('[InitSync] Syncing images from database...');
      hasInitialSyncedRef.current = true;  // Mark as synced to prevent re-runs

      try {
        const imageMap = await fetchSegmentImages(sessionId);

        if (imageMap.size > 0) {
          setSegments(prev => {
            const updated = syncImagesWithSegments(imageMap, prev);
            // Also update localStorage with the synced data
            saveProgress(updated, currentTopic, videoSettings);
            return updated;
          });
          console.log(`[InitSync] Synced ${imageMap.size} segments with images from database`);
        }
      } catch (err) {
        console.error('[InitSync] Failed to sync images:', err);
      }
    };

    syncImagesOnLoad();
  }, [sessionId, isLoaded, user, segments.length, currentTopic, videoSettings]); // Run when these change

  // Reset sync flag when session changes
  useEffect(() => {
    hasInitialSyncedRef.current = false;
  }, [sessionId]);

  const startBackgroundProcessing = useCallback((sid: string) => {
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
    }
    
    const processNext = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase.functions.invoke('generate-images', {
          body: {
            mode: 'process_single',
            session_id: sid,
            user_id: user.id,
            // Content language for B-ROLL ethnicity (id/hi/en)
            language: videoSettings?.language || 'id'
          }
        });
        
        if (error) {
          console.error('Process error:', error);
          return;
        }
        
        const result = data?.data;
        
        if (result?.summary) {
          setGenerationProgress({
            current: result.summary.completed + result.summary.failed,
            total: result.summary.total,
            completed: result.summary.completed,
            failed: result.summary.failed
          });
        }
        
        // ✅ FIX: When job completes, fetch ALL images for segment and update images array
        if (result?.job?.image_url) {
          const segmentNumber = result.job.segment_number;
          
          // Fetch all images for this segment from database
          const { data: segmentImages, error: fetchError } = await supabase
            .from('image_generation_jobs')
            .select('*')
            .eq('session_id', sid)
            .eq('segment_number', segmentNumber)
            .eq('user_id', user.id)
            .order('generation_number', { ascending: true });
          
          if (fetchError) {
            console.error('Error fetching segment images:', fetchError);
          }
          
          // Transform DB records to SegmentImage format
          const imagesArray: SegmentImage[] = (segmentImages || []).map(job => ({
            id: job.id,
            imageUrl: job.image_url || '',
            generationNumber: job.generation_number || 1,
            sourceType: job.source_type || 'generated',
            isSelected: job.is_selected || false,
            scriptText: job.script_text || undefined,
            regenerationNotes: job.regeneration_notes || undefined,
            referenceImageUrl: job.reference_image_url || undefined,
            status: job.status,
            errorMessage: job.error_message || undefined,
            createdAt: job.created_at
          }));
          
          // Find selected image or use latest completed
          const completedImages = imagesArray.filter(img => img.status === JOB_STATUS.COMPLETED && img.imageUrl);
          let selectedImage = completedImages.find(img => img.isSelected);
          
          // If no image is selected, auto-select the latest one
          if (!selectedImage && completedImages.length > 0) {
            const latestImage = completedImages[completedImages.length - 1];
            selectedImage = latestImage;
            
            // Update database to mark as selected
            await supabase
              .from('image_generation_jobs')
              .update({ is_selected: false })
              .eq('session_id', sid)
              .eq('segment_number', segmentNumber)
              .eq('user_id', user.id);
            
            await supabase
              .from('image_generation_jobs')
              .update({ is_selected: true })
              .eq('id', latestImage.id)
              .eq('user_id', user.id);
            
            // Update local array
            imagesArray.forEach(img => {
              img.isSelected = img.id === latestImage.id;
            });
          }
          
          setSegments(prev => {
            const updated = prev.map(seg => {
              if (seg.jobId === result.job.id || parseInt(seg.id) === segmentNumber) {
                return {
                  ...seg,
                  images: imagesArray,  // ✅ Update images array
                  imageUrl: selectedImage?.imageUrl || result.job.image_url,
                  isGeneratingImage: imagesArray.some(img => img.status === JOB_STATUS.PROCESSING),
                  imageError: null
                };
              }
              return seg;
            });
            saveProgress(updated, currentTopic, videoSettings);
            return updated;
          });
          
          console.log(`[BackgroundProcessing] Segment ${segmentNumber} updated with ${imagesArray.length} images`);
        }
        
        if (result?.all_complete) {
          setIsGeneratingAll(false);
          setIsBackgroundMode(false);
          setShowBackgroundToast(false);
          if (processingIntervalRef.current) {
            clearInterval(processingIntervalRef.current);
            processingIntervalRef.current = null;
          }
          
          // ✅ Final sync: Fetch ALL images for ALL segments
          const imageMap = await fetchSegmentImages(sid);
          setSegments(prev => syncImagesWithSegments(imageMap, prev));
          console.log('[BackgroundProcessing] All complete - final sync done');
        }
        
      } catch (err) {
        console.error('Background processing error:', err);
      }
    };
    
    processNext();
    processingIntervalRef.current = setInterval(processNext, 3000);
  }, [user, currentTopic, videoSettings]);

  const handleGenerateAllBackground = async () => {
    if (!user || !sessionId) return;
    
    const segmentsToGenerate = segments.filter(s =>
      !s.imageUrl && !s.isGeneratingImage &&
      s.isEnabled !== false // Skip disabled segments
    );
    if (segmentsToGenerate.length === 0) return;

    setIsGeneratingAll(true);
    setIsBackgroundMode(true);
    setShowBackgroundToast(true);
    setGenerationProgress({ current: 0, total: segmentsToGenerate.length, completed: 0, failed: 0 });

    try {
      // Use character_ref_png if available, otherwise fallback to avatar_url
      // Priority: character_ref_png > navigation state (newly uploaded) > database profile
      const referenceImage = characterRefPng || avatarUrl || userAvatarUrl || '';
      
      const segmentsData = segmentsToGenerate.map((seg, index) => {
        const originalIndex = segments.findIndex(s => s.id === seg.id);
        const isCreatorShot = seg.shotType === 'CREATOR'; // Only shot_type matters
        return {
          segment_id: seg.segmentId,
          segment_number: originalIndex + 1,
          segment_type: seg.type,
          shot_type: seg.shotType,
          emotion: seg.emotion,
          // ✅ FIX: Don't fallback to script - let edge function use visual_brief extraction
          visual_prompt: seg.visualDirection || '', // Empty = trigger visual brief extraction
          visual_direction: seg.visualDirection || '',
          script_text: seg.script, // ✅ CRITICAL: Script text for visual brief extraction (NOT as fallback prompt)
          // Creator costume & appearance from LLM (for topic-appropriate outfit)
          creator_costume: isCreatorShot ? (seg.creatorCostume || '') : null,
          creator_appearance: isCreatorShot ? (seg.creatorAppearance || '') : null,
          character_description: isCreatorShot ? characterDescription : null,
          character_ref_png: isCreatorShot ? referenceImage : null,
          // Reference image for B-ROLL or CREATOR
          reference_image_url: isCreatorShot ? referenceImage : seg.referenceImageUrl,
          // NEW: Include creator face in B-ROLL (uses flux-kontext-multi)
          include_creator_face: !isCreatorShot ? (seg.includeCreatorFace || false) : false,
          // Pass creator ref for B-ROLL with include_creator_face
          creator_ref_for_broll: (!isCreatorShot && seg.includeCreatorFace) ? referenceImage : null
        };
      });
      
      const { data, error } = await supabase.functions.invoke('generate-images', {
        body: {
          mode: 'create_jobs',
          user_id: user.id,
          session_id: sessionId,
          segments: segmentsData,
          topic: currentTopic,
          style: 'cinematic',
          aspect_ratio: videoSettings?.aspectRatio || '9:16',
          provider: 'auto',
          character_description: characterDescription,
          character_ref_png: referenceImage,
          // Model selection for B-ROLL segments (CREATOR always uses nano-banana-edit)
          broll_model: IMAGE_MODELS.bRoll[imageModels.bRoll].edgeKey,
          // Content language for B-ROLL ethnicity (id/hi/en)
          language: videoSettings?.language || 'id'
        }
      });

      if (error) throw error;

      if (data?.data?.jobs) {
        setSegments(prev => {
          const updated = prev.map(seg => {
            const job = data.data.jobs.find((j: any) => j.segment_number === parseInt(seg.id));
            if (job) {
              return { ...seg, jobId: job.id, isGeneratingImage: true };
            }
            return seg;
          });
          return updated;
        });
      }

      startBackgroundProcessing(sessionId);

    } catch (err: any) {
      console.error('Error creating jobs:', err);
      setIsGeneratingAll(false);
      setIsBackgroundMode(false);
      setShowBackgroundToast(false);
    }
  };

  const handleRegenerateAll = async () => {
    if (!user || !sessionId) return;
    
    // Confirm before regenerating
    const enabledCount = segments.filter(s => s.isEnabled !== false).length;
    const confirmMsg = language === 'id'
      ? `Regenerate semua ${enabledCount} gambar? Gambar lama akan diganti.`
      : `Regenerate all ${enabledCount} images? Existing images will be replaced.`;
    
    if (!window.confirm(confirmMsg)) return;

    // Clear all existing images first
    setSegments(prev => prev.map(seg => ({
      ...seg,
      imageUrl: null,
      imageError: null,
      isGeneratingImage: false,
      jobId: undefined
    })));

    // Delete existing jobs for this session
    try {
      await supabase
        .from('image_generation_jobs')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', user.id);
    } catch (err) {
      console.error('Error deleting old jobs:', err);
    }

    const activeSegments = segments.filter(s =>
      s.isEnabled !== false // Skip disabled segments
    );

    setIsGeneratingAll(true);
    setIsBackgroundMode(true);
    setShowBackgroundToast(true);
    setGenerationProgress({ current: 0, total: activeSegments.length, completed: 0, failed: 0 });

    try {
      // Use character_ref_png if available, otherwise fallback to avatar_url
      // Priority: character_ref_png > navigation state (newly uploaded) > database profile
      const referenceImage = characterRefPng || avatarUrl || userAvatarUrl || '';
      const segmentsData = activeSegments.map((seg, index) => {
        const isCreatorShot = seg.shotType === 'CREATOR'; // Only shot_type matters
        return {
          segment_id: seg.segmentId,
          segment_number: index + 1,
          segment_type: seg.type,
          shot_type: seg.shotType,
          emotion: seg.emotion,
          // ✅ FIX: Don't fallback to script - let edge function use visual_brief extraction
          visual_prompt: seg.visualDirection || '', // Empty = trigger visual brief extraction
          visual_direction: seg.visualDirection || '',
          script_text: seg.script, // ✅ CRITICAL: Script text for visual brief extraction (NOT as fallback prompt)
          character_description: isCreatorShot ? characterDescription : null,
          character_ref_png: isCreatorShot ? referenceImage : null,
          // Topic-appropriate costume for CREATOR segments (from LLM)
          creator_costume: isCreatorShot ? (seg.creatorCostume || '') : null,
          creator_appearance: isCreatorShot ? (seg.creatorAppearance || '') : null,
          // Reference image for B-ROLL
          reference_image_url: !isCreatorShot ? seg.referenceImageUrl : undefined,
          // NEW: Include creator face in B-ROLL (uses flux-kontext-multi)
          include_creator_face: !isCreatorShot ? (seg.includeCreatorFace || false) : false,
          // Pass creator ref for B-ROLL with include_creator_face
          creator_ref_for_broll: (!isCreatorShot && seg.includeCreatorFace) ? referenceImage : null
        };
      });

      const { data, error } = await supabase.functions.invoke('generate-images', {
        body: {
          mode: 'create_jobs',
          user_id: user.id,
          session_id: sessionId,
          segments: segmentsData,
          topic: currentTopic,
          style: 'cinematic',
          aspect_ratio: videoSettings?.aspectRatio || '9:16',
          provider: 'auto',
          character_description: characterDescription,
          character_ref_png: referenceImage,
          // Model selection for B-ROLL segments (CREATOR always uses nano-banana-edit)
          broll_model: IMAGE_MODELS.bRoll[imageModels.bRoll].edgeKey,
          // Content language for B-ROLL ethnicity (id/hi/en)
          language: videoSettings?.language || 'id'
        }
      });

      if (error) throw error;

      if (data?.data?.jobs) {
        setSegments(prev => {
          const updated = prev.map(seg => {
            const job = data.data.jobs.find((j: any) => j.segment_number === parseInt(seg.id));
            if (job) {
              return { ...seg, jobId: job.id, isGeneratingImage: true };
            }
            return seg;
          });
          return updated;
        });
      }

      startBackgroundProcessing(sessionId);

    } catch (err: any) {
      console.error('Error creating regenerate jobs:', err);
      setIsGeneratingAll(false);
      setIsBackgroundMode(false);
      setShowBackgroundToast(false);
    }
  };

  // AI Script Shortener - uses Gemini to shorten script while keeping context
  const handleShortenScript = useCallback(async (segmentId: string, currentScript: string, targetWords: number) => {
    setShorteningSegmentId(segmentId);

    try {
      // Map short code to full name for API (same as translate)
      const langMap: Record<string, string> = {
        'id': 'indonesian',
        'en': 'english',
        'hi': 'hindi',
        'fr': 'french',
      };
      const shortCode = videoSettings?.language || language || 'en';
      const scriptLang = langMap[shortCode] || 'english';

      const { data, error } = await supabase.functions.invoke('generate-script', {
        body: {
          mode: 'shorten',
          script: currentScript,
          target_words: targetWords,
          language: scriptLang,
        }
      });

      if (error) throw error;

      if (data?.shortened_script) {
        setSegments(prev => prev.map(seg =>
          seg.id === segmentId ? { ...seg, script: data.shortened_script, previousScript: currentScript, shortenedByAI: true } : seg
        ));
      } else if (data?.error) {
        console.error('[Shorten] API error:', data.error);
      }
    } catch (err) {
      console.error('[Shorten] Error:', err);
    } finally {
      setShorteningSegmentId(null);
    }
  }, [videoSettings?.language, language]);

  // Undo script — restore previous version (only available after AI Shorten)
  const handleUndoScript = useCallback((segmentId: string) => {
    setSegments(prev => prev.map(seg => {
      if (seg.id !== segmentId || !seg.previousScript) return seg;
      return { ...seg, script: seg.previousScript, previousScript: undefined, shortenedByAI: false };
    }));
  }, []);

  // Split segment into 2 sub-segments at natural break point
  const handleSplitSegment = useCallback((segmentId: string) => {
    setSegments(prev => {
      const idx = prev.findIndex(s => s.id === segmentId);
      if (idx === -1) return prev;
      const segment = prev[idx];

      // Don't split HOOK, CTA, LOOP-END
      const protectedTypes = ['HOOK', 'CTA', 'LOOP-END'];
      const baseType = segment.splitFromType || segment.type;
      if (protectedTypes.includes(baseType.toUpperCase())) return prev;

      const script = segment.script.trim();
      const words = script.split(/\s+/);
      if (words.length < 4) return prev; // Too short to split

      // Find best split point near midpoint — prefer clause boundaries
      const midpoint = Math.floor(script.length / 2);
      const breakPatterns = /[,!?;.—–]\s*/g;
      let bestBreak = -1;
      let bestDist = Infinity;
      let match;

      while ((match = breakPatterns.exec(script)) !== null) {
        const pos = match.index + match[0].length;
        const dist = Math.abs(pos - midpoint);
        if (dist < bestDist && pos > 10 && pos < script.length - 10) {
          bestDist = dist;
          bestBreak = pos;
        }
      }

      // If no good clause boundary, split at word boundary near midpoint
      if (bestBreak === -1) {
        const midWord = Math.floor(words.length / 2);
        let charCount = 0;
        for (let i = 0; i < midWord; i++) {
          charCount += words[i].length + 1;
        }
        bestBreak = charCount;
      }

      const scriptA = script.slice(0, bestBreak).trim();
      const scriptB = script.slice(bestBreak).trim();

      if (!scriptA || !scriptB) return prev;

      // Calculate proportional durations (min 5s each, max 8s)
      const wordsA = scriptA.split(/\s+/).length;
      const wordsB = scriptB.split(/\s+/).length;
      const totalWords = wordsA + wordsB;
      const totalDur = segment.durationSeconds;
      const durA = Math.max(5, Math.min(8, Math.round(totalDur * wordsA / totalWords)));
      const durB = Math.max(5, Math.min(8, Math.round(totalDur * wordsB / totalWords)));

      // Generate unique split group ID
      const groupId = segment.splitGroupId || `split_${Date.now()}`;

      // Create 2 new segments with proper naming (FORE → FORE-1, FORE-2)
      const segmentA: Segment = {
        ...segment,
        id: `${segment.id}`,
        type: `${baseType}-1`,
        script: scriptA,
        durationSeconds: durA,
        previousScript: segment.script, // Save original for merge back
        splitFromType: baseType,
        splitGroupId: groupId,
        splitOriginalDuration: segment.splitOriginalDuration || segment.durationSeconds,
        shortenedByAI: false,
        images: [],
        imageUrl: null,
        isGeneratingImage: false,
        imageError: null,
        optionsApplied: false,
      };

      const segmentB: Segment = {
        ...segment,
        id: `${parseInt(segment.id) + 0.5}`, // Fractional ID to insert between
        segmentId: `${segment.segmentId}-2`,
        type: `${baseType}-2`,
        script: scriptB,
        durationSeconds: durB,
        structuredVD: segment.structuredVD ? { ...segment.structuredVD } : undefined,
        previousScript: segment.script,
        splitFromType: baseType,
        splitGroupId: groupId,
        splitOriginalDuration: segment.splitOriginalDuration || segment.durationSeconds,
        shortenedByAI: false,
        images: [],
        imageUrl: null,
        isGeneratingImage: false,
        imageError: null,
        optionsApplied: false,
      };

      // Replace original with the 2 halves
      const newSegments = [...prev];
      newSegments.splice(idx, 1, segmentA, segmentB);

      // Renumber IDs sequentially
      return newSegments.map((seg, i) => ({
        ...seg,
        id: String(i + 1),
        originalIndex: i,
      }));
    });
  }, []);

  // Merge split sub-segments back into original segment
  const handleMergeSegments = useCallback((splitGroupId: string) => {
    setSegments(prev => {
      const splitIndices = prev.reduce<number[]>((acc, seg, i) => {
        if (seg.splitGroupId === splitGroupId) acc.push(i);
        return acc;
      }, []);

      if (splitIndices.length < 2) return prev;

      const firstSplit = prev[splitIndices[0]];
      const originalScript = firstSplit.previousScript || prev.filter(s => s.splitGroupId === splitGroupId).map(s => s.script).join(' ');
      const originalType = firstSplit.splitFromType || firstSplit.type.replace(/-\d+$/, '');
      const originalDuration = firstSplit.splitOriginalDuration || prev.filter(s => s.splitGroupId === splitGroupId).reduce((sum, s) => sum + s.durationSeconds, 0);

      // Create merged segment from first split
      const mergedSegment: Segment = {
        ...firstSplit,
        type: originalType,
        script: originalScript,
        durationSeconds: originalDuration,
        previousScript: undefined,
        shortenedByAI: false,
        splitFromType: undefined,
        splitGroupId: undefined,
        splitOriginalDuration: undefined,
        images: [],
        imageUrl: null,
        isGeneratingImage: false,
        imageError: null,
        optionsApplied: false,
      };

      // Remove all split segments and insert merged one at the first position
      const newSegments = [...prev];
      // Remove from end to start to maintain indices
      for (let i = splitIndices.length - 1; i >= 1; i--) {
        newSegments.splice(splitIndices[i], 1);
      }
      newSegments[splitIndices[0]] = mergedSegment;

      // Renumber IDs sequentially
      return newSegments.map((seg, i) => ({
        ...seg,
        id: String(i + 1),
        originalIndex: i,
      }));
    });
  }, []);

  // Merge any two sibling segments (same base type, for non-split indexed segments)
  const handleMergeWithSibling = useCallback((segmentId: string, siblingId: string) => {
    setSegments(prev => {
      const idx = prev.findIndex(s => s.id === segmentId);
      const sibIdx = prev.findIndex(s => s.id === siblingId);
      if (idx === -1 || sibIdx === -1) return prev;

      const segA = prev[Math.min(idx, sibIdx)];
      const segB = prev[Math.max(idx, sibIdx)];

      const mergedScript = [segA.script, segB.script].filter(Boolean).join('\n');
      const mergedDuration = snapToSupportedDuration(segA.durationSeconds + segB.durationSeconds);
      const baseType = segA.type.replace(/-\d+$/, '').replace(/_\d+$/, '');

      const mergedSegment: Segment = {
        ...segA,
        type: baseType,
        script: mergedScript,
        durationSeconds: mergedDuration,
        images: [],
        imageUrl: null,
        isGeneratingImage: false,
        imageError: null,
        optionsApplied: false,
        splitFromType: undefined,
        splitGroupId: undefined,
        splitOriginalDuration: undefined,
        previousScript: undefined,
        shortenedByAI: false,
      };

      const newSegments = prev.filter(s => s.id !== segmentId && s.id !== siblingId);
      newSegments.splice(Math.min(idx, sibIdx), 0, mergedSegment);

      return newSegments.map((seg, i) => ({
        ...seg,
        id: String(i + 1),
        originalIndex: i,
      }));
    });
    setMergePickerSegmentId(null);
  }, []);

  const handleGenerateImage = useCallback(async (segmentId: string): Promise<boolean> => {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) return false;

    setSegments(prev =>
      prev.map(seg =>
        seg.id === segmentId
          ? { ...seg, isGeneratingImage: true, imageError: null }
          : seg
      )
    );

    try {
      // Priority: segment-specific > navigation state (newly uploaded) > database profile
      const effectiveAvatarUrl = segment.creatorAvatarUrl || avatarUrl || userAvatarUrl || null;
      // Only CREATOR shot_type needs face reference
      const isCreatorShot = segment.shotType === 'CREATOR';
      const referenceImage = isCreatorShot ? (characterRefPng || effectiveAvatarUrl) : null;

      const requestBody = {
        segments: [{
          segment_number: parseInt(segmentId),
          // ✅ FIX: Don't fallback to script - let edge function use visual_brief extraction
          visual_prompt: segment.visualDirection || '', // Empty = trigger visual brief extraction
          visual_direction: segment.visualDirection || '',
          shot_type: segment.shotType,
          creator_avatar_url: effectiveAvatarUrl,
          emotion: segment.emotion,
          segment_type: segment.type,
          script_text: segment.script, // ✅ CRITICAL: Script text for visual brief extraction (NOT as fallback prompt)
          character_description: isCreatorShot ? characterDescription : null,
          character_ref_png: referenceImage,
          // Topic-appropriate costume for CREATOR segments (from LLM)
          creator_costume: isCreatorShot ? (segment.creatorCostume || '') : null,
          creator_appearance: isCreatorShot ? (segment.creatorAppearance || '') : null,
          // Reference image for B-ROLL
          reference_image_url: !isCreatorShot ? segment.referenceImageUrl : undefined,
          // NEW: Include creator face in B-ROLL (uses flux-kontext-multi)
          include_creator_face: !isCreatorShot ? (segment.includeCreatorFace || false) : false,
          // Pass creator ref for B-ROLL with include_creator_face
          creator_ref_for_broll: (!isCreatorShot && segment.includeCreatorFace) ? (characterRefPng || effectiveAvatarUrl) : null,
          // Layout for image composition hints
          layout: segment.layout || 'full'
        }],
        style: 'cinematic',
        aspect_ratio: videoSettings?.aspectRatio || '9:16',
        provider: 'auto',
        character_ref_png: referenceImage,
        // Model selection for B-ROLL segments (CREATOR always uses nano-banana-edit)
        broll_model: IMAGE_MODELS.bRoll[imageModels.bRoll].edgeKey,
        // Content language for B-ROLL ethnicity (id/hi/en)
        language: videoSettings?.language || 'id'
      };

      const { data, error } = await supabase.functions.invoke('generate-images', {
        body: requestBody
      });

      if (error) throw error;

      const imageUrl = data?.data?.images?.[0]?.image_url;
      const imageError = data?.data?.images?.[0]?.error;
      
      // Update job record in database if exists (sync status)
      if (imageUrl && sessionId && user && segment.jobId) {
        try {
          await supabase
            .from('image_generation_jobs')
            .update({ 
              status: JOB_STATUS.COMPLETED,
              image_url: imageUrl,
              error_message: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', segment.jobId)
            .eq('user_id', user.id);
        } catch (dbErr) {
          console.error('Error updating job status:', dbErr);
        }
      } else if (imageUrl && sessionId && user) {
        // Try to find and update by segment_number if no jobId
        try {
          await supabase
            .from('image_generation_jobs')
            .update({ 
              status: JOB_STATUS.COMPLETED,
              image_url: imageUrl,
              error_message: null,
              updated_at: new Date().toISOString()
            })
            .eq('session_id', sessionId)
            .eq('segment_number', parseInt(segmentId))
            .eq('user_id', user.id);
        } catch (dbErr) {
          console.error('Error updating job status by segment:', dbErr);
        }
      }
      
      setSegments(prev => {
        const updated = prev.map(seg =>
          seg.id === segmentId
            ? { ...seg, imageUrl: imageUrl || null, isGeneratingImage: false, imageError: imageError || null }
            : seg
        );
        saveProgress(updated, currentTopic, videoSettings);
        return updated;
      });

      return !!imageUrl;
    } catch (err: any) {
      console.error('Error generating image:', err);
      setSegments(prev =>
        prev.map(seg =>
          seg.id === segmentId
            ? { ...seg, isGeneratingImage: false, imageError: err.message }
            : seg
        )
      );
      return false;
    }
  }, [segments, avatarUrl, userAvatarUrl, characterDescription, characterRefPng, videoSettings, currentTopic, sessionId, user, imageModels]);

  const handleSelectImage = useCallback(async (imageId: string, segmentNumber: number) => {
    if (!user || !sessionId) return;

    try {
      // Update database: set is_selected=true for selected, false for others in same segment
      const { error } = await supabase
        .from('image_generation_jobs')
        .update({ is_selected: false })
        .eq('session_id', sessionId)
        .eq('segment_number', segmentNumber)
        .eq('user_id', user.id);

      if (error) throw error;

      // Now set the selected image to true
      const { error: selectError } = await supabase
        .from('image_generation_jobs')
        .update({ is_selected: true })
        .eq('id', imageId)
        .eq('user_id', user.id);

      if (selectError) throw selectError;

      // Update local state
      setSegments(prev => prev.map((seg, idx) => {
        if (idx + 1 !== segmentNumber) return seg;

        const updatedImages = seg.images.map(img => ({
          ...img,
          isSelected: img.id === imageId
        }));

        const selectedImage = updatedImages.find(img => img.isSelected);

        return {
          ...seg,
          images: updatedImages,
          imageUrl: selectedImage?.imageUrl || null
        };
      }));

    } catch (err) {
      console.error('Failed to select image:', err);
    }
  }, [user, sessionId]);

  // Delete image from gallery
  const handleDeleteImage = useCallback(async (imageId: string) => {
    if (!user || !sessionId) return;

    // Confirm deletion
    const confirmMsg = language === 'id'
      ? 'Hapus gambar ini?'
      : 'Delete this image?';
    if (!window.confirm(confirmMsg)) return;

    try {
      // Delete from database
      const { error } = await supabase
        .from('image_generation_jobs')
        .delete()
        .eq('id', imageId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state - remove the image
      setSegments(prev => prev.map(seg => {
        const updatedImages = seg.images.filter(img => img.id !== imageId);
        const wasSelected = seg.images.find(img => img.id === imageId)?.isSelected;

        // If deleted image was selected, select the first remaining
        let newSelectedImage = updatedImages.find(img => img.isSelected);
        if (wasSelected && updatedImages.length > 0 && !newSelectedImage) {
          updatedImages[0].isSelected = true;
          newSelectedImage = updatedImages[0];
        }

        return {
          ...seg,
          images: updatedImages,
          imageUrl: newSelectedImage?.imageUrl || null
        };
      }));

    } catch (err) {
      console.error('Failed to delete image:', err);
      alert(language === 'id' ? 'Gagal menghapus gambar' : 'Failed to delete image');
    }
  }, [user, sessionId, language]);

  const handleRegenerateWithNotes = useCallback(async (notes: string) => {
    if (!user || !sessionId || !regenerateModal.segment) return;

    const segment = regenerateModal.segment;
    const segmentNumber = parseInt(segment.id);

    // ✅ FIX Bug 1: Set loading state IMMEDIATELY before async operation
    // This ensures UI shows loading animation for CREATOR shots (HOOK/CTA)
    setSegments(prev => prev.map(seg =>
      seg.id === segment.id
        ? { ...seg, isGeneratingImage: true, imageError: null }
        : seg
    ));

    // Close modal immediately so user sees loading state
    setRegenerateModal({ isOpen: false, segment: null });

    try {
      // ✅ FIX Bug 2: Query database to get accurate max generation_number AND count
      // segment.images might be empty/stale, but DB has the truth
      const { data: existingJobs, error: queryError } = await supabase
        .from('image_generation_jobs')
        .select('id, generation_number')
        .eq('session_id', sessionId)
        .eq('segment_number', segmentNumber)
        .eq('user_id', user.id)
        .order('generation_number', { ascending: false });

      if (queryError) {
        console.error('Error querying existing jobs:', queryError);
      }

      // Get max generation number from DB (more reliable than local state)
      const dbMaxGenNumber = existingJobs?.[0]?.generation_number || 0;
      const localMaxGenNumber = segment.images?.length > 0 
        ? Math.max(...segment.images.map(img => img.generationNumber), 0) 
        : 0;
      const maxGenNumber = Math.max(dbMaxGenNumber, localMaxGenNumber);

      // Count from DB (all records, not just limit 1)
      const dbImageCount = existingJobs?.length || 0;
      const localImageCount = segment.images?.length || 0;
      const currentImageCount = Math.max(dbImageCount, localImageCount);

      console.log('[Regenerate CREATOR] Gen numbers - DB:', dbMaxGenNumber, 'Local:', localMaxGenNumber, 'Using:', maxGenNumber + 1, 'Count:', currentImageCount);
      if (currentImageCount >= 3) {
        setSegments(prev => prev.map(seg =>
          seg.id === segment.id
            ? { ...seg, isGeneratingImage: false }
            : seg
        ));
        alert(language === 'id' 
          ? 'Maksimal 3 gambar per segment. Hapus gambar lama dulu.'
          : 'Maximum 3 images per segment. Delete old images first.');
        return;
      }

      // Determine if CREATOR shot and prepare reference images
      // Priority: character_ref_png > navigation state (newly uploaded) > database profile
      const isCreatorShot = segment.shotType === 'CREATOR';
      const creatorRef = characterRefPng || avatarUrl || userAvatarUrl || null;

      // Build request body with ALL relevant fields for comprehensive prompt synthesis
      const requestBody: Record<string, any> = {
        mode: 'regenerate_single',
        user_id: user.id,
        session_id: sessionId,
        segment_number: segmentNumber,
        generation_number: maxGenNumber + 1,
        regeneration_notes: notes,  // ✅ Notes untuk prompt synthesis
        visual_prompt: segment.visualDirection,
        script_text: segment.script,
        segment_type: segment.type,
        shot_type: segment.shotType,
        emotion: segment.emotion,
        aspect_ratio: videoSettings?.aspectRatio || '9:16',
        // Content language for B-ROLL ethnicity (id/hi/en)
        language: videoSettings?.language || 'id',
        // Topic for contextual costume selection
        topic: currentTopic || '',
      };

      // Add CREATOR-specific fields
      if (isCreatorShot) {
        requestBody.character_description = characterDescription;
        requestBody.character_ref_png = creatorRef;
        // Topic-appropriate costume from LLM
        requestBody.creator_costume = segment.creatorCostume || '';
        requestBody.creator_appearance = segment.creatorAppearance || '';
      } else {
        // B-ROLL fields
        requestBody.reference_image_url = segment.referenceImageUrl || null;
        requestBody.include_creator_face = segment.includeCreatorFace || false;
        requestBody.creator_ref_for_broll = segment.includeCreatorFace ? creatorRef : null;
      }

      console.log('[Regenerate] Request:', {
        isCreator: isCreatorShot,
        hasNotes: !!notes,
        hasRef: !!(isCreatorShot ? creatorRef : segment.referenceImageUrl),
        includeCreatorFace: segment.includeCreatorFace,
      });

      // Call Edge Function to create new regeneration job
      const { data, error } = await supabase.functions.invoke('generate-images', {
        body: requestBody
      });

      if (error) throw error;

      console.log('Regeneration job created:', data);

      // Start background processing to poll for the new image
      startBackgroundProcessing(sessionId);

    } catch (err) {
      console.error('Regenerate failed:', err);
      // Reset loading state on error
      setSegments(prev => prev.map(seg =>
        seg.id === segment.id
          ? { ...seg, isGeneratingImage: false, imageError: 'Regeneration failed' }
          : seg
      ));
      alert('Failed to regenerate image. Please try again.');
    }
  }, [user, sessionId, regenerateModal.segment, videoSettings, startBackgroundProcessing, language]);

  // Handle reference image selection for B-ROLL segments
  const handleReferenceImageSelect = useCallback((imageUrl: string, source: 'unsplash' | 'pexels' | 'upload') => {
    if (!referenceImageModal.segment) return;
    
    setSegments(prev => prev.map(seg => 
      seg.id === referenceImageModal.segment!.id 
        ? { ...seg, referenceImageUrl: imageUrl, referenceImageSource: source }
        : seg
    ));
    
    setReferenceImageModal({ isOpen: false, segment: null, initialKeywords: '' });
  }, [referenceImageModal.segment]);

  // Rewrite visual direction via edge function when user applies options
  const rewriteVisualDirection = useCallback(async (
    segment: Segment,
    additionalNotes: string,
    includeCreatorFace: boolean,
    layout: string,
  ) => {
    const segmentId = segment.id;
    try {
      console.log(`[VD Rewrite] Rewriting VD for segment ${segmentId}...`);
      const { data, error } = await supabase.functions.invoke('rewrite-visual-direction', {
        body: {
          visual_direction: segment.visualDirection,
          script_text: segment.script,
          shot_type: segment.shotType,
          topic: currentTopic,
          additional_notes: additionalNotes,
          include_creator_face: includeCreatorFace,
          layout: layout,
          reference_image_description: '', // Could describe the ref image in future
          language: language || 'id',
        },
      });

      if (error) {
        console.error('[VD Rewrite] Edge function error:', error);
        return;
      }

      if (data?.success && data.data) {
        const { visual_direction: newVD, structured } = data.data;
        console.log(`[VD Rewrite] Success for segment ${segmentId}`);
        setSegments(prev => prev.map(seg => {
          if (seg.id !== segmentId) return seg;
          return {
            ...seg,
            visualDirection: newVD,
            structuredVD: structured,
          };
        }));
      }
    } catch (err) {
      console.error('[VD Rewrite] Exception:', err);
    }
  }, [currentTopic, language]);

  // Handle B-ROLL modal generation
  // Apply options from modal (B-ROLL or CREATOR) — saves to segment, triggers VD rewrite
  const handleApplyBRollOptions = useCallback((options: BRollOptions) => {
    if (!optionsModal.segment) return;
    const segment = optionsModal.segment;
    const segmentId = segment.id;

    setSegments(prev => prev.map(seg => {
      if (seg.id !== segmentId) return seg;
      return {
        ...seg,
        additionalNotes: options.additionalNotes,
        includeCreatorFace: options.includeCreatorFace,
        referenceImageUrl: options.referenceImages[0]?.url || seg.referenceImageUrl,
        referenceImageSource: options.referenceImages[0]?.source || seg.referenceImageSource,
        layout: options.layout,
        optionsApplied: true,
      };
    }));

    setOptionsModal({ isOpen: false, segment: null });

    // Trigger VD rewrite in background
    rewriteVisualDirection(segment, options.additionalNotes, options.includeCreatorFace, options.layout);
  }, [optionsModal.segment, rewriteVisualDirection]);

  // Apply CREATOR options (simplified — notes only)
  const handleApplyCreatorOptions = useCallback((notes: string) => {
    if (!optionsModal.segment) return;
    const segment = optionsModal.segment;
    const segmentId = segment.id;

    setSegments(prev => prev.map(seg => {
      if (seg.id !== segmentId) return seg;
      return {
        ...seg,
        additionalNotes: notes,
        optionsApplied: true,
      };
    }));

    setOptionsModal({ isOpen: false, segment: null });

    // Trigger VD rewrite in background
    rewriteVisualDirection(segment, notes, false, segment.layout);
  }, [optionsModal.segment, rewriteVisualDirection]);

  const handleBRollGenerate = useCallback(async (options: {
    additionalNotes: string;
    includeCreatorFace: boolean;
    referenceImages: { url: string; source: 'unsplash' | 'pexels' | 'upload'; photographer?: string }[];
    selectedAvatarUrl?: string;  // NEW: Avatar selected in modal
  }) => {
    if (!user || !sessionId || !bRollModal.segment) return;

    const segment = bRollModal.segment;
    const segmentNumber = parseInt(segment.id);
    const isFirstGeneration = !segment.images || segment.images.length === 0;

    // Max 3 images validation
    const currentImageCount = segment.images?.length || 0;
    if (currentImageCount >= 3) {
      alert(language === 'id' 
        ? 'Maksimal 3 gambar per segment. Hapus gambar lama dulu.'
        : 'Maximum 3 images per segment. Delete old images first.');
      return;
    }

    // Close modal immediately
    setBRollModal({ isOpen: false, segment: null });

    // Update segment state to show loading
    setSegments(prev => prev.map(seg =>
      seg.id === segment.id
        ? { 
            ...seg, 
            isGeneratingImage: true, 
            imageError: null,
            includeCreatorFace: options.includeCreatorFace,
            // Store first reference image for backward compatibility
            referenceImageUrl: options.referenceImages[0]?.url || seg.referenceImageUrl,
            referenceImageSource: options.referenceImages[0]?.source || seg.referenceImageSource
          }
        : seg
    ));

    try {
      // Priority: modal selection > segment-specific > session avatar > profile avatar
      // options.selectedAvatarUrl is the avatar user explicitly selected in the modal picker
      const creatorRef = options.selectedAvatarUrl || segment.creatorAvatarUrl || avatarUrl || userAvatarUrl || null;
      const maxGenNumber = Math.max(...(segment.images?.map(img => img.generationNumber) || []), 0);

      // Build request body
      const requestBody: Record<string, any> = {
        mode: isFirstGeneration ? 'create_jobs' : 'regenerate_single',
        user_id: user.id,
        session_id: sessionId,
        segment_number: segmentNumber,
        generation_number: maxGenNumber + 1,
        regeneration_notes: options.additionalNotes || '',
        visual_prompt: segment.visualDirection || '',
        visual_direction: segment.visualDirection || '',
        script_text: segment.script,
        segment_type: segment.type,
        shot_type: segment.shotType,
        emotion: segment.emotion,
        aspect_ratio: videoSettings?.aspectRatio || '9:16',
        // Topic for contextual costume selection
        topic: currentTopic || '',
        // B-ROLL specific
        include_creator_face: options.includeCreatorFace,
        creator_ref_for_broll: options.includeCreatorFace ? creatorRef : null,
        // Reference images (use first one for now, multi-ref support coming)
        reference_image_url: options.referenceImages[0]?.url || null,
        // For create_jobs mode
        segments: isFirstGeneration ? [{
          segment_id: segment.segmentId,
          segment_number: segmentNumber,
          segment_type: segment.type,
          shot_type: segment.shotType,
          emotion: segment.emotion,
          visual_prompt: segment.visualDirection || '',
          visual_direction: segment.visualDirection || '',
          script_text: segment.script,
          reference_image_url: options.referenceImages[0]?.url || null,
          include_creator_face: options.includeCreatorFace,
          creator_ref_for_broll: options.includeCreatorFace ? creatorRef : null,
        }] : undefined,
        broll_model: IMAGE_MODELS.bRoll[imageModels.bRoll].edgeKey,
        // Content language for B-ROLL ethnicity (id/hi/en)
        language: videoSettings?.language || 'id'
      };

      console.log('[BRollGenerate] Request:', {
        isFirst: isFirstGeneration,
        hasNotes: !!options.additionalNotes,
        refCount: options.referenceImages.length,
        includeCreatorFace: options.includeCreatorFace,
        creatorRef: creatorRef ? creatorRef.substring(0, 60) + '...' : 'NULL',
        // Priority: modal > segment > session > profile
        modalSelectedAvatar: options.selectedAvatarUrl ? 'SET' : 'NULL',
        segmentCreatorAvatarUrl: segment.creatorAvatarUrl ? 'SET' : 'NULL',
        sessionAvatarUrl: avatarUrl ? 'SET' : 'NULL',
        profileAvatarUrl: userAvatarUrl ? 'SET' : 'NULL',
      });

      const { data, error } = await supabase.functions.invoke('generate-images', {
        body: requestBody
      });

      if (error) throw error;

      console.log('B-ROLL job created:', data);

      // Update jobId if returned
      if (data?.data?.jobs?.[0]?.id || data?.data?.job?.id) {
        const jobId = data?.data?.jobs?.[0]?.id || data?.data?.job?.id;
        setSegments(prev => prev.map(seg =>
          seg.id === segment.id ? { ...seg, jobId } : seg
        ));
      }

      // Start background processing
      startBackgroundProcessing(sessionId);

    } catch (err) {
      console.error('B-ROLL generate failed:', err);
      setSegments(prev => prev.map(seg =>
        seg.id === segment.id
          ? { ...seg, isGeneratingImage: false, imageError: 'Generation failed' }
          : seg
      ));
      alert(language === 'id' ? 'Gagal generate gambar' : 'Failed to generate image');
    }
  }, [user, sessionId, bRollModal.segment, videoSettings, avatarUrl, userAvatarUrl, imageModels, startBackgroundProcessing, language]);

  const handlePrevious = () => {
    saveProgress(segments, currentTopic, videoSettings);

    if (fromScriptLab) {
      navigate("/script-lab");
    } else if (fromAdStudio) {
      navigate("/ad-studio");
    } else {
      navigate("/script-lab", { state: { returning: true } });
    }
  };

  const handleNext = () => {
    const enabledSegs = segments.filter(s => s.isEnabled !== false);
    const allHaveImages = enabledSegs.every(seg => seg.imageUrl);
    if (!allHaveImages) {
      alert(uiText.imagesRequired);
      return;
    }

    navigate("/video-generation", {
      state: {
        sessionId,
        segments: enabledSegs,
        topic: currentTopic,
        videoSettings,
        // Avatar info for voice prompt retrieval
        avatarOption,
        avatarId,
        avatarUrl
      }
    });
  };

  const enabledSegments = segments.filter(s => s.isEnabled !== false);
  const totalDuration = enabledSegments.reduce((sum, seg) => sum + seg.durationSeconds, 0);
  const allHaveImages = enabledSegments.every(seg => seg.imageUrl);
  const imagesGenerated = enabledSegments.filter(s => s.imageUrl).length;


  // Download helper function
  const handleDownloadImage = async (imageUrl: string, segmentType: string, segmentId: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Detect actual content type and set correct extension
      const contentType = blob.type || response.headers.get('content-type') || '';
      let extension = 'png'; // default
      
      if (contentType.includes('jpeg') || contentType.includes('jpg')) {
        extension = 'jpg';
      } else if (contentType.includes('png')) {
        extension = 'png';
      } else if (contentType.includes('webp')) {
        extension = 'webp';
      } else if (contentType.includes('gif')) {
        extension = 'gif';
      } else if (contentType.includes('mp4') || contentType.includes('video')) {
        // This is a video, not an image - warn user
        console.warn('URL contains video, not image:', imageUrl);
        extension = 'mp4';
      }
      
      // Also check URL extension as fallback
      const urlLower = imageUrl.toLowerCase();
      if (urlLower.includes('.mp4') || urlLower.includes('video')) {
        console.warn('URL appears to be video:', imageUrl);
        extension = 'mp4';
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentTopic.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}_${segmentType}_${segmentId}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback: open in new tab
      window.open(imageUrl, '_blank');
    }
  };

  // Helper: find sibling segments with the same base type (for merge picker)
  const getSiblingSegments = (segment: Segment): Segment[] => {
    const baseType = segment.type.replace(/-\d+$/, '').replace(/_\d+$/, '');
    return segments.filter(s => {
      if (s.id === segment.id) return false;
      const sBase = s.type.replace(/-\d+$/, '').replace(/_\d+$/, '');
      return sBase === baseType;
    });
  };

  const groupedSegments = fullViewColumns === 2
    // 2-column mode: each segment is its own cell (no BODY grouping)
    ? segments.map((seg, i) => ({ isBodyGroup: false, segments: [{ ...seg, originalIndex: i }] }))
    // 1-column mode: group consecutive BODY segments together
    : segments.reduce((acc, segment, index) => {
        const baseType = segment.type.replace(/-\d+$/, '').replace(/_\d+$/, '');
        const isBody = baseType === 'BODY' || segment.type.startsWith('BODY');

        if (isBody) {
          const lastGroup = acc[acc.length - 1];
          if (lastGroup && lastGroup.isBodyGroup) {
            lastGroup.segments.push({ ...segment, originalIndex: index });
          } else {
            acc.push({ isBodyGroup: true, segments: [{ ...segment, originalIndex: index }] });
          }
        } else {
          acc.push({ isBodyGroup: false, segments: [{ ...segment, originalIndex: index }] });
        }
        return acc;
      }, [] as { isBodyGroup: boolean; segments: (Segment & { originalIndex: number })[] }[]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-text-secondary">{uiText.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page p-4 sm:p-6">
      <div className={`mx-auto ${viewMode === 'full' && fullViewColumns === 2 ? 'max-w-screen-2xl' : 'max-w-5xl'}`}>
        {/* Background Processing Toast */}
        {showBackgroundToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
            <div className="bg-gradient-to-r from-primary/90 to-accent-pink/90 backdrop-blur-lg rounded-xl p-4 shadow-2xl border border-white/10">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Cloud className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-white font-semibold text-sm">
                      {language === 'id' ? 'Proses di Background' : 'Background Processing'}
                    </h4>
                    <button 
                      onClick={() => setShowBackgroundToast(false)}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      <X className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                  <p className="text-white/80 text-xs leading-relaxed mb-3">
                    {uiText.backgroundProcessing}
                  </p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-white/60">
                      <span>{generationProgress.completed}/{generationProgress.total} complete</span>
                      {generationProgress.failed > 0 && (
                        <span className="text-red-300">{generationProgress.failed} failed</span>
                      )}
                    </div>
                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white rounded-full transition-all duration-500"
                        style={{ width: `${generationProgress.total > 0 ? (generationProgress.completed / generationProgress.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <div className="flex gap-2 mb-6 max-w-md mx-auto">
            {[1, 2, 3, 4, 5, 6].map((step) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  step <= 4 ? "bg-primary" : "bg-surface"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Title & Generate All Button */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-1 line-clamp-2">
                {currentTopic}
              </h1>
              <div className="flex items-center gap-3">
                <p className="text-text-muted text-sm">
                  {uiText.step} 4/6 • {uiText.duration}: {totalDuration}s
                  {videoSettings && ` • ${videoSettings.aspectRatio}`}
                </p>
                {/* Save Indicator */}
                {saveStatus === 'saving' && (
                  <span className="flex items-center gap-1 text-[10px] text-text-muted">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {language === 'id' ? 'Menyimpan...' : 'Saving...'}
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="flex items-center gap-1 text-[10px] text-green-500">
                    <CheckCircle2 className="w-3 h-3" />
                    {language === 'id' ? 'Tersimpan' : 'Saved'}
                  </span>
                )}
                {saveStatus === 'offline' && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-500">
                    <CloudOff className="w-3 h-3" />
                    Offline
                  </span>
                )}
                {/* View Mode Toggle */}
                <div className="flex items-center gap-0.5 border border-border-default rounded-lg p-0.5 ml-auto sm:ml-0">
                  <button
                    onClick={() => { setViewMode('full'); localStorage.setItem('sparkfluence_view_mode', 'full'); setExpandedSegmentId(null); }}
                    className={`p-1 rounded transition-colors ${viewMode === 'full' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary'}`}
                    title="Full View"
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setViewMode('compact'); localStorage.setItem('sparkfluence_view_mode', 'compact'); setExpandedSegmentId(null); }}
                    className={`p-1 rounded transition-colors ${viewMode === 'compact' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary'}`}
                    title="Compact View"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setViewMode('grid'); localStorage.setItem('sparkfluence_view_mode', 'grid'); setExpandedSegmentId(null); }}
                    className={`p-1 rounded transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary'}`}
                    title="Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Full View Column Toggle (1-col / 2-col) */}
                {viewMode === 'full' && (
                  <div className="flex items-center gap-0.5 border-l border-border-default pl-1 ml-0.5">
                    <button
                      onClick={() => { setFullViewColumns(1); localStorage.setItem('sparkfluence_full_view_cols', '1'); }}
                      className={`p-1 rounded transition-colors ${fullViewColumns === 1 ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary'}`}
                      title="1 Column"
                    >
                      <LayoutList className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setFullViewColumns(2); localStorage.setItem('sparkfluence_full_view_cols', '2'); }}
                      className={`p-1 rounded transition-colors ${fullViewColumns === 2 ? 'bg-primary text-white' : 'text-text-muted hover:text-text-primary'}`}
                      title="2 Columns"
                    >
                      <Columns2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Generate All Images Button + Model Dropdown */}
            <div className="flex gap-2">

              {/* Model Selection Dropdown */}
              <div className="relative">
                <Button
                  onClick={() => {
                    setShowModelDropdown(!showModelDropdown);
                  }}
                  variant="outline"
                  className="h-12 px-4 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">Models</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
                </Button>

                {showModelDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border-default rounded-xl shadow-lg z-50 p-4">
                    <h4 className="text-sm font-semibold text-text-primary mb-3">Image Model Selection</h4>

                    {/* A-ROLL Model */}
                    <div className="mb-3">
                      <label className="text-xs text-text-muted mb-1 block">A-ROLL (HOOK, CTA)</label>
                      <select
                        value={imageModels.aRoll}
                        onChange={(e) => setImageModels(prev => ({ ...prev, aRoll: e.target.value as any }))}
                        className="w-full bg-surface border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary"
                      >
                        {Object.entries(IMAGE_MODELS.aRoll).map(([key, model]) => (
                          <option key={key} value={key}>{model.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* B-ROLL Model */}
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">B-ROLL (FORE, BODY, PEAK)</label>
                      <select
                        value={imageModels.bRoll}
                        onChange={(e) => setImageModels(prev => ({ ...prev, bRoll: e.target.value as any }))}
                        className="w-full bg-surface border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary"
                      >
                        {Object.entries(IMAGE_MODELS.bRoll).map(([key, model]) => (
                          <option key={key} value={key}>{model.label}</option>
                        ))}
                      </select>
                    </div>

                    <p className="text-xs text-text-muted mt-3">Selected models apply to new generations</p>
                  </div>
                )}
              </div>
              
              <Button
                onClick={allHaveImages ? handleRegenerateAll : handleGenerateAllBackground}
                disabled={isGeneratingAll || isBackgroundMode}
                className={`h-12 px-6 font-medium flex items-center gap-2 ${
                  isBackgroundMode
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gradient-to-r from-primary to-accent-pink hover:opacity-90"
                } text-white`}
              >
                {isBackgroundMode ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{generationProgress.completed}/{generationProgress.total}</span>
                  </>
                ) : allHaveImages ? (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    <span>{language === 'id' ? 'Regenerate Semua' : 'Regenerate All'} ({enabledSegments.length})</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>{uiText.generateAll} ({enabledSegments.length - imagesGenerated})</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Segments — Compact View */}
        {viewMode === 'compact' && (
          <div className="space-y-1.5">
            {segments.map((segment, index) => {
              const isExpanded = expandedSegmentId === segment.id;
              const isCreatorShot = segment.shotType === 'CREATOR';
              const isDisabled = !segment.isEnabled;
              const wordStatus = getWordLimitStatus(
                segment.script,
                segment.durationSeconds,
                (videoSettings?.language || language || 'id') as LanguageCode
              );

              if (isExpanded) {
                // Render full card for expanded segment
                return (
                  <div key={segment.id} className="relative">
                    <button
                      onClick={() => setExpandedSegmentId(null)}
                      className="absolute top-2 right-2 z-10 p-1 bg-surface border border-border-default rounded hover:bg-muted/50"
                      title="Collapse"
                    >
                      <ChevronUp className="w-4 h-4 text-text-muted" />
                    </button>
                    {/* Reuse full card — rendered inline below via groupedSegments */}
                    <div className="bg-card border rounded-xl shadow-theme border-border-default">
                      <div className="p-3 sm:p-4 border-b border-border-default">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold ${segment.imageUrl ? 'bg-green-600' : 'bg-primary'}`}>
                            {segment.imageUrl ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                          </div>
                          <span className="text-text-primary font-semibold text-sm">{segment.type}</span>
                          <button
                            onClick={() => setSegments(prev => prev.map(seg => seg.id === segment.id ? { ...seg, isEnabled: !seg.isEnabled, loopEndEnabled: !seg.isEnabled } : seg))}
                            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${segment.isEnabled ? 'bg-green-500/20 text-green-400 border-green-500/40' : 'bg-gray-500/20 text-gray-500 border-gray-500/40'}`}
                            title={segment.isEnabled
                              ? (language === 'id' ? 'Klik untuk nonaktifkan segment' : 'Click to disable segment')
                              : (language === 'id' ? 'Klik untuk aktifkan segment' : 'Click to enable segment')
                            }
                          >
                            {segment.isEnabled ? 'ON' : 'OFF'}
                          </button>
                          <span className="text-text-muted text-xs">{segment.durationSeconds}s</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${isCreatorShot ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'}`}>{segment.shotType}</span>
                        </div>
                      </div>
                      <div className={`p-3 sm:p-4 ${isDisabled ? 'opacity-40 pointer-events-none' : ''}`}>
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex-1 space-y-3">
                            <textarea
                              value={segment.script}
                              onChange={(e) => setSegments(prev => prev.map(seg => seg.id === segment.id ? { ...seg, script: e.target.value } : seg))}
                              className="w-full bg-surface border border-border-default rounded-lg p-3 text-text-primary text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                            {segment.visualDirection && segment.structuredVD && (
                              <StructuredVDChips structuredVD={segment.structuredVD} />
                            )}
                          </div>
                          <div className="w-full sm:w-52 flex-shrink-0">
                            <VisualPreviewGallery
                              images={segment.images || []}
                              segmentId={segment.id}
                              segmentType={segment.type}
                              isCreatorShot={isCreatorShot}
                              isGenerating={segment.isGeneratingImage}
                              imageError={segment.imageError || null}
                              selectedImageUrl={segment.imageUrl}
                              onGenerate={() => handleGenerateImage(segment.id)}
                              onRegenerate={() => isCreatorShot ? setRegenerateModal({ isOpen: true, segment }) : handleGenerateImage(segment.id)}
                              onSelectImage={(imageId) => handleSelectImage(imageId, parseInt(segment.id))}
                              onDeleteImage={handleDeleteImage}
                              onPreview={setPreviewImage}
                              onDownload={(imageUrl) => handleDownloadImage(imageUrl, segment.type, segment.id)}
                              disabled={isBackgroundMode || isGeneratingAll}
                              language={language}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              // Compact row
              return (
                <div
                  key={segment.id}
                  onClick={() => setExpandedSegmentId(segment.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                    segment.imageUrl ? 'border-green-500/30' : 'border-border-default'
                  } ${isDisabled ? 'opacity-40' : ''}`}
                >
                  <span className="text-xs text-text-muted w-5 text-center">{index + 1}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isCreatorShot ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>{segment.type}</span>
                  <span className="text-[10px] text-text-muted">{segment.durationSeconds}s</span>
                  <p className="flex-1 text-sm text-text-primary truncate">{segment.script || '(no script)'}</p>
                  {wordStatus.status === 'error' && (
                    <span className="text-[9px] text-red-500 bg-red-500/10 px-1 rounded">+{wordStatus.overBy}</span>
                  )}
                  {segment.optionsApplied && <Settings2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                  {segment.imageUrl ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : segment.isGeneratingImage ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-text-muted flex-shrink-0" />
                  )}
                  <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />
                </div>
              );
            })}
          </div>
        )}

        {/* Segments — Grid View */}
        {viewMode === 'grid' && (
          <div>
            <div className="grid grid-cols-2 gap-3">
              {segments.map((segment, index) => {
                const isCreatorShot = segment.shotType === 'CREATOR';
                const isDisabled = !segment.isEnabled;

                return (
                  <div
                    key={segment.id}
                    onClick={() => { setExpandedSegmentId(segment.id); setViewMode('compact'); localStorage.setItem('sparkfluence_view_mode', 'compact'); }}
                    className={`border rounded-lg overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 group/gridcard relative ${
                      segment.imageUrl ? 'border-green-500/30' : 'border-border-default'
                    } ${isDisabled ? 'opacity-40' : ''}`}
                  >
                    {/* Image thumbnail or placeholder */}
                    <div className="aspect-video bg-muted relative">
                      {segment.imageUrl ? (
                        <img src={segment.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : segment.isGeneratingImage ? (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-text-muted">
                          <ImageIcon className="w-8 h-8" />
                        </div>
                      )}
                      <span className={`absolute top-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isCreatorShot ? 'bg-pink-500/80 text-white' : 'bg-blue-500/80 text-white'
                      }`}>{segment.type}</span>
                      <span className="absolute top-1 right-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                        {segment.durationSeconds}s
                      </span>
                      {segment.imageUrl && (
                        <div className="absolute bottom-1 right-1 bg-green-500 rounded-full p-0.5">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="p-2 bg-card">
                      <p className="text-xs text-text-primary line-clamp-2 leading-relaxed">{segment.script || '(no script)'}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {segment.optionsApplied && (
                          <span className="text-[9px] text-blue-400 bg-blue-500/10 px-1 py-0.5 rounded">Options</span>
                        )}
                        {!segment.isEnabled && (
                          <span className="text-[9px] px-1 py-0.5 rounded text-gray-500 bg-gray-500/10">OFF</span>
                        )}
                      </div>
                    </div>

                    {/* Hover overlay with VD details + Generate button */}
                    <div className="absolute inset-0 bg-black/85 opacity-0 group-hover/gridcard:opacity-100 transition-opacity duration-200 flex flex-col p-3 overflow-hidden z-10">
                      {/* Type + Duration header */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isCreatorShot ? 'bg-pink-500/80 text-white' : 'bg-blue-500/80 text-white'
                        }`}>{segment.type}</span>
                        <span className="text-[10px] text-white/80">{segment.durationSeconds}s | {segment.shotType}</span>
                      </div>

                      {/* Structured VD */}
                      <div className="flex-1 min-h-0 overflow-y-auto mb-1.5">
                        {(() => {
                          const svd = segment.structuredVD || parseVisualDirection(segment.visualDirection);
                          if (!svd || (!svd.scene && !svd.camera)) {
                            return <p className="text-[10px] text-white/60 leading-relaxed">{segment.visualDirection?.slice(0, 150) || '(no VD)'}</p>;
                          }
                          return (
                            <div className="space-y-0.5">
                              {[
                                { label: 'Scene', value: svd.scene, color: 'text-blue-300' },
                                { label: 'Camera', value: svd.camera, color: 'text-purple-300' },
                                { label: 'Light', value: svd.lighting, color: 'text-amber-300' },
                                { label: 'Color', value: svd.color, color: 'text-teal-300' },
                                { label: 'Mood', value: svd.mood, color: 'text-pink-300' },
                                { label: 'FX', value: svd.fx, color: 'text-orange-300' },
                              ].filter(r => r.value).map(r => (
                                <div key={r.label} className="flex gap-1.5 text-[9px] leading-relaxed">
                                  <span className={`font-medium ${r.color} w-[38px] flex-shrink-0`}>{r.label}</span>
                                  <span className="text-white/70">{r.value}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Status badges */}
                      <div className="flex items-center gap-1 mb-1.5">
                        {segment.optionsApplied && (
                          <span className="text-[8px] text-blue-300 bg-blue-500/20 px-1 py-0.5 rounded">Options</span>
                        )}
                        {segment.imageUrl && (
                          <span className="text-[8px] text-green-300 bg-green-500/20 px-1 py-0.5 rounded">Image OK</span>
                        )}
                        {segment.layout && segment.layout !== 'full' && (
                          <span className="text-[8px] text-violet-300 bg-violet-500/20 px-1 py-0.5 rounded">{segment.layout}</span>
                        )}
                      </div>

                      {/* Generate button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedSegmentId(segment.id);
                          setViewMode('compact');
                          localStorage.setItem('sparkfluence_view_mode', 'compact');
                          setTimeout(() => handleGenerateImage(segment.id), 100);
                        }}
                        disabled={segment.isGeneratingImage || isBackgroundMode || isGeneratingAll}
                        className="mt-auto w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-primary hover:bg-primary/80 text-white text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {segment.isGeneratingImage ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : segment.imageUrl ? (
                          <RefreshCw className="w-3 h-3" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        {segment.imageUrl
                          ? (language === 'id' ? 'Regenerate' : 'Regenerate')
                          : (language === 'id' ? 'Generate' : 'Generate')
                        }
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Segments — Full View (default) */}
        {viewMode === 'full' && <div className={fullViewColumns === 2 ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}>
          {groupedSegments.map((group, groupIndex) => (
            <div
              key={groupIndex}
              className={group.isBodyGroup && group.segments.length > 1 
                ? "bg-surface border border-border-default rounded-2xl p-3 space-y-3" 
                : ""
              }
            >
              {group.isBodyGroup && group.segments.length > 1 && (
                <div className="flex items-center gap-2 px-2 pb-2 border-b border-border-default">
                  <span className="text-blue-500 dark:text-blue-400 text-sm font-medium">BODY</span>
                  <span className="text-text-muted text-xs">
                    ({group.segments.length} {language === 'id' ? 'segmen' : 'segments'})
                  </span>
                </div>
              )}
              
              {group.segments.map((segment, segIndex) => {
                const displayIndex = segment.originalIndex + 1;
                const isCreatorShot = segment.shotType === 'CREATOR';
                const isDisabled = !segment.isEnabled;

                return (
                  <div
                    key={segment.id}
                    className={`bg-card border rounded-xl shadow-theme ${
                      segment.imageUrl ? 'border-green-500/30' : 'border-border-default'
                    }`}
                  >
                    {/* Segment Header */}
                    <div className="p-3 sm:p-4 border-b border-border-default">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className={`w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold ${
                            segment.imageUrl ? 'bg-green-600' : 'bg-primary'
                          }`}>
                            {segment.imageUrl ? <CheckCircle2 className="w-4 h-4" /> : displayIndex}
                          </div>
                          <span className="text-text-primary font-semibold text-sm sm:text-base">
                            {group.isBodyGroup && group.segments.length > 1
                              ? `BODY-${segIndex + 1}`
                              : segment.type
                            }
                          </span>
                          {/* Segment ON/OFF toggle */}
                          <button
                            onClick={() => {
                              setSegments(prev => prev.map(seg =>
                                seg.id === segment.id ? { ...seg, isEnabled: !seg.isEnabled, loopEndEnabled: !seg.isEnabled } : seg
                              ));
                            }}
                            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                              segment.isEnabled
                                ? 'bg-green-500/20 text-green-400 border-green-500/40 hover:bg-green-500/30'
                                : 'bg-gray-500/20 text-gray-500 border-gray-500/40 hover:bg-gray-500/30'
                            }`}
                            title={segment.isEnabled
                              ? (language === 'id' ? 'Klik untuk nonaktifkan segment' : 'Click to disable segment')
                              : (language === 'id' ? 'Klik untuk aktifkan segment' : 'Click to enable segment')
                            }
                          >
                            {segment.isEnabled ? 'ON' : 'OFF'}
                          </button>
                          <span className="text-text-muted text-xs sm:text-sm">{segment.timing}</span>
                          <select
                            value={segment.durationSeconds}
                            onChange={(e) => {
                              const newDuration = parseInt(e.target.value);
                              setSegments(prev => prev.map(seg =>
                                seg.id === segment.id ? { ...seg, durationSeconds: newDuration } : seg
                              ));
                            }}
                            className="text-text-muted text-xs bg-transparent border border-border-default rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:border-primary"
                            title={videoSettings ? getDurationExplanation(segment.type, videoSettings.duration) : ''}
                          >
                            {/* Only supported durations: 5s, 8s (VEO), 10s (WAN) */}
                            {[5, 8, 10].map(d => (
                              <option key={d} value={d}>{d}s</option>
                            ))}
                          </select>
                          {/* Layout selector — popover with thumbnail previews, only for segments with creator face */}
                          {(isCreatorShot || segment.includeCreatorFace) && !isDisabled && (
                            <>
                              <LayoutPopover
                                value={segment.layout}
                                onChange={(layout) => {
                                  setSegments(prev => prev.map(seg =>
                                    seg.id === segment.id ? { ...seg, layout } : seg
                                  ));
                                  // Trigger VD rewrite with updated layout
                                  setRewritingVDSegmentId(segment.id);
                                  rewriteVisualDirection(
                                    segment,
                                    segment.additionalNotes || '',
                                    segment.includeCreatorFace || isCreatorShot,
                                    layout
                                  ).finally(() => setRewritingVDSegmentId(null));
                                }}
                              />
                              {rewritingVDSegmentId === segment.id && (
                                <Loader2 className="w-3 h-3 text-primary animate-spin" />
                              )}
                            </>
                          )}
                        </div>
                        
                        {/* Tags + Actions */}
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            isCreatorShot
                              ? 'bg-pink-500/20 text-pink-600 dark:text-pink-400'
                              : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                          }`}>
                            {segment.shotType}
                          </span>
                          {segment.emotion && (
                            <span className="text-primary text-xs bg-primary/10 px-2 py-1 rounded hidden sm:inline">
                              {segment.emotion}
                            </span>
                          )}
                          {segment.transition && (
                            <span className="text-amber-600 dark:text-amber-400 text-xs bg-amber-500/10 px-2 py-1 rounded hidden sm:inline">
                              {segment.transition}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Content — grayed out when LOOP-END is disabled */}
                    <div className={`p-3 sm:p-4 ${isDisabled ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Script + Visual Direction */}
                        <div className="flex-1 space-y-3">
                          {/* Script with Word Count - Editable */}
                          <div>
                            {(() => {
                              const wordStatus = getWordLimitStatus(
                                segment.script,
                                segment.durationSeconds,
                                (videoSettings?.language || language || 'id') as LanguageCode
                              );
                              const isShortening = shorteningSegmentId === segment.id;
                              return (
                                <>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <label className="text-text-secondary text-xs">{uiText.script}</label>
                                      {/* Merge button — split segments or sibling indexed segments */}
                                      {(() => {
                                        // Path 1: Split segments — merge all back to original
                                        if (segment.splitGroupId && !segment.type.endsWith('-1')) {
                                          return (
                                            <button
                                              onClick={() => handleMergeSegments(segment.splitGroupId!)}
                                              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-500/15 hover:bg-violet-500/25 text-violet-400 text-[10px] font-medium transition-colors border border-violet-500/20"
                                              title={language === 'id' ? 'Gabungkan kembali ke segment asli' : 'Merge back to original'}
                                            >
                                              <Merge className="w-3 h-3" />
                                              {language === 'id' ? 'Gabung' : 'Merge'}
                                            </button>
                                          );
                                        }
                                        // Path 2: Sibling segments of the same base type (e.g., multiple BODY segments)
                                        if (segment.splitGroupId) return null;
                                        const siblings = getSiblingSegments(segment);
                                        if (siblings.length === 0) return null;

                                        // Compute display labels (e.g., BODY-1, BODY-2)
                                        const baseType = segment.type.replace(/-\d+$/, '').replace(/_\d+$/, '');
                                        const allOfType = segments.filter(s => {
                                          const bt = s.type.replace(/-\d+$/, '').replace(/_\d+$/, '');
                                          return bt === baseType;
                                        });

                                        return (
                                          <div className="relative">
                                            <button
                                              onClick={() => setMergePickerSegmentId(mergePickerSegmentId === segment.id ? null : segment.id)}
                                              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-500/15 hover:bg-violet-500/25 text-violet-400 text-[10px] font-medium transition-colors border border-violet-500/20"
                                              title={language === 'id' ? 'Gabungkan dengan segment lain' : 'Merge with another segment'}
                                            >
                                              <Merge className="w-3 h-3" />
                                              {language === 'id' ? 'Gabung' : 'Merge'}
                                              <ChevronDown className="w-2.5 h-2.5" />
                                            </button>
                                            {mergePickerSegmentId === segment.id && (
                                              <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border-default rounded-lg shadow-lg py-1 min-w-[180px]">
                                                <p className="px-3 py-1 text-[10px] text-text-muted">
                                                  {language === 'id' ? 'Gabung dengan:' : 'Merge with:'}
                                                </p>
                                                {siblings.map(sib => {
                                                  const sibIdx = allOfType.findIndex(s => s.id === sib.id);
                                                  const displayName = allOfType.length > 1 ? `${baseType}-${sibIdx + 1}` : sib.type;
                                                  return (
                                                    <button
                                                      key={sib.id}
                                                      onClick={() => handleMergeWithSibling(segment.id, sib.id)}
                                                      className="w-full px-3 py-1.5 text-left text-xs text-text-primary hover:bg-surface transition-colors flex items-center gap-2"
                                                    >
                                                      <span className="font-medium text-violet-400">{displayName}</span>
                                                      <span className="text-text-muted truncate max-w-[100px]">{sib.script?.slice(0, 35)}...</span>
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                        wordStatus.status === 'error'
                                          ? 'bg-red-500/20 text-red-500'
                                          : wordStatus.status === 'warning'
                                          ? 'bg-amber-500/20 text-amber-500'
                                          : 'bg-green-500/20 text-green-500'
                                      }`}>
                                        {wordStatus.count}/{wordStatus.max} {language === 'id' ? 'kata' : 'words'}
                                        {wordStatus.status === 'error' && ` (+${wordStatus.overBy})`}
                                      </span>
                                      {/* Inline action buttons when over word limit */}
                                      {wordStatus.status === 'error' && (
                                        <>
                                          <button
                                            onClick={() => handleShortenScript(segment.id, segment.script, wordStatus.max)}
                                            disabled={isShortening}
                                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/15 hover:bg-primary/25 text-primary text-[10px] font-medium transition-colors disabled:opacity-50"
                                            title={language === 'id' ? 'Perpendek dengan AI' : 'AI Shorten'}
                                          >
                                            {isShortening ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                            <span className="hidden sm:inline">{language === 'id' ? 'Perpendek' : 'Shorten'}</span>
                                          </button>
                                          {!['HOOK', 'CTA', 'LOOP-END'].includes((segment.splitFromType || segment.type).toUpperCase()) && wordStatus.count >= 4 && (
                                            <button
                                              onClick={() => handleSplitSegment(segment.id)}
                                              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-500/15 hover:bg-violet-500/25 text-violet-400 text-[10px] font-medium transition-colors"
                                              title={language === 'id' ? 'Bagi jadi 2 segment' : 'Split into 2'}
                                            >
                                              <Scissors className="w-3 h-3" />
                                              <span className="hidden sm:inline">Split</span>
                                            </button>
                                          )}
                                        </>
                                      )}
                                      {/* Undo Script Button - show only after AI Shorten */}
                                      {segment.shortenedByAI && segment.previousScript && (
                                        <button
                                          onClick={() => handleUndoScript(segment.id)}
                                          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 text-[10px] font-medium transition-colors"
                                          title={language === 'id' ? 'Kembalikan script sebelumnya' : 'Undo to previous script'}
                                        >
                                          <Undo2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <textarea
                                    value={segment.script}
                                    onChange={(e) => {
                                      const newScript = e.target.value;
                                      setSegments(prev => prev.map(seg =>
                                        seg.id === segment.id ? { ...seg, script: newScript } : seg
                                      ));
                                    }}
                                    className={`w-full bg-surface border rounded-lg p-3 text-text-primary text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                                      wordStatus.status === 'error'
                                        ? 'border-red-500/50'
                                        : wordStatus.status === 'warning'
                                        ? 'border-amber-500/50'
                                        : 'border-border-default'
                                    }`}
                                    placeholder={language === 'id' ? 'Tulis script...' : 'Write script...'}
                                  />
                                </>
                              );
                            })()}
                          </div>

                          {/* Visual Direction — structured chips */}
                          {segment.visualDirection && (() => {
                            const svd = segment.structuredVD || parseVisualDirection(segment.visualDirection);
                            return (
                              <div>
                                <label className="text-text-secondary text-xs mb-1.5 block">{uiText.visualDirection}</label>
                                {svd ? (
                                  <StructuredVDChips structuredVD={svd} />
                                ) : (
                                  <div className="bg-surface border border-border-default rounded-lg p-3 text-text-secondary text-xs">
                                    {segment.visualDirection}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Visual Preview */}
                        <div className="w-full sm:w-52 flex-shrink-0">
                          <label className="text-text-secondary text-xs mb-1.5 block">
                            {uiText.visualPreview}
                            {isCreatorShot && (
                              <span className="text-pink-600 dark:text-pink-400 ml-1">({uiText.creatorShot})</span>
                            )}
                          </label>
                          {/* NEW: VisualPreviewGallery with WOW effects */}
                          <VisualPreviewGallery
                            images={segment.images || []}
                            segmentId={segment.id}
                            segmentType={segment.type}
                            isCreatorShot={isCreatorShot}
                            isGenerating={segment.isGeneratingImage}
                            imageError={segment.imageError || null}
                            selectedImageUrl={segment.imageUrl}
                            onGenerate={() => {
                              // Both CREATOR and B-ROLL: generate directly using saved options
                              handleGenerateImage(segment.id);
                            }}
                            onRegenerate={() => {
                              if (isCreatorShot) {
                                setRegenerateModal({ isOpen: true, segment });
                              } else {
                                // B-ROLL regenerate: generate directly (options already saved)
                                handleGenerateImage(segment.id);
                              }
                            }}
                            onSelectImage={(imageId) => handleSelectImage(imageId, parseInt(segment.id))}
                            onDeleteImage={handleDeleteImage}
                            onPreview={setPreviewImage}
                            onDownload={(imageUrl) => handleDownloadImage(imageUrl, segment.type, segment.id)}
                            disabled={isBackgroundMode || isGeneratingAll}
                            language={language}
                          />

                          {/* Set Options Button */}
                          {!isDisabled && (
                            <button
                              onClick={() => setOptionsModal({ isOpen: true, segment })}
                              className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-default bg-surface hover:bg-white/5 hover:border-primary/50 text-text-secondary text-xs font-medium transition-colors"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              {language === 'id' ? 'Atur Opsi' : 'Set Options'}
                            </button>
                          )}

                          {/* Applied Options Badges — with hover preview */}
                          {segment.optionsApplied && (
                            <div className="mt-1.5 relative group/opts">
                              <div className="flex items-center gap-1.5 flex-wrap cursor-default">
                                {segment.referenceImageUrl && (
                                  <span className="text-[10px] text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                    + Ref
                                  </span>
                                )}
                                {segment.additionalNotes && (
                                  <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                                    &quot;{segment.additionalNotes.slice(0, 20)}{segment.additionalNotes.length > 20 ? '...' : ''}&quot;
                                  </span>
                                )}
                                {!isCreatorShot && segment.includeCreatorFace && (
                                  <span className="text-[10px] text-pink-500 bg-pink-500/10 px-1.5 py-0.5 rounded">
                                    + Face
                                  </span>
                                )}
                                {(isCreatorShot || segment.includeCreatorFace) && (
                                  <span className="text-[10px] text-purple-500 bg-purple-500/10 px-1.5 py-0.5 rounded">
                                    {LAYOUT_OPTIONS.find(o => o.value === segment.layout)?.label || 'Full'}
                                  </span>
                                )}
                              </div>
                              {/* Hover Preview Popover */}
                              <div className="absolute bottom-full left-0 mb-2 hidden group-hover/opts:block z-50 pointer-events-none">
                                <div className="bg-card border border-border-default rounded-lg shadow-xl p-3 min-w-[200px] max-w-[260px]">
                                  {segment.referenceImageUrl && (
                                    <div className="mb-2">
                                      <p className="text-[10px] text-text-muted mb-1">Reference Image</p>
                                      <img
                                        src={segment.referenceImageUrl}
                                        alt="Reference"
                                        className="w-full h-24 object-cover rounded"
                                      />
                                    </div>
                                  )}
                                  {segment.additionalNotes && (
                                    <div className="mb-2">
                                      <p className="text-[10px] text-text-muted mb-0.5">Notes</p>
                                      <p className="text-xs text-text-primary">{segment.additionalNotes}</p>
                                    </div>
                                  )}
                                  {!isCreatorShot && (
                                    <div className="mb-2">
                                      <p className="text-[10px] text-text-muted mb-0.5">Creator Face</p>
                                      <p className="text-xs text-text-primary">{segment.includeCreatorFace ? 'Yes' : 'No'}</p>
                                    </div>
                                  )}
                                  {(isCreatorShot || segment.includeCreatorFace) && (
                                    <div>
                                      <p className="text-[10px] text-text-muted mb-1">Layout</p>
                                      <div className="flex items-center gap-2">
                                        <LayoutIcon
                                          layout={segment.layout}
                                          className="w-[28px] h-[42px] rounded-sm border border-border-default"
                                        />
                                        <span className="text-xs text-text-primary font-medium">
                                          {LAYOUT_OPTIONS.find(o => o.value === segment.layout)?.label || 'Full'}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}


                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button
            onClick={handlePrevious}
            variant="outline"
            className="border-border-default text-text-primary hover:bg-surface h-12 px-6 sm:px-8 font-medium"
          >
            {uiText.previous}
          </Button>
          <Button
            onClick={handleNext}
            disabled={!allHaveImages}
            className={`h-12 px-6 sm:px-8 font-medium transition-all ${
              allHaveImages
                ? "bg-primary hover:bg-primary-hover text-white"
                : "bg-primary/50 text-white/50 cursor-not-allowed"
            }`}
          >
            {allHaveImages ? uiText.next : `${imagesGenerated}/${enabledSegments.length} images`}
          </Button>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 sm:p-8"
          onClick={() => setPreviewImage(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (previewImage) handleDownloadImage(previewImage, 'preview', Date.now().toString());
              }}
              className="p-2 bg-green-600 hover:bg-green-700 rounded-full transition-colors"
              title="Download"
            >
              <Download className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={() => setPreviewImage(null)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Regenerate Modal */}
      <RegenerateModal
        isOpen={regenerateModal.isOpen}
        onClose={() => setRegenerateModal({ isOpen: false, segment: null })}
        segment={regenerateModal.segment}
        onRegenerate={handleRegenerateWithNotes}
      />

      {/* Reference Image Modal for B-ROLL */}
      <ReferenceImageModal
        isOpen={referenceImageModal.isOpen}
        onClose={() => setReferenceImageModal({ isOpen: false, segment: null })}
        segment={referenceImageModal.segment}
        initialKeywords=""  // Not used anymore - smart extraction in backend
        topic={currentTopic}
        onSelect={handleReferenceImageSelect}
      />

      {/* B-ROLL Options Modal (options picker — no Generate) */}
      {optionsModal.isOpen && optionsModal.segment && optionsModal.segment.shotType !== 'CREATOR' && (
        <GenerateBRollModal
          isOpen={true}
          onClose={() => setOptionsModal({ isOpen: false, segment: null })}
          segment={optionsModal.segment}
          onApplyOptions={handleApplyBRollOptions}
          language={language}
          topic={currentTopic}
          maxReferenceImages={3}
          initialLayout={optionsModal.segment.layout}
          sessionAvatarUrl={
            optionsModal.segment.creatorAvatarUrl ||
            avatarUrl ||
            (avatarId ? savedAvatars.find(a => a.id === avatarId)?.url : null) ||
            null
          }
          profileAvatarUrl={userAvatarUrl}
          availableAvatars={savedAvatars.map(a => ({ ...a, source: 'saved' as const }))}
        />
      )}

      {/* CREATOR Options Modal (simplified — notes only) */}
      <CreatorOptionsModal
        isOpen={optionsModal.isOpen && optionsModal.segment?.shotType === 'CREATOR'}
        segment={optionsModal.segment}
        onApply={handleApplyCreatorOptions}
        onClose={() => setOptionsModal({ isOpen: false, segment: null })}
        language={language}
      />

      {/* Legacy B-ROLL Generation Modal (kept for handleBRollGenerate backward compat) */}
      <GenerateBRollModal
        isOpen={bRollModal.isOpen}
        onClose={() => setBRollModal({ isOpen: false, segment: null })}
        segment={bRollModal.segment}
        onApplyOptions={(options) => {
          // Legacy path: apply options then generate
          if (bRollModal.segment) {
            handleBRollGenerate({
              additionalNotes: options.additionalNotes,
              includeCreatorFace: options.includeCreatorFace,
              referenceImages: options.referenceImages,
              selectedAvatarUrl: options.selectedAvatarUrl,
            });
          }
        }}
        language={language}
        maxReferenceImages={3}
        sessionAvatarUrl={
          bRollModal.segment?.creatorAvatarUrl ||
          avatarUrl ||
          (avatarId ? savedAvatars.find(a => a.id === avatarId)?.url : null) ||
          null
        }
        profileAvatarUrl={userAvatarUrl}
        availableAvatars={savedAvatars.map(a => ({ ...a, source: 'saved' as const }))}
      />
    </div>
  );
};
