import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const YOUTUBE_CLIENT_ID = Deno.env.get("YOUTUBE_CLIENT_ID")!;
const YOUTUBE_CLIENT_SECRET = Deno.env.get("YOUTUBE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface UploadRequest {
  user_id: string;
  video_url: string;
  title: string;
  description?: string;
  tags?: string[];
  category_id?: string; // YouTube category ID (default: 22 = People & Blogs)
  privacy_status?: "public" | "private" | "unlisted";
}

// Refresh access token if expired
async function getValidAccessToken(supabase: any, userId: string): Promise<string | null> {
  const { data: account, error } = await supabase
    .from("linked_accounts")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .eq("platform", "youtube")
    .single();

  if (error || !account) {
    console.error("No YouTube account found for user:", userId);
    return null;
  }

  // Check if token is expired (with 5 min buffer)
  const expiresAt = new Date(account.token_expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5 minutes

  if (expiresAt.getTime() - bufferMs > now.getTime()) {
    // Token still valid
    return account.access_token;
  }

  // Token expired, refresh it
  if (!account.refresh_token) {
    console.error("No refresh token available");
    return null;
  }

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
    console.error("Token refresh failed:", tokenData);
    return null;
  }

  // Update database with new token
  const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

  await supabase
    .from("linked_accounts")
    .update({
      access_token: tokenData.access_token,
      token_expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("platform", "youtube");

  return tokenData.access_token;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Only POST allowed" } }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: UploadRequest = await req.json();
    const {
      user_id,
      video_url,
      title,
      description = "",
      tags = [],
      category_id = "22", // People & Blogs
      privacy_status = "private",
    } = body;

    // Validate required fields
    if (!user_id || !video_url || !title) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "MISSING_FIELDS", message: "user_id, video_url, and title are required" },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get valid access token
    const accessToken = await getValidAccessToken(supabase, user_id);
    if (!accessToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "NO_VALID_TOKEN", message: "No valid YouTube access token. Please reconnect your account." },
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download video from URL
    console.log("Downloading video from:", video_url);
    const videoResponse = await fetch(video_url);
    if (!videoResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "VIDEO_DOWNLOAD_FAILED", message: "Failed to download video" },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const videoBlob = await videoResponse.blob();
    const videoSize = videoBlob.size;
    console.log("Video size:", videoSize, "bytes");

    // Step 1: Initialize resumable upload
    const metadata = {
      snippet: {
        title,
        description,
        tags,
        categoryId: category_id,
      },
      status: {
        privacyStatus: privacy_status,
        selfDeclaredMadeForKids: false,
      },
    };

    const initResponse = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": videoSize.toString(),
          "X-Upload-Content-Type": "video/mp4",
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!initResponse.ok) {
      const errorData = await initResponse.json();
      console.error("Upload init failed:", errorData);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "UPLOAD_INIT_FAILED",
            message: errorData.error?.message || "Failed to initialize upload",
          },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uploadUrl = initResponse.headers.get("Location");
    if (!uploadUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "NO_UPLOAD_URL", message: "No upload URL returned" },
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Upload video content
    console.log("Uploading video to YouTube...");
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": videoSize.toString(),
        "Content-Type": "video/mp4",
      },
      body: videoBlob,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Upload failed:", errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "UPLOAD_FAILED", message: "Failed to upload video" },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uploadResult = await uploadResponse.json();
    console.log("Upload successful:", uploadResult.id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          video_id: uploadResult.id,
          youtube_url: `https://www.youtube.com/watch?v=${uploadResult.id}`,
          title: uploadResult.snippet?.title,
          privacy_status: uploadResult.status?.privacyStatus,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: { code: "INTERNAL_ERROR", message: err.message } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
