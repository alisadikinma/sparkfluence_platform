// ============================================================================
// Sparkfluence Studio — AI Auto-Composition Hook
// Analyzes script segments and auto-populates layers with suggested
// stickers, effects, and layout selections.
// ============================================================================

import { useCallback } from 'react';
import { useStudio } from '../contexts/StudioContext';
import type {
  SegmentComposition,
  LayerItem,
  LayoutType,
  AISuggestion,
} from '../types/studio';
import {
  createStickerLayer,
  createEffectLayer,
  generateId,
} from '../lib/composition';
import { STUDIO_WIDTH, STUDIO_HEIGHT } from '../types/studio';
import { suggestStickersForText } from '../lib/stickerLibrary';
import { suggestEffects } from '../lib/effectLibrary';

// --- Layout Selection Logic ---

function selectLayout(segment: SegmentComposition): LayoutType {
  const type = segment.segmentType;
  const hasCreatorVideo = segment.layers.some(
    l => l.type === 'video' && l.zIndex <= 2
  );

  // CTA and LOOP_END are usually creator-focused
  if (type === 'CTA' || type === 'LOOP_END') {
    return hasCreatorVideo ? 'creator-center' : 'full';
  }

  // HOOK is usually full-screen impact
  if (type === 'HOOK') return 'full';

  // FORE (foreground/intro) — split screen if creator present
  if (type === 'FORE') {
    return hasCreatorVideo ? 'split-60-40' : 'full';
  }

  // PEAK — dramatic, full screen or PiP
  if (type === 'PEAK') {
    return hasCreatorVideo ? 'pip' : 'full';
  }

  // BODY segments — split layout if talking about a topic
  if (type === 'BODY') {
    return hasCreatorVideo ? 'split-60-40' : 'full';
  }

  return 'full';
}

// --- Generate Suggestions ---

function generateSuggestions(segment: SegmentComposition): AISuggestion[] {
  const suggestions: AISuggestion[] = [];
  const text = segment.script || '';
  const emotion = segment.emotion || 'neutral';

  // Layout suggestion
  const suggestedLayout = selectLayout(segment);
  if (suggestedLayout !== segment.layout) {
    suggestions.push({
      id: generateId('sug'),
      type: 'layout',
      label: `Use ${suggestedLayout} layout`,
      description: `Recommended layout for ${segment.segmentType} segment`,
      segmentId: segment.id,
      applied: false,
      data: { layout: suggestedLayout },
    });
  }

  // Sticker suggestions
  const stickers = suggestStickersForText(text);
  for (const sticker of stickers.slice(0, 3)) { // max 3 sticker suggestions
    suggestions.push({
      id: generateId('sug'),
      type: 'sticker',
      label: `Add ${sticker.name}`,
      description: `Matches keywords in script`,
      segmentId: segment.id,
      applied: false,
      data: {
        stickerId: sticker.id,
        position: { x: STUDIO_WIDTH * 0.7, y: STUDIO_HEIGHT * 0.05 },
        timing: {
          inFrame: Math.round(segment.durationInFrames * 0.15),
          outFrame: segment.durationInFrames,
        },
      },
    });
  }

  // Effect suggestions
  const effects = suggestEffects(emotion, text);
  for (const effect of effects.slice(0, 2)) { // max 2 effect suggestions
    suggestions.push({
      id: generateId('sug'),
      type: 'effect',
      label: `Add ${effect.label}`,
      description: effect.description,
      segmentId: segment.id,
      applied: false,
      data: {
        effectPreset: effect.id,
        timing: { inFrame: 0, outFrame: effect.defaultDurationFrames },
      },
    });
  }

  // Transition suggestion between segments (auto-added, no suggestion needed here)

  return suggestions;
}

// --- Hook ---

export function useAutoCompose() {
  const { state, dispatch, pushHistory } = useStudio();

  /**
   * Generate AI suggestions for all segments without applying them.
   */
  const generateAllSuggestions = useCallback((): AISuggestion[] => {
    return state.project.segments.flatMap(seg => generateSuggestions(seg));
  }, [state.project.segments]);

  /**
   * Generate suggestions for a single segment.
   */
  const generateSegmentSuggestions = useCallback((segmentId: string): AISuggestion[] => {
    const seg = state.project.segments.find(s => s.id === segmentId);
    if (!seg) return [];
    return generateSuggestions(seg);
  }, [state.project.segments]);

  /**
   * Apply a suggestion: adds the sticker/effect/layout to the composition.
   */
  const applySuggestion = useCallback((suggestion: AISuggestion) => {
    pushHistory(`Apply suggestion: ${suggestion.label}`);

    switch (suggestion.type) {
      case 'layout':
        if (suggestion.data.layout) {
          dispatch({
            type: 'SET_SEGMENT_LAYOUT',
            segmentId: suggestion.segmentId,
            layout: suggestion.data.layout,
          });
        }
        break;

      case 'sticker':
        if (suggestion.data.stickerId) {
          const seg = state.project.segments.find(s => s.id === suggestion.segmentId);
          if (!seg) break;
          const layer = createStickerLayer(
            `/assets/stickers/${suggestion.data.stickerId}.png`,
            seg.durationInFrames,
            suggestion.data.position,
          );
          if (suggestion.data.timing) {
            layer.inFrame = suggestion.data.timing.inFrame;
            layer.outFrame = suggestion.data.timing.outFrame;
          }
          dispatch({
            type: 'ADD_LAYER',
            segmentId: suggestion.segmentId,
            layer,
          });
        }
        break;

      case 'effect':
        if (suggestion.data.effectPreset) {
          const seg = state.project.segments.find(s => s.id === suggestion.segmentId);
          if (!seg) break;
          const layer = createEffectLayer(
            { preset: suggestion.data.effectPreset },
            seg.durationInFrames,
          );
          if (suggestion.data.timing) {
            layer.inFrame = suggestion.data.timing.inFrame;
            layer.outFrame = suggestion.data.timing.outFrame;
          }
          dispatch({
            type: 'ADD_LAYER',
            segmentId: suggestion.segmentId,
            layer,
          });
        }
        break;
    }
  }, [state.project.segments, dispatch, pushHistory]);

  /**
   * Auto-compose all segments at once:
   * - Set layouts
   * - Add suggested stickers (first match only per segment)
   * - Add suggested effects (first match only per segment)
   */
  const autoComposeAll = useCallback(() => {
    pushHistory('AI Auto-Compose');

    for (const seg of state.project.segments) {
      // Auto layout
      const layout = selectLayout(seg);
      if (layout !== seg.layout) {
        dispatch({ type: 'SET_SEGMENT_LAYOUT', segmentId: seg.id, layout });
      }

      // Auto sticker (top match)
      const stickers = suggestStickersForText(seg.script);
      if (stickers.length > 0) {
        const layer = createStickerLayer(
          stickers[0].src,
          seg.durationInFrames,
        );
        dispatch({ type: 'ADD_LAYER', segmentId: seg.id, layer });
      }

      // Auto effect (top match)
      const effects = suggestEffects(seg.emotion, seg.script);
      if (effects.length > 0) {
        const layer = createEffectLayer(
          { preset: effects[0].id },
          seg.durationInFrames,
        );
        dispatch({ type: 'ADD_LAYER', segmentId: seg.id, layer });
      }
    }
  }, [state.project.segments, dispatch, pushHistory]);

  return {
    generateAllSuggestions,
    generateSegmentSuggestions,
    applySuggestion,
    autoComposeAll,
  };
}
