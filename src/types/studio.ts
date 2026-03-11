// ============================================================================
// Sparkfluence Studio — Type Definitions
// ============================================================================

// --- Resolution & FPS ---
export const STUDIO_WIDTH = 1080;
export const STUDIO_HEIGHT = 1920;
export const STUDIO_FPS = 30;

// --- Segment Types (from script generation) ---
export type SegmentType = 'HOOK' | 'FORE' | 'BODY' | 'PEAK' | 'CTA' | 'LOOP_END';

// --- Layout Templates ---
export type LayoutType = 'full' | 'split-60-40' | 'split-50-50' | 'pip' | 'creator-center';

export interface LayoutRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutTemplate {
  id: LayoutType;
  label: string;
  description: string;
  regions: {
    background: LayoutRegion;
    creator?: LayoutRegion;
  };
}

// --- Layer Types ---
export type LayerType = 'video' | 'image' | 'lottie' | 'text' | 'effect';

export type EnterAnimation =
  | 'none' | 'pop-in' | 'fade-in' | 'slide-left' | 'slide-right'
  | 'slide-up' | 'slide-down' | 'bounce' | 'scale-up';

export type ExitAnimation =
  | 'none' | 'fade-out' | 'slide-out' | 'scale-down';

export type EffectPresetType =
  | 'money-flying' | 'confetti' | 'fire' | 'sparkles' | 'rain'
  | 'alert-pulse' | 'camera-shake' | 'snow' | 'hearts';

export type TransitionType =
  // Basic
  | 'fade' | 'cut' | 'dissolve' | 'crossfade' | 'dip-black'
  // Slide
  | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down'
  // Push
  | 'push-left' | 'push-right' | 'push-up' | 'push-down'
  // Wipe
  | 'wipe-left' | 'wipe-right' | 'wipe-up' | 'wipe-down'
  // Geometric
  | 'clock-wipe' | 'iris' | 'diamond' | 'heart' | 'star'
  // Zoom
  | 'zoom-in' | 'zoom-out' | 'zoom-rotate'
  // Flip
  | 'flip-h' | 'flip-v'
  // Blur
  | 'blur-through' | 'motion-blur'
  // Glitch
  | 'glitch' | 'pixelate' | 'rgb-split'
  // Light
  | 'flash-white' | 'flash-black'
  // Legacy aliases
  | 'slide' | 'wipe' | 'flip';

export type TextAlign = 'left' | 'center' | 'right';

// --- Layer Item ---
export interface LayerItem {
  id: string;
  type: LayerType;
  src: string;
  position: { x: number; y: number };
  size: { w: number; h: number };
  zIndex: number;
  opacity: number;
  rotation: number;
  visible: boolean;
  locked: boolean;

  // Timing (relative to segment start, in frames)
  inFrame: number;
  outFrame: number;

  // Animation
  animation?: {
    enter: EnterAnimation;
    exit: ExitAnimation;
    enterDurationFrames: number;
    exitDurationFrames: number;
  };

  // Type-specific: text
  text?: {
    content: string;
    fontFamily: string;
    fontSize: number;
    color: string;
    strokeColor: string;
    strokeWidth: number;
    align: TextAlign;
    lineHeight?: number;
  };

  // Type-specific: lottie
  lottie?: {
    animationData: string; // URL to .json
    loop: boolean;
    playbackRate: number;
  };

  // Type-specific: effect
  effect?: {
    preset: EffectPresetType;
    intensity?: number; // 0-1
    color?: string;
  };
}

// --- Segment Composition ---
export interface SegmentComposition {
  id: string;
  segmentType: SegmentType;
  startFrame: number;
  durationInFrames: number;
  layout: LayoutType;
  layers: LayerItem[];

  // Original duration before any trims (set on first trim, allows expanding back)
  maxDurationInFrames?: number;

  // Script metadata (from generation pipeline)
  script: string;
  emotion: string;
  visualDirection: string;
}

// --- Audio ---
export interface AudioTrackItem {
  id: string;
  src: string;
  label: string;
  startFrame: number;
  durationInFrames: number;
  volume: number;       // 0-1
  fadeInFrames: number;
  fadeOutFrames: number;
  muted: boolean;
}

export interface AudioMix {
  tts: AudioTrackItem[];
  bgm: AudioTrackItem[];
  sfx: AudioTrackItem[];
}

// --- Transitions ---
export interface TransitionItem {
  id: string;
  type: TransitionType;
  durationInFrames: number;
  betweenSegments: [string, string]; // [fromSegmentId, toSegmentId]
}

// --- Top-Level Project ---
// --- Persisted Media Asset (uploaded to Supabase Storage) ---
export interface MediaAsset {
  id: string;
  name: string;
  type: 'video' | 'image';
  url: string;          // Supabase Storage public URL (survives refresh)
  durationSec: number;
  thumbnailUrl: string;
}

