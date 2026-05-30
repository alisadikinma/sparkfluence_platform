import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const YOUTUBE_CLIENT_ID = Deno.env.get("YOUTUBE_CLIENT_ID")!;
const YOUTUBE_CLIENT_SECRET = Deno.env.get("YOUTUBE_CLIENT_SECRET")!;
const YOUTUBE_REDIRECT_URI = Deno.env.get("YOUTUBE_REDIRECT_URI")!;
const SITE_URL = Deno.env.get("SITE_URL") || "https://sparkfluence.alisadikinma.com";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// YouTube OAuth scopes
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split("/").pop();

  try {
    // === INIT: Generate OAuth URL ===
    if (path === "init" && req.method === "POST") {
      const { user_id } = await req.json();
      
      if (!user_id) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "MISSING_USER_ID", message: "user_id required" } }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate state with user_id for security
      const state = btoa(JSON.stringify({ user_id, timestamp: Date.now() }));

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", YOUTUBE_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", YOUTUBE_REDIRECT_URI);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", SCOPES);
      authUrl.searchParams.set("access_type", "offline"); // Get refresh_token
      authUrl.searchParams.set("prompt", "consent"); // Force consent to get refresh_token
      authUrl.searchParams.set("state", state);

      return new Response(
        JSON.stringify({ success: true, data: { auth_url: authUrl.toString() } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === CALLBACK: Handle OAuth callback ===
    if (path === "callback" && req.method === "GET") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      // Handle OAuth errors
      if (error) {
        const errorUrl = `${SITE_URL}/settings/linked-accounts?error=${encodeURIComponent(error)}`;
        return Response.redirect(errorUrl, 302);
      }

      if (!code || !state) {
        const errorUrl = `${SITE_URL}/settings/linked-accounts?error=missing_params`;
        return Response.redirect(errorUrl, 302);
      }

      // Decode state to get user_id
      let stateData: { user_id: string; timestamp: number };
      try {
        stateData = JSON.parse(atob(state));
      } catch {
        const errorUrl = `${SITE_URL}/settings/linked-accounts?error=invalid_state`;
        return Response.redirect(errorUrl, 302);
      }

      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: YOUTUBE_CLIENT_ID,
          client_secret: YOUTUBE_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: YOUTUBE_REDIRECT_URI,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok || !tokenData.access_token) {
        console.error("Token exchange failed:", tokenData);
        const errorUrl = `${SITE_URL}/settings/linked-accounts?error=token_exchange_failed`;
        return Response.redirect(errorUrl, 302);
      }

      // Get YouTube channel info
      const channelResponse = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
        { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
      );
      const channelData = await channelResponse.json();

      if (!channelData.items || channelData.items.length === 0) {
        const errorUrl = `${SITE_URL}/settings/linked-accounts?error=no_youtube_channel`;
        return Response.redirect(errorUrl, 302);
      }

      const channel = channelData.items[0];
      const channelId = channel.id;
      const channelTitle = channel.snippet.title;

      // Calculate token expiration
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      // Store in database
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Upsert linked account (update if exists, insert if not)
      const { error: dbError } = await supabase
        .from("linked_accounts")
        .upsert(
          {
            user_id: stateData.user_id,
            platform: "youtube",
            platform_user_id: channelId,
            platform_username: channelTitle,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token || null,
            token_expires_at: expiresAt,
            scopes: SCOPES.split(" "),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,platform" }
        );

      if (dbError) {
        console.error("Database error:", dbError);
        const errorUrl = `${SITE_URL}/settings/linked-accounts?error=database_error`;
        return Response.redirect(errorUrl, 302);
      }

      // Success - redirect back to settings
      const successUrl = `${SITE_URL}/settings/linked-accounts?success=youtube_connected&channel=${encodeURIComponent(channelTitle)}`;
      return Response.redirect(successUrl, 302);
    }

    // === REFRESH: Refresh access token ===
    if (path === "refresh" && req.method === "POST") {
      const { user_id } = await req.json();

      if (!user_id) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "MISSING_USER_ID", message: "user_id required" } }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Get current tokens
      const { data: account, error: fetchError } = await supabase
        .from("linked_accounts")
        .select("refresh_token")
        .eq("user_id", user_id)
        .eq("platform", "youtube")
        .single();

      if (fetchError || !account?.refresh_token) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "NO_REFRESH_TOKEN", message: "No refresh token found" } }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Refresh the token
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: YOUTUBE_CLIENT_ID,
          client_secret: YOUTUBE_CLIENT_SECRET,
          refresh_token: account.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok || !tokenData.access_token) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "REFRESH_FAILED", message: "Token refresh failed" } }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update tokens in database
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      const { error: updateError } = await supabase
        .from("linked_accounts")
        .update({
          access_token: tokenData.access_token,
          token_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user_id)
        .eq("platform", "youtube");

      if (updateError) {
        return new Response(
          JSON.stringify({ success: false, error: { code: "UPDATE_FAILED", message: "Failed to update tokens" } }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data: { expires_at: expiresAt } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Unknown endpoint
    return new Response(
      JSON.stringify({ success: false, error: { code: "NOT_FOUND", message: "Endpoint not found" } }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: err.message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
