import { useState, useEffect, useRef, useCallback } from 'react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';
import { useChatSessions, ChatSessionRow } from './useChatSessions';
import type { WorkspaceState, WorkspaceSegment } from '../contexts/WorkspaceContext';

// ============================================================================
// TYPES
// ============================================================================

export interface UseSessionPersistenceOptions {
  orderId: string | undefined;  // From URL params
  sessionType?: 'script_gen' | 'creator_lab' | 'ad_studio';  // For new session creation
  autoSaveInterval?: number;    // Default: 5000ms (5 seconds)
  enabled?: boolean;            // Default: true
}

export interface UseSessionPersistenceReturn {
  isRestoring: boolean;         // True while loading session from DB
  isSaving: boolean;            // True during save operation
  sessionFound: boolean;        // True if DB had an existing session (even if empty)
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
      // Ensure HOOK/CTA/LOOP-END are always CREATOR (fix legacy data saved as B-ROLL)
      const segType = (s.segmentType || '').toUpperCase();

      return {
        id: s.id || s.segmentId,
        segmentId: s.segmentId,
        segmentNumber: s.segmentNumber,
        segmentType: s.segmentType,
        shotType: ['HOOK', 'CTA', 'LOOP-END'].includes(segType) ? 'CREATOR' : (s.shotType || 'B-ROLL'),
        timing: s.timing,
        durationSeconds: s.durationSeconds,
        script: s.script,
        visualDirection: s.visualDirection,
        emotion: s.emotion,
        transition: s.transition,
        maxWords: s.maxWords,
        layout: s.layout || 'full',
        loopEndEnabled: s.loopEndEnabled ?? ((s.segmentType || '').toUpperCase() !== 'LOOP-END'),
        isEnabled: s.isEnabled ?? ((s.segmentType || '').toUpperCase() !== 'LOOP-END'),
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
    sessionType = 'script_gen',
    autoSaveInterval = 5000,
    enabled = true,
  } = options;

  const { state, dispatch } = useWorkspace();
  const { user, loading: authLoading } = useAuth();
  const { fetchSession, saveWorkspaceState, createSession } = useChatSessions();

  // Start as true when orderId is present — blocks Workspace init effect until DB query completes
  // Also keep restoring while auth is still loading (user not yet available)
  const [isRestoring, setIsRestoring] = useState(!!orderId && enabled);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionFound, setSessionFound] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs to avoid stale closures
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastStateRef = useRef<WorkspaceState | null>(null);
  const needsImmediateSave = useRef(false);
  const hasRestoredRef = useRef(false);

  // ── Restore session from DB on mount ──
  // IMPORTANT: Wait for auth to load (user !== null) before attempting DB fetch.
  // Without this, fetchSession returns null (no user), hasRestoredRef gets set to true,
  // and the restore never retries after auth loads — causing mock data to appear on refresh.
  useEffect(() => {
    if (hasRestoredRef.current || !enabled || !orderId) return;
    // Wait for auth to finish loading before attempting restore
    if (authLoading || !user) return;
    hasRestoredRef.current = true;

    const restoreSession = async () => {
      setIsRestoring(true);
      setError(null);

      try {
        const row = await fetchSession(orderId);
        if (row) {
          const restoredState = dbRowToWorkspaceState(row);
          dispatch({ type: 'RESTORE_SESSION', state: restoredState });
          setSessionFound(true);
          setLastSavedAt(new Date(row.updated_at));
        } else {
          // New session — create DB row so future updateSession calls work
          await createSession({
            orderId,
            sessionType,
            title: 'Untitled',
          });
        }
      } catch (err: any) {
        console.error('[useSessionPersistence] Restore error:', err);
        setError(err.message || 'Failed to restore session');
      } finally {
        setIsRestoring(false);
      }
    };

    restoreSession();
  }, [orderId, enabled, authLoading, user, fetchSession, createSession, sessionType, dispatch]);

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

  // ── Immediate save after state update (for saveNow calls) ──
  // When saveNow() is called right after dispatch, the state may not have updated
  // yet (React batching). This effect runs AFTER the re-render with updated state.
  useEffect(() => {
    if (needsImmediateSave.current && state.isDirty) {
      needsImmediateSave.current = false;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      performSave();
    }
  }, [state, performSave]);

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
    // Set flag so the useEffect above catches the save after state updates
    needsImmediateSave.current = true;
    // Also try saving now in case state already includes the change
    await performSave();
  }, [performSave]);

  return {
    isRestoring,
    isSaving,
    sessionFound,
    lastSavedAt,
    saveNow,
    error,
  };
}
