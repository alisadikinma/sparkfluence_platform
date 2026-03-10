import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Play, Loader2, Video, RefreshCw, AlertTriangle, AlertCircle,
  CheckCircle2, LayoutList, List, LayoutGrid, Columns2,
  Clapperboard, ChevronDown, Sparkles, Download, RotateCcw,
} from 'lucide-react';
import { useWorkspace, type WorkspaceSegment } from '../../../contexts/WorkspaceContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useParams } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const segmentTypeColor = (segmentType: string) => {
  if (segmentType === 'HOOK' || segmentType === 'PEAK')
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (segmentType === 'CTA')
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  if (segmentType === 'LOOP-END')
    return 'bg-neutral-700/50 text-neutral-400 border-neutral-700';
  return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
};

// ─── Shared: video/image thumbnail ───────────────────────────────────────────

const SegmentThumbnail: React.FC<{
  seg: WorkspaceSegment;
  className?: string;
  onPlay?: () => void;
}> = ({ seg, className = '', onPlay }) => {
  if (seg.imageUrl) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <img src={seg.imageUrl} alt="" className="w-full h-full object-cover" />
        {seg.isGeneratingVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
          </div>
        )}
        {seg.videoUrl && !seg.isGeneratingVideo && (
          <button
            onClick={onPlay}
            className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/55 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
              <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
            </div>
          </button>
        )}
      </div>
    );
  }
  if (seg.isGeneratingVideo) {
    return (
      <div className={`bg-gradient-to-br from-[#1E1E1E] via-emerald-500/5 to-[#0B0E14] flex items-center justify-center ${className}`}>
        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
      </div>
    );
  }
  return (
    <div className={`bg-gradient-to-br from-[#1E1E1E] to-[#0B0E14] flex items-center justify-center ${className}`}>
      <Video className="w-5 h-5 text-[#3D3D3D]" />
    </div>
  );
};

// ─── Video preview modal ──────────────────────────────────────────────────────
const VideoPreviewModal: React.FC<{
  videoUrl: string;
  onClose: () => void;
}> = ({ videoUrl, onClose }) => (
  <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
    <div className="relative max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
      <video
        src={videoUrl}
        controls
        autoPlay
        className="w-full rounded-xl shadow-2xl"
        style={{ maxHeight: '80vh' }}
      />
      <div className="flex gap-2 mt-3">
        <a
          href={videoUrl}
          download
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" /> Download
        </a>
        <button
          onClick={onClose}
          className="px-4 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
);

// ─── Full view card ───────────────────────────────────────────────────────────

