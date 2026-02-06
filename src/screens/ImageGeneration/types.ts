/**
 * Shared types for ImageGeneration screen and its sub-components
 */

export interface SegmentImage {
  id: string;
  imageUrl: string;
  generationNumber: number;
  sourceType: 'generated' | 'stock' | 'uploaded';
  isSelected: boolean;
  scriptText?: string;
  regenerationNotes?: string;
  referenceImageUrl?: string;
  status: 0 | 1 | 2 | 3;
  errorMessage?: string;
  createdAt: string;
}

export interface Segment {
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
  creatorCostume?: string;
  creatorAppearance?: string;
  layout: 'full' | 'split-60-40' | 'split-50-50' | 'pip' | 'creator-center';
  loopEndEnabled: boolean;
  isEnabled: boolean;
  imageUrl: string | null;
  images: SegmentImage[];
  isGeneratingImage: boolean;
  imageError?: string | null;
  jobId?: string;
  referenceImageUrl?: string;
  referenceImageSource?: 'unsplash' | 'pexels' | 'upload';
  includeCreatorFace?: boolean;
  structuredVD?: {
    scene: string;
    camera: string;
    lighting: string;
    color: string;
    mood: string;
    fx: string;
  };
  additionalNotes?: string;
  optionsApplied?: boolean;
  previousScript?: string;
  shortenedByAI?: boolean;
  splitFromType?: string;
  splitGroupId?: string;
  splitOriginalDuration?: number;
}

export interface VideoSettings {
  duration: '30s' | '60s' | '90s';
  aspectRatio: '9:16' | '16:9';
  resolution: '720p' | '1080p';
  language?: string;
  model?: 'auto' | 'veo31' | 'sora2';
}

export interface ImageJob {
  id: string;
  segment_id: string;
  segment_number: number;
  segment_type: string;
  status: number;
  image_url: string | null;
  error_message: string | null;
}

export const JOB_STATUS = {
  PENDING: 0,
  PROCESSING: 1,
  COMPLETED: 2,
  FAILED: 3,
} as const;

export const IMAGE_MODELS = {
  aRoll: {
    auto: { id: 'auto', label: 'Auto (Nano Banana)', edgeKey: 'fal-nano-banana-edit' },
    'nano-banana': { id: 'nano-banana', label: 'Nano Banana Edit', edgeKey: 'fal-nano-banana-edit' },
    'flux-kontext': { id: 'flux-kontext', label: 'FLUX Kontext Pro', edgeKey: 'flux-kontext' },
  },
  bRoll: {
    auto: { id: 'auto', label: 'Auto (Seedream v4)', edgeKey: 'fal-seedream-v4' },
    'qwen-image': { id: 'qwen-image', label: 'Qwen Image', edgeKey: 'fal-qwen-image' },
    'seedream-v4': { id: 'seedream-v4', label: 'Seedream v4', edgeKey: 'fal-seedream-v4' },
  },
};

export interface ImageModelSettings {
  aRoll: 'auto' | 'nano-banana' | 'flux-kontext';
  bRoll: 'auto' | 'qwen-image' | 'seedream-v4';
}

export const SUPPORTED_DURATIONS = [5, 8, 10];

export const LAYOUT_OPTIONS: { value: Segment['layout']; label: string }[] = [
  { value: 'full', label: 'Full' },
  { value: 'split-60-40', label: 'Split 60/40' },
  { value: 'split-50-50', label: 'Split 50/50' },
  { value: 'pip', label: 'PiP' },
  { value: 'creator-center', label: 'Center' },
];

export const VD_CATEGORIES = ['Scene', 'Camera', 'Lighting', 'Color', 'Mood', 'FX'] as const;
export type VDCategory = typeof VD_CATEGORIES[number];

export interface StockImageResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  source: 'unsplash' | 'pexels';
  photographer: string;
  description: string;
}
