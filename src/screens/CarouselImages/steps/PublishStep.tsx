import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send, Calendar, Copy, RefreshCw, Check, Loader2, Hash, Type,
  Clock, Globe, Wand2, AlertCircle, CheckCircle, Link2, Settings,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { useBrandingKit } from '../../../hooks/useBrandingKit';
import type {
  CarouselProject, CarouselSlide, CarouselSlideRow,
} from '../../../types/carousel';
import { mapCarouselSlideRow } from '../../../types/carousel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Platform = 'instagram' | 'tiktok' | 'linkedin' | 'threads';

interface PlatformCaption {
  platform: Platform;
  caption: string;
  hashtags: string[];
  charLimit: number;
  hashtagLimit: number;
}

interface ScheduleEntry {
  platform: Platform;
  enabled: boolean;
  datetime: string; // ISO string for datetime-local input
}

type ScheduleMode = 'now' | 'schedule';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORM_SPECS: Record<Platform, {
  label: string;
  charLimit: number;
  hashtagLimit: number;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  tone: string;
}> = {
  instagram: {
    label: 'Instagram',
    charLimit: 2200,
    hashtagLimit: 30,
    color: 'pink',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    textColor: 'text-pink-400',
    tone: 'engaging, emoji-friendly, 5 line breaks recommended',
  },
  tiktok: {
    label: 'TikTok',
    charLimit: 4000,
    hashtagLimit: 5,
    color: 'cyan',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    textColor: 'text-cyan-400',
    tone: 'casual, punchy, trend-aware',
  },
  linkedin: {
    label: 'LinkedIn',
    charLimit: 3000,
    hashtagLimit: 5,
    color: 'blue',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-400',
    tone: 'professional, value-driven, thought leadership',
  },
  threads: {
    label: 'Threads',
    charLimit: 500,
    hashtagLimit: 3,
    color: 'neutral',
    bgColor: 'bg-neutral-500/10',
    borderColor: 'border-neutral-500/30',
    textColor: 'text-neutral-300',
    tone: 'conversational, concise, minimal hashtags',
  },
};

const PLATFORMS: Platform[] = ['instagram', 'tiktok', 'linkedin', 'threads'];

