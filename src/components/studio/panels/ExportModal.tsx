// ============================================================================
// Export Modal — Schedule posting + auto-combine video segments via VPS FFmpeg
// When user clicks "Schedule Post", it saves to planned_content AND triggers
// video combining. Download is available in the Planner Detail modal.
// ============================================================================

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, Calendar, Check, Loader2, AlertCircle } from 'lucide-react';
import { PlatformIcon } from '../../ui/platform-icons';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { apiEndpoints, API_KEY } from '../../../lib/api';

export type ExportStatus = 'idle' | 'scheduling' | 'combining' | 'polling' | 'done' | 'error';

export interface VideoSegmentForCombine {
  segment_id: string;
  segment_number: number;
  segment_type: string;
  video_url: string;
  duration_seconds: number;
  script_text?: string | null;
  emotion?: string;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Video title for planner scheduling */
  videoTitle?: string;
  /** Video description */
  videoDescription?: string;
  /** Thumbnail URL for planner entry */
  thumbnailUrl?: string;
  /** Order ID to link back to session */
  orderId?: string;
  /** Session ID for combine API */
  sessionId?: string;
  /** Video segments ready for combining */
  segments: VideoSegmentForCombine[];
}

const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok', platform: 'tiktok' as const },
  { id: 'youtube', label: 'YouTube Shorts', platform: 'youtube' as const },
  { id: 'instagram', label: 'Instagram Reels', platform: 'instagram' as const },
] as const;

