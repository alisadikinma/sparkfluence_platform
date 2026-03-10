// ============================================================================
// useStudioLoader — Loads or builds a SparkfluenceProject from chat_sessions
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { buildProjectFromSession } from '../lib/composition';
import type { SparkfluenceProject } from '../types/studio';

interface UseStudioLoaderResult {
  project: SparkfluenceProject | null;
  isLoading: boolean;
  error: string | null;
}

export function useStudioLoader(orderId: string | undefined): UseStudioLoaderResult {
  const { user } = useAuth();
  const [project, setProject] = useState<SparkfluenceProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!orderId || !user?.id) {
      setIsLoading(false);
      setError(!orderId ? 'No order ID provided' : 'Not authenticated');
      return;
    }

    // Prevent double-fetch in StrictMode
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    let cancelled = false;

    async function loadProject() {
      try {
        setIsLoading(true);
        setError(null);

        const { data: session, error: fetchError } = await supabase
          .from('chat_sessions')
          .select('order_id, title, settings, script_data, image_data, video_data, studio_data')
          .eq('order_id', orderId)
          .single();

        if (cancelled) return;

        if (fetchError) {
          // PGRST116 = no rows found
          if (fetchError.code === 'PGRST116') {
            setError('Session not found');
          } else {
            setError(`Failed to load session: ${fetchError.message}`);
          }
          setIsLoading(false);
          return;
        }

        if (!session) {
          setError('Session not found');
          setIsLoading(false);
          return;
        }

        // If studio_data already exists, use it (returning user)
        if (session.studio_data && typeof session.studio_data === 'object') {
          const existingProject = session.studio_data as SparkfluenceProject;
          // Validate it has the expected shape
          if (existingProject.segments && Array.isArray(existingProject.segments)) {
            setProject(existingProject);
            setIsLoading(false);
            return;
          }
        }

        // Build fresh project from session data
        const built = buildProjectFromSession(session, user!.id);
        setProject(built);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Unknown error loading studio project';
        setError(message);
        setIsLoading(false);
      }
    }

    loadProject();

    return () => {
      cancelled = true;
      // Reset ref so re-mount (StrictMode) can fetch again
      fetchedRef.current = false;
    };
  }, [orderId, user?.id]);

  return { project, isLoading, error };
}
