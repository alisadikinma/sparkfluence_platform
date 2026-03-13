import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Instagram, Upload, Link2, Plus, Trash2, GripVertical, AlertCircle,
  Loader2, ImageIcon, ChevronRight, X, ExternalLink
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import type {
  CarouselProject, CarouselSourceUrl, CarouselSourceUrlRow,
  SourceMediaItem
} from '../../../types/carousel';
import { mapCarouselSourceUrlRow } from '../../../types/carousel';

interface SourceStepProps {
  project: CarouselProject;
  onProjectUpdate: () => void;
}

export const SourceStep: React.FC<SourceStepProps> = ({ project, onProjectUpdate }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [sourceUrls, setSourceUrls] = useState<CarouselSourceUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [urlInput, setUrlInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch source URLs
  const fetchSources = useCallback(async () => {
    if (!project.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('carousel_source_urls')
      .select('*')
      .eq('project_id', project.id)
      .order('source_order', { ascending: true });

    if (!error && data) {
      setSourceUrls(data.map((row: CarouselSourceUrlRow) => mapCarouselSourceUrlRow(row)));
    }
    setLoading(false);
  }, [project.id]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  // Parse IG shortcode from URL
  const parseIgShortcode = (url: string): string | null => {
    const match = url.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
  };

  // Import IG URLs
  const handleImportUrls = async () => {
    if (!urlInput.trim()) return;
    setImporting(true);
    setImportError(null);

    const urls = urlInput
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 0);

    const results: CarouselSourceUrl[] = [];
    const currentOrder = sourceUrls.length;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const shortcode = parseIgShortcode(url);

      if (!shortcode) {
        // Not an IG URL — store as direct image URL
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

        if (!error && data) {
          results.push(mapCarouselSourceUrlRow(data as CarouselSourceUrlRow));
        }
        continue;
      }

      // IG URL — create pending record, then fetch via edge function
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

      // Call fetch-instagram-media edge function
      const { data: fetchResult, error: fetchError } = await supabase.functions.invoke(
        'fetch-instagram-media',
        { body: { shortcode, source_url_id: insertedRow.id } },
      );

      // supabase.functions.invoke returns { data, error } — data contains the full JSON body
      const apiError = fetchResult?.error || fetchError;
      const isNoToken = fetchResult?.error?.code === 'NO_IG_TOKEN' || fetchError?.message?.includes('NO_IG_TOKEN');

      if (fetchError || !fetchResult?.success) {
        // Update status to failed
        const errorMsg = fetchResult?.error?.message || fetchError?.message || 'Unknown error';
        await supabase
          .from('carousel_source_urls')
          .update({
            scrape_status: 'failed',
            scrape_error: errorMsg,
          })
          .eq('id', insertedRow.id);

        if (isNoToken) {
          setImportError('Instagram not connected. Go to Settings > Social Accounts to connect your IG account first. Or use manual upload (drag & drop images).');
        } else {
          setImportError(`Failed to fetch media from ${url}: ${errorMsg}`);
        }
      }

      results.push(mapCarouselSourceUrlRow(insertedRow as CarouselSourceUrlRow));
    }

    setUrlInput('');
    await fetchSources(); // Refresh all
    setImporting(false);
  };

  // Manual file upload
  const handleFileUpload = async (files: FileList | File[]) => {
    if (!user) return;
    setUploadingFiles(true);

    const fileArray = Array.from(files);
    const currentOrder = sourceUrls.length;

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 10 * 1024 * 1024) continue; // 10MB limit

      // Upload to carousel-images bucket
      const fileName = `${project.projectId}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('carousel-images')
        .upload(fileName, file, { contentType: file.type });

      if (uploadError) continue;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('carousel-images')
        .getPublicUrl(fileName);

      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) continue;

      // Create source URL record
      await supabase
        .from('carousel_source_urls')
        .insert({
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

  // Drop handler
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Delete source
  const handleDeleteSource = async (sourceId: string) => {
    await supabase.from('carousel_source_urls').delete().eq('id', sourceId);
    setSourceUrls(prev => prev.filter(s => s.id !== sourceId));
  };

  // Proceed to next step
  const handleProceed = async () => {
    // Update project status to source_ready
    await supabase
      .from('carousel_projects')
      .update({ status: 'source_ready' })
      .eq('id', project.id);

    onProjectUpdate();
    navigate(`/carousel-images/${project.projectId}/generate`);
  };

  // Count total media items
  const totalMedia = sourceUrls.reduce(
    (sum, s) => sum + (s.mediaUrls?.length || 0),
    0,
  );

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-neutral-200 mb-1">Source Images</h3>
          <p className="text-sm text-neutral-500">
            Import Instagram carousel posts or upload images manually.
          </p>
        </div>

        {/* Import Methods */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* URL Import */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Instagram className="w-4 h-4 text-pink-400" />
              <h4 className="text-sm font-medium text-neutral-200">Instagram Import</h4>
            </div>
            <textarea
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={'Paste Instagram URLs (one per line)\ne.g. https://instagram.com/p/ABC123/'}
              rows={4}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors resize-none mb-3"
            />
            <button
              onClick={handleImportUrls}
              disabled={!urlInput.trim() || importing}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-800 disabled:text-neutral-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors w-full justify-center"
            >
              {importing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
              ) : (
                <><Link2 className="w-4 h-4" /> Import URLs</>
              )}
            </button>
          </div>

          {/* Manual Upload */}
          <div
            className="bg-neutral-900 border border-dashed border-neutral-700 rounded-xl p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-emerald-500/30 transition-colors min-h-[200px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadingFiles ? (
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            ) : (
              <>
                <Upload className="w-8 h-8 text-neutral-600" />
                <div className="text-center">
                  <p className="text-sm text-neutral-300 mb-1">Drop images here or click to browse</p>
                  <p className="text-xs text-neutral-600">PNG, JPG, WebP — max 10MB per image</p>
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

        {/* Error */}
        {importError && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-400">{importError}</p>
            </div>
            <button onClick={() => setImportError(null)} className="text-red-400/50 hover:text-red-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Source Slides Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
          </div>
        ) : sourceUrls.length === 0 ? (
          <div className="text-center py-12 bg-neutral-900/50 border border-neutral-800 rounded-xl">
            <ImageIcon className="w-10 h-10 mx-auto mb-3 text-neutral-700" />
            <p className="text-sm text-neutral-500">No source images yet. Import from Instagram or upload manually.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-neutral-500">
                {sourceUrls.length} source{sourceUrls.length > 1 ? 's' : ''} — {totalMedia} image{totalMedia > 1 ? 's' : ''}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {sourceUrls.map((source) => (
                <div
                  key={source.id}
                  className="group relative bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden"
                >
                  {/* Thumbnail */}
                  <div className="aspect-[4/5] bg-neutral-800 flex items-center justify-center">
                    {source.scrapeStatus === 'pending' || source.scrapeStatus === 'fetching' ? (
                      <Loader2 className="w-5 h-5 text-neutral-600 animate-spin" />
                    ) : source.scrapeStatus === 'failed' ? (
                      <div className="text-center p-2">
                        <AlertCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
                        <p className="text-[10px] text-red-400/70">Failed</p>
                      </div>
                    ) : source.mediaUrls?.[0] ? (
                      <img
                        src={source.mediaUrls[0].url}
                        alt={`Source ${source.sourceOrder + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-neutral-700" />
                    )}
                  </div>

                  {/* Multi-slide indicator */}
                  {source.mediaUrls && source.mediaUrls.length > 1 && (
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {source.mediaUrls.length}
                    </div>
                  )}

                  {/* Info bar */}
                  <div className="p-2">
                    <p className="text-[10px] text-neutral-500 truncate">
                      {source.shortcode ? `@${source.shortcode}` : 'Uploaded'}
                    </p>
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {source.sourceUrl && source.shortcode && (
                      <a
                        href={source.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => handleDeleteSource(source.id)}
                      className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Proceed Button */}
        {sourceUrls.length > 0 && (
          <div className="flex justify-end mt-6">
            <button
              onClick={handleProceed}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-6 py-2.5 text-sm font-medium transition-colors"
            >
              Continue to Generate
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
