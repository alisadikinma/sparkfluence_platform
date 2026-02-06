/**
 * Shared Authentication Helper for Edge Functions
 *
 * Provides standardized auth verification using Supabase JWT.
 * While Supabase gateway verifies JWT exists, this helper:
 * 1. Extracts and validates the user from the token
 * 2. Returns typed user info for downstream use
 * 3. Provides consistent error responses
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { errorResponse } from './cors.ts';

export interface AuthUser {
  id: string;
  email?: string;
}

/**
 * Verify the user's JWT token from the Authorization header.
 * Returns the authenticated user or an error Response.
 *
 * Usage:
 * ```ts
 * const authResult = await requireAuth(req);
 * if (authResult.error) return authResult.error;
 * const user = authResult.user;
 * ```
 */
export async function requireAuth(
  req: Request
): Promise<{ user: AuthUser; error: null } | { user: null; error: Response }> {
  const authHeader = req.headers.get('authorization');

  if (!authHeader) {
    return {
      user: null,
      error: errorResponse('UNAUTHORIZED', 'Missing authorization header', 401, req),
    };
  }

  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return {
      user: null,
      error: errorResponse('UNAUTHORIZED', 'Invalid authorization token', 401, req),
    };
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        user: null,
        error: errorResponse('UNAUTHORIZED', 'Invalid or expired token', 401, req),
      };
    }

    return {
      user: { id: user.id, email: user.email },
      error: null,
    };
  } catch (err: any) {
    console.error('[Auth] Token verification failed:', err.message);
    return {
      user: null,
      error: errorResponse('AUTH_ERROR', 'Authentication failed', 401, req),
    };
  }
}
