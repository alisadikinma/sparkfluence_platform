import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Logo } from "../../components/ui/logo";

export const AvatarPreview = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as { avatarUrl?: string };
    if (state?.avatarUrl) {
      setAvatarUrl(state.avatarUrl);
    } else {
      navigate("/avatar-upload");
    }
  }, [location, navigate]);

  const handleNext = () => {
    navigate("/content-curation", {
      state: location.state
    });
  };

  const handleBack = () => {
    navigate("/avatar-upload");
  };

  if (!avatarUrl) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <div className="mb-12">
          <div className="flex justify-center mb-6">
            <Logo />
          </div>
          <div className="flex gap-2 mb-8 justify-center">
            <div className="h-1 w-16 bg-[#7c3aed] rounded-full" />
            <div className="h-1 w-16 bg-[#7c3aed] rounded-full" />
            <div className="h-1 w-16 bg-[#7c3aed] rounded-full" />
            <div className="h-1 w-16 bg-[#7c3aed] rounded-full" />
            <div className="h-1 w-16 bg-[#7c3aed] rounded-full" />
            <div className="h-1 w-16 bg-white/20 rounded-full" />
          </div>

          <h1 className="text-3xl font-bold text-white text-center mb-3">
            Your Avatar is Ready!
          </h1>
          <p className="text-white/60 text-center text-sm max-w-2xl mx-auto">
            This is how your avatar will appear across the platform. You can change it anytime from settings.
          </p>
        </div>

        <div className="relative mb-12">
          <div className="absolute inset-0 bg-gradient-to-br from-[#7c3aed]/30 to-[#ec4899]/30 rounded-full blur-3xl"></div>

          <div className="relative flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#7c3aed] to-[#ec4899] rounded-full blur-xl opacity-50 animate-pulse"></div>

              <div className="relative w-80 h-80 rounded-full overflow-hidden border-4 border-[#7c3aed] shadow-2xl shadow-[#7c3aed]/50">
                <img
                  src={avatarUrl}
                  alt="Your Avatar"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] rounded-full flex items-center justify-center shadow-lg shadow-[#7c3aed]/50 border-4 border-[#0a0a12]">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-[#7c3aed]/10 border border-[#7c3aed]/30 rounded-full">
            <div className="w-2 h-2 bg-[#7c3aed] rounded-full animate-pulse"></div>
            <span className="text-white/80 text-sm font-medium">
              Avatar successfully uploaded
            </span>
          </div>
        </div>

        <div className="bg-[#1a1a24] border border-[#2b2b38] rounded-2xl p-8 mb-8">
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#7c3aed]/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-[#7c3aed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1">High Quality</h3>
              <p className="text-white/60 text-sm">Crystal clear image</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#7c3aed]/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-[#7c3aed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1">Well Lit</h3>
              <p className="text-white/60 text-sm">Perfect lighting</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#7c3aed]/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-[#7c3aed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold mb-1">Clearly Visible</h3>
              <p className="text-white/60 text-sm">Face in focus</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button
            onClick={handleBack}
            variant="secondary"
            className="bg-white text-[#0a0a12] hover:bg-white/90 h-12 px-8 font-medium"
          >
            Previously
          </Button>
          <Button
            onClick={handleNext}
            className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white h-12 px-8 font-medium"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};
