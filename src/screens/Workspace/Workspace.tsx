import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowRight,
  Minus,
  Palette,
  Hash,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Pencil,
  Eye,
  Smartphone,
} from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { StepBar, StepInfo } from './components/StepBar';
import { ScriptStep } from './steps/ScriptStep';
import ImageStep from './steps/ImageStep';
import VideoStep from './steps/VideoStep';
import { StudioStep } from './steps/StudioStep';

// ============================================================================
// MOCK DATA
// ============================================================================

interface VelocityTopic {
  keyword: string;
  velocity: number;
  direction: 'up' | 'stable' | 'down';
  source: 'tiktok' | 'google' | 'instagram';
}

const MOCK_VELOCITY_TOPICS: VelocityTopic[] = [
  { keyword: 'AI Trading Bot', velocity: 87, direction: 'up', source: 'tiktok' },
  { keyword: 'Epstein Files', velocity: 95, direction: 'up', source: 'google' },
  { keyword: 'React 20', velocity: 72, direction: 'up', source: 'google' },
  { keyword: 'Crypto Bull Run', velocity: 64, direction: 'stable', source: 'tiktok' },
  { keyword: 'Mie Gacoan IPO', velocity: 81, direction: 'up', source: 'instagram' },
];

interface PreFlightItem {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail' | 'pending';
  detail: string;
}

const MOCK_PREFLIGHT_ITEMS: PreFlightItem[] = [
  { id: 'hook', label: 'Hook', status: 'pass', detail: 'Strong' },
  { id: 'pacing', label: 'Pacing', status: 'pass', detail: 'Fast' },
  { id: 'cta', label: 'CTA', status: 'pass', detail: 'Included' },
  { id: 'images', label: 'Images', status: 'pending', detail: '0/7' },
  { id: 'duration', label: 'Duration', status: 'pass', detail: '60s' },
  { id: 'script', label: 'Script', status: 'warn', detail: 'Not confirmed' },
];

const MOCK_BRAND_KIT = {
  primaryColor: '#10B981',
  tone: 'Bold, conversational, Gen Z energy',
  hashtags: ['#sparkfluence', '#viralcontent', '#tiktokgrowth'],
};

// ============================================================================
// SUB-COMPONENTS: LEFT WING
// ============================================================================

