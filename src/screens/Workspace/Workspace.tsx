import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Pencil, ChevronLeft, ChevronRight, ArrowLeft, ArrowUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { StepBar, StepInfo } from './components/StepBar';
import { ScriptStep } from './steps/ScriptStep';
import ImageStep from './steps/ImageStep';
import VideoStep from './steps/VideoStep';
import { StudioStep } from './steps/StudioStep';
import { SmartCompanion } from './components/SmartCompanion';
import { useSessionPersistence } from '../../hooks/useSessionPersistence';
import { useLanguage } from '../../contexts/LanguageContext';
import type { ScoreBreakdown, WorkspaceSegment, HookOptions } from '../../contexts/WorkspaceContext';
import {
  SEGMENT_WEIGHT_IN_OVERALL,
  type SegmentType,
} from '../../lib/knowledge/12-scoring-engine';
import { analyzeSegment, generateQuickFixes, type SegmentInput } from './utils/scriptAnalysis';

// ============================================================================
// MOCK DATA — populates WorkspaceContext when no real data exists
// All features (edit, hook switch, split, merge, AI Coach) operate on this data
// ============================================================================

const MOCK_WS_HOOK_OPTIONS: HookOptions = {
  option_a_safe: {
    script_text: '3 AI tools ini literally bikin 50 orang quit 9-to-5. Yang ketiga paling bahaya.',
    visual_direction:
      'Scene: Creator di coffee shop minimalis, tuang kopi V60 | Camera: MCU eye-level, 85mm f/1.8, push-in slow | Lighting: Golden hour side key 4:1, warm practical | Color: Warm amber, Vision3 500T | Mood: Scroll-stop intensity | FX: [TEXT POP: "3 AI TOOLS"] [SFX: Whoosh + Ding]',
    hook_type: 'curiosity_gap',
  },
  option_b_negative: {
    script_text: 'STOP kerja manual! 3 AI tools ini literally ganti kerjaan lo semuanya.',
    visual_direction:
      'Scene: Creator slam laptop tutup, intense expression | Camera: CU slam → Whip-pan ke wajah, 35mm f/2.0 | Lighting: Hard split 6:1, cool 5600K | Color: Desaturated bleach bypass, CineStill 800T | Mood: Urgent, confrontational | FX: [SFX: Boom] [TEXT POP: "STOP"]',
    hook_type: 'negative_controversial',
  },
  option_c_visual: {
    script_text: 'Liat dashboard gue? 3 AI tools bikin semua ini dalam 10 menit.',
    visual_direction:
      'Scene: Creator tunjuk laptop, 3 AI dashboards visible | Camera: Blur → Sharp focus, 50mm f/1.8 | Lighting: Cool 5600K monitor glow, rim light | Color: Teal-orange grade, CineStill 800T | Mood: Tech-impressive | FX: [CUT TO: Screen recording] [SFX: Cash register]',
    hook_type: 'visual_action',
  },
};

