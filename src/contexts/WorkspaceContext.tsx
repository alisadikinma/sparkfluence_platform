import React, { createContext, useContext, useReducer, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface HookOption {
  script_text: string;
  visual_direction: string;
  hook_type: string;
}

export interface HookOptions {
  option_a_safe: HookOption;
  option_b_negative: HookOption;
  option_c_visual: HookOption;
}

export interface ScoreBreakdown {
  hook: { score: number; status: 'pass' | 'warn' | 'fail' };
  pacing: { score: number; status: 'pass' | 'warn' | 'fail' };
  density: { score: number; status: 'pass' | 'warn' | 'fail' };
  cta: { score: number; status: 'pass' | 'warn' | 'fail' };
  editingCues: { score: number; status: 'pass' | 'warn' | 'fail' };
}

export interface QualityReport {
  final_score: number;
  breakdown: ScoreBreakdown;
  issues: Array<{
    segment_id: string;
    field: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    auto_fixed: boolean;
  }>;
}

export interface ScriptVersion {
  version: number;
  segments: WorkspaceSegment[];
  hookOptions: HookOptions | null;
  score: number;
  createdAt: string;
}

export interface WorkspaceSegment {
  id: string;
  segmentId: string;
  segmentNumber: number;
  segmentType: string;        // "HOOK", "FORE", "BODY-1", "PEAK", "CTA", "LOOP-END"
  shotType: 'CREATOR' | 'B-ROLL';
  timing: string;
  durationSeconds: number;
  script: string;
  visualDirection: string;
  emotion: string;
  transition: string;
  maxWords: number;
  // Image generation
  layout: 'full' | 'split-60-40' | 'split-50-50' | 'pip' | 'creator-center';
  imageUrl: string | null;
  images: Array<{
    id: string;
    imageUrl: string;
    generationNumber: number;
    sourceType: 'generated' | 'stock' | 'uploaded';
    isSelected: boolean;
    status: 0 | 1 | 2 | 3;
  }>;
  isGeneratingImage: boolean;
  imageError: string | null;
  // Video generation
  videoUrl: string | null;
  isGeneratingVideo: boolean;
  videoError: string | null;
  // Flags
  loopEndEnabled: boolean;
  isEnabled: boolean;
  includeCreatorFace?: boolean;
  referenceImageUrl?: string;
}

export interface WorkspaceSettings {
  duration: '30s' | '45s' | '60s' | '90s';
  aspectRatio: '9:16' | '16:9';
  language: string;
  model: string;
  avatarOption: 'none' | 'profile' | 'saved' | 'upload';
  avatarId: string | null;
  avatarUrl: string | null;
  characterDescription: string | null;
  useDnaTone: boolean;
}

export interface WorkspaceState {
  // Session identity
  sessionId: string | null;
  orderId: string;
  sessionType: 'script_gen' | 'creator_lab' | 'ad_studio';
  title: string;
  status: 'draft' | 'script_ready' | 'images_ready' | 'video_ready' | 'complete';

  // Current step
  activeStep: 'script' | 'images' | 'video' | 'studio';

  // Input
  topic: string;
  inputType: 'topic' | 'transcript' | 'image' | 'youtube';
  settings: WorkspaceSettings;

  // Script data
  segments: WorkspaceSegment[];
  hookOptions: HookOptions | null;
  selectedHook: 'option_a_safe' | 'option_b_negative' | 'option_c_visual';
  scriptVersions: ScriptVersion[];
  selectedVersion: number;
  scriptConfirmed: boolean;
  additionalNotes: string;
  qualityReport: QualityReport | null;

  // Loading states
  isGeneratingScript: boolean;
  isRegeneratingScript: boolean;

  // Dirty flag (unsaved changes)
  isDirty: boolean;
}

// ============================================================================
// ACTIONS
// ============================================================================

export type WorkspaceAction =
  | { type: 'INIT_SESSION'; orderId: string; sessionType: WorkspaceState['sessionType']; topic: string; settings: WorkspaceSettings }
  | { type: 'RESTORE_SESSION'; state: Partial<WorkspaceState> }
  | { type: 'SET_TITLE'; title: string }
  | { type: 'SET_STATUS'; status: WorkspaceState['status'] }
  | { type: 'SET_ACTIVE_STEP'; step: WorkspaceState['activeStep'] }
  // Script actions
  | { type: 'SET_GENERATING_SCRIPT'; isGenerating: boolean }
  | { type: 'SET_REGENERATING_SCRIPT'; isRegenerating: boolean }
  | { type: 'SET_SCRIPT_DATA'; segments: WorkspaceSegment[]; hookOptions: HookOptions; qualityReport: QualityReport }
  | { type: 'SELECT_HOOK'; key: WorkspaceState['selectedHook'] }
  | { type: 'ADD_SCRIPT_VERSION'; version: ScriptVersion }
  | { type: 'SELECT_VERSION'; version: number }
  | { type: 'EDIT_SEGMENT'; segmentId: string; field: 'script' | 'visualDirection'; value: string }
  | { type: 'CONFIRM_SCRIPT' }
  | { type: 'UNCONFIRM_SCRIPT' }
  | { type: 'SET_ADDITIONAL_NOTES'; notes: string }
  // Image actions
  | { type: 'SET_SEGMENT_GENERATING_IMAGE'; segmentId: string; isGenerating: boolean }
  | { type: 'SET_SEGMENT_IMAGE'; segmentId: string; imageUrl: string; imageEntry?: WorkspaceSegment['images'][0] }
  | { type: 'SET_SEGMENT_IMAGE_ERROR'; segmentId: string; error: string }
  | { type: 'SET_SEGMENT_LAYOUT'; segmentId: string; layout: WorkspaceSegment['layout'] }
  // Video actions
  | { type: 'SET_SEGMENT_GENERATING_VIDEO'; segmentId: string; isGenerating: boolean }
  | { type: 'SET_SEGMENT_VIDEO'; segmentId: string; videoUrl: string }
  | { type: 'SET_SEGMENT_VIDEO_ERROR'; segmentId: string; error: string }
  // Reset
  | { type: 'RESET' };

// ============================================================================
// INITIAL STATE
// ============================================================================

const defaultSettings: WorkspaceSettings = {
  duration: '60s',
  aspectRatio: '9:16',
  language: 'id',
  model: 'auto',
  avatarOption: 'none',
  avatarId: null,
  avatarUrl: null,
  characterDescription: null,
  useDnaTone: false,
};

export const initialWorkspaceState: WorkspaceState = {
  sessionId: null,
  orderId: '',
  sessionType: 'script_gen',
  title: 'Untitled',
  status: 'draft',
  activeStep: 'script',
  topic: '',
  inputType: 'topic',
  settings: defaultSettings,
  segments: [],
  hookOptions: null,
  selectedHook: 'option_a_safe',
  scriptVersions: [],
  selectedVersion: 1,
  scriptConfirmed: false,
  additionalNotes: '',
  qualityReport: null,
  isGeneratingScript: false,
  isRegeneratingScript: false,
  isDirty: false,
};

// ============================================================================
// REDUCER
// ============================================================================

function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'INIT_SESSION':
      return {
        ...initialWorkspaceState,
        orderId: action.orderId,
        sessionType: action.sessionType,
        topic: action.topic,
        settings: action.settings,
        status: 'draft',
        isDirty: true,
      };

    case 'RESTORE_SESSION':
      return { ...state, ...action.state, isDirty: false };

    case 'SET_TITLE':
      return { ...state, title: action.title, isDirty: true };

    case 'SET_STATUS':
      return { ...state, status: action.status, isDirty: true };

    case 'SET_ACTIVE_STEP':
      return { ...state, activeStep: action.step };

    case 'SET_GENERATING_SCRIPT':
      return { ...state, isGeneratingScript: action.isGenerating };

    case 'SET_REGENERATING_SCRIPT':
      return { ...state, isRegeneratingScript: action.isRegenerating };

    case 'SET_SCRIPT_DATA':
      return {
        ...state,
        segments: action.segments,
        hookOptions: action.hookOptions,
        qualityReport: action.qualityReport,
        status: 'script_ready',
        scriptVersions: [{
          version: 1,
          segments: action.segments,
          hookOptions: action.hookOptions,
          score: action.qualityReport.final_score,
          createdAt: new Date().toISOString(),
        }],
        selectedVersion: 1,
        isDirty: true,
      };

    case 'SELECT_HOOK': {
      if (state.scriptConfirmed || !state.hookOptions) return state;
      const hookData = state.hookOptions[action.key];
      if (!hookData) return state;
      // Update HOOK segment with selected hook data
      const updatedSegments = state.segments.map(seg =>
        seg.segmentType === 'HOOK'
          ? { ...seg, script: hookData.script_text, visualDirection: hookData.visual_direction }
          : seg
      );
      return { ...state, selectedHook: action.key, segments: updatedSegments, isDirty: true };
    }

    case 'ADD_SCRIPT_VERSION':
      return {
        ...state,
        scriptVersions: [...state.scriptVersions, action.version],
        isDirty: true,
      };

    case 'SELECT_VERSION': {
      const version = state.scriptVersions.find(v => v.version === action.version);
      if (!version) return state;
      return {
        ...state,
        selectedVersion: action.version,
        segments: version.segments,
        hookOptions: version.hookOptions,
        qualityReport: version.score ? { ...state.qualityReport!, final_score: version.score } : state.qualityReport,
        isDirty: true,
      };
    }

    case 'EDIT_SEGMENT':
      return {
        ...state,
        segments: state.segments.map(seg =>
          seg.id === action.segmentId
            ? { ...seg, [action.field]: action.value }
            : seg
        ),
        isDirty: true,
      };

    case 'CONFIRM_SCRIPT':
      return { ...state, scriptConfirmed: true, status: 'script_ready', isDirty: true };

    case 'UNCONFIRM_SCRIPT':
      // Only allowed if no images have been generated
      if (state.segments.some(s => s.imageUrl)) return state;
      return { ...state, scriptConfirmed: false, isDirty: true };

    case 'SET_ADDITIONAL_NOTES':
      return { ...state, additionalNotes: action.notes, isDirty: true };

    case 'SET_SEGMENT_GENERATING_IMAGE':
      return {
        ...state,
        segments: state.segments.map(seg =>
          seg.id === action.segmentId
            ? { ...seg, isGeneratingImage: action.isGenerating, imageError: action.isGenerating ? null : seg.imageError }
            : seg
        ),
      };

    case 'SET_SEGMENT_IMAGE':
      return {
        ...state,
        segments: state.segments.map(seg =>
          seg.id === action.segmentId
            ? {
                ...seg,
                imageUrl: action.imageUrl,
                isGeneratingImage: false,
                imageError: null,
                images: action.imageEntry
                  ? [...seg.images, action.imageEntry]
                  : seg.images,
              }
            : seg
        ),
        isDirty: true,
      };

    case 'SET_SEGMENT_IMAGE_ERROR':
      return {
        ...state,
        segments: state.segments.map(seg =>
          seg.id === action.segmentId
            ? { ...seg, isGeneratingImage: false, imageError: action.error }
            : seg
        ),
      };

    case 'SET_SEGMENT_LAYOUT':
      return {
        ...state,
        segments: state.segments.map(seg =>
          seg.id === action.segmentId
            ? { ...seg, layout: action.layout }
            : seg
        ),
        isDirty: true,
      };

    case 'SET_SEGMENT_GENERATING_VIDEO':
      return {
        ...state,
        segments: state.segments.map(seg =>
          seg.id === action.segmentId
            ? { ...seg, isGeneratingVideo: action.isGenerating, videoError: action.isGenerating ? null : seg.videoError }
            : seg
        ),
      };

    case 'SET_SEGMENT_VIDEO':
      return {
        ...state,
        segments: state.segments.map(seg =>
          seg.id === action.segmentId
            ? { ...seg, videoUrl: action.videoUrl, isGeneratingVideo: false, videoError: null }
            : seg
        ),
        isDirty: true,
      };

    case 'SET_SEGMENT_VIDEO_ERROR':
      return {
        ...state,
        segments: state.segments.map(seg =>
          seg.id === action.segmentId
            ? { ...seg, isGeneratingVideo: false, videoError: action.error }
            : seg
        ),
      };

    case 'RESET':
      return initialWorkspaceState;

    default:
      return state;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

interface WorkspaceContextValue {
  state: WorkspaceState;
  dispatch: React.Dispatch<WorkspaceAction>;
  // Convenience helpers
  initSession: (orderId: string, sessionType: WorkspaceState['sessionType'], topic: string, settings: WorkspaceSettings) => void;
  setActiveStep: (step: WorkspaceState['activeStep']) => void;
  confirmScript: () => void;
  canProceedToImages: boolean;
  canProceedToVideo: boolean;
  canProceedToStudio: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspaceState);

  const initSession = useCallback((
    orderId: string,
    sessionType: WorkspaceState['sessionType'],
    topic: string,
    settings: WorkspaceSettings,
  ) => {
    dispatch({ type: 'INIT_SESSION', orderId, sessionType, topic, settings });
  }, []);

  const setActiveStep = useCallback((step: WorkspaceState['activeStep']) => {
    dispatch({ type: 'SET_ACTIVE_STEP', step });
  }, []);

  const confirmScript = useCallback(() => {
    dispatch({ type: 'CONFIRM_SCRIPT' });
  }, []);

  // Computed flags
  const canProceedToImages = state.scriptConfirmed && state.segments.length > 0;
  const canProceedToVideo = state.segments.every(s => !s.isEnabled || s.imageUrl !== null);
  const canProceedToStudio = state.segments.every(s => !s.isEnabled || s.videoUrl !== null);

  const value: WorkspaceContextValue = {
    state,
    dispatch,
    initSession,
    setActiveStep,
    confirmScript,
    canProceedToImages,
    canProceedToVideo,
    canProceedToStudio,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

// ============================================================================
// HOOK
// ============================================================================

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
