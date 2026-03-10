// ============================================================================
// Sparkfluence Studio — Composition JSON Utilities
// ============================================================================

import {
  SparkfluenceProject,
  SegmentComposition,
  LayerItem,
  AudioTrackItem,
  TransitionItem,
  PipelineInput,
  PipelineSegment,
  LayoutType,
  STUDIO_WIDTH,
  STUDIO_HEIGHT,
  STUDIO_FPS,
} from '../types/studio';

// --- ID Generation ---
let _counter = 0;
export function generateId(prefix = 'item'): string {
  _counter++;
  return `${prefix}_${Date.now()}_${_counter}`;
}

// --- Frame/Time Conversions ---
export function secondsToFrames(seconds: number, fps = STUDIO_FPS): number {
  return Math.round(seconds * fps);
}

export function framesToSeconds(frames: number, fps = STUDIO_FPS): number {
  return frames / fps;
}

export function formatTimecode(frame: number, fps = STUDIO_FPS): string {
  const totalSeconds = frame / fps;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// --- Default Layer Factories ---

export function createVideoLayer(
  src: string,
  durationInFrames: number,
  position = { x: 0, y: 0 },
  size = { w: STUDIO_WIDTH, h: STUDIO_HEIGHT },
): LayerItem {
  return {
    id: generateId('layer_video'),
    type: 'video',
    src,
    position,
    size,
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    visible: true,
    locked: false,
    inFrame: 0,
    outFrame: durationInFrames,
  };
}

export function createImageLayer(
  src: string,
  durationInFrames: number,
  position = { x: 0, y: 0 },
  size = { w: STUDIO_WIDTH, h: STUDIO_HEIGHT },
): LayerItem {
  return {
    id: generateId('layer_img'),
    type: 'image',
    src,
    position,
    size,
    zIndex: 1,
    opacity: 1,
    rotation: 0,
    visible: true,
    locked: false,
    inFrame: 0,
    outFrame: durationInFrames,
  };
}

export function createTextLayer(
  content: string,
  durationInFrames: number,
): LayerItem {
  return {
    id: generateId('layer_text'),
    type: 'text',
    src: '',
    position: { x: STUDIO_WIDTH * 0.1, y: STUDIO_HEIGHT * 0.82 },
    size: { w: STUDIO_WIDTH * 0.8, h: 120 },
    zIndex: 5,
    opacity: 1,
    rotation: 0,
    visible: true,
    locked: false,
    inFrame: 0,
    outFrame: durationInFrames,
    animation: {
      enter: 'fade-in',
      exit: 'fade-out',
      enterDurationFrames: 6,
      exitDurationFrames: 6,
    },
    text: {
      content,
      fontFamily: 'Inter',
      fontSize: 48,
      color: '#FFFFFF',
      strokeColor: '#000000',
      strokeWidth: 2,
      align: 'center',
    },
  };
}

export function createStickerLayer(
  src: string,
  durationInFrames: number,
  position = { x: STUDIO_WIDTH * 0.7, y: STUDIO_HEIGHT * 0.05 },
  size = { w: 180, h: 180 },
): LayerItem {
  return {
    id: generateId('layer_sticker'),
    type: 'lottie',
    src,
    position,
    size,
    zIndex: 3,
    opacity: 1,
    rotation: 0,
    visible: true,
    locked: false,
    inFrame: Math.round(durationInFrames * 0.15), // appear at 15%
    outFrame: durationInFrames,
    animation: {
      enter: 'pop-in',
      exit: 'fade-out',
      enterDurationFrames: 8,
      exitDurationFrames: 6,
    },
    lottie: {
      animationData: src,
      loop: true,
      playbackRate: 1,
    },
  };
}

export function createEffectLayer(
  preset: LayerItem['effect'],
  durationInFrames: number,
): LayerItem {
  return {
    id: generateId('layer_fx'),
    type: 'effect',
    src: '',
    position: { x: 0, y: 0 },
    size: { w: STUDIO_WIDTH, h: STUDIO_HEIGHT },
    zIndex: 4,
    opacity: 0.6,
    rotation: 0,
    visible: true,
    locked: false,
    inFrame: 0,
    outFrame: durationInFrames,
    effect: preset ?? undefined,
  };
}

// --- Audio Factories ---

export function createTtsTrack(
  src: string,
  startFrame: number,
  durationInFrames: number,
  label = 'TTS',
): AudioTrackItem {
  return {
    id: generateId('audio_tts'),
    src,
    label,
    startFrame,
    durationInFrames,
    volume: 1,
    fadeInFrames: 0,
    fadeOutFrames: 0,
    muted: false,
  };
}

export function createBgmTrack(
  src: string,
  totalDuration: number,
): AudioTrackItem {
  return {
    id: generateId('audio_bgm'),
    src,
    label: 'Background Music',
    startFrame: 0,
    durationInFrames: totalDuration,
    volume: 0.2,
    fadeInFrames: secondsToFrames(1),
    fadeOutFrames: secondsToFrames(2),
    muted: false,
  };
}

// --- Transition Factory ---

export function createTransition(
  fromSegmentId: string,
  toSegmentId: string,
  type: TransitionItem['type'] = 'fade',
): TransitionItem {
  return {
    id: generateId('trans'),
    type,
    durationInFrames: secondsToFrames(0.5),
    betweenSegments: [fromSegmentId, toSegmentId],
  };
}

// --- Layout Helpers ---

export function getLayoutRegions(layout: LayoutType) {
  switch (layout) {
    case 'split-60-40':
      return {
        background: { x: 0, y: 0, w: STUDIO_WIDTH, h: STUDIO_HEIGHT * 0.4 },
        creator: { x: 0, y: STUDIO_HEIGHT * 0.4, w: STUDIO_WIDTH, h: STUDIO_HEIGHT * 0.6 },
      };
    case 'split-50-50':
      return {
        background: { x: 0, y: 0, w: STUDIO_WIDTH, h: STUDIO_HEIGHT * 0.5 },
        creator: { x: 0, y: STUDIO_HEIGHT * 0.5, w: STUDIO_WIDTH, h: STUDIO_HEIGHT * 0.5 },
      };
    case 'pip':
      return {
        background: { x: 0, y: 0, w: STUDIO_WIDTH, h: STUDIO_HEIGHT },
        creator: { x: STUDIO_WIDTH * 0.6, y: STUDIO_HEIGHT * 0.65, w: STUDIO_WIDTH * 0.35, h: STUDIO_HEIGHT * 0.3 },
      };
    case 'creator-center':
      return {
        background: { x: 0, y: 0, w: STUDIO_WIDTH, h: STUDIO_HEIGHT },
        creator: { x: STUDIO_WIDTH * 0.15, y: STUDIO_HEIGHT * 0.2, w: STUDIO_WIDTH * 0.7, h: STUDIO_HEIGHT * 0.6 },
      };
    case 'full':
    default:
      return {
        background: { x: 0, y: 0, w: STUDIO_WIDTH, h: STUDIO_HEIGHT },
      };
  }
}

// --- Build Project from Pipeline Input ---

export function buildProjectFromPipeline(input: PipelineInput, userId: string): SparkfluenceProject {
  const activeSegments = input.segments.filter(s => !s.isDismissed);
  let currentFrame = 0;

  const segments: SegmentComposition[] = activeSegments.map((seg) => {
    const durFrames = secondsToFrames(seg.durationSeconds);
    const layers: LayerItem[] = [];

    // Background layer (video preferred, image fallback)
    if (seg.videoUrl) {
      layers.push(createVideoLayer(seg.videoUrl, durFrames));
    } else if (seg.imageUrl) {
      layers.push(createImageLayer(seg.imageUrl, durFrames));
    }

    // Text/subtitle layer
    if (seg.script) {
      layers.push(createTextLayer(seg.script, durFrames));
    }

    const comp: SegmentComposition = {
      id: seg.id || generateId('seg'),
      segmentType: normalizeSegmentType(seg.type),
      startFrame: currentFrame,
      durationInFrames: durFrames,
      layout: 'full',
      layers,
      script: seg.script,
      emotion: seg.emotion || 'neutral',
      visualDirection: seg.visualDirection || '',
    };

    currentFrame += durFrames;
    return comp;
  });

  // Transitions between consecutive segments
  const transitions: TransitionItem[] = [];
  for (let i = 0; i < segments.length - 1; i++) {
    transitions.push(createTransition(segments[i].id, segments[i + 1].id));
  }

  // Audio tracks
  const tts: AudioTrackItem[] = [];
  if (input.ttsAudioUrls) {
    for (const seg of segments) {
      const ttsUrl = input.ttsAudioUrls[seg.id];
      if (ttsUrl) {
        tts.push(createTtsTrack(ttsUrl, seg.startFrame, seg.durationInFrames, `TTS: ${seg.segmentType}`));
      }
    }
  }

  const bgm: AudioTrackItem[] = [];
  if (input.bgmUrl) {
    bgm.push(createBgmTrack(input.bgmUrl, currentFrame));
  }

  return {
    id: generateId('proj'),
    userId,
    scriptId: input.scriptId || '',
    title: input.title || 'Untitled Project',
    resolution: { w: STUDIO_WIDTH, h: STUDIO_HEIGHT },
    fps: STUDIO_FPS,
    totalDurationInFrames: currentFrame,
    segments,
    audio: { tts, bgm, sfx: [] },
    transitions,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeSegmentType(type: string): SegmentComposition['segmentType'] {
  const upper = type.toUpperCase().replace(/[\s-]/g, '_');
  const map: Record<string, SegmentComposition['segmentType']> = {
    'HOOK': 'HOOK',
    'FOREGROUND': 'FORE',
    'FORE': 'FORE',
    'BODY': 'BODY',
    'BODY_1': 'BODY',
    'BODY_2': 'BODY',
    'BODY_3': 'BODY',
    'PEAK': 'PEAK',
    'CTA': 'CTA',
    'LOOP': 'LOOP_END',
    'LOOP_END': 'LOOP_END',
  };
  return map[upper] || 'BODY';
}

// --- Build Project from Chat Session (DB row) ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildProjectFromSession(session: any, userId: string): SparkfluenceProject {
  const scriptSegments: Array<{
    id: string;
    segmentType?: string;
    segment_type?: string;
    type?: string;
    durationSeconds?: number;
    duration_seconds?: number;
    script?: string;
    visualDirection?: string;
    visual_direction?: string;
    emotion?: string;
    shotType?: string;
    shot_type?: string;
    layout?: string;
  }> = session.script_data?.segments || [];

  const imageSegments: Array<{ id: string; imageUrl?: string; image_url?: string }> =
    session.image_data?.segments || [];

  const videoSegments: Array<{ id: string; videoUrl?: string; video_url?: string }> =
    session.video_data?.segments || [];

  // Build lookup maps for image/video by segment id
  const imageMap = new Map<string, string>();
  for (const img of imageSegments) {
    const url = img.imageUrl || img.image_url;
    if (url) imageMap.set(img.id, url);
  }

  const videoMap = new Map<string, string>();
  for (const vid of videoSegments) {
    const url = vid.videoUrl || vid.video_url;
    if (url) videoMap.set(vid.id, url);
  }

  let currentFrame = 0;
  const segments: SegmentComposition[] = scriptSegments.reduce<SegmentComposition[]>((acc, seg) => {
    const durationSec = seg.durationSeconds || seg.duration_seconds || 5;
    const durFrames = secondsToFrames(durationSec);
    const layers: LayerItem[] = [];

    const videoUrl = videoMap.get(seg.id);
    const imageUrl = imageMap.get(seg.id);

    // Skip segments with no video and no image (e.g. loop_end not yet generated)
    if (!videoUrl && !imageUrl) return acc;

    if (videoUrl) {
      layers.push(createVideoLayer(videoUrl, durFrames));
    } else if (imageUrl) {
      layers.push(createImageLayer(imageUrl, durFrames));
    }

    // Add subtitle/text layer from script
    const scriptText = seg.script || '';
    if (scriptText) {
      layers.push(createTextLayer(scriptText, durFrames));
    }

    const segType = seg.segmentType || seg.segment_type || seg.type || 'BODY';
    const layout = (seg.layout || 'full') as LayoutType;

    const comp: SegmentComposition = {
      id: seg.id || generateId('seg'),
      segmentType: normalizeSegmentType(segType),
      startFrame: currentFrame,
      durationInFrames: durFrames,
      layout,
      layers,
      script: scriptText,
      emotion: seg.emotion || 'neutral',
      visualDirection: seg.visualDirection || seg.visual_direction || '',
    };

    currentFrame += durFrames;
    acc.push(comp);
    return acc;
  }, []);

  // Transitions between consecutive segments
  const transitions: TransitionItem[] = [];
  for (let i = 0; i < segments.length - 1; i++) {
    transitions.push(createTransition(segments[i].id, segments[i + 1].id));
  }

  const settings = session.settings || {};

  return {
    id: generateId('proj'),
    userId,
    scriptId: session.order_id || '',
    title: session.title || settings.topic || 'Untitled Project',
    resolution: { w: STUDIO_WIDTH, h: STUDIO_HEIGHT },
    fps: STUDIO_FPS,
    totalDurationInFrames: currentFrame,
    segments,
    audio: { tts: [], bgm: [], sfx: [] },
    transitions,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// --- Recalculate Frames ---
// Call after reordering or resizing segments to fix startFrame chain
export function recalculateFrames(project: SparkfluenceProject): SparkfluenceProject {
  let currentFrame = 0;
  const segments = project.segments.map(seg => {
    const updated = { ...seg, startFrame: currentFrame };
    currentFrame += seg.durationInFrames;
    return updated;
  });
  return {
    ...project,
    segments,
    totalDurationInFrames: currentFrame,
    updatedAt: new Date().toISOString(),
  };
}

// --- Serialize for Export ---
export function serializeForExport(project: SparkfluenceProject): string {
  return JSON.stringify(project, null, 2);
}
