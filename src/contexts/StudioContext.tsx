// ============================================================================
// Sparkfluence Studio — State Management
// React Context + useReducer for composition state with undo/redo.
// ============================================================================

import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react';
import type {
  SparkfluenceProject,
  SegmentComposition,
  LayerItem,
  AudioTrackItem,
  TransitionItem,
  StudioSelection,
  PlaybackState,
  LayoutType,
  HistoryEntry,
} from '../types/studio';
import { recalculateFrames, generateId } from '../lib/composition';

// --- State Shape ---
interface StudioState {
  project: SparkfluenceProject;
  selection: StudioSelection;
  playback: PlaybackState;
  zoom: number;
  activePanel: 'media' | 'stickers' | 'effects' | 'text' | 'audio';
  isDirty: boolean;
}

// --- Actions ---
type StudioAction =
  | { type: 'SET_PROJECT'; project: SparkfluenceProject }
  | { type: 'SELECT_SEGMENT'; segmentId: string | null }
  | { type: 'SELECT_LAYER'; segmentId: string; layerId: string | null }
  | { type: 'SET_PLAYING'; isPlaying: boolean }
  | { type: 'SET_CURRENT_FRAME'; frame: number }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SET_ACTIVE_PANEL'; panel: StudioState['activePanel'] }
  | { type: 'UPDATE_SEGMENT'; segmentId: string; changes: Partial<SegmentComposition> }
  | { type: 'SET_SEGMENT_LAYOUT'; segmentId: string; layout: LayoutType }
  | { type: 'ADD_LAYER'; segmentId: string; layer: LayerItem }
  | { type: 'UPDATE_LAYER'; segmentId: string; layerId: string; changes: Partial<LayerItem> }
  | { type: 'REMOVE_LAYER'; segmentId: string; layerId: string }
  | { type: 'REORDER_LAYER'; segmentId: string; layerId: string; newZIndex: number }
  | { type: 'TOGGLE_LAYER_VISIBILITY'; segmentId: string; layerId: string }
  | { type: 'TOGGLE_LAYER_LOCK'; segmentId: string; layerId: string }
  | { type: 'ADD_TRANSITION'; transition: TransitionItem }
  | { type: 'UPDATE_TRANSITION'; transitionId: string; changes: Partial<TransitionItem> }
  | { type: 'REMOVE_TRANSITION'; transitionId: string }
  | { type: 'UPDATE_AUDIO_TRACK'; trackType: 'tts' | 'bgm' | 'sfx'; trackId: string; changes: Partial<AudioTrackItem> }
  | { type: 'ADD_AUDIO_TRACK'; trackType: 'tts' | 'bgm' | 'sfx'; track: AudioTrackItem }
  | { type: 'REMOVE_AUDIO_TRACK'; trackType: 'tts' | 'bgm' | 'sfx'; trackId: string }
  | { type: 'RESTORE_PROJECT'; project: SparkfluenceProject }; // for undo/redo

