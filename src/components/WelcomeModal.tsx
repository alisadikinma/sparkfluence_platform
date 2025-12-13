import React from "react";
import { useNavigate } from "react-router-dom";

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleGetStarted = () => {
    onClose();
    navigate("/onboarding");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      <div className="relative bg-[#1a1a24] border border-[#2b2b38] rounded-3xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#7c3aed] to-[#ec4899] rounded-2xl flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>

          <h2 className="text-3xl font-bold text-white mb-3">
            Welcome to Sparkfluence!
          </h2>

          <p className="text-lg text-white/70 mb-8">
            Let's get you started on your content creation journey. Click the button below to create your first piece of amazing content with AI.
          </p>

          <div className="space-y-4 mb-8">
            <div className="flex items-start gap-4 p-4 bg-[#2a2a38] rounded-xl text-left">
              <div className="w-10 h-10 bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">1</span>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Choose Your Niche</h3>
                <p className="text-white/60 text-sm">Select topics that match your interests</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-[#2a2a38] rounded-xl text-left">
              <div className="w-10 h-10 bg-gradient-to-br from-[#ec4899] to-[#d946ef] rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">2</span>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Generate Content</h3>
                <p className="text-white/60 text-sm">Let AI create scripts and visuals for you</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-[#2a2a38] rounded-xl text-left">
              <div className="w-10 h-10 bg-gradient-to-br from-[#06b6d4] to-[#0891b2] rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold">3</span>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Schedule & Publish</h3>
                <p className="text-white/60 text-sm">Plan your content calendar and go live</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={handleGetStarted}
              className="flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#ec4899] hover:from-[#6d28d9] hover:to-[#db2777] text-white font-semibold text-lg transition-all shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 hover:scale-105"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <span>Get Started</span>
            </button>

            <button
              onClick={onClose}
              className="px-8 py-4 rounded-xl bg-[#2a2a38] hover:bg-[#35354a] text-white font-semibold text-lg transition-all"
            >
              Explore Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
