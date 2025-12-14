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

    const { phone_number, otp_code, user_id } = await req.json();

    // Validate inputs
    if (!phone_number || !otp_code) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "MISSING_PARAMS",
            message: "Nomor telepon dan kode OTP wajib diisi",
          },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize phone - remove non-digits, keep country code as-is
    // Must match logic in send-whatsapp-otp to ensure OTP lookup works
    let normalizedPhone = phone_number.replace(/\D/g, "");
    
    // DEBUG: Log normalized phone
    console.log("[VERIFY-OTP] Normalized phone:", normalizedPhone);

    // Normalize OTP (remove spaces)
    const normalizedOtp = otp_code.replace(/\s/g, "");

    // 1. Check rate limit (blocked after 3 fails)
    const { data: blockStatus } = await supabase.rpc("is_phone_blocked", {
      p_phone: normalizedPhone,
    });

    if (blockStatus?.[0]?.blocked) {
      const hours = Math.ceil(blockStatus[0].remaining_seconds / 3600);
      const minutes = Math.ceil((blockStatus[0].remaining_seconds % 3600) / 60);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: hours > 0 
              ? `Terlalu banyak percobaan salah. Coba lagi dalam ${hours} jam ${minutes} menit`
              : `Terlalu banyak percobaan salah. Coba lagi dalam ${minutes} menit`,
            remaining_seconds: blockStatus[0].remaining_seconds,
            attempts_left: 0,
          },
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get OTP from database
    const { data: otpData, error: otpError } = await supabase
      .from("phone_otp")
      .select("*")
      .eq("phone_number", normalizedPhone)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "OTP_EXPIRED",
            message: "Kode OTP sudah kadaluarsa atau tidak ditemukan. Silakan minta kode baru.",
          },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Verify OTP
    if (otpData.otp_code !== normalizedOtp) {
      // Log failed attempt
      await supabase.from("phone_otp_attempts").insert({
        phone_number: normalizedPhone,
        attempt_type: "verify",
        success: false,
      });

      // Calculate remaining attempts
      const currentFailCount = blockStatus?.[0]?.fail_count || 0;
      const newFailCount = currentFailCount + 1;
      const attemptsLeft = Math.max(0, 3 - newFailCount);

      let errorMessage = "";
      if (attemptsLeft > 0) {
        errorMessage = `Kode OTP salah. Sisa ${attemptsLeft} percobaan lagi.`;
      } else {
        errorMessage = "Kode OTP salah. Anda telah diblokir selama 24 jam karena terlalu banyak percobaan salah.";
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "INVALID_OTP",
            message: errorMessage,
            attempts_left: attemptsLeft,
          },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. OTP valid - Mark as verified
    await supabase
      .from("phone_otp")
      .update({ verified: true })
      .eq("id", otpData.id);

    // 5. Update user profile if user_id provided
    if (user_id) {
      // Double-check phone isn't already registered to another user
      const { data: existingUser } = await supabase
        .from("user_profiles")
        .select("user_id")
        .eq("phone_number", normalizedPhone)
        .eq("phone_verified", true)
        .neq("user_id", user_id)
        .single();

      if (existingUser) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "PHONE_TAKEN",
              message: "Nomor ini sudah digunakan oleh akun lain",
            },
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          phone_number: normalizedPhone,
          phone_verified: true,
          phone_verified_at: new Date().toISOString(),
        })
        .eq("user_id", user_id);

      if (updateError) {
        console.error("Error updating user profile:", updateError);
        throw new Error("Gagal menyimpan verifikasi. Coba lagi.");
      }
    }

    // 6. Log success
    await supabase.from("phone_otp_attempts").insert({
      phone_number: normalizedPhone,
      attempt_type: "verify",
      success: true,
    });

    // 7. Clear failed attempts for this phone (reset counter on success)
    await supabase
      .from("phone_otp_attempts")
      .delete()
      .eq("phone_number", normalizedPhone)
      .eq("success", false);

    // 8. Clear all OTPs for this phone
    await supabase
      .from("phone_otp")
      .delete()
      .eq("phone_number", normalizedPhone);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          message: "Nomor WhatsApp berhasil diverifikasi! 🎉",
          phone_number: normalizedPhone,
          verified: true,
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
