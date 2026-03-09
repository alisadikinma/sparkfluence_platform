import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useWorkspace, type WorkspaceSegment } from '../../../contexts/WorkspaceContext';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { getWordLimitStatus, type LanguageCode } from '../../../lib/wordLimits';
import {
  VisualPreviewGallery,
  GenerateBRollModal, type BRollOptions,
  LayoutPopover, LayoutIcon,
  parseVisualDirection, StructuredVDChips,
  CreatorOptionsModal,
  RegenerateModal,
  ReferenceImageModal,
} from '../../ImageGeneration/components';
import {
  type SegmentImage, type ImageModelSettings,
  JOB_STATUS, IMAGE_MODELS, SUPPORTED_DURATIONS, LAYOUT_OPTIONS,
} from '../../ImageGeneration/types';
import {
  RefreshCw, ImageIcon, Loader2, Sparkles, X, Maximize2,
  CheckCircle2, Download, ChevronDown, ChevronUp, Upload,
  Camera, Scissors, Undo2, Merge, LayoutList, List,
  LayoutGrid, Settings2, Columns2, Cloud, User, Film,
} from 'lucide-react';

// ============================================================================
// HELPERS
// ============================================================================

function snapToSupportedDuration(duration: number): number {
  let nearest = SUPPORTED_DURATIONS[0];
  let minDiff = Math.abs(duration - nearest);
  for (const supported of SUPPORTED_DURATIONS) {
    const diff = Math.abs(duration - supported);
    if (diff < minDiff) { minDiff = diff; nearest = supported; }
  }
  return nearest;
}

/** Adapter: convert WorkspaceSegment field names to what old sub-components expect */
function asOldSegment(ws: WorkspaceSegment): any {
  return {
    ...ws,
    type: ws.segmentType,
    // Sub-components read these directly
  };
}

// ============================================================================
// TYPES
// ============================================================================

