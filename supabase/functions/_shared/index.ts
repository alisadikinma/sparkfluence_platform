/**
 * Shared Modules Index
 *
 * Import from this file for all shared utilities:
 * ```typescript
 * import {
 *   corsHeaders, handleCors, successResponse,
 *   getSupabase,
 *   callLLM, callTavilyHybrid
 * } from '../_shared/index.ts';
 * ```
 */

// CORS utilities
export { 
  corsHeaders, 
  handleCors, 
  jsonResponse, 
  successResponse, 
  errorResponse 
} from './cors.ts';

// Supabase client
export { 
  getSupabase, 
  createSupabaseClient 
} from './supabase.ts';

// API Key rotation
export {
  callLLM,
  callTavilyHybrid,
  callStockImageSearch,
  trackUnsplashDownload,
  callGroqTranscribe,
  getStats,
  getApiKeyFromPool,
} from './apiKeyRotation.ts';

// Types
export type {
  ApiKeyResult,
  ApiKeyStats,
  StockImageResult,
  StockImageSearchResult,
  GroqTranscribeResult,
} from './apiKeyRotation.ts';

// ============================================================================
// PROMPT MODULES (P0 Improvements - Jan 2026)
// ============================================================================

// Content Type Detection
export {
  detectContentType,
  getFilteredHooksForPrompt,
  validateItemCoverage,
} from './prompts/contentTypeDetector.ts';
export type { ContentType, ContentTypeResult } from './prompts/contentTypeDetector.ts';

// Script Validation
export {
  validateAndFixScript,
  checkViralityFactors,
  getQuickValidationScore,
} from './prompts/scriptValidator.ts';
export type { ValidationIssue, ScriptValidationResult, ViralityCheckResult } from './prompts/scriptValidator.ts';

// Visual Enhancement
export {
  enhanceVisualDirection,
  enhanceAllVisuals,
  addFFmpegSpecs,
  getTransitionSpec,
} from './prompts/visualEnhancer.ts';
export type { EnhancedSegment, TransitionSpec } from './prompts/visualEnhancer.ts';

// Slang Validation
export {
  validateSlangUsage,
  getSlangKnowledge,
  getSlangScore,
  extractSlangTerms,
  detectOutdatedSlang,
} from './prompts/slangValidator.ts';
export type { SlangValidationResult } from './prompts/slangValidator.ts';

// Audio & Voice Directive (Sora 2.0 Consistency)
export {
  generateVoiceAnchor,
  generateFaceAnchor,
  generateSegmentAnchors,
  getCreatorAudioDirective,
  getBRollAudioDirective,
  getLanguageLabel,
  applyAnchorsToSegments,
  detectBRollCategory,
} from './prompts/audioDirective.ts';
export type { 
  VoiceProfile, 
  FaceAnchorConfig, 
  AnchorConfig,
  SegmentWithAnchors 
} from './prompts/audioDirective.ts';