/** Velocity Meter — trending keywords with velocity bars */
const VelocityMeter: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  const directionIcon = (dir: VelocityTopic['direction']) => {
    switch (dir) {
      case 'up':
        return <ArrowUpRight className="w-3 h-3 text-emerald-500" />;
      case 'stable':
        return <ArrowRight className="w-3 h-3 text-amber-400" />;
      case 'down':
        return <Minus className="w-3 h-3 text-red-400" />;
    }
  };

  const sourceLabel = (src: VelocityTopic['source']) => {
    switch (src) {
      case 'tiktok':
        return 'TT';
      case 'google':
        return 'G';
      case 'instagram':
        return 'IG';
    }
  };

  return (
    <div className="border border-[#262626] rounded-lg overflow-hidden">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-[#161616] hover:bg-[#1a1a1a] transition-colors"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-[11px] font-semibold text-[#FAFAF9] uppercase tracking-wider">
            Trending Near You
          </span>
        </div>
        {collapsed ? (
          <ChevronDown className="w-3.5 h-3.5 text-[#57534E]" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-[#57534E]" />
        )}
      </button>

      {/* Content */}
      {!collapsed && (
        <div className="p-2 space-y-1.5">
          {MOCK_VELOCITY_TOPICS.map((topic) => (
            <button
              key={topic.keyword}
              type="button"
              className="w-full group flex flex-col gap-1 px-2 py-1.5 rounded-md hover:bg-[#1a1a1a] transition-colors cursor-pointer"
              title={`Click to insert "${topic.keyword}"`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#FAFAF9] group-hover:text-emerald-400 transition-colors truncate max-w-[140px]">
                  {topic.keyword}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-mono text-[#57534E] bg-[#0B0E14] px-1 py-0.5 rounded">
                    {sourceLabel(topic.source)}
                  </span>
                  {directionIcon(topic.direction)}
                </div>
              </div>

              {/* Velocity bar */}
              <div className="w-full h-1 bg-[#0B0E14] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    topic.velocity >= 80
                      ? 'bg-emerald-500'
                      : topic.velocity >= 60
                        ? 'bg-amber-400'
                        : 'bg-[#78716C]'
                  }`}
                  style={{ width: `${topic.velocity}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/** Brand Kit — color swatch + tone + hashtags */
const BrandKit: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const hasKit = true; // Mock: set to false to see empty state

  return (
    <div className="border border-[#262626] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-[#161616] hover:bg-[#1a1a1a] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[11px] font-semibold text-[#FAFAF9] uppercase tracking-wider">
            Brand Kit
          </span>
        </div>
        {collapsed ? (
          <ChevronDown className="w-3.5 h-3.5 text-[#57534E]" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-[#57534E]" />
        )}
      </button>

      {!collapsed && (
        <div className="p-3 space-y-3">
          {hasKit ? (
            <>
              {/* Color swatch */}
              <div className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded border border-white/10"
                  style={{ backgroundColor: MOCK_BRAND_KIT.primaryColor }}
                />
                <span className="text-[11px] font-mono text-[#A8A29E]">
                  {MOCK_BRAND_KIT.primaryColor}
                </span>
              </div>

              {/* Tone */}
              <div>
                <span className="text-[10px] uppercase text-[#57534E] font-semibold tracking-wider">
                  Tone
                </span>
                <p className="text-[11px] text-[#A8A29E] mt-0.5">{MOCK_BRAND_KIT.tone}</p>
              </div>

              {/* Hashtags */}
              <div>
                <span className="text-[10px] uppercase text-[#57534E] font-semibold tracking-wider">
                  Hashtags
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {MOCK_BRAND_KIT.hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-3">
              <p className="text-[11px] text-[#57534E]">
                Set up your brand kit in Settings
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/** Pre-Flight Checklist — readiness indicators */
const PreFlightChecklist: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  const statusIcon = (status: PreFlightItem['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
      case 'warn':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      case 'fail':
        return <XCircle className="w-3.5 h-3.5 text-red-400" />;
      case 'pending':
        return <Clock className="w-3.5 h-3.5 text-[#57534E]" />;
    }
  };

  const statusColor = (status: PreFlightItem['status']) => {
    switch (status) {
      case 'pass':
        return 'text-green-500';
      case 'warn':
        return 'text-amber-400';
      case 'fail':
        return 'text-red-400';
      case 'pending':
        return 'text-[#57534E]';
    }
  };

  return (
    <div className="border border-[#262626] rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-[#161616] hover:bg-[#1a1a1a] transition-colors"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-[11px] font-semibold text-[#FAFAF9] uppercase tracking-wider">
            Pre-Flight
          </span>
        </div>
        {collapsed ? (
          <ChevronDown className="w-3.5 h-3.5 text-[#57534E]" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-[#57534E]" />
        )}
      </button>

      {!collapsed && (
        <div className="p-2 space-y-0.5">
          {MOCK_PREFLIGHT_ITEMS.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[#1a1a1a] transition-colors"
            >
              <div className="flex items-center gap-2">
                {statusIcon(item.status)}
                <span className="text-[11px] text-[#FAFAF9]">{item.label}</span>
              </div>
              <span className={`text-[10px] font-medium ${statusColor(item.status)}`}>
                {item.detail}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS: RIGHT WING
// ============================================================================

interface LiveSimulatorProps {
  selectedSegmentIndex: number;
  onSegmentChange: (index: number) => void;
}

/** Live Simulator — 9:16 phone frame preview */
const LiveSimulator: React.FC<LiveSimulatorProps> = ({
  selectedSegmentIndex,
  onSegmentChange,
}) => {
  const { state } = useWorkspace();
  const segments = state.segments;
  const segment = segments[selectedSegmentIndex] || null;

  const hasImage = segment?.imageUrl != null;
  const totalSegments = segments.length;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Header */}
      <div className="flex items-center gap-2 w-full">
        <Smartphone className="w-3.5 h-3.5 text-[#57534E]" />
        <span className="text-[10px] font-semibold text-[#57534E] uppercase tracking-wider">
          Live Preview
        </span>
      </div>

      {/* Phone frame */}
      <div className="relative w-[180px] aspect-[9/16] rounded-[2rem] bg-black ring-1 ring-white/10 overflow-hidden flex items-center justify-center">
        {/* Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-[#262626] rounded-full z-10" />

        {segment ? (
          hasImage ? (
            // Show actual image
            <img
              src={segment.imageUrl!}
              alt={`Segment ${segment.segmentNumber}`}
              className="w-full h-full object-cover"
            />
          ) : (
            // Show placeholder with segment info
            <div className="flex flex-col items-center justify-center p-4 text-center gap-2">
              <div
                className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  segment.shotType === 'CREATOR'
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                }`}
              >
                {segment.segmentType}
              </div>
              <Eye className="w-5 h-5 text-[#57534E] mt-1" />
              <p className="text-[9px] text-[#78716C] leading-relaxed line-clamp-4">
                {segment.visualDirection || 'No visual direction'}
              </p>
            </div>
          )
        ) : (
          // No segments at all
          <div className="flex flex-col items-center justify-center gap-2 p-4">
            <Eye className="w-6 h-6 text-[#57534E]" />
            <p className="text-[10px] text-[#57534E] text-center">
              Generate a script to preview segments
            </p>
          </div>
        )}
      </div>

      {/* Segment metadata */}
      {segment && (
        <div className="w-full space-y-2">
          {/* Segment navigation */}
          {totalSegments > 0 && (
            <div className="flex items-center justify-center gap-1">
              {segments.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSegmentChange(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === selectedSegmentIndex
                      ? 'bg-emerald-500 scale-125'
                      : 'bg-[#262626] hover:bg-[#3f3f46]'
                  }`}
                  title={`Segment ${idx + 1}`}
                />
              ))}
            </div>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 px-1">
            <div>
              <span className="text-[9px] text-[#57534E] uppercase">Segment</span>
              <p className="text-[10px] text-[#A8A29E] font-medium">
                #{segment.segmentNumber} {segment.segmentType}
              </p>
            </div>
            <div>
              <span className="text-[9px] text-[#57534E] uppercase">Duration</span>
              <p className="text-[10px] text-[#A8A29E] font-medium">
                {segment.durationSeconds}s
              </p>
            </div>
            <div>
              <span className="text-[9px] text-[#57534E] uppercase">Shot</span>
              <p className="text-[10px] text-[#A8A29E] font-medium">{segment.shotType}</p>
            </div>
            <div>
              <span className="text-[9px] text-[#57534E] uppercase">Layout</span>
              <p className="text-[10px] text-[#A8A29E] font-medium">{segment.layout}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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

  // Right wing: selected segment index for live simulator
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState(0);

  // Keep selectedSegmentIndex in bounds
  useEffect(() => {
    if (state.segments.length > 0 && selectedSegmentIndex >= state.segments.length) {
      setSelectedSegmentIndex(0);
    }
  }, [state.segments.length, selectedSegmentIndex]);

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
              title={state.title || 'Untitled'}
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
        {/* LEFT WING — "The Brain" (context panel)                      */}
        {/* Only visible during Script step, hidden < 1440px             */}
        {/* ============================================================ */}
        {isScriptStep && (
          <aside className="hidden min-[1440px]:flex flex-col w-[240px] flex-shrink-0 border-r border-[#262626] bg-[#0B0E14] overflow-y-auto">
            <div className="p-3 space-y-3">
              {/* Section title */}
              <div className="flex items-center gap-1.5 px-1">
                <Hash className="w-3 h-3 text-[#57534E]" />
                <span className="text-[9px] font-bold text-[#57534E] uppercase tracking-[0.15em]">
                  The Brain
                </span>
              </div>

              <VelocityMeter />
              <BrandKit />
              <PreFlightChecklist />
            </div>
          </aside>
        )}

        {/* ============================================================ */}
        {/* CENTER — main content area (scrollable)                      */}
        {/* ============================================================ */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 lg:p-6">
            {activeStep === 'script' && <ScriptStep />}
            {activeStep === 'images' && <ImageStep />}
            {activeStep === 'video' && <VideoStep />}
            {activeStep === 'studio' && <StudioStep />}
          </div>
        </main>

        {/* ============================================================ */}
        {/* RIGHT WING — "The Body" (live simulator)                     */}
        {/* Hidden < 1280px                                              */}
        {/* ============================================================ */}
        <aside className="hidden xl:flex flex-col w-[280px] flex-shrink-0 border-l border-[#262626] bg-[#0B0E14] overflow-y-auto">
          <div className="p-4 sticky top-0">
            <LiveSimulator
              selectedSegmentIndex={selectedSegmentIndex}
              onSegmentChange={setSelectedSegmentIndex}
            />
          </div>
        </aside>
      </div>
    </div>
  );
};
