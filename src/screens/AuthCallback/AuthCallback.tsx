import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { Loader2 } from "lucide-react";
import { detectCountryFromTimezone } from "../../lib/countryDetection";

/**
 * AuthCallback handles redirect after OAuth (Google) login.
 * Parses hash fragment and sets session, then redirects based on user status.
 */
export const AuthCallback = (): JSX.Element => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Memverifikasi akun...");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus("Memproses login...");
        
        // Get session from URL hash (Supabase puts tokens in hash fragment)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[AuthCallback] Session error:', sessionError);
          setStatus("Error: " + sessionError.message);
          setTimeout(() => navigate("/login"), 2000);
          return;
        }

        if (!session) {
          console.log('[AuthCallback] No session found, waiting...');
          setStatus("Menunggu autentikasi...");
          
          // Wait and retry once
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          
          if (!retrySession) {
            console.log('[AuthCallback] Still no session, redirecting to login');
            navigate("/login");
            return;
          }
          
          await processUser(retrySession.user);
        } else {
          await processUser(session.user);
        }
      } catch (err) {
        console.error("[AuthCallback] Error:", err);
        setStatus("Terjadi kesalahan");
        setTimeout(() => navigate("/login"), 2000);
      }
    };

    const processUser = async (user: any) => {
      setStatus("Memeriksa profil...");
      
      try {
        // Check user profile
        const { data: profile, error } = await supabase
          .from("user_profiles")
          .select("onboarding_completed, phone_verified")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("[AuthCallback] Profile error:", error);
        }

        // Auto-detect country
        const detectedCountry = detectCountryFromTimezone();

        // Create profile if doesn't exist
        if (!profile) {
          console.log('[AuthCallback] Creating new profile for OAuth user');
          setStatus("Membuat profil baru...");
          
          await supabase.from("user_profiles").insert({
            user_id: user.id,
            first_login: true,
            onboarding_completed: false,
            phone_verified: false,
            country: detectedCountry,
          });
          
          navigate("/welcome");
          return;
        }

        // Redirect based on status
        if (!profile.phone_verified) {
          console.log('[AuthCallback] Phone not verified');
          navigate("/welcome");
        } else if (!profile.onboarding_completed) {
          console.log('[AuthCallback] Onboarding not complete');
          navigate("/welcome");
        } else {
          console.log('[AuthCallback] All complete, going to dashboard');
          navigate("/dashboard");
        }
      } catch (err) {
        console.error("[AuthCallback] Process error:", err);
        navigate("/welcome");
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <main className="w-full min-h-screen flex items-center justify-center bg-page">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
        <p className="text-text-secondary">{status}</p>
      </div>
    </main>
  );
};
