import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil, Brain, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { StepBar, StepInfo } from './components/StepBar';
import { ScriptStep } from './steps/ScriptStep';
import ImageStep from './steps/ImageStep';
import VideoStep from './steps/VideoStep';
import { StudioStep } from './steps/StudioStep';
import { ViralityScore } from './components/ViralityScore';
import { RetentionCurve } from './components/RetentionCurve';
import { EmotionArc } from './components/EmotionArc';
import { TuningSliders, DEFAULT_SLIDER_VALUES } from './components/TuningSliders';
import { AIScriptCoach } from './components/AIScriptCoach';
import type { ScoreBreakdown, WorkspaceSegment, HookOptions } from '../../contexts/WorkspaceContext';
import {
  scoreSegment,
  hasQuestion,
  hasNumber,
  hasNegativeFrame,
  hasForeshadow,
  hasCtaAction,
  hasFirstPersonCta,
  detectPowerWords,
  SEGMENT_WEIGHT_IN_OVERALL,
  type SegmentType,
} from '../../lib/knowledge/12-scoring-engine';

// ============================================================================
// MOCK DATA — populates WorkspaceContext when no real data exists
// All features (edit, hook switch, split, merge, AI Coach) operate on this data
// ============================================================================

const MOCK_WS_HOOK_OPTIONS: HookOptions = {
  option_a_safe: {
    script_text: 'Lo gak tau 3 cara AI ini? Rugi parah.',
    visual_direction:
      'Scene: Creator di coffee shop, tuang kopi | Camera: Medium \u2192 Push-in ke wajah | [TEXT POP: "3 CARA AI"] | [SFX: Ding]',
    hook_type: 'curiosity_gap',
  },
  option_b_negative: {
    script_text: 'Stop kerja manual! 3 AI tools ini literally ganti lo.',
    visual_direction:
      'Scene: Creator slam laptop tutup | Camera: Close-up slam \u2192 Whip-pan ke wajah | [SFX: Boom] | [TEXT POP: "STOP"]',
    hook_type: 'negative_controversial',
  },
  option_c_visual: {
    script_text: 'Liat dashboard gue? 3 AI tools bikin semua ini.',
    visual_direction:
      '[Camera: Blur \u2192 Sharp focus on screen] | Creator tunjuk laptop | [CUT TO: Screen recording dashboard] | [SFX: Cash register]',
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
  // Scripts optimized to score 80%+ on each segment's scoring rules
  // HOOK (5s, 9w): question + number + power word + negative frame + pattern interrupt
  // FORE (8s, 14w): foreshadow + transition + builds_on_hook + specific detail
  // BODY (8s, 14w): pattern interrupt + specific detail + transition word + value delivery
  // PEAK (8s, 14w): emotional climax + unexpected twist + specific proof + high intensity
  // CTA (5s, 9w): clear action + first person + single focus + urgency
  // LOOP-END (5s, 9w): mirrors hook energy + callback + emotional match
  return [
    { ...base, id: '1', segmentId: '1', segmentNumber: 1, segmentType: 'HOOK', shotType: 'CREATOR' as const, durationSeconds: 5, maxWords: 9, script: 'Lo gak tau 3 cara AI ini? Rugi parah.', visualDirection: 'Scene: Creator di coffee shop, tuang kopi | Camera: Medium \u2192 Push-in ke wajah | [TEXT POP: "3 CARA AI"] | [SFX: Ding]', emotion: 'excited' },
    { ...base, id: '2', segmentId: '2', segmentNumber: 2, segmentType: 'FORE', shotType: 'B-ROLL' as const, durationSeconds: 8, maxWords: 14, script: 'Tapi tunggu, yang ketiga literally bikin 50 orang quit 9-to-5.', visualDirection: '[CUT TO: AI tools dashboard montage] | Camera: Quick-cut sequence | [SFX: Whoosh]', emotion: 'intriguing' },
    { ...base, id: '3', segmentId: '3', segmentNumber: 3, segmentType: 'BODY-1', shotType: 'B-ROLL' as const, durationSeconds: 8, maxWords: 14, script: 'Nah pertama: AI copywriting. Jasper bikin 50 artikel per hari, coba sendiri.', visualDirection: '[CUT TO: Screen recording Jasper] | Camera: Zoom-in ke text output | [SFX: Typing]', emotion: 'informative' },
    { ...base, id: '4', segmentId: '4', segmentNumber: 4, segmentType: 'BODY-2', shotType: 'B-ROLL' as const, durationSeconds: 8, maxWords: 14, script: 'Tapi kedua lebih gila: AI video, 10 menit bikin satu TikTok. 50 juta views.', visualDirection: '[CUT TO: AI video generation screen] | Camera: Pan across multiple TikTok screens', emotion: 'surprising' },
    { ...base, id: '5', segmentId: '5', segmentNumber: 5, segmentType: 'PEAK', shotType: 'B-ROLL' as const, durationSeconds: 8, maxWords: 14, script: 'Tapi ternyata ketiga paling gila: AI trading, 100 orang profit 40% dalam 3 bulan.', visualDirection: '[CUT TO: Trading dashboard green profit] | Camera: Slow zoom ke profit number', emotion: 'mind-blown' },
    { ...base, id: '6', segmentId: '6', segmentNumber: 6, segmentType: 'CTA', shotType: 'CREATOR' as const, durationSeconds: 5, maxWords: 9, script: 'Save sekarang, follow gue biar gak ketinggalan.', visualDirection: 'Scene: Creator sip kopi, relaxed smile | Camera: Medium shot', emotion: 'friendly' },
    { ...base, id: '7', segmentId: '7', segmentNumber: 7, segmentType: 'LOOP-END', shotType: 'CREATOR' as const, durationSeconds: 5, maxWords: 9, script: 'Inget tadi gue bilang rugi? Gue lupa satu...', visualDirection: 'Scene: Creator tuang kopi lagi (mirror HOOK) | Camera: Same angle as HOOK', emotion: 'teasing' },
  ];
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
// SCRIPT DNA PANEL — sticky collapsible at bottom of right wing
// ============================================================================

interface ScriptDNAPanelProps {
  values: { hookAggressiveness: number; controversyLevel: number; humorDensity: number; pacing: number; emotionalIntensity: number };
  onChange: (values: ScriptDNAPanelProps['values']) => void;
  onApply: () => void;
  disabled: boolean;
}

const ScriptDNAPanel: React.FC<ScriptDNAPanelProps> = ({ values, onChange, onApply, disabled }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="sticky bottom-0 flex-shrink-0 border-t border-[#262626] bg-[#0B0E14]">
      {/* Header — always visible, click to toggle */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#161616] transition-colors"
      >
        <span className="text-[10px] font-semibold text-[#57534E] uppercase tracking-wider">
          Script DNA
        </span>
        {isCollapsed ? (
          <ChevronUp className="w-3.5 h-3.5 text-[#57534E]" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-[#57534E]" />
        )}
      </button>

      {/* Collapsible content */}
      {!isCollapsed && (
        <div className="px-4 pb-4">
          <TuningSliders
            values={values}
            onChange={onChange}
            onApply={onApply}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
};

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
          topic: '3 Cara AI Bikin Passive Income',
          title: '3 Cara AI Bikin Passive Income',
        },
      });
    }
  }, [state.segments.length, state.isGeneratingScript, dispatch]);

  // Auto-focus first enabled segment so AI Coach shows analysis immediately
  useEffect(() => {
    if (isScriptStep && !state.focusedSegmentId && state.segments.length > 0) {
      const firstEnabled = state.segments.find(s => s.isEnabled !== false);
      if (firstEnabled) {
        dispatch({ type: 'SET_FOCUSED_SEGMENT', segmentId: firstEnabled.id });
      }
    }
  }, [isScriptStep, state.focusedSegmentId, state.segments, dispatch]);

  // Client-side scoring fallback when no backend qualityReport exists
  const clientScore = useMemo(() => {
    const segs = state.segments.filter(s => s.isEnabled !== false);
    if (segs.length === 0) return null;

    const lang = state.settings?.language || 'id';
    let hookScore = 0, ctaScore = 0, totalWeightedScore = 0, totalWeight = 0;
    let densitySum = 0, pacingOk = 0, editCueCount = 0;

    for (const seg of segs) {
      const st = (seg.segmentType.startsWith('BODY') ? 'BODY' : seg.segmentType) as SegmentType;
      const words = seg.script.trim().split(/\s+/).filter(Boolean);
      const wordCount = words.length;
      const maxWords = seg.maxWords || Math.round((130 / 60) * seg.durationSeconds * 0.80);
      const density = maxWords > 0 ? wordCount / maxWords : 0;

      const features: Record<string, boolean | number> = {
        has_question: hasQuestion(seg.script),
        has_number: hasNumber(seg.script),
        has_power_word: detectPowerWords(seg.script, lang).length > 0,
        has_negative_frame: hasNegativeFrame(seg.script),
        word_density_optimal: density >= 0.7 && density <= 0.9 ? 1 : density > 0.9 ? Math.max(0, 1 - (density - 0.9) * 5) : density / 0.7,
        under_word_limit: wordCount <= maxWords,
        has_pattern_interrupt: hasForeshadow(seg.script),
        has_foreshadow: hasForeshadow(seg.script),
        has_transition: 0.5,
        builds_on_hook: 0.5,
        has_specific_detail: hasNumber(seg.script) ? 1 : 0.5,
        has_transition_word: /\b(tapi|nah|but|however|terus)\b/i.test(seg.script),
        has_value_delivery: 0.5,
        has_emotional_climax: 0.5,
        has_unexpected_twist: 0.5,
        has_specific_proof: hasNumber(seg.script) ? 1 : 0.5,
        emotional_intensity_high: 0.5,
        has_clear_action: hasCtaAction(seg.script),
        first_person: hasFirstPersonCta(seg.script),
        single_focus: 0.5,
        has_urgency_word: /\b(sekarang|now|segera|today|limited)\b/i.test(seg.script),
        matches_funnel_stage: 0.5,
        matches_hook_category: 0.5,
        mirrors_hook_energy: 0.5,
        has_callback: 0.5,
        emotional_match: 0.5,
      };

      const result = scoreSegment(st, features);
      const weight = SEGMENT_WEIGHT_IN_OVERALL[st] ?? 0.1;
      totalWeightedScore += result.total * weight;
      totalWeight += weight;

      if (st === 'HOOK') hookScore = result.total;
      if (st === 'CTA') ctaScore = result.total;
      densitySum += density;
      if (density >= 0.6 && density <= 1.0) pacingOk++;
      if (seg.visualDirection && seg.visualDirection.length > 20) editCueCount++;
    }

    const overall = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
    const avgDensity = Math.round((densitySum / segs.length) * 100);
    const pacingScore = Math.round((pacingOk / segs.length) * 100);
    const editingScore = Math.round((editCueCount / segs.length) * 100);

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
        {/* LEFT WING — "AI Script Coach"                                */}
        {/* Only visible during Script step, hidden < 1440px             */}
        {/* ============================================================ */}
        {isScriptStep && (
          <aside className="hidden min-[1440px]:flex flex-col w-[240px] flex-shrink-0 border-r border-[#262626] bg-[#0B0E14] overflow-y-auto hide-scrollbar">
            <div className="p-3 space-y-3">
              {/* Section title */}
              <div className="flex items-center gap-1.5 px-1">
                <Brain className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[9px] font-bold text-[#57534E] uppercase tracking-[0.15em]">
                  AI Script Coach
                </span>
              </div>

              <AIScriptCoach
                segments={state.segments}
                focusedSegmentId={state.focusedSegmentId ?? null}
                language={state.settings?.language || 'id'}
                onApplySuggestion={(segmentId, field, value) => {
                  dispatch({ type: 'EDIT_SEGMENT', segmentId, field, value });
                }}
              />
            </div>
          </aside>
        )}

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
                onEditSegment={(id, field, value) => dispatch({ type: 'EDIT_SEGMENT', segmentId: id, field, value })}
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
        {/* RIGHT WING — "Script Intelligence Dashboard"                 */}
        {/* Only visible during Script step, hidden < 1280px             */}
        {/* ============================================================ */}
        {isScriptStep && (
          <aside className="hidden xl:flex flex-col w-[280px] flex-shrink-0 border-l border-[#262626] bg-[#0B0E14]">
            {/* Scrollable analytics section */}
            <div className="flex-1 overflow-y-auto hide-scrollbar p-4 space-y-4">
              {/* Section title */}
              <div className="flex items-center gap-1.5 px-1">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[9px] font-bold text-[#57534E] uppercase tracking-[0.15em]">
                  Script Intelligence
                </span>
              </div>

              {/* Virality Score (expanded ring + breakdown) */}
              {effectiveBreakdown && (
                <div className="rounded-xl border border-[#262626] bg-[#161616] p-4">
                  <ViralityScore
                    score={effectiveScore}
                    breakdown={effectiveBreakdown}
                  />
                </div>
              )}

              {/* Retention Curve */}
              {state.segments.length > 0 && (
                <div className="rounded-xl border border-[#262626] bg-[#161616] p-4">
                  <span className="text-[10px] font-semibold text-[#57534E] uppercase tracking-wider block">
                    Viewer Retention
                  </span>
                  <p className="text-[9px] text-[#57534E] leading-relaxed mt-0.5 mb-2">
                    Estimated % of viewers still watching at each segment. Low bars = viewers leaving. Click a bar to fix that segment.
                  </p>
                  <RetentionCurve
                    segments={state.segments}
                    language={state.settings?.language || 'id'}
                    onSegmentClick={(i) => {
                      const enabledSegs = state.segments.filter(s => s.isEnabled !== false);
                      const seg = enabledSegs[i];
                      if (seg) dispatch({ type: 'SET_FOCUSED_SEGMENT', segmentId: seg.id });
                    }}
                  />
                </div>
              )}

              {/* Emotion Arc */}
              {state.segments.length > 0 && (
                <div className="rounded-xl border border-[#262626] bg-[#161616] p-4">
                  <span className="text-[10px] font-semibold text-[#57534E] uppercase tracking-wider block mb-2">
                    Emotion Arc
                  </span>
                  <EmotionArc
                    segments={state.segments}
                    language={state.settings?.language || 'id'}
                    onSegmentClick={(i) => {
                      const seg = state.segments.filter(s => s.isEnabled !== false)[i];
                      if (seg) dispatch({ type: 'SET_FOCUSED_SEGMENT', segmentId: seg.id });
                    }}
                  />
                </div>
              )}
            </div>

            {/* Sticky Script DNA at bottom — collapsible */}
            <ScriptDNAPanel
              values={state.sliderValues ?? DEFAULT_SLIDER_VALUES}
              onChange={(values) => dispatch({ type: 'SET_SLIDER_VALUES', values })}
              onApply={() => {
                const sv = state.sliderValues ?? DEFAULT_SLIDER_VALUES;
                const aggro = sv.hookAggressiveness + sv.controversyLevel;
                let targetHook: 'option_a_safe' | 'option_b_negative' | 'option_c_visual';
                if (aggro >= 14) {
                  targetHook = 'option_b_negative';
                } else if (aggro <= 6) {
                  targetHook = 'option_a_safe';
                } else {
                  targetHook = 'option_c_visual';
                }
                if (targetHook !== state.selectedHook && state.hookOptions) {
                  dispatch({ type: 'SELECT_HOOK', key: targetHook });
                }
              }}
              disabled={state.scriptConfirmed}
            />
          </aside>
        )}
      </div>
    </div>
  );
};
