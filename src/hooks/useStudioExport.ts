// ============================================================================
// Sparkfluence Studio — Export Hook
// Sends composition.json to the existing VPS backend for FFmpeg rendering.
// The VPS endpoint receives the composition and returns a job ID for polling.
// ============================================================================

import { useState, useCallback, useRef } from 'react';
import { useStudio } from '../contexts/StudioContext';
import { useAuth } from '../contexts/AuthContext';
import { serializeForExport } from '../lib/composition';
import { API_URL, API_KEY } from '../lib/api';
import { supabase } from '../lib/supabase';
import type { ExportState } from '../types/studio';

const POLL_INTERVAL = 3000; // 3 seconds

export function useStudioExport() {
  const { state } = useStudio();
  const { user } = useAuth();
  const [exportState, setExportState] = useState<ExportState>({
    status: 'idle',
    progress: 0,
    outputUrl: null,
    error: null,
  });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  /**
   * Start export: send composition to VPS, then poll for completion.
   */
  const startExport = useCallback(async () => {
    if (!user) return;

    setExportState({ status: 'preparing', progress: 0, outputUrl: null, error: null });

    try {
      // Get auth token for backend
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const compositionJson = serializeForExport(state.project);

      setExportState(prev => ({ ...prev, status: 'rendering', progress: 10 }));

      // Send composition to VPS
      const response = await fetch(`${API_URL}/api/render-composition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-API-Key': API_KEY || '',
        },
        body: compositionJson,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      const jobId = result.job_id;

      if (!jobId) {
        throw new Error('No job ID returned from server');
      }

      // Poll for job completion
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`${API_URL}/api/job-status/${jobId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-API-Key': API_KEY || '',
            },
          });

          if (!statusRes.ok) return;

          const statusData = await statusRes.json();
          const jobStatus = statusData.status;
          const progress = statusData.progress || 0;

          setExportState(prev => ({
            ...prev,
            progress: Math.max(prev.progress, 10 + progress * 0.8), // 10-90%
          }));

          // Completed
          if (jobStatus === 2 || jobStatus === 'completed') {
            stopPolling();
            const outputUrl = statusData.output_url || statusData.video_url;

            setExportState({
              status: 'done',
              progress: 100,
              outputUrl,
              error: null,
            });
          }

          // Failed
          if (jobStatus === 3 || jobStatus === 'failed') {
            stopPolling();
            setExportState({
              status: 'error',
              progress: 0,
              outputUrl: null,
              error: statusData.error || 'Rendering failed',
            });
          }
        } catch {
          // Polling error — don't stop, just retry
        }
      }, POLL_INTERVAL);
    } catch (err) {
      stopPolling();
      setExportState({
        status: 'error',
        progress: 0,
        outputUrl: null,
        error: err instanceof Error ? err.message : 'Export failed',
      });
    }
  }, [state.project, user, stopPolling]);

  /**
   * Cancel an in-progress export.
   */
  const cancelExport = useCallback(() => {
    stopPolling();
    setExportState({ status: 'idle', progress: 0, outputUrl: null, error: null });
  }, [stopPolling]);

  /**
   * Reset export state.
   */
  const resetExport = useCallback(() => {
    stopPolling();
    setExportState({ status: 'idle', progress: 0, outputUrl: null, error: null });
  }, [stopPolling]);

  /**
   * Save composition to Supabase (without rendering).
   */
  const saveComposition = useCallback(async () => {
    if (!user) return null;

    const compositionData = {
      user_id: user.id,
      script_id: state.project.scriptId,
      title: state.project.title,
      composition_json: state.project,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('compositions')
      .upsert(compositionData, { onConflict: 'id' })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to save composition:', error);
      return null;
    }

    return data?.id;
  }, [state.project, user]);

  return {
    exportState,
    startExport,
    cancelExport,
    resetExport,
    saveComposition,
  };
}
