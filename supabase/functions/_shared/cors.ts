/**
 * CORS Headers - Shared across all Edge Functions
 *
 * Security: Uses whitelist of allowed origins instead of wildcard
 */

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://sparkfluence.alisadikinma.com',
  'https://sparkfluence.app',
  Deno.env.get('FRONTEND_URL') || 'https://sparkfluence.app',
];

/**
 * Get CORS headers for a specific request origin
 */
export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  // Check if origin is in whitelist
  const origin = requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0]; // Default to first allowed origin

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

/**
 * Legacy corsHeaders for backward compatibility
 * Note: Prefer using getCorsHeaders(req.headers.get('origin')) for new code
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

/**
 * Handle CORS preflight request
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin');
    return new Response('ok', { headers: getCorsHeaders(origin) });
  }
  return null;
}

/**
 * Create JSON response with CORS headers
 */
export function jsonResponse(data: any, status: number = 200, req?: Request): Response {
  const origin = req?.headers.get('origin') || null;
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' }
  });
}

/**
 * Create success response
 */
export function successResponse(data: any, req?: Request): Response {
  return jsonResponse({ success: true, data }, 200, req);
}

/**
 * Create error response
 */
export function errorResponse(
  code: string,
  message: string,
  status: number = 500,
  req?: Request
): Response {
  return jsonResponse({
    success: false,
    error: { code, message }
  }, status, req);
}
