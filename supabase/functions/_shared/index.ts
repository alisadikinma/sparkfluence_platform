/**
 * Shared Modules Index
 * 
 * Import from this file for all shared utilities:
 * ```typescript
 * import { 
 *   corsHeaders, handleCors, successResponse,
 *   getSupabase,
 *   callTavilyHybrid, callOpenRouterHybrid 
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

// API Key rotation (Hybrid mode: Pool → Secrets fallback)
export {
  // Hybrid functions (recommended)
  getApiKeyHybrid,
  callWithRotationHybrid,
  callTavilyHybrid,
  callOpenRouterHybrid,
  
  // Pool-only functions
  getApiKeyFromPool,
  
  // Secret-only function
  getApiKeyFromSecret,
  
  // Usage tracking
  incrementUsage,
  markExhausted,
  getStats,
  
  // Legacy aliases (point to hybrid)
  getApiKey,
  callTavily,
  callOpenRouter,
  callWithRotation
} from './apiKeyRotation.ts';

// Types
export type { ApiKeyResult, ApiKeyStats } from './apiKeyRotation.ts';
