import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wand2, Upload, RefreshCw, Copy, Download, ChevronRight, ChevronDown,
  Loader2, AlertCircle, Check, Trash2, Eye, EyeOff, Video, ImageIcon,
  ArrowDown, Clipboard, GripVertical, X
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { useBrandingKit } from '../../../hooks/useBrandingKit';
import type {
  CarouselProject, CarouselSlide, CarouselSlideRow, CarouselSlideType,
  GenerationMode
} from '../../../types/carousel';
import { mapCarouselSlideRow, SLIDE_TYPE_CONFIG } from '../../../types/carousel';

interface GenerateStepProps {
  project: CarouselProject;
  onProjectUpdate: () => void;
}

export const GenerateStep: React.FC<GenerateStepProps> = ({ project, onProjectUpdate }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { kit: brandingKit } = useBrandingKit();

  // State
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationMode, setGenerationMode] = useState<GenerationMode>(project.generationMode);
  const [aiTextMode, setAiTextMode] = useState(project.aiTextMode);
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [regeneratingSlide, setRegeneratingSlide] = useState<string | null>(null);

  // Fetch slides
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

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  // Fetch source URLs for comparison
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

  // Step 1: Analyze source images
  const handleAnalyze = async () => {
    if (sourceImages.length === 0) return;
    setAnalyzing(true);

    const { data, error } = await supabase.functions.invoke('analyze-carousel-source', {
      body: {
        project_id: project.id,
        image_urls: sourceImages,
        ai_text_mode: aiTextMode,
      },
    });

    if (!error && data?.success) {
      await fetchSlides();
    }
    setAnalyzing(false);
  };

  // Step 2: Generate images
  const handleGenerate = async (slideIds?: string[]) => {
    setGenerating(true);

    const { data, error } = await supabase.functions.invoke('generate-carousel-images', {
      body: {
        project_id: project.id,
        slide_ids: slideIds,
        branding_kit: brandingKit,
        ai_text_mode: aiTextMode,
      },
    });

    if (!error && data?.success) {
      await fetchSlides();
      onProjectUpdate();
    }
    setGenerating(false);
  };

  // Regenerate single slide
  const handleRegenerateSlide = async (slideId: string) => {
    setRegeneratingSlide(slideId);
    await handleGenerate([slideId]);
    setRegeneratingSlide(null);
  };

  // Toggle video for slide
  const handleToggleVideo = async (slideId: string, value: boolean) => {
    await supabase.from('carousel_slides').update({ video_toggle: value }).eq('id', slideId);
    setSlides(prev => prev.map(s => s.id === slideId ? { ...s, videoToggle: value } : s));
  };

  // Update slide type
  const handleSlideTypeChange = async (slideId: string, type: CarouselSlideType) => {
    await supabase.from('carousel_slides').update({ slide_type: type }).eq('id', slideId);
    setSlides(prev => prev.map(s => s.id === slideId ? { ...s, slideType: type } : s));
  };

  // Delete slide
  const handleDeleteSlide = async (slideId: string) => {
    await supabase.from('carousel_slides').delete().eq('id', slideId);
    setSlides(prev => prev.filter(s => s.id !== slideId));
  };

  // Copy prompt to clipboard
  const copyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Copy all prompts
  const copyAllPrompts = () => {
    const all = slides
      .filter(s => s.prompt)
      .map((s, i) => `=== Slide ${i + 1} (${s.slideType}) ===\n${s.prompt}`)
      .join('\n\n');
    navigator.clipboard.writeText(all);
  };

  // Manual upload handler
  const handleManualUpload = async (slideId: string, file: File) => {
    const fileName = `${project.projectId}/${slideId}-${Date.now()}.${file.name.split('.').pop()}`;
    const { error: uploadError } = await supabase.storage
      .from('carousel-images')
      .upload(fileName, file, { contentType: file.type });

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

  // Proceed to Edit step
  const handleProceed = async () => {
    await supabase.from('carousel_projects').update({ status: 'generated' }).eq('id', project.id);
    onProjectUpdate();
    navigate(`/carousel-images/${project.projectId}/edit`);
  };

  const allSlidesHaveImages = slides.length > 0 && slides.every(s => s.imageUrl);
  const hasAnalysis = slides.length > 0 && slides.some(s => s.analysisData);

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header + Controls */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-neutral-200 mb-1">Generate</h3>
            <p className="text-sm text-neutral-500">
              AI analyze + rebrand your carousel slides
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Generation Mode Toggle */}
            <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
              <button
                onClick={() => setGenerationMode('ai')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  generationMode === 'ai'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <Wand2 className="w-3.5 h-3.5" /> AI Generate
              </button>
              <button
                onClick={() => setGenerationMode('manual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  generationMode === 'manual'
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> Manual Upload
              </button>
            </div>

            {/* AI Text Mode */}
            <button
              onClick={() => setAiTextMode(!aiTextMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                aiTextMode
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-neutral-900 text-neutral-500 border-neutral-800'
              }`}
            >
              {aiTextMode ? 'AI Text ON' : 'AI Text OFF'}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mb-6">
          {!hasAnalysis && (
            <button
              onClick={handleAnalyze}
              disabled={analyzing || sourceImages.length === 0}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-800 disabled:text-neutral-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {analyzing ? 'Analyzing...' : 'Analyze Source'}
            </button>
          )}

          {hasAnalysis && generationMode === 'ai' && (
            <button
              onClick={() => handleGenerate()}
              disabled={generating}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-800 disabled:text-neutral-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {generating ? 'Generating...' : 'Generate All'}
            </button>
          )}

          {hasAnalysis && (
            <button
              onClick={copyAllPrompts}
              className="flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
            >
              <Clipboard className="w-3.5 h-3.5" /> Copy All Prompts
            </button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          </div>
        )}

        {/* No source images */}
        {!loading && sourceImages.length === 0 && (
          <div className="text-center py-16 bg-neutral-900/50 border border-neutral-800 rounded-xl">
            <AlertCircle className="w-8 h-8 mx-auto mb-3 text-amber-400" />
            <p className="text-sm text-neutral-400 mb-2">No source images found</p>
            <p className="text-xs text-neutral-600">Go back to Source step and import images first.</p>
          </div>
        )}

        {/* Comparison Grid */}
        {!loading && slides.length > 0 && (
          <div className="space-y-2">
            {/* Grid Header */}
            <div className="grid grid-cols-2 gap-4 mb-2">
              <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold px-2">Source</p>
              <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold px-2">
                {generationMode === 'ai' ? 'AI Generated' : 'Uploaded'}
              </p>
            </div>

            {/* Slide Rows */}
            {slides.map((slide, i) => {
              const sourceUrl = sourceImages[i];
              const typeConfig = SLIDE_TYPE_CONFIG[slide.slideType];
              const isRegenerating = regeneratingSlide === slide.id;

              return (
                <div key={slide.id} className="grid grid-cols-2 gap-4">
                  {/* Source Image */}
                  <div className={`relative bg-neutral-900 border-l-4 ${sourceUrl ? 'border-blue-500' : 'border-neutral-700 border-dashed'} rounded-xl overflow-hidden`}>
                    {sourceUrl ? (
                      <img src={sourceUrl} alt={`Source ${i + 1}`} className="w-full aspect-[4/5] object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full aspect-[4/5] flex items-center justify-center">
                        <p className="text-xs text-neutral-600">No source</p>
                      </div>
                    )}
                    {!sourceUrl && i >= sourceImages.length && (
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                          AI Added
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Result Image */}
                  <div className={`relative bg-neutral-900 border-l-4 ${typeConfig.borderColor} rounded-xl overflow-hidden group`}>
                    {/* Image or Upload Zone */}
                    {slide.imageUrl ? (
                      <img src={slide.imageUrl} alt={`Slide ${i + 1}`} className="w-full aspect-[4/5] object-cover" loading="lazy" />
                    ) : generationMode === 'manual' || slide.generationMethod === 'manual' ? (
                      <label className="w-full aspect-[4/5] flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-800/50 transition-colors">
                        <Upload className="w-6 h-6 text-neutral-600 mb-2" />
                        <p className="text-xs text-neutral-500">Drop or click to upload</p>
                        <p className="text-[10px] text-neutral-700">PNG, JPG, WebP — max 10MB</p>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleManualUpload(slide.id, file);
                          }}
                        />
                      </label>
                    ) : isRegenerating ? (
                      <div className="w-full aspect-[4/5] flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                      </div>
                    ) : (
                      <div className="w-full aspect-[4/5] flex items-center justify-center">
                        <p className="text-xs text-neutral-600">Not generated yet</p>
                      </div>
                    )}

                    {/* Slide Controls Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <div className="flex items-center justify-between">
                        {/* Segment Type Dropdown */}
                        <select
                          value={slide.slideType}
                          onChange={(e) => handleSlideTypeChange(slide.id, e.target.value as CarouselSlideType)}
                          className="bg-black/50 border border-neutral-700 rounded text-[10px] text-neutral-300 px-1.5 py-0.5 outline-none"
                        >
                          {(['HOOK', 'FORE', 'BODY', 'PEAK', 'CTA'] as CarouselSlideType[]).map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {/* Video Toggle */}
                          <button
                            onClick={() => handleToggleVideo(slide.id, !slide.videoToggle)}
                            className={`p-1 rounded transition-colors ${
                              slide.videoToggle
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-neutral-800/50 text-neutral-600'
                            }`}
                            title={slide.videoToggle ? 'Video: ON' : 'Video: OFF'}
                          >
                            <Video className="w-3 h-3" />
                          </button>

                          {/* View Prompt */}
                          {slide.prompt && (
                            <button
                              onClick={() => setExpandedPrompt(expandedPrompt === slide.id ? null : slide.id)}
                              className="p-1 rounded bg-neutral-800/50 text-neutral-400 hover:text-neutral-200 transition-colors"
                              title="View prompt"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                          )}

                          {/* Regen */}
                          {generationMode === 'ai' && (
                            <button
                              onClick={() => handleRegenerateSlide(slide.id)}
                              disabled={isRegenerating}
                              className="p-1 rounded bg-neutral-800/50 text-neutral-400 hover:text-emerald-400 transition-colors"
                              title="Regenerate"
                            >
                              <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteSlide(slide.id)}
                            className="p-1 rounded bg-neutral-800/50 text-neutral-400 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Type Badge */}
                    <div className="absolute top-2 left-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${typeConfig.badgeBg} ${typeConfig.badgeText}`}>
                        {slide.slideType}
                      </span>
                    </div>

                    {/* Slide number */}
                    <div className="absolute top-2 right-2">
                      <span className="bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        {i + 1}/{slides.length}
                      </span>
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  {sourceUrl && (
                    <div className="col-span-2 flex justify-center -mt-2 -mb-1">
                      <ArrowDown className="w-3 h-3 text-neutral-700" />
                    </div>
                  )}

                  {/* Expanded Prompt */}
                  {expandedPrompt === slide.id && slide.prompt && (
                    <div className="col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-neutral-500 font-semibold">Prompt — Slide {i + 1} ({slide.slideType})</p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => copyPrompt(slide.prompt!)}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                          <button
                            onClick={() => setExpandedPrompt(null)}
                            className="p-1 rounded text-neutral-500 hover:text-neutral-300 transition-colors"
                          >
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

        {/* Proceed Button */}
        {slides.length > 0 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-neutral-800">
            <p className="text-xs text-neutral-500">
              {slides.filter(s => s.imageUrl).length}/{slides.length} slides ready
              {!allSlidesHaveImages && ' — all slides need images before continuing'}
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
    </div>
  );
};
