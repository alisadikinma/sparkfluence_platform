// ============================================================================
// Sparkfluence Studio — Playback Controls
// Play/pause, seek, and keyboard shortcuts.
// ============================================================================

import React, { useEffect, useCallback } from 'react';
import { useStudio } from '../../contexts/StudioContext';
import { STUDIO_FPS } from '../../types/studio';

/**
 * Keyboard shortcut handler. Mount this once in the Studio screen.
 */
export const PlaybackShortcuts: React.FC = () => {
  const { state, dispatch, undo, redo, canUndo, canRedo } = useStudio();
  const { playback, project } = state;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't capture when typing in inputs
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    switch (e.key) {
      case ' ': // Space = play/pause
        e.preventDefault();
        dispatch({ type: 'SET_PLAYING', isPlaying: !playback.isPlaying });
        break;

      case 'ArrowLeft': // Seek backward 1 frame (Shift = 1 second)
        e.preventDefault();
        dispatch({
          type: 'SET_CURRENT_FRAME',
          frame: Math.max(0, playback.currentFrame - (e.shiftKey ? STUDIO_FPS : 1)),
        });
        break;

      case 'ArrowRight': // Seek forward 1 frame (Shift = 1 second)
        e.preventDefault();
        dispatch({
          type: 'SET_CURRENT_FRAME',
          frame: Math.min(project.totalDurationInFrames, playback.currentFrame + (e.shiftKey ? STUDIO_FPS : 1)),
        });
        break;

      case 'Home': // Go to start
        e.preventDefault();
        dispatch({ type: 'SET_CURRENT_FRAME', frame: 0 });
        break;

      case 'End': // Go to end
        e.preventDefault();
        dispatch({ type: 'SET_CURRENT_FRAME', frame: project.totalDurationInFrames });
        break;

      case 'z': // Ctrl+Z = undo
        if (e.ctrlKey && !e.shiftKey && canUndo) {
          e.preventDefault();
          undo();
        }
        break;

      case 'Z': // Ctrl+Shift+Z = redo
      case 'y': // Ctrl+Y = redo
        if (e.ctrlKey && canRedo) {
          e.preventDefault();
          redo();
        }
        break;

      case 'Delete':
      case 'Backspace': {
        // Delete selected layer
        const { segmentId, layerId } = state.selection;
        if (segmentId && layerId) {
          e.preventDefault();
          dispatch({ type: 'REMOVE_LAYER', segmentId, layerId });
        }
        break;
      }
    }
  }, [state, playback, project, dispatch, undo, redo, canUndo, canRedo]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return null; // Invisible — just registers keyboard handler
};
