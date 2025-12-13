import React, { useState, useEffect } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { supabase } from "../../lib/supabase";

export const Login = (): JSX.Element => {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, user, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    const checkAndRedirect = async () => {
      if (!authLoading && user) {
        console.log('[Login] User already authenticated, checking phone verification...');
        
        // Check phone verification status
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("onboarding_completed, phone_verified")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!profile?.phone_verified || !profile?.onboarding_completed) {
          console.log('[Login] Phone not verified or onboarding incomplete, redirecting to welcome');
          navigate('/welcome', { replace: true });
        } else {
          console.log('[Login] All verified, redirecting to dashboard');
          navigate('/dashboard', { replace: true });
        }
      }
    };

    checkAndRedirect();
  }, [user, authLoading, navigate]);

  const validateForm = (): boolean => {
    if (!email.trim()) {
      setError(t.errors.validation.required);
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t.errors.validation.email);
      return false;
    }
    if (!password) {
      setError(t.errors.validation.required);
      return false;
    }
    if (password.length < 6) {
      setError(t.errors.validation.password);
      return false;
    }
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const { user, error: authError } = await signIn(email, password);
      
      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          setError(t.errors.auth.invalidCredentials);
        } else if (authError.message.includes("Email not confirmed")) {
          setError(language === 'id' ? 'Silakan verifikasi email Anda sebelum masuk.' : 'Please verify your email before signing in.');
        } else {
          setError(authError.message);
        }
        return;
      }

      if (!user) {
        setError(t.errors.general);
        return;
      }

      // Check onboarding status and phone verification
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("onboarding_completed, phone_verified")
        .eq("user_id", user.id)
        .maybeSingle();

      // Redirect based on status
      // Priority: phone verification > onboarding > dashboard
      if (!profile?.phone_verified) {
        // Need to verify phone first
        navigate("/welcome");
      } else if (!profile?.onboarding_completed) {
        // Phone verified but onboarding not complete
        navigate("/welcome");
      } else {
        // All done, go to dashboard
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || t.errors.general);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || t.errors.general);
      setGoogleLoading(false);
    }
  };

  return (
    <main className="w-full min-h-screen flex bg-[#0a0a12] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#7c3aed]/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-[#ec4899]/20 via-transparent to-transparent"></div>

      <div className="hidden lg:flex flex-1 items-center justify-end pr-8 xl:pr-16 p-12 relative z-10">
        <div className="max-w-xl">
          <div className="mb-8">
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-3 mb-6 hover:opacity-80 transition-opacity"
            >
              <img className="w-10 h-10" alt="Logo" src="/logo.png" />
              <h1 className="text-xl font-semibold text-white">SPARKFLUENCE</h1>
            </button>
            <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
              {language === 'id' ? 'Buat Konten Luar Biasa dengan' : 'Create Amazing Content with'}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7c3aed] via-[#ec4899] to-[#06b6d4]">
                {language === 'id' ? 'AI-Powered Tools' : 'AI-Powered Tools'}
              </span>
            </h2>
            <p className="text-xl text-white/70 mb-12">
              {language === 'id' 
                ? 'Ubah visi kreatif Anda menjadi kenyataan dengan rangkaian tools cerdas kami yang dirancang untuk kreator konten modern.'
                : 'Transform your creative vision into reality with our suite of intelligent tools designed for modern content creators.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="group bg-[#1a1a24]/50 backdrop-blur-xl border border-[#2b2b38] rounded-2xl p-6 hover:border-[#7c3aed]/50 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{language === 'id' ? 'Penulisan Skrip AI' : 'AI Script Writing'}</h3>
              <p className="text-sm text-white/60">{language === 'id' ? 'Buat skrip menarik dalam hitungan detik' : 'Generate compelling scripts in seconds'}</p>
            </div>

            <div className="group bg-[#1a1a24]/50 backdrop-blur-xl border border-[#2b2b38] rounded-2xl p-6 hover:border-[#ec4899]/50 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-[#ec4899] to-[#d946ef] rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{language === 'id' ? 'Pembuatan Gambar' : 'Image Generation'}</h3>
              <p className="text-sm text-white/60">{language === 'id' ? 'Buat visual menakjubkan dengan AI' : 'Create stunning visuals with AI'}</p>
            </div>

            <div className="group bg-[#1a1a24]/50 backdrop-blur-xl border border-[#2b2b38] rounded-2xl p-6 hover:border-[#06b6d4]/50 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-[#06b6d4] to-[#0891b2] rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{language === 'id' ? 'Pembuatan Video' : 'Video Creation'}</h3>
              <p className="text-sm text-white/60">{language === 'id' ? 'Produksi video profesional dengan mudah' : 'Produce professional videos effortlessly'}</p>
            </div>

            <div className="group bg-[#1a1a24]/50 backdrop-blur-xl border border-[#2b2b38] rounded-2xl p-6 hover:border-[#f59e0b]/50 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-[#f59e0b] to-[#d97706] rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{language === 'id' ? 'Penjadwalan Cerdas' : 'Smart Scheduling'}</h3>
              <p className="text-sm text-white/60">{language === 'id' ? 'Rencanakan dan otomatisasi konten Anda' : 'Plan and automate your content'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 relative z-10">
        <div className="w-full max-w-md">
          <div className="bg-[#1a1a24]/80 backdrop-blur-2xl border border-[#2b2b38] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="text-center mb-8">
              <button
                onClick={() => navigate("/")}
                className="inline-flex items-center gap-3 mb-4 lg:hidden hover:opacity-80 transition-opacity"
              >
                <img className="w-10 h-10" alt="Logo" src="/logo.png" />
                <h1 className="text-xl font-semibold text-white">SPARKFLUENCE</h1>
              </button>
              <h2 className="text-3xl font-bold text-white mb-2">{t.auth.login.title}</h2>
              <p className="text-white/60">{t.auth.login.subtitle}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-white text-sm font-medium">
                  {t.common.email}
                </Label>
                <Input
                  type="email"
                  placeholder={t.auth.login.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  className="bg-[#0a0a12] border-[#2b2b38] text-white placeholder:text-white/40 h-12 rounded-xl focus:border-[#7c3aed] focus:ring-[#7c3aed] transition-colors disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white text-sm font-medium">
                  {t.common.password}
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder={t.auth.login.passwordPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    minLength={6}
                    className="bg-[#0a0a12] border-[#2b2b38] text-white placeholder:text-white/40 h-12 rounded-xl pr-12 focus:border-[#7c3aed] focus:ring-[#7c3aed] transition-colors disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-white/60 cursor-pointer">
                  <input type="checkbox" className="rounded border-[#2b2b38] bg-[#0a0a12] text-[#7c3aed] focus:ring-[#7c3aed]" />
                  {t.auth.login.rememberMe}
                </label>
                <button type="button" className="text-[#7c3aed] hover:text-[#6d28d9] transition-colors">
                  {t.auth.login.forgotPassword}
                </button>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-[#7c3aed] to-[#ec4899] hover:from-[#6d28d9] hover:to-[#d946ef] text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-[#7c3aed]/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t.common.loading : t.auth.login.button}
              </Button>
            </form>

            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#2b2b38]"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-[#1a1a24] text-white/60">{t.auth.login.orContinueWith}</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                variant="outline"
                className="w-full h-12 bg-[#0a0a12] border-[#2b2b38] hover:bg-[#2b2b38] hover:border-[#4e5562] transition-all rounded-xl flex items-center justify-center gap-3 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {googleLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                <span className="text-white font-medium">
                  {googleLoading ? t.common.loading : t.auth.login.google}
                </span>
              </Button>
            </div>

            <p className="text-center text-white/60 text-sm mt-8">
              {t.auth.login.noAccount}{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="text-[#7c3aed] hover:text-[#6d28d9] font-semibold transition-colors"
              >
                {t.auth.login.signUpLink}
              </button>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};
