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
    auto:               { id: 'auto',               label: 'Auto (Nano Banana 2) — $0.08',      edgeKey: 'fal-nano-banana-edit' },
    'nano-banana':      { id: 'nano-banana',         label: 'Nano Banana 2 Edit — $0.08',        edgeKey: 'fal-nano-banana-edit' },
    'qwen-edit':        { id: 'qwen-edit',           label: 'Qwen Image 2 Pro Edit — $0.075',    edgeKey: 'fal-qwen-image-2-pro-edit' },
    'seedream-v5-edit': { id: 'seedream-v5-edit',    label: 'Seedream v5 Lite Edit — $0.035',    edgeKey: 'fal-seedream-v5-lite-edit' },
  },
  bRoll: {
    auto:             { id: 'auto',             label: 'Auto (Seedream v4) — $0.03',   edgeKey: 'fal-seedream-v4' },
    'seedream-v4':    { id: 'seedream-v4',       label: 'Seedream v4 — $0.03',          edgeKey: 'fal-seedream-v4' },
    'seedream-v4-5':  { id: 'seedream-v4-5',     label: 'Seedream v4.5 — $0.04',        edgeKey: 'fal-seedream-v4-5' },
    'seedream-v5':    { id: 'seedream-v5',        label: 'Seedream v5 Lite — $0.035',    edgeKey: 'fal-seedream-v5-lite' },
    'qwen-image':     { id: 'qwen-image',         label: 'Qwen Image 2 — $0.035',        edgeKey: 'fal-qwen-image' },
    'qwen-image-v1':  { id: 'qwen-image-v1',      label: 'Qwen Image v1 Legacy — $0.02', edgeKey: 'fal-qwen-image-v1' },
  },
};

export interface ImageModelSettings {
  aRoll: 'auto' | 'nano-banana' | 'qwen-edit' | 'seedream-v5-edit';
  bRoll: 'auto' | 'seedream-v4' | 'seedream-v4-5' | 'seedream-v5' | 'qwen-image' | 'qwen-image-v1';
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
