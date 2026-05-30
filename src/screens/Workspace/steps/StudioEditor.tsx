// ============================================================================
// StudioEditor — Full-screen CapCut-style video editor
// Replaces the stub StudioStep when user enters the "Studio" step.
// 3-panel layout: LeftPanel (assets) | Center (preview) | RightPanel (properties)
// + Toolbar + Timeline at bottom
// ============================================================================

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Download,
  Play,
  Pause,
  Volume2,
  Maximize2,
  Minimize2,
  SkipBack,
  SkipForward,
  Film,
  Music,
  Type,
  Sparkles,
  Layers,
  AlertCircle,
  Plus,
  Upload,
  Image,
  GripVertical,
  FolderOpen,
  Loader2,
  X,
  ExternalLink,
} from 'lucide-react';
import { Player, type PlayerRef, type CallbackListener } from '@remotion/player';
import { StudioProvider, useStudio } from '../../../contexts/StudioContext';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { useStudioLoader } from '../../../hooks/useStudioLoader';
import { useStudioPersistence } from '../../../hooks/useStudioPersistence';
import { VideoComposition } from '../../../remotion/VideoComposition';
import { STUDIO_WIDTH, STUDIO_HEIGHT, STUDIO_FPS, type LayoutType, type SegmentComposition } from '../../../types/studio';
import { generateId, createVideoLayer, createImageLayer, secondsToFrames } from '../../../lib/composition';
import { Toolbar } from '../../../components/studio/Toolbar';
import type { ToolType } from '../../../components/studio/Toolbar';
import { Timeline } from '../../../components/studio/Timeline';
import { AudioProperties } from '../../../components/studio/panels/AudioProperties';
import { TextProperties } from '../../../components/studio/panels/TextProperties';
import { TextTemplates } from '../../../components/studio/panels/TextTemplates';
import { PlayerOverlay } from '../../../components/studio/PlayerOverlay';
import { ExportModal } from '../../../components/studio/panels/ExportModal';

// --- Outer Wrapper with Provider ---
export const StudioEditor: React.FC = () => {
  return (
    <StudioProvider>
      <StudioEditorInner />
    </StudioProvider>
  );
};

