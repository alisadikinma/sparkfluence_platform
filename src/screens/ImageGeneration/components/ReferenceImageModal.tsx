import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../../../components/ui/button';
import { X, Loader2, Search, Camera, Upload } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getSuggestedKeywords } from '../../../lib/keywordExtractor';
import type { Segment, StockImageResult } from '../types';

// localStorage cache helper functions
const BROLL_CACHE_PREFIX = 'sf_broll_ref_';
const BROLL_CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

interface CachedBrollResult {
  results: StockImageResult[];
  timestamp: number;
}

const getCachedBrollResults = (keyword: string): StockImageResult[] | null => {
  try {
    const cacheKey = BROLL_CACHE_PREFIX + keyword.toLowerCase().trim().replace(/\s+/g, '_');
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const parsed: CachedBrollResult = JSON.parse(cached);
    const now = Date.now();

    if (now - parsed.timestamp > BROLL_CACHE_EXPIRY_MS) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return parsed.results;
  } catch (err) {
    console.error('Cache read error:', err);
    return null;
  }
};

const setCachedBrollResults = (keyword: string, results: StockImageResult[]): void => {
  try {
    const cacheKey = BROLL_CACHE_PREFIX + keyword.toLowerCase().trim().replace(/\s+/g, '_');
    const cacheData: CachedBrollResult = { results, timestamp: Date.now() };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (err) {
    console.error('Cache write error:', err);
  }
};

interface ReferenceImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  segment: Segment | null;
  initialKeywords: string;
  topic?: string;
  onSelect: (imageUrl: string, source: 'unsplash' | 'pexels' | 'upload') => void;
}