const TIMEZONES = [
  { value: 'Asia/Jakarta', label: 'WIB (UTC+7)' },
  { value: 'America/New_York', label: 'EST (UTC-5)' },
  { value: 'America/Los_Angeles', label: 'PST (UTC-8)' },
  { value: 'Europe/London', label: 'GMT (UTC+0)' },
  { value: 'Europe/Paris', label: 'CET (UTC+1)' },
  { value: 'Asia/Kolkata', label: 'IST (UTC+5:30)' },
  { value: 'Asia/Tokyo', label: 'JST (UTC+9)' },
  { value: 'Australia/Sydney', label: 'AEDT (UTC+11)' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countHashtags(text: string): number {
  const matches = text.match(/#\w+/g);
  return matches ? matches.length : 0;
}

function getCharCountColor(current: number, limit: number): string {
  const ratio = current / limit;
  if (ratio > 1) return 'text-red-400';
  if (ratio > 0.9) return 'text-amber-400';
  return 'text-neutral-500';
}

function getCharBarWidth(current: number, limit: number): number {
  return Math.min((current / limit) * 100, 100);
}

function getCharBarColor(current: number, limit: number): string {
  const ratio = current / limit;
  if (ratio > 1) return 'bg-red-500';
  if (ratio > 0.9) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function getDefaultDatetime(): string {
  // Default to 1 hour from now, rounded to nearest 15 min
  const d = new Date();
  d.setHours(d.getHours() + 1);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  // Format for datetime-local input: YYYY-MM-DDTHH:mm
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------------------------------------------------------------------------
// Platform Icon (simple SVG-based, no external dependency)
// ---------------------------------------------------------------------------

const PlatformIcon: React.FC<{ platform: Platform; className?: string }> = ({ platform, className = 'w-4 h-4' }) => {
  switch (platform) {
    case 'instagram':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.98a8.25 8.25 0 004.76 1.5V7.03a4.82 4.82 0 01-1-.34z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    case 'threads':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.186 24h-.007C5.461 23.956.057 18.509.007 11.773 .057 5.058 5.461-.388 12.179-.432h.007c4.474.03 8.48 2.463 10.584 6.112l-2.6 1.478C18.489 4.362 15.518 2.596 12.186 2.6 7.006 2.637 2.744 6.938 2.707 12.119c.037 5.158 4.299 9.459 9.479 9.481 3.978-.015 7.385-2.462 8.805-5.932l2.515 1.602C21.737 21.36 17.26 23.97 12.186 24z" />
        </svg>
      );
  }
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PublishStepProps {
  project: CarouselProject;
  onProjectUpdate: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PublishStep: React.FC<PublishStepProps> = ({ project, onProjectUpdate }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { kit: brandingKit } = useBrandingKit();

  // --- Slides data ---
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [loadingSlides, setLoadingSlides] = useState(true);

  // --- Caption state ---
  const [captions, setCaptions] = useState<Record<Platform, PlatformCaption>>(() => {
    const init = {} as Record<Platform, PlatformCaption>;
    for (const p of PLATFORMS) {
      init[p] = {
        platform: p,
        caption: '',
        hashtags: [],
        charLimit: PLATFORM_SPECS[p].charLimit,
        hashtagLimit: PLATFORM_SPECS[p].hashtagLimit,
      };
    }
    return init;
  });
  const [activePlatform, setActivePlatform] = useState<Platform>('instagram');
  const [generating, setGenerating] = useState(false);
  const [adapting, setAdapting] = useState<Platform | null>(null);
  const [captionsGenerated, setCaptionsGenerated] = useState(false);
  const [copiedPlatform, setCopiedPlatform] = useState<Platform | null>(null);

  // --- Schedule state ---
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('now');
  const [timezone, setTimezone] = useState('Asia/Jakarta');
  const [scheduleEntries, setScheduleEntries] = useState<Record<Platform, ScheduleEntry>>(() => {
    const defaultDt = getDefaultDatetime();
    const init = {} as Record<Platform, ScheduleEntry>;
    for (const p of PLATFORMS) {
      init[p] = { platform: p, enabled: p === 'instagram', datetime: defaultDt };
    }
    return init;
  });

  // --- Action state ---
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);
  const [completing, setCompleting] = useState(false);

  // --- Error ---
  const [error, setError] = useState<string | null>(null);

  // Textarea ref for auto-resize
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ---------------------------------------------------------------------------
  // Fetch slides for context
  // ---------------------------------------------------------------------------

  const fetchSlides = useCallback(async () => {
    setLoadingSlides(true);
    const { data, error: fetchErr } = await supabase
      .from('carousel_slides')
      .select('*')
      .eq('project_id', project.id)
      .order('slide_index');

    if (!fetchErr && data) {
      setSlides(data.map((row: CarouselSlideRow) => mapCarouselSlideRow(row)));
    }
    setLoadingSlides(false);
  }, [project.id]);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [captions, activePlatform]);

  // ---------------------------------------------------------------------------
  // Generate Captions (real edge function call)
  // ---------------------------------------------------------------------------

  const handleGenerateCaptions = useCallback(async () => {
    if (!user || slides.length === 0) return;
    setGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-carousel-captions', {
        body: {
          project_id: project.id,
          slides: slides.map(s => ({
            slide_type: s.slideType,
            topic: s.analysisData?.topic || '',
            text_content: s.analysisData?.textContent || [],
          })),
          branding: {
            handle: brandingKit?.handleText || null,
            hashtags: brandingKit?.textPresets?.cta ? [] : [],
          },
          language: 'english',
          platforms: PLATFORMS,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to generate captions');
      }

      if (!data?.success || !data?.data?.captions) {
        throw new Error(data?.error?.message || 'No captions returned');
      }

      // Map response to state
      const newCaptions = { ...captions };
      for (const platform of PLATFORMS) {
        const pc = data.data.captions[platform];
        if (pc) {
          newCaptions[platform] = {
            ...newCaptions[platform],
            caption: pc.caption || '',
            hashtags: pc.hashtags || [],
          };
        }
      }
      setCaptions(newCaptions);
      setCaptionsGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate captions');
    } finally {
      setGenerating(false);
    }
  }, [user, slides, project.id, brandingKit, captions]);

  // ---------------------------------------------------------------------------
  // Adapt caption to different platform
  // ---------------------------------------------------------------------------

  const handleAdaptCaption = useCallback(async (targetPlatform: Platform) => {
    if (!user) return;
    const sourceCaption = captions[activePlatform].caption;
    if (!sourceCaption.trim()) return;

    setAdapting(targetPlatform);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-carousel-captions', {
        body: {
          project_id: project.id,
          slides: slides.map(s => ({
            slide_type: s.slideType,
            topic: s.analysisData?.topic || '',
            text_content: s.analysisData?.textContent || [],
          })),
          branding: {
            handle: brandingKit?.handleText || null,
          },
          language: 'english',
          platforms: [targetPlatform],
          source_caption: sourceCaption,
          adapt_from: activePlatform,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to adapt caption');
      }

      if (data?.success && data?.data?.captions?.[targetPlatform]) {
        const adapted = data.data.captions[targetPlatform];
        setCaptions(prev => ({
          ...prev,
          [targetPlatform]: {
            ...prev[targetPlatform],
            caption: adapted.caption || '',
            hashtags: adapted.hashtags || [],
          },
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to adapt caption');
    } finally {
      setAdapting(null);
    }
  }, [user, captions, activePlatform, project.id, slides, brandingKit]);

  // ---------------------------------------------------------------------------
  // Caption editing
  // ---------------------------------------------------------------------------

  const handleCaptionChange = useCallback((platform: Platform, value: string) => {
    setCaptions(prev => ({
      ...prev,
      [platform]: { ...prev[platform], caption: value },
    }));
  }, []);

  const handleCopyCaption = useCallback(async (platform: Platform) => {
    const text = captions[platform].caption;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPlatform(platform);
      setTimeout(() => setCopiedPlatform(null), 2000);
    } catch {
      // Fallback
    }
  }, [captions]);

  // ---------------------------------------------------------------------------
  // Schedule toggles
  // ---------------------------------------------------------------------------

  const handleScheduleToggle = useCallback((platform: Platform) => {
    setScheduleEntries(prev => ({
      ...prev,
      [platform]: { ...prev[platform], enabled: !prev[platform].enabled },
    }));
  }, []);

  const handleDatetimeChange = useCallback((platform: Platform, value: string) => {
    setScheduleEntries(prev => ({
      ...prev,
      [platform]: { ...prev[platform], datetime: value },
    }));
  }, []);

  // ---------------------------------------------------------------------------
  // Send to Queue / Post Now
  // ---------------------------------------------------------------------------

  const enabledPlatforms = PLATFORMS.filter(p => scheduleEntries[p].enabled);

  const handleSendToQueue = useCallback(async () => {
    if (!user || enabledPlatforms.length === 0) return;
    setSubmitting(true);
    setSubmitResult(null);
    setError(null);

    try {
      const posts = enabledPlatforms.map(platform => ({
        user_id: user.id,
        project_id: project.id,
        project_type: 'carousel',
        platform,
        caption: captions[platform].caption,
        media_type: 'carousel',
        status: scheduleMode === 'now' ? 'queued' : 'scheduled',
        scheduled_at: scheduleMode === 'schedule'
          ? new Date(scheduleEntries[platform].datetime).toISOString()
          : null,
        timezone,
        metadata: {
          slide_count: slides.length,
          hashtag_count: countHashtags(captions[platform].caption),
        },
      }));

      // Try inserting into scheduled_posts table
      // This may fail gracefully if the table doesn't exist yet (Phase 3)
      const { error: insertError } = await supabase
        .from('scheduled_posts')
        .insert(posts);

      if (insertError) {
        // If table doesn't exist, show a friendly message
        if (insertError.message.includes('does not exist') || insertError.code === '42P01') {
          setSubmitResult({
            success: true,
            message: `${enabledPlatforms.length} post(s) prepared. Scheduling will be available once social accounts are connected (Settings > Social Accounts).`,
          });
        } else {
          throw new Error(insertError.message);
        }
      } else {
        const modeLabel = scheduleMode === 'now' ? 'queued for posting' : 'scheduled';
        setSubmitResult({
          success: true,
          message: `${enabledPlatforms.length} post(s) ${modeLabel} successfully!`,
        });
      }
    } catch (err) {
      setSubmitResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to queue posts',
      });
    } finally {
      setSubmitting(false);
    }
  }, [user, enabledPlatforms, project.id, captions, scheduleMode, scheduleEntries, timezone, slides.length]);

  // ---------------------------------------------------------------------------
  // Mark as Complete
  // ---------------------------------------------------------------------------

  const handleMarkComplete = useCallback(async () => {
    setCompleting(true);
    setError(null);

    try {
      const { error: updateErr } = await supabase
        .from('carousel_projects')
        .update({ status: 'complete' })
        .eq('id', project.id);

      if (updateErr) throw new Error(updateErr.message);
      onProjectUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as complete');
    } finally {
      setCompleting(false);
    }
  }, [project.id, onProjectUpdate]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const activeCaption = captions[activePlatform];
  const charCount = activeCaption.caption.length;
  const hashtagCount = countHashtags(activeCaption.caption);
  const spec = PLATFORM_SPECS[activePlatform];

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-100">Publish & Schedule</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Generate platform-optimized captions and schedule your carousel posts.
          </p>
        </div>
        {slides.length > 0 && (
          <span className="text-xs text-neutral-500">
            {slides.length} slide{slides.length !== 1 ? 's' : ''} ready
          </span>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* ================================================================== */}
      {/* CAPTION SECTION */}
      {/* ================================================================== */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        {/* Section header + Generate button */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-medium text-neutral-200">Captions</h3>
          </div>
          <button
            onClick={handleGenerateCaptions}
            disabled={generating || loadingSlides || slides.length === 0}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-700 disabled:text-neutral-500 text-white text-xs font-medium rounded-lg transition-colors"
          >
            {generating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                {captionsGenerated ? 'Regenerate Captions' : 'Generate Captions'}
              </>
            )}
          </button>
        </div>

        {/* Platform tabs */}
        <div className="flex border-b border-neutral-800">
          {PLATFORMS.map(platform => {
            const pSpec = PLATFORM_SPECS[platform];
            const isActive = activePlatform === platform;
            const hasContent = captions[platform].caption.length > 0;

            return (
              <button
                key={platform}
                onClick={() => setActivePlatform(platform)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors relative
                  ${isActive
                    ? `${pSpec.textColor} bg-neutral-800/50`
                    : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800/30'
                  }
                `}
              >
                <PlatformIcon platform={platform} className="w-4 h-4" />
                <span>{pSpec.label}</span>
                {hasContent && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
                {isActive && (
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                    platform === 'instagram' ? 'bg-pink-500' :
                    platform === 'tiktok' ? 'bg-cyan-500' :
                    platform === 'linkedin' ? 'bg-blue-500' :
                    'bg-neutral-400'
                  }`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Caption editor */}
        <div className="p-4">
          {/* Platform spec hint */}
          <div className="flex items-center gap-3 mb-3">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${spec.bgColor} ${spec.textColor} border ${spec.borderColor}`}>
              {spec.label}
            </span>
            <span className="text-xs text-neutral-500">
              {spec.charLimit.toLocaleString()} chars max &middot; {spec.hashtagLimit} hashtags &middot; {spec.tone}
            </span>
          </div>

          {/* Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={activeCaption.caption}
              onChange={(e) => handleCaptionChange(activePlatform, e.target.value)}
              placeholder={
                captionsGenerated
                  ? 'Caption will appear here...'
                  : `Click "Generate Captions" to create ${spec.label}-optimized copy...`
              }
              rows={6}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-sm text-neutral-200 placeholder-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors resize-none min-h-[160px]"
              style={{ overflow: 'hidden' }}
            />
          </div>

          {/* Stats bar */}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Char count */}
              <div className="flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-neutral-500" />
                <span className={`text-xs font-mono ${getCharCountColor(charCount, spec.charLimit)}`}>
                  {charCount.toLocaleString()}/{spec.charLimit.toLocaleString()}
                </span>
              </div>

              {/* Hashtag count */}
              <div className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-neutral-500" />
                <span className={`text-xs font-mono ${
                  hashtagCount > spec.hashtagLimit ? 'text-red-400' :
                  hashtagCount > spec.hashtagLimit * 0.8 ? 'text-amber-400' :
                  'text-neutral-500'
                }`}>
                  {hashtagCount}/{spec.hashtagLimit}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {/* Adapt button — convert from another platform */}
              {captionsGenerated && (
                <button
                  onClick={() => handleAdaptCaption(activePlatform)}
                  disabled={adapting === activePlatform || !activeCaption.caption.trim()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-300 text-xs rounded-md transition-colors border border-neutral-700"
                >
                  {adapting === activePlatform ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  Adapt
                </button>
              )}

              {/* Copy button */}
              <button
                onClick={() => handleCopyCaption(activePlatform)}
                disabled={!activeCaption.caption.trim()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-300 text-xs rounded-md transition-colors border border-neutral-700"
              >
                {copiedPlatform === activePlatform ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Char count progress bar */}
          <div className="mt-2 h-1 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${getCharBarColor(charCount, spec.charLimit)}`}
              style={{ width: `${getCharBarWidth(charCount, spec.charLimit)}%` }}
            />
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SCHEDULE SECTION */}
      {/* ================================================================== */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-neutral-800">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-medium text-neutral-200">Schedule</h3>
        </div>

        <div className="p-4 space-y-4">
          {/* Post Now / Schedule toggle */}
          <div className="flex items-center gap-1 p-0.5 bg-neutral-800 rounded-lg w-fit">
            <button
              onClick={() => setScheduleMode('now')}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                scheduleMode === 'now'
                  ? 'bg-emerald-500 text-white'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Post Now
            </button>
            <button
              onClick={() => setScheduleMode('schedule')}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                scheduleMode === 'schedule'
                  ? 'bg-emerald-500 text-white'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Schedule
            </button>
          </div>

          {/* Platform checkboxes + datetime */}
          <div className="space-y-3">
            {PLATFORMS.map(platform => {
              const pSpec = PLATFORM_SPECS[platform];
              const entry = scheduleEntries[platform];
              const hasCaption = captions[platform].caption.trim().length > 0;

              return (
                <div
                  key={platform}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    entry.enabled
                      ? `${pSpec.bgColor} ${pSpec.borderColor}`
                      : 'bg-neutral-800/30 border-neutral-800'
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => handleScheduleToggle(platform)}
                    className={`w-5 h-5 rounded flex items-center justify-center border transition-colors flex-shrink-0 ${
                      entry.enabled
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-neutral-600 hover:border-neutral-500'
                    }`}
                  >
                    {entry.enabled && <Check className="w-3 h-3 text-white" />}
                  </button>

                  {/* Platform info */}
                  <div className="flex items-center gap-2 min-w-[120px]">
                    <PlatformIcon platform={platform} className={`w-4 h-4 ${entry.enabled ? pSpec.textColor : 'text-neutral-500'}`} />
                    <span className={`text-sm font-medium ${entry.enabled ? 'text-neutral-200' : 'text-neutral-500'}`}>
                      {pSpec.label}
                    </span>
                    {!hasCaption && entry.enabled && (
                      <span className="text-xs text-amber-400">No caption</span>
                    )}
                  </div>

                  {/* Account selector placeholder */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-800/60 rounded-md border border-neutral-700/50 text-xs text-neutral-500 cursor-not-allowed">
                    <Link2 className="w-3 h-3" />
                    <span>Connect account</span>
                  </div>

                  {/* Datetime picker (schedule mode only) */}
                  {scheduleMode === 'schedule' && entry.enabled && (
                    <div className="ml-auto flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-neutral-500" />
                      <input
                        type="datetime-local"
                        value={entry.datetime}
                        onChange={(e) => handleDatetimeChange(platform, e.target.value)}
                        className="bg-neutral-800 border border-neutral-700 rounded-md px-2 py-1 text-xs text-neutral-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none [color-scheme:dark]"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Connect accounts hint */}
          <div className="flex items-center gap-2 p-3 bg-neutral-800/50 rounded-lg border border-neutral-700/30">
            <Settings className="w-4 h-4 text-neutral-500 flex-shrink-0" />
            <p className="text-xs text-neutral-500">
              Social accounts not connected yet.{' '}
              <button
                onClick={() => navigate('/settings/social-accounts')}
                className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
              >
                Connect accounts in Settings
              </button>{' '}
              to enable direct posting and scheduling.
            </p>
          </div>

          {/* Timezone selector (schedule mode) */}
          {scheduleMode === 'schedule' && (
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-neutral-500" />
              <label className="text-xs text-neutral-400">Timezone:</label>
              <div className="relative">
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="appearance-none bg-neutral-800 border border-neutral-700 rounded-md pl-3 pr-7 py-1.5 text-xs text-neutral-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none cursor-pointer"
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-500 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* SUBMIT RESULT */}
      {/* ================================================================== */}
      {submitResult && (
        <div className={`flex items-center gap-2 p-3 rounded-lg border ${
          submitResult.success
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : 'bg-red-500/10 border-red-500/20'
        }`}>
          {submitResult.success ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          )}
          <p className={`text-sm ${submitResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
            {submitResult.message}
          </p>
        </div>
      )}

      {/* ================================================================== */}
      {/* ACTION BAR */}
      {/* ================================================================== */}
      <div className="flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-xl">
        <button
          onClick={handleMarkComplete}
          disabled={completing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-300 text-sm font-medium rounded-lg transition-colors border border-neutral-700"
        >
          {completing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Mark as Complete
        </button>

        <button
          onClick={handleSendToQueue}
          disabled={submitting || enabledPlatforms.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-700 disabled:text-neutral-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              {scheduleMode === 'now' ? 'Send to Queue' : 'Schedule Posts'}
              {enabledPlatforms.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                  {enabledPlatforms.length}
                </span>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
