import { EyeIcon, Sparkles, Zap, Video, Calendar, Loader2, MessageSquare, ArrowLeft, Check, AlertCircle } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { PhoneInput } from "../../components/ui/phone-input";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { supabase } from "../../lib/supabase";
import { detectCountryFromTimezone } from "../../lib/countryDetection";

type RegistrationStep = "credentials" | "phone" | "otp";

export const Register = (): JSX.Element => {
  const navigate = useNavigate();
  const { signUp, signInWithGoogle } = useAuth();
  const { t, language } = useLanguage();
  
  // Step State
  const [step, setStep] = useState<RegistrationStep>("credentials");
  
  // Credentials State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Phone State
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dialCode, setDialCode] = useState("62");
  const [fullPhoneNumber, setFullPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  
  // Loading States
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  
  // Error & UI States
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [phoneMasked, setPhoneMasked] = useState("");

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Step 1: Validate credentials and move to phone step
  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password || !confirmPassword) {
      setError(t.errors.validation.required);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.errors.validation.passwordMatch);
      return;
    }

    if (password.length < 6) {
      setError(t.errors.validation.password);
      return;
    }

    // Move to phone step
    setStep("phone");
  };

  // Step 2: Send OTP to phone
  const sendOtp = async () => {
    setError(null);

    // Validate phone - use fullPhoneNumber which has country code
    if (!fullPhoneNumber || fullPhoneNumber.length < 10) {
      setError(language === 'id' ? "Format nomor WhatsApp tidak valid" : "Invalid WhatsApp number format");
      return;
    }

    setSendingOtp(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("send-whatsapp-otp", {
        body: { phone_number: fullPhoneNumber }
      });

      // Extract error message from response or fnError context
      if (fnError) {
        // Try to get detailed error from context
        try {
          const body = fnError.context?.body;
          const errorBody = typeof body === 'string' ? JSON.parse(body) : body;
          if (errorBody?.error?.message) {
            setError(errorBody.error.message);
            setSendingOtp(false);
            return;
          }
        } catch (parseErr) {
          console.warn('[Register] Could not parse error body:', parseErr);
        }
        throw fnError;
      }

      if (data.success) {
        setPhoneMasked(data.data.phone_masked);
        setCooldown(60);
        setAttemptsLeft(3);
        setStep("otp");
      } else {
        if (data.error.code === "COOLDOWN") {
          setCooldown(data.error.remaining_seconds);
        } else if (data.error.code === "RATE_LIMITED") {
          setCooldown(data.error.remaining_seconds || 86400);
        }
        setError(data.error.message);
      }
    } catch (err: any) {
      console.error("Error sending OTP:", err);
      setError(err.message || (language === 'id' ? "Gagal mengirim OTP. Coba lagi." : "Failed to send OTP. Try again."));
    } finally {
      setSendingOtp(false);
    }
  };

  // Auto-verify when 6 digits entered
  useEffect(() => {
    if (otpCode.length === 6 && !verifyingOtp && !loading) {
      verifyOtp();
    }
  }, [otpCode]);

  // Step 3: Verify OTP
  const verifyOtp = async () => {
    setError(null);

    if (otpCode.length !== 6) {
      setError(language === 'id' ? "Kode OTP harus 6 digit" : "OTP code must be 6 digits");
      return;
    }

    setVerifyingOtp(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("verify-whatsapp-otp", {
        body: {
          phone_number: fullPhoneNumber,
          otp_code: otpCode
        }
      });

      // Extract error message from response or fnError context
      if (fnError) {
        // Try to get detailed error from context
        try {
          const body = fnError.context?.body;
          const errorBody = typeof body === 'string' ? JSON.parse(body) : body;
          if (errorBody?.error?.message) {
            setError(errorBody.error.message);
            setVerifyingOtp(false);
            return;
          }
        } catch (parseErr) {
          console.warn('[Register] Could not parse error body:', parseErr);
        }
        throw fnError;
      }

      if (data.success) {
        setPhoneVerified(true);
        await createAccount(data.data.phone_number);
      } else {
        if (data.error.attempts_left !== undefined) {
          setAttemptsLeft(data.error.attempts_left);
        }
        if (data.error.code === "RATE_LIMITED") {
          setCooldown(data.error.remaining_seconds || 86400);
        }
        setError(data.error.message);
      }
    } catch (err: any) {
      console.error("Error verifying OTP:", err);
      setError(err.message || (language === 'id' ? "Gagal verifikasi. Coba lagi." : "Verification failed. Try again."));
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Final: Create account after phone verified
  const createAccount = async (verifiedPhone: string) => {
    setLoading(true);
    setError(null);

    try {
      // SignUp returns session if email confirmation is disabled
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        // If user already exists, try to sign in instead
        if (signUpError.message.includes('already registered')) {
          setError(language === 'id' 
            ? 'Email sudah terdaftar. Silakan login.' 
            : 'Email already registered. Please login.');
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
        return;
      }

      const user = signUpData?.user;
      if (!user) {
        setError(language === 'id' ? 'Gagal membuat akun' : 'Failed to create account');
        setLoading(false);
        return;
      }

      console.log('[Register] SignUp successful, user:', user.id);
      console.log('[Register] Session:', signUpData?.session ? 'Yes' : 'No');

      // Auto-detect country from timezone
      const detectedCountry = detectCountryFromTimezone();
      console.log('[Register] Detected country:', detectedCountry);

      // If no session from signUp (email confirmation enabled), try to sign in
      if (!signUpData?.session) {
        console.log('[Register] No session from signUp, trying auto sign-in...');
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          console.error('[Register] Auto sign-in error:', signInError.message);
          // If email confirmation required, still continue to update profile
          // User will need to confirm email then login
        } else {
          console.log('[Register] Auto sign-in successful');
        }
      }

      // Wait a moment for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update profile with phone verification data (trigger creates profile automatically)
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({
          phone_number: verifiedPhone,
          phone_verified: true,
          phone_verified_at: new Date().toISOString(),
          country: detectedCountry,
        })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Profile update error:", updateError);
        // If update fails, try upsert as fallback
        const { error: upsertError } = await supabase
          .from("user_profiles")
          .upsert({
            user_id: user.id,
            phone_number: verifiedPhone,
            phone_verified: true,
            phone_verified_at: new Date().toISOString(),
            onboarding_completed: false,
            country: detectedCountry,
          }, { onConflict: 'user_id' });
          
        if (upsertError) {
          console.error("Profile upsert error:", upsertError);
        }
      }

      // Check if we have a valid session now
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (sessionData?.session) {
        console.log('[Register] Session valid, navigating to welcome');
        navigate("/welcome");
      } else {
        // No session - email confirmation might be required
        console.log('[Register] No session - email confirmation may be required');
        setError(language === 'id' 
          ? 'Akun berhasil dibuat! Silakan cek email untuk konfirmasi, lalu login.'
          : 'Account created! Please check your email to confirm, then login.');
        // Navigate to login after 3 seconds
        setTimeout(() => navigate("/login"), 3000);
      }
    } catch (err: any) {
      setError(err.message || t.errors.general);
    } finally {
      setLoading(false);
    }
  };

  // Go back to previous step
  const goBack = () => {
    setError(null);
    if (step === "otp") {
      setOtpCode("");
      setStep("phone");
    } else if (step === "phone") {
      setStep("credentials");
    }
  };

  // Resend OTP
  const resendOtp = () => {
    setOtpCode("");
    sendOtp();
  };

  return (
    <main className="w-full min-h-screen flex bg-[#0a0a12] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#7c3aed]/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-[#ec4899]/20 via-transparent to-transparent"></div>

      {/* Left Side - Features (hidden on mobile) */}
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
              {language === 'id' ? 'Bergabung dengan Masa Depan' : 'Join the Future of'}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7c3aed] via-[#ec4899] to-[#06b6d4]">
                {language === 'id' ? 'Kreasi Konten' : 'Content Creation'}
              </span>
            </h2>
            <p className="text-xl text-white/70 mb-12">
              {language === 'id' 
                ? 'Daftar hari ini dan buka akses ke tools AI yang membantu Anda membuat, menjadwalkan, dan mengembangkan konten dengan mudah.'
                : 'Sign up today and unlock powerful AI tools that help you create, schedule, and grow your content effortlessly.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="group bg-[#1a1a24]/50 backdrop-blur-xl border border-[#2b2b38] rounded-2xl p-6 hover:border-[#7c3aed]/50 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] rounded-xl flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{language === 'id' ? 'Ide Berbasis AI' : 'AI-Powered Ideas'}</h3>
              <p className="text-sm text-white/60">{language === 'id' ? 'Dapatkan saran konten sesuai niche Anda' : 'Get personalized content suggestions based on your niche'}</p>
            </div>

            <div className="group bg-[#1a1a24]/50 backdrop-blur-xl border border-[#2b2b38] rounded-2xl p-6 hover:border-[#ec4899]/50 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-[#ec4899] to-[#d946ef] rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{language === 'id' ? 'Pembuatan Instan' : 'Instant Generation'}</h3>
              <p className="text-sm text-white/60">{language === 'id' ? 'Buat video dan gambar dalam hitungan detik' : 'Create videos and images in seconds, not hours'}</p>
            </div>

            <div className="group bg-[#1a1a24]/50 backdrop-blur-xl border border-[#2b2b38] rounded-2xl p-6 hover:border-[#06b6d4]/50 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-[#06b6d4] to-[#0891b2] rounded-xl flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{language === 'id' ? 'Dukungan Multi-Platform' : 'Multi-Platform Support'}</h3>
              <p className="text-sm text-white/60">{language === 'id' ? 'Optimasi untuk TikTok, Instagram, dan YouTube' : 'Optimize for TikTok, Instagram, and YouTube'}</p>
            </div>

            <div className="group bg-[#1a1a24]/50 backdrop-blur-xl border border-[#2b2b38] rounded-2xl p-6 hover:border-[#f59e0b]/50 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-[#f59e0b] to-[#d97706] rounded-xl flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{language === 'id' ? 'Kalender Konten' : 'Content Calendar'}</h3>
              <p className="text-sm text-white/60">{language === 'id' ? 'Rencanakan berminggu-minggu dengan penjadwalan cerdas' : 'Plan weeks ahead with our smart scheduling'}</p>
            </div>
          </div>

          <div className="mt-8 bg-gradient-to-r from-[#7c3aed]/20 to-[#ec4899]/20 border border-[#7c3aed]/30 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#7c3aed] to-[#ec4899] rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-1">{language === 'id' ? 'Mulai Gratis, Upgrade Kapan Saja' : 'Start Free, Upgrade Anytime'}</h4>
                <p className="text-white/60 text-sm">{language === 'id' ? 'Mulai dengan paket gratis dan tingkatkan seiring pertumbuhan. Tidak perlu kartu kredit.' : 'Begin with our free plan and scale as you grow. No credit card required.'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 relative z-10">
        <div className="w-full max-w-md">
          <div className="bg-[#1a1a24]/80 backdrop-blur-2xl border border-[#2b2b38] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl">
            
            {/* Header */}
            <div className="text-center mb-8">
              <button
                onClick={() => navigate("/")}
                className="inline-flex items-center gap-3 mb-4 lg:hidden hover:opacity-80 transition-opacity"
              >
                <img className="w-10 h-10" alt="Logo" src="/logo.png" />
                <h1 className="text-xl font-semibold text-white">SPARKFLUENCE</h1>
              </button>
              
              {/* Step Indicator */}
              <div className="flex items-center justify-center gap-2 mb-4">
                {["credentials", "phone", "otp"].map((s, i) => (
                  <React.Fragment key={s}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      step === s 
                        ? "bg-[#7c3aed] text-white" 
                        : ["credentials", "phone", "otp"].indexOf(step) > i
                          ? "bg-green-500 text-white"
                          : "bg-[#2b2b38] text-[#9ca3af]"
                    }`}>
                      {["credentials", "phone", "otp"].indexOf(step) > i ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    {i < 2 && (
                      <div className={`w-12 h-1 rounded ${
                        ["credentials", "phone", "otp"].indexOf(step) > i 
                          ? "bg-green-500" 
                          : "bg-[#2b2b38]"
                      }`} />
                    )}
                  </React.Fragment>
                ))}
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                {step === "credentials" && t.auth.register.title}
                {step === "phone" && (language === 'id' ? "Verifikasi WhatsApp" : "WhatsApp Verification")}
                {step === "otp" && (language === 'id' ? "Masukkan Kode OTP" : "Enter OTP Code")}
              </h2>
              <p className="text-white/60 text-sm">
                {step === "credentials" && t.auth.register.subtitle}
                {step === "phone" && (language === 'id' ? "Verifikasi nomor untuk keamanan akun" : "Verify your number for account security")}
                {step === "otp" && (language === 'id' ? `Kode dikirim ke ${phoneMasked}` : `Code sent to ${phoneMasked}`)}
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Step 1: Credentials */}
            {step === "credentials" && (
              <form onSubmit={handleCredentialsSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-white text-sm font-medium">{t.common.email}</label>
                  <Input
                    type="email"
                    placeholder={t.auth.register.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-[#0a0a12] border-[#2b2b38] text-white placeholder:text-white/40 h-12 rounded-xl focus:border-[#7c3aed] focus:ring-[#7c3aed]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-white text-sm font-medium">{t.common.password}</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={t.auth.register.passwordPlaceholder}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-[#0a0a12] border-[#2b2b38] text-white placeholder:text-white/40 h-12 rounded-xl pr-12 focus:border-[#7c3aed] focus:ring-[#7c3aed]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                    >
                      <EyeIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-white/40">{language === 'id' ? 'Minimal 6 karakter' : 'Minimum 6 characters'}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-white text-sm font-medium">{t.common.confirmPassword}</label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder={t.auth.register.confirmPasswordPlaceholder}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="bg-[#0a0a12] border-[#2b2b38] text-white placeholder:text-white/40 h-12 rounded-xl pr-12 focus:border-[#7c3aed] focus:ring-[#7c3aed]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                    >
                      <EyeIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-[#7c3aed] to-[#ec4899] hover:from-[#6d28d9] hover:to-[#d946ef] text-white font-semibold rounded-xl"
                >
                  {t.common.continue}
                </Button>
              </form>
            )}

            {/* Step 2: Phone Number */}
            {step === "phone" && (
              <div className="space-y-5">
                <button
                  onClick={goBack}
                  className="flex items-center gap-2 text-[#9ca3af] hover:text-white transition-colors text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t.common.back}
                </button>

                <div className="bg-[#25D366]/10 border border-[#25D366]/30 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#25D366] rounded-full flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{language === 'id' ? 'Verifikasi via WhatsApp' : 'Verify via WhatsApp'}</p>
                      <p className="text-white/60 text-sm">{language === 'id' ? 'Kami akan mengirim kode 6 digit' : 'We will send a 6-digit code'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-white text-sm font-medium">{language === 'id' ? 'Nomor WhatsApp' : 'WhatsApp Number'}</label>
                  <PhoneInput
                    value={phoneNumber}
                    onChange={(phone, dial, fullNum) => {
                      setPhoneNumber(phone);
                      setDialCode(dial);
                      setFullPhoneNumber(fullNum);
                    }}
                    disabled={sendingOtp}
                    autoDetect={true}
                  />
                </div>

                <Button
                  onClick={sendOtp}
                  disabled={sendingOtp || cooldown > 0 || !fullPhoneNumber || fullPhoneNumber.length < 10}
                  className="w-full h-12 bg-[#25D366] hover:bg-[#1ea952] text-white font-semibold rounded-xl disabled:opacity-50"
                >
                  {sendingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {language === 'id' ? 'Mengirim...' : 'Sending...'}
                    </>
                  ) : cooldown > 0 ? (
                    language === 'id' ? `Tunggu ${cooldown} detik` : `Wait ${cooldown} seconds`
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      {language === 'id' ? 'Kirim Kode OTP' : 'Send OTP Code'}
                    </>
                  )}
                </Button>

                <p className="text-center text-white/40 text-xs">
                  {t.auth.register.terms}{" "}
                  <a href="#" className="text-[#7c3aed]">{t.auth.register.termsLink}</a>
                </p>
              </div>
            )}

            {/* Step 3: OTP Verification */}
            {step === "otp" && (
              <div className="space-y-5">
                <button
                  onClick={goBack}
                  className="flex items-center gap-2 text-[#9ca3af] hover:text-white transition-colors text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {language === 'id' ? 'Ganti nomor' : 'Change number'}
                </button>

                <div className="space-y-2">
                  <label className="text-white text-sm font-medium">{language === 'id' ? 'Kode OTP' : 'OTP Code'}</label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    placeholder="••••••"
                    value={otpCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setOtpCode(value);
                    }}
                    disabled={verifyingOtp || loading}
                    maxLength={6}
                    autoComplete="one-time-code"
                    className="bg-[#0a0a12] border-[#2b2b38] text-white h-14 rounded-xl text-center text-2xl tracking-[0.5em] font-mono focus:border-[#7c3aed]"
                  />
                  <p className="text-white/40 text-xs text-center">
                    {language === 'id' ? 'Kode berlaku 5 menit' : 'Code valid for 5 minutes'}
                  </p>
                </div>

                {/* Attempts Warning */}
                {attemptsLeft < 3 && attemptsLeft > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                    <p className="text-amber-400 text-sm text-center">
                      ⚠️ {language === 'id' ? `Sisa ${attemptsLeft} percobaan` : `${attemptsLeft} attempts remaining`}
                    </p>
                  </div>
                )}

                <Button
                  onClick={verifyOtp}
                  disabled={verifyingOtp || loading || otpCode.length !== 6}
                  className="w-full h-12 bg-gradient-to-r from-[#7c3aed] to-[#ec4899] hover:from-[#6d28d9] hover:to-[#d946ef] text-white font-semibold rounded-xl disabled:opacity-50"
                >
                  {verifyingOtp || loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {loading 
                        ? (language === 'id' ? 'Membuat akun...' : 'Creating account...') 
                        : (language === 'id' ? 'Memverifikasi...' : 'Verifying...')}
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {language === 'id' ? 'Verifikasi & Daftar' : 'Verify & Register'}
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <p className="text-white/60 text-sm mb-2">{language === 'id' ? 'Tidak menerima kode?' : "Didn't receive code?"}</p>
                  <button
                    onClick={resendOtp}
                    disabled={sendingOtp || cooldown > 0}
                    className="text-[#7c3aed] hover:text-[#6d28d9] font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cooldown > 0 
                      ? (language === 'id' ? `Kirim ulang (${cooldown}s)` : `Resend (${cooldown}s)`) 
                      : (language === 'id' ? 'Kirim ulang kode' : 'Resend code')}
                  </button>
                </div>
              </div>
            )}

            {/* Divider - Only on credentials step */}
            {step === "credentials" && (
              <>
                <div className="mt-8">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#2b2b38]"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-[#1a1a24] text-white/60">{t.auth.register.orContinueWith}</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={signInWithGoogle}
                    variant="outline"
                    className="w-full h-12 bg-[#0a0a12] border-[#2b2b38] hover:bg-[#2b2b38] hover:border-[#4e5562] transition-all rounded-xl flex items-center justify-center gap-3 mt-6"
                  >
                    <img src="/material-icon-theme-google.svg" alt="Google" className="w-5 h-5" />
                    <span className="text-white font-medium">{t.auth.register.google}</span>
                  </Button>
                </div>

                <p className="text-center text-white/60 text-sm mt-8">
                  {t.auth.register.hasAccount}{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="text-[#7c3aed] hover:text-[#6d28d9] font-semibold transition-colors"
                  >
                    {t.auth.register.signInLink}
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};
