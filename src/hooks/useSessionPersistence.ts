import { useState, useEffect, useRef, useCallback } from 'react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useChatSessions, ChatSessionRow } from './useChatSessions';
import type { WorkspaceState, WorkspaceSegment } from '../contexts/WorkspaceContext';

// ============================================================================
// TYPES
// ============================================================================

export interface UseSessionPersistenceOptions {
  orderId: string | undefined;  // From URL params
  autoSaveInterval?: number;    // Default: 5000ms (5 seconds)
  enabled?: boolean;            // Default: true
}

export interface UseSessionPersistenceReturn {
  isRestoring: boolean;         // True while loading session from DB
  isSaving: boolean;            // True during save operation
  lastSavedAt: Date | null;     // Last successful save timestamp
  saveNow: () => Promise<void>; // Manual save trigger
  error: string | null;
}

// ============================================================================
// HELPER: Convert workspace state to DB payload
// ============================================================================

function workspaceToDbPayload(state: WorkspaceState) {
  return {
    title: state.title,
    status: state.status,
    topic: state.topic || null,
    settings: state.settings,
    selected_hook: state.selectedHook,
    script_versions: state.scriptVersions,
    selected_version: state.selectedVersion,
    script_confirmed: state.scriptConfirmed,
    additional_notes: state.additionalNotes || null,
    scriptData: state.segments.length > 0 ? {
      segments: state.segments.map(s => ({
        id: s.id,
        segmentId: s.segmentId,
        segmentNumber: s.segmentNumber,
        segmentType: s.segmentType,
        shotType: s.shotType,
        timing: s.timing,
        durationSeconds: s.durationSeconds,
        script: s.script,
        visualDirection: s.visualDirection,
        emotion: s.emotion,
        transition: s.transition,
        maxWords: s.maxWords,
        layout: s.layout,
        loopEndEnabled: s.loopEndEnabled,
        isEnabled: s.isEnabled,
        includeCreatorFace: s.includeCreatorFace,
        referenceImageUrl: s.referenceImageUrl,
      })),
      hookOptions: state.hookOptions,
      qualityReport: state.qualityReport,
    } : null,
    imageData: state.segments.some(s => s.imageUrl || s.images.length > 0) ? {
      segments: state.segments
        .filter(s => s.imageUrl || s.images.length > 0)
        .map(s => ({
          id: s.id,
          imageUrl: s.imageUrl,
          images: s.images,
        })),
    } : null,
    videoData: state.segments.some(s => s.videoUrl) ? {
      segments: state.segments
        .filter(s => s.videoUrl)
        .map(s => ({
          id: s.id,
          videoUrl: s.videoUrl,
        })),
    } : null,
  };
}

// ============================================================================
// HELPER: Convert DB row to workspace state
// ============================================================================

function dbRowToWorkspaceState(row: ChatSessionRow): Partial<WorkspaceState> {
  const scriptData = row.script_data || {};
  const imageData = row.image_data || {};
  const videoData = row.video_data || {};

  // Parse segments from script_data
  let segments: WorkspaceSegment[] = [];
  if (scriptData.segments && Array.isArray(scriptData.segments)) {
    segments = scriptData.segments.map((s: any) => {
      // Find corresponding image data
      const imageInfo = imageData.segments?.find((img: any) => img.id === s.id);
      // Find corresponding video data
      const videoInfo = videoData.segments?.find((vid: any) => vid.id === s.id);

      return {
        id: s.id || s.segmentId,
        segmentId: s.segmentId,
        segmentNumber: s.segmentNumber,
        segmentType: s.segmentType,
        shotType: s.shotType,
        timing: s.timing,
        durationSeconds: s.durationSeconds,
        script: s.script,
        visualDirection: s.visualDirection,
        emotion: s.emotion,
        transition: s.transition,
        maxWords: s.maxWords,
        layout: s.layout || 'full',
        loopEndEnabled: s.loopEndEnabled ?? true,
        isEnabled: s.isEnabled ?? true,
        includeCreatorFace: s.includeCreatorFace,
        referenceImageUrl: s.referenceImageUrl,
        // Image fields
        imageUrl: imageInfo?.imageUrl || null,
        images: imageInfo?.images || [],
        isGeneratingImage: false,
        imageError: null,
        // Video fields
        videoUrl: videoInfo?.videoUrl || null,
        isGeneratingVideo: false,
        videoError: null,
      };
    });
  }

  return {
    sessionId: row.id,
    orderId: row.order_id,
    sessionType: row.session_type,
    title: row.title,
    status: row.status,
    topic: row.topic || '',
    inputType: (row.input_type as WorkspaceState['inputType']) || 'topic',
    settings: row.settings,
    segments,
    hookOptions: scriptData.hookOptions || null,
    selectedHook: (row.selected_hook as WorkspaceState['selectedHook']) || 'option_a_safe',
    scriptVersions: row.script_versions || [],
    selectedVersion: row.selected_version || 1,
    scriptConfirmed: row.script_confirmed || false,
    additionalNotes: row.additional_notes || '',
    qualityReport: scriptData.qualityReport || null,
    isGeneratingScript: false,
    isRegeneratingScript: false,
    isDirty: false,
  };
}

