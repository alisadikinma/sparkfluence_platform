/**
 * Centralized API Configuration
 * Single source of truth for backend URLs and API settings
 * 
 * Usage:
 *   import { API_URL, API_KEY, apiEndpoints } from '@/lib/api';
 *   
 *   fetch(apiEndpoints.addSubtitles, { headers: { 'x-api-key': API_KEY } })
 */

// Base URL - always from env, no hardcoded fallback in production
export const API_URL = import.meta.env.VITE_BACKEND_URL || '';
export const API_KEY = import.meta.env.VITE_BACKEND_API_KEY || '';

// Validate config on import (dev only)
if (import.meta.env.DEV && !API_URL) {
  console.warn('[API Config] VITE_BACKEND_URL not set in environment variables');
}

/**
 * All API endpoints - centralized for easy maintenance
 */
export const apiEndpoints = {
  // Video processing
  combineVideo: `${API_URL}/api/combine-final-video-v2`,
  addSubtitles: `${API_URL}/api/add-subtitles`,
  addBGM: `${API_URL}/api/add-bgm`,
  jobStatus: (jobId: string) => `${API_URL}/api/job-status/${jobId}`,

  // Health check
  health: `${API_URL}/api/health`,
} as const;

/**
 * Default headers for API requests
 */
export const apiHeaders = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY,
};

/**
 * Helper function for API fetch with default headers
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = {
    ...apiHeaders,
    ...options.headers,
  };
  
  return fetch(endpoint, {
    ...options,
    headers,
  });
}

/**
 * Helper for GET requests
 */
export async function apiGet(endpoint: string): Promise<Response> {
  return apiFetch(endpoint, { method: 'GET' });
}

/**
 * Helper for POST requests with JSON body
 */
export async function apiPost(
  endpoint: string,
  body: Record<string, unknown>
): Promise<Response> {
  return apiFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
