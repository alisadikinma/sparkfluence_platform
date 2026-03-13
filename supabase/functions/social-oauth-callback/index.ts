import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Platform = 'instagram' | 'tiktok' | 'linkedin';
type Action = 'exchange_code' | 'refresh' | 'disconnect';

interface RequestBody {
  action: Action;
  platform: Platform;
  // exchange_code
  code?: string;
  redirect_uri?: string;
  // refresh / disconnect
  account_id?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(
  code: string,
  message: string,
  status = 400,
): Response {
  return jsonResponse({ success: false, error: { code, message } }, status);
}

/**
 * Extract authenticated user from the Authorization header.
 * Uses the anon key client so RLS / auth.uid() is respected.
 */
async function getAuthUser(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * Service-role client for writing to social_accounts (bypasses RLS).
 */
function getServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

// ---------------------------------------------------------------------------
// Instagram OAuth
// ---------------------------------------------------------------------------

async function instagramExchangeCode(
  userId: string,
  code: string,
  redirectUri: string,
) {
  // Instagram Login flow uses Instagram App ID/Secret (not Facebook App ID)
  const appId = Deno.env.get('INSTAGRAM_APP_ID') || Deno.env.get('META_APP_ID');
  const appSecret = Deno.env.get('INSTAGRAM_APP_SECRET') || Deno.env.get('META_APP_SECRET');

  if (!appId || !appSecret) {
    return errorResponse(
      'MISSING_META_CREDENTIALS',
      'INSTAGRAM_APP_ID or INSTAGRAM_APP_SECRET not configured',
      500,
    );
  }

  // ------------------------------------------------------------------
  // Step 1: Exchange authorization code for short-lived IG token
  // Instagram Login flow: instagram.com/oauth/authorize → api.instagram.com
  // ------------------------------------------------------------------
  const tokenParams = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    code,
  });

  const shortTokenResp = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams.toString(),
  });

  if (!shortTokenResp.ok) {
    const errBody = await shortTokenResp.text();
    console.error('IG short token error:', shortTokenResp.status, errBody);
    return errorResponse(
      'IG_CODE_EXCHANGE_FAILED',
      `Instagram code exchange failed (${shortTokenResp.status}): ${errBody}`,
      502,
    );
  }

  const shortTokenData = await shortTokenResp.json();
  const shortToken: string = shortTokenData.access_token;
  const igUserId: string = String(shortTokenData.user_id);

  if (!shortToken || !igUserId) {
    return errorResponse(
      'IG_CODE_EXCHANGE_INVALID',
      'Instagram returned an invalid token response',
      502,
    );
  }

  // ------------------------------------------------------------------
  // Step 2: Exchange short-lived token for long-lived token (60 days)
  // ------------------------------------------------------------------
  const longTokenUrl = new URL('https://graph.instagram.com/access_token');
  longTokenUrl.searchParams.set('grant_type', 'ig_exchange_token');
  longTokenUrl.searchParams.set('client_secret', appSecret);
  longTokenUrl.searchParams.set('access_token', shortToken);

  const longTokenResp = await fetch(longTokenUrl.toString());

  if (!longTokenResp.ok) {
    const errBody = await longTokenResp.text();
    console.error('IG long token error:', longTokenResp.status, errBody);
    return errorResponse(
      'IG_LONG_TOKEN_FAILED',
      `Instagram long-lived token exchange failed (${longTokenResp.status})`,
      502,
    );
  }

  const longTokenData = await longTokenResp.json();
  const longToken: string = longTokenData.access_token;
  const expiresIn: number = longTokenData.expires_in || 5184000; // 60 days default

  if (!longToken) {
    return errorResponse(
      'IG_LONG_TOKEN_INVALID',
      'Instagram returned an invalid long-lived token',
      502,
    );
  }

  // ------------------------------------------------------------------
  // Step 3: Fetch IG user profile
  // ------------------------------------------------------------------
  let username = '';
  let profilePictureUrl: string | null = null;
  let accountType = '';
  let mediaCount = 0;

  const profileUrl = new URL('https://graph.instagram.com/v21.0/me');
  profileUrl.searchParams.set('fields', 'user_id,username,account_type,profile_picture_url,media_count');
  profileUrl.searchParams.set('access_token', longToken);

  const profileResp = await fetch(profileUrl.toString());

  if (profileResp.ok) {
    const profileData = await profileResp.json();
    username = profileData.username || '';
    profilePictureUrl = profileData.profile_picture_url || null;
    accountType = profileData.account_type || 'BUSINESS';
    mediaCount = profileData.media_count || 0;
  } else {
    console.warn('IG profile fetch failed:', profileResp.status, await profileResp.text());
  }

  // page_id not available via Instagram Login — set null
  const igPageId: string | null = null;

  // ------------------------------------------------------------------
  // Step 5: Check if this is the first IG account (for is_default)
  // ------------------------------------------------------------------
  const supabase = getServiceClient();

  const { count: existingCount } = await supabase
    .from('social_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('platform', 'instagram')
    .eq('is_active', true);

  const isFirstAccount = (existingCount ?? 0) === 0;

  // ------------------------------------------------------------------
  // Step 6: Upsert into social_accounts
  // ------------------------------------------------------------------
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  const { data: account, error: upsertError } = await supabase
    .from('social_accounts')
    .upsert(
      {
        user_id: userId,
        platform: 'instagram' as const,
        platform_user_id: igUserId,
        account_label: username ? `@${username}` : null,
        username,
        profile_picture_url: profilePictureUrl,
        access_token: longToken,
        refresh_token: null, // IG long-lived tokens don't use refresh_token
        token_expires_at: tokenExpiresAt,
        ig_page_id: igPageId,
        is_default: isFirstAccount,
        is_active: true,
        scopes: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_insights'],
        metadata: {
          account_type: accountType,
          media_count: mediaCount,
          connected_at: new Date().toISOString(),
        },
      },
      { onConflict: 'user_id,platform,platform_user_id' },
    )
    .select()
    .single();

  if (upsertError) {
    console.error('social_accounts upsert error:', upsertError);
    return errorResponse(
      'DB_UPSERT_FAILED',
      `Failed to store account: ${upsertError.message}`,
      500,
    );
  }

  return jsonResponse({
    success: true,
    data: {
      account_id: account.id,
      platform: 'instagram',
      username,
      account_type: accountType,
      profile_picture_url: profilePictureUrl,
      ig_page_id: igPageId,
      token_expires_at: tokenExpiresAt,
      is_default: account.is_default,
      is_new: isFirstAccount,
    },
  });
}

