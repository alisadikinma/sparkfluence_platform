import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { PhoneInput } from "../../components/ui/phone-input";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { supabase } from "../../lib/supabase";
import { Loader2, MessageSquare, Check, ArrowLeft, AlertCircle, Shield } from "lucide-react";
import { detectCountryFromTimezone } from "../../lib/countryDetection";

type WelcomeStep = "loading" | "verify-phone" | "otp" | "welcome";

export const Welcome = (): JSX.Element => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();

  // Step state
  const [step, setStep] = useState<WelcomeStep>("loading");
  
  // Phone verification state
  const [phoneInput, setPhoneInput] = useState("");
  const [fullPhoneNumber, setFullPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [phoneMasked, setPhoneMasked] = useState("");
  const [sentPhoneNumber, setSentPhoneNumber] = useState("");
  
  // Loading states
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  
  // Error states
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(3);

  // Check phone verification status on mount
  useEffect(() => {
    const checkPhoneVerification = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("phone_verified, phone_number")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile?.phone_verified) {
          setStep("welcome");
        } else {
          setStep("verify-phone");
        }
      } catch (err) {
        console.error("Error checking phone verification:", err);
        setStep("welcome");
      }
    };

    checkPhoneVerification();
  }, [user, navigate]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Send OTP
  const sendOtp = async () => {
    setError("");

    console.log("[SendOTP] fullPhoneNumber:", fullPhoneNumber);

    if (!fullPhoneNumber || fullPhoneNumber.length < 10) {
      setError(language === 'id' ? "Format nomor WhatsApp tidak valid" : "Invalid WhatsApp number format");
      return;
    }

    setSendingOtp(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("send-whatsapp-otp", {
        body: { phone_number: fullPhoneNumber }
      });

      if (fnError) throw fnError;

      if (data.success) {
        setPhoneMasked(data.data.phone_masked);
        setSentPhoneNumber(fullPhoneNumber);
        setCooldown(60);
        setAttemptsLeft(3);
        setStep("otp");
      } else {
        if (data.error.code === "COOLDOWN") {
          setCooldown(data.error.remaining_seconds);
        }
        setError(data.error.message);
      }
    } catch (err: any) {
      setError(err.message || (language === 'id' ? "Gagal mengirim OTP" : "Failed to send OTP"));
    } finally {
      setSendingOtp(false);
    }
  };

  // Verify OTP
  const verifyOtp = async () => {
    setError("");

    if (otpCode.length !== 6) {
      setError(language === 'id' ? "Kode OTP harus 6 digit" : "OTP code must be 6 digits");
      return;
    }

    setVerifyingOtp(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("verify-whatsapp-otp", {
        body: {
          phone_number: sentPhoneNumber,
          otp_code: otpCode,
          user_id: user?.id
        }
      });

      if (fnError) throw fnError;

      if (data.success) {
        const detectedCountry = detectCountryFromTimezone();
        
        await supabase
          .from("user_profiles")
          .upsert({
            user_id: user?.id,
            phone_number: data.data.phone_number,
            phone_verified: true,
            phone_verified_at: new Date().toISOString(),
            country: detectedCountry,
          }, { onConflict: 'user_id' });

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("onboarding_completed")
          .eq("user_id", user?.id)
          .maybeSingle();

        if (profile?.onboarding_completed) {
          navigate("/dashboard");
        } else {
          setStep("welcome");
        }
      } else {
        if (data.error.attempts_left !== undefined) {
          setAttemptsLeft(data.error.attempts_left);
        }
        setError(data.error.message);
      }
    } catch (err: any) {
      setError(err.message || (language === 'id' ? "Gagal verifikasi" : "Verification failed"));
    } finally {
      setVerifyingOtp(false);
    }
  };

  const skipVerification = () => {
    setStep("welcome");
  };

  const goBack = () => {
    setOtpCode("");
    setError("");
    setStep("verify-phone");
  };

  // Loading state
  if (step === "loading") {
    return (
      <main className="w-full min-h-screen flex items-center justify-center bg-[#0a0a12]">
        <Loader2 className="w-8 h-8 text-[#7c3aed] animate-spin" />
      </main>
    );
  }

  // Phone verification step
  if (step === "verify-phone" || step === "otp") {
    return (
      <main className="w-full min-h-screen flex items-center justify-center bg-[#0a0a12] relative overflow-hidden px-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#7c3aed]/20 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#ec4899]/20 via-transparent to-transparent"></div>

        <div className="w-full max-w-md relative z-10">
          <div className="bg-[#1a1a24]/80 backdrop-blur-2xl border border-[#2b2b38] rounded-2xl p-8 shadow-2xl">
            {/* Header with Steps */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-3 mb-6">
                <img className="w-10 h-10" alt="Logo" src="/logo.png" />
                <h1 className="text-xl font-semibold text-white">SPARKFLUENCE</h1>
              </div>
              
              {/* Step Indicator */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "verify-phone" ? "bg-[#22c55e]" : "bg-[#22c55e]"}`}>
                  <Check className="w-4 h-4 text-white" />
                </div>
                <div className={`w-12 h-0.5 ${step === "otp" ? "bg-[#22c55e]" : "bg-[#2b2b38]"}`} />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "otp" ? "bg-[#22c55e]" : "bg-[#7c3aed]"}`}>
                  {step === "otp" ? <Check className="w-4 h-4 text-white" /> : <span className="text-white text-sm font-medium">2</span>}
                </div>
                <div className="w-12 h-0.5 bg-[#2b2b38]" />
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#7c3aed]">
                  <span className="text-white text-sm font-medium">3</span>
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">
                {step === "verify-phone" 
                  ? (language === 'id' ? "Verifikasi WhatsApp" : "Verify WhatsApp")
                  : (language === 'id' ? "Masukkan Kode OTP" : "Enter OTP Code")}
              </h2>
              <p className="text-white/60 text-sm">
                {step === "verify-phone"
                  ? (language === 'id' ? "Amankan akun Anda dengan verifikasi WhatsApp" : "Secure your account with WhatsApp verification")
                  : (language === 'id' ? `Kode dikirim ke ${phoneMasked}` : `Code sent to ${phoneMasked}`)}
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

            {/* Phone Input Step */}
            {step === "verify-phone" && (
              <div className="space-y-5">
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
                    value={phoneInput}
                    onChange={(phone, dialCode, fullNum) => {
                      console.log("[Welcome] PhoneInput onChange - phone:", phone, "dialCode:", dialCode, "fullNum:", fullNum);
                      setPhoneInput(phone);
                      setFullPhoneNumber(fullNum);
                    }}
                    disabled={sendingOtp}
                    autoDetect={true}
                  />
                </div>

                <Button
                  onClick={sendOtp}
                  disabled={sendingOtp || cooldown > 0 || !phoneInput || phoneInput.length < 6}
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

                <button
                  onClick={skipVerification}
                  className="w-full text-center text-[#9ca3af] hover:text-white text-sm transition-colors"
                >
                  {language === 'id' ? 'Lewati untuk sekarang →' : 'Skip for now →'}
                </button>
              </div>
            )}

            {/* OTP Verification Step */}
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
                    type="text"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    disabled={verifyingOtp}
                    maxLength={6}
                    className="bg-[#0a0a12] border-[#2b2b38] text-white h-14 rounded-xl text-center text-2xl tracking-[0.5em] font-mono focus:border-[#7c3aed]"
                  />
                  <p className="text-white/40 text-xs text-center">
                    {language === 'id' ? 'Kode berlaku 5 menit' : 'Code valid for 5 minutes'}
                  </p>
                </div>

                {attemptsLeft < 3 && attemptsLeft > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                    <p className="text-amber-400 text-sm text-center">
                      ⚠️ {language === 'id' ? `Sisa ${attemptsLeft} percobaan` : `${attemptsLeft} attempts remaining`}
                    </p>
                  </div>
                )}

                <Button
                  onClick={verifyOtp}
                  disabled={verifyingOtp || otpCode.length !== 6}
                  className="w-full h-12 bg-gradient-to-r from-[#7c3aed] to-[#ec4899] hover:from-[#6d28d9] hover:to-[#d946ef] text-white font-semibold rounded-xl disabled:opacity-50"
                >
                  {verifyingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {language === 'id' ? 'Memverifikasi...' : 'Verifying...'}
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
                    onClick={sendOtp}
                    disabled={sendingOtp || cooldown > 0}
                    className="text-[#7c3aed] hover:text-[#6d28d9] font-medium text-sm disabled:opacity-50"
                  >
                    {cooldown > 0 
                      ? (language === 'id' ? `Kirim ulang (${cooldown}s)` : `Resend (${cooldown}s)`) 
                      : (language === 'id' ? 'Kirim ulang kode' : 'Resend code')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // Welcome step
  return (
    <main className="w-full min-h-screen flex items-center justify-center bg-[#0a0a12] relative overflow-hidden px-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#7c3aed]/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#ec4899]/20 via-transparent to-transparent"></div>

      <div className="max-w-3xl mx-auto text-center relative z-10">
        <div className="mb-12">
          <div className="inline-flex items-center gap-3 mb-8">
            <img className="w-12 h-12" alt="Logo" src="/logo.png" />
            <h1 className="text-2xl font-bold text-white">SPARKFLUENCE</h1>
          </div>

          <h2 className="text-5xl md:text-6xl font-bold text-white mb-8 leading-tight">
            {language === 'id' 
              ? <>Kami akan membantumu menjadi kreator dengan <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7c3aed] via-[#ec4899] to-[#06b6d4]">niche paling cocok</span>.</>
              : <>We'll help you become a creator with the{" "}<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7c3aed] via-[#ec4899] to-[#06b6d4]">most suitable niche</span>.</>
            }
          </h2>

          <p className="text-xl text-white/70 mb-12 leading-relaxed max-w-2xl mx-auto">
            {language === 'id'
              ? 'Cukup jawab beberapa pertanyaan sederhana, dan AI akan memberikan rekomendasi yang dipersonalisasi untuk perjalanan kreatifmu.'
              : 'Just answer a few simple questions, and the AI will give you personalized recommendations for your creative journey.'}
          </p>
        </div>

        <Button
          onClick={() => navigate("/onboarding")}
          className="h-14 px-12 bg-gradient-to-r from-[#7c3aed] to-[#ec4899] hover:from-[#6d28d9] hover:to-[#d946ef] text-white text-lg font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-[#7c3aed]/25 hover:shadow-xl hover:shadow-[#7c3aed]/30 hover:scale-105"
        >
          {language === 'id' ? 'Mulai' : 'Start'}
        </Button>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-[#1a1a24]/50 backdrop-blur-xl border border-[#2b2b38] rounded-2xl p-6">
            <div className="w-12 h-12 bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] rounded-xl flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">{language === 'id' ? 'Temukan Niche-mu' : 'Discover Your Niche'}</h3>
            <p className="text-white/60 text-sm">{language === 'id' ? 'Rekomendasi AI sesuai minatmu' : 'AI-powered recommendations tailored to your interests'}</p>
          </div>

          <div className="bg-[#1a1a24]/50 backdrop-blur-xl border border-[#2b2b38] rounded-2xl p-6">
            <div className="w-12 h-12 bg-gradient-to-br from-[#ec4899] to-[#d946ef] rounded-xl flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">{language === 'id' ? 'Cepat & Mudah' : 'Quick & Easy'}</h3>
            <p className="text-white/60 text-sm">{language === 'id' ? 'Beberapa pertanyaan untuk memulai' : 'Just a few questions to get started on your journey'}</p>
          </div>

          <div className="bg-[#1a1a24]/50 backdrop-blur-xl border border-[#2b2b38] rounded-2xl p-6">
            <div className="w-12 h-12 bg-gradient-to-br from-[#06b6d4] to-[#0891b2] rounded-xl flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">{language === 'id' ? 'Jalur Personal' : 'Personalized Path'}</h3>
            <p className="text-white/60 text-sm">{language === 'id' ? 'Roadmap yang disesuaikan untukmu' : 'Get a customized roadmap for your content creation'}</p>
          </div>
        </div>
      </div>
    </main>
  );
};