const POLL_INTERVAL = 5000; // 5 seconds
const MAX_POLL_ATTEMPTS = 150; // 12.5 minutes max

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  videoTitle,
  videoDescription,
  thumbnailUrl,
  orderId,
  sessionId,
  segments,
}) => {
  const { user } = useAuth();
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [scheduleTime, setScheduleTime] = useState('12:00');

  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStep, setProgressStep] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const plannedContentIdRef = useRef<string | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const togglePlatform = useCallback((platformId: string) => {
    setSelectedPlatforms(prev => {
      const next = new Set(prev);
      if (next.has(platformId)) next.delete(platformId);
      else next.add(platformId);
      return next;
    });
  }, []);

  const getProgressText = (attempts: number): string => {
    if (attempts < 3) return 'Downloading video segments...';
    if (attempts < 8) return 'Normalizing video formats...';
    if (attempts < 15) return 'Applying transitions...';
    if (attempts < 22) return 'Processing audio...';
    if (attempts < 35) return 'Encoding final video...';
    if (attempts < 55) return 'Finalizing video...';
    return 'Almost done...';
  };

  const startPolling = useCallback((jobId: string) => {
    let attempts = 0;

    pollRef.current = setInterval(async () => {
      attempts++;

      const progressFromAttempts = Math.min(20 + (attempts * 1.2), 90);
      setProgressPercent(Math.round(progressFromAttempts));
      setProgressStep(getProgressText(attempts));

      if (attempts > MAX_POLL_ATTEMPTS) {
        if (pollRef.current) clearInterval(pollRef.current);
        setExportStatus('error');
        setExportError('Video processing timeout. Please check Planner later.');
        return;
      }

      try {
        const response = await fetch(apiEndpoints.jobStatus(jobId), {
          headers: { 'x-api-key': API_KEY },
        });

        if (!response.ok) return;

        const data = await response.json();
        const jobData = data?.data;

        if (jobData?.progress_percentage) {
          setProgressPercent(jobData.progress_percentage);
        }
        if (jobData?.current_step) {
          setProgressStep(jobData.current_step);
        }

        // Completed or partial success
        if ((jobData?.status === 'completed' || jobData?.status === 'partial') && jobData?.final_video_url) {
          if (pollRef.current) clearInterval(pollRef.current);
          setProgressPercent(100);
          setProgressStep('Video ready!');
          setExportStatus('done');

          // Update planned_content with final_video_url
          if (plannedContentIdRef.current) {
            await supabase
              .from('planned_content')
              .update({
                final_video_url: jobData.final_video_url,
                status: 'planned',
                video_data: {
                  order_id: orderId,
                  job_id: jobId,
                  duration_seconds: jobData?.metadata?.duration_seconds,
                  file_size_mb: jobData?.metadata?.file_size_mb,
                  resolution: jobData?.metadata?.resolution,
                },
              })
              .eq('id', plannedContentIdRef.current);
          }

          // Auto-close after 2 seconds
          setTimeout(() => {
            resetState();
            onClose();
          }, 2000);
        } else if (jobData?.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
          setExportStatus('error');
          setExportError(jobData?.error_message || 'Video processing failed');
        }
      } catch {
        // Polling error — continue retrying
      }
    }, POLL_INTERVAL);
  }, [orderId, onClose]);

  const resetState = useCallback(() => {
    setExportStatus('idle');
    setProgressPercent(0);
    setProgressStep('');
    setExportError(null);
    setSelectedPlatforms(new Set());
    plannedContentIdRef.current = null;
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const handleScheduleAndCombine = useCallback(async () => {
    if (!user?.id || !scheduleDate || selectedPlatforms.size === 0) return;
    if (segments.length === 0) {
      setExportError('No video segments available to combine.');
      return;
    }

    // Check all segments have video URLs
    const missingVideos = segments.filter(s => !s.video_url);
    if (missingVideos.length > 0) {
      setExportError(`${missingVideos.length} segments are missing video URLs. Please generate videos first.`);
      return;
    }

    setExportStatus('scheduling');
    setProgressStep('Saving to planner...');
    setProgressPercent(5);
    setExportError(null);

    try {
      // Step 1: Insert into planned_content
      const { data: plannedData, error: insertError } = await supabase
        .from('planned_content')
        .insert({
          user_id: user.id,
          title: videoTitle || 'Untitled Video',
          description: videoDescription || '',
          platforms: Array.from(selectedPlatforms),
          scheduled_date: scheduleDate,
          scheduled_time: scheduleTime,
          status: 'combining',
          content_type: 'video',
          thumbnail_url: thumbnailUrl || null,
          video_data: { order_id: orderId, segments_count: segments.length },
        })
        .select('id')
        .single();

      if (insertError) {
        throw new Error('Failed to save to planner: ' + insertError.message);
      }

      plannedContentIdRef.current = plannedData.id;
      setProgressStep('Starting video combine...');
      setProgressPercent(10);

      // Step 2: Trigger video combine via VPS
      setExportStatus('combining');

      const requestBody = {
        project_id: orderId || 'project_' + Date.now(),
        session_id: sessionId || orderId || 'session_' + Date.now(),
        segments: segments,
        options: {
          enable_transitions: true,
          transition_duration: 0.5,
          enable_subtitles: false,
          subtitle_style: 'tiktok',
          word_by_word: true,
          enable_bgm: false,
          music_url: null,
          bgm_volume: 0.20,
          duck_during_speech: true,
          normalize_audio: true,
        },
      };

      const response = await fetch(apiEndpoints.combineVideo, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error('Backend error: ' + response.status + ' - ' + errorText);
      }

      const data = await response.json();

      if (!data.success || !data.data?.job_id) {
        throw new Error('Failed to create combine job');
      }

      // Step 3: Start polling
      setExportStatus('polling');
      setProgressStep('Downloading video segments...');
      setProgressPercent(20);
      startPolling(data.data.job_id);
    } catch (err) {
      console.error('[ExportModal] Schedule + combine error:', err);
      setExportStatus('error');
      setExportError(err instanceof Error ? err.message : 'Failed to schedule and combine');

      // If we created a planned_content row but combine failed, update its status
      if (plannedContentIdRef.current) {
        await supabase
          .from('planned_content')
          .update({ status: 'failed' })
          .eq('id', plannedContentIdRef.current);
      }
    }
  }, [user?.id, scheduleDate, scheduleTime, selectedPlatforms, videoTitle, videoDescription, thumbnailUrl, orderId, sessionId, segments, startPolling]);

  if (!isOpen) return null;

  const isBusy = exportStatus === 'scheduling' || exportStatus === 'combining' || exportStatus === 'polling';
  const minDateStr = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={isBusy ? undefined : onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#1E1E1E] border border-[#333] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#333]">
          <h2 className="text-base font-semibold text-white">Export Video</h2>
          {!isBusy && (
            <button
              onClick={onClose}
              className="p-1 text-neutral-400 hover:text-white transition-colors rounded-lg hover:bg-neutral-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5">
          {/* Schedule Section */}
          <div>
            <h3 className="text-xs text-neutral-400 uppercase tracking-wider font-medium mb-3">
              Schedule Posting
            </h3>

            {/* Platform Selection */}
            <div className="flex gap-2 mb-4">
              {PLATFORMS.map((p) => {
                const isSelected = selectedPlatforms.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    disabled={isBusy}
                    className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-neutral-700 bg-neutral-800 hover:border-neutral-600'
                    } ${isBusy ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <div className="relative">
                      <PlatformIcon platform={p.platform} size="md" />
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center">
                          <Check className="w-2 h-2 text-white" />
                        </div>
                      )}
                    </div>
                    <span className={`text-[10px] font-medium ${
                      isSelected ? 'text-emerald-400' : 'text-neutral-400'
                    }`}>
                      {p.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Date & Time Picker */}
            {selectedPlatforms.size > 0 && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] text-neutral-500 mb-1">Date</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      min={minDateStr}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      disabled={isBusy}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors disabled:opacity-50"
                    />
                  </div>
                  <div className="w-28">
                    <label className="block text-[10px] text-neutral-500 mb-1">Time</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      disabled={isBusy}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Progress UI */}
                {isBusy && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-emerald-400 animate-spin flex-shrink-0" />
                      <span className="text-xs text-emerald-400 font-medium">{progressStep}</span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-neutral-500 text-right">{progressPercent}%</p>
                  </div>
                )}

                {/* Success */}
                {exportStatus === 'done' && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-emerald-400 font-medium">
                      Scheduled & video combined! Check Planner to download.
                    </span>
                  </div>
                )}

                {/* Error */}
                {exportStatus === 'error' && exportError && (
                  <div className="flex items-start gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-red-400">{exportError}</span>
                  </div>
                )}

                {/* Schedule + Combine Button */}
                <button
                  onClick={handleScheduleAndCombine}
                  disabled={!scheduleDate || isBusy || exportStatus === 'done'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-emerald-500/20"
                >
                  {exportStatus === 'done' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Scheduled!
                    </>
                  ) : isBusy ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {exportStatus === 'scheduling' ? 'Saving...' : 'Combining video...'}
                    </>
                  ) : (
                    <>
                      <Calendar className="w-3.5 h-3.5" />
                      Schedule Post
                    </>
                  )}
                </button>

                {segments.length === 0 && (
                  <p className="text-[10px] text-amber-400 text-center">
                    No video segments available. Generate videos first before scheduling.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center px-5 py-4 border-t border-[#333] bg-[#1A1A1A]">
          <button
            onClick={isBusy ? undefined : onClose}
            disabled={isBusy}
            className="w-full px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-300 rounded-xl text-sm font-medium transition-colors border border-neutral-700"
          >
            {isBusy ? 'Processing...' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