export interface SparkfluenceProject {
  id: string;
  userId: string;
  scriptId: string;
  title: string;
  resolution: { w: number; h: number };
  fps: number;
  totalDurationInFrames: number;

  segments: SegmentComposition[];
  audio: AudioMix;
  transitions: TransitionItem[];
  captions?: CaptionTrack[];
  overlayTracks?: OverlayTrack[];
  mediaAssets?: MediaAsset[];  // Imported media persisted via Supabase Storage

  createdAt: string;
  updatedAt: string;
}

// --- Overlay Tracks (Multi-Track System) ---

export interface OverlayClip {
  id: string;
  type: 'video' | 'image' | 'text';
  src: string;                          // media URL (empty string for text)
  startFrame: number;                   // absolute position on timeline
  durationInFrames: number;
  position: { x: number; y: number };   // composition coordinates
  size: { w: number; h: number };
  opacity: number;
  zIndex: number;

  // Text-specific (when type === 'text')
  text?: {
    content: string;
    fontFamily: string;
    fontSize: number;
    color: string;
    strokeColor: string;
    strokeWidth: number;
    align: TextAlign;
  };
}

export interface OverlayTrack {
  id: string;
  label: string;           // "Video 2", "Text 2", etc.
  trackType: 'video' | 'text';
  clips: OverlayClip[];
}

// --- Captions ---
export type CaptionStyle = 'classic' | 'bold' | 'neon' | 'outline' | 'karaoke' | 'minimal';

export interface CaptionChunk {
  text: string;
  startMs: number;
  endMs: number;
}

export interface CaptionTrack {
  segmentId: string;
  chunks: CaptionChunk[];
  style: CaptionStyle;
  // Custom position/size (overrides default bottom-15% center)
  position?: { x: number; y: number };
  size?: { w: number; h: number };
  // Custom text styling (overrides style preset defaults)
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  opacity?: number;
  // Karaoke highlight color (default: #10B981 emerald)
  highlightColor?: string;
}

// --- Sticker Library ---
export type StickerCategory =
  | 'finance' | 'tech' | 'food' | 'health' | 'education'
  | 'emoji' | 'badges' | 'effects' | 'social';

export interface StickerMeta {
  id: string;
  name: string;
  category: StickerCategory;
  tags: string[];
  format: 'lottie' | 'png' | 'webp';
  animated: boolean;
  src: string;
  thumbnail: string;
  dimensions: { w: number; h: number };
}

// --- Effect Library ---
export interface EffectDefinition {
  id: EffectPresetType;
  label: string;
  description: string;
  thumbnail: string;
  defaultDurationFrames: number;
  emotions: string[];  // Which emotions trigger this suggestion
  keywords: string[];  // Which keywords trigger this suggestion
}

// --- Editor State ---
export interface StudioSelection {
  segmentId: string | null;
  layerId: string | null;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentFrame: number;
}

export interface StudioState {
  project: SparkfluenceProject;
  selection: StudioSelection;
  playback: PlaybackState;
  zoom: number;           // Timeline zoom level (1 = default)
  activePanel: 'media' | 'stickers' | 'effects' | 'text' | 'audio';
}

// --- History (Undo/Redo) ---
export interface HistoryEntry {
  project: SparkfluenceProject;
  description: string;
  timestamp: number;
}

// --- Pipeline Input (from VideoGeneration screen) ---
export interface PipelineSegment {
  id: string;
  type: string;
  element?: string;
  timing?: string;
  duration?: string;
  durationSeconds: number;
  script: string;
  visualDirection: string;
  emotion: string;
  transition: string;
  shotType: string;
  imageUrl: string | null;
  videoUrl: string | null;
  prompt?: string;
  isDismissed?: boolean;
}

export interface PipelineInput {
  segments: PipelineSegment[];
  settings: {
    duration: string;
    aspectRatio: string;
    resolution: string;
    language?: string;
  };
  scriptId: string;
  title: string;
  ttsAudioUrls?: Record<string, string>;
  bgmUrl?: string;
}

// --- AI Auto-Composition ---
export interface AISuggestion {
  id: string;
  type: 'sticker' | 'effect' | 'layout' | 'transition';
  label: string;
  description: string;
  segmentId: string;
  applied: boolean;
  data: {
    stickerId?: string;
    effectPreset?: EffectPresetType;
    layout?: LayoutType;
    transitionType?: TransitionType;
    position?: { x: number; y: number };
    timing?: { inFrame: number; outFrame: number };
  };
}

// --- Export ---
export type ExportStatus = 'idle' | 'preparing' | 'rendering' | 'uploading' | 'done' | 'error';

export interface ExportState {
  status: ExportStatus;
  progress: number;     // 0-100
  outputUrl: string | null;
  error: string | null;
}
