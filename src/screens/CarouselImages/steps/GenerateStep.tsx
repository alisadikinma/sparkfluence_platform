import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wand2, Upload, RefreshCw, Copy, ChevronRight,
  Loader2, AlertCircle, Trash2, Eye, Video, ImageIcon,
  Clipboard, X, Settings2, SkipForward, ArrowRight
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { useBrandingKit } from '../../../hooks/useBrandingKit';
import type {
  CarouselProject, CarouselSlide, CarouselSlideRow, CarouselSlideType,
} from '../../../types/carousel';
import { mapCarouselSlideRow, SLIDE_TYPE_CONFIG } from '../../../types/carousel';
import { CreatorConfigModal } from '../components/CreatorConfigModal';
import { BRollConfigModal } from '../components/BRollConfigModal';
import { ModelSelector, type ImageModelSettings } from '../components/ModelSelector';

interface GenerateStepProps {
  project: CarouselProject;
  onProjectUpdate: () => void;
}

const CREATOR_TYPES = new Set<CarouselSlideType>(['HOOK', 'FORE', 'CTA']);
const isCreatorSlide = (type: CarouselSlideType) => CREATOR_TYPES.has(type);

/**
 * Enforce Sparkfluence carousel framework: HOOK → FORE → BODY(s) → CTA
 * Source slides are mapped to closest framework slot.
 * Missing framework slots (e.g., no FORE in source) get empty source.
 */
function enforceFramework(rawSlides: CarouselSlide[], sourceImages: string[]): Array<{
  slide: CarouselSlide;
  sourceUrl: string | null;
  isFrameworkGenerated: boolean; // true if this slot was created by framework, not from source
}> {
  if (rawSlides.length === 0) return [];

  // Group raw slides by type
  const hooks = rawSlides.filter(s => s.slideType === 'HOOK');
  const fores = rawSlides.filter(s => s.slideType === 'FORE');
  const bodies = rawSlides.filter(s => s.slideType === 'BODY');
  const ctas = rawSlides.filter(s => s.slideType === 'CTA');

  const result: Array<{ slide: CarouselSlide; sourceUrl: string | null; isFrameworkGenerated: boolean }> = [];

  // HOOK — always slot 1. Use first hook or first raw slide
  if (hooks.length > 0) {
    const s = hooks[0];
    result.push({ slide: s, sourceUrl: s.sourceImageUrl || sourceImages[s.slideIndex] || null, isFrameworkGenerated: false });
  } else {
    // No hook detected — treat first slide as hook
    const s = rawSlides[0];
    result.push({ slide: { ...s, slideType: 'HOOK' }, sourceUrl: s.sourceImageUrl || sourceImages[0] || null, isFrameworkGenerated: false });
  }

  // FORE — always slot 2. If source has no FORE, create empty framework slot
  if (fores.length > 0) {
    const s = fores[0];
    result.push({ slide: s, sourceUrl: s.sourceImageUrl || sourceImages[s.slideIndex] || null, isFrameworkGenerated: false });
  } else {
    // Create a framework-only FORE (no source image)
    result.push({
      slide: createFrameworkSlide('FORE', result.length, rawSlides[0]?.projectId || ''),
      sourceUrl: null,
      isFrameworkGenerated: true,
    });
  }

  // BODY — all body slides from source
  for (const s of bodies) {
    result.push({ slide: s, sourceUrl: s.sourceImageUrl || sourceImages[s.slideIndex] || null, isFrameworkGenerated: false });
  }

  // Any remaining slides that are not HOOK/FORE/CTA/BODY (shouldn't happen, but safety)
  const usedIds = new Set(result.map(r => r.slide.id));
  for (const s of rawSlides) {
    if (!usedIds.has(s.id) && s.slideType !== 'CTA') {
      result.push({ slide: { ...s, slideType: 'BODY' }, sourceUrl: s.sourceImageUrl || sourceImages[s.slideIndex] || null, isFrameworkGenerated: false });
    }
  }

  // CTA — always last. If source has no CTA, create empty framework slot
  if (ctas.length > 0) {
    const s = ctas[0];
    result.push({ slide: s, sourceUrl: s.sourceImageUrl || sourceImages[s.slideIndex] || null, isFrameworkGenerated: false });
  } else {
    result.push({
      slide: createFrameworkSlide('CTA', result.length, rawSlides[0]?.projectId || ''),
      sourceUrl: null,
      isFrameworkGenerated: true,
    });
  }

  return result;
}

