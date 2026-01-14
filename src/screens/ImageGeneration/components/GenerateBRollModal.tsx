import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../../../components/ui/button';
import { supabase } from '../../../lib/supabase';
import { getSuggestedKeywords } from '../../../lib/keywordExtractor';
import {
  X, Loader2, Search, Upload, Camera, Sparkles, User, Trash2, CheckCircle2
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface StockImageResult {
  id: string;
  provider: 'unsplash' | 'pexels';
  url_thumb: string;
  url_regular: string;
  url_full: string;
  width: number;
  height: number;
  photographer: string;
  photographer_url: string;
  alt_description: string;
}

interface SegmentForModal {
  id: string;
  type: string;
  script: string;
  visualDirection: string;
  shotType: string;
  includeCreatorFace?: boolean;
  referenceImageUrl?: string;
}

interface GenerateBRollModalProps {
  isOpen: boolean;
  onClose: () => void;
  segment: SegmentForModal | null;
  onGenerate: (options: GenerateOptions) => void;
  language?: string;
  maxReferenceImages?: number;
  hasCreatorAvatar?: boolean;  // NEW: To show warning if checkbox checked but no avatar
}

interface GenerateOptions {
  additionalNotes: string;
  includeCreatorFace: boolean;
  referenceImages: SelectedReference[];
}

interface SelectedReference {
  url: string;
  source: 'unsplash' | 'pexels' | 'upload';
  photographer?: string;
}

// ============================================================================
// CACHE HELPERS
// ============================================================================

const BROLL_CACHE_PREFIX = 'sf_broll_modal_';
const BROLL_CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

interface CachedResult {
  results: StockImageResult[];
  timestamp: number;
}

const getCachedResults = (keyword: string): StockImageResult[] | null => {
  try {
    const cacheKey = BROLL_CACHE_PREFIX + keyword.toLowerCase().trim().replace(/\s+/g, '_');
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    
    const parsed: CachedResult = JSON.parse(cached);
    if (Date.now() - parsed.timestamp > BROLL_CACHE_EXPIRY_MS) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    return parsed.results;
  } catch {
    return null;
  }
};

const setCachedResults = (keyword: string, results: StockImageResult[]): void => {
  try {
    const cacheKey = BROLL_CACHE_PREFIX + keyword.toLowerCase().trim().replace(/\s+/g, '_');
    localStorage.setItem(cacheKey, JSON.stringify({ results, timestamp: Date.now() }));
  } catch (err) {
    console.error('Cache write error:', err);
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

export const GenerateBRollModal: React.FC<GenerateBRollModalProps> = ({
  isOpen,
  onClose,
  segment,
  onGenerate,
  language = 'en',
  maxReferenceImages = 3,
  hasCreatorAvatar = false  // NEW: default false
}) => {
  // Form state
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [includeCreatorFace, setIncludeCreatorFace] = useState(false);
  const [selectedReferences, setSelectedReferences] = useState<SelectedReference[]>([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockImageResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);
  const [isExtractingKeywords, setIsExtractingKeywords] = useState(false);
  
  // URL paste state
  const [pasteUrl, setPasteUrl] = useState('');
  
  const modalContentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // UI Text
  const uiText = {
    title: language === 'id' ? 'Generate B-ROLL Image' : 'Generate B-ROLL Image',
    segment: language === 'id' ? 'Segmen' : 'Segment',
    additionalNotes: language === 'id' ? 'Catatan Tambahan (opsional)' : 'Additional Notes (optional)',
    notesPlaceholder: language === 'id' 
      ? 'Contoh: Pencahayaan lebih dramatis, golden hour, lebih modern...' 
      : 'e.g., More dramatic lighting, golden hour, more modern...',
    includeCreatorFace: language === 'id' ? 'Sertakan Wajah Creator' : 'Include Creator Face',
    includeCreatorFaceHint: language === 'id' 
      ? 'Akan menampilkan avatar kamu di image menggunakan FLUX Kontext' 
      : 'Will include your avatar in the image using FLUX Kontext',
    noAvatarWarning: language === 'id'
      ? '⚠️ Upload avatar di Settings terlebih dahulu untuk menggunakan fitur ini'
      : '⚠️ Upload your avatar in Settings first to use this feature',
    referenceImage: language === 'id' ? 'Reference Image (opsional)' : 'Reference Image (optional)',
    searchPlaceholder: language === 'id' ? 'Cari gambar stock...' : 'Search stock images...',
    search: language === 'id' ? 'Cari' : 'Search',
    orPasteUrl: language === 'id' ? 'Atau paste URL gambar...' : 'Or paste image URL...',
    useUrl: language === 'id' ? 'Gunakan URL' : 'Use URL',
    aiSuggestions: language === 'id' ? 'Saran AI' : 'AI Suggestions',
    extracting: language === 'id' ? 'Mengekstrak...' : 'Extracting...',
    selected: language === 'id' ? 'Terpilih' : 'Selected',
    maxReached: language === 'id' ? `Maksimal ${maxReferenceImages} gambar` : `Max ${maxReferenceImages} images`,
    cancel: language === 'id' ? 'Batal' : 'Cancel',
    generate: language === 'id' ? 'Generate' : 'Generate',
    noResults: language === 'id' ? 'Tidak ada hasil. Coba kata kunci lain.' : 'No results. Try different keywords.',
    searchHint: language === 'id' ? 'Cari reference image dari Unsplash & Pexels' : 'Search reference images from Unsplash & Pexels',
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

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

  // Reset state and extract keywords when modal opens
  useEffect(() => {
    if (isOpen && segment) {
      // Reset form - ALWAYS default to unchecked (don't persist from previous)
      setAdditionalNotes('');
      setIncludeCreatorFace(false);  // BUG FIX: Always default unchecked
      setSelectedReferences([]);
      setSearchQuery('');
      setSearchResults([]);
      setSearchError(null);
      setPasteUrl('');
      setSmartSuggestions([]);
      
      // Extract keywords via LLM
      extractKeywordsAndSearch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, segment?.id]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  // Extract keywords from visual direction using LLM
  const extractKeywordsAndSearch = async () => {
    if (!segment) return;
    
    setIsExtractingKeywords(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('search-stock-images', {
        body: {
          visualDirection: segment.visualDirection || '',
          script: segment.script || '',
          enableSmartExtraction: true,
          orientation: 'portrait',
          per_page: 20,
          provider: 'both'
        }
      });

      setIsExtractingKeywords(false);

      if (error) throw error;

      if (data?.success && data?.data?.smartExtraction?.suggestedQueries?.length > 0) {
        const suggestions = data.data.smartExtraction.suggestedQueries;
        const bestQuery = data.data.query || suggestions[0] || '';
        
        setSearchQuery(bestQuery);
        setSmartSuggestions(suggestions);
        
        // Auto-search with best query
        if (bestQuery) {
          setTimeout(() => handleSearch(bestQuery), 100);
        }
      } else {
        // Fallback to frontend extraction
        const fallbackSuggestions = getSuggestedKeywords(segment.visualDirection, segment.script);
        setSmartSuggestions(fallbackSuggestions);
        
        if (fallbackSuggestions.length > 0) {
          setSearchQuery(fallbackSuggestions[0]);
          setTimeout(() => handleSearch(fallbackSuggestions[0]), 100);
        }
      }
    } catch (err) {
      setIsExtractingKeywords(false);
      console.error('Keyword extraction error:', err);
      
      // Fallback
      const fallbackSuggestions = getSuggestedKeywords(segment.visualDirection || '', segment.script || '');
      setSmartSuggestions(fallbackSuggestions);
      
      if (fallbackSuggestions.length > 0) {
        setSearchQuery(fallbackSuggestions[0]);
        setTimeout(() => handleSearch(fallbackSuggestions[0]), 100);
      }
    }
  };

  // Search stock images
  const handleSearch = useCallback(async (query?: string) => {
    const searchTerm = query || searchQuery;
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    setSearchError(null);

    // Check cache first
    const cached = getCachedResults(searchTerm);
    if (cached && cached.length > 0) {
      setSearchResults(cached);
      setIsSearching(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('search-stock-images', {
        body: {
          query: searchTerm.trim(),
          enableSmartExtraction: false,
          orientation: 'portrait',
          per_page: 20,
          provider: 'both'
        }
      });

      if (error) throw error;

      if (data?.success && data?.data?.results) {
        setSearchResults(data.data.results);
        if (data.data.results.length > 0) {
          setCachedResults(searchTerm, data.data.results);
        } else {
          setSearchError(uiText.noResults);
        }
      } else {
        setSearchResults([]);
        setSearchError(uiText.noResults);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setSearchError(err.message || 'Search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, uiText.noResults]);

  // Select a reference image
  const handleSelectReference = (img: StockImageResult) => {
    if (selectedReferences.length >= maxReferenceImages) return;
    
    // Check if already selected
    if (selectedReferences.some(ref => ref.url === img.url_regular)) return;
    
    setSelectedReferences(prev => [...prev, {
      url: img.url_regular,
      source: img.provider,
      photographer: img.photographer
    }]);
  };

  // Remove a selected reference
  const handleRemoveReference = (url: string) => {
    setSelectedReferences(prev => prev.filter(ref => ref.url !== url));
  };

  // Use pasted URL
  const handleUsePasteUrl = () => {
    if (!pasteUrl.trim()) return;
    if (selectedReferences.length >= maxReferenceImages) return;
    
    // Check if already selected
    if (selectedReferences.some(ref => ref.url === pasteUrl.trim())) return;
    
    setSelectedReferences(prev => [...prev, {
      url: pasteUrl.trim(),
      source: 'upload'
    }]);
    setPasteUrl('');
  };

  // Submit
  const handleSubmit = () => {
    onGenerate({
      additionalNotes: additionalNotes.trim(),
      includeCreatorFace,
      referenceImages: selectedReferences
    });
    onClose();
  };

  // Click outside to close
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalContentRef.current && !modalContentRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!isOpen || !segment) return null;

  const canSelectMore = selectedReferences.length < maxReferenceImages;

  return (
    <div 
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 isolate"
      onClick={handleBackdropClick}
      onWheelCapture={(e) => e.stopPropagation()}
    >
      <div 
        ref={modalContentRef}
        className="bg-card border border-border-default rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-default flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-text-primary">{uiText.title}</h3>
            <p className="text-xs text-text-muted">{uiText.segment}: {segment.type} (B-ROLL)</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-surface rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          
          {/* Additional Notes */}
          <div>
            <label className="text-sm font-medium text-text-primary block mb-2">
              {uiText.additionalNotes}
            </label>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder={uiText.notesPlaceholder}
              className="w-full bg-surface border border-border-default rounded-lg p-3 text-text-primary resize-none h-20 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Include Creator Face Toggle */}
          <div className={`flex items-start gap-3 p-3 rounded-lg border ${includeCreatorFace && !hasCreatorAvatar ? 'bg-amber-500/10 border-amber-500/50' : 'bg-surface/50 border-border-default'}`}>
            <input
              type="checkbox"
              id="includeCreatorFace"
              checked={includeCreatorFace}
              onChange={(e) => setIncludeCreatorFace(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-border-default text-primary focus:ring-primary"
            />
            <label htmlFor="includeCreatorFace" className="flex-1 cursor-pointer">
              <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <User className="w-4 h-4 text-primary" />
                {uiText.includeCreatorFace}
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                {uiText.includeCreatorFaceHint}
              </p>
              {/* Warning when checkbox checked but no avatar */}
              {includeCreatorFace && !hasCreatorAvatar && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
                  {uiText.noAvatarWarning}
                </p>
              )}
            </label>
          </div>

          {/* Reference Image Section */}
          <div>
            <label className="text-sm font-medium text-text-primary block mb-2">
              {uiText.referenceImage}
            </label>
            
            {/* Selected References */}
            {selectedReferences.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {selectedReferences.map((ref, idx) => (
                  <div key={idx} className="relative w-20 h-28 rounded-lg overflow-hidden border-2 border-primary group">
                    <img 
                      src={ref.url} 
                      alt={`Reference ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => handleRemoveReference(ref.url)}
                      className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3 text-white" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[8px] text-center py-0.5">
                      {ref.source.toUpperCase()}
                    </div>
                  </div>
                ))}
                {selectedReferences.length < maxReferenceImages && (
                  <div className="w-20 h-28 rounded-lg border-2 border-dashed border-border-default flex items-center justify-center text-text-muted">
                    <span className="text-xs">+{maxReferenceImages - selectedReferences.length}</span>
                  </div>
                )}
              </div>
            )}

            {/* Search Bar */}
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={uiText.searchPlaceholder}
                  className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <Button 
                onClick={() => handleSearch()} 
                disabled={isSearching || !searchQuery.trim()}
                className="px-4"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : uiText.search}
              </Button>
            </div>

            {/* AI Suggestions */}
            {smartSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center mb-3">
                <span className="text-xs text-text-muted flex items-center gap-1">
                  {isExtractingKeywords ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> {uiText.extracting}</>
                  ) : (
                    <><Sparkles className="w-3 h-3 text-primary" /> {uiText.aiSuggestions}:</>
                  )}
                </span>
                {smartSuggestions.map((keyword, idx) => (
                  <button
                    key={idx}
                    disabled={isSearching}
                    onClick={() => {
                      setSearchQuery(keyword);
                      handleSearch(keyword);
                    }}
                    className={`px-2.5 py-1 text-xs rounded-full transition-colors disabled:opacity-50 ${
                      idx === 0 
                        ? 'bg-primary text-white hover:bg-primary/90' 
                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}
                  >
                    {keyword}
                  </button>
                ))}
              </div>
            )}

            {/* URL Paste */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={pasteUrl}
                onChange={(e) => setPasteUrl(e.target.value)}
                placeholder={uiText.orPasteUrl}
                className="flex-1 px-3 py-2 bg-surface border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button 
                onClick={handleUsePasteUrl} 
                disabled={!pasteUrl.trim() || !canSelectMore} 
                variant="outline"
                className="px-3"
              >
                <Upload className="w-4 h-4 mr-1" /> {uiText.useUrl}
              </Button>
            </div>

            {/* Search Error */}
            {searchError && (
              <p className="text-xs text-red-500 mb-2">{searchError}</p>
            )}

            {/* Max Reached Warning */}
            {!canSelectMore && (
              <p className="text-xs text-amber-500 mb-2 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {uiText.maxReached}
              </p>
            )}

            {/* Search Results Grid */}
            <div className="h-48 overflow-y-auto rounded-lg border border-border-default bg-surface/30">
              {isSearching ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-4 gap-2 p-2">
                  {searchResults.map((img) => {
                    const isSelected = selectedReferences.some(ref => ref.url === img.url_regular);
                    return (
                      <div
                        key={`${img.provider}-${img.id}`}
                        className={`relative aspect-[9/16] rounded-lg overflow-hidden cursor-pointer transition-all ${
                          isSelected 
                            ? 'ring-2 ring-primary opacity-50 cursor-not-allowed' 
                            : canSelectMore 
                              ? 'hover:ring-2 ring-primary/50' 
                              : 'opacity-50 cursor-not-allowed'
                        }`}
                        onClick={() => !isSelected && canSelectMore && handleSelectReference(img)}
                      >
                        <img 
                          src={img.url_thumb} 
                          alt={img.alt_description || ''} 
                          className="w-full h-full object-cover" 
                          loading="lazy"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-white" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                          <p className="text-[9px] text-white truncate">{img.photographer}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <Camera className="w-10 h-10 text-text-muted/30 mb-2" />
                  <p className="text-text-secondary text-sm">{uiText.searchHint}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-border-default flex-shrink-0 bg-card">
          <Button onClick={onClose} variant="outline" className="flex-1">
            {uiText.cancel}
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="flex-1 bg-gradient-to-r from-primary to-accent-pink hover:opacity-90"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {uiText.generate}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GenerateBRollModal;