function createMockWorkspaceSegments(): WorkspaceSegment[] {
  const base = {
    timing: '0:00',
    transition: '',
    layout: 'full' as const,
    imageUrl: null,
    images: [] as WorkspaceSegment['images'],
    isGeneratingImage: false,
    imageError: null,
    videoUrl: null,
    isGeneratingVideo: false,
    videoError: null,
    loopEndEnabled: true,
    isEnabled: true,
  };
  // 60s script structure: HOOK(5) + FORE(8) + BODY-1(10) + BODY-2(10) + BODY-3(8) + PEAK(8) + CTA(5) + LOOP-END(5) = 59s
  // Scripts optimized to score 85%+ on scoring engine:
  // - Every script has: question/number + power word + pattern interrupt/transition
  // - HOOK uses curiosity gap (no tool names revealed) → tools revealed in BODY segments
  // - Visual directions: 6-part format (Scene|Camera|Lighting|Color|Mood|FX)
  return [
    { ...base, id: '1', segmentId: '1', segmentNumber: 1, segmentType: 'HOOK', shotType: 'CREATOR' as const, durationSeconds: 5, maxWords: 9,
      script: '3 AI tools ini literally bikin 50 orang quit 9-to-5. Yang ketiga paling bahaya.',
      visualDirection: 'Scene: Creator di coffee shop minimalis, tuang kopi dari V60 ke gelas | Camera: MCU eye-level, 85mm f/1.8, push-in slow ke wajah | Lighting: Golden hour side key 4:1, warm practical dari jendela | Color: Warm amber grade, lifted shadows, Vision3 500T | Mood: Energetic, scroll-stop intensity | FX: [TEXT POP: "3 AI TOOLS"] [SFX: Whoosh + Ding]',
      emotion: 'excited' },
    { ...base, id: '2', segmentId: '2', segmentNumber: 2, segmentType: 'FORE', shotType: 'B-ROLL' as const, durationSeconds: 8, maxWords: 14,
      script: 'Tapi tunggu dulu, yang ketiga ini literally paling gila. Tonton sampai habis.',
      visualDirection: 'Scene: Montage holographic AI dashboards floating di dark workspace, multiple glowing screens | Camera: Wide tracking shot, 24mm f/2.8, slow dolly right revealing screens | Lighting: Cool 5600K rim light, neon blue accent dari monitors | Color: Teal-orange grade, high contrast, CineStill 800T | Mood: Futuristic, high-tech mystery | FX: Subtle lens flare dari screen glows, light rays through dust particles',
      emotion: 'intriguing' },
    { ...base, id: '3', segmentId: '3', segmentNumber: 3, segmentType: 'BODY-1', shotType: 'B-ROLL' as const, durationSeconds: 10, maxWords: 17,
      script: 'Nah pertama: Jasper AI buat copywriting. Satu klik, 50 artikel per hari langsung publish. Coba sendiri, gila hasilnya.',
      visualDirection: 'Scene: Close-up tangan mengetik di mechanical keyboard, Jasper AI interface visible di ultrawide monitor | Camera: CU macro, 50mm f/2.0, slow orbit around keyboard | Lighting: Cool 6500K key light, warm 3200K practical dari monitor glow | Color: Clean tech-blue grade, sharp contrast, minimal grain | Mood: Productive, focused intensity | FX: Screen content sharp focus, background bokeh soft circles',
      emotion: 'informative' },
    { ...base, id: '4', segmentId: '4', segmentNumber: 4, segmentType: 'BODY-2', shotType: 'B-ROLL' as const, durationSeconds: 10, maxWords: 17,
      script: 'Tapi kedua lebih gila: CapCut AI video editor. 10 menit flat bikin satu TikTok viral, udah 50 juta views.',
      visualDirection: 'Scene: Phone screens showing CapCut AI auto-editing viral TikTok videos, view counters rapidly climbing | Camera: MS to CU, 35mm f/1.8, smooth tracking past multiple phone screens | Lighting: Neon multi-color 4500K, RGB accent lights reflecting off screens | Color: Vibrant saturated grade, punchy contrast, Instagram-aesthetic | Mood: Explosive viral energy, achievement rush | FX: Counter numbers animating up, screen glows, subtle motion blur on transitions',
      emotion: 'surprising' },
    { ...base, id: '5', segmentId: '5', segmentNumber: 5, segmentType: 'BODY-3', shotType: 'B-ROLL' as const, durationSeconds: 8, maxWords: 14,
      script: 'Dan ketiga yang paling bahaya: Pionex trading bot, auto-trade crypto 24 jam nonstop.',
      visualDirection: 'Scene: Pionex trading dashboard dengan grid bot running, green candlestick charts naik | Camera: CU top-down, 24mm f/2.0, slow tilt revealing multiple screens | Lighting: Cool 5600K key, green accent glow dari monitors, dark environment | Color: Deep teal grade, high contrast, green highlights | Mood: High-stakes, futuristic intensity | FX: Trading numbers updating live, subtle screen reflections',
      emotion: 'intense' },
    { ...base, id: '6', segmentId: '6', segmentNumber: 6, segmentType: 'PEAK', shotType: 'B-ROLL' as const, durationSeconds: 8, maxWords: 14,
      script: 'Hasilnya? 100 user Pionex average profit 40 persen dalam 3 bulan. GILA.',
      visualDirection: 'Scene: Trading terminal dengan green profit candles naik drastis, multi-monitor showing +40% gains | Camera: Low angle CU, 24mm f/2.0, dramatic dolly-in ke profit numbers | Lighting: Harsh Rembrandt 8:1, green accent glow dari chart screens | Color: High contrast bleach bypass, green-gold tint, lifted blacks | Mood: Peak excitement, jaw-drop revelation | FX: [TEXT POP: "+40% PROFIT"] Screen reflections on desk, subtle camera shake',
      emotion: 'mind-blown' },
    { ...base, id: '7', segmentId: '7', segmentNumber: 7, segmentType: 'CTA', shotType: 'CREATOR' as const, durationSeconds: 5, maxWords: 9,
      script: 'Save sekarang, follow gue biar gak ketinggalan.',
      visualDirection: 'Scene: Creator relaxed sip kopi, warm genuine smile, eye contact langsung ke camera | Camera: MS eye-level, 50mm f/2.0, static with subtle breathing room | Lighting: Soft butterfly key 2:1, warm 3500K, fill dari reflector bawah | Color: Warm neutral grade, soft skin tones, Portra 400 | Mood: Friendly, approachable, trust-building | FX: Shallow DOF bokeh background, warm lens flare',
      emotion: 'friendly' },
    { ...base, id: '8', segmentId: '8', segmentNumber: 8, segmentType: 'LOOP-END', shotType: 'CREATOR' as const, durationSeconds: 5, maxWords: 9,
      script: 'Inget tadi gue bilang bahaya? Gue lupa satu...',
      visualDirection: 'Scene: Creator tuang kopi lagi persis mirror HOOK, raised eyebrow teasing expression | Camera: MCU eye-level, 85mm f/1.8, same push-in angle as HOOK | Lighting: Golden hour side key 4:1, identical warm setup as HOOK | Color: Same warm amber grade as HOOK, Vision3 500T | Mood: Teasing cliffhanger, curiosity loop | FX: [SFX: Same Whoosh as HOOK] Seamless visual match for auto-loop',
      emotion: 'teasing', loopEndEnabled: false, isEnabled: true },
  ];
}