// ---------------------------------------------------------------------------
// Instagram Token Refresh
// ---------------------------------------------------------------------------

async function instagramRefreshToken(userId: string, accountId: string) {
  const supabase = getServiceClient();

  // Fetch current token
  const { data: account, error: fetchError } = await supabase
    .from('social_accounts')
    .select('id, access_token, platform_user_id, username')
    .eq('id', accountId)
    .eq('user_id', userId)
    .eq('platform', 'instagram')
    .eq('is_active', true)
    .single();

  if (fetchError || !account) {
    return errorResponse(
      'ACCOUNT_NOT_FOUND',
      'Instagram account not found or not owned by user',
      404,
    );
  }

  // Refresh the long-lived token
  const refreshUrl = new URL('https://graph.instagram.com/refresh_access_token');
  refreshUrl.searchParams.set('grant_type', 'ig_refresh_token');
  refreshUrl.searchParams.set('access_token', account.access_token);

  const refreshResp = await fetch(refreshUrl.toString());

  if (!refreshResp.ok) {
    const errBody = await refreshResp.text();
    console.error('IG token refresh error:', refreshResp.status, errBody);

    // If token is completely invalid, mark account inactive
    if (refreshResp.status === 400 || refreshResp.status === 401) {
      await supabase
        .from('social_accounts')
        .update({ is_active: false, metadata: { deactivated_reason: 'token_refresh_failed', deactivated_at: new Date().toISOString() } })
        .eq('id', accountId);

      return errorResponse(
        'IG_TOKEN_EXPIRED',
        'Instagram token has expired and cannot be refreshed. Please reconnect your account.',
        401,
      );
    }

    return errorResponse(
      'IG_REFRESH_FAILED',
      `Instagram token refresh failed (${refreshResp.status})`,
      502,
    );
  }

  const refreshData = await refreshResp.json();
  const newToken: string = refreshData.access_token;
  const expiresIn: number = refreshData.expires_in;

  if (!newToken) {
    return errorResponse(
      'IG_REFRESH_INVALID',
      'Instagram returned an invalid refreshed token',
      502,
    );
  }

  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Update token in DB
  const { error: updateError } = await supabase
    .from('social_accounts')
    .update({
      access_token: newToken,
      token_expires_at: tokenExpiresAt,
    })
    .eq('id', accountId);

  if (updateError) {
    console.error('Token update error:', updateError);
    return errorResponse(
      'DB_UPDATE_FAILED',
      `Failed to update token: ${updateError.message}`,
      500,
    );
  }

  return jsonResponse({
    success: true,
    data: {
      account_id: accountId,
      platform: 'instagram',
      username: account.username,
      token_expires_at: tokenExpiresAt,
    },
  });
}

// ---------------------------------------------------------------------------
// Disconnect (any platform)
// ---------------------------------------------------------------------------

