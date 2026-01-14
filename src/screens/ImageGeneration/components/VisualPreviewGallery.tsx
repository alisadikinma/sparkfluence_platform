import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import {
  RefreshCw, Loader2, Maximize2, Download, X, AlertCircle,
  CheckCircle2, ImageIcon, Plus, Trash2, Sparkles
} from 'lucide-react';

// Match parent file's interface
interface SegmentImage {
  id: string;
  imageUrl: string;
  generationNumber: number;
  sourceType: 'generated' | 'stock' | 'uploaded';
  isSelected: boolean;
  status: 0 | 1 | 2 | 3;
  errorMessage?: string;
  createdAt: string;
}

const JOB_STATUS = {
  PENDING: 0,
  PROCESSING: 1,
  COMPLETED: 2,
  FAILED: 3
};

const MAX_IMAGES_PER_SEGMENT = 3;

interface VisualPreviewGalleryProps {
  images: SegmentImage[];
  segmentId: string;
  segmentType: string;
  isCreatorShot: boolean;
  isGenerating: boolean;
  imageError: string | null;
  selectedImageUrl: string | null;
  onGenerate: () => void;
  onRegenerate: () => void;
  onSelectImage: (imageId: string) => void;
  onDeleteImage: (imageId: string) => void;
  onPreview: (imageUrl: string) => void;
  onDownload: (imageUrl: string) => void;
  disabled?: boolean;
  language?: string;
}