// ============================================================================
// EDGE FUNCTION SEGMENT MAPPER
// Transforms snake_case edge function response → camelCase WorkspaceSegment
// ============================================================================

function mapEdgeSegments(rawSegments: any[]): WorkspaceSegment[] {
  return rawSegments.map((s: any, index: number) => {
    const segType = (s.segment_type || s.segmentType || s.type || '').toUpperCase();
    // HOOK/CTA/LOOP-END are always CREATOR — edge function may send wrong value
    const shotType = ['HOOK', 'CTA', 'LOOP-END'].includes(segType)
      ? 'CREATOR'
      : ((s.shot_type || s.shotType || 'B-ROLL').toUpperCase() as 'CREATOR' | 'B-ROLL');
    return {
    id: s.id || s.segment_id || `seg-${index}`,
    segmentId: s.segment_id || s.segmentId || `VIDEO-${String(index + 1).padStart(3, '0')}`,
    segmentNumber: s.segment_number ?? s.segmentNumber ?? (index + 1),
    segmentType: segType,
    shotType,
    timing: s.timing || '0:00',
    durationSeconds: s.duration_seconds || s.durationSeconds || s.duration || 5,
    script: s.script || s.script_text || '',
    visualDirection: s.visual_direction || s.visualDirection || '',
    emotion: s.emotion || 'Intrigue',
    transition: s.transition || 'Cut',
    maxWords: s.max_words || s.maxWords || Math.round((130 / 60) * (s.duration_seconds || s.durationSeconds || s.duration || 5) * 0.80),
    layout: s.layout || 'full',
    imageUrl: null,
    images: [],
    isGeneratingImage: false,
    imageError: null,
    videoUrl: null,
    isGeneratingVideo: false,
    videoError: null,
    loopEndEnabled: s.loopEndEnabled ?? (segType !== 'LOOP-END'),
    isEnabled: s.isEnabled ?? (segType !== 'LOOP-END'),
    includeCreatorFace: s.includeCreatorFace,
    referenceImageUrl: s.referenceImageUrl,
  };});
}

// ============================================================================
// EDITABLE TITLE
// ============================================================================

interface EditableTitleProps {
  title: string;
  onSave: (newTitle: string) => void;
}

