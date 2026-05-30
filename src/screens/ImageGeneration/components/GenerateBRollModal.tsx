import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '../../../components/ui/button';
import { supabase } from '../../../lib/supabase';
import {
  X, Loader2, Search, Upload, Camera, Sparkles, User, Trash2, CheckCircle2, ChevronDown
} from 'lucide-react';
import { LayoutIcon } from './LayoutPopover';

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
  imageUrl?: string | null;  // Current selected image for this segment
  images?: { imageUrl: string }[];  // All images for this segment
}

interface AvatarOption {
  id: string;
  name: string;
  url: string;
  source: 'profile' | 'saved' | 'session';
}

type LayoutType = 'full' | 'split-60-40' | 'split-50-50' | 'pip' | 'creator-center';

const LAYOUT_OPTIONS: { value: LayoutType; label: string }[] = [
  { value: 'full', label: 'Full' },
  { value: 'split-60-40', label: 'Split 60/40' },
  { value: 'split-50-50', label: 'Split 50/50' },
  { value: 'pip', label: 'PiP' },
  { value: 'creator-center', label: 'Center' },
];

interface GenerateBRollModalProps {
  isOpen: boolean;
  onClose: () => void;
  segment: SegmentForModal | null;
  onApplyOptions: (options: BRollOptions) => void;
  language?: string;
  topic?: string;
  maxReferenceImages?: number;
  initialLayout?: LayoutType;
  // Avatar-related props
  availableAvatars?: AvatarOption[];
  sessionAvatarUrl?: string | null;
  profileAvatarUrl?: string | null;
  onAvatarSelect?: (avatarUrl: string) => void;
}

