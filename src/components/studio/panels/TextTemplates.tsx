// ============================================================================
// Text Templates Panel — 6 preset text overlays + Auto Captions button
// Left panel content for the "Text" tab in StudioEditor.
// ============================================================================

import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Subtitles, Plus, Loader2 } from 'lucide-react';
import { useStudio } from '../../../contexts/StudioContext';
import { useGenerateCaptions } from '../../../hooks/useGenerateCaptions';
import { createTextLayer } from '../../../lib/composition';
import { CaptionStylePicker } from './CaptionStylePicker';
import { STUDIO_WIDTH, STUDIO_HEIGHT, STUDIO_FPS } from '../../../types/studio';
import type { LayerItem, CaptionStyle } from '../../../types/studio';

// --- Template Definitions ---

interface TextTemplate {
  id: string;
  label: string;
  description: string;
  previewColor: string;
  previewBg: string;
  createLayer: (durationInFrames: number) => LayerItem;
}

const TEXT_TEMPLATES: TextTemplate[] = [
  {
    id: 'headline',
    label: 'Headline',
    description: 'Large bold title at top',
    previewColor: '#FFFFFF',
    previewBg: 'transparent',
    createLayer: (dur) => {
      const layer = createTextLayer('Your Headline', dur);
      layer.position = { x: STUDIO_WIDTH * 0.05, y: STUDIO_HEIGHT * 0.10 };
      layer.size = { w: STUDIO_WIDTH * 0.9, h: 160 };
      layer.text = {
        content: 'Your Headline',
        fontFamily: 'Montserrat',
        fontSize: 64,
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 0,
        align: 'center',
        lineHeight: 1.2,
      };
      return layer;
    },
  },
  {
    id: 'subtitle',
    label: 'Subtitle',
    description: 'Smaller text at bottom',
    previewColor: 'rgba(255,255,255,0.8)',
    previewBg: 'transparent',
    createLayer: (dur) => {
      const layer = createTextLayer('Subtitle text here', dur);
      layer.position = { x: STUDIO_WIDTH * 0.1, y: STUDIO_HEIGHT * 0.85 };
      layer.size = { w: STUDIO_WIDTH * 0.8, h: 80 };
      layer.text = {
        content: 'Subtitle text here',
        fontFamily: 'Inter',
        fontSize: 32,
        color: 'rgba(255,255,255,0.8)',
        strokeColor: '#000000',
        strokeWidth: 0,
        align: 'center',
        lineHeight: 1.3,
      };
      return layer;
    },
  },
  {
    id: 'lower-third',
    label: 'Lower Third',
    description: 'Name/title bar at bottom-left',
    previewColor: '#FFFFFF',
    previewBg: 'rgba(0,0,0,0.6)',
    createLayer: (dur) => {
      const layer = createTextLayer('Your Name', dur);
      layer.position = { x: 0, y: STUDIO_HEIGHT * 0.82 };
      layer.size = { w: STUDIO_WIDTH * 0.6, h: 60 };
      layer.text = {
        content: 'Your Name',
        fontFamily: 'Inter',
        fontSize: 24,
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 0,
        align: 'left',
        lineHeight: 1.4,
      };
      // Add background via opacity trick — actual bg rendering handled by TextLayer
      layer.animation = {
        enter: 'slide-left' as const,
        exit: 'fade-out' as const,
        enterDurationFrames: 10,
        exitDurationFrames: 8,
      };
      return layer;
    },
  },
  {
    id: 'callout',
    label: 'Callout',
    description: 'Attention-grabbing center text',
    previewColor: '#FBBF24',
    previewBg: 'transparent',
    createLayer: (dur) => {
      const layer = createTextLayer('IMPORTANT!', dur);
      layer.position = { x: STUDIO_WIDTH * 0.1, y: STUDIO_HEIGHT * 0.4 };
      layer.size = { w: STUDIO_WIDTH * 0.8, h: 120 };
      layer.text = {
        content: 'IMPORTANT!',
        fontFamily: 'Bebas Neue',
        fontSize: 48,
        color: '#FBBF24',
        strokeColor: '#000000',
        strokeWidth: 0,
        align: 'center',
        lineHeight: 1.2,
      };
      layer.animation = {
        enter: 'pop-in' as const,
        exit: 'fade-out' as const,
        enterDurationFrames: 8,
        exitDurationFrames: 6,
      };
      return layer;
    },
  },
  {
    id: 'countdown',
    label: 'Countdown',
    description: 'Large number with pop animation',
    previewColor: '#FFFFFF',
    previewBg: 'transparent',
    createLayer: (dur) => {
      const layer = createTextLayer('3', dur);
      layer.position = { x: STUDIO_WIDTH * 0.2, y: STUDIO_HEIGHT * 0.3 };
      layer.size = { w: STUDIO_WIDTH * 0.6, h: 240 };
      layer.text = {
        content: '3',
        fontFamily: 'Oswald',
        fontSize: 120,
        color: '#FFFFFF',
        strokeColor: '#000000',
        strokeWidth: 0,
        align: 'center',
        lineHeight: 1,
      };
      layer.animation = {
        enter: 'pop-in' as const,
        exit: 'scale-down' as const,
        enterDurationFrames: 6,
        exitDurationFrames: 4,
      };
      return layer;
    },
  },
  {
    id: 'price-tag',
    label: 'Price Tag',
    description: 'White text on emerald pill',
    previewColor: '#FFFFFF',
    previewBg: '#10B981',
    createLayer: (dur) => {
      const layer = createTextLayer('$9.99', dur);
      layer.position = { x: STUDIO_WIDTH * 0.25, y: STUDIO_HEIGHT * 0.45 };
      layer.size = { w: STUDIO_WIDTH * 0.5, h: 80 };
      layer.text = {
        content: '$9.99',
        fontFamily: 'Inter',
        fontSize: 36,
        color: '#FFFFFF',
        strokeColor: '#10B981',
        strokeWidth: 0,
        align: 'center',
        lineHeight: 1.3,
      };
      layer.animation = {
        enter: 'pop-in' as const,
        exit: 'fade-out' as const,
        enterDurationFrames: 8,
        exitDurationFrames: 6,
      };
      return layer;
    },
  },
];