interface ImageStepProps {
  onProgressChange?: (progress: { isGenerating: boolean; completed: number; total: number; failed: number }) => void;
  saveNow?: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

const ImageStep: React.FC<ImageStepProps> = ({ onProgressChange, saveNow }) => {
  const { state, dispatch } = useWorkspace();
  const { user } = useAuth();
  const { orderId: paramOrderId } = useParams<{ orderId: string }>();

  const orderId = paramOrderId || state.orderId;
  const segments = state.segments;
  const settings = state.settings;
  const language = settings?.language || 'id';

  // ---------------------------------------------------------------------------
  // VIEW MODE STATE (persisted in localStorage)
  // ---------------------------------------------------------------------------
  const [viewMode, setViewMode] = useState<'full' | 'compact' | 'grid'>(() => {
    try { return (localStorage.getItem('sparkfluence_view_mode') as any) || 'full'; } catch { return 'full'; }
  });
  const [fullViewColumns, setFullViewColumns] = useState<1 | 2>(() => {
    try { return localStorage.getItem('sparkfluence_full_view_cols') === '2' ? 2 : 1; } catch { return 1; }
  });
  const [expandedSegmentId, setExpandedSegmentId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // GENERATION STATE (local, UI-transient)
  // ---------------------------------------------------------------------------
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isBackgroundMode, setIsBackgroundMode] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0, completed: 0, failed: 0 });
  const [showBackgroundToast, setShowBackgroundToast] = useState(false);
  const processingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasInitialSyncedRef = useRef(false);

  // ---------------------------------------------------------------------------
  // IMAGE MODEL SELECTION
  // ---------------------------------------------------------------------------
  const [imageModels, setImageModels] = useState<ImageModelSettings>({ aRoll: 'auto', bRoll: 'auto' });
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Close model dropdown on click outside
  useEffect(() => {
    if (!showModelDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModelDropdown]);

  // ---------------------------------------------------------------------------
  // MODAL STATES
  // ---------------------------------------------------------------------------
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [regenerateModal, setRegenerateModal] = useState<{ isOpen: boolean; segment: WorkspaceSegment | null }>({ isOpen: false, segment: null });
  const [optionsModal, setOptionsModal] = useState<{ isOpen: boolean; segment: WorkspaceSegment | null }>({ isOpen: false, segment: null });
  const [referenceImageModal, setReferenceImageModal] = useState<{ isOpen: boolean; segment: WorkspaceSegment | null }>({ isOpen: false, segment: null });

  // ---------------------------------------------------------------------------
  // INLINE EDITING STATE
  // ---------------------------------------------------------------------------
  const [shorteningSegmentId, setShorteningSegmentId] = useState<string | null>(null);
  const [rewritingVDSegmentId, setRewritingVDSegmentId] = useState<string | null>(null);
  const [mergePickerSegmentId, setMergePickerSegmentId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // SAVED AVATARS (for B-ROLL modal picker)
  // ---------------------------------------------------------------------------
  const [savedAvatars, setSavedAvatars] = useState<{ id: string; name: string; url: string }[]>([]);

  // ---------------------------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (processingIntervalRef.current) clearInterval(processingIntervalRef.current);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------
  const enabledSegments = useMemo(() => segments.filter(s => s.isEnabled !== false), [segments]);
  const imagesGenerated = useMemo(() => enabledSegments.filter(s => s.imageUrl).length, [enabledSegments]);
  const allHaveImages = enabledSegments.length > 0 && imagesGenerated === enabledSegments.length;
  const totalDuration = useMemo(() => segments.reduce((sum, s) => sum + s.durationSeconds, 0), [segments]);

  // Notify parent (Workspace) of progress changes for SmartCompanion
  useEffect(() => {
    onProgressChange?.({
      isGenerating: isGeneratingAll || isBackgroundMode,
      completed: generationProgress.completed,
      total: generationProgress.total,
      failed: generationProgress.failed,
    });
  }, [isGeneratingAll, isBackgroundMode, generationProgress, onProgressChange]);

  // ---------------------------------------------------------------------------
  // LOAD SAVED AVATARS ON MOUNT
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadAvatars = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('user_avatars')
          .select('id, name, avatar_url')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (data?.length) {
          setSavedAvatars(data.map(a => ({ id: a.id, name: a.name, url: a.avatar_url })));
        }
      } catch (err) {
        console.error('[ImageStep] Error loading avatars:', err);
      }
    };
    loadAvatars();
  }, [user]);

  // ---------------------------------------------------------------------------
  // IMAGE SYNC FROM DATABASE (runs once on mount)
  // ---------------------------------------------------------------------------
  const fetchSegmentImages = useCallback(async (sid: string): Promise<Map<number, SegmentImage[]>> => {
    if (!user) return new Map();
    try {
      const { data, error } = await supabase
        .from('image_generation_jobs')
        .select('*')
        .eq('session_id', sid)
        .eq('user_id', user.id)
        .order('segment_number', { ascending: true })
        .order('generation_number', { ascending: true });
      if (error) throw error;

      const imageMap = new Map<number, SegmentImage[]>();
      (data || []).forEach(job => {
        const segNum = job.segment_number;
        if (!imageMap.has(segNum)) imageMap.set(segNum, []);
        imageMap.get(segNum)!.push({
          id: job.id,
          imageUrl: job.image_url || '',
          generationNumber: job.generation_number || 1,
          sourceType: job.source_type || 'generated',
          isSelected: job.is_selected || false,
          scriptText: job.script_text || undefined,
          regenerationNotes: job.regeneration_notes || undefined,
          referenceImageUrl: job.reference_image_url || undefined,
          status: job.status,
          errorMessage: job.error_message || undefined,
          createdAt: job.created_at,
        });
      });
      return imageMap;
    } catch (err) {
      console.error('[ImageStep] Error fetching segment images:', err);
      return new Map();
    }
  }, [user]);

  useEffect(() => {
    const syncOnLoad = async () => {
      if (!orderId || !user || segments.length === 0) return;
      if (segments.some(seg => seg.isGeneratingImage)) return;
      if (hasInitialSyncedRef.current) return;
      hasInitialSyncedRef.current = true;

      const imageMap = await fetchSegmentImages(orderId);
      if (imageMap.size > 0) {
        const updates: Array<{ segmentId: string; changes: Partial<WorkspaceSegment> }> = [];
        segments.forEach((seg, index) => {
          const images = imageMap.get(index + 1);
          if (images && images.length > 0) {
            const selectedImage = images.find(img => img.isSelected);
            const completedImages = images.filter(img => img.status === JOB_STATUS.COMPLETED && img.imageUrl);
            const displayImage = selectedImage || completedImages[completedImages.length - 1];
            // Map SegmentImage to WorkspaceSegment images format
            const wsImages = images.map(img => ({
              id: img.id,
              imageUrl: img.imageUrl,
              generationNumber: img.generationNumber,
              sourceType: img.sourceType,
              isSelected: img.isSelected,
              status: img.status as 0 | 1 | 2 | 3,
            }));
            updates.push({
              segmentId: seg.id,
              changes: {
                images: wsImages,
                imageUrl: displayImage?.imageUrl || seg.imageUrl,
                isGeneratingImage: images.some(img => img.status === JOB_STATUS.PROCESSING),
              },
            });
          }
        });
        if (updates.length > 0) {
          dispatch({ type: 'BATCH_UPDATE_SEGMENTS', updates });
        }
      }
    };
    syncOnLoad();
  }, [orderId, user, segments.length, fetchSegmentImages, dispatch]);

  // Reset sync flag when orderId changes
  useEffect(() => { hasInitialSyncedRef.current = false; }, [orderId]);

  // ---------------------------------------------------------------------------
  // BACKGROUND PROCESSING (3s polling)
  // ---------------------------------------------------------------------------
  const startBackgroundProcessing = useCallback((sid: string) => {
    if (processingIntervalRef.current) clearInterval(processingIntervalRef.current);

    const processNext = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase.functions.invoke('generate-images', {
          body: { mode: 'process_single', session_id: sid, user_id: user.id, language: settings?.language || 'id' },
        });
        if (error) { console.error('[BgProcess] Error:', error); return; }

        const result = data?.data;
        if (result?.summary) {
          setGenerationProgress({
            current: result.summary.completed + result.summary.failed,
            total: result.summary.total,
            completed: result.summary.completed,
            failed: result.summary.failed,
          });
        }

        if (result?.job?.image_url) {
          const segmentNumber = result.job.segment_number;
          // Fetch all images for this segment from DB
          const { data: segmentImages } = await supabase
            .from('image_generation_jobs')
            .select('*')
            .eq('session_id', sid)
            .eq('segment_number', segmentNumber)
            .eq('user_id', user.id)
            .order('generation_number', { ascending: true });

          const imagesArray: SegmentImage[] = (segmentImages || []).map(job => ({
            id: job.id,
            imageUrl: job.image_url || '',
            generationNumber: job.generation_number || 1,
            sourceType: job.source_type || 'generated',
            isSelected: job.is_selected || false,
            scriptText: job.script_text || undefined,
            regenerationNotes: job.regeneration_notes || undefined,
            referenceImageUrl: job.reference_image_url || undefined,
            status: job.status,
            errorMessage: job.error_message || undefined,
            createdAt: job.created_at,
          }));

          const completedImages = imagesArray.filter(img => img.status === JOB_STATUS.COMPLETED && img.imageUrl);
          let selectedImage = completedImages.find(img => img.isSelected);
          if (!selectedImage && completedImages.length > 0) {
            selectedImage = completedImages[completedImages.length - 1];
            // Auto-select in DB
            await supabase.from('image_generation_jobs').update({ is_selected: false }).eq('session_id', sid).eq('segment_number', segmentNumber).eq('user_id', user.id);
            await supabase.from('image_generation_jobs').update({ is_selected: true }).eq('id', selectedImage.id).eq('user_id', user.id);
          }

          // Find which workspace segment this maps to
          const targetSeg = segments.find((s, idx) => idx + 1 === segmentNumber || s.jobId === result.job.id);
          if (targetSeg) {
            const wsImages = imagesArray.map(img => ({
              id: img.id, imageUrl: img.imageUrl, generationNumber: img.generationNumber,
              sourceType: img.sourceType, isSelected: img.isSelected, status: img.status as 0 | 1 | 2 | 3,
            }));
            dispatch({ type: 'UPDATE_SEGMENT_IMAGES', segmentId: targetSeg.id, images: wsImages, selectedImageUrl: selectedImage?.imageUrl || result.job.image_url });
          }
        }

        if (result?.all_complete) {
          setIsGeneratingAll(false);
          setIsBackgroundMode(false);
          setShowBackgroundToast(false);
          if (processingIntervalRef.current) { clearInterval(processingIntervalRef.current); processingIntervalRef.current = null; }
          // Final sync
          const imageMap = await fetchSegmentImages(sid);
          if (imageMap.size > 0) {
            const updates: Array<{ segmentId: string; changes: Partial<WorkspaceSegment> }> = [];
            segments.forEach((seg, index) => {
              const images = imageMap.get(index + 1);
              if (images) {
                const sel = images.find(img => img.isSelected) || images.filter(img => img.status === JOB_STATUS.COMPLETED)[images.length - 1];
                updates.push({
                  segmentId: seg.id,
                  changes: {
                    images: images.map(img => ({ id: img.id, imageUrl: img.imageUrl, generationNumber: img.generationNumber, sourceType: img.sourceType, isSelected: img.isSelected, status: img.status as 0 | 1 | 2 | 3 })),
                    imageUrl: sel?.imageUrl || seg.imageUrl,
                    isGeneratingImage: false,
                  },
                });
              }
            });
            if (updates.length > 0) dispatch({ type: 'BATCH_UPDATE_SEGMENTS', updates });
          }
        }
      } catch (err) {
        console.error('[BgProcess] Exception:', err);
      }
    };

    processNext();
    processingIntervalRef.current = setInterval(processNext, 3000);
  }, [user, settings?.language, segments, fetchSegmentImages, dispatch]);

  // ---------------------------------------------------------------------------
  // GENERATE ALL (batch)
  // ---------------------------------------------------------------------------
  const handleGenerateAllBackground = useCallback(async () => {
    if (!user || !orderId) return;
    const segsToGen = segments.filter(s => !s.imageUrl && !s.isGeneratingImage && s.isEnabled !== false);
    if (segsToGen.length === 0) return;

    setIsGeneratingAll(true);
    setIsBackgroundMode(true);
    setShowBackgroundToast(true);
    setGenerationProgress({ current: 0, total: segsToGen.length, completed: 0, failed: 0 });

    try {
      const referenceImage = settings?.avatarUrl || '';
      const segmentsData = segsToGen.map(seg => {
        const originalIndex = segments.findIndex(s => s.id === seg.id);
        const isCreator = seg.shotType === 'CREATOR';
        return {
          segment_id: seg.segmentId,
          segment_number: originalIndex + 1,
          segment_type: seg.segmentType,
          shot_type: seg.shotType,
          emotion: seg.emotion,
          visual_prompt: seg.visualDirection || '',
          visual_direction: seg.visualDirection || '',
          script_text: seg.script,
          creator_costume: isCreator ? (seg.creatorCostume || '') : null,
          creator_appearance: isCreator ? (seg.creatorAppearance || '') : null,
          character_description: isCreator ? (settings?.characterDescription || '') : null,
          character_ref_png: isCreator ? referenceImage : null,
          reference_image_url: isCreator ? referenceImage : seg.referenceImageUrl,
          include_creator_face: !isCreator ? (seg.includeCreatorFace || false) : false,
          creator_ref_for_broll: (!isCreator && seg.includeCreatorFace) ? referenceImage : null,
        };
      });

      const { data, error } = await supabase.functions.invoke('generate-images', {
        body: {
          mode: 'create_jobs',
          user_id: user.id,
          session_id: orderId,
          segments: segmentsData,
          topic: state.topic || '',
          style: 'cinematic',
          aspect_ratio: settings?.aspectRatio || '9:16',
          provider: 'auto',
          character_description: settings?.characterDescription || '',
          character_ref_png: referenceImage,
          broll_model: IMAGE_MODELS.bRoll[imageModels.bRoll].edgeKey,
          language: settings?.language || 'id',
        },
      });

      if (error) throw error;

      if (data?.data?.jobs) {
        const updates: Array<{ segmentId: string; changes: Partial<WorkspaceSegment> }> = [];
        segments.forEach(seg => {
          const job = data.data.jobs.find((j: any) => j.segment_number === parseInt(seg.id));
          if (job) updates.push({ segmentId: seg.id, changes: { jobId: job.id, isGeneratingImage: true } });
        });
        if (updates.length > 0) dispatch({ type: 'BATCH_UPDATE_SEGMENTS', updates });
      }

      startBackgroundProcessing(orderId);
    } catch (err) {
      console.error('[ImageStep] Generate all error:', err);
      setIsGeneratingAll(false);
      setIsBackgroundMode(false);
      setShowBackgroundToast(false);
    }
  }, [user, orderId, segments, settings, state.topic, imageModels, dispatch, startBackgroundProcessing]);

  // ---------------------------------------------------------------------------
  // REGENERATE ALL
  // ---------------------------------------------------------------------------
  const handleRegenerateAll = useCallback(async () => {
    if (!user || !orderId) return;
    const enabledCount = enabledSegments.length;
    const confirmMsg = language === 'id'
      ? `Regenerate semua ${enabledCount} gambar? Gambar lama akan diganti.`
      : `Regenerate all ${enabledCount} images? Existing images will be replaced.`;
    if (!window.confirm(confirmMsg)) return;

    // Clear existing images and regenerate
    const updates: Array<{ segmentId: string; changes: Partial<WorkspaceSegment> }> = enabledSegments.map(seg => ({
      segmentId: seg.id,
      changes: { imageUrl: null, images: [], isGeneratingImage: false, imageError: null },
    }));
    dispatch({ type: 'BATCH_UPDATE_SEGMENTS', updates });

    // Trigger generate all
    setTimeout(() => handleGenerateAllBackground(), 100);
  }, [user, orderId, enabledSegments, language, dispatch, handleGenerateAllBackground]);

  // ---------------------------------------------------------------------------
  // REGENERATE SINGLE WITH NOTES
  // ---------------------------------------------------------------------------
  const handleRegenerateWithNotes = useCallback(async (notes: string) => {
    if (!user || !orderId || !regenerateModal.segment) return;
    const segment = regenerateModal.segment;
    const segmentNumber = parseInt(segment.id);

    dispatch({ type: 'SET_SEGMENT_GENERATING_IMAGE', segmentId: segment.id, isGenerating: true });
    setRegenerateModal({ isOpen: false, segment: null });

    try {
      const { data: existingJobs } = await supabase
        .from('image_generation_jobs')
        .select('id, generation_number')
        .eq('session_id', orderId)
        .eq('segment_number', segmentNumber)
        .eq('user_id', user.id)
        .order('generation_number', { ascending: false });

      const maxGenNumber = existingJobs?.[0]?.generation_number || 0;
      const currentImageCount = existingJobs?.length || 0;

      if (currentImageCount >= 3) {
        dispatch({ type: 'SET_SEGMENT_GENERATING_IMAGE', segmentId: segment.id, isGenerating: false });
        alert(language === 'id' ? 'Maksimal 3 gambar per segment. Hapus gambar lama dulu.' : 'Maximum 3 images per segment. Delete old images first.');
        return;
      }

      const isCreator = segment.shotType === 'CREATOR';
      const creatorRef = settings?.avatarUrl || '';
      const requestBody: Record<string, any> = {
        mode: 'regenerate_single',
        user_id: user.id,
        session_id: orderId,
        segment_number: segmentNumber,
        generation_number: maxGenNumber + 1,
        regeneration_notes: notes,
        visual_prompt: segment.visualDirection,
        script_text: segment.script,
        segment_type: segment.segmentType,
        shot_type: segment.shotType,
        emotion: segment.emotion,
        aspect_ratio: settings?.aspectRatio || '9:16',
        language: settings?.language || 'id',
        topic: state.topic || '',
      };

      if (isCreator) {
        requestBody.character_description = settings?.characterDescription || '';
        requestBody.character_ref_png = creatorRef;
        requestBody.creator_costume = segment.creatorCostume || '';
        requestBody.creator_appearance = segment.creatorAppearance || '';
      } else {
        requestBody.reference_image_url = segment.referenceImageUrl || null;
        requestBody.include_creator_face = segment.includeCreatorFace || false;
        requestBody.creator_ref_for_broll = segment.includeCreatorFace ? creatorRef : null;
      }

      const { error } = await supabase.functions.invoke('generate-images', { body: requestBody });
      if (error) throw error;

      startBackgroundProcessing(orderId);
    } catch (err) {
      console.error('[ImageStep] Regenerate failed:', err);
      dispatch({ type: 'SET_SEGMENT_IMAGE_ERROR', segmentId: segment.id, error: 'Regeneration failed' });
    }
  }, [user, orderId, regenerateModal.segment, settings, state.topic, language, dispatch, startBackgroundProcessing]);

  // ---------------------------------------------------------------------------
  // SELECT / DELETE IMAGE
  // ---------------------------------------------------------------------------
  const handleSelectImage = useCallback(async (imageId: string, segmentNumber: number) => {
    if (!user || !orderId) return;
    try {
      await supabase.from('image_generation_jobs').update({ is_selected: false }).eq('session_id', orderId).eq('segment_number', segmentNumber).eq('user_id', user.id);
      await supabase.from('image_generation_jobs').update({ is_selected: true }).eq('id', imageId).eq('user_id', user.id);

      const seg = segments.find((s, idx) => idx + 1 === segmentNumber);
      if (seg) {
        const updatedImages = seg.images.map(img => ({ ...img, isSelected: img.id === imageId }));
        const selectedUrl = updatedImages.find(img => img.isSelected)?.imageUrl || null;
        dispatch({ type: 'UPDATE_SEGMENT_IMAGES', segmentId: seg.id, images: updatedImages, selectedImageUrl: selectedUrl || undefined });
      }
    } catch (err) { console.error('[ImageStep] Select image failed:', err); }
  }, [user, orderId, segments, dispatch]);

  const handleDeleteImage = useCallback(async (imageId: string) => {
    if (!user || !orderId) return;
    if (!window.confirm(language === 'id' ? 'Hapus gambar ini?' : 'Delete this image?')) return;
    try {
      await supabase.from('image_generation_jobs').delete().eq('id', imageId).eq('user_id', user.id);

      for (const seg of segments) {
        const img = seg.images.find(i => i.id === imageId);
        if (img) {
          const updatedImages = seg.images.filter(i => i.id !== imageId);
          const wasSelected = img.isSelected;
          if (wasSelected && updatedImages.length > 0) updatedImages[0] = { ...updatedImages[0], isSelected: true };
          const selectedUrl = updatedImages.find(i => i.isSelected)?.imageUrl || null;
          dispatch({ type: 'UPDATE_SEGMENT_IMAGES', segmentId: seg.id, images: updatedImages, selectedImageUrl: selectedUrl || undefined });
          break;
        }
      }
    } catch (err) {
      console.error('[ImageStep] Delete image failed:', err);
    }
  }, [user, orderId, segments, language, dispatch]);

  // ---------------------------------------------------------------------------
  // DOWNLOAD IMAGE
  // ---------------------------------------------------------------------------
  const handleDownloadImage = useCallback(async (imageUrl: string, segmentType: string, segmentId: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(state.topic || 'image').replace(/[^a-z0-9]/gi, '_').substring(0, 30)}_${segmentType}_${segmentId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch { window.open(imageUrl, '_blank'); }
  }, [state.topic]);

  // ---------------------------------------------------------------------------
  // AI SCRIPT SHORTENING
  // ---------------------------------------------------------------------------
  const handleShortenScript = useCallback(async (segmentId: string, currentScript: string, targetWords: number) => {
    setShorteningSegmentId(segmentId);
    try {
      const langMap: Record<string, string> = { id: 'indonesian', en: 'english', hi: 'hindi', fr: 'french' };
      const scriptLang = langMap[language] || 'english';
      const { data, error } = await supabase.functions.invoke('generate-script', {
        body: { mode: 'shorten', script: currentScript, target_words: targetWords, language: scriptLang },
      });
      if (error) throw error;
      if (data?.shortened_script) {
        // Store previous for undo, then update
        dispatch({ type: 'BATCH_UPDATE_SEGMENTS', updates: [{ segmentId, changes: { script: data.shortened_script, previousScript: currentScript, shortenedByAI: true } }] });
      }
    } catch (err) { console.error('[ImageStep] Shorten error:', err); }
    finally { setShorteningSegmentId(null); }
  }, [language, dispatch]);

  const handleUndoScript = useCallback((segmentId: string) => {
    const seg = segments.find(s => s.id === segmentId);
    if (!seg?.previousScript) return;
    dispatch({ type: 'BATCH_UPDATE_SEGMENTS', updates: [{ segmentId, changes: { script: seg.previousScript, previousScript: undefined, shortenedByAI: false } }] });
  }, [segments, dispatch]);

  // ---------------------------------------------------------------------------
  // VD REWRITE (on layout change)
  // ---------------------------------------------------------------------------
  const rewriteVisualDirection = useCallback(async (segment: WorkspaceSegment, additionalNotes: string, includeCreatorFace: boolean, layout: string) => {
    try {
      setRewritingVDSegmentId(segment.id);
      const { data, error } = await supabase.functions.invoke('rewrite-visual-direction', {
        body: {
          visual_direction: segment.visualDirection,
          script_text: segment.script,
          shot_type: segment.shotType,
          topic: state.topic || '',
          additional_notes: additionalNotes,
          include_creator_face: includeCreatorFace,
          layout,
          reference_image_description: '',
          language: language || 'id',
        },
      });
      if (error) { console.error('[VD Rewrite] Error:', error); return; }
      if (data?.success && data.data) {
        dispatch({ type: 'EDIT_SEGMENT', segmentId: segment.id, field: 'visualDirection', value: data.data.visual_direction });
        if (data.data.structured) {
          dispatch({ type: 'BATCH_UPDATE_SEGMENTS', updates: [{ segmentId: segment.id, changes: { structuredVD: data.data.structured } }] });
        }
      }
    } catch (err) { console.error('[VD Rewrite] Exception:', err); }
    finally { setRewritingVDSegmentId(null); }
  }, [state.topic, language, dispatch]);

  // ---------------------------------------------------------------------------
  // APPLY OPTIONS (B-ROLL / CREATOR)
  // ---------------------------------------------------------------------------
  const handleApplyBRollOptions = useCallback((options: BRollOptions) => {
    if (!optionsModal.segment) return;
    const segment = optionsModal.segment;
    dispatch({
      type: 'SET_SEGMENT_OPTIONS',
      segmentId: segment.id,
      options: {
        additionalNotes: options.additionalNotes,
        includeCreatorFace: options.includeCreatorFace,
        referenceImageUrl: options.referenceImages[0]?.url || undefined,
        referenceImageSource: options.referenceImages[0]?.source || undefined,
        layout: options.layout as any,
        optionsApplied: true,
      },
    });
    setOptionsModal({ isOpen: false, segment: null });
    rewriteVisualDirection(segment, options.additionalNotes, options.includeCreatorFace, options.layout || segment.layout);
  }, [optionsModal.segment, dispatch, rewriteVisualDirection]);

  const handleApplyCreatorOptions = useCallback((notes: string) => {
    if (!optionsModal.segment) return;
    const segment = optionsModal.segment;
    dispatch({
      type: 'SET_SEGMENT_OPTIONS',
      segmentId: segment.id,
      options: { additionalNotes: notes, optionsApplied: true },
    });
    setOptionsModal({ isOpen: false, segment: null });
    rewriteVisualDirection(segment, notes, false, segment.layout);
  }, [optionsModal.segment, dispatch, rewriteVisualDirection]);

  const handleReferenceImageSelect = useCallback((imageUrl: string, source: 'unsplash' | 'pexels' | 'upload') => {
    if (!referenceImageModal.segment) return;
    dispatch({
      type: 'SET_SEGMENT_OPTIONS',
      segmentId: referenceImageModal.segment.id,
      options: { referenceImageUrl: imageUrl, referenceImageSource: source },
    });
    setReferenceImageModal({ isOpen: false, segment: null });
  }, [referenceImageModal.segment, dispatch]);

  // ---------------------------------------------------------------------------
  // SINGLE IMAGE GENERATION (per segment)
  // ---------------------------------------------------------------------------
  const handleGenerateImage = useCallback(async (segmentId: string): Promise<boolean> => {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment || !user || !orderId) return false;

    dispatch({ type: 'SET_SEGMENT_GENERATING_IMAGE', segmentId, isGenerating: true });

    try {
      const isCreator = segment.shotType === 'CREATOR';
      const referenceImage = settings?.avatarUrl || '';

      const { data, error } = await supabase.functions.invoke('generate-images', {
        body: {
          mode: 'create_jobs',
          user_id: user.id,
          session_id: orderId,
          segments: [{
            segment_id: segment.segmentId,
            segment_number: parseInt(segment.id),
            segment_type: segment.segmentType,
            shot_type: segment.shotType,
            emotion: segment.emotion,
            visual_prompt: segment.visualDirection || '',
            visual_direction: segment.visualDirection || '',
            script_text: segment.script,
            creator_costume: isCreator ? (segment.creatorCostume || '') : null,
            creator_appearance: isCreator ? (segment.creatorAppearance || '') : null,
            character_description: isCreator ? (settings?.characterDescription || '') : null,
            character_ref_png: isCreator ? referenceImage : null,
            reference_image_url: isCreator ? referenceImage : segment.referenceImageUrl,
            include_creator_face: !isCreator ? (segment.includeCreatorFace || false) : false,
            creator_ref_for_broll: (!isCreator && segment.includeCreatorFace) ? referenceImage : null,
          }],
          topic: state.topic || '',
          style: 'cinematic',
          aspect_ratio: settings?.aspectRatio || '9:16',
          provider: 'auto',
          character_ref_png: referenceImage,
          broll_model: IMAGE_MODELS.bRoll[imageModels.bRoll].edgeKey,
          language: settings?.language || 'id',
        },
      });

      if (error) throw error;

      if (data?.data?.jobs?.[0]) {
        dispatch({ type: 'BATCH_UPDATE_SEGMENTS', updates: [{ segmentId, changes: { jobId: data.data.jobs[0].id } }] });
      }

      startBackgroundProcessing(orderId);
      return true;
    } catch (err) {
      console.error('[ImageStep] Generate single error:', err);
      dispatch({ type: 'SET_SEGMENT_IMAGE_ERROR', segmentId, error: 'Generation failed' });
      return false;
    }
  }, [segments, user, orderId, settings, state.topic, imageModels, dispatch, startBackgroundProcessing]);

  // ---------------------------------------------------------------------------
  // GROUPED SEGMENTS (for full view BODY grouping)
  // ---------------------------------------------------------------------------
  const groupedSegments = useMemo(() => {
    if (fullViewColumns === 2) {
      return segments.map((seg, i) => ({ isBodyGroup: false, segments: [{ ...seg, originalIndex: i }] }));
    }
    return segments.reduce((acc, segment, index) => {
      const baseType = segment.segmentType.replace(/-\d+$/, '').replace(/_\d+$/, '');
      const isBody = baseType === 'BODY' || segment.segmentType.startsWith('BODY');
      if (isBody) {
        const lastGroup = acc[acc.length - 1];
        if (lastGroup?.isBodyGroup) { lastGroup.segments.push({ ...segment, originalIndex: index }); }
        else { acc.push({ isBodyGroup: true, segments: [{ ...segment, originalIndex: index }] }); }
      } else {
        acc.push({ isBodyGroup: false, segments: [{ ...segment, originalIndex: index }] });
      }
      return acc;
    }, [] as { isBodyGroup: boolean; segments: (WorkspaceSegment & { originalIndex: number })[] }[]);
  }, [segments, fullViewColumns]);

  // Helper: find sibling segments with same base type
  const getSiblingSegments = useCallback((segment: WorkspaceSegment): WorkspaceSegment[] => {
    const baseType = segment.segmentType.replace(/-\d+$/, '').replace(/_\d+$/, '');
    return segments.filter(s => {
      if (s.id === segment.id) return false;
      return s.segmentType.replace(/-\d+$/, '').replace(/_\d+$/, '') === baseType;
    });
  }, [segments]);

  // ---------------------------------------------------------------------------
  // VIEW MODE HANDLERS
  // ---------------------------------------------------------------------------
  const setViewModeAndPersist = useCallback((mode: 'full' | 'compact' | 'grid') => {
    setViewMode(mode);
    localStorage.setItem('sparkfluence_view_mode', mode);
    setExpandedSegmentId(null);
  }, []);

  const setFullViewColumnsAndPersist = useCallback((cols: 1 | 2) => {
    setFullViewColumns(cols);
    localStorage.setItem('sparkfluence_full_view_cols', String(cols));
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="flex flex-col">
      {/* Background Processing Toast */}
      {showBackgroundToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
          <div className="bg-gradient-to-r from-emerald-600/90 to-emerald-500/90 backdrop-blur-lg rounded-xl p-4 shadow-2xl border border-white/10">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Cloud className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-white font-semibold text-sm">
                    {language === 'id' ? 'Proses di Background' : 'Background Processing'}
                  </h4>
                  <button onClick={() => setShowBackgroundToast(false)} className="p-1 hover:bg-white/10 rounded">
                    <X className="w-4 h-4 text-white/60" />
                  </button>
                </div>
                <p className="text-white/80 text-xs leading-relaxed mb-3">
                  {language === 'id'
                    ? 'Gambar sedang di-generate di background. Anda bisa melakukan aktivitas lain.'
                    : 'Images are being generated in the background. You can do other activities.'}
                </p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-white/60">
                    <span>{generationProgress.completed}/{generationProgress.total} complete</span>
                    {generationProgress.failed > 0 && <span className="text-red-300">{generationProgress.failed} failed</span>}
                  </div>
                  <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${generationProgress.total > 0 ? (generationProgress.completed / generationProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* HEADER                                                             */}
      {/* ================================================================== */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white mb-1 line-clamp-2">{state.topic || 'Image Generation'}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-neutral-500 text-sm">
                {language === 'id' ? 'Durasi' : 'Duration'}: {totalDuration}s
                {settings && ` • ${settings.aspectRatio}`}
                {` • ${imagesGenerated}/${enabledSegments.length} images`}
              </p>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-0.5 border border-[#262626] rounded-lg p-0.5">
                <button onClick={() => setViewModeAndPersist('full')}
                  className={`p-1.5 rounded transition-colors ${viewMode === 'full' ? 'bg-emerald-500 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                  title="Full View"><LayoutList className="w-3.5 h-3.5" /></button>
                <button onClick={() => setViewModeAndPersist('compact')}
                  className={`p-1.5 rounded transition-colors ${viewMode === 'compact' ? 'bg-emerald-500 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                  title="Compact View"><List className="w-3.5 h-3.5" /></button>
                <button onClick={() => setViewModeAndPersist('grid')}
                  className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-emerald-500 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                  title="Grid View"><LayoutGrid className="w-3.5 h-3.5" /></button>
              </div>

              {/* Full View Column Toggle */}
              {viewMode === 'full' && (
                <div className="flex items-center gap-0.5 border-l border-[#262626] pl-1 ml-0.5">
                  <button onClick={() => setFullViewColumnsAndPersist(1)}
                    className={`p-1.5 rounded transition-colors ${fullViewColumns === 1 ? 'bg-emerald-500 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                    title="1 Column"><LayoutList className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setFullViewColumnsAndPersist(2)}
                    className={`p-1.5 rounded transition-colors ${fullViewColumns === 2 ? 'bg-emerald-500 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                    title="2 Columns"><Columns2 className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          </div>

          {/* Generate All + Model Selection */}
          <div className="flex gap-2">
            {/* Model Dropdown */}
            <div className="relative" ref={modelDropdownRef}>
              <button onClick={() => setShowModelDropdown(!showModelDropdown)}
                className="h-10 px-3 flex items-center gap-2 border border-[#262626] rounded-lg text-neutral-300 hover:bg-[#1E1E1E] transition-colors text-sm">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Models</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showModelDropdown && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-[#1E1E1E] border border-[#262626] rounded-xl shadow-lg z-[200] p-4">
                  <h4 className="text-sm font-semibold text-white mb-3">Image Model Selection</h4>
                  <div className="mb-3">
                    <label className="text-xs text-neutral-500 mb-1 block">A-ROLL (HOOK, CTA)</label>
                    <select value={imageModels.aRoll} onChange={e => setImageModels(prev => ({ ...prev, aRoll: e.target.value as any }))}
                      className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white">
                      {Object.entries(IMAGE_MODELS.aRoll).map(([key, model]) => <option key={key} value={key}>{model.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">B-ROLL (FORE, BODY, PEAK)</label>
                    <select value={imageModels.bRoll} onChange={e => setImageModels(prev => ({ ...prev, bRoll: e.target.value as any }))}
                      className="w-full bg-[#161616] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white">
                      {Object.entries(IMAGE_MODELS.bRoll).map(([key, model]) => <option key={key} value={key}>{model.label}</option>)}
                    </select>
                  </div>
                  <p className="text-xs text-neutral-500 mt-3">Selected models apply to new generations</p>
                </div>
              )}
            </div>

            {/* Generate / Regenerate All Button */}
            <button
              onClick={allHaveImages ? handleRegenerateAll : handleGenerateAllBackground}
              disabled={isGeneratingAll || isBackgroundMode}
              className={`h-10 px-5 font-medium flex items-center gap-2 rounded-lg text-white transition-colors disabled:opacity-40 ${
                isBackgroundMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-500 hover:bg-emerald-600'
              }`}
            >
              {isBackgroundMode ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>{generationProgress.completed}/{generationProgress.total}</span></>
              ) : allHaveImages ? (
                <><RefreshCw className="w-4 h-4" /><span>{language === 'id' ? 'Regenerate Semua' : 'Regenerate All'}</span></>
              ) : (
                <><Sparkles className="w-4 h-4" /><span>{language === 'id' ? 'Generate Semua' : 'Generate All'} ({enabledSegments.length - imagesGenerated})</span></>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* COMPACT VIEW                                                       */}
      {/* ================================================================== */}
      {viewMode === 'compact' && (
        <div className="space-y-1.5">
          {segments.map((segment, index) => {
            const isExpanded = expandedSegmentId === segment.id;
            const isCreator = segment.shotType === 'CREATOR';
            const isDisabled = !segment.isEnabled;
            const wordStatus = getWordLimitStatus(segment.script, segment.durationSeconds, language as LanguageCode);

            if (isExpanded) {
              return (
                <div key={segment.id} className="relative">
                  <button onClick={() => setExpandedSegmentId(null)}
                    className="absolute top-2 right-2 z-10 p-1 bg-[#1E1E1E] border border-[#262626] rounded hover:bg-[#262626]" title="Collapse">
                    <ChevronUp className="w-4 h-4 text-neutral-400" />
                  </button>
                  {renderFullSegmentCard(segment, index, isCreator, isDisabled)}
                </div>
              );
            }

            return (
              <div key={segment.id} onClick={() => setExpandedSegmentId(segment.id)}
                className={`flex items-center gap-3 px-3 py-2.5 border rounded-lg cursor-pointer transition-colors hover:bg-[#1E1E1E] ${
                  segment.imageUrl ? 'border-green-500/30' : 'border-[#262626]'
                } ${isDisabled ? 'opacity-40' : ''}`}>
                <span className="text-xs text-neutral-500 w-5 text-center">{index + 1}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  isCreator ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'
                }`}>{segment.segmentType}</span>
                <span className="text-[10px] text-neutral-500">{segment.durationSeconds}s</span>
                <p className="flex-1 text-sm text-white truncate">{segment.script || '(no script)'}</p>
                {wordStatus.status === 'error' && (
                  <span className="text-[9px] text-red-500 bg-red-500/10 px-1 rounded">+{wordStatus.overBy}</span>
                )}
                {segment.optionsApplied && <Settings2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
                {segment.imageUrl ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : segment.isGeneratingImage ? (
                  <Loader2 className="w-4 h-4 text-emerald-500 animate-spin flex-shrink-0" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                )}
                <ChevronDown className="w-4 h-4 text-neutral-500 flex-shrink-0" />
              </div>
            );
          })}
        </div>
      )}

      {/* ================================================================== */}
      {/* GRID VIEW                                                          */}
      {/* ================================================================== */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 gap-3">
          {segments.map((segment, index) => {
            const isCreator = segment.shotType === 'CREATOR';
            const isDisabled = !segment.isEnabled;
            return (
              <div key={segment.id}
                onClick={() => { setExpandedSegmentId(segment.id); setViewModeAndPersist('compact'); }}
                className={`border rounded-lg overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-emerald-500/50 group/gridcard relative ${
                  segment.imageUrl ? 'border-green-500/30' : 'border-[#262626]'
                } ${isDisabled ? 'opacity-40' : ''}`}>
                {/* Image thumbnail */}
                <div className="aspect-video bg-[#161616] relative">
                  {segment.imageUrl ? (
                    <img src={segment.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : segment.isGeneratingImage ? (
                    <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-neutral-600"><ImageIcon className="w-8 h-8" /></div>
                  )}
                  <span className={`absolute top-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isCreator ? 'bg-pink-500/80 text-white' : 'bg-blue-500/80 text-white'
                  }`}>{segment.segmentType}</span>
                  <span className="absolute top-1 right-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">{segment.durationSeconds}s</span>
                  {segment.imageUrl && <div className="absolute bottom-1 right-1 bg-green-500 rounded-full p-0.5"><CheckCircle2 className="w-3 h-3 text-white" /></div>}
                </div>
                {/* Info */}
                <div className="p-2 bg-[#161616]">
                  <p className="text-xs text-white line-clamp-2 leading-relaxed">{segment.script || '(no script)'}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {segment.optionsApplied && <span className="text-[9px] text-blue-400 bg-blue-500/10 px-1 py-0.5 rounded">Options</span>}
                    {!segment.isEnabled && <span className="text-[9px] px-1 py-0.5 rounded text-neutral-500 bg-neutral-500/10">OFF</span>}
                  </div>
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/85 opacity-0 group-hover/gridcard:opacity-100 transition-opacity duration-200 flex flex-col p-3 overflow-hidden z-10">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isCreator ? 'bg-pink-500/80 text-white' : 'bg-blue-500/80 text-white'}`}>{segment.segmentType}</span>
                    <span className="text-[10px] text-white/80">{segment.durationSeconds}s | {segment.shotType}</span>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto mb-1.5">
                    {(() => {
                      const svd = segment.structuredVD || parseVisualDirection(segment.visualDirection);
                      if (!svd || (!svd.scene && !svd.camera)) return <p className="text-[10px] text-white/60 leading-relaxed">{segment.visualDirection?.slice(0, 150) || '(no VD)'}</p>;
                      return (
                        <div className="space-y-0.5">
                          {[
                            { label: 'Scene', value: svd.scene, color: 'text-blue-300' },
                            { label: 'Camera', value: svd.camera, color: 'text-purple-300' },
                            { label: 'Light', value: svd.lighting, color: 'text-amber-300' },
                            { label: 'Color', value: svd.color, color: 'text-teal-300' },
                            { label: 'Mood', value: svd.mood, color: 'text-pink-300' },
                            { label: 'FX', value: svd.fx, color: 'text-orange-300' },
                          ].filter(r => r.value).map(r => (
                            <div key={r.label} className="flex gap-1.5 text-[9px] leading-relaxed">
                              <span className={`font-medium ${r.color} w-[38px] flex-shrink-0`}>{r.label}</span>
                              <span className="text-white/70">{r.value}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleGenerateImage(segment.id); }}
                    disabled={segment.isGeneratingImage || isBackgroundMode || isGeneratingAll}
                    className="mt-auto w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {segment.isGeneratingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : segment.imageUrl ? <RefreshCw className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                    {segment.imageUrl ? 'Regenerate' : 'Generate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================================================================== */}
      {/* FULL VIEW                                                          */}
      {/* ================================================================== */}
      {viewMode === 'full' && (
        <div className={fullViewColumns === 2 ? 'grid grid-cols-1 xl:grid-cols-2 gap-5' : 'space-y-4'}>
          {groupedSegments.map((group, groupIndex) => (
            <div key={groupIndex}
              className={group.isBodyGroup && group.segments.length > 1 ? 'bg-[#0D1117] border border-[#262626] rounded-2xl p-3 space-y-3' : ''}>
              {group.isBodyGroup && group.segments.length > 1 && (
                <div className="flex items-center gap-2 px-2 pb-2 border-b border-[#262626]">
                  <span className="text-blue-400 text-sm font-medium">BODY</span>
                  <span className="text-neutral-500 text-xs">({group.segments.length} {language === 'id' ? 'segmen' : 'segments'})</span>
                </div>
              )}
              {group.segments.map((segment, segIndex) => {
                const displayIndex = segment.originalIndex + 1;
                const isCreator = segment.shotType === 'CREATOR';
                const isDisabled = !segment.isEnabled;
                return renderFullSegmentCard(segment, displayIndex - 1, isCreator, isDisabled, group.isBodyGroup && group.segments.length > 1 ? `BODY-${segIndex + 1}` : undefined);
              })}
            </div>
          ))}
        </div>
      )}

      {/* ================================================================== */}
      {/* IMAGE PREVIEW MODAL                                                */}
      {/* ================================================================== */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 sm:p-8" onClick={() => setPreviewImage(null)}>
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button onClick={e => { e.stopPropagation(); handleDownloadImage(previewImage, 'preview', Date.now().toString()); }}
              className="p-2 bg-green-600 hover:bg-green-700 rounded-full transition-colors" title="Download">
              <Download className="w-6 h-6 text-white" />
            </button>
            <button onClick={() => setPreviewImage(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* ================================================================== */}
      {/* MODALS                                                             */}
      {/* ================================================================== */}
      <RegenerateModal
        isOpen={regenerateModal.isOpen}
        onClose={() => setRegenerateModal({ isOpen: false, segment: null })}
        segment={regenerateModal.segment ? asOldSegment(regenerateModal.segment) : null}
        onRegenerate={handleRegenerateWithNotes}
      />

      <ReferenceImageModal
        isOpen={referenceImageModal.isOpen}
        onClose={() => setReferenceImageModal({ isOpen: false, segment: null })}
        segment={referenceImageModal.segment ? asOldSegment(referenceImageModal.segment) : null}
        initialKeywords=""
        topic={state.topic || ''}
        onSelect={handleReferenceImageSelect}
      />

      {/* B-ROLL Options Modal */}
      {optionsModal.isOpen && optionsModal.segment && optionsModal.segment.shotType !== 'CREATOR' && (
        <GenerateBRollModal
          isOpen={true}
          onClose={() => setOptionsModal({ isOpen: false, segment: null })}
          segment={asOldSegment(optionsModal.segment)}
          onApplyOptions={handleApplyBRollOptions}
          language={language}
          topic={state.topic || ''}
          maxReferenceImages={3}
          initialLayout={optionsModal.segment.layout}
          sessionAvatarUrl={settings?.avatarUrl || null}
          profileAvatarUrl={settings?.avatarUrl || ''}
          availableAvatars={savedAvatars.map(a => ({ ...a, source: 'saved' as const }))}
        />
      )}

      {/* CREATOR Options Modal */}
      <CreatorOptionsModal
        isOpen={optionsModal.isOpen && optionsModal.segment?.shotType === 'CREATOR'}
        segment={optionsModal.segment ? asOldSegment(optionsModal.segment) : null}
        onApply={handleApplyCreatorOptions}
        onClose={() => setOptionsModal({ isOpen: false, segment: null })}
        language={language}
      />
    </div>
  );

  // ============================================================================
  // FULL SEGMENT CARD (reused by full view + expanded compact view)
  // ============================================================================
  function renderFullSegmentCard(
    segment: WorkspaceSegment,
    index: number,
    isCreator: boolean,
    isDisabled: boolean,
    displayTypeOverride?: string,
  ) {
    const wordStatus = getWordLimitStatus(segment.script, segment.durationSeconds, language as LanguageCode);
    const isShortening = shorteningSegmentId === segment.id;

    return (
      <div key={segment.id} className={`bg-[#161616] border rounded-xl ${segment.imageUrl ? 'border-green-500/30' : 'border-[#262626]'}`}>
        {/* Segment Header */}
        <div className="p-3 sm:p-4 border-b border-[#262626]">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold ${segment.imageUrl ? 'bg-green-600' : 'bg-emerald-500'}`}>
                {segment.imageUrl ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
              </div>
              <span className="text-white font-semibold text-sm sm:text-base">{displayTypeOverride || segment.segmentType}</span>
              {/* ON/OFF toggle */}
              <button onClick={() => dispatch({ type: 'TOGGLE_SEGMENT', segmentId: segment.id })}
                className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                  segment.isEnabled ? 'bg-green-500/20 text-green-400 border-green-500/40 hover:bg-green-500/30'
                    : 'bg-neutral-500/20 text-neutral-500 border-neutral-500/40 hover:bg-neutral-500/30'
                }`}>
                {segment.isEnabled ? 'ON' : 'OFF'}
              </button>
              <span className="text-neutral-500 text-xs sm:text-sm">{segment.timing}</span>
              <select value={segment.durationSeconds}
                onChange={e => dispatch({ type: 'ADJUST_DURATION', segmentId: segment.id, durationSeconds: parseInt(e.target.value) })}
                className="text-neutral-400 text-xs bg-transparent border border-[#262626] rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer hover:border-emerald-500">
                {[5, 8, 10].map(d => <option key={d} value={d}>{d}s</option>)}
              </select>
              {/* Layout selector */}
              {(isCreator || segment.includeCreatorFace) && !isDisabled && (
                <>
                  <LayoutPopover value={segment.layout} onChange={layout => {
                    dispatch({ type: 'SET_SEGMENT_LAYOUT', segmentId: segment.id, layout });
                    setRewritingVDSegmentId(segment.id);
                    rewriteVisualDirection(segment, segment.additionalNotes || '', segment.includeCreatorFace || isCreator, layout)
                      .finally(() => setRewritingVDSegmentId(null));
                  }} />
                  {rewritingVDSegmentId === segment.id && <Loader2 className="w-3 h-3 text-emerald-500 animate-spin" />}
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded ${isCreator ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'}`}>{segment.shotType}</span>
              {segment.emotion && <span className="text-emerald-500 text-xs bg-emerald-500/10 px-2 py-1 rounded hidden sm:inline">{segment.emotion}</span>}
              {segment.transition && <span className="text-amber-400 text-xs bg-amber-500/10 px-2 py-1 rounded hidden sm:inline">{segment.transition}</span>}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`p-3 sm:p-4 ${isDisabled ? 'opacity-40 pointer-events-none select-none' : ''}`}>
          <div className={`flex gap-4 ${fullViewColumns === 2 ? 'flex-col' : 'flex-col sm:flex-row'}`}>
            {/* Script + VD */}
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-neutral-400 text-xs">{language === 'id' ? 'Script (VO)' : 'Script (VO)'}</label>
                    {/* Merge buttons for split segments */}
                    {segment.splitGroupId && !segment.segmentType.endsWith('-1') && (
                      <button onClick={() => {/* merge via context - would need MERGE action */}}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-500/15 hover:bg-violet-500/25 text-violet-400 text-[10px] font-medium transition-colors border border-violet-500/20">
                        <Merge className="w-3 h-3" />{language === 'id' ? 'Gabung' : 'Merge'}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      wordStatus.status === 'error' ? 'bg-red-500/20 text-red-500'
                        : wordStatus.status === 'warning' ? 'bg-amber-500/20 text-amber-500'
                        : 'bg-green-500/20 text-green-500'
                    }`}>
                      {wordStatus.count}/{wordStatus.max} {language === 'id' ? 'kata' : 'words'}
                      {wordStatus.status === 'error' && ` (+${wordStatus.overBy})`}
                    </span>
                    {wordStatus.status === 'error' && (
                      <>
                        <button onClick={() => handleShortenScript(segment.id, segment.script, wordStatus.max)}
                          disabled={isShortening}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-500 text-[10px] font-medium transition-colors disabled:opacity-50">
                          {isShortening ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          <span className="hidden sm:inline">{language === 'id' ? 'Perpendek' : 'Shorten'}</span>
                        </button>
                        {!['HOOK', 'CTA', 'LOOP-END'].includes(segment.segmentType.toUpperCase()) && wordStatus.count >= 4 && (
                          <button onClick={() => dispatch({ type: 'SPLIT_SEGMENT', segmentId: segment.id, splitIndex: Math.floor(wordStatus.count / 2) })}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-500/15 hover:bg-violet-500/25 text-violet-400 text-[10px] font-medium transition-colors">
                            <Scissors className="w-3 h-3" /><span className="hidden sm:inline">Split</span>
                          </button>
                        )}
                      </>
                    )}
                    {segment.shortenedByAI && segment.previousScript && (
                      <button onClick={() => handleUndoScript(segment.id)}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-500/20 hover:bg-neutral-500/30 text-neutral-400 text-[10px] font-medium transition-colors">
                        <Undo2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <textarea value={segment.script}
                  onChange={e => dispatch({ type: 'EDIT_SEGMENT', segmentId: segment.id, field: 'script', value: e.target.value })}
                  className={`w-full bg-[#0B0E14] border rounded-lg p-3 text-white text-sm ${fullViewColumns === 2 ? 'min-h-[60px]' : 'min-h-[80px]'} resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                    wordStatus.status === 'error' ? 'border-red-500/50' : wordStatus.status === 'warning' ? 'border-amber-500/50' : 'border-[#262626]'
                  }`}
                  placeholder={language === 'id' ? 'Tulis script...' : 'Write script...'} />
              </div>

              {/* Visual Direction Chips */}
              {segment.visualDirection && (() => {
                const svd = segment.structuredVD || parseVisualDirection(segment.visualDirection);
                return (
                  <div>
                    <label className="text-neutral-400 text-xs mb-1.5 block">{language === 'id' ? 'Arahan Visual' : 'Visual Direction'}</label>
                    {svd ? <StructuredVDChips structuredVD={svd} /> : (
                      <div className="bg-[#0B0E14] border border-[#262626] rounded-lg p-3 text-neutral-400 text-xs">{segment.visualDirection}</div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Visual Preview Gallery + Options */}
            <div className={fullViewColumns === 2
              ? 'flex items-start gap-3 border-t border-[#262626] pt-3'
              : 'w-full sm:w-48 xl:w-52 flex-shrink-0'
            }>
              <div className={fullViewColumns === 2 ? 'w-40 flex-shrink-0' : 'w-full'}>
                <label className="text-neutral-400 text-xs mb-1.5 block">
                  {language === 'id' ? 'Preview Visual' : 'Visual Preview'}
                  {isCreator && <span className="text-pink-400 ml-1">(Creator Shot)</span>}
                </label>
                <VisualPreviewGallery
                  images={segment.images || []}
                  segmentId={segment.id}
                  segmentType={segment.segmentType}
                  isCreatorShot={isCreator}
                  isGenerating={segment.isGeneratingImage}
                  imageError={segment.imageError || null}
                  selectedImageUrl={segment.imageUrl}
                  onGenerate={() => handleGenerateImage(segment.id)}
                  onRegenerate={() => isCreator ? setRegenerateModal({ isOpen: true, segment }) : handleGenerateImage(segment.id)}
                  onSelectImage={imageId => handleSelectImage(imageId, parseInt(segment.id))}
                  onDeleteImage={handleDeleteImage}
                  onPreview={setPreviewImage}
                  onDownload={imageUrl => handleDownloadImage(imageUrl, segment.segmentType, segment.id)}
                  disabled={isBackgroundMode || isGeneratingAll}
                  language={language}
                />
              </div>

              {/* Options + Badges (beside gallery in 2-col, below in 1-col) */}
              <div className={fullViewColumns === 2 ? 'flex-1 flex flex-col gap-2' : ''}>
                {/* Set Options Button */}
                {!isDisabled && (
                  <button onClick={() => setOptionsModal({ isOpen: true, segment })}
                    className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#262626] bg-[#1E1E1E] hover:bg-[#262626] hover:border-emerald-500/50 text-neutral-400 text-xs font-medium transition-colors ${fullViewColumns === 2 ? '' : 'mt-2 w-full'}`}>
                    <Camera className="w-3.5 h-3.5" />
                    {language === 'id' ? 'Atur Opsi' : 'Set Options'}
                  </button>
                )}

                {/* Applied Options Badges */}
                {segment.optionsApplied && (
                  <div className={`flex items-center gap-1.5 flex-wrap ${fullViewColumns === 2 ? '' : 'mt-1.5'}`}>
                    {segment.referenceImageUrl && <span className="text-[10px] text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">+ Ref</span>}
                    {segment.additionalNotes && (
                      <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                        &quot;{segment.additionalNotes.slice(0, 20)}{segment.additionalNotes.length > 20 ? '...' : ''}&quot;
                      </span>
                    )}
                    {!isCreator && segment.includeCreatorFace && <span className="text-[10px] text-pink-500 bg-pink-500/10 px-1.5 py-0.5 rounded">+ Face</span>}
                    {(isCreator || segment.includeCreatorFace) && (
                      <span className="text-[10px] text-purple-500 bg-purple-500/10 px-1.5 py-0.5 rounded">
                        {LAYOUT_OPTIONS.find(o => o.value === segment.layout)?.label || 'Full'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default ImageStep;
