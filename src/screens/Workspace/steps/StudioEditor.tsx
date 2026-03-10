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
} from 'lucide-react';
import { Player, type PlayerRef, type CallbackListener } from '@remotion/player';
import { StudioProvider, useStudio } from '../../../contexts/StudioContext';
import { useAuth } from '../../../contexts/AuthContext';
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
  const { state, dispatch, selectedSegment, selectedLayer } = useStudio();

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
            dispatch({ type: 'APPLY_TEXT_STYLE_TO_ALL', sourceLayerId, styleProps, position })
          }
        />
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

// --- Imported media asset (local blob URL or external URL) ---
interface MediaAsset {
  id: string;
  name: string;
  type: 'video' | 'image';
  url: string;
  durationSec: number; // default 5s for images, detected for video
  thumbnailUrl: string;
  addedToTimeline: boolean;
}

// --- Media Tab: CapCut-style grid with Import + segment assets + drag ---
const MediaTabContent: React.FC = () => {
  const { state, dispatch } = useStudio();
  const segments = state.project.segments;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importedAssets, setImportedAssets] = useState<MediaAsset[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

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

  // Handle file import
  const handleFileImport = useCallback((files: FileList | null) => {
    if (!files) return;

    const newAssets: MediaAsset[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isVideo && !isImage) continue;

      const blobUrl = URL.createObjectURL(file);
      const asset: MediaAsset = {
        id: generateId('media'),
        name: file.name,
        type: isVideo ? 'video' : 'image',
        url: blobUrl,
        durationSec: isVideo ? 8 : 5, // default; video duration detected below
        thumbnailUrl: blobUrl,
        addedToTimeline: false,
      };

      // For videos, try to get actual duration
      if (isVideo) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          setImportedAssets(prev => prev.map(a =>
            a.id === asset.id ? { ...a, durationSec: Math.round(video.duration) } : a
          ));
          URL.revokeObjectURL(video.src);
        };
        video.src = blobUrl;
      }

      newAssets.push(asset);
    }

    setImportedAssets(prev => [...prev, ...newAssets]);
  }, []);

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
    setImportedAssets(prev => prev.map(a =>
      a.id === asset.id ? { ...a, addedToTimeline: true } : a
    ));
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
      {/* Import button */}
      <div className="flex gap-1.5">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          Import
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

      {/* Drop zone overlay */}
      {isDragOver && (
        <div className="border-2 border-dashed border-emerald-500/50 rounded-lg p-4 flex flex-col items-center justify-center gap-1 bg-emerald-500/5">
          <Upload className="w-5 h-5 text-emerald-400" />
          <span className="text-[10px] text-emerald-400">Drop files here</span>
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
                  asset.addedToTimeline || timelineUrls.has(asset.url) ? 'opacity-70' : ''
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

                  {(asset.addedToTimeline || timelineUrls.has(asset.url)) && (
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

      {/* Generated media from pipeline (video/image generation steps) */}
      {(() => {
        const generatedMedia = segments
          .map((seg) => {
            const videoLayer = seg.layers.find(l => l.type === 'video');
            const imageLayer = seg.layers.find(l => l.type === 'image');
            const mediaSrc = videoLayer?.src || imageLayer?.src;
            if (!mediaSrc) return null;
            return {
              segId: seg.id,
              segmentType: seg.segmentType,
              src: mediaSrc,
              isVideo: !!videoLayer,
              durationSec: seg.durationInFrames / STUDIO_FPS,
            };
          })
          .filter(Boolean) as { segId: string; segmentType: string; src: string; isVideo: boolean; durationSec: number }[];

        if (generatedMedia.length === 0) return null;

        return (
          <div className="space-y-1.5">
            <span className="text-xs text-neutral-400 font-medium">Generated ({generatedMedia.length})</span>
            <div className="grid grid-cols-2 gap-1.5">
              {generatedMedia.map((media) => (
                <div
                  key={media.segId}
                  onClick={() => dispatch({ type: 'SELECT_SEGMENT', segmentId: media.segId })}
                  className="relative rounded-lg overflow-hidden cursor-pointer group transition-all hover:ring-1 hover:ring-emerald-500/50"
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
              ))}
            </div>
          </div>
        );
      })()}

      {/* Empty state when no media at all */}
      {importedAssets.length === 0 && segments.every(seg => !seg.layers.some(l => l.type === 'video' || l.type === 'image')) && (
        <div className="text-center py-8">
          <Film className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
          <p className="text-xs text-neutral-500">No media available</p>
          <p className="text-[10px] text-neutral-600 mt-1">Generate videos first or import files</p>
        </div>
      )}
    </div>
  );
};

// --- Audio Tab: Audio track list ---
const AudioTabContent: React.FC = () => {
  const { state } = useStudio();
  const { tts, bgm, sfx } = state.project.audio;
  const totalTracks = tts.length + bgm.length + sfx.length;

  if (totalTracks === 0) {
    return <p className="text-center text-neutral-500 text-xs mt-8">No audio tracks</p>;
  }

  const TrackRow: React.FC<{ label: string; count: number; color: string }> = ({ label, count, color }) =>
    count > 0 ? (
      <div className="flex items-center gap-2 px-2 py-1.5 bg-neutral-800/50 rounded-lg">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs text-neutral-300">{label}</span>
        <span className="text-[10px] text-neutral-500 ml-auto">{count}</span>
      </div>
    ) : null;

  return (
    <div className="space-y-2">
      <span className="text-xs text-neutral-400 font-medium">Audio Tracks</span>
      <TrackRow label="Voice (TTS)" count={tts.length} color="#60A5FA" />
      <TrackRow label="Background Music" count={bgm.length} color="#C084FC" />
      <TrackRow label="Sound Effects" count={sfx.length} color="#FBBF24" />
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
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Flatten for "All" view or filter by category
  const visibleCategories = activeCategory
    ? TRANSITION_CATEGORIES.filter(c => c.name === activeCategory)
    : TRANSITION_CATEGORIES;

  const handleDragStart = useCallback((e: React.DragEvent, transitionType: string) => {
    e.dataTransfer.setData('application/x-studio-transition', JSON.stringify({ type: transitionType }));
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  return (
    <div className="space-y-2">
      {/* Category filter chips */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
            !activeCategory
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-neutral-800 text-neutral-400 hover:text-neutral-300'
          }`}
        >
          All
        </button>
        {TRANSITION_CATEGORIES.map(cat => (
          <button
            key={cat.name}
            onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
              activeCategory === cat.name
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-neutral-800 text-neutral-400 hover:text-neutral-300'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Transition items by category */}
      {visibleCategories.map(cat => (
        <div key={cat.name} className="space-y-1">
          <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider">{cat.name}</span>
          <div className="grid grid-cols-3 gap-1">
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
        </div>
      ))}

      <p className="text-[10px] text-neutral-600 pt-1">Drag a transition to the gap between clips on the timeline</p>
    </div>
  );
};

// --- Inner Editor ---
const StudioEditorInner: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state, dispatch, undo, redo, canUndo, canRedo } = useStudio();

  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [activeLeftTab, setActiveLeftTab] = useState<LeftPanelTab>('media');
  const [timelineHeight, setTimelineHeight] = useState(200);
  const [leftPanelWidth, setLeftPanelWidth] = useState(224);
  const [rightPanelWidth, setRightPanelWidth] = useState(256);
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
  const { project: loadedProject, isLoading, error: loadError } = useStudioLoader(orderId);

  // Set project into context once loaded
  const hasSetProjectRef = useRef(false);
  useEffect(() => {
    if (loadedProject && !hasSetProjectRef.current) {
      hasSetProjectRef.current = true;
      dispatch({ type: 'SET_PROJECT', project: loadedProject });
    }
  }, [loadedProject, dispatch]);

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
        if (state.selection.segmentId) {
          e.preventDefault();
          dispatch({ type: 'DELETE_SEGMENT', segmentId: state.selection.segmentId });
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const seekAmount = e.shiftKey ? 3 : 30; // 0.1s or 1s at 30fps
        dispatch({ type: 'SET_CURRENT_FRAME', frame: Math.max(0, state.playback.currentFrame - seekAmount) });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const seekAmount = e.shiftKey ? 3 : 30;
        dispatch({ type: 'SET_CURRENT_FRAME', frame: state.playback.currentFrame + seekAmount });
      } else if (e.key === 'Home') {
        dispatch({ type: 'SET_CURRENT_FRAME', frame: 0 });
      } else if (e.key === 'End') {
        dispatch({ type: 'SET_CURRENT_FRAME', frame: state.project.totalDurationInFrames });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, state.playback.isPlaying, state.playback.currentFrame, state.project.totalDurationInFrames, dispatch, saveNow]);

  // --- Export modal ---
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleExportMP4 = useCallback(async () => {
    setExportStatus('saving');
    await saveNow();
    setExportStatus('saved');
    // TODO: trigger VPS FFmpeg render + download when pipeline is connected
    setTimeout(() => setExportStatus('idle'), 3000);
  }, [saveNow]);


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
        {/* Left: Logo + Back + Title */}
        <img src="/logo-light.png" alt="Sparkfluence" className="h-6 mr-3" draggable={false} />
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-neutral-400 hover:text-white text-sm mr-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="h-5 w-px bg-[#262626] mr-3" />
        <span className="text-sm font-medium text-white truncate max-w-[300px]">
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
        <div className="flex-1 flex flex-col min-w-0 bg-[#0B0E14]">
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
                    inputProps={{ project: state.project }}
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
                    containerWidth={playerSize.w}
                    containerHeight={playerSize.h}
                    onLayerSelect={(segId, layerId) => dispatch({ type: 'SELECT_LAYER', segmentId: segId, layerId })}
                    onLayerMove={(segId, layerId, position) => {
                      // Check if this is an overlay clip (segId = track.id)
                      const isOverlay = (state.project.overlayTracks || []).some(t => t.id === segId);
                      if (isOverlay) {
                        dispatch({ type: 'UPDATE_OVERLAY_CLIP', trackId: segId, clipId: layerId, changes: { position } });
                      } else {
                        dispatch({ type: 'MOVE_ALL_TEXT_LAYERS', sourceLayerId: layerId, position });
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
              <button className="p-1 text-neutral-400 hover:text-white transition-colors" title="Fullscreen">
                <Maximize2 className="w-4 h-4" />
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
        onExportMP4={handleExportMP4}
        isSaving={exportStatus === 'saving'}
        videoTitle={state.project.name || 'Untitled Video'}
        orderId={orderId}
      />
    </div>
  );
};

export default StudioEditor;
