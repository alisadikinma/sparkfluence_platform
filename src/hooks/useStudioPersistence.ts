// ============================================================================
// useStudioPersistence — Auto-save StudioContext project to chat_sessions.studio_data
// Debounced 3s save on isDirty, flush on unmount, manual saveNow()
// ============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useStudio } from '../contexts/StudioContext';

interface UseStudioPersistenceResult {
  saveNow: () => Promise<void>;
  isSaving: boolean;
  lastSavedAt: Date | null;
}

export function useStudioPersistence(orderId: string | undefined): UseStudioPersistenceResult {
  const { state, dispatch } = useStudio();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Refs to access latest values in callbacks/cleanup without re-triggering effects
  const projectRef = useRef(state.project);
  const isDirtyRef = useRef(state.isDirty);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  // Keep refs in sync
  useEffect(() => {
    projectRef.current = state.project;
    isDirtyRef.current = state.isDirty;
  }, [state.project, state.isDirty]);

  // Core save function
  const doSave = useCallback(async () => {
    if (!orderId || isSavingRef.current) return;

    const projectSnapshot = JSON.parse(JSON.stringify(projectRef.current));

    isSavingRef.current = true;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({ studio_data: projectSnapshot })
        .eq('order_id', orderId);

      if (error) {
        console.error('[useStudioPersistence] Save failed:', error.message);
      } else {
        setLastSavedAt(new Date());
        dispatch({ type: 'MARK_CLEAN' });
      }
    } catch (err) {
      console.error('[useStudioPersistence] Save error:', err);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [orderId]);

  // Manual save
  const saveNow = useCallback(async () => {
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    await doSave();
  }, [doSave]);

  // Debounced auto-save when isDirty changes
  useEffect(() => {
    if (!state.isDirty || !orderId) return;

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      doSave();
    }, 3000);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [state.isDirty, state.project, orderId, doSave]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      // Best-effort flush if dirty
      if (isDirtyRef.current && orderId) {
        const projectSnapshot = JSON.parse(JSON.stringify(projectRef.current));
        supabase
          .from('chat_sessions')
          .update({ studio_data: projectSnapshot })
          .eq('order_id', orderId)
          .then(({ error }) => {
            if (error) console.error('[useStudioPersistence] Unmount flush failed:', error.message);
          });
      }
    };
  }, [orderId]);

  return { saveNow, isSaving, lastSavedAt };
}
