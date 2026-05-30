import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Instagram, Upload, Link2,
  Loader2, ImageIcon, ChevronRight, X, ExternalLink, Trash2, AlertCircle,
  CheckCircle2, ShieldAlert, RotateCcw, Eye, Info, Globe
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import type {
  CarouselProject, CarouselSourceUrl, CarouselSourceUrlRow, CarouselLanguage, CarouselLanguageSettings,
} from '../../../types/carousel';
import { mapCarouselSourceUrlRow, CAROUSEL_LANGUAGES, DEFAULT_LANGUAGE_SETTINGS } from '../../../types/carousel';

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid' | 'unverifiable';

interface ValidationResult {
  status: ValidationStatus;
  slide_type?: string | null;
  claim?: string | null;
  claim_type?: string | null;
  needs_verification?: boolean;
  reason?: string | null;
  evidence?: string | null;
  source_url?: string | null;
  confidence?: number;
  confirmed?: boolean; // user clicked "keep anyway" on an invalid/unverifiable slide
}

interface SourceStepProps {
  project: CarouselProject;
  onProjectUpdate: () => void;
}

export const SourceStep: React.FC<SourceStepProps> = ({ project, onProjectUpdate }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [sourceUrls, setSourceUrls] = useState<CarouselSourceUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [urlInput, setUrlInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Language setting — persisted to localStorage as default for new projects
  const LANG_STORAGE_KEY = 'sparkfluence_carousel_language';
  const [languageSettings, setLanguageSettings] = useState<CarouselLanguageSettings>(() => {
    // Priority: project settings > localStorage > default
    if (project.settings?.language) return project.settings.language;
    try {
      const cached = localStorage.getItem(LANG_STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return DEFAULT_LANGUAGE_SETTINGS;
  });

  const updateLanguage = (update: Partial<CarouselLanguageSettings>) => {
    setLanguageSettings(prev => {
      const next = { ...prev, ...update };
      localStorage.setItem(LANG_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Validation state — keyed by `${sourceId}-${imageIndex}`
  // Persisted to localStorage so status survives browser refresh
  const validationCacheKey = `sparkfluence_carousel_validation_${project.projectId}`;

  const [validationMap, setValidationMap] = useState<Record<string, ValidationResult>>(() => {
    try {
      const cached = localStorage.getItem(validationCacheKey);
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  });
  const [activeConflict, setActiveConflict] = useState<{
    key: string;
    imageUrl: string;
    result: ValidationResult;
  } | null>(null);
  // Image detail popup modal
  const [detailModal, setDetailModal] = useState<{
    imageUrl: string;
    slideIndex: number;
    result?: ValidationResult;
  } | null>(null);
  // Track keys already validated — includes cached keys from localStorage
  const validatedKeysRef = useRef<Set<string>>((() => {
    try {
      const cached = localStorage.getItem(validationCacheKey);
      return cached ? new Set(Object.keys(JSON.parse(cached))) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  })());
  const validatingRef = useRef(false);
  // Always-current snapshot of sourceUrls — read by the validation loop
  const sourceUrlsRef = useRef<CarouselSourceUrl[]>([]);

  // Fetch sources and auto-clean any legacy failed rows
  const fetchSources = useCallback(async () => {
    if (!project.id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('carousel_source_urls')
      .select('*')
      .eq('project_id', project.id)
      .order('source_order', { ascending: true });

    if (!error && data) {
      // Auto-clean failed rows left from previous sessions
      const failedIds = data.filter((r: any) => r.scrape_status === 'failed').map((r: any) => r.id);
      if (failedIds.length > 0) {
        await supabase.from('carousel_source_urls').delete().in('id', failedIds);
      }
      const clean = data.filter((r: any) => r.scrape_status !== 'failed');
      setSourceUrls(clean.map((row: CarouselSourceUrlRow) => mapCarouselSourceUrlRow(row)));
    }

    setLoading(false);
  }, [project.id]);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  // Keep sourceUrlsRef in sync so the validation loop always sees the latest sources
  useEffect(() => {
    sourceUrlsRef.current = sourceUrls;
  }, [sourceUrls]);

  // Persist validationMap to localStorage on every change
  useEffect(() => {
    // Only persist non-empty maps with settled statuses (not mid-validating)
    const hasSettled = Object.values(validationMap).some(v => v.status !== 'validating');
    if (Object.keys(validationMap).length > 0 && hasSettled) {
      localStorage.setItem(validationCacheKey, JSON.stringify(validationMap));
    }
  }, [validationMap, validationCacheKey]);

  // Validate a single slide — used by both auto-validate and manual retry
  const validateSingle = useCallback(async (key: string, url: string) => {
    setValidationMap(prev => ({ ...prev, [key]: { status: 'validating' } }));

    try {
      // 30s timeout to prevent stuck "Checking..." state
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const { data, error } = await supabase.functions.invoke('validate-slide-content', {
        body: { image_url: url },
      });
      clearTimeout(timeout);

      if (error || !data?.success) {
        setValidationMap(prev => ({ ...prev, [key]: { status: 'unverifiable' } }));
      } else {
        const d = data.data;
        setValidationMap(prev => ({
          ...prev,
          [key]: {
            status: d.status as ValidationStatus,
            slide_type: d.slide_type,
            claim: d.claim,
            claim_type: d.claim_type,
            needs_verification: d.needs_verification,
            reason: d.reason,
            evidence: d.evidence,
            source_url: d.source_url,
            confidence: d.confidence,
          },
        }));
      }
    } catch {
      setValidationMap(prev => ({ ...prev, [key]: { status: 'unverifiable' } }));
    }
  }, []);

  // Auto-validate images — re-scans for new images after each validation
  // so progressively-loaded images are picked up without missing any
  const runValidation = useCallback(async () => {
    if (validatingRef.current) return;
    validatingRef.current = true;

    // Mark all currently-known pending images as 'validating' upfront
    const markPendingAsValidating = () => {
      const toMark: string[] = [];
      for (const src of sourceUrlsRef.current) {
        if (!src.mediaUrls) continue;
        src.mediaUrls.forEach((_, idx) => {
          const key = `${src.id}-${idx}`;
          if (!validatedKeysRef.current.has(key)) toMark.push(key);
        });
      }
      if (toMark.length > 0) {
        setValidationMap(prev => {
          const updated = { ...prev };
          for (const key of toMark) {
            if (!updated[key] || updated[key].status === 'idle') {
              updated[key] = { status: 'validating' };
            }
          }
          return updated;
        });
      }
    };

    markPendingAsValidating();

    // While loop: re-scan sourceUrlsRef each iteration to pick up newly-added images
    let idle = 0;
    while (validatingRef.current) {
      // Find next un-validated image
      let next: { key: string; url: string } | null = null;
      for (const src of sourceUrlsRef.current) {
        if (!src.mediaUrls) continue;
        for (let idx = 0; idx < src.mediaUrls.length; idx++) {
          const key = `${src.id}-${idx}`;
          if (!validatedKeysRef.current.has(key)) {
            next = { key, url: src.mediaUrls[idx].url };
            break;
          }
        }
        if (next) break;
      }

      if (!next) {
        // No pending images — wait briefly then re-check (new images might be loading)
        idle++;
        if (idle >= 3) break; // 3 consecutive empty scans = done
        await new Promise(r => setTimeout(r, 500));
        markPendingAsValidating();
        continue;
      }

      idle = 0;
      validatedKeysRef.current.add(next.key);
      await validateSingle(next.key, next.url);
      markPendingAsValidating(); // mark any newly-added images
      await new Promise(r => setTimeout(r, 300));
    }

    validatingRef.current = false;
  }, [validateSingle]);

  // Manual retry for a single slide
  const handleRetryValidation = useCallback((key: string, url: string) => {
    validateSingle(key, url);
  }, [validateSingle]);

  // Trigger validation when sources load
  useEffect(() => {
    if (!loading && sourceUrls.length > 0) {
      runValidation();
    }
  }, [loading, sourceUrls, runValidation]);

  const parseIgShortcode = (url: string): string | null => {
    const match = url.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
  };

  // Placeholder state for progressive loading
  const [importPlaceholders, setImportPlaceholders] = useState<number>(0);
  const [importProgress, setImportProgress] = useState<string>('');

  const handleImportUrls = async () => {
    if (!urlInput.trim()) return;
    setImporting(true);
    setImportError(null);
    setImportProgress('Connecting to Instagram...');

    const urls = urlInput.split('\n').map(u => u.trim()).filter(u => u.length > 0);
    const currentOrder = sourceUrls.length;
    let anySuccess = false;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const shortcode = parseIgShortcode(url);

      if (!shortcode) {
        // Direct image URL — remove any existing entry with the same source_url
        await supabase
          .from('carousel_source_urls')
          .delete()
          .eq('project_id', project.id)
          .eq('source_url', url);

        const { data, error } = await supabase
          .from('carousel_source_urls')
          .insert({
            project_id: project.id,
            source_url: url,
            shortcode: null,
            media_urls: [{ url, mediaType: 'IMAGE' }],
            source_order: currentOrder + i,
            scrape_status: 'completed',
          })
          .select()
          .single();

        if (!error && data) anySuccess = true;
        continue;
      }

      // IG URL — remove any existing entry with the same shortcode to prevent duplicates
      await supabase
        .from('carousel_source_urls')
        .delete()
        .eq('project_id', project.id)
        .eq('shortcode', shortcode);

      // IG URL — try Python backend scraper first, then edge function fallback
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const backendApiKey = import.meta.env.VITE_BACKEND_API_KEY;
      let mediaUrls: Array<{ url: string; mediaType: string }> | null = null;

      // Step 1: Python backend (works locally + VPS, bypasses Meta API restrictions)
      if (backendUrl && backendApiKey) {
        try {
          setImportProgress('Fetching carousel slides...');
          const backendResp = await fetch(
            `${backendUrl}/api/instagram/media?url=${encodeURIComponent(url)}`,
            { headers: { 'x-api-key': backendApiKey } },
          );
          if (backendResp.ok) {
            const backendData = await backendResp.json();
            if (backendData?.data?.media_urls?.length > 0) {
              // Deduplicate by URL — IG carousels sometimes have duplicate media
              const seen = new Set<string>();
              mediaUrls = backendData.data.media_urls.filter((m: any) => {
                if (seen.has(m.url)) return false;
                seen.add(m.url);
                return true;
              });
              // Show placeholders immediately once we know how many slides
              setImportPlaceholders(mediaUrls.length);
              setImportProgress(`Found ${mediaUrls.length} slides. Saving...`);
            }
          }
        } catch {
          // Backend not reachable — fall through to edge function
        }
      }

      // Step 2: Edge function fallback (uses Meta Graph API + oEmbed)
      if (!mediaUrls) {
        setImportProgress('Trying alternative import...');
        const { data: insertedRow, error: insertError } = await supabase
          .from('carousel_source_urls')
          .insert({
            project_id: project.id,
            source_url: url,
            shortcode,
            source_order: currentOrder + i,
            scrape_status: 'pending',
          })
          .select()
          .single();

        if (insertError || !insertedRow) {
          setImportError(`Failed to save URL: ${url}`);
          continue;
        }

        const { data: fetchResult, error: fetchError } = await supabase.functions.invoke(
          'fetch-instagram-media',
          { body: { shortcode, source_url_id: insertedRow.id } },
        );

        let errorBody: any = null;
        if (fetchError && (fetchError as any).context) {
          try { errorBody = await (fetchError as any).context.json(); } catch { /* ignore */ }
        }

        const isNoToken =
          errorBody?.error?.code === 'NO_IG_TOKEN' ||
          fetchResult?.error?.code === 'NO_IG_TOKEN';

        if (fetchError || !fetchResult?.success) {
          const errorMsg =
            errorBody?.error?.message ||
            fetchResult?.error?.message ||
            fetchError?.message ||
            'Unknown error';

          await supabase.from('carousel_source_urls').delete().eq('id', insertedRow.id);

          setImportError(isNoToken
            ? 'Instagram not connected. Go to Settings > Social Accounts to connect first, or drag & drop images.'
            : `Failed to import: ${errorMsg}`
          );
          continue;
        }

        anySuccess = true;
        continue;
      }

      // Backend succeeded — save each slide progressively (one-by-one UI update)
      for (let slideIdx = 0; slideIdx < mediaUrls.length; slideIdx++) {
        setImportProgress(`Saving slide ${slideIdx + 1} of ${mediaUrls.length}...`);

        // Insert ONE slide at a time so fetchSources shows progress
        if (slideIdx === 0) {
          // First slide: insert the source row with first media
          const { error: insertError2 } = await supabase
            .from('carousel_source_urls')
            .insert({
              project_id: project.id,
              source_url: url,
              shortcode,
              media_urls: [mediaUrls[slideIdx]],
              source_order: currentOrder + i,
              scrape_status: 'completed',
            });
          if (insertError2) {
            setImportError(`Failed to save: ${url}`);
            break;
          }
        } else {
          // Subsequent slides: update media_urls array to add the new slide
          const { data: existing } = await supabase
            .from('carousel_source_urls')
            .select('id, media_urls')
            .eq('project_id', project.id)
            .eq('shortcode', shortcode)
            .single();
          if (existing) {
            const updated = [...(existing.media_urls || []), mediaUrls[slideIdx]];
            await supabase
              .from('carousel_source_urls')
              .update({ media_urls: updated })
              .eq('id', existing.id);
          }
        }

        // Refresh UI after each slide is saved
        await fetchSources();
        anySuccess = true;
      }
    }

    setUrlInput('');
    // Final fetch for edge function fallback path (where progressive save wasn't used)
    if (anySuccess) await fetchSources();
    setImporting(false);
    setImportPlaceholders(0);
    setImportProgress('');
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    if (!user) return;
    setUploadingFiles(true);

    const fileArray = Array.from(files);
    const currentOrder = sourceUrls.length;

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 10 * 1024 * 1024) continue;

      const fileName = `${project.projectId}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('carousel-images')
        .upload(fileName, file, { contentType: file.type });

      if (uploadError) continue;

      const { data: urlData } = supabase.storage.from('carousel-images').getPublicUrl(fileName);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) continue;

      await supabase.from('carousel_source_urls').insert({
        project_id: project.id,
        source_url: publicUrl,
        media_urls: [{ url: publicUrl, mediaType: 'IMAGE' as const }],
        source_order: currentOrder + i,
        scrape_status: 'completed',
      });
    }

    await fetchSources();
    setUploadingFiles(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files);
  };

  const handleDeleteSource = async (sourceId: string) => {
    await supabase.from('carousel_source_urls').delete().eq('id', sourceId);
    setSourceUrls(prev => prev.filter(s => s.id !== sourceId));
  };

  const handleClearAll = async () => {
    // Cancel any running validation loop before clearing state
    validatingRef.current = false;

    // Cleanup stored images from Supabase Storage
    const shortcodes = sourceUrls
      .map(s => s.shortcode)
      .filter(Boolean) as string[];
    for (const sc of shortcodes) {
      try {
        const { data: files } = await supabase.storage
          .from('carousel-sources')
          .list(`instagram/${sc}`);
        if (files && files.length > 0) {
          await supabase.storage
            .from('carousel-sources')
            .remove(files.map(f => `instagram/${sc}/${f.name}`));
        }
      } catch { /* ignore cleanup errors */ }
    }

    await supabase.from('carousel_source_urls').delete().eq('project_id', project.id);

    // Reset project title + status back to draft
    await supabase
      .from('carousel_projects')
      .update({ title: 'Untitled Carousel', status: 'draft' })
      .eq('id', project.id);

    sourceUrlsRef.current = [];
    setSourceUrls([]);
    setValidationMap({});
    validatedKeysRef.current = new Set();
    localStorage.removeItem(validationCacheKey);

    // Notify parent to re-fetch project (updates title in header)
    onProjectUpdate();
  };

  const handleProceed = async () => {
    // Build flat list of all images with their validation data
    const allMedia: { url: string; sourceId: string; idx: number }[] = [];
    for (const src of sourceUrls) {
      if (!src.mediaUrls) continue;
      src.mediaUrls.forEach((m, idx) => {
        allMedia.push({ url: m.url, sourceId: src.id, idx });
      });
    }

    // Delete existing slides for this project (fresh insert)
    await supabase.from('carousel_slides').delete().eq('project_id', project.id);

    // Map validation slide_type → DB slide_type
    const typeMap: Record<string, string> = {
      hook: 'HOOK', foreshadow: 'FORE', body: 'BODY', cta: 'CTA',
      opinion: 'BODY', unknown: 'BODY', peak: 'BODY',
    };

    // Insert carousel_slides with validation data
    const slideRows = allMedia.map((media, i) => {
      const vKey = `${media.sourceId}-${media.idx}`;
      const v = validationMap[vKey];
      const slideType = v?.slide_type ? (typeMap[v.slide_type] || 'BODY') : 'BODY';

      return {
        project_id: project.id,
        slide_index: i,
        slide_type: slideType,
        source_image_url: media.url,
        generation_method: 'ai',
        analysis_data: v ? {
          claim: v.claim || null,
          claim_type: v.claim_type || null,
          needs_verification: v.needs_verification || false,
          reason: v.reason || null,
          confidence: v.confidence || 0,
          evidence: v.evidence || null,
          source_url: v.source_url || null,
          slide_type_raw: v.slide_type || null,
        } : null,
        video_toggle: slideType === 'HOOK' || slideType === 'CTA',
        creator_face: slideType === 'HOOK' || slideType === 'FORE' || slideType === 'CTA',
      };
    });

    if (slideRows.length > 0) {
      await supabase.from('carousel_slides').insert(slideRows);
    }

    // Auto-derive title from validation claims (first meaningful claim or reason)
    if (project.title === 'Untitled Carousel' || project.title === 'Untitled Project') {
      let derivedTitle = '';

      // Try to find a meaningful claim from validation data
      for (const media of allMedia) {
        const vKey = `${media.sourceId}-${media.idx}`;
        const v = validationMap[vKey];
        if (v?.claim && v.claim.length > 10) {
          derivedTitle = v.claim.slice(0, 80);
          break;
        }
      }

      // Fallback: use reason from first non-hook slide
      if (!derivedTitle) {
        for (const media of allMedia) {
          const vKey = `${media.sourceId}-${media.idx}`;
          const v = validationMap[vKey];
          if (v?.reason && v.slide_type !== 'hook' && v.reason.length > 10) {
            derivedTitle = v.reason.slice(0, 80);
            break;
          }
        }
      }

      // Persist language setting to project settings
      const currentSettings = project.settings || {};
      const settingsWithLang = { ...currentSettings, language: languageSettings };

      if (derivedTitle) {
        await supabase.from('carousel_projects').update({
          status: 'source_ready',
          title: derivedTitle,
          settings: settingsWithLang,
        }).eq('id', project.id);
      } else {
        await supabase.from('carousel_projects')
          .update({ status: 'source_ready', settings: settingsWithLang })
          .eq('id', project.id);
      }
    } else {
      const currentSettings = project.settings || {};
      const settingsWithLang = { ...currentSettings, language: languageSettings };
      await supabase.from('carousel_projects')
        .update({ status: 'source_ready', settings: settingsWithLang })
        .eq('id', project.id);
    }

    navigate(`/carousel-images/${project.projectId}/generate`);
    onProjectUpdate();
  };

  const totalMedia = sourceUrls.reduce((sum, s) => sum + (s.mediaUrls?.length || 0), 0);

  // Count unresolved slides (invalid or unverifiable that user hasn't confirmed)
  const unresolvedInvalid = Object.entries(validationMap).filter(
    ([, v]) => v.status === 'invalid' && !v.confirmed
  ).length;
  const unresolvedUnverifiable = Object.entries(validationMap).filter(
    ([, v]) => v.status === 'unverifiable' && !v.confirmed
  ).length;
  const totalUnresolved = unresolvedInvalid + unresolvedUnverifiable;
  const validationInProgress = Object.values(validationMap).some(v => v.status === 'validating');

  // All images must have a definitive status (not idle, not validating) before allowing Continue
  const allValidationComplete = totalMedia === 0 || sourceUrls.every(src =>
    (src.mediaUrls || []).every((_, idx) => {
      const st = validationMap[`${src.id}-${idx}`]?.status;
      return st && st !== 'validating';
    })
  );

  // Continue only when ALL slides are resolved: valid, or user-confirmed
  const canProceed = sourceUrls.length > 0 && !loading && allValidationComplete && totalUnresolved === 0;

  return (
    <div>

      <div className="px-6 pt-5 pb-24">

        {/* Header */}
        <div className="mb-4">
          <h3 className="text-base font-semibold text-neutral-200">Source Images</h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Import Instagram carousel posts or upload images manually.
          </p>
        </div>

        {/* Import Methods — hidden when images are loaded */}
        {sourceUrls.length === 0 || loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">

            {/* Instagram Import */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Instagram className="w-3.5 h-3.5 text-pink-400" />
                <h4 className="text-xs font-medium text-neutral-300">Instagram Import</h4>
              </div>
              <textarea
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={'Paste Instagram URLs (one per line)\ne.g. https://instagram.com/p/ABC123/'}
                rows={3}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors resize-none mb-2"
              />
              <button
                onClick={handleImportUrls}
                disabled={!urlInput.trim() || importing}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-800 disabled:text-neutral-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-colors w-full justify-center"
              >
                {importing ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing...</>
                ) : (
                  <><Link2 className="w-3.5 h-3.5" /> Import URLs</>
                )}
              </button>
            </div>

            {/* Manual Upload */}
            <div
              className="bg-neutral-900 border border-dashed border-neutral-700 rounded-xl p-3 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-emerald-500/30 transition-colors min-h-[140px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadingFiles ? (
                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
              ) : (
                <>
                  <Upload className="w-6 h-6 text-neutral-600" />
                  <div className="text-center">
                    <p className="text-xs text-neutral-300">Drop images here or click to browse</p>
                    <p className="text-[11px] text-neutral-600 mt-0.5">PNG, JPG, WebP — max 10MB</p>
                  </div>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              />
            </div>
          </div>
        ) : null}

        {/* Error banner */}
        {importError && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-400 flex-1">{importError}</p>
            <button onClick={() => setImportError(null)} className="text-red-400/50 hover:text-red-400 flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Import progress bar */}
        {importing && importProgress && (
          <div className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg mb-4">
            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin flex-shrink-0" />
            <p className="text-xs text-emerald-400 flex-1">{importProgress}</p>
          </div>
        )}

        {/* Placeholder skeleton grid during import — shows remaining unloaded slots */}
        {importing && importPlaceholders > 0 && sourceUrls.length === 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 mb-4">
            {Array.from({ length: importPlaceholders }).map((_, idx) => (
              <div
                key={`placeholder-${idx}`}
                className="aspect-[4/5] bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden animate-pulse"
              >
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center">
                    <span className="text-xs text-neutral-600 font-medium">{idx + 1}</span>
                  </div>
                  <div className="h-2 w-12 bg-neutral-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Importing indicator when images already showing (progressive) */}
        {importing && !importProgress && sourceUrls.length === 0 && (
          <div className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg mb-4">
            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin flex-shrink-0" />
            <p className="text-xs text-emerald-400 flex-1">Importing from Instagram...</p>
          </div>
        )}

        {/* Source Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          </div>
        ) : sourceUrls.length === 0 && !importing ? (
          <div className="text-center py-10 bg-neutral-900/40 border border-neutral-800 rounded-xl">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 text-neutral-700" />
            <p className="text-xs text-neutral-500">No source images yet. Import from Instagram or upload manually.</p>
          </div>
        ) : sourceUrls.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-neutral-500">
                {importing && importPlaceholders > 0
                  ? `${totalMedia} / ${importPlaceholders} images loaded`
                  : `${totalMedia} image${totalMedia !== 1 ? 's' : ''} ready`}
              </p>
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-amber-400 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset & Import Again
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
              {sourceUrls.map((source) => {
                const isLoading = source.scrapeStatus === 'pending' || source.scrapeStatus === 'fetching';

                // Show each individual image as a separate card
                if (!isLoading && source.mediaUrls && source.mediaUrls.length > 0) {
                  return source.mediaUrls.map((media, idx) => {
                    const vKey = `${source.id}-${idx}`;
                    const vResult = validationMap[vKey];
                    const vStatus = vResult?.status ?? 'idle';

                    const needsReview = (vStatus === 'invalid' || vStatus === 'unverifiable') && !vResult?.confirmed;
                    // Badge label based on slide type
                    const slideTypeLabel = vResult?.slide_type
                      ? vResult.slide_type.charAt(0).toUpperCase() + vResult.slide_type.slice(1)
                      : null;

                    return (
                      <div
                        key={vKey}
                        className={`group relative bg-neutral-900 rounded-lg overflow-hidden transition-all cursor-pointer ${
                          vStatus === 'invalid' && !vResult?.confirmed
                            ? 'border-2 border-red-500/60 ring-1 ring-red-500/20'
                            : vStatus === 'unverifiable' && !vResult?.confirmed
                            ? 'border-2 border-amber-500/60 ring-1 ring-amber-500/20'
                            : vStatus === 'valid'
                            ? 'border border-emerald-500/40'
                            : 'border border-neutral-800'
                        }`}
                        onClick={() => setDetailModal({ imageUrl: media.url, slideIndex: idx, result: vResult })}
                      >
                        <div className="aspect-square bg-neutral-800">
                          <img
                            src={media.url}
                            alt={`Slide ${idx + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>

                        {/* Slide index + type */}
                        <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                          <span className="bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            {idx + 1}
                          </span>
                          {slideTypeLabel && vStatus === 'valid' && (
                            <span className="bg-black/50 text-neutral-300 text-[8px] px-1.5 py-0.5 rounded-full">
                              {slideTypeLabel}
                            </span>
                          )}
                        </div>

                        {/* Validation badge */}
                        {vStatus !== 'idle' && (
                          <div className={`absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-1 py-1 text-[10px] font-semibold ${
                            vStatus === 'validating'
                              ? 'bg-black/60 text-neutral-400'
                              : vStatus === 'valid' && !vResult?.needs_verification
                              ? 'bg-emerald-500/70 text-white'
                              : vStatus === 'valid'
                              ? 'bg-emerald-500/90 text-white'
                              : vStatus === 'invalid' && !vResult?.confirmed
                              ? 'bg-red-500 text-white animate-pulse cursor-pointer hover:bg-red-600'
                              : vStatus === 'unverifiable' && !vResult?.confirmed
                              ? 'bg-amber-500 text-white animate-pulse cursor-pointer hover:bg-amber-600'
                              : (vStatus === 'invalid' || vStatus === 'unverifiable') && vResult?.confirmed
                              ? 'bg-amber-500/70 text-white'
                              : 'bg-neutral-700/80 text-neutral-400'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (needsReview) setActiveConflict({ key: vKey, imageUrl: media.url, result: vResult! });
                          }}
                          >
                            {vStatus === 'validating' && (
                              <><Loader2 className="w-3 h-3 animate-spin" /> Checking...</>
                            )}
                            {vStatus === 'valid' && (
                              <><CheckCircle2 className="w-3 h-3" /> Verified</>
                            )}
                            {vStatus === 'invalid' && !vResult?.confirmed && (
                              <><ShieldAlert className="w-3 h-3" /> Review !</>
                            )}
                            {vStatus === 'unverifiable' && !vResult?.confirmed && (
                              <><AlertCircle className="w-3 h-3" /> Unverified — Review</>
                            )}
                            {(vStatus === 'invalid' || vStatus === 'unverifiable') && vResult?.confirmed && (
                              <><ShieldAlert className="w-3 h-3" /> Skipped</>
                            )}
                          </div>
                        )}

                        {/* Hover actions */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-1.5 gap-1">
                          {/* Retry button for unverifiable slides */}
                          {vStatus === 'unverifiable' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRetryValidation(vKey, media.url); }}
                              className="p-1.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-400"
                              title="Retry validation"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                          {source.sourceUrl && source.shortcode && idx === 0 && (
                            <a
                              href={source.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-md bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {idx === 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteSource(source.id); }}
                              className="p-1.5 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  });
                }

                // Loading state card
                return (
                  <div
                    key={source.id}
                    className="group relative bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden"
                  >
                    <div className="aspect-square bg-neutral-800 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-neutral-600 animate-spin" />
                    </div>
                    <div className="px-1.5 py-1">
                      <p className="text-[9px] text-neutral-600 truncate">Fetching...</p>
                    </div>
                  </div>
                );
              })}
              {/* Remaining placeholder slots during progressive import */}
              {importing && importPlaceholders > 0 && (() => {
                const remaining = importPlaceholders - totalMedia;
                if (remaining <= 0) return null;
                return Array.from({ length: remaining }).map((_, idx) => (
                  <div
                    key={`remaining-${idx}`}
                    className="aspect-square bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden animate-pulse"
                  >
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 text-neutral-700 animate-spin" />
                      <span className="text-[9px] text-neutral-600">Loading...</span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </>
        ) : null}
      </div>

      {/* Language Setting */}
      {sourceUrls.length > 0 && (
        <div className="px-6 pb-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-medium text-neutral-200">Output Language</h4>
            </div>
            <div className="flex items-center gap-4">
              {/* Primary Language */}
              <div className="flex-1">
                <label className="text-[11px] text-neutral-500 mb-1 block">Headline (Primary)</label>
                <select
                  value={languageSettings.primary}
                  onChange={e => updateLanguage({ primary: e.target.value as CarouselLanguage })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-200 px-3 py-2 outline-none focus:border-emerald-500 transition-colors"
                >
                  {Object.entries(CAROUSEL_LANGUAGES).map(([code, lang]) => (
                    <option key={code} value={code}>{lang.flag} {lang.label}</option>
                  ))}
                </select>
              </div>

              {/* Subtitle Language */}
              <div className="flex-1">
                <label className="text-[11px] text-neutral-500 mb-1 block">Subtitle (Secondary)</label>
                <select
                  value={languageSettings.subtitle}
                  onChange={e => updateLanguage({ subtitle: e.target.value as CarouselLanguage | 'none' })}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-200 px-3 py-2 outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="none">None (monolingual)</option>
                  {Object.entries(CAROUSEL_LANGUAGES)
                    .filter(([code]) => code !== languageSettings.primary)
                    .map(([code, lang]) => (
                      <option key={code} value={code}>{lang.flag} {lang.label}</option>
                    ))}
                </select>
              </div>

              {/* Preview */}
              <div className="flex-1">
                <label className="text-[11px] text-neutral-500 mb-1 block">Preview</label>
                <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2">
                  <p className="text-sm font-bold text-white leading-tight">
                    {languageSettings.primary === 'id' ? 'RAHASIA GILA' : languageSettings.primary === 'hi' ? 'पागल रहस्य' : 'INSANE SECRET'}
                  </p>
                  {languageSettings.subtitle !== 'none' && (
                    <p className="text-[11px] text-amber-400 mt-0.5">
                      {languageSettings.subtitle === 'en' ? 'The Insane Secret Behind...' : languageSettings.subtitle === 'id' ? 'Rahasia Gila di Balik...' : 'इसके पीछे का पागल रहस्य...'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sticky footer — fixed to bottom, no gap */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-neutral-800 bg-[#0B0E14]/95 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-neutral-500">
            {sourceUrls.length > 0
              ? `${sourceUrls.length} source${sourceUrls.length > 1 ? 's' : ''} · ${totalMedia} image${totalMedia !== 1 ? 's' : ''}`
              : 'Add images to continue'}
          </p>
          {!allValidationComplete && (
            <p className="text-[11px] text-amber-400 mt-0.5 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Verifying content accuracy — please wait...
            </p>
          )}
          {allValidationComplete && totalUnresolved > 0 && (
            <p className="text-[11px] text-red-400 mt-0.5 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              {totalUnresolved} image{totalUnresolved > 1 ? 's need review' : ' needs review'} — click the badge to resolve
            </p>
          )}
          {allValidationComplete && totalUnresolved === 0 && sourceUrls.length > 0 && (
            <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              All images verified — ready to generate
            </p>
          )}
        </div>
        <button
          onClick={handleProceed}
          disabled={!canProceed}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-800 disabled:text-neutral-600 disabled:cursor-not-allowed text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors"
          title={
            !allValidationComplete ? 'Waiting for content verification to complete...' :
            totalUnresolved > 0 ? 'Resolve flagged images before continuing' :
            undefined
          }
        >
          {!allValidationComplete
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
            : <>Continue to Generate <ChevronRight className="w-4 h-4" /></>
          }
        </button>
      </div>

      {/* Conflict/review confirmation modal — handles both invalid & unverifiable */}
      {activeConflict && (() => {
        const isInvalid = activeConflict.result.status === 'invalid';
        const isUnverifiable = activeConflict.result.status === 'unverifiable';
        const borderColor = isInvalid ? 'border-red-500/30' : 'border-amber-500/30';
        const iconBg = isInvalid ? 'bg-red-500/15' : 'bg-amber-500/15';
        const iconColor = isInvalid ? 'text-red-400' : 'text-amber-400';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className={`bg-neutral-900 border ${borderColor} rounded-2xl w-full max-w-md shadow-xl`}>
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-800">
                <div className={`w-8 h-8 ${iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
                  {isInvalid
                    ? <ShieldAlert className={`w-4 h-4 ${iconColor}`} />
                    : <AlertCircle className={`w-4 h-4 ${iconColor}`} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-neutral-200">
                    {isInvalid ? 'Potential Inaccuracy Detected' : 'Could Not Verify Content'}
                  </h3>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    {isInvalid
                      ? 'AI fact-check found conflicting information'
                      : 'Web search could not confirm the claim in this slide'
                    }
                  </p>
                </div>
                <button
                  onClick={() => setActiveConflict(null)}
                  className="p-1 rounded-md text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Image preview */}
              <div className="px-5 pt-4">
                <div className="w-full aspect-video bg-neutral-800 rounded-lg overflow-hidden mb-4">
                  <img
                    src={activeConflict.imageUrl}
                    alt="Flagged slide"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Claim + Evidence */}
              <div className="px-5 pb-4 space-y-3">
                {activeConflict.result.claim && (
                  <div className="bg-neutral-800/60 rounded-lg p-3">
                    <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-1">Claim found</p>
                    <p className="text-xs text-neutral-200 leading-relaxed">"{activeConflict.result.claim}"</p>
                  </div>
                )}
                {activeConflict.result.evidence && (
                  <div className={`${isInvalid ? 'bg-red-500/8 border-red-500/15' : 'bg-amber-500/8 border-amber-500/15'} border rounded-lg p-3`}>
                    <p className={`text-[10px] font-medium ${isInvalid ? 'text-red-400' : 'text-amber-400'} uppercase tracking-wider mb-1`}>
                      {isInvalid ? 'Conflicting evidence' : 'Verification result'}
                    </p>
                    <p className="text-xs text-neutral-300 leading-relaxed">{activeConflict.result.evidence}</p>
                    {activeConflict.result.source_url && (
                      <a
                        href={activeConflict.result.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        View source
                      </a>
                    )}
                  </div>
                )}
                {isUnverifiable && !activeConflict.result.claim && (
                  <div className="bg-amber-500/8 border border-amber-500/15 rounded-lg p-3">
                    <p className="text-[10px] font-medium text-amber-400 uppercase tracking-wider mb-1">Why unverified</p>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      Could not extract or verify a factual claim from this slide. This may be due to a search timeout or the content couldn't be analyzed.
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-5 pb-5 flex gap-2">
                <button
                  onClick={() => {
                    const source = sourceUrls.find(s => activeConflict.key.startsWith(s.id + '-'));
                    if (source) handleDeleteSource(source.id);
                    setActiveConflict(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg px-4 py-2.5 text-xs font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove Slide
                </button>
                {isUnverifiable && (
                  <button
                    onClick={() => {
                      // Find the image URL for retry
                      const imgUrl = activeConflict.imageUrl;
                      const key = activeConflict.key;
                      setActiveConflict(null);
                      handleRetryValidation(key, imgUrl);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded-lg px-4 py-2.5 text-xs font-medium transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                )}
                <button
                  onClick={() => {
                    setValidationMap(prev => ({
                      ...prev,
                      [activeConflict.key]: { ...activeConflict.result, confirmed: true },
                    }));
                    setActiveConflict(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg px-4 py-2.5 text-xs font-medium transition-colors"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Skip
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Image detail popup modal */}
      {detailModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setDetailModal(null)}
        >
          <div
            className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800">
              <h3 className="text-sm font-semibold text-neutral-200">
                Slide {detailModal.slideIndex + 1}
                {detailModal.result?.slide_type && (
                  <span className="ml-2 text-[10px] font-normal text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-full">
                    {detailModal.result.slide_type}
                  </span>
                )}
              </h3>
              <button
                onClick={() => setDetailModal(null)}
                className="p-1 rounded-md text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Image */}
            <div className="px-5 pt-4">
              <div className="w-full bg-neutral-800 rounded-lg overflow-hidden mb-4">
                <img
                  src={detailModal.imageUrl}
                  alt={`Slide ${detailModal.slideIndex + 1}`}
                  className="w-full h-auto object-contain max-h-[50vh]"
                />
              </div>
            </div>

            {/* Validation details */}
            {detailModal.result && detailModal.result.status !== 'idle' && detailModal.result.status !== 'validating' && (
              <div className="px-5 pb-5 space-y-2">
                {/* Status badge */}
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    detailModal.result.status === 'valid'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : detailModal.result.status === 'invalid'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {detailModal.result.status === 'valid' ? <CheckCircle2 className="w-3 h-3" /> :
                     detailModal.result.status === 'invalid' ? <ShieldAlert className="w-3 h-3" /> :
                     <AlertCircle className="w-3 h-3" />}
                    {detailModal.result.status === 'valid' ? 'Valid' :
                     detailModal.result.status === 'invalid' ? 'Invalid' : 'Unverifiable'}
                  </span>
                  {detailModal.result.confidence !== undefined && detailModal.result.confidence > 0 && (
                    <span className="text-[10px] text-neutral-500">
                      Confidence: {Math.round(detailModal.result.confidence * 100)}%
                    </span>
                  )}
                </div>

                {/* Reason */}
                {detailModal.result.reason && (
                  <div className="flex items-start gap-2 text-xs text-neutral-400">
                    <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{detailModal.result.reason}</span>
                  </div>
                )}

                {/* Claim */}
                {detailModal.result.claim && (
                  <div className="bg-neutral-800/60 rounded-lg p-3">
                    <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                      Claim {detailModal.result.claim_type ? `(${detailModal.result.claim_type})` : ''}
                    </p>
                    <p className="text-xs text-neutral-200 leading-relaxed">"{detailModal.result.claim}"</p>
                  </div>
                )}

                {/* Evidence */}
                {detailModal.result.evidence && (
                  <div className="bg-neutral-800/40 rounded-lg p-3">
                    <p className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider mb-1">Evidence</p>
                    <p className="text-xs text-neutral-300 leading-relaxed">{detailModal.result.evidence}</p>
                    {detailModal.result.source_url && (
                      <a
                        href={detailModal.result.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        View source
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
