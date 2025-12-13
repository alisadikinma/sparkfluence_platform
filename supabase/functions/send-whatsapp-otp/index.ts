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

    // Validate phone format (Indonesia: +62 or 62 or 08)
    let normalizedPhone = phone_number.replace(/\D/g, "");
    if (normalizedPhone.startsWith("0")) {
      normalizedPhone = "62" + normalizedPhone.slice(1);
    }
    if (!normalizedPhone.startsWith("62")) {
      normalizedPhone = "62" + normalizedPhone;
    }

    // Validate length (62 + 9-12 digits)
    if (normalizedPhone.length < 11 || normalizedPhone.length > 15) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "INVALID_PHONE",
            message: "Format nomor WhatsApp tidak valid",
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
            message: "Nomor WhatsApp sudah terdaftar di akun lain",
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
            message: `Terlalu banyak percobaan. Coba lagi dalam ${hours} jam`,
            remaining_seconds: blockStatus[0].remaining_seconds,
          },
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Check cooldown for resend (1 minute between sends)
    const { data: recentSend } = await supabase
      .from("phone_otp")
      .select("created_at")
      .eq("phone_number", normalizedPhone)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (recentSend) {
      const lastSendTime = new Date(recentSend.created_at).getTime();
      const cooldownMs = 60 * 1000; // 1 minute
      const timeSinceLastSend = Date.now() - lastSendTime;

      if (timeSinceLastSend < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastSend) / 1000);
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "COOLDOWN",
              message: `Tunggu ${remainingSeconds} detik sebelum mengirim ulang`,
              remaining_seconds: remainingSeconds,
            },
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 4. Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // 5. Delete old OTPs for this phone
    await supabase.from("phone_otp").delete().eq("phone_number", normalizedPhone);

    // 6. Store new OTP
    const { error: insertError } = await supabase.from("phone_otp").insert({
      phone_number: normalizedPhone,
      otp_code: otpCode,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) throw insertError;

    // 7. Send via Fonnte
    const fonnteToken = Deno.env.get("FONNTE_API_TOKEN");
    
    if (!fonnteToken) {
      throw new Error("FONNTE_API_TOKEN not configured");
    }

    const message = `🔐 *Kode Verifikasi Sparkfluence*

Kode OTP Anda: *${otpCode}*

Kode berlaku 5 menit.
Jangan bagikan kode ini kepada siapapun.

_Jika Anda tidak meminta kode ini, abaikan pesan ini._`;

    const fonnteResponse = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: fonnteToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: normalizedPhone,
        message: message,
        countryCode: "62",
      }),
    });

    const fonnteResult = await fonnteResponse.json();

    if (!fonnteResult.status) {
      // Delete OTP if send failed
      await supabase.from("phone_otp").delete().eq("phone_number", normalizedPhone);
      throw new Error(fonnteResult.reason || "Failed to send WhatsApp message");
    }

    // 8. Log attempt
    await supabase.from("phone_otp_attempts").insert({
      phone_number: normalizedPhone,
      attempt_type: "send",
      success: true,
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          message: "Kode OTP telah dikirim ke WhatsApp",
          phone_masked: normalizedPhone.slice(0, 4) + "****" + normalizedPhone.slice(-4),
          expires_in: 300, // 5 minutes in seconds
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { 
          code: "INTERNAL_ERROR", 
          message: error.message || "Terjadi kesalahan. Coba lagi nanti." 
        },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
