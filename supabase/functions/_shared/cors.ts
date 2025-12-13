/**
 * CORS Headers - Shared across all Edge Functions
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
    return new Response('ok', { headers: corsHeaders });
  }
  return null;
}

/**
 * Create JSON response with CORS headers
 */
export function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * Create success response
 */
export function successResponse(data: any): Response {
  return jsonResponse({ success: true, data }, 200);
}

/**
 * Create error response
 */
export function errorResponse(
  code: string, 
  message: string, 
  status: number = 500
): Response {
  return jsonResponse({
    success: false,
    error: { code, message }
  }, status);
}
