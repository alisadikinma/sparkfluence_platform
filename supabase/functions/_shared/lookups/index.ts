/**
 * LOOKUPS INDEX
 * ==============
 * 
 * Central export for all O(1) lookup modules.
 * Use these instead of RAG for structured data.
 * 
 * Last Updated: 2026-01-11
 */

// Metaphor Lookup - DISABLED (2026-01-11)
// Stock image search temporarily disabled, metaphorLookup.ts no longer used
// NEGATIVE_PROMPTS and getBRollNegativePrompt moved to cinematographyLookup.ts

// Cinematography Lookup - Emotion/Mood → Technical Specs
export {
  EMOTION_MAP,
  LIGHTING_PATTERNS,
  LIGHTING_RATIOS,
  COLOR_TEMPS,
  SHOT_TYPES,
  CAMERA_ANGLES,
  FILM_STOCKS,
  ATMOSPHERE_TYPES,
  MOOD_SETUPS,
  SEGMENT_DEFAULTS,
  TOPIC_COSTUMES,
  CAMERA_MOVEMENTS,
  TRANSITIONS,
  DEFAULT_CHARACTER_BIBLE,  // Character Bible for CREATOR shots
  NEGATIVE_PROMPTS,         // Moved from metaphorLookup.ts (2026-01-11)
  LOCATION_CONTEXTS,        // NEW 2026-01-14: Location → Cultural context mapping
  COSTUME_CATEGORIES,       // NEW 2026-01-15: Constrained outfit categories for LLM
  LANGUAGE_ETHNICITY_MAP,   // NEW 2026-01-15: Language → Ethnicity for B-ROLL
  CTA_EMOTION_OVERRIDE,     // NEW 2026-01-15: Friendly expression for CTA
  HOOK_EXPRESSION_MAP,      // NEW 2026-03-09: Hook category → expression spec
  HOOK_LIGHTING_MAP,        // NEW 2026-03-09: Hook category → lighting spec
  getEmotionSpecs,
  getEmotionSpecsWithOverride,  // NEW 2026-01-15: CTA always gets smile
  getHookExpression,        // NEW 2026-03-09: Hook category → expression spec
  getHookLighting,          // NEW 2026-03-09: Hook category → lighting spec
  buildHookVisualPrompt,    // NEW 2026-03-09: Combined expression+lighting prompt phrase
  getLightingPattern,
  getShotType,
  getMoodSetup,
  getSegmentDefaults,
  getCostumeForTopic,
  getContextualCostume,     // NEW 2026-01-14: Smart costume based on activity
  getCostumeByCategory,     // NEW 2026-01-15: Get costume from category key
  getCostumeCategoryKeys,   // NEW 2026-01-15: Get all valid category keys
  extractLocationContext,   // NEW 2026-01-14: Extract location from text
  getEthnicityForLanguage,  // NEW 2026-01-15: Language → Ethnicity context
  buildEthnicityPrompt,     // NEW 2026-01-15: Build ethnicity injection string
  buildCinematographyPrompt,
  buildFullCinematographyPrompt,
  getVisualSpecs,
  getBRollNegativePrompt,   // Moved from metaphorLookup.ts (2026-01-11)
  type EmotionSpecs,
  type HookExpressionSpec,  // NEW 2026-03-09
  type HookLightingSpec,    // NEW 2026-03-09
  type FullPromptParams,
  type LightingPattern,
  type LightingRatio,
  type ColorTemp,
  type ShotType,
  type CameraAngle,
  type FilmStock,
  type AtmosphereType,
  type MoodSetup,
  type SegmentDefaults,
  type VisualSpecs,
  type LocationContext,     // NEW 2026-01-14
  type CostumeCategory,     // NEW 2026-01-15
  type EthnicityContext,    // NEW 2026-01-15
} from './cinematographyLookup.ts';

// Slang Lookup - Language-Specific Slang Validation
export {
  INDONESIAN_SLANG,
  HINDI_SLANG,
  ENGLISH_SLANG,
  OUTDATED_SLANG,
  PARTICLES,
  PRONOUN_RULES,
  EMOJI_MEANINGS,
  HOOK_TEMPLATES,
  CTA_TEMPLATES,
  getSlangDatabase,
  getHighViralitySlang,
  isCurrentSlang,
  isOutdatedSlang,
  getSlangScore,
  extractCurrentSlang,
  extractOutdatedSlang,
  extractParticles,
  checkPronouns,
  validateSlang,
  getQuickSlangScore,
  getHookTemplates,
  getCTATemplates,
  type SlangTerm,
  type Language,
  type SlangValidationResult,
} from './slangLookup.ts';

// Video Specs Lookup - Platform Technical Specifications (fal.ai: Kling 2.5, Wan 2.5)
export {
  PROJECT_SPECS,
  DIALOGUE_LIMITS,
  VIDEO_PLATFORMS,
  ENVIRONMENT_AUDIO,
  DEFAULT_VOICE_CHARACTERS,
  // CAMERA_MOVEMENTS already exported from cinematographyLookup.ts
  SEGMENT_DURATION_RULES,
  getMaxDialogueWords,
  getRequiredDuration,
  selectVideoPlatform,
  getPlatformConfig,
  isDurationSupported,
  getClosestDuration,
  getEnvironmentAudio,
  getVoiceCharacter,
  getCameraMovement,
  getSegmentDurationRules,
  validateSegmentDuration,
  buildKlingVideoPrompt,
  buildWanVideoPrompt,
  type VideoPlatform,
  type PlatformConfig,
  type VoiceCharacter,
  type VideoPromptParams,
} from './videoSpecs.ts';

// Product Keywords Lookup - DISABLED (2026-01-11)
// Stock image search temporarily disabled, productKeywords.ts no longer used
// TODO: Re-enable when stock image feature is ready
// export {
//   TECH_BRANDS,
//   CRYPTO_TERMS,
//   GENERIC_KEYWORDS,
//   MODEL_PATTERNS,
//   BRAND_SEARCH_QUERIES,
//   detectProductEntities,
//   shouldUseStockImage,
//   getProductSearchQuery,
//   getProductCategory,
//   decideImageSource,
//   extractProductModels,
//   detectBrands,
//   type ProductEntity,
//   type ProductSearchDecision,
// } from './productKeywords.ts';
