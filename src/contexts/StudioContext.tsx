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
  CaptionTrack,
  CaptionStyle,
  CaptionChunk,
  OverlayTrack,
  OverlayClip,
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
  | { type: 'REORDER_SEGMENTS'; segmentIds: string[] }
  | { type: 'TRIM_SEGMENT'; segmentId: string; trimStartFrames: number; trimEndFrames: number }
  | { type: 'SPLIT_SEGMENT_AT_FRAME'; segmentId: string; splitFrame: number }
  | { type: 'ADD_SEGMENT'; segment: SegmentComposition }
  | { type: 'INSERT_SEGMENT_AT'; segment: SegmentComposition; insertIndex: number }
  | { type: 'DELETE_SEGMENT'; segmentId: string }
  | { type: 'SET_CAPTIONS'; captions: CaptionTrack[] }
  | { type: 'UPDATE_CAPTION_CHUNK'; segmentId: string; chunkIndex: number; changes: Partial<CaptionChunk> }
  | { type: 'REMOVE_CAPTION'; segmentId: string }
  | { type: 'SET_CAPTION_STYLE'; style: CaptionStyle }
  // Overlay track management
  | { type: 'ADD_OVERLAY_TRACK'; trackType: 'video' | 'text' }
  | { type: 'REMOVE_OVERLAY_TRACK'; trackId: string }
  | { type: 'ADD_OVERLAY_CLIP'; trackId: string; clip: OverlayClip }
  | { type: 'UPDATE_OVERLAY_CLIP'; trackId: string; clipId: string; changes: Partial<OverlayClip> }
  | { type: 'MOVE_OVERLAY_CLIP'; trackId: string; clipId: string; startFrame: number }
  | { type: 'REMOVE_OVERLAY_CLIP'; trackId: string; clipId: string }
  | { type: 'APPLY_TEXT_STYLE_TO_ALL'; sourceLayerId: string; styleProps: Partial<NonNullable<LayerItem['text']>>; position?: { x: number; y: number } }
  | { type: 'MOVE_TEXT_LAYER'; segmentId: string; layerId: string; position: { x: number; y: number } }
  | { type: 'MOVE_ALL_TEXT_LAYERS'; sourceLayerId: string; position: { x: number; y: number } }
  | { type: 'RESTORE_PROJECT'; project: SparkfluenceProject } // for undo/redo
  | { type: 'MARK_CLEAN' };

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

    case 'APPLY_TEXT_STYLE_TO_ALL': {
      // Apply text style + position to ALL text layers across ALL segments (except source)
      const segments = state.project.segments.map(seg => ({
        ...seg,
        layers: seg.layers.map(l => {
          if (l.type !== 'text' || l.id === action.sourceLayerId || !l.text) return l;
          const updated = { ...l, text: { ...l.text, ...action.styleProps } };
          if (action.position) {
            updated.position = { ...action.position };
          }
          return updated;
        }),
      }));
      return {
        ...state,
        isDirty: true,
        project: { ...state.project, segments },
      };
    }

    case 'MOVE_TEXT_LAYER': {
      // Move ONLY the specific text layer (independent movement)
      const segments = state.project.segments.map(seg =>
        seg.id === action.segmentId
          ? {
            ...seg,
            layers: seg.layers.map(l =>
              l.id === action.layerId ? { ...l, position: { ...action.position } } : l
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

    case 'MOVE_ALL_TEXT_LAYERS': {
      // Move source layer to exact position, move all other text layers to same position
      const segments = state.project.segments.map(seg => ({
        ...seg,
        layers: seg.layers.map(l => {
          if (l.type !== 'text') return l;
          return { ...l, position: { ...action.position } };
        }),
      }));
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

    case 'ADD_SEGMENT': {
      const newSegments = [...state.project.segments, action.segment];
      return {
        ...state,
        isDirty: true,
        project: recalculateFrames({ ...state.project, segments: newSegments }),
        selection: { segmentId: action.segment.id, layerId: null },
      };
    }

    case 'INSERT_SEGMENT_AT': {
      const insertSegments = [...state.project.segments];
      const idx = Math.max(0, Math.min(action.insertIndex, insertSegments.length));
      insertSegments.splice(idx, 0, action.segment);
      return {
        ...state,
        isDirty: true,
        project: recalculateFrames({ ...state.project, segments: insertSegments }),
        selection: { segmentId: action.segment.id, layerId: null },
      };
    }

    case 'REORDER_SEGMENTS': {
      const segmentMap = new Map(state.project.segments.map(s => [s.id, s]));
      const reordered: SegmentComposition[] = [];
      for (const id of action.segmentIds) {
        const seg = segmentMap.get(id);
        if (seg) reordered.push(seg);
      }
      // Append any segments not included in segmentIds (safety net)
      for (const seg of state.project.segments) {
        if (!action.segmentIds.includes(seg.id)) {
          reordered.push(seg);
        }
      }
      return {
        ...state,
        isDirty: true,
        project: recalculateFrames({ ...state.project, segments: reordered }),
      };
    }

    case 'TRIM_SEGMENT': {
      const MIN_DURATION = 30; // 1 second at 30fps
      const segments = state.project.segments.map(seg => {
        if (seg.id !== action.segmentId) return seg;

        // Store original max duration on first trim (allows expanding back)
        const maxDuration = seg.maxDurationInFrames || seg.durationInFrames;

        const currentDuration = seg.durationInFrames;
        // trimStartFrames/trimEndFrames can be negative (= expand)
        const newDuration = Math.max(
          MIN_DURATION,
          Math.min(maxDuration, currentDuration - action.trimStartFrames - action.trimEndFrames)
        );

        // Adjust layers' inFrame/outFrame to reflect the trim
        const layers = seg.layers.map(layer => {
          if (action.trimStartFrames > 0) {
            // Shrinking from left
            const layerIn = Math.max(0, layer.inFrame - action.trimStartFrames);
            const layerOut = Math.min(newDuration, layer.outFrame - action.trimStartFrames);
            return {
              ...layer,
              inFrame: Math.max(0, layerIn),
              outFrame: Math.max(layerIn + 1, layerOut),
            };
          } else if (action.trimStartFrames < 0) {
            // Expanding from left — shift layers right
            const expand = -action.trimStartFrames;
            return {
              ...layer,
              inFrame: layer.inFrame + expand,
              outFrame: Math.min(newDuration, layer.outFrame + expand),
            };
          }
          // Right-side trim or expand — adjust outFrame only
          return {
            ...layer,
            outFrame: Math.min(newDuration, layer.outFrame),
          };
        });

        return { ...seg, durationInFrames: newDuration, maxDurationInFrames: maxDuration, layers };
      });
      return {
        ...state,
        isDirty: true,
        project: recalculateFrames({ ...state.project, segments }),
      };
    }

    case 'SPLIT_SEGMENT_AT_FRAME': {
      const splitIdx = state.project.segments.findIndex(s => s.id === action.segmentId);
      if (splitIdx === -1) return state;

      const original = state.project.segments[splitIdx];
      const relativeSplit = action.splitFrame - original.startFrame;

      // Guard: split must be at least 1 frame from each edge, and both halves >= 30 frames
      if (relativeSplit < 30 || (original.durationInFrames - relativeSplit) < 30) {
        return state;
      }

      const durationA = relativeSplit;
      const durationB = original.durationInFrames - relativeSplit;

      // Segment A: frames 0..relativeSplit of the original
      const layersA = original.layers.map(layer => ({
        ...layer,
        id: layer.id + '-a',
        inFrame: Math.min(layer.inFrame, durationA),
        outFrame: Math.min(layer.outFrame, durationA),
      }));

      const segA: SegmentComposition = {
        ...original,
        id: original.id + '-a',
        durationInFrames: durationA,
        layers: layersA,
      };

      // Segment B: frames relativeSplit..end of the original
      const layersB = original.layers.map(layer => ({
        ...layer,
        id: layer.id + '-b',
        inFrame: Math.max(0, layer.inFrame - relativeSplit),
        outFrame: Math.max(0, layer.outFrame - relativeSplit),
      }));

      const segB: SegmentComposition = {
        ...original,
        id: original.id + '-b',
        durationInFrames: durationB,
        layers: layersB,
      };

      const newSegments = [...state.project.segments];
      newSegments.splice(splitIdx, 1, segA, segB);

      return {
        ...state,
        isDirty: true,
        project: recalculateFrames({ ...state.project, segments: newSegments }),
      };
    }

    case 'DELETE_SEGMENT': {
      const filtered = state.project.segments.filter(s => s.id !== action.segmentId);
      if (filtered.length === state.project.segments.length) return state;

      const selection = state.selection.segmentId === action.segmentId
        ? { segmentId: null, layerId: null }
        : state.selection;

      return {
        ...state,
        isDirty: true,
        selection,
        project: recalculateFrames({ ...state.project, segments: filtered }),
      };
    }

    case 'SET_CAPTIONS':
      return {
        ...state,
        isDirty: true,
        project: { ...state.project, captions: action.captions },
      };

    case 'UPDATE_CAPTION_CHUNK': {
      const captions = (state.project.captions || []).map(track => {
        if (track.segmentId !== action.segmentId) return track;
        const chunks = track.chunks.map((chunk, idx) =>
          idx === action.chunkIndex ? { ...chunk, ...action.changes } : chunk
        );
        return { ...track, chunks };
      });
      return {
        ...state,
        isDirty: true,
        project: { ...state.project, captions },
      };
    }

    case 'REMOVE_CAPTION':
      return {
        ...state,
        isDirty: true,
        project: {
          ...state.project,
          captions: (state.project.captions || []).filter(t => t.segmentId !== action.segmentId),
        },
      };

    case 'SET_CAPTION_STYLE': {
      const captions = (state.project.captions || []).map(track => ({
        ...track,
        style: action.style,
      }));
      return {
        ...state,
        isDirty: true,
        project: { ...state.project, captions },
      };
    }

    // --- Overlay Track Actions ---

    case 'ADD_OVERLAY_TRACK': {
      const existing = state.project.overlayTracks || [];
      const count = existing.filter(t => t.trackType === action.trackType).length;
      const label = action.trackType === 'video'
        ? `Video ${count + 2}` // "Video 2", "Video 3", etc.
        : `Text ${count + 2}`;
      const newTrack: OverlayTrack = {
        id: generateId(`overlay_${action.trackType}`),
        label,
        trackType: action.trackType,
        clips: [],
      };
      return {
        ...state,
        isDirty: true,
        project: { ...state.project, overlayTracks: [...existing, newTrack] },
      };
    }

    case 'REMOVE_OVERLAY_TRACK': {
      const overlayTracks = (state.project.overlayTracks || []).filter(t => t.id !== action.trackId);
      return {
        ...state,
        isDirty: true,
        project: { ...state.project, overlayTracks },
      };
    }

    case 'ADD_OVERLAY_CLIP': {
      const overlayTracks = (state.project.overlayTracks || []).map(t =>
        t.id === action.trackId
          ? { ...t, clips: [...t.clips, action.clip] }
          : t
      );
      return {
        ...state,
        isDirty: true,
        project: { ...state.project, overlayTracks },
      };
    }

    case 'UPDATE_OVERLAY_CLIP': {
      const overlayTracks = (state.project.overlayTracks || []).map(t =>
        t.id === action.trackId
          ? { ...t, clips: t.clips.map(c => c.id === action.clipId ? { ...c, ...action.changes } : c) }
          : t
      );
      return {
        ...state,
        isDirty: true,
        project: { ...state.project, overlayTracks },
      };
    }

    case 'MOVE_OVERLAY_CLIP': {
      const overlayTracks = (state.project.overlayTracks || []).map(t =>
        t.id === action.trackId
          ? { ...t, clips: t.clips.map(c => c.id === action.clipId ? { ...c, startFrame: action.startFrame } : c) }
          : t
      );
      return {
        ...state,
        isDirty: true,
        project: { ...state.project, overlayTracks },
      };
    }

    case 'REMOVE_OVERLAY_CLIP': {
      const overlayTracks = (state.project.overlayTracks || []).map(t =>
        t.id === action.trackId
          ? { ...t, clips: t.clips.filter(c => c.id !== action.clipId) }
          : t
      );
      return {
        ...state,
        isDirty: true,
        project: { ...state.project, overlayTracks },
      };
    }

    case 'RESTORE_PROJECT':
      return { ...state, project: action.project, isDirty: true };

    case 'MARK_CLEAN':
      return { ...state, isDirty: false };

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
