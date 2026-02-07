import React from 'react';
import {
  Grid2x2,
  LayoutList,
  Maximize2,
  ArrowLeft,
  ArrowRight,
  ImageIcon,
  RefreshCw,
  Loader2,
  User,
  Film,
} from 'lucide-react';

interface ImageStepShellProps {
  title?: string;
  segmentCount?: number;
  imagesGenerated?: number;
  onGenerateAll?: () => void;
  onRegenerateAll?: () => void;
  isGenerating?: boolean;
  canGenerate?: boolean;
  viewMode?: 'full' | 'compact' | 'grid';
  onViewModeChange?: (mode: string) => void;
  children?: React.ReactNode;
  onPrevStep?: () => void;
  onNextStep?: () => void;
  canNext?: boolean;
}

const MOCK_IMAGE_SEGMENTS = [
  { id: '1', segmentNumber: 1, segmentType: 'HOOK', shotType: 'CREATOR', hasImage: false },
  { id: '2', segmentNumber: 2, segmentType: 'FORE', shotType: 'B-ROLL', hasImage: false },
  { id: '3', segmentNumber: 3, segmentType: 'BODY-1', shotType: 'B-ROLL', hasImage: true },
  { id: '4', segmentNumber: 4, segmentType: 'BODY-2', shotType: 'B-ROLL', hasImage: false },
  { id: '5', segmentNumber: 5, segmentType: 'PEAK', shotType: 'B-ROLL', hasImage: true },
  { id: '6', segmentNumber: 6, segmentType: 'CTA', shotType: 'CREATOR', hasImage: false },
  { id: '7', segmentNumber: 7, segmentType: 'LOOP-END', shotType: 'CREATOR', hasImage: false },
];

const ImageStep: React.FC<ImageStepShellProps> = ({
  title = 'Image Generation',
  segmentCount = 7,
  imagesGenerated = 0,
  onGenerateAll = () => {},
  onRegenerateAll = () => {},
  isGenerating = false,
  canGenerate = false,
  viewMode = 'grid',
  onViewModeChange = () => {},
  children,
  onPrevStep = () => {},
  onNextStep = () => {},
  canNext = false,
}) => {
  const viewModeOptions = [
    { id: 'grid', icon: Grid2x2, label: 'Grid' },
    { id: 'compact', icon: LayoutList, label: 'Compact' },
    { id: 'full', icon: Maximize2, label: 'Full' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0B0E14]">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#161616] border-b border-[#262626]">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1E1E1E] rounded-lg border border-[#262626]">
            <ImageIcon className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-gray-300">
              {imagesGenerated}/{segmentCount} images
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#161616] border border-[#262626] rounded-lg p-0.5">
            {viewModeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = viewMode === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => onViewModeChange(option.id)}
                  className={`p-2 rounded transition-colors ${
                    isActive
                      ? 'bg-[#252525] text-emerald-500'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-[#1E1E1E]'
                  }`}
                  title={option.label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <button
            onClick={onRegenerateAll}
            disabled={isGenerating || imagesGenerated === 0}
            className="flex items-center gap-2 px-4 py-2 border border-emerald-500/30 text-emerald-500 rounded-lg hover:bg-emerald-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm font-medium">Regenerate All</span>
          </button>

          <button
            onClick={onGenerateAll}
            disabled={isGenerating || !canGenerate}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-500"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">Generating...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Generate All</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {children ? (
          // Render actual segment cards when provided
          <div>{children}</div>
        ) : (
          // Render mock placeholder cards
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {MOCK_IMAGE_SEGMENTS.map((segment) => (
              <PlaceholderCard key={segment.id} segment={segment} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#161616] border-t border-[#262626]">
        <button
          onClick={onPrevStep}
          className="flex items-center gap-2 px-4 py-2 border border-[#262626] text-gray-300 rounded-lg hover:bg-[#1E1E1E] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Script</span>
        </button>

        <button
          onClick={onNextStep}
          disabled={!canNext}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-500"
        >
          <span className="text-sm font-medium">Continue to Video</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

interface PlaceholderCardProps {
  segment: {
    id: string;
    segmentNumber: number;
    segmentType: string;
    shotType: string;
    hasImage: boolean;
  };
}

const PlaceholderCard: React.FC<PlaceholderCardProps> = ({ segment }) => {
  const isCreator = segment.shotType === 'CREATOR';
  const hasImage = segment.hasImage;

  return (
    <div className="bg-[#161616] rounded-xl border border-[#262626] overflow-hidden">
      {/* Card Header */}
      <div className="px-4 py-3 border-b border-[#262626]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">
              Segment {segment.segmentNumber}
            </span>
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-500 text-xs font-medium rounded">
              {segment.segmentType}
            </span>
          </div>
          {isCreator ? (
            <User className="w-4 h-4 text-emerald-500" />
          ) : (
            <Film className="w-4 h-4 text-blue-500" />
          )}
        </div>
        <div className="mt-1 text-xs text-gray-400">{segment.shotType}</div>
      </div>

      {/* Image Placeholder (9:16 aspect ratio) */}
      <div className="p-4">
        <div
          className={`aspect-[9/16] rounded-lg flex items-center justify-center ${
            hasImage
              ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30'
              : 'border-2 border-dashed border-[#262626]'
          }`}
        >
          {hasImage ? (
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-xs text-emerald-500 font-medium">Image Generated</p>
            </div>
          ) : (
            <div className="text-center">
              <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-xs text-gray-500">No image</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageStep;
