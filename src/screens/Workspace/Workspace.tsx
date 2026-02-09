import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Pencil, Brain, BarChart3 } from 'lucide-react';
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
import type { ScoreBreakdown } from '../../contexts/WorkspaceContext';

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

  return (
    <div className="min-h-screen bg-[#0B0E14] flex flex-col">
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
      <div className="flex-1 flex overflow-hidden">
        {/* ============================================================ */}
        {/* LEFT WING — "AI Script Coach"                                */}
        {/* Only visible during Script step, hidden < 1440px             */}
        {/* ============================================================ */}
        {isScriptStep && (
          <aside className="hidden min-[1440px]:flex flex-col w-[240px] flex-shrink-0 border-r border-[#262626] bg-[#0B0E14] overflow-y-auto">
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
                language={state.settings.language}
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
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 lg:p-6">
            {activeStep === 'script' && (
              <ScriptStep
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
          <aside className="hidden xl:flex flex-col w-[280px] flex-shrink-0 border-l border-[#262626] bg-[#0B0E14] overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Section title */}
              <div className="flex items-center gap-1.5 px-1">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[9px] font-bold text-[#57534E] uppercase tracking-[0.15em]">
                  Script Intelligence
                </span>
              </div>

              {/* Virality Score (expanded ring + breakdown) */}
              {state.qualityReport && (
                <div className="rounded-xl border border-[#262626] bg-[#161616] p-4">
                  <ViralityScore
                    score={state.qualityReport.final_score}
                    breakdown={state.qualityReport.breakdown}
                  />
                </div>
              )}

              {/* Retention Curve */}
              {state.segments.length > 0 && (
                <div className="rounded-xl border border-[#262626] bg-[#161616] p-4">
                  <span className="text-[10px] font-semibold text-[#57534E] uppercase tracking-wider block mb-2">
                    Predicted Retention
                  </span>
                  <RetentionCurve
                    segments={state.segments}
                    language={state.settings.language}
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
                    language={state.settings.language}
                    onSegmentClick={(i) => {
                      const seg = state.segments.filter(s => s.isEnabled !== false)[i];
                      if (seg) dispatch({ type: 'SET_FOCUSED_SEGMENT', segmentId: seg.id });
                    }}
                  />
                </div>
              )}

              {/* Script Tuning Sliders */}
              <div className="rounded-xl border border-[#262626] bg-[#161616] p-4">
                <span className="text-[10px] font-semibold text-[#57534E] uppercase tracking-wider block mb-3">
                  Script DNA
                </span>
                <TuningSliders
                  values={state.sliderValues ?? DEFAULT_SLIDER_VALUES}
                  onChange={(values) => dispatch({ type: 'SET_SLIDER_VALUES', values })}
                  onApply={() => {
                    // Phase 5: will trigger regeneration with slider values
                  }}
                  disabled={state.scriptConfirmed}
                />
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
