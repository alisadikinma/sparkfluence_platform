import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Logo } from "../../components/ui/logo";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { calculateSegmentDuration, getDurationExplanation } from "../../lib/segmentDuration";
import { getSuggestedKeywords } from "../../lib/keywordExtractor";  // Only need fallback function
import { VisualPreviewGallery, GenerateBRollModal } from "./components";
import {
  RefreshCw, ImageIcon, Loader2,
  Sparkles, X, Maximize2, AlertCircle,
  CloudOff, Cloud, CheckCircle2, Download,
  ChevronDown, Upload, Search, Camera
} from "lucide-react";

interface SegmentImage {
  id: string;                              // job ID from database
  imageUrl: string;                        // Supabase storage URL
  generationNumber: number;                // 1, 2, 3, ... (tracks regen count)
  sourceType: 'generated' | 'stock' | 'uploaded';
  isSelected: boolean;                     // Only 1 per segment can be true
  scriptText?: string;                     // Stored for video prompt generation
  regenerationNotes?: string;              // User notes from regen modal
  referenceImageUrl?: string;              // Avatar/ref image used
  status: 0 | 1 | 2 | 3;                   // PENDING | PROCESSING | COMPLETED | FAILED
  errorMessage?: string;
  createdAt: string;
}

interface Segment {
  id: string;
  segmentId: string;
  type: string;
  timing: string;
  durationSeconds: number;
  shotType: string;
  creatorAvatarUrl?: string;
  emotion: string;
  transition: string;
  script: string;
  visualDirection: string;
  imageUrl: string | null;                 // Keep for backward compatibility (selected image)
  images: SegmentImage[];                  // NEW: Array of all images for this segment
  isGeneratingImage: boolean;
  imageError?: string | null;
  jobId?: string;
  referenceImageUrl?: string;              // B-ROLL reference image (stock/uploaded)
  referenceImageSource?: 'unsplash' | 'pexels' | 'upload';
  includeCreatorFace?: boolean;            // NEW: Include creator face in B-ROLL (uses flux-kontext-multi)
}

interface VideoSettings {
  duration: '30s' | '60s' | '90s';
  aspectRatio: '9:16' | '16:9';
  resolution: '720p' | '1080p';
  language?: string;
  model?: 'auto' | 'veo31' | 'sora2'; // auto = VEO 3.1 (default)
}

interface ImageJob {
  id: string;
  segment_id: string;
  segment_number: number;
  segment_type: string;
  status: number;
  image_url: string | null;
  error_message: string | null;
}

const JOB_STATUS = {
  PENDING: 0,
  PROCESSING: 1,
  COMPLETED: 2,
  FAILED: 3
};

// Image Model Configuration
// Maps frontend keys to edge function model keys
const IMAGE_MODELS = {
  aRoll: {
    auto: { id: 'auto', label: 'Auto (Nano Banana)', edgeKey: 'fal-nano-banana-edit' },
    'nano-banana': { id: 'nano-banana', label: 'Nano Banana Edit', edgeKey: 'fal-nano-banana-edit' },
    'flux-kontext': { id: 'flux-kontext', label: 'FLUX Kontext Pro', edgeKey: 'flux-kontext' },
  },
  bRoll: {
    auto: { id: 'auto', label: 'Auto (Seedream v4)', edgeKey: 'fal-seedream-v4' },
    'qwen-image': { id: 'qwen-image', label: 'Qwen Image', edgeKey: 'fal-qwen-image' },
    'seedream-v4': { id: 'seedream-v4', label: 'Seedream v4', edgeKey: 'fal-seedream-v4' },
  }
};

interface ImageModelSettings {
  aRoll: 'auto' | 'nano-banana' | 'flux-kontext';
  bRoll: 'auto' | 'qwen-image' | 'seedream-v4';
}

// Keyword extraction functions imported from lib/keywordExtractor.ts

// ImageGallery Component - displays multiple images per segment
interface ImageGalleryProps {
  images: SegmentImage[];
  segmentNumber: number;
  sessionId: string;
  onSelectImage: (imageId: string) => void;
  onRegenerateImage: (imageId: string) => void;
  onDeleteImage: (imageId: string) => void;
  disabled?: boolean;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  segmentNumber,
  onSelectImage,
  onRegenerateImage,
  onDeleteImage,
  disabled = false
}) => {
  if (images.length === 0) return null;

  return (
    <div className="mt-3 border-t border-border-default pt-3">
      <label className="text-text-secondary text-xs mb-2 block">
        Image Gallery ({images.length} {images.length === 1 ? 'image' : 'images'})
      </label>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {images.map((img) => (
          <div key={img.id} className="relative flex-shrink-0 w-24 h-32">
            {/* Thumbnail */}
            <img
              src={img.imageUrl}
              alt={`Generation ${img.generationNumber}`}
              className={`w-full h-full object-cover rounded-lg border-2 transition-all cursor-pointer ${
                img.isSelected
                  ? 'border-green-500 ring-2 ring-green-500/30'
                  : 'border-border-default hover:border-primary'
              }`}
              onClick={() => !disabled && onSelectImage(img.id)}
            />

            {/* Selected indicator */}
            {img.isSelected && (
              <div className="absolute top-1 right-1 bg-green-500 rounded-full p-1">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
            )}

            {/* Generation number badge */}
            <div className="absolute top-1 left-1 bg-black/70 rounded px-2 py-0.5 text-xs text-white font-medium">
              #{img.generationNumber}
            </div>

            {/* Source type badge */}
            <div className="absolute bottom-1 left-1 bg-primary/80 rounded px-2 py-0.5 text-xs text-white">
              {img.sourceType === 'generated' ? 'AI' : img.sourceType === 'stock' ? 'STOCK' : 'UPLOAD'}
            </div>

            {/* Actions on hover */}
            {!disabled && (
              <div className="absolute inset-0 bg-black/0 hover:bg-black/60 transition-all flex items-center justify-center gap-1 opacity-0 hover:opacity-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRegenerateImage(img.id);
                  }}
                  className="p-1 bg-primary rounded"
                  title="Regenerate"
                >
                  <RefreshCw className="w-3 h-3 text-white" />
                </button>
                {!img.isSelected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteImage(img.id);
                    }}
                    className="p-1 bg-red-500 rounded"
                    title="Delete"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>
            )}

            {/* Processing indicator */}
            {img.status === JOB_STATUS.PROCESSING && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}

            {/* Failed indicator */}
            {img.status === JOB_STATUS.FAILED && (
              <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// StockImageModal Component - search stock images from Unsplash and Pexels
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

interface StockImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string, metadata: StockImageResult) => void;
}

const StockImageModal: React.FC<StockImageModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockImageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: searchError } = await supabase.functions.invoke('search-stock-images', {
        body: {
          query: query.trim(),
          orientation: 'portrait',
          per_page: 20,
          provider: 'both'
        }
      });

      if (searchError) throw searchError;

      if (data?.success && data?.data?.results) {
        setResults(data.data.results);
      } else {
        throw new Error('No results found');
      }
    } catch (err: any) {
      console.error('Stock image search error:', err);
      setError(err.message || 'Failed to search stock images');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
      <div className="bg-card border border-border-default rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-default">
          <h3 className="text-xl font-bold text-text-primary">Search Stock Images</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-surface rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Search bar */}
        <div className="p-4 border-b border-border-default">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Search images (e.g., coffee shop, sunset, office)"
              className="flex-1 bg-surface border border-border-default rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={loading}
            />
            <Button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="px-6"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                'Search'
              )}
            </Button>
          </div>
          {error && (
            <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {error}
            </p>
          )}
        </div>

        {/* Results grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {results.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {results.map((img) => (
                <div
                  key={`${img.provider}-${img.id}`}
                  className="relative aspect-[9/16] rounded-lg overflow-hidden cursor-pointer hover:ring-2 ring-primary transition-all group"
                  onClick={() => {
                    onSelect(img.url_regular, img);
                    onClose();
                  }}
                >
                  <img
                    src={img.url_thumb}
                    alt={img.alt_description || 'Stock image'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-xs text-white font-medium truncate">
                        Photo by {img.photographer}
                      </p>
                      <p className="text-xs text-white/60 uppercase">{img.provider}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ImageIcon className="w-16 h-16 text-text-muted/30 mb-4" />
              <p className="text-text-secondary">
                {loading ? 'Searching...' : 'Search for stock images from Unsplash and Pexels'}
              </p>
              <p className="text-sm text-text-muted mt-1">
                Results will appear here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// RegenerateModal Component - regenerate with notes
interface RegenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  segment: Segment | null;
  onRegenerate: (notes: string) => void;
}

const RegenerateModal: React.FC<RegenerateModalProps> = ({
  isOpen,
  onClose,
  segment,
  onRegenerate
}) => {
  const [notes, setNotes] = useState('');

  // Reset notes when modal opens
  useEffect(() => {
    if (isOpen) {
      setNotes('');
    }
  }, [isOpen]);

  if (!isOpen || !segment) return null;

  const handleSubmit = () => {
    onRegenerate(notes);
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border-default rounded-2xl p-6 w-full max-w-md relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-surface rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-text-secondary" />
        </button>

        {/* Title */}
        <h3 className="text-xl font-bold text-text-primary mb-4">
          Regenerate Image
        </h3>

        {/* Segment info */}
        <div className="mb-4 p-3 bg-surface rounded-lg">
          <p className="text-sm text-text-muted mb-1">Segment: <span className="text-primary font-medium">{segment.type}</span></p>
          <p className="text-xs text-text-secondary line-clamp-2">{segment.script}</p>
        </div>

        {/* Original prompt display */}
        <div className="mb-4">
          <label className="text-sm text-text-muted block mb-1">Original Visual Direction:</label>
          <div className="text-sm text-text-secondary bg-surface p-3 rounded-lg max-h-24 overflow-y-auto">
            {segment.visualDirection || 'No visual direction provided'}
          </div>
        </div>

        {/* Notes input */}
        <div className="mb-6">
          <label className="text-sm text-text-muted block mb-1">Additional Notes (optional):</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Make it darker, add more contrast, change lighting..."
            className="w-full bg-surface border border-border-default rounded-lg p-3 text-text-primary resize-none h-24 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-text-muted mt-1.5">
            Notes akan ditambahkan ke prompt untuk hasil yang lebih sesuai
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button onClick={onClose} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="flex-1 bg-primary hover:bg-primary-hover">
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerate
          </Button>
        </div>
      </div>
    </div>
  );
};

