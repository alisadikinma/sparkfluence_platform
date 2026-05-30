import React, { useState, useCallback, useEffect, useRef } from 'react';
import { X, Search, Loader2, Upload } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { CarouselSlide, CarouselSlideType, SubjectReference } from '../../../types/carousel';
import { serializeReferenceUrls } from '../../../types/carousel';

interface StockResult {
  url: string;
  thumbUrl: string;
  photographer: string;
  source: 'pexels' | 'unsplash';
}

interface CreatorConfigModalProps {
  slide: CarouselSlide;
  slideIndex: number;
  subjectRefs?: SubjectReference[];
  onApply: (config: { additionalNote: string; referenceImageUrl?: string | null; referenceImageUrls?: string[] }) => void;
  onClose: () => void;
}

const TYPE_LABELS: Record<CarouselSlideType, string> = {
  HOOK: 'HOOK (Creator)',
  FORE: 'FORESHADOW (Creator)',
  BODY: 'BODY (B-Roll)',
  PEAK: 'PEAK',
  CTA: 'CTA (Creator)',
};

export const CreatorConfigModal: React.FC<CreatorConfigModalProps> = ({
  slide,
  slideIndex,
  subjectRefs = [],
  onApply,
  onClose,
}) => {
  const [notes, setNotes] = useState(slide.additionalNote || '');
  const [referenceUrls, setReferenceUrls] = useState<string[]>(slide.referenceImageUrls || []);
  const [pasteUrl, setPasteUrl] = useState('');

  // Stock image search
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [stockResults, setStockResults] = useState<StockResult[]>([]);
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);

  const slideText = slide.analysisData?.textContent?.join(' ') ||
    slide.analysisData?.topic || '';
  const hasAutoSearched = useRef(false);

  // Generate keyword suggestions + auto-search on mount
  // Priority: subjectRefs names > generic slide text keywords
  useEffect(() => {
    if (hasAutoSearched.current) return;
    hasAutoSearched.current = true;

    // Use subject reference names as priority keywords
    const refKeywords = subjectRefs
      .filter(r => r.needsReference)
      .map(r => r.name);

    if (refKeywords.length > 0) {
      setSuggestedKeywords(refKeywords.slice(0, 3));
      const firstKw = refKeywords[0];
      setSearchQuery(firstKw);
      setTimeout(() => handleSearch(firstKw), 100);
      return;
    }

    // Fallback: extract keywords from slide text
    if (!slideText) return;
    const words = slideText.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);
    const unique = [...new Set(words)].slice(0, 3);
    setSuggestedKeywords(unique);

    if (unique.length > 0) {
      const firstKw = unique[0];
      setSearchQuery(firstKw);
      setTimeout(() => handleSearch(firstKw), 100);
    }
  }, [slideText, subjectRefs]);

  const handleSearch = useCallback(async (query?: string) => {
    const q = query || searchQuery;
    if (!q.trim()) return;
    setSearching(true);
    setSearchQuery(q);

    try {
      const { data, error } = await supabase.functions.invoke('search-stock-images', {
        body: { query: q, per_page: 15, orientation: 'portrait' },
      });

      if (!error && data?.success && data?.data?.results) {
        setStockResults(data.data.results.map((r: any) => ({
          url: r.url_regular || r.url_full || r.url || '',
          thumbUrl: r.url_thumb || r.url_regular || r.url || '',
          photographer: r.photographer || 'Unknown',
          source: r.source || 'pexels',
        })));
      }
    } catch {
      // Search failed silently
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const handlePasteUrl = () => {
    if (pasteUrl.trim() && !referenceUrls.includes(pasteUrl.trim())) {
      setReferenceUrls(prev => [...prev, pasteUrl.trim()]);
      setPasteUrl('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 flex-shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-neutral-200">
              Configure {TYPE_LABELS[slide.slideType] || slide.slideType}
            </h3>
            {slideText && (
              <p className="text-[11px] text-emerald-400/70 mt-1 line-clamp-2 italic">
                "{slideText.slice(0, 120)}{slideText.length > 120 ? '...' : ''}"
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="px-5 py-4 overflow-y-auto flex-1">
          {/* Notes */}
          <label className="block text-xs font-medium text-neutral-400 mb-2">
            Catatan Tambahan (opsional)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Contoh: Environment outdoor cafe, golden hour, pencahayaan lebih hangat..."
            rows={3}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors resize-none"
          />

          {/* Reference Image Section */}
          <div className="mt-4">
            <label className="block text-xs font-medium text-neutral-400 mb-2">
              Reference Image (opsional)
            </label>

            {/* Subject reference badges */}
            {subjectRefs.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {subjectRefs.filter(r => r.needsReference).map((ref, i) => (
                  <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {ref.name} ({ref.type.replace('_', ' ')})
                  </span>
                ))}
              </div>
            )}

            {/* Current reference previews (multi) */}
            {referenceUrls.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {referenceUrls.map((url, idx) => (
                  <div key={idx} className="relative">
                    <img src={url} alt={`Reference ${idx + 1}`} className="w-20 h-20 object-cover rounded-lg border border-neutral-700" />
                    <button
                      onClick={() => setReferenceUrls(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-1 -right-1 p-0.5 rounded-full bg-black/70 text-white hover:bg-red-500/80"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Stock search */}
            <div className="flex gap-2 mb-2">
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Search reference images..."
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-600 focus:border-emerald-500 outline-none transition-colors"
                />
              </div>
              <button
                onClick={() => handleSearch()}
                disabled={searching}
                className="bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg px-3 py-1.5 text-xs transition-colors disabled:opacity-50"
              >
                {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
              </button>
            </div>

            {/* Keyword suggestions */}
            {suggestedKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {suggestedKeywords.map((kw, i) => (
                  <button
                    key={i}
                    onClick={() => handleSearch(kw)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10 border border-neutral-700 transition-colors"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            )}

            {/* Stock results grid */}
            {stockResults.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5 mb-3 max-h-40 overflow-y-auto">
                {stockResults.map((result, i) => (
                  <button
                    key={i}
                    onClick={() => setReferenceUrls(prev => prev.includes(result.url) ? prev.filter(u => u !== result.url) : [...prev, result.url])}
                    className={`relative rounded-lg overflow-hidden border-2 transition-colors ${referenceUrls.includes(result.url) ? 'border-emerald-500' : 'border-transparent hover:border-neutral-600'}`}
                  >
                    <img src={result.thumbUrl} alt={result.photographer} className="w-full h-16 object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}

            {/* Paste URL */}
            <div className="flex gap-2">
              <input
                type="text"
                value={pasteUrl}
                onChange={e => setPasteUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePasteUrl()}
                placeholder="Or paste image URL..."
                className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-600 focus:border-emerald-500 outline-none transition-colors"
              />
              <button
                onClick={handlePasteUrl}
                disabled={!pasteUrl.trim()}
                className="bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg px-3 py-1.5 text-xs transition-colors disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 pt-3 border-t border-neutral-800 flex gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg px-4 py-2.5 text-xs font-medium transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => onApply({ additionalNote: notes, referenceImageUrl: serializeReferenceUrls(referenceUrls), referenceImageUrls: referenceUrls })}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2.5 text-xs font-medium transition-colors"
          >
            Terapkan Opsi
          </button>
        </div>
      </div>
    </div>
  );
};