function createFrameworkSlide(type: CarouselSlideType, index: number, projectId: string): CarouselSlide {
  return {
    id: `framework-${type.toLowerCase()}-${Date.now()}`,
    projectId,
    slideIndex: index,
    slideType: type,
    generationMethod: 'ai',
    analysisData: null,
    prompt: null,
    imageUrl: null,
    imageModel: null,
    sourceImageUrl: null,
    referenceImageUrl: null,
    creatorFace: isCreatorSlide(type),
    additionalNote: null,
    editorState: null,
    videoToggle: type === 'HOOK' || type === 'CTA',
    videoUrl: null,
    videoMotionPreset: null,
    videoDuration: 8,
    videoCustomPrompt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export const GenerateStep: React.FC<GenerateStepProps> = ({ project, onProjectUpdate }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { kit: brandingKit } = useBrandingKit();

  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiTextMode, setAiTextMode] = useState(project.aiTextMode);
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [regeneratingSlide, setRegeneratingSlide] = useState<string | null>(null);
  const [skippedSlides, setSkippedSlides] = useState<Set<string>>(new Set());
  const [imageModels, setImageModels] = useState<ImageModelSettings>({
    aRoll: 'fal-nano-banana-edit',
    bRoll: 'fal-seedream-v4',
  });

  const [configModal, setConfigModal] = useState<{ slide: CarouselSlide; index: number } | null>(null);
  const hasAutoAnalyzed = useRef(false);

  // Fetch slides from DB
  const fetchSlides = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('carousel_slides')
      .select('*')
      .eq('project_id', project.id)
      .order('slide_index');

    if (!error && data) {
      setSlides(data.map((row: CarouselSlideRow) => mapCarouselSlideRow(row)));
    }
    setLoading(false);
  }, [project.id]);

  useEffect(() => { fetchSlides(); }, [fetchSlides]);

  // Fetch source images
  const [sourceImages, setSourceImages] = useState<string[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('carousel_source_urls')
        .select('media_urls')
        .eq('project_id', project.id)
        .order('source_order');

      if (data) {
        const urls: string[] = [];
        for (const row of data) {
          if (row.media_urls && Array.isArray(row.media_urls)) {
            for (const m of row.media_urls) {
              if (m.url) urls.push(m.url);
            }
          }
        }
        setSourceImages(urls);
      }
    })();
  }, [project.id]);

  // Auto-analyze on mount
  useEffect(() => {
    if (loading || hasAutoAnalyzed.current || slides.length === 0 || sourceImages.length === 0) return;

    const needsEnrichment = slides.some(s =>
      !s.analysisData?.visualStyle?.dominantColors ||
      s.analysisData?.visualStyle?.dominantColors?.length === 0
    );

    if (needsEnrichment) {
      hasAutoAnalyzed.current = true;
      handleAnalyze();
    } else {
      hasAutoAnalyzed.current = true;
    }
  }, [loading, slides, sourceImages]);

  // Enforce framework structure
  const frameworkSlides = enforceFramework(slides, sourceImages);
  const activeFramework = frameworkSlides.filter(f => !skippedSlides.has(f.slide.id));

  // Analyze source images
  const handleAnalyze = async () => {
    if (sourceImages.length === 0) return;
    setAnalyzing(true);

    const slideTypes: Record<number, string> = {};
    slides.forEach(s => { slideTypes[s.slideIndex] = s.slideType; });

    const { data, error } = await supabase.functions.invoke('analyze-carousel-source', {
      body: {
        project_id: project.id,
        image_urls: sourceImages,
        ai_text_mode: aiTextMode,
        slide_types: slideTypes,
      },
    });

    if (!error && data?.success) {
      await fetchSlides();
      if (project.title === 'Untitled Carousel') {
        const topic = data?.data?.slides?.[0]?.topic;
        if (topic) {
          await supabase.from('carousel_projects').update({ title: String(topic).slice(0, 80) }).eq('id', project.id);
          onProjectUpdate();
        }
      }
    }
    setAnalyzing(false);
  };

  // Ensure framework slides exist in DB before generating
  const ensureFrameworkSlidesInDB = async () => {
    for (const f of frameworkSlides) {
      if (f.isFrameworkGenerated && f.slide.id.startsWith('framework-')) {
        // Insert framework-only slide into DB
        const { data } = await supabase.from('carousel_slides').insert({
          project_id: project.id,
          slide_index: f.slide.slideIndex,
          slide_type: f.slide.slideType,
          generation_method: 'ai',
          creator_face: f.slide.creatorFace,
          video_toggle: f.slide.videoToggle,
          video_duration: 8,
        }).select().single();

        if (data) {
          // Update the local slide with real DB id
          f.slide.id = data.id;
        }
      }
    }
  };

  // Generate images
  const handleGenerate = async (slideIds?: string[]) => {
    setGenerating(true);

    // Ensure framework slots are in DB
    await ensureFrameworkSlidesInDB();

    const idsToGenerate = slideIds || frameworkSlides
      .filter(f => !skippedSlides.has(f.slide.id))
      .map(f => f.slide.id)
      .filter(id => !id.startsWith('framework-'));

    const { data, error } = await supabase.functions.invoke('generate-carousel-images', {
      body: {
        project_id: project.id,
        slide_ids: idsToGenerate,
        branding_kit: brandingKit,
        ai_text_mode: aiTextMode,
        image_models: imageModels,
      },
    });

    if (!error && data?.success) {
      await fetchSlides();
      onProjectUpdate();
    }
    setGenerating(false);
  };

  const handleRegenerateSlide = async (slideId: string) => {
    setRegeneratingSlide(slideId);

    // If framework-generated, ensure it's in DB first
    if (slideId.startsWith('framework-')) {
      await ensureFrameworkSlidesInDB();
      const f = frameworkSlides.find(f => f.slide.id === slideId);
      if (f && !f.slide.id.startsWith('framework-')) {
        slideId = f.slide.id;
      }
    }

    await handleGenerate([slideId]);
    setRegeneratingSlide(null);
  };

  const handleToggleVideo = async (slideId: string, value: boolean) => {
    if (slideId.startsWith('framework-')) return;
    await supabase.from('carousel_slides').update({ video_toggle: value }).eq('id', slideId);
    setSlides(prev => prev.map(s => s.id === slideId ? { ...s, videoToggle: value } : s));
  };

  const handleToggleSkip = (slideId: string) => {
    setSkippedSlides(prev => {
      const next = new Set(prev);
      if (next.has(slideId)) next.delete(slideId);
      else next.add(slideId);
      return next;
    });
  };

  const handleSlideTypeChange = async (slideId: string, type: CarouselSlideType) => {
    if (slideId.startsWith('framework-')) return;
    const isCreator = isCreatorSlide(type);
    await supabase.from('carousel_slides').update({ slide_type: type, creator_face: isCreator }).eq('id', slideId);
    setSlides(prev => prev.map(s => s.id === slideId ? { ...s, slideType: type, creatorFace: isCreator } : s));
  };

  const handleDeleteSlide = async (slideId: string) => {
    if (slideId.startsWith('framework-')) return;
    await supabase.from('carousel_slides').delete().eq('id', slideId);
    setSlides(prev => prev.filter(s => s.id !== slideId));
  };

  const handleApplyConfig = async (slideId: string, config: {
    additionalNote?: string;
    referenceImageUrl?: string | null;
    creatorFace?: boolean;
  }) => {
    if (slideId.startsWith('framework-')) {
      // For framework slides, just update local state
      // They'll be persisted when user hits Generate
      setConfigModal(null);
      return;
    }

    const updateData: any = {};
    if (config.additionalNote !== undefined) updateData.additional_note = config.additionalNote;
    if (config.referenceImageUrl !== undefined) updateData.reference_image_url = config.referenceImageUrl;
    if (config.creatorFace !== undefined) updateData.creator_face = config.creatorFace;

    await supabase.from('carousel_slides').update(updateData).eq('id', slideId);
    setSlides(prev => prev.map(s => s.id === slideId ? {
      ...s,
      ...(config.additionalNote !== undefined && { additionalNote: config.additionalNote }),
      ...(config.referenceImageUrl !== undefined && { referenceImageUrl: config.referenceImageUrl }),
      ...(config.creatorFace !== undefined && { creatorFace: config.creatorFace }),
    } : s));
    setConfigModal(null);
  };

  // Per-slide manual upload
  const handleManualUpload = async (slideId: string, file: File) => {
    if (slideId.startsWith('framework-')) return;
    const fileName = `${project.projectId}/${slideId}-${Date.now()}.${file.name.split('.').pop()}`;
    const { error: uploadError } = await supabase.storage
      .from('carousel-images').upload(fileName, file, { contentType: file.type });
    if (uploadError) return;

    const { data: urlData } = supabase.storage.from('carousel-images').getPublicUrl(fileName);
    if (!urlData?.publicUrl) return;

    await supabase.from('carousel_slides')
      .update({ image_url: urlData.publicUrl, generation_method: 'manual' })
      .eq('id', slideId);

    setSlides(prev => prev.map(s =>
      s.id === slideId ? { ...s, imageUrl: urlData.publicUrl, generationMethod: 'manual' } : s
    ));
  };

  const copyAllPrompts = () => {
    const all = frameworkSlides
      .filter(f => f.slide.prompt)
      .map((f, i) => `=== Slide ${i + 1} (${f.slide.slideType}) ===\n${f.slide.prompt}`)
      .join('\n\n');
    navigator.clipboard.writeText(all);
  };

  const handleProceed = async () => {
    await supabase.from('carousel_projects').update({ status: 'generated' }).eq('id', project.id);
    onProjectUpdate();
    navigate(`/carousel-images/${project.projectId}/edit`);
  };

  const allSlidesHaveImages = activeFramework.length > 0 && activeFramework.every(f => f.slide.imageUrl);
  const readyCount = activeFramework.filter(f => f.slide.imageUrl).length;

  // Image preview modal
  const [previewModal, setPreviewModal] = useState<{ url: string; title: string } | null>(null);

  return (
    <div className="p-6 pb-24">
      <div className="max-w-6xl mx-auto">
        {/* Single Header Row: Title left, all controls right */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-neutral-200 mb-1">Generate</h3>
            <p className="text-sm text-neutral-500">
              {analyzing ? 'Enriching visual analysis...' : 'AI analyze + rebrand your carousel slides'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Generate button */}
            {frameworkSlides.length > 0 && (
              <button
                onClick={() => handleGenerate()}
                disabled={generating || analyzing}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-800 disabled:text-neutral-600 text-white rounded-lg px-4 py-2 text-xs font-medium transition-colors"
              >
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                {generating ? 'Generating...' : `Generate ${activeFramework.length} Slides`}
              </button>
            )}

            {/* Copy All Prompts */}
            {frameworkSlides.length > 0 && (
              <button
                onClick={copyAllPrompts}
                className="flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
              >
                <Clipboard className="w-3.5 h-3.5" /> Copy All
              </button>
            )}

            {/* Model Selector */}
            <ModelSelector models={imageModels} onModelsChange={setImageModels} />

            {/* AI Text Mode */}
            <button
              onClick={() => setAiTextMode(!aiTextMode)}
              title="AI Text ON = AI renders headline, subtitle, page numbers directly in the image. OFF = text added via editor layers."
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                aiTextMode
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-neutral-900 text-neutral-500 border-neutral-800'
              }`}
            >
              {aiTextMode ? 'AI Text ON' : 'AI Text OFF'}
            </button>

            {/* Status */}
            {frameworkSlides.length > 0 && (
              <p className="text-[11px] text-neutral-600 ml-1">
                {readyCount}/{activeFramework.length}
              </p>
            )}
          </div>
        </div>

        {analyzing && (
          <div className="flex items-center gap-2 text-xs text-amber-400 mb-4">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Enriching visual analysis...
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          </div>
        )}

        {/* No slides */}
        {!loading && slides.length === 0 && (
          <div className="text-center py-16 bg-neutral-900/50 border border-neutral-800 rounded-xl">
            <AlertCircle className="w-8 h-8 mx-auto mb-3 text-amber-400" />
            <p className="text-sm text-neutral-400 mb-2">No slides found</p>
            <p className="text-xs text-neutral-600">Go back to Source step and import images first.</p>
          </div>
        )}

        {/* Framework Comparison Grid */}
        {!loading && frameworkSlides.length > 0 && (
          <div className="space-y-3">
            {/* Grid Header */}
            <div className="grid grid-cols-[1fr_40px_1fr_200px] gap-3 mb-1 px-1">
              <p className="text-[10px] text-neutral-600 uppercase tracking-wider font-semibold">Source (Original)</p>
              <div />
              <p className="text-[10px] text-neutral-600 uppercase tracking-wider font-semibold">Generated (Sparkfluence)</p>
              <p className="text-[10px] text-neutral-600 uppercase tracking-wider font-semibold text-right">Controls</p>
            </div>

            {/* Slide Rows — framework-enforced order */}
            {frameworkSlides.map((f, i) => {
              const { slide, sourceUrl, isFrameworkGenerated } = f;
              const typeConfig = SLIDE_TYPE_CONFIG[slide.slideType];
              const isRegenerating = regeneratingSlide === slide.id;
              const isSkipped = skippedSlides.has(slide.id);
              const isCreator = isCreatorSlide(slide.slideType);
              const hasConfig = !!slide.additionalNote || !!slide.referenceImageUrl;
              const isFrameworkOnly = isFrameworkGenerated || !sourceUrl;

              return (
                <div
                  key={slide.id}
                  className={`grid grid-cols-[1fr_40px_1fr_200px] gap-3 items-start transition-opacity ${
                    isSkipped ? 'opacity-40' : ''
                  }`}
                >
                  {/* Source Image */}
                  <div className="relative bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                    {sourceUrl ? (
                      <img src={sourceUrl} alt={`Source ${i + 1}`} className="w-full aspect-square object-cover cursor-pointer" loading="lazy"
                            onClick={() => setPreviewModal({ url: sourceUrl!, title: `Source ${i + 1}` })}
                          />
                    ) : (
                      <div className="w-full aspect-square flex flex-col items-center justify-center bg-neutral-900/50 border border-dashed border-neutral-700 rounded-xl">
                        <ImageIcon className="w-5 h-5 text-neutral-700 mb-1" />
                        <p className="text-[10px] text-neutral-600 text-center px-4">
                          {isFrameworkGenerated
                            ? `No ${slide.slideType} in source — AI will generate from scratch`
                            : 'No source image'}
                        </p>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <span className="bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        {i + 1}
                      </span>
                      {isFrameworkOnly && (
                        <span className="bg-amber-500/20 text-amber-400 text-[8px] px-1.5 py-0.5 rounded-full">
                          Framework
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex items-center justify-center h-full">
                    <ArrowRight className="w-4 h-4 text-neutral-700" />
                  </div>

                  {/* Generated Image */}
                  <div className={`relative bg-neutral-900 border-l-4 ${typeConfig.borderColor} border border-neutral-800 rounded-xl overflow-hidden group`}>
                    {slide.imageUrl ? (
                      <img src={slide.imageUrl} alt={`Slide ${i + 1}`}
                        className="w-full aspect-square object-cover cursor-pointer" loading="lazy"
                        onClick={() => setPreviewModal({ url: slide.imageUrl!, title: `Generated ${i + 1} (${slide.slideType})` })}
                      />
                    ) : isRegenerating ? (
                      <div className="w-full aspect-square flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                      </div>
                    ) : (
                      <div className="w-full aspect-square flex flex-col items-center justify-center gap-2">
                        <Wand2 className="w-4 h-4 text-neutral-700" />
                        <p className="text-[10px] text-neutral-600">Not generated yet</p>
                      </div>
                    )}

                    {/* Type Badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${typeConfig.badgeBg} ${typeConfig.badgeText}`}>
                        {slide.slideType}
                      </span>
                      <span className="bg-black/50 text-neutral-400 text-[9px] px-1.5 py-0.5 rounded">
                        {isCreator ? 'A-ROLL' : 'B-ROLL'}
                      </span>
                    </div>

                    {/* Config indicator */}
                    {hasConfig && (
                      <div className="absolute top-2 right-2">
                        <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded-full">
                          Configured
                        </span>
                      </div>
                    )}

                    {/* Prompt preview on hover */}
                    {slide.prompt && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[9px] text-neutral-400 line-clamp-2">{slide.prompt.slice(0, 120)}...</p>
                      </div>
                    )}
                  </div>

                  {/* Controls Column */}
                  <div className="flex flex-col gap-1.5 pt-1">
                    {/* Configure */}
                    <button
                      onClick={() => setConfigModal({ slide, index: i })}
                      disabled={isSkipped}
                      className="flex items-center gap-1.5 w-full bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-300 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                    >
                      <Settings2 className="w-3 h-3" />
                      Configure
                    </button>

                    {/* Slide Type */}
                    <select
                      value={slide.slideType}
                      onChange={e => handleSlideTypeChange(slide.id, e.target.value as CarouselSlideType)}
                      disabled={isSkipped || slide.id.startsWith('framework-')}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg text-[11px] text-neutral-300 px-2.5 py-1.5 outline-none disabled:opacity-40"
                    >
                      {(['HOOK', 'FORE', 'BODY', 'CTA'] as CarouselSlideType[]).map(t => (
                        <option key={t} value={t}>{t} ({isCreatorSlide(t) ? 'Creator' : 'B-Roll'})</option>
                      ))}
                    </select>

                    {/* Video Toggle */}
                    <button
                      onClick={() => handleToggleVideo(slide.id, !slide.videoToggle)}
                      disabled={isSkipped || slide.id.startsWith('framework-')}
                      className={`flex items-center gap-1.5 w-full rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                        slide.videoToggle
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-neutral-800 text-neutral-500 border border-neutral-700'
                      } disabled:opacity-40`}
                    >
                      <Video className="w-3 h-3" />
                      Video {slide.videoToggle ? 'ON' : 'OFF'}
                    </button>

                    {/* Skip Toggle */}
                    <button
                      onClick={() => handleToggleSkip(slide.id)}
                      className={`flex items-center gap-1.5 w-full rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                        isSkipped
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-neutral-800 text-neutral-600 border border-neutral-700 hover:text-neutral-400'
                      }`}
                    >
                      <SkipForward className="w-3 h-3" />
                      {isSkipped ? 'Skipped' : 'Skip'}
                    </button>

                    {/* Per-slide actions: Regen, Copy Prompt, Upload, Delete */}
                    <div className="flex gap-1 flex-wrap">
                      <button
                        onClick={() => handleRegenerateSlide(slide.id)}
                        disabled={isRegenerating || isSkipped}
                        className="flex-1 flex items-center justify-center gap-1 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-400 rounded-lg px-2 py-1.5 text-[10px] transition-colors"
                        title="Regenerate"
                      >
                        <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                      </button>

                      <button
                        onClick={() => slide.prompt && navigator.clipboard.writeText(slide.prompt)}
                        disabled={!slide.prompt}
                        className="flex-1 flex items-center justify-center gap-1 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 text-neutral-400 rounded-lg px-2 py-1.5 text-[10px] transition-colors"
                        title={slide.prompt ? 'Copy Prompt' : 'No prompt yet'}
                      >
                        <Copy className="w-3 h-3" />
                      </button>

                      {!slide.id.startsWith('framework-') && (
                        <label
                          className="flex-1 flex items-center justify-center gap-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded-lg px-2 py-1.5 text-[10px] transition-colors cursor-pointer"
                          title="Upload Image"
                        >
                          <Upload className="w-3 h-3" />
                          <input
                            type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleManualUpload(slide.id, f); }}
                          />
                        </label>
                      )}

                      {!slide.id.startsWith('framework-') && (
                        <button
                          onClick={() => handleDeleteSlide(slide.id)}
                          className="flex-1 flex items-center justify-center gap-1 bg-neutral-800 hover:bg-red-500/10 text-neutral-500 hover:text-red-400 rounded-lg px-2 py-1.5 text-[10px] transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* View prompt toggle */}
                    {slide.prompt && (
                      <button
                        onClick={() => setExpandedPrompt(expandedPrompt === slide.id ? null : slide.id)}
                        className="flex items-center gap-1.5 w-full bg-neutral-800/50 hover:bg-neutral-800 text-neutral-500 rounded-lg px-2.5 py-1 text-[10px] transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        {expandedPrompt === slide.id ? 'Hide' : 'View'} Prompt
                      </button>
                    )}
                  </div>

                  {/* Expanded Prompt — full width */}
                  {expandedPrompt === slide.id && slide.prompt && (
                    <div className="col-span-4 bg-neutral-900 border border-neutral-800 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-neutral-500 font-semibold">Prompt — Slide {i + 1} ({slide.slideType})</p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigator.clipboard.writeText(slide.prompt!)}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                          <button onClick={() => setExpandedPrompt(null)} className="p-1 rounded text-neutral-500 hover:text-neutral-300">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <pre className="text-xs text-neutral-400 whitespace-pre-wrap font-mono leading-relaxed">
                        {slide.prompt}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Proceed */}
        {frameworkSlides.length > 0 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-neutral-800">
            <p className="text-xs text-neutral-500">
              {readyCount}/{activeFramework.length} slides ready
              {!allSlidesHaveImages && ' — generate or upload images to continue'}
            </p>
            <button
              onClick={handleProceed}
              disabled={!allSlidesHaveImages}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-800 disabled:text-neutral-600 text-white rounded-lg px-6 py-2.5 text-sm font-medium transition-colors"
            >
              Approve & Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewModal(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img
              src={previewModal.url}
              alt={previewModal.title}
              className="max-w-full max-h-[85vh] object-contain rounded-xl"
            />
            <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-lg">
              {previewModal.title}
            </div>
            <button
              onClick={() => setPreviewModal(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {configModal && (
        isCreatorSlide(configModal.slide.slideType) ? (
          <CreatorConfigModal
            slide={configModal.slide}
            slideIndex={configModal.index}
            onApply={(config) => handleApplyConfig(configModal.slide.id, config)}
            onClose={() => setConfigModal(null)}
          />
        ) : (
          <BRollConfigModal
            slide={configModal.slide}
            slideIndex={configModal.index}
            onApply={(config) => handleApplyConfig(configModal.slide.id, config)}
            onClose={() => setConfigModal(null)}
          />
        )
      )}
    </div>
  );
};
