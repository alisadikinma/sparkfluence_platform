import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { phone_number } = await req.json();

    // Normalize phone - remove non-digits, keep country code as-is
    let normalizedPhone = phone_number.replace(/\D/g, "");
    
    // If starts with 0, assume Indonesia local format
    if (normalizedPhone.startsWith("0")) {
      normalizedPhone = "62" + normalizedPhone.slice(1);
    }

    // Validate length (country code + number = 10-15 digits)
    if (normalizedPhone.length < 10 || normalizedPhone.length > 15) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "INVALID_PHONE",
            message: "Invalid WhatsApp number format",
          },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Check if phone already registered
    const { data: isRegistered } = await supabase.rpc("is_phone_registered", {
      p_phone: normalizedPhone,
    });

    if (isRegistered) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "PHONE_REGISTERED",
            message: "This WhatsApp number is already registered",
          },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check rate limit (blocked?)
    const { data: blockStatus } = await supabase.rpc("is_phone_blocked", {
      p_phone: normalizedPhone,
    });

    if (blockStatus?.[0]?.blocked) {
      const hours = Math.ceil(blockStatus[0].remaining_seconds / 3600);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: `Too many attempts. Try again in ${hours} hours`,
            remaining_seconds: blockStatus[0].remaining_seconds,
          },
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Check cooldown (60 seconds between OTP requests)
    const { data: cooldownStatus } = await supabase.rpc("check_otp_cooldown", {
      p_phone: normalizedPhone,
    });

    if (cooldownStatus?.[0]?.in_cooldown) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "COOLDOWN",
            message: `Please wait ${cooldownStatus[0].remaining_seconds} seconds`,
            remaining_seconds: cooldownStatus[0].remaining_seconds,
          },
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Generate OTP (6 digits)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // 5. Store OTP in database
    const { error: insertError } = await supabase.from("phone_otp").upsert(
      {
        phone_number: normalizedPhone,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        created_at: new Date().toISOString(),
      },
      { onConflict: "phone_number" }
    );

    if (insertError) {
      console.error("Failed to store OTP:", insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "DB_ERROR",
            message: "Failed to generate OTP",
          },
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Send OTP via Fonnte WhatsApp API
    const fonnteApiKey = Deno.env.get("FONNTE_API_KEY");
    if (!fonnteApiKey) {
      console.error("FONNTE_API_KEY not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "CONFIG_ERROR",
            message: "WhatsApp service not configured",
          },
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const message = `🔐 *Sparkfluence Verification*\n\nYour OTP code is: *${otpCode}*\n\nThis code expires in 5 minutes.\n\n⚠️ Don't share this code with anyone.`;

    const formData = new FormData();
    formData.append("target", normalizedPhone);
    formData.append("message", message);

    const fonnteResponse = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: fonnteApiKey,
      },
      body: formData,
    });

    const fonnteResult = await fonnteResponse.json();
    console.log("Fonnte response:", JSON.stringify(fonnteResult));

    if (!fonnteResult.status) {
      console.error("Fonnte failed:", fonnteResult);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "SEND_FAILED",
            message: "Failed to send WhatsApp message",
          },
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Mask phone for response
    const maskedPhone = normalizedPhone.slice(0, 4) + "****" + normalizedPhone.slice(-4);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          phone_masked: maskedPhone,
          expires_in: 300,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error.message || "Internal server error",
        },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
