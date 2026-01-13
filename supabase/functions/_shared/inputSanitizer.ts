/**
 * Input Sanitization Utilities for Edge Functions
 *
 * Provides sanitization functions to prevent:
 * - Prompt injection attacks
 * - XSS (if output is rendered)
 * - SQL injection (if used in raw queries)
 * - Excessive input lengths
 */

/**
 * Sanitize text input for safe use in AI prompts.
 * Removes potential prompt injection patterns.
 *
 * @param input - Raw user input
 * @param maxLength - Maximum allowed length (default: 5000)
 * @returns Sanitized string
 */
export function sanitizePromptInput(input: string | undefined | null, maxLength: number = 5000): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input
    // Remove code blocks that could contain injection
    .replace(/```[\s\S]*?```/g, '')
    // Remove HTML/XML tags
    .replace(/<[^>]*>/g, '')
    // Remove potential system/assistant role markers
    .replace(/\b(system|assistant|user|human|ai|claude|gpt):/gi, '')
    // Remove instruction-like patterns
    .replace(/(?:ignore|disregard|forget)\s+(?:previous|above|all)\s+(?:instructions?|rules?|prompts?)/gi, '')
    .replace(/(?:new|updated?)\s+(?:instructions?|rules?|system)/gi, '')
    // Remove escape sequences that could break JSON
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // Truncate to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize a topic or title for safe display and storage.
 *
 * @param input - Raw topic input
 * @param maxLength - Maximum allowed length (default: 200)
 * @returns Sanitized topic string
 */
export function sanitizeTopic(input: string | undefined | null, maxLength: number = 200): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Remove excessive special characters
    .replace(/[<>"'`]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validate and sanitize platform selection.
 *
 * @param platform - User-provided platform
 * @param allowedPlatforms - List of valid platforms
 * @returns Valid platform or default
 */
export function sanitizePlatform(
  platform: string | undefined | null,
  allowedPlatforms: string[] = ['tiktok', 'instagram', 'youtube', 'facebook']
): string {
  if (!platform || typeof platform !== 'string') {
    return allowedPlatforms[0];
  }

  const normalized = platform.toLowerCase().trim();
  return allowedPlatforms.includes(normalized) ? normalized : allowedPlatforms[0];
}

/**
 * Validate and sanitize language selection.
 *
 * @param language - User-provided language
 * @param allowedLanguages - List of valid languages
 * @returns Valid language or default
 */
export function sanitizeLanguage(
  language: string | undefined | null,
  allowedLanguages: string[] = ['indonesian', 'english', 'hindi']
): string {
  if (!language || typeof language !== 'string') {
    return allowedLanguages[0];
  }

  const normalized = language.toLowerCase().trim();
  return allowedLanguages.includes(normalized) ? normalized : allowedLanguages[0];
}

/**
 * Sanitize duration string.
 *
 * @param duration - User-provided duration
 * @param allowedDurations - List of valid durations
 * @returns Valid duration or default
 */
export function sanitizeDuration(
  duration: string | undefined | null,
  allowedDurations: string[] = ['30s', '60s', '90s']
): string {
  if (!duration || typeof duration !== 'string') {
    return allowedDurations[1]; // Default to 60s
  }

  const normalized = duration.toLowerCase().trim();
  return allowedDurations.includes(normalized) ? normalized : allowedDurations[1];
}

/**
 * Validate and sanitize user ID.
 * Ensures it looks like a valid UUID.
 *
 * @param userId - User-provided user ID
 * @returns User ID if valid, empty string otherwise
 */
export function sanitizeUserId(userId: string | undefined | null): string {
  if (!userId || typeof userId !== 'string') {
    return '';
  }

  // UUID v4 pattern
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const trimmed = userId.trim();
  return uuidPattern.test(trimmed) ? trimmed : '';
}

/**
 * Comprehensive input sanitization for script generation.
 * Returns sanitized object with all fields validated.
 */
export interface SanitizedScriptInput {
  content: string;
  inputType: string;
  duration: string;
  platform: string;
  language: string;
  userId: string;
  aspectRatio: string;
  resolution: string;
}

export function sanitizeScriptInput(input: Record<string, any>): SanitizedScriptInput {
  const allowedInputTypes = ['topic', 'keywords', 'raw_script', 'regenerate_segment', 'trending'];
  const allowedAspectRatios = ['9:16', '16:9', '1:1', '4:5'];
  const allowedResolutions = ['720p', '1080p', '4k'];

  return {
    content: sanitizePromptInput(input.content, 5000),
    inputType: allowedInputTypes.includes(input.input_type) ? input.input_type : 'topic',
    duration: sanitizeDuration(input.duration),
    platform: sanitizePlatform(input.platform),
    language: sanitizeLanguage(input.language),
    userId: sanitizeUserId(input.user_id),
    aspectRatio: allowedAspectRatios.includes(input.aspect_ratio) ? input.aspect_ratio : '9:16',
    resolution: allowedResolutions.includes(input.resolution) ? input.resolution : '1080p',
  };
}