export const VisualPreviewGallery: React.FC<VisualPreviewGalleryProps> = ({
  images,
  segmentId,
  segmentType,
  isCreatorShot,
  isGenerating,
  imageError,
  selectedImageUrl,
  onGenerate,
  onRegenerate,
  onSelectImage,
  onDeleteImage,
  onPreview,
  onDownload,
  disabled = false,
  language = 'en'
}) => {
  const [showMaxWarning, setShowMaxWarning] = useState(false);
  const [hoveredThumbnail, setHoveredThumbnail] = useState<string | null>(null);
  
  // Get completed images only for display
  const completedImages = images.filter(img => img.status === JOB_STATUS.COMPLETED && img.imageUrl);
  const processingImages = images.filter(img => img.status === JOB_STATUS.PROCESSING);
  const failedImages = images.filter(img => img.status === JOB_STATUS.FAILED);
  
  // Find selected image or use first completed
  const selectedImage = completedImages.find(img => img.isSelected) || completedImages[0];
  const displayImageUrl = selectedImage?.imageUrl || selectedImageUrl;
  
  // Calculate remaining slots
  const usedSlots = completedImages.length + processingImages.length;
  const remainingSlots = MAX_IMAGES_PER_SEGMENT - usedSlots;
  const canAddMore = remainingSlots > 0;
  
  // Handle regenerate with max check
  const handleRegenerateClick = () => {
    if (!canAddMore) {
      setShowMaxWarning(true);
      return;
    }
    onRegenerate();
  };

  const uiText = {
    generate: language === 'id' ? 'Generate' : 'Generate',
    regenerate: language === 'id' ? 'Variasi Baru' : 'New Variant',
    generating: language === 'id' ? 'Generating...' : 'Generating...',
    maxReached: language === 'id' ? 'Maksimal 3 gambar' : 'Max 3 images',
    deleteFirst: language === 'id' 
      ? 'Hapus salah satu gambar untuk generate yang baru' 
      : 'Delete an image to generate a new one',
    selected: language === 'id' ? 'Terpilih' : 'Selected',
    clickToSelect: language === 'id' ? 'Klik untuk pilih' : 'Click to select',
    creatorShot: language === 'id' ? 'Creator' : 'Creator',
    slots: language === 'id' ? 'slot' : 'slot',
    close: language === 'id' ? 'Tutup' : 'Close',
    gotIt: language === 'id' ? 'Mengerti' : 'Got it',
  };

  return (
    <div className="w-full">
      {/* Main Preview Area */}
      <div className="w-full aspect-[9/16] sm:h-56 bg-gradient-to-br from-surface via-surface to-surface/50 border border-border-default rounded-xl overflow-hidden relative group">
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none z-[1]" />
        
        {isGenerating || processingImages.length > 0 ? (
          /* Loading State - Animated */
          <div className="w-full h-full flex flex-col items-center justify-center relative">
            {/* Animated background pulse */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 animate-pulse" />
            
            {/* Spinner with glow */}
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <Loader2 className="w-8 h-8 text-primary animate-spin relative z-10" />
            </div>
            <span className="text-text-secondary text-xs mt-3 font-medium">{uiText.generating}</span>
            
            {/* Progress indicator dots */}
            <div className="flex gap-1 mt-2">
              {[0, 1, 2].map((i) => (
                <div 
                  key={i}
                  className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
          
        ) : displayImageUrl ? (
          /* Image Preview */
          <>
            <img
              src={displayImageUrl}
              alt={`${segmentType} visual`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
            
            {/* Creator Badge */}
            {isCreatorShot && (
              <div className="absolute top-2 left-2 z-10">
                <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-pink-500/90 to-purple-500/90 text-white text-[10px] font-semibold rounded-full shadow-lg backdrop-blur-sm">
                  <Sparkles className="w-3 h-3" />
                  {uiText.creatorShot}
                </div>
              </div>
            )}
            
            {/* Selected indicator */}
            {selectedImage?.isSelected && completedImages.length > 1 && (
              <div className="absolute top-2 right-2 z-10">
                <div className="flex items-center gap-1 px-2 py-1 bg-green-500/90 text-white text-[10px] font-semibold rounded-full shadow-lg backdrop-blur-sm">
                  <CheckCircle2 className="w-3 h-3" />
                  {uiText.selected}
                </div>
              </div>
            )}
            
            {/* Hover Actions Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-end pb-4 gap-3 z-10">
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPreview(displayImageUrl)}
                  className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-md transition-all duration-200 hover:scale-110"
                  title="Preview"
                >
                  <Maximize2 className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => onDownload(displayImageUrl)}
                  className="p-2.5 bg-green-500/80 hover:bg-green-500 rounded-xl backdrop-blur-md transition-all duration-200 hover:scale-110"
                  title="Download"
                >
                  <Download className="w-4 h-4 text-white" />
                </button>
                {!disabled && (
                  <button
                    onClick={handleRegenerateClick}
                    className={`p-2.5 rounded-xl backdrop-blur-md transition-all duration-200 hover:scale-110 ${
                      canAddMore 
                        ? 'bg-primary/80 hover:bg-primary' 
                        : 'bg-amber-500/80 hover:bg-amber-500'
                    }`}
                    title={canAddMore ? uiText.regenerate : uiText.maxReached}
                  >
                    {canAddMore ? (
                      <Plus className="w-4 h-4 text-white" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-white" />
                    )}
                  </button>
                )}
              </div>
              
              {/* Slots indicator */}
              <div className="text-[10px] text-white/70 font-medium">
                {remainingSlots > 0 
                  ? `${remainingSlots} ${uiText.slots}${remainingSlots > 1 ? 's' : ''} remaining`
                  : uiText.maxReached
                }
              </div>
            </div>
          </>
          
        ) : imageError ? (
          /* Error State */
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
            <div className="p-3 bg-red-500/10 rounded-full mb-3">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-red-500 text-xs mb-3 line-clamp-2 max-w-[140px]">{imageError}</p>
            <Button
              onClick={onGenerate}
              size="sm"
              disabled={disabled}
              className="bg-primary hover:bg-primary-hover text-white text-xs shadow-lg"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          </div>
          
        ) : (
          /* Empty State - Generate CTA */
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            {/* Decorative rings */}
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent-pink/20 flex items-center justify-center border border-primary/30">
                <ImageIcon className="w-7 h-7 text-primary/60" />
              </div>
            </div>
            <Button
              onClick={onGenerate}
              disabled={disabled}
              className="bg-gradient-to-r from-primary to-accent-pink hover:opacity-90 text-white shadow-xl shadow-primary/20 transition-all duration-300 hover:shadow-primary/40 hover:scale-105"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {uiText.generate}
            </Button>
          </div>
        )}
      </div>

      {/* Thumbnail Gallery Strip */}
      {(completedImages.length > 0 || processingImages.length > 0) && (
        <div className="mt-3 relative">
          {/* Gallery container with gradient edges */}
          <div className="flex items-center gap-2">
            {/* Thumbnail slots - always show 3 */}
            {[0, 1, 2].map((slotIndex) => {
              const image = completedImages[slotIndex] || processingImages[slotIndex - completedImages.length];
              const isProcessing = image?.status === JOB_STATUS.PROCESSING;
              const isSelected = image?.isSelected;
              const isEmpty = !image;
              
              return (
                <div
                  key={slotIndex}
                  className={`relative flex-1 aspect-[9/16] max-w-[60px] rounded-lg overflow-hidden transition-all duration-300 ${
                    isEmpty 
                      ? 'bg-surface/50 border-2 border-dashed border-border-default/50' 
                      : isSelected
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-card shadow-lg shadow-primary/20'
                        : 'border-2 border-border-default hover:border-primary/50'
                  } ${!isEmpty && !isProcessing ? 'cursor-pointer hover:scale-105' : ''}`}
                  onClick={() => {
                    if (image && !isProcessing && !isEmpty) {
                      onSelectImage(image.id);
                    }
                  }}
                  onMouseEnter={() => image && setHoveredThumbnail(image.id)}
                  onMouseLeave={() => setHoveredThumbnail(null)}
                >
                  {isEmpty ? (
                    /* Empty slot */
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-text-muted/30">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                  ) : isProcessing ? (
                    /* Processing thumbnail */
                    <div className="w-full h-full flex items-center justify-center bg-surface">
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    </div>
                  ) : (
                    /* Image thumbnail */
                    <>
                      <img
                        src={image.imageUrl}
                        alt={`Variant ${slotIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Generation number badge */}
                      <div className="absolute top-0.5 left-0.5 bg-black/70 text-white text-[8px] font-bold px-1 py-0.5 rounded">
                        #{image.generationNumber}
                      </div>
                      
                      {/* Selected checkmark */}
                      {isSelected && (
                        <div className="absolute top-0.5 right-0.5 bg-green-500 rounded-full p-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                      
                      {/* Hover overlay with delete */}
                      {hoveredThumbnail === image.id && !isSelected && !disabled && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteImage(image.id);
                            }}
                            className="p-1.5 bg-red-500 hover:bg-red-600 rounded-full transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
            
            {/* Add New Variant Button */}
            {canAddMore && completedImages.length > 0 && !disabled && (
              <button
                onClick={handleRegenerateClick}
                className="flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-accent-pink/20 border border-primary/30 hover:border-primary flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-primary/20"
                title={uiText.regenerate}
              >
                <Plus className="w-4 h-4 text-primary" />
              </button>
            )}
          </div>
          
          {/* Hint text */}
          <p className="text-[10px] text-text-muted mt-1.5 text-center">
            {completedImages.length > 1 
              ? uiText.clickToSelect
              : completedImages.length === 1 && canAddMore
                ? `${uiText.regenerate} (+${remainingSlots})`
                : ''
            }
          </p>
        </div>
      )}

      {/* Max Images Warning Modal */}
      {showMaxWarning && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          onClick={() => setShowMaxWarning(false)}
        >
          <div 
            className="bg-card border border-amber-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl shadow-amber-500/10 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Warning icon with glow */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl" />
                <div className="relative p-4 bg-amber-500/10 rounded-full">
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                </div>
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-text-primary text-center mb-2">
              {uiText.maxReached}
            </h3>
            <p className="text-text-secondary text-sm text-center mb-6 leading-relaxed">
              {uiText.deleteFirst}
            </p>
            
            {/* Thumbnail preview of current images */}
            <div className="flex justify-center gap-2 mb-6">
              {completedImages.map((img, idx) => (
                <div key={img.id} className="relative group/thumb">
                  <img
                    src={img.imageUrl}
                    alt={`Image ${idx + 1}`}
                    className="w-14 h-20 object-cover rounded-lg border-2 border-border-default transition-all group-hover/thumb:opacity-75"
                  />
                  {!img.isSelected && !disabled && (
                    <button
                      onClick={() => {
                        onDeleteImage(img.id);
                        setShowMaxWarning(false);
                      }}
                      className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 rounded-full shadow-lg hover:bg-red-600 transition-colors hover:scale-110"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  )}
                  {img.isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 p-1 bg-green-500 rounded-full shadow-lg">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {/* Label */}
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[8px] px-1.5 py-0.5 rounded">
                    #{img.generationNumber}
                  </div>
                </div>
              ))}
            </div>
            
            <Button
              onClick={() => setShowMaxWarning(false)}
              className="w-full bg-surface hover:bg-surface/80 text-text-primary border border-border-default"
            >
              {uiText.gotIt}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisualPreviewGallery;