export const ReferenceImageModal: React.FC<ReferenceImageModalProps> = ({
  isOpen,
  onClose,
  segment,
  initialKeywords,
  topic,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialKeywords);
  const [results, setResults] = useState<StockImageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState('');
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Smart extraction state (from LLM)
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);
  const [extractionSource, setExtractionSource] = useState<'llm' | 'tavily' | 'fallback' | null>(null);
  const [isExtractingKeywords, setIsExtractingKeywords] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Prevent wheel events from propagating to background
  const handleWheelCapture = (e: React.WheelEvent) => {
    e.stopPropagation();
  };

  // Manual search (when user types query or clicks suggestion)
  const handleSearch = useCallback(
    async (query?: string) => {
      const searchTerm = query || searchQuery;
      console.log(`[handleSearch] Called with: "${searchTerm}"`);
      if (!searchTerm.trim()) return;

      setLoading(true);
      setError(null);

      // Check localStorage cache first
      const cachedResults = getCachedBrollResults(searchTerm);
      if (cachedResults && cachedResults.length > 0) {
        console.log('[BrollCache] Using cached results for:', searchTerm);
        setResults(cachedResults);
        setLoading(false);
        return;
      }

      try {
        const { data, error: searchError } = await supabase.functions.invoke('search-stock-images', {
          body: {
            query: searchTerm.trim(),
            enableSmartExtraction: false,
            orientation: 'portrait',
            per_page: 20,
            provider: 'both',
          },
        });

        if (searchError) throw new Error('Stock image search unavailable. Use URL paste instead.');
        if (data?.success && data?.data?.results) {
          setResults(data.data.results);
          if (data.data.results.length > 0) {
            setCachedBrollResults(searchTerm, data.data.results);
          }
          if (data.data.results.length === 0) {
            setError('No results found. Try different keywords or paste URL.');
          }
        } else {
          setResults([]);
          setError(data?.error?.message || 'No results. Try paste URL instead.');
        }
      } catch (err: any) {
        console.error('Search error:', err);
        setError(err.message || 'Search failed. Use "Paste URL" option instead.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [searchQuery]
  );

  // Smart search: Extract keywords via LLM then search
  const handleSmartSearch = async () => {
    if (!segment) return;

    setIsExtractingKeywords(true);
    setLoading(true);
    setError(null);

    try {
      const { data, error: searchError } = await supabase.functions.invoke('search-stock-images', {
        body: {
          visualDirection: segment.visualDirection || '',
          script: segment.script || '',
          topic: topic || '',
          enableSmartExtraction: true,
          orientation: 'portrait',
          per_page: 20,
          provider: 'both',
        },
      });

      setIsExtractingKeywords(false);

      if (searchError) throw new Error('Smart keyword extraction unavailable. Try manual search.');

      if (data?.success) {
        let bestQuery = '';
        if (data.data?.smartExtraction?.suggestedQueries?.length > 0) {
          const suggestions = data.data.smartExtraction.suggestedQueries;
          bestQuery = data.data.query || suggestions[0] || '';
          setSearchQuery(bestQuery);
          setSmartSuggestions(suggestions);
          setExtractionSource(data.data.smartExtraction.source);
        } else {
          const fallbackSuggestions = getSuggestedKeywords(segment.visualDirection, segment.script);
          if (fallbackSuggestions.length > 0) {
            bestQuery = fallbackSuggestions[0];
            setSearchQuery(bestQuery);
          }
          setSmartSuggestions(fallbackSuggestions);
          setExtractionSource('fallback');
        }

        if (bestQuery) {
          setTimeout(() => handleSearch(bestQuery), 100);
          return;
        } else {
          setLoading(false);
          setError('No keywords extracted. Try manual search.');
          return;
        }
      } else {
        throw new Error(data?.error?.message || 'Search failed');
      }
    } catch (err: any) {
      setIsExtractingKeywords(false);
      setLoading(false);

      const fallbackSuggestions = getSuggestedKeywords(segment.visualDirection, segment.script);
      setSmartSuggestions(fallbackSuggestions);
      setExtractionSource('fallback');

      if (fallbackSuggestions.length > 0) {
        const firstSuggestion = fallbackSuggestions[0];
        setSearchQuery(firstSuggestion);
        setError(null);
        setTimeout(() => handleSearch(firstSuggestion), 100);
      } else {
        setError(err.message || 'Smart search failed. Use manual search.');
      }
    }
  };

  // Smart extraction + auto-search when modal opens
  useEffect(() => {
    if (isOpen && segment) {
      setSearchQuery('');
      setSmartSuggestions([]);
      setExtractionSource(null);
      setResults([]);
      setError(null);
      setUploadUrl('');
      handleSmartSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, segment?.id]);

  const handleUploadUrl = () => {
    if (uploadUrl.trim()) {
      onSelect(uploadUrl.trim(), 'upload');
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalContentRef.current && !modalContentRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen || !segment) return null;

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 isolate"
      onClick={handleBackdropClick}
      onWheelCapture={handleWheelCapture}
    >
      <div
        ref={modalContentRef}
        className="bg-card border border-border-default rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col"
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-default">
          <div>
            <h3 className="text-lg font-bold text-text-primary">Add Reference Image</h3>
            <p className="text-xs text-text-muted">Segment: {segment.type} (B-ROLL)</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-surface rounded-lg">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Search bar */}
        <div className="p-4 border-b border-border-default space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search stock images..."
                className="w-full pl-10 pr-4 py-2 bg-surface border border-border-default rounded-lg text-sm text-text-primary"
              />
            </div>
            <Button onClick={() => handleSearch()} disabled={loading || !searchQuery.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </Button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}

          {/* Smart Keyword Suggestions from LLM */}
          {smartSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-text-muted flex items-center gap-1">
                {isExtractingKeywords ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> Extracting...
                  </>
                ) : (
                  <>
                    ✨ AI Suggestions{' '}
                    {extractionSource === 'llm' && (
                      <span className="text-[10px] text-green-500">(LLM)</span>
                    )}
                    :
                  </>
                )}
              </span>
              {smartSuggestions.map((keyword, idx) => (
                <button
                  key={idx}
                  disabled={loading}
                  onClick={() => {
                    setSearchQuery(keyword);
                    handleSearch(keyword);
                  }}
                  className={`px-2.5 py-1 text-xs rounded-full transition-colors disabled:opacity-50 ${
                    idx === 0
                      ? 'bg-primary text-white hover:bg-primary-hover'
                      : 'bg-primary/10 text-primary hover:bg-primary/20'
                  }`}
                >
                  {keyword}
                </button>
              ))}
            </div>
          )}

          {/* Upload URL option */}
          <div className="flex gap-2">
            <input
              type="text"
              value={uploadUrl}
              onChange={(e) => setUploadUrl(e.target.value)}
              placeholder="Or paste image URL..."
              className="flex-1 px-3 py-2 bg-surface border border-border-default rounded-lg text-sm text-text-primary"
            />
            <Button onClick={handleUploadUrl} disabled={!uploadUrl.trim()} variant="outline">
              <Upload className="w-4 h-4 mr-1" /> Use URL
            </Button>
          </div>
        </div>

        {/* Results grid - scrollable area */}
        <div
          className="flex-1 overflow-y-auto p-4 overscroll-contain"
          onWheel={(e) => e.stopPropagation()}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-4 gap-3">
              {results.map((img) => (
                <div
                  key={`${img.source}-${img.id}`}
                  className="relative aspect-[9/16] rounded-lg overflow-hidden cursor-pointer hover:ring-2 ring-primary"
                  onClick={() => {
                    onSelect(img.url, img.source);
                    onClose();
                  }}
                >
                  <img src={img.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80">
                    <p className="text-[10px] text-white truncate">{img.photographer}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <Camera className="w-12 h-12 text-text-muted/30 mb-3" />
              <p className="text-text-secondary text-sm">Search for reference images</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
