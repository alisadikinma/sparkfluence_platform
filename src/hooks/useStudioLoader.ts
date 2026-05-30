// ============================================================================
// useStudioLoader — Loads or builds a SparkfluenceProject from chat_sessions
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { buildProjectFromSession, normalizeSegmentType, secondsToFrames } from '../lib/composition';
import type { SparkfluenceProject } from '../types/studio';
import type { PipelineMediaItem } from '../contexts/StudioContext';

interface UseStudioLoaderResult {
  project: SparkfluenceProject | null;
  pipelineMedia: PipelineMediaItem[];
  isLoading: boolean;
  error: string | null;
}

/** Build pipeline media from raw session data (script + image + video) */
function buildPipelineMedia(session: Record<string, unknown>): PipelineMediaItem[] {
  const scriptSegments: Array<Record<string, unknown>> =
    (session.script_data as Record<string, unknown>)?.segments as Array<Record<string, unknown>> || [];
  const imageSegments: Array<Record<string, unknown>> =
    (session.image_data as Record<string, unknown>)?.segments as Array<Record<string, unknown>> || [];
  const videoSegments: Array<Record<string, unknown>> =
    (session.video_data as Record<string, unknown>)?.segments as Array<Record<string, unknown>> || [];

  const imageMap = new Map<string, string>();
  for (const img of imageSegments) {
    const url = (img.imageUrl || img.image_url) as string;
    if (url) imageMap.set(img.id as string, url);
  }

  const videoMap = new Map<string, string>();
  for (const vid of videoSegments) {
    const url = (vid.videoUrl || vid.video_url) as string;
    if (url) videoMap.set(vid.id as string, url);
  }

  const media: PipelineMediaItem[] = [];
  for (const seg of scriptSegments) {
    const id = seg.id as string;
    const videoUrl = videoMap.get(id);
    const imageUrl = imageMap.get(id);
    const src = videoUrl || imageUrl;
    if (!src) continue;

    const segType = (seg.segmentType || seg.segment_type || seg.type || 'BODY') as string;
    const durationSec = (seg.durationSeconds || seg.duration_seconds || 5) as number;

    media.push({
      segId: id,
      segmentType: normalizeSegmentType(segType),
      src,
      isVideo: !!videoUrl,
      durationSec,
      script: (seg.script || '') as string,
      emotion: (seg.emotion || 'neutral') as string,
      visualDirection: (seg.visualDirection || seg.visual_direction || '') as string,
      layout: (seg.layout || 'full') as string,
    });
  }

  return media;
}

export function useStudioLoader(orderId: string | undefined): UseStudioLoaderResult {
  const { user } = useAuth();
  const [project, setProject] = useState<SparkfluenceProject | null>(null);
  const [pipelineMedia, setPipelineMedia] = useState<PipelineMediaItem[]>([]);
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

        // Always build pipeline media from raw session data (immutable source)
        const media = buildPipelineMedia(session as Record<string, unknown>);
        setPipelineMedia(media);

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

  return { project, pipelineMedia, isLoading, error };
}