// --- Reducer ---
function studioReducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case 'SET_PROJECT':
      return { ...state, project: action.project, isDirty: false };

    case 'SELECT_SEGMENT':
      return { ...state, selection: { segmentId: action.segmentId, layerId: null } };

    case 'SELECT_LAYER':
      return { ...state, selection: { segmentId: action.segmentId, layerId: action.layerId } };

    case 'SET_PLAYING':
      return { ...state, playback: { ...state.playback, isPlaying: action.isPlaying } };

    case 'SET_CURRENT_FRAME':
      return { ...state, playback: { ...state.playback, currentFrame: action.frame } };

    case 'SET_ZOOM':
      return { ...state, zoom: action.zoom };

    case 'SET_ACTIVE_PANEL':
      return { ...state, activePanel: action.panel };

    case 'UPDATE_SEGMENT': {
      const segments = state.project.segments.map(seg =>
        seg.id === action.segmentId ? { ...seg, ...action.changes } : seg
      );
      return {
        ...state,
        isDirty: true,
        project: recalculateFrames({ ...state.project, segments }),
      };
    }

    case 'SET_SEGMENT_LAYOUT': {
      const segments = state.project.segments.map(seg =>
        seg.id === action.segmentId ? { ...seg, layout: action.layout } : seg
      );
      return {
        ...state,
        isDirty: true,
        project: { ...state.project, segments },
      };
    }

    case 'ADD_LAYER': {
      const segments = state.project.segments.map(seg =>
        seg.id === action.segmentId
          ? { ...seg, layers: [...seg.layers, action.layer] }
          : seg
      );
      return {
        ...state,
        isDirty: true,
        project: { ...state.project, segments },
        selection: { segmentId: action.segmentId, layerId: action.layer.id },
      };
    }

    case 'UPDATE_LAYER': {
      const segments = state.project.segments.map(seg =>
        seg.id === action.segmentId
          ? {
            ...seg,
            layers: seg.layers.map(l =>
              l.id === action.layerId ? { ...l, ...action.changes } : l
            ),
          }
          : seg
      );
      return {
        ...state,
        isDirty: true,
        project: { ...state.project, segments },
      };
    }

    case 'REMOVE_LAYER': {
      const segments = state.project.segments.map(seg =>
        seg.id === action.segmentId
          ? { ...seg, layers: seg.layers.filter(l => l.id !== action.layerId) }
          : seg
      );
      const selection = state.selection.layerId === action.layerId
        ? { ...state.selection, layerId: null }
        : state.selection;
      return {
        ...state,
        isDirty: true,
        project: { ...state.project, segments },
        selection,
      };
    }

    case 'REORDER_LAYER': {
      const segments = state.project.segments.map(seg =>
        seg.id === action.segmentId
          ? {
            ...seg,
            layers: seg.layers.map(l =>
              l.id === action.layerId ? { ...l, zIndex: action.newZIndex } : l
            ),
          }
          : seg
      );
      return {
        ...state,
        isDirty: true,
        project: { ...state.project, segments },
      };
    }

    case 'TOGGLE_LAYER_VISIBILITY': {
      const segments = state.project.segments.map(seg =>
        seg.id === action.segmentId
          ? {
            ...seg,
            layers: seg.layers.map(l =>
              l.id === action.layerId ? { ...l, visible: !l.visible } : l
            ),
          }
          : seg
      );
      return {
        ...state,
        isDirty: true,
        project: { ...state.project, segments },
      };
    }

    case 'TOGGLE_LAYER_LOCK': {
      const segments = state.project.segments.map(seg =>
        seg.id === action.segmentId
          ? {
            ...seg,
            layers: seg.layers.map(l =>
              l.id === action.layerId ? { ...l, locked: !l.locked } : l
            ),
          }
          : seg
      );
      return {
        ...state,
        isDirty: true,
        project: { ...state.project, segments },
      };
    }

    case 'ADD_TRANSITION':
      return {
        ...state,
        isDirty: true,
        project: {
          ...state.project,
          transitions: [...state.project.transitions, action.transition],
        },
      };

    case 'UPDATE_TRANSITION': {
      const transitions = state.project.transitions.map(t =>
        t.id === action.transitionId ? { ...t, ...action.changes } : t
      );
      return {
        ...state,
        isDirty: true,
        project: { ...state.project, transitions },
      };
    }

    case 'REMOVE_TRANSITION':
      return {
        ...state,
        isDirty: true,
        project: {
          ...state.project,
          transitions: state.project.transitions.filter(t => t.id !== action.transitionId),
        },
      };

    case 'UPDATE_AUDIO_TRACK': {
      const audio = { ...state.project.audio };
      audio[action.trackType] = audio[action.trackType].map(t =>
        t.id === action.trackId ? { ...t, ...action.changes } : t
      );
      return {
        ...state,
        isDirty: true,
        project: { ...state.project, audio },
      };
    }

    case 'ADD_AUDIO_TRACK': {
      const audio = { ...state.project.audio };
      audio[action.trackType] = [...audio[action.trackType], action.track];
      return {
        ...state,
        isDirty: true,
        project: { ...state.project, audio },
      };
    }

    case 'REMOVE_AUDIO_TRACK': {
      const audio = { ...state.project.audio };
      audio[action.trackType] = audio[action.trackType].filter(t => t.id !== action.trackId);
      return {
        ...state,
        isDirty: true,
        project: { ...state.project, audio },
      };
    }

    case 'RESTORE_PROJECT':
      return { ...state, project: action.project, isDirty: true };

    default:
      return state;
  }
}

