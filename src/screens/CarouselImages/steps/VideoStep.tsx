import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, Loader2, Video, RefreshCw, AlertTriangle, AlertCircle,
  CheckCircle2, Download, RotateCcw, ArrowRight, Sparkles,
  ZoomIn, MoveHorizontal, Layers, Pencil, ToggleLeft, ToggleRight,
  DollarSign, Clock,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import type {
  CarouselProject,
  CarouselSlide,
  CarouselSlideRow,
  VideoMotionPreset,
} from '../../../types/carousel';
import { mapCarouselSlideRow, SLIDE_TYPE_CONFIG } from '../../../types/carousel';

// ─── Constants ───────────────────────────────────────────────────────────────

const COST_PER_VIDEO = 0.015;

const MOTION_PRESETS: {
  key: VideoMotionPreset;
  label: string;
  description: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  {
    key: 'subtle_zoom',
    label: 'Subtle Zoom',
    description: 'Slow cinematic zoom, soft focus shift',
    icon: ZoomIn,
  },
  {
    key: 'dynamic_pan',
    label: 'Dynamic Pan',
    description: 'Horizontal pan, elements enter from edges',
    icon: MoveHorizontal,
  },
  {
    key: 'parallax_layers',
    label: 'Parallax Layers',
    description: 'Background slower than foreground, depth effect',
    icon: Layers,
  },
  {
    key: 'custom',
    label: 'Custom',
    description: 'Write your own motion prompt',
    icon: Pencil,
  },
];

const DURATION_OPTIONS = [5, 8, 10] as const;

// ─── Types ───────────────────────────────────────────────────────────────────

interface VideoStepProps {
  project: CarouselProject;
  onProjectUpdate: () => void;
}

interface VideoJob {
  id: string;
  slideId: string;
  status: number; // 0=pending, 1=processing, 2=completed, 3=failed
  videoUrl: string | null;
  errorMessage: string | null;
}

// ─── Video Preview Modal ─────────────────────────────────────────────────────

const VideoPreviewModal: React.FC<{
  videoUrl: string;
  onClose: () => void;
}> = ({ videoUrl, onClose }) => (
  <div
    className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-sm"
    onClick={onClose}
  >
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

// ─── Motion Preset Card ──────────────────────────────────────────────────────

const MotionPresetCard: React.FC<{
  preset: typeof MOTION_PRESETS[number];
  selected: boolean;
  onSelect: () => void;
}> = ({ preset, selected, onSelect }) => {
  const Icon = preset.icon;
  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all ${
        selected
          ? 'border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/20'
          : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700 hover:bg-neutral-800/50'
      }`}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${selected ? 'text-emerald-400' : 'text-neutral-500'}`} />
      <div className="min-w-0">
        <p className={`text-xs font-medium ${selected ? 'text-emerald-300' : 'text-neutral-300'}`}>
          {preset.label}
        </p>
        <p className="text-[10px] text-neutral-500 truncate">{preset.description}</p>
      </div>
    </button>
  );
};

// ─── Duration Selector ───────────────────────────────────────────────────────