const FullCard: React.FC<{
  seg: WorkspaceSegment;
  index: number;
  twoCol: boolean;
  onGenerate: (id: string) => void;
}> = ({ seg, index, twoCol, onGenerate }) => {
  const isDone = !!seg.videoUrl;
  const isGen = seg.isGeneratingVideo;
  const hasImage = !!seg.imageUrl;
  const hasFailed = !!seg.videoError && !isDone;

  return (
    <div className={`bg-[#161616] border rounded-xl overflow-hidden transition-colors ${
      hasFailed ? 'border-red-500/30' : isDone ? 'border-emerald-500/20' : isGen ? 'border-emerald-500/30' : 'border-[#262626]'
    }`}>
      <div className={`flex gap-4 p-4 ${twoCol ? 'flex-col' : 'flex-col sm:flex-row'}`}>
        {/* Thumbnail */}
        <SegmentThumbnail
          seg={seg}
          className={`rounded-lg flex-shrink-0 ${twoCol ? 'w-full aspect-video' : 'w-28 h-[198px]'}`}
        />

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[#A8A29E]">{index + 1}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${segmentTypeColor(seg.segmentType)}`}>
              {seg.segmentType}
            </span>
            <span className="text-xs text-[#57534E]">{seg.durationSeconds}s</span>
          </div>

          <p className="text-sm text-[#FAFAF9] line-clamp-3">{seg.script || '—'}</p>

          {/* Error message */}
          {hasFailed && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-400 line-clamp-2">{seg.videoError}</p>
              </div>
            </div>
          )}

          {/* Status row */}
          <div className="flex items-center gap-2 mt-auto pt-1 flex-wrap">
            {isDone && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Generated
              </span>
            )}
            {isGen && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...
              </span>
            )}
            {hasFailed && (
              <span className="flex items-center gap-1.5 text-xs text-red-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> Failed
              </span>
            )}
            {!hasImage && !isGen && !hasFailed && (
              <span className="text-xs text-[#57534E]">Generate gambar dulu di step Images</span>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              {(isDone || hasFailed) && (
                <button
                  onClick={() => onGenerate(seg.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    hasFailed
                      ? 'bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400'
                      : 'border border-[#262626] bg-[#1E1E1E] hover:bg-[#262626] text-neutral-400'
                  }`}
                >
                  <RotateCcw className="w-3 h-3" /> Retry
                </button>
              )}
              {!isDone && !isGen && !hasFailed && hasImage && (
                <button
                  onClick={() => onGenerate(seg.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-medium transition-colors"
                >
                  <Video className="w-3 h-3" /> Generate
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Compact view row ─────────────────────────────────────────────────────────

const CompactRow: React.FC<{
  seg: WorkspaceSegment;
  index: number;
  onGenerate: (id: string) => void;
}> = ({ seg, index, onGenerate }) => {
  const isDone = !!seg.videoUrl;
  const isGen = seg.isGeneratingVideo;
  const hasFailed = !!seg.videoError && !isDone;
  const [showPreview, setShowPreview] = useState(false);

  return (
    <>
      <div className={`bg-[#161616] border rounded-xl px-4 py-2.5 transition-colors ${
        hasFailed ? 'border-red-500/30' : isDone ? 'border-emerald-500/20' : isGen ? 'border-emerald-500/30' : 'border-[#262626] hover:border-neutral-600'
      }`}>
        <div className="flex items-center gap-3">
          <SegmentThumbnail seg={seg} className="w-9 h-[64px] rounded-lg flex-shrink-0" onPlay={() => setShowPreview(true)} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs text-[#A8A29E]">{index + 1}</span>
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium border ${segmentTypeColor(seg.segmentType)}`}>
                {seg.segmentType}
              </span>
              <span className="text-xs text-[#57534E]">{seg.durationSeconds}s</span>
            </div>
            <p className="text-sm text-[#FAFAF9] truncate">{seg.script || '—'}</p>
          </div>

          <div className="flex-shrink-0 flex items-center gap-2">
            {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {isGen && <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />}
            {hasFailed && <AlertCircle className="w-4 h-4 text-red-400" />}
            {isDone && seg.videoUrl && (
              <a href={seg.videoUrl} download className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors" title="Download">
                <Download className="w-3.5 h-3.5" />
              </a>
            )}
            {isDone && (
              <button onClick={() => onGenerate(seg.id)} className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors" title="Regenerate">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
            {hasFailed && (
              <button
                onClick={() => onGenerate(seg.id)}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors flex items-center gap-1.5"
                title="Retry"
              >
                <RotateCcw className="w-3 h-3" /> Retry
              </button>
            )}
            {!isDone && !isGen && !hasFailed && seg.imageUrl && (
              <button onClick={() => onGenerate(seg.id)} className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors flex items-center gap-1.5">
                <Video className="w-3 h-3" /> Generate
              </button>
            )}
            {!isDone && !isGen && !hasFailed && !seg.imageUrl && (
              <span className="text-xs text-[#57534E]">No image</span>
            )}
          </div>
        </div>

        {/* Error message inline */}
        {hasFailed && (
          <div className="mt-2 ml-12 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">
            <p className="text-xs text-red-400 line-clamp-2">{seg.videoError}</p>
          </div>
        )}
      </div>
      {showPreview && seg.videoUrl && <VideoPreviewModal videoUrl={seg.videoUrl} onClose={() => setShowPreview(false)} />}
    </>
  );
};

// ─── Grid view card ───────────────────────────────────────────────────────────

const GridCard: React.FC<{
  seg: WorkspaceSegment;
  index: number;
  onGenerate: (id: string) => void;
}> = ({ seg, index, onGenerate }) => {
  const isDone = !!seg.videoUrl;
  const isGen = seg.isGeneratingVideo;
  const hasFailed = !!seg.videoError && !isDone;

  return (
    <div className={`bg-[#161616] rounded-xl border overflow-hidden group transition-colors ${
      hasFailed ? 'border-red-500/30' : isDone ? 'border-emerald-500/30' : isGen ? 'border-emerald-500/40' : 'border-[#262626] hover:border-neutral-600'
    }`}>
      <div className="relative w-full" style={{ paddingBottom: '177.78%' }}>
        <div className="absolute inset-0 flex flex-col">
          {/* Header */}
          <div className="p-2.5 border-b border-[#262626] bg-[#161616]/90 backdrop-blur-sm z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#A8A29E]">{index + 1}</span>
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium border ${segmentTypeColor(seg.segmentType)}`}>
                {seg.segmentType}
              </span>
            </div>
          </div>

          {/* Thumbnail */}
          <SegmentThumbnail seg={seg} className="flex-1" />

          {/* Hover overlay: generate */}
          {!isDone && !isGen && !hasFailed && seg.imageUrl && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 z-20">
              <button
                onClick={() => onGenerate(seg.id)}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium flex items-center gap-2"
              >
                <Video className="w-4 h-4" /> Generate
              </button>
            </div>
          )}

          {/* Failed overlay */}
          {hasFailed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-20 p-3">
              <AlertCircle className="w-6 h-6 text-red-400 mb-2" />
              <p className="text-xs text-red-400 text-center line-clamp-3 mb-3">{seg.videoError}</p>
              <button
                onClick={() => onGenerate(seg.id)}
                className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 hover:bg-red-500/30 text-red-400 text-sm font-medium flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          )}

          {/* Done badge */}
          {isDone && (
            <div className="absolute top-8 right-2 z-10">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 drop-shadow" />
            </div>
          )}

          {!isDone && !isGen && !hasFailed && !seg.imageUrl && (
            <div className="absolute bottom-3 inset-x-0 flex justify-center z-10">
              <span className="text-xs text-[#57534E]">No image</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const VideoStep: React.FC = () => {
  const { state, dispatch } = useWorkspace();
  const { user } = useAuth();
  const { orderId: paramOrderId } = useParams<{ orderId: string }>();
  const orderId = paramOrderId || state.orderId;

  const [viewMode, setViewMode] = useState<'full' | 'compact' | 'grid'>(() => {
    try { return (localStorage.getItem('sf_video_view') as any) || 'full'; } catch { return 'full'; }
  });
  const [fullViewColumns, setFullViewColumns] = useState<1 | 2>(() => {
    try { return localStorage.getItem('sf_video_view_cols') === '2' ? 2 : 1; } catch { return 1; }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoModel, setVideoModel] = useState<'veo-3.1-fast-hd' | 'veo-3.1-fast-fhd' | 'veo-3.1-hd' | 'veo-3.1-fhd' | 'grok-3'>('veo-3.1-fast-hd');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showGenerateDropdown, setShowGenerateDropdown] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const generateDropdownRef = useRef<HTMLDivElement>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingJobQueueRef = useRef<Array<{ id: string; segment_number: number }>>([]);
  const activeJobCountRef = useRef(0);
  const nextSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitNextJobRef = useRef<() => Promise<void>>();
  const MAX_CONCURRENT = 3;
  const SUBMIT_GAP_MS = 60_000; // 1 minute between each submission

  const segments = state.segments;
  const settings = state.settings;

  const enabledSegments = useMemo(() => segments.filter(s => s.isEnabled !== false), [segments]);
  const videosGenerated = useMemo(() => enabledSegments.filter(s => s.videoUrl).length, [enabledSegments]);
  const videosFailed = useMemo(() => enabledSegments.filter(s => s.videoError && !s.videoUrl).length, [enabledSegments]);
  const totalDuration = useMemo(() => segments.reduce((sum, s) => sum + s.durationSeconds, 0), [segments]);
  const allHaveVideos = videosGenerated === enabledSegments.length && enabledSegments.length > 0;
  const canGenerateVideo = enabledSegments.length > 0 && enabledSegments.every(s => s.imageUrl);
  const isAnyGenerating = segments.some(s => s.isGeneratingVideo) || isSubmitting;

  // ── Close dropdowns on outside click ─────────────────────────────────────────
  useEffect(() => {
    if (!showModelDropdown && !showGenerateDropdown) return;
    const handler = (e: MouseEvent) => {
      if (showModelDropdown && modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
      }
      if (showGenerateDropdown && generateDropdownRef.current && !generateDropdownRef.current.contains(e.target as Node)) {
        setShowGenerateDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showModelDropdown, showGenerateDropdown]);

  // ── Sync job status from DB (on mount + manual refresh) ─────────────────────
  const syncJobStatusFromDB = useCallback(async () => {
    if (!orderId || !user) return;
    const { data: jobs } = await supabase
      .from('video_generation_jobs')
      .select('id, segment_id, segment_number, status, video_url, error_message')
      .eq('session_id', orderId)
      .order('segment_number', { ascending: true });

    if (!jobs?.length) return;
    console.log(`[VideoStep] Syncing ${jobs.length} jobs from DB`);

    for (const job of jobs) {
      const seg = segments.find(s => s.id === job.segment_id || s.segmentNumber === job.segment_number);
      if (!seg) continue;

      if (job.status === 2 && job.video_url && !seg.videoUrl) {
        dispatch({ type: 'SET_SEGMENT_VIDEO', segmentId: seg.id, videoUrl: job.video_url });
      } else if (job.status === 3 && !seg.videoError && !seg.videoUrl) {
        dispatch({ type: 'SET_SEGMENT_VIDEO_ERROR', segmentId: seg.id, error: job.error_message || 'Generation failed' });
      } else if (job.status === 1 && !seg.isGeneratingVideo && !seg.videoUrl) {
        dispatch({ type: 'SET_SEGMENT_GENERATING_VIDEO', segmentId: seg.id, isGenerating: true });
      }
    }
  }, [orderId, user, segments, dispatch]);

  // Sync on mount
  useEffect(() => {
    syncJobStatusFromDB();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, user]);

  // ── Supabase Realtime: subscribe immediately when orderId available ───────────
  // Webhook updates video_generation_jobs → Realtime pushes to frontend → no polling needed
  const segmentsRef = useRef(segments);
  useEffect(() => { segmentsRef.current = segments; }, [segments]);

  useEffect(() => {
    if (!orderId || !user) return;
    if (realtimeChannelRef.current) return;

    const channel = supabase
      .channel(`video-jobs-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_generation_jobs',
          filter: `session_id=eq.${orderId}`,
        },
        (payload) => {
          const job = payload.new as any;
          if (!job) return;
          const currentSegments = segmentsRef.current;

          if (job.status === 2 && job.video_url) {
            const seg = currentSegments.find(
              s => s.id === job.segment_id || s.segmentNumber === job.segment_number
            );
            if (seg) {
              dispatch({ type: 'SET_SEGMENT_VIDEO', segmentId: seg.id, videoUrl: job.video_url });
              console.log(`[VideoStep] ✅ Video ready: ${seg.segmentType}`);
            }
            // Free a slot → scheduleNextSubmit handles the 1-min delay
            activeJobCountRef.current = Math.max(0, activeJobCountRef.current - 1);
            console.log(`[VideoStep] 📊 Active: ${activeJobCountRef.current}/${MAX_CONCURRENT}, queue: ${pendingJobQueueRef.current.length}`);
            submitNextJobRef.current?.();
          } else if (job.status === 3) {
            const seg = currentSegments.find(
              s => s.id === job.segment_id || s.segmentNumber === job.segment_number
            );
            if (seg) {
              dispatch({ type: 'SET_SEGMENT_VIDEO_ERROR', segmentId: seg.id, error: job.error_message || 'Generation failed' });
              console.error(`[VideoStep] ❌ Video failed: ${seg.segmentType}`);
            }
            // Free a slot → schedule next
            activeJobCountRef.current = Math.max(0, activeJobCountRef.current - 1);
            submitNextJobRef.current?.();
          }
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      realtimeChannelRef.current = null;
    };
  }, [orderId, user, dispatch]);

  // Cleanup realtime when all done
  useEffect(() => {
    const allDone = enabledSegments.every(s => s.videoUrl || s.videoError);
    if (allDone && realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
  }, [enabledSegments]);

  // ── Auto-retry failed jobs every 15 minutes ──────────────────────────────────
  useEffect(() => {
    if (!orderId || !user) return;

    const retryFailed = async () => {
      const failedSegments = enabledSegments.filter(s => s.videoError && !s.videoUrl);
      if (failedSegments.length === 0) return;

      console.log(`[VideoStep] Auto-retry: ${failedSegments.length} failed segment(s)`);

      for (const seg of failedSegments) {
        // Reset error state → mark as generating
        dispatch({ type: 'SET_SEGMENT_GENERATING_VIDEO', segmentId: seg.id, isGenerating: true });

        try {
          // Reset job status to pending in DB
          await supabase
            .from('video_generation_jobs')
            .update({ status: 0, error_message: null, veo_uuid: null, video_url: null })
            .eq('session_id', orderId)
            .eq('segment_id', seg.id);

          // Re-submit
          const { data: jobData } = await supabase
            .from('video_generation_jobs')
            .select('id')
            .eq('session_id', orderId)
            .eq('segment_id', seg.id)
            .single();

          if (jobData?.id) {
            await supabase.functions.invoke('generate-videos', {
              body: { mode: 'process_single', job_id: jobData.id },
            });
            console.log(`[VideoStep] 🔄 Retried: ${seg.segmentType} (job ${jobData.id})`);
          }
        } catch (err) {
          console.error(`[VideoStep] Retry failed for ${seg.segmentType}:`, err);
          dispatch({ type: 'SET_SEGMENT_VIDEO_ERROR', segmentId: seg.id, error: 'Retry failed' });
        }
      }
    };

    // Start interval only if there are failed segments
    const hasFailed = enabledSegments.some(s => s.videoError && !s.videoUrl);
    if (hasFailed && !retryIntervalRef.current) {
      retryIntervalRef.current = setInterval(retryFailed, 15 * 60 * 1000); // 15 min
    }
    if (!hasFailed && retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current);
      retryIntervalRef.current = null;
    }

    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }
    };
  }, [orderId, user, enabledSegments, dispatch]);

  const setViewModeAndPersist = useCallback((mode: 'full' | 'compact' | 'grid') => {
    setViewMode(mode);
    localStorage.setItem('sf_video_view', mode);
  }, []);

  const setFullViewColumnsAndPersist = useCallback((cols: 1 | 2) => {
    setFullViewColumns(cols);
    localStorage.setItem('sf_video_view_cols', String(cols));
  }, []);

  // ── Build segments payload for create_jobs ──────────────────────────────────
  const buildSegmentsPayload = useCallback((segs: WorkspaceSegment[]) =>
    segs.map((seg, i) => ({
      segment_id: seg.id,
      segment_number: i + 1,
      segment_type: seg.segmentType,
      shot_type: seg.shotType,
      script_text: seg.script,
      script: seg.script,
      image_url: seg.imageUrl,
      duration_seconds: seg.durationSeconds,
      visual_direction: seg.visualDirection,
    })), []);

  // ── Submit pending jobs with concurrency control ────────────────────────────
  // Max 3 concurrent, 1-minute gap between each submission.
  // When one finishes and active < 3, schedule next after 1-min delay.

  // Submit a single job to the edge function
  const submitOneJob = useCallback(async (job: { id: string; segment_number: number }) => {
    const seg = segments.find(s => s.segmentNumber === job.segment_number);
    if (seg) dispatch({ type: 'SET_SEGMENT_GENERATING_VIDEO', segmentId: seg.id, isGenerating: true });

    activeJobCountRef.current += 1;
    console.log(`[VideoStep] 🚀 Submitted seg ${job.segment_number} — active: ${activeJobCountRef.current}/${MAX_CONCURRENT}, queue: ${pendingJobQueueRef.current.length}`);

    try {
      const { data } = await supabase.functions.invoke('generate-videos', {
        body: { mode: 'process_single', job_id: job.id },
      });
      console.log(`[VideoStep] ✅ Job ${job.id}: ${data?.data?.job?.veo_uuid || 'submitted'}`);
    } catch (err) {
      console.error(`[VideoStep] ❌ Failed job ${job.id}:`, err);
      activeJobCountRef.current = Math.max(0, activeJobCountRef.current - 1);
      if (seg) dispatch({ type: 'SET_SEGMENT_VIDEO_ERROR', segmentId: seg.id, error: 'Submit failed' });
    }
  }, [segments, dispatch]);

  // Schedule next job submission with 1-min delay (if eligible)
  const scheduleNextSubmit = useCallback(() => {
    // Already have a pending timer — don't double-schedule
    if (nextSubmitTimerRef.current) return;
    // At concurrency limit — wait for a job to complete first
    if (activeJobCountRef.current >= MAX_CONCURRENT) return;
    // Nothing left in queue
    if (pendingJobQueueRef.current.length === 0) return;

    console.log(`[VideoStep] ⏳ Next job in ${SUBMIT_GAP_MS / 1000}s (active: ${activeJobCountRef.current}/${MAX_CONCURRENT}, queue: ${pendingJobQueueRef.current.length})`);

    nextSubmitTimerRef.current = setTimeout(async () => {
      nextSubmitTimerRef.current = null;
      // Re-check conditions (may have changed during the wait)
      if (activeJobCountRef.current >= MAX_CONCURRENT) return;
      const next = pendingJobQueueRef.current.shift();
      if (!next) return;
      await submitOneJob(next);
      // Schedule the one after that
      scheduleNextSubmit();
    }, SUBMIT_GAP_MS);
  }, [submitOneJob]);

  // Called by Realtime when a job completes or fails — frees a slot
  const submitNextJob = useCallback(async () => {
    scheduleNextSubmit();
  }, [scheduleNextSubmit]);

  // Keep ref in sync so Realtime callback always calls latest version
  useEffect(() => { submitNextJobRef.current = submitNextJob; }, [submitNextJob]);

  // Load pending jobs into queue and start the submission chain
  const submitPendingJobs = useCallback(async (sessionId: string) => {
    if (!user) return;

    // Clear any existing timer
    if (nextSubmitTimerRef.current) {
      clearTimeout(nextSubmitTimerRef.current);
      nextSubmitTimerRef.current = null;
    }

    // Reset any failed jobs to pending so they're included
    await supabase
      .from('video_generation_jobs')
      .update({ status: 0, error_message: null })
      .eq('session_id', sessionId)
      .eq('status', 3);

    // Count currently processing jobs (status=1) to set correct active count
    const { data: processingData } = await supabase
      .from('video_generation_jobs')
      .select('id')
      .eq('session_id', sessionId)
      .eq('status', 1);
    activeJobCountRef.current = processingData?.length || 0;

    const { data: pendingData } = await supabase
      .from('video_generation_jobs')
      .select('id, segment_number')
      .eq('session_id', sessionId)
      .eq('status', 0)
      .order('segment_number', { ascending: true });

    const pending = pendingData || [];
    pendingJobQueueRef.current = pending;

    console.log(`[VideoStep] 📋 Queue: ${pending.length} pending, ${activeJobCountRef.current} active (max ${MAX_CONCURRENT}, ${SUBMIT_GAP_MS / 1000}s gap)`);

    if (pending.length === 0) return;

    // Submit first job immediately (if under concurrency limit)
    if (activeJobCountRef.current < MAX_CONCURRENT) {
      const first = pendingJobQueueRef.current.shift();
      if (first) {
        await submitOneJob(first);
        // Schedule subsequent jobs with 1-min gap
        scheduleNextSubmit();
      }
    }
  }, [user, submitOneJob, scheduleNextSubmit]);

  // ── Generate videos (all or remaining only) ─────────────────────────────────
  const handleGenerateVideos = useCallback(async (mode: 'all' | 'remaining') => {
    if (!user || !orderId || isSubmitting) return;
    setIsSubmitting(true);
    setShowGenerateDropdown(false);

    try {
      const targetSegments = mode === 'remaining'
        ? enabledSegments.filter(s => !s.videoUrl)
        : enabledSegments;

      const segmentsPayload = buildSegmentsPayload(targetSegments);
      const { data, error } = await supabase.functions.invoke('generate-videos', {
        body: {
          mode: 'create_jobs',
          user_id: user.id,
          session_id: orderId,
          segments: segmentsPayload,
          topic: state.topic || '',
          language: settings?.language || 'indonesian',
          aspect_ratio: settings?.aspectRatio || '9:16',
          preferred_platform: videoModel,
          regenerate_all: mode === 'all',
        },
      });

      if (error) throw error;
      console.log(`[VideoStep] Created ${data?.data?.total_jobs} jobs (model: ${videoModel}, mode: ${mode})`);

      await submitPendingJobs(orderId);
    } catch (err) {
      console.error('[VideoStep] handleGenerateVideos error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [user, orderId, isSubmitting, enabledSegments, settings, state.topic, buildSegmentsPayload, submitPendingJobs, videoModel]);

  const remainingCount = enabledSegments.filter(s => !s.videoUrl).length;

  // ── Generate / Regenerate Single ─────────────────────────────────────────────
  const handleGenerate = useCallback(async (segmentId: string) => {
    if (!user || !orderId) return;
    const seg = segments.find(s => s.id === segmentId);
    if (!seg) return;

    dispatch({ type: 'SET_SEGMENT_GENERATING_VIDEO', segmentId, isGenerating: true });

    try {
      // Reset existing job for this segment, then create fresh
      const segPayload = buildSegmentsPayload([seg]);
      const { data, error } = await supabase.functions.invoke('generate-videos', {
        body: {
          mode: 'create_jobs',
          user_id: user.id,
          session_id: orderId,
          segments: segPayload,
          topic: state.topic || '',
          language: settings?.language || 'indonesian',
          aspect_ratio: settings?.aspectRatio || '9:16',
          preferred_platform: videoModel,
        },
      });
      if (error) throw error;

      const job = data?.data?.jobs?.[0];
      if (job?.id) {
        const { data: pd } = await supabase.functions.invoke('generate-videos', {
          body: { mode: 'process_single', job_id: job.id },
        });
        console.log(`[VideoStep] ✅ Single job submitted: ${pd?.data?.job?.veo_uuid || job.id}`);
      }
    } catch (err) {
      console.error('[VideoStep] handleGenerate error:', err);
      dispatch({ type: 'SET_SEGMENT_VIDEO_ERROR', segmentId, error: 'Submit failed' });
    }
  }, [user, orderId, segments, settings, state.topic, buildSegmentsPayload, dispatch]);

  return (
    <div className="flex flex-col h-full">
      {/* Pre-flight alert (only shown if not ready) */}
      {!canGenerateVideo && (
        <div className="mb-4 flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300">
            Generate semua gambar di step Images terlebih dahulu.
          </p>
        </div>
      )}

      {/* ─── Header (sticky on scroll) ─── */}
      <div className="sticky top-0 z-30 bg-[#0B0E14]/95 backdrop-blur-sm pb-4 -mx-1 px-1">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white mb-1 line-clamp-2">
              {state.topic || 'Video Generation'}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-neutral-500 text-sm">
                Durasi: {totalDuration}s
                {settings && ` • ${settings.aspectRatio}`}
                {` • ${videosGenerated}/${enabledSegments.length} videos`}
                {videosFailed > 0 && (
                  <span className="text-red-400"> • {videosFailed} failed</span>
                )}
              </p>

              {/* View mode toggle */}
              <div className="flex items-center gap-0.5 border border-[#262626] rounded-lg p-0.5">
                <button
                  onClick={() => setViewModeAndPersist('full')}
                  className={`p-1.5 rounded transition-colors ${viewMode === 'full' ? 'bg-emerald-500 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                  title="Full View"
                >
                  <LayoutList className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewModeAndPersist('compact')}
                  className={`p-1.5 rounded transition-colors ${viewMode === 'compact' ? 'bg-emerald-500 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                  title="Compact View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewModeAndPersist('grid')}
                  className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-emerald-500 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Full view column toggle */}
              {viewMode === 'full' && (
                <div className="flex items-center gap-0.5 border-l border-[#262626] pl-1 ml-0.5">
                  <button
                    onClick={() => setFullViewColumnsAndPersist(1)}
                    className={`p-1.5 rounded transition-colors ${fullViewColumns === 1 ? 'bg-emerald-500 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                    title="1 Column"
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setFullViewColumnsAndPersist(2)}
                    className={`p-1.5 rounded transition-colors ${fullViewColumns === 2 ? 'bg-emerald-500 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                    title="2 Columns"
                  >
                    <Columns2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Model selector + Generate All */}
          <div className="flex gap-2">
            {/* Video Model Dropdown */}
            <div className="relative" ref={modelDropdownRef}>
              <button
                onClick={() => setShowModelDropdown(v => !v)}
                className="h-10 px-3 flex items-center gap-2 border border-[#262626] rounded-lg text-neutral-300 hover:bg-[#1E1E1E] transition-colors text-sm"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {videoModel === 'veo-3.1-fast-hd' ? 'VEO 3.1 Fast HD' : videoModel === 'veo-3.1-fast-fhd' ? 'VEO 3.1 Fast FHD' : videoModel === 'veo-3.1-hd' ? 'VEO 3.1 HD' : videoModel === 'veo-3.1-fhd' ? 'VEO 3.1 FHD' : 'Grok 3'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showModelDropdown && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-[#1E1E1E] border border-[#262626] rounded-xl shadow-xl z-[200] p-3">
                  <p className="text-xs text-neutral-500 mb-2 px-1">Video Model</p>
                  {([
                    { key: 'veo-3.1-fast-hd',  label: 'VEO 3.1 Fast HD',  desc: '$0.015/video · 8s · 720p' },
                    { key: 'veo-3.1-fast-fhd', label: 'VEO 3.1 Fast FHD', desc: '$0.015/video · 8s · 1080p' },
                    { key: 'veo-3.1-hd',       label: 'VEO 3.1 HD',       desc: '$0.50/video · 8s · 720p premium' },
                    { key: 'veo-3.1-fhd',      label: 'VEO 3.1 FHD',      desc: '$0.50/video · 8s · 1080p premium' },
                    { key: 'grok-3',           label: 'Grok 3',            desc: '$0.015/video · 6–15s · Dynamic' },
                  ] as const).map(({ key, label, desc }) => (
                    <button
                      key={key}
                      onClick={() => { setVideoModel(key); setShowModelDropdown(false); }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex flex-col gap-0.5 ${
                        videoModel === key ? 'bg-emerald-500/10 text-emerald-400' : 'text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      <span className="font-medium">{label}</span>
                      <span className="text-xs text-neutral-500">{desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

          {/* Sync button */}
          <button
            onClick={syncJobStatusFromDB}
            title="Sync status dari DB"
            className="h-10 w-10 flex items-center justify-center rounded-lg border border-[#262626] text-neutral-400 hover:bg-[#1E1E1E] hover:text-neutral-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Generate button with dropdown */}
          <div className="relative" ref={generateDropdownRef}>
            {isAnyGenerating ? (
              <button
                disabled
                className="h-10 px-5 font-medium flex items-center gap-2 rounded-lg text-white bg-emerald-500 opacity-60 cursor-not-allowed"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating...</span>
              </button>
            ) : allHaveVideos ? (
              /* All done — simple regenerate all button */
              <button
                onClick={() => handleGenerateVideos('all')}
                disabled={!canGenerateVideo}
                className="h-10 px-5 font-medium flex items-center gap-2 rounded-lg text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Regenerate All</span>
              </button>
            ) : remainingCount < enabledSegments.length && remainingCount > 0 ? (
              /* Some done, some remaining — show dropdown */
              <>
                <button
                  onClick={() => setShowGenerateDropdown(v => !v)}
                  disabled={!canGenerateVideo}
                  className="h-10 px-5 font-medium flex items-center gap-2 rounded-lg text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Clapperboard className="w-4 h-4" />
                  <span>Generate All ({remainingCount})</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showGenerateDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showGenerateDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-[#1E1E1E] border border-[#262626] rounded-xl shadow-xl z-[200] p-2">
                    <button
                      onClick={() => handleGenerateVideos('remaining')}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800 transition-colors flex flex-col gap-0.5"
                    >
                      <span className="font-medium">Generate Remaining ({remainingCount})</span>
                      <span className="text-xs text-neutral-500">Only segments without video</span>
                    </button>
                    <button
                      onClick={() => handleGenerateVideos('all')}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800 transition-colors flex flex-col gap-0.5"
                    >
                      <span className="font-medium">Regenerate All ({enabledSegments.length})</span>
                      <span className="text-xs text-neutral-500">Re-generate everything from start</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* None done yet — simple generate all button */
              <button
                onClick={() => handleGenerateVideos('all')}
                disabled={!canGenerateVideo}
                className="h-10 px-5 font-medium flex items-center gap-2 rounded-lg text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Clapperboard className="w-4 h-4" />
                <span>Generate All ({enabledSegments.length})</span>
              </button>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="flex-1 overflow-y-auto">
        {/* Compact view */}
        {viewMode === 'compact' && (
          <div className="space-y-1.5">
            {enabledSegments.map((seg, i) => (
              <CompactRow key={seg.id} seg={seg} index={i} onGenerate={handleGenerate} />
            ))}
          </div>
        )}

        {/* Grid view */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-6">
            {enabledSegments.map((seg, i) => (
              <GridCard key={seg.id} seg={seg} index={i} onGenerate={handleGenerate} />
            ))}
          </div>
        )}

        {/* Full view */}
        {viewMode === 'full' && (
          <div className={fullViewColumns === 2 ? 'grid grid-cols-1 xl:grid-cols-2 gap-5' : 'space-y-4'}>
            {enabledSegments.map((seg, i) => (
              <FullCard key={seg.id} seg={seg} index={i} twoCol={fullViewColumns === 2} onGenerate={handleGenerate} />
            ))}
          </div>
        )}

        {/* Empty state (shouldn't normally appear) */}
        {enabledSegments.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Clapperboard className="w-12 h-12 text-[#3D3D3D]" />
            <p className="text-sm text-[#57534E]">Tidak ada segment yang aktif</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoStep;
