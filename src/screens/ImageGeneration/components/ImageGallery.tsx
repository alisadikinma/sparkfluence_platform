import React from 'react';
import { RefreshCw, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { JOB_STATUS, type SegmentImage } from '../types';

interface ImageGalleryProps {
  images: SegmentImage[];
  segmentNumber: number;
  sessionId: string;
  onSelectImage: (imageId: string) => void;
  onRegenerateImage: (imageId: string) => void;
  onDeleteImage: (imageId: string) => void;
  disabled?: boolean;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  segmentNumber,
  onSelectImage,
  onRegenerateImage,
  onDeleteImage,
  disabled = false,
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
