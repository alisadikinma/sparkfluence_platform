import React, { useState, useCallback, useEffect, useRef } from 'react';
import { X, Search, Loader2, Upload, ExternalLink } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { CarouselSlide } from '../../../types/carousel';

interface StockResult {
  url: string;
  thumbUrl: string;
  photographer: string;
  source: 'pexels' | 'unsplash';
}

interface BRollConfigModalProps {
  slide: CarouselSlide;
  slideIndex: number;
  onApply: (config: {
    additionalNote: string;
    referenceImageUrl: string | null;
    creatorFace: boolean;
  }) => void;
  onClose: () => void;
}

export const BRollConfigModal: React.FC<BRollConfigModalProps> = ({
  slide,
  slideIndex,
  onApply,
  onClose,
}) => {
  const [notes, setNotes] = useState(slide.additionalNote || '');
  const [creatorFace, setCreatorFace] = useState(slide.creatorFace);
  const [referenceUrl, setReferenceUrl] = useState(slide.referenceImageUrl || '');
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
  useEffect(() => {
    if (!slideText || hasAutoSearched.current) return;
    hasAutoSearched.current = true;

    const words = slideText.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);
    const unique = [...new Set(words)].slice(0, 3);
    setSuggestedKeywords(unique);

    if (unique.length > 0) {
      // Auto-search the first keyword
      const firstKw = unique[0];
      setSearchQuery(firstKw);
      // Trigger search after state update
      setTimeout(() => handleSearch(firstKw), 100);
    }
  }, [slideText]);

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
          photographer: r.photographer || '',
          source: r.provider || 'pexels',
        })));
      }
    } catch {
      // Search failed silently
    }

    setSearching(false);
  }, [searchQuery]);

  const handleSelectStock = (result: StockResult) => {
    setReferenceUrl(result.url);
  };

  const handlePasteUrl = () => {
    if (pasteUrl.trim()) {
      setReferenceUrl(pasteUrl.trim());
      setPasteUrl('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-2xl shadow-xl max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 flex-shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-neutral-200">
              Konfigurasi BODY (B-ROLL)
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

        {/* Body — 2 columns */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-5 py-4">
            {/* Left column — Notes + Creator Face */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-2">
                  Catatan Tambahan (opsional)
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Contoh: Pencahayaan lebih dramatis, golden hour, lebih modern..."
                  rows={4}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-colors resize-none"
                />
              </div>

              {/* Creator Face Toggle */}
              <div className="flex items-center gap-3 bg-neutral-800/50 rounded-lg p-3">
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={creatorFace}
                    onChange={e => setCreatorFace(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-emerald-500 focus:ring-emerald-500/20"
                  />
                  <div>
                    <p className="text-xs font-medium text-neutral-300">Sertakan Wajah Creator</p>
                    <p className="text-[10px] text-neutral-500">Akan menampilkan avatar kamu di image</p>
                  </div>
                </label>
              </div>

              {/* Selected reference preview */}
              {referenceUrl && (
                <div className="relative">
                  <label className="block text-xs font-medium text-neutral-400 mb-2">Referensi Terpilih</label>
                  <div className="relative w-full aspect-video bg-neutral-800 rounded-lg overflow-hidden">
                    <img src={referenceUrl} alt="Reference" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setReferenceUrl('')}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-neutral-300 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right column — Reference Image Search */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-2">
                Gambar Referensi (opsional)
              </label>

              {/* Search bar */}
              <div className="flex gap-2 mb-2">
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Cari gambar referensi..."
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm text-neutral-200 placeholder-neutral-600 focus:border-emerald-500 outline-none transition-colors"
                />
                <button
                  onClick={() => handleSearch()}
                  disabled={searching}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-neutral-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                >
                  {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Cari'}
                </button>
              </div>

              {/* Keyword suggestions */}
              {suggestedKeywords.length > 0 && (
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <span className="text-[10px] text-neutral-600">Saran:</span>
                  {suggestedKeywords.map(kw => (
                    <button
                      key={kw}
                      onClick={() => handleSearch(kw)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                        searchQuery === kw
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:text-emerald-400'
                      }`}
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              )}

              {/* Stock results grid */}
              {stockResults.length > 0 && (
                <div className="grid grid-cols-3 gap-1.5 max-h-[280px] overflow-y-auto rounded-lg">
                  {stockResults.map((result, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectStock(result)}
                      className={`relative aspect-square rounded-md overflow-hidden border-2 transition-colors ${
                        referenceUrl === result.url
                          ? 'border-emerald-500'
                          : 'border-transparent hover:border-neutral-600'
                      }`}
                    >
                      <img
                        src={result.thumbUrl}
                        alt={result.photographer}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                        <p className="text-[8px] text-neutral-400 truncate">{result.photographer}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searching && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
                </div>
              )}

              {/* Paste URL */}
              <div className="flex gap-2 mt-3">
                <input
                  value={pasteUrl}
                  onChange={e => setPasteUrl(e.target.value)}
                  placeholder="Atau tempel URL gambar..."
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm text-neutral-200 placeholder-neutral-600 focus:border-emerald-500 outline-none transition-colors"
                />
                <button
                  onClick={handlePasteUrl}
                  disabled={!pasteUrl.trim()}
                  className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 text-neutral-400 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-neutral-800 flex gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg px-4 py-2.5 text-xs font-medium transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => onApply({
              additionalNote: notes,
              referenceImageUrl: referenceUrl || null,
              creatorFace,
            })}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg px-4 py-2.5 text-xs font-medium transition-colors"
          >
            Terapkan Opsi
          </button>
        </div>
      </div>
    </div>
  );
};