async function disconnectAccount(userId: string, accountId: string, platform: Platform) {
  const supabase = getServiceClient();

  // Verify ownership
  const { data: account, error: fetchError } = await supabase
    .from('social_accounts')
    .select('id, access_token, platform, platform_user_id, username, is_default')
    .eq('id', accountId)
    .eq('user_id', userId)
    .eq('platform', platform)
    .single();

  if (fetchError || !account) {
    return errorResponse(
      'ACCOUNT_NOT_FOUND',
      `${platform} account not found or not owned by user`,
      404,
    );
  }

  // ------------------------------------------------------------------
  // Platform-specific token revocation
  // ------------------------------------------------------------------
  if (platform === 'instagram') {
    // Instagram Basic Display / Graph API: revoke permissions
    try {
      const appSecret = Deno.env.get('META_APP_SECRET');
      const appId = Deno.env.get('META_APP_ID');
      if (appId && appSecret) {
        const revokeUrl = `https://graph.facebook.com/v21.0/${account.platform_user_id}/permissions?access_token=${account.access_token}`;
        const revokeResp = await fetch(revokeUrl, { method: 'DELETE' });
        if (!revokeResp.ok) {
          // Non-fatal — we still delete the local record
          console.warn('IG permission revoke failed:', revokeResp.status);
        }
      }
    } catch (revokeErr) {
      console.warn('IG revoke error:', revokeErr);
    }
  }

  // ------------------------------------------------------------------
  // Delete from DB
  // ------------------------------------------------------------------
  const { error: deleteError } = await supabase
    .from('social_accounts')
    .delete()
    .eq('id', accountId)
    .eq('user_id', userId);

  if (deleteError) {
    console.error('Account delete error:', deleteError);
    return errorResponse(
      'DB_DELETE_FAILED',
      `Failed to delete account: ${deleteError.message}`,
      500,
    );
  }

  // ------------------------------------------------------------------
  // If this was the default account, promote the next one
  // ------------------------------------------------------------------
  if (account.is_default) {
    const { data: nextAccount } = await supabase
      .from('social_accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('platform', platform)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextAccount) {
      await supabase
        .from('social_accounts')
        .update({ is_default: true })
        .eq('id', nextAccount.id);
    }
  }

  return jsonResponse({
    success: true,
    data: {
      account_id: accountId,
      platform,
      username: account.username,
      disconnected: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Main Handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const user = await getAuthUser(req);
    if (!user) {
      return errorResponse('UNAUTHORIZED', 'Valid authentication token required', 401);
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { action, platform } = body;

    // Validate action
    if (!action || !['exchange_code', 'refresh', 'disconnect'].includes(action)) {
      return errorResponse(
        'INVALID_ACTION',
        'action must be one of: exchange_code, refresh, disconnect',
      );
    }

    // Validate platform
    if (!platform || !['instagram', 'tiktok', 'linkedin'].includes(platform)) {
      return errorResponse(
        'INVALID_PLATFORM',
        'platform must be one of: instagram, tiktok, linkedin',
      );
    }

    // ------------------------------------------------------------------
    // TikTok / LinkedIn stubs
    // ------------------------------------------------------------------
    if (platform === 'tiktok' || platform === 'linkedin') {
      // Disconnect is allowed for any platform (just deletes the DB row)
      if (action === 'disconnect' && body.account_id) {
        return await disconnectAccount(user.id, body.account_id, platform);
      }

      return errorResponse(
        'NOT_IMPLEMENTED',
        `${platform} OAuth is coming in Phase ${platform === 'tiktok' ? '2' : '3'}`,
        501,
      );
    }

    // ------------------------------------------------------------------
    // Instagram handlers
    // ------------------------------------------------------------------
    switch (action) {
      case 'exchange_code': {
        if (!body.code) {
          return errorResponse('MISSING_CODE', 'Authorization code is required');
        }
        if (!body.redirect_uri) {
          return errorResponse('MISSING_REDIRECT_URI', 'redirect_uri is required');
        }
        return await instagramExchangeCode(user.id, body.code, body.redirect_uri);
      }

      case 'refresh': {
        if (!body.account_id) {
          return errorResponse('MISSING_ACCOUNT_ID', 'account_id is required');
        }
        return await instagramRefreshToken(user.id, body.account_id);
      }

      case 'disconnect': {
        if (!body.account_id) {
          return errorResponse('MISSING_ACCOUNT_ID', 'account_id is required');
        }
        return await disconnectAccount(user.id, body.account_id, platform);
      }

      default:
        return errorResponse('INVALID_ACTION', `Unknown action: ${action}`);
    }
  } catch (err) {
    console.error('social-oauth-callback error:', err);
    return errorResponse(
      'INTERNAL_ERROR',
      err instanceof Error ? err.message : 'An unexpected error occurred',
      500,
    );
  }
});
