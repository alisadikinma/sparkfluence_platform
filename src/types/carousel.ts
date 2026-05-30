// ============================================================================
// Carousel Image Feature — Type Definitions
// ============================================================================

// --- Slide Types ---
export type CarouselSlideType = 'HOOK' | 'FORE' | 'BODY' | 'PEAK' | 'CTA';

export type GenerationMode = 'ai' | 'manual';

export type GenerationMethod = 'ai' | 'manual' | 'copy_source';

export type CarouselProjectStatus =
  | 'draft'
  | 'source_ready'
  | 'generated'
  | 'edited'
  | 'video_ready'
  | 'published'
  | 'complete';

export type VideoMotionPreset = 'subtle_zoom' | 'dynamic_pan' | 'parallax_layers' | 'custom';

export type ScrapeStatus = 'pending' | 'fetching' | 'completed' | 'failed';

// --- Carousel Project ---
export interface CarouselProject {
  id: string;
  userId: string;
  projectId: string; // SF-YYYYMMDD-XXXX
  title: string;
  status: CarouselProjectStatus;
  generationMode: GenerationMode;
  aiTextMode: boolean;
  settings: CarouselProjectSettings;
  sourceType: 'instagram' | 'manual_upload';
  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CarouselLanguage = 'id' | 'en' | 'hi';

export interface CarouselLanguageSettings {
  primary: CarouselLanguage;    // headline language
  subtitle: CarouselLanguage | 'none'; // subtitle language (or none for monolingual)
}

export const CAROUSEL_LANGUAGES: Record<CarouselLanguage, { label: string; native: string; flag: string }> = {
  id: { label: 'Indonesian', native: 'Bahasa Indonesia', flag: '🇮🇩' },
  en: { label: 'English', native: 'English', flag: '🇺🇸' },
  hi: { label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
};

export const DEFAULT_LANGUAGE_SETTINGS: CarouselLanguageSettings = {
  primary: 'id',
  subtitle: 'en',
};

export interface CarouselProjectSettings {
  aspectRatio?: string; // default '4:5'
  slideCount?: number;
  imageModel?: string;
  skippedSlideIds?: string[];
  language?: CarouselLanguageSettings;
}

// --- DB row (snake_case) ---
export interface CarouselProjectRow {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  status: CarouselProjectStatus;
  generation_mode: GenerationMode;
  ai_text_mode: boolean;
  settings: CarouselProjectSettings;
  source_type: string;
  source_url: string | null;
  created_at: string;
  updated_at: string;
}

// --- Source URL ---
export interface CarouselSourceUrl {
  id: string;
  projectId: string;
  sourceUrl: string;
  shortcode: string | null;
  mediaId: string | null;
  mediaUrls: SourceMediaItem[];
  sourceOrder: number;
  scrapeStatus: ScrapeStatus;
  scrapeError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SourceMediaItem {
  url: string;
  mediaType: 'IMAGE' | 'VIDEO';
  width?: number;
  height?: number;
}

export interface CarouselSourceUrlRow {
  id: string;
  project_id: string;
  source_url: string;
  shortcode: string | null;
  media_id: string | null;
  media_urls: SourceMediaItem[];
  source_order: number;
  scrape_status: ScrapeStatus;
  scrape_error: string | null;
  created_at: string;
  updated_at: string;
}

// --- Carousel Slide ---
export interface CarouselSlide {
  id: string;
  projectId: string;
  slideIndex: number;
  slideType: CarouselSlideType;
  generationMethod: GenerationMethod;
  analysisData: SlideAnalysis | null;
  prompt: string | null;
  imageUrl: string | null;
  imageModel: string | null;
  sourceImageUrl: string | null;
  referenceImageUrl: string | null; // Legacy single URL — use referenceImageUrls for multi
  referenceImageUrls: string[]; // Parsed from reference_image_url (JSON array or single URL)
  creatorFace: boolean;
  additionalNote: string | null;
  editorState: Record<string, unknown> | null; // fabric.js JSON
  videoToggle: boolean;
  videoUrl: string | null;
  videoMotionPreset: VideoMotionPreset | null;
  videoDuration: number;
  videoCustomPrompt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SlideAnalysis {
  topic: string;
  textContent: string[];
  layout: string;
  visualStyle: {
    dominantColors: string[];
    mood: string;
    composition: string;
  };
  segmentType: CarouselSlideType;
  subjectDetection: {
    hasCreator: boolean;
    hasProduct: boolean;
    hasBrandLogo?: boolean;
    brandNames?: string[];
    description: string;
  };
  // Enhanced vision fields (from multimodal analysis)
  contentCategory?: string;
  factualClaims?: string[];
  emotionalTone?: string;
  subjectReferences?: SubjectReference[];
  // Hook/CTA specific (detected by LLM)
  hookCategory?: string;
  foreshadowType?: string;
  ctaType?: string;
  // AI Decision Engine outputs (from generate-carousel-images)
  autoDecisions?: AutoDecisions;
}

export interface SubjectReference {
  type: 'product' | 'brand_logo' | 'source_logo' | 'unique_object';
  name: string;
  needsReference: boolean;
}

export interface AutoDecisions {
  hookCategory?: string;
  visualAction?: string;
  cameraVariant?: 'A' | 'B' | 'C';
  headlineScore?: number;
  headlineRewritten?: boolean;
  rewrittenHeadline?: string;
  foreshadowType?: string;
  ctaType?: string;
  emotionalArc?: { intensity: number; beat: string };
  costume?: string;
  propInteraction?: string;
  variantRotation?: 'A' | 'B' | 'C';
  wowScore?: number;
  contentCategory?: string;
}

export interface HookOption {
  rank: 'PRIMARY' | 'SECONDARY' | 'WILDCARD';
  hookCategory: string;
  visualAction: string;
  sampleHeadline: string;
  vibe: string;
  psychology: string;
}

export interface CarouselSlideRow {
  id: string;
  project_id: string;
  slide_index: number;
  slide_type: CarouselSlideType;
  generation_method: GenerationMethod;
  analysis_data: SlideAnalysis | null;
  prompt: string | null;
  image_url: string | null;
  image_model: string | null;
  source_image_url: string | null;
  reference_image_url: string | null;
  creator_face: boolean;
  additional_note: string | null;
  editor_state: Record<string, unknown> | null;
  video_toggle: boolean;
  video_url: string | null;
  video_motion_preset: VideoMotionPreset | null;
  video_duration: number;
  video_custom_prompt: string | null;
  created_at: string;
  updated_at: string;
}

// --- Mappers (DB row → frontend camelCase) ---
export function mapCarouselProjectRow(row: CarouselProjectRow): CarouselProject {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    title: row.title,
    status: row.status,
    generationMode: row.generation_mode,
    aiTextMode: row.ai_text_mode,
    settings: row.settings,
    sourceType: row.source_type as 'instagram' | 'manual_upload',
    sourceUrl: row.source_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Parse reference_image_url: supports JSON array string or single URL (backward compat)
export const parseReferenceUrls = (val: string | null): string[] => {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed)) return parsed.filter((u: any) => typeof u === 'string' && u);
  } catch {
    // Not JSON — treat as single URL
  }
  return [val];
};

// Serialize reference URLs array to string for DB storage
export const serializeReferenceUrls = (urls: string[]): string | null => {
  if (!urls.length) return null;
  if (urls.length === 1) return urls[0]; // Single URL stays as plain string
  return JSON.stringify(urls);
};

export function mapCarouselSlideRow(row: CarouselSlideRow): CarouselSlide {
  return {
    id: row.id,
    projectId: row.project_id,
    slideIndex: row.slide_index,
    slideType: row.slide_type,
    generationMethod: row.generation_method,
    analysisData: row.analysis_data,
    prompt: row.prompt,
    imageUrl: row.image_url,
    imageModel: row.image_model,
    sourceImageUrl: row.source_image_url,
    referenceImageUrl: row.reference_image_url,
    referenceImageUrls: parseReferenceUrls(row.reference_image_url),
    creatorFace: row.creator_face,
    additionalNote: row.additional_note,
    editorState: row.editor_state,
    videoToggle: row.video_toggle,
    videoUrl: row.video_url,
    videoMotionPreset: row.video_motion_preset,
    videoDuration: row.video_duration,
    videoCustomPrompt: row.video_custom_prompt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCarouselSourceUrlRow(row: CarouselSourceUrlRow): CarouselSourceUrl {
  return {
    id: row.id,
    projectId: row.project_id,
    sourceUrl: row.source_url,
    shortcode: row.shortcode,
    mediaId: row.media_id,
    mediaUrls: row.media_urls,
    sourceOrder: row.source_order,
    scrapeStatus: row.scrape_status,
    scrapeError: row.scrape_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// --- Caption / Publish types ---
export type CaptionPlatform = 'instagram' | 'tiktok' | 'linkedin' | 'threads';

export interface PlatformCaption {
  platform: CaptionPlatform;
  caption: string;
  hashtags: string[];
}

export const PLATFORM_SPECS: Record<CaptionPlatform, {
  label: string;
  charLimit: number;
  hashtagLimit: number;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  instagram: {
    label: 'Instagram',
    charLimit: 2200,
    hashtagLimit: 30,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/20',
  },
  tiktok: {
    label: 'TikTok',
    charLimit: 4000,
    hashtagLimit: 5,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
  },
  linkedin: {
    label: 'LinkedIn',
    charLimit: 3000,
    hashtagLimit: 5,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  threads: {
    label: 'Threads',
    charLimit: 500,
    hashtagLimit: 3,
    color: 'text-neutral-400',
    bgColor: 'bg-neutral-500/10',
    borderColor: 'border-neutral-500/20',
  },
};

export const MOTION_PRESETS: Record<VideoMotionPreset, {
  label: string;
  description: string;
}> = {
  subtle_zoom: {
    label: 'Subtle Zoom',
    description: 'Slow cinematic zoom 1.0→1.15x, soft focus shift',
  },
  dynamic_pan: {
    label: 'Dynamic Pan',
    description: 'Smooth horizontal pan, elements enter from edges',
  },
  parallax_layers: {
    label: 'Parallax Layers',
    description: 'Background slower than foreground, depth effect',
  },
  custom: {
    label: 'Custom',
    description: 'Write your own motion prompt',
  },
};

// --- Slide type config (for UI badges + borders) ---
export const SLIDE_TYPE_CONFIG: Record<CarouselSlideType, {
  label: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}> = {
  HOOK: {
    label: 'HOOK',
    borderColor: 'border-emerald-500',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-500/20',
  },
  FORE: {
    label: 'FORE',
    borderColor: 'border-amber-500',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-400',
    badgeBorder: 'border-amber-500/20',
  },
  BODY: {
    label: 'BODY',
    borderColor: 'border-neutral-600',
    badgeBg: 'bg-neutral-500/10',
    badgeText: 'text-neutral-400',
    badgeBorder: 'border-neutral-500/20',
  },
  PEAK: {
    label: 'PEAK',
    borderColor: 'border-emerald-500',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-500/20',
  },
  CTA: {
    label: 'CTA',
    borderColor: 'border-blue-500',
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-400',
    badgeBorder: 'border-blue-500/20',
  },
};

// --- Session type config for sidebar ---
export const CAROUSEL_SESSION_CONFIG = {
  label: 'Carousel',
  color: 'text-cyan-500',
  bgColor: 'bg-cyan-500/10',
};
