// ============================================================================
// Export Modal — Schedule posting, platform selection, and MP4 download
// ============================================================================

import React, { useState, useCallback } from 'react';
import { X, Download, Send, Calendar, Check, Clock, Loader2 } from 'lucide-react';
import { PlatformIcon } from '../../ui/platform-icons';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportMP4: () => void;
  isSaving: boolean;
  /** Video title for planner scheduling */
  videoTitle?: string;
  /** Thumbnail URL for planner entry */
  thumbnailUrl?: string;
  /** Order ID to link back to session */
  orderId?: string;
}

const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok', platform: 'tiktok' as const },
  { id: 'youtube', label: 'YouTube Shorts', platform: 'youtube' as const },
  { id: 'instagram', label: 'Instagram Reels', platform: 'instagram' as const },
] as const;

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExportMP4,
  isSaving,
  videoTitle,
  thumbnailUrl,
  orderId,
}) => {
  const { user } = useAuth();
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('12:00');
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  const togglePlatform = useCallback((platformId: string) => {
    setSelectedPlatforms(prev => {
      const next = new Set(prev);
      if (next.has(platformId)) next.delete(platformId);
      else next.add(platformId);
      return next;
    });
  }, []);

  const handleSchedule = useCallback(async () => {
    if (!user?.id || !scheduleDate || selectedPlatforms.size === 0) return;

    setIsScheduling(true);
    try {
      const { error } = await supabase
        .from('planned_content')
        .insert({
          user_id: user.id,
          title: videoTitle || 'Untitled Video',
          platforms: Array.from(selectedPlatforms),
          scheduled_date: scheduleDate,
          scheduled_time: scheduleTime,
          status: 'planned',
          content_type: 'video',
          thumbnail_url: thumbnailUrl || null,
          video_data: orderId ? { order_id: orderId } : {},
        });

      if (error) {
        console.error('[ExportModal] Schedule failed:', error.message);
      } else {
        setScheduleSuccess(true);
        setTimeout(() => {
          setScheduleSuccess(false);
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error('[ExportModal] Schedule error:', err);
    } finally {
      setIsScheduling(false);
    }
  }, [user?.id, scheduleDate, scheduleTime, selectedPlatforms, videoTitle, thumbnailUrl, orderId, onClose]);

  if (!isOpen) return null;

  // Default date to tomorrow
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#1E1E1E] border border-[#333] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#333]">
          <h2 className="text-base font-semibold text-white">Export Video</h2>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white transition-colors rounded-lg hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5">
          {/* Schedule Section (PRIMARY) */}
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
                    className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-neutral-700 bg-neutral-800 hover:border-neutral-600'
                    }`}
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
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors"
                    />
                  </div>
                  <div className="w-28">
                    <label className="block text-[10px] text-neutral-500 mb-1">Time</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Schedule Button */}
                <button
                  onClick={handleSchedule}
                  disabled={!scheduleDate || isScheduling || scheduleSuccess}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-emerald-500/20"
                >
                  {scheduleSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Scheduled!
                    </>
                  ) : isScheduling ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-3.5 h-3.5" />
                      Schedule Post
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-neutral-800" />

          {/* Download Section (SECONDARY) */}
          <div>
            <h3 className="text-xs text-neutral-400 uppercase tracking-wider font-medium mb-3">
              Download
            </h3>
            <button
              onClick={onExportMP4}
              disabled={isSaving}
              className="w-full flex items-center gap-3 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 rounded-xl border border-neutral-700 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg bg-neutral-700/50 flex items-center justify-center flex-shrink-0">
                <Download className="w-5 h-5 text-neutral-400 group-hover:text-neutral-200" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-neutral-300 group-hover:text-white transition-colors">
                  {isSaving ? 'Preparing...' : 'Export as MP4'}
                </p>
                <p className="text-[11px] text-neutral-500">
                  Download 9:16 video file to your device
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center px-5 py-4 border-t border-[#333] bg-[#1A1A1A]">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-sm font-medium transition-colors border border-neutral-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