// ============================================================================
// HOOK
// ============================================================================

export function useSessionPersistence(options: UseSessionPersistenceOptions): UseSessionPersistenceReturn {
  const {
    orderId,
    autoSaveInterval = 5000,
    enabled = true,
  } = options;

  const { state, dispatch } = useWorkspace();
  const { fetchSession, saveWorkspaceState } = useChatSessions();

  const [isRestoring, setIsRestoring] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs to avoid stale closures
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastStateRef = useRef<WorkspaceState | null>(null);

  // ── Restore session from DB on mount ──
  useEffect(() => {
    if (!enabled || !orderId) return;

    const restoreSession = async () => {
      setIsRestoring(true);
      setError(null);

      try {
        const row = await fetchSession(orderId);
        if (row) {
          const restoredState = dbRowToWorkspaceState(row);
          dispatch({ type: 'RESTORE_SESSION', state: restoredState });
          setLastSavedAt(new Date(row.updated_at));
        }
      } catch (err: any) {
        console.error('[useSessionPersistence] Restore error:', err);
        setError(err.message || 'Failed to restore session');
      } finally {
        setIsRestoring(false);
      }
    };

    restoreSession();
  }, [orderId, enabled, fetchSession, dispatch]);

  // ── Save function ──
  const performSave = useCallback(async () => {
    if (!enabled || !orderId) return;

    // Don't save during script generation (transient state)
    if (state.isGeneratingScript || state.isRegeneratingScript) {
      return;
    }

    // Don't save if state hasn't changed
    if (lastStateRef.current && JSON.stringify(lastStateRef.current) === JSON.stringify(state)) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload = workspaceToDbPayload(state);
      const success = await saveWorkspaceState(orderId, payload);

      if (success) {
        setLastSavedAt(new Date());
        lastStateRef.current = state;
      } else {
        throw new Error('Save failed');
      }
    } catch (err: any) {
      console.error('[useSessionPersistence] Save error:', err);
      setError(err.message || 'Failed to save session');
    } finally {
      setIsSaving(false);
    }
  }, [enabled, orderId, state, saveWorkspaceState]);

  // ── Auto-save with debounce ──
  useEffect(() => {
    if (!enabled || !orderId || !state.isDirty) return;

    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Set new timer
    saveTimerRef.current = setTimeout(() => {
      performSave();
    }, autoSaveInterval);

    // Cleanup on unmount or deps change
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [enabled, orderId, state.isDirty, state, autoSaveInterval, performSave]);

  // ── Flush pending save on unmount ──
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        // Perform immediate save if dirty
        if (state.isDirty && orderId) {
          performSave();
        }
      }
    };
  }, [state.isDirty, orderId, performSave]);

  // ── Save on page unload (prevents data loss on refresh/close) ──
  useEffect(() => {
    if (!enabled || !orderId) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.isDirty) {
        // Flush pending debounce timer
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }
        // Trigger save — performSave is async but we try our best
        performSave();
        // Show browser "unsaved changes" warning so user can cancel if needed
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled, orderId, state.isDirty, performSave]);

  // ── Save on tab visibility change (more reliable than beforeunload for async) ──
  useEffect(() => {
    if (!enabled || !orderId) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' && state.isDirty) {
        // Tab is being hidden (switched away, minimized, or closing)
        // This fires reliably even when beforeunload doesn't complete async saves
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }
        performSave();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [enabled, orderId, state.isDirty, performSave]);

  // ── Manual save trigger ──
  const saveNow = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    await performSave();
  }, [performSave]);

  return {
    isRestoring,
    isSaving,
    lastSavedAt,
    saveNow,
    error,
  };
}