// --- Component ---

export const TextTemplates: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { state, dispatch, pushHistory } = useStudio();
  const { project, selection, playback } = state;

  // Caption generation hook
  const { generate, isGenerating, error: captionError } = useGenerateCaptions({
    orderId,
    onSuccess: (captions) => {
      pushHistory('Generate auto captions');
      dispatch({ type: 'SET_CAPTIONS', captions });
    },
  });

  // Current caption style (from first caption track or default)
  const currentCaptionStyle: CaptionStyle =
    project.captions?.[0]?.style || 'classic';

  const handleStyleChange = useCallback(
    (style: CaptionStyle) => {
      pushHistory('Change caption style');
      dispatch({ type: 'SET_CAPTION_STYLE', style });
    },
    [dispatch, pushHistory],
  );

  // Find the segment at the current playhead position
  const findSegmentAtPlayhead = useCallback(() => {
    const frame = state.playback.currentFrame;
    // Find segment containing this frame
    const seg = project.segments.find(
      s => frame >= s.startFrame && frame < s.startFrame + s.durationInFrames
    );
    return seg || project.segments.find(s => s.id === selection.segmentId) || project.segments[0];
  }, [state.playback.currentFrame, project.segments, selection.segmentId]);

  // Calculate inFrame/outFrame relative to segment, using playhead position
  const getTextTiming = useCallback((segment: typeof project.segments[0]) => {
    const currentFrame = state.playback.currentFrame;
    const relativeFrame = Math.max(0, currentFrame - segment.startFrame);
    const defaultDuration = STUDIO_FPS * 3; // 3 seconds default
    const inFrame = relativeFrame;
    const outFrame = Math.min(inFrame + defaultDuration, segment.durationInFrames);
    return { inFrame, outFrame };
  }, [state.playback.currentFrame]);

  // Position new text based on count of existing text layers (CapCut-style stacking)
  // Each new text gets a distinct Y slot so they never visually overlap
  const positionNewTextLayer = useCallback((segment: typeof project.segments[0], layer: LayerItem) => {
    const existingTextCount = segment.layers.filter(l => l.type === 'text').length;
    if (existingTextCount === 0) return; // first text keeps template default position

    // Slot positions from top to bottom (% of STUDIO_HEIGHT)
    // Slot 0 = template default, slot 1 = 15%, slot 2 = 30%, slot 3 = 45%, etc.
    const slotY = [0.15, 0.30, 0.45, 0.60, 0.72];
    const slotIndex = Math.min(existingTextCount - 1, slotY.length - 1);
    layer.position = {
      ...layer.position,
      y: Math.round(STUDIO_HEIGHT * slotY[slotIndex]),
    };
  }, []);

  // Add a text layer to the segment at playhead position
  const handleAddTextLayer = useCallback(
    (createFn: (dur: number) => LayerItem) => {
      const segment = findSegmentAtPlayhead();
      if (!segment) return;

      const { inFrame, outFrame } = getTextTiming(segment);

      pushHistory('Add text layer');
      const layer = createFn(outFrame - inFrame);
      layer.inFrame = inFrame;
      layer.outFrame = outFrame;
      positionNewTextLayer(segment, layer);
      dispatch({ type: 'ADD_LAYER', segmentId: segment.id, layer });
      // Auto-select the new text layer
      dispatch({ type: 'SELECT_LAYER', segmentId: segment.id, layerId: layer.id });
    },
    [findSegmentAtPlayhead, getTextTiming, positionNewTextLayer, dispatch, pushHistory],
  );

  // Add default text layer at playhead
  const handleAddDefaultText = useCallback(() => {
    const segment = findSegmentAtPlayhead();
    if (!segment) return;

    const { inFrame, outFrame } = getTextTiming(segment);

    pushHistory('Add text layer');
    const layer = createTextLayer('Your text here', outFrame - inFrame);
    layer.inFrame = inFrame;
    layer.outFrame = outFrame;
    positionNewTextLayer(segment, layer);
    dispatch({ type: 'ADD_LAYER', segmentId: segment.id, layer });
    dispatch({ type: 'SELECT_LAYER', segmentId: segment.id, layerId: layer.id });
  }, [findSegmentAtPlayhead, getTextTiming, positionNewTextLayer, dispatch, pushHistory]);

  const hasCaptions = (project.captions?.length || 0) > 0;
  const hasSegments = project.segments.length > 0;

  return (
    <div className="space-y-4">
      {/* Add Text button */}
      <button
        onClick={handleAddDefaultText}
        disabled={!hasSegments}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-200 rounded-lg text-xs font-medium transition-colors border border-neutral-700"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Text
      </button>

      {/* Auto Captions button */}
      <button
        onClick={generate}
        disabled={isGenerating || !hasSegments}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-emerald-400 rounded-lg text-xs font-medium transition-colors border border-emerald-500/20"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Generating Captions...
          </>
        ) : (
          <>
            <Subtitles className="w-3.5 h-3.5" />
            {hasCaptions ? 'Regenerate Captions' : 'Auto Captions'}
          </>
        )}
      </button>

      {captionError && (
        <p className="text-[10px] text-red-400 leading-tight">{captionError}</p>
      )}

      {/* Caption style picker — shown when captions exist */}
      {hasCaptions && (
        <CaptionStylePicker
          currentStyle={currentCaptionStyle}
          onStyleChange={handleStyleChange}
        />
      )}

      {/* Divider */}
      <div className="border-t border-neutral-800" />

      {/* Template label */}
      <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium">
        Text Templates
      </p>

      {/* Template grid */}
      <div className="grid grid-cols-2 gap-2">
        {TEXT_TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => handleAddTextLayer(template.createLayer)}
            disabled={!hasSegments}
            className="group flex flex-col items-center gap-1.5 rounded-lg p-2 bg-neutral-800 border border-neutral-700 hover:border-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {/* Preview box */}
            <div className="w-full h-10 rounded bg-neutral-900 flex items-center justify-center overflow-hidden">
              <span
                style={{
                  color: template.previewColor,
                  backgroundColor: template.previewBg !== 'transparent' ? template.previewBg : undefined,
                  padding: template.previewBg !== 'transparent' ? '2px 8px' : undefined,
                  borderRadius: template.previewBg !== 'transparent' ? 4 : undefined,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {template.label}
              </span>
            </div>

            {/* Label */}
            <span className="text-[10px] text-neutral-400 group-hover:text-neutral-300 font-medium transition-colors">
              {template.label}
            </span>
          </button>
        ))}
      </div>

      {!hasSegments && (
        <p className="text-[10px] text-neutral-500 text-center mt-2">
          Add video segments first to use text overlays
        </p>
      )}
    </div>
  );
};