// --- Right Panel: Context-Sensitive Properties ---
const RightPanelContent: React.FC = () => {
  const { state, dispatch, selectedSegment, selectedLayer, selectedOverlayClip, selectedCaptionInfo } = useStudio();

  // If a text layer is selected, show TextProperties editor
  if (selectedSegment && selectedLayer && selectedLayer.type === 'text') {
    return (
      <div className="space-y-3">
        {/* Back to segment button */}
        <button
          onClick={() => dispatch({ type: 'SELECT_LAYER', segmentId: selectedSegment.id, layerId: null })}
          className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Back to {selectedSegment.segmentType}</span>
        </button>

        <TextProperties
          segmentId={selectedSegment.id}
          layer={selectedLayer}
          onUpdate={(changes) =>
            dispatch({
              type: 'UPDATE_LAYER',
              segmentId: selectedSegment.id,
              layerId: selectedLayer.id,
              changes,
            })
          }
          onApplyToAll={(sourceLayerId, styleProps, position) =>
            dispatch({ type: 'APPLY_TEXT_STYLE_TO_ALL', sourceLayerId, segmentId: selectedSegment.id, styleProps, position })
          }
        />
      </div>
    );
  }

  // If a caption is selected, show TextProperties-like panel
  if (selectedCaptionInfo) {
    const { track } = selectedCaptionInfo;
    const defaultW = Math.round(1080 * 0.85);
    const defaultH = 80;
    // Construct a virtual LayerItem so TextProperties can render
    const captionAsLayer: import('../../../types/studio').LayerItem = {
      id: `caption-${track.segmentId}`,
      type: 'text',
      src: '',
      position: track.position ?? { x: Math.round((1080 - defaultW) / 2), y: Math.round(1920 * 0.85 - defaultH) },
      size: track.size ?? { w: defaultW, h: defaultH },
      zIndex: 100,
      opacity: track.opacity ?? 1,
      rotation: 0,
      visible: true,
      locked: false,
      inFrame: 0,
      outFrame: 0,
      text: {
        content: track.chunks.map(c => c.text).join(' '),
        fontFamily: track.fontFamily || 'Inter',
        fontSize: track.fontSize ?? 42,
        color: track.color || '#FFFFFF',
        strokeColor: 'transparent',
        strokeWidth: 0,
        align: 'center' as const,
      },
    };

    const updateThisCaption = (captionChanges: Record<string, unknown>) => {
      dispatch({ type: 'UPDATE_CAPTION_TRACK', segmentId: track.segmentId, changes: captionChanges });
    };

    const applyToAllCaptions = () => {
      const changes: Record<string, unknown> = {};
      if (track.position) changes.position = track.position;
      if (track.size) changes.size = track.size;
      if (track.fontSize != null) changes.fontSize = track.fontSize;
      if (track.fontFamily) changes.fontFamily = track.fontFamily;
      if (track.color) changes.color = track.color;
      if (track.opacity != null) changes.opacity = track.opacity;
      if (track.highlightColor) changes.highlightColor = track.highlightColor;
      dispatch({ type: 'UPDATE_ALL_CAPTION_TRACKS', changes });
    };

    const totalCaptions = (state.project.captions || []).length;

    return (
      <div className="space-y-3">
        <button
          onClick={() => dispatch({ type: 'SELECT_SEGMENT', segmentId: null })}
          className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Back</span>
        </button>

        <div className="px-3 py-1.5">
          <span className="text-[10px] text-emerald-400 font-medium uppercase tracking-wider">Caption Track</span>
        </div>

        <TextProperties
          segmentId="captions"
          layer={captionAsLayer}
          onUpdate={(changes) => {
            const captionChanges: Record<string, unknown> = {};
            if (changes.position) captionChanges.position = changes.position;
            if (changes.size) captionChanges.size = changes.size;
            if (changes.opacity != null) captionChanges.opacity = changes.opacity;
            if (changes.text) {
              if (changes.text.fontSize != null) captionChanges.fontSize = changes.text.fontSize;
              if (changes.text.fontFamily) captionChanges.fontFamily = changes.text.fontFamily;
              if (changes.text.color) captionChanges.color = changes.text.color;
            }
            updateThisCaption(captionChanges);
          }}
        />

        {/* Karaoke highlight color (only visible when style is karaoke) */}
        {track.style === 'karaoke' && (
          <div className="px-3 py-2.5 border-t border-neutral-800">
            <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-medium mb-1.5">
              Highlight Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={track.highlightColor || '#10B981'}
                onChange={(e) => updateThisCaption({ highlightColor: e.target.value })}
                className="w-8 h-8 rounded-lg border border-neutral-700 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={track.highlightColor || '#10B981'}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9A-Fa-f]{6}$/.test(v)) updateThisCaption({ highlightColor: v });
                }}
                className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-neutral-200 font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors"
              />
            </div>
          </div>
        )}

        {/* Apply to All Captions button */}
        {totalCaptions > 1 && (
          <div className="px-3 py-2.5 border-t border-neutral-800">
            <button
              onClick={applyToAllCaptions}
              className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
            >
              Apply Style to All Captions ({totalCaptions})
            </button>
            <p className="text-[10px] text-neutral-600 mt-1">
              Applies font, size, color, position, opacity{track.style === 'karaoke' ? ', highlight' : ''} to all caption tracks
            </p>
          </div>
        )}
      </div>
    );
  }

  // If an image/video layer is selected, show basic properties with opacity
  if (selectedSegment && selectedLayer && (selectedLayer.type === 'image' || selectedLayer.type === 'video')) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => dispatch({ type: 'SELECT_LAYER', segmentId: selectedSegment.id, layerId: null })}
          className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Back to {selectedSegment.segmentType}</span>
        </button>

        <div className="px-3 py-2.5 border-b border-neutral-800">
          <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-medium mb-1.5">
            {selectedLayer.type === 'image' ? 'Image' : 'Video'} Layer
          </label>
          {selectedLayer.src && (
            <div className="w-full aspect-video bg-neutral-900 rounded-lg overflow-hidden mb-2">
              {selectedLayer.type === 'image' ? (
                <img src={selectedLayer.src} alt="" className="w-full h-full object-cover" />
              ) : (
                <video src={selectedLayer.src} className="w-full h-full object-cover" muted />
              )}
            </div>
          )}
        </div>

        <div className="px-3 py-2.5 border-b border-neutral-800">
          <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-medium mb-1.5">
            Position
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-neutral-500 block mb-0.5">X</label>
              <input
                type="number"
                value={Math.round(selectedLayer.position.x)}
                onChange={(e) => dispatch({
                  type: 'UPDATE_LAYER', segmentId: selectedSegment.id, layerId: selectedLayer.id,
                  changes: { position: { ...selectedLayer.position, x: parseInt(e.target.value) || 0 } },
                })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-neutral-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-500 block mb-0.5">Y</label>
              <input
                type="number"
                value={Math.round(selectedLayer.position.y)}
                onChange={(e) => dispatch({
                  type: 'UPDATE_LAYER', segmentId: selectedSegment.id, layerId: selectedLayer.id,
                  changes: { position: { ...selectedLayer.position, y: parseInt(e.target.value) || 0 } },
                })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-neutral-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="px-3 py-2.5 border-b border-neutral-800">
          <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-medium mb-1.5">
            Size
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-neutral-500 block mb-0.5">W</label>
              <input
                type="number"
                value={Math.round(selectedLayer.size.w)}
                onChange={(e) => dispatch({
                  type: 'UPDATE_LAYER', segmentId: selectedSegment.id, layerId: selectedLayer.id,
                  changes: { size: { ...selectedLayer.size, w: parseInt(e.target.value) || 0 } },
                })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-neutral-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-500 block mb-0.5">H</label>
              <input
                type="number"
                value={Math.round(selectedLayer.size.h)}
                onChange={(e) => dispatch({
                  type: 'UPDATE_LAYER', segmentId: selectedSegment.id, layerId: selectedLayer.id,
                  changes: { size: { ...selectedLayer.size, h: parseInt(e.target.value) || 0 } },
                })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-neutral-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="px-3 py-2.5 border-b border-neutral-800">
          <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-medium mb-1.5">
            Opacity
          </label>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(selectedLayer.opacity * 100)}
                onChange={(e) => dispatch({
                  type: 'UPDATE_LAYER', segmentId: selectedSegment.id, layerId: selectedLayer.id,
                  changes: { opacity: parseInt(e.target.value) / 100 },
                })}
                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-neutral-700"
                style={{
                  background: `linear-gradient(to right, #10B981 0%, #10B981 ${Math.round(selectedLayer.opacity * 100)}%, #404040 ${Math.round(selectedLayer.opacity * 100)}%, #404040 100%)`,
                }}
              />
              <span className="ml-2 text-xs font-mono text-neutral-400 w-14 text-right">
                {Math.round(selectedLayer.opacity * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If an overlay clip is selected, show its properties (Position, Size, Opacity, Rotation)
  if (selectedOverlayClip) {
    const { trackId, clip } = selectedOverlayClip;
    const updateClip = (changes: Record<string, unknown>) =>
      dispatch({ type: 'UPDATE_OVERLAY_CLIP', trackId, clipId: clip.id, changes });

    return (
      <div className="space-y-3">
        <button
          onClick={() => dispatch({ type: 'SELECT_SEGMENT', segmentId: null })}
          className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Back</span>
        </button>

        {/* Preview thumbnail */}
        <div className="px-3 py-2.5 border-b border-neutral-800">
          <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-medium mb-1.5">
            {clip.type === 'image' ? 'Image' : clip.type === 'video' ? 'Video' : 'Text'} Overlay
          </label>
          {clip.src && (clip.type === 'image' || clip.type === 'video') && (
            <div className="w-full aspect-video bg-neutral-900 rounded-lg overflow-hidden mb-2">
              {clip.type === 'image' ? (
                <img src={clip.src} alt="" className="w-full h-full object-contain" />
              ) : (
                <video src={clip.src} className="w-full h-full object-contain" muted />
              )}
            </div>
          )}
        </div>

        {/* Position */}
        <div className="px-3 py-2.5 border-b border-neutral-800">
          <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-medium mb-1.5">Position</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-neutral-500 block mb-0.5">X</label>
              <input
                type="number"
                value={Math.round(clip.position?.x || 0)}
                onChange={(e) => updateClip({ position: { ...(clip.position || { x: 0, y: 0 }), x: parseInt(e.target.value) || 0 } })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-neutral-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-500 block mb-0.5">Y</label>
              <input
                type="number"
                value={Math.round(clip.position?.y || 0)}
                onChange={(e) => updateClip({ position: { ...(clip.position || { x: 0, y: 0 }), y: parseInt(e.target.value) || 0 } })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-neutral-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Size */}
        <div className="px-3 py-2.5 border-b border-neutral-800">
          <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-medium mb-1.5">Size</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-neutral-500 block mb-0.5">W</label>
              <input
                type="number"
                value={Math.round(clip.size?.w || 324)}
                onChange={(e) => updateClip({ size: { ...(clip.size || { w: 324, h: 576 }), w: parseInt(e.target.value) || 0 } })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-neutral-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-500 block mb-0.5">H</label>
              <input
                type="number"
                value={Math.round(clip.size?.h || 576)}
                onChange={(e) => updateClip({ size: { ...(clip.size || { w: 324, h: 576 }), h: parseInt(e.target.value) || 0 } })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-neutral-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Rotation */}
        <div className="px-3 py-2.5 border-b border-neutral-800">
          <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-medium mb-1.5">Rotate</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={360}
              value={Math.round((clip as any).rotation || 0)}
              onChange={(e) => updateClip({ rotation: parseInt(e.target.value) || 0 })}
              className="w-20 bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-neutral-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors"
            />
            <span className="text-[10px] text-neutral-500">°</span>
          </div>
        </div>

        {/* Opacity */}
        <div className="px-3 py-2.5 border-b border-neutral-800">
          <label className="block text-[10px] text-neutral-500 uppercase tracking-wider font-medium mb-1.5">Opacity</label>
          <div className="flex items-center justify-between">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round((clip.opacity ?? 1) * 100)}
              onChange={(e) => updateClip({ opacity: parseInt(e.target.value) / 100 })}
              className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-neutral-700"
              style={{
                background: `linear-gradient(to right, #10B981 0%, #10B981 ${Math.round((clip.opacity ?? 1) * 100)}%, #404040 ${Math.round((clip.opacity ?? 1) * 100)}%, #404040 100%)`,
              }}
            />
            <span className="ml-2 text-xs font-mono text-neutral-400 w-14 text-right">
              {Math.round((clip.opacity ?? 1) * 100)}%
            </span>
          </div>
        </div>
      </div>
    );
  }

  // If a segment is selected, show its properties
  if (selectedSegment) {
    return (
      <div className="space-y-4">
        {/* Segment info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">Segment</span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {selectedSegment.segmentType}
            </span>
          </div>
          <div className="text-xs text-neutral-400">
            Duration: {(selectedSegment.durationInFrames / STUDIO_FPS).toFixed(1)}s
          </div>
          {selectedSegment.script && (
            <p className="text-[11px] text-neutral-500 line-clamp-3 leading-relaxed">
              {selectedSegment.script}
            </p>
          )}
        </div>

        {/* Layout selector */}
        <div className="space-y-1.5">
          <span className="text-xs text-neutral-400">Layout</span>
          <select
            value={selectedSegment.layout}
            onChange={(e) =>
              dispatch({
                type: 'SET_SEGMENT_LAYOUT',
                segmentId: selectedSegment.id,
                layout: e.target.value as LayoutType,
              })
            }
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-neutral-200 outline-none focus:border-emerald-500"
          >
            <option value="full">Full</option>
            <option value="split-60-40">Split 60/40</option>
            <option value="split-50-50">Split 50/50</option>
            <option value="pip">Picture-in-Picture</option>
            <option value="creator-center">Creator Center</option>
          </select>
        </div>

        {/* Layers list */}
        <div className="space-y-1.5">
          <span className="text-xs text-neutral-400">Layers ({selectedSegment.layers.length})</span>
          <div className="space-y-1">
            {selectedSegment.layers.map((layer) => (
              <div
                key={layer.id}
                onClick={() => dispatch({ type: 'SELECT_LAYER', segmentId: selectedSegment.id, layerId: layer.id })}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                  state.selection.layerId === layer.id
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-neutral-500 flex-shrink-0" />
                <span className="truncate">{layer.type}: {layer.src ? '...' + layer.src.slice(-20) : layer.text?.content?.slice(0, 20) || layer.type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Check if any audio track is somehow highlighted (future: audio selection state)
  // For now, show all audio tracks as editable sections
  const allTracks = [
    ...state.project.audio.tts.map((t) => ({ track: t, trackType: 'tts' as const })),
    ...state.project.audio.bgm.map((t) => ({ track: t, trackType: 'bgm' as const })),
    ...state.project.audio.sfx.map((t) => ({ track: t, trackType: 'sfx' as const })),
  ];

  if (allTracks.length > 0) {
    return (
      <div className="space-y-3">
        <span className="text-xs text-neutral-500">Audio Tracks</span>
        {allTracks.map(({ track, trackType }) => (
          <AudioProperties
            key={track.id}
            track={track}
            trackType={trackType}
            onUpdate={(changes) =>
              dispatch({ type: 'UPDATE_AUDIO_TRACK', trackType, trackId: track.id, changes })
            }
            onRemove={() =>
              dispatch({ type: 'REMOVE_AUDIO_TRACK', trackType, trackId: track.id })
            }
          />
        ))}
      </div>
    );
  }

  return (
    <div className="text-center text-neutral-500 text-xs mt-8">
      Select a clip to see properties
    </div>
  );
};

// --- Left Panel Tab Types ---
type LeftPanelTab = 'media' | 'audio' | 'text' | 'transitions' | 'effects';

const LEFT_PANEL_TABS: { id: LeftPanelTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'media', label: 'Media', icon: Film },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'transitions', label: 'Trans.', icon: Sparkles },
  { id: 'effects', label: 'Effects', icon: Layers },
];

import type { MediaAsset } from '../../../types/studio';

// --- Past Videos Modal: Query video_generation_jobs (status=2) ---
interface PastVideo {
  id: string;
  segment_type: string;
  video_url: string;
  created_at: string;
  order_id: string;
}

const PastVideosModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, segmentType: string) => void;
}> = ({ isOpen, onClose, onSelect }) => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<PastVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isOpen || loaded || !user) return;
    setLoading(true);
    supabase
      .from('video_generation_jobs')
      .select('id, segment_type, video_url, created_at, order_id')
      .eq('user_id', user.id)
      .eq('status', 2) // completed
      .not('video_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!error && data) setVideos(data as PastVideo[]);
        setLoading(false);
        setLoaded(true);
      });
  }, [isOpen, loaded, user]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1E1E1E] border border-neutral-700 rounded-xl w-[600px] max-h-[70vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
          <h3 className="text-sm font-semibold text-neutral-200">Past Generated Videos</h3>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 text-xs">
              No completed videos found
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {videos.map((v) => (
                <div
                  key={v.id}
                  onClick={() => { onSelect(v.video_url, v.segment_type); onClose(); }}
                  className="relative rounded-lg overflow-hidden cursor-pointer group hover:ring-1 hover:ring-emerald-500/50 transition-all"
                >
                  <div className="aspect-[9/16] bg-neutral-900">
                    <video
                      src={v.video_url}
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                      playsInline
                      onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).currentTime = 0.5; }}
                    />
                  </div>
                  <div className="absolute top-1 left-1">
                    <span className="text-[8px] font-medium px-1 py-0.5 rounded bg-black/70 text-emerald-400 border border-emerald-500/30">
                      {v.segment_type}
                    </span>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 px-1.5 py-1 bg-gradient-to-t from-black/80 to-transparent">
                    <span className="text-[9px] text-neutral-300 truncate block">{v.order_id}</span>
                    <span className="text-[8px] text-neutral-500">{new Date(v.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Media Tab: CapCut-style grid with Import + segment assets + drag ---
const MediaTabContent: React.FC = () => {
  const { state, dispatch } = useStudio();
  const { user } = useAuth();
  const segments = state.project.segments;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPastVideos, setShowPastVideos] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Imported assets from project state (persisted in studio_data)
  const importedAssets = state.project.mediaAssets || [];

  // Track which imported assets are on the timeline (by URL match)
  const timelineUrls = useMemo(() => {
    const urls = new Set<string>();
    for (const seg of segments) {
      for (const layer of seg.layers) {
        if (layer.src) urls.add(layer.src);
      }
    }
    return urls;
  }, [segments]);

  // Handle file import — upload to Supabase Storage, then persist in project
  const handleFileImport = useCallback(async (files: FileList | null) => {
    if (!files || !user) return;
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isVideo && !isImage) continue;

      const assetId = generateId('media');
      const ext = file.name.split('.').pop() || (isImage ? 'png' : 'mp4');
      const storagePath = `${user.id}/${assetId}.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('studio-media')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload failed:', uploadError.message);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('studio-media')
        .getPublicUrl(storagePath);

      const publicUrl = urlData.publicUrl;

      // Detect video duration
      let durationSec = isVideo ? 8 : 5;
      if (isVideo) {
        try {
          const blobUrl = URL.createObjectURL(file);
          durationSec = await new Promise<number>((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
              resolve(Math.round(video.duration));
              URL.revokeObjectURL(blobUrl);
            };
            video.onerror = () => {
              resolve(8);
              URL.revokeObjectURL(blobUrl);
            };
            video.src = blobUrl;
          });
        } catch { /* default 8s */ }
      }

      const asset: MediaAsset = {
        id: assetId,
        name: file.name,
        type: isVideo ? 'video' : 'image',
        url: publicUrl,
        durationSec,
        thumbnailUrl: publicUrl,
      };

      dispatch({ type: 'ADD_MEDIA_ASSET', asset });
    }

    setUploading(false);
  }, [user, dispatch]);

  // Add imported asset to timeline as a new segment
  const addToTimeline = useCallback((asset: MediaAsset) => {
    const durFrames = secondsToFrames(asset.durationSec);
    const layers = asset.type === 'video'
      ? [createVideoLayer(asset.url, durFrames)]
      : [createImageLayer(asset.url, durFrames)];

    const segment: SegmentComposition = {
      id: generateId('seg_import'),
      segmentType: 'BODY',
      startFrame: 0, // recalculateFrames will fix this
      durationInFrames: durFrames,
      layout: 'full',
      layers,
      script: '',
      emotion: 'neutral',
      visualDirection: '',
    };

    dispatch({ type: 'ADD_SEGMENT', segment });
  }, [dispatch]);

  // Drag start handler for media assets
  const handleDragStart = useCallback((e: React.DragEvent, asset: MediaAsset) => {
    e.dataTransfer.setData('application/x-studio-media', JSON.stringify({
      id: asset.id,
      type: asset.type,
      url: asset.url,
      name: asset.name,
      durationSec: asset.durationSec,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  // Drop zone for file drag from OS
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileImport(e.dataTransfer.files);
    }
  }, [handleFileImport]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const formatDuration = (sec: number) => {
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(Math.floor(sec % 60)).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  return (
    <div
      className="space-y-3 h-full"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Import buttons */}
      <div className="flex gap-1.5">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          Import
        </button>
        <button
          onClick={() => setShowPastVideos(true)}
          className="flex items-center justify-center gap-1.5 px-2 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded-lg text-xs font-medium transition-colors"
          title="Import from past generated videos"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          Past
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileImport(e.target.files)}
        />
      </div>

      {/* Past Videos Modal */}
      <PastVideosModal
        isOpen={showPastVideos}
        onClose={() => setShowPastVideos(false)}
        onSelect={(url, segmentType) => {
          const durFrames = secondsToFrames(8); // default 8s for imported video
          const layers = [createVideoLayer(url, durFrames)];
          const segment: SegmentComposition = {
            id: generateId('seg_past'),
            segmentType: segmentType as SegmentComposition['segmentType'] || 'BODY',
            startFrame: 0,
            durationInFrames: durFrames,
            layout: 'full',
            layers,
            script: '',
            emotion: 'neutral',
            visualDirection: '',
          };
          dispatch({ type: 'ADD_SEGMENT', segment });
        }}
      />

      {/* Drop zone overlay */}
      {isDragOver && (
        <div className="border-2 border-dashed border-emerald-500/50 rounded-lg p-4 flex flex-col items-center justify-center gap-1 bg-emerald-500/5">
          <Upload className="w-5 h-5 text-emerald-400" />
          <span className="text-[10px] text-emerald-400">Drop files here</span>
        </div>
      )}

      {/* Uploading indicator */}
      {uploading && (
        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          <span className="text-xs text-emerald-400">Uploading...</span>
        </div>
      )}

      {/* Imported assets */}
      {importedAssets.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs text-neutral-400 font-medium">Imported ({importedAssets.length})</span>
          <div className="grid grid-cols-2 gap-1.5">
            {importedAssets.map((asset) => (
              <div
                key={asset.id}
                draggable
                onDragStart={(e) => handleDragStart(e, asset)}
                onClick={() => addToTimeline(asset)}
                className={`relative rounded-lg overflow-hidden cursor-grab active:cursor-grabbing group transition-all hover:ring-1 hover:ring-neutral-600 ${
                  timelineUrls.has(asset.url) ? 'opacity-70' : ''
                }`}
              >
                <div className="aspect-video bg-neutral-900 relative">
                  {asset.type === 'video' ? (
                    <video
                      src={asset.url}
                      className="w-full h-full object-cover"
                      muted
                      preload="auto"
                      playsInline
                      onLoadedData={(e) => { (e.target as HTMLVideoElement).currentTime = 0.5; }}
                    />
                  ) : (
                    <img src={asset.url} alt="" className="w-full h-full object-cover" draggable={false} />
                  )}

                  {timelineUrls.has(asset.url) && (
                    <div className="absolute top-1 left-1">
                      <span className="text-[8px] font-medium px-1 py-0.5 rounded bg-emerald-500/80 text-white">Added</span>
                    </div>
                  )}

                  <div className="absolute top-1 right-1">
                    <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-black/60 text-white">
                      {formatDuration(asset.durationSec)}
                    </span>
                  </div>

                  {/* Drag handle indicator on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <GripVertical className="w-4 h-4 text-white/0 group-hover:text-white/60 transition-colors" />
                  </div>
                </div>

                <div className="px-1.5 py-1 bg-neutral-800/80">
                  <span className="text-[10px] text-neutral-300 truncate block">{asset.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated media from pipeline (immutable — survives timeline deletion) */}
      {(() => {
        const pipelineMedia = state.pipelineMedia;
        if (pipelineMedia.length === 0) return null;

        // Track which pipeline segments are currently on timeline
        const timelineSegIds = new Set(segments.map(s => s.id));

        return (
          <div className="space-y-1.5">
            <span className="text-xs text-neutral-400 font-medium">Generated ({pipelineMedia.length})</span>
            <div className="grid grid-cols-2 gap-1.5">
              {pipelineMedia.map((media) => {
                const isOnTimeline = timelineSegIds.has(media.segId);
                return (
                  <div
                    key={media.segId}
                    draggable
                    onDragStart={(e) => {
                      // Set drag data for timeline drop handler
                      e.dataTransfer.setData('application/x-studio-media', JSON.stringify({
                        id: media.segId,
                        type: media.isVideo ? 'video' : 'image',
                        url: media.src,
                        name: media.segmentType,
                        durationSec: media.durationSec,
                        // Pipeline-specific fields
                        pipelineSegId: media.segId,
                        segmentType: media.segmentType,
                        script: media.script || '',
                        emotion: media.emotion || 'neutral',
                        visualDirection: media.visualDirection || '',
                        layout: media.layout || 'full',
                        isOnTimeline,
                      }));
                      e.dataTransfer.effectAllowed = isOnTimeline ? 'move' : 'copy';
                    }}
                    onClick={() => {
                      if (isOnTimeline) {
                        // Select existing segment on timeline
                        dispatch({ type: 'SELECT_SEGMENT', segmentId: media.segId });
                      }
                    }}
                    className={`relative rounded-lg overflow-hidden cursor-grab group transition-all hover:ring-1 hover:ring-emerald-500/50 ${
                      !isOnTimeline ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="aspect-video bg-neutral-900 relative">
                      {media.isVideo ? (
                        <video
                          src={media.src}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                          playsInline
                          onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).currentTime = 0.5; }}
                        />
                      ) : (
                        <img
                          src={media.src}
                          alt=""
                          className="w-full h-full object-cover"
                          draggable={false}
                        />
                      )}

                      {/* Segment type badge */}
                      <div className="absolute top-1 left-1">
                        <span className="text-[8px] font-medium px-1 py-0.5 rounded bg-black/70 text-emerald-400 border border-emerald-500/30">
                          {media.segmentType}
                        </span>
                      </div>

                      {/* Status badge */}
                      {!isOnTimeline ? (
                        <div className="absolute bottom-1 left-1">
                          <span className="text-[8px] font-medium px-1 py-0.5 rounded bg-amber-500/80 text-white">
                            Drag to add
                          </span>
                        </div>
                      ) : (
                        <div className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[8px] font-medium px-1 py-0.5 rounded bg-neutral-700/90 text-neutral-300">
                            Drag to reorder
                          </span>
                        </div>
                      )}

                      {/* Duration */}
                      <div className="absolute top-1 right-1">
                        <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-black/60 text-white">
                          {media.durationSec.toFixed(1)}s
                        </span>
                      </div>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Empty state when no media at all */}
      {importedAssets.length === 0 && state.pipelineMedia.length === 0 && (
        <div className="text-center py-8">
          <Film className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
          <p className="text-xs text-neutral-500">No media available</p>
          <p className="text-[10px] text-neutral-600 mt-1">Generate videos first or import files</p>
        </div>
      )}
    </div>
  );
};

// --- AI Music generation presets ---
const BGM_PRESETS = [
  { label: 'Upbeat Pop', prompt: 'Upbeat energetic pop music with catchy melody, modern production, feel-good vibes, 120bpm' },
  { label: 'Chill Lo-fi', prompt: 'Chill lo-fi hip hop beat with warm piano chords, vinyl crackle, relaxing ambient mood, 85bpm' },
  { label: 'Cinematic Epic', prompt: 'Cinematic epic orchestral music with building tension, dramatic strings, powerful brass, emotional crescendo' },
  { label: 'Corporate', prompt: 'Clean corporate background music, positive and motivational, acoustic guitar with light percussion, professional tone' },
  { label: 'Tropical House', prompt: 'Tropical house beat with steel drums, marimba melody, summer vibes, danceable groove, 110bpm' },
  { label: 'Dark Trap', prompt: 'Dark atmospheric trap beat with heavy 808 bass, eerie synth pads, hard-hitting drums, mysterious mood' },
];

// --- Audio Tab: Import files + AI Generate + browse Pixabay + track list ---
const AudioTabContent: React.FC = () => {
  const { state, dispatch, pushHistory } = useStudio();
  const { tts, bgm, sfx } = state.project.audio;
  const audioFileRef = useRef<HTMLInputElement>(null);
  const [audioType, setAudioType] = useState<'bgm' | 'sfx'>('bgm');
  const [genPrompt, setGenPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  // Import audio file from disk
  const handleAudioImport = useCallback((files: FileList | null) => {
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('audio/')) continue;
      const blobUrl = URL.createObjectURL(file);
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        const durSec = audio.duration || 10;
        const durFrames = Math.round(durSec * STUDIO_FPS);
        const track = {
          id: generateId(`${audioType}_import`),
          src: blobUrl,
          label: file.name.replace(/\.[^.]+$/, ''),
          startFrame: 0,
          durationInFrames: durFrames,
          volume: audioType === 'bgm' ? 0.3 : 0.7,
          fadeInFrames: audioType === 'bgm' ? 15 : 0,
          fadeOutFrames: audioType === 'bgm' ? 15 : 0,
          muted: false,
        };
        pushHistory(`Import ${audioType.toUpperCase()}`);
        dispatch({ type: 'ADD_AUDIO_TRACK', trackType: audioType, track });
      };
      audio.src = blobUrl;
    }
  }, [audioType, dispatch, pushHistory]);

  // Generate BGM via Minimax Music v2 edge function
  const handleGenerateMusic = useCallback(async (prompt: string) => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setGenError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-music`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ prompt: prompt.trim() }),
        }
      );
      const json = await resp.json();
      if (!json.success) {
        setGenError(json.error?.message || 'Generation failed');
        return;
      }
      // Add generated music to timeline
      const durSec = json.data.duration_seconds || 30;
      const durFrames = Math.round(durSec * STUDIO_FPS);
      const track = {
        id: generateId('bgm_ai'),
        src: json.data.music_url,
        label: `AI BGM — ${prompt.trim().slice(0, 30)}`,
        startFrame: 0,
        durationInFrames: durFrames,
        volume: 0.3,
        fadeInFrames: 15,
        fadeOutFrames: 15,
        muted: false,
      };
      pushHistory('Generate BGM');
      dispatch({ type: 'ADD_AUDIO_TRACK', trackType: 'bgm', track });
      setGenPrompt('');
    } catch {
      setGenError('Network error — try again');
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, dispatch, pushHistory]);

  const formatDur = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3 h-full overflow-y-auto">
      {/* Type toggle */}
      <div className="flex gap-1 bg-neutral-900 rounded-lg p-0.5">
        <button
          onClick={() => setAudioType('bgm')}
          className={`flex-1 text-[10px] font-medium py-1.5 rounded-md transition-colors ${
            audioType === 'bgm' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-300'
          }`}
        >
          BGM ({bgm.length})
        </button>
        <button
          onClick={() => setAudioType('sfx')}
          className={`flex-1 text-[10px] font-medium py-1.5 rounded-md transition-colors ${
            audioType === 'sfx' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-neutral-300'
          }`}
        >
          SFX ({sfx.length})
        </button>
      </div>

      {/* Import from file */}
      <div className="flex gap-1.5">
        <button
          onClick={() => audioFileRef.current?.click()}
          className="flex items-center gap-1 px-2 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-medium transition-colors"
        >
          <Upload className="w-3 h-3" />
          Import File
        </button>
        <a
          href={audioType === 'bgm' ? 'https://pixabay.com/music/' : 'https://pixabay.com/sound-effects/'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded-lg text-[10px] font-medium transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Pixabay
        </a>
        <input
          ref={audioFileRef}
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={(e) => handleAudioImport(e.target.files)}
        />
      </div>

      {/* AI Generate BGM (only show for BGM tab) */}
      {audioType === 'bgm' && (
        <div className="space-y-2 p-2 bg-neutral-900/50 rounded-lg border border-neutral-800">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] font-medium text-emerald-400">AI Generate BGM</span>
          </div>

          {/* Style presets — click to fill prompt, user confirms with Generate */}
          <div className="flex flex-wrap gap-1">
            {BGM_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => { setGenPrompt(preset.prompt); setGenError(''); }}
                disabled={isGenerating}
                className={`px-1.5 py-0.5 border rounded text-[9px] transition-colors disabled:opacity-40 ${
                  genPrompt === preset.prompt
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border-neutral-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Prompt textarea + Generate button */}
          <textarea
            value={genPrompt}
            onChange={(e) => { setGenPrompt(e.target.value); setGenError(''); }}
            placeholder="Select a style above or describe the music you want..."
            rows={2}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-[10px] text-neutral-200 placeholder-neutral-600 outline-none focus:border-emerald-500 transition-colors resize-none"
            disabled={isGenerating}
          />
          <button
            onClick={() => handleGenerateMusic(genPrompt)}
            disabled={isGenerating || genPrompt.trim().length < 10}
            className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-medium disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5"
          >
            {isGenerating ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Generating (30-60s)...</>
            ) : (
              <><Sparkles className="w-3 h-3" /> Generate BGM</>
            )}
          </button>
          {genError && (
            <p className="text-[9px] text-red-400 mt-1">{genError}</p>
          )}
        </div>
      )}

      {/* Current tracks */}
      {(bgm.length > 0 || sfx.length > 0 || tts.length > 0) && (
        <div className="space-y-1.5 pt-1 border-t border-neutral-800">
          <span className="text-[10px] text-neutral-500">Current Tracks</span>
          {tts.length > 0 && (
            <div className="flex items-center gap-2 px-2 py-1.5 bg-neutral-800/30 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
              <span className="text-[10px] text-neutral-300">Voice (TTS)</span>
              <span className="text-[9px] text-neutral-500 ml-auto">{tts.length}</span>
            </div>
          )}
          {bgm.map((track) => (
            <div key={track.id} className="flex items-center gap-2 px-2 py-1.5 bg-neutral-800/30 rounded-lg group">
              <div className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
              <span className="text-[10px] text-neutral-300 truncate flex-1">{track.label}</span>
              <span className="text-[9px] text-neutral-500">{formatDur(track.durationInFrames / STUDIO_FPS)}</span>
              <button
                onClick={() => { pushHistory('Remove BGM'); dispatch({ type: 'REMOVE_AUDIO_TRACK', trackType: 'bgm', trackId: track.id }); }}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {sfx.map((track) => (
            <div key={track.id} className="flex items-center gap-2 px-2 py-1.5 bg-neutral-800/30 rounded-lg group">
              <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
              <span className="text-[10px] text-neutral-300 truncate flex-1">{track.label}</span>
              <span className="text-[9px] text-neutral-500">{formatDur(track.durationInFrames / STUDIO_FPS)}</span>
              <button
                onClick={() => { pushHistory('Remove SFX'); dispatch({ type: 'REMOVE_AUDIO_TRACK', trackType: 'sfx', trackId: track.id }); }}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {bgm.length === 0 && sfx.length === 0 && tts.length === 0 && (
        <div className="text-center py-6">
          <Music className="w-6 h-6 text-neutral-700 mx-auto mb-1.5" />
          <p className="text-[10px] text-neutral-500">No audio tracks</p>
          <p className="text-[9px] text-neutral-600 mt-0.5">Generate AI music, import files, or browse Pixabay</p>
        </div>
      )}
    </div>
  );
};

// --- Transitions Tab (34 transitions in 10 categories) ---

interface TransitionDef {
  type: string;
  label: string;
}

interface TransitionCategory {
  name: string;
  color: string;
  items: TransitionDef[];
}

const TRANSITION_CATEGORIES: TransitionCategory[] = [
  {
    name: 'Basic',
    color: '#A3A3A3',
    items: [
      { type: 'fade', label: 'Fade' },
      { type: 'cut', label: 'Cut' },
      { type: 'dissolve', label: 'Dissolve' },
      { type: 'crossfade', label: 'Crossfade' },
      { type: 'dip-black', label: 'Dip to Black' },
    ],
  },
  {
    name: 'Slide',
    color: '#60A5FA',
    items: [
      { type: 'slide-left', label: 'Slide Left' },
      { type: 'slide-right', label: 'Slide Right' },
      { type: 'slide-up', label: 'Slide Up' },
      { type: 'slide-down', label: 'Slide Down' },
    ],
  },
  {
    name: 'Push',
    color: '#34D399',
    items: [
      { type: 'push-left', label: 'Push Left' },
      { type: 'push-right', label: 'Push Right' },
      { type: 'push-up', label: 'Push Up' },
      { type: 'push-down', label: 'Push Down' },
    ],
  },
  {
    name: 'Wipe',
    color: '#FBBF24',
    items: [
      { type: 'wipe-left', label: 'Wipe Left' },
      { type: 'wipe-right', label: 'Wipe Right' },
      { type: 'wipe-up', label: 'Wipe Up' },
      { type: 'wipe-down', label: 'Wipe Down' },
    ],
  },
  {
    name: 'Geometric',
    color: '#C084FC',
    items: [
      { type: 'clock-wipe', label: 'Clock Wipe' },
      { type: 'iris', label: 'Iris' },
      { type: 'diamond', label: 'Diamond' },
      { type: 'heart', label: 'Heart' },
      { type: 'star', label: 'Star' },
    ],
  },
  {
    name: 'Zoom',
    color: '#F472B6',
    items: [
      { type: 'zoom-in', label: 'Zoom In' },
      { type: 'zoom-out', label: 'Zoom Out' },
      { type: 'zoom-rotate', label: 'Zoom Rotate' },
    ],
  },
  {
    name: 'Flip',
    color: '#2DD4BF',
    items: [
      { type: 'flip-h', label: 'Flip H' },
      { type: 'flip-v', label: 'Flip V' },
    ],
  },
  {
    name: 'Blur',
    color: '#818CF8',
    items: [
      { type: 'blur-through', label: 'Blur Through' },
      { type: 'motion-blur', label: 'Motion Blur' },
    ],
  },
  {
    name: 'Glitch',
    color: '#FB7185',
    items: [
      { type: 'glitch', label: 'Glitch' },
      { type: 'pixelate', label: 'Pixelate' },
      { type: 'rgb-split', label: 'RGB Split' },
    ],
  },
  {
    name: 'Light',
    color: '#FDE68A',
    items: [
      { type: 'flash-white', label: 'Flash White' },
      { type: 'flash-black', label: 'Flash Black' },
    ],
  },
];

const TransitionsTabContent: React.FC = () => {
  // Track which categories are expanded — Basic open by default
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Basic']));

  const toggleCategory = useCallback((name: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, transitionType: string) => {
    e.dataTransfer.setData('application/x-studio-transition', JSON.stringify({ type: transitionType }));
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  return (
    <div className="space-y-0.5">
      {/* Accordion categories */}
      {TRANSITION_CATEGORIES.map(cat => {
        const isExpanded = expandedCategories.has(cat.name);
        return (
          <div key={cat.name}>
            {/* Accordion header */}
            <button
              onClick={() => toggleCategory(cat.name)}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-neutral-800/60 transition-colors group"
            >
              <svg
                width="10" height="10" viewBox="0 0 16 16" fill="none"
                className={`text-neutral-500 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
              >
                <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
              <span className="text-[11px] font-medium text-neutral-300 group-hover:text-neutral-100">{cat.name}</span>
              <span className="text-[9px] text-neutral-600 ml-auto">{cat.items.length}</span>
            </button>

            {/* Accordion body */}
            {isExpanded && (
              <div className="grid grid-cols-3 gap-1 px-1 pb-1.5 pt-0.5">
                {cat.items.map(t => (
                  <div
                    key={t.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, t.type)}
                    className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-neutral-800/50 hover:bg-neutral-700/70 cursor-grab active:cursor-grabbing transition-colors group"
                  >
                    <div
                      className="w-7 h-7 rounded flex items-center justify-center transition-colors"
                      style={{ backgroundColor: `${cat.color}15`, border: `1px solid ${cat.color}30` }}
                    >
                      <Sparkles className="w-3 h-3 transition-colors" style={{ color: cat.color }} />
                    </div>
                    <span className="text-[9px] text-neutral-400 group-hover:text-neutral-200 text-center leading-tight truncate w-full">{t.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <p className="text-[10px] text-neutral-600 pt-1 px-2">Drag a transition to the gap between clips on the timeline</p>
    </div>
  );
};

// --- Inner Editor ---
const StudioEditorInner: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state, dispatch, undo, redo, canUndo, canRedo, pushHistory } = useStudio();

  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [activeLeftTab, setActiveLeftTab] = useState<LeftPanelTab>('media');
  const [timelineHeight, setTimelineHeight] = useState(200);
  const [leftPanelWidth, setLeftPanelWidth] = useState(224);
  const [rightPanelWidth, setRightPanelWidth] = useState(256);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [playerSize, setPlayerSize] = useState({ w: 360, h: 640 });

  // Measure player container on resize
  useEffect(() => {
    const container = playerContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setPlayerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // --- Left panel resize ---
  const leftResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleLeftResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    leftResizeRef.current = { startX: e.clientX, startWidth: leftPanelWidth };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: MouseEvent) => {
      if (!leftResizeRef.current) return;
      const delta = ev.clientX - leftResizeRef.current.startX;
      const newWidth = Math.max(160, Math.min(400, leftResizeRef.current.startWidth + delta));
      setLeftPanelWidth(newWidth);
    };
    const onUp = () => {
      leftResizeRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [leftPanelWidth]);

  // --- Right panel resize ---
  const rightResizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleRightResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    rightResizeRef.current = { startX: e.clientX, startWidth: rightPanelWidth };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: MouseEvent) => {
      if (!rightResizeRef.current) return;
      // Right panel grows when mouse moves LEFT (negative delta)
      const delta = rightResizeRef.current.startX - ev.clientX;
      const newWidth = Math.max(200, Math.min(450, rightResizeRef.current.startWidth + delta));
      setRightPanelWidth(newWidth);
    };
    const onUp = () => {
      rightResizeRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [rightPanelWidth]);

  // --- Timeline resize ---
  const timelineResizeRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const handleTimelineResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    timelineResizeRef.current = { startY: e.clientY, startHeight: timelineHeight };
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: MouseEvent) => {
      if (!timelineResizeRef.current) return;
      const delta = timelineResizeRef.current.startY - ev.clientY;
      const newHeight = Math.max(120, Math.min(500, timelineResizeRef.current.startHeight + delta));
      setTimelineHeight(newHeight);
    };
    const onUp = () => {
      timelineResizeRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [timelineHeight]);

  // --- Phase 1B: Load project from DB ---
  const { project: loadedProject, pipelineMedia: loadedPipelineMedia, isLoading, error: loadError } = useStudioLoader(orderId);

  // Set project + pipeline media into context once loaded
  const hasSetProjectRef = useRef(false);
  useEffect(() => {
    if (loadedProject && !hasSetProjectRef.current) {
      hasSetProjectRef.current = true;
      // Set pipeline media first (immutable source), then project
      if (loadedPipelineMedia.length > 0) {
        dispatch({ type: 'SET_PIPELINE_MEDIA', media: loadedPipelineMedia });
      }
      dispatch({ type: 'SET_PROJECT', project: loadedProject });
    }
  }, [loadedProject, loadedPipelineMedia, dispatch]);

  // --- Phase 1I: Auto-save persistence ---
  const { saveNow, isSaving, lastSavedAt } = useStudioPersistence(orderId);

  // --- Phase 1C: Remotion Player ref ---
  const playerRef = useRef<PlayerRef>(null);

  // Sync playback state from context to Remotion Player
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    if (state.playback.isPlaying) {
      player.play();
    } else {
      player.pause();
    }
  }, [state.playback.isPlaying]);

  // Sync seek from context to Player (when user seeks via keyboard/buttons)
  const lastDispatchedFrameRef = useRef<number>(0);
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    // Only seek if the frame was changed externally (not from Player's own onFrameUpdate)
    if (state.playback.currentFrame !== lastDispatchedFrameRef.current) {
      player.seekTo(state.playback.currentFrame);
      lastDispatchedFrameRef.current = state.playback.currentFrame;
    }
  }, [state.playback.currentFrame]);

  // Listen to Player frame changes and sync back to context
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const onFrameUpdate: CallbackListener<'frameupdate'> = (e) => {
      lastDispatchedFrameRef.current = e.detail.frame;
      dispatch({ type: 'SET_CURRENT_FRAME', frame: e.detail.frame });
    };

    const onPlay: CallbackListener<'play'> = () => {
      dispatch({ type: 'SET_PLAYING', isPlaying: true });
    };

    const onPause: CallbackListener<'pause'> = () => {
      dispatch({ type: 'SET_PLAYING', isPlaying: false });
    };

    const onEnded: CallbackListener<'ended'> = () => {
      dispatch({ type: 'SET_PLAYING', isPlaying: false });
    };

    player.addEventListener('frameupdate', onFrameUpdate);
    player.addEventListener('play', onPlay);
    player.addEventListener('pause', onPause);
    player.addEventListener('ended', onEnded);

    return () => {
      player.removeEventListener('frameupdate', onFrameUpdate);
      player.removeEventListener('play', onPlay);
      player.removeEventListener('pause', onPause);
      player.removeEventListener('ended', onEnded);
    };
  }, [dispatch, state.project.segments.length]); // re-attach after Player mounts (segments.length changes when project loads)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.ctrlKey && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveNow();
      } else if (e.key === ' ' && !e.ctrlKey) {
        e.preventDefault();
        dispatch({ type: 'SET_PLAYING', isPlaying: !state.playback.isPlaying });
      } else if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
      } else if (e.key === 's' && !e.ctrlKey) {
        setActiveTool('split');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        // Priority: delete selected layer first, then overlay clip, then nothing
        // DELETE_SEGMENT is only for Media panel delete (not keyboard shortcut)
        if (state.selection.layerId && state.selection.segmentId) {
          // Check if it's an overlay clip
          const isOverlay = (state.project.overlayTracks || []).some(t => t.id === state.selection.segmentId);
          if (isOverlay) {
            pushHistory('Delete overlay clip');
            dispatch({ type: 'REMOVE_OVERLAY_CLIP', trackId: state.selection.segmentId, clipId: state.selection.layerId });
          } else {
            pushHistory('Delete layer');
            dispatch({ type: 'REMOVE_LAYER', segmentId: state.selection.segmentId, layerId: state.selection.layerId });
          }
        } else if (state.selection.segmentId) {
          // No specific layer selected — delete entire segment from timeline
          const seg = state.project.segments.find(s => s.id === state.selection.segmentId);
          if (seg) {
            pushHistory('Delete segment');
            dispatch({ type: 'DELETE_SEGMENT', segmentId: seg.id });
          }
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const seekAmount = e.shiftKey ? 3 : 30; // 0.1s or 1s at 30fps
        dispatch({ type: 'SET_CURRENT_FRAME', frame: Math.max(0, state.playback.currentFrame - seekAmount) });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const seekAmount = e.shiftKey ? 3 : 30;
        dispatch({ type: 'SET_CURRENT_FRAME', frame: state.playback.currentFrame + seekAmount });
      } else if (e.key === 'f' && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        setIsFullscreen(prev => !prev);
      } else if (e.key === 'Escape') {
        if (isFullscreen) {
          e.preventDefault();
          setIsFullscreen(false);
        }
      } else if (e.key === 'Home') {
        dispatch({ type: 'SET_CURRENT_FRAME', frame: 0 });
      } else if (e.key === 'End') {
        dispatch({ type: 'SET_CURRENT_FRAME', frame: state.project.totalDurationInFrames });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, pushHistory, state.playback.isPlaying, state.playback.currentFrame, state.project.totalDurationInFrames, state.selection, state.project.segments, state.project.overlayTracks, dispatch, saveNow, isFullscreen]);

  // --- Export modal ---
  const [showExportModal, setShowExportModal] = useState(false);

  // Map Studio transition types to FFmpeg xfade transition names
  const mapTransitionType = useCallback((studioType: string): string => {
    const map: Record<string, string> = {
      'fade': 'fade',
      'cut': 'fade', // no xfade equivalent, use very short fade
      'dissolve': 'dissolve',
      'crossfade': 'dissolve',
      'dip-black': 'fadeblack',
      'slide-left': 'slideleft',
      'slide-right': 'slideright',
      'slide-up': 'slideup',
      'slide-down': 'slidedown',
      'push-left': 'slideleft',
      'push-right': 'slideright',
      'push-up': 'slideup',
      'push-down': 'slidedown',
      'wipe-left': 'wipeleft',
      'wipe-right': 'wiperight',
      'wipe-up': 'wipeup',
      'wipe-down': 'wipedown',
      'clock-wipe': 'radial',
      'iris': 'circleopen',
      'diamond': 'diagtl',
      'heart': 'circleopen',
      'star': 'circleopen',
      'zoom-in': 'zoomin',
      'zoom-out': 'fadeblack',
      'zoom-rotate': 'zoomin',
      'flip-h': 'horzopen',
      'flip-v': 'vertopen',
    };
    return map[studioType] || 'dissolve';
  }, []);

  // Build video segments for combine API from studio project segments
  const exportSegments = useMemo(() => {
    const fps = state.project.fps || 30;

    // Build transition lookup: fromSegmentId → TransitionItem
    const transitionMap = new Map<string, typeof state.project.transitions[0]>();
    for (const t of state.project.transitions) {
      transitionMap.set(t.betweenSegments[0], t);
    }

    return state.project.segments.map((seg, index) => {
      // Find the first video layer's src URL
      const videoLayer = seg.layers.find(l => l.type === 'video');
      const imageLayer = seg.layers.find(l => l.type === 'image');
      const videoUrl = videoLayer?.src || imageLayer?.src || '';
      const durationSeconds = seg.durationInFrames / fps;

      // Map transition to next segment
      const transition = transitionMap.get(seg.id);
      const transitionType = transition ? mapTransitionType(transition.type) : null;
      const transitionDuration = transition ? transition.durationInFrames / fps : undefined;

      // Collect visible text layers as overlays for FFmpeg drawtext
      const textOverlays = seg.layers
        .filter(l => l.type === 'text' && l.visible && l.text?.content)
        .map(l => ({
          content: l.text!.content,
          x: Math.round(l.position.x),
          y: Math.round(l.position.y),
          width: Math.round(l.size.w),
          height: Math.round(l.size.h),
          font_size: l.text!.fontSize || 48,
          font_family: l.text!.fontFamily || 'Arial',
          font_color: l.text!.color || '#FFFFFF',
          bg_color: undefined,
          opacity: l.opacity,
          alignment: (l.text!.align || 'center') as 'left' | 'center' | 'right',
          bold: false,
          italic: false,
          stroke_color: l.text!.strokeColor || undefined,
          stroke_width: l.text!.strokeWidth || 0,
          enter_animation: l.animation?.enter || undefined,
          exit_animation: l.animation?.exit || undefined,
          start_time: l.inFrame / fps,
          end_time: l.outFrame / fps,
        }));

      return {
        segment_id: seg.id,
        segment_number: index + 1,
        segment_type: seg.segmentType || 'BODY',
        video_url: videoUrl,
        duration_seconds: durationSeconds,
        script_text: seg.script || null,
        emotion: seg.emotion || 'neutral',
        transition_type: transitionType,
        transition_duration: transitionDuration,
        text_overlays: textOverlays.length > 0 ? textOverlays : undefined,
      };
    });
  }, [state.project.segments, state.project.fps, state.project.transitions, mapTransitionType]);

  // Build media overlays (image/video from overlay tracks) with absolute timing
  const exportMediaOverlays = useMemo(() => {
    const fps = state.project.fps || 30;
    const overlayTracks = state.project.overlayTracks || [];
    if (overlayTracks.length === 0) return [];

    // Calculate cumulative segment start times (accounting for transition overlaps)
    const segments = state.project.segments;
    const transitionMap = new Map<string, typeof state.project.transitions[0]>();
    for (const t of state.project.transitions) {
      transitionMap.set(t.betweenSegments[0], t);
    }

    // Build frame→seconds mapping for the final combined video
    // In the combined video, segments overlap by transition duration
    const segStartSeconds: number[] = [];
    let cumulative = 0;
    for (let i = 0; i < segments.length; i++) {
      segStartSeconds.push(cumulative);
      const seg = segments[i];
      const segDur = seg.durationInFrames / fps;
      const transition = transitionMap.get(seg.id);
      const transDur = transition ? transition.durationInFrames / fps : 0;
      if (i < segments.length - 1 && transDur > 0) {
        cumulative += segDur - transDur;
      } else {
        cumulative += segDur;
      }
    }
    const totalDurationSec = cumulative;

    // Convert absolute frame positions to absolute seconds in the combined video
    // Overlay clips use absolute startFrame on the studio timeline
    // Studio timeline: segments concatenated without overlap (frame-based)
    // Combined video: segments concatenated WITH transition overlap (seconds-based)
    const frameToAbsoluteSeconds = (frame: number): number => {
      // Find which segment this frame falls into
      let frameAcc = 0;
      for (let i = 0; i < segments.length; i++) {
        const segFrames = segments[i].durationInFrames;
        if (frame < frameAcc + segFrames) {
          const offsetInSeg = (frame - frameAcc) / fps;
          return segStartSeconds[i] + offsetInSeg;
        }
        frameAcc += segFrames;
      }
      // Past all segments — clamp to total
      return totalDurationSec;
    };

    const mediaOverlays: Array<{
      type: 'image' | 'video';
      src: string;
      x: number;
      y: number;
      width: number;
      height: number;
      opacity: number;
      start_time: number;
      end_time: number;
    }> = [];

    for (const track of overlayTracks) {
      for (const clip of track.clips) {
        if (!clip.src) continue;
        const clipType = clip.type === 'video' ? 'video' : 'image';
        const startSec = frameToAbsoluteSeconds(clip.startFrame);
        const endSec = frameToAbsoluteSeconds(clip.startFrame + clip.durationInFrames);
        if (endSec <= startSec) continue;

        mediaOverlays.push({
          type: clipType,
          src: clip.src,
          x: Math.round(clip.position.x),
          y: Math.round(clip.position.y),
          width: Math.round(clip.size.w),
          height: Math.round(clip.size.h),
          opacity: clip.opacity,
          start_time: startSec,
          end_time: endSec,
        });
      }
    }

    return mediaOverlays;
  }, [state.project.overlayTracks, state.project.segments, state.project.fps, state.project.transitions]);

  // Format frame to MM:SS timecode (legacy)
  const formatTimecode = (frame: number): string => {
    const totalSeconds = frame / 30;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format frame to HH:MM:SS:FF timecode (CapCut-style)
  const formatTimecodeHMS = (frame: number): string => {
    const fps = STUDIO_FPS;
    const totalSeconds = Math.floor(frame / fps);
    const ff = Math.floor(frame % fps);
    const hh = Math.floor(totalSeconds / 3600);
    const mm = Math.floor((totalSeconds % 3600) / 60);
    const ss = totalSeconds % 60;
    return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}:${ff.toString().padStart(2, '0')}`;
  };

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Determine if we have enough data to show the Remotion Player
  const hasSegments = state.project.segments.length > 0;
  const totalFrames = state.project.totalDurationInFrames || 1;

  if (isLoading) {
    return (
      <div className="h-screen bg-[#0B0E14] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-neutral-400">Loading Studio...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-screen bg-[#0B0E14] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-neutral-300 mb-1">Failed to load studio</p>
          <p className="text-xs text-neutral-500 mb-4">{loadError}</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0B0E14] text-white overflow-hidden select-none">
      {/* ================================================================ */}
      {/* TOP BAR                                                          */}
      {/* ================================================================ */}
      <div className="flex items-center h-11 px-4 bg-[#161616] border-b border-[#262626] flex-shrink-0">
        {/* Left: Back + Logo + Brand + Title */}
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-neutral-400 hover:text-white text-sm mr-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="h-5 w-px bg-[#262626] mr-3" />
        <img src="/logo-light.png" alt="Sparkfluence" className="h-6 mr-1.5" draggable={false} />
        <span className="text-sm font-semibold tracking-wide text-white mr-4">SPARKFLUENCE</span>
        <div className="h-5 w-px bg-[#262626] mr-3" />
        <span className="text-sm font-medium text-neutral-300 truncate max-w-[300px]">
          {state.project.title || 'Untitled Project'}
        </span>
        {isSaving && <span className="text-[10px] text-amber-400 ml-2">Saving...</span>}
        {!isSaving && state.isDirty && <span className="text-[10px] text-neutral-500 ml-1">*</span>}
        {!isSaving && !state.isDirty && lastSavedAt && <span className="text-[10px] text-neutral-600 ml-2">Saved</span>}

        <div className="flex-1" />

        {/* Center: Undo/Redo */}
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-1.5 rounded hover:bg-[#262626] text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-1.5 rounded hover:bg-[#262626] text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1" />

        {/* Right: Export */}
        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors text-sm font-medium shadow-lg shadow-emerald-500/20"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>

      {/* ================================================================ */}
      {/* MAIN EDITOR AREA (3-panel layout)                                */}
      {/* ================================================================ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ============================================================ */}
        {/* LEFT PANEL — Asset Tabs                                      */}
        {/* ============================================================ */}
        <div className="flex-shrink-0 bg-[#161616] border-r border-[#262626] flex flex-col" style={{ width: leftPanelWidth }}>
          {/* Tab Bar */}
          <div className="flex border-b border-[#262626]">
            {LEFT_PANEL_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeLeftTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveLeftTab(tab.id)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
                    isActive
                      ? 'text-emerald-400 border-b-2 border-emerald-400'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {activeLeftTab === 'media' && <MediaTabContent />}
            {activeLeftTab === 'audio' && <AudioTabContent />}
            {activeLeftTab === 'text' && <TextTemplates />}
            {activeLeftTab === 'transitions' && <TransitionsTabContent />}
            {activeLeftTab === 'effects' && (
              <div className="text-center text-neutral-500 text-xs mt-8">
                Effects coming soon
              </div>
            )}
          </div>
        </div>

        {/* Left panel resize handle */}
        <div
          onMouseDown={handleLeftResizeStart}
          className="w-1 flex-shrink-0 bg-transparent hover:bg-emerald-500/30 cursor-col-resize transition-colors active:bg-emerald-500/50"
        />

        {/* ============================================================ */}
        {/* CENTER — Video Preview                                       */}
        {/* ============================================================ */}
        <div className={`flex-1 flex flex-col min-w-0 bg-[#0B0E14] ${
          isFullscreen ? 'fixed inset-0 z-[60]' : ''
        }`}>
          {/* Player-Timeline label (CapCut-style) */}
          <div className="flex items-center justify-between px-3 py-1 bg-[#0B0E14] border-b border-[#1E1E1E]">
            <span className="text-[11px] font-medium text-emerald-400">
              Player-Timeline
            </span>
            <span className="text-[10px] text-neutral-600 font-mono">
              {state.project.segments.length} segments
            </span>
          </div>

          {/* Preview Area */}
          <div className="flex-1 flex items-center justify-center min-h-0 p-4">
            <div className="relative w-full max-w-[360px] aspect-[9/16] max-h-full">
              {hasSegments ? (
                <div ref={playerContainerRef} className="w-full h-full rounded-xl ring-1 ring-white/10 overflow-hidden relative">
                  <Player
                    ref={playerRef}
                    component={VideoComposition}
                    inputProps={{ project: state.project, hiddenTracks: Array.from(state.hiddenTracks) }}
                    compositionWidth={STUDIO_WIDTH}
                    compositionHeight={STUDIO_HEIGHT}
                    durationInFrames={totalFrames}
                    fps={STUDIO_FPS}
                    style={{ width: '100%', height: '100%' }}
                    controls={false}
                    autoPlay={false}
                    loop={false}
                    clickToPlay={false}
                  />
                  {/* Text drag overlay */}
                  <PlayerOverlay
                    project={state.project}
                    currentFrame={state.playback.currentFrame}
                    selectedSegmentId={state.selection.segmentId}
                    selectedLayerId={state.selection.layerId}
                    containerRef={playerContainerRef}
                    onLayerSelect={(segId, layerId) => {
                      if (!segId && !layerId) {
                        // Deselect — clear selection
                        dispatch({ type: 'SELECT_SEGMENT', segmentId: state.selection.segmentId || '' });
                      } else {
                        dispatch({ type: 'SELECT_LAYER', segmentId: segId, layerId });
                      }
                    }}
                    onLayerMove={(segId, layerId, position) => {
                      // Caption move: segId='captions', layerId='caption-{segId}-{idx}'
                      if (segId === 'captions') {
                        const match = layerId.match(/^caption-(.+)-(\d+)$/);
                        if (match) {
                          const captionSegId = match[1];
                          dispatch({ type: 'UPDATE_CAPTION_TRACK', segmentId: captionSegId, changes: { position } });
                        }
                        return;
                      }
                      // Check if this is an overlay clip (segId = track.id)
                      const isOverlay = (state.project.overlayTracks || []).some(t => t.id === segId);
                      if (isOverlay) {
                        dispatch({ type: 'UPDATE_OVERLAY_CLIP', trackId: segId, clipId: layerId, changes: { position } });
                      } else {
                        // Move only this specific text layer (independent)
                        dispatch({ type: 'MOVE_TEXT_LAYER', segmentId: segId, layerId, position });
                      }
                    }}
                    onLayerResize={(segId, layerId, changes) => {
                      pushHistory('Resize layer');
                      // Caption resize
                      if (segId === 'captions') {
                        const match = layerId.match(/^caption-(.+)-(\d+)$/);
                        if (match) {
                          const captionSegId = match[1];
                          const captionChanges: Record<string, unknown> = {};
                          if (changes.size) captionChanges.size = changes.size;
                          if (changes.position) captionChanges.position = changes.position;
                          if (changes.text?.fontSize) captionChanges.fontSize = changes.text.fontSize;
                          dispatch({ type: 'UPDATE_CAPTION_TRACK', segmentId: captionSegId, changes: captionChanges });
                        }
                        return;
                      }
                      const isOverlay = (state.project.overlayTracks || []).some(t => t.id === segId);
                      if (isOverlay) {
                        const overlayChanges: any = {};
                        if (changes.size) overlayChanges.size = changes.size;
                        if (changes.position) overlayChanges.position = changes.position;
                        if (changes.text) {
                          // Merge font size into existing text
                          const track = (state.project.overlayTracks || []).find(t => t.id === segId);
                          const clip = track?.clips.find(c => c.id === layerId);
                          if (clip?.text) {
                            overlayChanges.text = { ...clip.text, ...changes.text };
                          }
                        }
                        dispatch({ type: 'UPDATE_OVERLAY_CLIP', trackId: segId, clipId: layerId, changes: overlayChanges });
                      } else {
                        // For segment layers, merge text changes properly
                        const seg = state.project.segments.find(s => s.id === segId);
                        const layer = seg?.layers.find(l => l.id === layerId);
                        const mergedChanges: any = { ...changes };
                        if (changes.text && layer?.text) {
                          mergedChanges.text = { ...layer.text, ...changes.text };
                        }
                        dispatch({ type: 'UPDATE_LAYER', segmentId: segId, layerId, changes: mergedChanges });
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="w-full h-full bg-black rounded-xl ring-1 ring-white/10 flex items-center justify-center">
                  <div className="text-center text-neutral-500">
                    <Film className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No video data</p>
                    <p className="text-xs text-neutral-600 mt-1">Generate video segments first</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mini progress scrubber removed — timeline below handles scrubbing */}

          {/* Playback Controls — CapCut-style: timecode left, transport center, tools right */}
          <div className="flex items-center py-2 px-4 bg-[#161616] border-t border-[#262626]">
            {/* Left: Timecodes */}
            <div className="flex items-center gap-1.5 min-w-[140px]">
              <span className="text-xs text-neutral-300 font-mono tabular-nums">
                {formatTimecodeHMS(state.playback.currentFrame)}
              </span>
              <span className="text-xs text-neutral-600 font-mono">/</span>
              <span className="text-xs text-neutral-500 font-mono tabular-nums">
                {formatTimecodeHMS(state.project.totalDurationInFrames)}
              </span>
            </div>

            {/* Center: Transport controls */}
            <div className="flex-1 flex items-center justify-center gap-3">
              <button
                onClick={() => dispatch({ type: 'SET_CURRENT_FRAME', frame: 0 })}
                className="p-1 text-neutral-400 hover:text-white transition-colors"
                title="Go to start (Home)"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={() => dispatch({ type: 'SET_PLAYING', isPlaying: !state.playback.isPlaying })}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                title={state.playback.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {state.playback.isPlaying ? (
                  <Pause className="w-4 h-4 fill-white" />
                ) : (
                  <Play className="w-4 h-4 fill-white ml-0.5" />
                )}
              </button>
              <button
                onClick={() => dispatch({ type: 'SET_CURRENT_FRAME', frame: state.project.totalDurationInFrames })}
                className="p-1 text-neutral-400 hover:text-white transition-colors"
                title="Go to end (End)"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Right: Volume, Fullscreen, Aspect Ratio */}
            <div className="flex items-center gap-2 min-w-[140px] justify-end">
              <button className="p-1 text-neutral-400 hover:text-white transition-colors" title="Volume">
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsFullscreen(prev => !prev)}
                className="p-1 text-neutral-400 hover:text-white transition-colors"
                title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen (F)'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
                9:16
              </span>
            </div>
          </div>
        </div>

        {/* Right panel resize handle */}
        <div
          onMouseDown={handleRightResizeStart}
          className="w-1 flex-shrink-0 bg-transparent hover:bg-emerald-500/30 cursor-col-resize transition-colors active:bg-emerald-500/50"
        />

        {/* ============================================================ */}
        {/* RIGHT PANEL — Properties (context-sensitive)                  */}
        {/* ============================================================ */}
        <div className="flex-shrink-0 bg-[#161616] border-l border-[#262626] overflow-y-auto" style={{ width: rightPanelWidth }}>
          <div className="p-3">
            <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">Properties</h3>
            <RightPanelContent />
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* TOOLBAR — between main editor and timeline                       */}
      {/* ================================================================ */}
      <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        zoom={state.zoom}
        onZoomChange={(z) => dispatch({ type: 'SET_ZOOM', zoom: z })}
      />

      {/* ================================================================ */}
      {/* TIMELINE — bottom panel                                          */}
      {/* ================================================================ */}
      {/* Timeline resize handle */}
      <div
        onMouseDown={handleTimelineResizeStart}
        className="h-1 flex-shrink-0 bg-transparent hover:bg-emerald-500/30 cursor-row-resize transition-colors active:bg-emerald-500/50"
      />

      <div
        className="flex-shrink-0 overflow-hidden"
        style={{ height: timelineHeight }}
      >
        <Timeline activeTool={activeTool} />
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onComplete={async () => {
          setShowExportModal(false);
          // Cleanup studio media from Supabase Storage
          const mediaAssets = state.project.mediaAssets || [];
          if (mediaAssets.length > 0 && user) {
            const paths = mediaAssets.map(a => {
              const parts = a.url.split('/studio-media/');
              return parts[1] || '';
            }).filter(Boolean);
            if (paths.length > 0) {
              await supabase.storage.from('studio-media').remove(paths);
            }
          }
          // Update session status to complete
          if (orderId) {
            await supabase.from('chat_sessions').update({ status: 'complete' }).eq('order_id', orderId);
          }
          // Redirect to planner
          navigate('/planner');
        }}
        videoTitle={state.project.title || 'Untitled Video'}
        thumbnailUrl={state.project.segments[0]?.layers.find(l => l.type === 'image')?.src}
        orderId={orderId}
        sessionId={orderId}
        segments={exportSegments}
        bgmUrl={state.project.audio.bgm.find(t => !t.muted && t.src)?.src || null}
        bgmVolume={state.project.audio.bgm.find(t => !t.muted && t.src)?.volume ?? 0.2}
        enableSubtitles={true}
        mediaOverlays={exportMediaOverlays}
      />
    </div>
  );
};

export default StudioEditor;
