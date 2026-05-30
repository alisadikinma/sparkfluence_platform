import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ============================================================================
// TYPES
// ============================================================================

export interface ChatSessionRow {
  id: string;
  user_id: string;
  order_id: string;
  session_type: 'script_gen' | 'creator_lab' | 'ad_studio';
  title: string;
  status: 'draft' | 'script_ready' | 'images_ready' | 'video_ready' | 'complete';
  topic: string | null;
  input_type: string;
  settings: Record<string, any>;
  script_data: Record<string, any> | null;
  selected_hook: string | null;
  script_versions: any[];
  selected_version: number;
  script_confirmed: boolean;
  additional_notes: string | null;
  image_data: Record<string, any> | null;
  video_data: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

// Sidebar-friendly session (lightweight, for listing)
export interface ChatSessionSummary {
  orderId: string;
  title: string;
  sessionType: 'script_gen' | 'creator_lab' | 'ad_studio' | 'carousel';
  status: ChatSessionRow['status'] | string;
  updatedAt: string;
  progress?: {
    totalSegments: number;
    imagesCompleted: number;
    videosCompleted: number;
    currentStep: 'script' | 'images' | 'video' | 'studio';
  };
}

// ============================================================================
// HELPER: Convert DB row to sidebar summary
// ============================================================================

function rowToSummary(row: ChatSessionRow): ChatSessionSummary {
  const segments = row.script_data?.segments || [];
  const totalSegments = segments.length;
  const imagesCompleted = segments.filter((s: any) => s.imageUrl || s.image_url).length;
  const videosCompleted = segments.filter((s: any) => s.videoUrl || s.video_url).length;

  // Also check image_data and video_data columns for progress
  const hasImageData = row.image_data && Object.keys(row.image_data).length > 0;
  const hasVideoData = row.video_data && Object.keys(row.video_data).length > 0;

  let currentStep: 'script' | 'images' | 'video' | 'studio' = 'script';
  if (row.status === 'complete') currentStep = 'studio';
  else if (row.status === 'video_ready' || videosCompleted > 0 || hasVideoData) currentStep = 'video';
  else if (row.status === 'images_ready' || imagesCompleted > 0 || hasImageData) currentStep = 'images';
  else if (row.status === 'script_ready' || totalSegments > 0) currentStep = 'images';

  return {
    orderId: row.order_id,
    title: row.title,
    sessionType: row.session_type as ChatSessionSummary['sessionType'],
    status: row.status as ChatSessionSummary['status'],
    updatedAt: row.updated_at,
    progress: totalSegments > 0 ? {
      totalSegments,
      imagesCompleted,
      videosCompleted,
      currentStep,
    } : undefined,
  };
}

// ============================================================================
// HOOK
// ============================================================================

export function useChatSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch all sessions (for sidebar) ──
  const fetchSessions = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      // Fetch chat sessions
      const { data, error: fetchError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;
      const chatSessions = (data || []).map(rowToSummary);

      // Also fetch carousel projects for sidebar history
      const { data: carouselData, error: carouselError } = await supabase
        .from('carousel_projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (carouselError) {
        console.error('[useChatSessions] carousel fetch error:', carouselError);
      }

      const carouselSessions: ChatSessionSummary[] = (carouselData || []).map((row: any) => ({
        orderId: row.project_id,
        title: row.title || 'Untitled Carousel',
        sessionType: 'carousel' as const,
        status: row.status || 'draft',
        updatedAt: row.updated_at,
        progress: (row.slide_count ?? 0) > 0 ? {
          totalSegments: row.slide_count,
          imagesCompleted: 0,
          videosCompleted: 0,
          currentStep: 'images' as const,
        } : undefined,
      }));

      // Merge and sort by updatedAt
      const allSessions = [...chatSessions, ...carouselSessions]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      setSessions(allSessions);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sessions');
      console.error('[useChatSessions] fetchSessions error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // ── Fetch single session by orderId (for workspace restore) ──
  const fetchSession = useCallback(async (orderId: string): Promise<ChatSessionRow | null> => {
    if (!user) return null;

    try {
      const { data, error: fetchError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('order_id', orderId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') return null; // Not found
        throw fetchError;
      }
      return data as ChatSessionRow;
    } catch (err: any) {
      console.error('[useChatSessions] fetchSession error:', err);
      return null;
    }
  }, [user]);

  // ── Create new session ──
  const createSession = useCallback(async (params: {
    orderId: string;
    sessionType: 'script_gen' | 'creator_lab' | 'ad_studio';
    title?: string;
    topic?: string;
    inputType?: string;
    settings?: Record<string, any>;
  }): Promise<ChatSessionRow | null> => {
    if (!user) return null;

    try {
      const { data, error: insertError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          order_id: params.orderId,
          session_type: params.sessionType,
          title: params.title || 'Untitled',
          topic: params.topic || null,
          input_type: params.inputType || 'topic',
          settings: params.settings || {},
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Refresh sidebar list
      await fetchSessions();
      return data as ChatSessionRow;
    } catch (err: any) {
      console.error('[useChatSessions] createSession error:', err);
      setError(err.message || 'Failed to create session');
      return null;
    }
  }, [user, fetchSessions]);

  // ── Update session (partial update) ──
  const updateSession = useCallback(async (
    orderId: string,
    updates: Partial<Omit<ChatSessionRow, 'id' | 'user_id' | 'order_id' | 'created_at' | 'updated_at'>>
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: updateError } = await supabase
        .from('chat_sessions')
        .update(updates)
        .eq('order_id', orderId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;
      return true;
    } catch (err: any) {
      console.error('[useChatSessions] updateSession error:', err);
      return false;
    }
  }, [user]);

  // ── Delete session ──
  const deleteSession = useCallback(async (orderId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: deleteError } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('order_id', orderId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Remove from local state
      setSessions(prev => prev.filter(s => s.orderId !== orderId));
      return true;
    } catch (err: any) {
      console.error('[useChatSessions] deleteSession error:', err);
      return false;
    }
  }, [user]);

  // ── Rename session ──
  const renameSession = useCallback(async (orderId: string, newTitle: string): Promise<boolean> => {
    const success = await updateSession(orderId, { title: newTitle });
    if (success) {
      setSessions(prev => prev.map(s =>
        s.orderId === orderId ? { ...s, title: newTitle } : s
      ));
    }
    return success;
  }, [updateSession]);

  // ── Save workspace state to DB ──
  const saveWorkspaceState = useCallback(async (orderId: string, workspaceState: {
    title?: string;
    status?: string;
    topic?: string;
    settings?: Record<string, any>;
    scriptData?: Record<string, any>;
    selectedHook?: string;
    scriptVersions?: any[];
    selectedVersion?: number;
    scriptConfirmed?: boolean;
    additionalNotes?: string;
    imageData?: Record<string, any>;
    videoData?: Record<string, any>;
  }): Promise<boolean> => {
    const updates: Record<string, any> = {};

    if (workspaceState.title !== undefined) updates.title = workspaceState.title;
    if (workspaceState.status !== undefined) updates.status = workspaceState.status;
    if (workspaceState.topic !== undefined) updates.topic = workspaceState.topic;
    if (workspaceState.settings !== undefined) updates.settings = workspaceState.settings;
    if (workspaceState.scriptData !== undefined) updates.script_data = workspaceState.scriptData;
    if (workspaceState.selectedHook !== undefined) updates.selected_hook = workspaceState.selectedHook;
    if (workspaceState.scriptVersions !== undefined) updates.script_versions = workspaceState.scriptVersions;
    if (workspaceState.selectedVersion !== undefined) updates.selected_version = workspaceState.selectedVersion;
    if (workspaceState.scriptConfirmed !== undefined) updates.script_confirmed = workspaceState.scriptConfirmed;
    if (workspaceState.additionalNotes !== undefined) updates.additional_notes = workspaceState.additionalNotes;
    if (workspaceState.imageData !== undefined) updates.image_data = workspaceState.imageData;
    if (workspaceState.videoData !== undefined) updates.video_data = workspaceState.videoData;

    if (Object.keys(updates).length === 0) return true;

    return updateSession(orderId, updates);
  }, [updateSession]);

  // ── Auto-fetch on mount ──
  useEffect(() => {
    if (user) {
      fetchSessions();
    } else {
      setSessions([]);
    }
  }, [user, fetchSessions]);

  return {
    sessions,
    isLoading,
    error,
    fetchSessions,
    fetchSession,
    createSession,
    updateSession,
    deleteSession,
    renameSession,
    saveWorkspaceState,
  };
}
