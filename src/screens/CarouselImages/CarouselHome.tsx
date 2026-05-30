import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Instagram, Upload, Search, Trash2, ExternalLink, ImageIcon, Palette, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBrandingKit } from '../../hooks/useBrandingKit';
import { supabase } from '../../lib/supabase';
import type { CarouselProject, CarouselProjectRow } from '../../types/carousel';
import { mapCarouselProjectRow } from '../../types/carousel';

// Generate project ID: SF-YYYYMMDD-XXXX
function generateProjectId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SF-${date}-${rand}`;
}

// Status config for badges
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: 'Draft', bg: 'bg-neutral-500/10', text: 'text-neutral-400' },
  source_ready: { label: 'Source Ready', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  generated: { label: 'Generated', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  edited: { label: 'Edited', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  video_ready: { label: 'Video Ready', bg: 'bg-purple-500/10', text: 'text-purple-400' },
  published: { label: 'Published', bg: 'bg-green-500/10', text: 'text-green-400' },
  complete: { label: 'Complete', bg: 'bg-green-500/10', text: 'text-green-400' },
};

export const CarouselHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { kit: brandingKit, loading: brandingLoading } = useBrandingKit();
  const [projects, setProjects] = useState<CarouselProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [showBrandingModal, setShowBrandingModal] = useState(false);

  // Check branding kit on mount — show modal EVERY TIME if brand kit is still empty
  // No permanent skip — modal appears each visit until user sets up logo + handle
  React.useEffect(() => {
    if (brandingLoading) return;
    if (!brandingKit?.logoUrl || !brandingKit?.handleText) {
      setShowBrandingModal(true);
    }
  }, [brandingLoading, brandingKit]);

  // Fetch projects on mount
  const fetchProjects = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('carousel_projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      const mapped = data.map((row: CarouselProjectRow) => mapCarouselProjectRow(row));
      setProjects(mapped);

      // Fetch thumbnails: generated HOOK slide > first generated slide > first source image
      const thumbMap: Record<string, string> = {};
      for (const row of data) {
        // Try generated slides first (HOOK slide preferred)
        const { data: slides } = await supabase
          .from('carousel_slides')
          .select('image_url, slide_type')
          .eq('project_id', row.id)
          .not('image_url', 'is', null)
          .order('slide_order', { ascending: true });

        if (slides && slides.length > 0) {
          const hookSlide = slides.find((s: any) => s.slide_type === 'HOOK');
          thumbMap[row.id] = hookSlide?.image_url || slides[0].image_url;
          continue;
        }

        // Fallback: first source image
        const { data: sources } = await supabase
          .from('carousel_source_urls')
          .select('media_urls')
          .eq('project_id', row.id)
          .order('source_order', { ascending: true })
          .limit(1);

        if (sources && sources.length > 0 && sources[0].media_urls?.length > 0) {
          const firstMedia = sources[0].media_urls[0];
          // media_urls items can be objects {url, mediaType} or plain strings
          thumbMap[row.id] = typeof firstMedia === 'string' ? firstMedia : firstMedia.url;
        }
      }
      setThumbnails(thumbMap);
    }
    setLoading(false);
  }, [user]);

  React.useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Create new project (with branding kit check)
  const handleNewProject = async () => {
    if (!user) return;

    // Check if branding kit has logo + handle (skip if user already dismissed)
    const skipBranding = localStorage.getItem('sparkfluence_carousel_branding_skip');
    if (!skipBranding && !brandingLoading && (!brandingKit?.logoUrl || !brandingKit?.handleText)) {
      setShowBrandingModal(true);
      return;
    }

    await createProject();
  };

  const createProject = async () => {
    if (!user) return;
    const projectId = generateProjectId();
    const { error } = await supabase.from('carousel_projects').insert({
      user_id: user.id,
      project_id: projectId,
      title: 'Untitled Carousel',
      status: 'draft',
      generation_mode: 'ai',
      ai_text_mode: true,
      source_type: 'instagram',
      settings: { aspectRatio: '4:5', slideCount: 5 },
    });

    if (!error) {
      navigate(`/carousel-images/${projectId}/source`);
    }
  };

  // Delete project + cleanup storage
  const handleDelete = async (projectId: string) => {
    // Cleanup stored images from Supabase Storage
    const proj = projects.find(p => p.projectId === projectId);
    if (proj) {
      try {
        const { data: sources } = await supabase
          .from('carousel_source_urls')
          .select('shortcode')
          .eq('project_id', (proj as any).id);
        if (sources) {
          for (const src of sources) {
            if (!src.shortcode) continue;
            const { data: files } = await supabase.storage
              .from('carousel-sources')
              .list(`instagram/${src.shortcode}`);
            if (files?.length) {
              await supabase.storage
                .from('carousel-sources')
                .remove(files.map(f => `instagram/${src.shortcode}/${f.name}`));
            }
          }
        }
      } catch { /* ignore cleanup errors */ }
    }

    const { error } = await supabase
      .from('carousel_projects')
      .delete()
      .eq('project_id', projectId);

    if (!error) {
      setProjects(prev => prev.filter(p => p.projectId !== projectId));
    }
  };

  // Filter by search
  const filteredProjects = projects.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-full bg-[#0B0E14]">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-neutral-100">Carousel Images</h1>
            <p className="text-sm text-neutral-400 mt-1">
              Import, rebrand, and publish Instagram carousel posts
            </p>
          </div>
          <button
            onClick={handleNewProject}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors"
          />
        </div>

        {/* Project Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <Instagram className="w-7 h-7 text-neutral-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-200 mb-2">
              {searchQuery ? 'No projects found' : 'No carousel projects yet'}
            </h3>
            <p className="text-sm text-neutral-500 mb-6 max-w-md mx-auto">
              {searchQuery
                ? 'Try a different search term.'
                : 'Import Instagram carousels and rebrand them with your unique style.'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleNewProject}
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create First Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Project cards */}
            {filteredProjects.map((project) => {
              const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.draft;

              return (
                <div
                  key={project.id}
                  onClick={() => navigate(`/carousel-images/${project.projectId}/source`)}
                  className="group bg-neutral-900 border border-neutral-800 rounded-xl p-4 cursor-pointer hover:border-neutral-700 transition-all"
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-neutral-800 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                    {thumbnails[project.id] ? (
                      <img
                        src={thumbnails[project.id]}
                        alt={project.title}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.querySelector('.thumb-fallback')?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <ImageIcon className={`w-8 h-8 text-neutral-700 thumb-fallback ${thumbnails[project.id] ? 'hidden' : ''}`} />
                  </div>

                  {/* Info */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-neutral-200 truncate">
                        {project.title}
                      </h3>
                      <p className="text-xs text-neutral-500 mt-1">
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusCfg.bg} ${statusCfg.text}`}>
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Source type badge */}
                  <div className="flex items-center gap-2 mt-3">
                    {project.sourceType === 'instagram' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                        <Instagram className="w-3 h-3" /> Instagram
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                        <Upload className="w-3 h-3" /> Manual Upload
                      </span>
                    )}
                    <span className="text-[10px] text-neutral-600">
                      {project.generationMode === 'ai' ? 'AI Generate' : 'Manual'}
                    </span>
                  </div>

                  {/* Hover actions */}
                  <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/carousel-images/${project.projectId}/source`);
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" /> Open
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(project.projectId);
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Branding Kit Setup Modal */}
      {showBrandingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowBrandingModal(false)}>
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Palette className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-200">Setup Branding Kit</h3>
              </div>
              <button onClick={() => setShowBrandingModal(false)} className="p-1 rounded-md text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-5">
              <p className="text-sm text-neutral-300 mb-2">
                Brand logo dan handle akan digunakan sebagai watermark di carousel images (opacity 30%).
              </p>
              <p className="text-xs text-neutral-500">
                Setup branding kit dulu supaya generated images punya identity brand kamu. Bisa di-skip kalau belum siap.
              </p>
            </div>

            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={() => {
                  setShowBrandingModal(false);
                }}
                className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg px-4 py-2.5 text-xs font-medium transition-colors"
              >
                Skip untuk sekarang
              </button>
              <button
                onClick={() => {
                  setShowBrandingModal(false);
                  window.open('/settings/branding', '_blank');
                }}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2.5 text-xs font-medium transition-colors"
              >
                Setup Branding Kit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