// --- Empty Project ---
function createEmptyProject(): SparkfluenceProject {
  return {
    id: '',
    userId: '',
    scriptId: '',
    title: 'Untitled',
    resolution: { w: 1080, h: 1920 },
    fps: 30,
    totalDurationInFrames: 0,
    segments: [],
    audio: { tts: [], bgm: [], sfx: [] },
    transitions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

const initialState: StudioState = {
  project: createEmptyProject(),
  selection: { segmentId: null, layerId: null },
  playback: { isPlaying: false, currentFrame: 0 },
  zoom: 1,
  activePanel: 'media',
  isDirty: false,
};

// --- Context ---
interface StudioContextValue {
  state: StudioState;
  dispatch: React.Dispatch<StudioAction>;

  // Convenience getters
  selectedSegment: SegmentComposition | null;
  selectedLayer: LayerItem | null;

  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  pushHistory: (description: string) => void;
}

const StudioContext = createContext<StudioContextValue | null>(null);

// --- Provider ---
const MAX_HISTORY = 50;

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(studioReducer, initialState);

  // History stacks
  const undoStack = useRef<HistoryEntry[]>([]);
  const redoStack = useRef<HistoryEntry[]>([]);

  const pushHistory = useCallback((description: string) => {
    undoStack.current.push({
      project: JSON.parse(JSON.stringify(state.project)),
      description,
      timestamp: Date.now(),
    });
    if (undoStack.current.length > MAX_HISTORY) {
      undoStack.current.shift();
    }
    redoStack.current = [];
  }, [state.project]);

  const undo = useCallback(() => {
    const entry = undoStack.current.pop();
    if (!entry) return;
    redoStack.current.push({
      project: JSON.parse(JSON.stringify(state.project)),
      description: 'redo',
      timestamp: Date.now(),
    });
    dispatch({ type: 'RESTORE_PROJECT', project: entry.project });
  }, [state.project]);

  const redo = useCallback(() => {
    const entry = redoStack.current.pop();
    if (!entry) return;
    undoStack.current.push({
      project: JSON.parse(JSON.stringify(state.project)),
      description: 'undo',
      timestamp: Date.now(),
    });
    dispatch({ type: 'RESTORE_PROJECT', project: entry.project });
  }, [state.project]);

  // Convenience getters
  const selectedSegment = state.selection.segmentId
    ? state.project.segments.find(s => s.id === state.selection.segmentId) ?? null
    : null;

  const selectedLayer = selectedSegment && state.selection.layerId
    ? selectedSegment.layers.find(l => l.id === state.selection.layerId) ?? null
    : null;

  const value: StudioContextValue = {
    state,
    dispatch,
    selectedSegment,
    selectedLayer,
    undo,
    redo,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    pushHistory,
  };

  return (
    <StudioContext.Provider value={value}>
      {children}
    </StudioContext.Provider>
  );
};

// --- Hook ---
export function useStudio(): StudioContextValue {
  const ctx = useContext(StudioContext);
  if (!ctx) {
    throw new Error('useStudio must be used within a StudioProvider');
  }
  return ctx;
}
