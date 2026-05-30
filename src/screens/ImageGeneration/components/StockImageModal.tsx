import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { X, Loader2, AlertCircle, ImageIcon } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

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

export const StockImageModal: React.FC<StockImageModalProps> = ({ isOpen, onClose, onSelect }) => {
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
          provider: 'both',
        },
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
          <button onClick={onClose} className="p-1 hover:bg-surface rounded-lg transition-colors">
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
            <Button onClick={handleSearch} disabled={loading || !query.trim()} className="px-6">
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
                      <p className="text-xs text-white font-medium truncate">Photo by {img.photographer}</p>
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
              <p className="text-sm text-text-muted mt-1">Results will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