const EditableTitle: React.FC<EditableTitleProps> = ({ title, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(title);
  }, [title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== title) {
      onSave(trimmed);
    } else {
      setDraft(title);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setDraft(title);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="text-lg font-semibold text-[#FAFAF9] bg-transparent border-b border-emerald-500/50 outline-none px-0 py-0 min-w-[120px] max-w-[300px]"
        maxLength={60}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="flex items-center gap-1.5 group"
      title="Click to edit title"
    >
      <h1 className="text-lg font-semibold text-[#FAFAF9] group-hover:text-emerald-400 transition-colors">
        {title}
      </h1>
      <Pencil className="w-3 h-3 text-[#57534E] opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};

// ============================================================================
// STEP BUILDER HELPER
// ============================================================================

function buildSteps(
  activeStep: string,
  canProceedToImages: boolean,
  canProceedToVideo: boolean,
  canProceedToStudio: boolean,
  segments: { imageUrl: string | null; videoUrl: string | null; isEnabled: boolean }[],
): StepInfo[] {
  const enabledSegments = segments.filter((s) => s.isEnabled);
  const imagesReady = enabledSegments.filter((s) => s.imageUrl).length;
  const videosReady = enabledSegments.filter((s) => s.videoUrl).length;
  const totalEnabled = enabledSegments.length;

  const getStatus = (
    stepId: 'script' | 'images' | 'video' | 'studio',
  ): StepInfo['status'] => {
    if (stepId === activeStep) return 'current';

    switch (stepId) {
      case 'script':
        return canProceedToImages ? 'completed' : 'active';
      case 'images':
        if (!canProceedToImages) return 'locked';
        return canProceedToVideo ? 'completed' : 'active';
      case 'video':
        if (!canProceedToVideo) return 'locked';
        return canProceedToStudio ? 'completed' : 'active';
      case 'studio':
        return canProceedToStudio ? 'active' : 'locked';
      default:
        return 'locked';
    }
  };

  return [
    {
      id: 'script',
      label: 'Script',
      icon: 'FileText',
      status: getStatus('script'),
    },
    {
      id: 'images',
      label: 'Images',
      icon: 'Image',
      status: getStatus('images'),
      badge: totalEnabled > 0 ? `${imagesReady}/${totalEnabled}` : undefined,
    },
    {
      id: 'video',
      label: 'Video',
      icon: 'Video',
      status: getStatus('video'),
      badge: totalEnabled > 0 ? `${videosReady}/${totalEnabled}` : undefined,
    },
    {
      id: 'studio',
      label: 'Studio',
      icon: 'Film',
      status: getStatus('studio'),
    },
  ];
}


// ============================================================================
// LOCATION STATE — data passed from ChatHome via navigate()
// ============================================================================

interface LocationNavigationState {
  orderId: string;
  topic: string;
  segments: any[];
  hookOptions: HookOptions | null;
  qualityReport: any | null;
  videoSettings: {
    duration: string;
    aspectRatio: string;
    language: string;
    model: string;
  };
  characterDescription?: string | null;
  avatarOption?: string;
  avatarId?: string | null;
  avatarUrl?: string | null;
  sessionType?: 'script_gen' | 'creator_lab' | 'ad_studio';
}

// Reverse-map: ChatHome sends full names ('indonesian'), WorkspaceSettings uses short codes ('id')
const LANG_REVERSE_MAP: Record<string, string> = {
  indonesian: 'id',
  english: 'en',
  hindi: 'hi',
};

// ============================================================================
// RESIZABLE RIGHT PANEL HOOK
// Drag handle between main and aside — min 240px, max 700px
// ============================================================================

function useResizablePanel(defaultWidth = 360) {
  const [rightWidth, setRightWidth] = useState(defaultWidth);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = rightWidth;
    e.preventDefault();
  }, [rightWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = startX.current - e.clientX;
      setRightWidth(Math.min(Math.max(startWidth.current + delta, 240), 700));
    };
    const onUp = () => { isDragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  return { rightWidth, handleDragStart };
}

export const Workspace: React.FC = () => {
  const { orderId, step } = useParams<{ orderId: string; step?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const locationState = location.state as LocationNavigationState | null;
  const {
    state,
    dispatch,
    setActiveStep,
    canProceedToImages,
    canProceedToVideo,
    canProceedToStudio,
  } = useWorkspace();

  // Determine session type from URL path
  const sessionType: 'script_gen' | 'creator_lab' | 'ad_studio' =
    locationState?.sessionType ||
    (location.pathname.startsWith('/creator-lab') ? 'creator_lab' :
     location.pathname.startsWith('/ad-studio') ? 'ad_studio' : 'script_gen');

  // Session persistence — auto-save on changes, restore on mount
  const { isRestoring, sessionFound, saveNow } = useSessionPersistence({ orderId, sessionType });

  // Resizable right panel — default ~30% at 1200px content width
  const { rightWidth, handleDragStart } = useResizablePanel(360);

  // Derive active step from URL param or context state
  const activeStep = step || state.activeStep || 'script';



  // Build step data
  const steps = buildSteps(
    activeStep,
    canProceedToImages,
    canProceedToVideo,
    canProceedToStudio,
    state.segments,
  );

  // Build base path for step navigation (e.g. /creator-lab/SF-xxx)
  const basePath = useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    // Pattern: /<session-type>/<orderId>[/<step>]
    // Keep first 2 parts: session-type + orderId
    return '/' + pathParts.slice(0, 2).join('/');
  }, [location.pathname]);

  // Navigate to a step by updating both context state and URL
  const navigateToStep = useCallback(
    (stepId: 'script' | 'images' | 'video' | 'studio') => {
      setActiveStep(stepId);
      navigate(`${basePath}/${stepId}`, { replace: true });
    },
    [setActiveStep, navigate, basePath],
  );

  // Handlers
  const handleStepClick = useCallback(
    (stepId: string) => {
      navigateToStep(stepId as 'script' | 'images' | 'video' | 'studio');
    },
    [navigateToStep],
  );

  const handleTitleSave = useCallback(
    (newTitle: string) => {
      dispatch({ type: 'SET_TITLE', title: newTitle });
    },
    [dispatch],
  );

  // Regenerate entire script via edge function
  const { user } = useAuth();
  const handleRegenerateScript = useCallback(async () => {
    if (state.isRegeneratingScript || state.scriptConfirmed) return;
    if (!state.topic) return;

    dispatch({ type: 'SET_REGENERATING_SCRIPT', isRegenerating: true });

    try {
      const settings = state.settings;
      const { data: scriptData, error: scriptError } = await supabase.functions.invoke(
        'generate-script',
        {
          body: {
            input_type: state.inputType || 'topic',
            content: state.topic.trim(),
            duration: settings?.duration || '45s',
            aspect_ratio: settings?.aspectRatio || '9:16',
            platform: (settings?.aspectRatio || '9:16') === '9:16' ? 'tiktok' : 'youtube',
            language: settings?.language || 'indonesian',
            user_id: user?.id,
            use_dna_tone: settings?.useDnaTone || false,
            video_model: settings?.model === 'auto' ? 'veo31' : (settings?.model || 'veo31'),
          },
        },
      );

      if (scriptError) throw new Error(scriptError.message);
      if (!scriptData?.success || !scriptData?.data?.segments?.length) {
        throw new Error(scriptData?.error?.message || 'Failed to regenerate script.');
      }

      // Unconfirm first so new data isn't locked
      dispatch({ type: 'UNCONFIRM_SCRIPT' });
      dispatch({
        type: 'SET_SCRIPT_DATA',
        segments: mapEdgeSegments(scriptData.data.segments),
        hookOptions: scriptData.data.hook_options || null,
        qualityReport: scriptData.data.quality_report || null,
      });
    } catch (err: any) {
      console.error('[Workspace] Regenerate script failed:', err);
      // TODO: show toast notification on error
    } finally {
      dispatch({ type: 'SET_REGENERATING_SCRIPT', isRegenerating: false });
    }
  }, [state.isRegeneratingScript, state.scriptConfirmed, state.topic, state.inputType, state.settings, user?.id, dispatch]);

  // Determine which wings to show
  const isScriptStep = activeStep === 'script';

  // Initialize workspace — priority: DB restore (handled by useSessionPersistence) → location.state → mock data
  const initRef = useRef(false);
  useEffect(() => {
    // Wait for DB restore attempt to complete before initializing
    if (isRestoring) return;
    // Only init once, when segments are empty and not generating
    if (initRef.current || state.segments.length > 0 || state.isGeneratingScript) return;
    initRef.current = true;

    // Priority 1: Real data from ChatHome navigation (location.state)
    if (locationState?.segments?.length) {
      const vs = locationState.videoSettings;
      const langCode = LANG_REVERSE_MAP[vs?.language || ''] || vs?.language || 'id';
      dispatch({
        type: 'RESTORE_SESSION',
        markDirty: true, // Triggers auto-save so data persists to DB
        state: {
          orderId: locationState.orderId || orderId,
          sessionType,
          topic: locationState.topic,
          title: locationState.topic,
          segments: mapEdgeSegments(locationState.segments),
          hookOptions: locationState.hookOptions || null,
          qualityReport: locationState.qualityReport || null,
          selectedHook: 'option_a_safe',
          settings: {
            duration: (vs?.duration || '60s') as '30s' | '45s' | '60s' | '90s',
            aspectRatio: (vs?.aspectRatio || '9:16') as '9:16' | '16:9',
            language: langCode,
            model: vs?.model || 'auto',
            avatarOption: (locationState.avatarOption || 'none') as 'none' | 'profile' | 'saved' | 'upload',
            avatarId: locationState.avatarId || null,
            avatarUrl: locationState.avatarUrl || null,
            characterDescription: locationState.characterDescription || null,
            useDnaTone: false,
          },
        },
      });
      // Trigger immediate save so data persists to DB (don't rely on 5s debounce)
      saveNow();
      return;
    }

    // If DB had a session (even with empty segments), don't load mock data
    if (sessionFound) return;

    // If there's an orderId in the URL, don't load mock data — wait for DB restore
    // This prevents mock data from appearing on refresh when auth/DB is slow
    if (orderId) {
      console.warn('[Workspace] orderId present but no session found and no location.state — skipping mock data');
      return;
    }

    // Mock data fallback (dev only — no orderId, no ChatHome data, no DB session)
    if (import.meta.env.DEV) {
      console.warn('[Workspace] Loading mock data — no orderId, no location.state, no DB session');
      dispatch({
        type: 'RESTORE_SESSION',
        state: {
          segments: createMockWorkspaceSegments(),
          hookOptions: MOCK_WS_HOOK_OPTIONS,
          selectedHook: 'option_a_safe',
          topic: '3 AI Tools Bikin Passive Income',
          title: '3 AI Tools Bikin Passive Income',
          settings: {
            duration: '60s',
            aspectRatio: '9:16',
            language: 'id',
            model: 'auto',
            avatarOption: 'none',
            avatarId: null,
            avatarUrl: null,
            characterDescription: null,
            useDnaTone: false,
          },
        },
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- saveNow is stable (useCallback), locationState checked once via initRef
  }, [isRestoring, sessionFound, state.segments.length, state.isGeneratingScript, dispatch, locationState, orderId, sessionType, saveNow]);

  // Floating nav state
  const mainRef = useRef<HTMLElement>(null);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => setShowScrollTop(el.scrollTop > 100);
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // NOTE: Auto-focus removed — was causing IssuesTab flicker (focusedSegmentId filters
  // the issue list, creating a visible drop from N to 1-2 issues on mount).
  // focusedSegmentId is now only set by explicit user actions (retention curve click, segment click).

  // Client-side scoring fallback when no backend qualityReport exists
  // Uses proper analyzeSegment() for accurate feature detection (not hardcoded 0.5)
  const clientScore = useMemo(() => {
    const segs = state.segments.filter(s => s.isEnabled !== false);
    if (segs.length === 0) return null;

    const lang = state.settings?.language || 'id';

    // Convert WorkspaceSegments → SegmentInput for analysis
    const segInputs: SegmentInput[] = segs.map(s => ({
      id: s.id,
      segmentType: s.segmentType,
      script: s.script,
      durationSeconds: s.durationSeconds,
      maxWords: s.maxWords || Math.round((130 / 60) * s.durationSeconds * 0.80),
      emotion: s.emotion,
      isEnabled: s.isEnabled,
    }));

    let hookScore = 0, ctaScore = 0, totalWeightedScore = 0, totalWeight = 0;
    let densitySum = 0, pacingOk = 0, editCueCount = 0;

    for (const seg of segInputs) {
      const analysis = analyzeSegment(seg, lang, segInputs);
      const segType = seg.segmentType || 'BODY';
      const st = (segType.startsWith('BODY') ? 'BODY' : segType) as SegmentType;
      const weight = SEGMENT_WEIGHT_IN_OVERALL[st] ?? 0.1;
      totalWeightedScore += analysis.score * weight;
      totalWeight += weight;

      if (st === 'HOOK') hookScore = analysis.score;
      if (st === 'CTA') ctaScore = analysis.score;

      const wordCount = seg.script.trim().split(/\s+/).filter(Boolean).length;
      const density = seg.maxWords > 0 ? wordCount / seg.maxWords : 0;
      densitySum += density;
      if (density >= 0.6 && density <= 1.0) pacingOk++;

      const wsSeg = state.segments.find(s => s.id === seg.id);
      if (wsSeg?.visualDirection && wsSeg.visualDirection.length > 20) editCueCount++;
    }

    const overall = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
    const avgDensity = Math.round((densitySum / segInputs.length) * 100);
    const pacingScore = Math.round((pacingOk / segInputs.length) * 100);
    const editingScore = Math.round((editCueCount / segInputs.length) * 100);

    const toStatus = (s: number): 'pass' | 'warn' | 'fail' => s >= 70 ? 'pass' : s >= 50 ? 'warn' : 'fail';

    return {
      final_score: overall,
      breakdown: {
        hook: { score: hookScore || overall, status: toStatus(hookScore || overall) },
        pacing: { score: pacingScore, status: toStatus(pacingScore) },
        density: { score: Math.min(100, avgDensity), status: toStatus(Math.min(100, avgDensity)) },
        cta: { score: ctaScore || overall, status: toStatus(ctaScore || overall) },
        editingCues: { score: editingScore, status: toStatus(editingScore) },
      } as ScoreBreakdown,
    };
  }, [state.segments, state.settings?.language]);

  // Handle Fix button click on segment cards — runs analysis + applies best quick fix
  const handleFixSegment = useCallback((segmentId: string) => {
    const seg = state.segments.find(s => s.id === segmentId);
    if (!seg || !seg.segmentType) return;
    const lang = state.settings?.language || 'id';

    const segInput: SegmentInput = {
      id: seg.id,
      segmentType: seg.segmentType,
      script: seg.script || '',
      durationSeconds: seg.durationSeconds,
      maxWords: seg.maxWords || Math.round((130 / 60) * seg.durationSeconds * 0.80),
      emotion: seg.emotion,
      isEnabled: seg.isEnabled,
    };

    const allInputs: SegmentInput[] = state.segments
      .filter(s => s.isEnabled !== false)
      .map(s => ({
        id: s.id, segmentType: s.segmentType, script: s.script,
        durationSeconds: s.durationSeconds,
        maxWords: s.maxWords || Math.round((130 / 60) * s.durationSeconds * 0.80),
        emotion: s.emotion, isEnabled: s.isEnabled,
      }));

    const analysis = analyzeSegment(segInput, lang, allInputs);
    const fixes = generateQuickFixes(segInput, analysis, lang);

    if (fixes.length > 0) {
      const fix = fixes[0];
      dispatch({ type: 'EDIT_SEGMENT', segmentId, field: fix.field, value: fix.preview });
    }
  }, [state.segments, state.settings?.language, dispatch]);

  // Always prefer client-side virality score (analyzeSegment-based, same as StyleTab/OverviewTab)
  // Backend qualityReport.final_score is a validation score (slang + format), NOT virality
  const effectiveScore = clientScore?.final_score ?? 0;
  const effectiveBreakdown = clientScore?.breakdown;

  return (
    <div className="h-full bg-[#0B0E14] flex flex-col">
      {/* ================================================================ */}
      {/* TOP BAR                                                          */}
      {/* ================================================================ */}
      <header className="sticky top-0 z-30 bg-[#0B0E14]/95 backdrop-blur-sm border-b border-[#262626]">
        <div className="flex items-center justify-between px-4 py-3 lg:px-6">
          {/* Left: Order ID + Title */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex-shrink-0 text-[11px] font-mono text-[#57534E] bg-[#161616] border border-[#262626] px-2.5 py-1 rounded-md select-all">
              {orderId || state.orderId || 'No Session'}
            </span>
            <EditableTitle
              title={state.topic || state.title || 'Untitled'}
              onSave={handleTitleSave}
            />
          </div>

          {/* Center/Right: StepBar */}
          <div className="flex-shrink-0 ml-4">
            <StepBar
              steps={steps}
              activeStep={activeStep}
              onStepClick={handleStepClick}
            />
          </div>
        </div>
      </header>

      {/* ================================================================ */}
      {/* TRINITY POWER VIEW (3-column layout)                             */}
      {/* ================================================================ */}
      <div className="flex-1 flex min-h-0">

        {/* ============================================================ */}
        {/* CENTER — main content area (scrollable)                      */}
        {/* ============================================================ */}
        <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto hide-scrollbar">
          <div className={`p-4 lg:p-6 ${isScriptStep ? 'max-w-4xl mx-auto' : 'max-w-[1600px] mx-auto'}`}>
            {activeStep === 'script' && (
              <ScriptStep
                topic={state.topic || state.title || ''}
                workspaceSegments={state.segments.length > 0 ? state.segments : undefined}
                hookOptions={state.hookOptions}
                selectedHook={state.selectedHook}
                onSelectHook={(key) => dispatch({ type: 'SELECT_HOOK', key })}
                viralityScore={effectiveScore}
                scoreBreakdown={effectiveBreakdown}
                scriptConfirmed={state.scriptConfirmed}
                onConfirm={() => {
                  dispatch({ type: 'CONFIRM_SCRIPT' });
                  // Auto-navigate to Images step after confirming
                  navigateToStep('images');
                }}
                onUnconfirm={() => dispatch({ type: 'UNCONFIRM_SCRIPT' })}
                isRegenerating={state.isRegeneratingScript}
                onRegenerateScript={handleRegenerateScript}
                onEditSegment={(id, field, value) => dispatch({ type: 'EDIT_SEGMENT', segmentId: id, field, value })}
                onFixSegment={handleFixSegment}
                onToggleSegment={(id) => dispatch({ type: 'TOGGLE_SEGMENT', segmentId: id })}
                onAdjustDuration={(id, dur) => dispatch({ type: 'ADJUST_DURATION', segmentId: id, durationSeconds: dur })}
                focusedSegmentId={state.focusedSegmentId ?? null}
                onFocusSegment={(segmentId) => dispatch({ type: 'SET_FOCUSED_SEGMENT', segmentId })}
                onMergeSegments={(id1, id2) => dispatch({ type: 'MERGE_SEGMENTS', segmentId1: id1, segmentId2: id2 })}
                onSplitSegment={(id, idx) => dispatch({ type: 'SPLIT_SEGMENT', segmentId: id, splitIndex: idx })}
              />
            )}
            {activeStep === 'images' && <ImageStep saveNow={saveNow} />}
            {activeStep === 'video' && <VideoStep />}
            {activeStep === 'studio' && <StudioStep />}
          </div>
        </main>

        {/* ============================================================ */}
        {/* RIGHT WING — "Smart Companion" (3-tab panel)                 */}
        {/* Only visible during Script step, hidden < 1280px             */}
        {/* ============================================================ */}
        {isScriptStep && (
          <>
            {/* Drag handle */}
            <div
              onMouseDown={handleDragStart}
              className="hidden xl:flex flex-col items-center justify-center w-1.5 flex-shrink-0 cursor-col-resize bg-[#262626] hover:bg-emerald-500/40 transition-colors group select-none"
              title="Drag to resize"
            >
              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-0.5 h-3 bg-emerald-400 rounded-full" />
                <div className="w-0.5 h-3 bg-emerald-400 rounded-full" />
                <div className="w-0.5 h-3 bg-emerald-400 rounded-full" />
              </div>
            </div>

            {/* Right panel */}
            <aside
              className="hidden xl:flex flex-col flex-shrink-0 bg-[#0B0E14] overflow-y-auto"
              style={{ width: rightWidth }}
            >
              <SmartCompanion
                segments={state.segments}
                language={state.settings?.language || 'id'}
                hookOptions={state.hookOptions}
                selectedHook={state.selectedHook}
                scoreBreakdown={effectiveBreakdown ?? null}
                viralityScore={effectiveScore}
                focusedSegmentId={state.focusedSegmentId ?? null}
                scriptConfirmed={state.scriptConfirmed}
                onSelectHook={(key) => dispatch({ type: 'SELECT_HOOK', key })}
                onEditSegment={(id, field, value) => dispatch({ type: 'EDIT_SEGMENT', segmentId: id, field, value })}
                onFocusSegment={(id) => dispatch({ type: 'SET_FOCUSED_SEGMENT', segmentId: id })}
                onSaveNow={saveNow}
              />
            </aside>
          </>
        )}
      </div>

      {/* ================================================================ */}
      {/* FLOATING NAV — fixed to viewport, outside scroll container       */}
      {/* ================================================================ */}
      {(() => {
        const STEPS = ['script', 'images', 'video', 'studio'] as const;
        const STEP_LABELS: Record<string, string> = {
          script: 'Script', images: 'Images', video: 'Video', studio: 'Studio',
        };
        const idx = STEPS.indexOf(activeStep as any);
        const prevStep = idx > 0 ? STEPS[idx - 1] : null;
        const nextStep = idx < STEPS.length - 1 ? STEPS[idx + 1] : null;
        const sessionBaseRoute =
          sessionType === 'creator_lab' ? '/creator-lab' :
          sessionType === 'ad_studio' ? '/ad-studio' : '/script-gen';
        const nav = t.workspaceNav;
        const topicLabel = state.topic || state.title || '';
        const confirmBody = nav.backConfirmBody.replace('{topic}', topicLabel);

        return (
          <div className="fixed bottom-6 left-0 right-0 flex justify-between items-end px-6 pointer-events-none z-[100]">
            {/* LEFT: PREVIOUS (if exists) or Choose New Topic */}
            {prevStep ? (
              <button
                onClick={() => navigateToStep(prevStep)}
                className="pointer-events-auto opacity-50 hover:opacity-100 transition-opacity duration-200
                           flex items-center gap-1.5 px-3 py-2 bg-neutral-700 border border-neutral-600
                           rounded-lg text-xs text-neutral-200 hover:text-white shadow-lg cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                {nav.navPrev}
              </button>
            ) : (
              <button
                onClick={() => setShowBackConfirm(true)}
                className="pointer-events-auto opacity-50 hover:opacity-100 transition-opacity duration-200
                           flex items-center gap-1.5 px-3 py-2 bg-neutral-700 border border-neutral-600
                           rounded-lg text-xs text-neutral-200 hover:text-white shadow-lg cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {nav.chooseNewTopic}
              </button>
            )}

            {/* RIGHT: Scroll Top + Next */}
            <div className="pointer-events-auto flex items-center gap-2">
              {showScrollTop && (
                <button
                  onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="p-2 bg-violet-600 hover:bg-violet-500 border border-violet-500/30 rounded-lg text-white shadow-lg cursor-pointer transition-colors"
                  title={nav.scrollToTop}
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              )}
              {nextStep && (
                <button
                  onClick={() => navigateToStep(nextStep)}
                  className="opacity-50 hover:opacity-100 transition-opacity duration-200
                             flex items-center gap-1.5 px-3 py-2 bg-emerald-600 border border-emerald-500/30
                             rounded-lg text-xs text-white shadow-lg cursor-pointer font-medium"
                >
                  {nav.navNext}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Back-to-topic confirmation dialog */}
            {showBackConfirm && (
              <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center pointer-events-auto"
                   onClick={(e) => { if (e.target === e.currentTarget) setShowBackConfirm(false); }}>
                <div className="bg-[#1E1E1E] border border-[#262626] rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
                  <h3 className="text-base font-semibold text-white">{nav.backConfirmTitle}</h3>
                  <p className="text-neutral-400 text-sm mt-2">{confirmBody}</p>
                  <div className="flex gap-2 mt-5">
                    <button
                      onClick={() => setShowBackConfirm(false)}
                      className="flex-1 px-3 py-2 bg-[#2A2A2A] border border-[#363636] rounded-lg text-sm text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    >
                      {nav.backConfirmCancel}
                    </button>
                    <button
                      onClick={() => navigate(sessionBaseRoute)}
                      className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm text-white font-medium transition-colors cursor-pointer"
                    >
                      {nav.backConfirmConfirm}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};
