import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil } from 'lucide-react';
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
      emotion: 'teasing', isEnabled: false },
  ];
}

// ============================================================================
// EDGE FUNCTION SEGMENT MAPPER
// Transforms snake_case edge function response → camelCase WorkspaceSegment
// ============================================================================

function mapEdgeSegments(rawSegments: any[]): WorkspaceSegment[] {
  return rawSegments.map((s: any, index: number) => ({
    id: s.id || s.segment_id || `seg-${index}`,
    segmentId: s.segment_id || s.segmentId || `VIDEO-${String(index + 1).padStart(3, '0')}`,
    segmentNumber: s.segment_number ?? s.segmentNumber ?? (index + 1),
    segmentType: s.segmentType || (s.type || '').toUpperCase(),
    shotType: (s.shot_type || s.shotType || 'B-ROLL').toUpperCase() as 'CREATOR' | 'B-ROLL',
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
    loopEndEnabled: s.loopEndEnabled ?? true,
    isEnabled: s.isEnabled ?? true,
    includeCreatorFace: s.includeCreatorFace,
    referenceImageUrl: s.referenceImageUrl,
  }));
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
// WORKSPACE CONTAINER
// ============================================================================

export const Workspace: React.FC = () => {
  const { orderId, step } = useParams<{ orderId: string; step?: string }>();
  const {
    state,
    dispatch,
    setActiveStep,
    canProceedToImages,
    canProceedToVideo,
    canProceedToStudio,
  } = useWorkspace();

  // Session persistence — auto-save on changes, restore on mount
  const { saveNow } = useSessionPersistence({ orderId });

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

  // Handlers
  const handleStepClick = useCallback(
    (stepId: string) => {
      setActiveStep(stepId as 'script' | 'images' | 'video' | 'studio');
    },
    [setActiveStep],
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

  // Initialize context with mock data so ALL features work (edit, hook switch, split, merge, AI Coach)
  const mockInitRef = useRef(false);
  useEffect(() => {
    if (!mockInitRef.current && state.segments.length === 0 && !state.isGeneratingScript) {
      mockInitRef.current = true;
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
  }, [state.segments.length, state.isGeneratingScript, dispatch]);

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

  // Use backend report if available, else client-side
  const effectiveScore = state.qualityReport?.final_score ?? clientScore?.final_score ?? 0;
  const effectiveBreakdown = state.qualityReport?.breakdown ?? clientScore?.breakdown;

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
        <main className="flex-1 min-h-0 overflow-y-auto hide-scrollbar">
          <div className="max-w-4xl mx-auto p-4 lg:p-6">
            {activeStep === 'script' && (
              <ScriptStep
                workspaceSegments={state.segments.length > 0 ? state.segments : undefined}
                hookOptions={state.hookOptions}
                selectedHook={state.selectedHook}
                onSelectHook={(key) => dispatch({ type: 'SELECT_HOOK', key })}
                viralityScore={effectiveScore}
                scoreBreakdown={effectiveBreakdown}
                scriptConfirmed={state.scriptConfirmed}
                onConfirm={() => dispatch({ type: 'CONFIRM_SCRIPT' })}
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
            {activeStep === 'images' && <ImageStep />}
            {activeStep === 'video' && <VideoStep />}
            {activeStep === 'studio' && <StudioStep />}
          </div>
        </main>

        {/* ============================================================ */}
        {/* RIGHT WING — "Smart Companion" (3-tab panel)                 */}
        {/* Only visible during Script step, hidden < 1280px             */}
        {/* ============================================================ */}
        {isScriptStep && (
          <aside className="hidden xl:flex flex-col w-[460px] flex-shrink-0 border-l border-[#262626] bg-[#0B0E14]">
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
        )}
      </div>
    </div>
  );
};
