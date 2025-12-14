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

    // DEBUG: Log raw input
    console.log("[OTP] Received phone_number:", phone_number);

    // Normalize phone - remove non-digits, keep country code as-is
    // Frontend already sends full number with country code (e.g. 819064909382)
    let normalizedPhone = phone_number.replace(/\D/g, "");
    
    // DEBUG: Log normalized
    console.log("[OTP] Normalized phone:", normalizedPhone);
    
    // NOTE: No longer prepending 62 - frontend handles country code

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
    const fonnteApiKey = Deno.env.get("FONNTE_API_TOKEN");
    if (!fonnteApiKey) {
      console.error("FONNTE_API_TOKEN not configured");
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

    // Extract country code from normalized phone
    // Common country codes: 1 (US/CA), 44 (UK), 81 (JP), 62 (ID), 91 (IN), etc.
    let countryCode = "";
    let localNumber = normalizedPhone;
    
    // Try to extract country code (1-3 digits)
    const countryCodePatterns = [
      { prefix: "1", len: 1 },    // US, Canada
      { prefix: "7", len: 1 },    // Russia
      { prefix: "20", len: 2 },   // Egypt
      { prefix: "27", len: 2 },   // South Africa
      { prefix: "30", len: 2 },   // Greece
      { prefix: "31", len: 2 },   // Netherlands
      { prefix: "32", len: 2 },   // Belgium
      { prefix: "33", len: 2 },   // France
      { prefix: "34", len: 2 },   // Spain
      { prefix: "36", len: 2 },   // Hungary
      { prefix: "39", len: 2 },   // Italy
      { prefix: "40", len: 2 },   // Romania
      { prefix: "41", len: 2 },   // Switzerland
      { prefix: "43", len: 2 },   // Austria
      { prefix: "44", len: 2 },   // UK
      { prefix: "45", len: 2 },   // Denmark
      { prefix: "46", len: 2 },   // Sweden
      { prefix: "47", len: 2 },   // Norway
      { prefix: "48", len: 2 },   // Poland
      { prefix: "49", len: 2 },   // Germany
      { prefix: "51", len: 2 },   // Peru
      { prefix: "52", len: 2 },   // Mexico
      { prefix: "53", len: 2 },   // Cuba
      { prefix: "54", len: 2 },   // Argentina
      { prefix: "55", len: 2 },   // Brazil
      { prefix: "56", len: 2 },   // Chile
      { prefix: "57", len: 2 },   // Colombia
      { prefix: "58", len: 2 },   // Venezuela
      { prefix: "60", len: 2 },   // Malaysia
      { prefix: "61", len: 2 },   // Australia
      { prefix: "62", len: 2 },   // Indonesia
      { prefix: "63", len: 2 },   // Philippines
      { prefix: "64", len: 2 },   // New Zealand
      { prefix: "65", len: 2 },   // Singapore
      { prefix: "66", len: 2 },   // Thailand
      { prefix: "81", len: 2 },   // Japan
      { prefix: "82", len: 2 },   // South Korea
      { prefix: "84", len: 2 },   // Vietnam
      { prefix: "86", len: 2 },   // China
      { prefix: "90", len: 2 },   // Turkey
      { prefix: "91", len: 2 },   // India
      { prefix: "92", len: 2 },   // Pakistan
      { prefix: "93", len: 2 },   // Afghanistan
      { prefix: "94", len: 2 },   // Sri Lanka
      { prefix: "95", len: 2 },   // Myanmar
      { prefix: "98", len: 2 },   // Iran
      { prefix: "212", len: 3 },  // Morocco
      { prefix: "213", len: 3 },  // Algeria
      { prefix: "216", len: 3 },  // Tunisia
      { prefix: "218", len: 3 },  // Libya
      { prefix: "220", len: 3 },  // Gambia
      { prefix: "221", len: 3 },  // Senegal
      { prefix: "234", len: 3 },  // Nigeria
      { prefix: "249", len: 3 },  // Sudan
      { prefix: "254", len: 3 },  // Kenya
      { prefix: "255", len: 3 },  // Tanzania
      { prefix: "256", len: 3 },  // Uganda
      { prefix: "260", len: 3 },  // Zambia
      { prefix: "263", len: 3 },  // Zimbabwe
      { prefix: "351", len: 3 },  // Portugal
      { prefix: "352", len: 3 },  // Luxembourg
      { prefix: "353", len: 3 },  // Ireland
      { prefix: "354", len: 3 },  // Iceland
      { prefix: "355", len: 3 },  // Albania
      { prefix: "358", len: 3 },  // Finland
      { prefix: "370", len: 3 },  // Lithuania
      { prefix: "371", len: 3 },  // Latvia
      { prefix: "372", len: 3 },  // Estonia
      { prefix: "380", len: 3 },  // Ukraine
      { prefix: "381", len: 3 },  // Serbia
      { prefix: "385", len: 3 },  // Croatia
      { prefix: "420", len: 3 },  // Czech Republic
      { prefix: "421", len: 3 },  // Slovakia
      { prefix: "852", len: 3 },  // Hong Kong
      { prefix: "853", len: 3 },  // Macau
      { prefix: "855", len: 3 },  // Cambodia
      { prefix: "856", len: 3 },  // Laos
      { prefix: "880", len: 3 },  // Bangladesh
      { prefix: "886", len: 3 },  // Taiwan
      { prefix: "960", len: 3 },  // Maldives
      { prefix: "961", len: 3 },  // Lebanon
      { prefix: "962", len: 3 },  // Jordan
      { prefix: "963", len: 3 },  // Syria
      { prefix: "964", len: 3 },  // Iraq
      { prefix: "965", len: 3 },  // Kuwait
      { prefix: "966", len: 3 },  // Saudi Arabia
      { prefix: "967", len: 3 },  // Yemen
      { prefix: "968", len: 3 },  // Oman
      { prefix: "971", len: 3 },  // UAE
      { prefix: "972", len: 3 },  // Israel
      { prefix: "973", len: 3 },  // Bahrain
      { prefix: "974", len: 3 },  // Qatar
      { prefix: "975", len: 3 },  // Bhutan
      { prefix: "976", len: 3 },  // Mongolia
      { prefix: "977", len: 3 },  // Nepal
    ];
    
    // Sort by length descending to match longer codes first
    countryCodePatterns.sort((a, b) => b.len - a.len);
    
    for (const pattern of countryCodePatterns) {
      if (normalizedPhone.startsWith(pattern.prefix)) {
        countryCode = pattern.prefix;
        localNumber = normalizedPhone.slice(pattern.len);
        break;
      }
    }
    
    console.log("[OTP] Extracted countryCode:", countryCode, "localNumber:", localNumber);

    const formData = new FormData();
    formData.append("target", localNumber);
    formData.append("message", message);
    if (countryCode) {
      formData.append("countryCode", countryCode);
    }

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