const DurationSelector: React.FC<{
  value: number;
  onChange: (d: number) => void;
}> = ({ value, onChange }) => (
  <div className="inline-flex items-center bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
    {DURATION_OPTIONS.map(d => (
      <button
        key={d}
        onClick={() => onChange(d)}
        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
          value === d
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
        } ${d !== DURATION_OPTIONS[0] ? 'border-l border-neutral-800' : ''}`}
      >
        {d}s
      </button>
    ))}
  </div>
);

// ─── Slide Video Card ────────────────────────────────────────────────────────

const SlideVideoCard: React.FC<{
  slide: CarouselSlide;
  job: VideoJob | null;
  onToggle: (slideId: string, enabled: boolean) => void;
  onPresetChange: (slideId: string, preset: VideoMotionPreset) => void;
  onDurationChange: (slideId: string, duration: number) => void;
  onCustomPromptChange: (slideId: string, prompt: string) => void;
  onCustomPromptBlur: (slideId: string) => void;
  onGenerate: (slideId: string) => void;
  onPlay: (videoUrl: string) => void;
  isGeneratingAll: boolean;
}> = ({
  slide,
  job,
  onToggle,
  onPresetChange,
  onDurationChange,
  onCustomPromptChange,
  onCustomPromptBlur,
  onGenerate,
  onPlay,
  isGeneratingAll,
}) => {
  const typeConfig = SLIDE_TYPE_CONFIG[slide.slideType];
  const isEnabled = slide.videoToggle;
  const isGenerating = job?.status === 1;
  const isCompleted = job?.status === 2 && !!job.videoUrl;
  const isFailed = job?.status === 3;
  const isPending = job?.status === 0;
  const hasVideo = !!slide.videoUrl || isCompleted;
  const videoUrl = job?.videoUrl || slide.videoUrl;
  const currentPreset = slide.videoMotionPreset || 'subtle_zoom';
  const currentDuration = slide.videoDuration || 8;

  return (
    <div
      className={`bg-[#161616] border rounded-xl overflow-hidden transition-all ${
        !isEnabled
          ? 'border-neutral-800/50 opacity-50'
          : isFailed
          ? 'border-red-500/30'
          : isCompleted || hasVideo
          ? 'border-emerald-500/20'
          : isGenerating || isPending
          ? 'border-emerald-500/30'
          : 'border-neutral-800'
      }`}
    >
      {/* Header: slide index + type badge + toggle */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800/50">
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 font-mono">
            #{slide.slideIndex + 1}
          </span>
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium border ${typeConfig.badgeBg} ${typeConfig.badgeText} ${typeConfig.badgeBorder}`}
          >
            {typeConfig.label}
          </span>
          {(isGenerating || isPending) && (
            <span className="flex items-center gap-1 text-xs text-emerald-400 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" />
              {isGenerating ? 'Generating...' : 'Queued'}
            </span>
          )}
          {(isCompleted || hasVideo) && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> Done
            </span>
          )}
          {isFailed && (
            <span className="flex items-center gap-1 text-xs text-red-400">
              <AlertCircle className="w-3 h-3" /> Failed
            </span>
          )}
        </div>
        <button
          onClick={() => onToggle(slide.id, !isEnabled)}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
          title={isEnabled ? 'Disable video' : 'Enable video'}
        >
          {isEnabled ? (
            <ToggleRight className="w-5 h-5 text-emerald-400" />
          ) : (
            <ToggleLeft className="w-5 h-5 text-neutral-600" />
          )}
        </button>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex gap-4">
          {/* Thumbnail (4:5 aspect) */}
          <div className="w-28 flex-shrink-0">
            <div className="relative w-full rounded-lg overflow-hidden bg-neutral-900" style={{ aspectRatio: '4/5' }}>
              {slide.imageUrl ? (
                <>
                  <img
                    src={slide.imageUrl}
                    alt={`Slide ${slide.slideIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {(isGenerating || isPending) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                    </div>
                  )}
                  {hasVideo && videoUrl && !isGenerating && !isPending && (
                    <button
                      onClick={() => onPlay(videoUrl)}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/55 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                        <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                      </div>
                    </button>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Video className="w-5 h-5 text-neutral-700" />
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            {/* Motion Preset */}
            {isEnabled && (
              <>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5">
                    Motion Preset
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {MOTION_PRESETS.map(p => (
                      <MotionPresetCard
                        key={p.key}
                        preset={p}
                        selected={currentPreset === p.key}
                        onSelect={() => onPresetChange(slide.id, p.key)}
                      />
                    ))}
                  </div>
                </div>

                {/* Custom Prompt */}
                {currentPreset === 'custom' && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1.5">
                      Custom Motion Prompt
                    </p>
                    <textarea
                      value={slide.videoCustomPrompt || ''}
                      onChange={e => onCustomPromptChange(slide.id, e.target.value)}
                      onBlur={() => onCustomPromptBlur(slide.id)}
                      placeholder="Describe the motion you want... e.g. 'slow dolly in with subtle light flicker'"
                      rows={2}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 placeholder-neutral-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors resize-none"
                    />
                  </div>
                )}

                {/* Duration */}
                <div className="flex items-center gap-3">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                    Duration
                  </p>
                  <DurationSelector
                    value={currentDuration}
                    onChange={d => onDurationChange(slide.id, d)}
                  />
                </div>
              </>
            )}

            {/* Error message */}
            {isFailed && job?.errorMessage && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400 line-clamp-2">{job.errorMessage}</p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {isEnabled && (
              <div className="flex items-center gap-2 mt-auto">
                {hasVideo && videoUrl && (
                  <a
                    href={videoUrl}
                    download
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 text-xs font-medium transition-colors"
                  >
                    <Download className="w-3 h-3" /> Download
                  </a>
                )}
                {(hasVideo || isFailed) && (
                  <button
                    onClick={() => onGenerate(slide.id)}
                    disabled={isGenerating || isPending || isGeneratingAll}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isFailed
                        ? 'bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400'
                        : 'border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-400'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <RotateCcw className="w-3 h-3" /> {isFailed ? 'Retry' : 'Regenerate'}
                  </button>
                )}
                {!hasVideo && !isFailed && !isGenerating && !isPending && (
                  <button
                    onClick={() => onGenerate(slide.id)}
                    disabled={!slide.imageUrl || isGeneratingAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Video className="w-3 h-3" /> Generate
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const VideoStep: React.FC<VideoStepProps> = ({ project, onProjectUpdate }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [jobs, setJobs] = useState<Map<string, VideoJob>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);

  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingJobQueueRef = useRef<Array<{ id: string; slideId: string }>>([]);
  const activeJobCountRef = useRef(0);
  const nextSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitNextJobRef = useRef<() => void>();
  const slidesRef = useRef(slides);

  const MAX_CONCURRENT = 3;
  const SUBMIT_GAP_MS = 60_000;

  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  // ── Fetch slides ───────────────────────────────────────────────────────────

  const fetchSlides = useCallback(async () => {
    if (!project.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('carousel_slides')
        .select('*')
        .eq('project_id', project.id)
        .order('slide_index', { ascending: true });

      if (error) throw error;
      const mapped = (data as CarouselSlideRow[]).map(mapCarouselSlideRow);
      setSlides(mapped);
    } catch (err) {
      console.error('[CarouselVideoStep] fetchSlides error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  // ── Computed values ────────────────────────────────────────────────────────

  const videoEnabledSlides = useMemo(
    () => slides.filter(s => s.videoToggle && s.imageUrl),
    [slides]
  );

  const videosCompleted = useMemo(
    () => videoEnabledSlides.filter(s => {
      const job = jobs.get(s.id);
      return s.videoUrl || (job?.status === 2 && job.videoUrl);
    }).length,
    [videoEnabledSlides, jobs]
  );

  const videosFailed = useMemo(
    () => videoEnabledSlides.filter(s => {
      const job = jobs.get(s.id);
      return job?.status === 3 && !s.videoUrl;
    }).length,
    [videoEnabledSlides, jobs]
  );

  const isAnyGenerating = useMemo(
    () => Array.from(jobs.values()).some(j => j.status === 0 || j.status === 1),
    [jobs]
  );

  const totalCost = videoEnabledSlides.length * COST_PER_VIDEO;

  const allVideosDone = videosCompleted === videoEnabledSlides.length && videoEnabledSlides.length > 0;

  const canGenerateAll = videoEnabledSlides.length > 0 && !isSubmitting && !isAnyGenerating;

  // ── Sync job status from DB ────────────────────────────────────────────────

  const syncJobStatusFromDB = useCallback(async () => {
    if (!project.projectId || !user) return;
    const { data: jobRows } = await supabase
      .from('video_generation_jobs')
      .select('id, segment_id, status, video_url, error_message')
      .eq('session_id', project.projectId)
      .order('created_at', { ascending: true });

    if (!jobRows?.length) return;

    const newJobs = new Map<string, VideoJob>();
    for (const row of jobRows) {
      newJobs.set(row.segment_id, {
        id: row.id,
        slideId: row.segment_id,
        status: row.status,
        videoUrl: row.video_url,
        errorMessage: row.error_message,
      });
    }
    setJobs(newJobs);

    // Update slide video URLs for completed jobs
    const currentSlides = slidesRef.current;
    let hasUpdates = false;
    const updatedSlides = currentSlides.map(s => {
      const job = newJobs.get(s.id);
      if (job?.status === 2 && job.videoUrl && s.videoUrl !== job.videoUrl) {
        hasUpdates = true;
        return { ...s, videoUrl: job.videoUrl };
      }
      return s;
    });
    if (hasUpdates) setSlides(updatedSlides);
  }, [project.projectId, user]);

  useEffect(() => {
    if (slides.length > 0) {
      syncJobStatusFromDB();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length, project.projectId, user]);

  // ── Supabase Realtime subscription ─────────────────────────────────────────

  useEffect(() => {
    if (!project.projectId || !user) return;
    if (realtimeChannelRef.current) return;

    const channel = supabase
      .channel(`carousel-video-${project.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_generation_jobs',
          filter: `session_id=eq.${project.projectId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (!row) return;

          const updatedJob: VideoJob = {
            id: row.id,
            slideId: row.segment_id,
            status: row.status,
            videoUrl: row.video_url,
            errorMessage: row.error_message,
          };

          setJobs(prev => {
            const next = new Map(prev);
            next.set(row.segment_id, updatedJob);
            return next;
          });

          if (row.status === 2 && row.video_url) {
            // Update slide videoUrl
            setSlides(prev =>
              prev.map(s =>
                s.id === row.segment_id ? { ...s, videoUrl: row.video_url } : s
              )
            );
            console.log(`[CarouselVideoStep] Video ready: slide ${row.segment_id}`);
            activeJobCountRef.current = Math.max(0, activeJobCountRef.current - 1);
            submitNextJobRef.current?.();
          } else if (row.status === 3) {
            console.error(`[CarouselVideoStep] Video failed: slide ${row.segment_id}`);
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
  }, [project.projectId, project.id, user]);

  // ── Cleanup realtime when all done ─────────────────────────────────────────

  useEffect(() => {
    if (!videoEnabledSlides.length) return;
    const allDone = videoEnabledSlides.every(s => {
      const job = jobs.get(s.id);
      return s.videoUrl || job?.status === 2 || job?.status === 3;
    });
    if (allDone && realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
  }, [videoEnabledSlides, jobs]);

  // ── Submit one job ─────────────────────────────────────────────────────────

  const submitOneJob = useCallback(async (job: { id: string; slideId: string }) => {
    activeJobCountRef.current += 1;

    setJobs(prev => {
      const next = new Map(prev);
      const existing = next.get(job.slideId);
      if (existing) {
        next.set(job.slideId, { ...existing, status: 1 });
      }
      return next;
    });

    console.log(
      `[CarouselVideoStep] Submitted slide ${job.slideId} — active: ${activeJobCountRef.current}/${MAX_CONCURRENT}, queue: ${pendingJobQueueRef.current.length}`
    );

    try {
      await supabase.functions.invoke('generate-videos', {
        body: { mode: 'process_single', job_id: job.id },
      });
    } catch (err) {
      console.error(`[CarouselVideoStep] Failed job ${job.id}:`, err);
      activeJobCountRef.current = Math.max(0, activeJobCountRef.current - 1);
      setJobs(prev => {
        const next = new Map(prev);
        next.set(job.slideId, {
          id: job.id,
          slideId: job.slideId,
          status: 3,
          videoUrl: null,
          errorMessage: 'Submit failed',
        });
        return next;
      });
    }
  }, []);

  // ── Schedule next job ──────────────────────────────────────────────────────

  const scheduleNextSubmit = useCallback(() => {
    if (nextSubmitTimerRef.current) return;
    if (activeJobCountRef.current >= MAX_CONCURRENT) return;
    if (pendingJobQueueRef.current.length === 0) return;

    nextSubmitTimerRef.current = setTimeout(async () => {
      nextSubmitTimerRef.current = null;
      if (activeJobCountRef.current >= MAX_CONCURRENT) return;
      const next = pendingJobQueueRef.current.shift();
      if (!next) return;
      await submitOneJob(next);
      scheduleNextSubmit();
    }, SUBMIT_GAP_MS);
  }, [submitOneJob]);

  const submitNextJob = useCallback(() => {
    scheduleNextSubmit();
  }, [scheduleNextSubmit]);

  useEffect(() => {
    submitNextJobRef.current = submitNextJob;
  }, [submitNextJob]);

  // ── Load pending jobs and start chain ──────────────────────────────────────

  const submitPendingJobs = useCallback(async () => {
    if (!user || !project.projectId) return;

    if (nextSubmitTimerRef.current) {
      clearTimeout(nextSubmitTimerRef.current);
      nextSubmitTimerRef.current = null;
    }

    // Reset failed jobs to pending
    await supabase
      .from('video_generation_jobs')
      .update({ status: 0, error_message: null })
      .eq('session_id', project.projectId)
      .eq('status', 3);

    // Count processing jobs
    const { data: processingData } = await supabase
      .from('video_generation_jobs')
      .select('id')
      .eq('session_id', project.projectId)
      .eq('status', 1);
    activeJobCountRef.current = processingData?.length || 0;

    // Get pending jobs
    const { data: pendingData } = await supabase
      .from('video_generation_jobs')
      .select('id, segment_id')
      .eq('session_id', project.projectId)
      .eq('status', 0)
      .order('created_at', { ascending: true });

    const pending = (pendingData || []).map(p => ({
      id: p.id,
      slideId: p.segment_id,
    }));
    pendingJobQueueRef.current = pending;

    if (pending.length === 0) return;

    // Submit first immediately
    if (activeJobCountRef.current < MAX_CONCURRENT) {
      const first = pendingJobQueueRef.current.shift();
      if (first) {
        await submitOneJob(first);
        scheduleNextSubmit();
      }
    }
  }, [user, project.projectId, submitOneJob, scheduleNextSubmit]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (nextSubmitTimerRef.current) {
        clearTimeout(nextSubmitTimerRef.current);
      }
    };
  }, []);

  // ── Update slide field in DB ───────────────────────────────────────────────

  const updateSlideField = useCallback(
    async (slideId: string, updates: Partial<CarouselSlideRow>) => {
      try {
        await supabase
          .from('carousel_slides')
          .update(updates)
          .eq('id', slideId);
      } catch (err) {
        console.error('[CarouselVideoStep] updateSlideField error:', err);
      }
    },
    []
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleToggle = useCallback(
    (slideId: string, enabled: boolean) => {
      setSlides(prev =>
        prev.map(s => (s.id === slideId ? { ...s, videoToggle: enabled } : s))
      );
      updateSlideField(slideId, { video_toggle: enabled });
    },
    [updateSlideField]
  );

  const handlePresetChange = useCallback(
    (slideId: string, preset: VideoMotionPreset) => {
      setSlides(prev =>
        prev.map(s =>
          s.id === slideId ? { ...s, videoMotionPreset: preset } : s
        )
      );
      updateSlideField(slideId, { video_motion_preset: preset });
    },
    [updateSlideField]
  );

  const handleDurationChange = useCallback(
    (slideId: string, duration: number) => {
      setSlides(prev =>
        prev.map(s => (s.id === slideId ? { ...s, videoDuration: duration } : s))
      );
      updateSlideField(slideId, { video_duration: duration });
    },
    [updateSlideField]
  );

  const handleCustomPromptChange = useCallback(
    (slideId: string, prompt: string) => {
      setSlides(prev =>
        prev.map(s =>
          s.id === slideId ? { ...s, videoCustomPrompt: prompt } : s
        )
      );
      // Debounce DB update for text input — save on blur instead
    },
    []
  );

  const handleCustomPromptBlur = useCallback(
    (slideId: string) => {
      const slide = slidesRef.current.find(s => s.id === slideId);
      if (slide) {
        updateSlideField(slideId, {
          video_custom_prompt: slide.videoCustomPrompt,
        });
      }
    },
    [updateSlideField]
  );

  const handleGenerateSingle = useCallback(
    async (slideId: string) => {
      if (!user || !project.projectId) return;
      const slide = slidesRef.current.find(s => s.id === slideId);
      if (!slide || !slide.imageUrl) return;

      // Set generating state
      setJobs(prev => {
        const next = new Map(prev);
        next.set(slideId, {
          id: '',
          slideId,
          status: 1,
          videoUrl: null,
          errorMessage: null,
        });
        return next;
      });

      try {
        const { data, error } = await supabase.functions.invoke('generate-videos', {
          body: {
            action: 'create_jobs',
            order_id: project.projectId,
            carousel_mode: true,
            slides: [
              {
                slide_id: slide.id,
                image_url: slide.imageUrl,
                motion_preset: slide.videoMotionPreset || 'subtle_zoom',
                duration: slide.videoDuration || 8,
                custom_prompt: slide.videoCustomPrompt,
              },
            ],
          },
        });

        if (error) throw error;

        const createdJobs = data?.data?.jobs || [];
        if (createdJobs.length > 0) {
          const jobId = createdJobs[0].id;

          setJobs(prev => {
            const next = new Map(prev);
            next.set(slideId, {
              id: jobId,
              slideId,
              status: 1,
              videoUrl: null,
              errorMessage: null,
            });
            return next;
          });

          await supabase.functions.invoke('generate-videos', {
            body: { mode: 'process_single', job_id: jobId },
          });
          console.log(`[CarouselVideoStep] Single job submitted: ${jobId}`);
        }
      } catch (err) {
        console.error('[CarouselVideoStep] handleGenerateSingle error:', err);
        setJobs(prev => {
          const next = new Map(prev);
          next.set(slideId, {
            id: '',
            slideId,
            status: 3,
            videoUrl: null,
            errorMessage: 'Failed to submit job',
          });
          return next;
        });
      }
    },
    [user, project.projectId]
  );

  const handleGenerateAll = useCallback(async () => {
    if (!user || !project.projectId || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const slidesPayload = videoEnabledSlides.map(s => ({
        slide_id: s.id,
        image_url: s.imageUrl,
        motion_preset: s.videoMotionPreset || 'subtle_zoom',
        duration: s.videoDuration || 8,
        custom_prompt: s.videoCustomPrompt,
      }));

      const { data, error } = await supabase.functions.invoke('generate-videos', {
        body: {
          action: 'create_jobs',
          order_id: project.projectId,
          carousel_mode: true,
          slides: slidesPayload,
        },
      });

      if (error) throw error;

      const createdJobs = data?.data?.jobs || [];
      console.log(`[CarouselVideoStep] Created ${createdJobs.length} jobs`);

      // Set all as pending in local state
      setJobs(prev => {
        const next = new Map(prev);
        for (const j of createdJobs) {
          next.set(j.segment_id, {
            id: j.id,
            slideId: j.segment_id,
            status: 0,
            videoUrl: null,
            errorMessage: null,
          });
        }
        return next;
      });

      await submitPendingJobs();
    } catch (err) {
      console.error('[CarouselVideoStep] handleGenerateAll error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [user, project.projectId, isSubmitting, videoEnabledSlides, submitPendingJobs]);

  const handleContinueToPublish = useCallback(async () => {
    if (!project.id) return;
    try {
      await supabase
        .from('carousel_projects')
        .update({ status: 'video_ready' })
        .eq('id', project.id);
      onProjectUpdate();
      navigate(`/carousel-images/${project.projectId}/publish`);
    } catch (err) {
      console.error('[CarouselVideoStep] handleContinueToPublish error:', err);
    }
  }, [project.id, project.projectId, onProjectUpdate, navigate]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Video className="w-10 h-10 text-neutral-700 mb-3" />
        <p className="text-neutral-400 text-sm">No slides found.</p>
        <p className="text-neutral-600 text-xs mt-1">Generate images first in the Generate step.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Video Preview Modal */}
      {previewVideo && (
        <VideoPreviewModal
          videoUrl={previewVideo}
          onClose={() => setPreviewVideo(null)}
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0B0E14]/95 backdrop-blur-sm pb-4 -mx-1 px-1">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white mb-1">
              Video Conversion
            </h2>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-neutral-500 text-sm">
                {videoEnabledSlides.length} of {slides.length} slides enabled
                {videosCompleted > 0 &&
                  ` \u2022 ${videosCompleted}/${videoEnabledSlides.length} completed`}
                {videosFailed > 0 && (
                  <span className="text-red-400"> \u2022 {videosFailed} failed</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Cost estimate */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800">
              <DollarSign className="w-3.5 h-3.5 text-neutral-500" />
              <span className="text-xs text-neutral-400">
                {videoEnabledSlides.length} video{videoEnabledSlides.length !== 1 ? 's' : ''} ×
                ${COST_PER_VIDEO.toFixed(3)} ={' '}
                <span className="text-emerald-400 font-medium">
                  ${totalCost.toFixed(3)}
                </span>
              </span>
            </div>

            {/* Sync button */}
            <button
              onClick={syncJobStatusFromDB}
              className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-400 transition-colors"
              title="Sync status from server"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleGenerateAll}
            disabled={!canGenerateAll}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting || isAnyGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate All Videos
              </>
            )}
          </button>

          {allVideosDone && (
            <button
              onClick={handleContinueToPublish}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-medium transition-colors border border-neutral-700"
            >
              Continue to Publish
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* No images warning */}
      {slides.every(s => !s.imageUrl) && (
        <div className="mb-4 flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300">
            Generate images first before creating videos.
          </p>
        </div>
      )}

      {/* Slide cards grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-8">
        {slides.map(slide => (
          <SlideVideoCard
            key={slide.id}
            slide={slide}
            job={jobs.get(slide.id) || null}
            onToggle={handleToggle}
            onPresetChange={handlePresetChange}
            onDurationChange={handleDurationChange}
            onCustomPromptChange={handleCustomPromptChange}
            onCustomPromptBlur={handleCustomPromptBlur}
            onGenerate={handleGenerateSingle}
            onPlay={url => setPreviewVideo(url)}
            isGeneratingAll={isSubmitting || isAnyGenerating}
          />
        ))}
      </div>

      {/* Info footer */}
      <div className="mt-auto pt-4 border-t border-neutral-800/50">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-neutral-600">
            <Clock className="w-3.5 h-3.5" />
            <span>VEO 3.1 Fast HD (720p) — ~30-60s per video</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-neutral-600">
            <DollarSign className="w-3.5 h-3.5" />
            <span>$0.015 per video</span>
          </div>
        </div>
      </div>
    </div>
  );
};