export interface BRollOptions {
  additionalNotes: string;
  includeCreatorFace: boolean;
  referenceImages: SelectedReference[];
  selectedAvatarUrl?: string;
  layout: LayoutType;
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
  onApplyOptions,
  language = 'en',
  topic = '',
  maxReferenceImages = 3,
  initialLayout = 'full',
  availableAvatars = [],
  sessionAvatarUrl = null,
  profileAvatarUrl = null,
  onAvatarSelect,
}) => {
  // Form state
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [includeCreatorFace, setIncludeCreatorFace] = useState(false);
  const [selectedReferences, setSelectedReferences] = useState<SelectedReference[]>([]);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState<LayoutType>(initialLayout);

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
  const avatarPickerRef = useRef<HTMLDivElement>(null);

  // Determine if we have any avatar available
  const hasAnyAvatar = !!(sessionAvatarUrl || profileAvatarUrl || availableAvatars.length > 0);

  // Get current avatar URL (prioritize session > selected > profile)
  const currentAvatarUrl = selectedAvatarUrl || sessionAvatarUrl || profileAvatarUrl;

  // UI Text
  const uiText = {
    additionalNotes: language === 'id' ? 'Catatan Tambahan (opsional)' : 'Additional Notes (optional)',
    notesPlaceholder: language === 'id'
      ? 'Contoh: Pencahayaan lebih dramatis, golden hour, lebih modern...'
      : 'e.g., More dramatic lighting, golden hour, more modern...',
    includeCreatorFace: language === 'id' ? 'Sertakan Wajah Creator' : 'Include Creator Face',
    includeCreatorFaceHint: language === 'id'
      ? 'Akan menampilkan avatar kamu di image'
      : 'Will include your avatar in the image',
    noAvatarWarning: language === 'id'
      ? '⚠️ Upload avatar di Settings terlebih dahulu'
      : '⚠️ Upload avatar in Settings first',
    selectAvatar: language === 'id' ? 'Pilih Avatar' : 'Select Avatar',
    sessionAvatar: language === 'id' ? 'Avatar Script Ini' : 'Current Script Avatar',
    profileAvatar: language === 'id' ? 'Avatar Profil' : 'Profile Avatar',
    savedAvatar: language === 'id' ? 'Avatar Tersimpan' : 'Saved Avatar',
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
    applyOptions: language === 'id' ? 'Terapkan Opsi' : 'Apply Options',
    layout: language === 'id' ? 'Layout Creator' : 'Creator Layout',
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
      // Reset form
      setAdditionalNotes('');
      setIncludeCreatorFace(segment.includeCreatorFace || false);
      setSelectedReferences([]);
      setSearchQuery('');
      setSearchResults([]);
      setSearchError(null);
      setPasteUrl('');
      setSmartSuggestions([]);
      setShowAvatarPicker(false);
      setSelectedLayout(initialLayout);
      // Default to session avatar if available
      setSelectedAvatarUrl(sessionAvatarUrl || profileAvatarUrl || null);

      // Extract keywords via LLM
      extractKeywordsAndSearch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, segment?.id, sessionAvatarUrl, profileAvatarUrl]);

  // Close avatar picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (avatarPickerRef.current && !avatarPickerRef.current.contains(event.target as Node)) {
        setShowAvatarPicker(false);
      }
    };

    if (showAvatarPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAvatarPicker]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  // Extract keywords from script using LLM (focus on script only, not visual direction)
  const extractKeywordsAndSearch = async () => {
    if (!segment) return;

    setIsExtractingKeywords(true);

    // Use script only for keyword extraction - visual direction can be confusing
    const scriptText = segment.script || '';

    try {
      const { data, error } = await supabase.functions.invoke('search-stock-images', {
        body: {
          visualDirection: '', // Don't use visual direction
          script: scriptText,
          topic: topic || '',
          enableSmartExtraction: true,
          orientation: 'portrait',
          per_page: 20,
          provider: 'both'
        }
      });

      setIsExtractingKeywords(false);

      if (error) throw error;

      if (data?.success && data?.data?.smartExtraction?.suggestedQueries?.length > 0) {
        let suggestions = data.data.smartExtraction.suggestedQueries as string[];

        // Extract emphasized words from script (e.g., **Xiaomi**)
        const emphasizedWords = extractEmphasizedWords(scriptText);
        if (emphasizedWords.length > 0) {
          // Add emphasized words to front of suggestions
          suggestions = [...emphasizedWords, ...suggestions.filter(s => !emphasizedWords.includes(s.toLowerCase()))];
        }

        const bestQuery = suggestions[0] || data.data.query || '';

        setSearchQuery(bestQuery);
        setSmartSuggestions(suggestions.slice(0, 5));

        // Auto-search with best query
        if (bestQuery) {
          setTimeout(() => handleSearch(bestQuery), 100);
        }
      } else {
        // Fallback to frontend extraction (script only)
        const fallbackSuggestions = extractKeywordsFromScript(scriptText);
        setSmartSuggestions(fallbackSuggestions);

        if (fallbackSuggestions.length > 0) {
          setSearchQuery(fallbackSuggestions[0]);
          setTimeout(() => handleSearch(fallbackSuggestions[0]), 100);
        }
      }
    } catch (err) {
      setIsExtractingKeywords(false);
      console.error('Keyword extraction error:', err);

      // Fallback (script only)
      const fallbackSuggestions = extractKeywordsFromScript(scriptText);
      setSmartSuggestions(fallbackSuggestions);

      if (fallbackSuggestions.length > 0) {
        setSearchQuery(fallbackSuggestions[0]);
        setTimeout(() => handleSearch(fallbackSuggestions[0]), 100);
      }
    }
  };

  // Extract emphasized words from script (e.g., **Xiaomi** -> "Xiaomi")
  const extractEmphasizedWords = (script: string): string[] => {
    const emphasisRegex = /\*\*([^*]+)\*\*/g;
    const matches: string[] = [];
    let match;

    while ((match = emphasisRegex.exec(script)) !== null) {
      const word = match[1].trim();
      if (word.length > 2) {
        matches.push(word);
      }
    }

    return matches;
  };

  // Simple keyword extraction from script text
  const extractKeywordsFromScript = (script: string): string[] => {
    if (!script) return ['modern', 'technology'];

    const suggestions: string[] = [];

    // HIGHEST PRIORITY: detect capitalized brand/product name at start of sentence
    // Catches "Notion AI. Otomatis...", "Miro. Tool kolaborasi...", "Codium AI bisa..."
    const capsStartMatch = script.match(/^([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*)\./);
    if (capsStartMatch && capsStartMatch[1].split(' ').length <= 3) {
      const brandAtStart = capsStartMatch[1];
      const isGenericWord = /^(The|A|An|This|That|These|Those|It|He|She|They|We|You|I)$/.test(brandAtStart);
      if (!isGenericWord) {
        suggestions.unshift(brandAtStart);
      }
    }

    // Second priority: extract emphasized words (e.g., **Notion AI**)
    const emphasizedWords = extractEmphasizedWords(script);
    for (const word of emphasizedWords) {
      if (!suggestions.includes(word)) suggestions.push(word);
    }

    const lowerScript = script.toLowerCase();

    // Brand keywords (map to relevant imagery) - SaaS + hardware
    const brandKeywords: Record<string, string[]> = {
      // Hardware brands
      'xiaomi': ['Xiaomi', 'Xiaomi smartphone', 'smart device'],
      'samsung': ['Samsung', 'Samsung phone', 'electronics'],
      'apple': ['Apple', 'iPhone', 'minimalist technology'],
      'google': ['Google', 'tech company', 'innovation'],
      'microsoft': ['Microsoft', 'software', 'enterprise tech'],
      'tesla': ['Tesla', 'electric car', 'innovation'],
      'amazon': ['Amazon', 'ecommerce', 'delivery'],
      'netflix': ['Netflix', 'streaming', 'entertainment'],
      'spotify': ['Spotify', 'music streaming', 'audio'],
      'tiktok': ['TikTok', 'social media', 'content creator'],
      'instagram': ['Instagram', 'social media', 'photography'],
      'youtube': ['YouTube', 'video', 'content creator'],
      'huawei': ['Huawei', 'Huawei phone', 'smartphone'],
      'oppo': ['OPPO', 'OPPO phone', 'smartphone'],
      'vivo': ['Vivo', 'Vivo phone', 'smartphone'],
      // SaaS / Productivity
      'notion ai': ['Notion AI', 'Notion AI workspace'],
      'notion': ['Notion', 'Notion workspace app'],
      'miro': ['Miro', 'Miro collaboration whiteboard'],
      'figma': ['Figma', 'Figma design tool'],
      'canva': ['Canva', 'Canva design'],
      'loom': ['Loom', 'Loom screen recording'],
      'clickup': ['ClickUp', 'ClickUp project management'],
      'trello': ['Trello', 'Trello kanban'],
      'asana': ['Asana', 'Asana project management'],
      'linear': ['Linear', 'Linear issue tracker'],
      'slack': ['Slack', 'Slack team communication'],
      'webflow': ['Webflow', 'Webflow website builder'],
      'shopify': ['Shopify', 'Shopify ecommerce'],
      'airtable': ['Airtable', 'Airtable spreadsheet'],
      'hubspot': ['HubSpot', 'HubSpot CRM'],
      // AI Tools
      'codium ai': ['Codium AI', 'AI code editor'],
      'codium': ['Codium AI', 'AI coding assistant'],
      'codeium': ['Codeium', 'AI code completion'],
      'cursor ai': ['Cursor AI', 'AI code editor'],
      'cursor': ['Cursor', 'AI code editor'],
      'chatgpt': ['ChatGPT', 'ChatGPT AI interface'],
      'copilot': ['GitHub Copilot', 'AI coding'],
      'gemini': ['Google Gemini', 'Google AI'],
      'perplexity': ['Perplexity AI', 'AI search'],
      'midjourney': ['Midjourney', 'AI art'],
      'runway': ['Runway AI', 'AI video'],
      'elevenlabs': ['ElevenLabs', 'AI voice'],
    };

    // Tech & cybersecurity keywords (lower priority than brands)
    const techKeywords: Record<string, string[]> = {
      'keamanan siber': ['cybersecurity', 'hacker', 'security'],
      'cybersecurity': ['cybersecurity', 'hacker', 'network security'],
      'cyber': ['cybersecurity', 'digital security'],
      'siber': ['cybersecurity', 'hacker'],
      'hacker': ['hacker', 'cybersecurity', 'code'],
      'security': ['security', 'protection', 'shield'],
      'data': ['data center', 'server', 'database'],
      'cloud': ['cloud computing', 'server room', 'data center'],
      'machine learning': ['AI technology', 'neural network'],
      'blockchain': ['blockchain', 'cryptocurrency', 'digital'],
      'iot': ['smart device', 'connected devices', 'technology'],
      'software': ['coding', 'programming', 'developer'],
      'aplikasi': ['mobile app', 'software', 'technology'],
      'digital': ['digital', 'technology', 'modern'],
      'teknologi': ['technology', 'innovation', 'modern'],
      'technology': ['technology', 'innovation', 'futuristic'],
      // 'ai' only matches if NOT preceded by a brand name (handled by caps detection above)
    };

    // Industry keywords
    const industryKeywords: Record<string, string[]> = {
      'finance': ['finance', 'banking', 'money'],
      'keuangan': ['finance', 'banking', 'investment'],
      'health': ['healthcare', 'medical', 'hospital'],
      'kesehatan': ['healthcare', 'medical', 'wellness'],
      'education': ['education', 'learning', 'classroom'],
      'pendidikan': ['education', 'school', 'learning'],
      'retail': ['shopping', 'store', 'retail'],
      'travel': ['travel', 'vacation', 'destination'],
      'food': ['food', 'restaurant', 'cuisine'],
      'makanan': ['food', 'cooking', 'restaurant'],
      'fashion': ['fashion', 'clothing', 'style'],
      'gaming': ['gaming', 'esports', 'video game'],
      'music': ['music', 'concert', 'musician'],
      'sport': ['sports', 'athlete', 'fitness'],
      'olahraga': ['sports', 'fitness', 'athlete'],
    };

    // Check brand keywords FIRST (higher priority) — sort by key length desc so "notion ai" matches before "notion"
    const brandEntries = Object.entries(brandKeywords).sort((a, b) => b[0].length - a[0].length);
    for (const [key, values] of brandEntries) {
      if (lowerScript.includes(key)) {
        for (const v of values) {
          if (!suggestions.includes(v)) suggestions.push(v);
        }
      }
    }

    // Check tech keywords
    for (const [key, values] of Object.entries(techKeywords)) {
      if (lowerScript.includes(key)) {
        suggestions.push(...values);
      }
    }

    // Check industry keywords
    for (const [key, values] of Object.entries(industryKeywords)) {
      if (lowerScript.includes(key)) {
        suggestions.push(...values);
      }
    }

    // Remove duplicates and limit
    const uniqueSuggestions = [...new Set(suggestions)].slice(0, 5);

    // If no matches, return generic based on common words
    if (uniqueSuggestions.length === 0) {
      return ['modern office', 'technology', 'professional'];
    }

    return uniqueSuggestions;
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

  // Select avatar
  const handleAvatarSelect = (url: string) => {
    setSelectedAvatarUrl(url);
    setShowAvatarPicker(false);
    onAvatarSelect?.(url);
  };

  // Submit — apply options only (no generation)
  const handleSubmit = () => {
    onApplyOptions({
      additionalNotes: additionalNotes.trim(),
      includeCreatorFace,
      referenceImages: selectedReferences,
      selectedAvatarUrl: includeCreatorFace ? currentAvatarUrl || undefined : undefined,
      layout: includeCreatorFace ? selectedLayout : 'full',
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

  // Build avatar options list - show ALL avatars with proper labels
  // Priority: Session avatar first (marked as "Script ini"), then all saved avatars with their names
  const avatarOptions: { url: string; label: string; source: string; isDefault?: boolean }[] = [];

  // Find saved avatar that matches session URL (to get its name)
  const sessionAvatarInfo = availableAvatars.find(av => av.url === sessionAvatarUrl);

  // 1. Session avatar (the one used for this script) - FIRST and marked as default
  if (sessionAvatarUrl) {
    avatarOptions.push({
      url: sessionAvatarUrl,
      label: sessionAvatarInfo?.name
        ? `${sessionAvatarInfo.name} (${uiText.sessionAvatar})`
        : uiText.sessionAvatar,
      source: 'session',
      isDefault: true
    });
  }

  // 2. All other saved avatars (excluding the session one)
  availableAvatars.forEach(av => {
    if (av.url !== sessionAvatarUrl) {
      avatarOptions.push({ url: av.url, label: av.name || uiText.savedAvatar, source: 'saved' });
    }
  });

  // 3. Profile avatar (only if different from session and not in saved list)
  const profileInSaved = availableAvatars.some(av => av.url === profileAvatarUrl);
  if (profileAvatarUrl && profileAvatarUrl !== sessionAvatarUrl && !profileInSaved) {
    avatarOptions.push({ url: profileAvatarUrl, label: uiText.profileAvatar, source: 'profile' });
  }

  return (
    <div
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 isolate"
      onClick={handleBackdropClick}
      onWheelCapture={(e) => e.stopPropagation()}
    >
      <div
        ref={modalContentRef}
        className="bg-card border border-border-default rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Header - With current image preview */}
        <div className="flex items-start gap-3 p-4 border-b border-border-default flex-shrink-0">
          {/* Current image thumbnail */}
          {(segment.imageUrl || segment.images?.[0]?.imageUrl) && (
            <div className="flex-shrink-0 w-16 h-24 rounded-lg overflow-hidden border border-border-default">
              <img
                src={segment.imageUrl || segment.images?.[0]?.imageUrl}
                alt="Current"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-text-primary">
              Configure {segment.type} (B-ROLL)
            </h3>
            {/* Script inline below title */}
            {segment.script && (
              <p className="text-sm text-text-secondary mt-1 line-clamp-2 italic">
                "{segment.script}"
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content - Two Column Layout */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

          {/* LEFT COLUMN: Form Controls */}
          <div className="w-full md:w-2/5 p-4 space-y-4 overflow-y-auto border-b md:border-b-0 md:border-r border-border-default">

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

            {/* Include Creator Face Toggle with Avatar Picker */}
            <div className={`rounded-lg border transition-all ${
              includeCreatorFace
                ? hasAnyAvatar
                  ? 'bg-primary/5 border-primary/30'
                  : 'bg-amber-500/10 border-amber-500/50'
                : 'bg-surface/50 border-border-default'
            }`}>
              {/* Checkbox row */}
              <div className="flex items-start gap-3 p-3">
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
                </label>
              </div>

              {/* Avatar Picker - shown when checked */}
              {includeCreatorFace && (
                <div className="px-3 pb-3 pt-0">
                  {hasAnyAvatar ? (
                    <div className="relative" ref={avatarPickerRef}>
                      {/* Selected Avatar Display */}
                      <button
                        onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                        className="w-full flex items-center gap-3 p-2 bg-surface border border-border-default rounded-lg hover:border-primary/50 transition-colors"
                      >
                        {currentAvatarUrl ? (
                          <img
                            src={currentAvatarUrl}
                            alt="Selected avatar"
                            className="w-10 h-10 rounded-full object-cover border-2 border-primary"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center">
                            <User className="w-5 h-5 text-text-muted" />
                          </div>
                        )}
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-text-primary">
                            {/* Find current avatar's label from options */}
                            {avatarOptions.find(av => av.url === currentAvatarUrl)?.label || uiText.selectAvatar}
                          </p>
                          <p className="text-xs text-text-muted">
                            {avatarOptions.length > 1
                              ? (language === 'id' ? 'Klik untuk ganti' : 'Click to change')
                              : (language === 'id' ? 'Avatar terpilih' : 'Selected avatar')}
                          </p>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${showAvatarPicker ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Avatar Dropdown */}
                      {showAvatarPicker && avatarOptions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border-default rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                          {avatarOptions.map((av, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleAvatarSelect(av.url)}
                              className={`w-full flex items-center gap-3 p-2 hover:bg-surface transition-colors ${
                                currentAvatarUrl === av.url ? 'bg-primary/10' : ''
                              } ${idx === 0 ? 'rounded-t-lg' : ''} ${idx === avatarOptions.length - 1 ? 'rounded-b-lg' : ''}`}
                            >
                              <img
                                src={av.url}
                                alt={av.label}
                                className={`w-8 h-8 rounded-full object-cover border-2 ${
                                  currentAvatarUrl === av.url ? 'border-primary' : 'border-transparent'
                                }`}
                              />
                              <div className="flex-1 text-left">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm text-text-primary">{av.label}</p>
                                  {av.isDefault && (
                                    <span className="px-1.5 py-0.5 text-[10px] bg-primary/20 text-primary rounded-full">
                                      Default
                                    </span>
                                  )}
                                </div>
                              </div>
                              {currentAvatarUrl === av.url && (
                                <CheckCircle2 className="w-4 h-4 text-primary" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-400 font-medium">
                      {uiText.noAvatarWarning}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Selected References Preview */}
            {selectedReferences.length > 0 && (
              <div>
                <label className="text-sm font-medium text-text-primary block mb-2">
                  {uiText.selected} ({selectedReferences.length}/{maxReferenceImages})
                </label>
                <div className="flex gap-2 flex-wrap">
                  {selectedReferences.map((ref, idx) => (
                    <div key={idx} className="relative w-16 h-24 rounded-lg overflow-hidden border-2 border-primary group">
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
                </div>
              </div>
            )}

            {/* Layout Selector — visible when Include Creator Face is checked */}
            {includeCreatorFace && (
              <div>
                <label className="text-sm font-medium text-text-primary block mb-2">
                  {uiText.layout}
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {LAYOUT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedLayout(opt.value)}
                      className={`flex flex-col items-center gap-1 p-1.5 rounded-md transition-colors cursor-pointer ${
                        selectedLayout === opt.value
                          ? 'ring-2 ring-purple-500 bg-purple-500/10'
                          : 'hover:bg-white/5 border border-border-default'
                      }`}
                    >
                      <LayoutIcon
                        layout={opt.value}
                        className="w-[38px] h-[57px] rounded-sm"
                      />
                      <span className="text-[9px] text-text-muted leading-tight">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Reference Image Picker */}
          <div className="w-full md:w-3/5 p-4 flex flex-col overflow-hidden">
            <label className="text-sm font-medium text-text-primary block mb-2">
              {uiText.referenceImage}
            </label>

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
                  className="w-full pl-10 pr-4 py-2 bg-surface border border-border-default rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <Button
                onClick={() => handleSearch()}
                disabled={isSearching || !searchQuery.trim()}
                size="sm"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : uiText.search}
              </Button>
            </div>

            {/* AI Suggestions */}
            {smartSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center mb-2">
                <span className="text-xs text-text-muted flex items-center gap-1">
                  {isExtractingKeywords ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> {uiText.extracting}</>
                  ) : (
                    <><Sparkles className="w-3 h-3 text-primary" /></>
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
                    className={`px-2 py-0.5 text-xs rounded-full transition-colors disabled:opacity-50 ${
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

            {/* Search Results Grid - Larger area */}
            <div className="flex-1 min-h-[200px] overflow-y-auto rounded-lg border border-border-default bg-surface/30">
              {isSearching ? (
                <div className="flex items-center justify-center h-full min-h-[200px]">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 p-2">
                  {searchResults.map((img) => {
                    const isSelected = selectedReferences.some(ref => ref.url === img.url_regular);
                    return (
                      <div
                        key={`${img.provider}-${img.id}`}
                        className={`relative aspect-[9/16] rounded-lg overflow-hidden cursor-pointer transition-all ${
                          isSelected
                            ? 'ring-2 ring-primary opacity-50 cursor-not-allowed'
                            : canSelectMore
                              ? 'hover:ring-2 ring-primary/50 hover:scale-[1.02]'
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
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                          <p className="text-[8px] text-white truncate">{img.photographer}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center py-8">
                  <Camera className="w-12 h-12 text-text-muted/30 mb-2" />
                  <p className="text-text-secondary text-sm">{uiText.searchHint}</p>
                </div>
              )}
            </div>

            {/* Paste URL — under reference image search */}
            <div className="flex gap-2 mt-2">
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
                size="sm"
              >
                <Upload className="w-4 h-4" />
              </Button>
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
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {uiText.applyOptions}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GenerateBRollModal;