// ReferenceImageModal Component - for B-ROLL segments to add reference images
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
    
    // Check if expired (1 week)
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
    const cacheData: CachedBrollResult = {
      results,
      timestamp: Date.now()
    };
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
  onSelect: (imageUrl: string, source: 'unsplash' | 'pexels' | 'upload') => void;
}

const ReferenceImageModal: React.FC<ReferenceImageModalProps> = ({
  isOpen,
  onClose,
  segment,
  initialKeywords,
  onSelect
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
      // Prevent background scroll
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

  // Smart extraction + auto-search when modal opens
  // Use segment.id to force re-trigger even if same segment object
  useEffect(() => {
    if (isOpen && segment) {
      // Reset ALL state including searchQuery
      setSearchQuery('');  // Clear textbox first!
      setSmartSuggestions([]);
      setExtractionSource(null);
      setResults([]);
      setError(null);
      setUploadUrl('');
      
      // Trigger smart search with LLM extraction
      handleSmartSearch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, segment?.id]);  // Use segment.id instead of segment object

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
          enableSmartExtraction: true,
          orientation: 'portrait',
          per_page: 20,
          provider: 'both'
        }
      });

      setIsExtractingKeywords(false);

      if (searchError) {
        console.error('Smart search error:', searchError);
        throw new Error('Smart keyword extraction unavailable. Try manual search.');
      }

      if (data?.success) {
        // STEP 1: Extract keywords from LLM response
        let bestQuery = '';
        if (data.data?.smartExtraction?.suggestedQueries?.length > 0) {
          const suggestions = data.data.smartExtraction.suggestedQueries;
          bestQuery = data.data.query || suggestions[0] || '';
          setSearchQuery(bestQuery);  // Fill textbox
          setSmartSuggestions(suggestions);
          setExtractionSource(data.data.smartExtraction.source);
          console.log(`[SmartSearch] LLM extracted keyword: "${bestQuery}"`);
        } else {
          // Fallback to frontend suggestions
          const fallbackSuggestions = getSuggestedKeywords(segment.visualDirection, segment.script);
          if (fallbackSuggestions.length > 0) {
            bestQuery = fallbackSuggestions[0];
            setSearchQuery(bestQuery);
          }
          setSmartSuggestions(fallbackSuggestions);
          setExtractionSource('fallback');
          console.log(`[SmartSearch] Fallback keyword: "${bestQuery}"`);
        }
        
        // STEP 2: ALWAYS trigger fresh search with extracted keyword
        // Don't use backend results directly - they may be stale/cached
        if (bestQuery) {
          console.log(`[SmartSearch] Triggering fresh search with: "${bestQuery}"`);
          setTimeout(() => handleSearch(bestQuery), 100);
          return;  // handleSearch will handle loading state
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
      console.error('Smart search error:', err);
      
      // Fallback to frontend suggestions
      const fallbackSuggestions = getSuggestedKeywords(segment.visualDirection, segment.script);
      setSmartSuggestions(fallbackSuggestions);
      setExtractionSource('fallback');
      
      // Auto-fill textbox and search with first suggestion
      if (fallbackSuggestions.length > 0) {
        const firstSuggestion = fallbackSuggestions[0];
        setSearchQuery(firstSuggestion);
        setError(null);  // Clear error since we're auto-searching
        // Delay search slightly to avoid state conflicts
        setTimeout(() => handleSearch(firstSuggestion), 100);
      } else {
        setError(err.message || 'Smart search failed. Use manual search.');
      }
      return;  // Early return to skip finally
    }
  };

  // Manual search (when user types query or clicks suggestion)
  // Use useCallback to ensure stable function reference
  const handleSearch = useCallback(async (query?: string) => {
    const searchTerm = query || searchQuery;
    console.log(`[handleSearch] Called with: "${searchTerm}", loading: ${loading}`);
    if (!searchTerm.trim()) {
      console.log('[handleSearch] Empty search term, skipping');
      return;
    }

    // Don't block if already loading - let new search override
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
      // Simple search (no LLM extraction for manual queries)
      const { data, error: searchError } = await supabase.functions.invoke('search-stock-images', {
        body: {
          query: searchTerm.trim(),
          enableSmartExtraction: false,  // Disable LLM for manual search
          orientation: 'portrait',
          per_page: 20,
          provider: 'both'
        }
      });

      if (searchError) {
        console.error('Stock search error:', searchError);
        throw new Error('Stock image search unavailable. Use URL paste instead.');
      }
      if (data?.success && data?.data?.results) {
        setResults(data.data.results);
        // Cache results to localStorage
        if (data.data.results.length > 0) {
          setCachedBrollResults(searchTerm, data.data.results);
          console.log('[BrollCache] Cached results for:', searchTerm);
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
  }, [searchQuery]);  // Include searchQuery for cases where query param is undefined

  const handleUploadUrl = () => {
    if (uploadUrl.trim()) {
      onSelect(uploadUrl.trim(), 'upload');
      onClose();
    }
  };

  // Handle click outside modal to close
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
          
          {/* Smart Keyword Suggestions from LLM - 2026-01-14 */}
          {smartSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-text-muted flex items-center gap-1">
                {isExtractingKeywords ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Extracting...</>
                ) : (
                  <>✨ AI Suggestions {extractionSource === 'llm' && <span className="text-[10px] text-green-500">(LLM)</span>}:</>
                )}
              </span>
              {smartSuggestions.map((keyword, idx) => (
                <button
                  key={idx}
                  disabled={loading}
                  onClick={() => {
                    console.log('[SuggestionChip] Clicked:', keyword);
                    setSearchQuery(keyword);
                    handleSearch(keyword);  // Direct call - useCallback makes it stable
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
                  key={`${img.provider}-${img.id}`}
                  className="relative aspect-[9/16] rounded-lg overflow-hidden cursor-pointer hover:ring-2 ring-primary"
                  onClick={() => { onSelect(img.url_regular, img.provider); onClose(); }}
                >
                  <img src={img.url_thumb} alt="" className="w-full h-full object-cover" />
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

export const ImageGeneration = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { language } = useLanguage();
  
  const [segments, setSegments] = useState<Segment[]>([]);
  const [currentTopic, setCurrentTopic] = useState("Your Video");
  const [videoSettings, setVideoSettings] = useState<VideoSettings | null>(null);
  const [characterDescription, setCharacterDescription] = useState<string>("");
  const [characterRefPng, setCharacterRefPng] = useState<string>("");
  const [userAvatarUrl, setUserAvatarUrl] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isBackgroundMode, setIsBackgroundMode] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0, completed: 0, failed: 0 });
  const [showBackgroundToast, setShowBackgroundToast] = useState(false);
  const processingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [regenerateModal, setRegenerateModal] = useState<{ isOpen: boolean; segment: Segment | null }>({ isOpen: false, segment: null });
  
  // NEW: Image model selection state
  const [imageModels, setImageModels] = useState<ImageModelSettings>({ aRoll: 'auto', bRoll: 'auto' });
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [referenceImageModal, setReferenceImageModal] = useState<{ isOpen: boolean; segment: Segment | null }>({ isOpen: false, segment: null });
  const [bRollModal, setBRollModal] = useState<{ isOpen: boolean; segment: Segment | null }>({ isOpen: false, segment: null });

  const fromScriptLab = location.state?.fromScriptLab === true;

  const uiText = {
    title: language === 'id' ? 'Editor Video' : language === 'hi' ? 'वीडियो एडिटर' : 'Video Editor',
    duration: language === 'id' ? 'Durasi' : language === 'hi' ? 'अवधि' : 'Duration',
    generateAll: language === 'id' ? 'Generate Semua Gambar' : language === 'hi' ? 'सभी छवियां जनरेट करें' : 'Generate All Images',
    generating: language === 'id' ? 'Generating...' : language === 'hi' ? 'जनरेट हो रहा है...' : 'Generating...',
    script: language === 'id' ? 'Script (VO)' : language === 'hi' ? 'स्क्रिप्ट (VO)' : 'Script (VO)',
    visualDirection: language === 'id' ? 'Arahan Visual' : language === 'hi' ? 'विजुअल निर्देश' : 'Visual Direction',
    visualPreview: language === 'id' ? 'Preview Visual' : language === 'hi' ? 'विजुअल प्रीव्यू' : 'Visual Preview',
    creatorShot: language === 'id' ? 'Creator Shot' : language === 'hi' ? 'क्रिएटर शॉट' : 'Creator Shot',
    generateImage: language === 'id' ? 'Generate' : language === 'hi' ? 'जनरेट' : 'Generate',
    regenerate: language === 'id' ? 'Regenerate' : language === 'hi' ? 'रीजनरेट' : 'Regenerate',
    previous: language === 'id' ? 'Sebelumnya' : language === 'hi' ? 'पिछला' : 'Previous',
    next: language === 'id' ? 'Generate Video' : language === 'hi' ? 'वीडियो जनरेट करें' : 'Generate Videos',
    imagesRequired: language === 'id' ? 'Generate semua gambar dulu' : language === 'hi' ? 'पहले सभी छवियां जनरेट करें' : 'Generate all images first',
    loading: language === 'id' ? 'Memuat progress...' : language === 'hi' ? 'प्रगति लोड हो रहा है...' : 'Loading your progress...',
    step: language === 'id' ? 'Langkah' : language === 'hi' ? 'चरण' : 'Step',
    backgroundProcessing: language === 'id' 
      ? 'Gambar sedang di-generate di background. Anda bisa menutup browser atau melakukan aktivitas lain. Kami akan kirim notifikasi saat selesai!'
      : language === 'hi'
      ? 'छवियां बैकग्राउंड में जनरेट हो रही हैं। आप ब्राउज़र बंद कर सकते हैं। हम आपको सूचित करेंगे!'
      : 'Images are being generated in the background. You can close your browser or do other activities. We\'ll notify you when done!',
    resuming: language === 'id' ? 'Melanjutkan proses...' : language === 'hi' ? 'प्रक्रिया जारी...' : 'Resuming process...',
    processingComplete: language === 'id' ? 'Semua gambar selesai!' : language === 'hi' ? 'सभी छवियां तैयार!' : 'All images complete!',
  };

  useEffect(() => {
    return () => {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (sessionId && segments.length > 0) {
      const timeoutId = setTimeout(() => {
        saveProgress(segments, currentTopic, videoSettings);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [segments, sessionId]);

  const saveProgress = (updatedSegments: Segment[], topic: string, settings: VideoSettings | null) => {
    if (!sessionId) return;
    const progressData = {
      sessionId,
      topic,
      videoSettings: settings,
      segments: updatedSegments,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(`sparkfluence_video_progress_${sessionId}`, JSON.stringify(progressData));
    localStorage.setItem('sparkfluence_active_session', sessionId);
  };

  const loadProgress = (sid: string): any | null => {
    try {
      const saved = localStorage.getItem(`sparkfluence_video_progress_${sid}`);
      if (saved) return JSON.parse(saved);
    } catch (err) {
      console.error('Error loading progress:', err);
    }
    return null;
  };

  const checkExistingJobs = async (sid: string): Promise<ImageJob[] | null> => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('image_generation_jobs')
        .select('*')
        .eq('session_id', sid)
        .eq('user_id', user.id)
        .order('segment_number', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error checking existing jobs:', err);
      return null;
    }
  };

  const syncJobsWithSegments = (jobs: ImageJob[], currentSegments: Segment[]): Segment[] => {
    return currentSegments.map((seg, index) => {
      const job = jobs.find(j => j.segment_number === index + 1);
      if (job) {
        return {
          ...seg,
          imageUrl: job.image_url || seg.imageUrl,
          images: seg.images || [],          // Preserve existing images array
          imageError: job.error_message || null,
          isGeneratingImage: job.status === JOB_STATUS.PROCESSING,
          jobId: job.id
        };
      }
      return {
        ...seg,
        images: seg.images || []              // Ensure images array exists
      };
    });
  };

  // Fetch all images for a session (multi-image support)
  const fetchSegmentImages = async (sid: string): Promise<Map<number, SegmentImage[]>> => {
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

      // Group by segment_number
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
          createdAt: job.created_at
        });
      });

      return imageMap;
    } catch (err) {
      console.error('Error fetching segment images:', err);
      return new Map();
    }
  };

  // Sync images with segments
  const syncImagesWithSegments = (imageMap: Map<number, SegmentImage[]>, currentSegments: Segment[]): Segment[] => {
    return currentSegments.map((seg, index) => {
      const images = imageMap.get(index + 1) || [];
      const selectedImage = images.find(img => img.isSelected);

      return {
        ...seg,
        images,
        imageUrl: selectedImage?.imageUrl || seg.imageUrl,
        isGeneratingImage: images.some(img => img.status === JOB_STATUS.PROCESSING), // Any processing
        imageError: images.find(img => img.status === JOB_STATUS.FAILED)?.errorMessage || null
      };
    });
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('character_description, avatar_url, character_ref_png')
          .eq('user_id', user.id)
          .single();
        
        if (data?.character_description) setCharacterDescription(data.character_description);
        if (data?.avatar_url) setUserAvatarUrl(data.avatar_url);
        if (data?.character_ref_png) setCharacterRefPng(data.character_ref_png);
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };
    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    const initializeEditor = async () => {
      const urlSessionId = searchParams.get('session');
      const stateData = location.state;
      
      let sid = urlSessionId || stateData?.sessionId || null;
      
      if (stateData?.segments && stateData.segments.length > 0) {
        sid = sid || `video_${Date.now()}`;
        setSessionId(sid);
        
        if (stateData.characterDescription) {
          setCharacterDescription(stateData.characterDescription);
        }
        
        const existingJobs = await checkExistingJobs(sid);
        const savedProgress = loadProgress(sid);
        
        let formattedSegments: Segment[];
        
        if (savedProgress && savedProgress.segments?.length > 0) {
          formattedSegments = savedProgress.segments;
          setCurrentTopic(savedProgress.topic?.split('\n')[0].trim() || 'Your Video');
          setVideoSettings(savedProgress.videoSettings || stateData.videoSettings || null);
        } else {
          // Auto-calculate duration based on segment type and video duration
          const videoDuration = stateData.videoSettings?.duration || '60s';

          formattedSegments = stateData.segments.map((seg: any, index: number) => {
            const segmentType = seg.type || `SEGMENT_${index + 1}`;
            const autoDuration = calculateSegmentDuration(segmentType, videoDuration);

            return {
              id: String(index + 1),
              segmentId: seg.segment_id || `VIDEO-${String(index + 1).padStart(3, '0')}`,
              type: segmentType,
              timing: seg.timing || `${index * 8}-${(index + 1) * 8}s`,
              durationSeconds: autoDuration,  // Auto-calculated duration
              shotType: seg.shot_type || 'B-ROLL',
              creatorAvatarUrl: seg.creator_avatar_url || undefined,
              emotion: seg.emotion || '',
              transition: seg.transition || 'Cut',
              script: seg.script_text || seg.script || '',
              visualDirection: seg.visual_direction || '',
              imageUrl: null,
              images: [],                        // Initialize empty images array
              isGeneratingImage: false,
              imageError: null,
            };
          });

          setCurrentTopic(stateData.topic?.split('\n')[0].trim() || 'Your Video');
          setVideoSettings(stateData.videoSettings || null);
        }
        
        if (existingJobs && existingJobs.length > 0) {
          formattedSegments = syncJobsWithSegments(existingJobs, formattedSegments);
          
          const hasPending = existingJobs.some(j => j.status === JOB_STATUS.PENDING || j.status === JOB_STATUS.PROCESSING);
          if (hasPending) {
            setIsBackgroundMode(true);
            setShowBackgroundToast(true);
            startBackgroundProcessing(sid);
          }
        }
        
        setSegments(formattedSegments);
        setIsLoaded(true);
        
      } else if (sid) {
        const existingJobs = await checkExistingJobs(sid);
        const savedProgress = loadProgress(sid);
        
        if (savedProgress && savedProgress.segments?.length > 0) {
          setSessionId(sid);
          let formattedSegments = savedProgress.segments;
          
          if (existingJobs && existingJobs.length > 0) {
            formattedSegments = syncJobsWithSegments(existingJobs, formattedSegments);
            
            const hasPending = existingJobs.some(j => j.status === JOB_STATUS.PENDING || j.status === JOB_STATUS.PROCESSING);
            if (hasPending) {
              setIsBackgroundMode(true);
              setShowBackgroundToast(true);
              startBackgroundProcessing(sid);
            }
          }
          
          setSegments(formattedSegments);
          setCurrentTopic(savedProgress.topic?.split('\n')[0].trim() || 'Your Video');
          setVideoSettings(savedProgress.videoSettings || null);
          setIsLoaded(true);
        } else {
          navigate('/topic-selection');
        }
      } else {
        const activeSessionId = localStorage.getItem('sparkfluence_active_session');
        if (activeSessionId) {
          const savedProgress = loadProgress(activeSessionId);
          const existingJobs = await checkExistingJobs(activeSessionId);
          
          if (savedProgress && savedProgress.segments?.length > 0) {
            setSessionId(activeSessionId);
            let formattedSegments = savedProgress.segments;
            
            if (existingJobs && existingJobs.length > 0) {
              formattedSegments = syncJobsWithSegments(existingJobs, formattedSegments);
              
              const hasPending = existingJobs.some(j => j.status === JOB_STATUS.PENDING || j.status === JOB_STATUS.PROCESSING);
              if (hasPending) {
                setIsBackgroundMode(true);
                setShowBackgroundToast(true);
                startBackgroundProcessing(activeSessionId);
              }
            }
            
            setSegments(formattedSegments);
            setCurrentTopic(savedProgress.topic?.split('\n')[0].trim() || 'Your Video');
            setVideoSettings(savedProgress.videoSettings || null);
            setIsLoaded(true);
          } else {
            navigate('/topic-selection');
          }
        } else {
          navigate('/topic-selection');
        }
      }
    };
    
    initializeEditor();
  }, [location.state, searchParams, navigate, user]);

  // NEW: Sync images array from database after initialization
  // This ensures VisualPreviewGallery displays all regenerated images on page refresh
  useEffect(() => {
    const syncImagesOnLoad = async () => {
      // Only run after initialization is complete and we have segments
      if (!sessionId || !isLoaded || !user || segments.length === 0) return;
      
      // Skip if any segment is currently generating (will be handled by background processing)
      if (segments.some(seg => seg.isGeneratingImage)) return;
      
      // Skip if images are already populated (avoid unnecessary re-fetch)
      const hasPopulatedImages = segments.some(seg => seg.images && seg.images.length > 0);
      if (hasPopulatedImages) return;
      
      console.log('[InitSync] Syncing images from database...');
      
      try {
        const imageMap = await fetchSegmentImages(sessionId);
        
        if (imageMap.size > 0) {
          setSegments(prev => syncImagesWithSegments(imageMap, prev));
          console.log(`[InitSync] Synced ${imageMap.size} segments with images`);
        }
      } catch (err) {
        console.error('[InitSync] Failed to sync images:', err);
      }
    };
    
    syncImagesOnLoad();
  }, [sessionId, isLoaded, user, segments.length]); // Run when these change

  const startBackgroundProcessing = useCallback((sid: string) => {
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
    }
    
    const processNext = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase.functions.invoke('generate-images', {
          body: {
            mode: 'process_single',
            session_id: sid,
            user_id: user.id
          }
        });
        
        if (error) {
          console.error('Process error:', error);
          return;
        }
        
        const result = data?.data;
        
        if (result?.summary) {
          setGenerationProgress({
            current: result.summary.completed + result.summary.failed,
            total: result.summary.total,
            completed: result.summary.completed,
            failed: result.summary.failed
          });
        }
        
        // ✅ FIX: When job completes, fetch ALL images for segment and update images array
        if (result?.job?.image_url) {
          const segmentNumber = result.job.segment_number;
          
          // Fetch all images for this segment from database
          const { data: segmentImages, error: fetchError } = await supabase
            .from('image_generation_jobs')
            .select('*')
            .eq('session_id', sid)
            .eq('segment_number', segmentNumber)
            .eq('user_id', user.id)
            .order('generation_number', { ascending: true });
          
          if (fetchError) {
            console.error('Error fetching segment images:', fetchError);
          }
          
          // Transform DB records to SegmentImage format
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
            createdAt: job.created_at
          }));
          
          // Find selected image or use latest completed
          const completedImages = imagesArray.filter(img => img.status === JOB_STATUS.COMPLETED && img.imageUrl);
          let selectedImage = completedImages.find(img => img.isSelected);
          
          // If no image is selected, auto-select the latest one
          if (!selectedImage && completedImages.length > 0) {
            const latestImage = completedImages[completedImages.length - 1];
            selectedImage = latestImage;
            
            // Update database to mark as selected
            await supabase
              .from('image_generation_jobs')
              .update({ is_selected: false })
              .eq('session_id', sid)
              .eq('segment_number', segmentNumber)
              .eq('user_id', user.id);
            
            await supabase
              .from('image_generation_jobs')
              .update({ is_selected: true })
              .eq('id', latestImage.id)
              .eq('user_id', user.id);
            
            // Update local array
            imagesArray.forEach(img => {
              img.isSelected = img.id === latestImage.id;
            });
          }
          
          setSegments(prev => {
            const updated = prev.map(seg => {
              if (seg.jobId === result.job.id || parseInt(seg.id) === segmentNumber) {
                return {
                  ...seg,
                  images: imagesArray,  // ✅ Update images array
                  imageUrl: selectedImage?.imageUrl || result.job.image_url,
                  isGeneratingImage: imagesArray.some(img => img.status === JOB_STATUS.PROCESSING),
                  imageError: null
                };
              }
              return seg;
            });
            saveProgress(updated, currentTopic, videoSettings);
            return updated;
          });
          
          console.log(`[BackgroundProcessing] Segment ${segmentNumber} updated with ${imagesArray.length} images`);
        }
        
        if (result?.all_complete) {
          setIsGeneratingAll(false);
          setIsBackgroundMode(false);
          setShowBackgroundToast(false);
          if (processingIntervalRef.current) {
            clearInterval(processingIntervalRef.current);
            processingIntervalRef.current = null;
          }
          
          // ✅ Final sync: Fetch ALL images for ALL segments
          const imageMap = await fetchSegmentImages(sid);
          setSegments(prev => syncImagesWithSegments(imageMap, prev));
          console.log('[BackgroundProcessing] All complete - final sync done');
        }
        
      } catch (err) {
        console.error('Background processing error:', err);
      }
    };
    
    processNext();
    processingIntervalRef.current = setInterval(processNext, 3000);
  }, [user, currentTopic, videoSettings]);

  const handleGenerateAllBackground = async () => {
    if (!user || !sessionId) return;
    
    const segmentsToGenerate = segments.filter(s => !s.imageUrl && !s.isGeneratingImage);
    if (segmentsToGenerate.length === 0) return;

    setIsGeneratingAll(true);
    setIsBackgroundMode(true);
    setShowBackgroundToast(true);
    setGenerationProgress({ current: 0, total: segmentsToGenerate.length, completed: 0, failed: 0 });

    try {
      // Use character_ref_png if available, otherwise fallback to avatar_url
      const referenceImage = characterRefPng || userAvatarUrl || '';
      
      const segmentsData = segmentsToGenerate.map((seg, index) => {
        const originalIndex = segments.findIndex(s => s.id === seg.id);
        const isCreatorShot = seg.shotType === 'CREATOR'; // Only shot_type matters
        return {
          segment_id: seg.segmentId,
          segment_number: originalIndex + 1,
          segment_type: seg.type,
          shot_type: seg.shotType,
          emotion: seg.emotion,
          // ✅ FIX: Don't fallback to script - let edge function use visual_brief extraction
          visual_prompt: seg.visualDirection || '', // Empty = trigger visual brief extraction
          visual_direction: seg.visualDirection || '',
          script_text: seg.script, // ✅ CRITICAL: Script text for visual brief extraction (NOT as fallback prompt)
          character_description: isCreatorShot ? characterDescription : null,
          character_ref_png: isCreatorShot ? referenceImage : null,
          // Reference image for B-ROLL or CREATOR
          reference_image_url: isCreatorShot ? referenceImage : seg.referenceImageUrl,
          // NEW: Include creator face in B-ROLL (uses flux-kontext-multi)
          include_creator_face: !isCreatorShot ? (seg.includeCreatorFace || false) : false,
          // Pass creator ref for B-ROLL with include_creator_face
          creator_ref_for_broll: (!isCreatorShot && seg.includeCreatorFace) ? referenceImage : null
        };
      });
      
      const { data, error } = await supabase.functions.invoke('generate-images', {
        body: {
          mode: 'create_jobs',
          user_id: user.id,
          session_id: sessionId,
          segments: segmentsData,
          topic: currentTopic,
          style: 'cinematic',
          aspect_ratio: videoSettings?.aspectRatio || '9:16',
          provider: 'auto',
          character_description: characterDescription,
          character_ref_png: referenceImage,
          // Model selection for B-ROLL segments (CREATOR always uses nano-banana-edit)
          broll_model: IMAGE_MODELS.bRoll[imageModels.bRoll].edgeKey
        }
      });

      if (error) throw error;

      if (data?.data?.jobs) {
        setSegments(prev => {
          const updated = prev.map(seg => {
            const job = data.data.jobs.find((j: any) => j.segment_number === parseInt(seg.id));
            if (job) {
              return { ...seg, jobId: job.id, isGeneratingImage: true };
            }
            return seg;
          });
          return updated;
        });
      }

      startBackgroundProcessing(sessionId);

    } catch (err: any) {
      console.error('Error creating jobs:', err);
      setIsGeneratingAll(false);
      setIsBackgroundMode(false);
      setShowBackgroundToast(false);
    }
  };

  const handleRegenerateAll = async () => {
    if (!user || !sessionId) return;
    
    // Confirm before regenerating
    const confirmMsg = language === 'id' 
      ? `Regenerate semua ${segments.length} gambar? Gambar lama akan diganti.`
      : `Regenerate all ${segments.length} images? Existing images will be replaced.`;
    
    if (!window.confirm(confirmMsg)) return;

    // Clear all existing images first
    setSegments(prev => prev.map(seg => ({
      ...seg,
      imageUrl: null,
      imageError: null,
      isGeneratingImage: false,
      jobId: undefined
    })));

    // Delete existing jobs for this session
    try {
      await supabase
        .from('image_generation_jobs')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', user.id);
    } catch (err) {
      console.error('Error deleting old jobs:', err);
    }

    setIsGeneratingAll(true);
    setIsBackgroundMode(true);
    setShowBackgroundToast(true);
    setGenerationProgress({ current: 0, total: segments.length, completed: 0, failed: 0 });

    try {
      // Use character_ref_png if available, otherwise fallback to avatar_url
      const referenceImage = characterRefPng || userAvatarUrl || '';
      
      const segmentsData = segments.map((seg, index) => {
        const isCreatorShot = seg.shotType === 'CREATOR'; // Only shot_type matters
        return {
          segment_id: seg.segmentId,
          segment_number: index + 1,
          segment_type: seg.type,
          shot_type: seg.shotType,
          emotion: seg.emotion,
          // ✅ FIX: Don't fallback to script - let edge function use visual_brief extraction
          visual_prompt: seg.visualDirection || '', // Empty = trigger visual brief extraction
          visual_direction: seg.visualDirection || '',
          script_text: seg.script, // ✅ CRITICAL: Script text for visual brief extraction (NOT as fallback prompt)
          character_description: isCreatorShot ? characterDescription : null,
          character_ref_png: isCreatorShot ? referenceImage : null,
          // Reference image for B-ROLL
          reference_image_url: !isCreatorShot ? seg.referenceImageUrl : undefined,
          // NEW: Include creator face in B-ROLL (uses flux-kontext-multi)
          include_creator_face: !isCreatorShot ? (seg.includeCreatorFace || false) : false,
          // Pass creator ref for B-ROLL with include_creator_face
          creator_ref_for_broll: (!isCreatorShot && seg.includeCreatorFace) ? referenceImage : null
        };
      });

      const { data, error } = await supabase.functions.invoke('generate-images', {
        body: {
          mode: 'create_jobs',
          user_id: user.id,
          session_id: sessionId,
          segments: segmentsData,
          topic: currentTopic,
          style: 'cinematic',
          aspect_ratio: videoSettings?.aspectRatio || '9:16',
          provider: 'auto',
          character_description: characterDescription,
          character_ref_png: referenceImage,
          // Model selection for B-ROLL segments (CREATOR always uses nano-banana-edit)
          broll_model: IMAGE_MODELS.bRoll[imageModels.bRoll].edgeKey
        }
      });

      if (error) throw error;

      if (data?.data?.jobs) {
        setSegments(prev => {
          const updated = prev.map(seg => {
            const job = data.data.jobs.find((j: any) => j.segment_number === parseInt(seg.id));
            if (job) {
              return { ...seg, jobId: job.id, isGeneratingImage: true };
            }
            return seg;
          });
          return updated;
        });
      }

      startBackgroundProcessing(sessionId);

    } catch (err: any) {
      console.error('Error creating regenerate jobs:', err);
      setIsGeneratingAll(false);
      setIsBackgroundMode(false);
      setShowBackgroundToast(false);
    }
  };

  const handleGenerateImage = useCallback(async (segmentId: string): Promise<boolean> => {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) return false;

    setSegments(prev =>
      prev.map(seg =>
        seg.id === segmentId
          ? { ...seg, isGeneratingImage: true, imageError: null }
          : seg
      )
    );

    try {
      const avatarUrl = segment.creatorAvatarUrl || userAvatarUrl || null;
      // Only CREATOR shot_type needs face reference
      const isCreatorShot = segment.shotType === 'CREATOR';
      const referenceImage = isCreatorShot ? (characterRefPng || avatarUrl) : null;
      
      const requestBody = {
        segments: [{
          segment_number: parseInt(segmentId),
          // ✅ FIX: Don't fallback to script - let edge function use visual_brief extraction
          visual_prompt: segment.visualDirection || '', // Empty = trigger visual brief extraction
          visual_direction: segment.visualDirection || '',
          shot_type: segment.shotType,
          creator_avatar_url: avatarUrl,
          emotion: segment.emotion,
          segment_type: segment.type,
          script_text: segment.script, // ✅ CRITICAL: Script text for visual brief extraction (NOT as fallback prompt)
          character_description: isCreatorShot ? characterDescription : null,
          character_ref_png: referenceImage,
          // Reference image for B-ROLL
          reference_image_url: !isCreatorShot ? segment.referenceImageUrl : undefined,
          // NEW: Include creator face in B-ROLL (uses flux-kontext-multi)
          include_creator_face: !isCreatorShot ? (segment.includeCreatorFace || false) : false,
          // Pass creator ref for B-ROLL with include_creator_face
          creator_ref_for_broll: (!isCreatorShot && segment.includeCreatorFace) ? (characterRefPng || avatarUrl) : null
        }],
        style: 'cinematic',
        aspect_ratio: videoSettings?.aspectRatio || '9:16',
        provider: 'auto',
        character_ref_png: referenceImage,
        // Model selection for B-ROLL segments (CREATOR always uses nano-banana-edit)
        broll_model: IMAGE_MODELS.bRoll[imageModels.bRoll].edgeKey
      };
      
      const { data, error } = await supabase.functions.invoke('generate-images', {
        body: requestBody
      });

      if (error) throw error;

      const imageUrl = data?.data?.images?.[0]?.image_url;
      const imageError = data?.data?.images?.[0]?.error;
      
      // Update job record in database if exists (sync status)
      if (imageUrl && sessionId && user && segment.jobId) {
        try {
          await supabase
            .from('image_generation_jobs')
            .update({ 
              status: JOB_STATUS.COMPLETED,
              image_url: imageUrl,
              error_message: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', segment.jobId)
            .eq('user_id', user.id);
        } catch (dbErr) {
          console.error('Error updating job status:', dbErr);
        }
      } else if (imageUrl && sessionId && user) {
        // Try to find and update by segment_number if no jobId
        try {
          await supabase
            .from('image_generation_jobs')
            .update({ 
              status: JOB_STATUS.COMPLETED,
              image_url: imageUrl,
              error_message: null,
              updated_at: new Date().toISOString()
            })
            .eq('session_id', sessionId)
            .eq('segment_number', parseInt(segmentId))
            .eq('user_id', user.id);
        } catch (dbErr) {
          console.error('Error updating job status by segment:', dbErr);
        }
      }
      
      setSegments(prev => {
        const updated = prev.map(seg =>
          seg.id === segmentId
            ? { ...seg, imageUrl: imageUrl || null, isGeneratingImage: false, imageError: imageError || null }
            : seg
        );
        saveProgress(updated, currentTopic, videoSettings);
        return updated;
      });

      return !!imageUrl;
    } catch (err: any) {
      console.error('Error generating image:', err);
      setSegments(prev =>
        prev.map(seg =>
          seg.id === segmentId
            ? { ...seg, isGeneratingImage: false, imageError: err.message }
            : seg
        )
      );
      return false;
    }
  }, [segments, userAvatarUrl, characterDescription, characterRefPng, videoSettings, currentTopic, sessionId, user, imageModels]);

  const handleSelectImage = useCallback(async (imageId: string, segmentNumber: number) => {
    if (!user || !sessionId) return;

    try {
      // Update database: set is_selected=true for selected, false for others in same segment
      const { error } = await supabase
        .from('image_generation_jobs')
        .update({ is_selected: false })
        .eq('session_id', sessionId)
        .eq('segment_number', segmentNumber)
        .eq('user_id', user.id);

      if (error) throw error;

      // Now set the selected image to true
      const { error: selectError } = await supabase
        .from('image_generation_jobs')
        .update({ is_selected: true })
        .eq('id', imageId)
        .eq('user_id', user.id);

      if (selectError) throw selectError;

      // Update local state
      setSegments(prev => prev.map((seg, idx) => {
        if (idx + 1 !== segmentNumber) return seg;

        const updatedImages = seg.images.map(img => ({
          ...img,
          isSelected: img.id === imageId
        }));

        const selectedImage = updatedImages.find(img => img.isSelected);

        return {
          ...seg,
          images: updatedImages,
          imageUrl: selectedImage?.imageUrl || null
        };
      }));

    } catch (err) {
      console.error('Failed to select image:', err);
    }
  }, [user, sessionId]);

  // Delete image from gallery
  const handleDeleteImage = useCallback(async (imageId: string) => {
    if (!user || !sessionId) return;

    // Confirm deletion
    const confirmMsg = language === 'id'
      ? 'Hapus gambar ini?'
      : 'Delete this image?';
    if (!window.confirm(confirmMsg)) return;

    try {
      // Delete from database
      const { error } = await supabase
        .from('image_generation_jobs')
        .delete()
        .eq('id', imageId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state - remove the image
      setSegments(prev => prev.map(seg => {
        const updatedImages = seg.images.filter(img => img.id !== imageId);
        const wasSelected = seg.images.find(img => img.id === imageId)?.isSelected;

        // If deleted image was selected, select the first remaining
        let newSelectedImage = updatedImages.find(img => img.isSelected);
        if (wasSelected && updatedImages.length > 0 && !newSelectedImage) {
          updatedImages[0].isSelected = true;
          newSelectedImage = updatedImages[0];
        }

        return {
          ...seg,
          images: updatedImages,
          imageUrl: newSelectedImage?.imageUrl || null
        };
      }));

    } catch (err) {
      console.error('Failed to delete image:', err);
      alert(language === 'id' ? 'Gagal menghapus gambar' : 'Failed to delete image');
    }
  }, [user, sessionId, language]);

  const handleRegenerateWithNotes = useCallback(async (notes: string) => {
    if (!user || !sessionId || !regenerateModal.segment) return;

    const segment = regenerateModal.segment;
    const segmentNumber = parseInt(segment.id);

    // Max 3 images validation
    const currentImageCount = segment.images?.length || 0;
    if (currentImageCount >= 3) {
      alert(language === 'id' 
        ? 'Maksimal 3 gambar per segment. Hapus gambar lama dulu.'
        : 'Maximum 3 images per segment. Delete old images first.');
      return;
    }

    try {
      // Get max generation number for this segment
      const maxGenNumber = Math.max(...segment.images.map(img => img.generationNumber), 0);

      // Determine if CREATOR shot and prepare reference images
      const isCreatorShot = segment.shotType === 'CREATOR';
      const creatorRef = characterRefPng || userAvatarUrl || null;

      // Build request body with ALL relevant fields for comprehensive prompt synthesis
      const requestBody: Record<string, any> = {
        mode: 'regenerate_single',
        user_id: user.id,
        session_id: sessionId,
        segment_number: segmentNumber,
        generation_number: maxGenNumber + 1,
        regeneration_notes: notes,  // ✅ Notes untuk prompt synthesis
        visual_prompt: segment.visualDirection,
        script_text: segment.script,
        segment_type: segment.type,
        shot_type: segment.shotType,
        emotion: segment.emotion,
        aspect_ratio: videoSettings?.aspectRatio || '9:16',
      };

      // Add CREATOR-specific fields
      if (isCreatorShot) {
        requestBody.character_description = characterDescription;
        requestBody.character_ref_png = creatorRef;
      } else {
        // B-ROLL fields
        requestBody.reference_image_url = segment.referenceImageUrl || null;
        requestBody.include_creator_face = segment.includeCreatorFace || false;
        requestBody.creator_ref_for_broll = segment.includeCreatorFace ? creatorRef : null;
      }

      console.log('[Regenerate] Request:', {
        isCreator: isCreatorShot,
        hasNotes: !!notes,
        hasRef: !!(isCreatorShot ? creatorRef : segment.referenceImageUrl),
        includeCreatorFace: segment.includeCreatorFace,
      });

      // Call Edge Function to create new regeneration job
      const { data, error } = await supabase.functions.invoke('generate-images', {
        body: requestBody
      });

      if (error) throw error;

      console.log('Regeneration job created:', data);

      // Start background processing to poll for the new image
      startBackgroundProcessing(sessionId);

      // Close modal
      setRegenerateModal({ isOpen: false, segment: null });

    } catch (err) {
      console.error('Regenerate failed:', err);
      alert('Failed to regenerate image. Please try again.');
    }
  }, [user, sessionId, regenerateModal.segment, videoSettings, startBackgroundProcessing]);

  // Handle reference image selection for B-ROLL segments
  const handleReferenceImageSelect = useCallback((imageUrl: string, source: 'unsplash' | 'pexels' | 'upload') => {
    if (!referenceImageModal.segment) return;
    
    setSegments(prev => prev.map(seg => 
      seg.id === referenceImageModal.segment!.id 
        ? { ...seg, referenceImageUrl: imageUrl, referenceImageSource: source }
        : seg
    ));
    
    setReferenceImageModal({ isOpen: false, segment: null, initialKeywords: '' });
  }, [referenceImageModal.segment]);

  // Handle B-ROLL modal generation
  const handleBRollGenerate = useCallback(async (options: {
    additionalNotes: string;
    includeCreatorFace: boolean;
    referenceImages: { url: string; source: 'unsplash' | 'pexels' | 'upload'; photographer?: string }[];
  }) => {
    if (!user || !sessionId || !bRollModal.segment) return;

    const segment = bRollModal.segment;
    const segmentNumber = parseInt(segment.id);
    const isFirstGeneration = !segment.images || segment.images.length === 0;

    // Max 3 images validation
    const currentImageCount = segment.images?.length || 0;
    if (currentImageCount >= 3) {
      alert(language === 'id' 
        ? 'Maksimal 3 gambar per segment. Hapus gambar lama dulu.'
        : 'Maximum 3 images per segment. Delete old images first.');
      return;
    }

    // Close modal immediately
    setBRollModal({ isOpen: false, segment: null });

    // Update segment state to show loading
    setSegments(prev => prev.map(seg =>
      seg.id === segment.id
        ? { 
            ...seg, 
            isGeneratingImage: true, 
            imageError: null,
            includeCreatorFace: options.includeCreatorFace,
            // Store first reference image for backward compatibility
            referenceImageUrl: options.referenceImages[0]?.url || seg.referenceImageUrl,
            referenceImageSource: options.referenceImages[0]?.source || seg.referenceImageSource
          }
        : seg
    ));

    try {
      const creatorRef = characterRefPng || userAvatarUrl || null;
      const maxGenNumber = Math.max(...(segment.images?.map(img => img.generationNumber) || []), 0);

      // Build request body
      const requestBody: Record<string, any> = {
        mode: isFirstGeneration ? 'create_jobs' : 'regenerate_single',
        user_id: user.id,
        session_id: sessionId,
        segment_number: segmentNumber,
        generation_number: maxGenNumber + 1,
        regeneration_notes: options.additionalNotes || '',
        visual_prompt: segment.visualDirection || '',
        visual_direction: segment.visualDirection || '',
        script_text: segment.script,
        segment_type: segment.type,
        shot_type: segment.shotType,
        emotion: segment.emotion,
        aspect_ratio: videoSettings?.aspectRatio || '9:16',
        // B-ROLL specific
        include_creator_face: options.includeCreatorFace,
        creator_ref_for_broll: options.includeCreatorFace ? creatorRef : null,
        // Reference images (use first one for now, multi-ref support coming)
        reference_image_url: options.referenceImages[0]?.url || null,
        // For create_jobs mode
        segments: isFirstGeneration ? [{
          segment_id: segment.segmentId,
          segment_number: segmentNumber,
          segment_type: segment.type,
          shot_type: segment.shotType,
          emotion: segment.emotion,
          visual_prompt: segment.visualDirection || '',
          visual_direction: segment.visualDirection || '',
          script_text: segment.script,
          reference_image_url: options.referenceImages[0]?.url || null,
          include_creator_face: options.includeCreatorFace,
          creator_ref_for_broll: options.includeCreatorFace ? creatorRef : null,
        }] : undefined,
        broll_model: IMAGE_MODELS.bRoll[imageModels.bRoll].edgeKey
      };

      console.log('[BRollGenerate] Request:', {
        isFirst: isFirstGeneration,
        hasNotes: !!options.additionalNotes,
        refCount: options.referenceImages.length,
        includeCreatorFace: options.includeCreatorFace,
      });

      const { data, error } = await supabase.functions.invoke('generate-images', {
        body: requestBody
      });

      if (error) throw error;

      console.log('B-ROLL job created:', data);

      // Update jobId if returned
      if (data?.data?.jobs?.[0]?.id || data?.data?.job?.id) {
        const jobId = data?.data?.jobs?.[0]?.id || data?.data?.job?.id;
        setSegments(prev => prev.map(seg =>
          seg.id === segment.id ? { ...seg, jobId } : seg
        ));
      }

      // Start background processing
      startBackgroundProcessing(sessionId);

    } catch (err) {
      console.error('B-ROLL generate failed:', err);
      setSegments(prev => prev.map(seg =>
        seg.id === segment.id
          ? { ...seg, isGeneratingImage: false, imageError: 'Generation failed' }
          : seg
      ));
      alert(language === 'id' ? 'Gagal generate gambar' : 'Failed to generate image');
    }
  }, [user, sessionId, bRollModal.segment, videoSettings, characterRefPng, userAvatarUrl, imageModels, startBackgroundProcessing, language]);

  const handlePrevious = () => {
    saveProgress(segments, currentTopic, videoSettings);
    
    if (fromScriptLab) {
      navigate("/script-lab");
    } else {
      navigate("/topic-selection", { state: { returning: true } });
    }
  };

  const handleNext = () => {
    const allHaveImages = segments.every(seg => seg.imageUrl);
    if (!allHaveImages) {
      alert(uiText.imagesRequired);
      return;
    }

    navigate("/video-generation", {
      state: {
        sessionId,
        segments,
        topic: currentTopic,
        videoSettings
      }
    });
  };

  const totalDuration = segments.reduce((sum, seg) => sum + seg.durationSeconds, 0);
  const allHaveImages = segments.every(seg => seg.imageUrl);
  const imagesGenerated = segments.filter(s => s.imageUrl).length;

  // Download helper function
  const handleDownloadImage = async (imageUrl: string, segmentType: string, segmentId: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Detect actual content type and set correct extension
      const contentType = blob.type || response.headers.get('content-type') || '';
      let extension = 'png'; // default
      
      if (contentType.includes('jpeg') || contentType.includes('jpg')) {
        extension = 'jpg';
      } else if (contentType.includes('png')) {
        extension = 'png';
      } else if (contentType.includes('webp')) {
        extension = 'webp';
      } else if (contentType.includes('gif')) {
        extension = 'gif';
      } else if (contentType.includes('mp4') || contentType.includes('video')) {
        // This is a video, not an image - warn user
        console.warn('URL contains video, not image:', imageUrl);
        extension = 'mp4';
      }
      
      // Also check URL extension as fallback
      const urlLower = imageUrl.toLowerCase();
      if (urlLower.includes('.mp4') || urlLower.includes('video')) {
        console.warn('URL appears to be video:', imageUrl);
        extension = 'mp4';
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentTopic.replace(/[^a-z0-9]/gi, '_').substring(0, 30)}_${segmentType}_${segmentId}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback: open in new tab
      window.open(imageUrl, '_blank');
    }
  };

  const groupedSegments = segments.reduce((acc, segment, index) => {
    const baseType = segment.type.replace(/-\d+$/, '').replace(/_\d+$/, '');
    const isBody = baseType === 'BODY' || segment.type.startsWith('BODY');
    
    if (isBody) {
      const lastGroup = acc[acc.length - 1];
      if (lastGroup && lastGroup.isBodyGroup) {
        lastGroup.segments.push({ ...segment, originalIndex: index });
      } else {
        acc.push({ isBodyGroup: true, segments: [{ ...segment, originalIndex: index }] });
      }
    } else {
      acc.push({ isBodyGroup: false, segments: [{ ...segment, originalIndex: index }] });
    }
    return acc;
  }, [] as { isBodyGroup: boolean; segments: (Segment & { originalIndex: number })[] }[]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-text-secondary">{uiText.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Background Processing Toast */}
        {showBackgroundToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
            <div className="bg-gradient-to-r from-primary/90 to-accent-pink/90 backdrop-blur-lg rounded-xl p-4 shadow-2xl border border-white/10">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Cloud className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-white font-semibold text-sm">
                      {language === 'id' ? 'Proses di Background' : 'Background Processing'}
                    </h4>
                    <button 
                      onClick={() => setShowBackgroundToast(false)}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      <X className="w-4 h-4 text-white/60" />
                    </button>
                  </div>
                  <p className="text-white/80 text-xs leading-relaxed mb-3">
                    {uiText.backgroundProcessing}
                  </p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-white/60">
                      <span>{generationProgress.completed}/{generationProgress.total} complete</span>
                      {generationProgress.failed > 0 && (
                        <span className="text-red-300">{generationProgress.failed} failed</span>
                      )}
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

        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <div className="flex gap-2 mb-6 max-w-md mx-auto">
            {[1, 2, 3, 4, 5, 6, 7].map((step) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  step <= 5 ? "bg-primary" : "bg-surface"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Title & Generate All Button */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-1 line-clamp-2">
                {currentTopic}
              </h1>
              <p className="text-text-muted text-sm">
                {uiText.step} 5/7 • {uiText.duration}: {totalDuration}s 
                {videoSettings && ` • ${videoSettings.aspectRatio}`}
              </p>
            </div>
            
            {/* Generate All Images Button + Model Dropdown */}
            <div className="flex gap-2">
              {/* Model Selection Dropdown */}
              <div className="relative">
                <Button
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  variant="outline"
                  className="h-12 px-4 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">Models</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
                </Button>
                
                {showModelDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border-default rounded-xl shadow-lg z-50 p-4">
                    <h4 className="text-sm font-semibold text-text-primary mb-3">Image Model Selection</h4>
                    
                    {/* A-ROLL Model */}
                    <div className="mb-3">
                      <label className="text-xs text-text-muted mb-1 block">A-ROLL (HOOK, CTA)</label>
                      <select
                        value={imageModels.aRoll}
                        onChange={(e) => setImageModels(prev => ({ ...prev, aRoll: e.target.value as any }))}
                        className="w-full bg-surface border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary"
                      >
                        {Object.entries(IMAGE_MODELS.aRoll).map(([key, model]) => (
                          <option key={key} value={key}>{model.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* B-ROLL Model */}
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">B-ROLL (FORE, BODY, PEAK)</label>
                      <select
                        value={imageModels.bRoll}
                        onChange={(e) => setImageModels(prev => ({ ...prev, bRoll: e.target.value as any }))}
                        className="w-full bg-surface border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary"
                      >
                        {Object.entries(IMAGE_MODELS.bRoll).map(([key, model]) => (
                          <option key={key} value={key}>{model.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <p className="text-xs text-text-muted mt-3">Selected models apply to new generations</p>
                  </div>
                )}
              </div>
              
              <Button
                onClick={allHaveImages ? handleRegenerateAll : handleGenerateAllBackground}
                disabled={isGeneratingAll || isBackgroundMode}
                className={`h-12 px-6 font-medium flex items-center gap-2 ${
                  isBackgroundMode
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gradient-to-r from-primary to-accent-pink hover:opacity-90"
                } text-white`}
              >
                {isBackgroundMode ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{generationProgress.completed}/{generationProgress.total}</span>
                  </>
                ) : allHaveImages ? (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    <span>{language === 'id' ? 'Regenerate Semua' : 'Regenerate All'} ({segments.length})</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>{uiText.generateAll} ({segments.length - imagesGenerated})</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Segments */}
        <div className="space-y-4">
          {groupedSegments.map((group, groupIndex) => (
            <div 
              key={groupIndex}
              className={group.isBodyGroup && group.segments.length > 1 
                ? "bg-surface border border-border-default rounded-2xl p-3 space-y-3" 
                : ""
              }
            >
              {group.isBodyGroup && group.segments.length > 1 && (
                <div className="flex items-center gap-2 px-2 pb-2 border-b border-border-default">
                  <span className="text-blue-500 dark:text-blue-400 text-sm font-medium">BODY</span>
                  <span className="text-text-muted text-xs">
                    ({group.segments.length} {language === 'id' ? 'segmen' : 'segments'})
                  </span>
                </div>
              )}
              
              {group.segments.map((segment, segIndex) => {
                const displayIndex = segment.originalIndex + 1;
                const isCreatorShot = segment.shotType === 'CREATOR';
                
                return (
                  <div 
                    key={segment.id} 
                    className={`bg-card border rounded-xl shadow-theme ${
                      segment.imageUrl ? 'border-green-500/30' : 'border-border-default'
                    }`}
                  >
                    {/* Segment Header */}
                    <div className="p-3 sm:p-4 border-b border-border-default">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className={`w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold ${
                            segment.imageUrl ? 'bg-green-600' : 'bg-primary'
                          }`}>
                            {segment.imageUrl ? <CheckCircle2 className="w-4 h-4" /> : displayIndex}
                          </div>
                          <span className="text-text-primary font-semibold text-sm sm:text-base">
                            {group.isBodyGroup && group.segments.length > 1 
                              ? `BODY-${segIndex + 1}` 
                              : segment.type
                            }
                          </span>
                          <span className="text-text-muted text-xs sm:text-sm">{segment.timing}</span>
                          <span
                            className="text-text-muted text-xs"
                            title={videoSettings ? getDurationExplanation(segment.type, videoSettings.duration) : ''}
                          >
                            ({segment.durationSeconds}s)
                          </span>
                        </div>
                        
                        {/* Tags */}
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            isCreatorShot 
                              ? 'bg-pink-500/20 text-pink-600 dark:text-pink-400' 
                              : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                          }`}>
                            {segment.shotType}
                          </span>
                          {segment.emotion && (
                            <span className="text-primary text-xs bg-primary/10 px-2 py-1 rounded hidden sm:inline">
                              {segment.emotion}
                            </span>
                          )}
                          {segment.transition && (
                            <span className="text-amber-600 dark:text-amber-400 text-xs bg-amber-500/10 px-2 py-1 rounded hidden sm:inline">
                              {segment.transition}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Script + Visual Direction */}
                        <div className="flex-1 space-y-3">
                          {/* Script */}
                          <div>
                            <label className="text-text-secondary text-xs mb-1.5 block">{uiText.script}</label>
                            <div className="bg-surface border border-border-default rounded-lg p-3 text-text-primary text-sm min-h-[80px]">
                              {segment.script}
                            </div>
                          </div>

                          {/* Visual Direction - smaller height when no image */}
                          {segment.visualDirection && (
                            <div>
                              <label className="text-text-secondary text-xs mb-1.5 block">{uiText.visualDirection}</label>
                              <div className={`bg-surface border border-border-default rounded-lg p-3 text-text-secondary text-xs overflow-y-auto ${
                                segment.imageUrl ? 'min-h-[190px] max-h-72' : 'min-h-[100px] max-h-40'
                              }`}>
                                {segment.visualDirection}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Visual Preview */}
                        <div className="w-full sm:w-44 flex-shrink-0">
                          <label className="text-text-secondary text-xs mb-1.5 block">
                            {uiText.visualPreview}
                            {isCreatorShot && (
                              <span className="text-pink-600 dark:text-pink-400 ml-1">({uiText.creatorShot})</span>
                            )}
                          </label>
                          {/* NEW: VisualPreviewGallery with WOW effects */}
                          <VisualPreviewGallery
                            images={segment.images || []}
                            segmentId={segment.id}
                            segmentType={segment.type}
                            isCreatorShot={isCreatorShot}
                            isGenerating={segment.isGeneratingImage}
                            imageError={segment.imageError || null}
                            selectedImageUrl={segment.imageUrl}
                            onGenerate={() => {
                              // CREATOR: Generate langsung, B-ROLL: Buka modal
                              if (isCreatorShot) {
                                handleGenerateImage(segment.id);
                              } else {
                                setBRollModal({ isOpen: true, segment });
                              }
                            }}
                            onRegenerate={() => {
                              // CREATOR: Regenerate modal, B-ROLL: Buka B-ROLL modal
                              if (isCreatorShot) {
                                setRegenerateModal({ isOpen: true, segment });
                              } else {
                                setBRollModal({ isOpen: true, segment });
                              }
                            }}
                            onSelectImage={(imageId) => handleSelectImage(imageId, parseInt(segment.id))}
                            onDeleteImage={handleDeleteImage}
                            onPreview={setPreviewImage}
                            onDownload={(imageUrl) => handleDownloadImage(imageUrl, segment.type, segment.id)}
                            disabled={isBackgroundMode || isGeneratingAll}
                            language={language}
                          />

                          {/* B-ROLL Status Badges Only (no duplicate button - generation via VisualPreviewGallery) */}
                          {!isCreatorShot && (segment.includeCreatorFace || segment.referenceImageUrl) && (
                            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                              {segment.includeCreatorFace && (
                                <span className="text-[10px] text-pink-500 bg-pink-500/10 px-1.5 py-0.5 rounded">
                                  + Face
                                </span>
                              )}
                              {segment.referenceImageUrl && (
                                <span className="text-[10px] text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                  + Ref
                                </span>
                              )}
                            </div>
                          )}


                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button
            onClick={handlePrevious}
            variant="outline"
            className="border-border-default text-text-primary hover:bg-surface h-12 px-6 sm:px-8 font-medium"
          >
            {uiText.previous}
          </Button>
          <Button
            onClick={handleNext}
            disabled={!allHaveImages}
            className={`h-12 px-6 sm:px-8 font-medium transition-all ${
              allHaveImages
                ? "bg-primary hover:bg-primary-hover text-white"
                : "bg-primary/50 text-white/50 cursor-not-allowed"
            }`}
          >
            {allHaveImages ? uiText.next : `${imagesGenerated}/${segments.length} images`}
          </Button>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 sm:p-8"
          onClick={() => setPreviewImage(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (previewImage) handleDownloadImage(previewImage, 'preview', Date.now().toString());
              }}
              className="p-2 bg-green-600 hover:bg-green-700 rounded-full transition-colors"
              title="Download"
            >
              <Download className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={() => setPreviewImage(null)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Regenerate Modal */}
      <RegenerateModal
        isOpen={regenerateModal.isOpen}
        onClose={() => setRegenerateModal({ isOpen: false, segment: null })}
        segment={regenerateModal.segment}
        onRegenerate={handleRegenerateWithNotes}
      />

      {/* Reference Image Modal for B-ROLL */}
      <ReferenceImageModal
        isOpen={referenceImageModal.isOpen}
        onClose={() => setReferenceImageModal({ isOpen: false, segment: null })}
        segment={referenceImageModal.segment}
        initialKeywords=""  // Not used anymore - smart extraction in backend
        onSelect={handleReferenceImageSelect}
      />

      {/* B-ROLL Generation Modal - Consolidated Controls */}
      <GenerateBRollModal
        isOpen={bRollModal.isOpen}
        onClose={() => setBRollModal({ isOpen: false, segment: null })}
        segment={bRollModal.segment}
        onGenerate={handleBRollGenerate}
        language={language}
        maxReferenceImages={3}
        hasCreatorAvatar={!!(characterRefPng || userAvatarUrl)}  // NEW: Show warning if no avatar
      />
    </div>
  );
};
