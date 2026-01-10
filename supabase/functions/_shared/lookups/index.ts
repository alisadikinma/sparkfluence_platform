/**
 * LOOKUPS INDEX
 * ==============
 * 
 * Central export for all O(1) lookup modules.
 * Use these instead of RAG for structured data.
 * 
 * Last Updated: 2026-01-10
 */

// Metaphor Lookup - Abstract → Visual Element Mapping
export {
  METAPHOR_MAP,
  TOPIC_VISUALS,
  NEGATIVE_PROMPTS,
  getVisualsForConcept,
  extractVisualsFromText,
  getTopicVisuals,
  identifyAbstractConcepts,
  buildVisualBrief,
  getBRollNegativePrompt,
  type VisualBrief,
} from './metaphorLookup.ts';

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
  getEmotionSpecs,
  getLightingPattern,
  getShotType,
  getMoodSetup,
  getSegmentDefaults,
  getCostumeForTopic,
  buildCinematographyPrompt,
  getVisualSpecs,
  type EmotionSpecs,
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

// Video Specs Lookup - Platform Technical Specifications
export {
  PROJECT_SPECS,
  DIALOGUE_LIMITS,
  VIDEO_PLATFORMS,
  ENVIRONMENT_AUDIO,
  DEFAULT_VOICE_CHARACTERS,
  VEO_CAMERA_MOVEMENTS,
  SEGMENT_DURATION_RULES,
  getMaxDialogueWords,
  getRequiredDuration,
  selectVideoPlatform,
  getPlatformConfig,
  isDurationSupported,
  getClosestDuration,
  getEnvironmentAudio,
  getVoiceCharacter,
  buildVoiceAnchorPrompt,
  buildAudioDirective,
  getCameraMovement,
  getSegmentDurationRules,
  validateSegmentDuration,
  buildVeoVideoPrompt,
  buildSoraVideoPrompt,
  type VideoPlatform,
  type PlatformConfig,
  type VoiceCharacter,
  type AudioDirectiveParams,
  type VideoPromptParams,
} from './videoSpecs.ts';
